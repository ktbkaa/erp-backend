/**
 * Kur farkı altyapısı.
 *  - Gerçekleşen: dövizli faturaya bağlı tahsilat/ödemede (fatura kuru ↔ ödeme kuru).
 *  - Gerçekleşmemiş: dönem sonu değerleme (açık döviz cari bakiyesi × kapanış kuru − TRY defter değeri).
 * Kâr: 646 (KUR_FARKI_KAR_HESAP), zarar: 656 (KUR_FARKI_ZARAR_HESAP). Parametre: system_parameters.
 * Cari tarafta kur farkı satırı amount=0 (döviz değişmez), amount_try = fark.
 */
const { addPartnerLedgerEntry } = require('./cariHareketService');
const {
  BASE_CURRENCY, round2, isBaseCurrency, normCurrency, resolveDocumentRate, ymd,
} = require('./kurService');
const {
  createJournalEntry, resolveAccountId,
} = require('./muhasebeMotorService');
const { findRule } = require('./muhasebeEntegrasyonService');

async function param(db, code, fallback) {
  const r = await db.query(
    `SELECT value FROM system_parameters WHERE parameter_code=$1 AND is_active IS DISTINCT FROM FALSE LIMIT 1`,
    [code]
  );
  const v = r.rows[0]?.value;
  return v && String(v).trim() ? String(v).trim() : fallback;
}

async function kurFarkiHesaplari(db) {
  return {
    kar: await param(db, 'KUR_FARKI_KAR_HESAP', '646.01.001'),
    zarar: await param(db, 'KUR_FARKI_ZARAR_HESAP', '656.01.001'),
  };
}

/**
 * Saf hesap. Dönüş: işaretli kâr(+)/zarar(−) TRY.
 * Satış (alacak): tahsilat kuru > fatura kuru ise kâr. Alış (borç): ödeme kuru < fatura kuru ise kâr.
 */
function gerceklesenFark({ fcTutar, faturaKuru, odemeKuru, faturaTuru }) {
  const fc = Number(fcTutar) || 0;
  const ham = faturaTuru === 'Alis'
    ? fc * (Number(faturaKuru) - Number(odemeKuru))
    : fc * (Number(odemeKuru) - Number(faturaKuru));
  return round2(ham);
}

async function cariHesapKodu(client, faturaTuru) {
  const kural = await findRule(client, faturaTuru);
  if (!kural) {
    throw Object.assign(new Error(`Hesap belirleme kuralı yok: ${faturaTuru}.`), { status: 400, kod: 'KURAL_YOK' });
  }
  return faturaTuru === 'Alis' ? kural.credit_account_code : kural.debit_account_code;
}

/** Kâr: Borç cari / Alacak 646. Zarar: Borç 656 / Alacak cari. */
async function kurFarkiFisi(client, {
  firmaId, tarih, fark, cariHesap, partnerId, aciklama, kaynakTip, kaynakId, kullaniciKodu, ulkeKodu = 'TR',
}) {
  const hs = await kurFarkiHesaplari(client);
  const cari = await resolveAccountId(client, { account_code: cariHesap, country_code: ulkeKodu });
  const kurHesap = await resolveAccountId(client, {
    account_code: fark > 0 ? hs.kar : hs.zarar, country_code: ulkeKodu,
  });
  const tutar = Math.abs(fark);
  const lines = fark > 0
    ? [
      { account_id: cari, debit: tutar, credit: 0, partner_id: partnerId, description: aciklama },
      { account_id: kurHesap, debit: 0, credit: tutar, description: aciklama },
    ]
    : [
      { account_id: kurHesap, debit: tutar, credit: 0, description: aciklama },
      { account_id: cari, debit: 0, credit: tutar, partner_id: partnerId, description: aciklama },
    ];
  return createJournalEntry(client, {
    firmaId: firmaId || null,
    ulkeKodu,
    fisTipi: 'Mahsup',
    belgeTarihi: tarih,
    description: aciklama,
    lines,
    kaynakBelgeTipi: kaynakTip,
    kaynakBelgeId: kaynakId,
    olusturanKullanici: kullaniciKodu,
    kesinlestir: true,
  });
}

/**
 * Dövizli, muhasebeleşmiş faturaya bağlı tahsilat/ödeme için gerçekleşen kur farkı.
 * TRY belge, para birimi uyumsuzluğu, kur farkı = 0 veya muhasebeleşmemiş fatura: sessizce atlanır (null).
 */
async function gerceklesenKurFarkiIsle(client, {
  faturaId, belgeTipi, belgeId, fcTutar, odemeKuru, tarih, paraBirimi, kullaniciKodu = null,
}) {
  if (!faturaId || isBaseCurrency(paraBirimi)) return null;
  const f = await client.query(`SELECT * FROM invoices WHERE id=$1`, [faturaId]);
  const fatura = f.rows[0];
  if (!fatura || !fatura.is_posted) return null;
  if (normCurrency(fatura.currency_code) !== normCurrency(paraBirimi)) return null;
  const iade = fatura.is_return === true || /iade/i.test(String(fatura.invoice_type || ''));
  if (iade) return null;
  const faturaTuru = String(fatura.invoice_type || '').toLowerCase().includes('alis') ? 'Alis' : 'Satis';
  const faturaKuru = Number(fatura.exchange_rate) || 1;
  const fark = gerceklesenFark({ fcTutar, faturaKuru, odemeKuru, faturaTuru });
  if (Math.abs(fark) < 0.005) return null;

  const mukerrer = await client.query(
    `SELECT id FROM exchange_difference_entries
     WHERE kind='Gerceklesen' AND source_document_type=$1 AND source_document_id=$2 AND invoice_id=$3`,
    [belgeTipi, belgeId, faturaId]
  );
  if (mukerrer.rows[0]) return null;

  const cariHesap = await cariHesapKodu(client, faturaTuru);
  const aciklama = `Gerçekleşen kur farkı ${fatura.invoice_no} (${fcTutar} ${normCurrency(paraBirimi)}: ${faturaKuru} → ${odemeKuru})`;
  const fis = await kurFarkiFisi(client, {
    firmaId: fatura.company_id, tarih: ymd(tarih) || ymd(new Date()), fark, cariHesap,
    partnerId: fatura.partner_id, aciklama,
    kaynakTip: 'KUR_FARKI_GERCEKLESEN', kaynakId: belgeId,
    kullaniciKodu,
  });
  const ledger = await addPartnerLedgerEntry(client, {
    cariId: fatura.partner_id,
    direction: fark > 0 ? 'Borc' : 'Alacak',
    amount: 0,
    paraBirimi: normCurrency(paraBirimi),
    exchange_rate: odemeKuru,
    amountTry: Math.abs(fark),
    belgeTipi: 'KUR_FARKI',
    belgeId,
    description: aciklama,
    hareketTarihi: ymd(tarih),
    createdBy: kullaniciKodu,
  });
  const ins = await client.query(
    `INSERT INTO exchange_difference_entries
       (company_id, partner_id, kind, currency_code, fc_amount, book_rate, settle_rate, difference_try,
        rate_date, invoice_id, source_document_type, source_document_id, gl_document_id, ledger_entry_id,
        description, created_by)
     VALUES ($1,$2,'Gerceklesen',$3,$4,$5,$6,$7,COALESCE($8::date,CURRENT_DATE),$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [fatura.company_id || null, fatura.partner_id, normCurrency(paraBirimi), fcTutar, faturaKuru, odemeKuru,
      fark, ymd(tarih), faturaId, belgeTipi, belgeId, fis.id, ledger.id, aciklama, kullaniciKodu]
  );
  return ins.rows[0];
}

/**
 * Dönem sonu değerleme önizleme. Kapanış kuru: kurlar[currency] (verilen) ya da tarih ≤ kur tablosu.
 * Yalnızca açık (≠0) döviz bakiyesi olan cari×para birimi satırları ve fark ≠ 0 olanlar döner.
 */
async function degerlemeOnizleme(db, { firmaId = null, tarih, kurlar = {} }) {
  const t = ymd(tarih);
  if (!t) throw Object.assign(new Error('tarih zorunlu.'), { status: 400 });
  const params = [t];
  let firmaSql = '';
  if (firmaId) {
    params.push(Number(firmaId));
    firmaSql = `AND (p.company_id = $2
      OR p.plant_id IN (SELECT id FROM plants WHERE company_id = $2)
      OR EXISTS (SELECT 1 FROM partner_company_params fp WHERE fp.partner_id = p.id AND fp.company_id = $2
                 AND fp.is_active IS DISTINCT FROM FALSE))`;
  }
  const r = await db.query(
    `
    SELECT h.partner_id, p.partner_code, p.partner_name, h.currency_code,
      SUM(CASE WHEN h.direction='Borc' THEN h.amount ELSE -h.amount END)::numeric AS fc_bakiye,
      SUM(CASE WHEN h.direction='Borc'
        THEN COALESCE(h.amount_try, h.amount * COALESCE(NULLIF(h.exchange_rate,0),1))
        ELSE -COALESCE(h.amount_try, h.amount * COALESCE(NULLIF(h.exchange_rate,0),1)) END)::numeric AS defter_try
    FROM partner_ledger_entries h
    JOIN partners p ON p.id = h.partner_id
    WHERE h.movement_date <= $1::date AND UPPER(COALESCE(h.currency_code,'TRY')) <> 'TRY' ${firmaSql}
    GROUP BY h.partner_id, p.partner_code, p.partner_name, h.currency_code
    HAVING ABS(SUM(CASE WHEN h.direction='Borc' THEN h.amount ELSE -h.amount END)) >= 0.005
    ORDER BY p.partner_code, h.currency_code
    `,
    params
  );
  const sonuc = [];
  for (const row of r.rows) {
    const cur = normCurrency(row.currency_code);
    const verilen = Number(kurlar[cur]);
    const kur = verilen > 0
      ? { rate: verilen, rate_date: t, source: 'Girilen' }
      : await resolveDocumentRate(db, { currency: cur, entered: null, date: t, rateType: 'TCMB-ALIS' });
    const fc = Number(row.fc_bakiye);
    const defter = round2(Number(row.defter_try));
    const degerli = round2(fc * kur.rate);
    const fark = round2(degerli - defter);
    if (Math.abs(fark) < 0.005) continue;
    sonuc.push({
      partner_id: row.partner_id,
      partner_code: row.partner_code,
      partner_name: row.partner_name,
      currency_code: cur,
      fc_bakiye: fc,
      defter_try: defter,
      kapanis_kuru: kur.rate,
      kapanis_kuru_tarihi: kur.rate_date,
      degerli_try: degerli,
      fark_try: fark,
    });
  }
  return sonuc;
}

/**
 * Değerleme kaydı: cari TRY düzeltmesi (amount=0) + tek GL fişi (cari bazlı kalemler) +
 * exchange_difference_entries. Aynı firma/cari/para birimi/tarih için ikinci kez çalışmaz.
 * Ters kayıt (ertesi dönem başı) için degerlemeTersle kullanılır.
 */
async function degerlemeKaydet(client, { firmaId = null, tarih, kurlar = {}, kullaniciKodu = null, ulkeKodu = 'TR' }) {
  const t = ymd(tarih);
  const satirlar = await degerlemeOnizleme(client, { firmaId, tarih: t, kurlar });
  const yeni = [];
  for (const s of satirlar) {
    const var_ = await client.query(
      `SELECT 1 FROM exchange_difference_entries
       WHERE kind='Gerceklesmemis' AND COALESCE(company_id,0)=COALESCE($1,0)
         AND partner_id=$2 AND currency_code=$3 AND rate_date=$4::date`,
      [firmaId || null, s.partner_id, s.currency_code, t]
    );
    if (!var_.rows[0]) yeni.push(s);
  }
  if (!yeni.length) return { tarih: t, kayit_sayisi: 0, gl_document_id: null, satirlar: [] };

  const hs = await kurFarkiHesaplari(client);
  const kar = await resolveAccountId(client, { account_code: hs.kar, country_code: ulkeKodu });
  const zarar = await resolveAccountId(client, { account_code: hs.zarar, country_code: ulkeKodu });
  const alacakHesap = await resolveAccountId(client, {
    account_code: await cariHesapKodu(client, 'Satis'), country_code: ulkeKodu,
  });
  const borcHesap = await resolveAccountId(client, {
    account_code: await cariHesapKodu(client, 'Alis'), country_code: ulkeKodu,
  });

  const lines = [];
  for (const s of yeni) {
    const tutar = Math.abs(s.fark_try);
    // Borç bakiyeli cari (alacağımız) alıcı hesabında; alacak bakiyeli cari satıcı hesabında izlenir.
    const cariHs = s.fc_bakiye > 0 ? alacakHesap : borcHesap;
    const cariBorc = s.fark_try > 0;
    lines.push({
      account_id: cariHs, debit: cariBorc ? tutar : 0, credit: cariBorc ? 0 : tutar,
      partner_id: s.partner_id, description: `Kur değerleme ${s.currency_code}`,
    });
    lines.push({
      account_id: cariBorc ? kar : zarar, debit: cariBorc ? 0 : tutar, credit: cariBorc ? tutar : 0,
      description: `Kur değerleme ${s.partner_code} ${s.currency_code}`,
    });
  }
  const fis = await createJournalEntry(client, {
    firmaId: firmaId || null,
    ulkeKodu,
    fisTipi: 'Mahsup',
    belgeTarihi: t,
    description: `Dönem sonu kur değerleme ${t}`,
    lines,
    kaynakBelgeTipi: 'KUR_DEGERLEME',
    kaynakBelgeId: Math.floor(Date.parse(`${t}T00:00:00Z`) / 86400000) * 1000 + ((Number(firmaId) || 0) % 1000),
    olusturanKullanici: kullaniciKodu,
    kesinlestir: true,
  });
  const kayitlar = [];
  for (const s of yeni) {
    const ledger = await addPartnerLedgerEntry(client, {
      cariId: s.partner_id,
      direction: s.fark_try > 0 ? 'Borc' : 'Alacak',
      amount: 0,
      paraBirimi: s.currency_code,
      exchange_rate: s.kapanis_kuru,
      amountTry: Math.abs(s.fark_try),
      belgeTipi: 'KUR_DEGERLEME',
      belgeId: fis.id,
      description: `Dönem sonu kur değerleme ${t}`,
      hareketTarihi: t,
      createdBy: kullaniciKodu,
    });
    const ins = await client.query(
      `INSERT INTO exchange_difference_entries
         (company_id, partner_id, kind, currency_code, fc_amount, book_rate, settle_rate, difference_try,
          rate_date, source_document_type, source_document_id, gl_document_id, ledger_entry_id, description, created_by)
       VALUES ($1,$2,'Gerceklesmemis',$3,$4,$5,$6,$7,$8::date,'KUR_DEGERLEME',$9,$10,$11,$12,$13)
       RETURNING *`,
      [firmaId || null, s.partner_id, s.currency_code, s.fc_bakiye,
        s.fc_bakiye ? round2(s.defter_try / s.fc_bakiye) : null, s.kapanis_kuru, s.fark_try, t,
        fis.id, fis.id, ledger.id, `Dönem sonu kur değerleme ${t}`, kullaniciKodu]
    );
    kayitlar.push(ins.rows[0]);
  }
  return { tarih: t, kayit_sayisi: kayitlar.length, gl_document_id: fis.id, document_no: fis.document_no, satirlar: kayitlar };
}

/**
 * Gerçekleşmemiş kur farkını tersler (genelde ertesi dönemin ilk günü): aynı tutar ters yönde,
 * böylece gerçekleşen kur farkı yine fatura/defter kuruna göre hesaplanır.
 */
async function degerlemeTersle(client, { firmaId = null, tarih, tersTarihi, kullaniciKodu = null, ulkeKodu = 'TR' }) {
  const t = ymd(tarih);
  const tt = ymd(tersTarihi);
  if (!t || !tt) throw Object.assign(new Error('tarih ve tersTarihi zorunlu.'), { status: 400 });
  const r = await client.query(
    `SELECT * FROM exchange_difference_entries
     WHERE kind='Gerceklesmemis' AND rate_date=$1::date AND reversed_gl_document_id IS NULL
       AND COALESCE(company_id,0)=COALESCE($2,0)
     ORDER BY id`,
    [t, firmaId || null]
  );
  if (!r.rows.length) return { tarih: t, ters_tarihi: tt, kayit_sayisi: 0, gl_document_id: null };
  const glIds = [...new Set(r.rows.map((x) => x.gl_document_id))];
  if (glIds.length !== 1) {
    throw Object.assign(new Error('Değerleme kayıtları tek fişe bağlı değil.'), { status: 409 });
  }
  const orj = await client.query(`SELECT * FROM journal_entry_lines WHERE document_id=$1 ORDER BY line_no, id`, [glIds[0]]);
  const fis = await createJournalEntry(client, {
    firmaId: firmaId || null,
    ulkeKodu,
    fisTipi: 'Ters',
    belgeTarihi: tt,
    description: `Kur değerleme ters kaydı (${t})`,
    lines: orj.rows.map((k) => ({
      account_id: k.account_id, debit: k.credit, credit: k.debit,
      partner_id: k.partner_id, description: `Ters: ${k.description || ''}`.trim(),
    })),
    kaynakBelgeTipi: 'KUR_DEGERLEME_TERS',
    kaynakBelgeId: glIds[0],
    olusturanKullanici: kullaniciKodu,
    kesinlestir: true,
  });
  for (const e of r.rows) {
    const orjLedger = await client.query(`SELECT * FROM partner_ledger_entries WHERE id=$1`, [e.ledger_entry_id]);
    const o = orjLedger.rows[0];
    const ters = await addPartnerLedgerEntry(client, {
      cariId: e.partner_id,
      direction: o.direction === 'Borc' ? 'Alacak' : 'Borc',
      amount: 0,
      paraBirimi: e.currency_code,
      exchange_rate: Number(o.exchange_rate) || 1,
      amountTry: Number(o.amount_try),
      belgeTipi: 'KUR_DEGERLEME_TERS',
      belgeId: fis.id,
      description: `Kur değerleme ters kaydı (${t})`,
      hareketTarihi: tt,
      createdBy: kullaniciKodu,
    });
    await client.query(
      `UPDATE exchange_difference_entries
         SET reversed_gl_document_id=$2, reversed_ledger_entry_id=$3, reversed_at=NOW() WHERE id=$1`,
      [e.id, fis.id, ters.id]
    );
  }
  return { tarih: t, ters_tarihi: tt, kayit_sayisi: r.rows.length, gl_document_id: fis.id, document_no: fis.document_no };
}

module.exports = {
  BASE_CURRENCY,
  gerceklesenFark,
  gerceklesenKurFarkiIsle,
  degerlemeOnizleme,
  degerlemeKaydet,
  degerlemeTersle,
  kurFarkiHesaplari,
};
