'use strict';

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'screenTableRegistry.json');
let registry = null;

function loadRegistry() {
  if (!registry) {
    registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  }
  return registry;
}

function listScreens() {
  const reg = loadRegistry();
  return Object.values(reg)
    .map((s) => ({
      screenId: s.screenId,
      title: s.title,
      techId: s.techId || null,
      endpoint: s.endpoint || null,
      auditTablo: s.auditTablo || null,
      primaryTable: s.primaryTable || null,
      tableCount: (s.tables || []).length,
      tables: (s.tables || []).map((t) => t.name),
    }))
    .sort((a, b) => String(a.title).localeCompare(String(b.title), 'tr'));
}

function getScreen(screenId) {
  const reg = loadRegistry();
  return reg[screenId] || null;
}

async function tableColumns(pool, tableName) {
  const r = await pool.query(
    `
    SELECT column_name, data_type, is_nullable, column_default,
           character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
    `,
    [tableName],
  );
  return r.rows.map((c) => ({
    name: c.column_name,
    dataType: c.data_type,
    nullable: c.is_nullable === 'YES',
    defaultValue: c.column_default,
    maxLength: c.character_maximum_length,
    numericPrecision: c.numeric_precision,
    numericScale: c.numeric_scale,
  }));
}

async function enrichScreen(pool, screenId) {
  const base = getScreen(screenId);
  if (!base) return null;
  const tables = [];
  for (const t of base.tables || []) {
    const columns = await tableColumns(pool, t.name);
    tables.push({
      name: t.name,
      role: t.role || 'related',
      columnCount: columns.length,
      columns,
    });
  }
  return {
    screenId: base.screenId,
    title: base.title,
    techId: base.techId || null,
    endpoint: base.endpoint || null,
    auditTablo: base.auditTablo || null,
    primaryTable: base.primaryTable || null,
    tables,
  };
}

async function resolveField(pool, screenId, fieldKey) {
  const base = getScreen(screenId);
  if (!base) return null;
  const key = String(fieldKey || '').trim();
  if (!key) return null;

  const order = [...(base.tables || [])].sort((a, b) => {
    if (a.role === 'master' && b.role !== 'master') return -1;
    if (b.role === 'master' && a.role !== 'master') return 1;
    return 0;
  });

  for (const t of order) {
    const r = await pool.query(
      `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
      LIMIT 1
      `,
      [t.name, key],
    );
    if (r.rows[0]) {
      return {
        screenId: base.screenId,
        screenTitle: base.title,
        techId: base.techId || null,
        fieldKey: key,
        tableName: t.name,
        columnName: r.rows[0].column_name,
        dataType: r.rows[0].data_type,
        role: t.role || 'related',
        found: true,
      };
    }
  }

  return {
    screenId: base.screenId,
    screenTitle: base.title,
    techId: base.techId || null,
    fieldKey: key,
    tableName: base.primaryTable || null,
    columnName: key,
    dataType: null,
    role: 'ui',
    found: false,
    note: 'Bu alan adı formda var; bağlı tabloda birebir kolon bulunamadı (hesaplanan / birleşik / UI alanı olabilir).',
  };
}

const AUDIT_COL_CANDIDATES = [
  'olusturan_kullanici', 'olusturan', 'olusturan_id',
  'guncelleyen_kullanici', 'guncelleyen', 'guncelleyen_id',
  'olusturma_tarihi', 'guncelleme_tarihi', 'kayit_tarihi',
  'created_at', 'updated_at',
];

async function recordInfo(pool, screenId, recordId) {
  const base = getScreen(screenId);
  if (!base) return null;
  const id = Number(recordId);
  if (!Number.isFinite(id)) {
    return { screenId, error: 'Geçersiz kayıt id' };
  }

  const primary = base.primaryTable;
  let row = null;
  let availableCols = [];
  if (primary) {
    const cols = await pool.query(
      `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name = ANY($2::text[])
      `,
      [primary, AUDIT_COL_CANDIDATES],
    );
    availableCols = cols.rows.map((c) => c.column_name);
    if (availableCols.length) {
      try {
        const sel = ['id', ...availableCols].map((c) => `"${c}"`).join(', ');
        const r = await pool.query(`SELECT ${sel} FROM "${primary}" WHERE id = $1`, [id]);
        row = r.rows[0] || null;
      } catch (_) {
        row = null;
      }
    } else {
      try {
        const r = await pool.query(`SELECT id FROM "${primary}" WHERE id = $1`, [id]);
        row = r.rows[0] || null;
      } catch (_) {
        row = null;
      }
    }
  }

  // kişi id → ad
  let olusturanAd = null;
  if (row?.olusturan_id) {
    try {
      const k = await pool.query(
        `SELECT TRIM(CONCAT(COALESCE(ad,''),' ',COALESCE(soyad,''))) AS ad,
                COALESCE(kullanici_adi, kullanici_kodu) AS kod
         FROM kisiler WHERE id=$1`,
        [row.olusturan_id],
      );
      if (k.rows[0]) olusturanAd = k.rows[0].kod || k.rows[0].ad;
    } catch (_) { /* ignore */ }
  }

  const auditTablo = base.auditTablo || primary;
  let auditFirst = null;
  let auditLast = null;
  try {
    const a = await pool.query(
      `
      SELECT kullanici_kodu, islem, kayit_tarihi, yol, tablo_adi
      FROM audit_log
      WHERE kayit_id = $1
        AND (
          tablo_adi = $2
          OR tablo_adi = $3
          OR yol ILIKE '%' || $2 || '%'
        )
      ORDER BY id ASC
      `,
      [id, auditTablo, primary || auditTablo],
    );
    if (a.rows.length) {
      auditFirst = a.rows[0];
      auditLast = a.rows[a.rows.length - 1];
    }
  } catch (_) { /* ignore */ }

  const createdUser = row?.olusturan_kullanici || row?.olusturan || olusturanAd
    || auditFirst?.kullanici_kodu || null;
  const createdAt = row?.olusturma_tarihi || row?.kayit_tarihi || row?.created_at
    || auditFirst?.kayit_tarihi || null;
  const updatedUser = row?.guncelleyen_kullanici || row?.guncelleyen
    || (auditLast && auditLast !== auditFirst ? auditLast.kullanici_kodu : null)
    || null;
  const updatedAt = row?.guncelleme_tarihi || row?.updated_at
    || (auditLast && auditLast !== auditFirst ? auditLast.kayit_tarihi : null)
    || null;

  return {
    screenId: base.screenId,
    screenTitle: base.title,
    techId: base.techId || null,
    recordId: id,
    primaryTable: primary,
    auditTablo,
    olusturan: createdUser,
    olusturmaTarihi: createdAt,
    guncelleyen: updatedUser,
    guncellemeTarihi: updatedAt,
    kaynakAlanlar: availableCols,
    auditOzet: {
      ilk: auditFirst,
      son: auditLast,
    },
  };
}

module.exports = {
  loadRegistry,
  listScreens,
  getScreen,
  tableColumns,
  enrichScreen,
  resolveField,
  recordInfo,
};
