/**
 * Sistem sağlık taraması: DB bütünlük, API firma kapsamı, kritik uçlar.
 * Çıktı: /opt/cursor/artifacts/system-audit/results.json
 */
import { writeFileSync, mkdirSync } from 'fs';
import pg from 'pg';
import { readFileSync } from 'fs';

const OUT = '/opt/cursor/artifacts/system-audit';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:3000';
const FIRMA_TEKS = 2;
const FIRMA_OTHER = 3;

function loadEnv() {
  try {
    const raw = readFileSync('/workspace/.env', 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (_) {}
}
loadEnv();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || process.env.DB_HOST,
  port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
  user: process.env.PGUSER || process.env.DB_USER,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  database: process.env.PGDATABASE || process.env.DB_NAME,
});

const findings = [];
function add(severity, area, title, detail, fix = null) {
  findings.push({ severity, area, title, detail, fix, at: new Date().toISOString() });
}

async function q(sql, params = []) {
  return (await pool.query(sql, params)).rows;
}

async function api(path, { firmaId, method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch (_) {}
  return { status: r.status, json };
}

async function dbChecks() {
  const teks = await q(`SELECT id, company_code, company_name FROM companies WHERE id=$1`, [FIRMA_TEKS]);
  if (!teks[0]) add('P0', 'DB', 'TEKS firma yok', 'id=2 bulunamadı');
  else add('OK', 'DB', 'TEKS firma mevcut', `${teks[0].company_code} — ${teks[0].company_name}`);

  const plantMis = await q(`
    SELECT s.id, s.item_code, s.company_id stok_firma, iy.id plant_id, iy.company_id iy_firma
    FROM items s
    JOIN item_plants siy ON siy.item_id=s.id
    JOIN plants iy ON iy.id=siy.plant_id
    WHERE s.company_id IS NOT NULL AND iy.company_id IS NOT NULL AND s.company_id<>iy.company_id
  `);
  if (plantMis.length) add('P0', 'DB', 'Stok–işyeri firma uyumsuzluğu', `${plantMis.length} kayıt`, 'item_plants veya plants.company_id düzelt');
  else add('OK', 'DB', 'Stok–işyeri firma uyumu', '0 uyumsuzluk');

  const paramMis = await q(`
    SELECT fp.id, fp.item_id, fp.company_id, fp.plant_id, iy.company_id iy_firma
    FROM item_company_params fp
    JOIN plants iy ON iy.id=fp.plant_id
    WHERE fp.plant_id IS NOT NULL AND fp.company_id<>iy.company_id
  `);
  if (paramMis.length) add('P0', 'DB', 'Firma param–işyeri uyumsuzluğu', `${paramMis.length} kayıt`);
  else add('OK', 'DB', 'Firma param–işyeri uyumu', '0 uyumsuzluk');

  const orphans = await q(`
    SELECT 'warehouses_orphan_plant' t, COUNT(*)::int c FROM warehouses w
      LEFT JOIN plants iy ON iy.id=w.plant_id WHERE w.plant_id IS NOT NULL AND iy.id IS NULL
    UNION ALL SELECT 'item_plants_orphan', COUNT(*)::int FROM item_plants siy
      LEFT JOIN plants iy ON iy.id=siy.plant_id WHERE iy.id IS NULL
    UNION ALL SELECT 'sm_orphan_wh', COUNT(*)::int FROM stock_movements h
      LEFT JOIN warehouses d ON d.id=h.warehouse_id WHERE h.warehouse_id IS NOT NULL AND d.id IS NULL
    UNION ALL SELECT 'sm_orphan_plant', COUNT(*)::int FROM stock_movements h
      LEFT JOIN plants iy ON iy.id=h.plant_id WHERE h.plant_id IS NOT NULL AND iy.id IS NULL
  `);
  for (const row of orphans) {
    if (row.c > 0) add('P1', 'DB', `Yetim kayıt: ${row.t}`, `${row.c}`);
    else add('OK', 'DB', `Yetim yok: ${row.t}`, '0');
  }

  const dups = await q(`
    SELECT 'dup_item_code' t, COUNT(*)::int c FROM (SELECT item_code FROM items GROUP BY 1 HAVING count(*)>1) x
    UNION ALL SELECT 'dup_partner_code', COUNT(*)::int FROM (SELECT partner_code FROM partners GROUP BY 1 HAVING count(*)>1) x
    UNION ALL SELECT 'dup_movement_no', COUNT(*)::int FROM (
      SELECT company_id, movement_no FROM stock_movements WHERE movement_no IS NOT NULL GROUP BY 1,2 HAVING count(*)>1
    ) x
  `);
  for (const row of dups) {
    if (row.c > 0) add('P1', 'DB', `Tekrarlayan kod: ${row.t}`, `${row.c}`);
    else add('OK', 'DB', `Tekrar yok: ${row.t}`, '0');
  }

  const empty = await q(`
    SELECT 'items_empty_name' t, COUNT(*)::int c FROM items WHERE coalesce(trim(item_name),'')=''
    UNION ALL SELECT 'partners_empty_name', COUNT(*)::int FROM partners WHERE coalesce(trim(partner_name),'')=''
  `);
  for (const row of empty) {
    if (row.c > 0) add('P1', 'DB', `Boş ad: ${row.t}`, `${row.c}`);
    else add('OK', 'DB', `Boş ad yok: ${row.t}`, '0');
  }

  const teksCounts = await q(`
    SELECT 'items' t, count(*)::int c FROM items WHERE company_id=$1
    UNION ALL SELECT 'partners', count(*)::int FROM partners WHERE company_id=$1
    UNION ALL SELECT 'warehouses', count(*)::int FROM warehouses w JOIN plants iy ON iy.id=w.plant_id WHERE iy.company_id=$1
    UNION ALL SELECT 'plants', count(*)::int FROM plants WHERE company_id=$1
    UNION ALL SELECT 'stock_movements', count(*)::int FROM stock_movements WHERE company_id=$1
    UNION ALL SELECT 'purchase_orders', count(*)::int FROM purchase_orders WHERE company_id=$1
    UNION ALL SELECT 'sales_orders', count(*)::int FROM sales_orders WHERE company_id=$1
    UNION ALL SELECT 'boms', count(*)::int FROM boms WHERE company_id=$1
    UNION ALL SELECT 'production_orders', count(*)::int FROM production_orders WHERE company_id=$1
  `, [FIRMA_TEKS]);
  const map = Object.fromEntries(teksCounts.map((r) => [r.t, r.c]));
  add('INFO', 'DB', 'TEKS veri özeti', JSON.stringify(map));
  if (map.partners === 0) add('P1', 'DB', 'TEKS cari yok', 'partners.company_id=2 → 0; satınalma/satış akışı bloke', 'Testte cari oluştur');
  if (map.items < 2) add('P1', 'DB', 'TEKS stok az', `items=${map.items}`);
  if (map.plants < 1) add('P0', 'DB', 'TEKS iş yeri yok', 'plants=0');
  if (map.warehouses < 1) add('P0', 'DB', 'TEKS depo yok', 'warehouses=0');
}

async function apiChecks() {
  const listStok = await api('/items?limit=50', { firmaId: FIRMA_TEKS });
  if (listStok.status !== 200) {
    add('P0', 'API', 'Stok listesi hata', `HTTP ${listStok.status}`);
    return;
  }
  const items = Array.isArray(listStok.json) ? listStok.json : (listStok.json?.rows || listStok.json?.data || []);
  add('OK', 'API', 'Stok listesi TEKS', `${items.length} kayıt`);

  if (items.length) {
    const id = items[0].id;
    const getOk = await api(`/items/${id}`, { firmaId: FIRMA_TEKS });
    if (getOk.status !== 200) add('P0', 'API', 'Stok GET TEKS 404 (Düzelt boş form riski)', `id=${id} HTTP ${getOk.status}`);
    else add('OK', 'API', 'Stok GET TEKS', `id=${id} kod=${getOk.json?.item_code || getOk.json?.kod}`);

    const getOther = await api(`/items/${id}`, { firmaId: FIRMA_OTHER });
    if (getOther.status === 404) {
      add('OK', 'API', 'Stok GET firma izolasyonu', `OTHER → 404`);
    } else if (getOther.status === 200) {
      const linked = await q(`
        SELECT 1 FROM item_plants siy JOIN plants iy ON iy.id=siy.plant_id
        WHERE siy.item_id=$1 AND iy.company_id=$2
        UNION ALL
        SELECT 1 FROM item_company_params fp WHERE fp.item_id=$1 AND fp.company_id=$2 AND fp.is_active IS DISTINCT FROM FALSE
      `, [id, FIRMA_OTHER]);
      if (!linked.length) {
        add('P0', 'API', 'Stok GET firma izolasyonu kırık', `TEKS stok id=${id} OTHER firmadan 200`);
      } else {
        add('OK', 'API', 'Stok GET OTHER (bağlı)', `HTTP ${getOther.status}`);
      }
    } else {
      add('INFO', 'API', 'Stok GET OTHER', `HTTP ${getOther.status}`);
    }
  }

  const listCari = await api('/partners?limit=50', { firmaId: FIRMA_TEKS });
  if (listCari.status !== 200) add('P0', 'API', 'Cari listesi hata', `HTTP ${listCari.status}`);
  else {
    const caris = Array.isArray(listCari.json) ? listCari.json : (listCari.json?.rows || listCari.json?.data || []);
    add(caris.length ? 'OK' : 'P1', 'API', 'Cari listesi TEKS', `${caris.length} kayıt`);
  }

  const endpoints = [
    '/companies',
    '/is-yerleri',
    '/warehouses',
    '/olcu-birimleri',
    '/para-birimleri',
    '/doviz-kurlari',
    '/kod-serileri',
    '/hareket-kodlari',
    '/belge-tipleri',
    '/stok-hareketleri?limit=20',
    '/meta/ekranlar',
  ];
  for (const ep of endpoints) {
    const r = await api(ep, { firmaId: FIRMA_TEKS });
    if (r.status >= 500) add('P0', 'API', `500: ${ep}`, `HTTP ${r.status}`);
    else if (r.status >= 400) add('P1', 'API', `4xx: ${ep}`, `HTTP ${r.status} ${String(JSON.stringify(r.json) || '').slice(0,120)}`);
    else add('OK', 'API', `OK: ${ep}`, `HTTP ${r.status}`);
  }
}

async function main() {
  await dbChecks();
  await apiChecks();
  const summary = {
    P0: findings.filter((f) => f.severity === 'P0').length,
    P1: findings.filter((f) => f.severity === 'P1').length,
    INFO: findings.filter((f) => f.severity === 'INFO').length,
    OK: findings.filter((f) => f.severity === 'OK').length,
  };
  const out = { generatedAt: new Date().toISOString(), firmaTeks: FIRMA_TEKS, summary, findings };
  writeFileSync(`${OUT}/results.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(summary));
  for (const f of findings.filter((x) => x.severity === 'P0' || x.severity === 'P1')) {
    console.log(`[${f.severity}] ${f.area}: ${f.title} — ${f.detail}`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
