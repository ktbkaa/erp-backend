/**
 * ERP belgesi (invoices / delivery_notes) → UBL-TR modeli.
 * build*Model fonksiyonları saftır (DB yok) ve test edilebilir; load*Source DB'den okur.
 * Hatalar `issues` listesinde döner: level=error gönderimi engeller, warning bilgi amaçlıdır.
 */
const codes = require('./codeLists');
const { round } = require('./amounts');

const TZ = 'Europe/Istanbul';

function istanbulParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}` };
}

function ymd(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})[./](\d{2})[./](\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function hms(v) {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  return m ? `${m[1]}:${m[2]}:${m[3] || '00'}` : null;
}

function digits(s) {
  return String(s || '').replace(/\D/g, '');
}

function clean(s) {
  const v = String(s ?? '').replace(/\s+/g, ' ').trim();
  return v || null;
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] || null, familyName: null };
  return { firstName: parts.slice(0, -1).join(' '), familyName: parts[parts.length - 1] };
}

function countryOf(raw) {
  const v = clean(raw);
  if (!v) return { country: 'Türkiye', countryCode: 'TR' };
  if (/^[A-Za-z]{2}$/.test(v)) {
    const code = v.toUpperCase();
    return { country: code === 'TR' ? 'Türkiye' : code, countryCode: codes.has('CountryCodeList', code) ? code : null };
  }
  const tr = /^t(ü|u)rk/i.test(v);
  return { country: tr ? 'Türkiye' : v, countryCode: tr ? 'TR' : null };
}

function normalizeCurrency(c) {
  const v = String(c || 'TRY').toUpperCase().trim();
  if (v === 'TL' || v === 'YTL') return 'TRY';
  if (v === 'EURO') return 'EUR';
  return v;
}

function normalizePlate(p) {
  const v = String(p || '').toLocaleUpperCase('tr-TR').replace(/[\s-]/g, '');
  return v || null;
}

function issue(list, level, code, message) {
  list.push({ level, code, message });
}

function companyParty(company = {}, settings = {}, issues) {
  const taxId = digits(company.tax_id);
  const idScheme = taxId.length === 11 ? 'TCKN' : 'VKN';
  if (!(taxId.length === 10 || taxId.length === 11)) {
    issue(issues, 'error', 'SATICI_VKN', 'Firma kartında 10 haneli VKN veya 11 haneli TCKN (companies.tax_id) tanımlı değil.');
  }
  const person = idScheme === 'TCKN' ? splitName(company.company_name) : {};
  const party = {
    idScheme,
    id: taxId,
    name: clean(company.company_name),
    ...person,
    taxOffice: clean(company.tax_office),
    website: clean(company.website),
    phone: clean(company.phone),
    fax: clean(company.fax),
    email: clean(company.email),
    extraIds: [
      company.mersis_number ? { scheme: 'MERSISNO', id: digits(company.mersis_number) } : null,
      company.trade_registry_no ? { scheme: 'TICARETSICILNO', id: clean(company.trade_registry_no) } : null,
    ].filter((x) => x && x.id),
    address: {
      street: clean(settings.street_name) || clean(company.address),
      buildingNo: clean(settings.building_number),
      district: clean(settings.district),
      city: clean(settings.city),
      postalZone: clean(settings.postal_code),
      ...countryOf(settings.country_name),
    },
  };
  if (!party.taxOffice) issue(issues, 'warning', 'SATICI_VD', 'Firma vergi dairesi (companies.tax_office) boş.');
  if (!party.address.city || !party.address.district) {
    issue(issues, 'error', 'SATICI_ADRES', 'Firma e-belge adresinde il/ilçe eksik (e-Belge ayarları: city, district).');
  }
  return party;
}

function partnerParty(partner = {}, doc = {}, issues, { allowFinalConsumer = false, label = 'Alıcı' } = {}) {
  let taxId = digits(doc.tax_id) || digits(partner.tax_id);
  if (!taxId && partner.passport_no) taxId = '';
  let idScheme = taxId.length === 11 ? 'TCKN' : 'VKN';
  if (!(taxId.length === 10 || taxId.length === 11)) {
    if (allowFinalConsumer) {
      taxId = '11111111111';
      idScheme = 'TCKN';
      issue(issues, 'warning', 'ALICI_NIHAI_TUKETICI', `${label} VKN/TCKN yok; e-Arşiv nihai tüketici TCKN 11111111111 kullanıldı.`);
    } else {
      issue(issues, 'error', 'ALICI_VKN', `${label} cari kartında 10 haneli VKN veya 11 haneli TCKN yok.`);
    }
  }
  const name = clean(doc.partner_title) || clean(partner.partner_name);
  let person = {};
  if (idScheme === 'TCKN') {
    person = partner.first_name && partner.last_name
      ? { firstName: clean(partner.first_name), familyName: clean(partner.last_name) }
      : splitName(name);
    if (!person.firstName || !person.familyName) {
      issue(issues, 'error', 'ALICI_AD_SOYAD', `${label} TCKN'li kişi için ad ve soyad gereklidir.`);
    }
  }
  const street = [doc.bill_address_1, doc.bill_address_2, doc.bill_address_3].map(clean).filter(Boolean).join(' ')
    || [partner.bill_address_1, partner.bill_address_2, partner.bill_address_3].map(clean).filter(Boolean).join(' ')
    || clean(partner.billing_address) || clean(partner.address);
  const party = {
    idScheme,
    id: taxId,
    name,
    ...person,
    taxOffice: clean(doc.tax_office) || clean(partner.tax_office),
    website: clean(partner.website),
    phone: clean(partner.phone),
    email: clean(doc.ecommerce_email) || clean(partner.email),
    address: {
      street,
      district: clean(doc.bill_district) || clean(partner.district),
      city: clean(doc.bill_city) || clean(partner.province),
      postalZone: clean(doc.bill_postal_code) || clean(partner.postal_code),
      ...countryOf(doc.bill_country || partner.country),
    },
  };
  if (!party.address.city || !party.address.district) {
    issue(issues, 'error', 'ALICI_ADRES', `${label} adresinde il/ilçe eksik (cari: province/district).`);
  }
  return party;
}

const PROFILE_ALIASES = Object.freeze({
  TEMEL: 'TEMELFATURA', TEMELFATURA: 'TEMELFATURA',
  TICARI: 'TICARIFATURA', TICARIFATURA: 'TICARIFATURA',
  EARSIV: 'EARSIVFATURA', EARSIVFATURA: 'EARSIVFATURA',
  IHRACAT: 'IHRACAT', KAMU: 'KAMU',
});

const SUPPORTED_PROFILES = new Set(['TEMELFATURA', 'TICARIFATURA', 'EARSIVFATURA']);

function normalizeProfile(s) {
  return PROFILE_ALIASES[codes.normalizeAscii(s)] || null;
}

function invoiceDirection(inv) {
  const t = String(inv.invoice_type || '').toLowerCase();
  if (t.includes('alis') && t.includes('iade')) return { outgoing: true, isReturn: true };
  if (t.includes('satis') && t.includes('iade')) return { outgoing: false, isReturn: true };
  if (t.includes('alis')) return { outgoing: false, isReturn: false };
  return { outgoing: true, isReturn: Boolean(inv.is_return) };
}

function pctValue(v) {
  if (v == null || v === '') return null;
  const s = String(v);
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return (Number(frac[1]) / Number(frac[2])) * 100;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n > 0 && n <= 1 ? n * 100 : n;
}

function mapInvoiceLine(l, idx, inv, issues) {
  const quantity = Number(l.quantity || 0);
  const unitPrice = Number(l.unit_price != null ? l.unit_price : l.net_unit_price || 0);
  const gross = round(quantity * unitPrice, 2);
  let allowance = ['discount_amount', 'discount_amount_2', 'discount_amount_3']
    .reduce((s, k) => s + Math.abs(Number(l[k] || 0)), 0);
  if (!allowance && Number(l.discount_rate || 0) > 0) allowance = (gross * Number(l.discount_rate)) / 100;
  allowance = round(allowance, 2);

  const name = clean(l.item_name) || clean(l.line_description) || clean(l.item_code);
  if (!name) issue(issues, 'error', 'SATIR_AD', `Satır ${idx + 1}: mal/hizmet adı boş.`);
  if (!(quantity > 0)) issue(issues, 'error', 'SATIR_MIKTAR', `Satır ${idx + 1}: miktar pozitif olmalıdır (iade faturasında da miktar pozitif yazılır).`);
  const unitCode = codes.unitCode(l.uom_code || l.item_uom_code);
  if (!unitCode) issue(issues, 'error', 'SATIR_BIRIM', `Satır ${idx + 1}: '${l.uom_code}' birimi GİB birim koduna eşlenemedi.`);

  const vatRaw = l.vat_rate != null ? l.vat_rate : (inv.vat_rate_default != null ? inv.vat_rate_default : l.item_default_vat_rate);
  const vatPercent = vatRaw != null ? Number(vatRaw) : 20;
  const exemptionCode = clean(l.tax_exemption_code) || clean(inv.tax_exemption_code)
    || (/^\d{3}$/.test(String(l.vat_code || '')) ? String(l.vat_code) : null);

  let withholding = null;
  const wCode = clean(l.withholding_code) || clean(inv.withholding_code);
  if (wCode) {
    const p = pctValue(l.withholding_rate != null ? l.withholding_rate : inv.withholding_rate);
    const percent = p != null && p > 0 ? round(p, 2) : codes.defaultWithholdingPercent(wCode);
    if (!codes.has('WithholdingTaxType', wCode)) {
      issue(issues, 'error', 'TEVKIFAT_KOD', `Satır ${idx + 1}: tevkifat kodu ${wCode} GİB listesinde yok.`);
    }
    withholding = { code: wCode, percent, name: codes.WITHHOLDING_NAMES[wCode] ? `KDV TEVKİFAT (${codes.WITHHOLDING_NAMES[wCode]})` : 'KDV TEVKİFAT' };
  }

  const otherTaxes = [];
  if (Number(l.excise_amount || 0) > 0 || Number(l.excise_rate || 0) > 0) {
    const c = codes.has('TaxType', l.excise_code) ? String(l.excise_code) : '0071';
    otherTaxes.push({ code: c, percent: l.excise_rate != null ? Number(l.excise_rate) : null, amount: l.excise_amount != null ? Number(l.excise_amount) : undefined });
  }

  const line = {
    id: idx + 1,
    name,
    description: clean(l.line_description) && clean(l.line_description) !== name ? clean(l.line_description) : null,
    sellersItemId: clean(l.item_code),
    quantity,
    unitCode: unitCode || 'C62',
    unitPrice,
    allowance,
    vatPercent,
    exemptionCode: vatPercent === 0 ? exemptionCode : null,
    exemptionReason: vatPercent === 0 ? clean(l.tax_exemption_reason) || clean(inv.tax_exemption_reason) : null,
    withholding,
    otherTaxes,
    orderLineId: l.sales_order_line_id || null,
    sourceAmountExTax: l.amount_ex_tax != null ? Number(l.amount_ex_tax) : null,
  };
  if (line.sourceAmountExTax != null && Math.abs(Math.abs(line.sourceAmountExTax) - round(gross - allowance, 2)) > 0.011) {
    issue(issues, 'warning', 'SATIR_TUTAR', `Satır ${idx + 1}: kayıtlı KDV hariç tutar (${line.sourceAmountExTax}) miktar×fiyat−iskonto (${round(gross - allowance, 2)}) ile uyuşmuyor; e-belgede hesaplanan tutar kullanılır.`);
  }
  return line;
}

/**
 * @param {object} src  loadInvoiceSource çıktısı
 * @param {{gibNumber?:string, uuid?:string, now?:Date}} opts
 */
function buildInvoiceModel(src, opts = {}) {
  const issues = [];
  const inv = src.invoice;
  const settings = src.settings || {};
  const dir = invoiceDirection(inv);
  if (!dir.outgoing) {
    issue(issues, 'error', 'GELEN_BELGE', dir.isReturn
      ? 'Satış iadesi (SatisIade) alıcının düzenlediği gelen belgedir; ERP bu faturayı GİB\'e gönderemez.'
      : 'Alış faturası gelen belgedir; GİB\'e gönderilmez.');
  }

  const receiverAlias = clean(inv.mailbox_alias) || (src.registeredAliases || [])[0] || null;
  let profileId = normalizeProfile(inv.scenario);
  if (inv.scenario && !profileId) issue(issues, 'error', 'SENARYO', `Bilinmeyen senaryo: ${inv.scenario}`);
  if (!profileId) profileId = receiverAlias ? (normalizeProfile(settings.default_profile) || 'TICARIFATURA') : 'EARSIVFATURA';
  // invoices.scenario varsayılanı TICARIFATURA'dır; e-Fatura/e-Arşiv ayrımını alıcının GİB kaydı belirler (VUK 509).
  if ((profileId === 'TICARIFATURA' || profileId === 'TEMELFATURA') && !receiverAlias) {
    issue(issues, 'warning', 'SENARYO_EARSIV', 'Alıcı için e-Fatura posta kutusu etiketi bulunamadı; belge e-Arşiv fatura olarak düzenlenir. Alıcı e-Fatura mükellefiyse önce mükellef sorgusu yapın veya etiketi tanımlayın.');
    profileId = 'EARSIVFATURA';
  } else if (profileId === 'EARSIVFATURA' && clean(inv.mailbox_alias)) {
    issue(issues, 'error', 'EARSIV_KAYITLI_ALICI', 'Alıcı e-Fatura kayıtlı kullanıcısı (etiket tanımlı); e-Arşiv fatura düzenlenemez, senaryoyu TEMEL/TICARI seçin.');
  } else if (profileId !== 'EARSIVFATURA' && !receiverAlias) {
    issue(issues, 'error', 'ALICI_ETIKET', 'Alıcı e-Fatura mükellefi olarak kayıtlı değil (posta kutusu etiketi yok).');
  }
  if (!SUPPORTED_PROFILES.has(profileId)) {
    issue(issues, 'error', 'SENARYO_DESTEK', `${profileId} senaryosu bu sürümde üretilmiyor (gümrük/kamu ek alanları gerekir).`);
  }

  const lines = (src.lines || []).map((l, i) => mapInvoiceLine(l, i, inv, issues));
  if (!lines.length) issue(issues, 'error', 'SATIR_YOK', 'Faturada satır yok.');

  const hasWithholding = lines.some((l) => l.withholding);
  const zeroVat = lines.filter((l) => l.vatPercent === 0);
  const exCodes = new Set(zeroVat.map((l) => l.exemptionCode).filter(Boolean));
  let invoiceTypeCode = null;
  // invoices.invoice_category varsayılanı SATIS'tır; yalnız SATIS dışı açık seçim türetilen tipi ezer.
  const cat = String(inv.invoice_category || '').toUpperCase();
  const explicitCat = cat && cat !== 'SATIS' && codes.has('InvoiceTypeCodeList', cat) ? cat : null;
  if (dir.isReturn) invoiceTypeCode = ['IADE', 'TEVKIFATIADE'].includes(explicitCat) ? explicitCat : (hasWithholding ? 'TEVKIFATIADE' : 'IADE');
  else if (explicitCat) invoiceTypeCode = explicitCat;
  else if (hasWithholding) invoiceTypeCode = 'TEVKIFAT';
  else if ([...exCodes].some((c) => codes.has('ihracExemptionReasonCodeType', c))) invoiceTypeCode = 'IHRACKAYITLI';
  else if ([...exCodes].some((c) => codes.has('ozelMatrahTaxExemptionReasonCodeType', c))) invoiceTypeCode = 'OZELMATRAH';
  else if ([...exCodes].some((c) => c !== '555' && codes.has('istisnaTaxExemptionReasonCodeType', c))) invoiceTypeCode = 'ISTISNA';
  else invoiceTypeCode = 'SATIS';

  for (const l of zeroVat) {
    if (!l.exemptionCode) {
      if (invoiceTypeCode === 'SATIS' || invoiceTypeCode === 'TEVKIFAT') {
        l.exemptionCode = '351';
      } else if (!['IADE', 'TEVKIFATIADE'].includes(invoiceTypeCode)) {
        issue(issues, 'error', 'ISTISNA_KOD', `Satır ${l.id}: %0 KDV için istisna/muafiyet kodu (tax_exemption_code) gerekli.`);
      }
    }
    if (l.exemptionCode) {
      if (!codes.has('TaxExemptionReasonCodeType', l.exemptionCode)) {
        issue(issues, 'error', 'ISTISNA_KOD', `Satır ${l.id}: istisna kodu ${l.exemptionCode} GİB listesinde yok.`);
      }
      l.exemptionReason = codes.exemptionReasonText(l.exemptionCode, l.exemptionReason);
    }
  }
  if (invoiceTypeCode === 'IADE' && profileId === 'TICARIFATURA') profileId = 'TEMELFATURA';

  const billingReferences = [];
  if (['IADE', 'TEVKIFATIADE'].includes(invoiceTypeCode)) {
    const s = src.sourceInvoice;
    const ref = s ? (clean(s.gib_number) || clean(s.customer_invoice_ref) || clean(s.invoice_no)) : clean(inv.customer_invoice_ref);
    const refDate = s ? ymd(s.invoice_date || s.created_at) : ymd(inv.invoice_date);
    if (!ref || ref.length !== 16) {
      issue(issues, 'error', 'IADE_REFERANS', `İade faturası için iade edilen faturanın 16 haneli GİB numarası gerekli (bulunan: ${ref || 'yok'}).`);
    }
    billingReferences.push({ id: ref, issueDate: refDate });
  }

  const currency = normalizeCurrency(inv.currency_code);
  if (!codes.has('CurrencyCodeList', currency)) issue(issues, 'error', 'PARA_BIRIMI', `Geçersiz para birimi: ${inv.currency_code}`);
  const exchangeRate = currency !== 'TRY' ? Number(inv.exchange_rate || 0) : null;
  if (currency !== 'TRY' && !(exchangeRate > 0)) issue(issues, 'error', 'KUR', 'Döviz faturasında kur (exchange_rate) zorunludur.');

  const now = istanbulParts(opts.now || new Date());
  const issueDate = ymd(inv.invoice_date) || now.date;
  if (issueDate > now.date) issue(issues, 'error', 'TARIH_ILERI', `Fatura tarihi (${issueDate}) ileri tarihli olamaz.`);

  const notes = [clean(inv.description), clean(inv.description_2), clean(inv.description_3), clean(inv.public_note)].filter(Boolean);
  const dueDate = ymd(inv.due_date) || ymd(inv.fin_due_date);

  const model = {
    profileId,
    invoiceTypeCode,
    id: opts.gibNumber || clean(inv.gib_number) || null,
    uuid: opts.uuid || (inv.uuid_ettn ? String(inv.uuid_ettn) : null),
    issueDate,
    issueTime: now.time,
    currency,
    exchangeRate,
    notes,
    supplier: companyParty(src.company, settings, issues),
    customer: partnerParty(src.partner, inv, issues, { allowFinalConsumer: profileId === 'EARSIVFATURA' }),
    orderReference: src.salesOrder ? { id: clean(src.salesOrder.order_no), issueDate: ymd(src.salesOrder.order_date || src.salesOrder.created_at) } : null,
    despatchReferences: src.deliveryNote
      ? [{ id: clean(src.deliveryNote.gib_number) || clean(src.deliveryNote.delivery_note_no), issueDate: ymd(src.deliveryNote.delivery_date || src.deliveryNote.created_at) }]
      : [],
    billingReferences,
    paymentMeans: settings.iban ? { code: '42', dueDate, iban: String(settings.iban).replace(/\s/g, '').toUpperCase(), bankName: clean(settings.bank_name) } : null,
    paymentTerms: dueDate || inv.payment_due_days ? { dueDate, note: inv.payment_due_days ? `${inv.payment_due_days} gün vade` : null } : null,
    lines,
  };
  return {
    model,
    issues,
    meta: {
      seriesKind: profileId === 'EARSIVFATURA' ? 'EARSIV' : 'EFATURA',
      prefix: profileId === 'EARSIVFATURA' ? settings.archive_prefix || 'EAR' : settings.invoice_prefix || 'EFT',
      receiverAlias: profileId === 'EARSIVFATURA' ? null : receiverAlias,
      senderAlias: clean(settings.invoice_sender_alias),
      year: Number(issueDate.slice(0, 4)),
      documentNo: inv.invoice_no,
      sourcePayable: inv.payable_amount != null ? Number(inv.payable_amount) : null,
    },
  };
}

function buildDespatchModel(src, opts = {}) {
  const issues = [];
  const dn = src.deliveryNote;
  const settings = src.settings || {};
  const now = istanbulParts(opts.now || new Date());
  const receiverAlias = clean(dn.mailbox_alias) || (src.registeredAliases || [])[0] || null;
  if (!receiverAlias) {
    issue(issues, 'error', 'ALICI_ETIKET', 'Alıcı e-İrsaliye mükellefi olarak kayıtlı değil (posta kutusu etiketi yok); kâğıt irsaliye kullanın veya etiketi tanımlayın.');
  }
  const partner = src.partner || {};
  const customer = partnerParty(partner, dn, issues, { label: 'Alıcı' });
  const issueDate = ymd(dn.delivery_date) || ymd(dn.created_at) || now.date;
  const despatchDate = ymd(dn.actual_ship_date) || ymd(dn.ship_date) || issueDate;
  const despatchTime = hms(dn.actual_ship_time) || hms(dn.ship_time) || hms(dn.delivery_time) || now.time;

  const shipStreet = [dn.ship_address_1, dn.ship_address_2, dn.ship_address_3].map(clean).filter(Boolean).join(' ') || clean(dn.ship_to_address);
  const deliveryAddress = shipStreet || dn.ship_city
    ? {
      street: shipStreet,
      district: clean(dn.ship_district) || customer.address.district,
      city: clean(dn.ship_city) || customer.address.city,
      postalZone: clean(dn.ship_postal_code) || customer.address.postalZone,
      ...countryOf(dn.ship_country || partner.country),
    }
    : { ...customer.address };
  if (!/^((0[1-9])|([1-7][0-9])|(8[0-1]))[0-9]{3}$/.test(String(deliveryAddress.postalZone || ''))) {
    issue(issues, 'error', 'TESLIM_POSTA_KODU', 'Teslim adresinde geçerli 5 haneli posta kodu zorunludur (ship_postal_code / cari postal_code).');
  }

  const drivers = [];
  if (dn.driver_name || dn.driver_last_name || dn.driver_national_id) {
    const split = dn.driver_last_name ? { firstName: clean(dn.driver_name), familyName: clean(dn.driver_last_name) } : splitName(dn.driver_name);
    drivers.push({ ...split, nationalId: digits(dn.driver_national_id) || null });
    if (!split.firstName || !split.familyName || digits(dn.driver_national_id).length !== 11) {
      issue(issues, 'error', 'SOFOR', 'Şoför adı, soyadı ve 11 haneli TCKN birlikte girilmelidir.');
    }
  }
  let carrier = null;
  const carrierTax = digits(dn.carrier_tax_id);
  if (carrierTax) {
    carrier = { idScheme: carrierTax.length === 11 ? 'TCKN' : 'VKN', id: carrierTax, name: clean(dn.carrier_title) || clean(dn.carrier_company) || clean(dn.carrier) };
  }
  if (!drivers.length && !carrier) {
    issue(issues, 'error', 'TASIYICI', 'Şoför (ad/soyad/TCKN) veya taşıyıcı firma (VKN + unvan) bilgisi zorunludur.');
  }
  const plate = normalizePlate(dn.vehicle_plate);
  if (plate && !/^(0[1-9]|[1-7][0-9]|8[01])[A-Z]+[0-9]+$/.test(plate)) {
    issue(issues, 'error', 'PLAKA', `Araç plakası '34ABC123' biçiminde olmalıdır: ${dn.vehicle_plate}`);
  }

  const lines = (src.lines || []).map((l, i) => {
    const name = clean(l.item_name) || clean(l.line_description) || clean(l.item_code);
    const unitCode = codes.unitCode(l.uom_code || l.item_uom_code);
    if (!name) issue(issues, 'error', 'SATIR_AD', `Satır ${i + 1}: mal adı boş.`);
    if (!unitCode) issue(issues, 'error', 'SATIR_BIRIM', `Satır ${i + 1}: '${l.uom_code}' birimi GİB birim koduna eşlenemedi.`);
    if (!(Number(l.quantity) > 0)) issue(issues, 'error', 'SATIR_MIKTAR', `Satır ${i + 1}: miktar pozitif olmalıdır.`);
    return {
      id: i + 1,
      name,
      sellersItemId: clean(l.item_code),
      quantity: Number(l.quantity || 0),
      unitCode: unitCode || 'C62',
      orderLineId: l.sales_order_line_id || i + 1,
      unitPrice: Number(l.unit_price || 0),
      lineAmount: round(Number(l.quantity || 0) * Number(l.unit_price || 0), 2),
    };
  });
  if (!lines.length) issue(issues, 'error', 'SATIR_YOK', 'İrsaliyede satır yok.');

  const additionalReferences = [];
  let despatchTypeCode = 'SEVK';
  if (dn.paper_series && dn.paper_sequence && dn.paper_document_date) {
    despatchTypeCode = 'MATBUDAN';
    additionalReferences.push({
      id: `${clean(dn.paper_series)}${clean(dn.paper_sequence)}`,
      issueDate: ymd(dn.paper_document_date),
      typeCode: 'MATBU',
    });
  }

  const model = {
    profileId: 'TEMELIRSALIYE',
    despatchTypeCode,
    id: opts.gibNumber || clean(dn.gib_number) || null,
    uuid: opts.uuid || (dn.uuid_ettn ? String(dn.uuid_ettn) : null),
    issueDate,
    issueTime: hms(dn.delivery_time) || now.time,
    currency: normalizeCurrency(dn.currency_code),
    notes: [clean(dn.description), clean(dn.public_note)].filter(Boolean),
    supplier: companyParty(src.company, settings, issues),
    customer,
    orderReference: src.salesOrder ? { id: clean(src.salesOrder.order_no), issueDate: ymd(src.salesOrder.order_date || src.salesOrder.created_at) } : null,
    additionalReferences,
    shipment: {
      vehiclePlate: plate,
      trailerPlate: normalizePlate(dn.trailer_plate),
      drivers,
      carrier,
      deliveryAddress,
      despatchDate,
      despatchTime,
    },
    lines,
  };
  return {
    model,
    issues,
    meta: {
      seriesKind: 'EIRSALIYE',
      prefix: settings.despatch_prefix || 'IRS',
      receiverAlias,
      senderAlias: clean(settings.despatch_sender_alias),
      year: Number(issueDate.slice(0, 4)),
      documentNo: dn.delivery_note_no,
    },
  };
}

async function registeredAliases(client, taxId, kind) {
  const t = digits(taxId);
  if (!t) return [];
  try {
    const r = await client.query(
      `SELECT alias FROM e_document_registered_users
       WHERE tax_id=$1 AND document_kind=$2 AND is_active IS DISTINCT FROM FALSE
       ORDER BY registered_at DESC NULLS LAST, id`,
      [t, kind]
    );
    return r.rows.map((x) => x.alias);
  } catch (_) {
    return [];
  }
}

async function loadCompany(client, companyId) {
  if (companyId) {
    const r = await client.query(`SELECT * FROM companies WHERE id=$1`, [companyId]);
    if (r.rows[0]) return r.rows[0];
  }
  const r = await client.query(`SELECT * FROM companies ORDER BY COALESCE(is_profile,FALSE) DESC, id LIMIT 1`);
  return r.rows[0] || {};
}

async function loadInvoiceSource(client, invoiceId, { lock = false } = {}) {
  const r = await client.query(
    `SELECT * FROM invoices WHERE id=$1 AND COALESCE(is_deleted,FALSE)=FALSE ${lock ? 'FOR UPDATE' : ''}`,
    [invoiceId]
  );
  const invoice = r.rows[0];
  if (!invoice) return null;
  const lines = await client.query(
    `SELECT l.*, i.item_code, i.item_name, i.uom_code AS item_uom_code, i.default_vat_rate AS item_default_vat_rate
     FROM invoice_lines l LEFT JOIN items i ON i.id = l.item_id
     WHERE l.invoice_id=$1 ORDER BY COALESCE(l.line_no, l.id), l.id`,
    [invoiceId]
  );
  const partner = await client.query(`SELECT * FROM partners WHERE id=$1`, [invoice.partner_id]);
  const company = await loadCompany(client, invoice.company_id);
  const { loadSettings } = require('./config');
  const settings = await loadSettings(client, invoice.company_id || company.id);
  let salesOrder = null;
  if (invoice.sales_order_id) {
    salesOrder = (await client.query(`SELECT order_no, order_date, created_at FROM sales_orders WHERE id=$1`, [invoice.sales_order_id]).catch(() => ({ rows: [] }))).rows[0] || null;
  }
  let deliveryNote = null;
  if (invoice.delivery_note_id) {
    deliveryNote = (await client.query(`SELECT delivery_note_no, gib_number, delivery_date, created_at FROM delivery_notes WHERE id=$1`, [invoice.delivery_note_id]).catch(() => ({ rows: [] }))).rows[0] || null;
  }
  let sourceInvoice = null;
  const srcId = invoice.invoice_source_id || (/IADE/i.test(String(invoice.source_document_type || '')) ? invoice.source_document_id : null);
  if (srcId) {
    sourceInvoice = (await client.query(`SELECT invoice_no, gib_number, customer_invoice_ref, invoice_date, created_at FROM invoices WHERE id=$1`, [srcId])).rows[0] || null;
  }
  const p = partner.rows[0] || {};
  return {
    invoice,
    lines: lines.rows,
    partner: p,
    company,
    settings,
    salesOrder,
    deliveryNote,
    sourceInvoice,
    registeredAliases: await registeredAliases(client, invoice.tax_id || p.tax_id, 'EFATURA'),
  };
}

async function loadDespatchSource(client, deliveryNoteId, { lock = false } = {}) {
  const r = await client.query(
    `SELECT * FROM delivery_notes WHERE id=$1 AND COALESCE(is_deleted,FALSE)=FALSE ${lock ? 'FOR UPDATE' : ''}`,
    [deliveryNoteId]
  );
  const deliveryNote = r.rows[0];
  if (!deliveryNote) return null;
  const lines = await client.query(
    `SELECT l.*, i.item_code, i.item_name, i.uom_code AS item_uom_code
     FROM delivery_note_lines l LEFT JOIN items i ON i.id = l.item_id
     WHERE l.delivery_note_id=$1 ORDER BY COALESCE(l.line_no, l.id), l.id`,
    [deliveryNoteId]
  );
  const partner = await client.query(`SELECT * FROM partners WHERE id=$1`, [deliveryNote.partner_id]);
  const company = await loadCompany(client, deliveryNote.company_id);
  const { loadSettings } = require('./config');
  const settings = await loadSettings(client, deliveryNote.company_id || company.id);
  let salesOrder = null;
  if (deliveryNote.sales_order_id) {
    salesOrder = (await client.query(`SELECT order_no, order_date, created_at FROM sales_orders WHERE id=$1`, [deliveryNote.sales_order_id]).catch(() => ({ rows: [] }))).rows[0] || null;
  }
  const p = partner.rows[0] || {};
  return {
    deliveryNote,
    lines: lines.rows,
    partner: p,
    company,
    settings,
    salesOrder,
    registeredAliases: await registeredAliases(client, deliveryNote.tax_id || p.tax_id, 'EIRSALIYE'),
  };
}

module.exports = {
  buildInvoiceModel,
  buildDespatchModel,
  loadInvoiceSource,
  loadDespatchSource,
  invoiceDirection,
  normalizeProfile,
  istanbulParts,
  ymd,
  digits,
};
