async function auditYaz(poolOrClient, {
  tablo, kayitId, action, kullaniciKodu = null,
  eski = null, yeni = null, request_path: yol = null,
}) {
  try {
    await poolOrClient.query(
      `INSERT INTO audit_logs (table_name, record_id, action, user_code, old_value, new_value, request_path)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
      [
        tablo,
        kayitId || null,
        action,
        kullaniciKodu,
        eski ? JSON.stringify(eski) : null,
        yeni ? JSON.stringify(yeni) : null,
        yol,
      ]
    );
  } catch (err) {
    console.warn('[audit]', err.message);
  }
}

const SENSITIVE_KEYS = /^(password|parola|sifre|refresh_token|token|password_hash)/i;

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  if (Array.isArray(body)) return { _array_len: body.length };
  const out = {};
  const keys = Object.keys(body).slice(0, 40);
  for (const k of keys) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = '[redacted]';
      continue;
    }
    const v = body[k];
    if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = { _array_len: v.length };
    } else if (typeof v === 'object') {
      out[k] = { _object: true };
    }
  }
  return out;
}

function fieldDiff(eski, yeni) {
  if (!eski || !yeni || typeof eski !== 'object' || typeof yeni !== 'object') return null;
  const changed = {};
  const keys = new Set([...Object.keys(eski), ...Object.keys(yeni)]);
  for (const k of keys) {
    if (SENSITIVE_KEYS.test(k)) continue;
    const a = eski[k];
    const b = yeni[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed[k] = { old: a === undefined ? null : a, new: b === undefined ? null : b };
    }
  }
  return Object.keys(changed).length ? changed : null;
}

function auditMiddleware(pool) {
  return (req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const method = req.method;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && res.statusCode < 400) {
        const kod = req.user?.user_code || req.get?.('x-kullanici-kodu') || null;
        const kayitId = body?.id || body?.fatura?.id || req.params?.id || null;
        const reqSnap = sanitizeBody(req.body);
        const resSnap = sanitizeBody(typeof body === 'object' ? body : null);
        const diffs = method === 'PUT' || method === 'PATCH'
          ? fieldDiff(reqSnap, resSnap)
          : null;
        setImmediate(() => {
          auditYaz(pool, {
            tablo: req.baseUrl?.replace(/^\//, '') || 'api',
            kayitId: kayitId ? Number(kayitId) : null,
            action: method,
            kullaniciKodu: kod,
            eski: diffs || null,
            yeni: {
              ok: true,
              ms: Date.now() - start,
              request_fields: reqSnap,
              ...(diffs ? { field_changes: diffs } : {}),
            },
            request_path: `${method} ${req.originalUrl}`,
          });
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditYaz, auditMiddleware };
