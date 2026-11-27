#!/usr/bin/env node
/**
 * npm test'in CI sürümü: ekran sözleşmeleri + node:test (TAP), bilinen hatalar
 * listesine (known-test-failures.json) göre değerlendirilir.
 *
 *   node scripts/ci/run-tests.js            # yeni hata varsa exit 1
 *   node scripts/ci/run-tests.js --strict   # bilinen hatalar da kırar
 *
 * TAP çıktısı test-results/node-test.tap dosyasına da yazılır (CI artefaktı).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const strict = process.argv.includes('--strict');
const known = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'known-test-failures.json'), 'utf8')
).failures || [];

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: process.env,
    ...opts,
  });
}

/** TAP içinden yaprak (alt testi olmayan) başarısız testleri çıkarır. */
function parseLeafFailures(tap) {
  const lines = tap.split(/\r?\n/);
  const failures = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^(\s*)not ok \d+ - (.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    let failureType = null;
    let location = null;
    let error = null;
    for (let j = i + 1; j < lines.length; j += 1) {
      const l = lines[j];
      if (l.trim() === '...' && l.length - l.trimStart().length === indent + 2) break;
      const ft = l.match(/failureType: '([^']+)'/);
      if (ft) failureType = ft[1];
      const loc = l.match(/location: '([^']+)'/);
      if (loc && !location) location = loc[1];
      const er = l.match(/^\s*error: (.*)$/);
      if (er && !error) error = er[1].replace(/^['"]|['"]$/g, '');
    }
    if (failureType === 'subtestsFailed') continue;
    failures.push({
      name: m[2].replace(/\\#/g, '#'),
      location: location ? path.relative(ROOT, location.replace(/:\d+:\d+$/, '')) : null,
      failureType,
      error,
    });
  }
  return failures;
}

function isKnown(f) {
  return known.find((k) => {
    if (k.file && f.location && !f.location.endsWith(k.file.replace(/^\.\//, ''))) return false;
    return f.name.includes(k.match);
  });
}

function main() {
  console.log('▶ test:screens');
  const screens = run('node', ['scripts/check-screen-contracts.js'], { stdio: 'inherit' });
  if (screens.status !== 0) {
    console.error('✖ Ekran sözleşmeleri başarısız.');
    process.exit(screens.status || 1);
  }

  console.log('▶ node --test (TAP)');
  const t = run('node', ['--test', '--test-reporter=tap', 'tests/**/*.test.js']);
  const tap = `${t.stdout || ''}`;
  fs.mkdirSync(path.join(ROOT, 'test-results'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'test-results', 'node-test.tap'), tap);
  if (t.stderr) process.stderr.write(t.stderr);

  const summary = {};
  for (const key of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const m = tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm'));
    summary[key] = m ? Number(m[1]) : null;
  }
  console.log(`Özet: ${JSON.stringify(summary)}`);

  if (summary.tests == null) {
    console.error('✖ TAP özeti okunamadı (test koşucusu çöktü?).');
    console.error(tap.slice(-4000));
    process.exit(1);
  }

  const failures = parseLeafFailures(tap);
  const unexpected = [];
  const expected = [];
  for (const f of failures) {
    const k = isKnown(f);
    if (k && !strict) expected.push({ ...f, reason: k.reason });
    else unexpected.push(f);
  }
  const passingKnown = known.filter((k) => !failures.some((f) => f.name.includes(k.match)));

  for (const f of expected) {
    console.log(`⚠ Bilinen hata (yok sayıldı): ${f.name} [${f.location || '?'}]`);
  }
  for (const k of passingKnown) {
    console.log(`ℹ Bilinen hata listesindeki "${k.match}" bu koşumda geçti.`);
  }
  if (unexpected.length) {
    console.error(`✖ ${unexpected.length} yeni/beklenmeyen test hatası:`);
    for (const f of unexpected) {
      console.error(`  - ${f.name} [${f.location || '?'}] ${f.failureType || ''} ${f.error || ''}`);
    }
    process.exit(1);
  }
  if (t.status !== 0 && failures.length === 0) {
    console.error(`✖ node --test exit ${t.status} ama başarısız test bulunamadı.`);
    process.exit(t.status || 1);
  }
  console.log(`✔ Test kapısı geçti (${summary.pass}/${summary.tests} geçti, ${expected.length} bilinen hata).`);
}

if (require.main === module) main();
module.exports = { parseLeafFailures, isKnown };
