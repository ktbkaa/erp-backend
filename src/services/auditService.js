async function auditYaz(poolOrClient, {
  tablo, kayitId, islem, kullaniciKodu = null,
  eski = null, yeni = null, yol = null,
}) {
  try {
    await poolOrClient.query(
      `INSERT INTO audit_log (tablo_adi, kayit_id, islem, kullanici_kodu, eski_deger, yeni_deger, yol)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
      [
        tablo,
        kayitId || null,
        islem,
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

function auditMiddleware(pool) {
  return (req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const method = req.method;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && res.statusCode < 400) {
        const kod = req.user?.kullanici_kodu || req.get?.('x-kullanici-kodu') || null;
        const kayitId = body?.id || body?.fatura?.id || req.params?.id || null;
        setImmediate(() => {
          auditYaz(pool, {
            tablo: req.baseUrl?.replace(/^\//, '') || 'api',
            kayitId: kayitId ? Number(kayitId) : null,
            islem: method,
            kullaniciKodu: kod,
            yeni: typeof body === 'object' ? { ok: true, ms: Date.now() - start } : null,
            yol: `${method} ${req.originalUrl}`,
          });
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditYaz, auditMiddleware };
