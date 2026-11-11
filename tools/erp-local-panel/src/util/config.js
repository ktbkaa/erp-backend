const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.join(__dirname, '..', '..');

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath));
}

function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return { ...fallback };
    return { ...fallback, ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch {
    return { ...fallback };
  }
}

function getConfig() {
  const defaults = readJson(path.join(ROOT, 'config.default.json'), {});
  const local = readJson(path.join(ROOT, 'config.json'), {});
  const cfg = { ...defaults, ...local, schedule: { ...defaults.schedule, ...local.schedule }, steps: { ...defaults.steps, ...local.steps } };

  const panelEnv = loadEnvFile(path.join(ROOT, '.env'));
  if (panelEnv.PORT) cfg.port = Number(panelEnv.PORT) || cfg.port;
  if (panelEnv.ERP_ROOT) cfg.erpRoot = panelEnv.ERP_ROOT;
  if (panelEnv.PG_DUMP_PATH) cfg.pgDumpPath = panelEnv.PG_DUMP_PATH;

  cfg.erpRoot = String(cfg.erpRoot || '').trim().replace(/^["']|["']$/g, '');
  if (!cfg.backupDir) {
    cfg.backupDir = cfg.erpRoot
      ? path.join(cfg.erpRoot, 'backups')
      : path.join(ROOT, 'backups');
  }

  const erpEnv = cfg.erpRoot ? loadEnvFile(path.join(cfg.erpRoot, '.env')) : {};
  cfg.db = {
    host: panelEnv.DB_HOST || erpEnv.DB_HOST || 'localhost',
    port: panelEnv.DB_PORT || erpEnv.DB_PORT || '5432',
    user: panelEnv.DB_USER || erpEnv.DB_USER || 'postgres',
    database: panelEnv.DB_NAME || erpEnv.DB_NAME || 'postgres',
    password: panelEnv.DB_PASSWORD || erpEnv.DB_PASSWORD || '',
  };

  return cfg;
}

function saveConfig(patch) {
  const file = path.join(ROOT, 'config.json');
  const current = readJson(file, {});
  const next = {
    ...current,
    ...patch,
    schedule: { ...(current.schedule || {}), ...(patch.schedule || {}) },
    steps: { ...(current.steps || {}), ...(patch.steps || {}) },
  };
  fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
  return getConfig();
}

module.exports = { ROOT, getConfig, saveConfig, loadEnvFile };
