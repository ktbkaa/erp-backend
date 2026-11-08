/**
 * pg_dump yokken Node + `pg` ile düz SQL yedek.
 * ERP klasöründeki node_modules/pg tercih edilir; yoksa panel bağımlılığı.
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function loadPg(erpRoot) {
  const tries = [];
  if (erpRoot) tries.push(path.join(erpRoot, 'node_modules', 'pg'));
  tries.push('pg');
  let lastErr;
  for (const id of tries) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      return require(id);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`pg modülü yok (${lastErr?.message || 'require failed'}). ERP klasöründe npm install çalıştırın.`);
}

function qIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function sqlLiteral(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' && Number.isFinite(val)) return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString().replace(/'/g, "''")}'`;
  if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`;
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

/**
 * @param {object} opts
 * @param {{host:string,port:string|number,user:string,database:string,password:string}} opts.db
 * @param {string} opts.sqlFile
 * @param {string} [opts.erpRoot]
 */
async function nodeSqlBackup(opts) {
  const { Client } = loadPg(opts.erpRoot);
  const client = new Client({
    host: opts.db.host,
    port: Number(opts.db.port) || 5432,
    user: opts.db.user,
    password: opts.db.password || '',
    database: opts.db.database,
    connectionTimeoutMillis: 15000,
  });

  const lines = [];
  lines.push('-- ERP yerel panel Node yedek (pg_dump alternatifi)');
  lines.push(`-- ${new Date().toISOString()}`);
  lines.push(`-- DB: ${opts.db.database}@${opts.db.host}:${opts.db.port}`);
  lines.push('SET client_encoding = \'UTF8\';');
  lines.push('SET session_replication_role = replica;');
  lines.push('');

  await client.connect();
  try {
    const tables = await client.query(`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `);

    logger.append({
      level: 'info',
      message: `Node yedek: ${tables.rows.length} tablo`,
    });

    for (const { table_name: table } of tables.rows) {
      const colsRes = await client.query(
        `SELECT a.attname AS column_name
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname='public' AND c.relname=$1
           AND a.attnum > 0 AND NOT a.attisdropped
         ORDER BY a.attnum`,
        [table]
      );
      const cols = colsRes.rows.map((r) => r.column_name);
      if (!cols.length) continue;

      const colList = cols.map(qIdent).join(', ');
      lines.push(`-- TABLE public.${table}`);
      lines.push(`TRUNCATE TABLE ${qIdent(table)} CASCADE;`);

      const data = await client.query(
        `SELECT ${cols.map(qIdent).join(', ')} FROM ${qIdent(table)}`
      );
      for (const row of data.rows) {
        const vals = cols.map((c) => sqlLiteral(row[c])).join(', ');
        lines.push(`INSERT INTO ${qIdent(table)} (${colList}) VALUES (${vals});`);
      }
      lines.push('');
    }

    // sequence değerlerini koru
    const seqs = await client.query(`
      SELECT c.relname AS seq
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relkind='S'
      ORDER BY 1
    `);
    for (const { seq } of seqs.rows) {
      const last = await client.query(`SELECT last_value, is_called FROM ${qIdent(seq)}`);
      const row = last.rows[0];
      if (!row) continue;
      lines.push(
        `SELECT setval(${sqlLiteral(seq)}, ${Number(row.last_value)}, ${row.is_called ? 'true' : 'false'});`
      );
    }

    lines.push('SET session_replication_role = DEFAULT;');
    lines.push('-- EOF');
  } finally {
    await client.end().catch(() => {});
  }

  fs.mkdirSync(path.dirname(opts.sqlFile), { recursive: true });
  fs.writeFileSync(opts.sqlFile, lines.join('\n'), 'utf8');
  return {
    ok: true,
    method: 'node-sql',
    sqlFile: opts.sqlFile,
    bytes: fs.statSync(opts.sqlFile).size,
  };
}

module.exports = { nodeSqlBackup };
