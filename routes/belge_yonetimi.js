/**
 * Merkezi irsaliye / fatura listesi — alış + satış, tek ekran.
 * Kaynak: irsaliyeler + faturalar (+ tedarikçi irsaliyeleri özeti).
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const yon = String(req.query.yon || req.query.alis_satis || '').toLowerCase(); // alis|satis|''
    const tur = String(req.query.belge_turu || '').toLowerCase(); // irsaliye|fatura|''
    const params = [];
    const firmaClause = (alias) => {
      if (!firmaId) return 'TRUE';
      params.push(firmaId);
      return `${alias}.firma_id = $${params.length}`;
    };

    const parts = [];

    if (!tur || tur === 'irsaliye') {
      // Satış irsaliyeleri (irsaliyeler tablosu)
      if (!yon || yon === 'satis') {
        parts.push(`
          SELECT
            'irsaliye'::text AS belge_sinifi,
            i.id,
            i.irsaliye_no AS belge_no,
            COALESCE(i.irsaliye_tipi, 'Satis') AS yon,
            i.cari_id,
            c.cari_kodu,
            c.cari_adi,
            i.irsaliye_tarihi AS belge_tarihi,
            i.durum,
            COALESCE(i.genel_toplam, 0) AS tutar,
            i.para_birimi,
            i.siparis_id AS kaynak_siparis_id,
            NULL::int AS mal_kabul_id,
            'irsaliyeler'::text AS kaynak_tablo
          FROM irsaliyeler i
          LEFT JOIN cariler c ON c.id = i.cari_id
          WHERE ${firmaClause('i')}
        `);
      }
    }

    if (!tur || tur === 'fatura') {
      let yonFilter = 'TRUE';
      if (yon === 'alis') yonFilter = `f.fatura_turu IN ('Alis','AlisIade')`;
      else if (yon === 'satis') yonFilter = `f.fatura_turu IN ('Satis','SatisIade') OR f.fatura_turu IS NULL`;
      parts.push(`
        SELECT
          'fatura'::text AS belge_sinifi,
          f.id,
          f.fatura_no AS belge_no,
          f.fatura_turu AS yon,
          f.cari_id,
          c.cari_kodu,
          c.cari_adi,
          f.fatura_tarihi AS belge_tarihi,
          f.durum,
          COALESCE(f.odenecek_tutar, f.toplam_tutar, f.mal_hizmet_toplam, 0) AS tutar,
          f.para_birimi,
          f.siparis_id AS kaynak_siparis_id,
          f.mal_kabul_id,
          'faturalar'::text AS kaynak_tablo
        FROM faturalar f
        LEFT JOIN cariler c ON c.id = f.cari_id
        WHERE ${firmaClause('f')} AND ${yonFilter}
      `);
    }

    if ((!tur || tur === 'irsaliye') && (!yon || yon === 'alis')) {
      parts.push(`
        SELECT
          'tedarikci_irsaliye'::text AS belge_sinifi,
          ti.id,
          ti.irsaliye_no AS belge_no,
          'Alis'::text AS yon,
          ti.cari_id,
          c.cari_kodu,
          c.cari_adi,
          ti.irsaliye_tarihi AS belge_tarihi,
          ti.durum,
          0::numeric AS tutar,
          NULL::varchar AS para_birimi,
          ti.siparis_id AS kaynak_siparis_id,
          NULL::int AS mal_kabul_id,
          'tedarikci_irsaliyeleri'::text AS kaynak_tablo
        FROM tedarikci_irsaliyeleri ti
        LEFT JOIN cariler c ON c.id = ti.cari_id
        WHERE ${firmaClause('ti')}
      `);
    }

    if (!parts.length) return res.json([]);

    const sql = `
      SELECT * FROM (
        ${parts.join(' UNION ALL ')}
      ) x
      ORDER BY belge_tarihi DESC NULLS LAST, id DESC
      LIMIT 500`;
    const r = await pool.query(sql, params);
    res.json(r.rows.map((row) => ({
      ...row,
      id: `${row.belge_sinifi}:${row.id}`,
      kayit_id: row.id,
    })));
  } catch (err) {
    if (/does not exist|relation/i.test(err.message)) {
      return res.json([]);
    }
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
