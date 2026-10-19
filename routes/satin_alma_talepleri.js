const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { assertYetki, reqKullaniciKodu } = require('../src/utils/yetki');
const { epostaKuyrugaAl, gonderBir } = require('../src/services/epostaService');

const TALEP_BASLIK_KEYS = [
  'is_yeri_id', 'aciklama', 'tedarikci_cari_id', 'firma_id', 'durum',
  'depo_id', 'proje_kodu', 'bolge', 'hedef_teslim_tarihi', 'talep_tarihi',
  'para_birimi', 'kur', 'kur_tipi', 'not_internal',
];

function pick(body, keys) {
  const out = {};
  for (const k of keys) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

async function talepGetir(id) {
  const t = await pool.query('SELECT * FROM satin_alma_talepleri WHERE id = $1', [id]);
  if (!t.rows[0]) return null;
  const satirlar = await pool.query(`
    SELECT ts.*,
           COALESCE(ts.stok_kodu, s.stok_kodu) AS stok_kodu,
           COALESCE(ts.stok_adi, s.stok_adi) AS stok_adi,
           s.birim AS stok_birimi
    FROM satin_alma_talep_satirlari ts
    JOIN stoklar s ON s.id = ts.stok_id
    WHERE ts.talep_id = $1
    ORDER BY COALESCE(ts.sira_no, ts.id), ts.id
  `, [id]);
  return { ...t.rows[0], satirlar: satirlar.rows };
}

async function insertTalepSatir(client, talepId, s, sira) {
  const stok = await client.query(
    `SELECT id, birim, satin_birimi, stok_kodu, stok_adi, varsayilan_kdv_oran
     FROM stoklar WHERE id = $1`,
    [s.stok_id]
  );
  if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
  const st = stok.rows[0];
  await client.query(
    `INSERT INTO satin_alma_talep_satirlari (
        talep_id, stok_id, miktar, birim, sira_no, satir_tipi, satir_aciklama,
        teslim_tarihi, depo_id, proje_kodu, bolge,
        tahmini_birim_fiyat, para_birimi, kur, kur_tipi,
        kdv_oran, kdv_durumu, iskonto_oran,
        tedarikci_stok_kodu, tedarikci_stok_adi,
        rezervasyon_tipi, rezervasyon_iliski_no, stok_kodu, stok_adi
     ) VALUES (
        $1,$2,$3,$4,$5,COALESCE($6,'S'),$7,
        $8,$9,$10,$11,
        COALESCE($12::numeric,0),$13,$14,$15,
        COALESCE($16::numeric,20),COALESCE($17,'Haric'),COALESCE($18::numeric,0),
        $19,$20,$21,$22,$23,$24
     )`,
    [
      talepId, s.stok_id, s.miktar, s.birim || st.satin_birimi || st.birim, sira,
      s.satir_tipi || 'S', s.satir_aciklama || null,
      s.teslim_tarihi || null, s.depo_id || null, s.proje_kodu || null, s.bolge || null,
      s.tahmini_birim_fiyat ?? s.birim_fiyat ?? 0,
      s.para_birimi || null, s.kur ?? null, s.kur_tipi || null,
      s.kdv_oran ?? st.varsayilan_kdv_oran ?? 20, s.kdv_durumu || 'Haric', s.iskonto_oran ?? 0,
      s.tedarikci_stok_kodu || null, s.tedarikci_stok_adi || null,
      s.rezervasyon_tipi || null, s.rezervasyon_iliski_no || null,
      s.stok_kodu || st.stok_kodu, s.stok_adi || st.stok_adi,
    ]
  );
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    let sql = 'SELECT id FROM satin_alma_talepleri';
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      sql += ` WHERE firma_id = $${params.length}`;
    }
    sql += ' ORDER BY id DESC';
    const liste = await pool.query(sql, params);
    const sonuc = [];
    for (const r of liste.rows) sonuc.push(await talepGetir(r.id));
    res.json(sonuc);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const talep = await talepGetir(req.params.id);
    if (!talep) return res.status(404).json({ hata: 'Talep bulunamadı.' });
    const firmaId = firmaIdFromReq(req);
    if (firmaId && talep.firma_id != null && Number(talep.firma_id) !== Number(firmaId)) {
      return res.status(404).json({ hata: 'Talep bulunamadı.' });
    }
    res.json(talep);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const { satirlar } = body;
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const kod = reqKullaniciKodu(req);
    let olusturan = null;
    if (kod) olusturan = await assertYetki(pool, kod, 'satinalma_talep');
    const firmaId = body.firma_id || firmaIdFromReq(req) || null;
    const p = pick(body, TALEP_BASLIK_KEYS);

    const id = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'SATINALMA_TALEP');
      const baslik = await client.query(
        `INSERT INTO satin_alma_talepleri (
            talep_no, is_yeri_id, aciklama, olusturan_id, tedarikci_cari_id, firma_id,
            depo_id, proje_kodu, bolge, hedef_teslim_tarihi, talep_tarihi,
            para_birimi, kur, kur_tipi, not_internal
         ) VALUES (
            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,$10,COALESCE($11::date,CURRENT_DATE),
            COALESCE($12,'TRY'),COALESCE($13::numeric,1),$14,$15
         ) RETURNING id`,
        [
          no, p.is_yeri_id || null, p.aciklama || null, olusturan?.id || null,
          p.tedarikci_cari_id || null, firmaId,
          p.depo_id || null, p.proje_kodu || null, p.bolge || null, p.hedef_teslim_tarihi || null,
          p.talep_tarihi || null,
          p.para_birimi || 'TRY', p.kur ?? 1, p.kur_tipi || null, p.not_internal || null,
        ]
      );
      const talepId = baslik.rows[0].id;
      let sira = 1;
      for (const s of satirlar) {
        if (!s.stok_id || s.miktar == null) continue;
        await insertTalepSatir(client, talepId, s, s.sira_no || sira);
        sira += 1;
      }
      return talepId;
    });

    res.status(201).json(await talepGetir(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const { satirlar } = body;
    const allowed = ['Acik', 'Onayli', 'SipariseDonustu', 'Iptal', 'Kapali'];
    if (body.durum && !allowed.includes(body.durum)) {
      return res.status(400).json({ hata: `Geçersiz durum. İzin verilen: ${allowed.join(', ')}` });
    }
    const p = pick(body, TALEP_BASLIK_KEYS);

    const id = await withTransaction(pool, async (client) => {
      const mevcut = await client.query(
        'SELECT id FROM satin_alma_talepleri WHERE id=$1 FOR UPDATE',
        [req.params.id]
      );
      if (!mevcut.rows[0]) {
        const err = new Error('Talep bulunamadı.');
        err.status = 404;
        throw err;
      }
      await client.query(
        `UPDATE satin_alma_talepleri SET
            aciklama = COALESCE($2, aciklama),
            durum = COALESCE($3, durum),
            is_yeri_id = COALESCE($4, is_yeri_id),
            tedarikci_cari_id = COALESCE($5, tedarikci_cari_id),
            depo_id = COALESCE($6, depo_id),
            proje_kodu = COALESCE($7, proje_kodu),
            bolge = COALESCE($8, bolge),
            hedef_teslim_tarihi = COALESCE($9::date, hedef_teslim_tarihi),
            talep_tarihi = COALESCE($10::date, talep_tarihi),
            para_birimi = COALESCE($11, para_birimi),
            kur = COALESCE($12, kur),
            kur_tipi = COALESCE($13, kur_tipi),
            not_internal = COALESCE($14, not_internal),
            firma_id = COALESCE($15, firma_id)
         WHERE id = $1`,
        [
          req.params.id,
          p.aciklama ?? null, p.durum || null, p.is_yeri_id || null,
          p.tedarikci_cari_id || null, p.depo_id || null, p.proje_kodu || null, p.bolge || null,
          p.hedef_teslim_tarihi || null, p.talep_tarihi || null,
          p.para_birimi || null, p.kur ?? null, p.kur_tipi || null, p.not_internal ?? null,
          p.firma_id || null,
        ]
      );
      if (Array.isArray(satirlar)) {
        await client.query('DELETE FROM satin_alma_talep_satirlari WHERE talep_id=$1', [req.params.id]);
        let sira = 1;
        for (const s of satirlar) {
          if (!s.stok_id || s.miktar == null) continue;
          await insertTalepSatir(client, Number(req.params.id), s, s.sira_no || sira);
          sira += 1;
        }
      }
      return Number(req.params.id);
    });

    res.json(await talepGetir(id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/onayla', async (req, res) => {
  try {
    const onaylayan = await assertYetki(pool, reqKullaniciKodu(req), 'satinalma_onay');
    const epostaGonder = req.body.eposta !== false;

    const sonuc = await withTransaction(pool, async (client) => {
      const upd = await client.query(
        `UPDATE satin_alma_talepleri SET
            durum='Onayli', onaylayan_id=$2, onay_tarihi=CURRENT_TIMESTAMP,
            tedarikci_cari_id=COALESCE($3, tedarikci_cari_id)
         WHERE id=$1 AND durum='Acik' RETURNING *`,
        [req.params.id, onaylayan.id, req.body.tedarikci_cari_id || null]
      );
      if (!upd.rows[0]) {
        const err = new Error('Talep onaylanamadı (bulunamadı veya durum Acik değil).');
        err.status = 400;
        throw err;
      }
      const talep = upd.rows[0];
      let eposta = null;
      if (epostaGonder) {
        let alici = req.body.alici_eposta || null;
        let cariAd = '';
        if (talep.tedarikci_cari_id) {
          const c = await client.query('SELECT cari_adi, email FROM cariler WHERE id=$1', [talep.tedarikci_cari_id]);
          alici = alici || c.rows[0]?.email || null;
          cariAd = c.rows[0]?.cari_adi || '';
        }
        if (alici) {
          const satirlar = await client.query(
            `SELECT COALESCE(ts.stok_kodu, s.stok_kodu) AS stok_kodu,
                    COALESCE(ts.stok_adi, s.stok_adi) AS stok_adi,
                    ts.miktar, ts.birim, ts.teslim_tarihi
             FROM satin_alma_talep_satirlari ts
             JOIN stoklar s ON s.id = ts.stok_id
             WHERE ts.talep_id=$1 ORDER BY COALESCE(ts.sira_no, ts.id)`,
            [talep.id]
          );
          const govde = [
            `Satınalma talebi onaylandı: ${talep.talep_no}`,
            cariAd ? `Tedarikçi: ${cariAd}` : '',
            talep.proje_kodu ? `Proje: ${talep.proje_kodu}` : '',
            '',
            ...satirlar.rows.map((s) => `- ${s.stok_kodu} ${s.stok_adi}: ${s.miktar} ${s.birim || ''}${s.teslim_tarihi ? ` (teslim ${s.teslim_tarihi})` : ''}`),
            '',
            talep.aciklama || '',
          ].filter(Boolean).join('\n');
          eposta = await epostaKuyrugaAl(client, {
            kaynakTipi: 'SATINALMA_TALEP',
            kaynakId: talep.id,
            alici,
            konu: `Satınalma talebi ${talep.talep_no}`,
            govde,
          });
          eposta = await gonderBir(client, eposta.id);
        }
      }
      return { talepId: talep.id, eposta };
    });

    const talep = await talepGetir(sonuc.talepId);
    res.json({ ...talep, eposta: sonuc.eposta });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sonuc = await pool.query(`DELETE FROM satin_alma_talepleri WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Talep bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
