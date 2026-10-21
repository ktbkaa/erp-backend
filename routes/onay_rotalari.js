const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function rotaGetir(id) {
  const r = await pool.query(
    `
    SELECT rt.*,
           f.firma_kodu, f.firma_adi,
           iy.is_yeri_kodu, iy.is_yeri_adi,
           ku.kural_kodu, ku.kural_adi,
           s1.sablon_adi AS ilk_mesaj_adi, s1.sablon_kodu AS ilk_mesaj_kodu,
           s2.sablon_adi AS red_mesaj_adi, s2.sablon_kodu AS red_mesaj_kodu,
           s3.sablon_adi AS ekstra_mesaj_adi, s3.sablon_kodu AS ekstra_mesaj_kodu
    FROM onay_rotalari rt
    LEFT JOIN firmalar f ON f.id = rt.firma_id
    LEFT JOIN is_yerleri iy ON iy.id = rt.is_yeri_id
    LEFT JOIN onay_kurallari ku ON ku.id = rt.kural_id
    LEFT JOIN onay_mesaj_sablonlari s1 ON s1.id = rt.ilk_mesaj_sablon_id
    LEFT JOIN onay_mesaj_sablonlari s2 ON s2.id = rt.red_mesaj_sablon_id
    LEFT JOIN onay_mesaj_sablonlari s3 ON s3.id = rt.ekstra_mesaj_sablon_id
    WHERE rt.id = $1
    `,
    [id],
  );
  if (!r.rows[0]) return null;
  const adimlar = await pool.query(
    `
    SELECT a.*
    FROM onay_rota_adimlari a
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
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`(firma_id IS NULL OR firma_id = $${params.length})`);
    }
    if (req.query.ekran_id) {
      params.push(req.query.ekran_id);
      where.push(`ekran_id = $${params.length}`);
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY rota_kodu, versiyon DESC';
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
    if (!a) continue;
    const rolAdi = a.rol_adi || null;
    let rolId = a.rol_id || null;
    if (!rolAdi && !rolId) continue;
    if (rolId && !rolAdi) {
      const rr = await client.query('SELECT rol_adi FROM onay_rolleri WHERE id=$1', [rolId]);
      // keep rol_id for optional link; name from assignment
    }
    const sn = a.sira_no != null ? Number(a.sira_no) : sira;
    await client.query(
      `
      INSERT INTO onay_rota_adimlari (
        rota_id, sira_no, adim_adi, rol_id, rol_adi, zorunlu, paralel, min_tutar,
        mail_gonder, sms_gonder, deger_degistirebilir, geri_gonder_sira, aciklama
      ) VALUES (
        $1,$2,$3,$4,$5,COALESCE($6,TRUE),COALESCE($7,FALSE),$8,
        COALESCE($9,TRUE),COALESCE($10,FALSE),COALESCE($11,FALSE),$12,$13
      )
      `,
      [
        rotaId,
        sn,
        a.adim_adi || rolAdi || `Adım ${sn}`,
        rolId,
        rolAdi || a.adim_adi || null,
        a.zorunlu,
        a.paralel,
        a.min_tutar != null ? a.min_tutar : null,
        a.mail_gonder,
        a.sms_gonder,
        a.deger_degistirebilir,
        a.geri_gonder_sira != null ? a.geri_gonder_sira : null,
        a.aciklama || null,
      ],
    );
    sira = sn + 10;
  }
}

router.post('/', async (req, res) => {
  try {
    const {
      rota_kodu, rota_adi, aciklama, firma_id, is_yeri_id, ekran_id, kural_id,
      versiyon, ilk_mesaj_sablon_id, red_mesaj_sablon_id, ekstra_mesaj_sablon_id,
      iptal_rol_adi, ekli_dosya_mail, aktif, adimlar,
    } = req.body;
    if (!rota_adi) return res.status(400).json({ hata: 'Rota adı zorunlu.' });
    const id = await withTransaction(pool, async (client) => {
      let kod = rota_kodu;
      if (!kod) {
        try { kod = await sonrakiKod(client, 'ONAY_ROTA'); }
        catch (_) { kod = `NR${Date.now().toString().slice(-5)}`; }
      }
      const ins = await client.query(
        `
        INSERT INTO onay_rotalari (
          rota_kodu, rota_adi, aciklama, firma_id, is_yeri_id, ekran_id, kural_id,
          versiyon, ilk_mesaj_sablon_id, red_mesaj_sablon_id, ekstra_mesaj_sablon_id,
          iptal_rol_adi, ekli_dosya_mail, aktif
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          COALESCE($8,1),$9,$10,$11,
          $12,COALESCE($13,FALSE),COALESCE($14,TRUE)
        ) RETURNING id
        `,
        [
          kod, rota_adi, aciklama || null, firma_id || null, is_yeri_id || null, ekran_id || null, kural_id || null,
          versiyon, ilk_mesaj_sablon_id || null, red_mesaj_sablon_id || null, ekstra_mesaj_sablon_id || null,
          iptal_rol_adi || null, ekli_dosya_mail, aktif,
        ],
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
    const {
      rota_adi, aciklama, firma_id, is_yeri_id, ekran_id, kural_id,
      versiyon, ilk_mesaj_sablon_id, red_mesaj_sablon_id, ekstra_mesaj_sablon_id,
      iptal_rol_adi, ekli_dosya_mail, aktif, adimlar,
    } = req.body;
    await withTransaction(pool, async (client) => {
      const r = await client.query(
        `
        UPDATE onay_rotalari SET
          rota_adi = COALESCE($2, rota_adi),
          aciklama = COALESCE($3, aciklama),
          firma_id = COALESCE($4, firma_id),
          is_yeri_id = COALESCE($5, is_yeri_id),
          ekran_id = COALESCE($6, ekran_id),
          kural_id = COALESCE($7, kural_id),
          versiyon = COALESCE($8, versiyon),
          ilk_mesaj_sablon_id = COALESCE($9, ilk_mesaj_sablon_id),
          red_mesaj_sablon_id = COALESCE($10, red_mesaj_sablon_id),
          ekstra_mesaj_sablon_id = COALESCE($11, ekstra_mesaj_sablon_id),
          iptal_rol_adi = COALESCE($12, iptal_rol_adi),
          ekli_dosya_mail = COALESCE($13, ekli_dosya_mail),
          aktif = COALESCE($14, aktif)
        WHERE id=$1 RETURNING id
        `,
        [
          req.params.id, rota_adi || null, aciklama, firma_id, is_yeri_id, ekran_id || null, kural_id,
          versiyon ?? null, ilk_mesaj_sablon_id, red_mesaj_sablon_id, ekstra_mesaj_sablon_id,
          iptal_rol_adi, ekli_dosya_mail, aktif,
        ],
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
