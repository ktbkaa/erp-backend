const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function ozetHesapla(firmaId = null) {
  const q = async (sql, params = []) => {
    try {
      const r = await pool.query(sql, params);
      return r.rows;
    } catch (_) {
      return [];
    }
  };
  const ff = (col, params) => {
    if (!firmaId) return { sql: '', params };
    params.push(firmaId);
    return { sql: ` AND ${col} = $${params.length}`, params };
  };

  const pSatis = [];
  const fSatis = ff('firma_id', pSatis);
  const pSevk = [];
  const fSevk = ff('firma_id', pSevk);
  const pKritik = [];
  const fKritik = ff('st.firma_id', pKritik);
  const pSa = [];
  const fSa = ff('firma_id', pSa);
  const pKk = [];
  const fKk = ff('firma_id', pKk);

  const [
    acikSatis,
    gecikenSevk,
    kritikStok,
    bekleyenSa,
    acikKk,
    cariRisk,
    faturaEslesme,
    acikRezerv,
  ] = await Promise.all([
    q(`SELECT COUNT(*)::int AS n FROM siparisler
       WHERE durum IN ('Taslak','Onayli','Kismi')
         AND (siparis_turu ILIKE '%satis%' OR siparis_turu ILIKE '%satış%'
              OR siparis_turu IN ('SatisSiparis','AlinanSiparis'))${fSatis.sql}`, fSatis.params),
    q(`SELECT COUNT(*)::int AS n FROM sevk_emirleri
       WHERE durum IN ('Onayli','Taslak') AND sevk_tarihi < CURRENT_DATE${fSevk.sql}`, fSevk.params),
    q(`
      SELECT st.stok_kodu, st.stok_adi, st.emniyet_stok,
             COALESCE(SUM(s.miktar * s.yon),0)::numeric AS bakiye
      FROM stoklar st
      LEFT JOIN stok_hareket_satirlari s ON s.stok_id = st.id
      WHERE st.emniyet_stok IS NOT NULL AND st.emniyet_stok > 0${fKritik.sql}
      GROUP BY st.id
      HAVING COALESCE(SUM(s.miktar * s.yon),0) < st.emniyet_stok
      ORDER BY bakiye
      LIMIT 20
    `, fKritik.params),
    q(`SELECT COUNT(*)::int AS n FROM satin_alma_talepleri WHERE durum IN ('Taslak','Bekliyor','OnayBekliyor')${fSa.sql}`, fSa.params),
    q(`SELECT COUNT(*)::int AS n FROM kk_emirleri WHERE durum IN ('Acik','Bekliyor','Taslak')${fKk.sql}`, fKk.params),
    q(`
      SELECT COALESCE(SUM(CASE WHEN yon='Borc' THEN tutar ELSE -tutar END),0)::numeric AS risk
      FROM cari_hareketleri
    `),
    q(`SELECT COUNT(*)::int AS n FROM fatura_eslestirme WHERE sonuc IN ('Bekliyor','FiyatFark','MiktarFark','Askida')`),
    q(`SELECT COUNT(*)::int AS n FROM stok_rezervasyonlari WHERE durum='Aktif'`),
  ]);

  return {
    acik_satis_siparis: acikSatis[0]?.n || 0,
    geciken_sevk: gecikenSevk[0]?.n || 0,
    kritik_stok: kritikStok,
    bekleyen_sa_onay: bekleyenSa[0]?.n || 0,
    acik_kk: acikKk[0]?.n || 0,
    cari_risk_top: Number(cariRisk[0]?.risk || 0),
    fatura_eslesme_bekleyen: faturaEslesme[0]?.n || 0,
    acik_rezervasyon: acikRezerv[0]?.n || 0,
  };
}

router.get('/ozet', async (req, res, next) => {
  try {
    res.json(await ozetHesapla(firmaIdFromReq(req)));
  } catch (err) {
    next(err);
  }
});

/** Liste UI için widget satırları */
router.get('/', async (req, res, next) => {
  try {
    const o = await ozetHesapla(firmaIdFromReq(req));
    res.json([
      { id: 1, metrik: 'Açık satış sipariş', deger: o.acik_satis_siparis },
      { id: 2, metrik: 'Geciken sevk', deger: o.geciken_sevk },
      { id: 3, metrik: 'Kritik stok kalemi', deger: (o.kritik_stok || []).length },
      { id: 4, metrik: 'Bekleyen SA onay', deger: o.bekleyen_sa_onay },
      { id: 5, metrik: 'Açık KK', deger: o.acik_kk },
      { id: 6, metrik: 'Cari risk toplam', deger: o.cari_risk_top },
      { id: 7, metrik: 'Fatura eşleşme bekleyen', deger: o.fatura_eslesme_bekleyen },
      { id: 8, metrik: 'Açık rezervasyon', deger: o.acik_rezervasyon },
    ]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
