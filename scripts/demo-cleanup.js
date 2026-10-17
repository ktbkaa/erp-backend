/**
 * Demo/test işlem verilerini temizler; şema ve sistem tanımlarını korur.
 * Yedek: backups/demo-cleanup/ (pg_dump öncesi alınmış olmalı)
 *
 * Kullanım: node scripts/demo-cleanup.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ''),
});

/** İşlem / ana veri tabloları — FK sırasına uygun truncate (CASCADE) */
const PURGE_TABLES = [
  // kalite / izlenebilirlik
  'kk_capa', 'kk_uygunsuzluklar', 'kk_emirleri', 'kk_stok_planlari',
  // stok hareket / parti / seri / rezerv
  'stok_maliyet_hareket', 'stok_rezervasyonlari', 'stok_serileri', 'stok_partileri',
  'stok_hareket_satirlari', 'stok_hareketleri',
  'stok_barkodlari', 'stok_birim_tanimlari', 'stok_dil_tanimlari', 'stok_detaylari',
  'stok_ikame', 'stok_depo', 'stok_is_yeri',
  // satış zinciri
  'fatura_detaylari', 'faturalar', 'fatura_kontrolleri',
  'irsaliye_satirlari', 'irsaliyeler',
  'sevk_emri_satirlari', 'sevk_emirleri',
  'siparis_detaylari', 'siparisler',
  'satis_teklif_satirlari', 'satis_teklifleri',
  // crm
  'crm_firsat_satirlari', 'crm_gorevler', 'crm_faaliyetler', 'crm_faaliyet_planlari',
  'crm_ajanda', 'crm_firsatlar', 'crm_kontaklar', 'crm_adaylar',
  // satınalma
  'mal_kabul_satirlari', 'mal_kabuller',
  'satin_alma_siparis_satirlari', 'satin_alma_siparisleri',
  'satin_alma_anlasma_satirlari', 'satin_alma_anlasmalari',
  'satin_alma_teklif_satirlari', 'satin_alma_teklifleri',
  'satin_alma_teklif_istek_satirlari', 'satin_alma_teklif_istekleri',
  'satin_alma_talep_satirlari', 'satin_alma_talepleri',
  'tedarikci_degerlendirme',
  // üretim
  'uretim_yan_urunler', 'uretim_emri_operasyon_bilesenleri', 'uretim_emri_operasyonlari',
  'uretim_emri_bilesenleri', 'uretim_emirleri',
  'rota_operasyon_bilesenleri', 'rota_operasyonlari', 'rotalar',
  'urun_agaci_satirlari', 'urun_agaclari',
  'is_merkezleri',
  // cari / tahsilat / muhasebe işlem
  'cari_hareketleri', 'tahsilat_odemeler',
  'cari_banka_bilgileri', 'cari_sevk_adresleri', 'cari_dil_tanimlari',
  'cari_firma_parametreleri', 'cari_detaylari',
  'muhasebe_belge_satirlari', 'muhasebe_belgeleri',
  'fiyat_liste_satirlari', 'fiyat_listeleri',
  'eposta_gonderimleri', 'audit_log',
  // ana kartlar (firma bağlı)
  'cariler', 'stoklar',
  'depolar', 'is_yerleri', 'firmalar',
];

/** Korunan sistem tanımları (truncate edilmez) */
const KEEP = [
  'schema_migrations', 'kod_serileri', 'olcu_birimleri', 'hareket_kodlari',
  'belge_tipleri', 'sistem_parametreleri', 'ulkeler', 'para_birimleri',
  'sehirler', 'ilceler', 'kategori_tanimlari',
  'kullanici_gruplari', 'kisiler', 'kullanici_grup_uyeleri', 'kullanici_depo',
  'stok_siniflari', 'kk_kontrol_planlari', 'kk_ret_nedenleri',
  'crm_firsat_asamalari', 'crm_faaliyet_tipleri', 'hesap_belirleme_kurallari',
  'muhasebe_hesaplari', 'uretim_emri_tipleri',
];

async function tableExists(client, name) {
  const r = await client.query(`SELECT to_regclass($1) AS t`, [`public.${name}`]);
  return Boolean(r.rows[0].t);
}

async function main() {
  const client = await pool.connect();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const log = { stamp, truncated: [], skipped: [], keep: KEEP };
  try {
    await client.query('BEGIN');
    // kod serisi sayaçlarını sıfırla (onek korunur)
    if (await tableExists(client, 'kod_serileri')) {
      await client.query(`UPDATE kod_serileri SET son_numara = 0`);
      log.kodSerileriReset = true;
    }
    for (const t of PURGE_TABLES) {
      if (!(await tableExists(client, t))) {
        log.skipped.push(t);
        continue;
      }
      await client.query(`TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE`);
      log.truncated.push(t);
    }
    await client.query('COMMIT');
    const dir = path.join('backups', 'demo-cleanup');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `cleanup-log-${stamp}.json`), JSON.stringify(log, null, 2));
    console.log(JSON.stringify({ ok: true, truncated: log.truncated.length, skipped: log.skipped.length }, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Temizlik başarısız:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
