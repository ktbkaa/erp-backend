/**
 * Belge başlık/satır opsiyonel alanları (021).
 * Kaynak: Dolibarr commande/facture, ERPNext SO/SI, Sage fulfillment.
 */

const SIPARIS_BASLIK = [
  'customer_order_no', 'project_code', 'plant_id', 'warehouse_id', 'price_list_id',
  'delivery_date', 'valid_date', 'exchange_rate', 'discount_rate', 'discount_amount',
  'subtotal', 'tax_amount', 'grand_total', 'payment_method', 'payment_term_code', 'delivery_term_code',
  'ship_to_address', 'ship_city', 'ship_district', 'ship_country', 'ship_postal_code',
  'currency_code', 'description', 'public_note', 'internal_note', 'order_source',
  'company_id', 'created_by', 'approved_by',
];

const SIPARIS_SATIR = [
  'line_description', 'delivery_date', 'warehouse_id', 'net_unit_price', 'amount_ex_tax',
  'amount_ttc', 'product_type', 'unit_cost', 'kar_marji', 'discount_rate',
  'discount_amount', 'vat_rate', 'vat_amount', 'line_no',
];

const FATURA_BASLIK = [
  'customer_invoice_ref', 'project_code', 'company_id', 'plant_id', 'price_list_id', 'warehouse_id',
  'payment_method', 'payment_term_code', 'payment_plan', 'delivery_term_code', 'due_date', 'due_days',
  'payment_status', 'odenen_amount', 'remaining_amount', 'invoice_source_id', 'iade_mi',
  'public_note', 'internal_note', 'created_by', 'approved_by',
  'currency_code', 'exchange_rate', 'rate_type', 'rate_option', 'region', 'sales_rep',
  'ship_to_address', 'description', 'description_2', 'description_3', 'scenario', 'invoice_category', 'invoice_date',
  'payment_due_days', 'goods_receipt_id', 'sales_order_id', 'delivery_note_id',
  'e_document_status', 'document_series', 'document_sequence', 'gib_number', 'uuid_ettn', 'ozellestirme_no',
  'mailbox_alias', 'portal_sent_date',
  'ecommerce_web', 'ecommerce_name', 'ecommerce_last_name', 'ecommerce_email',
  'ship_to_partner_id', 'ship_address_type', 'ship_name', 'ship_last_name',
  'ship_address_1', 'ship_address_2', 'ship_address_3', 'ship_phone_1', 'ship_phone_2',
  'ship_city', 'ship_district', 'ship_country', 'ship_postal_code', 'customs',
  'bill_address_1', 'bill_address_2', 'bill_address_3', 'bill_postal_code',
  'bill_country', 'bill_city', 'bill_district',
  'contract_code', 'partner_title', 'partner_title_2', 'tax_office', 'tax_id',
  'withholding_code', 'withholding_rate', 'withholding_amount', 'tax_schema', 'special_movement_type',
  'fin_due_date', 'fin_due_days', 'stock_date',
  'is_printed', 'print_local_currency',
  'invoice_footer_discount', 'total_excise', 'total_withholding', 'total_bandrol',
  'movement_code_id', 'source_document_type', 'source_document_id', 'status',
];

const FATURA_SATIR = [
  'line_type', 'line_description', 'line_description_2', 'line_description_3',
  'net_unit_price', 'amount_ex_tax', 'amount_ttc', 'product_type',
  'unit_cost', 'warehouse_id', 'lot_id', 'serial_no', 'price_list_id',
  'currency_code', 'rate_type', 'exchange_rate', 'local_unit_price', 'local_currency_amount',
  'discount_rate', 'discount_rate_2', 'discount_rate_3',
  'discount_amount', 'discount_tutari2', 'discount_tutari3',
  'vat_code', 'vat_rate', 'vat_amount', 'vat_mode',
  'withholding_code', 'withholding_rate', 'withholding_amount',
  'excise_code', 'excise_rate', 'excise_amount', 'bandrol_rate', 'bandrol_amount',
  'tax_schema', 'due_date', 'due_days', 'customer_ref_code',
  'project_code', 'order_no', 'uom_code', 'line_no',
  'delivery_line_id', 'sales_order_line_id',
  'source_document_type', 'source_document_id', 'source_document_line_id',
];

function pickFields(body, keys) {
  const out = {};
  if (!body || typeof body !== 'object') return out;
  for (const k of keys) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

/** INSERT için kolon/değer genişletici */
function appendInsert(cols, vals, extras) {
  for (const [k, v] of Object.entries(extras || {})) {
    cols.push(k);
    vals.push(v);
  }
  return { cols, vals, placeholders: vals.map((_, i) => `$${i + 1}`).join(',') };
}

/** UPDATE SET parçası */
function buildUpdateSets(extras, startIdx = 2) {
  const sets = [];
  const params = [];
  let i = startIdx;
  for (const [k, v] of Object.entries(extras || {})) {
    sets.push(`${k} = $${i++}`);
    params.push(v);
  }
  return { sets, params };
}

module.exports = {
  SIPARIS_BASLIK,
  SIPARIS_SATIR,
  FATURA_BASLIK,
  FATURA_SATIR,
  pickFields,
  appendInsert,
  buildUpdateSets,
};
