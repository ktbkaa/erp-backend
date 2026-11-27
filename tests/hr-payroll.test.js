const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateEmployeePayroll,
  incomeTaxFromCumulative,
  annualLeaveEntitlementDays,
  round2,
} = require('../src/services/hrPayrollService');

const TR_2025_BRACKETS = [
  { line_no: 10, up_to_amount: 158000, rate: 0.15, fixed_amount: 0 },
  { line_no: 20, up_to_amount: 330000, rate: 0.20, fixed_amount: 23700 },
  { line_no: 30, up_to_amount: 1200000, rate: 0.27, fixed_amount: 58100 },
  { line_no: 40, up_to_amount: 4300000, rate: 0.35, fixed_amount: 293000 },
  { line_no: 50, up_to_amount: null, rate: 0.40, fixed_amount: 1378000 },
];

const TR_2025_MAP = {
  SGK_EMPLOYEE_RATE: 0.14,
  UNEMP_EMPLOYEE_RATE: 0.01,
  SGK_EMPLOYER_RATE_FULL: 0.2075,
  SGK_EMPLOYER_RATE_DISC: 0.1575,
  UNEMP_EMPLOYER_RATE: 0.02,
  STAMP_TAX_RATE: 0.00759,
  MIN_WAGE_IT_EXEMPTION: 3315.70,
  MIN_WAGE_STAMP_EXEMPTION: 197.38,
};

describe('hrPayrollService', () => {
  it('yıllık izin hak ediş asgari tablosu (4857 md.53)', () => {
    assert.equal(annualLeaveEntitlementDays({ serviceYears: 0 }), 0);
    assert.equal(annualLeaveEntitlementDays({ serviceYears: 1 }), 14);
    assert.equal(annualLeaveEntitlementDays({ serviceYears: 5 }), 14);
    assert.equal(annualLeaveEntitlementDays({ serviceYears: 6 }), 20);
    assert.equal(annualLeaveEntitlementDays({ serviceYears: 15 }), 26);
    assert.equal(annualLeaveEntitlementDays({ serviceYears: 3, age: 17 }), 20);
    assert.equal(annualLeaveEntitlementDays({ serviceYears: 2, underground: true }), 18);
  });

  it('kümülatif GV dilim yürüyüşü tutarlı', () => {
    const first = incomeTaxFromCumulative(0, 100000, TR_2025_BRACKETS);
    assert.equal(first, round2(100000 * 0.15));
    const second = incomeTaxFromCumulative(100000, 100000, TR_2025_BRACKETS);
    // 100k–158k @15%, 158k–200k @20%
    const expected = round2(58000 * 0.15 + 42000 * 0.20);
    assert.equal(second, expected);
  });

  it('asgari ücret brüt → net deterministik', () => {
    const r = calculateEmployeePayroll({
      gross: 26005.50,
      previousCumulativeTaxBase: 0,
      employerDiscount: true,
      params: { map: TR_2025_MAP, brackets: TR_2025_BRACKETS },
    });
    assert.equal(r.gross_wage, 26005.5);
    assert.equal(r.sgk_employee, round2(26005.5 * 0.14));
    assert.equal(r.unemployment_employee, round2(26005.5 * 0.01));
    assert.ok(r.net_wage > 0);
    assert.ok(r.employer_cost > r.gross_wage);
    // Aynı girdi → aynı çıktı
    const r2 = calculateEmployeePayroll({
      gross: 26005.50,
      previousCumulativeTaxBase: 0,
      employerDiscount: true,
      params: { map: TR_2025_MAP, brackets: TR_2025_BRACKETS },
    });
    assert.deepEqual(r, r2);
  });

  it('yüksek brütte GV istisna sonrası pozitif vergi', () => {
    const r = calculateEmployeePayroll({
      gross: 80000,
      previousCumulativeTaxBase: 200000,
      employerDiscount: true,
      params: { map: TR_2025_MAP, brackets: TR_2025_BRACKETS },
    });
    assert.ok(r.income_tax > 0);
    assert.equal(r.cumulative_tax_base, round2(200000 + r.income_tax_base));
  });

  it('avans mahsubu neti düşürür', () => {
    const base = calculateEmployeePayroll({
      gross: 50000,
      params: { map: TR_2025_MAP, brackets: TR_2025_BRACKETS },
    });
    const withAdv = calculateEmployeePayroll({
      gross: 50000,
      advanceDeduction: 5000,
      params: { map: TR_2025_MAP, brackets: TR_2025_BRACKETS },
    });
    assert.equal(round2(base.net_wage - withAdv.net_wage), 5000);
  });
});
