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
  const fSatis = ff('company_id', pSatis);
  const pSevk = [];
  const fSevk = ff('company_id', pSevk);
  const pKritik = [];
  const fKritik = ff('st.company_id', pKritik);
  const pSa = [];
  const fSa = ff('company_id', pSa);
  const pKk = [];
  const fKk = ff('company_id', pKk);

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
    q(`SELECT COUNT(*)::int AS n FROM sales_orders
       WHERE status IN ('Taslak','Onayli','Kismi')
         AND (order_type ILIKE '%satis%' OR order_type ILIKE '%satış%'
              OR order_type IN ('SatisSiparis','AlinanSiparis'))${fSatis.sql}`, fSatis.params),
    q(`SELECT COUNT(*)::int AS n FROM shipment_orders
       WHERE status IN ('Onayli','Taslak') AND ship_date < CURRENT_DATE${fSevk.sql}`, fSevk.params),
    q(`
      SELECT st.item_code, st.item_name, st.safety_stock,
             COALESCE(SUM(s.quantity * s.direction),0)::numeric AS bakiye
      FROM items st
      LEFT JOIN stock_movement_lines s ON s.item_id = st.id
      WHERE st.safety_stock IS NOT NULL AND st.safety_stock > 0${fKritik.sql}
      GROUP BY st.id
      HAVING COALESCE(SUM(s.quantity * s.direction),0) < st.safety_stock
      ORDER BY bakiye
      LIMIT 20
    `, fKritik.params),
    q(`SELECT COUNT(*)::int AS n FROM purchase_requisitions WHERE status IN ('Taslak','Bekliyor','OnayBekliyor')${fSa.sql}`, fSa.params),
    q(`SELECT COUNT(*)::int AS n FROM qc_orders WHERE status IN ('Acik','Bekliyor','Taslak')${fKk.sql}`, fKk.params),
    q(`
      SELECT COALESCE(SUM(CASE WHEN direction='Borc' THEN amount ELSE -amount END),0)::numeric AS risk
      FROM partner_ledger_entries
    `),
    q(`SELECT COUNT(*)::int AS n FROM invoice_matches WHERE result IN ('Bekliyor','FiyatFark','MiktarFark','Askida')`),
    q(`SELECT COUNT(*)::int AS n FROM item_reservations WHERE status='Aktif'`),
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
      { id: 1, metrik: 'Açık satış sipariş', value: o.acik_satis_siparis },
      { id: 2, metrik: 'Geciken sevk', value: o.geciken_sevk },
      { id: 3, metrik: 'Kritik stok kalemi', value: (o.kritik_stok || []).length },
      { id: 4, metrik: 'Bekleyen SA onay', value: o.bekleyen_sa_onay },
      { id: 5, metrik: 'Açık KK', value: o.acik_kk },
      { id: 6, metrik: 'Cari risk toplam', value: o.cari_risk_top },
      { id: 7, metrik: 'Fatura eşleşme bekleyen', value: o.fatura_eslesme_bekleyen },
      { id: 8, metrik: 'Açık rezervasyon', value: o.acik_rezervasyon },
    ]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
