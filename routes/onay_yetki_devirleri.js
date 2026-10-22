const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function getir(id) {
  const r = await pool.query(
    `
    SELECT d.*,
           CONCAT(COALESCE(v.ad,''), ' ', COALESCE(v.soyad,'')) AS veren_adi,
           v.kullanici_kodu AS veren_kodu,
           CONCAT(COALESCE(a.ad,''), ' ', COALESCE(a.soyad,'')) AS alan_adi,
           a.kullanici_kodu AS alan_kodu,
           rol.rol_kodu, rol.rol_adi
    FROM onay_yetki_devirleri d
    JOIN kisiler v ON v.id = d.veren_kisi_id
    JOIN kisiler a ON a.id = d.alan_kisi_id
    LEFT JOIN onay_rolleri rol ON rol.id = d.rol_id
    WHERE d.id = $1
    `,
    [id],
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    if (req.query.aktif === 'true') where.push('d.aktif = TRUE');
    if (req.query.alan_kisi_id) {
      params.push(req.query.alan_kisi_id);
      where.push(`d.alan_kisi_id = $${params.length}`);
    }
    const sql = `
      SELECT d.id FROM onay_yetki_devirleri d
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY d.id DESC
    `;
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
    if (!row) return res.status(404).json({ hata: 'Devir bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let {
      devir_kodu, veren_kisi_id, alan_kisi_id, rol_id,
      baslangic_tarihi, bitis_tarihi, aktif, aciklama,
    } = req.body;
    if (!veren_kisi_id || !alan_kisi_id) {
      return res.status(400).json({ hata: 'veren_kisi_id ve alan_kisi_id zorunlu.' });
    }
    if (Number(veren_kisi_id) === Number(alan_kisi_id)) {
      return res.status(400).json({ hata: 'Veren ve alan aynı kişi olamaz.' });
    }
    if (!devir_kodu) {
      try { devir_kodu = await sonrakiKod(pool, 'ONAY_DEVIR'); }
      catch (_) { devir_kodu = `OD${Date.now().toString().slice(-5)}`; }
    }
    const ins = await pool.query(
      `
      INSERT INTO onay_yetki_devirleri (
        devir_kodu, veren_kisi_id, alan_kisi_id, rol_id,
        baslangic_tarihi, bitis_tarihi, aktif, aciklama
      ) VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6,COALESCE($7,TRUE),$8)
      RETURNING id
      `,
      [
        devir_kodu, veren_kisi_id, alan_kisi_id, rol_id || null,
        baslangic_tarihi || null, bitis_tarihi || null, aktif, aciklama || null,
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
      veren_kisi_id, alan_kisi_id, rol_id,
      baslangic_tarihi, bitis_tarihi, aktif, aciklama,
    } = req.body;
    const r = await pool.query(
      `
      UPDATE onay_yetki_devirleri SET
        veren_kisi_id = COALESCE($2, veren_kisi_id),
        alan_kisi_id = COALESCE($3, alan_kisi_id),
        rol_id = COALESCE($4, rol_id),
        baslangic_tarihi = COALESCE($5, baslangic_tarihi),
        bitis_tarihi = COALESCE($6, bitis_tarihi),
        aktif = COALESCE($7, aktif),
        aciklama = COALESCE($8, aciklama)
      WHERE id=$1 RETURNING id
      `,
      [
        req.params.id, veren_kisi_id || null, alan_kisi_id || null, rol_id,
        baslangic_tarihi || null, bitis_tarihi, aktif, aciklama,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Devir bulunamadı.' });
    res.json(await getir(req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM onay_yetki_devirleri WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Devir bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
