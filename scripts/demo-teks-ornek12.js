/**
 * Denim Tekstil (TEKS) — sıfırdan iki uçtan uca örnek.
 *
 * Örnek1: MRP YOK — satış siparişinden manuel ihtiyaç → satınalma → üretim → sevk
 * Örnek2: MRP VAR — bağımsız ihtiyaç + MRP çalışması → SA talep + UE önerileri
 *
 * Tüm operasyonel belgelerde notlar ve mümkün olan tüm alanlar doldurulur.
 *
 * Kullanım (önce purge):
 *   node scripts/purge-firma-veri.js TEKS
 *   node scripts/demo-teks-ornek12.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod, stokSeriKodundanTip, cariSeriKodundanTur } = require('../src/utils/kodUretici');
const { mrpCalistir } = require('../src/services/mrpService');

const TAG1 = 'ORNEK1';
const TAG2 = 'ORNEK2';
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

async function kod(client, seri, fb) {
  try { return await sonrakiKod(client, seri); }
  catch (_) { return fb; }
}

/** Transaction içinde opsiyonel SQL — hata olursa savepoint ile devam */
async function trySql(client, sql, params = []) {
  const sp = `sp_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await client.query(`SAVEPOINT ${sp}`);
    const r = await client.query(sql, params);
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    return r;
  } catch (_) {
    try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch (__) { /* ignore */ }
    return null;
  }
}

async function optional(client, fn) {
  const sp = `sp_opt_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await client.query(`SAVEPOINT ${sp}`);
    const r = await fn();
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    return r;
  } catch (_) {
    try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch (__) { /* ignore */ }
    return null;
  }
}

async function hk(client, like) {
  const r = await client.query(
    `SELECT id FROM hareket_kodlari
     WHERE hareket_kodu ILIKE $1 OR hareket_adi ILIKE $1
     ORDER BY id LIMIT 1`,
    [`%${like}%`]
  );
  return r.rows[0]?.id || null;
}

async function loadOrg(client) {
  const firma = (await client.query(
    `SELECT * FROM firmalar WHERE firma_kodu='TEKS'`
  )).rows[0];
  if (!firma) throw new Error('TEKS firması yok — önce demo:4-firma çalıştırın.');
  const isYeri = (await client.query(
    `SELECT * FROM is_yerleri WHERE firma_id=$1 ORDER BY id LIMIT 1`,
    [firma.id]
  )).rows[0];
  const depoRows = (await client.query(
    `SELECT d.* FROM depolar d WHERE d.is_yeri_id=$1`,
    [isYeri.id]
  )).rows;
  const depolar = {};
  for (const d of depoRows) {
    if (d.depo_kodu.includes('HMD') || d.depo_rolu === 'Hammadde') depolar.HMD = d;
    else if (d.depo_kodu.includes('MAM') || d.depo_rolu === 'Mamul') depolar.MAM = d;
    else if (d.depo_kodu.includes('SVK') || d.depo_kodu.includes('SEVK')) depolar.SVK = d;
    else if (d.depo_kodu.includes('KK') || d.depo_rolu === 'GKK') depolar.KK = d;
    else if (d.varsayilan || d.depo_kodu.includes('ANA')) depolar.ANA = d;
  }
  if (!depolar.ANA) depolar.ANA = depoRows[0];
  if (!depolar.HMD) depolar.HMD = depolar.ANA;
  if (!depolar.MAM) depolar.MAM = depolar.ANA;
  if (!depolar.SVK) depolar.SVK = depolar.ANA;
  if (!depolar.KK) depolar.KK = depolar.ANA;
  return { firma, isYeri, depolar };
}

async function ensureBirim(client, kodu, adi) {
  await client.query(
    `INSERT INTO olcu_birimleri (birim_kodu, birim_adi, aktif) VALUES ($1,$2,TRUE)
     ON CONFLICT (birim_kodu) DO NOTHING`,
    [kodu, adi]
  );
}

async function createCari(client, {
  adi, turu, firmaId, isYeriId, tag, sehir = 'Gaziantep', ilce = 'Şehitkamil',
}) {
  const cariKodu = await kod(client, cariSeriKodundanTur(turu), `C-${Date.now()}`);
  const c = (await client.query(
    `INSERT INTO cariler (
       cari_kodu, cari_adi, cari_adi_2, cari_turu, telefon, telefon2, cep_tel, fax, email, website,
       vergi_no, vergi_dairesi, yetkili_adi, yetkili_telefon,
       adres, fatura_adresi, fatura_adres1, fatura_adres2, fatura_adres3,
       il, ilce, ulke, posta_kodu, para_birimi, odeme_vadesi_gun, aktif,
       sektor_kodu, bolge_kodu, nace_kodu, aciklama, notlar,
       firma_id, is_yeri_id
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
       $11,$12,$13,$14,
       $15,$16,$17,$18,$19,
       $20,$21,'TR','27000','TRY',30,TRUE,
       $22,$23,$24,$25,$26,
       $27,$28
     ) RETURNING *`,
    [
      cariKodu, adi, `${adi} (${turu})`, turu,
      '0342 111 22 33', '0342 111 22 34', '0532 111 22 33', '0342 111 22 35',
      `info@${cariKodu.toLowerCase()}.demo`, `https://${cariKodu.toLowerCase()}.demo`,
      String(1000000000 + Math.floor(Math.random() * 899999999)),
      `${sehir} VD`, 'Ayşe Yetkili', '0533 444 55 66',
      `${sehir} OSB 1. Cad. No:12`, `${sehir} OSB fatura adresi`,
      `${sehir} OSB 1. Cad.`, 'No:12 Kapı A', 'Kat 1',
      sehir, ilce,
      turu === 'Tedarikci' ? 'TEKSTIL' : 'PERAKENDE',
      'GAP', '13.10',
      `${tag} — ${turu} kartı; tüm iletişim ve adres alanları dolu`,
      `${tag} dahili not: kredi limiti ve sevkiyat tercihi kayıtlı`,
      firmaId, isYeriId,
    ]
  )).rows[0];

  // Opsiyonel çocuk tablolar — savepoint ile transaction bozulmasın
  const spChild = async (name, sql, params) => {
    const sp = `sp_${name}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await client.query(`SAVEPOINT ${sp}`);
      await client.query(sql, params);
      await client.query(`RELEASE SAVEPOINT ${sp}`);
    } catch (_) {
      try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch (__) { /* ignore */ }
    }
  };
  await spChild('sevk',
    `INSERT INTO cari_sevk_adresleri (
       cari_id, sira_no, adres_adi, adres1, adres2, ulke, il, ilce, posta_kodu,
       telefon, yetkili_adi, varsayilan, pasif
     ) VALUES ($1,1,'Merkez Sevk',$2,'Depo girişi','TR',$3,$4,'27000',$5,$6,TRUE,FALSE)`,
    [c.id, `${sehir} Lojistik Cad. No:5`, sehir, ilce, '0342 200 00 01', 'Sevk Sorumlusu']);
  await spChild('banka',
    `INSERT INTO cari_banka_bilgileri (
       cari_id, sira_no, banka_adi, sube_adi, iban, para_birimi, varsayilan
     ) VALUES ($1,1,'Ziraat Bankası','Gaziantep OSB','TR330001000000000000000001','TRY',TRUE)`,
    [c.id]);

  return c;
}

async function createStok(client, {
  adi, tip, birim, fiyat, firmaId, isYeriId, girisDepo, cikisDepo, tag, ekstra = {},
}) {
  const stokKodu = await kod(client, stokSeriKodundanTip(tip), `S-${Date.now()}`);
  const s = (await client.query(
    `INSERT INTO stoklar (
       stok_kodu, stok_adi, stok_adi_2, uzun_stok_kodu, birim, satin_birimi, satis_birimi,
       stok_takip_birimi, satis_fiyati, stok_tipi, tedarik_tipi, aktif,
       abc_kodu, marka, ulke_mensei, gtip_kodu, uretici_kodu,
       emniyet_stok, minimum_stok, maksimum_stok, yeniden_siparis_seviyesi,
       sabit_siparis_miktari, optimum_siparis_miktari, temin_suresi_gun,
       varsayilan_kdv_oran, kalite_kontrol_gerekli, parti_politika, seri_politika,
       maliyet_yontem, son_maliyet, net_agirlik, brut_agirlik, agirlik_birimi,
       varsayilan_giris_depo_id, varsayilan_cikis_depo_id,
       aciklama, firma_id
     ) VALUES (
       $1,$2,$3,$4,$5,$5,$5,
       $5,$6,$7,$8,TRUE,
       $9,$10,'TR',$11,$12,
       $13,$14,$15,$16,
       $17,$18,$19,
       20,TRUE,'IstegeBagli','Takipsiz',
       'Ortalama',$6,$20,$21,'KG',
       $22,$23,
       $24,$25
     ) RETURNING *`,
    [
      stokKodu, adi, `${adi} / ${tip}`, `TEKS-${stokKodu}-${tip}`,
      birim, fiyat, tip, tip === 'Mamul' ? 'Uretim' : 'Satinalma',
      tip === 'Mamul' ? 'A' : 'B', 'DenimTekstil', tip === 'Mamul' ? '620342' : '5208',
      `URET-${stokKodu}`,
      ekstra.emniyet || 10, ekstra.min || 20, ekstra.max || 5000, ekstra.rop || 50,
      ekstra.eoq || 100, ekstra.opt || 200, ekstra.lt || 7,
      ekstra.net || 0.5, ekstra.brut || 0.6,
      girisDepo, cikisDepo,
      `${tag} stok kartı — tekstil ${tip.toLowerCase()}; tüm MRP/ölçü alanları dolu`,
      firmaId,
    ]
  )).rows[0];

  await client.query(
    `INSERT INTO stok_is_yeri (stok_id, is_yeri_id, aktif) VALUES ($1,$2,TRUE)
     ON CONFLICT (stok_id, is_yeri_id) DO UPDATE SET aktif=TRUE`,
    [s.id, isYeriId]
  );
  if (girisDepo) {
    await client.query(
      `INSERT INTO stok_depo (stok_id, depo_id, is_yeri_id, aktif) VALUES ($1,$2,$3,TRUE)
       ON CONFLICT (stok_id, depo_id) DO NOTHING`,
      [s.id, girisDepo, isYeriId]
    );
  }
  await trySql(client,
    `INSERT INTO stok_barkodlari (stok_id, barkod, barkod_tipi, varsayilan)
     VALUES ($1,$2,'EAN13',TRUE)`,
    [s.id, `869${String(s.id).padStart(10, '0')}`.slice(0, 13)]);
  await trySql(client,
    `INSERT INTO stok_dil_tanimlari (stok_id, dil_kodu, stok_adi, aciklama)
     VALUES ($1,'EN',$2,$3)`,
    [s.id, `${adi} EN`, `${tag} English name`]);
  return s;
}

async function stokGiris(client, {
  stokId, depoId, miktar, birim, firmaId, isYeriId, tag, aciklama,
}) {
  const hareketNo = await kod(client, 'STOK_HAREKET', `SH-${Date.now()}`);
  const hkId = await hk(client, 'GIR');
  const baslik = (await client.query(
    `INSERT INTO stok_hareketleri (
       hareket_no, hareket_tipi, hareket_kodu_id, depo_id, firma_id, is_yeri_id,
       aciklama, onay_durumu, hareket_tarihi
     ) VALUES ($1,'STOK_GIRIS',$2,$3,$4,$5,$6,'Onayli',CURRENT_DATE)
     RETURNING id`,
    [hareketNo, hkId, depoId, firmaId, isYeriId, aciklama || `${tag} stok giriş`]
  )).rows[0];
  await client.query(
    `INSERT INTO stok_hareket_satirlari (hareket_id, stok_id, miktar, birim, yon)
     VALUES ($1,$2,$3,$4,1)`,
    [baslik.id, stokId, miktar, birim]
  );
  return baslik.id;
}

async function seedMaster(client, org) {
  const { firma, isYeri, depolar } = org;
  for (const [k, a] of [['AD', 'Adet'], ['MT', 'Metre'], ['KG', 'Kilogram'], ['PK', 'Paket']]) {
    await ensureBirim(client, k, a);
  }

  const tag = 'TEKS-MASTER';
  const tedarikciler = [
    await createCari(client, {
      adi: 'Ege Denim Kumaş A.Ş.', turu: 'Tedarikci',
      firmaId: firma.id, isYeriId: isYeri.id, tag, sehir: 'İzmir', ilce: 'Bornova',
    }),
    await createCari(client, {
      adi: 'Aksesuar Moda Ltd.', turu: 'Tedarikci',
      firmaId: firma.id, isYeriId: isYeri.id, tag, sehir: 'İstanbul', ilce: 'Bağcılar',
    }),
  ];
  const musteriler = [
    await createCari(client, {
      adi: 'Moda Perakende Zinciri A.Ş.', turu: 'Musteri',
      firmaId: firma.id, isYeriId: isYeri.id, tag, sehir: 'İstanbul', ilce: 'Şişli',
    }),
    await createCari(client, {
      adi: 'Jeans Outlet TR Ltd.', turu: 'Musteri',
      firmaId: firma.id, isYeriId: isYeri.id, tag, sehir: 'Ankara', ilce: 'Çankaya',
    }),
  ];

  const hammaddelerDef = [
    { adi: 'Denim Kumaş 12oz Indigo', tip: 'Hammadde', birim: 'MT', miktar: 1.4, fiyat: 95 },
    { adi: 'Pamuk İplik Ne30', tip: 'Hammadde', birim: 'KG', miktar: 0.08, fiyat: 120 },
    { adi: 'Metal Fermuar 18cm', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 8 },
    { adi: 'Kot Düğme Seti 5li', tip: 'Hammadde', birim: 'AD', miktar: 1, fiyat: 6 },
  ];
  const hammaddeler = [];
  for (const h of hammaddelerDef) {
    const s = await createStok(client, {
      adi: h.adi, tip: h.tip, birim: h.birim, fiyat: h.fiyat,
      firmaId: firma.id, isYeriId: isYeri.id,
      girisDepo: depolar.HMD.id, cikisDepo: depolar.HMD.id, tag,
    });
    hammaddeler.push({ ...s, bomMiktar: h.miktar, maliyet: h.fiyat });
  }

  const mamul = await createStok(client, {
    adi: 'Kot Pantolon Slim 32', tip: 'Mamul', birim: 'AD', fiyat: 890,
    firmaId: firma.id, isYeriId: isYeri.id,
    girisDepo: depolar.MAM.id, cikisDepo: depolar.SVK.id, tag,
    ekstra: { emniyet: 20, min: 50, max: 2000, rop: 80, eoq: 100, lt: 5, net: 0.45, brut: 0.55 },
  });

  // Yarı mamul (kesilmiş panel) — ağacı zenginleştir
  const yari = await createStok(client, {
    adi: 'Kesilmiş Denim Panel Seti', tip: 'YariMamul', birim: 'AD', fiyat: 220,
    firmaId: firma.id, isYeriId: isYeri.id,
    girisDepo: depolar.ANA.id, cikisDepo: depolar.ANA.id, tag,
  });

  // BOM: mamul ← yarı + fermuar + düğme; yarı ← kumaş + iplik
  const agacNo = await kod(client, 'URUN_AGACI', 'A-TEKS-1');
  const agac = (await client.query(
    `INSERT INTO urun_agaclari (agac_kodu, agac_adi, mamul_stok_id, miktar, aktif, firma_id)
     VALUES ($1,$2,$3,1,TRUE,$4) RETURNING *`,
    [agacNo, 'Kot Pantolon Slim 32 Ağacı', mamul.id, firma.id]
  )).rows[0];

  // Düz satırlar (sistem nested veya flat destekliyor)
  let sira = 1;
  await client.query(
    `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
     VALUES ($1,$2,1,'AD',$3)`,
    [agac.id, yari.id, sira++]
  );
  for (const h of hammaddeler.filter((x) => /Fermuar|Düğme/i.test(x.stok_adi))) {
    await client.query(
      `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
       VALUES ($1,$2,$3,$4,$5)`,
      [agac.id, h.id, h.bomMiktar, h.birim, sira++]
    );
  }
  // Yarı mamul için ayrı ağaç
  const agacYariNo = await kod(client, 'URUN_AGACI', 'A-TEKS-Y');
  const agacYari = (await client.query(
    `INSERT INTO urun_agaclari (agac_kodu, agac_adi, mamul_stok_id, miktar, aktif, firma_id)
     VALUES ($1,$2,$3,1,TRUE,$4) RETURNING *`,
    [agacYariNo, 'Kesilmiş Panel Ağacı', yari.id, firma.id]
  )).rows[0];
  let ys = 1;
  for (const h of hammaddeler.filter((x) => /Kumaş|İplik/i.test(x.stok_adi))) {
    await client.query(
      `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
       VALUES ($1,$2,$3,$4,$5)`,
      [agacYari.id, h.id, h.bomMiktar, h.birim, ys++]
    );
  }

  const im = (await client.query(
    `INSERT INTO is_merkezleri (merkez_kodu, merkez_adi, is_yeri_id, aktif)
     VALUES ($1,$2,$3,TRUE) RETURNING *`,
    ['TEKS-IM1', 'Tekstil Ana Hat', isYeri.id]
  )).rows[0];

  const rotaNo = await kod(client, 'ROTA', 'R-TEKS-1');
  const rota = (await client.query(
    `INSERT INTO rotalar (rota_kodu, rota_adi, stok_id, aktif, firma_id, varsayilan)
     VALUES ($1,$2,$3,TRUE,$4,TRUE) RETURNING *`,
    [rotaNo, 'Kot Pantolon Rota', mamul.id, firma.id]
  )).rows[0];
  const ops = [
    ['OP10', 'Kesim', 25],
    ['OP20', 'Dikim', 45],
    ['OP30', 'Yıkama', 60],
    ['OP40', 'Ütü-Paket', 20],
  ];
  let opSira = 10;
  for (const [kodOp, adi, dk] of ops) {
    await client.query(
      `INSERT INTO rota_operasyonlari (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id, sure_dk)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [rota.id, opSira, kodOp, adi, im.id, dk]
    );
    opSira += 10;
  }

  // Fiyat listesi (başarısız olursa null — savepoint rollback değişkeni kirletmesin)
  const fiyatListe = await optional(client, async () => {
    const flNo = await kod(client, 'FIYAT_LISTE', 'FL-TEKS-1');
    const fl = (await client.query(
      `INSERT INTO fiyat_listeleri (liste_kodu, liste_adi, para_birimi, firma_id, aktif, baslangic_tarihi)
       VALUES ($1,$2,'TRY',$3,TRUE,CURRENT_DATE) RETURNING *`,
      [flNo, 'TEKS Perakende 2026', firma.id]
    )).rows[0];
    await client.query(
      `INSERT INTO fiyat_liste_satirlari (liste_id, stok_id, birim_fiyat, min_miktar)
       VALUES ($1,$2,$3,1)`,
      [fl.id, mamul.id, 890]
    );
    return fl;
  });

  return {
    tedarikciler, musteriler, hammaddeler, mamul, yari, agac, agacYari, rota, im, fiyatListe,
  };
}

/** Örnek1: MRP yok — satıştan geriye manuel planlama */
async function seedOrnek1(client, org, master) {
  const { firma, isYeri, depolar } = org;
  const { tedarikciler, musteriler, hammaddeler, mamul, agac, rota, fiyatListe } = master;
  const tag = TAG1;
  const musteri = musteriler[0];
  const tedarikci = tedarikciler[0];
  const qty = 100; // 100 adet kot pantolon siparişi

  // CRM: aday → fırsat
  const aday = await optional(client, async () => {
    const adayNo = await kod(client, 'CRM_ADAY', 'ADAY-1');
    return (await client.query(
      `INSERT INTO crm_adaylar (
         aday_kodu, aday_adi, telefon, email, il, ulke, durum, firma_id, bulma_yontemi, notlar
       ) VALUES ($1,$2,$3,$4,'İstanbul','TR','Nitelikli',$5,'Fuar',$6) RETURNING *`,
      [adayNo, 'Yeni Zincir Adayı', '0212 555 00 11', 'aday@moda.demo',
        firma.id, `${tag} CRM aday notu`]
    )).rows[0];
  });

  const firsat = await optional(client, async () => {
    const asamaId = (await client.query(`SELECT id FROM crm_firsat_asamalari ORDER BY id LIMIT 1`)).rows[0]?.id;
    const firsatNo = await kod(client, 'CRM_FIRSAT', 'FRS-1');
    return (await client.query(
      `INSERT INTO crm_firsatlar (
         firsat_kodu, firsat_adi, musteri_tipi, cari_id, asama_id, durum,
         firma_id, is_yeri_id, beklenen_gelir, para_birimi, aciklama
       ) VALUES ($1,$2,'Musteri',$3,$4,'Acik',$5,$6,$7,'TRY',$8) RETURNING *`,
      [firsatNo, `${tag} Kot Pantolon Sezon Siparişi`, musteri.id, asamaId,
        firma.id, isYeri.id, 890 * qty,
        `${tag} müşteriye sunulan sezon fırsatı`]
    )).rows[0];
  });
  void aday;

  // Satış teklifi
  const teklifNo = await kod(client, 'SATIS_TEKLIF', 'ST-1');
  const teklif = (await client.query(
    `INSERT INTO satis_teklifleri (
       teklif_no, cari_id, teklif_tarihi, gecerlilik_tarihi, teslim_tarihi,
       para_birimi, kur, durum, firsat_id, musteri_teklif_no, proje_kodu,
       is_yeri_id, firma_id, fiyat_liste_id, iskonto_oran,
       odeme_kosulu, odeme_sekli, teslimat_kosulu, hareket_kodu_id,
       ara_toplam, toplam_kdv, genel_toplam,
       aciklama, not_public, not_internal
     ) VALUES (
       $1,$2,CURRENT_DATE,$3,$4,
       'TRY',1,'Onayli',$5,'MPZ-TEK-2026','PRJ-DENIM',
       $6,$7,$8,5,
       '30 Gün','Havale','DAP',$9,
       $10,$11,$12,
       $13,$14,$15
     ) RETURNING *`,
    [
      teklifNo, musteri.id, plusDays(30), plusDays(21),
      firsat?.id || null, isYeri.id, firma.id, fiyatListe?.id || null,
      await hk(client, 'STK'),
      890 * qty * 0.95, 890 * qty * 0.95 * 0.2, 890 * qty * 0.95 * 1.2,
      `${tag} satış teklifi açıklama`,
      `${tag} müşteri notu: etiket rengi siyah olsun`,
      `${tag} dahili not: %5 iskonto onaylı`,
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO satis_teklif_satirlari (
       teklif_id, stok_id, satir_aciklama, miktar, birim, birim_fiyat,
       iskonto_oran, kdv_oran
     ) VALUES ($1,$2,$3,$4,'AD',$5,5,20)`,
    [teklif.id, mamul.id, 'Slim 32 indigo — örnek1 teklif kalemi', qty, 890]
  );

  // Satış siparişi (tekliften)
  const sipNo = await kod(client, 'SATIS_SIPARIS', 'SP-1');
  const sip = (await client.query(
    `INSERT INTO siparisler (
       siparis_no, cari_id, cari_kodu, cari_adi, siparis_turu, durum,
       teklif_id, hareket_kodu_id, para_birimi, kur, siparis_tarihi, teslim_tarihi,
       gecerlilik_tarihi, musteri_siparis_no, proje_kodu, firma_id, is_yeri_id, depo_id,
       fiyat_liste_id, odeme_kosulu, odeme_sekli, teslimat_kosulu, siparis_kaynak,
       sevk_adresi, sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu,
       iskonto_oran, ara_toplam, toplam_kdv, genel_toplam,
       aciklama, not_public, not_internal, olusturan_kullanici
     ) VALUES (
       $1,$2,$3,$4,'SatisSiparis','Onayli',
       $5,$6,'TRY',1,CURRENT_DATE,$7,
       $8,'MPO-1001','PRJ-DENIM',$9,$10,$11,
       $12,'30 Gün','Havale','DAP','Teklif',
       $13,$14,$15,'TR','34394',
       5,$16,$17,$18,
       $19,$20,$21,'sa.user'
     ) RETURNING *`,
    [
      sipNo, musteri.id, musteri.cari_kodu, musteri.cari_adi,
      teklif.id, await hk(client, 'SSP'), plusDays(21), plusDays(45),
      firma.id, isYeri.id, depolar.SVK.id, fiyatListe?.id || null,
      musteri.fatura_adres1 || 'İstanbul Sevk', 'İstanbul', 'Şişli',
      890 * qty * 0.95, 890 * qty * 0.95 * 0.2, 890 * qty * 0.95 * 1.2,
      `${tag} satış siparişi — MRP kullanılmadan manuel planlandı`,
      `${tag} müşteri notu: mağaza etiketli sevkiyat`,
      `${tag} dahili: kapasite haftalık 50 adet`,
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO siparis_detaylari (
       siparis_id, stok_id, miktar, birim_fiyat, toplam_tutar, stok_birimi, stok_kodu, stok_adi,
       satir_aciklama, iskonto_oran, kdv_oran, teslim_tarihi, depo_id
     ) VALUES ($1,$2,$3,$4,$5,'AD',$6,$7,$8,5,20,$9,$10)`,
    [
      sip.id, mamul.id, qty, 890, 890 * qty,
      mamul.stok_kodu, mamul.stok_adi,
      `${tag} sipariş kalemi`,
      plusDays(21), depolar.SVK.id,
    ]
  );

  // Manuel ihtiyaç: BOM’a göre SA talep (MRP yok)
  const ihtiyacCarpan = qty;
  const talepNo = await kod(client, 'SATINALMA_TALEP', 'TAL-1');
  const talep = (await client.query(
    `INSERT INTO satin_alma_talepleri (
       talep_no, durum, is_yeri_id, firma_id, aciklama, not_internal, proje_kodu, para_birimi
     ) VALUES ($1,'Onayli',$2,$3,$4,$5,'PRJ-DENIM','TRY') RETURNING *`,
    [
      talepNo, isYeri.id, firma.id,
      `${tag} manuel hammadde talebi (BOM×${ihtiyacCarpan}, MRP yok)`,
      `${tag} dahili: depo min stok dikkate alındı`,
    ]
  )).rows[0];
  for (const h of hammaddeler) {
    const miktar = Number((h.bomMiktar * ihtiyacCarpan * 1.05).toFixed(3)); // %5 fire
    await client.query(
      `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim)
       VALUES ($1,$2,$3,$4)`,
      [talep.id, h.id, miktar, h.birim]
    );
  }

  const istekNo = await kod(client, 'SATINALMA_TEKLIF_ISTEK', 'TI-1');
  const istek = (await client.query(
    `INSERT INTO satin_alma_teklif_istekleri (
       istek_no, is_yeri_id, firma_id, durum, aciklama
     ) VALUES ($1,$2,$3,'TeklifeDonustu',$4) RETURNING *`,
    [istekNo, isYeri.id, firma.id, `${tag} teklif isteği — tüm hammaddeler`]
  )).rows[0];
  for (const h of hammaddeler) {
    const miktar = Number((h.bomMiktar * ihtiyacCarpan * 1.05).toFixed(3));
    await client.query(
      `INSERT INTO satin_alma_teklif_istek_satirlari (istek_id, stok_id, miktar, birim)
       VALUES ($1,$2,$3,$4)`,
      [istek.id, h.id, miktar, h.birim]
    );
  }

  const saTeklifNo = await kod(client, 'SATINALMA_TEKLIF', 'SATK-1');
  const saTeklif = (await client.query(
    `INSERT INTO satin_alma_teklifleri (
       teklif_no, cari_id, istek_id, is_yeri_id, firma_id, durum, gecerlilik_tarihi,
       para_birimi, kur, aciklama
     ) VALUES ($1,$2,$3,$4,$5,'Onayli',$6,'TRY',1,$7)
     RETURNING *`,
    [
      saTeklifNo, tedarikci.id, istek.id, isYeri.id, firma.id, plusDays(20),
      `${tag} tedarikçi teklifi onaylı — teslim OSB depo; dahili: fiyat pazarlığı tamam`,
    ]
  )).rows[0];
  for (const h of hammaddeler) {
    const miktar = Number((h.bomMiktar * ihtiyacCarpan * 1.05).toFixed(3));
    await client.query(
      `INSERT INTO satin_alma_teklif_satirlari (teklif_id, stok_id, miktar, birim_fiyat, birim)
       VALUES ($1,$2,$3,$4,$5)`,
      [saTeklif.id, h.id, miktar, h.maliyet, h.birim]
    );
  }

  // Anlaşma
  await optional(client, async () => {
    const anNo = await kod(client, 'SATINALMA_ANLASMA', 'ANL-1');
    await client.query(
      `INSERT INTO satin_alma_anlasmalari (
         anlasma_no, cari_id, firma_id, is_yeri_id, durum, baslangic_tarihi, bitis_tarihi,
         para_birimi, aciklama, teklif_id
       ) VALUES ($1,$2,$3,$4,'Aktif',CURRENT_DATE,$5,'TRY',$6,$7)`,
      [anNo, tedarikci.id, firma.id, isYeri.id, plusDays(365),
        `${tag} yıllık kumaş anlaşması — dahili not dahil`, saTeklif.id]
    );
  
  });

  const saNo = await kod(client, 'SATINALMA_SIPARIS', 'SA-1');
  const sa = (await client.query(
    `INSERT INTO satin_alma_siparisleri (
       siparis_no, cari_id, is_yeri_id, talep_id, teklif_id, durum, siparis_tarihi, teslim_tarihi,
       firma_id, depo_id, para_birimi, kur, kur_tipi, odeme_kosulu, odeme_sekli, teslimat_kosulu,
       proje_kodu, bolge, tedarikci_siparis_no, hareket_kodu_id,
       sevk_adresi, aciklama, not_public, not_internal,
       kaynak_belge_tipi, kaynak_belge_id
     ) VALUES (
       $1,$2,$3,$4,$5,'Onayli',CURRENT_DATE,$6,
       $7,$8,'TRY',1,'TCMB-SATIS','30 Gün','Havale','EXW',
       'PRJ-DENIM','GAP','TD-PO-778',$9,
       $10,$11,$12,$13,
       'SATINALMA_TEKLIF',$5
     ) RETURNING *`,
    [
      saNo, tedarikci.id, isYeri.id, talep.id, saTeklif.id, plusDays(10),
      firma.id, depolar.HMD.id, await hk(client, 'SAS'),
      'Gaziantep OSB hammadde kabul',
      `${tag} satınalma siparişi`,
      `${tag} tedarikçi notu`,
      `${tag} dahili SA notu`,
    ]
  )).rows[0];
  const saSatirIds = [];
  for (const h of hammaddeler) {
    const miktar = Number((h.bomMiktar * ihtiyacCarpan * 1.05).toFixed(3));
    const sat = (await client.query(
      `INSERT INTO satin_alma_siparis_satirlari (siparis_id, stok_id, miktar, birim_fiyat, birim)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [sa.id, h.id, miktar, h.maliyet, h.birim]
    )).rows[0];
    saSatirIds.push({ id: sat.id, h, miktar });
  }

  // Tedarikçi irsaliyesi + mal kabul
  let tedIrs = null;
  await optional(client, async () => {
    const tiNo = await kod(client, 'TEDARIKCI_IRSALIYE', 'TI-IRS-1');
    tedIrs = (await client.query(
      `INSERT INTO tedarikci_irsaliyeleri (
         irsaliye_no, cari_id, siparis_id, firma_id, is_yeri_id, durum,
         irsaliye_tarihi, aciklama
       ) VALUES ($1,$2,$3,$4,$5,'Onayli',CURRENT_DATE,$6) RETURNING *`,
      [tiNo, tedarikci.id, sa.id, firma.id, isYeri.id,
        `${tag} tedarikçi irsaliyesi — sevk OSB kabul`]
    )).rows[0];
  
  });

  const mkNo = await kod(client, 'MAL_KABUL', 'MK-1');
  const mk = (await client.query(
    `INSERT INTO mal_kabuller (
       kabul_no, siparis_id, depo_id, durum, firma_id, is_yeri_id, kabul_tarihi,
       aciklama, not_internal, hareket_kodu_id
     ) VALUES ($1,$2,$3,'Onayli',$4,$5,CURRENT_DATE,$6,$7,$8) RETURNING *`,
    [
      mkNo, sa.id, depolar.HMD.id, firma.id, isYeri.id,
      `${tag} mal kabul`, `${tag} dahili kabul notu`, await hk(client, 'MKB'),
    ]
  )).rows[0];
  for (const row of saSatirIds) {
    await client.query(
      `INSERT INTO mal_kabul_satirlari (kabul_id, siparis_satir_id, stok_id, miktar, birim, kabul_edilen)
       VALUES ($1,$2,$3,$4,$5,$4)`,
      [mk.id, row.id, row.h.id, row.miktar, row.h.birim]
    );
    await stokGiris(client, {
      stokId: row.h.id, depoId: depolar.HMD.id, miktar: row.miktar, birim: row.h.birim,
      firmaId: firma.id, isYeriId: isYeri.id, tag,
      aciklama: `${tag} mal kabul stok giriş — ${row.h.stok_kodu}`,
    });
  }

  // Alış faturası
  await optional(client, async () => {
    const afNo = await kod(client, 'ALIS_FATURA', 'AF-1');
    await client.query(
      `INSERT INTO faturalar (
         fatura_no, cari_id, fatura_turu, durum, firma_id, is_yeri_id, fatura_tarihi,
         para_birimi, kur, odeme_kosulu, odeme_sekli, mal_kabul_id,
         aciklama, not_public, not_internal, odenecek_tutar
       ) VALUES ($1,$2,'Alis','Onayli',$3,$4,CURRENT_DATE,'TRY',1,'30 Gün','Havale',$5,$6,$7,$8,$9)`,
      [
        afNo, tedarikci.id, firma.id, isYeri.id, mk.id,
        `${tag} alış faturası`, `${tag} fatura tedarikçi notu`, `${tag} dahili fatura notu`,
        hammaddeler.reduce((a, h) => a + h.maliyet * h.bomMiktar * ihtiyacCarpan * 1.05, 0),
      ]
    );
  
  });

  // Üretim emri (manuel)
  const ueNo = await kod(client, 'URETIM_EMRI', 'UE-1');
  const ue = (await client.query(
    `INSERT INTO uretim_emirleri (
       emir_no, stok_id, planlanan_miktar, durum, is_yeri_id, firma_id,
       mamul_depo_id, hammadde_depo_id, urun_agaci_id, rota_id, siparis_id,
       baslangic_tarihi, kaynak_belge_tipi, kaynak_belge_id
     ) VALUES ($1,$2,$3,'Acik',$4,$5,$6,$7,$8,$9,$10,CURRENT_DATE,'SATIS_SIPARIS',$10)
     RETURNING *`,
    [ueNo, mamul.id, qty, isYeri.id, firma.id, depolar.MAM.id, depolar.HMD.id, agac.id, rota.id, sip.id]
  )).rows[0];

  await stokGiris(client, {
    stokId: mamul.id, depoId: depolar.MAM.id, miktar: qty, birim: 'AD',
    firmaId: firma.id, isYeriId: isYeri.id, tag,
    aciklama: `${tag} üretim çıktısı mamul giriş`,
  });

  // Transfer mamul → sevk
  await optional(client, async () => {
    const trNo = await kod(client, 'TRANSFER', 'TR-1');
    await client.query(
      `INSERT INTO transfer_emirleri (
         emir_no, kaynak_depo_id, hedef_depo_id, durum, firma_id, is_yeri_id, aciklama
       ) VALUES ($1,$2,$3,'Onayli',$4,$5,$6)`,
      [trNo, depolar.MAM.id, depolar.SVK.id, firma.id, isYeri.id, `${tag} mamul→sevk transfer`]
    );
  });

  // Sayım
  await optional(client, async () => {
    const syNo = await kod(client, 'SAYIM', 'SY-1');
    await client.query(
      `INSERT INTO sayim_belgeleri (
         belge_no, depo_id, durum, firma_id, is_yeri_id, aciklama
       ) VALUES ($1,$2,'Kapali',$3,$4,$5)`,
      [syNo, depolar.HMD.id, firma.id, isYeri.id, `${tag} hammadde sayım belgesi`]
    );
  });

  // Sevk → irsaliye → fatura
  const sevkNo = await kod(client, 'SEVK_EMRI', 'SV-1');
  const sevk = (await client.query(
    `INSERT INTO sevk_emirleri (
       sevk_no, siparis_id, depo_id, durum, firma_id, sevk_tarihi, cari_id,
       sevk_adresi, sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu,
       tasiyici_unvan, arac_plaka, sofor_adi, not_internal, aciklama, hareket_kodu_id, oncelik
     ) VALUES (
       $1,$2,$3,'Onayli',$4,CURRENT_DATE,$5,
       $6,'İstanbul','Şişli','TR','34394',
       'Hızlı Lojistik A.Ş.','34 TEK 01','Mehmet Soför',$7,$8,$9,'Normal'
     ) RETURNING *`,
    [
      sevkNo, sip.id, depolar.SVK.id, firma.id, musteri.id,
      musteri.fatura_adres1 || 'İstanbul sevk',
      `${tag} sevk dahili not`, `${tag} sevk emri`,
      await hk(client, 'SEV'),
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO sevk_emri_satirlari (sevk_id, stok_id, miktar, birim)
     VALUES ($1,$2,$3,'AD')`,
    [sevk.id, mamul.id, qty]
  );

  const irsNo = await kod(client, 'IRSALIYE', 'IR-1');
  const irs = (await client.query(
    `INSERT INTO irsaliyeler (
       irsaliye_no, cari_id, depo_id, durum, firma_id, is_yeri_id,
       irsaliye_tarihi, sevk_tarihi, siparis_id, sevk_emri_id,
       senaryo, irsaliye_tipi, para_birimi, kur,
       sevk_adresi, sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu,
       arac_plaka, sofor_adi, sofor_soyadi, tasiyici_unvan, tasiyici_vkn,
       proje_kodu, hareket_kodu_id,
       ara_toplam, toplam_kdv, genel_toplam,
       aciklama, not_public, olusturan_kullanici
     ) VALUES (
       $1,$2,$3,'Onayli',$4,$5,
       CURRENT_DATE,CURRENT_DATE,$6,$7,
       'TEMELIRSALIYE','SEVK','TRY',1,
       $8,'İstanbul','Şişli','TR','34394',
       '34 TEK 01','Mehmet','Soför','Hızlı Lojistik A.Ş.','1234567890',
       'PRJ-DENIM',$9,
       $10,$11,$12,
       $13,$14,'sa.user'
     ) RETURNING *`,
    [
      irsNo, musteri.id, depolar.SVK.id, firma.id, isYeri.id, sip.id, sevk.id,
      musteri.fatura_adres1 || 'İstanbul',
      await hk(client, 'SIR'),
      890 * qty, 890 * qty * 0.2, 890 * qty * 1.2,
      `${tag} irsaliye açıklama`, `${tag} irsaliye müşteri notu`,
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO irsaliye_satirlari (irsaliye_id, stok_id, miktar, birim, birim_fiyat, kdv_oran)
     VALUES ($1,$2,$3,'AD',$4,20)`,
    [irs.id, mamul.id, qty, 890]
  );

  const fatNo = await kod(client, 'FATURA', 'SF-1');
  const fatura = (await client.query(
    `INSERT INTO faturalar (
       fatura_no, cari_id, fatura_turu, durum, firma_id, is_yeri_id, fatura_tarihi,
       para_birimi, kur, siparis_id, irsaliye_id, fiyat_liste_id,
       odeme_kosulu, odeme_sekli, teslimat_kosulu, vade_tarihi,
       mal_hizmet_toplam, toplam_kdv, odenecek_tutar,
       aciklama, not_public, not_internal, hareket_kodu_id, proje_kodu
     ) VALUES (
       $1,$2,'Satis','Onayli',$3,$4,CURRENT_DATE,
       'TRY',1,$5,$6,$7,
       '30 Gün','Havale','DAP',$8,
       $9,$10,$11,
       $12,$13,$14,$15,'PRJ-DENIM'
     ) RETURNING *`,
    [
      fatNo, musteri.id, firma.id, isYeri.id, sip.id, irs.id, fiyatListe?.id || null,
      plusDays(30), 890 * qty, 890 * qty * 0.2, 890 * qty * 1.2,
      `${tag} satış faturası`, `${tag} fatura müşteri notu`, `${tag} fatura dahili not`,
      await hk(client, 'SFA'),
    ]
  )).rows[0];
  await optional(client, async () => {
    await client.query(
      `INSERT INTO fatura_detaylari (fatura_id, stok_id, miktar, birim, birim_fiyat, kdv_oran)
       VALUES ($1,$2,$3,'AD',$4,20)`,
      [fatura.id, mamul.id, qty, 890]
    );
  
  });

  // KK + uygunsuzluk
  await optional(client, async () => {
    const kkNo = await kod(client, 'KK_EMIR', 'KK-1');
    await client.query(
      `INSERT INTO kk_emirleri (emir_no, stok_id, miktar, durum, yon, depo_id, firma_id, aciklama)
       VALUES ($1,$2,$3,'Acik','CKK',$4,$5,$6)`,
      [kkNo, mamul.id, 10, depolar.KK.id, firma.id, `${tag} çıkış kalite kontrol`]
    );
  
  });

  // Tahsilat
  await optional(client, async () => {
    await client.query(
      `INSERT INTO tahsilat_odemeler (
         belge_no, cari_id, tutar, para_birimi, tip, durum, is_yeri_id, aciklama, odeme_sekli
       ) VALUES ($1,$2,$3,'TRY','Tahsilat','Onayli',$4,$5,'Havale')`,
      [await kod(client, 'TAHSILAT', 'TH-1'), musteri.id, 890 * qty * 0.5, isYeri.id,
        `${tag} kısmi tahsilat`]
    );
  });

  // Parti
  await optional(client, async () => {
    const partiNo = await kod(client, 'PARTI', 'P-1');
    await client.query(
      `INSERT INTO stok_partileri (parti_no, stok_id, firma_id, son_kullanma_tarihi, aktif, aciklama)
       VALUES ($1,$2,$3,CURRENT_DATE + INTERVAL '2 years', TRUE, $4)`,
      [partiNo, mamul.id, firma.id, `${tag} mamul parti`]
    );
  
  });

  return {
    tag,
    teklif: teklif.teklif_no,
    siparis: sip.siparis_no,
    sa: sa.siparis_no,
    ue: ue.emir_no,
    sevk: sevk.sevk_no,
    irsaliye: irs.irsaliye_no,
    fatura: fatura.fatura_no,
    qty,
  };
}

/** Örnek2: MRP ile planlama */
async function seedOrnek2(client, org, master) {
  const { firma, isYeri, depolar } = org;
  const { tedarikciler, musteriler, hammaddeler, mamul, agac, rota, fiyatListe } = master;
  const tag = TAG2;
  const musteri = musteriler[1];
  const tedarikci = tedarikciler[1] || tedarikciler[0];
  const qty = 250;

  // Bağımsız ihtiyaç (MRP girdisi)
  const biNo = await kod(client, 'MRP_BI', 'BI-2');
  const bi = (await client.query(
    `INSERT INTO mrp_bagimsiz_ihtiyaclar
       (ihtiyac_no, stok_id, miktar, birim, ihtiyac_tarihi, kaynak, firma_id, is_yeri_id, aciklama, aktif)
     VALUES ($1,$2,$3,'AD',$4,'Manuel',$5,$6,$7,TRUE) RETURNING *`,
    [
      biNo, mamul.id, qty, plusDays(28),
      firma.id, isYeri.id,
      `${tag} bağımsız ihtiyaç — ${qty} adet kot pantolon (MRP planlanacak)`,
    ]
  )).rows[0];

  // Satış siparişi de bağımlı talep olarak (opsiyonel) — MRP siparişleri de okuyabilir
  const sipNo = await kod(client, 'SATIS_SIPARIS', 'SP-2');
  const sip = (await client.query(
    `INSERT INTO siparisler (
       siparis_no, cari_id, cari_kodu, cari_adi, siparis_turu, durum,
       para_birimi, kur, siparis_tarihi, teslim_tarihi, firma_id, is_yeri_id, depo_id,
       odeme_kosulu, odeme_sekli, teslimat_kosulu, siparis_kaynak, proje_kodu,
       sevk_adresi, sevk_il, sevk_ulke, sevk_posta_kodu,
       genel_toplam, aciklama, not_public, not_internal, hareket_kodu_id
     ) VALUES (
       $1,$2,$3,$4,'SatisSiparis','Onayli',
       'TRY',1,CURRENT_DATE,$5,$6,$7,$8,
       '45 Gün','Cek','DAP','Manuel','PRJ-MRP',
       $9,'Ankara','TR','06420',
       $10,$11,$12,$13,$14
     ) RETURNING *`,
    [
      sipNo, musteri.id, musteri.cari_kodu, musteri.cari_adi, plusDays(28),
      firma.id, isYeri.id, depolar.SVK.id,
      musteri.fatura_adres1 || 'Ankara sevk',
      890 * qty,
      `${tag} satış siparişi — MRP ile planlanacak`,
      `${tag} müşteri notu MRP senaryosu`,
      `${tag} dahili MRP senaryosu`,
      await hk(client, 'SSP'),
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO siparis_detaylari (
       siparis_id, stok_id, miktar, birim_fiyat, toplam_tutar, stok_birimi, stok_kodu, stok_adi,
       satir_aciklama, kdv_oran, teslim_tarihi
     ) VALUES ($1,$2,$3,890,$4,'AD',$5,$6,$7,20,$8)`,
    [sip.id, mamul.id, qty, 890 * qty, mamul.stok_kodu, mamul.stok_adi, `${tag} kalem`, plusDays(28)]
  );

  // Commit öncesi BI kaydı var; MRP'yi transaction dışında çalıştıracağız — burada işaret döndür
  return {
    tag,
    biId: bi.id,
    biNo: bi.ihtiyac_no,
    siparis: sip.siparis_no,
    siparisId: sip.id,
    qty,
    musteri,
    tedarikci,
    mamul,
    hammaddeler,
    agac,
    rota,
    fiyatListe,
  };
}

async function finishOrnek2AfterMrp(pool, org, master, o2, mrpSonuc) {
  const client = await pool.connect();
  const tag = TAG2;
  const { firma, isYeri, depolar } = org;
  try {
    await client.query('BEGIN');
    const { tedarikci, hammaddeler, mamul, agac, rota } = { ...master, ...o2 };

    // MRP önerilerinden SA talep (manuel kayıt — API yerine doğrudan, alanlar dolu)
    const saOneri = (mrpSonuc.sonuclar || []).filter((r) => r.oneri === 'Satınalma' && r.net_ihtiyac > 0);
    const ueOneri = (mrpSonuc.sonuclar || []).filter((r) => r.oneri === 'Üretim emri' && r.net_ihtiyac > 0);

    const talepNo = await kod(client, 'SATINALMA_TALEP', 'TAL-2');
    const talep = (await client.query(
      `INSERT INTO satin_alma_talepleri (
         talep_no, durum, is_yeri_id, firma_id, aciklama, not_internal, proje_kodu, para_birimi
       ) VALUES ($1,'Onayli',$2,$3,$4,$5,'PRJ-MRP','TRY') RETURNING *`,
      [
        talepNo, isYeri.id, firma.id,
        `${tag} MRP satınalma önerisinden talep (çalışma ${mrpSonuc.calisma?.calisma_no || ''})`,
        `${tag} dahili: MRP net ihtiyaç aktarıldı`,
      ]
    )).rows[0];

    const byStok = new Map(hammaddeler.map((h) => [h.id, h]));
    if (saOneri.length) {
      for (const r of saOneri.slice(0, 20)) {
        const h = byStok.get(r.stok_id) || hammaddeler.find((x) => x.stok_kodu === r.stok_kodu);
        if (!h) continue;
        await client.query(
          `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim, satir_aciklama)
           VALUES ($1,$2,$3,$4,$5)`,
          [talep.id, h.id, r.net_ihtiyac, h.birim, `${tag} MRP net ${r.net_ihtiyac}`]
        );
      }
    } else {
      // MRP net üretmediyse yine BOM×qty ile doldur (demo sürekliliği)
      for (const h of hammaddeler) {
        const miktar = Number((h.bomMiktar * o2.qty * 1.05).toFixed(3));
        await client.query(
          `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim, satir_aciklama)
           VALUES ($1,$2,$3,$4,$5)`,
          [talep.id, h.id, miktar, h.birim, `${tag} yedek BOM ihtiyacı`]
        );
      }
    }

    // SA sipariş + mal kabul + stok
    const saNo = await kod(client, 'SATINALMA_SIPARIS', 'SA-2');
    const sa = (await client.query(
      `INSERT INTO satin_alma_siparisleri (
         siparis_no, cari_id, is_yeri_id, talep_id, durum, siparis_tarihi, teslim_tarihi,
         firma_id, depo_id, para_birimi, kur, odeme_kosulu, odeme_sekli, teslimat_kosulu,
         proje_kodu, aciklama, not_public, not_internal, hareket_kodu_id
       ) VALUES (
         $1,$2,$3,$4,'Onayli',CURRENT_DATE,$5,
         $6,$7,'TRY',1,'30 Gün','Havale','EXW',
         'PRJ-MRP',$8,$9,$10,$11
       ) RETURNING *`,
      [
        saNo, tedarikci.id, isYeri.id, talep.id, plusDays(12),
        firma.id, depolar.HMD.id,
        `${tag} MRP sonrası satınalma siparişi`,
        `${tag} tedarikçi notu`, `${tag} dahili`,
        await hk(client, 'SAS'),
      ]
    )).rows[0];

    const talepSatir = (await client.query(
      `SELECT * FROM satin_alma_talep_satirlari WHERE talep_id=$1`, [talep.id]
    )).rows;
    for (const ts of talepSatir) {
      const h = byStok.get(ts.stok_id) || hammaddeler[0];
      const sat = (await client.query(
        `INSERT INTO satin_alma_siparis_satirlari (siparis_id, stok_id, miktar, birim_fiyat, birim)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [sa.id, ts.stok_id, ts.miktar, h?.maliyet || 10, ts.birim]
      )).rows[0];
      await stokGiris(client, {
        stokId: ts.stok_id, depoId: depolar.HMD.id, miktar: ts.miktar, birim: ts.birim,
        firmaId: firma.id, isYeriId: isYeri.id, tag,
        aciklama: `${tag} MRP SA stok giriş`,
      });
      void sat;
    }

    // Üretim emirleri (MRP önerisi veya mamul için)
    const ueTargets = ueOneri.length
      ? ueOneri.filter((r) => r.stok_id === mamul.id || r.stok_kodu === mamul.stok_kodu)
      : [{ stok_id: mamul.id, net_ihtiyac: o2.qty }];
    const ueNos = [];
    for (const u of ueTargets.slice(0, 3)) {
      const ueNo = await kod(client, 'URETIM_EMRI', 'UE-2');
      const ue = (await client.query(
        `INSERT INTO uretim_emirleri (
           emir_no, stok_id, planlanan_miktar, durum, is_yeri_id, firma_id,
           mamul_depo_id, hammadde_depo_id, urun_agaci_id, rota_id, siparis_id,
           baslangic_tarihi, kaynak_belge_tipi, kaynak_belge_id
         ) VALUES ($1,$2,$3,'Acik',$4,$5,$6,$7,$8,$9,$10,CURRENT_DATE,'MRP',$11)
         RETURNING *`,
        [
          ueNo, u.stok_id || mamul.id, u.net_ihtiyac || o2.qty,
          isYeri.id, firma.id, depolar.MAM.id, depolar.HMD.id, agac.id, rota.id,
          o2.siparisId, mrpSonuc.calisma?.id || null,
        ]
      )).rows[0];
      ueNos.push(ue.emir_no);
      await stokGiris(client, {
        stokId: mamul.id, depoId: depolar.MAM.id, miktar: u.net_ihtiyac || o2.qty, birim: 'AD',
        firmaId: firma.id, isYeriId: isYeri.id, tag,
        aciklama: `${tag} MRP üretim çıktısı`,
      });
    }

    // Sevk / irsaliye / fatura (MRP senaryosu satış siparişi için)
    const sevkNo = await kod(client, 'SEVK_EMRI', 'SV-2');
    const sevk = (await client.query(
      `INSERT INTO sevk_emirleri (
         sevk_no, siparis_id, depo_id, durum, firma_id, sevk_tarihi, cari_id,
         sevk_adresi, sevk_il, sevk_ulke, not_internal, aciklama, hareket_kodu_id, oncelik
       ) VALUES ($1,$2,$3,'Onayli',$4,CURRENT_DATE,$5,$6,'Ankara','TR',$7,$8,$9,'Yuksek')
       RETURNING *`,
      [
        sevkNo, o2.siparisId, depolar.SVK.id, firma.id, o2.musteri.id,
        o2.musteri.fatura_adres1 || 'Ankara',
        `${tag} sevk dahili`, `${tag} MRP sonrası sevk`,
        await hk(client, 'SEV'),
      ]
    )).rows[0];
    await client.query(
      `INSERT INTO sevk_emri_satirlari (sevk_id, stok_id, miktar, birim) VALUES ($1,$2,$3,'AD')`,
      [sevk.id, mamul.id, o2.qty]
    );

    const irsNo = await kod(client, 'IRSALIYE', 'IR-2');
    const irs = (await client.query(
      `INSERT INTO irsaliyeler (
         irsaliye_no, cari_id, depo_id, durum, firma_id, is_yeri_id,
         irsaliye_tarihi, siparis_id, sevk_emri_id, senaryo, irsaliye_tipi, para_birimi,
         sevk_il, sevk_ulke, aciklama, not_public, hareket_kodu_id, genel_toplam
       ) VALUES ($1,$2,$3,'Onayli',$4,$5,CURRENT_DATE,$6,$7,'TEMELIRSALIYE','SEVK','TRY',
         'Ankara','TR',$8,$9,$10,$11) RETURNING *`,
      [
        irsNo, o2.musteri.id, depolar.SVK.id, firma.id, isYeri.id, o2.siparisId, sevk.id,
        `${tag} irsaliye`, `${tag} irsaliye not`, await hk(client, 'SIR'), 890 * o2.qty,
      ]
    )).rows[0];
    await client.query(
      `INSERT INTO irsaliye_satirlari (irsaliye_id, stok_id, miktar, birim, birim_fiyat)
       VALUES ($1,$2,$3,'AD',890)`,
      [irs.id, mamul.id, o2.qty]
    );

    const fatNo = await kod(client, 'FATURA', 'SF-2');
    await client.query(
      `INSERT INTO faturalar (
         fatura_no, cari_id, fatura_turu, durum, firma_id, is_yeri_id, fatura_tarihi,
         para_birimi, siparis_id, irsaliye_id, odeme_kosulu, odeme_sekli,
         odenecek_tutar, aciklama, not_public, not_internal, proje_kodu, hareket_kodu_id
       ) VALUES ($1,$2,'Satis','Onayli',$3,$4,CURRENT_DATE,'TRY',$5,$6,'45 Gün','Cek',
         $7,$8,$9,$10,'PRJ-MRP',$11)`,
      [
        fatNo, o2.musteri.id, firma.id, isYeri.id, o2.siparisId, irs.id,
        890 * o2.qty, `${tag} satış faturası`, `${tag} fatura müşteri notu`,
        `${tag} fatura dahili`, await hk(client, 'SFA'),
      ]
    );

    await client.query('COMMIT');
    return {
      tag,
      bi: o2.biNo,
      mrp: mrpSonuc.calisma?.calisma_no,
      netPozitif: mrpSonuc.calisma?.net_pozitif,
      talep: talep.talep_no,
      sa: sa.siparis_no,
      ue: ueNos,
      sevk: sevk.sevk_no,
      irsaliye: irs.irsaliye_no,
      fatura: fatNo,
      siparis: o2.siparis,
      qty: o2.qty,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const summary = { firma: 'TEKS', ornek1: null, ornek2: null, mrp: null };
  let org; let master; let o2prep;

  await withTransaction(pool, async (client) => {
    org = await loadOrg(client);
    console.log('Firma:', org.firma.firma_kodu, org.firma.firma_adi);
    master = await seedMaster(client, org);
    console.log('Master OK — mamul', master.mamul.stok_kodu, 'HM', master.hammaddeler.length);
    summary.ornek1 = await seedOrnek1(client, org, master);
    console.log('Örnek1 OK', summary.ornek1.siparis, summary.ornek1.ue);
    o2prep = await seedOrnek2(client, org, master);
    console.log('Örnek2 hazırlık OK', o2prep.biNo, o2prep.siparis);
  });

  // MRP transaction dışında (kendi transaction'ı var)
  const mrpSonuc = await withTransaction(pool, async (c) => mrpCalistir(c, {
    firmaId: org.firma.id,
    isYeriId: org.isYeri.id,
    aciklama: `${TAG2} Denim Tekstil MRP çalışması — ${o2prep.qty} adet bağımsız ihtiyaç`,
    olusturan: 'demo-teks-ornek12',
  }));
  summary.mrp = {
    calisma: mrpSonuc.calisma?.calisma_no,
    satir: mrpSonuc.calisma?.satir_sayisi,
    net: mrpSonuc.calisma?.net_pozitif,
    oneriler: (mrpSonuc.sonuclar || [])
      .filter((r) => r.net_ihtiyac > 0)
      .slice(0, 12)
      .map((r) => ({ stok: r.stok_kodu, net: r.net_ihtiyac, oneri: r.oneri })),
  };
  console.log('MRP OK', summary.mrp);

  summary.ornek2 = await finishOrnek2AfterMrp(pool, org, master, o2prep, mrpSonuc);
  console.log('Örnek2 tamam', summary.ornek2);

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const outJson = path.join(outDir, 'teks-ornek12-ozet.json');
  fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ok: true, ozet: outJson, ...summary }, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
