/**
 * e-Belge yapılandırması ve gönderim modu kararı.
 *
 *  - Kimlik bilgileri (kullanıcı/şifre/API anahtarı) YALNIZCA ortam değişkeninden okunur; DB'ye yazılmaz.
 *  - Canlı (live) mod: GIB_CANLI=Evet VE seçili sağlayıcının canlı kimlik bilgileri eksiksiz.
 *  - GIB_CANLI=Evet ama kimlik eksik → gönderim engellenir (liveBlocked); mock'a düşülmez, sahte Gönderildi yazılmaz.
 *  - GIB_CANLI=Hayir → sandbox: test kimlikleri tamamsa entegratör test ortamı, değilse yerel mock.
 */
const { parametreAl } = require('../../utils/yetki');

const PROVIDERS = Object.freeze(['MOCK', 'REST', 'GIB_PORTAL']);

async function param(client, code, fallback) {
  try {
    const v = await parametreAl(client, code, fallback);
    return v == null ? fallback : v;
  } catch (_) {
    return fallback;
  }
}

async function loadSettings(client, companyId) {
  let row = null;
  if (companyId) {
    try {
      const r = await client.query(`SELECT * FROM e_document_settings WHERE company_id=$1`, [companyId]);
      row = r.rows[0] || null;
    } catch (_) {
      row = null;
    }
  }
  return {
    company_id: companyId || null,
    provider_code: null,
    invoice_prefix: 'EFT',
    archive_prefix: 'EAR',
    despatch_prefix: 'IRS',
    invoice_sender_alias: null,
    despatch_sender_alias: null,
    default_profile: 'TICARIFATURA',
    country_name: 'Türkiye',
    pdf_template: 'standart',
    ...(row || {}),
  };
}

function restCredentials(env, scope) {
  const p = scope === 'live' ? 'EBELGE_REST_' : 'EBELGE_REST_TEST_';
  return {
    username: env[`${p}USERNAME`] || '',
    password: env[`${p}PASSWORD`] || '',
    apiKey: env[`${p}API_KEY`] || '',
  };
}

/** Eksik canlı/test bilgilerini listeler (değerleri asla döndürmez). */
function missingFor(provider, scope, { baseUrl, auth, creds, env }) {
  const missing = [];
  if (provider === 'REST') {
    const urlKey = scope === 'live' ? 'EBELGE_REST_BASE_URL' : 'EBELGE_REST_TEST_BASE_URL';
    const credPrefix = scope === 'live' ? 'EBELGE_REST_' : 'EBELGE_REST_TEST_';
    if (!baseUrl) missing.push(urlKey);
    else if (scope === 'live' && !/^https:\/\//i.test(baseUrl)) missing.push(`${urlKey} (https zorunlu)`);
    if (auth === 'basic' || auth === 'token') {
      if (!creds.username) missing.push(`${credPrefix}USERNAME`);
      if (!creds.password) missing.push(`${credPrefix}PASSWORD`);
    } else if (!creds.apiKey) missing.push(`${credPrefix}API_KEY`);
  } else if (provider === 'GIB_PORTAL') {
    if (scope === 'live' && !env.EBELGE_PORTAL_KULLANICI) missing.push('EBELGE_PORTAL_KULLANICI');
  } else if (provider === 'MOCK') {
    if (scope === 'live') missing.push('EBELGE_SAGLAYICI (MOCK canlıda kullanılamaz: REST veya GIB_PORTAL seçin)');
  } else {
    missing.push(`EBELGE_SAGLAYICI (bilinmeyen: ${provider})`);
  }
  return missing;
}

/**
 * @returns {Promise<{mode:'live'|'test'|'mock', provider:string, gibCanli:boolean, liveBlocked:boolean,
 *   missingLive:string[], missingTest:string[], rest:object, settings:object}>}
 */
async function resolveConfig(client, { companyId = null, providerOverride = null, env = process.env } = {}) {
  const settings = await loadSettings(client, companyId);
  const gibCanli = String(await param(client, 'GIB_CANLI', 'Hayir')).toLowerCase() === 'evet';
  const provider = String(
    providerOverride || settings.provider_code || (await param(client, 'EBELGE_SAGLAYICI', 'MOCK')) || 'MOCK'
  ).toUpperCase();
  const auth = String((await param(client, 'EBELGE_REST_AUTH', 'token')) || 'token').toLowerCase();
  let endpoints = null;
  const rawEndpoints = await param(client, 'EBELGE_REST_ENDPOINTS', '');
  if (rawEndpoints) {
    try {
      endpoints = JSON.parse(rawEndpoints);
    } catch (_) {
      endpoints = null;
    }
  }
  const liveUrl = env.EBELGE_REST_BASE_URL || (await param(client, 'EBELGE_REST_BASE_URL', '')) || '';
  const testUrl = env.EBELGE_REST_TEST_BASE_URL || (await param(client, 'EBELGE_REST_TEST_BASE_URL', '')) || '';
  const liveCreds = restCredentials(env, 'live');
  const testCreds = restCredentials(env, 'test');

  const missingLive = missingFor(provider, 'live', { baseUrl: liveUrl, auth, creds: liveCreds, env });
  const missingTest = provider === 'REST'
    ? missingFor(provider, 'test', { baseUrl: testUrl, auth, creds: testCreds, env })
    : [];

  let mode = 'mock';
  let liveBlocked = false;
  if (gibCanli) {
    if (missingLive.length === 0) mode = 'live';
    else liveBlocked = true;
  } else if (provider === 'REST' && missingTest.length === 0) {
    mode = 'test';
  } else if (provider === 'GIB_PORTAL') {
    mode = 'test';
  }

  const maxAttempts = Math.max(1, Number(await param(client, 'EBELGE_MAX_DENEME', '5')) || 5);
  const archiveYears = Math.max(1, Number(await param(client, 'EBELGE_ARSIV_YIL', '10')) || 10);
  const timeoutMs = Number(env.EBELGE_REST_TIMEOUT_MS || 30000);

  return {
    mode,
    provider,
    gibCanli,
    liveBlocked,
    missingLive,
    missingTest,
    maxAttempts,
    archiveYears,
    settings,
    rest: {
      auth,
      endpoints,
      timeoutMs,
      baseUrl: mode === 'live' ? liveUrl : testUrl,
      credentials: mode === 'live' ? liveCreds : testCreds,
    },
  };
}

/** API/ekran için güvenli özet: sır değeri içermez. */
function publicSummary(cfg) {
  return {
    gib_canli: cfg.gibCanli,
    saglayici: cfg.provider,
    mod: cfg.liveBlocked ? 'engelli' : cfg.mode,
    canli_engelli: cfg.liveBlocked,
    canli_eksikler: cfg.missingLive,
    test_eksikler: cfg.missingTest,
    rest_auth: cfg.provider === 'REST' ? cfg.rest.auth : null,
    rest_adres: cfg.provider === 'REST' ? cfg.rest.baseUrl || null : null,
    azami_deneme: cfg.maxAttempts,
    arsiv_yil: cfg.archiveYears,
    seri: {
      efatura: cfg.settings.invoice_prefix,
      earsiv: cfg.settings.archive_prefix,
      eirsaliye: cfg.settings.despatch_prefix,
    },
  };
}

module.exports = { resolveConfig, publicSummary, loadSettings, PROVIDERS, missingFor };
