const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function rotaGetir(id) {
  const r = await pool.query(
    `
    SELECT rt.*, f.firma_kodu, f.firma_adi
    FROM onay_rotalari rt
    LEFT JOIN firmalar f ON f.id = rt.firma_id
    WHERE rt.id = $1
    `,
    [id],
  );
  if (!r.rows[0]) return null;
  const adimlar = await pool.query(
    `
    SELECT a.*, rol.rol_kodu, rol.rol_adi
    FROM onay_rota_adimlari a
    JOIN onay_rolleri rol ON rol.id = a.rol_id
    WHERE a.rota_id = $1
    ORDER BY a.sira_no
    `,
    [id],
  );
  return { ...r.rows[0], adimlar: adimlar.rows };
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    let sql = 'SELECT id FROM onay_rotalari';
    if (firmaId) {
      params.push(firmaId);
      sql += ` WHERE firma_id IS NULL OR firma_id = $${params.length}`;
    }
    sql += ' ORDER BY rota_kodu';
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await rotaGetir(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await rotaGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Rota bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

async function kaydetAdimlar(client, rotaId, adimlar) {
  await client.query('DELETE FROM onay_rota_adimlari WHERE rota_id=$1', [rotaId]);
  if (!Array.isArray(adimlar)) return;
  let sira = 10;
  for (const a of adimlar) {
    if (!a?.rol_id && !a?.rol_kodu) continue;
    let rolId = a.rol_id;
    if (!rolId && a.rol_kodu) {
      const rr = await client.query('SELECT id FROM onay_rolleri WHERE rol_kodu=$1', [a.rol_kodu]);
      rolId = rr.rows[0]?.id;
    }
    if (!rolId) continue;
    const sn = a.sira_no != null ? Number(a.sira_no) : sira;
    await client.query(
      `
      INSERT INTO onay_rota_adimlari
        (rota_id, sira_no, adim_adi, rol_id, zorunlu, paralel, min_tutar, aciklama)
      VALUES ($1,$2,$3,$4,COALESCE($5,TRUE),COALESCE($6,FALSE),$7,$8)
      `,
      [
        rotaId,
        sn,
        a.adim_adi || `Adım ${sn}`,
        rolId,
        a.zorunlu,
        a.paralel,
        a.min_tutar != null ? a.min_tutar : null,
        a.aciklama || null,
      ],
    );
    sira = sn + 10;
  }
}

router.post('/', async (req, res) => {
  try {
    const { rota_kodu, rota_adi, aciklama, firma_id, aktif, adimlar } = req.body;
    if (!rota_adi) return res.status(400).json({ hata: 'rota_adi zorunlu.' });
    const id = await withTransaction(pool, async (client) => {
      let kod = rota_kodu;
      if (!kod) {
        try { kod = await sonrakiKod(client, 'ONAY_ROTA'); }
        catch (_) { kod = `OR${Date.now().toString().slice(-5)}`; }
      }
      const ins = await client.query(
        `
        INSERT INTO onay_rotalari (rota_kodu, rota_adi, aciklama, firma_id, aktif)
        VALUES ($1,$2,$3,$4,COALESCE($5,TRUE)) RETURNING id
        `,
        [kod, rota_adi, aciklama || null, firma_id || null, aktif],
      );
      await kaydetAdimlar(client, ins.rows[0].id, adimlar);
      return ins.rows[0].id;
    });
    res.status(201).json(await rotaGetir(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rota_adi, aciklama, firma_id, aktif, adimlar } = req.body;
    await withTransaction(pool, async (client) => {
      const r = await client.query(
        `
        UPDATE onay_rotalari SET
          rota_adi = COALESCE($2, rota_adi),
          aciklama = COALESCE($3, aciklama),
          firma_id = COALESCE($4, firma_id),
          aktif = COALESCE($5, aktif)
        WHERE id=$1 RETURNING id
        `,
        [req.params.id, rota_adi || null, aciklama, firma_id, aktif],
      );
      if (!r.rows[0]) {
        const err = new Error('Rota bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (adimlar !== undefined) await kaydetAdimlar(client, req.params.id, adimlar);
    });
    res.json(await rotaGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM onay_rotalari WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Rota bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
