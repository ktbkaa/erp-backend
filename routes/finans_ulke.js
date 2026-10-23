const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

/** GET /finans-ulke-paketleri */
router.get('/paketler', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM finans_ulke_paketleri WHERE aktif=TRUE ORDER BY ulke_kodu`
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/** Aktif firmanın muhasebe ülkesi + geçici işlem bağlamı yardımcıları */
router.get('/aktif', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    let firma = null;
    if (firmaId) {
      const f = await pool.query(
        `SELECT id, firma_kodu, firma_adi, muhasebe_ulke_kodu, fonksiyonel_pb,
                hesap_plani_kodu, raporlama_cercevesi, mali_yil_baslangic_ay, ebelge_saglayici
         FROM firmalar WHERE id=$1`,
        [firmaId]
      );
      firma = f.rows[0] || null;
    }
    const ulke = (firma?.muhasebe_ulke_kodu || 'TR').toUpperCase();
    const paket = await pool.query(
      `SELECT * FROM finans_ulke_paketleri WHERE ulke_kodu=$1`,
      [ulke]
    );
    res.json({
      firma,
      muhasebe_ulke_kodu: ulke,
      paket: paket.rows[0] || null,
      aciklama:
        'Varsayılan ülke aktif şirketin muhasebe ülkesidir. Geçici işlem ülkesi ana ülkeyi değiştirmez; '
        + 'kesinleşmiş fişlerin ülkesi geriye dönük güncellenmez.',
    });
  } catch (err) {
    next(err);
  }
});

/** Firma muhasebe ülkesi güncelle (kalıcı) */
router.put('/firma/:id', async (req, res, next) => {
  try {
    const {
      muhasebe_ulke_kodu, fonksiyonel_pb, hesap_plani_kodu,
      raporlama_cercevesi, mali_yil_baslangic_ay, ebelge_saglayici,
    } = req.body || {};
    if (muhasebe_ulke_kodu) {
      const p = await pool.query(
        `SELECT ulke_kodu, yerel_pb, hesap_plani_kodu FROM finans_ulke_paketleri WHERE ulke_kodu=$1 AND aktif`,
        [muhasebe_ulke_kodu]
      );
      if (!p.rows[0]) {
        return res.status(400).json({
          hata: `Geçersiz veya pasif ülke paketi: ${muhasebe_ulke_kodu}`,
          kod: 'ULKE_PAKET_YOK',
        });
      }
      const upd = await pool.query(
        `
        UPDATE firmalar SET
          muhasebe_ulke_kodu=$2,
          fonksiyonel_pb=COALESCE($3, $4, fonksiyonel_pb),
          hesap_plani_kodu=COALESCE($5, $6, hesap_plani_kodu),
          raporlama_cercevesi=COALESCE($7, raporlama_cercevesi),
          mali_yil_baslangic_ay=COALESCE($8, mali_yil_baslangic_ay),
          ebelge_saglayici=COALESCE($9, ebelge_saglayici)
        WHERE id=$1 RETURNING *
        `,
        [
          req.params.id, muhasebe_ulke_kodu,
          fonksiyonel_pb, p.rows[0].yerel_pb,
          hesap_plani_kodu, p.rows[0].hesap_plani_kodu,
          raporlama_cercevesi, mali_yil_baslangic_ay, ebelge_saglayici,
        ]
      );
      if (!upd.rows[0]) return res.status(404).json({ hata: 'Firma bulunamadı.' });
      return res.json(upd.rows[0]);
    }
    res.status(400).json({ hata: 'muhasebe_ulke_kodu gerekli.' });
  } catch (err) {
    next(err);
  }
});

/** Belirli ülke için hesap planı (lookup) */
router.get('/hesaplar/:ulkeKodu', async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT * FROM muhasebe_hesaplari
      WHERE aktif=TRUE AND (ulke_kodu=$1 OR ulke_kodu IS NULL)
      ORDER BY hesap_kodu
      `,
      [req.params.ulkeKodu]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
