/**
 * LDAP / Active Directory kimlik doğrulama.
 * Yapılandırma: env (LDAP_*) veya system_parameters.
 *
 * Desteklenen bağlanma yolları (öncelik sırası):
 * 1) LDAP_USER_DN_TEMPLATE  — örn. CN={{username}},OU=Users,DC=ornek,DC=com
 * 2) LDAP_UPN_SUFFIX        — örn. ornek.com → user@ornek.com (AD)
 * 3) Search + bind          — LDAP_BIND_DN + LDAP_USER_FILTER
 */

const { Client } = require('ldapts');
const { parametreAl } = require('./yetki');

function envOr(val, fallback = '') {
  if (val == null) return fallback;
  const s = String(val).trim();
  return s || fallback;
}

async function ldapConfig(pool) {
  const p = async (kod, envKey, def = '') => {
    const fromEnv = process.env[envKey];
    if (fromEnv != null && String(fromEnv).trim() !== '') return String(fromEnv).trim();
    if (!pool) return def;
    try {
      return envOr(await parametreAl(pool, kod, def), def);
    } catch (_) {
      return def;
    }
  };

  const enabledRaw = await p('LDAP_ENABLED', 'LDAP_ENABLED', 'Hayir');
  const enabled = ['evet', 'true', '1', 'on', 'açık', 'acik'].includes(
    String(enabledRaw).trim().toLowerCase()
  );
  const url = await p('LDAP_URL', 'LDAP_URL', '');
  const baseDn = await p('LDAP_BASE_DN', 'LDAP_BASE_DN', '');
  const bindDn = await p('LDAP_BIND_DN', 'LDAP_BIND_DN', '');
  const bindPassword = await p('LDAP_BIND_PASSWORD', 'LDAP_BIND_PASSWORD', '');
  const userFilter = await p(
    'LDAP_USER_FILTER',
    'LDAP_USER_FILTER',
    '(sAMAccountName={{username}})'
  );
  const userDnTemplate = await p('LDAP_USER_DN_TEMPLATE', 'LDAP_USER_DN_TEMPLATE', '');
  const upnSuffix = await p('LDAP_UPN_SUFFIX', 'LDAP_UPN_SUFFIX', '');
  const configured = Boolean(url && (userDnTemplate || upnSuffix || (baseDn && userFilter)));

  return {
    enabled,
    configured,
    available: enabled && configured,
    url,
    baseDn,
    bindDn,
    bindPassword,
    userFilter,
    userDnTemplate,
    upnSuffix,
  };
}

function interpolate(template, username) {
  return String(template || '').replace(/\{\{\s*username\s*\}\}/gi, username);
}

async function withClient(url, fn) {
  const client = new Client({ url, timeout: 8000, connectTimeout: 8000 });
  try {
    return await fn(client);
  } finally {
    try { await client.unbind(); } catch (_) { /* ignore */ }
  }
}

/**
 * Kullanıcı adı + bilgisayar/domain şifresi ile LDAP bind.
 * @returns {{ ok: true, dn: string } | { ok: false, hata: string }}
 */
async function authenticateLdap(pool, username, password) {
  const user = String(username || '').trim();
  const pass = String(password || '');
  if (!user || !pass) {
    return { ok: false, hata: 'LDAP için kullanıcı adı ve şifre gerekli.' };
  }

  const cfg = await ldapConfig(pool);
  if (!cfg.enabled) {
    return { ok: false, hata: 'LDAP kapalı. Sistem parametresinde LDAP_ENABLED=Evet yapın.' };
  }
  if (!cfg.configured) {
    return {
      ok: false,
      hata: 'LDAP yapılandırılmamış (LDAP_URL + UPN / DN şablonu / arama ayarları).',
    };
  }

  try {
    // 1) DN şablonu
    if (cfg.userDnTemplate) {
      const dn = interpolate(cfg.userDnTemplate, user);
      await withClient(cfg.url, async (client) => {
        await client.bind(dn, pass);
      });
      return { ok: true, dn };
    }

    // 2) UPN (user@domain) — AD bilgisayar şifresi
    if (cfg.upnSuffix) {
      const upn = user.includes('@') ? user : `${user}@${cfg.upnSuffix.replace(/^@/, '')}`;
      await withClient(cfg.url, async (client) => {
        await client.bind(upn, pass);
      });
      return { ok: true, dn: upn };
    }

    // 3) Servis hesabı ile ara, sonra kullanıcı DN’i ile bind
    if (!cfg.baseDn) {
      return { ok: false, hata: 'LDAP_BASE_DN gerekli (arama modu).' };
    }
    const filter = interpolate(cfg.userFilter, user.replace(/[\\*()]/g, ''));
    const found = await withClient(cfg.url, async (client) => {
      if (cfg.bindDn) {
        await client.bind(cfg.bindDn, cfg.bindPassword || '');
      }
      const { searchEntries } = await client.search(cfg.baseDn, {
        scope: 'sub',
        filter,
        attributes: ['dn', 'distinguishedName'],
        sizeLimit: 1,
      });
      return searchEntries?.[0] || null;
    });
    if (!found) {
      return { ok: false, hata: 'LDAP kullanıcısı bulunamadı.' };
    }
    const dn = found.dn || found.distinguishedName;
    if (!dn) return { ok: false, hata: 'LDAP kullanıcı DN bulunamadı.' };

    await withClient(cfg.url, async (client) => {
      await client.bind(dn, pass);
    });
    return { ok: true, dn };
  } catch (err) {
    const msg = err?.message || String(err);
    if (/InvalidCredentials|49|data 52e|data 532|data 533/i.test(msg)) {
      return { ok: false, hata: 'LDAP kullanıcı adı veya şifre hatalı.' };
    }
    if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout/i.test(msg)) {
      return { ok: false, hata: 'LDAP sunucusuna ulaşılamadı.' };
    }
    return { ok: false, hata: `LDAP doğrulama başarısız: ${msg}` };
  }
}

async function ldapStatus(pool) {
  const cfg = await ldapConfig(pool);
  return {
    enabled: cfg.enabled,
    configured: cfg.configured,
    available: cfg.available,
    url: cfg.url ? cfg.url.replace(/\/\/.*@/, '//***@') : '',
    mode: cfg.userDnTemplate ? 'dn_template' : (cfg.upnSuffix ? 'upn' : (cfg.baseDn ? 'search' : 'none')),
    message: !cfg.enabled
      ? 'LDAP kapalı'
      : (!cfg.configured
        ? 'LDAP açık ama URL / UPN / DN ayarları eksik'
        : 'LDAP hazır — bilgisayar/domain şifresi ile giriş'),
  };
}

module.exports = {
  ldapConfig,
  ldapStatus,
  authenticateLdap,
};
