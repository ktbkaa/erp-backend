#!/usr/bin/env node
/**
 * Kritik ekran sözleşmesi denetimi.
 *
 * Paralel dallarda yapılan form değişikliklerinin (Firmalar/Depolar sekmeleri,
 * is_profile, MRP konsol, stok hareket finans alanları vb.) tema hattından
 * sessizce kaybolmasını engeller.
 *
 * Kullanım: node scripts/check-screen-contracts.js
 * Exit 0 = uyumlu, 1 = sözleşme ihlali.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'public', 'app.js');
const CONTRACTS = path.join(__dirname, 'screen-contracts.json');

function extractScreen(src, sid) {
  const re = new RegExp(`\\n\\s+{\\s*\\n\\s+id:\\s*'${sid}',`);
  const m = re.exec(src);
  if (!m) return null;
  const start = src.indexOf('{', m.index);
  let depth = 0;
  let inStr = null;
  let escape = false;
  let te = 0;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (escape) { escape = false; continue; }
    if (inStr) {
      if (c === '\\' && inStr !== '`') escape = true;
      else if (inStr === '`' && c === '$' && src[i + 1] === '{') { te += 1; i += 1; }
      else if (inStr === '`' && c === '}' && te) te -= 1;
      else if (c === inStr && !te) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function tabIds(body) {
  // id/label aynı satırda veya alt satırda olabilir
  const same = [...body.matchAll(/id:\s*'([^']+)'\s*,\s*label:/g)].map((m) => m[1]);
  const next = [...body.matchAll(/id:\s*'([^']+)'\s*,\s*\n\s*label:/g)].map((m) => m[1]);
  return [...new Set([...same, ...next])];
}

function kinds(body) {
  return [...new Set([...body.matchAll(/kind:\s*'([^']+)'/g)].map((m) => m[1]))];
}

function hasFlag(body, flag) {
  return new RegExp(`\\b${flag}\\s*:`).test(body);
}

function hasFieldKey(body, key) {
  return new RegExp(`key:\\s*'${key}'`).test(body);
}

function main() {
  const contracts = JSON.parse(fs.readFileSync(CONTRACTS, 'utf8'));
  const src = fs.readFileSync(APP, 'utf8');
  const errors = [];

  for (const [sid, spec] of Object.entries(contracts.screens || {})) {
    const body = extractScreen(src, sid);
    if (!body) {
      errors.push(`[${sid}] ekran MODULES içinde yok`);
      continue;
    }
    const tabs = tabIds(body);
    const ks = kinds(body);

    for (const t of spec.requiredTabs || []) {
      if (!tabs.includes(t)) errors.push(`[${sid}] eksik sekme: ${t} (var: ${tabs.join(',') || '—'})`);
    }
    for (const k of spec.requiredKinds || []) {
      if (!ks.includes(k)) errors.push(`[${sid}] eksik kind: ${k}`);
    }
    for (const [flag, need] of Object.entries(spec.requiredFlags || {})) {
      if (need && !hasFlag(body, flag)) errors.push(`[${sid}] eksik flag: ${flag}`);
    }
    for (const key of spec.requiredFieldKeys || []) {
      if (!hasFieldKey(body, key)) errors.push(`[${sid}] eksik alan: ${key}`);
    }
    for (const text of spec.requiredText || []) {
      // requiredText may live outside the screen object (shared consts) — check whole app
      if (!src.includes(text) && !body.includes(text)) {
        errors.push(`[${sid}] eksik metin/sembol: ${text}`);
      }
    }
    if (spec.title && !body.includes(`title: '${spec.title}'`) && !body.includes(`title: "${spec.title}"`)) {
      errors.push(`[${sid}] title beklenen '${spec.title}' değil`);
    }
  }

  // Global guards — helpers that screen kinds depend on
  const helpers = [
    'function renderStokFirmalarPane',
    'function renderStokDepolarPane',
    'function renderCariFirmalarPane',
    'function renderMrpParametrePane',
    'function isFirmaProfil',
    'function syncStokHareketTransferFields',
  ];
  for (const h of helpers) {
    if (!src.includes(h)) errors.push(`[helpers] eksik: ${h}`);
  }

  if (errors.length) {
    console.error('Screen contract check FAILED:\n');
    errors.forEach((e) => console.error(' -', e));
    console.error(`\n${errors.length} ihlal. Sözleşme: scripts/screen-contracts.json`);
    process.exit(1);
  }
  console.log(`Screen contract check OK (${Object.keys(contracts.screens).length} ekran).`);
}

main();
