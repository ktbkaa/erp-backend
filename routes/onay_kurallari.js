const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function kuralGetir(id) {
  const r = await pool.query(
    `
    SELECT k.*,
           f.firma_kodu, f.firma_adi,
           iy.is_yeri_kodu, iy.is_yeri_adi,
           s.sablon_kodu, s.sablon_adi
    FROM onay_kurallari k
    LEFT JOIN firmalar f ON f.id = k.firma_id
    LEFT JOIN is_yerleri iy ON iy.id = k.is_yeri_id
    LEFT JOIN onay_mesaj_sablonlari s ON s.id = k.sablon_id
    WHERE k.id = $1
    `,
    [id],
  );
  if (!r.rows[0]) return null;
  const hareketler = await pool.query(
    `
    SELECT h.*,
           hk.hareket_kodu AS hk_kod,
           hk.hareket_adi
    FROM onay_kural_hareketleri h
    LEFT JOIN hareket_kodlari hk ON hk.id = h.hareket_kodu_id
    WHERE h.kural_id = $1
    ORDER BY h.id
    `,
    [id],
  );
  return {
    ...r.rows[0],
    hareketler: hareketler.rows.map((x) => ({
      ...x,
      hareket_kodu: x.hareket_kodu || x.hk_kod,
      hareket_adi: x.hareket_adi,
    })),
  };
}

async function kaydetHareketler(client, kuralId, hareketler) {
  await client.query('DELETE FROM onay_kural_hareketleri WHERE kural_id=$1', [kuralId]);
  if (!Array.isArray(hareketler)) return;
  for (const h of hareketler) {
    if (!h) continue;
    let kod = h.hareket_kodu || null;
    let kodId = h.hareket_kodu_id || null;
    if (!kod && kodId) {
      const rr = await client.query('SELECT hareket_kodu FROM hareket_kodlari WHERE id=$1', [kodId]);
      kod = rr.rows[0]?.hareket_kodu || null;
    }
    if (!kod && !kodId) continue;
    await client.query(
      `
      INSERT INTO onay_kural_hareketleri (kural_id, hareket_kodu_id, hareket_kodu)
      VALUES ($1,$2,$3)
      ON CONFLICT (kural_id, hareket_kodu) DO NOTHING
      `,
      [kuralId, kodId, kod],
    );
  }
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (req.query.aktif === 'true') where.push('aktif = TRUE');
    if (firmaId) {
      params.push(firmaId);
      where.push(`(firma_id IS NULL OR firma_id = $${params.length})`);
    }
    if (req.query.ekran_id) {
      params.push(req.query.ekran_id);
      where.push(`ekran_id = $${params.length}`);
    }
    const sql = `
      SELECT id FROM onay_kurallari
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY sira_no, kural_kodu
    `;
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await kuralGetir(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await kuralGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kural bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let {
      kural_kodu, kural_adi, sira_no, firma_id, is_yeri_id, ekran_id, sablon_id,
      kosul_yon, kosul_min_tutar, kosul_max_tutar, kosul_durumlar,
      otomatik_onay, onaylaninca_aktif, aktif, aciklama, hareketler,
    } = req.body;
    if (!kural_adi || !ekran_id) {
      return res.status(400).json({ hata: 'Kural adı ve ekran seçimi zorunlu.' });
    }
    if (!kural_kodu) {
      try { kural_kodu = await sonrakiKod(pool, 'ONAY_KURAL'); }
      catch (_) { kural_kodu = `NKR${Date.now().toString().slice(-5)}`; }
    }
    const id = await withTransaction(pool, async (client) => {
      const ins = await client.query(
        `
        INSERT INTO onay_kurallari (
          kural_kodu, kural_adi, sira_no, firma_id, is_yeri_id, ekran_id, sablon_id,
          kosul_yon, kosul_min_tutar, kosul_max_tutar, kosul_durumlar,
          otomatik_onay, onaylaninca_aktif, aktif, aciklama
        ) VALUES (
          $1,$2,COALESCE($3,10),$4,$5,$6,$7,
          COALESCE($8,'Hepsi'),$9,$10,$11,
          COALESCE($12,FALSE),COALESCE($13,TRUE),COALESCE($14,TRUE),$15
        ) RETURNING id
        `,
        [
          kural_kodu, kural_adi, sira_no, firma_id || null, is_yeri_id || null, ekran_id, sablon_id || null,
          kosul_yon, kosul_min_tutar ?? null, kosul_max_tutar ?? null, kosul_durumlar || null,
          otomatik_onay, onaylaninca_aktif, aktif, aciklama || null,
        ],
      );
      await kaydetHareketler(client, ins.rows[0].id, hareketler);
      return ins.rows[0].id;
    });
    res.status(201).json(await kuralGetir(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      kural_adi, sira_no, firma_id, is_yeri_id, ekran_id, sablon_id,
      kosul_yon, kosul_min_tutar, kosul_max_tutar, kosul_durumlar,
      otomatik_onay, onaylaninca_aktif, aktif, aciklama, hareketler,
    } = req.body;
    await withTransaction(pool, async (client) => {
      const r = await client.query(
        `
        UPDATE onay_kurallari SET
          kural_adi = COALESCE($2, kural_adi),
          sira_no = COALESCE($3, sira_no),
          firma_id = COALESCE($4, firma_id),
          is_yeri_id = COALESCE($5, is_yeri_id),
          ekran_id = COALESCE($6, ekran_id),
          sablon_id = COALESCE($7, sablon_id),
          kosul_yon = COALESCE($8, kosul_yon),
          kosul_min_tutar = COALESCE($9, kosul_min_tutar),
          kosul_max_tutar = COALESCE($10, kosul_max_tutar),
          kosul_durumlar = COALESCE($11, kosul_durumlar),
          otomatik_onay = COALESCE($12, otomatik_onay),
          onaylaninca_aktif = COALESCE($13, onaylaninca_aktif),
          aktif = COALESCE($14, aktif),
          aciklama = COALESCE($15, aciklama)
        WHERE id=$1 RETURNING id
        `,
        [
          req.params.id, kural_adi || null, sira_no ?? null, firma_id, is_yeri_id, ekran_id || null, sablon_id,
          kosul_yon || null, kosul_min_tutar, kosul_max_tutar, kosul_durumlar,
          otomatik_onay, onaylaninca_aktif, aktif, aciklama,
        ],
      );
      if (!r.rows[0]) {
        const err = new Error('Kural bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (hareketler !== undefined) await kaydetHareketler(client, req.params.id, hareketler);
    });
    res.json(await kuralGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM onay_kurallari WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kural bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
