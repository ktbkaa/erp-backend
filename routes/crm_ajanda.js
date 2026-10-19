const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const bas = req.query.bas || req.query.baslangic;
    const bit = req.query.bit || req.query.bitis;
    const params = [];
    const where = [];
    if (bas) {
      params.push(bas);
      where.push(`a.baslangic_at >= $${params.length}::timestamp`);
    }
    if (bit) {
      params.push(bit);
      where.push(`a.baslangic_at <= $${params.length}::timestamp`);
    }
    if (req.query.kullanici_kodu) {
      params.push(req.query.kullanici_kodu);
      where.push(`a.kullanici_kodu = $${params.length}`);
    }

    const ajanda = await pool.query(
      `
      SELECT a.*, c.cari_adi, 'ajanda' AS kaynak
      FROM crm_ajanda a
      LEFT JOIN cariler c ON c.id = a.cari_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.baslangic_at
      `,
      params
    );

    // Faaliyet + görev birleşik görünüm (varsa)
    let faaliyetler = [];
    let gorevler = [];
    try {
      const fParams = [];
      const fWhere = [];
      if (bas) {
        fParams.push(bas);
        fWhere.push(`COALESCE(planlanan_tarih, kayit_tarihi) >= $${fParams.length}::date`);
      }
      if (bit) {
        fParams.push(bit);
        fWhere.push(`COALESCE(planlanan_tarih, kayit_tarihi) <= $${fParams.length}::date`);
      }
      const fr = await pool.query(
        `
        SELECT id, konu AS baslik, planlanan_tarih AS baslangic_at, durum, 'faaliyet' AS kaynak
        FROM crm_faaliyetler
        ${fWhere.length ? `WHERE ${fWhere.join(' AND ')}` : ''}
        ORDER BY planlanan_tarih NULLS LAST
        LIMIT 200
        `,
        fParams
      );
      faaliyetler = fr.rows;
    } catch (_) { /* tablo/kolon farkı */ }

    try {
      const gParams = [];
      const gWhere = [];
      if (bas) {
        gParams.push(bas);
        gWhere.push(`COALESCE(son_tarih, kayit_tarihi) >= $${gParams.length}::date`);
      }
      if (bit) {
        gParams.push(bit);
        gWhere.push(`COALESCE(son_tarih, kayit_tarihi) <= $${gParams.length}::date`);
      }
      const gr = await pool.query(
        `
        SELECT id, baslik, son_tarih AS baslangic_at, durum, 'gorev' AS kaynak
        FROM crm_gorevler
        ${gWhere.length ? `WHERE ${gWhere.join(' AND ')}` : ''}
        ORDER BY son_tarih NULLS LAST
        LIMIT 200
        `,
        gParams
      );
      gorevler = gr.rows;
    } catch (_) { /* ignore */ }

    const birlesik = [
      ...ajanda.rows,
      ...faaliyetler,
      ...gorevler,
    ].sort((a, b) => String(a.baslangic_at || '').localeCompare(String(b.baslangic_at || '')));

    // UI liste varsayılanı dizi ister; ?detay=1 ile tam nesne
    if (String(req.query.detay || '') === '1') {
      return res.json({ ajanda: ajanda.rows, faaliyetler, gorevler, birlesik });
    }
    res.json(String(req.query.birlesik || '') === '1' ? birlesik : ajanda.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { baslik, baslangic_at, bitis_at, tip, cari_id, aday_id, firsat_id, kullanici_kodu, aciklama } = req.body || {};
    if (!baslik || !baslangic_at) {
      return res.status(400).json({ hata: 'baslik ve baslangic_at zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO crm_ajanda
        (baslik, baslangic_at, bitis_at, tip, cari_id, aday_id, firsat_id, kullanici_kodu, aciklama)
      VALUES ($1,$2,$3,COALESCE($4,'Toplanti'),$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [baslik, baslangic_at, bitis_at || null, tip, cari_id || null, aday_id || null, firsat_id || null, kullanici_kodu || null, aciklama || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM crm_ajanda WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
