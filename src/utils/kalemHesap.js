/**
 * Profesyonel satır tutarı hesabı (TR satınalma / satış).
 * Çoklu iskonto zinciri, KDV dahil/hariç, tevkifat, ÖTV, exchange_rate.
 */

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function round6(n) {
  return Math.round((Number(n) || 0) * 1e6) / 1e6;
}

/**
 * @param {object} p
 * @param {number} p.quantity
 * @param {number} p.unit_price  belge PB cinsinden uom_code fiyat
 * @param {number} [p.discount_rate]
 * @param {number} [p.discount_rate_2]
 * @param {number} [p.discount_rate_3]
 * @param {number} [p.vat_rate]
 * @param {'Haric'|'Dahil'|string} [p.vat_mode]
 * @param {number} [p.withholding_rate]
 * @param {number} [p.excise_rate]
 * @param {number} [p.exchange_rate]  belge PB → yerel PB
 */
function satirHesapla({
  quantity,
  unit_price,
  discount_rate = 0,
  discount_rate_2 = 0,
  discount_rate_3 = 0,
  vat_rate = 20,
  vat_mode = 'Haric',
  withholding_rate = 0,
  excise_rate = 0,
  exchange_rate = 1,
} = {}) {
  const m = Number(quantity) || 0;
  const f = Number(unit_price) || 0;
  const isk1 = Number(discount_rate) || 0;
  const isk2 = Number(discount_rate_2) || 0;
  const isk3 = Number(discount_rate_3) || 0;
  const kdvOran = Number(vat_rate) || 0;
  const tevOran = Number(withholding_rate) || 0;
  const otvOran = Number(excise_rate) || 0;
  const k = Number(exchange_rate) > 0 ? Number(exchange_rate) : 1;
  const dahil = String(vat_mode || 'Haric').toLocaleLowerCase('tr').startsWith('dahil');

  let birimNet = f;
  if (dahil && kdvOran > 0) {
    birimNet = f / (1 + kdvOran / 100);
  }

  const brut = m * birimNet;
  const discount_amount = round2(brut * (isk1 / 100));
  const after1 = brut - discount_amount;
  const discount_tutari2 = round2(after1 * (isk2 / 100));
  const after2 = after1 - discount_tutari2;
  const discount_tutari3 = round2(after2 * (isk3 / 100));
  const goods_service_amount = round2(after2 - discount_tutari3);

  const excise_amount = round2(goods_service_amount * (otvOran / 100));
  const kdv_matrah = goods_service_amount + excise_amount;
  const vat_amount = round2(kdv_matrah * (kdvOran / 100));
  const withholding_amount = round2(vat_amount * (tevOran / 100));
  const satir_toplam = round2(goods_service_amount + excise_amount + vat_amount - withholding_amount);

  return {
    discount_rate: isk1,
    discount_rate_2: isk2,
    discount_rate_3: isk3,
    discount_amount,
    discount_tutari2,
    discount_tutari3,
    vat_rate: kdvOran,
    vat_mode: dahil ? 'Dahil' : 'Haric',
    vat_amount,
    withholding_rate: tevOran,
    withholding_amount,
    excise_rate: otvOran,
    excise_amount,
    goods_service_amount,
    amount_ex_tax: goods_service_amount,
    amount_ttc: satir_toplam,
    satir_toplam,
    yp_unit_price: round6(birimNet * k),
    yp_amount: round2(goods_service_amount * k),
    exchange_rate: k,
  };
}

function belgelerToplam(satirlar) {
  let mal = 0;
  let isk = 0;
  let kdv = 0;
  let tev = 0;
  let otv = 0;
  let odenecek = 0;
  for (const s of satirlar) {
    mal += Number(s.goods_service_amount ?? s.amount_ex_tax) || 0;
    isk += (Number(s.discount_amount) || 0)
      + (Number(s.discount_tutari2) || 0)
      + (Number(s.discount_tutari3) || 0);
    kdv += Number(s.vat_amount) || 0;
    tev += Number(s.withholding_amount) || 0;
    otv += Number(s.excise_amount) || 0;
    odenecek += Number(s.satir_toplam ?? s.amount_ttc
      ?? ((Number(s.goods_service_amount) || 0) + (Number(s.vat_amount) || 0))) || 0;
  }
  return {
    net_amount: round2(mal),
    subtotal: round2(mal),
    total_discount: round2(isk),
    tax_amount: round2(kdv),
    total_withholding: round2(tev),
    total_excise: round2(otv),
    payable_amount: round2(odenecek),
    grand_total: round2(odenecek),
    total_amount: round2(odenecek),
  };
}

module.exports = { satirHesapla, belgelerToplam, round2 };
