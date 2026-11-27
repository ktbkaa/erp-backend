const { addPartnerLedgerEntry } = require('./cariHareketService');
const { normCurrency, isBaseCurrency, resolveDocumentRate, ymd, round6 } = require('./kurService');
const {
  createJournalEntry,
  hasSourceJournalEntry,
  resolveAccountId,
  round2,
} = require('./muhasebeMotorService');

async function findRule(client, belgeTipi) {
  const r = await client.query(
    `SELECT * FROM account_determination_rules
     WHERE document_type=$1 AND is_active=TRUE
     ORDER BY CASE WHEN rule_code LIKE '%_TR' THEN 0 ELSE 1 END
     LIMIT 1`,
    [belgeTipi]
  );
  return r.rows[0] || null;
}

async function taxRate(client, ulkeKodu, rate) {
  const r = await client.query(
    `
    SELECT vk.tax_code, vk.input_tax_account_code, vk.output_tax_account_code, vo.rate
    FROM fin_tax_codes vk
    JOIN fin_tax_rates vo ON vo.tax_code_id = vk.id
    WHERE vk.country_code=$1 AND vk.is_active
      AND vo.valid_from <= CURRENT_DATE
      AND (vo.valid_to IS NULL OR vo.valid_to >= CURRENT_DATE)
      AND ABS(vo.rate - $2) < 0.01
    ORDER BY vo.valid_from DESC
    LIMIT 1
    `,
    [ulkeKodu || 'TR', Number(rate) || 20]
  );
  return r.rows[0] || null;
}

function isIadeFatura(fatura) {
  return fatura.is_return === true || /iade/i.test(String(fatura.invoice_type || ''));
}

/**
 * Belge para biriminden TRY'ye. Toplam (odenecek) esas alınır; yuvarlama farkı KDV satırına
 * (KDV yoksa mal/hizmet satırına) eklenir ki fiş dengeli kalsın.
 * FC tutarlar dengeli değilse (iskonto/tevkifat kaynaklı) fark olduğu gibi bırakılır ve
 * motor FIS_DENGESIZ ile reddeder — TRY ile aynı davranış.
 */
function tryTutarlari({ mal, kdv, odenecek, rate }) {
  const r = Number(rate) > 0 ? Number(rate) : 1;
  const odenecekTry = round2(odenecek * r);
  let malTry = round2(mal * r);
  let kdvTry = round2(kdv * r);
  const fcDengeli = Math.abs(odenecek - (mal + kdv)) < 0.005;
  if (fcDengeli) {
    const fark = round2(odenecekTry - (malTry + kdvTry));
    if (Math.abs(fark) <= 0.02) {
      if (kdv > 0) kdvTry = round2(kdvTry + fark);
      else malTry = round2(malTry + fark);
    }
  }
  return { malTry, kdvTry, odenecekTry };
}

async function faturaKuru(client, fatura, iade) {
  const cur = normCurrency(fatura.currency_code);
  if (isBaseCurrency(cur)) return { currency_code: 'TRY', rate: 1, rate_date: null, source: 'TRY' };

  if (iade && fatura.source_document_id) {
    const src = await client.query(
      `SELECT currency_code, exchange_rate, exchange_rate_date FROM invoices WHERE id=$1`,
      [fatura.source_document_id]
    );
    const k = src.rows[0];
    if (k && normCurrency(k.currency_code) === cur && Number(k.exchange_rate) > 0 && Number(k.exchange_rate) !== 1) {
      return {
        currency_code: cur,
        rate: round6(k.exchange_rate),
        rate_date: ymd(k.exchange_rate_date),
        source: 'IadeKaynakFatura',
      };
    }
  }
  const tarih = String(fatura.rate_option || '').toLowerCase().startsWith('sevk')
    ? (fatura.stock_date || fatura.invoice_date)
    : fatura.invoice_date;
  return resolveDocumentRate(client, {
    currency: cur,
    entered: fatura.exchange_rate,
    date: tarih || new Date(),
    rateType: fatura.rate_type || 'TCMB-SATIS',
  });
}

/**
 * Onaylı faturadan muhasebe belgesi + cari hareket.
 * Idempotent: aynı fatura ikinci kez işlenmez.
 *
 * Para birimi: fatura tutarları belge para birimindedir. Dövizli faturada kur (girilen ya da
 * TCMB/kur tablosu) ile TRY karşılığı hesaplanır: fiş kalemleri debit/credit = TRY,
 * debit_fc/credit_fc = döviz; cari hareket amount = döviz, amount_try = TRY.
 * İade (SatisIade/AlisIade): ters yönlü fiş + cari; kur kaynak faturadan alınır.
 */
async function faturadanMuhasebe(client, faturaId, { kullaniciKodu = null, ulkeKodu = 'TR' } = {}) {
  const f = await client.query(`SELECT * FROM invoices WHERE id=$1 FOR UPDATE`, [faturaId]);
  if (!f.rows[0]) throw Object.assign(new Error('Fatura bulunamadı.'), { status: 404 });
  const fatura = f.rows[0];

  const iade = isIadeFatura(fatura);
  const type = String(fatura.invoice_type || '').toLowerCase().includes('alis') ? 'Alis' : 'Satis';
  const kaynakTip = `${type === 'Alis' ? 'ALIS' : 'SATIS'}${iade ? '_IADE' : ''}_FATURA`;
  const kisaAd = `${type === 'Alis' ? 'Alış' : 'Satış'}${iade ? ' iade' : ''}`;

  const mevcut = await hasSourceJournalEntry(client, {
    firmaId: fatura.company_id,
    kaynakBelgeTipi: kaynakTip,
    kaynakBelgeId: faturaId,
  });
  if (mevcut) {
    throw Object.assign(
      new Error(`Fatura zaten muhasebeleştirilmiş (fiş ${mevcut.document_no}).`),
      { status: 409, kod: 'MUKERRER_FIS', gl_document_id: mevcut.id }
    );
  }

  const tutar = (v) => (iade ? Math.abs(Number(v) || 0) : Number(v) || 0);
  const mal = round2(tutar(fatura.net_amount || fatura.total_amount || 0));
  const kdv = round2(tutar(fatura.tax_amount || 0));
  const odenecek = round2(tutar(fatura.payable_amount || mal + kdv));
  if (odenecek <= 0) throw Object.assign(new Error('Fatura tutarı sıfır.'), { status: 400 });

  const kur = await faturaKuru(client, fatura, iade);
  const doviz = !isBaseCurrency(kur.currency_code);
  const { malTry, kdvTry, odenecekTry } = tryTutarlari({ mal, kdv, odenecek, rate: kur.rate });

  const kural = await findRule(client, type);
  if (!kural) {
    throw Object.assign(new Error(`Hesap belirleme kuralı yok: ${type}. Finans → Hesap Belirleme Kuralları.`), {
      status: 400,
      kod: 'KURAL_YOK',
    });
  }

  const country = ulkeKodu || 'TR';
  const lines = [];
  const kalem = (hesap, taraf, tryTutar, fcTutar, extra = {}) => {
    const l = {
      account_id: hesap,
      debit: taraf === 'B' ? tryTutar : 0,
      credit: taraf === 'A' ? tryTutar : 0,
      ...extra,
    };
    if (doviz) {
      l.currency_code = kur.currency_code;
      l.exchange_rate = kur.rate;
      l.debit_fc = taraf === 'B' ? fcTutar : null;
      l.credit_fc = taraf === 'A' ? fcTutar : null;
    }
    return l;
  };

  if (type === 'Satis') {
    const alici = await resolveAccountId(client, { account_code: kural.debit_account_code, country_code: country });
    const gelir = await resolveAccountId(client, { account_code: kural.credit_account_code, country_code: country });
    // Satış: Borç alıcı / Alacak gelir+KDV. İade: ters.
    lines.push(kalem(alici, iade ? 'A' : 'B', odenecekTry, odenecek, {
      partner_id: fatura.partner_id, description: fatura.invoice_no,
    }));
    lines.push(kalem(gelir, iade ? 'B' : 'A', malTry, mal, { description: fatura.invoice_no }));
    if (kdv > 0) {
      const vo = await taxRate(client, country, fatura.vat_rate_default || 20);
      const kdvKod = vo?.output_tax_account_code || '391.01.001';
      const kdvHesap = await resolveAccountId(client, { account_code: kdvKod, country_code: country });
      lines.push(kalem(kdvHesap, iade ? 'B' : 'A', kdvTry, kdv, {
        tax_code: vo?.tax_code || 'KDV20', description: `KDV ${fatura.invoice_no}`,
      }));
    }
  } else {
    const stok = await resolveAccountId(client, { account_code: kural.debit_account_code, country_code: country });
    const satici = await resolveAccountId(client, { account_code: kural.credit_account_code, country_code: country });
    // Alış: Borç stok+KDV / Alacak satıcı. İade: ters.
    lines.push(kalem(stok, iade ? 'A' : 'B', malTry, mal, { description: fatura.invoice_no }));
    if (kdv > 0) {
      const vo = await taxRate(client, country, fatura.vat_rate_default || 20);
      const kdvKod = vo?.input_tax_account_code || '191.01.001';
      const kdvHesap = await resolveAccountId(client, { account_code: kdvKod, country_code: country });
      lines.push(kalem(kdvHesap, iade ? 'A' : 'B', kdvTry, kdv, {
        tax_code: vo?.tax_code || 'KDV20', description: `KDV ${fatura.invoice_no}`,
      }));
    }
    lines.push(kalem(satici, iade ? 'B' : 'A', odenecekTry, odenecek, {
      partner_id: fatura.partner_id, description: fatura.invoice_no,
    }));
  }

  const fis = await createJournalEntry(client, {
    firmaId: fatura.company_id || null,
    ulkeKodu: country,
    fisTipi: 'Mahsup',
    belgeTarihi: fatura.invoice_date || null,
    description: `${kisaAd} fatura ${fatura.invoice_no}`,
    paraBirimi: kur.currency_code,
    exchange_rate: kur.rate,
    lines,
    kaynakBelgeTipi: kaynakTip,
    kaynakBelgeId: faturaId,
    olusturanKullanici: kullaniciKodu,
    kesinlestir: true,
  });

  const cariYon = (type === 'Satis') !== iade ? 'Borc' : 'Alacak';
  await addPartnerLedgerEntry(client, {
    cariId: fatura.partner_id,
    direction: cariYon,
    amount: odenecek,
    paraBirimi: kur.currency_code,
    exchange_rate: kur.rate,
    amountTry: odenecekTry,
    belgeTipi: kaynakTip,
    belgeId: faturaId,
    description: `${kisaAd} fatura ${fatura.invoice_no}`,
    hareketTarihi: doviz ? ymd(fatura.invoice_date) : null,
    dueDate: fatura.due_date || null,
  });

  const isaret = iade ? -1 : 1;
  await client.query(
    `UPDATE invoices SET
       is_posted=TRUE, gl_document_id=$2, status=COALESCE(status,'Onayli'),
       exchange_rate=$3, exchange_rate_date=$4::date,
       net_amount_try=$5, tax_amount_try=$6, payable_amount_try=$7
     WHERE id=$1`,
    [faturaId, fis.id, kur.rate, kur.rate_date, isaret * malTry, isaret * kdvTry, isaret * odenecekTry]
  );

  return {
    gl_document_id: fis.id,
    document_no: fis.document_no,
    amount: odenecek,
    mal_hizmet: mal,
    kdv,
    currency_code: kur.currency_code,
    exchange_rate: kur.rate,
    exchange_rate_source: kur.source,
    amount_try: odenecekTry,
    mal_hizmet_try: malTry,
    kdv_try: kdvTry,
    is_iade: iade,
    kural,
    kullaniciKodu,
    line_count: lines.length,
  };
}

const FATURA_KAYNAK_TIPLERI = ['SATIS_FATURA', 'ALIS_FATURA', 'SATIS_IADE_FATURA', 'ALIS_IADE_FATURA'];

/**
 * Fatura fişine ters kayıt atıldığında cari hareketi de aynı döviz/TRY tutarlarla tersler
 * (kur yeniden hesaplanmaz — orijinal kur ve TRY tutar kopyalanır). Fatura muhasebe bayrağı sıfırlanır.
 */
async function faturaTersKayitCari(client, { kaynakTip, faturaId, kullaniciKodu = null }) {
  if (!FATURA_KAYNAK_TIPLERI.includes(kaynakTip) || faturaId == null) return { reversed: 0 };
  const tersTip = `${kaynakTip}_IPTAL`;
  const zaten = await client.query(
    `SELECT 1 FROM partner_ledger_entries WHERE document_type=$1 AND document_id=$2 LIMIT 1`,
    [tersTip, faturaId]
  );
  if (zaten.rows[0]) return { reversed: 0 };
  const org = await client.query(
    `SELECT * FROM partner_ledger_entries WHERE document_type=$1 AND document_id=$2 ORDER BY id`,
    [kaynakTip, faturaId]
  );
  for (const h of org.rows) {
    await addPartnerLedgerEntry(client, {
      cariId: h.partner_id,
      direction: h.direction === 'Borc' ? 'Alacak' : 'Borc',
      amount: Number(h.amount),
      paraBirimi: h.currency_code,
      exchange_rate: Number(h.exchange_rate) || 1,
      amountTry: h.amount_try != null ? Number(h.amount_try) : null,
      belgeTipi: tersTip,
      belgeId: faturaId,
      description: `Ters kayıt ← ${h.movement_no}`,
      createdBy: kullaniciKodu,
    });
  }
  // Belge kilidi (BK001) muhasebeleşmiş faturanın kilidini açmayı engeller; bu servis
  // akışı (fiş ters kaydı) kilidi bilinçli kaldırır, bypass yalnız bu UPDATE için açılır.
  const oncekiBypass = (await client.query(
    `SELECT COALESCE(current_setting('erp.belge_kilit_bypass', true), '') AS v`
  )).rows[0].v;
  await client.query(`SELECT set_config('erp.belge_kilit_bypass', 'on', true)`);
  try {
    await client.query(
      `UPDATE invoices SET is_posted=FALSE, gl_document_id=NULL WHERE id=$1`,
      [faturaId]
    );
  } finally {
    await client.query(`SELECT set_config('erp.belge_kilit_bypass', $1, true)`, [oncekiBypass]);
  }
  return { reversed: org.rows.length };
}

module.exports = {
  faturadanMuhasebe, findRule, tryTutarlari, isIadeFatura, faturaTersKayitCari, FATURA_KAYNAK_TIPLERI,
};
