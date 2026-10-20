const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function getir(id) {
  const r = await pool.query(
    `
    SELECT k.*,
           r.rota_kodu, r.rota_adi,
           s.sablon_kodu, s.sablon_adi,
           f.firma_kodu, f.firma_adi
    FROM onay_modul_kullanimlari k
    JOIN onay_rotalari r ON r.id = k.rota_id
    LEFT JOIN onay_mesaj_sablonlari s ON s.id = k.sablon_id
    LEFT JOIN firmalar f ON f.id = k.firma_id
    WHERE k.id = $1
    `,
    [id],
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    let sql = 'SELECT id FROM onay_modul_kullanimlari';
    const where = [];
    if (req.query.aktif === 'true') where.push('aktif = TRUE');
    if (firmaId) {
      params.push(firmaId);
      where.push(`(firma_id IS NULL OR firma_id = $${params.length})`);
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY kullanim_kodu';
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await getir(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kullanım bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let {
      kullanim_kodu, kullanim_adi, modul_kodu, ekran_id, rota_id,
      firma_id, min_tutar, otomatik_gonder, sablon_id, aktif, aciklama,
    } = req.body;
    if (!kullanim_adi || !modul_kodu || !ekran_id || !rota_id) {
      return res.status(400).json({ hata: 'kullanim_adi, modul_kodu, ekran_id, rota_id zorunlu.' });
    }
    if (!kullanim_kodu) {
      try { kullanim_kodu = await sonrakiKod(pool, 'ONAY_KULLANIM'); }
      catch (_) { kullanim_kodu = `OM${Date.now().toString().slice(-5)}`; }
    }
    const ins = await pool.query(
      `
      INSERT INTO onay_modul_kullanimlari (
        kullanim_kodu, kullanim_adi, modul_kodu, ekran_id, rota_id,
        firma_id, min_tutar, otomatik_gonder, sablon_id, aktif, aciklama
      ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0),COALESCE($8,FALSE),$9,COALESCE($10,TRUE),$11)
      RETURNING id
      `,
      [
        kullanim_kodu, kullanim_adi, modul_kodu, ekran_id, rota_id,
        firma_id || null, min_tutar, otomatik_gonder, sablon_id || null, aktif, aciklama || null,
      ],
    );
    res.status(201).json(await getir(ins.rows[0].id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      kullanim_adi, modul_kodu, ekran_id, rota_id,
      firma_id, min_tutar, otomatik_gonder, sablon_id, aktif, aciklama,
    } = req.body;
    const r = await pool.query(
      `
      UPDATE onay_modul_kullanimlari SET
        kullanim_adi = COALESCE($2, kullanim_adi),
        modul_kodu = COALESCE($3, modul_kodu),
        ekran_id = COALESCE($4, ekran_id),
        rota_id = COALESCE($5, rota_id),
        firma_id = COALESCE($6, firma_id),
        min_tutar = COALESCE($7, min_tutar),
        otomatik_gonder = COALESCE($8, otomatik_gonder),
        sablon_id = COALESCE($9, sablon_id),
        aktif = COALESCE($10, aktif),
        aciklama = COALESCE($11, aciklama)
      WHERE id=$1 RETURNING id
      `,
      [
        req.params.id, kullanim_adi || null, modul_kodu || null, ekran_id || null, rota_id || null,
        firma_id, min_tutar, otomatik_gonder, sablon_id, aktif, aciklama,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kullanım bulunamadı.' });
    res.json(await getir(req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM onay_modul_kullanimlari WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kullanım bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
