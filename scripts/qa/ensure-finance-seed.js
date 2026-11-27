/**
 * TDHP hesap planı + mali yıl/dönem seed (idempotent).
 * Ortamda gl_accounts / accounting_periods boş kaldığında muhasebeleştirme kırılıyor.
 */
require('dotenv').config();
const pool = require('../../db');
const { withTransaction } = require('../../src/utils/withTransaction');

const ACCOUNTS = [
  ['100', 'Kasa', 'Ana', null, '1', 'Borc', false, 'Kasa'],
  ['100.01', 'TL Kasası', 'Ust', '100', '1', 'Borc', false, 'Kasa'],
  ['100.01.001', 'Merkez Kasa', 'Dogrudan', '100.01', '1', 'Borc', false, 'Kasa'],
  ['102', 'Bankalar', 'Ana', null, '1', 'Borc', true, 'Banka'],
  ['102.01', 'TL Banka Hesapları', 'Ust', '102', '1', 'Borc', false, 'Banka'],
  ['102.01.001', 'Ana Banka Hesabı', 'Dogrudan', '102.01', '1', 'Borc', false, 'Banka'],
  ['120', 'Alıcılar', 'Ana', null, '1', 'Borc', true, 'Cari'],
  ['120.01', 'Yurt İçi Alıcılar', 'Ust', '120', '1', 'Borc', false, 'Cari'],
  ['120.01.001', 'Yurt İçi Alacaklar', 'Dogrudan', '120.01', '1', 'Borc', false, 'Cari'],
  ['150', 'İlk Madde ve Malzeme', 'Ana', null, '1', 'Borc', false, 'Stok'],
  ['150.01.001', 'Hammaddeler', 'Dogrudan', '150', '1', 'Borc', false, 'Stok'],
  ['191', 'İndirilecek KDV', 'Ana', null, '1', 'Borc', false, null],
  ['191.01.001', 'İndirilecek KDV %20', 'Dogrudan', '191', '1', 'Borc', false, null],
  ['253', 'Tesis, Makine ve Cihazlar', 'Ana', null, '2', 'Borc', false, 'SabitKiymet'],
  ['253.01.001', 'Üretim Makineleri', 'Dogrudan', '253', '2', 'Borc', false, 'SabitKiymet'],
  ['257', 'Birikmiş Amortismanlar (-)', 'Ana', null, '2', 'Alacak', false, 'SabitKiymet'],
  ['257.01.001', 'Tesis Makine Amortismanı', 'Dogrudan', '257', '2', 'Alacak', false, 'SabitKiymet'],
  ['320', 'Satıcılar', 'Ana', null, '3', 'Alacak', true, 'Cari'],
  ['320.01', 'Yurt İçi Satıcılar', 'Ust', '320', '3', 'Alacak', false, 'Cari'],
  ['320.01.001', 'Yurt İçi Borçlar', 'Dogrudan', '320.01', '3', 'Alacak', false, 'Cari'],
  ['360', 'Ödenecek Vergi ve Fonlar', 'Ana', null, '3', 'Alacak', false, null],
  ['360.01.001', 'Ödenecek KDV', 'Dogrudan', '360', '3', 'Alacak', false, null],
  ['391', 'Hesaplanan KDV', 'Ana', null, '3', 'Alacak', false, null],
  ['391.01.001', 'Hesaplanan KDV %20', 'Dogrudan', '391', '3', 'Alacak', false, null],
  ['500', 'Sermaye', 'Ana', null, '5', 'Alacak', false, null],
  ['500.01.001', 'Ödenmiş Sermaye', 'Dogrudan', '500', '5', 'Alacak', false, null],
  ['600', 'Yurt İçi Satışlar', 'Ana', null, '6', 'Alacak', false, null],
  ['600.01.001', 'Yurt İçi Satışlar', 'Dogrudan', '600', '6', 'Alacak', false, null],
  ['622', 'Satılan Ticari Mallar Maliyeti', 'Ana', null, '6', 'Borc', false, null],
  ['622.01.001', 'SMM', 'Dogrudan', '622', '6', 'Borc', false, null],
  ['646', 'Kambiyo Kârları', 'Ana', null, '6', 'Alacak', false, null],
  ['646.01.001', 'Kur Farkı Gelirleri', 'Dogrudan', '646', '6', 'Alacak', false, null],
  ['656', 'Kambiyo Zararları', 'Ana', null, '6', 'Borc', false, null],
  ['656.01.001', 'Kur Farkı Giderleri', 'Dogrudan', '656', '6', 'Borc', false, null],
  ['770', 'Genel Yönetim Giderleri', 'Ana', null, '6', 'Borc', false, null],
  ['770.01.001', 'Genel Yönetim Giderleri', 'Dogrudan', '770', '6', 'Borc', false, null],
];

async function ensureAccounts(client) {
  let inserted = 0;
  for (const [code, name, type, parent, cls, bal, ctrl, recon] of ACCOUNTS) {
    const r = await client.query(
      `
      INSERT INTO gl_accounts
        (account_code, account_name, account_type, parent_account_code, currency_code, is_active,
         country_code, chart_of_accounts_code, account_class, normal_balance, is_control_account, reconciliation_type)
      VALUES ($1,$2,$3,$4,'TRY',TRUE,'TR','TDHP',$5,$6,$7,$8)
      ON CONFLICT (account_code) DO UPDATE SET
        account_name = EXCLUDED.account_name,
        account_type = EXCLUDED.account_type,
        parent_account_code = EXCLUDED.parent_account_code,
        country_code = COALESCE(gl_accounts.country_code, EXCLUDED.country_code),
        chart_of_accounts_code = COALESCE(gl_accounts.chart_of_accounts_code, EXCLUDED.chart_of_accounts_code),
        is_active = TRUE
      RETURNING (xmax = 0) AS inserted
      `,
      [code, name, type, parent, cls, bal, ctrl, recon]
    );
    if (r.rows[0]?.inserted) inserted += 1;
  }
  return inserted;
}

async function ensurePeriods(client) {
  const y = new Date().getFullYear();
  let fy = (await client.query(
    `SELECT * FROM fiscal_years WHERE company_id IS NULL AND year=$1 LIMIT 1`,
    [y]
  )).rows[0];
  if (!fy) {
    fy = (await client.query(
      `INSERT INTO fiscal_years (company_id, year, start_date, end_date, status)
       VALUES (NULL,$1,make_date($1,1,1),make_date($1,12,31),'Acik')
       RETURNING *`,
      [y]
    )).rows[0];
  }
  let created = 0;
  for (let m = 1; m <= 12; m += 1) {
    const exists = await client.query(
      `SELECT id FROM accounting_periods WHERE fiscal_year_id=$1 AND period_no=$2`,
      [fy.id, m]
    );
    if (exists.rows[0]) continue;
    await client.query(
      `
      INSERT INTO accounting_periods
        (fiscal_year_id, company_id, period_no, start_date, end_date, status)
      VALUES (
        $1, NULL, $2,
        make_date($3,$2,1),
        (make_date($3,$2,1) + INTERVAL '1 month - 1 day')::date,
        'Acik'
      )
      `,
      [fy.id, m, y]
    );
    created += 1;
  }
  return { fiscal_year_id: fy.id, year: y, periods_created: created };
}

async function ensureRules(client) {
  const rules = [
    ['SATIS_FATURA_TR', 'Satis', '120.01.001', '600.01.001', 'Satış faturası alacak + gelir'],
    ['ALIS_FATURA_TR', 'Alis', '150.01.001', '320.01.001', 'Alış faturası stok/gider + satıcı'],
  ];
  let upserted = 0;
  for (const [code, tip, debit, credit, desc] of rules) {
    const r = await client.query(
      `
      INSERT INTO account_determination_rules
        (rule_code, document_type, debit_account_code, credit_account_code, description, is_active)
      VALUES ($1,$2,$3,$4,$5,TRUE)
      ON CONFLICT DO NOTHING
      RETURNING id
      `,
      [code, tip, debit, credit, desc]
    ).catch(async () => {
      // unique may be on rule_code only in some DBs
      const upd = await client.query(
        `UPDATE account_determination_rules
         SET debit_account_code=$2, credit_account_code=$3, description=$4, is_active=TRUE
         WHERE rule_code=$1 RETURNING id`,
        [code, debit, credit, desc]
      );
      if (!upd.rows[0]) {
        const ins = await client.query(
          `INSERT INTO account_determination_rules
             (rule_code, document_type, debit_account_code, credit_account_code, description, is_active)
           SELECT $1,$2,$3,$4,$5,TRUE
           WHERE NOT EXISTS (SELECT 1 FROM account_determination_rules WHERE rule_code=$1)
           RETURNING id`,
          [code, tip, debit, credit, desc]
        );
        return ins;
      }
      return upd;
    });
    if (r.rows?.[0]) upserted += 1;
  }
  // Prefer leaf TR rules: deactivate coarse Ana-hesap rules that break Dogrudan check
  await client.query(
    `UPDATE account_determination_rules
     SET is_active=FALSE
     WHERE rule_code IN ('SATIS_FAT','ALIS_FAT')
       AND EXISTS (
         SELECT 1 FROM account_determination_rules r2
         WHERE r2.rule_code LIKE '%_TR' AND r2.document_type = account_determination_rules.document_type
           AND r2.is_active
       )`
  );
  return upserted;
}

async function main() {
  const result = await withTransaction(pool, async (client) => {
    const accounts_inserted = await ensureAccounts(client);
    const periods = await ensurePeriods(client);
    const rules_touched = await ensureRules(client);
    const counts = {
      gl_accounts: (await client.query(`SELECT count(*)::int n FROM gl_accounts`)).rows[0].n,
      accounting_periods: (await client.query(`SELECT count(*)::int n FROM accounting_periods`)).rows[0].n,
      account_determination_rules_active: (
        await client.query(`SELECT count(*)::int n FROM account_determination_rules WHERE is_active`)
      ).rows[0].n,
    };
    return { accounts_inserted, periods, rules_touched, counts };
  });
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
