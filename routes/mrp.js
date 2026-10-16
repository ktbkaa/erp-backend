const express = require('express');
const router = express.Router();
const pool = require('../db');
const { mrpHesapla } = require('../src/services/mrpService');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

router.get('/', async (req, res, next) => {
  try {
    const liste = await mrpHesapla(pool, {
      isYeriId: req.query.is_yeri_id ? Number(req.query.is_yeri_id) : null,
      stokId: req.query.stok_id ? Number(req.query.stok_id) : null,
    });
    res.json(liste);
  } catch (err) {
    next(err);
  }
});

/**
 * Net ihtiyaçtan satınalma talebi oluştur (REQ-PRD-010)
 * POST /mrp/talep-olustur  body: { stok_idler?: number[], is_yeri_id? }
 */
router.post('/talep-olustur', async (req, res, next) => {
  try {
    const filtreIds = Array.isArray(req.body.stok_idler)
      ? req.body.stok_idler.map(Number)
      : (req.body.stok_id ? [Number(req.body.stok_id)] : null);
    const liste = await mrpHesapla(pool, {
      isYeriId: req.body.is_yeri_id ? Number(req.body.is_yeri_id) : null,
    });
    const adaylar = liste.filter((r) => {
      if (r.net_ihtiyac <= 0) return false;
      if (r.oneri !== 'Satınalma') return false;
      if (filtreIds && !filtreIds.includes(Number(r.stok_id))) return false;
      return true;
    });
    if (!adaylar.length) {
      return res.status(400).json({ hata: 'Satınalma önerisi olan net ihtiyaç satırı yok.' });
    }

    const talepId = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'SATINALMA_TALEP');
      let isYeriId = req.body.is_yeri_id ? Number(req.body.is_yeri_id) : null;
      if (!isYeriId) {
        const iy = await client.query(`SELECT id FROM is_yerleri ORDER BY id LIMIT 1`);
        isYeriId = iy.rows[0]?.id || null;
      }
      const t = await client.query(
        `INSERT INTO satin_alma_talepleri (talep_no, is_yeri_id, durum, aciklama)
         VALUES ($1,$2,'Acik',$3) RETURNING id`,
        [no, isYeriId, `MRP otomatik — ${adaylar.length} kalem`]
      );
      const id = t.rows[0].id;
      for (const a of adaylar) {
        await client.query(
          `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim)
           VALUES ($1,$2,$3,$4)`,
          [id, a.stok_id, a.net_ihtiyac, a.birim || null]
        );
      }
      return id;
    });

    const talep = await pool.query(`SELECT * FROM satin_alma_talepleri WHERE id=$1`, [talepId]);
    const satirlar = await pool.query(
      `SELECT ts.*, s.stok_kodu, s.stok_adi FROM satin_alma_talep_satirlari ts
       JOIN stoklar s ON s.id = ts.stok_id WHERE ts.talep_id=$1 ORDER BY ts.id`,
      [talepId]
    );
    res.status(201).json({ ...talep.rows[0], satirlar: satirlar.rows, kaynak: 'MRP' });
  } catch (err) {
    next(err);
  }
});

router.get('/:stokId', async (req, res, next) => {
  try {
    const liste = await mrpHesapla(pool, { stokId: Number(req.params.stokId) });
    res.json(liste[0] || null);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
