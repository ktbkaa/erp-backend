/**
 * Merkezi Express hata yakalayıcı (REQ-PLT-020).
 */
function defaultErrorCode(status) {
  if (status === 400) return 'ERR-API-400';
  if (status === 401) return 'ERR-API-401';
  if (status === 403) return 'ERR-API-403';
  if (status === 404) return 'ERR-API-404';
  if (status === 409) return 'ERR-API-409';
  if (status >= 500) return 'ERR-API-500';
  return 'ERR-API-400';
}

function notFoundHandler(req, res) {
  res.status(404).json({
    hata: 'Endpoint bulunamadı.',
    request_path: req.originalUrl,
    kod: 'ERR-API-404',
  });
}

function uniqueViolationMessage(err) {
  const detail = String(err?.detail || '');
  const constraint = String(err?.constraint || '');
  // Key (col)=(val) already exists.
  const m = detail.match(/\(([^)]+)\)=\(([^)]+)\)/);
  if (m) {
    const cols = m[1].split(',').map((s) => s.trim());
    const vals = m[2].split(',').map((s) => s.trim());
    if (cols.length === 1) {
      return `Bu kod zaten kayıtlı (${cols[0]}=${vals[0]}).`;
    }
    return `Bu kayıt zaten var (${cols.join(', ')}).`;
  }
  if (/code|kod|_code/i.test(constraint)) {
    return 'Bu kod zaten kayıtlı.';
  }
  return 'Bu kayıt zaten var (benzersiz alan çakışması).';
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  // Postgres FK violation → readable conflict instead of raw 500
  if (err && err.code === '23503') {
    return res.status(409).json({
      hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
      kod: 'ERR-FK-23503',
    });
  }
  // Postgres unique violation → 409 with Turkish message
  if (err && err.code === '23505') {
    return res.status(409).json({
      hata: uniqueViolationMessage(err),
      kod: 'ERR-UQ-23505',
      constraint: err.constraint || undefined,
    });
  }
  const { kilitHatasiYanit } = require('../services/belgeKilitService');
  if (kilitHatasiYanit(res, err, req)) return undefined;
  const status = err.status || err.statusCode || 500;
  const body = {
    hata: err.message || 'Sunucu hatası',
    kod: err.kod || defaultErrorCode(status),
  };
  if (err.detay) body.detay = err.detay;
  if (status >= 500) {
    console.error('[API]', req.method, req.originalUrl, err);
  }
  res.status(status).json(body);
}

/** Route içinde throw edilen hataları next'e iletmek için sarmalayıcı */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, notFoundHandler, asyncHandler, uniqueViolationMessage };
