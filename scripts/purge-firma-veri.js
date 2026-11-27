/**
 * Firma kapsamlı veri temizliği.
 *
 * 1) firma_id IS NULL olan işlem/kartları siler
 * 2) Verilen firma_kodu (varsayılan TEKS) için iş verisini siler;
 *    firma + iş yeri + depo iskeleti kalır (sıfırdan test için)
 *
 * Kullanım:
 *   node scripts/purge-firma-veri.js
 *   node scripts/purge-firma-veri.js TEKS
 *   node scripts/purge-firma-veri.js TEKS --also-org   # iş yeri+depo da sil
 */
require('dotenv').config();
const pool = require('../db');

const firmaKodu = String(process.argv[2] || 'TEKS').toUpperCase();
const alsoOrg = process.argv.includes('--also-org');

/** firma_id kolonlu tablolar — silme sırası (çocuk → ebeveyn benzeri) */
const FIRMA_TABLES = [
  // kalite
  'kk_capa', 'kk_uygunsuzluklar', 'kk_emirleri',
  // stok hareket / parti
  'stok_partileri', 'stok_hareketleri',
  // satış
  'faturalar', 'irsaliyeler', 'sevk_emirleri', 'siparisler', 'satis_teklifleri',
  // satınalma
  'mal_kabuller', 'satin_alma_siparisleri', 'satin_alma_anlasmalari',
  'satin_alma_teklifleri', 'satin_alma_teklif_istekleri', 'satin_alma_talepleri',
  // üretim / BOM / rota / MRP
  'uretim_emirleri', 'rotalar', 'urun_agaclari',
  'mrp_bagimsiz_ihtiyaclar', 'mrp_calismalari',
  'sayim_belgeleri', 'transfer_emirleri',
  // CRM
  'crm_gorevler', 'crm_faaliyetler', 'crm_faaliyet_planlari',
  'crm_firsatlar', 'crm_kontaklar', 'crm_adaylar',
  // muhasebe / fiyat
  'muhasebe_belgeleri', 'fiyat_listeleri',
  // ana kartlar
  'cariler', 'stoklar',
  // params
  'cari_firma_parametreleri',
];

async function tableExists(client, name) {
  const r = await client.query(`SELECT to_regclass($1) AS t`, [`public.${name}`]);
  return Boolean(r.rows[0].t);
}

async function hasColumn(client, table, col) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, col]
  );
  return r.rows.length > 0;
}

async function deleteWhere(client, table, whereSql, params, log) {
  if (!(await tableExists(client, table))) {
    log.skipped.push(table);
    return 0;
  }
  const sp = `sp_${table.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await client.query(`SAVEPOINT ${sp}`);
    const r = await client.query(`DELETE FROM ${table} WHERE ${whereSql}`, params);
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    if (r.rowCount) log.deleted.push({ table, n: r.rowCount });
    return r.rowCount;
  } catch (err) {
    try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch (_) { /* ignore */ }
    log.errors.push({ table, hata: err.message });
    return 0;
  }
}

async function purgeNullFirma(client, log) {
  log.nullFirma = [];
  for (const t of FIRMA_TABLES) {
    if (!(await tableExists(client, t))) continue;
    if (!(await hasColumn(client, t, 'firma_id'))) continue;
    // Önce stok/cari çocukları (null stok)
    if (t === 'stoklar') {
      await deleteWhere(client, 'mrp_sonuclar',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)
         OR kaynak_stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_hareket_satirlari',
        `hareket_id IN (SELECT id FROM stok_hareketleri WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_is_yeri',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_depo',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_barkodlari',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_birim_tanimlari',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_dil_tanimlari',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_detaylari',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_ikame',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)
         OR ikame_stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_rezervasyonlari',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'stok_serileri',
        `stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)`, [], log);
      await deleteWhere(client, 'urun_agaci_satirlari',
        `bilesen_stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL)
         OR urun_agaci_id IN (SELECT id FROM urun_agaclari WHERE mamul_stok_id IN (SELECT id FROM stoklar WHERE firma_id IS NULL))`, [], log);
    }
    if (t === 'siparisler') {
      await deleteWhere(client, 'siparis_detaylari',
        `siparis_id IN (SELECT id FROM siparisler WHERE firma_id IS NULL)`, [], log);
    }
    if (t === 'urun_agaclari') {
      await deleteWhere(client, 'urun_agaci_satirlari',
        `urun_agaci_id IN (SELECT id FROM urun_agaclari WHERE firma_id IS NULL)`, [], log);
    }
    if (t === 'rotalar') {
      await deleteWhere(client, 'rota_operasyon_bilesenleri',
        `operasyon_id IN (SELECT id FROM rota_operasyonlari WHERE rota_id IN (SELECT id FROM rotalar WHERE firma_id IS NULL))`, [], log);
      await deleteWhere(client, 'rota_operasyonlari',
        `rota_id IN (SELECT id FROM rotalar WHERE firma_id IS NULL)`, [], log);
    }
    const n = await deleteWhere(client, t, 'firma_id IS NULL', [], log);
    if (n) log.nullFirma.push({ table: t, n });
  }
}

async function purgeFirma(client, firmaId, log) {
  const p = [firmaId];

  // Rota / BOM çocukları
  await deleteWhere(client, 'rota_operasyon_bilesenleri',
    `operasyon_id IN (SELECT id FROM rota_operasyonlari WHERE rota_id IN (SELECT id FROM rotalar WHERE firma_id=$1))`, p, log);
  await deleteWhere(client, 'rota_operasyonlari',
    `rota_id IN (SELECT id FROM rotalar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'urun_agaci_satirlari',
    `urun_agaci_id IN (SELECT id FROM urun_agaclari WHERE firma_id=$1)`, p, log);

  // Belge satırları
  await deleteWhere(client, 'siparis_detaylari',
    `siparis_id IN (SELECT id FROM siparisler WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'satis_teklif_satirlari',
    `teklif_id IN (SELECT id FROM satis_teklifleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'sevk_emri_satirlari',
    `sevk_id IN (SELECT id FROM sevk_emirleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'irsaliye_satirlari',
    `irsaliye_id IN (SELECT id FROM irsaliyeler WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'fatura_detaylari',
    `fatura_id IN (SELECT id FROM faturalar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'satin_alma_talep_satirlari',
    `talep_id IN (SELECT id FROM satin_alma_talepleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'satin_alma_teklif_satirlari',
    `teklif_id IN (SELECT id FROM satin_alma_teklifleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'satin_alma_siparis_satirlari',
    `siparis_id IN (SELECT id FROM satin_alma_siparisleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'mal_kabul_satirlari',
    `kabul_id IN (SELECT id FROM mal_kabuller WHERE firma_id=$1)
     OR siparis_satir_id IN (
       SELECT ss.id FROM satin_alma_siparis_satirlari ss
       JOIN satin_alma_siparisleri s ON s.id = ss.siparis_id WHERE s.firma_id=$1
     )`, p, log);
  await deleteWhere(client, 'uretim_emri_operasyon_bilesenleri',
    `operasyon_id IN (SELECT id FROM uretim_emri_operasyonlari WHERE emir_id IN (SELECT id FROM uretim_emirleri WHERE firma_id=$1))`, p, log);
  await deleteWhere(client, 'uretim_emri_operasyonlari',
    `emir_id IN (SELECT id FROM uretim_emirleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'uretim_emri_bilesenleri',
    `emir_id IN (SELECT id FROM uretim_emirleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'uretim_yan_urunler',
    `uretim_emri_id IN (SELECT id FROM uretim_emirleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'mrp_sonuclar',
    `calisma_id IN (SELECT id FROM mrp_calismalari WHERE firma_id=$1)
     OR stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)
     OR kaynak_stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_hareket_satirlari',
    `hareket_id IN (SELECT id FROM stok_hareketleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'crm_firsat_satirlari',
    `firsat_id IN (SELECT id FROM crm_firsatlar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'fiyat_liste_satirlari',
    `liste_id IN (SELECT id FROM fiyat_listeleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'muhasebe_belge_satirlari',
    `belge_id IN (SELECT id FROM muhasebe_belgeleri WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'mrp_sonuclar',
    `calisma_id IN (SELECT id FROM mrp_calismalari WHERE firma_id=$1)`, p, log);

  // Stok çocukları (firma stokları)
  await deleteWhere(client, 'stok_is_yeri',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_depo',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_barkodlari',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_birim_tanimlari',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_dil_tanimlari',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_detaylari',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_ikame',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)
     OR ikame_stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_rezervasyonlari',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_serileri',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'stok_maliyet_hareket',
    `stok_id IN (SELECT id FROM stoklar WHERE firma_id=$1)`, p, log);

  // İş merkezi (iş yeri üzerinden)
  await deleteWhere(client, 'is_merkezleri',
    `is_yeri_id IN (SELECT id FROM is_yerleri WHERE firma_id=$1)`, p, log);

  // Cari çocuk referansları (NO ACTION)
  await deleteWhere(client, 'cari_hareketleri',
    `cari_id IN (SELECT id FROM cariler WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'tahsilat_odemeler',
    `cari_id IN (SELECT id FROM cariler WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'tedarikci_degerlendirme',
    `cari_id IN (SELECT id FROM cariler WHERE firma_id=$1)`, p, log);
  await deleteWhere(client, 'crm_ajanda',
    `cari_id IN (SELECT id FROM cariler WHERE firma_id=$1)`, p, log);

  // firma_id tabloları
  for (const t of FIRMA_TABLES) {
    await deleteWhere(client, t, 'firma_id = $1', p, log);
  }

  if (alsoOrg) {
    await deleteWhere(client, 'depolar',
      `is_yeri_id IN (SELECT id FROM is_yerleri WHERE firma_id=$1)`, p, log);
    await deleteWhere(client, 'is_yerleri', 'firma_id = $1', p, log);
  }
}

async function main() {
  const client = await pool.connect();
  const log = { firmaKodu, alsoOrg, deleted: [], skipped: [], errors: [], nullFirma: [] };
  try {
    await client.query('BEGIN');

    await purgeNullFirma(client, log);

    const f = await client.query(
      `SELECT id, firma_kodu, firma_adi FROM firmalar WHERE UPPER(firma_kodu)=UPPER($1)`,
      [firmaKodu]
    );
    if (!f.rows[0]) throw new Error(`Firma bulunamadı: ${firmaKodu}`);
    log.firma = f.rows[0];
    await purgeFirma(client, f.rows[0].id, log);

    await client.query('COMMIT');

    // özet
    const left = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM stoklar WHERE firma_id=$1) AS stok,
         (SELECT COUNT(*) FROM cariler WHERE firma_id=$1) AS cari,
         (SELECT COUNT(*) FROM urun_agaclari WHERE firma_id=$1) AS agac,
         (SELECT COUNT(*) FROM rotalar WHERE firma_id=$1) AS rota,
         (SELECT COUNT(*) FROM stoklar WHERE firma_id IS NULL) AS null_stok,
         (SELECT COUNT(*) FROM siparisler WHERE firma_id IS NULL) AS null_siparis`,
      [f.rows[0].id]
    );
    log.kalan = left.rows[0];
    console.log(JSON.stringify({
      ok: true,
      firma: log.firma,
      silinen_satir: log.deleted.reduce((a, x) => a + x.n, 0),
      silinen_tablolar: log.deleted.length,
      hatalar: log.errors,
      kalan: log.kalan,
    }, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purge başarısız:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
