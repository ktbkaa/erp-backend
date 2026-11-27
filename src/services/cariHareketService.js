const { nextDocumentNo } = require('../utils/belgeNo');
const { normCurrency, isBaseCurrency, resolveDocumentRate, round2, round6 } = require('./kurService');

/**
 * Cari hareket: amount = belge para birimi (döviz), amount_try = TRY karşılığı.
 * TRY harekette amount_try = amount, kur = 1.
 * Dövizli harekette kur girilmediyse kur tablosundan çözülür; çözülemezse KUR_YOK.
 * Kur farkı satırı: amount = 0, amountTry = TRY fark (yalnız TRY bakiyeyi etkiler).
 */
async function addPartnerLedgerEntry(client, {
  cariId, direction, amount, paraBirimi = 'TRY', exchange_rate = 1,
  belgeTipi = null, belgeId = null, description = null, hareketTarihi = null,
  amountTry = null, dueDate = null, createdBy = null,
}) {
  if (!cariId || !direction || amount == null) {
    throw Object.assign(new Error('cariId, direction, amount zorunlu.'), { status: 400 });
  }
  const cur = normCurrency(paraBirimi);
  const tutar = Number(amount);
  let kur = 1;
  let tutarTry;
  if (isBaseCurrency(cur)) {
    tutarTry = amountTry != null ? round2(amountTry) : round2(tutar);
  } else if (amountTry != null && Number(exchange_rate) > 0) {
    kur = round6(exchange_rate);
    tutarTry = round2(amountTry);
  } else {
    const r = await resolveDocumentRate(client, {
      currency: cur, entered: exchange_rate, date: hareketTarihi,
    });
    kur = r.rate;
    tutarTry = amountTry != null ? round2(amountTry) : round2(tutar * kur);
  }
  const no = await nextDocumentNo(client, 'CARI_HAREKET');
  const r = await client.query(
    `INSERT INTO partner_ledger_entries
      (movement_no, partner_id, direction, amount, currency_code, exchange_rate, amount_try,
       document_type, document_id, description, movement_date, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,CURRENT_DATE),$12,$13) RETURNING *`,
    [no, cariId, direction, tutar, cur, kur, tutarTry, belgeTipi, belgeId, description,
      hareketTarihi, dueDate, createdBy]
  );
  return r.rows[0];
}

/**
 * Bakiye TRY cinsinden (debit/credit/bakiye) + para birimi bazlı döviz kırılımı.
 * TRY-only carilerde sonuç eski davranışla aynıdır.
 */
async function partnerBalance(pool, cariId) {
  const r = await pool.query(
    `
    SELECT
      currency_code,
      COALESCE(SUM(CASE WHEN direction='Borc' THEN amount ELSE 0 END),0)::numeric AS debit_fc,
      COALESCE(SUM(CASE WHEN direction='Alacak' THEN amount ELSE 0 END),0)::numeric AS credit_fc,
      COALESCE(SUM(CASE WHEN direction='Borc'
        THEN COALESCE(amount_try, amount * COALESCE(NULLIF(exchange_rate,0),1)) ELSE 0 END),0)::numeric AS debit_try,
      COALESCE(SUM(CASE WHEN direction='Alacak'
        THEN COALESCE(amount_try, amount * COALESCE(NULLIF(exchange_rate,0),1)) ELSE 0 END),0)::numeric AS credit_try
    FROM partner_ledger_entries WHERE partner_id=$1
    GROUP BY currency_code
    `,
    [cariId]
  );
  let debit = 0;
  let credit = 0;
  const doviz = [];
  for (const row of r.rows) {
    const dTry = Number(row.debit_try);
    const cTry = Number(row.credit_try);
    debit += dTry;
    credit += cTry;
    if (!isBaseCurrency(row.currency_code)) {
      doviz.push({
        currency_code: row.currency_code,
        debit: Number(row.debit_fc),
        credit: Number(row.credit_fc),
        bakiye: round2(Number(row.debit_fc) - Number(row.credit_fc)),
        bakiye_try: round2(dTry - cTry),
      });
    }
  }
  debit = round2(debit);
  credit = round2(credit);
  const bakiye = round2(debit - credit);
  return {
    debit, credit, bakiye,
    debit_try: debit, credit_try: credit, bakiye_try: bakiye,
    doviz,
  };
}

async function partnerStatement(pool, cariId, { baslangic = null, bitis = null } = {}) {
  const params = [cariId];
  const where = ['partner_id=$1'];
  if (baslangic) {
    params.push(baslangic);
    where.push(`movement_date >= $${params.length}`);
  }
  if (bitis) {
    params.push(bitis);
    where.push(`movement_date <= $${params.length}`);
  }
  const hareketler = await pool.query(
    `SELECT * FROM partner_ledger_entries WHERE ${where.join(' AND ')} ORDER BY movement_date, id`,
    params
  );
  const ozet = await partnerBalance(pool, cariId);
  return { ...ozet, hareketler: hareketler.rows };
}

module.exports = { addPartnerLedgerEntry, partnerBalance, partnerStatement };
