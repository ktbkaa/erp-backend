/**
 * MRP örnek senaryosu:
 * 1) Bağımsız ihtiyaç: 300 adet U00001 (Kompanzasyon Rölesi)
 * 2) MRP çalıştır → BOM patlatma → net ihtiyaçlar
 * 3) Satınalma önerilerinden SA talep
 * 4) Üretim önerisinden UE
 *
 * Kullanım: node scripts/demo-mrp-ornek.js
 */
require('dotenv').config();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { mrpCalistir } = require('../src/services/mrpService');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stok = await client.query(
      `SELECT id, stok_kodu, stok_adi FROM stoklar WHERE stok_kodu = 'U00001'`
    );
    if (!stok.rows[0]) throw new Error('U00001 stok bulunamadı — önce demo veri yükleyin.');
    const stokId = stok.rows[0].id;

    const firma = await client.query('SELECT id FROM firmalar ORDER BY id LIMIT 1');
    const isYeri = await client.query('SELECT id FROM is_yerleri ORDER BY id LIMIT 1');
    const firmaId = firma.rows[0]?.id || null;
    const isYeriId = isYeri.rows[0]?.id || null;

    const biNo = await sonrakiKod(client, 'MRP_BI');
    const ihtiyacTarihi = new Date();
    ihtiyacTarihi.setDate(ihtiyacTarihi.getDate() + 14);
    const bi = await client.query(
      `INSERT INTO mrp_bagimsiz_ihtiyaclar
          (ihtiyac_no, stok_id, miktar, birim, ihtiyac_tarihi, kaynak, firma_id, is_yeri_id, aciklama)
       VALUES ($1,$2,300,'AD',$3,'Manuel',$4,$5,$6)
       RETURNING *`,
      [
        biNo, stokId, ihtiyacTarihi.toISOString().slice(0, 10),
        firmaId, isYeriId,
        'MRP örnek — 300 adet kompanzasyon rölesi bağımsız ihtiyaç',
      ]
    );
    // Önceki örnek BI'ları kapat (çift sayım olmasın)
    await client.query(
      `UPDATE mrp_bagimsiz_ihtiyaclar SET aktif = FALSE
       WHERE stok_id = $1 AND ihtiyac_no <> $2 AND aciklama LIKE 'MRP örnek%'`,
      [stokId, biNo]
    );
    console.log('BI:', bi.rows[0].ihtiyac_no, '300 x', stok.rows[0].stok_kodu);

    await client.query('COMMIT');

    const sonuc = await withTransaction(pool, async (c) => mrpCalistir(c, {
      firmaId,
      isYeriId,
      aciklama: 'demo-mrp-ornek çalışması',
      olusturan: 'demo-mrp-ornek',
    }));

    console.log('Çalışma:', sonuc.calisma.calisma_no,
      'satır', sonuc.calisma.satir_sayisi,
      'net>0', sonuc.calisma.net_pozitif);

    const netler = sonuc.sonuclar.filter((r) => r.net_ihtiyac > 0);
    console.log('Net ihtiyaçlar:');
    netler.slice(0, 15).forEach((r) => {
      console.log(`  ${r.stok_kodu.padEnd(8)} net=${r.net_ihtiyac} → ${r.oneri}`);
    });

    const port = process.env.PORT || 3000;
    const base = `http://127.0.0.1:${port}`;

    // SA talep (satınalma önerileri) — API ile dönüşüm işaretlensin
    const saAday = netler.filter((r) => r.oneri === 'Satınalma');
    if (saAday.length) {
      const talep = await fetch(`${base}/mrp/talep-olustur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calisma_id: sonuc.calisma.id,
          is_yeri_id: isYeriId,
        }),
      }).then((x) => x.json()).catch((e) => ({ hata: e.message }));
      console.log('SA talep:', talep.talep_no || '-', (talep.satirlar || []).length, 'kalem', talep.hata || '');
    }

    // Üretim emri (üretim önerileri)
    const ueAday = netler.filter((r) => r.oneri === 'Üretim emri');
    if (ueAday.length) {
      const r = await fetch(`${base}/mrp/uretim-emri-olustur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calisma_id: sonuc.calisma.id,
          is_yeri_id: isYeriId,
        }),
      }).then((x) => x.json()).catch((e) => ({ hata: e.message }));
      console.log('UE:', r.olusan || 0, 'emir', r.hata || '',
        (r.emirler || []).map((e) => e.emir_no).join(', '));
    }

    console.log('\nTamam. UI: Stok → Planlama → MRP Sonuçları / Bağımsız İhtiyaç');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* */ }
    console.error('HATA:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
