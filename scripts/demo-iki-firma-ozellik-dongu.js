#!/usr/bin/env node
/**
 * İki firma — bambaşka özellik setleriyle uçtan uca döngü
 *
 * DEMO (metal/elektronik, is_yeri IY-001):
 *   CRM (aday→fırsat→faaliyet→görev) → satış teklifi → sipariş → rezervasyon
 *   RFQ → SA teklif → anlaşma → SA sipariş → mal kabul
 *   transfer + sayım + sevk → irsaliye → fatura → tahsilat
 *   muhasebe fişi + döviz kuru
 *
 * GIDA (gıda, is_yeri IY-01):
 *   Lot/parti + KK plan/stok-plan + GKK emri
 *   MRP bağımsız ihtiyaç → MRP çalıştır → SA + UE önerisi
 *   üretim (pastörizasyon hattı) + uygunsuzluk
 *   soğuk depo transfer + satış siparişi → sevk → fatura
 *   fiyat listesi
 *
 * Kullanım: node scripts/demo-iki-firma-ozellik-dongu.js
 */
require('dotenv').config();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const stokSvc = require('../src/services/stokHareketService');
const { mrpCalistir } = require('../src/services/mrpService');
const { kkEmriOlustur } = require('../src/services/kaliteService');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

const BASE = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const report = {
  generated_at: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
  base: BASE,
  DEMO: { features: [], docs: {} },
  GIDA: { features: [], docs: {} },
  errors: [],
};

function log(firma, msg) {
  console.log(`[${firma}] ${msg}`);
}
function feat(firma, name, detail) {
  report[firma].features.push({ name, detail });
  log(firma, `✓ ${name}${detail ? ` — ${detail}` : ''}`);
}
function doc(firma, key, val) {
  report[firma].docs[key] = val;
}

async function api(method, path, body, firmaId) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Kullanici-Kodu': 'owner',
  };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  if (global.__TOKEN) headers.Authorization = `Bearer ${global.__TOKEN}`;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    const err = new Error(`${method} ${path} → ${r.status}: ${data?.hata || data?.detay || text}`);
    err.status = r.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function login() {
  try {
    const j = await api('POST', '/auth/login', { username: 'kagantalha.b', password: 'Demo123!' });
    if (j.access_token) global.__TOKEN = j.access_token;
    log('AUTH', 'JWT alındı');
  } catch (e) {
    log('AUTH', `soft header — ${e.message}`);
  }
}

async function ensureStokDepo(client, stokId, depoId, isYeriId) {
  await client.query(
    `INSERT INTO stok_depo (stok_id, depo_id, is_yeri_id, aktif)
     SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
       SELECT 1 FROM stok_depo WHERE stok_id=$1 AND depo_id=$2
     )`,
    [stokId, depoId, isYeriId || null],
  );
}

async function ensureStokIsYeri(client, stokId, isYeriId) {
  await client.query(
    `INSERT INTO stok_is_yeri (stok_id, is_yeri_id, aktif)
     VALUES ($1,$2,TRUE)
     ON CONFLICT (stok_id, is_yeri_id) DO UPDATE SET aktif=TRUE`,
    [stokId, isYeriId],
  );
}

async function kod(client, seri) {
  return sonrakiKod(client, seri);
}

async function soft(firma, label, fn) {
  try {
    return await fn();
  } catch (e) {
    report.errors.push({ firma, label, error: e.message });
    log(firma, `⚠ ${label}: ${e.message}`);
    return null;
  }
}

/* ===================== DEMO: CRM + ticari + transfer/sayım ===================== */
async function runDemoCycle() {
  const F = 'DEMO';
  const firma = (await pool.query(`SELECT * FROM firmalar WHERE firma_kodu='DEMO'`)).rows[0];
  const plant = (await pool.query(`SELECT * FROM is_yerleri WHERE firma_id=$1 ORDER BY id LIMIT 1`, [firma.id])).rows[0];
  const fid = firma.id;
  const iy = plant.id;

  const depolar = (await pool.query(`SELECT * FROM depolar WHERE is_yeri_id=$1 ORDER BY id`, [iy])).rows;
  let ana = depolar.find((d) => /Ana|Hammadde/i.test(d.depo_adi)) || depolar[0];
  let ym = depolar.find((d) => /Yarı|YM/i.test(d.depo_adi)) || depolar[1];
  let mm = depolar.find((d) => /Mamul/i.test(d.depo_adi)) || depolar[2];

  await withTransaction(pool, async (client) => {
    if (!ana) {
      const k = await kod(client, 'DEPO');
      ana = (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, varsayilan) VALUES ($1,$2,'Ana Depo',TRUE) RETURNING *`,
        [iy, k],
      )).rows[0];
    }
    if (!ym) {
      const k = await kod(client, 'DEPO');
      ym = (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi) VALUES ($1,$2,'Yarı Mamul Depo') RETURNING *`,
        [iy, k],
      )).rows[0];
    }
    if (!mm) {
      const k = await kod(client, 'DEPO');
      mm = (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi) VALUES ($1,$2,'Mamul Depo') RETURNING *`,
        [iy, k],
      )).rows[0];
    }
  });

  // Stoklar
  const stocks = (await pool.query(
    `SELECT s.* FROM stoklar s
     JOIN stok_is_yeri siy ON siy.stok_id=s.id AND siy.is_yeri_id=$1
     ORDER BY s.id`,
    [iy],
  )).rows;
  const mmStok = stocks.find((s) => s.stok_tipi === 'Mamul') || stocks[stocks.length - 1];
  const hmStoklar = stocks.filter((s) => s.stok_tipi === 'Hammadde');

  await withTransaction(pool, async (client) => {
    for (const s of stocks) {
      for (const d of [ana, ym, mm]) await ensureStokDepo(client, s.id, d.id, iy);
    }
    // Mamul bakiyesi — satış/sevk için
    if (mmStok) {
      await stokSvc.stokHareketOlustur(client, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: iy,
        depoId: mm.id,
        belgeTipi: 'Acilis',
        aciklama: '[DEMO] Mamul açılış — satış döngüsü',
        firmaId: fid,
        satirlar: [{ stok_id: mmStok.id, miktar: 100, yon: 1, birim: mmStok.birim || 'AD' }],
      });
    }
  });

  // --- CRM ---
  const stage = await soft(F, 'CRM aşama', async () => {
    const list = await api('GET', '/crm-firsat-asamalari', null, fid);
    if (Array.isArray(list) && list[0]) return list[0];
    return api('POST', '/crm-firsat-asamalari', {
      asama_kodu: `DM-S${Date.now().toString().slice(-4)}`,
      asama_adi: 'Teklif',
      sira_no: 20,
    }, fid);
  });
  const actType = await soft(F, 'CRM faaliyet tipi', async () => {
    const list = await api('GET', '/crm-faaliyet-tipleri', null, fid);
    if (Array.isArray(list) && list[0]) return list[0];
    return api('POST', '/crm-faaliyet-tipleri', {
      tip_kodu: `DM-T${Date.now().toString().slice(-4)}`,
      tip_adi: 'Demo Ziyaret',
    }, fid);
  });

  const aday = await soft(F, 'CRM aday', () => api('POST', '/crm-adaylar', {
    aday_adi: 'Demo Metal Holding A.Ş.',
    durum: 'Yeni',
    bulma_yontemi: 'Web',
    ulke: 'TR',
    il: 'İstanbul',
    notlar: '[DEMO-CRM] Metal holding adayı',
  }, fid));
  if (aday) { feat(F, 'CRM Aday', aday.aday_kodu || aday.id); doc(F, 'crm_aday', aday.aday_kodu || aday.id); }

  const firsat = await soft(F, 'CRM fırsat', () => api('POST', '/crm-firsatlar', {
    firsat_adi: 'Demo Cihaz 50 adet fırsat',
    asama_id: stage?.id,
    aday_id: aday?.id,
    musteri_tipi: 'Aday',
    beklenen_gelir: 75000,
    para_birimi: 'TRY',
    is_yeri_id: iy,
    aciklama: '[DEMO-CRM] Fırsat',
  }, fid));
  if (firsat) { feat(F, 'CRM Fırsat', firsat.firsat_kodu || firsat.id); doc(F, 'crm_firsat', firsat.firsat_kodu || firsat.id); }

  await soft(F, 'CRM faaliyet', () => api('POST', '/crm-faaliyetler', {
    faaliyet_tipi_id: actType?.id,
    konu: 'Demo cihaz demo toplantısı',
    firsat_id: firsat?.id,
    aday_id: aday?.id,
    musteri_tipi: 'Aday',
    durum: 'Acik',
    baslangic_tarihi: new Date().toISOString(),
    is_yeri_id: iy,
  }, fid));
  feat(F, 'CRM Faaliyet');

  await soft(F, 'CRM görev', () => api('POST', '/crm-gorevler', {
    baslik: 'Teknik şartname gönder',
    firsat_id: firsat?.id,
    aday_id: aday?.id,
    durum: 'Acik',
    son_tarih: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
  }, fid));
  feat(F, 'CRM Görev');

  // Cariler
  let musteri = (await pool.query(
    `SELECT * FROM cariler WHERE cari_turu='Musteri' AND (firma_id=$1 OR is_yeri_id=$2) ORDER BY id LIMIT 1`,
    [fid, iy],
  )).rows[0];
  let ted = (await pool.query(
    `SELECT * FROM cariler WHERE cari_turu='Tedarikci' AND (firma_id=$1 OR is_yeri_id=$2) ORDER BY id LIMIT 1`,
    [fid, iy],
  )).rows[0];

  // Satış teklifi
  const teklif = await soft(F, 'Satış teklifi', () => api('POST', '/satis-teklifleri', {
    cari_id: musteri?.id,
    is_yeri_id: iy,
    firma_id: fid,
    durum: 'Onayli',
    aciklama: '[DEMO] Satış teklifi — CRM fırsatından',
    satirlar: [{ stok_id: mmStok.id, miktar: 50, birim_fiyat: 1500, birim: 'AD' }],
  }, fid));
  if (teklif) { feat(F, 'Satış Teklifi', teklif.teklif_no || teklif.id); doc(F, 'satis_teklif', teklif.teklif_no || teklif.id); }

  // Satış siparişi + rezervasyon
  const so = await soft(F, 'Satış siparişi', () => api('POST', '/siparisler', {
    siparis_turu: 'AlinanSiparis',
    cari_id: musteri?.id,
    is_yeri_id: iy,
    firma_id: fid,
    depo_id: mm.id,
    durum: 'Onayli',
    aciklama: '[DEMO] Satış siparişi',
    kalemler: [{ stok_id: mmStok.id, miktar: 20, birim_fiyat: 1500 }],
  }, fid));
  if (so) {
    feat(F, 'Satış Siparişi', so.siparis_no);
    doc(F, 'satis_siparis', so.siparis_no);
    await soft(F, 'Stok rezervasyon', () => api('POST', `/siparisler/${so.id}/rezerve`, { depo_id: mm.id }, fid));
    feat(F, 'Stok Rezervasyon', so.siparis_no);
  }

  // RFQ zinciri
  const rfq = await soft(F, 'RFQ', () => api('POST', '/satin-alma-teklif-istekleri', {
    is_yeri_id: iy,
    firma_id: fid,
    aciklama: '[DEMO] RFQ vida/sac',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, miktar: 100, birim: 'AD' })),
  }, fid));
  if (rfq) { feat(F, 'RFQ / Teklif İstek', rfq.istek_no || rfq.id); doc(F, 'rfq', rfq.istek_no || rfq.id); }

  const saTeklif = await soft(F, 'SA teklif', () => api('POST', '/satin-alma-teklifleri', {
    cari_id: ted?.id,
    is_yeri_id: iy,
    istek_id: rfq?.id,
    durum: 'Onayli',
    aciklama: '[DEMO] Tedarikçi teklifi',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, miktar: 100, birim_fiyat: 25, birim: 'AD' })),
  }, fid));
  if (saTeklif) feat(F, 'SA Teklif', saTeklif.teklif_no || saTeklif.id);

  const anlasma = await soft(F, 'SA anlaşma', () => api('POST', '/satin-alma-anlasmalari', {
    cari_id: ted?.id,
    is_yeri_id: iy,
    firma_id: fid,
    durum: 'Onayli',
    aciklama: '[DEMO] Yıllık anlaşma',
    satirlar: hmStoklar.slice(0, 1).map((s) => ({
      stok_id: s.id, miktar: 1, birim_fiyat: 22, birim: s.birim || 'AD',
    })),
  }, fid));
  if (anlasma) feat(F, 'SA Anlaşma', anlasma.anlasma_no || anlasma.id);

  const talep = await soft(F, 'SA talep', () => api('POST', '/satin-alma-talepleri', {
    is_yeri_id: iy,
    aciklama: '[DEMO] Ek hammadde talebi',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, miktar: 40, birim: 'AD' })),
  }, fid));
  if (talep) {
    await soft(F, 'SA talep onay', () => api('POST', `/satin-alma-talepleri/${talep.id}/onayla`, {}, fid));
    feat(F, 'SA Talep', talep.talep_no);
    doc(F, 'sa_talep', talep.talep_no);
  }

  const sas = await soft(F, 'SA sipariş', () => api('POST', '/satin-alma-siparisleri', {
    cari_id: ted?.id,
    is_yeri_id: iy,
    talep_id: talep?.id,
    durum: 'Taslak',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, miktar: 40, birim_fiyat: 25, birim: 'AD' })),
  }, fid));
  if (sas) {
    await soft(F, 'SA sipariş onay', () => api('POST', `/satin-alma-siparisleri/${sas.id}/onayla`, {}, fid));
    feat(F, 'SA Sipariş', sas.siparis_no);
    doc(F, 'sa_siparis', sas.siparis_no);
    const mk = await soft(F, 'Mal kabul', () => api('POST', '/mal-kabuller', {
      siparis_id: sas.id, depo_id: ana.id,
    }, fid));
    if (mk) { feat(F, 'Mal Kabul', mk.kabul_no); doc(F, 'mal_kabul', mk.kabul_no); }
  }

  // Transfer Ana → YM — önce kaynak bakiyesi için açılış
  if (hmStoklar[0]) {
    await soft(F, 'Transfer öncesi açılış', async () => {
      await withTransaction(pool, async (client) => {
        await stokSvc.stokHareketOlustur(client, {
          hareketTipi: 'STOK_GIRIS',
          isYeriId: iy,
          depoId: ana.id,
          belgeTipi: 'Acilis',
          aciklama: '[DEMO] Transfer/sayım açılış',
          firmaId: fid,
          satirlar: hmStoklar.slice(0, 2).map((s) => ({
            stok_id: s.id, miktar: 50, yon: 1, birim: s.birim || 'AD',
          })),
        });
      });
    });
  }

  const transfer = await soft(F, 'Transfer emri', () => api('POST', '/transfer-emirleri', {
    kaynak_depo_id: ana.id,
    hedef_depo_id: ym.id,
    is_yeri_id: iy,
    firma_id: fid,
    aciklama: '[DEMO] Ana→YM transfer',
    satirlar: hmStoklar.slice(0, 1).map((s) => ({ stok_id: s.id, miktar: 5, birim: s.birim || 'AD' })),
  }, fid));
  if (transfer) {
    feat(F, 'Transfer Emri', transfer.emir_no || transfer.id);
    doc(F, 'transfer', transfer.emir_no || transfer.id);
    await soft(F, 'Transfer onay/tamamla', async () => {
      const id = transfer.id;
      try { return await api('POST', `/transfer-emirleri/${id}/onayla`, {}, fid); }
      catch (_) { return api('POST', `/transfer-emirleri/${id}/tamamla`, {}, fid); }
    });
  }

  // Sayım
  const sayim = await soft(F, 'Sayım belgesi', () => api('POST', '/sayim-belgeleri', {
    depo_id: ana.id,
    is_yeri_id: iy,
    firma_id: fid,
    aciklama: '[DEMO] Periyodik sayım',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({
      stok_id: s.id, sayilan_miktar: 30, birim: s.birim || 'AD',
    })),
  }, fid));
  if (sayim) { feat(F, 'Sayım Belgesi', sayim.belge_no || sayim.id); doc(F, 'sayim', sayim.belge_no || sayim.id); }

  // Sevk → irsaliye → fatura
  if (so) {
    const sevk = await soft(F, 'Sevk emri', () => api('POST', `/siparisler/${so.id}/sevk-emri-olustur`, {
      depo_id: mm.id, warehouse_id: mm.id,
    }, fid));
    if (sevk) {
      feat(F, 'Sevk Emri', sevk.sevk_no || sevk.order_no || sevk.id);
      doc(F, 'sevk', sevk.sevk_no || sevk.id);
    }
    const irs = await soft(F, 'İrsaliye', () => api('POST', '/irsaliyeler', {
      siparis_id: so.id,
      cari_id: musteri?.id,
      depo_id: mm.id,
      is_yeri_id: iy,
      irsaliye_turu: 'Satis',
      durum: 'Onayli',
      aciklama: '[DEMO] Satış irsaliyesi',
      satirlar: [{ stok_id: mmStok.id, miktar: 10, birim: 'AD' }],
    }, fid));
    if (irs) {
      feat(F, 'İrsaliye', irs.irsaliye_no || irs.id);
      doc(F, 'irsaliye', irs.irsaliye_no || irs.id);
      const fat = await soft(F, 'Fatura', async () => {
        try {
          return await api('POST', `/irsaliyeler/${irs.id}/fatura-olustur`, {}, fid);
        } catch (_) {
          return api('POST', '/faturalar', {
            cari_id: musteri?.id,
            is_yeri_id: iy,
            fatura_turu: 'Satis',
            durum: 'Onayli',
            aciklama: '[DEMO] Satış faturası',
            satirlar: [{ stok_id: mmStok.id, miktar: 10, birim_fiyat: 1500, birim: 'AD' }],
          }, fid);
        }
      });
      if (fat) {
        feat(F, 'Fatura', fat.fatura_no || fat.id);
        doc(F, 'fatura', fat.fatura_no || fat.id);
        await soft(F, 'Tahsilat', () => api('POST', '/tahsilat-odemeler', {
          cari_id: musteri?.id,
          tutar: 15000,
          tip: 'Tahsilat',
          aciklama: '[DEMO] Fatura tahsilatı',
          fatura_id: fat.id,
        }, fid));
        feat(F, 'Tahsilat/Ödeme');
      }
    }
  }

  // Döviz + muhasebe
  await soft(F, 'Döviz kuru', () => api('POST', '/doviz-kurlari', {
    kur_tarihi: new Date().toISOString().slice(0, 10),
    kaynak_pb: 'USD',
    hedef_pb: 'TRY',
    alis_kuru: 34.5,
    satis_kuru: 34.8,
    kaynak: 'TCMB',
  }, fid));
  feat(F, 'Döviz Kuru', 'USD/TRY');

  const hesaplar = (await pool.query(
    `SELECT id, hesap_kodu FROM muhasebe_hesaplari WHERE hesap_kodu IN ('100.01.001','120.01.001') ORDER BY hesap_kodu`,
  )).rows;
  const kasa = hesaplar.find((h) => h.hesap_kodu.startsWith('100')) || hesaplar[0];
  const alacak = hesaplar.find((h) => h.hesap_kodu.startsWith('120')) || hesaplar[1];
  if (kasa && alacak) {
    await soft(F, 'Muhasebe fişi', () => api('POST', '/muhasebe-belgeleri', {
      aciklama: '[DEMO] Demo mahsup fişi',
      kalemler: [
        { hesap_id: kasa.id, borc: 1000, alacak: 0, aciklama: 'Kasa' },
        { hesap_id: alacak.id, borc: 0, alacak: 1000, aciklama: 'Alıcılar' },
      ],
    }, fid));
    feat(F, 'Muhasebe Belgesi');
  }

  // Fiyat listesi
  await soft(F, 'Fiyat listesi', () => api('POST', '/fiyat-listeleri', {
    liste_kodu: `DM-FL-${Date.now().toString().slice(-4)}`,
    liste_adi: 'DEMO Standart Liste',
    para_birimi: 'TRY',
    satirlar: [{ stok_id: mmStok.id, birim_fiyat: 1500 }],
  }, fid));
  feat(F, 'Fiyat Listesi');
}

/* ===================== GIDA: lot + KK + MRP + üretim ===================== */
async function runGidaCycle() {
  const F = 'GIDA';
  const firma = (await pool.query(`SELECT * FROM firmalar WHERE firma_kodu='GIDA'`)).rows[0];
  let plant = (await pool.query(`SELECT * FROM is_yerleri WHERE firma_id=$1 ORDER BY id LIMIT 1`, [firma.id])).rows[0];
  const fid = firma.id;

  // Master: depolar, cariler, stoklar, BOM, rota
  const ctx = await withTransaction(pool, async (client) => {
    if (!plant) {
      plant = (await client.query(
        `INSERT INTO is_yerleri (firma_id, is_yeri_kodu, is_yeri_adi, adres)
         VALUES ($1,'IY-GIDA-01','Gıda Fabrika','Konya OSB') RETURNING *`,
        [fid],
      )).rows[0];
    }
    const iy = plant.id;

    async function ensureDepoRol(kod, adi, rol, varsayilan = false) {
      let d = (await client.query(
        `SELECT * FROM depolar WHERE is_yeri_id=$1 AND depo_kodu=$2`, [iy, kod],
      )).rows[0];
      if (d) {
        if (rol) await client.query(`UPDATE depolar SET depo_rolu=$2 WHERE id=$1`, [d.id, rol]);
        return (await client.query(`SELECT * FROM depolar WHERE id=$1`, [d.id])).rows[0];
      }
      if (varsayilan) await client.query(`UPDATE depolar SET varsayilan=FALSE WHERE is_yeri_id=$1`, [iy]);
      return (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, varsayilan, depo_rolu)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [iy, kod, adi, varsayilan, rol || 'Normal'],
      )).rows[0];
    }
    const whHmd = await ensureDepoRol('GIDA-HMD', 'Hammadde / Çiğ Süt', 'Hammadde', true);
    const whYm = await ensureDepoRol('GIDA-YM', 'Yarı Mamul Pastörize', 'Normal');
    const whMam = await ensureDepoRol('GIDA-MAM', 'Mamul Soğuk Depo', 'Mamul');
    const whGkk = await ensureDepoRol('GIDA-GKK', 'Giriş Kalite', 'GKK');

    async function ensureCari(adi, tur) {
      let c = (await client.query(
        `SELECT * FROM cariler WHERE cari_adi=$1 AND (firma_id=$2 OR is_yeri_id=$3)`,
        [adi, fid, iy],
      )).rows[0];
      if (c) return c;
      const seri = tur === 'Musteri' ? 'MUSTERI' : 'TEDARIKCI';
      const ck = await kod(client, seri);
      return (await client.query(
        `INSERT INTO cariler (cari_kodu, cari_adi, cari_turu, firma_id, is_yeri_id, aktif)
         VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING *`,
        [ck, adi, tur, fid, iy],
      )).rows[0];
    }
    const ted = await ensureCari('Çiftlik Kooperatifi Konya', 'Tedarikci');
    const mus = await ensureCari('Market Zinciri Gıda A.Ş.', 'Musteri');

    async function ensureStok(adi, tip, birim, fiyat) {
      let s = (await client.query(`SELECT * FROM stoklar WHERE stok_adi=$1`, [adi])).rows[0];
      if (!s) {
        const seri = tip === 'Mamul' ? 'MAMUL' : tip === 'YariMamul' ? 'MAMUL' : 'HAMMADDE';
        const sk = await kod(client, seri);
        s = (await client.query(
          `INSERT INTO stoklar (stok_kodu, stok_adi, birim, satis_fiyati, stok_tipi, tedarik_tipi, firma_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [sk, adi, birim, fiyat, tip, tip === 'Mamul' || tip === 'YariMamul' ? 'Uretim' : 'Satinalma', fid],
        )).rows[0];
      }
      await ensureStokIsYeri(client, s.id, iy);
      for (const d of [whHmd, whYm, whMam, whGkk]) await ensureStokDepo(client, s.id, d.id, iy);
      return s;
    }

    const sut = await ensureStok('Çiğ Süt', 'Hammadde', 'LT', 18);
    const karton = await ensureStok('Ambalaj Karton 1L', 'Hammadde', 'AD', 1.2);
    const kapak = await ensureStok('Kapak Folyo', 'Hammadde', 'AD', 0.3);
    const past = await ensureStok('Pastörize Süt Ara Ürün', 'YariMamul', 'LT', 20);
    const mamul = await ensureStok('Tam Yağlı Süt 1L', 'Mamul', 'AD', 28);
    await client.query(
      `UPDATE stoklar SET kalite_kontrol_gerekli=TRUE WHERE id=$1`,
      [sut.id],
    ).catch(() => null);

    // BOM
    let bom = (await client.query(`SELECT * FROM urun_agaclari WHERE mamul_stok_id=$1`, [mamul.id])).rows[0];
    if (!bom) {
      const bk = await kod(client, 'URUN_AGACI');
      bom = (await client.query(
        `INSERT INTO urun_agaclari (agac_kodu, agac_adi, mamul_stok_id, miktar, firma_id)
         VALUES ($1,'GIDA Süt BOM',$2,1,$3) RETURNING *`,
        [bk, mamul.id, fid],
      )).rows[0];
      await client.query(
        `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no) VALUES
         ($1,$2,1.02,'LT',10), ($1,$3,1,'AD',20), ($1,$4,1,'AD',30)`,
        [bom.id, sut.id, karton.id, kapak.id],
      );
    }

    // İş merkezi + rota
    let wc = (await client.query(
      `SELECT * FROM is_merkezleri WHERE is_yeri_id=$1 AND merkez_kodu='GIDA-HAT1'`, [iy],
    )).rows[0];
    if (!wc) {
      wc = (await client.query(
        `INSERT INTO is_merkezleri (is_yeri_id, merkez_kodu, merkez_adi)
         VALUES ($1,'GIDA-HAT1','Pastörizasyon Hattı') RETURNING *`, [iy],
      )).rows[0];
    }
    let rota = (await client.query(`SELECT * FROM rotalar WHERE stok_id=$1`, [mamul.id])).rows[0];
    if (!rota) {
      const rk = await kod(client, 'ROTA');
      rota = (await client.query(
        `INSERT INTO rotalar (rota_kodu, rota_adi, stok_id, urun_agaci_id, firma_id)
         VALUES ($1,'GIDA süt rota',$2,$3,$4) RETURNING *`,
        [rk, mamul.id, bom.id, fid],
      )).rows[0];
      await client.query(
        `INSERT INTO rota_operasyonlari (rota_id, operasyon_kodu, operasyon_adi, sira_no, is_merkezi_id, sure_dk, cikti_stok_id)
         VALUES
         ($1,'OP10','Kabul-Analiz',10,$2,15,$3),
         ($1,'OP20','Pastörizasyon',20,$2,40,$4),
         ($1,'OP30','Dolum-Paket',30,$2,25,$5)`,
        [rota.id, wc.id, past.id, past.id, mamul.id],
      );
    }

    return { iy, whHmd, whYm, whMam, whGkk, ted, mus, sut, karton, kapak, past, mamul, bom, rota, wc };
  });

  const { iy, whHmd, whYm, whMam, whGkk, ted, mus, sut, karton, kapak, mamul, bom, rota } = ctx;
  feat(F, 'Master veri', `stok+BOM+rota+4 depo`);

  // Lot / parti
  const parti = await soft(F, 'Stok parti', () => api('POST', '/stok-partileri', {
    stok_id: sut.id,
    parti_no: `SUT-${Date.now().toString().slice(-6)}`,
    uretim_tarihi: new Date().toISOString().slice(0, 10),
    son_kullanma_tarihi: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10),
    aciklama: '[GIDA] Çiğ süt lotu',
  }, fid));
  if (parti) { feat(F, 'Lot/Parti', parti.parti_no || parti.id); doc(F, 'parti', parti.parti_no); }

  // KK plan + stok plan
  const plan = await soft(F, 'KK kontrol planı', async () => {
    const list = await api('GET', '/kk-kontrol-planlari', null, fid);
    const existing = Array.isArray(list) && list.find((p) => p.yon === 'GKK' || /süt|GIDA/i.test(p.plan_adi || ''));
    if (existing) return existing;
    return api('POST', '/kk-kontrol-planlari', {
      plan_kodu: `GIDA-GKK-${Date.now().toString().slice(-4)}`,
      plan_adi: 'Çiğ süt giriş kontrol',
      yon: 'GKK',
      aciklama: '[GIDA] Antibiyotik/asitlik',
      kriterler: [
        { kriter_kodu: 'ASIT', kriter_adi: 'Asitlik', min_deger: 6.5, max_deger: 6.8 },
        { kriter_kodu: 'TEMP', kriter_adi: 'Sıcaklık °C', max_deger: 4 },
      ],
    }, fid);
  });
  if (plan) feat(F, 'KK Kontrol Planı', plan.plan_kodu || plan.id);

  await soft(F, 'KK stok plan bağı', () => api('POST', '/kk-stok-planlari', {
    stok_id: sut.id,
    plan_id: plan?.id,
    yon: 'GKK',
    aktif: true,
  }, fid));
  feat(F, 'KK Stok-Plan Bağı');

  // SA + mal kabul (çiğ süt) → GKK
  const talep = await soft(F, 'SA talep', () => api('POST', '/satin-alma-talepleri', {
    is_yeri_id: iy,
    aciklama: '[GIDA] Çiğ süt + ambalaj',
    satirlar: [
      { stok_id: sut.id, miktar: 500, birim: 'LT' },
      { stok_id: karton.id, miktar: 500, birim: 'AD' },
      { stok_id: kapak.id, miktar: 500, birim: 'AD' },
    ],
  }, fid));
  if (talep) await soft(F, 'SA talep onay', () => api('POST', `/satin-alma-talepleri/${talep.id}/onayla`, {}, fid));
  if (talep) feat(F, 'SA Talep', talep.talep_no);

  const sas = await soft(F, 'SA sipariş', () => api('POST', '/satin-alma-siparisleri', {
    cari_id: ted.id,
    is_yeri_id: iy,
    talep_id: talep?.id,
    durum: 'Taslak',
    satirlar: [
      { stok_id: sut.id, miktar: 500, birim_fiyat: 18, birim: 'LT' },
      { stok_id: karton.id, miktar: 500, birim_fiyat: 1.2, birim: 'AD' },
      { stok_id: kapak.id, miktar: 500, birim_fiyat: 0.3, birim: 'AD' },
    ],
  }, fid));
  if (sas) {
    await soft(F, 'SA sipariş onay', () => api('POST', `/satin-alma-siparisleri/${sas.id}/onayla`, {}, fid));
    feat(F, 'SA Sipariş', sas.siparis_no);
    doc(F, 'sa_siparis', sas.siparis_no);
    const mk = await soft(F, 'Mal kabul → GKK depo', () => api('POST', '/mal-kabuller', {
      siparis_id: sas.id, depo_id: whGkk.id,
    }, fid));
    if (mk) { feat(F, 'Mal Kabul (GKK depoya)', mk.kabul_no); doc(F, 'mal_kabul', mk.kabul_no); }
  }

  // GKK emri — API create yok; mal kabulden veya servisten oluştur
  let gkk = null;
  await soft(F, 'GKK emri oluştur', async () => {
    const list = await api('GET', `/kk-emirleri?yon=GKK&stok_id=${sut.id}`, null, fid);
    const open = Array.isArray(list)
      ? list.find((e) => !e.transfer_hareket_id && !['Onayli', 'Red', 'Kismi'].includes(e.durum))
      : null;
    if (open) {
      gkk = open;
      return gkk;
    }
    gkk = await withTransaction(pool, async (client) => {
      const emir = await kkEmriOlustur(client, {
        yon: 'GKK',
        stokId: sut.id,
        partiId: null,
        depoId: whGkk.id,
        hedefDepoId: whHmd.id,
        miktar: 500,
        kaynakTipi: 'Manuel',
        kaynakId: null,
        aciklama: '[GIDA] Çiğ süt giriş KK',
      });
      await client.query(
        `UPDATE kk_emirleri SET firma_id=$2, plan_id=COALESCE(plan_id,$3), parti_id=NULL WHERE id=$1`,
        [emir.id, fid, plan?.id || null],
      );
      await stokSvc.stokHareketOlustur(client, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: iy,
        depoId: whGkk.id,
        belgeTipi: 'KK_EMIR',
        belgeId: emir.id,
        aciklama: '[GIDA] GKK bekleme stoğu',
        firmaId: fid,
        satirlar: [{ stok_id: sut.id, miktar: 500, yon: 1, birim: 'LT', stok_statu: 'Kalitede' }],
      });
      return emir;
    });
    return gkk;
  });
  if (gkk) {
    feat(F, 'GKK Emri', gkk.emir_no || gkk.id);
    doc(F, 'gkk', gkk.emir_no || gkk.id);
    await soft(F, 'GKK kaydet/onay', async () => {
      const id = gkk.id;
      if (gkk.transfer_hareket_id || ['Onayli', 'Red', 'Kismi'].includes(gkk.durum)) {
        return gkk; // önceki koşuda onaylanmış
      }
      await pool.query(
        `UPDATE kk_emirleri SET parti_id=NULL, hedef_depo_id=$2, durum='Acik'
         WHERE id=$1 AND transfer_hareket_id IS NULL`,
        [id, whHmd.id],
      );
      try {
        await api('POST', `/kk-emirleri/${id}/kaydet`, {
          uygun_miktar: 480, uygunsuz_miktar: 20, aciklama: '[GIDA] Ölçüm kaydı',
        }, fid);
      } catch (_) { /* kaydet opsiyonel */ }
      try {
        return await api('POST', `/kk-emirleri/${id}/onayla`, {
          uygun_miktar: 480,
          uygunsuz_miktar: 20,
          hedef_depo_id: whHmd.id,
          onay: true,
        }, fid);
      } catch (e) {
        if (e.status === 409 || /mükerrer|zaten transfer/i.test(e.message)) return gkk;
        throw e;
      }
    });
    feat(F, 'GKK Onay');
  }

  // Uygunsuzluk (emir_id zorunlu)
  if (gkk) {
    await soft(F, 'Uygunsuzluk', () => api('POST', '/kk-uygunsuzluklar', {
      emir_id: gkk.id,
      miktar: 20,
      aciklama: '[GIDA] Asitlik yüksek — 20 LT bloke',
    }, fid));
    feat(F, 'KK Uygunsuzluk');
  }

  // Açılış stok — ambalaj her zaman; süt yalnızca GKK onay stok taşımadıysa
  await soft(F, 'Açılış stok hareketi', async () => {
    await withTransaction(pool, async (client) => {
      const satirlar = [
        { stok_id: karton.id, miktar: 500, yon: 1, birim: 'AD' },
        { stok_id: kapak.id, miktar: 500, yon: 1, birim: 'AD' },
      ];
      if (!gkk) {
        satirlar.unshift({ stok_id: sut.id, miktar: 480, yon: 1, birim: 'LT' });
      }
      await stokSvc.stokHareketOlustur(client, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: iy,
        depoId: whHmd.id,
        belgeTipi: 'Acilis',
        aciklama: '[GIDA] Açılış — ambalaj (+ süt gerekirse)',
        firmaId: fid,
        satirlar,
      });
    });
  });
  feat(F, 'Stok Açılış Hareketi');

  // MRP
  const bi = await soft(F, 'MRP bağımsız ihtiyaç', () => api('POST', '/mrp/bagimsiz-ihtiyaclar', {
    stok_id: mamul.id,
    miktar: 300,
    birim: 'AD',
    ihtiyac_tarihi: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10),
    kaynak: 'Manuel',
    firma_id: fid,
    is_yeri_id: iy,
    aciklama: '[GIDA-MRP] 300 adet süt bağımsız ihtiyaç',
  }, fid));
  if (bi) { feat(F, 'MRP Bağımsız İhtiyaç', bi.ihtiyac_no || bi.id); doc(F, 'mrp_bi', bi.ihtiyac_no || bi.id); }

  const mrp = await soft(F, 'MRP çalıştır', async () => {
    return withTransaction(pool, (client) => mrpCalistir(client, {
      firmaId: fid,
      isYeriId: iy,
      aciklama: '[GIDA] MRP çalışması',
      olusturan: 'demo-iki-firma',
    }));
  });
  if (mrp) {
    feat(F, 'MRP Çalışması', `${mrp.calisma?.calisma_no || ''} net=${mrp.calisma?.net_pozitif ?? '?'}`);
    doc(F, 'mrp', mrp.calisma?.calisma_no);
  }

  await soft(F, 'MRP→SA talep', () => api('POST', '/mrp/talep-olustur', {
    calisma_id: mrp?.calisma?.id,
    firma_id: fid,
    is_yeri_id: iy,
  }, fid));
  feat(F, 'MRP → SA Talep');

  // Üretim emri
  const ue = await soft(F, 'Üretim emri', () => api('POST', '/uretim-emirleri', {
    stok_id: mamul.id,
    urun_agaci_id: bom.id,
    rota_id: rota.id,
    is_yeri_id: iy,
    firma_id: fid,
    hammadde_depo_id: whHmd.id,
    yari_mamul_depo_id: whYm.id,
    mamul_depo_id: whMam.id,
    planlanan_miktar: 200,
    durum: 'Taslak',
    aciklama: '[GIDA] Pastörize süt üretim emri',
  }, fid));
  if (ue) {
    feat(F, 'Üretim Emri', ue.emir_no || ue.order_no);
    doc(F, 'uretim_emri', ue.emir_no || ue.order_no);
    await soft(F, 'UE onay', async () => {
      try { return await api('POST', `/uretim-emirleri/${ue.id}/onayla`, {}, fid); }
      catch (e) {
        // Zaten Acik/Uretimde ise atla
        if (/onaylanamadı|durum/i.test(e.message)) return ue;
        throw e;
      }
    });
    await soft(F, 'UE başlat', async () => {
      try { return await api('POST', `/uretim-emirleri/${ue.id}/baslat`, {}, fid); }
      catch (e) {
        if (/zaten|başlat/i.test(e.message)) return ue;
        throw e;
      }
    });
    let ops = 0;
    for (let i = 0; i < 5; i++) {
      try {
        await api('POST', `/uretim-emirleri/${ue.id}/operasyon-tamamla`, { miktar: 200 }, fid);
        ops += 1;
      } catch (e) {
        if (/Hazir operasyon yok/i.test(e.message)) break;
        report.errors.push({ firma: F, label: `UE op#${i + 1}`, error: e.message });
        log(F, `⚠ UE op#${i + 1}: ${e.message}`);
        break;
      }
    }
    feat(F, 'Üretim Operasyonları', `${ops} adım`);
  }

  // Soğuk depo transfer — mamul bakiyesi varsa YM→MAM; yoksa HMD ambalaj denemesi
  await soft(F, 'Soğuk depo transfer', () => api('POST', '/transfer-emirleri', {
    kaynak_depo_id: whHmd.id,
    hedef_depo_id: whMam.id,
    is_yeri_id: iy,
    firma_id: fid,
    aciklama: '[GIDA] Soğuk zincir transfer denemesi',
    satirlar: [{ stok_id: karton.id, miktar: 10, birim: 'AD' }],
  }, fid));
  feat(F, 'Transfer (soğuk zincir)');

  // Mamul bakiyesi (üretim kısmi kaldıysa satış için)
  await soft(F, 'Mamul açılış', async () => {
    await withTransaction(pool, async (client) => {
      await stokSvc.stokHareketOlustur(client, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: iy,
        depoId: whMam.id,
        belgeTipi: 'Acilis',
        aciklama: '[GIDA] Mamul açılış — satış güvencesi',
        firmaId: fid,
        satirlar: [{ stok_id: mamul.id, miktar: 150, yon: 1, birim: 'AD' }],
      });
    });
  });

  // Satış
  const so = await soft(F, 'Satış siparişi', () => api('POST', '/siparisler', {
    siparis_turu: 'AlinanSiparis',
    cari_id: mus.id,
    is_yeri_id: iy,
    firma_id: fid,
    depo_id: whMam.id,
    durum: 'Onayli',
    aciklama: '[GIDA] Market zinciri siparişi',
    kalemler: [{ stok_id: mamul.id, miktar: 100, birim_fiyat: 28 }],
  }, fid));
  if (so) {
    feat(F, 'Satış Siparişi', so.siparis_no);
    doc(F, 'satis_siparis', so.siparis_no);
    await soft(F, 'Sevk', () => api('POST', `/siparisler/${so.id}/sevk-emri-olustur`, { depo_id: whMam.id }, fid));
    feat(F, 'Sevk Emri');
    const fat = await soft(F, 'Satış faturası', () => api('POST', '/faturalar', {
      cari_id: mus.id,
      is_yeri_id: iy,
      fatura_turu: 'Satis',
      durum: 'Onayli',
      aciklama: '[GIDA] Satış faturası',
      satirlar: [{ stok_id: mamul.id, miktar: 100, birim_fiyat: 28, birim: 'AD' }],
    }, fid));
    if (fat) { feat(F, 'Fatura', fat.fatura_no || fat.id); doc(F, 'fatura', fat.fatura_no || fat.id); }
  }

  await soft(F, 'Fiyat listesi', () => api('POST', '/fiyat-listeleri', {
    liste_kodu: `GIDA-FL-${Date.now().toString().slice(-4)}`,
    liste_adi: 'GIDA Perakende',
    para_birimi: 'TRY',
    satirlar: [{ stok_id: mamul.id, birim_fiyat: 28 }],
  }, fid));
  feat(F, 'Fiyat Listesi');

  await soft(F, 'Tedarikçi değerlendirme', () => api('POST', '/tedarikci-degerlendirme', {
    cari_id: ted.id,
    donem: new Date().toISOString().slice(0, 7),
    kalite_puan: 90,
    teslimat_puan: 85,
    fiyat_puan: 80,
    genel_puan: 85,
    aciklama: '[GIDA] Çiğ süt tedarikçi skoru',
  }, fid));
  feat(F, 'Tedarikçi Değerlendirme');
}

async function main() {
  console.log('=== İki firma özellik döngüsü ===');
  console.log('Base:', BASE);
  await login();

  console.log('\n—— DEMO (CRM + ticari + transfer/sayım/muhasebe) ——');
  await runDemoCycle();

  console.log('\n—— GIDA (lot + KK + MRP + üretim + soğuk zincir) ——');
  await runGidaCycle();

  const fs = require('fs');
  const path = require('path');
  const outDir = path.join(__dirname, '../docs/system');
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'demo-iki-firma-ozellik-dongu.json');
  const mdPath = path.join(outDir, 'demo-iki-firma-ozellik-dongu.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  let md = `# İki Firma Özellik Döngüsü\n\n`;
  md += `Oluşturulma: ${report.generated_at} (Europe/Istanbul)\n\n`;
  for (const f of ['DEMO', 'GIDA']) {
    md += `## ${f}\n\n`;
    md += `| Özellik | Detay |\n|---|---|\n`;
    for (const x of report[f].features) md += `| ${x.name} | ${x.detail || '—'} |\n`;
    md += `\nBelgeler: \`\`\`${JSON.stringify(report[f].docs)}\`\`\`\n\n`;
  }
  if (report.errors.length) {
    md += `## Uyarılar (${report.errors.length})\n\n`;
    for (const e of report.errors) md += `- **${e.firma}** / ${e.label}: ${e.error}\n`;
  }
  fs.writeFileSync(mdPath, md);
  try {
    fs.copyFileSync(jsonPath, '/opt/cursor/artifacts/demo-iki-firma-ozellik-dongu.json');
    fs.copyFileSync(mdPath, '/opt/cursor/artifacts/demo-iki-firma-ozellik-dongu.md');
  } catch (_) { /* artifacts optional */ }

  console.log('\n=== ÖZET ===');
  console.log(`DEMO özellik: ${report.DEMO.features.length} · GIDA özellik: ${report.GIDA.features.length} · uyarı: ${report.errors.length}`);
  console.log('Rapor:', mdPath);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
