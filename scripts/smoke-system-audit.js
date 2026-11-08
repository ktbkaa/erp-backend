/**
 * Sistem duman taraması — ekran endpoint’leri + firma kapsamlı veri.
 *   node scripts/smoke-system-audit.js [ELEK|TEKS]
 */
require('dotenv').config();
const pool = require('../db');

const BASE = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const CODE = String(process.argv[2] || 'ELEK').toUpperCase();

async function api(path, firmaId) {
  const headers = { 'X-Kullanici-Kodu': 'owner' };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  const r = await fetch(BASE + path, { headers });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: r.status, data };
}

function count(data) {
  if (Array.isArray(data)) return data.length;
  if (data?.rows && Array.isArray(data.rows)) return data.rows.length;
  if (data?.items && Array.isArray(data.items)) return data.items.length;
  return null;
}

async function main() {
  const firma = (await pool.query(
    `SELECT id, company_code, company_name FROM companies WHERE company_code=$1`,
    [CODE]
  )).rows[0];
  if (!firma) throw new Error(`${CODE} yok`);
  const fid = firma.id;
  console.log('Firma', firma.company_code, fid);

  const checks = [
    ['/companies', false],
    ['/items', true],
    ['/partners', true],
    ['/sales_orders', true],
    ['/satis-teklifleri', true],
    ['/satin-alma-siparisleri', true],
    ['/mal-kabuller', true],
    ['/uretim-emirleri', true],
    ['/urun-agaclari', true],
    ['/routings', true],
    ['/invoices', true],
    ['/delivery_notes', true],
    ['/sevk-emirleri', true],
    ['/mrp/calismalar', true],
    ['/kk-emirleri?direction=GKK', true],
    ['/kk-emirleri?direction=CKK', true],
    ['/giris-kontrolleri', true],
    ['/crm-adaylar', true],
    ['/crm-firsatlar', true],
    ['/crm-faaliyetler', true],
    ['/crm-gorevler', true],
    ['/prj-projeler', true],
    ['/prj-isler', true],
    ['/hr-personel', true],
    ['/hr-org/departmanlar', true],
    ['/finans-nakit/kasa-hesaplari', true],
    ['/finans-nakit/banka-hesaplari', true],
    ['/tahsilat-odemeler', true],
    ['/is-yerleri', true],
    ['/warehouses', true],
  ];

  const empty = [];
  const errors = [];
  const ok = [];
  for (const [path, scoped] of checks) {
    const { status, data } = await api(path, scoped ? fid : null);
    if (status >= 400) {
      errors.push({ path, status, hata: data?.hata || data });
      continue;
    }
    const n = count(data);
    if (n === 0) empty.push(path);
    else ok.push({ path, n });
  }

  // Aksiyon bayrakları — app.js normalize mantığı kopyası (kritik ekranlar)
  const fs = require('fs');
  const app = fs.readFileSync(require('path').join(__dirname, '../public/app.js'), 'utf8');
  const mustHaveFull = ['stok-karti', 'cari-kartlari', 'companies', 'satis-siparisleri', 'uretim-emirleri', 'prj-projeler', 'hr-personel', 'crm-adaylar'];
  const mustHaveIncele = ['kk-emirleri-gkk', 'kk-emirleri-ckk', 'giris-kontrolleri', 'onaylarim'];
  for (const id of mustHaveFull) {
    if (!new RegExp(`id:\\s*'${id}'[\\s\\S]*?crud:\\s*true`).test(app)) {
      errors.push({ path: `screen:${id}`, status: 0, hata: 'crud:true bekleniyor' });
    }
  }
  // updateActionButtons listActions mantığı var mı
  if (!app.includes('listActions')) {
    errors.push({ path: 'updateActionButtons', status: 0, hata: 'listActions yok' });
  }

  const report = {
    firma: { id: fid, code: firma.company_code, name: firma.company_name },
    ok_count: ok.length,
    empty,
    errors,
    sample_ok: ok.slice(0, 12),
  };
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
