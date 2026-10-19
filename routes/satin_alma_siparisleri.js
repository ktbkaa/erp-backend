const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { cariTedarikciMi } = require('../src/utils/kodUretici');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');

async function siparisGetir(id) {
  const s = await pool.query(`
    SELECT sas.*, c.cari_kodu, c.cari_adi, t.talep_no
    FROM satin_alma_siparisleri sas
    JOIN cariler c ON c.id = sas.cari_id
    LEFT JOIN satin_alma_talepleri t ON t.id = sas.talep_id
    WHERE sas.id = $1
  `, [id]);
  if (!s.rows[0]) return null;
  const satirlar = await pool.query(`
    SELECT ss.*,
           COALESCE(ss.stok_kodu, st.stok_kodu) AS stok_kodu,
           COALESCE(ss.stok_adi, st.stok_adi) AS stok_adi,
           (ss.miktar - ss.giren_miktar) AS kalan_miktar
    FROM satin_alma_siparis_satirlari ss
    JOIN stoklar st ON st.id = ss.stok_id
    WHERE ss.siparis_id = $1
    ORDER BY COALESCE(ss.sira_no, ss.id), ss.id
  `, [id]);
  return { ...s.rows[0], satirlar: satirlar.rows };
}

async function assertTedarikci(client, cari_id) {
  const cari = await client.query(
    'SELECT id, cari_kodu, cari_adi, cari_turu, aktif FROM cariler WHERE id = $1',
    [cari_id]
  );
  if (!cari.rows[0]) throw new Error('Cari bulunamadı.');
  if (cari.rows[0].aktif === false) throw new Error('Cari pasif; satınalma yapılamaz.');
  if (!cariTedarikciMi(cari.rows[0].cari_turu)) {
    throw new Error(
      `Satınalma siparişi yalnızca tedarikçiye açılır. Seçilen cari (${cari.rows[0].cari_kodu}) türü: ${cari.rows[0].cari_turu}`
    );
  }
  return cari.rows[0];
}

async function insertSiparisSatir(client, siparisId, s, sira, baslikKur) {
  const stok = await client.query(
    `SELECT id, birim, satin_birimi, stok_kodu, stok_adi, varsayilan_kdv_oran
     FROM stoklar WHERE id=$1`,
    [s.stok_id]
  );
  if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
  const st = stok.rows[0];
  const kur = Number(s.kur ?? baslikKur ?? 1) || 1;
  const hes = satirHesapla({
    miktar: s.miktar,
    birim_fiyat: s.birim_fiyat,
    iskonto_oran: s.iskonto_oran,
    iskonto_oran2: s.iskonto_oran2,
    iskonto_oran3: s.iskonto_oran3,
    kdv_oran: s.kdv_oran ?? st.varsayilan_kdv_oran ?? 20,
    kdv_durumu: s.kdv_durumu || 'Haric',
    tevkifat_oran: s.tevkifat_oran,
    otv_oran: s.otv_oran,
    kur,
  });
  await client.query(
    `INSERT INTO satin_alma_siparis_satirlari (
        siparis_id, talep_satir_id, stok_id, miktar, birim_fiyat, birim,
        sira_no, satir_tipi, satir_aciklama, teslim_tarihi, sevk_tarihi,
        iskonto_oran, iskonto_tutari, iskonto_oran2, iskonto_tutari2, iskonto_oran3, iskonto_tutari3,
        kdv_oran, kdv_tutari, kdv_durumu, tutar_ht, tutar_ttc,
        tevkifat_kodu, tevkifat_oran, tevkifat_tutari, otv_oran, otv_tutari,
        para_birimi, kur, kur_tipi, yp_birim_fiyat, yp_tutar,
        tedarikci_stok_kodu, tedarikci_stok_adi, depo_id, proje_kodu, bolge,
        rezervasyon_tipi, rezervasyon_iliski_no, stok_kodu, stok_adi
     ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,COALESCE($8,'S'),$9,$10,$11,
        $12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,
        $23,$24,$25,$26,$27,
        $28,$29,$30,$31,$32,
        $33,$34,$35,$36,$37,
        $38,$39,$40,$41
     )`,
    [
      siparisId, s.talep_satir_id || null, s.stok_id, s.miktar, Number(s.birim_fiyat || 0),
      s.birim || st.satin_birimi || st.birim,
      sira, s.satir_tipi || 'S', s.satir_aciklama || null, s.teslim_tarihi || null, s.sevk_tarihi || null,
      hes.iskonto_oran, hes.iskonto_tutari, hes.iskonto_oran2, hes.iskonto_tutari2, hes.iskonto_oran3, hes.iskonto_tutari3,
      hes.kdv_oran, hes.kdv_tutari, hes.kdv_durumu, hes.tutar_ht, hes.tutar_ttc,
      s.tevkifat_kodu || null, hes.tevkifat_oran, hes.tevkifat_tutari, hes.otv_oran, hes.otv_tutari,
      s.para_birimi || null, kur, s.kur_tipi || null, hes.yp_birim_fiyat, hes.yp_tutar,
      s.tedarikci_stok_kodu || null, s.tedarikci_stok_adi || null,
      s.depo_id || null, s.proje_kodu || null, s.bolge || null,
      s.rezervasyon_tipi || null, s.rezervasyon_iliski_no || null,
      s.stok_kodu || st.stok_kodu, s.stok_adi || st.stok_adi,
    ]
  );
  return { ...hes, miktar: s.miktar, birim_fiyat: Number(s.birim_fiyat || 0) };
}

async function replaceSiparisSatirlar(client, siparisId, satirlar, baslikKur) {
  await client.query('DELETE FROM satin_alma_siparis_satirlari WHERE siparis_id=$1', [siparisId]);
  const hesapli = [];
  let sira = 1;
  for (const s of satirlar || []) {
    if (!s.stok_id || s.miktar == null) continue;
    const h = await insertSiparisSatir(client, siparisId, s, s.sira_no || sira, baslikKur);
    hesapli.push(h);
    sira += 1;
  }
  const top = belgelerToplam(hesapli);
  await client.query(
    `UPDATE satin_alma_siparisleri SET
        toplam_tutar=$2, ara_toplam=$3, toplam_kdv=$4, genel_toplam=$5, iskonto_tutari=$6
     WHERE id=$1`,
    [siparisId, top.toplam_tutar, top.ara_toplam, top.toplam_kdv, top.genel_toplam, top.toplam_iskonto]
  );
  return top;
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    let sql = 'SELECT id FROM satin_alma_siparisleri';
    if (firmaId) {
      params.push(firmaId);
      sql += ` WHERE firma_id = $${params.length}`;
    }
    sql += ' ORDER BY id DESC';
    const liste = await pool.query(sql, params);
    const sonuc = [];
    for (const r of liste.rows) sonuc.push(await siparisGetir(r.id));
    res.json(sonuc);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const siparis = await siparisGetir(req.params.id);
    if (!siparis) return res.status(404).json({ hata: 'Satınalma siparişi bulunamadı.' });
    res.json(siparis);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const { cari_id, satirlar } = b;
    if (!cari_id) return res.status(400).json({ hata: 'cari_id zorunlu.' });
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const firmaId = b.firma_id || firmaIdFromReq(req) || null;

    const id = await withTransaction(pool, async (client) => {
      await assertTedarikci(client, cari_id);
      const no = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
      const siparis = await client.query(
        `INSERT INTO satin_alma_siparisleri
            (siparis_no, cari_id, is_yeri_id, talep_id, durum, toplam_tutar,
             firma_id, para_birimi, kur, kur_tipi, siparis_tarihi, teslim_tarihi, sevk_tarihi, depo_id,
             odeme_kosulu, odeme_sekli, aciklama, not_public, not_internal, proje_kodu, bolge,
             tedarikci_siparis_no, teslimat_kosulu)
         VALUES ($1,$2,$3,$4,COALESCE($5,'Taslak'),0,
             $6,$7,COALESCE($8::numeric,1),$9,COALESCE($10::date,CURRENT_DATE),$11,$12,$13,
             $14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING id`,
        [
          no, cari_id, b.is_yeri_id || null, b.talep_id || null, b.durum || 'Taslak',
          firmaId, b.para_birimi || 'TRY', b.kur ?? 1, b.kur_tipi || null,
          b.siparis_tarihi || null, b.teslim_tarihi || null, b.sevk_tarihi || null, b.depo_id || null,
          b.odeme_kosulu || null, b.odeme_sekli || null, b.aciklama || null,
          b.not_public || null, b.not_internal || null, b.proje_kodu || null, b.bolge || null,
          b.tedarikci_siparis_no || null, b.teslimat_kosulu || null,
        ]
      );
      const siparisId = siparis.rows[0].id;
      await replaceSiparisSatirlar(client, siparisId, satirlar, b.kur ?? 1);
      return siparisId;
    });

    res.status(201).json(await siparisGetir(id));
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.post('/talep-donustur', async (req, res) => {
  try {
    const { talep_id, cari_id, birim_fiyatlar } = req.body;
    if (!talep_id || !cari_id) {
      return res.status(400).json({ hata: 'talep_id ve cari_id zorunlu.' });
    }

    const id = await withTransaction(pool, async (client) => {
      const talep = await client.query('SELECT * FROM satin_alma_talepleri WHERE id = $1 FOR UPDATE', [talep_id]);
      if (!talep.rows[0]) throw new Error('Talep bulunamadı.');
      if (!['Acik', 'Onayli'].includes(talep.rows[0].durum)) {
        throw new Error(`Talep dönüştürülemez. Durum: ${talep.rows[0].durum}`);
      }
      const satirlar = await client.query(
        'SELECT * FROM satin_alma_talep_satirlari WHERE talep_id = $1 ORDER BY COALESCE(sira_no, id)',
        [talep_id]
      );
      if (satirlar.rows.length === 0) throw new Error('Talep satırı yok.');
      await assertTedarikci(client, cari_id);

      const no = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
      const fiyatMap = birim_fiyatlar || {};
      const t = talep.rows[0];
      const firmaId = t.firma_id || firmaIdFromReq(req) || null;
      const siparis = await client.query(
        `INSERT INTO satin_alma_siparisleri
            (siparis_no, cari_id, is_yeri_id, talep_id, durum, toplam_tutar, firma_id,
             depo_id, proje_kodu, bolge, para_birimi, kur, kur_tipi, teslim_tarihi)
         VALUES ($1,$2,$3,$4,'Onayli',0,$5,$6,$7,$8,COALESCE($9,'TRY'),COALESCE($10::numeric,1),$11,$12)
         RETURNING id`,
        [
          no, cari_id, t.is_yeri_id, talep_id, firmaId,
          t.depo_id || null, t.proje_kodu || null, t.bolge || null,
          t.para_birimi || 'TRY', t.kur ?? 1, t.kur_tipi || null, t.hedef_teslim_tarihi || null,
        ]
      );
      const siparisId = siparis.rows[0].id;
      const mapped = satirlar.rows.map((sat) => ({
        ...sat,
        talep_satir_id: sat.id,
        birim_fiyat: Number(
          fiyatMap[sat.stok_id] ?? fiyatMap[String(sat.stok_id)] ?? sat.tahmini_birim_fiyat ?? 0
        ),
        para_birimi: sat.para_birimi || t.para_birimi,
        kur: sat.kur ?? t.kur ?? 1,
        kur_tipi: sat.kur_tipi || t.kur_tipi,
        depo_id: sat.depo_id || t.depo_id,
        proje_kodu: sat.proje_kodu || t.proje_kodu,
        bolge: sat.bolge || t.bolge,
        teslim_tarihi: sat.teslim_tarihi || t.hedef_teslim_tarihi,
      }));
      await replaceSiparisSatirlar(client, siparisId, mapped, t.kur ?? 1);
      await client.query(`UPDATE satin_alma_talepleri SET durum = 'SipariseDonustu' WHERE id = $1`, [talep_id]);
      return siparisId;
    });

    res.status(201).json(await siparisGetir(id));
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const allowed = ['Taslak', 'Onayli', 'KismiTeslim', 'Kapali', 'Iptal'];
    if (b.durum && !allowed.includes(b.durum)) {
      return res.status(400).json({ hata: `Geçersiz durum. İzin verilen: ${allowed.join(', ')}` });
    }

    const id = await withTransaction(pool, async (client) => {
      const mevcut = await client.query(
        'SELECT * FROM satin_alma_siparisleri WHERE id=$1 FOR UPDATE',
        [req.params.id]
      );
      if (!mevcut.rows[0]) {
        const err = new Error('Sipariş bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (b.cari_id) await assertTedarikci(client, b.cari_id);

      await client.query(
        `UPDATE satin_alma_siparisleri SET
            durum = COALESCE($2, durum),
            cari_id = COALESCE($3, cari_id),
            is_yeri_id = COALESCE($4, is_yeri_id),
            talep_id = COALESCE($5, talep_id),
            firma_id = COALESCE($6, firma_id),
            para_birimi = COALESCE($7, para_birimi),
            kur = COALESCE($8, kur),
            kur_tipi = COALESCE($9, kur_tipi),
            siparis_tarihi = COALESCE($10::date, siparis_tarihi),
            teslim_tarihi = COALESCE($11::date, teslim_tarihi),
            sevk_tarihi = COALESCE($12::date, sevk_tarihi),
            depo_id = COALESCE($13, depo_id),
            odeme_kosulu = COALESCE($14, odeme_kosulu),
            odeme_sekli = COALESCE($15, odeme_sekli),
            aciklama = COALESCE($16, aciklama),
            not_public = COALESCE($17, not_public),
            not_internal = COALESCE($18, not_internal),
            proje_kodu = COALESCE($19, proje_kodu),
            bolge = COALESCE($20, bolge),
            tedarikci_siparis_no = COALESCE($21, tedarikci_siparis_no),
            teslimat_kosulu = COALESCE($22, teslimat_kosulu),
            guncelleme_tarihi = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          req.params.id,
          b.durum || null, b.cari_id || null, b.is_yeri_id || null, b.talep_id || null,
          b.firma_id || null, b.para_birimi || null, b.kur ?? null, b.kur_tipi || null,
          b.siparis_tarihi || null, b.teslim_tarihi || null, b.sevk_tarihi || null, b.depo_id || null,
          b.odeme_kosulu || null, b.odeme_sekli || null, b.aciklama ?? null,
          b.not_public ?? null, b.not_internal ?? null, b.proje_kodu || null, b.bolge || null,
          b.tedarikci_siparis_no || null, b.teslimat_kosulu || null,
        ]
      );

      if (Array.isArray(b.satirlar)) {
        const kur = b.kur ?? mevcut.rows[0].kur ?? 1;
        await replaceSiparisSatirlar(client, Number(req.params.id), b.satirlar, kur);
      }
      return Number(req.params.id);
    });

    res.json(await siparisGetir(id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/onayla', async (req, res) => {
  try {
    const upd = await pool.query(
      `UPDATE satin_alma_siparisleri SET durum='Onayli', onay_tarihi=CURRENT_TIMESTAMP
       WHERE id=$1 AND durum='Taslak' RETURNING id`,
      [req.params.id]
    );
    if (!upd.rows[0]) {
      return res.status(400).json({ hata: 'Sipariş onaylanamadı (bulunamadı veya durum Taslak değil).' });
    }
    res.json(await siparisGetir(upd.rows[0].id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sonuc = await pool.query(`DELETE FROM satin_alma_siparisleri WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
