/**
 * TCMB günlük döviz kuru XML servisi.
 * Kaynak (ücretsiz, API anahtarı yok): https://www.tcmb.gov.tr/kurlar/today.xml
 * Arşiv: https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml
 */

const DEFAULT_TODAY_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' veya Date → arşiv URL */
function archiveUrlForDate(dateInput) {
  const d = dateInput instanceof Date
    ? dateInput
    : new Date(`${String(dateInput).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error('Geçersiz kur tarihi.');
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `https://www.tcmb.gov.tr/kurlar/${y}${m}/${day}${m}${y}.xml`;
}

async function readParam(pool, code, fallback = null) {
  try {
    const r = await pool.query(
      `SELECT value FROM system_parameters
       WHERE parametre_code = $1 AND is_active IS DISTINCT FROM FALSE
       LIMIT 1`,
      [code]
    );
    const v = r.rows[0]?.value;
    if (v == null || String(v).trim() === '') return fallback;
    return String(v).trim();
  } catch (_) {
    return fallback;
  }
}

async function resolveFetchUrl(pool, { tarih, url } = {}) {
  if (url && String(url).trim()) return String(url).trim();
  if (tarih) return archiveUrlForDate(tarih);
  const configured = await readParam(pool, 'TCMB_KUR_URL', DEFAULT_TODAY_URL);
  return configured || DEFAULT_TODAY_URL;
}

async function fetchXml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/xml,text/xml,*/*', 'User-Agent': 'erp-backend-tcmb/1.0' },
    });
    if (!res.ok) {
      const err = new Error(`TCMB yanıtı ${res.status}: ${url}`);
      err.status = res.status === 404 ? 404 : 502;
      throw err;
    }
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function parseNum(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** TCMB XML → { bulletinDate, bulletinNo, rates[] } */
function parseTcmbXml(xml) {
  if (!xml || !String(xml).includes('Tarih_Date')) {
    throw Object.assign(new Error('TCMB XML beklenen formatta değil.'), { status: 502 });
  }
  const root = String(xml).match(/<Tarih_Date\b([^>]*)>/i);
  const attrs = root?.[1] || '';
  const tarihTr = (attrs.match(/\bTarih="([^"]+)"/i) || [])[1] || '';
  const bulletinNo = (attrs.match(/\bBulten_No="([^"]+)"/i) || [])[1] || '';
  // Tarih="30.10.2026" → 2026-10-30
  let bulletinDate = null;
  const tm = tarihTr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (tm) bulletinDate = `${tm[3]}-${tm[2]}-${tm[1]}`;

  const rates = [];
  const re = /<Currency\b([^>]*)>([\s\S]*?)<\/Currency>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const a = m[1] || '';
    const body = m[2] || '';
    const kod = ((a.match(/\bCurrencyCode="([^"]+)"/i) || a.match(/\bKod="([^"]+)"/i) || [])[1] || '').toUpperCase();
    if (!kod || kod === 'TRY' || kod === 'XDR') continue;
    const unit = parseNum(tagText(body, 'Unit')) || 1;
    const forexBuy = parseNum(tagText(body, 'ForexBuying'));
    const forexSell = parseNum(tagText(body, 'ForexSelling'));
    const noteBuy = parseNum(tagText(body, 'BanknoteBuying'));
    const noteSell = parseNum(tagText(body, 'BanknoteSelling'));
    if (forexBuy == null && forexSell == null) continue;
    const div = unit > 0 ? unit : 1;
    rates.push({
      currency_code: kod,
      unit: div,
      buy_rate: forexBuy != null ? forexBuy / div : null,
      sell_rate: forexSell != null ? forexSell / div : null,
      effective_buy_rate: noteBuy != null ? noteBuy / div : null,
      effective_sell_rate: noteSell != null ? noteSell / div : null,
      name_tr: tagText(body, 'Isim') || null,
    });
  }
  return { bulletinDate, bulletinNo, tarihTr, rates };
}

/**
 * TCMB kurlarını çeker; yalnızca sistemde tanımlı para birimleri için
 * exchange_rates tablosuna yazar (kaynak='TCMB').
 */
async function syncTcmbRates(pool, opts = {}) {
  const hedefParam = await readParam(pool, 'TCMB_KUR_HEDEF_PB', 'TRY');
  const targetPb = String(opts.targetPb || hedefParam || 'TRY').toUpperCase();
  const url = await resolveFetchUrl(pool, opts);
  const xml = await fetchXml(url);
  const parsed = parseTcmbXml(xml);
  const rateDate = opts.tarih
    ? String(opts.tarih).slice(0, 10)
    : (parsed.bulletinDate || new Date().toISOString().slice(0, 10));

  const pbRes = await pool.query(
    `SELECT currency_code FROM currencies
     WHERE is_active IS DISTINCT FROM FALSE
       AND UPPER(currency_code) <> $1`,
    [targetPb]
  );
  const ours = new Set(pbRes.rows.map((r) => String(r.currency_code).toUpperCase()));

  const matched = parsed.rates.filter((r) => ours.has(r.currency_code));
  const skipped = parsed.rates
    .filter((r) => !ours.has(r.currency_code))
    .map((r) => r.currency_code);

  const upserted = [];
  for (const r of matched) {
    const alis = r.buy_rate;
    const satis = r.sell_rate;
    if (alis == null || satis == null || alis <= 0 || satis <= 0) continue;
    const ins = await pool.query(
      `INSERT INTO exchange_rates
          (rate_date, source_pb, target_pb, buy_rate, sell_rate,
           effective_buy_rate, effective_sell_rate, source)
       VALUES ($1::date,$2,$3,$4,$5,$6,$7,'TCMB')
       ON CONFLICT (rate_date, source_pb, target_pb) DO UPDATE SET
         buy_rate = EXCLUDED.buy_rate,
         sell_rate = EXCLUDED.sell_rate,
         effective_buy_rate = EXCLUDED.effective_buy_rate,
         effective_sell_rate = EXCLUDED.effective_sell_rate,
         source = 'TCMB'
       RETURNING *`,
      [
        rateDate,
        r.currency_code,
        targetPb,
        alis,
        satis,
        r.effective_buy_rate,
        r.effective_sell_rate,
      ]
    );
    upserted.push(ins.rows[0]);
  }

  return {
    url,
    rate_date: rateDate,
    bulletin_date: parsed.bulletinDate,
    bulletin_no: parsed.bulletinNo,
    target_pb: targetPb,
    tcmb_currency_count: parsed.rates.length,
    matched_count: matched.length,
    upserted_count: upserted.length,
    skipped_currencies: skipped,
    rows: upserted,
  };
}

/** Bugün (veya bülten günü) için TCMB kaydı var mı? */
async function hasTcmbRatesForDate(pool, dateStr) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM exchange_rates
     WHERE source = 'TCMB' AND rate_date = $1::date`,
    [dateStr]
  );
  return (r.rows[0]?.n || 0) > 0;
}

async function isAutoSyncEnabled(pool) {
  const v = await readParam(pool, 'TCMB_KUR_AUTO', 'true');
  return /^(1|true|evet|yes|on)$/i.test(String(v || ''));
}

/**
 * Günde bir kez: auto açıksa ve bugün TCMB kaydı yoksa çeker.
 * Hafta sonu today.xml son iş gününü verir — bülten tarihiyle kaydedilir.
 */
async function maybeDailySync(pool, log = console) {
  if (!(await isAutoSyncEnabled(pool))) {
    log.info?.('[tcmb] otomatik senkron kapalı (TCMB_KUR_AUTO)');
    return null;
  }
  try {
    // Önce today.xml'i çekip bülten tarihine bak; o gün için kayıt varsa atla
    const url = await resolveFetchUrl(pool, {});
    const xml = await fetchXml(url);
    const parsed = parseTcmbXml(xml);
    const d = parsed.bulletinDate || new Date().toISOString().slice(0, 10);
    if (await hasTcmbRatesForDate(pool, d)) {
      log.info?.(`[tcmb] ${d} için TCMB kurları zaten var — atlandı`);
      return { skipped: true, rate_date: d };
    }
    const result = await syncTcmbRates(pool, { url });
    log.info?.(`[tcmb] senkron tamam: ${result.upserted_count} kur (${result.rate_date})`);
    return result;
  } catch (err) {
    log.error?.(`[tcmb] senkron hata: ${err.message}`);
    return { hata: err.message };
  }
}

function startTcmbScheduler(pool, log = console) {
  const HOUR = 60 * 60 * 1000;
  const run = () => {
    maybeDailySync(pool, log).catch((e) => log.error?.(`[tcmb] ${e.message}`));
  };
  // Açılışta kısa gecikmeyle dene (DB hazır olsun)
  setTimeout(run, 15_000);
  setInterval(run, HOUR);
  log.info?.('[tcmb] günlük kur zamanlayıcı aktif (saatlik kontrol)');
}

module.exports = {
  DEFAULT_TODAY_URL,
  archiveUrlForDate,
  resolveFetchUrl,
  fetchXml,
  parseTcmbXml,
  syncTcmbRates,
  hasTcmbRatesForDate,
  isAutoSyncEnabled,
  maybeDailySync,
  startTcmbScheduler,
  readParam,
};
