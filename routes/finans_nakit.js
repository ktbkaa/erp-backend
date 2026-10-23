const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { reqKullaniciKodu } = require('../src/utils/yetki');
const { fisOlustur, hesapIdCoz } = require('../src/services/muhasebeMotorService');

async function bankaListe(firmaId) {
  const r = await pool.query(
    `
    SELECT b.*, h.hesap_kodu AS muhasebe_hesap_kodu, bk.banka_adi
    FROM finans_banka_hesaplari b
    LEFT JOIN muhasebe_hesaplari h ON h.id=b.muhasebe_hesap_id
    LEFT JOIN bankalar bk ON bk.id=b.banka_id
    WHERE ($1::int IS NULL OR b.firma_id=$1 OR b.firma_id IS NULL)
    ORDER BY b.id DESC
    `,
    [firmaId]
  );
  return r.rows;
}

router.get('/banka-hesaplari', async (req, res, next) => {
  try {
    res.json(await bankaListe(firmaIdFromReq(req)));
  } catch (err) {
    next(err);
  }
});

router.post('/banka-hesaplari', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const { hesap_kodu, hesap_adi, banka_id, iban, para_birimi, muhasebe_hesap_id } = req.body || {};
    if (!hesap_adi) return res.status(400).json({ hata: 'hesap_adi zorunlu.' });
    const kod = hesap_kodu || (await withTransaction(pool, (c) => sonrakiBelgeNo(c, 'FIN_BANKA_HESAP')));
    const r = await pool.query(
      `
      INSERT INTO finans_banka_hesaplari
        (firma_id, hesap_kodu, hesap_adi, banka_id, iban, para_birimi, muhasebe_hesap_id)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,'TRY'),$7) RETURNING *
      `,
      [firmaId, kod, hesap_adi, banka_id || null, iban || null, para_birimi, muhasebe_hesap_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/kasa-hesaplari', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `
      SELECT k.*, h.hesap_kodu AS muhasebe_hesap_kodu
      FROM finans_kasa_hesaplari k
      LEFT JOIN muhasebe_hesaplari h ON h.id=k.muhasebe_hesap_id
      WHERE ($1::int IS NULL OR k.firma_id=$1 OR k.firma_id IS NULL)
      ORDER BY k.id DESC
      `,
      [firmaId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/kasa-hesaplari', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const { kasa_kodu, kasa_adi, para_birimi, muhasebe_hesap_id } = req.body || {};
    if (!kasa_adi) return res.status(400).json({ hata: 'kasa_adi zorunlu.' });
    const kod = kasa_kodu || (await withTransaction(pool, (c) => sonrakiBelgeNo(c, 'FIN_KASA')));
    const r = await pool.query(
      `
      INSERT INTO finans_kasa_hesaplari (firma_id, kasa_kodu, kasa_adi, para_birimi, muhasebe_hesap_id)
      VALUES ($1,$2,$3,COALESCE($4,'TRY'),$5) RETURNING *
      `,
      [firmaId, kod, kasa_adi, para_birimi, muhasebe_hesap_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/hareketler', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `
      SELECT n.*, c.cari_adi
      FROM finans_nakit_hareketleri n
      LEFT JOIN cariler c ON c.id=n.cari_id
      WHERE ($1::int IS NULL OR n.firma_id=$1 OR n.firma_id IS NULL)
      ORDER BY n.id DESC
      `,
      [firmaId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * Nakit hareket + isteğe bağlı muhasebe fişi
 * body: yon, tutar, banka_hesap_id|kasa_hesap_id, karsi_hesap_kodu, muhasebelestir
 */
router.post('/hareketler', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const {
      yon, tutar, para_birimi, kur, banka_hesap_id, kasa_hesap_id,
      cari_id, aciklama, hareket_tarihi, muhasebelestir, karsi_hesap_kodu, ulke_kodu,
    } = req.body || {};
    if (!['Giris', 'Cikis', 'Virman'].includes(yon)) {
      return res.status(400).json({ hata: 'yon Giris|Cikis|Virman olmalı.' });
    }
    if (!(Number(tutar) > 0)) return res.status(400).json({ hata: 'tutar > 0 olmalı.' });
    if (!banka_hesap_id && !kasa_hesap_id) {
      return res.status(400).json({ hata: 'banka_hesap_id veya kasa_hesap_id gerekli.' });
    }

    const sonuc = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'FIN_NAKIT_HAREKET');
      const ins = await client.query(
        `
        INSERT INTO finans_nakit_hareketleri
          (firma_id, hareket_no, hareket_tarihi, yon, tutar, para_birimi, kur,
           banka_hesap_id, kasa_hesap_id, cari_id, aciklama, durum)
        VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,$5,COALESCE($6,'TRY'),COALESCE($7,1),
                $8,$9,$10,$11,'Onayli')
        RETURNING *
        `,
        [
          firmaId, no, hareket_tarihi || null, yon, Number(tutar), para_birimi, kur,
          banka_hesap_id || null, kasa_hesap_id || null, cari_id || null, aciklama || null,
        ]
      );
      const har = ins.rows[0];
      let fis = null;
      if (muhasebelestir) {
        let nakitHesapId = null;
        if (banka_hesap_id) {
          const bh = await client.query(`SELECT muhasebe_hesap_id FROM finans_banka_hesaplari WHERE id=$1`, [banka_hesap_id]);
          nakitHesapId = bh.rows[0]?.muhasebe_hesap_id;
        } else {
          const kh = await client.query(`SELECT muhasebe_hesap_id FROM finans_kasa_hesaplari WHERE id=$1`, [kasa_hesap_id]);
          nakitHesapId = kh.rows[0]?.muhasebe_hesap_id;
        }
        if (!nakitHesapId) {
          nakitHesapId = await hesapIdCoz(client, {
            hesap_kodu: banka_hesap_id ? '102.01.001' : '100.01.001',
            ulke_kodu: ulke_kodu || 'TR',
          });
        }
        const karsiKod = karsi_hesap_kodu || (yon === 'Giris' ? '120.01.001' : '320.01.001');
        const karsiId = await hesapIdCoz(client, { hesap_kodu: karsiKod, ulke_kodu: ulke_kodu || 'TR' });
        const t = Number(tutar);
        const lines = yon === 'Cikis'
          ? [
            { hesap_id: karsiId, borc: t, alacak: 0, aciklama },
            { hesap_id: nakitHesapId, borc: 0, alacak: t, aciklama },
          ]
          : [
            { hesap_id: nakitHesapId, borc: t, alacak: 0, aciklama },
            { hesap_id: karsiId, borc: 0, alacak: t, aciklama },
          ];
        fis = await fisOlustur(client, {
          firmaId,
          ulkeKodu: ulke_kodu || 'TR',
          fisTipi: yon === 'Giris' ? 'Tahsilat' : 'Tediye',
          belgeTarihi: har.hareket_tarihi,
          aciklama: aciklama || `${yon} ${no}`,
          paraBirimi: para_birimi || 'TRY',
          kur: kur || 1,
          lines,
          kaynakBelgeTipi: 'NAKIT_HAREKET',
          kaynakBelgeId: har.id,
          olusturanKullanici: reqKullaniciKodu(req),
          kesinlestir: true,
        });
        await client.query(
          `UPDATE finans_nakit_hareketleri SET muhasebe_belge_id=$2 WHERE id=$1`,
          [har.id, fis.id]
        );
      }
      return { hareket: har, fis };
    });
    res.status(201).json(sonuc);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

module.exports = router;
