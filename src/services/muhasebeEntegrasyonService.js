const { cariHareketEkle } = require('./cariHareketService');
const {
  fisOlustur,
  kaynakFisVarMi,
  hesapIdCoz,
  round2,
} = require('./muhasebeMotorService');

async function kuralBul(client, belgeTipi) {
  const r = await client.query(
    `SELECT * FROM account_determination_rules
     WHERE document_type=$1 AND is_active=TRUE
     ORDER BY CASE WHEN rule_code LIKE '%_TR' THEN 0 ELSE 1 END
     LIMIT 1`,
    [belgeTipi]
  );
  return r.rows[0] || null;
}

async function vergiOran(client, ulkeKodu, rate) {
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

/**
 * Onaylı faturadan muhasebe belgesi + cari hareket.
 * Idempotent: aynı fatura ikinci kez işlenmez.
 */
async function faturadanMuhasebe(client, faturaId, { kullaniciKodu = null, ulkeKodu = 'TR' } = {}) {
  const f = await client.query(`SELECT * FROM invoices WHERE id=$1 FOR UPDATE`, [faturaId]);
  if (!f.rows[0]) throw Object.assign(new Error('Fatura bulunamadı.'), { status: 404 });
  const fatura = f.rows[0];

  const type = String(fatura.invoice_type || '').toLowerCase().includes('alis') ? 'Alis' : 'Satis';
  const kaynakTip = type === 'Alis' ? 'ALIS_FATURA' : 'SATIS_FATURA';

  const mevcut = await kaynakFisVarMi(client, {
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

  const mal = round2(fatura.net_amount || fatura.total_amount || 0);
  const kdv = round2(fatura.tax_amount || 0);
  const odenecek = round2(fatura.payable_amount || mal + kdv);
  if (odenecek <= 0) throw Object.assign(new Error('Fatura tutarı sıfır.'), { status: 400 });

  const kural = await kuralBul(client, type);
  if (!kural) {
    throw Object.assign(new Error(`Hesap belirleme kuralı yok: ${type}. Finans → Hesap Belirleme Kuralları.`), {
      status: 400,
      kod: 'KURAL_YOK',
    });
  }

  const country = ulkeKodu || 'TR';
  const lines = [];

  if (type === 'Satis') {
    const alici = await hesapIdCoz(client, { account_code: kural.debit_account_code, country_code: country });
    const gelir = await hesapIdCoz(client, { account_code: kural.credit_account_code, country_code: country });
    lines.push({
      account_id: alici, debit: odenecek, credit: 0,
      partner_id: fatura.partner_id, description: fatura.invoice_no,
    });
    lines.push({
      account_id: gelir, debit: 0, credit: mal,
      description: fatura.invoice_no,
    });
    if (kdv > 0) {
      const vo = await vergiOran(client, country, fatura.vat_rate_varsayilan || 20);
      const kdvKod = vo?.output_tax_account_code || '391.01.001';
      const kdvHesap = await hesapIdCoz(client, { account_code: kdvKod, country_code: country });
      lines.push({
        account_id: kdvHesap, debit: 0, credit: kdv,
        tax_code: vo?.tax_code || 'KDV20', description: `KDV ${fatura.invoice_no}`,
      });
    }
  } else {
    const stok = await hesapIdCoz(client, { account_code: kural.debit_account_code, country_code: country });
    const satici = await hesapIdCoz(client, { account_code: kural.credit_account_code, country_code: country });
    lines.push({
      account_id: stok, debit: mal, credit: 0, description: fatura.invoice_no,
    });
    if (kdv > 0) {
      const vo = await vergiOran(client, country, fatura.vat_rate_varsayilan || 20);
      const kdvKod = vo?.input_tax_account_code || '191.01.001';
      const kdvHesap = await hesapIdCoz(client, { account_code: kdvKod, country_code: country });
      lines.push({
        account_id: kdvHesap, debit: kdv, credit: 0,
        tax_code: vo?.tax_code || 'KDV20', description: `KDV ${fatura.invoice_no}`,
      });
    }
    lines.push({
      account_id: satici, debit: 0, credit: odenecek,
      partner_id: fatura.partner_id, description: fatura.invoice_no,
    });
  }

  const fis = await fisOlustur(client, {
    firmaId: fatura.company_id || null,
    ulkeKodu: country,
    fisTipi: 'Mahsup',
    belgeTarihi: fatura.invoice_date || null,
    description: `${type} fatura ${fatura.invoice_no}`,
    paraBirimi: fatura.currency_code || 'TRY',
    exchange_rate: fatura.exchange_rate || 1,
    lines,
    kaynakBelgeTipi: kaynakTip,
    kaynakBelgeId: faturaId,
    olusturanKullanici: kullaniciKodu,
    kesinlestir: true,
  });

  if (type === 'Satis') {
    await cariHareketEkle(client, {
      cariId: fatura.partner_id,
      direction: 'Borc',
      amount: odenecek,
      belgeTipi: 'SATIS_FATURA',
      belgeId: faturaId,
      description: `Satış fatura ${fatura.invoice_no}`,
    });
  } else {
    await cariHareketEkle(client, {
      cariId: fatura.partner_id,
      direction: 'Alacak',
      amount: odenecek,
      belgeTipi: 'ALIS_FATURA',
      belgeId: faturaId,
      description: `Alış fatura ${fatura.invoice_no}`,
    });
  }

  await client.query(
    `UPDATE invoices SET is_posted=TRUE, gl_document_id=$2, status=COALESCE(status,'Onayli')
     WHERE id=$1`,
    [faturaId, fis.id]
  ).catch(async () => {
    await client.query(
      `UPDATE invoices SET is_posted=TRUE WHERE id=$1`,
      [faturaId]
    ).catch(() => {});
  });

  return {
    gl_document_id: fis.id,
    document_no: fis.document_no,
    amount: odenecek,
    mal_hizmet: mal,
    kdv,
    kural,
    kullaniciKodu,
    line_sayisi: lines.length,
  };
}

module.exports = { faturadanMuhasebe, kuralBul };
