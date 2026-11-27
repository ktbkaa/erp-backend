const { isSecretParameterCode } = require('../utils/securityConfig');

const REQUEST_PATH_MAX = 500;
const LEGACY_REQUEST_PATH_MAX = 200;
const ACTION_MAX = 30;
const LEGACY_ACTION_MAX = 20;

let legacySchema = false;

function clip(v, n) {
  if (v == null) return null;
  const s = String(v);
  return s.length > n ? s.slice(0, n) : s;
}

async function auditYaz(poolOrClient, {
  tablo, kayitId, action, kullaniciKodu = null,
  eski = null, yeni = null, request_path: yol = null,
  statusCode = null, ip = null, userAgent = null,
}) {
  const base = [
    clip(tablo || 'api', 80),
    kayitId || null,
    clip(action, legacySchema ? LEGACY_ACTION_MAX : ACTION_MAX),
    clip(kullaniciKodu, 40),
    eski ? JSON.stringify(eski) : null,
    yeni ? JSON.stringify(yeni) : null,
    clip(yol, legacySchema ? LEGACY_REQUEST_PATH_MAX : REQUEST_PATH_MAX),
  ];
  try {
    if (legacySchema) {
      await poolOrClient.query(
        `INSERT INTO audit_logs (table_name, record_id, action, user_code, old_value, new_value, request_path)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
        base,
      );
      return;
    }
    await poolOrClient.query(
      `INSERT INTO audit_logs (table_name, record_id, action, user_code, old_value, new_value, request_path,
                               status_code, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10)`,
      [...base, statusCode, clip(ip, 64), clip(userAgent, 300)],
    );
  } catch (err) {
    // 130 migration uygulanmamış DB: eski kolon setiyle yeniden dene
    if (err && err.code === '42703' && !legacySchema) {
      legacySchema = true;
      return auditYaz(poolOrClient, {
        tablo, kayitId, action, kullaniciKodu, eski, yeni, request_path: yol,
      });
    }
    console.warn('[audit]', err.message);
  }
}

// Başa bağlı değil: yeni_parola, smtp_password, x_api_key gibi bileşik anahtarlar da maskelenir.
const SENSITIVE_KEYS = /(password|parola|sifre|token|secret|api_?key|private_?key|bind_password)/i;
const BULKY_KEYS = /^(profile_image|avatar|file_data|content_base64|base64)$/i;
const MAX_KEYS = 60;
const MAX_ARRAY_ITEMS = 20;

function isSensitiveKey(k) {
  return SENSITIVE_KEYS.test(k);
}

function sanitizeScalar(k, v) {
  if (isSensitiveKey(k)) return '[redacted]';
  if (BULKY_KEYS.test(k) && v != null && v !== '') return `[${String(v).length} karakter]`;
  if (typeof v === 'string' && v.length > 2000) return `${v.slice(0, 2000)}…`;
  return v;
}

function sanitizeObject(obj, depth) {
  const out = {};
  const secretValue = isSecretParameterCode(obj.parameter_code);
  for (const k of Object.keys(obj).slice(0, MAX_KEYS)) {
    const v = obj[k];
    if (secretValue && k === 'value') {
      out[k] = v == null || v === '' ? v : '[redacted]';
    } else if (isSensitiveKey(k)) {
      out[k] = '[redacted]';
    } else if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = sanitizeScalar(k, v);
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (Array.isArray(v)) {
      out[k] = sanitizeArray(v, depth + 1);
    } else if (typeof v === 'object') {
      out[k] = depth < 2 ? sanitizeObject(v, depth + 1) : { _object: true };
    }
  }
  return out;
}

/** Satır dizileri (ör. fatura kalemleri) ilk MAX_ARRAY_ITEMS öğeyle saklanır. */
function sanitizeArray(arr, depth) {
  if (depth > 2) return { _array_len: arr.length };
  const items = arr.slice(0, MAX_ARRAY_ITEMS).map((x) => {
    if (x == null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return { _array_len: x.length };
    return sanitizeObject(x, depth + 1);
  });
  return { _array_len: arr.length, items };
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  if (Array.isArray(body)) return sanitizeArray(body, 0);
  return sanitizeObject(body, 0);
}

const DIFF_IGNORE = /^(updated_at|last_login_at|modified_at)$/i;

function fieldDiff(eski, yeni) {
  if (!eski || !yeni || typeof eski !== 'object' || typeof yeni !== 'object') return null;
  const changed = {};
  const keys = new Set([...Object.keys(eski), ...Object.keys(yeni)]);
  for (const k of keys) {
    if (isSensitiveKey(k) || DIFF_IGNORE.test(k)) continue;
    const a = eski[k];
    const b = yeni[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed[k] = { old: a === undefined ? null : a, new: b === undefined ? null : b };
    }
  }
  return Object.keys(changed).length ? changed : null;
}

/**
 * Mount segmenti → tablo. Bu uçlarda PUT/PATCH/DELETE /:id için DB’deki gerçek
 * önceki/sonraki satır okunur ve alan seviyesi eski→yeni farkı yazılır.
 */
const CRITICAL_TABLES = {
  invoices: 'invoices',
  users: 'users',
  kullanicilar: 'users',
  'kullanici-gruplari': 'user_groups',
  'sistem-parametreleri': 'system_parameters',
  'muhasebe-belgeleri': 'journal_entries',
  'muhasebe-hesaplari': 'gl_accounts',
  'stok-hareketleri': 'stock_movements',
  'tahsilat-odemeler': 'receipts_payments',
  'cari-hareketleri': 'partner_ledger_entries',
  sales_orders: 'sales_orders',
  'satin-alma-siparisleri': 'purchase_orders',
  delivery_notes: 'delivery_notes',
};

function pathSegments(req) {
  return String(req.originalUrl || req.url || '').split('?')[0].split('/').filter(Boolean);
}

function criticalTarget(req) {
  if (!['PUT', 'PATCH', 'DELETE'].includes(req.method)) return null;
  const seg = pathSegments(req);
  const table = CRITICAL_TABLES[seg[0]];
  if (!table || seg.length !== 2 || !/^\d+$/.test(seg[1])) return null;
  return { table, id: Number(seg[1]) };
}

async function loadRow(pool, table, id) {
  try {
    const r = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return r.rows[0] ? sanitizeObject(r.rows[0], 0) : null;
  } catch (_) {
    return null;
  }
}

function hasCredentials(req) {
  return Boolean(req.get?.('authorization') || req.get?.('x-kullanici-kodu'));
}

/** Başarısız erişim / yazma denemesi için eylem adı; loglanmayacaksa null. */
function failureAction(req, status) {
  const seg = pathSegments(req);
  const isAuthRoute = seg[0] === 'auth';
  if (status === 429) return 'RATE_LIMITED';
  if (isAuthRoute && seg[1] === 'login' && status >= 400) return 'LOGIN_FAILED';
  if (isAuthRoute && seg[1] === 'refresh' && status >= 400) return 'REFRESH_FAILED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 401) return isAuthRoute || hasCredentials(req) ? 'AUTH_FAILED' : null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return `${req.method}_FAILED`;
  return null;
}

function actorCode(req) {
  const seg = pathSegments(req);
  if (req.user?.user_code) return req.user.user_code;
  if (seg[0] === 'auth' && seg[1] === 'login') {
    return req.body?.user_code || req.body?.username || null;
  }
  return req.get?.('x-kullanici-kodu') || null;
}

function auditMiddleware(pool) {
  return async (req, res, next) => {
    const start = Date.now();
    let responseBody;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    const target = criticalTarget(req);
    let before = null;
    if (target) before = await loadRow(pool, target.table, target.id);

    res.on('finish', () => {
      const method = req.method;
      const status = res.statusCode;
      const seg = pathSegments(req);
      const tablo = seg[0] || 'api';
      const common = {
        tablo,
        kullaniciKodu: actorCode(req),
        request_path: `${method} ${req.originalUrl}`,
        statusCode: status,
        ip: req.ip || req.socket?.remoteAddress || null,
        userAgent: req.get?.('user-agent') || null,
      };
      const reqSnap = sanitizeBody(req.body);

      if (status >= 400) {
        const action = failureAction(req, status);
        if (!action) return;
        const hata = responseBody && typeof responseBody === 'object'
          ? clip(responseBody.hata || responseBody.error || responseBody.message || '', 500)
          : null;
        setImmediate(() => auditYaz(pool, {
          ...common,
          kayitId: target?.id || null,
          action,
          yeni: { ok: false, status, ms: Date.now() - start, hata, kod: responseBody?.kod || null, request_fields: reqSnap },
        }));
        return;
      }

      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;
      const body = responseBody;
      const isLogin = seg[0] === 'auth' && seg[1] === 'login';
      const kayitId = target?.id || body?.id || body?.fatura?.id || null;

      setImmediate(async () => {
        let eski = null;
        let fieldChanges = null;
        if (target && method === 'DELETE') {
          eski = before;
        } else if (target && before) {
          const after = await loadRow(pool, target.table, target.id);
          fieldChanges = fieldDiff(before, after);
          if (fieldChanges) {
            eski = Object.fromEntries(Object.entries(fieldChanges).map(([k, v]) => [k, v.old]));
          }
        } else if (method === 'PUT' || method === 'PATCH') {
          // Kritik olmayan uçlar: istek ↔ yanıt karşılaştırması (yaklaşık)
          fieldChanges = fieldDiff(reqSnap, sanitizeBody(typeof body === 'object' ? body : null));
        }
        await auditYaz(pool, {
          ...common,
          tablo: target?.table || tablo,
          kayitId: kayitId && Number.isFinite(Number(kayitId)) ? Number(kayitId) : null,
          action: isLogin ? 'LOGIN' : method,
          eski,
          yeni: {
            ok: true,
            ms: Date.now() - start,
            request_fields: isLogin ? { user_code: reqSnap?.user_code || reqSnap?.username || null } : reqSnap,
            ...(fieldChanges ? { field_changes: fieldChanges } : {}),
            ...(target && method === 'DELETE' ? { deleted: true } : {}),
          },
        });
      });
    });
    next();
  };
}

module.exports = {
  auditYaz,
  auditMiddleware,
  sanitizeBody,
  fieldDiff,
  failureAction,
  criticalTarget,
  CRITICAL_TABLES,
};
