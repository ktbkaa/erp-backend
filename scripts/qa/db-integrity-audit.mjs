/**
 * Veritabanı bütünlük denetimi — FK, orphan, negatif stok, mükerrer, durum
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function q(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return { ok: true, rows: r.rows, count: r.rowCount };
  } catch (err) {
    return { ok: false, error: err.message, rows: [], count: 0 };
  }
}

async function main() {
  const findings = [];
  const push = (sev, code, title, detail, count = null) => {
    findings.push({ severity: sev, code, title, detail, count });
  };

  const tables = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`);
  const fks = await q(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
  `);

  // Orphan samples for key ERP tables
  const orphanChecks = [
    {
      code: 'ORPHAN_SO_LINES',
      sql: `SELECT count(*)::int AS c FROM sales_order_lines l LEFT JOIN sales_orders s ON s.id=l.sales_order_id WHERE s.id IS NULL`,
      title: 'Satış sipariş satırı yetim',
    },
    {
      code: 'ORPHAN_PO_LINES',
      sql: `SELECT count(*)::int AS c FROM purchase_order_lines l LEFT JOIN purchase_orders s ON s.id=l.purchase_order_id WHERE s.id IS NULL`,
      title: 'SA sipariş satırı yetim',
    },
    {
      code: 'ORPHAN_INV_LINES',
      sql: `SELECT count(*)::int AS c FROM invoice_lines l LEFT JOIN invoices i ON i.id=l.invoice_id WHERE i.id IS NULL`,
      title: 'Fatura satırı yetim',
    },
    {
      code: 'ORPHAN_SM_LINES',
      sql: `SELECT count(*)::int AS c FROM stock_movement_lines l LEFT JOIN stock_movements h ON h.id=l.movement_id WHERE h.id IS NULL`,
      title: 'Stok hareket satırı yetim',
    },
    {
      code: 'ORPHAN_WO_COMP',
      sql: `SELECT count(*)::int AS c FROM production_order_components c LEFT JOIN production_orders o ON o.id=c.order_id WHERE o.id IS NULL`,
      title: 'ÜE bileşen yetim',
    },
    {
      code: 'BAD_ITEM_FK_SO',
      sql: `SELECT count(*)::int AS c FROM sales_order_lines l LEFT JOIN items i ON i.id=l.item_id WHERE l.item_id IS NOT NULL AND i.id IS NULL`,
      title: 'SO satırında geçersiz stok',
    },
    {
      code: 'BAD_ITEM_FK_PO',
      sql: `SELECT count(*)::int AS c FROM purchase_order_lines l LEFT JOIN items i ON i.id=l.item_id WHERE l.item_id IS NOT NULL AND i.id IS NULL`,
      title: 'PO satırında geçersiz stok',
    },
    {
      code: 'BAD_PARTNER_SO',
      sql: `SELECT count(*)::int AS c FROM sales_orders s LEFT JOIN partners p ON p.id=s.partner_id WHERE s.partner_id IS NOT NULL AND p.id IS NULL`,
      title: 'SO geçersiz cari',
    },
    {
      code: 'BAD_WH_SM',
      sql: `SELECT count(*)::int AS c FROM stock_movements h LEFT JOIN warehouses w ON w.id=h.warehouse_id WHERE h.warehouse_id IS NOT NULL AND w.id IS NULL`,
      title: 'Stok hareket geçersiz depo',
    },
  ];

  for (const c of orphanChecks) {
    const r = await q(c.sql);
    if (!r.ok) {
      push('info', c.code + '_SKIP', c.title + ' (sorgu atlandı)', r.error);
      continue;
    }
    const n = Number(r.rows[0]?.c || 0);
    if (n > 0) push('P1', c.code, c.title, `${n} kayıt`, n);
    else push('ok', c.code, c.title, '0', 0);
  }

  // Negatif kullanılabilir bakiye (özet)
  const neg = await q(`
    SELECT count(*)::int AS c FROM (
      SELECT h.warehouse_id, s.item_id,
             COALESCE(SUM(s.quantity * s.direction),0) AS bakiye
      FROM stock_movement_lines s
      JOIN stock_movements h ON h.id = s.movement_id
      WHERE COALESCE(s.stock_status,'Kullanilabilir') = 'Kullanilabilir'
      GROUP BY h.warehouse_id, s.item_id
      HAVING COALESCE(SUM(s.quantity * s.direction),0) < -0.0001
    ) x
  `);
  if (neg.ok) {
    const n = Number(neg.rows[0]?.c || 0);
    push(n > 0 ? 'P1' : 'ok', 'NEG_STOCK', 'Negatif kullanılabilir stok bakiyesi', `${n} depo-stok çifti`, n);
  } else push('info', 'NEG_STOCK_SKIP', 'Negatif stok sorgu', neg.error);

  // JE dengesizlik
  const je = await q(`
    SELECT count(*)::int AS c FROM (
      SELECT journal_entry_id,
             SUM(CASE WHEN direction='Borc' OR direction='D' OR direction ILIKE 'bor%' THEN amount ELSE 0 END) AS borc,
             SUM(CASE WHEN direction='Alacak' OR direction='C' OR direction ILIKE 'ala%' THEN amount ELSE 0 END) AS alacak
      FROM journal_entry_lines
      GROUP BY journal_entry_id
      HAVING ABS(
        SUM(CASE WHEN direction='Borc' OR direction='D' OR direction ILIKE 'bor%' THEN amount ELSE 0 END)
        - SUM(CASE WHEN direction='Alacak' OR direction='C' OR direction ILIKE 'ala%' THEN amount ELSE 0 END)
      ) > 0.01
    ) x
  `);
  if (je.ok) {
    const n = Number(je.rows[0]?.c || 0);
    push(n > 0 ? 'P0' : 'ok', 'JE_UNBALANCED', 'Dengesiz muhasebe fişi', `${n} belge`, n);
  } else {
    // alternatif kolon isimleri
    const je2 = await q(`
      SELECT count(*)::int AS c FROM (
        SELECT entry_id AS journal_entry_id,
               SUM(debit) AS borc, SUM(credit) AS alacak
        FROM journal_entry_lines
        GROUP BY entry_id
        HAVING ABS(SUM(debit)-SUM(credit)) > 0.01
      ) x
    `);
    if (je2.ok) {
      const n = Number(je2.rows[0]?.c || 0);
      push(n > 0 ? 'P0' : 'ok', 'JE_UNBALANCED', 'Dengesiz muhasebe fişi', `${n} belge`, n);
    } else push('info', 'JE_SKIP', 'Muhasebe denge sorgu', je.error || je2.error);
  }

  // Mükerrer şirket kodu
  const dupCo = await q(`SELECT company_code, count(*)::int AS c FROM companies GROUP BY company_code HAVING count(*)>1`);
  push(dupCo.rows.length ? 'P1' : 'ok', 'DUP_COMPANY', 'Mükerrer firma kodu', `${dupCo.rows.length} kod`, dupCo.rows.length);

  // Mükerrer stok kodu (firma içinde)
  const dupItem = await q(`
    SELECT company_id, item_code, count(*)::int AS c FROM items
    GROUP BY company_id, item_code HAVING count(*)>1
  `);
  push(dupItem.rows.length ? 'P1' : 'ok', 'DUP_ITEM', 'Mükerrer stok kodu', `${dupItem.rows.length} grup`, dupItem.rows.length);

  // Silinmiş belgelere bağlı açık satırlar (örnek SO)
  const silindi = await q(`
    SELECT count(*)::int AS c FROM sales_orders WHERE COALESCE(silindi,false)=true AND status NOT IN ('Iptal','Kapali')
  `);
  if (silindi.ok) {
    const n = Number(silindi.rows[0]?.c || 0);
    push(n > 0 ? 'P2' : 'ok', 'SOFTDEL_ACTIVE_SO', 'Soft-delete ama aktif status SO', `${n}`, n);
  }

  // Firma kapsamı: hareket company_id vs stok company_id uyumsuzluğu (örnek)
  const scope = await q(`
    SELECT count(*)::int AS c
    FROM stock_movements h
    JOIN stock_movement_lines l ON l.movement_id=h.id
    JOIN items i ON i.id=l.item_id
    WHERE h.company_id IS NOT NULL AND i.company_id IS NOT NULL AND h.company_id <> i.company_id
  `);
  if (scope.ok) {
    const n = Number(scope.rows[0]?.c || 0);
    push(n > 0 ? 'P1' : 'ok', 'CROSS_COMPANY_STOCK', 'Hareket-stok firma uyumsuzluğu', `${n} satır`, n);
  } else push('info', 'CROSS_COMPANY_SKIP', 'Firma kapsam sorgu', scope.error);

  // MRP run messages table
  const mrpMsg = await q(`SELECT count(*)::int AS c FROM mrp_run_messages`);
  push(mrpMsg.ok ? 'ok' : 'P2', 'MRP_MSG_TABLE', 'mrp_run_messages tablosu', mrpMsg.ok ? `${mrpMsg.rows[0].c} mesaj` : mrpMsg.error);

  const summary = {
    tables: tables.count,
    fkCount: fks.count,
    ok: findings.filter((f) => f.severity === 'ok').length,
    P0: findings.filter((f) => f.severity === 'P0').length,
    P1: findings.filter((f) => f.severity === 'P1').length,
    P2: findings.filter((f) => f.severity === 'P2').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  const out = {
    generatedAt: new Date().toISOString(),
    summary,
    findings,
    sampleOrphans: {},
  };

  let md = `# Veritabanı Bütünlük Denetimi\n\n`;
  md += `Tarih: ${out.generatedAt}\n\n`;
  md += `Tablolar: ${summary.tables} · FK: ${summary.fkCount}\n\n`;
  md += `| Sev | Kod | Başlık | Detay |\n|---|---|---|---|\n`;
  for (const f of findings) {
    md += `| ${f.severity} | \`${f.code}\` | ${f.title} | ${String(f.detail).replace(/\|/g, '/')} |\n`;
  }
  md += `\n## Özet\n\n`;
  md += `- OK: ${summary.ok}\n- P0: ${summary.P0}\n- P1: ${summary.P1}\n- P2: ${summary.P2}\n- Info: ${summary.info}\n`;

  fs.mkdirSync(path.join(root, 'docs/qa'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/qa/02-database-integrity-audit.md'), md);
  fs.writeFileSync(path.join(root, 'docs/qa/db-integrity-results.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(summary));
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
