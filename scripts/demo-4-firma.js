/**
 * Dört sektör firması + ilişkili uçtan uca demo verisi.
 * Önce: node scripts/demo-cleanup.js && npm run migrate
 * Sonra: node scripts/demo-4-firma.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod, stokSeriKodundanTip, cariSeriKodundanTur } = require('../src/utils/kodUretici');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ''),
});

const FIRMS = [
  {
    kod: 'ELEK',
    adi: 'Kompanzasyon Röle Elektronik A.Ş.',
    sektor: 'Elektrik/Elektronik',
    sehir: 'İstanbul',
    mamul: { adi: 'Kompanzasyon Rölesi KR-200', tip: 'Mamul', birim: 'AD', fiyat: 4200 },
    hammaddeler: [
      { adi: 'PCB Kart FR4', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 180 },
      { adi: 'Kondansatör 25µF', tip: 'Hammadde', birim: 'AD', miktar: 4, fiyat: 12 },
      { adi: 'Röle Bobin 24V', tip: 'Hammadde', birim: 'AD', miktar: 2, fiyat: 45 },
      { adi: 'Plastik Gövde KR', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 35 },
    ],
    tedarikciler: ['Elektro Komponent Ltd.', 'PCB Anatolia A.Ş.'],
    musteriler: ['Anadolu Enerji Dağıtım A.Ş.', 'Şehir Şebeke Sanayi Ltd.'],
    operasyonlar: ['SMD Dizgi', 'THT Montaj', 'Fonksiyon Test', 'Paketleme'],
  },
  {
    kod: 'TEKS',
    adi: 'Denim Tekstil Üretim A.Ş.',
    sektor: 'Tekstil',
    sehir: 'Gaziantep',
    mamul: { adi: 'Kot Pantolon Slim 32', tip: 'Mamul', birim: 'AD', fiyat: 890 },
    hammaddeler: [
      { adi: 'Denim Kumaş 12oz', tip: 'Hammadde', birim: 'MT', miktar: 1.4, fiyat: 95 },
      { adi: 'Pamuk İplik Ne30', tip: 'Hammadde', birim: 'KG', miktar: 0.08, fiyat: 120 },
      { adi: 'Metal Fermuar 18cm', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 8 },
      { adi: 'Kot Düğme Seti', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 6 },
    ],
    tedarikciler: ['Ege Denim Kumaş A.Ş.', 'Aksesuar Moda Ltd.'],
    musteriler: ['Moda Perakende Zinciri A.Ş.', 'Jeans Outlet TR Ltd.'],
    operasyonlar: ['Kesim', 'Dikim', 'Yıkama', 'Ütü-Paket'],
  },
  {
    kod: 'META',
    adi: 'Oto Kapı Metal Sanayi A.Ş.',
    sektor: 'Metal / Otomotiv',
    sehir: 'Bursa',
    mamul: { adi: 'Ön Kapı Sağ OEM-K42', tip: 'Mamul', birim: 'AD', fiyat: 18500 },
    hammaddeler: [
      { adi: 'Sac Levha DC01 1.2mm', tip: 'Hammadde', birim: 'KG', miktar: 18, fiyat: 42 },
      { adi: 'Profil Boru 30x30', tip: 'Hammadde', birim: 'MT', miktar: 2.5, fiyat: 55 },
      { adi: 'Civata M8 Set', tip: 'Hammadde', birim: 'AD', miktar: 12, fiyat: 1.5 },
      { adi: 'Kaynak Teli ER70S', tip: 'Hammadde', birim: 'KG', miktar: 0.4, fiyat: 95 },
    ],
    tedarikciler: ['Karadeniz Sac Ticaret A.Ş.', 'Bağlantı Elemanları Bursa Ltd.'],
    musteriler: ['Anadolu Otomotiv OEM A.Ş.', 'Kaporta Servis Merkezi Ltd.'],
    operasyonlar: ['Lazer Kesim', 'Pres', 'Kaynak', 'Montaj-Kontrol'],
  },
  {
    kod: 'GIDA',
    adi: 'Anadolu Süt ve Süt Ürünleri A.Ş.',
    sektor: 'Gıda',
    sehir: 'Konya',
    mamul: { adi: 'Tam Yağlı Süt 1L', tip: 'Mamul', birim: 'AD', fiyat: 28 },
    hammaddeler: [
      { adi: 'Çiğ Süt', tip: 'Hammadde', birim: 'LT', miktar: 1.02, fiyat: 18 },
      { adi: 'Ambalaj Karton 1L', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 1.2 },
      { adi: 'Kapak Folyo', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 0.3 },
      { adi: 'Etiket Shrink', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 0.25 },
    ],
    tedarikciler: ['Çiftlik Kooperatifi Konya', 'Ambalaj Paket A.Ş.'],
    musteriler: ['Market Zinciri Gıda A.Ş.', 'Oteller Tedarik Ltd.'],
    operasyonlar: ['Kabul-Analiz', 'Pastörizasyon', 'Dolum', 'Soğuk Depolama'],
  },
];

async function ensureBirim(client, kod, adi) {
  await client.query(
    `INSERT INTO olcu_birimleri (birim_kodu, birim_adi, aktif) VALUES ($1,$2,TRUE)
     ON CONFLICT (birim_kodu) DO NOTHING`,
    [kod, adi]
  );
}

async function createFirma(client, f) {
  const firma = (await client.query(
    `INSERT INTO firmalar (firma_kodu, firma_adi, adres, email)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [f.kod, f.adi, `${f.sehir} Organize Sanayi`, `info@${f.kod.toLowerCase()}.demo`]
  )).rows[0];

  const isYeri = (await client.query(
    `INSERT INTO is_yerleri (firma_id, is_yeri_kodu, is_yeri_adi, adres)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [firma.id, `${f.kod}-MRK`, `${f.adi} Merkez`, f.sehir]
  )).rows[0];

  // depo_rolu CHECK: Normal | GKK | CKK | Hammadde | Mamul | Bloke
  const depoDefs = [
    [`${f.kod}-ANA`, 'Ana Depo', true, 'Normal', 'ANA'],
    [`${f.kod}-HMD`, 'Hammadde Depo', false, 'Hammadde', 'HAMMADDE'],
    [`${f.kod}-MAM`, 'Mamul Depo', false, 'Mamul', 'MAMUL'],
    [`${f.kod}-KK`, 'Kalite Depo', false, 'GKK', 'KALITE'],
    [`${f.kod}-SVK`, 'Sevk Depo', false, 'Normal', 'SEVK'],
  ];
  const depolar = {};
  for (const [kod, adi, varsayilan, rol, key] of depoDefs) {
    const d = (await client.query(
      `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, aktif, varsayilan, depo_rolu)
       VALUES ($1,$2,$3,TRUE,$4,$5) RETURNING *`,
      [isYeri.id, kod, adi, varsayilan, rol]
    )).rows[0];
    depolar[key] = d;
  }
  return { firma, isYeri, depolar };
}

async function createCari(client, { adi, turu, firmaId, isYeriId, sehir }) {
  const kod = await sonrakiKod(client, cariSeriKodundanTur(turu));
  return (await client.query(
    `INSERT INTO cariler (
       cari_kodu, cari_adi, cari_turu, telefon, email, il, ulke, para_birimi,
       odeme_vadesi_gun, aktif, firma_id, is_yeri_id, notlar
     ) VALUES ($1,$2,$3,$4,$5,$6,'Türkiye','TRY',30,TRUE,$7,$8,$9)
     RETURNING *`,
    [kod, adi, turu, '0212' + String(1000000 + Math.floor(Math.random() * 8000000)).slice(0, 7),
      `${adi.split(' ')[0].toLowerCase()}@demo.local`, sehir, firmaId, isYeriId, 'demo-4-firma']
  )).rows[0];
}

async function createStok(client, { row, firmaId, isYeriId, girisDepo, cikisDepo }) {
  const kod = await sonrakiKod(client, stokSeriKodundanTip(row.tip));
  const s = (await client.query(
    `INSERT INTO stoklar (
       stok_kodu, stok_adi, birim, satis_fiyati, stok_tipi, tedarik_tipi,
       aktif, firma_id, varsayilan_giris_depo_id, varsayilan_cikis_depo_id,
       kalite_kontrol_gerekli, aciklama
     ) VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      kod, row.adi, row.birim, row.fiyat || 0, row.tip,
      row.tip === 'Mamul' ? 'Uretim' : 'Satinalma',
      firmaId, girisDepo, cikisDepo,
      row.tip === 'Hammadde' || row.tip === 'Mamul',
      'demo-4-firma',
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO stok_is_yeri (stok_id, is_yeri_id, aktif) VALUES ($1,$2,TRUE)
     ON CONFLICT (stok_id, is_yeri_id) DO UPDATE SET aktif = TRUE`,
    [s.id, isYeriId]
  );
  if (girisDepo) {
    await client.query(
      `INSERT INTO stok_depo (stok_id, depo_id, is_yeri_id, aktif) VALUES ($1,$2,$3,TRUE)
       ON CONFLICT (stok_id, depo_id) DO NOTHING`,
      [s.id, girisDepo, isYeriId]
    );
  }
  return s;
}

async function stokGiris(client, { stokId, depoId, miktar, firmaId, isYeriId, belgeNo, birim = 'AD' }) {
  let hareketNo;
  try { hareketNo = await sonrakiKod(client, 'STOK_HAREKET'); }
  catch (_) { hareketNo = `SH-${belgeNo}-${Date.now().toString(36).slice(-4)}`; }
  const hk = await client.query(
    `SELECT id FROM hareket_kodlari WHERE yon ILIKE '%gir%' OR hareket_kodu ILIKE '%GIR%' LIMIT 1`
  );
  const baslik = await client.query(
    `INSERT INTO stok_hareketleri (
       hareket_no, hareket_tipi, hareket_kodu_id, depo_id, firma_id, is_yeri_id,
       aciklama, onay_durumu, hareket_tarihi
     ) VALUES ($1,'STOK_GIRIS',$2,$3,$4,$5,$6,'Onayli',CURRENT_DATE)
     RETURNING id`,
    [hareketNo, hk.rows[0]?.id || null, depoId, firmaId, isYeriId, `Demo giriş ${belgeNo}`]
  );
  await client.query(
    `INSERT INTO stok_hareket_satirlari (hareket_id, stok_id, miktar, birim, yon)
     VALUES ($1,$2,$3,$4,1)`,
    [baslik.rows[0].id, stokId, miktar, birim]
  );
  return baslik.rows[0].id;
}

async function seedFirm(client, def) {
  const { firma, isYeri, depolar } = await createFirma(client, def);
  const ctx = { firma, isYeri, depolar, stoklar: {}, cariler: {} };

  for (const b of ['AD', 'KG', 'MT', 'LT']) {
    await ensureBirim(client, b, b);
  }

  // cariler
  ctx.cariler.tedarikciler = [];
  for (const adi of def.tedarikciler) {
    ctx.cariler.tedarikciler.push(await createCari(client, {
      adi, turu: 'Tedarikci', firmaId: firma.id, isYeriId: isYeri.id, sehir: def.sehir,
    }));
  }
  ctx.cariler.musteriler = [];
  for (const adi of def.musteriler) {
    const c = await createCari(client, {
      adi, turu: 'Musteri', firmaId: firma.id, isYeriId: isYeri.id, sehir: def.sehir,
    });
    if (!c.cari_kodu) {
      const again = (await client.query('SELECT * FROM cariler WHERE id=$1', [c.id])).rows[0];
      ctx.cariler.musteriler.push(again);
    } else {
      ctx.cariler.musteriler.push(c);
    }
  }

  // stoklar
  ctx.stoklar.hammaddeler = [];
  for (const h of def.hammaddeler) {
    const s = await createStok(client, {
      row: h, firmaId: firma.id, isYeriId: isYeri.id,
      girisDepo: depolar.HAMMADDE.id, cikisDepo: depolar.HAMMADDE.id,
    });
    ctx.stoklar.hammaddeler.push({ ...s, bomMiktar: h.miktar });
  }
  ctx.stoklar.mamul = await createStok(client, {
    row: def.mamul, firmaId: firma.id, isYeriId: isYeri.id,
    girisDepo: depolar.MAMUL.id, cikisDepo: depolar.SEVK.id,
  });

  // BOM
  const agacNo = await sonrakiKod(client, 'URUN_AGACI').catch(() => `${def.kod}-BOM-1`);
  const agac = (await client.query(
    `INSERT INTO urun_agaclari (agac_kodu, agac_adi, mamul_stok_id, miktar, aktif, firma_id)
     VALUES ($1,$2,$3,1,TRUE,$4) RETURNING *`,
    [agacNo, `${def.mamul.adi} Ağacı`, ctx.stoklar.mamul.id, firma.id]
  )).rows[0];

  let sira = 1;
  for (const h of ctx.stoklar.hammaddeler) {
    await client.query(
      `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
       VALUES ($1,$2,$3,$4,$5)`,
      [agac.id, h.id, h.bomMiktar, h.birim, sira++]
    );
  }

  // İş merkezi + rota
  const im = (await client.query(
    `INSERT INTO is_merkezleri (merkez_kodu, merkez_adi, is_yeri_id, aktif)
     VALUES ($1,$2,$3,TRUE) RETURNING *`,
    [`${def.kod}-IM1`, `${def.kod} Ana Hat`, isYeri.id]
  )).rows[0];

  const rotaNo = await sonrakiKod(client, 'ROTA').catch(() => `${def.kod}-R1`);
  const rota = (await client.query(
    `INSERT INTO rotalar (rota_kodu, rota_adi, stok_id, aktif, firma_id, varsayilan)
     VALUES ($1,$2,$3,TRUE,$4,TRUE) RETURNING *`,
    [rotaNo, `${def.kod} rota`, ctx.stoklar.mamul.id, firma.id]
  )).rows[0];

  let opSira = 10;
  for (const opAdi of def.operasyonlar) {
    await client.query(
      `INSERT INTO rota_operasyonlari (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id, sure_dk)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [rota.id, opSira, `OP${opSira}`, opAdi, im.id, 30]
    );
    opSira += 10;
  }

  // Hammadde stok girişi (satınalma karşılığı)
  for (const h of ctx.stoklar.hammaddeler) {
    await stokGiris(client, {
      stokId: h.id, depoId: depolar.HAMMADDE.id, miktar: Math.max(100, h.bomMiktar * 200),
      firmaId: firma.id, isYeriId: isYeri.id, belgeNo: `${def.kod}-${h.stok_kodu}`, birim: h.birim,
    });
  }

  // SA: talep → teklif isteği → teklif (onaylı) → sipariş → mal kabul
  const talepNo = await sonrakiKod(client, 'SATINALMA_TALEP').catch(() => `${def.kod}-TAL-1`);
  const talep = (await client.query(
    `INSERT INTO satin_alma_talepleri (talep_no, durum, is_yeri_id, firma_id, aciklama)
     VALUES ($1,'Onayli',$2,$3,$4) RETURNING *`,
    [talepNo, isYeri.id, firma.id, `${def.kod} hammadde talebi (MRP/talep)`]
  )).rows[0];

  const h0 = ctx.stoklar.hammaddeler[0];
  await client.query(
    `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim)
     VALUES ($1,$2,$3,$4)`,
    [talep.id, h0.id, 50, h0.birim]
  );

  const istekNo = await sonrakiKod(client, 'SATINALMA_TEKLIF_ISTEK').catch(() => `${def.kod}-TI-1`);
  const istek = (await client.query(
    `INSERT INTO satin_alma_teklif_istekleri (istek_no, is_yeri_id, firma_id, durum, aciklama)
     VALUES ($1,$2,$3,'TeklifeDonustu',$4) RETURNING *`,
    [istekNo, isYeri.id, firma.id, `${def.kod} teklif isteği — ${h0.stok_adi}`]
  )).rows[0];
  await client.query(
    `INSERT INTO satin_alma_teklif_istek_satirlari (istek_id, stok_id, miktar, birim)
     VALUES ($1,$2,50,$3)`,
    [istek.id, h0.id, h0.birim]
  );

  const teklifNo = await sonrakiKod(client, 'SATINALMA_TEKLIF').catch(() => `${def.kod}-TK-1`);
  const teklif = (await client.query(
    `INSERT INTO satin_alma_teklifleri (
       teklif_no, cari_id, istek_id, is_yeri_id, firma_id, durum, gecerlilik_tarihi, aciklama
     ) VALUES ($1,$2,$3,$4,$5,'Onayli',CURRENT_DATE + 30,$6) RETURNING *`,
    [
      teklifNo,
      ctx.cariler.tedarikciler[0].id,
      istek.id,
      isYeri.id,
      firma.id,
      `${def.kod} tedarikçi teklifi — onaylı`,
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO satin_alma_teklif_satirlari (teklif_id, stok_id, miktar, birim_fiyat, birim)
     VALUES ($1,$2,50,$3,$4)`,
    [teklif.id, h0.id, h0.satis_fiyati || 10, h0.birim]
  );

  const saNo = await sonrakiKod(client, 'SATINALMA_SIPARIS').catch(() => `${def.kod}-SA-1`);
  const sa = (await client.query(
    `INSERT INTO satin_alma_siparisleri (
       siparis_no, cari_id, depo_id, durum, firma_id, is_yeri_id, siparis_tarihi,
       talep_id, teklif_id, kaynak_belge_tipi, kaynak_belge_id
     ) VALUES ($1,$2,$3,'Onayli',$4,$5,CURRENT_DATE,$6,$7,'SATINALMA_TEKLIF',$7) RETURNING *`,
    [saNo, ctx.cariler.tedarikciler[0].id, depolar.HAMMADDE.id, firma.id, isYeri.id, talep.id, teklif.id]
  )).rows[0];
  const saSatir = (await client.query(
    `INSERT INTO satin_alma_siparis_satirlari (siparis_id, stok_id, miktar, birim_fiyat, birim)
     VALUES ($1,$2,50,$3,$4) RETURNING id`,
    [sa.id, h0.id, h0.satis_fiyati || 10, h0.birim]
  )).rows[0];

  const mkNo = await sonrakiKod(client, 'MAL_KABUL').catch(() => `${def.kod}-MK-1`);
  const mk = (await client.query(
    `INSERT INTO mal_kabuller (
       kabul_no, siparis_id, depo_id, durum, firma_id, is_yeri_id, kabul_tarihi
     ) VALUES ($1,$2,$3,'Onayli',$4,$5,CURRENT_DATE) RETURNING *`,
    [mkNo, sa.id, depolar.HAMMADDE.id, firma.id, isYeri.id]
  )).rows[0];
  await client.query(
    `INSERT INTO mal_kabul_satirlari (kabul_id, siparis_satir_id, stok_id, miktar, birim, kabul_edilen)
     VALUES ($1,$2,$3,50,$4,50)`,
    [mk.id, saSatir.id, h0.id, h0.birim]
  );

  // Üretim emri
  const ueNo = await sonrakiKod(client, 'URETIM_EMRI').catch(() => `${def.kod}-UE-1`);
  const ue = (await client.query(
    `INSERT INTO uretim_emirleri (
       emir_no, stok_id, planlanan_miktar, durum, is_yeri_id, firma_id,
       mamul_depo_id, hammadde_depo_id, urun_agaci_id, rota_id
     ) VALUES ($1,$2,20,'Acik',$3,$4,$5,$6,$7,$8) RETURNING *`,
    [ueNo, ctx.stoklar.mamul.id, isYeri.id, firma.id,
      depolar.MAMUL.id, depolar.HAMMADDE.id, agac.id, rota.id]
  )).rows[0];

  // Mamul stok girişi (üretim çıktısı)
  await stokGiris(client, {
    stokId: ctx.stoklar.mamul.id, depoId: depolar.MAMUL.id, miktar: 20,
    firmaId: firma.id, isYeriId: isYeri.id, belgeNo: `${def.kod}-URETIM`, birim: def.mamul.birim,
  });

  // CRM fırsat
  const firsatNo = await sonrakiKod(client, 'CRM_FIRSAT').catch(() => `${def.kod}-FRS-1`);
  const asamaId = (await client.query(
    `SELECT id FROM crm_firsat_asamalari ORDER BY id LIMIT 1`
  )).rows[0]?.id;
  const firsat = (await client.query(
    `INSERT INTO crm_firsatlar (
       firsat_kodu, firsat_adi, musteri_tipi, cari_id, asama_id, durum, firma_id, is_yeri_id, beklenen_gelir, para_birimi
     ) VALUES ($1,$2,'Musteri',$3,$4,'Acik',$5,$6,$7,'TRY') RETURNING *`,
    [firsatNo, `${def.mamul.adi} fırsatı`, ctx.cariler.musteriler[0].id, asamaId,
      firma.id, isYeri.id, def.mamul.fiyat * 10]
  )).rows[0];

  // Satış siparişi
  const sipNo = await sonrakiKod(client, 'SATIS_SIPARIS').catch(() => `${def.kod}-SP-1`);
  const musteri = ctx.cariler.musteriler[0];
  if (!musteri?.cari_kodu) {
    throw new Error(`Müşteri cari_kodu eksik: ${JSON.stringify(musteri)}`);
  }
  const sip = (await client.query(
    `INSERT INTO siparisler (
       siparis_no, cari_id, cari_kodu, cari_adi, siparis_turu, durum, firma_id, is_yeri_id, depo_id,
       siparis_tarihi, para_birimi, genel_toplam
     ) VALUES ($1,$2,$3,$4,'SatisSiparis','Onayli',$5,$6,$7,CURRENT_DATE,'TRY',$8)
     RETURNING *`,
    [
      sipNo, musteri.id, String(musteri.cari_kodu), String(musteri.cari_adi || musteri.cari_kodu),
      firma.id, isYeri.id, depolar.SEVK.id, def.mamul.fiyat * 5,
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO siparis_detaylari (
       siparis_id, stok_id, miktar, birim_fiyat, toplam_tutar, stok_birimi, stok_kodu, stok_adi
     ) VALUES ($1,$2,5,$3,$4,$5,$6,$7)`,
    [sip.id, ctx.stoklar.mamul.id, def.mamul.fiyat, def.mamul.fiyat * 5, def.mamul.birim,
      ctx.stoklar.mamul.stok_kodu, ctx.stoklar.mamul.stok_adi]
  );

  // Sevk + irsaliye
  const sevkNo = await sonrakiKod(client, 'SEVK_EMRI').catch(() => `${def.kod}-SV-1`);
  const sevk = (await client.query(
    `INSERT INTO sevk_emirleri (
       sevk_no, siparis_id, depo_id, durum, firma_id, sevk_tarihi, cari_id
     ) VALUES ($1,$2,$3,'Onayli',$4,CURRENT_DATE,$5) RETURNING *`,
    [sevkNo, sip.id, depolar.SEVK.id, firma.id, musteri.id]
  )).rows[0];
  await client.query(
    `INSERT INTO sevk_emri_satirlari (sevk_id, stok_id, miktar, birim)
     VALUES ($1,$2,5,$3)`,
    [sevk.id, ctx.stoklar.mamul.id, def.mamul.birim]
  );

  const irsNo = await sonrakiKod(client, 'IRSALIYE').catch(() => `${def.kod}-IR-1`);
  const irs = (await client.query(
    `INSERT INTO irsaliyeler (
       irsaliye_no, cari_id, depo_id, durum, firma_id, is_yeri_id,
       irsaliye_tarihi, siparis_id, sevk_emri_id, sevk_il, sevk_ulke
     ) VALUES ($1,$2,$3,'Onayli',$4,$5,CURRENT_DATE,$6,$7,$8,'Türkiye') RETURNING *`,
    [irsNo, musteri.id, depolar.SEVK.id, firma.id, isYeri.id, sip.id, sevk.id, def.sehir]
  )).rows[0];
  await client.query(
    `INSERT INTO irsaliye_satirlari (irsaliye_id, stok_id, miktar, birim, birim_fiyat)
     VALUES ($1,$2,5,$3,$4)`,
    [irs.id, ctx.stoklar.mamul.id, def.mamul.birim, def.mamul.fiyat]
  );

  // Fatura
  const fatNo = await sonrakiKod(client, 'FATURA').catch(() => `${def.kod}-FAT-1`);
  await client.query(
    `INSERT INTO faturalar (
       fatura_no, cari_id, fatura_turu, durum, firma_id, is_yeri_id,
       fatura_tarihi, siparis_id, irsaliye_id, para_birimi, odenecek_tutar
     ) VALUES ($1,$2,'Satis','Onayli',$3,$4,CURRENT_DATE,$5,$6,'TRY',$7)`,
    [fatNo, musteri.id, firma.id, isYeri.id, sip.id, irs.id, def.mamul.fiyat * 5]
  );

  // KK emri (mamul)
  const kkNo = await sonrakiKod(client, 'KK_EMIR').catch(() => `${def.kod}-KK-1`);
  await client.query(
    `INSERT INTO kk_emirleri (
       emir_no, stok_id, miktar, durum, yon, depo_id, firma_id
     ) VALUES ($1,$2,5,'Acik','CKK',$3,$4)`,
    [kkNo, ctx.stoklar.mamul.id, depolar.KALITE.id, firma.id]
  );

  // Parti (gıda/metal için)
  if (def.kod === 'GIDA' || def.kod === 'META') {
    const partiNo = await sonrakiKod(client, 'PARTI').catch(() => `${def.kod}-P1`);
    await client.query(
      `INSERT INTO stok_partileri (parti_no, stok_id, firma_id, son_kullanma_tarihi, aktif)
       VALUES ($1,$2,$3,CURRENT_DATE + INTERVAL '90 days', TRUE)`,
      [partiNo, ctx.stoklar.mamul.id, firma.id]
    );
  }

  return {
    firma: { id: firma.id, kod: firma.firma_kodu, adi: firma.firma_adi, sektor: def.sektor },
    isYeriId: isYeri.id,
    mamul: ctx.stoklar.mamul.stok_kodu,
    siparis: sip.siparis_no,
    uretim: ue.emir_no,
    firsat: firsat?.firsat_kodu || null,
  };
}

async function main() {
  const summary = [];
  await withTransaction(pool, async (client) => {
    const existing = await client.query(
      `SELECT firma_kodu FROM firmalar WHERE firma_kodu = ANY($1)`,
      [FIRMS.map((f) => f.kod)]
    );
    if (existing.rows.length) {
      throw new Error(
        `Demo firmalar zaten var: ${existing.rows.map((r) => r.firma_kodu).join(', ')}. Önce demo-cleanup çalıştırın.`
      );
    }
    for (const def of FIRMS) {
      console.log('Seed:', def.kod, def.adi);
      summary.push(await seedFirm(client, def));
    }
  });
  console.log(JSON.stringify({ ok: true, firmalar: summary }, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
