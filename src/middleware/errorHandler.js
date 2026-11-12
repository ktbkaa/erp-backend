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

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  // Postgres FK violation → readable conflict instead of raw 500
  if (err && err.code === '23503') {
    return res.status(409).json({
      hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
      kod: 'ERR-FK-23503',
    });
  }
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

module.exports = { errorHandler, notFoundHandler, asyncHandler };
