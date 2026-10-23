/**
 * Çift taraflı muhasebe motoru — ülke bağımsız çekirdek.
 * Kurallar: denge, dönem kilidi, kesin fiş değişmez, ters kayıt, source idempotency.
 */

const { sonrakiBelgeNo } = require('../utils/belgeNo');

const EPS = 0.005;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function assertLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw Object.assign(new Error('Muhasebe fişinde en az iki kalem olmalı (borç ve credit).'), {
      status: 400,
      kod: 'FIS_KALEM_EKSIK',
    });
  }
  let debit = 0;
  let credit = 0;
  for (const k of lines) {
    if (!k.account_id && !k.account_code) {
      throw Object.assign(new Error('Her kalemde hesap seçilmeli.'), { status: 400, kod: 'HESAP_ZORUNLU' });
    }
    const b = round2(k.debit);
    const a = round2(k.credit);
    if (b < 0 || a < 0 || (b > 0 && a > 0) || (b === 0 && a === 0)) {
      throw Object.assign(
        new Error('Her kalemde yalnızca borç veya yalnızca credit tutarı > 0 olmalı.'),
        { status: 400, kod: 'KALEM_BORC_ALACAK' }
      );
    }
    debit += b;
    credit += a;
  }
  debit = round2(debit);
  credit = round2(credit);
  if (Math.abs(debit - credit) >= EPS) {
    throw Object.assign(
      new Error(
        `Fiş dengeli değil: toplam borç ${debit} ≠ toplam credit ${credit}. `
        + 'Çift taraflı muhasebede iki taraf eşit olmalıdır.'
      ),
      { status: 400, kod: 'FIS_DENGESIZ', debit, credit }
    );
  }
  return { debit, credit };
}

async function hesapIdCoz(client, { account_id, account_code, country_code }) {
  if (account_id) {
    const r = await client.query(
      `SELECT id, account_code, account_type, is_active FROM gl_accounts WHERE id=$1`,
      [account_id]
    );
    if (!r.rows[0]) throw Object.assign(new Error('Hesap bulunamadı.'), { status: 400 });
    if (r.rows[0].is_active === false) {
      throw Object.assign(new Error(`Pasif hesap kullanılamaz: ${r.rows[0].account_code}`), {
        status: 400,
        kod: 'HESAP_PASIF',
      });
    }
    if (r.rows[0].account_type !== 'Dogrudan') {
      throw Object.assign(
        new Error(`Yalnızca Doğrudan (yaprak) hesaplara fiş yazılır: ${r.rows[0].account_code} (${r.rows[0].account_type}).`),
        { status: 400, kod: 'HESAP_TIPI' }
      );
    }
    return r.rows[0].id;
  }
  const r = await client.query(
    `SELECT id, account_type, is_active FROM gl_accounts
     WHERE account_code=$1 AND ($2::text IS NULL OR country_code=$2 OR country_code IS NULL)
     ORDER BY CASE WHEN country_code=$2 THEN 0 ELSE 1 END
     LIMIT 1`,
    [account_code, country_code || null]
  );
  if (!r.rows[0]) {
    throw Object.assign(new Error(`Hesap kodu bulunamadı: ${account_code}`), { status: 400 });
  }
  if (r.rows[0].is_active === false) {
    throw Object.assign(new Error(`Pasif hesap: ${account_code}`), { status: 400, kod: 'HESAP_PASIF' });
  }
  if (r.rows[0].account_type !== 'Dogrudan') {
    throw Object.assign(new Error(`Doğrudan olmayan hesap: ${account_code}`), { status: 400, kod: 'HESAP_TIPI' });
  }
  return r.rows[0].id;
}

async function donemBul(client, { firmaId, belgeTarihi }) {
  const t = belgeTarihi || new Date().toISOString().slice(0, 10);
  const r = await client.query(
    `
    SELECT d.* FROM accounting_periods d
    WHERE d.start_date <= $1::date AND d.end_date >= $1::date
      AND (d.company_id IS NULL OR d.company_id = $2)
    ORDER BY d.company_id NULLS LAST
    LIMIT 1
    `,
    [t, firmaId || null]
  );
  return r.rows[0] || null;
}

async function donemAcikMi(client, opts) {
  const d = await donemBul(client, opts);
  if (!d) {
    throw Object.assign(
      new Error('Belge tarihi için açık muhasebe dönemi tanımlı değil. Önce mali yıl/dönem oluşturun.'),
      { status: 400, kod: 'DONEM_YOK' }
    );
  }
  if (d.status === 'Kapali') {
    throw Object.assign(
      new Error(
        `Kapalı döneme (${d.start_date} – ${d.end_date}) kayıt yapılamaz. `
        + 'Dönemi yetkili kullanıcı yeniden açabilir veya tarihi açık bir döneme taşıyın.'
      ),
      { status: 400, kod: 'DONEM_KAPALI', period_id: d.id }
    );
  }
  return d;
}

async function kaynakFisVarMi(client, { firmaId, kaynakBelgeTipi, kaynakBelgeId }) {
  if (!kaynakBelgeTipi || kaynakBelgeId == null) return null;
  const r = await client.query(
    `
    SELECT id, document_no, status FROM journal_entries
    WHERE source_document_type=$1 AND source_document_id=$2
      AND status='Onayli' AND reversal_document_id IS NULL
      AND ($3::int IS NULL OR company_id=$3 OR company_id IS NULL)
    ORDER BY id DESC LIMIT 1
    `,
    [kaynakBelgeTipi, kaynakBelgeId, firmaId || null]
  );
  return r.rows[0] || null;
}

/**
 * Taslak veya doğrudan Onayli fiş oluştur.
 */
async function fisOlustur(client, {
  firmaId = null,
  ulkeKodu = 'TR',
  islemUlkeKodu = null,
  vergiUlkeKodu = null,
  fisTipi = 'Mahsup',
  belgeTarihi = null,
  description = null,
  paraBirimi = 'TRY',
  exchange_rate = 1,
  lines,
  kaynakBelgeTipi = null,
  kaynakBelgeId = null,
  olusturanKullanici = null,
  kesinlestir = false,
  status = 'Taslak',
} = {}) {
  const mevcut = await kaynakFisVarMi(client, { firmaId, kaynakBelgeTipi, kaynakBelgeId });
  if (mevcut && (kesinlestir || status === 'Onayli')) {
    throw Object.assign(
      new Error(`Bu source belge zaten muhasebeleştirilmiş (fiş ${mevcut.document_no}). Mükerrer fiş oluşturulmaz.`),
      { status: 409, kod: 'MUKERRER_FIS', gl_document_id: mevcut.id }
    );
  }

  const { debit, credit } = assertLines(lines);
  const tarih = belgeTarihi || new Date().toISOString().slice(0, 10);
  let period = null;
  if (kesinlestir || status === 'Onayli') {
    period = await donemAcikMi(client, { firmaId, belgeTarihi: tarih });
  } else {
    period = await donemBul(client, { firmaId, belgeTarihi: tarih });
  }

  const no = await sonrakiBelgeNo(client, 'MUHASEBE_BELGE').catch(async () => {
    const n = await client.query(`SELECT COUNT(*)::int + 1 AS n FROM journal_entries`);
    return `MB${String(n.rows[0].n).padStart(5, '0')}`;
  });

  const hedefDurum = kesinlestir ? 'Onayli' : (status || 'Taslak');
  let yevmiyeNo = null;
  if (hedefDurum === 'Onayli') {
    const y = await client.query(
      `SELECT COALESCE(MAX(journal_number),0)+1 AS n FROM journal_entries
       WHERE COALESCE(company_id,0)=COALESCE($1,0) AND EXTRACT(YEAR FROM document_date)=EXTRACT(YEAR FROM $2::date)`,
      [firmaId, tarih]
    );
    yevmiyeNo = y.rows[0].n;
  }

  const baslik = await client.query(
    `
    INSERT INTO journal_entries
      (document_no, document_date, description, status, voucher_type, company_id, country_code,
       transaction_country_code, tax_country_code, currency_code, exchange_rate, period_id,
       source_document_type, source_document_id, created_by,
       approved_by, posted_at, journal_number, is_locked)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
       $16, $17, $18, $19)
    RETURNING id
    `,
    [
      no, tarih, description, hedefDurum, fisTipi, firmaId, ulkeKodu,
      islemUlkeKodu || ulkeKodu, vergiUlkeKodu || ulkeKodu, paraBirimi, exchange_rate,
      period?.id || null, kaynakBelgeTipi, kaynakBelgeId, olusturanKullanici,
      hedefDurum === 'Onayli' ? olusturanKullanici : null,
      hedefDurum === 'Onayli' ? new Date() : null,
      yevmiyeNo,
      hedefDurum === 'Onayli',
    ]
  );
  const belgeId = baslik.rows[0].id;

  let sira = 1;
  for (const k of lines) {
    const hid = await hesapIdCoz(client, {
      account_id: k.account_id,
      account_code: k.account_code,
      country_code: ulkeKodu,
    });
    await client.query(
      `
      INSERT INTO journal_entry_lines
        (document_id, account_id, debit, credit, description, line_no, partner_id,
         currency_code, exchange_rate, debit_yb, credit_yb, tax_code, cost_center, project_code)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `,
      [
        belgeId, hid, round2(k.debit), round2(k.credit), k.description || null, sira++,
        k.partner_id || null, k.currency_code || paraBirimi, k.exchange_rate != null ? k.exchange_rate : exchange_rate,
        round2(k.debit_yb || k.debit), round2(k.credit_yb || k.credit),
        k.tax_code || null, k.cost_center || null, k.project_code || null,
      ]
    );
  }

  return { id: belgeId, document_no: no, toplam_borc: debit, toplam_alacak: credit, status: hedefDurum };
}

async function fisKesinlestir(client, belgeId, { kullaniciKodu = null, firmaId = null } = {}) {
  const b = await client.query(
    `SELECT * FROM journal_entries WHERE id=$1 FOR UPDATE`,
    [belgeId]
  );
  if (!b.rows[0]) throw Object.assign(new Error('Fiş bulunamadı.'), { status: 404 });
  const bel = b.rows[0];
  if (bel.status === 'Onayli') {
    throw Object.assign(new Error('Fiş zaten kesinleşmiş.'), { status: 400, kod: 'ZATEN_KESIN' });
  }
  if (bel.status === 'Iptal') {
    throw Object.assign(new Error('İptal fiş kesinleştirilemez.'), { status: 400 });
  }
  const kalemler = await client.query(
    `SELECT * FROM journal_entry_lines WHERE document_id=$1 ORDER BY id`,
    [belgeId]
  );
  assertLines(kalemler.rows.map((k) => ({
    account_id: k.account_id,
    debit: k.debit,
    credit: k.credit,
  })));
  for (const k of kalemler.rows) {
    await hesapIdCoz(client, { account_id: k.account_id, country_code: bel.country_code });
  }
  const period = await donemAcikMi(client, {
    firmaId: firmaId || bel.company_id,
    belgeTarihi: bel.document_date,
  });
  if (bel.source_document_type && bel.source_document_id) {
    const muk = await kaynakFisVarMi(client, {
      firmaId: bel.company_id,
      kaynakBelgeTipi: bel.source_document_type,
      kaynakBelgeId: bel.source_document_id,
    });
    if (muk && Number(muk.id) !== Number(belgeId)) {
      throw Object.assign(new Error(`Kaynak belge başka fişte muhasebeleşmiş: ${muk.document_no}`), {
        status: 409,
        kod: 'MUKERRER_FIS',
      });
    }
  }
  const y = await client.query(
    `SELECT COALESCE(MAX(journal_number),0)+1 AS n FROM journal_entries
     WHERE COALESCE(company_id,0)=COALESCE($1,0)
       AND EXTRACT(YEAR FROM document_date)=EXTRACT(YEAR FROM $2::date)
       AND status='Onayli'`,
    [bel.company_id, bel.document_date]
  );
  await client.query(
    `
    UPDATE journal_entries SET
      status='Onayli', is_locked=TRUE, period_id=$2,
      approved_by=COALESCE($3, approved_by),
      posted_at=NOW(), journal_number=$4
    WHERE id=$1
    `,
    [belgeId, period.id, kullaniciKodu, y.rows[0].n]
  );
  return { id: Number(belgeId), journal_number: y.rows[0].n };
}

/**
 * Kesinleşmiş fişin tersi — orijinal is_locked kalır.
 */
async function fisTersKayit(client, belgeId, { kullaniciKodu = null, description = null } = {}) {
  const b = await client.query(`SELECT * FROM journal_entries WHERE id=$1 FOR UPDATE`, [belgeId]);
  if (!b.rows[0]) throw Object.assign(new Error('Fiş bulunamadı.'), { status: 404 });
  const bel = b.rows[0];
  if (bel.status !== 'Onayli') {
    throw Object.assign(new Error('Yalnızca kesinleşmiş (Onaylı) fişe ters kayıt uygulanır.'), {
      status: 400,
      kod: 'TERS_YALNIZ_ONAYLI',
    });
  }
  if (bel.reversal_document_id) {
    throw Object.assign(new Error('Bu fiş için ters kayıt zaten oluşturulmuş.'), {
      status: 400,
      kod: 'TERS_VAR',
      reversal_document_id: bel.reversal_document_id,
    });
  }
  const kalemler = await client.query(
    `SELECT * FROM journal_entry_lines WHERE document_id=$1 ORDER BY line_no, id`,
    [belgeId]
  );
  const lines = kalemler.rows.map((k) => ({
    account_id: k.account_id,
    debit: k.credit,
    credit: k.debit,
    description: k.description,
    partner_id: k.partner_id,
    currency_code: k.currency_code,
    exchange_rate: k.exchange_rate,
    tax_code: k.tax_code,
  }));
  const ters = await fisOlustur(client, {
    firmaId: bel.company_id,
    ulkeKodu: bel.country_code || 'TR',
    islemUlkeKodu: bel.transaction_country_code,
    vergiUlkeKodu: bel.tax_country_code,
    fisTipi: 'Ters',
    belgeTarihi: bel.document_date,
    description: description || `Ters kayıt ← ${bel.document_no}`,
    paraBirimi: bel.currency_code || 'TRY',
    exchange_rate: bel.exchange_rate || 1,
    lines,
    olusturanKullanici: kullaniciKodu,
    kesinlestir: true,
  });
  await client.query(
    `UPDATE journal_entries SET reversal_document_id=$2, original_document_id=COALESCE(original_document_id, id) WHERE id=$1`,
    [belgeId, ters.id]
  );
  await client.query(
    `UPDATE journal_entries SET original_document_id=$2 WHERE id=$1`,
    [ters.id, belgeId]
  );
  return ters;
}

async function donemKapat(client, donemId, { kullaniciKodu = null } = {}) {
  const r = await client.query(
    `UPDATE accounting_periods SET status='Kapali', closed_by=$2, closed_at=NOW()
     WHERE id=$1 AND status IN ('Acik','YenidenAcik') RETURNING *`,
    [donemId, kullaniciKodu]
  );
  if (!r.rows[0]) throw Object.assign(new Error('Dönem kapatılamadı (zaten kapalı veya yok).'), { status: 400 });
  return r.rows[0];
}

async function donemYenidenAc(client, donemId, { kullaniciKodu = null } = {}) {
  const r = await client.query(
    `UPDATE accounting_periods SET status='YenidenAcik', closed_by=$2
     WHERE id=$1 AND status='Kapali' RETURNING *`,
    [donemId, kullaniciKodu]
  );
  if (!r.rows[0]) throw Object.assign(new Error('Dönem yeniden açılamadı.'), { status: 400 });
  return r.rows[0];
}

module.exports = {
  assertLines,
  hesapIdCoz,
  donemBul,
  donemAcikMi,
  kaynakFisVarMi,
  fisOlustur,
  fisKesinlestir,
  fisTersKayit,
  donemKapat,
  donemYenidenAc,
  round2,
};
