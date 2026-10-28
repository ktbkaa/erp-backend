/**
 * Türkiye bordro hesaplama motoru — parametre seti sürümüne bağlı.
 * Oranlar kodda sabit değil; hr_payroll_param_* tablolarından okunur.
 */
const pool = require('../../db');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function getParamSet(client, { countryCode = 'TR', onDate = null, paramSetId = null } = {}) {
  const db = client || pool;
  if (paramSetId) {
    const r = await db.query(`SELECT * FROM hr_payroll_param_sets WHERE id=$1`, [paramSetId]);
    return r.rows[0] || null;
  }
  const d = onDate || new Date().toISOString().slice(0, 10);
  const r = await db.query(
    `SELECT * FROM hr_payroll_param_sets
     WHERE country_code=$1 AND is_active=TRUE
       AND effective_from <= $2::date
       AND (effective_to IS NULL OR effective_to >= $2::date)
     ORDER BY effective_from DESC LIMIT 1`,
    [countryCode, d],
  );
  return r.rows[0] || null;
}

async function loadParams(client, paramSetId) {
  const db = client || pool;
  const vals = await db.query(
    `SELECT param_key, param_value FROM hr_payroll_param_values WHERE param_set_id=$1`,
    [paramSetId],
  );
  const map = {};
  for (const row of vals.rows) map[row.param_key] = Number(row.param_value);
  const brackets = await db.query(
    `SELECT line_no, up_to_amount, rate, fixed_amount
     FROM hr_payroll_tax_brackets WHERE param_set_id=$1 ORDER BY line_no`,
    [paramSetId],
  );
  return { map, brackets: brackets.rows };
}

/** Kümülatif matrah üzerinden dilim vergisi (ücret tarifesi) */
function incomeTaxFromCumulative(prevCumulative, newBase, brackets) {
  const start = Number(prevCumulative) || 0;
  const end = start + Number(newBase);
  let taxEnd = 0;
  let taxStart = 0;
  let prevUp = 0;
  for (const b of brackets) {
    const up = b.up_to_amount == null ? Infinity : Number(b.up_to_amount);
    const rate = Number(b.rate);
    const fixed = Number(b.fixed_amount) || 0;
    // tax at amount X: walk brackets
    const taxAt = (amount) => {
      if (amount <= 0) return 0;
      let remaining = amount;
      let tax = 0;
      let last = 0;
      for (const br of brackets) {
        const ceiling = br.up_to_amount == null ? Infinity : Number(br.up_to_amount);
        const slice = Math.min(remaining, ceiling - last);
        if (slice <= 0) break;
        // For first bracket fixed=0; subsequent use progressive — simpler linear walk:
        tax += slice * Number(br.rate);
        remaining -= slice;
        last = ceiling;
        if (remaining <= 0) break;
      }
      return tax;
    };
    // Use progressive walk for start/end
    void up; void rate; void fixed; void prevUp;
  }
  // Progressive walk helper
  const taxAt = (amount) => {
    if (amount <= 0) return 0;
    let remaining = amount;
    let tax = 0;
    let last = 0;
    for (const br of brackets) {
      const ceiling = br.up_to_amount == null ? Number.POSITIVE_INFINITY : Number(br.up_to_amount);
      const width = ceiling - last;
      const slice = Math.min(remaining, width);
      if (slice > 0) tax += slice * Number(br.rate);
      remaining -= slice;
      last = ceiling;
      if (remaining <= 0) break;
    }
    return tax;
  };
  taxEnd = taxAt(end);
  taxStart = taxAt(start);
  return round2(taxEnd - taxStart);
}

/**
 * Tek çalışan brüt → net hesaplama.
 * @param {object} opts
 * @param {number} opts.gross
 * @param {number} [opts.previousCumulativeTaxBase=0]
 * @param {boolean} [opts.employerDiscount=true] 5 puan SGK indirimi
 * @param {number} [opts.advanceDeduction=0]
 * @param {number} [opts.otherDeductions=0]
 * @param {object} params loaded param map + brackets
 */
function calculateEmployeePayroll({
  gross,
  previousCumulativeTaxBase = 0,
  employerDiscount = true,
  advanceDeduction = 0,
  otherDeductions = 0,
  params,
}) {
  const p = params.map;
  const grossN = round2(gross);
  const sgkEmp = round2(grossN * (p.SGK_EMPLOYEE_RATE || 0.14));
  const unempEmp = round2(grossN * (p.UNEMP_EMPLOYEE_RATE || 0.01));
  const incomeTaxBase = round2(grossN - sgkEmp - unempEmp);

  let incomeTax = incomeTaxFromCumulative(previousCumulativeTaxBase, incomeTaxBase, params.brackets);
  const itExempt = round2(p.MIN_WAGE_IT_EXEMPTION || 0);
  const incomeTaxPayable = round2(Math.max(0, incomeTax - itExempt));

  const stampRaw = round2(grossN * (p.STAMP_TAX_RATE || 0.00759));
  const stampExempt = round2(p.MIN_WAGE_STAMP_EXEMPTION || 0);
  const stampTax = round2(Math.max(0, stampRaw - stampExempt));

  const adv = round2(advanceDeduction);
  const other = round2(otherDeductions);
  const net = round2(grossN - sgkEmp - unempEmp - incomeTaxPayable - stampTax - adv - other);

  const empRate = employerDiscount
    ? (p.SGK_EMPLOYER_RATE_DISC || 0.1575)
    : (p.SGK_EMPLOYER_RATE_FULL || 0.2075);
  const sgkEr = round2(grossN * empRate);
  const unempEr = round2(grossN * (p.UNEMP_EMPLOYER_RATE || 0.02));
  const employerCost = round2(grossN + sgkEr + unempEr);

  return {
    gross_wage: grossN,
    sgk_employee: sgkEmp,
    unemployment_employee: unempEmp,
    income_tax_base: incomeTaxBase,
    cumulative_tax_base: round2(previousCumulativeTaxBase + incomeTaxBase),
    income_tax: incomeTaxPayable,
    income_tax_calculated: incomeTax,
    income_tax_exemption: itExempt,
    stamp_tax: stampTax,
    stamp_tax_raw: stampRaw,
    stamp_tax_exemption: stampExempt,
    other_deductions: other,
    advance_deduction: adv,
    net_wage: net,
    sgk_employer: sgkEr,
    unemployment_employer: unempEr,
    employer_cost: employerCost,
    calc_detail: {
      employer_discount: employerDiscount,
      sgk_employer_rate: empRate,
      previous_cumulative_tax_base: previousCumulativeTaxBase,
    },
  };
}

async function calculateForEmployee(client, {
  employeeId,
  gross,
  onDate,
  previousCumulativeTaxBase = 0,
  employerDiscount = true,
  advanceDeduction = 0,
  otherDeductions = 0,
  paramSetId = null,
  countryCode = 'TR',
}) {
  const set = await getParamSet(client, { countryCode, onDate, paramSetId });
  if (!set) {
    const err = new Error(`Bordro parametre seti bulunamadı (${countryCode}).`);
    err.status = 400;
    throw err;
  }
  const params = await loadParams(client, set.id);
  const result = calculateEmployeePayroll({
    gross,
    previousCumulativeTaxBase,
    employerDiscount,
    advanceDeduction,
    otherDeductions,
    params,
  });
  result.param_set_id = set.id;
  result.param_set_code = set.set_code;
  return result;
}

/** Yıllık izin hak ediş günü (4857 md.53 asgari) — yaş/yeraltı bayrakları opsiyonel */
function annualLeaveEntitlementDays({ serviceYears, age = null, underground = false }) {
  let days;
  if (serviceYears < 1) days = 0;
  else if (serviceYears <= 5) days = 14;
  else if (serviceYears < 15) days = 20;
  else days = 26;
  if (age != null && (age <= 18 || age >= 50) && days > 0 && days < 20) days = 20;
  if (underground && days > 0) days += 4;
  return days;
}

module.exports = {
  getParamSet,
  loadParams,
  calculateEmployeePayroll,
  calculateForEmployee,
  incomeTaxFromCumulative,
  annualLeaveEntitlementDays,
  round2,
};
