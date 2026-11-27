/**
 * Kur çözümleme ve TRY dönüşümü.
 * Ulusal para birimi her zaman TRY. TRY belgelerde kur=1 ve hiçbir arama yapılmaz.
 */

const BASE_CURRENCY = 'TRY';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function round6(n) {
  return Math.round((Number(n) || 0) * 1e6) / 1e6;
}

/** pg DATE (yerel gece yarısı Date) veya metin → 'YYYY-MM-DD' */
function ymd(d) {
  if (d == null || d === '') return null;
  if (d instanceof Date) {
    if (Number.isNaN(d.getTime())) return null;
    const p2 = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  }
  return String(d).slice(0, 10);
}

function normCurrency(code) {
  const c = String(code || '').trim().toUpperCase();
  return c || BASE_CURRENCY;
}

function isBaseCurrency(code) {
  return normCurrency(code) === BASE_CURRENCY;
}

function toBase(amount, rate) {
  return round2((Number(amount) || 0) * (Number(rate) > 0 ? Number(rate) : 1));
}

/** exchange_rates sütunu: TCMB-ALIS → buy_rate, TCMB-SATIS → sell_rate, EFKT-* → efektif */
function rateColumnFor(rateType) {
  const t = String(rateType || 'TCMB-SATIS').toUpperCase();
  if (t === 'TCMB-ALIS') return ['buy_rate', 'sell_rate'];
  if (t === 'EFKT-ALIS') return ['effective_buy_rate', 'buy_rate'];
  if (t === 'EFKT-SATIS') return ['effective_sell_rate', 'sell_rate'];
  return ['sell_rate', 'buy_rate'];
}

/**
 * Tarihe en yakın (≤ tarih) kayıtlı kur. Doğrudan çift, yoksa ters çift (1/kur).
 * @returns {{ rate:number, rate_date:string, source:string, inverse:boolean }|null}
 */
async function lookupStoredRate(db, { currency, date, rateType = 'TCMB-SATIS', target = BASE_CURRENCY }) {
  const cur = normCurrency(currency);
  const [primary, fallback] = rateColumnFor(rateType);
  const tarih = ymd(date) || new Date().toISOString().slice(0, 10);
  const pick = (row) => {
    const v = Number(row[primary]) || Number(row[fallback]);
    return v > 0 ? v : null;
  };
  const direct = await db.query(
    `SELECT * FROM exchange_rates
     WHERE source_currency=$1 AND target_currency=$2 AND rate_date <= $3::date
     ORDER BY rate_date DESC, id DESC LIMIT 1`,
    [cur, target, tarih]
  );
  if (direct.rows[0]) {
    const v = pick(direct.rows[0]);
    if (v) {
      return {
        rate: round6(v),
        rate_date: ymd(direct.rows[0].rate_date),
        source: direct.rows[0].source || 'Manuel',
        inverse: false,
      };
    }
  }
  const rev = await db.query(
    `SELECT * FROM exchange_rates
     WHERE source_currency=$2 AND target_currency=$1 AND rate_date <= $3::date
     ORDER BY rate_date DESC, id DESC LIMIT 1`,
    [cur, target, tarih]
  );
  if (rev.rows[0]) {
    const v = pick(rev.rows[0]);
    if (v) {
      return {
        rate: round6(1 / v),
        rate_date: ymd(rev.rows[0].rate_date),
        source: rev.rows[0].source || 'Manuel',
        inverse: true,
      };
    }
  }
  return null;
}

/**
 * Belge kuru: girilen kur (>0 ve ≠1) önceliklidir; yoksa kur tablosundan (TCMB/Manuel) çözülür.
 * Dövizli belgede kur çözülemezse 400 KUR_YOK — sessizce 1 varsayılmaz.
 */
async function resolveDocumentRate(db, { currency, entered, date, rateType = 'TCMB-SATIS' }) {
  const cur = normCurrency(currency);
  if (isBaseCurrency(cur)) {
    return { currency_code: BASE_CURRENCY, rate: 1, rate_date: null, source: 'TRY', entered: false };
  }
  const girilen = Number(entered);
  if (Number.isFinite(girilen) && girilen > 0 && girilen !== 1) {
    return {
      currency_code: cur,
      rate: round6(girilen),
      rate_date: ymd(date),
      source: 'Girilen',
      entered: true,
    };
  }
  const hit = await lookupStoredRate(db, { currency: cur, date, rateType });
  if (!hit) {
    throw Object.assign(
      new Error(
        `${cur} için ${ymd(date) || 'bugün'} tarihinde kur bulunamadı. `
        + 'Döviz Kurları ekranından TCMB kurunu çekin veya belgeye kuru elle girin.'
      ),
      { status: 400, kod: 'KUR_YOK', currency_code: cur }
    );
  }
  return { currency_code: cur, rate: hit.rate, rate_date: hit.rate_date, source: hit.source, entered: false };
}

/**
 * Fatura başlığındaki para birimi/kur alanlarını doğrular (yazma sırasında).
 * TRY → kur 1'e sabitlenir. Dövizli → para birimi tanımlı olmalı, girilen kur > 0 olmalı.
 * Kur boşsa muhasebeleştirmede kur tablosundan çözülür (burada sessizce 1 yazılmaz).
 */
async function normalizeInvoiceCurrencyFields(db, fields) {
  const out = { ...fields };
  if (out.currency_code === undefined && out.exchange_rate === undefined) return out;
  if (out.currency_code !== undefined) {
    const cur = normCurrency(out.currency_code);
    out.currency_code = cur;
    if (!isBaseCurrency(cur)) {
      const r = await db.query(
        `SELECT 1 FROM currencies WHERE UPPER(currency_code)=$1 AND is_active IS DISTINCT FROM FALSE`,
        [cur]
      );
      if (!r.rows[0]) {
        throw Object.assign(new Error(`Tanımsız veya pasif para birimi: ${cur}.`), { status: 400, kod: 'PB_GECERSIZ' });
      }
    } else {
      out.exchange_rate = 1;
    }
  }
  if (out.exchange_rate !== undefined && out.exchange_rate !== null && out.exchange_rate !== '') {
    const k = Number(out.exchange_rate);
    if (!Number.isFinite(k) || k <= 0) {
      throw Object.assign(new Error('Kur sıfırdan büyük bir sayı olmalı.'), { status: 400, kod: 'KUR_GECERSIZ' });
    }
  } else if (out.exchange_rate === '' || out.exchange_rate === null) {
    out.exchange_rate = 1;
  }
  return out;
}

module.exports = {
  normalizeInvoiceCurrencyFields,
  BASE_CURRENCY,
  round2,
  round6,
  normCurrency,
  isBaseCurrency,
  toBase,
  ymd,
  lookupStoredRate,
  resolveDocumentRate,
};
