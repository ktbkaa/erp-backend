const fs = require('fs');
const path = require('path');
const { ROOT } = require('./config');

const logDir = path.join(ROOT, 'logs');
fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, 'panel.jsonl');

function append(entry) {
  const row = { ts: new Date().toISOString(), ...entry };
  fs.appendFileSync(logFile, `${JSON.stringify(row)}\n`, 'utf8');
  const line = `[${row.ts}] ${row.level || 'info'} ${row.message || ''}`;
  if (row.level === 'error') console.error(line, row.detail || '');
  else console.log(line);
  return row;
}

function recent(limit = 80) {
  if (!fs.existsSync(logFile)) return [];
  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map((l) => {
    try { return JSON.parse(l); } catch { return { message: l }; }
  }).reverse();
}

module.exports = { append, recent, logFile };
