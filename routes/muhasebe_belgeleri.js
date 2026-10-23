const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { reqKullaniciKodu } = require('../src/utils/yetki');
const {
  fisOlustur,
  fisKesinlestir,
  fisTersKayit,
  assertLines,
} = require('../src/services/muhasebeMotorService');

async function belgeGetir(id) {
  const b = await pool.query('SELECT * FROM muhasebe_belgeleri WHERE id=$1', [id]);
  if (!b.rows[0]) return null;
  const kalemler = await pool.query(
    `
    SELECT k.*, h.hesap_kodu, h.hesap_adi
    FROM muhasebe_belge_kalemleri k
    JOIN muhasebe_hesaplari h ON h.id = k.hesap_id
    WHERE k.belge_id=$1
    ORDER BY COALESCE(k.sira_no, k.id), k.id
    `,
    [id]
  );
  const borc = kalemler.rows.reduce((s, r) => s + Number(r.borc), 0);
  const alacak = kalemler.rows.reduce((s, r) => s + Number(r.alacak), 0);
  return {
    ...b.rows[0],
    kalemler: kalemler.rows,
    satirlar: kalemler.rows,
    toplam_borc: borc,
    toplam_alacak: alacak,
    dengeli: Math.abs(borc - alacak) < 0.005,
  };
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const liste = await pool.query(
      `
      SELECT id FROM muhasebe_belgeleri
      WHERE ($1::int IS NULL OR firma_id=$1 OR firma_id IS NULL)
      ORDER BY id DESC
      LIMIT 500
      `,
      [firmaId]
    );
    const sonuc = [];
    for (const r of liste.rows) sonuc.push(await belgeGetir(r.id));
    res.json(sonuc);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const belge = await belgeGetir(req.params.id);
    if (!belge) return res.status(404).json({ hata: 'Belge bulunamadı.' });
    res.json(belge);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      belge_tarihi, aciklama, kalemler, satirlar, fis_tipi, ulke_kodu,
      islem_ulke_kodu, vergi_ulke_kodu, para_birimi, kur, kesinlestir, durum,
      kaynak_belge_tipi, kaynak_belge_id,
    } = req.body;
    const lines = kalemler || satirlar;
    assertLines(lines || []);
    const created = await withTransaction(pool, (client) => fisOlustur(client, {
      firmaId: firmaIdFromReq(req),
      ulkeKodu: ulke_kodu || 'TR',
      islemUlkeKodu: islem_ulke_kodu,
      vergiUlkeKodu: vergi_ulke_kodu,
      fisTipi: fis_tipi || 'Mahsup',
      belgeTarihi: belge_tarihi,
      aciklama,
      paraBirimi: para_birimi || 'TRY',
      kur: kur || 1,
      lines,
      kaynakBelgeTipi: kaynak_belge_tipi,
      kaynakBelgeId: kaynak_belge_id,
      olusturanKullanici: reqKullaniciKodu(req),
      kesinlestir: Boolean(kesinlestir) || durum === 'Onayli',
      durum: durum || 'Taslak',
    }));
    res.status(201).json(await belgeGetir(created.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod, ...err });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { belge_tarihi, aciklama, kalemler, satirlar, fis_tipi } = req.body;
    const lines = kalemler || satirlar;
    const id = await withTransaction(pool, async (client) => {
      const mevcut = await client.query(
        'SELECT id, durum, kilitli FROM muhasebe_belgeleri WHERE id=$1 FOR UPDATE',
        [req.params.id]
      );
      if (!mevcut.rows[0]) {
        throw Object.assign(new Error('Belge bulunamadı.'), { status: 404 });
      }
      if (mevcut.rows[0].durum === 'Onayli' || mevcut.rows[0].kilitli) {
        throw Object.assign(
          new Error(
            'Kesinleşmiş fiş satırları değiştirilemez. Düzeltmek için «Ters kayıt» kullanın; '
            + 'orijinal fiş denetim izinde kalır.'
          ),
          { status: 400, kod: 'KESIN_FIS_KILIT' }
        );
      }
      await client.query(
        `
        UPDATE muhasebe_belgeleri SET
          belge_tarihi = COALESCE($2::date, belge_tarihi),
          aciklama = COALESCE($3, aciklama),
          fis_tipi = COALESCE($4, fis_tipi)
        WHERE id=$1
        `,
        [req.params.id, belge_tarihi || null, aciklama ?? null, fis_tipi || null]
      );
      if (Array.isArray(lines)) {
        assertLines(lines);
        await client.query('DELETE FROM muhasebe_belge_kalemleri WHERE belge_id=$1', [req.params.id]);
        let sira = 1;
        for (const k of lines) {
          if (!k.hesap_id) throw Object.assign(new Error('hesap_id zorunlu.'), { status: 400 });
          await client.query(
            `
            INSERT INTO muhasebe_belge_kalemleri (belge_id, hesap_id, borc, alacak, aciklama, sira_no)
            VALUES ($1,$2,$3,$4,$5,$6)
            `,
            [req.params.id, k.hesap_id, Number(k.borc || 0), Number(k.alacak || 0), k.aciklama || null, sira++]
          );
        }
      }
      return Number(req.params.id);
    });
    res.json(await belgeGetir(id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

router.post('/:id/onayla', async (req, res) => {
  try {
    await withTransaction(pool, (client) => fisKesinlestir(client, Number(req.params.id), {
      kullaniciKodu: reqKullaniciKodu(req),
      firmaId: firmaIdFromReq(req),
    }));
    res.json(await belgeGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

router.post('/:id/kesinlestir', async (req, res) => {
  try {
    await withTransaction(pool, (client) => fisKesinlestir(client, Number(req.params.id), {
      kullaniciKodu: reqKullaniciKodu(req),
      firmaId: firmaIdFromReq(req),
    }));
    res.json(await belgeGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

/** Eski API — onay kaldırma kapalı; ters kayıt yönlendir */
router.post('/:id/onay-kaldir', async (req, res) => {
  res.status(400).json({
    hata: 'Kesinleşmiş fişin onayı kaldırılamaz. Denetim izi için «Ters kayıt» kullanın.',
    kod: 'ONAY_KALDIR_KAPALI',
    alternatif: `POST /muhasebe-belgeleri/${req.params.id}/ters-kayit`,
  });
});

router.post('/:id/ters-kayit', async (req, res) => {
  try {
    const ters = await withTransaction(pool, (client) => fisTersKayit(client, Number(req.params.id), {
      kullaniciKodu: reqKullaniciKodu(req),
      aciklama: req.body?.aciklama,
    }));
    res.status(201).json({
      orijinal: await belgeGetir(req.params.id),
      ters: await belgeGetir(ters.id),
      mesaj: 'Ters kayıt oluşturuldu. Orijinal fiş kilitli kaldı.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const mevcut = await pool.query('SELECT durum, kilitli FROM muhasebe_belgeleri WHERE id=$1', [req.params.id]);
    if (!mevcut.rows[0]) return res.status(404).json({ hata: 'Belge bulunamadı.' });
    if (mevcut.rows[0].durum === 'Onayli' || mevcut.rows[0].kilitli) {
      return res.status(400).json({
        hata: 'Onaylı/kilitli belge silinemez. Ters kayıt kullanın.',
        kod: 'KESIN_FIS_KILIT',
      });
    }
    await pool.query('DELETE FROM muhasebe_belgeleri WHERE id=$1', [req.params.id]);
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
