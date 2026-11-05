/**
 * GIDA + DOKUM için bol örnek veri — mümkün olan tüm modül/ekran alanlarını doldurur.
 *
 *   node scripts/qa/rich-ornek-veri.js              # ikisi
 *   node scripts/qa/rich-ornek-veri.js --firma=GIDA
 *   node scripts/qa/rich-ornek-veri.js --firma=DOKUM
 *   npm run qa:ornek-all
 *
 * Etiket: ORNEK-GIDA-2026 / ORNEK-DOKUM-2026
 * Kod ön eki: OG-* / OD-*
 * Mevcut TEST-* döngü verisini silmez; üzerine ekler (idempotent upsert kodlarla).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../../db');
const { withTransaction } = require('../../src/utils/withTransaction');
const { sonrakiKod, stokSeriKodundanTip, cariSeriKodundanTur } = require('../../src/utils/kodUretici');
const { stokHareketOlustur } = require('../../src/services/stokHareketService');

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const argFirma = (process.argv.find((a) => a.startsWith('--firma=')) || '').split('=')[1];

const SECTORS = {
  GIDA: {
    code: 'GIDA',
    tag: 'ORNEK-GIDA-2026',
    prefix: 'OG',
    city: 'Konya',
    district: 'Karatay',
    sectorName: 'Süt ve Süt Ürünleri',
    items: [
      { code: 'OG-H01', name: 'Çiğ İnek Sütü', type: 'Hammadde', uom: 'LT', price: 18, qc: true },
      { code: 'OG-H02', name: 'Keçi Sütü', type: 'Hammadde', uom: 'LT', price: 28, qc: true },
      { code: 'OG-H03', name: 'Yoğurt Kültürü', type: 'Hammadde', uom: 'KG', price: 220, qc: true },
      { code: 'OG-H04', name: 'Peynir Mayası', type: 'Hammadde', uom: 'KG', price: 180, qc: true },
      { code: 'OG-A01', name: '1L PET Şişe', type: 'Hammadde', uom: 'AD', price: 1.4 },
      { code: 'OG-A02', name: 'Şişe Kapağı', type: 'Hammadde', uom: 'AD', price: 0.35 },
      { code: 'OG-A03', name: 'Shrink Etiket', type: 'Hammadde', uom: 'AD', price: 0.22 },
      { code: 'OG-A04', name: 'Yoğurt Kabı 1KG', type: 'Hammadde', uom: 'AD', price: 2.1 },
      { code: 'OG-Y01', name: 'Pastörize Süt Ara Ürün', type: 'YariMamul', uom: 'LT', price: 22, tedarik: 'Uretim', qc: true },
      { code: 'OG-Y02', name: 'Çiğ Peynir Pıhtısı', type: 'YariMamul', uom: 'KG', price: 55, tedarik: 'Uretim', qc: true },
      { code: 'OG-M01', name: 'Tam Yağlı Süt 1L', type: 'Mamul', uom: 'AD', price: 32, tedarik: 'Uretim', qc: true },
      { code: 'OG-M02', name: 'Yarım Yağlı Süt 1L', type: 'Mamul', uom: 'AD', price: 29, tedarik: 'Uretim', qc: true },
      { code: 'OG-M03', name: 'Sade Yoğurt 1KG', type: 'Mamul', uom: 'AD', price: 48, tedarik: 'Uretim', qc: true },
      { code: 'OG-M04', name: 'Beyaz Peynir 500g', type: 'Mamul', uom: 'AD', price: 95, tedarik: 'Uretim', qc: true },
      { code: 'OG-M05', name: 'Ayran 1L', type: 'Mamul', uom: 'AD', price: 26, tedarik: 'Uretim', qc: true },
    ],
    partners: {
      tedarikci: [
        'OG Tedarik — Çiftlik Koop. Konya',
        'OG Tedarik — Ambalaj Paket A.Ş.',
        'OG Tedarik — Soğuk Zincir Lojistik',
        'OG Tedarik — Laboratuvar Kimya',
        'OG Tedarik — Temizlik & Hijyen',
        'OG Tedarik — Enerji / Doğalgaz',
      ],
      musteri: [
        'OG Müşteri — Anadolu Market Zinciri',
        'OG Müşteri — Oteller Tedarik Ltd.',
        'OG Müşteri — Okul Kantinleri Birliği',
        'OG Müşteri — Online Gıda Pazarı',
        'OG Müşteri — Hastane Mutfakları',
        'OG Müşteri — İhracat Distribütör',
      ],
    },
    bomFg: 'OG-M01',
    bomComps: [['OG-H01', 1.02, 'LT'], ['OG-A01', 1, 'AD'], ['OG-A02', 1, 'AD'], ['OG-A03', 1, 'AD']],
    extraBoms: [
      { code: 'OG-BOM-YOG', fg: 'OG-M03', comps: [['OG-H01', 0.9, 'LT'], ['OG-H03', 0.02, 'KG'], ['OG-A04', 1, 'AD']] },
      { code: 'OG-BOM-PEY', fg: 'OG-M04', comps: [['OG-H01', 4.5, 'LT'], ['OG-H04', 0.01, 'KG']] },
      { code: 'OG-BOM-AYR', fg: 'OG-M05', comps: [['OG-H01', 0.7, 'LT'], ['OG-A01', 1, 'AD'], ['OG-A02', 1, 'AD']] },
    ],
    ops: ['Kabul Analiz', 'Pastörizasyon', 'Homojenizasyon', 'Dolum', 'Soğuk Depo'],
    hrDepts: ['Üretim', 'Kalite', 'Satış', 'Satınalma', 'Depo', 'Muhasebe'],
  },
  DOKUM: {
    code: 'DOKUM',
    tag: 'ORNEK-DOKUM-2026',
    prefix: 'OD',
    city: 'Kayseri',
    district: 'Organize',
    sectorName: 'Döküm Sanayi',
    items: [
      { code: 'OD-H01', name: 'Pik Demir', type: 'Hammadde', uom: 'KG', price: 18, qc: true },
      { code: 'OD-H02', name: 'Hurda Çelik', type: 'Hammadde', uom: 'KG', price: 12, qc: true },
      { code: 'OD-H03', name: 'Ferrosilisyum', type: 'Hammadde', uom: 'KG', price: 45, qc: true },
      { code: 'OD-H04', name: 'Grafit', type: 'Hammadde', uom: 'KG', price: 38, qc: true },
      { code: 'OD-A01', name: 'Kalıp Kumu', type: 'Hammadde', uom: 'KG', price: 2.5 },
      { code: 'OD-A02', name: 'Bağlayıcı Reçine', type: 'Hammadde', uom: 'KG', price: 28 },
      { code: 'OD-A03', name: 'Maça Kumu', type: 'Hammadde', uom: 'KG', price: 3.2 },
      { code: 'OD-A04', name: 'Boyama Astarı', type: 'Hammadde', uom: 'LT', price: 55 },
      { code: 'OD-Y01', name: 'Eritilmiş Metal', type: 'YariMamul', uom: 'KG', price: 22, tedarik: 'Uretim', qc: true },
      { code: 'OD-Y02', name: 'Ham Döküm Parça', type: 'YariMamul', uom: 'AD', price: 120, tedarik: 'Uretim', qc: true },
      { code: 'OD-M01', name: 'Fren Diski Döküm', type: 'Mamul', uom: 'AD', price: 1850, tedarik: 'Uretim', qc: true },
      { code: 'OD-M02', name: 'Motor Blok Döküm', type: 'Mamul', uom: 'AD', price: 9200, tedarik: 'Uretim', qc: true },
      { code: 'OD-M03', name: 'Manifold Döküm', type: 'Mamul', uom: 'AD', price: 2400, tedarik: 'Uretim', qc: true },
      { code: 'OD-M04', name: 'Pompa Gövdesi', type: 'Mamul', uom: 'AD', price: 3100, tedarik: 'Uretim', qc: true },
      { code: 'OD-M05', name: 'Kaplin Flanş', type: 'Mamul', uom: 'AD', price: 780, tedarik: 'Uretim', qc: true },
    ],
    partners: {
      tedarikci: [
        'OD Tedarik — Demir-Çelik Toptan',
        'OD Tedarik — Kum & Reçine Sanayi',
        'OD Tedarik — Refrakter Malzeme',
        'OD Tedarik — Endüstriyel Gaz',
        'OD Tedarik — Kalıp Aparat',
        'OD Tedarik — İş Sağlığı / PPE',
      ],
      musteri: [
        'OD Müşteri — Otomotiv OEM Bursa',
        'OD Müşteri — Tarım Makine A.Ş.',
        'OD Müşteri — Pompa Üreticileri',
        'OD Müşteri — İhracat Trading',
        'OD Müşteri — Raylı Sistemler',
        'OD Müşteri — Beyaz Eşya OEM',
      ],
    },
    bomFg: 'OD-M01',
    bomComps: [['OD-H01', 12, 'KG'], ['OD-H02', 8, 'KG'], ['OD-A01', 25, 'KG'], ['OD-A02', 1.5, 'KG']],
    extraBoms: [
      { code: 'OD-BOM-BLOK', fg: 'OD-M02', comps: [['OD-H01', 80, 'KG'], ['OD-H02', 40, 'KG'], ['OD-H03', 2, 'KG'], ['OD-A01', 60, 'KG']] },
      { code: 'OD-BOM-MAN', fg: 'OD-M03', comps: [['OD-H01', 18, 'KG'], ['OD-H02', 10, 'KG'], ['OD-A03', 8, 'KG']] },
      { code: 'OD-BOM-POMP', fg: 'OD-M04', comps: [['OD-H01', 22, 'KG'], ['OD-H04', 1, 'KG'], ['OD-A04', 0.5, 'LT']] },
    ],
    ops: ['Hammadde Hazırlık', 'Eritme', 'Kalıplama', 'Döküm', 'Temizleme', 'Kalite Kontrol'],
    hrDepts: ['Eritme', 'Kalıp', 'Kalite', 'Satış', 'Satınalma', 'Bakım'],
  },
};

function isDup(err) {
  const m = String(err?.message || err || '');
  return /409|duplicate|zaten var|unique constraint/i.test(m);
}

async function apiSoft(method, urlPath, body, firmaId) {
  try {
    const data = await api(method, urlPath, body, firmaId);
    return { ok: true, data, dup: false };
  } catch (e) {
    return { ok: false, data: null, dup: isDup(e), error: e };
  }
}

function log(msg) { console.log(msg); }

async function api(method, urlPath, body, firmaId) {
  const headers = { 'Content-Type': 'application/json', 'X-Kullanici-Kodu': 'owner' };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  const r = await fetch(BASE_URL + urlPath, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    const msg = data?.hata || data?.detay || text || r.statusText;
    throw new Error(`${method} ${urlPath} → ${r.status}: ${msg}`);
  }
  return data;
}

async function ensureOrg(client, def) {
  let firma = (await client.query(`SELECT * FROM companies WHERE company_code=$1`, [def.code])).rows[0];
  if (!firma) {
    firma = (await client.query(
      `INSERT INTO companies (company_code, company_name, tax_id, address, email)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [def.code, `Anadolu ${def.sectorName} A.Ş.`, '1112223330', `${def.city} OSB`, `info@${def.code.toLowerCase()}.ornek.local`]
    )).rows[0];
  }
  let plant = (await client.query(`SELECT * FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`, [firma.id])).rows[0];
  if (!plant) {
    plant = (await client.query(
      `INSERT INTO plants (company_id, plant_code, plant_name, address) VALUES ($1,$2,$3,$4) RETURNING *`,
      [firma.id, `${def.code}-MR`, `${def.code} Merkez`, def.city]
    )).rows[0];
  }
  const wh = {};
  for (const [suf, name, rol] of [
    ['ANA', 'Ana', 'Normal'], ['HMD', 'Hammadde', 'Hammadde'], ['MAM', 'Mamul', 'Mamul'],
    ['KK', 'Kalite', 'GKK'], ['SVK', 'Sevk', 'Normal'], ['GIR', 'Giriş', 'Giris'],
    ['CKK', 'Çıkış KK', 'CKK'], ['YM', 'Yarı Mamul', 'YariMamul'],
  ]) {
    const code = `${def.code}-${suf}`;
    let w = (await client.query(`SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`, [plant.id, code])).rows[0];
    if (!w) {
      w = (await client.query(
        `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_rolu)
         VALUES ($1,$2,$3,TRUE,$4) RETURNING *`,
        [plant.id, code, name, rol]
      )).rows[0];
    }
    wh[suf.toLowerCase()] = w;
  }
  let wc = (await client.query(`SELECT * FROM work_centers WHERE plant_id=$1 ORDER BY id LIMIT 1`, [plant.id])).rows[0];
  if (!wc) {
    wc = (await client.query(
      `INSERT INTO work_centers (plant_id, center_code, center_name, is_active) VALUES ($1,$2,$3,TRUE) RETURNING *`,
      [plant.id, `${def.code}-IM1`, `${def.code} Ana Hat`]
    )).rows[0];
  }
  for (const code of ['ADMIN', 'owner']) {
    const u = (await client.query(`SELECT id FROM users WHERE user_code=$1`, [code])).rows[0];
    if (!u) continue;
    await client.query(
      `INSERT INTO user_company_permissions (kisi_id, company_id)
       SELECT $1,$2 WHERE NOT EXISTS (SELECT 1 FROM user_company_permissions WHERE kisi_id=$1 AND company_id=$2)`,
      [u.id, firma.id]
    );
  }
  return { firma, plant, wh, wc };
}

async function upsertPartner(client, { def, name, type, i }) {
  const existing = (await client.query(
    `SELECT * FROM partners WHERE company_id=$1 AND partner_name=$2 LIMIT 1`,
    [(await client.query(`SELECT id FROM companies WHERE company_code=$1`, [def.code])).rows[0].id, name]
  )).rows[0];
  // company_id from name lookup above is fragile — use join
  const firmaId = (await client.query(`SELECT id FROM companies WHERE company_code=$1`, [def.code])).rows[0].id;
  const plantId = (await client.query(`SELECT id FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`, [firmaId])).rows[0].id;
  let row = (await client.query(
    `SELECT * FROM partners WHERE company_id=$1 AND partner_name=$2 LIMIT 1`, [firmaId, name]
  )).rows[0];
  if (row) return row;
  const kod = `${def.prefix}-${type === 'Tedarikci' ? 'T' : 'M'}${String(i + 1).padStart(2, '0')}`;
  row = (await client.query(
    `INSERT INTO partners (
       partner_code, partner_name, partner_name_2, partner_type, telefon, telefon2, email,
       tax_id, tax_office, yetkili_name, yetkili_telefon, address, billing_address,
       il, district, country, postal_code, currency_code, payment_due_days, is_active,
       company_id, plant_id, notlar, description
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'TR',$16,'TRY',$17,TRUE,$18,$19,$20,$21
     ) RETURNING *`,
    [
      kod, name, `${def.sectorName} ${type}`, type,
      `0332${5000000 + i}`, `0532${6000000 + i}`, `${kod.toLowerCase()}@ornek.local`,
      String(1000000000 + i * 111), `${def.city} VD`, `Yetkili ${i + 1}`, `0532${7000000 + i}`,
      `${def.city} OSB ${i + 1}. Cadde No:${10 + i}`, `${def.city} Fatura Adresi ${i + 1}`,
      def.city, def.district, `38${String(100 + i).slice(-3)}`, type === 'Musteri' ? 45 : 30,
      firmaId, plantId, def.tag, `[${def.tag}] ${name}`,
    ]
  )).rows[0];
  return row;
}

async function upsertItem(client, { def, it, firmaId, plantId, wh }) {
  let row = (await client.query(`SELECT * FROM items WHERE item_code=$1`, [it.code])).rows[0];
  const tedarik = it.tedarik || (it.type === 'Mamul' || it.type === 'YariMamul' ? 'Uretim' : 'Satinalma');
  const giris = it.type === 'Mamul' ? wh.mam.id : (it.type === 'YariMamul' ? wh.ym.id : wh.hmd.id);
  const cikis = it.type === 'Mamul' ? wh.mam.id : giris;
  if (row) return row;
  row = (await client.query(
    `INSERT INTO items (
       item_code, item_name, item_name_2, uom_code, sales_price, item_type, tedarik_type,
       is_active, company_id, varsayilan_giris_warehouse_id, varsayilan_cikis_warehouse_id,
       kalite_control_gerekli, description, temin_suresi_days, safety_stock, lot_politika,
       abc_code, barkod, stock_takip_uom
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$4
     ) RETURNING *`,
    [
      it.code, it.name, `${def.sectorName} ${it.type}`, it.uom, it.price, it.type, tedarik,
      firmaId, giris, cikis, !!it.qc,
      `[${def.tag}] ${it.name}`, it.type === 'Hammadde' ? 5 : 0, it.type === 'Hammadde' ? 40 : 10,
      (it.qc ? 'IstegeBagli' : 'Takipsiz'), it.type === 'Mamul' ? 'A' : 'B',
      `8690${it.code.replace(/\D/g, '').padEnd(8, '0').slice(0, 8)}`,
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO item_plants (item_id, plant_id, is_active) VALUES ($1,$2,TRUE)
     ON CONFLICT (item_id, plant_id) DO UPDATE SET is_active=TRUE`,
    [row.id, plantId]
  );
  for (const w of Object.values(wh)) {
    try {
      await client.query('SAVEPOINT sp_iw');
      await client.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
         SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
           SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2)`,
        [row.id, w.id, plantId]
      );
      await client.query('RELEASE SAVEPOINT sp_iw');
    } catch (_) {
      await client.query('ROLLBACK TO SAVEPOINT sp_iw').catch(() => {});
    }
  }
  return row;
}

async function seedSector(def) {
  const catalog = { firma: def.code, tag: def.tag, counts: {} };
  const bump = (k, n = 1) => { catalog.counts[k] = (catalog.counts[k] || 0) + n; };

  async function safe(client, label, fn) {
    await client.query('SAVEPOINT sp_ornek');
    try {
      await fn();
      await client.query('RELEASE SAVEPOINT sp_ornek');
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT sp_ornek');
      log(`  [skip ${label}] ${err.message}`);
    }
  }

  const ctx = await withTransaction(pool, async (client) => {
    for (const [u, n] of [['AD', 'Adet'], ['KG', 'Kilogram'], ['LT', 'Litre'], ['TON', 'Ton'], ['MT', 'Metre']]) {
      await client.query(
        `INSERT INTO units_of_measure (uom_code, uom_name, is_active) VALUES ($1,$2,TRUE) ON CONFLICT (uom_code) DO NOTHING`,
        [u, n]
      );
    }
    bump('olcu-birimleri', 5);

    const org = await ensureOrg(client, def);
    bump('companies'); bump('is-yerleri'); bump('warehouses', 8); bump('is-merkezleri');

    // ödeme / teslimat
    for (const [code, name, days] of [
      [`${def.prefix}-OD30`, '30 Gün Net', 30],
      [`${def.prefix}-OD45`, '45 Gün Net', 45],
      [`${def.prefix}-PESIN`, 'Peşin', 0],
    ]) {
      await safe(client, `payment-${code}`, async () => {
        await client.query(
          `INSERT INTO payment_terms (term_code, term_name, due_days, is_active)
           VALUES ($1,$2,$3,TRUE) ON CONFLICT (term_code) DO NOTHING`,
          [code, name, days]
        );
      });
    }
    bump('odeme-kosulu-tanimi', 3);

    const ted = [];
    for (let i = 0; i < def.partners.tedarikci.length; i++) {
      ted.push(await upsertPartner(client, { def, name: def.partners.tedarikci[i], type: 'Tedarikci', i }));
    }
    const mus = [];
    for (let i = 0; i < def.partners.musteri.length; i++) {
      mus.push(await upsertPartner(client, { def, name: def.partners.musteri[i], type: 'Musteri', i }));
    }
    bump('cari-kartlari', ted.length + mus.length);

    const items = {};
    for (const it of def.items) {
      items[it.code] = await upsertItem(client, {
        def, it, firmaId: org.firma.id, plantId: org.plant.id, wh: org.wh,
      });
    }
    bump('stok-karti', def.items.length);

    // İş istasyonları
    for (let i = 0; i < 3; i++) {
      const code = `${def.prefix}-IST${i + 1}`;
      await safe(client, `station-${code}`, async () => {
        await client.query(
          `INSERT INTO work_stations (station_code, station_name, work_center_id, is_active)
           SELECT $1::text,$2::text,$3::int,TRUE WHERE NOT EXISTS (
             SELECT 1 FROM work_stations WHERE station_code=$1::text)`,
          [code, `${def.code} İstasyon ${i + 1}`, org.wc.id]
        );
      });
    }
    bump('is-istasyonlari', 3);

    // BOM
    const fg = items[def.bomFg];
    let bom = (await client.query(
      `SELECT * FROM boms WHERE company_id=$1 AND bom_code=$2`, [org.firma.id, `${def.prefix}-BOM-01`]
    )).rows[0];
    if (!bom && fg) {
      bom = (await client.query(
        `INSERT INTO boms (
           finished_good_item_id, bom_code, bom_name, quantity, uom_code,
           company_id, plant_id, alt_no, bom_type, bom_status, is_active,
           is_default_for_wo, fg_warehouse_id, notes
         ) VALUES ($1,$2,$3,1,$4,$5,$6,'00','Uretim','Onayli',TRUE,TRUE,$7,$8) RETURNING *`,
        [fg.id, `${def.prefix}-BOM-01`, `${fg.item_name} Ağacı`, fg.uom_code || 'AD',
          org.firma.id, org.plant.id, org.wh.mam.id, def.tag]
      )).rows[0];
      let ln = 10;
      for (const [c, q, u] of def.bomComps) {
        const comp = items[c];
        if (!comp) continue;
        await client.query(
          `INSERT INTO bom_lines (
             product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity
           ) VALUES ($1,$2,$3,$4,$5,$4,$4)`,
          [bom.id, ln, comp.id, q, u]
        );
        ln += 10;
      }
    }
    bump('urun-agaci');

    // Ek BOM'lar (diğer mamuller)
    for (const eb of def.extraBoms || []) {
      const efg = items[eb.fg];
      if (!efg) continue;
      await safe(client, `bom-${eb.code}`, async () => {
        let ebom = (await client.query(
          `SELECT * FROM boms WHERE company_id=$1 AND bom_code=$2`, [org.firma.id, eb.code]
        )).rows[0];
        if (!ebom) {
          ebom = (await client.query(
            `INSERT INTO boms (
               finished_good_item_id, bom_code, bom_name, quantity, uom_code,
               company_id, plant_id, alt_no, bom_type, bom_status, is_active,
               is_default_for_wo, fg_warehouse_id, notes
             ) VALUES ($1,$2,$3,1,$4,$5,$6,'00','Uretim','Onayli',TRUE,FALSE,$7,$8) RETURNING *`,
            [efg.id, eb.code, `${efg.item_name} Ağacı`, efg.uom_code || 'AD',
              org.firma.id, org.plant.id, org.wh.mam.id, def.tag]
          )).rows[0];
          let ln = 10;
          for (const [c, q, u] of eb.comps) {
            const comp = items[c];
            if (!comp) continue;
            await client.query(
              `INSERT INTO bom_lines (
                 product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity
               ) VALUES ($1,$2,$3,$4,$5,$4,$4)`,
              [ebom.id, ln, comp.id, q, u]
            );
            ln += 10;
          }
        }
        bump('urun-agaci');
      });
    }

    // Rota
    let rota = (await client.query(
      `SELECT * FROM routings WHERE company_id=$1 AND route_code=$2`, [org.firma.id, `${def.prefix}-R01`]
    )).rows[0];
    if (!rota && fg) {
      rota = (await client.query(
        `INSERT INTO routings (
           route_code, route_name, item_id, is_active, company_id, plant_id, varsayilan, notes
         ) VALUES ($1,$2,$3,TRUE,$4,$5,TRUE,$6) RETURNING *`,
        [`${def.prefix}-R01`, `${def.code} Ana Rota`, fg.id, org.firma.id, org.plant.id, def.tag]
      )).rows[0];
      let sira = 10;
      for (const op of def.ops) {
        await safe(client, `rota-op-${sira}`, async () => {
          await client.query(
            `INSERT INTO routing_operations (route_id, line_no, operation_code, operation_name, work_center_id, sure_dk)
             VALUES ($1,$2,$3,$4,$5,30)`,
            [rota.id, sira, `OP${sira}`, op, org.wc.id]
          );
        });
        sira += 10;
      }
    }
    bump('routings');

    // Fiyat listesi
    let pl = (await client.query(
      `SELECT * FROM price_lists WHERE company_id=$1 AND list_code=$2`, [org.firma.id, `${def.prefix}-SAT`]
    )).rows[0];
    if (!pl) {
      pl = (await client.query(
        `INSERT INTO price_lists (list_code, list_name, currency_code, start_date, is_active, company_id)
         VALUES ($1,$2,'TRY',CURRENT_DATE,TRUE,$3) RETURNING *`,
        [`${def.prefix}-SAT`, `${def.tag} Satış Listesi`, org.firma.id]
      )).rows[0];
      for (const it of def.items.filter((x) => x.type === 'Mamul')) {
        await client.query(
          `INSERT INTO price_list_lines (list_id, item_id, unit_price) VALUES ($1,$2,$3)`,
          [pl.id, items[it.code].id, it.price]
        );
      }
    }
    bump('fiyat-listeleri');

    // Açılış stok
    const hmLines = def.items.filter((x) => x.type === 'Hammadde').slice(0, 8).map((it) => ({
      item_id: items[it.code].id,
      quantity: it.uom === 'AD' ? 800 : 500,
      direction: 1,
      uom_code: it.uom,
    }));
    if (hmLines.length) {
      await safe(client, 'stok-acilis-hm', async () => {
        await stokHareketOlustur(client, {
          hareketTipi: 'STOK_GIRIS',
          isYeriId: org.plant.id,
          depoId: org.wh.hmd.id,
          belgeTipi: 'Acilis',
          description: `[${def.tag}] Açılış hammadde`,
          firmaId: org.firma.id,
          satirlar: hmLines,
        });
        bump('stok-hareketleri');
      });
    }
    const fgLines = def.items.filter((x) => x.type === 'Mamul').slice(0, 5).map((it) => ({
      item_id: items[it.code].id,
      quantity: 120,
      direction: 1,
      uom_code: it.uom,
    }));
    if (fgLines.length) {
      await safe(client, 'stok-acilis-mamul', async () => {
        await stokHareketOlustur(client, {
          hareketTipi: 'STOK_GIRIS',
          isYeriId: org.plant.id,
          depoId: org.wh.mam.id,
          belgeTipi: 'Acilis',
          description: `[${def.tag}] Açılış mamul`,
          firmaId: org.firma.id,
          satirlar: fgLines,
        });
      });
    }

    // Lot
    for (const it of def.items.filter((x) => x.qc).slice(0, 6)) {
      const code = `${def.prefix}-LOT-${it.code.slice(-3)}`;
      await safe(client, `lot-${code}`, async () => {
        await client.query(
          `INSERT INTO item_lots (lot_no, item_id, company_id, son_kullanma_date, is_active)
           SELECT $1::text,$2::int,$3::int,CURRENT_DATE + 120, TRUE
           WHERE NOT EXISTS (SELECT 1 FROM item_lots WHERE lot_no=$1::text)`,
          [code, items[it.code].id, org.firma.id]
        );
        bump('stok-partileri');
      });
    }

    return { org, items, ted, mus, bom, rota, pl, fg };
  });

  let { org, items, ted, mus, bom, rota, pl, fg } = ctx;
  const firmaId = org.firma.id;
  const today = new Date().toISOString().slice(0, 10);

  // Commit sonrası DB'den taze ID'ler (API FK için)
  ted.length = 0;
  mus.length = 0;
  {
    const rows = (await pool.query(
      `SELECT * FROM partners WHERE company_id=$1 AND partner_code LIKE $2 ORDER BY id`,
      [firmaId, `${def.prefix}-%`]
    )).rows;
    for (const r of rows) {
      if (r.partner_type === 'Tedarikci') ted.push(r);
      else mus.push(r);
    }
    const itemRows = (await pool.query(
      `SELECT * FROM items WHERE item_code LIKE $1`, [`${def.prefix}-%`]
    )).rows;
    for (const r of itemRows) items[r.item_code] = r;
    bom = (await pool.query(
      `SELECT * FROM boms WHERE company_id=$1 AND bom_code=$2`, [firmaId, `${def.prefix}-BOM-01`]
    )).rows[0] || bom;
    rota = (await pool.query(
      `SELECT * FROM routings WHERE company_id=$1 AND route_code=$2`, [firmaId, `${def.prefix}-R01`]
    )).rows[0] || rota;
    pl = (await pool.query(
      `SELECT * FROM price_lists WHERE company_id=$1 AND list_code=$2`, [firmaId, `${def.prefix}-SAT`]
    )).rows[0] || pl;
    fg = items[def.bomFg] || fg;
    log(`  DB taze: partner=${ted.length + mus.length} item=${Object.keys(items).length} bom=${bom?.id || '-'} `);
  }

  // —— CRM (SQL — company_id garanti) ——
  const stage = (await pool.query(`SELECT id FROM crm_opportunity_stages ORDER BY id LIMIT 1`)).rows[0];
  const leads = [];
  const firsatlar = [];
  await withTransaction(pool, async (client) => {
    for (let i = 0; i < 6; i++) {
      const code = `${def.prefix}-ADAY-${i + 1}`;
      let L = (await client.query(`SELECT * FROM crm_leads WHERE lead_code=$1`, [code])).rows[0];
      if (!L) {
        L = (await client.query(
          `INSERT INTO crm_leads (
             lead_code, lead_name, status, priority, telefon, mobile_phone, email, website,
             address, il, district, country, postal_code, sektor_code, bulma_yontemi,
             tercih_sebebi, notlar, company_id, is_active
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'TR','38000',$12,'Fuar','Fiyat/kalite',$13,$14,TRUE)
           RETURNING *`,
          [
            code, `${def.prefix} Aday ${i + 1} — ${def.city}`,
            i % 2 ? 'Nitelikli' : 'Yeni', i % 3 ? 'Yuksek' : 'Normal',
            `0332${5100000 + i}`, `0532${8100000 + i}`,
            `aday${i + 1}@${def.code.toLowerCase()}.ornek`,
            `https://aday${i + 1}.ornek.local`,
            `${def.city} Aday Sk No ${i + 1}`, def.city, def.district,
            def.code, def.tag, firmaId,
          ]
        )).rows[0];
      } else if (!L.company_id) {
        await client.query(`UPDATE crm_leads SET company_id=$1 WHERE id=$2`, [firmaId, L.id]);
        L.company_id = firmaId;
      }
      leads.push(L);
      bump('crm-adaylar');
    }

    // Eski prefix'li kayıtlara company_id yaz
    await client.query(
      `UPDATE crm_leads SET company_id=$1 WHERE company_id IS NULL AND lead_code LIKE $2`,
      [firmaId, `${def.prefix}-%`]
    );

    for (let i = 0; i < 5; i++) {
      const code = `${def.prefix}-KON-${i + 1}`;
      let row = (await client.query(`SELECT * FROM crm_contacts WHERE kontak_code=$1`, [code])).rows[0];
      if (!row) {
        row = (await client.query(
          `INSERT INTO crm_contacts (
             kontak_code, first_name, last_name, title, email, telefon, mobile_phone,
             partner_id, birincil, notlar, company_id, is_active
           ) VALUES ($1,$2,'Yılmaz','Satınalma',$3,$4,$5,$6,$7,$8,$9,TRUE) RETURNING *`,
          [
            code, `Ali${i + 1}`, `kontak${i + 1}@${def.code.toLowerCase()}.ornek`,
            `0332${5200000 + i}`, `0533${5200000 + i}`,
            mus[i % mus.length].id, i === 0, def.tag, firmaId,
          ]
        )).rows[0];
      } else if (!row.company_id) {
        await client.query(`UPDATE crm_contacts SET company_id=$1 WHERE id=$2`, [firmaId, row.id]);
      }
      bump('crm-kontaklar');
    }

    for (let i = 0; i < 5; i++) {
      const code = `${def.prefix}-FRS-${i + 1}`;
      let f = (await client.query(`SELECT * FROM crm_opportunities WHERE firsat_code=$1`, [code])).rows[0];
      if (!f) {
        f = (await client.query(
          `INSERT INTO crm_opportunities (
             firsat_code, firsat_name, partner_id, stage_id, beklenen_gelir, currency_code,
             target_kapatma_date, plant_id, company_id, description, status, customer_type
           ) VALUES ($1,$2,$3,$4,$5,'TRY',CURRENT_DATE,$6,$7,$8,'Acik','Musteri') RETURNING *`,
          [
            code, `${def.prefix} Fırsat ${i + 1} — ${fg?.item_name || 'Mamul'}`,
            mus[i % mus.length].id, stage?.id,
            (fg?.sales_price || 100) * (50 + i * 20),
            org.plant.id, firmaId, def.tag,
          ]
        )).rows[0];
      } else if (!f.company_id) {
        await client.query(`UPDATE crm_opportunities SET company_id=$1 WHERE id=$2`, [firmaId, f.id]);
      }
      firsatlar.push(f);
      bump('crm-firsatlar');
    }

    for (let i = 0; i < 8; i++) {
      const code = `${def.prefix}-FYT-${i + 1}`;
      const exists = (await client.query(`SELECT id FROM crm_activities WHERE faaliyet_code=$1`, [code])).rows[0];
      if (!exists) {
        await client.query(
          `INSERT INTO crm_activities (
             faaliyet_code, partner_id, firsat_id, plant_id, company_id,
             start_date, end_date, konu, description, status, harcanan_dk, customer_type
           ) VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,CURRENT_DATE,$6,$7,'Tamamlandi',$8,'Musteri')`,
          [
            code, mus[i % mus.length].id,
            firsatlar[i % Math.max(firsatlar.length, 1)]?.id,
            org.plant.id, firmaId,
            `Ziyaret / görüşme ${i + 1}`, def.tag, 45 + i * 10,
          ]
        );
      } else {
        await client.query(
          `UPDATE crm_activities SET company_id=$1 WHERE faaliyet_code=$2 AND company_id IS NULL`,
          [firmaId, code]
        );
      }
      bump('crm-faaliyetler');
    }

    for (let i = 0; i < 5; i++) {
      const code = `${def.prefix}-GRV-${i + 1}`;
      const exists = (await client.query(`SELECT id FROM crm_tasks WHERE gorev_code=$1`, [code])).rows[0];
      if (!exists) {
        await client.query(
          `INSERT INTO crm_tasks (
             gorev_code, baslik, description, status, priority, son_date, company_id, partner_id
           ) VALUES ($1,$2,$3,$4,'Normal',CURRENT_DATE,$5,$6)`,
          [
            code, `${def.prefix} Görev ${i + 1}`, def.tag,
            i % 2 ? 'Acik' : 'Tamamlandi', firmaId, mus[i % mus.length].id,
          ]
        );
      } else {
        await client.query(
          `UPDATE crm_tasks SET company_id=$1 WHERE gorev_code=$2 AND company_id IS NULL`,
          [firmaId, code]
        );
      }
      bump('crm-gorevler');
    }
  });

  // —— Satış teklifleri (SQL) ——
  const teklifler = [];
  await withTransaction(pool, async (client) => {
    for (let i = 0; i < 4; i++) {
      const no = `${def.prefix}-TKL-${String(i + 1).padStart(2, '0')}`;
      let t = (await client.query(`SELECT * FROM sales_quotations WHERE quotation_no=$1`, [no])).rows[0];
      if (!t) {
        const m = mus[i % mus.length];
        const mamuller = def.items.filter((x) => x.type === 'Mamul').slice(0, 3);
        t = (await client.query(
          `INSERT INTO sales_quotations (
             quotation_no, partner_id, quotation_date, valid_date, currency_code, status,
             description, project_code, plant_id, price_list_id, company_id, payment_term_code
           ) VALUES ($1,$2,CURRENT_DATE,CURRENT_DATE+30,'TRY','Onayli',$3,$4,$5,$6,$7,$8) RETURNING *`,
          [
            no, m.id, `[${def.tag}] Örnek satış teklifi #${i + 1}`, def.tag,
            org.plant.id, pl?.id || null, firmaId, `${def.prefix}-OD30`,
          ]
        )).rows[0];
        let ln = 10;
        for (const it of mamuller) {
          const qty = 15 + i * 5;
          await client.query(
            `INSERT INTO sales_quotation_lines (
               quotation_id, line_no, item_id, quantity, uom_code, unit_price, amount_ex_tax, net_unit_price
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$6)`,
            [t.id, ln, items[it.code].id, qty, it.uom, it.price, qty * it.price]
          );
          ln += 10;
        }
      }
      teklifler.push(t);
      bump('satis-teklifleri');
    }
  });

  // —— Satış siparişleri + sevk/irsaliye/fatura ——
  for (let i = 0; i < 5; i++) {
    const m = mus[i % mus.length];
    const mamuller = def.items.filter((x) => x.type === 'Mamul').slice(0, 3);
    const r = await apiSoft('POST', '/sales_orders', {
      order_type: 'SatisSiparis',
      partner_id: m.id,
      order_date: today,
      status: 'Onayli',
      company_id: firmaId,
      plant_id: org.plant.id,
      warehouse_id: org.wh.mam.id,
      project_code: def.tag,
      description: `[${def.tag}] Örnek satış siparişi #${i + 1}`,
      price_list_id: pl?.id,
      currency_code: 'TRY',
      payment_term_code: `${def.prefix}-OD30`,
      delivery_date: today,
      customer_order_no: `CUS-${def.prefix}-${Date.now().toString(36)}-${i + 1}`,
      quotation_id: teklifler[i % teklifler.length]?.id,
      kalemler: mamuller.map((it, idx) => ({
        item_id: items[it.code].id,
        quantity: 8 + idx * 2,
        unit_price: it.price,
        stock_uom: it.uom,
        warehouse_id: org.wh.mam.id,
      })),
    }, firmaId);
    if (!r.ok) { log(`  SO: ${r.error.message}`); continue; }
    const so = r.data;
    bump('satis-siparisleri');
    catalog.sample_so = catalog.sample_so || so.order_no;

    if (i < 2) {
      const sevk = await apiSoft('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
        warehouse_id: org.wh.mam.id,
        company_id: firmaId,
        description: `[${def.tag}] Sevk emri SO ${so.order_no}`,
      }, firmaId);
      if (sevk.ok) {
        bump('sevk-emirleri');
        const irs = await apiSoft('POST', '/delivery_notes/sevk-emrinden', {
          shipment_order_id: sevk.data.id || sevk.data.shipment_order_id,
          company_id: firmaId,
          plant_id: org.plant.id,
          project_code: def.tag,
          description: `[${def.tag}] İrsaliye`,
          ship_city: def.city,
          ship_district: def.district,
          ship_country: 'Türkiye',
          ship_postal_code: '38000',
          ship_to_address: `${def.city} Sevk Adresi No:${i + 1}`,
          carrier_title: `${def.code} Nakliyat A.Ş.`,
          carrier_tax_id: '1234567890',
          driver_name: 'Ali',
          driver_last_name: 'Yılmaz',
          driver_national_id: '10000000146',
          vehicle_plate: def.code === 'GIDA' ? '42 OG 01' : '38 OD 01',
        }, firmaId);
        if (irs.ok) {
          bump('irsaliyeler');
          await apiSoft('PUT', `/delivery_notes/${irs.data.id}`, {
            ...irs.data,
            company_id: firmaId,
            plant_id: org.plant.id,
            warehouse_id: org.wh.mam.id,
            project_code: def.tag,
            ship_city: def.city,
            ship_district: def.district,
            ship_country: 'Türkiye',
            ship_postal_code: '38000',
            ship_to_address: `${def.city} Sevk Adresi No:${i + 1}`,
            carrier_title: `${def.code} Nakliyat A.Ş.`,
            carrier_tax_id: '1234567890',
            driver_name: 'Ali',
            driver_last_name: 'Yılmaz',
            driver_national_id: '10000000146',
            vehicle_plate: def.code === 'GIDA' ? '42 OG 01' : '38 OD 01',
          }, firmaId);
          const onay = await apiSoft('POST', `/delivery_notes/${irs.data.id}/onayla`, {
            warehouse_id: org.wh.mam.id,
          }, firmaId);
          if (!onay.ok && onay.error) log(`  irsaliye onay: ${onay.error.message}`);
          // Test ortamında GİB gönderimi simüle et
          await pool.query(
            `UPDATE delivery_notes
             SET e_document_status='Gonderildi', company_id=COALESCE(company_id,$2), project_code=COALESCE(project_code,$3)
             WHERE id=$1`,
            [irs.data.id, firmaId, def.tag]
          );
          const fat = await apiSoft('POST', `/delivery_notes/${irs.data.id}/fatura-olustur`, {
            description: `[${def.tag}] Satış faturası`,
          }, firmaId);
          if (fat.ok) {
            bump('satis-faturalari');
            await apiSoft('POST', `/invoices/${fat.data.id}/muhasebelestir`, {}, firmaId);
          } else if (fat.error) log(`  fatura: ${fat.error.message}`);
        } else if (irs.error) log(`  irsaliye: ${irs.error.message}`);
      } else if (sevk.error) log(`  sevk: ${sevk.error.message}`);
    }
  }

  // —— Satınalma talep / sipariş / mal kabul / alış fatura ——
  for (let i = 0; i < 3; i++) {
    try {
      const hms = def.items.filter((x) => x.type === 'Hammadde').slice(i * 2, i * 2 + 3);
      if (!hms.length) continue;
      const pr = await withTransaction(pool, async (client) => {
        const no = `${def.prefix}-TAL-${String(i + 1).padStart(2, '0')}`;
        const exists = (await client.query(`SELECT * FROM purchase_requisitions WHERE requisition_no=$1`, [no])).rows[0];
        if (exists) return exists;
        const t = (await client.query(
          `INSERT INTO purchase_requisitions (requisition_no, plant_id, status, description, company_id, project_code)
           VALUES ($1,$2,'Onayli',$3,$4,$5) RETURNING *`,
          [no, org.plant.id, `[${def.tag}] Örnek talep ${i + 1}`, firmaId, def.tag]
        )).rows[0];
        for (const it of hms) {
          await client.query(
            `INSERT INTO purchase_requisition_lines (requisition_id, item_id, quantity, uom_code)
             VALUES ($1,$2,$3,$4)`,
            [t.id, items[it.code].id, 100 + i * 20, it.uom]
          );
        }
        return t;
      });
      bump('satin-alma-talepleri');

      const poR = await apiSoft('POST', '/satin-alma-siparisleri', {
        partner_id: ted[i % ted.length].id,
        plant_id: org.plant.id,
        warehouse_id: org.wh.hmd.id,
        company_id: firmaId,
        order_date: today,
        status: 'Onayli',
        project_code: def.tag,
        description: `[${def.tag}] Örnek SA sipariş ${i + 1}`,
        currency_code: 'TRY',
        payment_term_code: `${def.prefix}-OD30`,
        delivery_date: today,
        requisition_id: pr.id,
        satirlar: hms.map((it) => ({
          item_id: items[it.code].id,
          quantity: 100 + i * 20,
          unit_price: it.price,
          uom_code: it.uom,
        })),
      }, firmaId);
      if (!poR.ok) { log(`  SA: ${poR.error.message}`); continue; }
      const po = poR.data;
      bump('satin-alma-siparisleri');
      await apiSoft('POST', `/satin-alma-siparisleri/${po.id}/onayla`, {}, firmaId);

      const mkR = await apiSoft('POST', '/mal-kabuller', {
        purchase_order_id: po.id,
        warehouse_id: org.wh.hmd.id,
        company_id: firmaId,
        description: `[${def.tag}] Örnek mal kabul ${i + 1}`,
        gkk_gerekli: true,
        internal_note: def.tag,
      }, firmaId);
      if (mkR.ok) {
        bump('mal-kabuller');
        catalog.sample_mk = catalog.sample_mk || mkR.data.receipt_no;
        const af = await apiSoft('POST', `/mal-kabuller/${mkR.data.id}/fatura-olustur`, {
          description: `[${def.tag}] Alış faturası`,
        }, firmaId);
        if (af.ok) {
          bump('alis-faturalari');
          await apiSoft('POST', `/invoices/${af.data.id}/muhasebelestir`, {}, firmaId);
        }
      } else if (mkR.error) log(`  MK: ${mkR.error.message}`);
    } catch (e) { log(`  SA: ${e.message}`); }
  }

  // —— Üretim emirleri (BOM + eşleşen rota) ——
  const bomRows = (await pool.query(
    `SELECT * FROM boms WHERE company_id=$1 AND bom_code LIKE $2 ORDER BY id`,
    [firmaId, `${def.prefix}-%`]
  )).rows;
  for (const [idx, b] of bomRows.slice(0, 4).entries()) {
    let routeForBom = (await pool.query(
      `SELECT * FROM routings WHERE company_id=$1 AND item_id=$2 ORDER BY id LIMIT 1`,
      [firmaId, b.finished_good_item_id]
    )).rows[0];
    if (!routeForBom) {
      // FG için rota yoksa ana rotayı kopyala / oluştur
      try {
        await withTransaction(pool, async (client) => {
          const code = `${def.prefix}-R-${b.bom_code.replace(/[^A-Z0-9]/gi, '').slice(-6) || idx + 1}`;
          routeForBom = (await client.query(
            `SELECT * FROM routings WHERE route_code=$1`, [code]
          )).rows[0];
          if (!routeForBom) {
            routeForBom = (await client.query(
              `INSERT INTO routings (
                 route_code, route_name, item_id, is_active, company_id, plant_id, varsayilan, notes
               ) VALUES ($1,$2,$3,TRUE,$4,$5,FALSE,$6) RETURNING *`,
              [code, `${b.bom_name || b.bom_code} Rota`, b.finished_good_item_id,
                firmaId, org.plant.id, def.tag]
            )).rows[0];
            let sira = 10;
            for (const op of def.ops.slice(0, 4)) {
              await client.query(
                `INSERT INTO routing_operations (route_id, line_no, operation_code, operation_name, work_center_id, sure_dk)
                 VALUES ($1,$2,$3,$4,$5,25)`,
                [routeForBom.id, sira, `OP${sira}`, op, org.wc.id]
              );
              sira += 10;
            }
          }
        });
      } catch (e) { log(`  rota-kopya: ${e.message}`); }
    }
    if (!routeForBom) continue;
    const r = await apiSoft('POST', '/uretim-emirleri', {
      item_id: b.finished_good_item_id,
      product_bom_id: b.id,
      route_id: routeForBom.id,
      plant_id: org.plant.id,
      company_id: firmaId,
      component_warehouse_id: org.wh.hmd.id,
      fg_warehouse_id: org.wh.mam.id,
      wip_warehouse_id: org.wh.ana.id,
      planlanan_quantity: 25 + idx * 10,
      order_type_id: 3,
      planli_kesin: 'Kesin',
      description: `[${def.tag}] Örnek UE ${b.bom_code}`,
      order_date: today,
    }, firmaId);
    if (r.ok) {
      bump('uretim-emirleri');
      catalog.sample_ue = catalog.sample_ue || r.data.order_no;
      await apiSoft('POST', `/uretim-emirleri/${r.data.id}/onayla`, {}, firmaId);
      if (idx === 0) await apiSoft('POST', `/uretim-emirleri/${r.data.id}/baslat`, {}, firmaId);
    } else log(`  UE: ${r.error.message}`);
  }

  // —— Bağımsız ihtiyaç / MRP ——
  try {
    await withTransaction(pool, async (client) => {
      for (let i = 0; i < 5; i++) {
        const mamul = def.items.filter((x) => x.type === 'Mamul')[i];
        if (!mamul) continue;
        const no = `${def.prefix}-BI-${i + 1}`;
        await client.query(
          `INSERT INTO mrp_independent_requirements
             (ihtiyac_no, item_id, quantity, uom_code, ihtiyac_date, source, company_id, plant_id, description, is_active)
           SELECT $1::text,$2::int,$3::numeric,$4::text,CURRENT_DATE+14,'Manuel',$5::int,$6::int,$7::text,TRUE
           WHERE NOT EXISTS (SELECT 1 FROM mrp_independent_requirements WHERE ihtiyac_no=$1::text)`,
          [no, items[mamul.code].id, 80 + i * 20, mamul.uom, firmaId, org.plant.id, def.tag]
        );
        bump('mrp-bagimsiz-ihtiyac');
      }
    });
  } catch (e) { log(`  BI: ${e.message}`); }

  // —— Finans nakit ——
  {
    let bank = (await pool.query(
      `SELECT * FROM fin_bank_accounts WHERE company_id=$1 AND account_code=$2`,
      [firmaId, `${def.prefix}-BH01`]
    )).rows[0];
    if (!bank) {
      const r = await apiSoft('POST', '/finans-nakit/banka-hesaplari', {
        account_code: `${def.prefix}-BH01`,
        account_name: `${def.code} Ana Banka`,
        iban: `TR${String(1000000000000000000 + firmaId).slice(0, 24)}`,
        currency_code: 'TRY',
        company_id: firmaId,
        is_active: true,
      }, firmaId);
      bank = r.data;
    }
    if (bank) bump('finans-banka-hesaplari');

    let kasa = (await pool.query(
      `SELECT * FROM fin_cash_accounts WHERE company_id=$1 AND cash_code=$2`,
      [firmaId, `${def.prefix}-KS01`]
    )).rows[0];
    if (!kasa) {
      const r = await apiSoft('POST', '/finans-nakit/kasa-hesaplari', {
        cash_code: `${def.prefix}-KS01`,
        cash_name: `${def.code} Merkez Kasa`,
        currency_code: 'TRY',
        company_id: firmaId,
        is_active: true,
      }, firmaId);
      kasa = r.data;
    }
    if (kasa) {
      bump('finans-kasa-hesaplari');
      const mov = await apiSoft('POST', '/finans-nakit/hareketler', {
        direction: 'Giris',
        amount: 25000 + Math.floor(Math.random() * 1000),
        cash_account_id: kasa.id,
        description: `[${def.tag}] Örnek kasa girişi ${today}`,
        movement_date: today,
        muhasebelestir: false,
        company_id: firmaId,
      }, firmaId);
      if (mov.ok) bump('finans-nakit-hareketleri');
      else if (mov.error) log(`  nakit: ${mov.error.message}`);
    }
  }

  // —— HR (idempotent yükle / oluştur) ——
  const depts = [];
  for (const [di, d] of def.hrDepts.entries()) {
    const code = `${def.prefix}-D${String(di + 1).padStart(2, '0')}`;
    let row = (await pool.query(
      `SELECT * FROM hr_departments WHERE company_id=$1 AND (department_code=$2 OR department_name=$3) LIMIT 1`,
      [firmaId, code, d]
    )).rows[0];
    if (!row) {
      const r = await apiSoft('POST', '/hr-org/departmanlar', {
        department_code: code,
        department_name: d,
        company_id: firmaId,
        plant_id: org.plant.id,
        is_active: true,
        description: def.tag,
      }, firmaId);
      row = r.data || (await pool.query(
        `SELECT * FROM hr_departments WHERE company_id=$1 AND department_name=$2 LIMIT 1`, [firmaId, d]
      )).rows[0];
    }
    if (row) { depts.push(row); bump('hr-departmanlar'); }
  }

  const positions = [];
  for (const [i, p] of ['Operatör', 'Usta', 'Mühendis', 'Satış Temsilcisi', 'Depocu'].entries()) {
    const code = `${def.prefix}-P${i + 1}`;
    let row = (await pool.query(
      `SELECT * FROM hr_positions WHERE company_id=$1 AND position_code=$2`, [firmaId, code]
    )).rows[0];
    if (!row) {
      const r = await apiSoft('POST', '/hr-org/pozisyonlar', {
        position_code: code,
        position_name: p,
        company_id: firmaId,
        is_active: true,
      }, firmaId);
      row = r.data;
    }
    if (row) { positions.push(row); bump('hr-pozisyonlar'); }
  }

  let leaveType = (await pool.query(
    `SELECT * FROM hr_leave_types WHERE company_id=$1 AND leave_code=$2`,
    [firmaId, `${def.prefix}-YILLIK`]
  )).rows[0];
  if (!leaveType) {
    const r = await apiSoft('POST', '/hr-izin/turler', {
      leave_code: `${def.prefix}-YILLIK`,
      leave_name: 'Yıllık İzin',
      company_id: firmaId,
      is_paid: true,
      unit: 'Gun',
      is_active: true,
    }, firmaId);
    leaveType = r.data;
  }
  if (leaveType) bump('hr-izin-turleri');

  const people = [];
  for (let i = 0; i < 8; i++) {
    const empNo = `${def.prefix}-P${String(i + 1).padStart(3, '0')}`;
    let emp = (await pool.query(
      `SELECT * FROM hr_employees WHERE company_id=$1 AND employee_no=$2`, [firmaId, empNo]
    )).rows[0];
    if (!emp) {
      const r = await apiSoft('POST', '/hr-personel', {
        company_id: firmaId,
        plant_id: org.plant.id,
        employee_no: empNo,
        first_name: ['Ayşe', 'Mehmet', 'Fatma', 'Ali', 'Zeynep', 'Hasan', 'Elif', 'Can'][i],
        last_name: ['Demir', 'Yılmaz', 'Kaya', 'Çelik', 'Şahin', 'Aydın', 'Öztürk', 'Arslan'][i],
        hire_date: '2024-01-15',
        birth_date: `199${i}-0${(i % 8) + 1}-15`,
        gender: i % 2 ? 'Erkek' : 'Kadin',
        marital_status: i % 2 ? 'Evli' : 'Bekar',
        email: `${def.prefix.toLowerCase()}.p${i + 1}@ornek.local`,
        phone: `0332${5300000 + i}`,
        mobile_phone: `0535${5300000 + i}`,
        address: `${def.city} Pers. Mah. No ${i + 1}`,
        department_id: depts[i % Math.max(depts.length, 1)]?.id,
        position_id: positions[i % Math.max(positions.length, 1)]?.id,
        contract_type: 'BelirsizSureli',
        employee_type: 'Normal',
        nationality_code: 'TR',
        country_code: 'TR',
        gross_amount: 35000 + i * 2500,
        iban: `TR00${String(1000000000000000 + i).slice(0, 16)}`,
        bank_name: 'Örnek Bank',
        sgk_sicil_no: `SGK${def.prefix}${i + 1}`,
        description: def.tag,
        emergency_contact_name: 'Acil Kişi',
        emergency_contact_phone: '05320000000',
      }, firmaId);
      emp = r.data;
    }
    if (emp) { people.push(emp); bump('hr-personel'); }
  }

  if (leaveType && people[0]) {
    const lr = await apiSoft('POST', '/hr-izin/talepler', {
      company_id: firmaId,
      employee_id: people[0].id,
      leave_type_id: leaveType.id,
      start_date: today,
      end_date: today,
      quantity: 1,
      unit: 'Gun',
      description: `[${def.tag}] Örnek izin ${today}`,
      status: 'Gonderildi',
    }, firmaId);
    if (lr.ok) bump('hr-izin-talepleri');
    else if (lr.error && !lr.dup) log(`  izin talep: ${lr.error.message}`);
  }

  // —— Kalite kontrol planı ——
  {
    const kk = await apiSoft('POST', '/kk-kontrol-planlari', {
      plan_code: `${def.prefix}-KKP01`,
      plan_name: `${def.code} Giriş KK Planı`,
      company_id: firmaId,
      is_active: true,
      description: def.tag,
      satirlar: [
        { characteristic_name: 'Görsel', method: 'Göz', sample_size: 5 },
        { characteristic_name: 'Ölçüm', method: 'Kumpas', sample_size: 3 },
      ],
    }, firmaId);
    if (kk.ok || kk.dup) bump('kk-kontrol-planlari');
  }

  // —— Transfer emri ——
  {
    const tr = await apiSoft('POST', '/transfer-emirleri', {
      source_warehouse_id: org.wh.hmd.id,
      target_warehouse_id: org.wh.ana.id,
      company_id: firmaId,
      plant_id: org.plant.id,
      description: `[${def.tag}] Örnek transfer ${Date.now().toString(36)}`,
      satirlar: [{
        item_id: items[def.items.find((x) => x.type === 'Hammadde').code].id,
        quantity: 5,
      }],
    }, firmaId);
    if (tr.ok) bump('transfer-emirleri');
    else if (tr.error) log(`  transfer: ${tr.error.message}`);
  }

  // —— Sayım ——
  {
    const sy = await apiSoft('POST', '/sayim-belgeleri', {
      warehouse_id: org.wh.hmd.id,
      company_id: firmaId,
      plant_id: org.plant.id,
      description: `[${def.tag}] Örnek sayım ${Date.now().toString(36)}`,
      satirlar: def.items.filter((x) => x.type === 'Hammadde').slice(0, 4).map((it) => ({
        item_id: items[it.code].id,
        counted_quantity: 100,
      })),
    }, firmaId);
    if (sy.ok) bump('sayim-belgeleri');
    else if (sy.error) log(`  sayım: ${sy.error.message}`);
  }

  // Gerçek DB sayımları (katalog doğruluğu)
  const dbCounts = {};
  const qn = async (key, sql, params = [firmaId]) => {
    try { dbCounts[key] = (await pool.query(sql, params)).rows[0].n; } catch (_) { /* skip */ }
  };
  await qn('cari-kartlari', `SELECT count(*)::int n FROM partners WHERE company_id=$1 AND partner_code LIKE '${def.prefix}-%'`);
  await qn('stok-karti', `SELECT count(*)::int n FROM items WHERE item_code LIKE '${def.prefix}-%'`);
  await qn('urun-agaci', `SELECT count(*)::int n FROM boms WHERE company_id=$1 AND bom_code LIKE '${def.prefix}-%'`);
  await qn('routings', `SELECT count(*)::int n FROM routings WHERE company_id=$1 AND route_code LIKE '${def.prefix}-%'`);
  await qn('satis-teklifleri', `SELECT count(*)::int n FROM sales_quotations WHERE company_id=$1 AND quotation_no LIKE '${def.prefix}-%'`);
  await qn('satis-siparisleri', `SELECT count(*)::int n FROM sales_orders WHERE company_id=$1`);
  await qn('satin-alma-siparisleri', `SELECT count(*)::int n FROM purchase_orders WHERE company_id=$1`);
  await qn('uretim-emirleri', `SELECT count(*)::int n FROM production_orders WHERE company_id=$1`);
  await qn('irsaliyeler', `SELECT count(*)::int n FROM delivery_notes WHERE company_id=$1`);
  await qn('faturalar', `SELECT count(*)::int n FROM invoices WHERE company_id=$1`);
  await qn('crm-adaylar', `SELECT count(*)::int n FROM crm_leads WHERE company_id=$1`);
  await qn('crm-firsatlar', `SELECT count(*)::int n FROM crm_opportunities WHERE company_id=$1`);
  await qn('crm-kontaklar', `SELECT count(*)::int n FROM crm_contacts WHERE company_id=$1`);
  await qn('crm-faaliyetler', `SELECT count(*)::int n FROM crm_activities WHERE company_id=$1`);
  await qn('crm-gorevler', `SELECT count(*)::int n FROM crm_tasks WHERE company_id=$1`);
  await qn('hr-personel', `SELECT count(*)::int n FROM hr_employees WHERE company_id=$1`);
  await qn('hr-departmanlar', `SELECT count(*)::int n FROM hr_departments WHERE company_id=$1`);
  await qn('stok-partileri', `SELECT count(*)::int n FROM item_lots WHERE company_id=$1 AND lot_no LIKE '${def.prefix}-%'`);
  await qn('mrp-bagimsiz-ihtiyac', `SELECT count(*)::int n FROM mrp_independent_requirements WHERE company_id=$1 AND ihtiyac_no LIKE '${def.prefix}-%'`);
  catalog.db_counts = dbCounts;
  catalog.counts = { ...catalog.counts, ...dbCounts };

  catalog.firma_id = firmaId;
  catalog.plant = org.plant.plant_code;
  catalog.how_to_filter = {
    ui: `Üst bardan firma = ${def.code}. Açıklama/project: ${def.tag}`,
    sql: `company_id=${firmaId} AND (project_code='${def.tag}' OR description ILIKE '%${def.tag}%' OR item_code LIKE '${def.prefix}-%')`,
  };
  return catalog;
}

async function main() {
  const keys = argFirma ? [argFirma.toUpperCase()] : ['GIDA', 'DOKUM'];
  const report = { generatedAt: new Date().toISOString(), sectors: [] };
  // finance seed once
  try {
    require('child_process').execSync('node scripts/qa/ensure-finance-seed.js', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'inherit',
    });
  } catch (_) { /* ignore */ }

  for (const k of keys) {
    const def = SECTORS[k];
    if (!def) throw new Error(`Bilinmeyen firma: ${k}`);
    log(`\n========== ${k} zengin örnek veri ==========`);
    const cat = await seedSector(def);
    report.sectors.push(cat);
    log(JSON.stringify(cat.counts, null, 2));
  }

  const outDir = path.join(__dirname, '../../docs/qa');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'ornek-veri-katalog.json'), JSON.stringify(report, null, 2));

  const md = [
    '# Örnek Veri Kataloğu — GIDA & DOKUM',
    '',
    `Üretim: ${report.generatedAt}`,
    '',
    'Bu set, rapor eksiklerini **gerçek ekran/alan** üzerinden düzeltmek için hazırlandı. Her firma kendi şirket kurgusuyla (cari, stok, BOM, rota, CRM, SA/SO, UE, irsaliye, fatura, finans, HR, kalite, transfer, sayım) doldurulur.',
    '',
    '## Firmalar',
    '',
    '| Firma | Şirket | Etiket | Kod öneki | Şehir |',
    '|---|---|---|---|---|',
    '| GIDA | Anadolu Süt ve Süt Ürünleri A.Ş. | `ORNEK-GIDA-2026` | `OG-*` | Konya |',
    '| DOKUM | Anadolu Döküm Sanayi A.Ş. | `ORNEK-DOKUM-2026` | `OD-*` | Kayseri |',
    '',
    '## Nasıl filtrelerim?',
    '',
    '1. Üst bardan firma seç: **GIDA** veya **DOKUM**',
    '2. Belge listelerinde `project_code` / açıklama: `ORNEK-GIDA-2026` / `ORNEK-DOKUM-2026`',
    '3. Stok/cari: kod öneki `OG-` / `OD-`',
    '',
    '## Örnek stok / cari kodları',
    '',
    '- GIDA mamul: `OG-M01` Tam Yağlı Süt 1L · `OG-M03` Sade Yoğurt · `OG-M04` Beyaz Peynir',
    '- GIDA hammadde: `OG-H01` Çiğ İnek Sütü · `OG-A01` PET Şişe',
    '- DOKUM mamul: `OD-M01` Fren Diski · `OD-M02` Motor Blok · `OD-M04` Pompa Gövdesi',
    '- DOKUM hammadde: `OD-H01` Pik Demir · `OD-A01` Kalıp Kumu',
    '- Cari: `OG-T01`…`OG-T06` / `OG-M01`…`OG-M06` · `OD-T*` / `OD-M*`',
    '',
  ];
  for (const s of report.sectors) {
    md.push(`## ${s.firma}`);
    md.push(`Filtre: \`${s.how_to_filter.ui}\``);
    if (s.sample_so) md.push(`Örnek SO: \`${s.sample_so}\``);
    if (s.sample_ue) md.push(`Örnek UE: \`${s.sample_ue}\``);
    if (s.sample_mk) md.push(`Örnek MK: \`${s.sample_mk}\``);
    md.push('');
    md.push('| Ekran / alan grubu | Kayıt |');
    md.push('|---|---:|');
    for (const [k, v] of Object.entries(s.counts).sort((a, b) => b[1] - a[1])) {
      md.push(`| ${k} | ${v} |`);
    }
    md.push('');
  }
  md.push('## Çalıştırma');
  md.push('```bash');
  md.push('npm run qa:ornek-all          # GIDA + DOKUM');
  md.push('npm run qa:ornek-gida         # yalnız süt');
  md.push('npm run qa:ornek-dokum        # yalnız döküm');
  md.push('```');
  md.push('');
  md.push('Idempotent: mevcut `OG-*` / `OD-*` master veriyi silmez; eksikleri tamamlar, belge zincirine yeni örnekler ekler.');
  md.push('');
  md.push('Not: `TEST-SUT-*` / `TEST-DKM-*` tam döngü verisi ayrıdır; bu katalog onun üzerine ek ORNEK katmanıdır.');
  fs.writeFileSync(path.join(outDir, '11-ornek-veri-katalog.md'), md.join('\n'));
  log('\nYazıldı: docs/qa/11-ornek-veri-katalog.md');
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
