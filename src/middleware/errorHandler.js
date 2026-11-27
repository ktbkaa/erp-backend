/**
 * Merkezi Express hata yakalayıcı (REQ-PLT-020).
 */
function notFoundHandler(req, res) {
  res.status(404).json({ hata: 'Endpoint bulunamadı.', yol: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  const body = {
    hata: err.message || 'Sunucu hatası',
  };
  if (err.kod) body.kod = err.kod;
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
