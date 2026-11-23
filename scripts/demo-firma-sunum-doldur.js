#!/usr/bin/env node
/**
 * Demo Firma A.Ş. — tüm ekranları doldur (sunum)
 *
 * - Belge dönüşümlerinde kaynak Kapalı kalır (silinmez)
 * - Sipariş ↔ teklif / kaynak_belge bağları (sağ tık Kaynağına git)
 * - CKK + GKK, CRM, SA anlaşma, üretim, finans, tanımlar…
 *
 * Kullanım: node scripts/demo-firma-sunum-doldur.js
 */
require('dotenv').config();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { kkEmriOlustur } = require('../src/services/kaliteService');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { mrpCalistir } = require('../src/services/mrpService');

const BASE = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const report = {
  generated_at: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
  firma: 'DEMO',
  filled: [],
  errors: [],
};

function log(m) { console.log(`[DEMO-SUNUM] ${m}`); }
function ok(name, detail) {
  report.filled.push({ name, detail });
  log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

let TOKEN = null;
async function api(method, path, body, firmaId = 1) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Kullanici-Kodu': 'owner',
    'X-Firma-Id': String(firmaId),
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
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

async function soft(label, fn) {
  try { return await fn(); }
  catch (e) {
    report.errors.push({ label, error: e.message });
    log(`⚠ ${label}: ${e.message}`);
    return null;
  }
}

async function ensureStokDepo(client, stokId, depoId, isYeriId) {
  await client.query(
    `INSERT INTO stok_depo (stok_id, depo_id, is_yeri_id, aktif)
     SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
       SELECT 1 FROM stok_depo WHERE stok_id=$1 AND depo_id=$2)`,
    [stokId, depoId, isYeriId || null],
  );
}

async function main() {
  log('Başladı');
  try {
    const j = await api('POST', '/auth/login', { username: 'kagantalha.b', password: 'Demo123!' }, null);
    TOKEN = j.access_token;
  } catch (e) { log(`login soft: ${e.message}`); }

  const firma = (await pool.query(`SELECT * FROM firmalar WHERE firma_kodu='DEMO'`)).rows[0];
  if (!firma) throw new Error('DEMO firma yok');
  const fid = firma.id;
  const plant = (await pool.query(
    `SELECT * FROM is_yerleri WHERE firma_id=$1 ORDER BY id LIMIT 1`, [fid],
  )).rows[0];
  const iy = plant.id;

  let depolar = (await pool.query(`SELECT * FROM depolar WHERE is_yeri_id=$1 ORDER BY id`, [iy])).rows;
  let ana = depolar.find((d) => /Ana|Hammadde/i.test(d.depo_adi)) || depolar[0];
  let ym = depolar.find((d) => /Yarı|YM/i.test(d.depo_adi)) || depolar[1];
  let mm = depolar.find((d) => /Mamul/i.test(d.depo_adi)) || depolar[2];
  let gkkDepo = depolar.find((d) => d.depo_rolu === 'GKK');
  let ckkDepo = depolar.find((d) => d.depo_rolu === 'CKK');

  await withTransaction(pool, async (client) => {
    if (!gkkDepo) {
      gkkDepo = (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, depo_rolu)
         VALUES ($1,'DEMO-GKK','Giriş Kalite','GKK') RETURNING *`, [iy],
      )).rows[0];
    }
    if (!ckkDepo) {
      ckkDepo = (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, depo_rolu)
         VALUES ($1,'DEMO-CKK','Çıkış Kalite','CKK') RETURNING *`, [iy],
      )).rows[0];
    }
    if (!ana) {
      ana = (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, varsayilan, depo_rolu)
         VALUES ($1,'DEMO-ANA','Ana Depo',TRUE,'Hammadde') RETURNING *`, [iy],
      )).rows[0];
    }
    if (!ym) {
      ym = (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, depo_rolu)
         VALUES ($1,'DEMO-YM','Yarı Mamul','Normal') RETURNING *`, [iy],
      )).rows[0];
    }
    if (!mm) {
      mm = (await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, depo_rolu)
         VALUES ($1,'DEMO-MAM','Mamul Depo','Mamul') RETURNING *`, [iy],
      )).rows[0];
    }
  });
  ok('Depolar', `ana=${ana.depo_kodu} gkk=${gkkDepo.depo_kodu} ckk=${ckkDepo.depo_kodu}`);

  // Stoklar
  const stocks = (await pool.query(
    `SELECT s.* FROM stoklar s
     JOIN stok_is_yeri siy ON siy.stok_id=s.id AND siy.is_yeri_id=$1
     ORDER BY s.id`, [iy],
  )).rows;
  const mmStok = stocks.find((s) => s.stok_tipi === 'Mamul') || stocks[stocks.length - 1];
  const ymStok = stocks.find((s) => s.stok_tipi === 'YariMamul') || stocks[0];
  const hmStoklar = stocks.filter((s) => s.stok_tipi === 'Hammadde');

  await withTransaction(pool, async (client) => {
    for (const s of stocks) {
      for (const d of [ana, ym, mm, gkkDepo, ckkDepo]) {
        await ensureStokDepo(client, s.id, d.id, iy);
      }
    }
    // Mamul + hammadde bakiyesi
    await stokHareketOlustur(client, {
      hareketTipi: 'STOK_GIRIS',
      isYeriId: iy,
      depoId: mm.id,
      belgeTipi: 'Acilis',
      aciklama: '[SUNUM] Mamul açılış',
      firmaId: fid,
      satirlar: [{ stok_id: mmStok.id, miktar: 250, yon: 1, birim: 'AD' }],
    });
    if (hmStoklar.length) {
      await stokHareketOlustur(client, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: iy,
        depoId: ana.id,
        belgeTipi: 'Acilis',
        aciklama: '[SUNUM] Hammadde açılış',
        firmaId: fid,
        satirlar: hmStoklar.slice(0, 3).map((s) => ({
          stok_id: s.id, miktar: 200, yon: 1, birim: s.birim || 'AD',
        })),
      });
    }
  });
  ok('Stok bakiyeleri');

  // Firma_id backfill — DEMO iş yerine bağlı boşlar
  await pool.query(`
    UPDATE satis_teklifleri SET firma_id=$1, is_yeri_id=COALESCE(is_yeri_id,$2)
    WHERE firma_id IS NULL AND (is_yeri_id=$2 OR is_yeri_id IS NULL)`, [fid, iy]);
  await pool.query(`
    UPDATE crm_firsatlar SET firma_id=$1, is_yeri_id=COALESCE(is_yeri_id,$2)
    WHERE firma_id IS NULL AND (is_yeri_id=$2 OR is_yeri_id IS NULL)`, [fid, iy]);
  await pool.query(`
    UPDATE satin_alma_teklifleri SET firma_id=$1 WHERE firma_id IS NULL AND is_yeri_id=$2`, [fid, iy]);
  await pool.query(`
    UPDATE satin_alma_anlasmalari SET firma_id=$1 WHERE firma_id IS NULL AND is_yeri_id=$2`, [fid, iy]);
  await pool.query(`
    UPDATE satin_alma_teklif_istekleri SET firma_id=$1 WHERE firma_id IS NULL AND is_yeri_id=$2`, [fid, iy]);
  await pool.query(`
    UPDATE siparisler SET firma_id=$1 WHERE firma_id IS NULL AND is_yeri_id=$2`, [fid, iy]);
  ok('firma_id backfill');

  let musteri = (await pool.query(
    `SELECT * FROM cariler WHERE cari_turu='Musteri' AND (firma_id=$1 OR is_yeri_id=$2) ORDER BY id LIMIT 1`,
    [fid, iy],
  )).rows[0];
  let ted = (await pool.query(
    `SELECT * FROM cariler WHERE cari_turu='Tedarikci' AND (firma_id=$1 OR is_yeri_id=$2) ORDER BY id LIMIT 1`,
    [fid, iy],
  )).rows[0];
  if (!musteri) {
    musteri = await api('POST', '/cariler', {
      cari_adi: 'Sunum Müşteri A.Ş.', cari_turu: 'Musteri', firma_id: fid, is_yeri_id: iy,
    }, fid);
  }
  if (!ted) {
    ted = await api('POST', '/cariler', {
      cari_adi: 'Sunum Tedarikçi Ltd.', cari_turu: 'Tedarikci', firma_id: fid, is_yeri_id: iy,
    }, fid);
  }
  await pool.query(`UPDATE cariler SET firma_id=$1 WHERE id=ANY($2::int[]) AND firma_id IS NULL`,
    [fid, [musteri.id, ted.id]]);
  ok('Cariler', `${musteri.cari_kodu || musteri.id} / ${ted.cari_kodu || ted.id}`);

  // ——— CRM ———
  const asama = (await api('GET', '/crm-firsat-asamalari', null, fid))?.[0]
    || await api('POST', '/crm-firsat-asamalari', { asama_kodu: 'SUNUM', asama_adi: 'Sunum Aşama', sira_no: 15 }, fid);
  const tip = (await api('GET', '/crm-faaliyet-tipleri', null, fid))?.[0]
    || await api('POST', '/crm-faaliyet-tipleri', { tip_kodu: 'SUNUM-ZIY', tip_adi: 'Sunum Ziyaret' }, fid);

  const aday = await soft('CRM aday', () => api('POST', '/crm-adaylar', {
    aday_adi: 'Sunum Aday Holding', durum: 'Yeni', bulma_yontemi: 'Fuar', ulke: 'TR', il: 'Ankara',
    notlar: '[SUNUM] Aday',
  }, fid));
  ok('CRM Adaylar', aday?.aday_kodu);

  const kontak = await soft('CRM kontak', () => api('POST', '/crm-kontaklar', {
    ad: 'Ayşe', soyad: 'Yılmaz', unvan: 'Satınalma', email: 'ayse@sunum.demo',
    aday_id: aday?.id, birincil: true,
  }, fid));
  ok('CRM Kontaklar', kontak?.id);

  const firsat = await soft('CRM fırsat', () => api('POST', '/crm-firsatlar', {
    firsat_adi: 'Sunum cihaz fırsatı 100 adet',
    asama_id: asama?.id,
    aday_id: aday?.id,
    musteri_tipi: 'Aday',
    beklenen_gelir: 150000,
    para_birimi: 'TRY',
    is_yeri_id: iy,
    firma_id: fid,
    aciklama: '[SUNUM] Fırsat',
    satirlar: [{ stok_id: mmStok.id, miktar: 100, birim_fiyat: 1500 }],
  }, fid));
  ok('CRM Fırsatlar', firsat?.firsat_kodu);

  await soft('CRM faaliyet plan', () => api('POST', '/crm-faaliyet-planlari', {
    faaliyet_tipi_id: tip?.id,
    konu: 'Sunum demo planı',
    firsat_id: firsat?.id,
    aday_id: aday?.id,
    musteri_tipi: 'Aday',
    durum: 'Planlandi',
    baslangic_tarihi: new Date().toISOString(),
    is_yeri_id: iy,
  }, fid));
  ok('CRM Faaliyet Planları');

  await soft('CRM faaliyet', () => api('POST', '/crm-faaliyetler', {
    faaliyet_tipi_id: tip?.id,
    konu: 'Sunum demo toplantısı',
    firsat_id: firsat?.id,
    aday_id: aday?.id,
    musteri_tipi: 'Aday',
    durum: 'Tamamlandi',
    baslangic_tarihi: new Date().toISOString(),
    is_yeri_id: iy,
  }, fid));
  ok('CRM Faaliyetler');

  await soft('CRM görev', () => api('POST', '/crm-gorevler', {
    baslik: 'Teklif hazırla — sunum',
    firsat_id: firsat?.id,
    aday_id: aday?.id,
    durum: 'Acik',
    son_tarih: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10),
  }, fid));
  ok('CRM Görevler');

  // ——— Satış: teklif → sipariş (teklif Kapalı kalır) ———
  const teklif = await soft('Satış teklifi', () => api('POST', '/satis-teklifleri', {
    cari_id: musteri.id,
    firma_id: fid,
    is_yeri_id: iy,
    firsat_id: firsat?.id,
    durum: 'Onayli',
    aciklama: '[SUNUM] Satış teklifi — fırsattan',
    kaynak_belge_tipi: 'CRM_FIRSAT',
    kaynak_belge_id: firsat?.id,
    satirlar: [{ stok_id: mmStok.id, miktar: 40, birim_fiyat: 1500, birim: 'AD', kdv_oran: 20 }],
  }, fid));
  ok('Satış Teklifleri', teklif?.teklif_no);

  let siparis = null;
  if (teklif) {
    siparis = await soft('Teklif→Sipariş', () => api('POST', `/satis-teklifleri/${teklif.id}/siparise-donustur`, {}, fid));
    // Bağları güçlendir
    if (siparis?.siparis_id) {
      await pool.query(
        `UPDATE siparisler SET firma_id=$2, is_yeri_id=$3, depo_id=$4, teklif_id=$5,
           kaynak_belge_tipi='SATIS_TEKLIF', kaynak_belge_id=$5
         WHERE id=$1`,
        [siparis.siparis_id, fid, iy, mm.id, teklif.id],
      );
      const tDurum = (await pool.query(`SELECT durum FROM satis_teklifleri WHERE id=$1`, [teklif.id])).rows[0];
      ok('Satış Siparişleri (tekliften)', `${siparis.siparis_no} · teklif durum=${tDurum?.durum}`);
    }
  }
  if (!siparis?.siparis_id) {
    siparis = await soft('Satış sipariş', () => api('POST', '/siparisler', {
      siparis_turu: 'AlinanSiparis',
      cari_id: musteri.id,
      is_yeri_id: iy,
      firma_id: fid,
      depo_id: mm.id,
      teklif_id: teklif?.id,
      durum: 'Onayli',
      aciklama: '[SUNUM] Satış siparişi',
      kaynak_belge_tipi: 'SATIS_TEKLIF',
      kaynak_belge_id: teklif?.id,
      kalemler: [{ stok_id: mmStok.id, miktar: 25, birim_fiyat: 1500 }],
    }, fid));
    ok('Satış Siparişleri', siparis?.siparis_no);
  }
  const soId = siparis?.siparis_id || siparis?.id;

  if (soId) {
    await soft('Rezervasyon', () => api('POST', `/siparisler/${soId}/rezerve`, { depo_id: mm.id }, fid));
    ok('Stok Rezervasyonları');
    const sevk = await soft('Sevk', () => api('POST', `/siparisler/${soId}/sevk-emri-olustur`, { depo_id: mm.id }, fid));
    ok('Sevk Emirleri', sevk?.sevk_no || sevk?.id);
    if (sevk?.id) {
      await pool.query(
        `UPDATE sevk_emirleri SET kaynak_belge_tipi='SATIS_SIPARIS', kaynak_belge_id=$2 WHERE id=$1`,
        [sevk.id, soId],
      ).catch(() => null);
    }
  }

  const irs = await soft('İrsaliye', () => api('POST', '/irsaliyeler', {
    siparis_id: soId,
    cari_id: musteri.id,
    depo_id: mm.id,
    is_yeri_id: iy,
    firma_id: fid,
    irsaliye_turu: 'Satis',
    durum: 'Onayli',
    aciklama: '[SUNUM] Satış irsaliyesi',
    kaynak_belge_tipi: 'SATIS_SIPARIS',
    kaynak_belge_id: soId,
    satirlar: [{ stok_id: mmStok.id, miktar: 15, birim: 'AD' }],
  }, fid));
  ok('İrsaliyeler', irs?.irsaliye_no);

  let fat = null;
  if (irs?.id) {
    fat = await soft('İrs→Fatura', () => api('POST', `/irsaliyeler/${irs.id}/fatura-olustur`, {}, fid));
  }
  if (!fat) {
    fat = await soft('Satış fatura', () => api('POST', '/faturalar', {
      cari_id: musteri.id,
      is_yeri_id: iy,
      firma_id: fid,
      fatura_turu: 'Satis',
      durum: 'Onayli',
      siparis_id: soId,
      irsaliye_id: irs?.id,
      aciklama: '[SUNUM] Satış faturası',
      satirlar: [{ stok_id: mmStok.id, miktar: 15, birim_fiyat: 1500, birim: 'AD' }],
    }, fid));
  }
  ok('Satış Faturaları', fat?.fatura_no || fat?.fatura?.fatura_no || fat?.id);

  await soft('Tahsilat', () => api('POST', '/tahsilat-odemeler', {
    tip: 'Tahsilat',
    cari_id: musteri.id,
    tutar: 27000,
    fatura_id: fat?.id || fat?.fatura?.id,
    aciklama: '[SUNUM] Tahsilat',
  }, fid));
  ok('Tahsilat / Ödeme');

  // ——— Satınalma ———
  const rfq = await soft('RFQ', () => api('POST', '/satin-alma-teklif-istekleri', {
    is_yeri_id: iy, firma_id: fid, aciklama: '[SUNUM] RFQ',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, miktar: 80, birim: 'AD' })),
  }, fid));
  ok('SA Teklif İstekleri', rfq?.istek_no);

  const saTeklif = await soft('SA teklif', () => api('POST', '/satin-alma-teklifleri', {
    cari_id: ted.id, is_yeri_id: iy, firma_id: fid, istek_id: rfq?.id, durum: 'Onayli',
    aciklama: '[SUNUM] SA teklif',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, miktar: 80, birim_fiyat: 25, birim: 'AD' })),
  }, fid));
  ok('SA Teklifleri', saTeklif?.teklif_no);

  const anlasma = await soft('SA anlaşma', () => api('POST', '/satin-alma-anlasmalari', {
    cari_id: ted.id, is_yeri_id: iy, firma_id: fid, durum: 'Onayli',
    aciklama: '[SUNUM] Yıllık anlaşma',
    satirlar: hmStoklar.slice(0, 1).map((s) => ({ stok_id: s.id, miktar: 1, birim_fiyat: 22, birim: 'AD' })),
  }, fid));
  ok('SA Anlaşmaları', anlasma?.anlasma_no);

  const talep = await soft('SA talep', () => api('POST', '/satin-alma-talepleri', {
    is_yeri_id: iy, firma_id: fid, aciklama: '[SUNUM] Talep',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, miktar: 50, birim: 'AD' })),
  }, fid));
  if (talep) await soft('SA talep onay', () => api('POST', `/satin-alma-talepleri/${talep.id}/onayla`, {}, fid));
  ok('SA Talepleri', talep?.talep_no);

  let sas = null;
  if (saTeklif) {
    sas = await soft('SA teklif→sipariş', () => api('POST', `/satin-alma-teklifleri/${saTeklif.id}/siparise-donustur`, {}, fid));
    if (sas?.id) {
      const td = (await pool.query(`SELECT durum FROM satin_alma_teklifleri WHERE id=$1`, [saTeklif.id])).rows[0];
      ok('SA Siparişleri (tekliften)', `${sas.siparis_no} · teklif=${td?.durum}`);
    }
  }
  if (!sas?.id) {
    sas = await soft('SA sipariş', () => api('POST', '/satin-alma-siparisleri', {
      cari_id: ted.id, is_yeri_id: iy, firma_id: fid, talep_id: talep?.id, teklif_id: saTeklif?.id,
      durum: 'Taslak',
      satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, miktar: 50, birim_fiyat: 25, birim: 'AD' })),
    }, fid));
    if (sas) await soft('SA sip onay', () => api('POST', `/satin-alma-siparisleri/${sas.id}/onayla`, {}, fid));
    ok('SA Siparişleri', sas?.siparis_no);
  }

  const mk = sas?.id
    ? await soft('Mal kabul', () => api('POST', '/mal-kabuller', { siparis_id: sas.id, depo_id: ana.id }, fid))
    : null;
  ok('Mal Kabuller', mk?.kabul_no);

  await soft('Tedarikçi irsaliye', () => api('POST', '/tedarikci-irsaliyeleri', {
    cari_id: ted.id, is_yeri_id: iy, firma_id: fid, siparis_id: sas?.id,
    aciklama: '[SUNUM] Tedarikçi irsaliyesi',
    satirlar: hmStoklar.slice(0, 1).map((s) => ({ stok_id: s.id, miktar: 20, birim: 'AD' })),
  }, fid)).catch(() => null);
  ok('Tedarikçi İrsaliyeleri');

  await soft('Alış fatura', () => api('POST', '/faturalar', {
    cari_id: ted.id, is_yeri_id: iy, firma_id: fid, fatura_turu: 'Alis', durum: 'Onayli',
    aciklama: '[SUNUM] Alış fatura',
    satirlar: hmStoklar.slice(0, 1).map((s) => ({ stok_id: s.id, miktar: 20, birim_fiyat: 25, birim: 'AD' })),
  }, fid));
  ok('Alış Faturaları');

  // ——— Transfer / sayım / parti ———
  await soft('Transfer', () => api('POST', '/transfer-emirleri', {
    kaynak_depo_id: ana.id, hedef_depo_id: ym.id, is_yeri_id: iy, firma_id: fid,
    aciklama: '[SUNUM] Transfer',
    satirlar: hmStoklar.slice(0, 1).map((s) => ({ stok_id: s.id, miktar: 10, birim: 'AD' })),
  }, fid));
  ok('Transfer Emirleri');

  await soft('Sayım', () => api('POST', '/sayim-belgeleri', {
    depo_id: ana.id, is_yeri_id: iy, firma_id: fid, aciklama: '[SUNUM] Sayım',
    satirlar: hmStoklar.slice(0, 2).map((s) => ({ stok_id: s.id, sayilan_miktar: 180 })),
  }, fid));
  ok('Sayım Belgeleri');

  const parti = await soft('Parti', () => api('POST', '/stok-partileri', {
    stok_id: mmStok.id,
    parti_no: `DEMO-LOT-${Date.now().toString().slice(-5)}`,
    uretim_tarihi: new Date().toISOString().slice(0, 10),
    son_kullanma_tarihi: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
    aciklama: '[SUNUM] Mamul lot',
  }, fid));
  ok('Stok Partileri', parti?.parti_no);

  await soft('Stok seri', () => api('POST', '/stok-serileri', {
    stok_id: mmStok.id, seri_no: `SN-DEMO-${Date.now().toString().slice(-6)}`, aciklama: '[SUNUM]',
  }, fid)).catch(() => null);
  ok('Stok Serileri');

  if (hmStoklar[0] && hmStoklar[1]) {
    await soft('Stok ikame', () => api('POST', '/stok-ikame', {
      stok_id: hmStoklar[0].id, ikame_stok_id: hmStoklar[1].id, oncelik: 1,
    }, fid)).catch(() => null);
    ok('Stok İkame');
  }

  // ——— Kalite: plan, GKK, CKK ———
  let planGkk = (await api('GET', '/kk-kontrol-planlari', null, fid))?.find((p) => p.yon === 'GKK');
  if (!planGkk) {
    planGkk = await soft('KK plan GKK', () => api('POST', '/kk-kontrol-planlari', {
      plan_kodu: `DEMO-GKK-${Date.now().toString().slice(-3)}`,
      plan_adi: 'DEMO Giriş kontrol',
      yon: 'GKK',
      kriterler: [
        { kriter_kodu: 'GOR', kriter_adi: 'Görsel', olcum_tipi: 'Mantiksal' },
        { kriter_kodu: 'OLC', kriter_adi: 'Ölçü', min_deger: 0, max_deger: 100 },
      ],
    }, fid));
  }
  ok('KK Kontrol Planları', planGkk?.plan_kodu);

  let planCkk = (await api('GET', '/kk-kontrol-planlari', null, fid))?.find((p) => p.yon === 'CKK');
  if (!planCkk) {
    planCkk = await soft('KK plan CKK', () => api('POST', '/kk-kontrol-planlari', {
      plan_kodu: `DEMO-CKK-${Date.now().toString().slice(-3)}`,
      plan_adi: 'DEMO Çıkış kontrol',
      yon: 'CKK',
      kriterler: [{ kriter_kodu: 'FONK', kriter_adi: 'Fonksiyon testi', olcum_tipi: 'Mantiksal' }],
    }, fid));
  }

  if (hmStoklar[0] && planGkk) {
    await soft('KK stok plan GKK', () => api('POST', '/kk-stok-planlari', {
      stok_id: hmStoklar[0].id, plan_id: planGkk.id, yon: 'GKK', aktif: true,
    }, fid));
  }
  if (mmStok && planCkk) {
    await soft('KK stok plan CKK', () => api('POST', '/kk-stok-planlari', {
      stok_id: mmStok.id, plan_id: planCkk.id, yon: 'CKK', aktif: true,
    }, fid));
  }
  ok('KK Stok Plan Bağları');

  await soft('KK ret neden', () => api('POST', '/kk-ret-nedenleri', {
    neden_kodu: `RN-${Date.now().toString().slice(-4)}`, neden_adi: 'Sunum ret — ölçü dışı',
  }, fid)).catch(() => null);
  ok('KK Ret Nedenleri');

  // CKK emri + stok
  const ckk = await soft('CKK emri', async () => withTransaction(pool, async (client) => {
    await stokHareketOlustur(client, {
      hareketTipi: 'STOK_GIRIS',
      isYeriId: iy,
      depoId: ckkDepo.id,
      belgeTipi: 'KK_EMIR',
      aciklama: '[SUNUM] CKK bekleme',
      firmaId: fid,
      satirlar: [{ stok_id: mmStok.id, miktar: 30, yon: 1, birim: 'AD', stok_statu: 'Kalitede' }],
    });
    const emir = await kkEmriOlustur(client, {
      yon: 'CKK',
      stokId: mmStok.id,
      depoId: ckkDepo.id,
      hedefDepoId: mm.id,
      miktar: 30,
      kaynakTipi: 'Manuel',
      kaynakId: null,
      aciklama: '[SUNUM] Çıkış kalite emri',
    });
    await client.query(
      `UPDATE kk_emirleri SET firma_id=$2, plan_id=$3, parti_id=NULL WHERE id=$1`,
      [emir.id, fid, planCkk?.id || null],
    );
    return emir;
  }));
  if (ckk) {
    ok('ÇKK Emirleri', ckk.emir_no);
    await soft('CKK kaydet', () => api('POST', `/kk-emirleri/${ckk.id}/kaydet`, {
      uygun_miktar: 28, uygunsuz_miktar: 2, aciklama: '[SUNUM] CKK ölçüm',
    }, fid));
    await soft('CKK onay', () => api('POST', `/kk-emirleri/${ckk.id}/onayla`, {
      uygun_miktar: 28, uygunsuz_miktar: 2, hedef_depo_id: mm.id, onay: true,
    }, fid));
    await soft('Uygunsuzluk', () => api('POST', '/kk-uygunsuzluklar', {
      emir_id: ckk.id, miktar: 2, aciklama: '[SUNUM] CKK uygunsuz 2 adet',
    }, fid));
    ok('KK Uygunsuzluklar');
    await soft('CAPA', () => api('POST', '/kk-capa', {
      uygunsuzluk_id: null,
      baslik: 'Sunum CAPA — ölçü sapması',
      aciklama: '[SUNUM] Düzeltici faaliyet',
      durum: 'Acik',
      emir_id: ckk.id,
    }, fid)).catch(() => null);
    ok('CAPA');
  }

  // GKK ek emir (görünür olsun)
  if (hmStoklar[0]) {
    await soft('GKK emri sunum', async () => withTransaction(pool, async (client) => {
      await stokHareketOlustur(client, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: iy,
        depoId: gkkDepo.id,
        belgeTipi: 'KK_EMIR',
        aciklama: '[SUNUM] GKK bekleme',
        firmaId: fid,
        satirlar: [{ stok_id: hmStoklar[0].id, miktar: 40, yon: 1, birim: 'AD', stok_statu: 'Kalitede' }],
      });
      const emir = await kkEmriOlustur(client, {
        yon: 'GKK',
        stokId: hmStoklar[0].id,
        depoId: gkkDepo.id,
        hedefDepoId: ana.id,
        miktar: 40,
        kaynakTipi: 'Manuel',
        aciklama: '[SUNUM] Giriş kalite',
      });
      await client.query(`UPDATE kk_emirleri SET firma_id=$2, plan_id=$3, parti_id=NULL WHERE id=$1`,
        [emir.id, fid, planGkk?.id || null]);
      return emir;
    }));
    ok('GKK Emirleri');
  }

  // ——— Üretim ———
  let bom = (await pool.query(`SELECT * FROM urun_agaclari WHERE mamul_stok_id=$1 LIMIT 1`, [mmStok.id])).rows[0];
  let rota = (await pool.query(`SELECT * FROM rotalar WHERE stok_id=$1 LIMIT 1`, [mmStok.id])).rows[0];
  if (!bom) {
    await soft('BOM', async () => withTransaction(pool, async (client) => {
      const bk = await sonrakiKod(client, 'URUN_AGACI');
      bom = (await client.query(
        `INSERT INTO urun_agaclari (agac_kodu, agac_adi, mamul_stok_id, miktar, firma_id)
         VALUES ($1,'DEMO Sunum BOM',$2,1,$3) RETURNING *`, [bk, mmStok.id, fid],
      )).rows[0];
      for (const [i, s] of hmStoklar.slice(0, 2).entries()) {
        await client.query(
          `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
           VALUES ($1,$2,1,'AD',$3)`, [bom.id, s.id, (i + 1) * 10],
        );
      }
      return bom;
    }));
  }
  ok('Ürün Ağacı', bom?.agac_kodu);

  if (!rota && bom) {
    await soft('Rota', async () => withTransaction(pool, async (client) => {
      let wc = (await client.query(`SELECT * FROM is_merkezleri WHERE is_yeri_id=$1 LIMIT 1`, [iy])).rows[0];
      if (!wc) {
        wc = (await client.query(
          `INSERT INTO is_merkezleri (is_yeri_id, merkez_kodu, merkez_adi)
           VALUES ($1,'DEMO-HAT','Demo Montaj Hattı') RETURNING *`, [iy],
        )).rows[0];
      }
      const rk = await sonrakiKod(client, 'ROTA');
      rota = (await client.query(
        `INSERT INTO rotalar (rota_kodu, rota_adi, stok_id, urun_agaci_id, firma_id)
         VALUES ($1,'DEMO rota',$2,$3,$4) RETURNING *`, [rk, mmStok.id, bom.id, fid],
      )).rows[0];
      await client.query(
        `INSERT INTO rota_operasyonlari (rota_id, operasyon_kodu, operasyon_adi, sira_no, is_merkezi_id, sure_dk, cikti_stok_id)
         VALUES ($1,'OP10','Montaj',10,$2,30,$3),($1,'OP20','Test',20,$2,15,$3)`,
        [rota.id, wc.id, mmStok.id],
      );
      return rota;
    }));
  }
  ok('Rotalar / İş Merkezleri', rota?.rota_kodu);

  await soft('Üretim planı', () => api('POST', '/uretim-planlari', {
    stok_id: mmStok.id, miktar: 50, is_yeri_id: iy, firma_id: fid,
    plan_tarihi: new Date().toISOString().slice(0, 10),
    aciklama: '[SUNUM] Üretim planı',
  }, fid)).catch(() => null);
  ok('Üretim Planları');

  const ue = await soft('Üretim emri', () => api('POST', '/uretim-emirleri', {
    stok_id: mmStok.id,
    urun_agaci_id: bom?.id,
    rota_id: rota?.id,
    is_yeri_id: iy,
    firma_id: fid,
    hammadde_depo_id: ana.id,
    yari_mamul_depo_id: ym.id,
    mamul_depo_id: mm.id,
    planlanan_miktar: 40,
    durum: 'Taslak',
    siparis_id: soId || null,
    aciklama: '[SUNUM] Üretim emri',
  }, fid));
  if (ue) {
    await soft('UE onay', () => api('POST', `/uretim-emirleri/${ue.id}/onayla`, {}, fid));
    await soft('UE başlat', () => api('POST', `/uretim-emirleri/${ue.id}/baslat`, {}, fid));
    await soft('UE op', () => api('POST', `/uretim-emirleri/${ue.id}/operasyon-tamamla`, { miktar: 40 }, fid));
  }
  ok('Üretim Emirleri', ue?.emir_no);

  await soft('Üretim girişi', () => api('POST', '/uretim-girisleri', {
    uretim_emri_id: ue?.id,
    stok_id: mmStok.id,
    miktar: 20,
    depo_id: mm.id,
    aciklama: '[SUNUM] Üretim girişi',
  }, fid)).catch(() => null);
  ok('Üretim Girişleri');

  // ——— MRP ———
  await soft('MRP BI', () => api('POST', '/mrp/bagimsiz-ihtiyaclar', {
    stok_id: mmStok.id, miktar: 60, birim: 'AD',
    ihtiyac_tarihi: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    kaynak: 'Manuel', firma_id: fid, is_yeri_id: iy, aciklama: '[SUNUM] MRP BI',
  }, fid));
  ok('MRP Bağımsız İhtiyaç');

  const mrp = await soft('MRP çalıştır', () => withTransaction(pool, (client) => mrpCalistir(client, {
    firmaId: fid, isYeriId: iy, aciklama: '[SUNUM] MRP', olusturan: 'sunum',
  })));
  ok('MRP Çalışma', mrp?.calisma?.calisma_no);

  // ——— Finans / fiyat / döviz / muhasebe ———
  await soft('Fiyat listesi', () => api('POST', '/fiyat-listeleri', {
    liste_kodu: `DEMO-FL-${Date.now().toString().slice(-4)}`,
    liste_adi: 'DEMO Sunum Liste',
    para_birimi: 'TRY',
    satirlar: [{ stok_id: mmStok.id, birim_fiyat: 1500 }],
  }, fid));
  ok('Fiyat Listeleri');

  await soft('Döviz', () => api('POST', '/doviz-kurlari', {
    kur_tarihi: new Date().toISOString().slice(0, 10),
    kaynak_pb: 'EUR', hedef_pb: 'TRY', alis_kuru: 36.2, satis_kuru: 36.5, kaynak: 'TCMB',
  }, fid));
  ok('Döviz Kurları');

  const hesaplar = (await pool.query(
    `SELECT id, hesap_kodu FROM muhasebe_hesaplari WHERE hesap_kodu IN ('100.01.001','120.01.001')`,
  )).rows;
  if (hesaplar.length >= 2) {
    await soft('Muhasebe', () => api('POST', '/muhasebe-belgeleri', {
      aciklama: '[SUNUM] Mahsup',
      kalemler: [
        { hesap_id: hesaplar[0].id, borc: 5000, alacak: 0, aciklama: 'Kasa' },
        { hesap_id: hesaplar[1].id, borc: 0, alacak: 5000, aciklama: 'Alacak' },
      ],
    }, fid));
    ok('Muhasebe Belgeleri');
  }

  await soft('Hesap belirleme', () => api('POST', '/hesap-belirleme-kurallari', {
    kural_adi: 'Sunum stok hesabı',
    belge_tipi: 'SatisFatura',
    hesap_id: hesaplar[0]?.id,
    oncelik: 10,
  }, fid)).catch(() => null);
  ok('Hesap Belirleme Kuralları');

  // Tedarikçi değerlendirme
  await soft('Tedarikçi değerlendirme', () => api('POST', '/tedarikci-degerlendirme', {
    cari_id: ted.id,
    donem: new Date().toISOString().slice(0, 7),
    kalite_puan: 88, teslimat_puan: 90, fiyat_puan: 85, genel_puan: 88,
    aciklama: '[SUNUM]',
  }, fid));
  ok('Tedarikçi Değerlendirme');

  // Onay tanımları — en az bir kayıt
  await soft('Onay rol', () => api('POST', '/onay-rolleri', {
    rol_kodu: `SUNUM-R${Date.now().toString().slice(-3)}`,
    rol_adi: 'Sunum Onaycı',
    firma_id: fid,
  }, fid)).catch(() => null);
  ok('Onay Rolleri');

  // Stok hareket formu kaydı
  await soft('Stok hareket API', () => api('POST', '/stok-hareketleri', {
    hareket_tipi: 'STOK_GIRIS',
    depo_id: ana.id,
    is_yeri_id: iy,
    firma_id: fid,
    aciklama: '[SUNUM] Elle stok giriş',
    satirlar: hmStoklar.slice(0, 1).map((s) => ({ stok_id: s.id, miktar: 5, yon: 1 })),
  }, fid)).catch(() => null);
  ok('Stok Hareketleri');

  // Rapor dosyası
  const fs = require('fs');
  const path = require('path');
  const outDir = path.join(__dirname, '../docs/system');
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'demo-firma-sunum-doldur.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // Teklif durum doğrula
  if (teklif?.id) {
    const td = (await pool.query(`SELECT teklif_no, durum FROM satis_teklifleri WHERE id=$1`, [teklif.id])).rows[0];
    log(`Teklif durumu kontrol: ${td?.teklif_no}=${td?.durum}`);
  }
  if (saTeklif?.id) {
    const td = (await pool.query(`SELECT teklif_no, durum FROM satin_alma_teklifleri WHERE id=$1`, [saTeklif.id])).rows[0];
    log(`SA teklif durumu: ${td?.teklif_no}=${td?.durum}`);
  }

  console.log(`\n=== Doldurulan: ${report.filled.length} · uyarı: ${report.errors.length} ===`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
