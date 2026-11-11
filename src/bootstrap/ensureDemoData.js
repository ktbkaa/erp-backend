/**
 * Demo örnek veri yoksa (GIDA OG-* stokları) idempotent seed çalıştırır.
 * Ana süreci bloklamamak için ayrı child process — pool.end çakışması olmaz.
 * Veri SİLMEZ; rich-ornek-veri üzerine ekler.
 */
const { spawn } = require('child_process');
const path = require('path');

async function demoDataMissing(pool) {
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM items WHERE item_code LIKE 'OG-%'`
  );
  return Number(r.rows[0]?.n || 0) < 5;
}

function runOrnekGida() {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, '..', '..', 'scripts', 'qa', 'rich-ornek-veri.js');
    const child = spawn(process.execPath, [script, '--firma=GIDA'], {
      cwd: path.join(__dirname, '..', '..'),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true, out: out.slice(-500) });
      else reject(new Error(`qa:ornek-gida exit ${code}: ${out.slice(-800)}`));
    });
  });
}

/**
 * @returns {Promise<{skipped?:boolean, reason?:string, seeded?:boolean, n?:number}>}
 */
async function ensureDemoData(pool) {
  if (process.env.AUTO_HEAL === '0' || process.env.AUTO_SEED === '0') {
    return { skipped: true, reason: 'disabled' };
  }
  const missing = await demoDataMissing(pool);
  if (!missing) {
    const r = await pool.query(`SELECT count(*)::int AS n FROM items WHERE item_code LIKE 'OG-%'`);
    return { skipped: true, reason: 'has-data', n: r.rows[0].n };
  }
  console.log('[heal] GIDA örnek veri eksik — seed başlıyor (silmez)…');
  await runOrnekGida();
  const after = await pool.query(`SELECT count(*)::int AS n FROM items WHERE item_code LIKE 'OG-%'`);
  return { seeded: true, n: after.rows[0].n };
}

module.exports = { ensureDemoData, demoDataMissing };
