const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { faturaEslestir } = require('../src/services/faturaEslestirmeService');
const { faturadanMuhasebe } = require('../src/services/muhasebeEntegrasyonService');
const { belgeHtml } = require('../src/services/belgePdfService');
const { reqKullaniciKodu } = require('../src/utils/yetki');
const {
  pickFields,
  appendInsert,
  FATURA_BASLIK,
  FATURA_SATIR,
} = require('../src/utils/belgeAlanlari');

const EBELGE_ALANLAR = [
  'senaryo', 'fatura_tipi', 'ozellestirme_no', 'ettn',
  'odeme_vadesi_gun', 'odeme_kosulu', 'para_birimi', 'kur',
  'sevk_adresi', 'aciklama', 'fatura_tarihi',
  'mal_hizmet_toplam', 'toplam_iskonto', 'toplam_kdv', 'odenecek_tutar',
  'hareket_kodu_id', 'siparis_id', 'irsaliye_id', 'mal_kabul_id',
  'kaynak_belge_tipi', 'kaynak_belge_id', 'durum', 'kdv_oran_varsayilan',
];

async function faturaGetir(id, clientOrPool = pool) {
  const f = await clientOrPool.query(
    `
    SELECT f.*, c.cari_kodu, c.cari_adi
    FROM faturalar f
    JOIN cariler c ON f.cari_id = c.id
    WHERE f.id = $1
    `,
    [id]
  );
  if (!f.rows[0]) return null;
  const kalemler = await clientOrPool.query(
    `
    SELECT fd.*, s.stok_kodu, s.stok_adi
    FROM fatura_detaylari fd
    JOIN stoklar s ON fd.stok_id = s.id
    WHERE fd.fatura_id = $1
    ORDER BY fd.id
    `,
    [id]
  );
  return { ...f.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows };
}

function ebelgeParams(body) {
  const out = {};
  for (const k of EBELGE_ALANLAR) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

router.get('/', async (req, res, next) => {
  try {
    const { fatura_turu, cari_id, durum } = req.query;
    const where = [];
    const params = [];
    if (fatura_turu) {
      params.push(fatura_turu);
      where.push(`f.fatura_turu = $${params.length}`);
    }
    if (cari_id) {
      params.push(Number(cari_id));
      where.push(`f.cari_id = $${params.length}`);
    }
    if (durum) {
      params.push(durum);
      where.push(`f.durum = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    // N+1 giderimi: tek sorguda başlık + satır sayısı
    const liste = await pool.query(
      `
      SELECT f.*, c.cari_kodu, c.cari_adi,
             (SELECT COUNT(*)::int FROM fatura_detaylari fd WHERE fd.fatura_id = f.id) AS kalem_sayisi
      FROM faturalar f
      JOIN cariler c ON f.cari_id = c.id
      ${whereSql}
      ORDER BY f.id DESC
      `,
      params
    );
    // Detayları ihtiyaç halinde tek tek değil; liste için satırlar opsiyonel
    const withLines = String(req.query.detay || '').toLowerCase() === '1'
      || String(req.query.detay || '').toLowerCase() === 'true';
    if (!withLines) {
      return res.json(liste.rows.map((r) => ({ ...r, kalemler: [], satirlar: [] })));
    }
    const faturalar = [];
    for (const r of liste.rows) faturalar.push(await faturaGetir(r.id));
    res.json(faturalar);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const fatura = await faturaGetir(req.params.id);
    if (!fatura) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
    res.json(fatura);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { fatura_no, cari_id, fatura_turu } = req.body;
    const kalemler = req.body.kalemler || req.body.satirlar;
    if (!cari_id) return res.status(400).json({ hata: 'cari_id zorunludur.' });
    if (!Array.isArray(kalemler) || kalemler.length === 0) {
      return res.status(400).json({ hata: 'En az bir fatura kalemi gerekli.' });
    }
    const ekstra = ebelgeParams(req.body);

    const id = await withTransaction(pool, async (client) => {
      const tur = fatura_turu || ekstra.fatura_tipi || 'Satis';
      const seri = String(tur).toLowerCase().includes('alis') ? 'ALIS_FATURA' : 'FATURA';
      const no = fatura_no || (await sonrakiBelgeNo(client, seri));

      let toplam_tutar = 0;
      let toplam_kdv = 0;
      for (const k of kalemler) {
        const satir = Number(k.miktar) * Number(k.birim_fiyat);
        const kdvOran = Number(k.kdv_oran ?? ekstra.kdv_oran_varsayilan ?? 20);
        toplam_tutar += satir;
        toplam_kdv += satir * (kdvOran / 100);
      }

      const extras = pickFields({ ...req.body, ...ekstra }, FATURA_BASLIK);
      if (extras.kalan_tutar == null) extras.kalan_tutar = toplam_tutar + toplam_kdv;
      const baslik = appendInsert(
        ['fatura_no', 'cari_id', 'fatura_turu', 'toplam_tutar', 'mal_hizmet_toplam', 'toplam_kdv', 'odenecek_tutar'],
        [no, cari_id, tur, toplam_tutar, toplam_tutar, toplam_kdv, toplam_tutar + toplam_kdv],
        extras
      );
      const faturaSonuc = await client.query(
        `INSERT INTO faturalar (${baslik.cols.join(',')}) VALUES (${baslik.placeholders}) RETURNING id`,
        baslik.vals
      );
      const faturaId = faturaSonuc.rows[0].id;

      let sira = 1;
      for (const k of kalemler) {
        if (!k.stok_id || k.miktar == null || k.birim_fiyat == null) {
          throw Object.assign(new Error('Her kalemde stok_id, miktar ve birim_fiyat zorunludur.'), { status: 400 });
        }
        const satirToplam = Number(k.miktar) * Number(k.birim_fiyat);
        const kdvOran = Number(k.kdv_oran ?? ekstra.kdv_oran_varsayilan ?? 20);
        const kdvTutari = satirToplam * (kdvOran / 100);
        const satirEx = pickFields(k, FATURA_SATIR);
        if (satirEx.tutar_ht == null) satirEx.tutar_ht = satirToplam;
        if (satirEx.tutar_ttc == null) satirEx.tutar_ttc = satirToplam + kdvTutari;
        if (satirEx.net_birim_fiyat == null) satirEx.net_birim_fiyat = k.birim_fiyat;
        if (satirEx.sira_no == null) satirEx.sira_no = sira++;
        if (satirEx.kdv_oran == null) satirEx.kdv_oran = kdvOran;
        if (satirEx.kdv_tutari == null) satirEx.kdv_tutari = kdvTutari;
        if (satirEx.birim == null) satirEx.birim = k.birim || null;
        const sat = appendInsert(
          ['fatura_id', 'stok_id', 'miktar', 'birim_fiyat', 'toplam_tutar', 'mal_hizmet_tutari'],
          [faturaId, k.stok_id, k.miktar, k.birim_fiyat, satirToplam, satirToplam],
          satirEx
        );
        await client.query(
          `INSERT INTO fatura_detaylari (${sat.cols.join(',')}) VALUES (${sat.placeholders})`,
          sat.vals
        );
      }
      return faturaId;
    });

    res.status(201).json(await faturaGetir(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { fatura_turu, cari_id } = req.body;
    const kalemler = req.body.kalemler || req.body.satirlar;
    const ekstra = ebelgeParams(req.body);

    const id = await withTransaction(pool, async (client) => {
      const mevcut = await client.query('SELECT id FROM faturalar WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!mevcut.rows[0]) {
        throw Object.assign(new Error('Fatura bulunamadı.'), { status: 404 });
      }

      const sets = [];
      const params = [req.params.id];
      if (fatura_turu !== undefined) {
        params.push(fatura_turu);
        sets.push(`fatura_turu = $${params.length}`);
      }
      if (cari_id !== undefined) {
        params.push(cari_id);
        sets.push(`cari_id = $${params.length}`);
      }
      for (const [k, v] of Object.entries(ekstra)) {
        params.push(v);
        sets.push(`${k} = $${params.length}`);
      }

      if (Array.isArray(kalemler)) {
        let toplam = 0;
        let toplam_kdv = 0;
        for (const k of kalemler) {
          const satir = Number(k.miktar) * Number(k.birim_fiyat);
          const kdvOran = Number(k.kdv_oran ?? ekstra.kdv_oran_varsayilan ?? 20);
          toplam += satir;
          toplam_kdv += satir * (kdvOran / 100);
        }
        params.push(toplam);
        sets.push(`toplam_tutar = $${params.length}`);
        params.push(toplam);
        sets.push(`mal_hizmet_toplam = $${params.length}`);
        params.push(toplam_kdv);
        sets.push(`toplam_kdv = $${params.length}`);
        params.push(toplam + toplam_kdv);
        sets.push(`odenecek_tutar = $${params.length}`);

        if (sets.length) {
          await client.query(`UPDATE faturalar SET ${sets.join(', ')} WHERE id = $1`, params);
        }
        await client.query('DELETE FROM fatura_detaylari WHERE fatura_id=$1', [req.params.id]);
        for (const k of kalemler) {
          if (!k.stok_id || k.miktar == null || k.birim_fiyat == null) continue;
          const satirToplam = Number(k.miktar) * Number(k.birim_fiyat);
          const kdvOran = Number(k.kdv_oran ?? 20);
          await client.query(
            `INSERT INTO fatura_detaylari
              (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar, birim, kdv_oran, kdv_tutari, mal_hizmet_tutari)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              req.params.id, k.stok_id, k.miktar, k.birim_fiyat, satirToplam,
              k.birim || null, kdvOran, satirToplam * (kdvOran / 100), satirToplam,
            ]
          );
        }
      } else if (sets.length) {
        await client.query(`UPDATE faturalar SET ${sets.join(', ')} WHERE id = $1`, params);
      }
      return Number(req.params.id);
    });
    res.json(await faturaGetir(id));
  } catch (err) {
    next(err);
  }
});

/** POST /faturalar/:id/eslestir — 3-way match (PUR-007) */
router.post('/:id/eslestir', async (req, res, next) => {
  try {
    const row = await withTransaction(pool, (client) => faturaEslestir(client, Number(req.params.id)));
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

/** POST /faturalar/:id/eslestirme-onay */
router.post('/:id/eslestirme-onay', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE fatura_eslestirme SET sonuc='Uyumlu', aciklama=COALESCE(aciklama,'') || ' [Manuel onay]'
       WHERE fatura_id=$1
       RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) {
      const created = await withTransaction(pool, (client) => faturaEslestir(client, Number(req.params.id)));
      await pool.query(`UPDATE fatura_eslestirme SET sonuc='Uyumlu' WHERE id=$1`, [created.id]);
      return res.json({ ...created, sonuc: 'Uyumlu' });
    }
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

/** POST /faturalar/:id/muhasebelestir — belge→fiş + cari (FIN-004/005) */
router.post('/:id/muhasebelestir', async (req, res, next) => {
  try {
    const sonuc = await withTransaction(pool, (client) =>
      faturadanMuhasebe(client, Number(req.params.id), {
        kullaniciKodu: reqKullaniciKodu(req),
      })
    );
    // Durumu Onayli yap
    await pool.query(
      `UPDATE faturalar SET durum='Onayli' WHERE id=$1 AND COALESCE(durum,'') <> 'Onayli'`,
      [req.params.id]
    ).catch(() => {});
    res.status(201).json({ ...sonuc, fatura: await faturaGetir(req.params.id) });
  } catch (err) {
    next(err);
  }
});

/** GET yazdır / pdf */
router.get('/:id/yazdir', async (req, res, next) => {
  try {
    const f = await faturaGetir(req.params.id);
    if (!f) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
    const html = belgeHtml({
      baslik: String(f.fatura_turu || '').toLowerCase().includes('alis') ? 'Alış Faturası' : 'Satış Faturası',
      belgeNo: f.fatura_no,
      tarih: f.fatura_tarihi || f.kayit_tarihi,
      cari: f,
      satirlar: f.kalemler || [],
      toplamlar: {
        mal_hizmet_toplam: f.mal_hizmet_toplam,
        toplam_kdv: f.toplam_kdv,
        odenecek_tutar: f.odenecek_tutar,
        toplam_tutar: f.toplam_tutar,
      },
      ekstra: { ettn: f.ettn, aciklama: f.aciklama },
    });
    res.type('html').send(html);
  } catch (err) {
    next(err);
  }
});
router.get('/:id/pdf', (req, res) => res.redirect(302, `/faturalar/${req.params.id}/yazdir`));

/** POST /faturalar/:id/iade — iade faturası (ters tutar) */
router.post('/:id/iade', async (req, res, next) => {
  try {
    const kaynak = await faturaGetir(req.params.id);
    if (!kaynak) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
    const id = await withTransaction(pool, async (client) => {
      const alis = String(kaynak.fatura_turu || '').toLowerCase().includes('alis');
      const tur = alis ? 'AlisIade' : 'SatisIade';
      const seri = alis ? 'ALIS_FATURA' : 'FATURA';
      const no = await sonrakiBelgeNo(client, seri);
      const r = await client.query(
        `
        INSERT INTO faturalar
          (fatura_no, cari_id, fatura_turu, toplam_tutar, mal_hizmet_toplam, toplam_kdv, odenecek_tutar,
           durum, kaynak_belge_tipi, kaynak_belge_id, aciklama)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'Taslak',$8,$9,$10)
        RETURNING id
        `,
        [
          no, kaynak.cari_id, tur,
          -Math.abs(Number(kaynak.toplam_tutar || 0)),
          -Math.abs(Number(kaynak.mal_hizmet_toplam || kaynak.toplam_tutar || 0)),
          -Math.abs(Number(kaynak.toplam_kdv || 0)),
          -Math.abs(Number(kaynak.odenecek_tutar || kaynak.toplam_tutar || 0)),
          alis ? 'ALIS_IADE' : 'SATIS_IADE',
          kaynak.id,
          `İade ← ${kaynak.fatura_no}`,
        ]
      );
      const iadeId = r.rows[0].id;
      for (const k of kaynak.kalemler || []) {
        const miktar = Number(k.miktar);
        const birim = Number(k.birim_fiyat);
        const satir = miktar * birim;
        await client.query(
          `
          INSERT INTO fatura_detaylari
            (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar, birim, kdv_oran, kdv_tutari, mal_hizmet_tutari)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `,
          [
            iadeId, k.stok_id, miktar, birim, -Math.abs(satir), k.birim || null,
            k.kdv_oran, -Math.abs(Number(k.kdv_tutari || 0)), -Math.abs(satir),
          ]
        );
      }
      return iadeId;
    });
    res.status(201).json(await faturaGetir(id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query('DELETE FROM faturalar WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
