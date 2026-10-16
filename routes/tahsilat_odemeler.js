const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { cariHareketEkle } = require('../src/services/cariHareketService');

async function getir(id) {
  const r = await pool.query(
    `
    SELECT t.*, c.cari_kodu, c.cari_adi
    FROM tahsilat_odemeler t
    JOIN cariler c ON c.id = t.cari_id
    WHERE t.id = $1
    `,
    [id]
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.cari_id) {
      params.push(Number(req.query.cari_id));
      where.push(`t.cari_id = $${params.length}`);
    }
    if (req.query.tip) {
      params.push(req.query.tip);
      where.push(`t.tip = $${params.length}`);
    }
    const sql = `
      SELECT t.*, c.cari_kodu, c.cari_adi
      FROM tahsilat_odemeler t
      JOIN cariler c ON c.id = t.cari_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.id DESC
    `;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { tip, cari_id, tutar, para_birimi, odeme_sekli, fatura_id, aciklama, belge_tarihi, durum } = req.body || {};
    if (!tip || !['Tahsilat', 'Odeme'].includes(tip)) {
      return res.status(400).json({ hata: 'tip Tahsilat veya Odeme olmalı.' });
    }
    if (!cari_id || tutar == null) {
      return res.status(400).json({ hata: 'cari_id ve tutar zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const seri = tip === 'Tahsilat' ? 'TAHSILAT' : 'ODEME';
      const no = await sonrakiBelgeNo(client, seri);
      const r = await client.query(
        `
        INSERT INTO tahsilat_odemeler
          (belge_no, tip, cari_id, tutar, para_birimi, odeme_sekli, fatura_id, durum, aciklama, belge_tarihi)
        VALUES ($1,$2,$3,$4,COALESCE($5,'TRY'),COALESCE($6,'Nakit'),$7,COALESCE($8,'Onayli'),$9,COALESCE($10,CURRENT_DATE))
        RETURNING id
        `,
        [no, tip, cari_id, Number(tutar), para_birimi, odeme_sekli, fatura_id || null, durum, aciklama || null, belge_tarihi || null]
      );
      const newId = r.rows[0].id;
      const onayDurum = (durum || 'Onayli') === 'Onayli';
      if (onayDurum) {
        await cariHareketEkle(client, {
          cariId: cari_id,
          yon: tip === 'Tahsilat' ? 'Alacak' : 'Borc',
          tutar: Number(tutar),
          paraBirimi: para_birimi || 'TRY',
          belgeTipi: tip === 'Tahsilat' ? 'TAHSILAT' : 'ODEME',
          belgeId: newId,
          aciklama: aciklama || `${tip} ${no}`,
          hareketTarihi: belge_tarihi || null,
        });
      }
      return newId;
    });
    res.status(201).json(await getir(id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/onayla', async (req, res, next) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    if (row.durum === 'Onayli') return res.json(row);
    await withTransaction(pool, async (client) => {
      await client.query(`UPDATE tahsilat_odemeler SET durum='Onayli' WHERE id=$1`, [row.id]);
      await cariHareketEkle(client, {
        cariId: row.cari_id,
        yon: row.tip === 'Tahsilat' ? 'Alacak' : 'Borc',
        tutar: Number(row.tutar),
        paraBirimi: row.para_birimi || 'TRY',
        belgeTipi: row.tip === 'Tahsilat' ? 'TAHSILAT' : 'ODEME',
        belgeId: row.id,
        aciklama: row.aciklama || `${row.tip} ${row.belge_no}`,
        hareketTarihi: row.belge_tarihi,
      });
    });
    res.json(await getir(row.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM tahsilat_odemeler WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
