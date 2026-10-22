const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function rolGetir(id) {
  const r = await pool.query(
    `
    SELECT r.*,
           CONCAT(COALESCE(k.ad,''), ' ', COALESCE(k.soyad,'')) AS kisi_adi,
           k.kullanici_kodu, k.kullanici_adi,
           f.firma_kodu, f.firma_adi,
           iy.is_yeri_kodu, iy.is_yeri_adi
    FROM onay_rolleri r
    LEFT JOIN kisiler k ON k.id = r.kisi_id
    LEFT JOIN firmalar f ON f.id = r.firma_id
    LEFT JOIN is_yerleri iy ON iy.id = r.is_yeri_id
    WHERE r.id = $1
    `,
    [id],
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (req.query.aktif === 'true') where.push('r.aktif = TRUE');
    if (firmaId) {
      params.push(firmaId);
      where.push(`(r.firma_id IS NULL OR r.firma_id = $${params.length})`);
    }
    if (req.query.rol_adi) {
      params.push(req.query.rol_adi);
      where.push(`r.rol_adi ILIKE $${params.length}`);
    }
    const sql = `
      SELECT r.id FROM onay_rolleri r
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.rol_adi, r.id
    `;
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await rolGetir(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await rolGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Rol kaydı bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let { rol_kodu, rol_adi, kisi_id, firma_id, is_yeri_id, aciklama, aktif } = req.body;
    if (!rol_adi) return res.status(400).json({ hata: 'Onay rol adı zorunlu.' });
    if (!kisi_id) return res.status(400).json({ hata: 'Kişi seçimi zorunlu.' });
    if (!rol_kodu) {
      try { rol_kodu = await sonrakiKod(pool, 'ONAY_ROL'); }
      catch (_) { rol_kodu = `NL${Date.now().toString().slice(-5)}`; }
    }
    const ins = await pool.query(
      `
      INSERT INTO onay_rolleri (rol_kodu, rol_adi, kisi_id, firma_id, is_yeri_id, aciklama, aktif)
      VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,TRUE))
      RETURNING id
      `,
      [rol_kodu, rol_adi, kisi_id, firma_id || null, is_yeri_id || null, aciklama || null, aktif],
    );
    res.status(201).json(await rolGetir(ins.rows[0].id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rol_adi, kisi_id, firma_id, is_yeri_id, aciklama, aktif } = req.body;
    const r = await pool.query(
      `
      UPDATE onay_rolleri SET
        rol_adi = COALESCE($2, rol_adi),
        kisi_id = COALESCE($3, kisi_id),
        firma_id = COALESCE($4, firma_id),
        is_yeri_id = COALESCE($5, is_yeri_id),
        aciklama = COALESCE($6, aciklama),
        aktif = COALESCE($7, aktif)
      WHERE id=$1 RETURNING id
      `,
      [req.params.id, rol_adi || null, kisi_id || null, firma_id, is_yeri_id, aciklama, aktif],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Rol kaydı bulunamadı.' });
    res.json(await rolGetir(req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM onay_rolleri WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Rol kaydı bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
