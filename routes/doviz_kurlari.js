const express = require('express');
const router = express.Router();
const pool = require('../db');
const { trimOrNull } = require('../src/utils/tanimCrud');

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = ['1=1'];
    const params = [];
    if (req.query.tarih) {
      params.push(req.query.tarih);
      where.push(`kur_tarihi = $${params.length}`);
    }
    if (req.query.kaynak_pb) {
      params.push(req.query.kaynak_pb);
      where.push(`kaynak_pb = $${params.length}`);
    }
    if (req.query.hedef_pb) {
      params.push(req.query.hedef_pb);
      where.push(`hedef_pb = $${params.length}`);
    }
    if (req.query.son === 'true') {
      // her çift için en son tarih
      const r = await pool.query(
        `SELECT DISTINCT ON (kaynak_pb, hedef_pb) *
         FROM doviz_kurlari
         ORDER BY kaynak_pb, hedef_pb, kur_tarihi DESC`
      );
      return res.json(r.rows);
    }
    const r = await pool.query(
      `SELECT * FROM doviz_kurlari WHERE ${where.join(' AND ')}
       ORDER BY kur_tarihi DESC, kaynak_pb LIMIT 500`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/** GET /doviz-kurlari/cevir?miktar=&kaynak_pb=&hedef_pb=&tarih=&tip=satis|alis */
router.get('/cevir', async (req, res, next) => {
  try {
    const miktar = num(req.query.miktar);
    const kaynak = trimOrNull(req.query.kaynak_pb);
    const hedef = trimOrNull(req.query.hedef_pb);
    if (!miktar || !kaynak || !hedef) {
      return res.status(400).json({ hata: 'miktar, kaynak_pb, hedef_pb zorunlu.' });
    }
    if (kaynak === hedef) {
      return res.json({ miktar, sonuc: miktar, kur: 1, kaynak_pb: kaynak, hedef_pb: hedef });
    }
    const tip = String(req.query.tip || 'satis').toLowerCase() === 'alis' ? 'alis_kuru' : 'satis_kuru';
    const params = [kaynak, hedef];
    let sql = `SELECT * FROM doviz_kurlari WHERE kaynak_pb=$1 AND hedef_pb=$2`;
    if (req.query.tarih) {
      params.push(req.query.tarih);
      sql += ` AND kur_tarihi <= $${params.length}`;
    }
    sql += ' ORDER BY kur_tarihi DESC LIMIT 1';
    let r = await pool.query(sql, params);
    // ters kur dene
    if (!r.rows[0]) {
      const rev = await pool.query(
        `SELECT * FROM doviz_kurlari WHERE kaynak_pb=$1 AND hedef_pb=$2
         ORDER BY kur_tarihi DESC LIMIT 1`,
        [hedef, kaynak]
      );
      if (rev.rows[0]) {
        const k = Number(rev.rows[0][tip]);
        const sonuc = miktar / k;
        return res.json({
          miktar, sonuc, kur: 1 / k, ters: true,
          kaynak_pb: kaynak, hedef_pb: hedef, kur_kaydi: rev.rows[0],
        });
      }
      return res.status(404).json({ hata: 'Kur bulunamadı.' });
    }
    const kur = Number(r.rows[0][tip]);
    res.json({
      miktar, sonuc: miktar * kur, kur,
      kaynak_pb: kaynak, hedef_pb: hedef, kur_kaydi: r.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(404).json({ hata: 'Kur bulunamadı.' });
    }
    const r = await pool.query('SELECT * FROM doviz_kurlari WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kur bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const kaynak_pb = trimOrNull(req.body.kaynak_pb);
    const hedef_pb = trimOrNull(req.body.hedef_pb);
    const alis = num(req.body.alis_kuru);
    const satis = num(req.body.satis_kuru);
    if (!kaynak_pb || !hedef_pb || !alis || !satis) {
      return res.status(400).json({ hata: 'kaynak_pb, hedef_pb, alis_kuru, satis_kuru zorunlu.' });
    }
    if (kaynak_pb === hedef_pb) {
      return res.status(400).json({ hata: 'Kaynak ve hedef para birimi farklı olmalı.' });
    }
    const ins = await pool.query(
      `INSERT INTO doviz_kurlari
          (kur_tarihi, kaynak_pb, hedef_pb, alis_kuru, satis_kuru, efektif_alis, efektif_satis, kaynak)
       VALUES (COALESCE($1::date, CURRENT_DATE),$2,$3,$4,$5,$6,$7,COALESCE($8,'Manuel'))
       ON CONFLICT (kur_tarihi, kaynak_pb, hedef_pb) DO UPDATE SET
         alis_kuru = EXCLUDED.alis_kuru,
         satis_kuru = EXCLUDED.satis_kuru,
         efektif_alis = EXCLUDED.efektif_alis,
         efektif_satis = EXCLUDED.efektif_satis,
         kaynak = EXCLUDED.kaynak
       RETURNING *`,
      [
        req.body.kur_tarihi || null,
        kaynak_pb, hedef_pb, alis, satis,
        num(req.body.efektif_alis), num(req.body.efektif_satis),
        trimOrNull(req.body.kaynak),
      ]
    );
    res.status(201).json(ins.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ hata: 'Geçersiz para birimi kodu.' });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const alis = num(req.body.alis_kuru);
    const satis = num(req.body.satis_kuru);
    if (!alis || !satis) return res.status(400).json({ hata: 'alis_kuru ve satis_kuru zorunlu.' });
    const upd = await pool.query(
      `UPDATE doviz_kurlari SET
         alis_kuru=$2, satis_kuru=$3,
         efektif_alis=COALESCE($4, efektif_alis),
         efektif_satis=COALESCE($5, efektif_satis),
         kaynak=COALESCE($6, kaynak)
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, alis, satis,
        num(req.body.efektif_alis), num(req.body.efektif_satis),
        trimOrNull(req.body.kaynak),
      ]
    );
    if (!upd.rows[0]) return res.status(404).json({ hata: 'Kur bulunamadı.' });
    res.json(upd.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query('DELETE FROM doviz_kurlari WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kur bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
