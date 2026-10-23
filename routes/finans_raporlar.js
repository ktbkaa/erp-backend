const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

function tarihFiltre(query, alias = 'b') {
  const params = [];
  let sql = '';
  if (query.baslangic) {
    params.push(query.baslangic);
    sql += ` AND ${alias}.belge_tarihi >= $${params.length}`;
  }
  if (query.bitis) {
    params.push(query.bitis);
    sql += ` AND ${alias}.belge_tarihi <= $${params.length}`;
  }
  return { sql, params };
}

/** Yevmiye defteri */
router.get('/yevmiye', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const { sql, params } = tarihFiltre(req.query);
    if (firmaId) {
      params.push(firmaId);
    }
    const r = await pool.query(
      `
      SELECT b.id AS belge_id, b.belge_no, b.yevmiye_no, b.belge_tarihi, b.fis_tipi, b.aciklama AS belge_aciklama,
             b.ulke_kodu, k.sira_no, h.hesap_kodu, h.hesap_adi, k.borc, k.alacak, k.aciklama AS kalem_aciklama
      FROM muhasebe_belgeleri b
      JOIN muhasebe_belge_kalemleri k ON k.belge_id = b.id
      JOIN muhasebe_hesaplari h ON h.id = k.hesap_id
      WHERE b.durum = 'Onayli' ${sql}
        ${firmaId ? `AND (b.firma_id = $${params.length} OR b.firma_id IS NULL)` : ''}
      ORDER BY b.belge_tarihi, b.yevmiye_no NULLS LAST, b.id, k.sira_no, k.id
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/** Büyük defter (hesap ekstresi) */
router.get('/buyuk-defter', async (req, res, next) => {
  try {
    const { hesap_kodu, hesap_id } = req.query;
    if (!hesap_kodu && !hesap_id) {
      return res.status(400).json({ hata: 'hesap_kodu veya hesap_id gerekli.' });
    }
    const { sql, params } = tarihFiltre(req.query);
    let hid = hesap_id ? Number(hesap_id) : null;
    if (!hid) {
      const h = await pool.query(`SELECT id FROM muhasebe_hesaplari WHERE hesap_kodu=$1`, [hesap_kodu]);
      if (!h.rows[0]) return res.status(404).json({ hata: 'Hesap bulunamadı.' });
      hid = h.rows[0].id;
    }
    params.push(hid);
    const r = await pool.query(
      `
      SELECT b.belge_tarihi, b.belge_no, b.yevmiye_no, b.aciklama AS belge_aciklama,
             k.borc, k.alacak, k.aciklama AS kalem_aciklama, h.hesap_kodu, h.hesap_adi
      FROM muhasebe_belge_kalemleri k
      JOIN muhasebe_belgeleri b ON b.id = k.belge_id
      JOIN muhasebe_hesaplari h ON h.id = k.hesap_id
      WHERE b.durum='Onayli' AND k.hesap_id=$${params.length} ${sql}
      ORDER BY b.belge_tarihi, b.yevmiye_no NULLS LAST, k.id
      `,
      params
    );
    let borc = 0;
    let alacak = 0;
    const rows = r.rows.map((row) => {
      borc += Number(row.borc);
      alacak += Number(row.alacak);
      return { ...row, kumulatif_bakiye: borc - alacak };
    });
    res.json({ hesap_id: hid, hareketler: rows, toplam_borc: borc, toplam_alacak: alacak, bakiye: borc - alacak });
  } catch (err) {
    next(err);
  }
});

/** Basit bilanço / gelir tablosu — hesap sınıfı özetleri (TR TDHP) */
router.get('/bilanco', async (req, res, next) => {
  try {
    const bitis = req.query.bitis || new Date().toISOString().slice(0, 10);
    const ulke = (req.query.ulke_kodu || 'TR').toUpperCase();
    const r = await pool.query(
      `
      SELECT h.hesap_sinifi,
             COALESCE(SUM(k.borc),0) AS borc,
             COALESCE(SUM(k.alacak),0) AS alacak
      FROM muhasebe_hesaplari h
      LEFT JOIN muhasebe_belge_kalemleri k ON k.hesap_id = h.id
      LEFT JOIN muhasebe_belgeleri b ON b.id = k.belge_id AND b.durum='Onayli' AND b.belge_tarihi <= $1::date
      WHERE h.aktif AND h.hesap_tipi='Dogrudan'
        AND (h.ulke_kodu=$2 OR ($2='TR' AND (h.ulke_kodu IS NULL OR h.ulke_kodu='TR')))
        AND h.hesap_sinifi IN ('1','2','3','4','5')
      GROUP BY h.hesap_sinifi
      ORDER BY h.hesap_sinifi
      `,
      [bitis, ulke]
    );
    const sinifAd = {
      1: 'Dönen varlıklar',
      2: 'Duran varlıklar',
      3: 'Kısa vadeli yabancı kaynaklar',
      4: 'Uzun vadeli yabancı kaynaklar',
      5: 'Özkaynaklar',
    };
    const satirlar = r.rows.map((x) => {
      const borc = Number(x.borc);
      const alacak = Number(x.alacak);
      const varlik = ['1', '2'].includes(x.hesap_sinifi);
      return {
        sinif: x.hesap_sinifi,
        ad: sinifAd[x.hesap_sinifi] || x.hesap_sinifi,
        tutar: varlik ? borc - alacak : alacak - borc,
        borc,
        alacak,
      };
    });
    const varlik = satirlar.filter((s) => ['1', '2'].includes(s.sinif)).reduce((a, s) => a + s.tutar, 0);
    const kaynak = satirlar.filter((s) => ['3', '4', '5'].includes(s.sinif)).reduce((a, s) => a + s.tutar, 0);
    res.json({
      bitis,
      ulke_kodu: ulke,
      satirlar,
      toplam_varlik: varlik,
      toplam_kaynak: kaynak,
      dengeli: Math.abs(varlik - kaynak) < 0.05,
      not: 'Özet bilanço — detay hesap dökümü büyük defter/mizan ile doğrulanmalıdır.',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/gelir-tablosu', async (req, res, next) => {
  try {
    const baslangic = req.query.baslangic || `${new Date().getFullYear()}-01-01`;
    const bitis = req.query.bitis || new Date().toISOString().slice(0, 10);
    const ulke = (req.query.ulke_kodu || 'TR').toUpperCase();
    const r = await pool.query(
      `
      SELECT h.hesap_kodu, h.hesap_adi, h.normal_bakiye,
             COALESCE(SUM(k.borc),0) AS borc,
             COALESCE(SUM(k.alacak),0) AS alacak
      FROM muhasebe_hesaplari h
      LEFT JOIN muhasebe_belge_kalemleri k ON k.hesap_id=h.id
      LEFT JOIN muhasebe_belgeleri b ON b.id=k.belge_id AND b.durum='Onayli'
        AND b.belge_tarihi BETWEEN $1::date AND $2::date
      WHERE h.aktif AND h.hesap_tipi='Dogrudan'
        AND h.hesap_sinifi='6'
        AND (h.ulke_kodu=$3 OR ($3='TR' AND (h.ulke_kodu IS NULL OR h.ulke_kodu='TR')))
      GROUP BY h.id
      HAVING COALESCE(SUM(k.borc),0) <> 0 OR COALESCE(SUM(k.alacak),0) <> 0
      ORDER BY h.hesap_kodu
      `,
      [baslangic, bitis, ulke]
    );
    let gelir = 0;
    let gider = 0;
    const satirlar = r.rows.map((x) => {
      const net = Number(x.alacak) - Number(x.borc);
      if (net >= 0) gelir += net;
      else gider += -net;
      return { ...x, net };
    });
    res.json({
      baslangic,
      bitis,
      ulke_kodu: ulke,
      satirlar,
      toplam_gelir: gelir,
      toplam_gider: gider,
      donem_kar_zarar: gelir - gider,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
