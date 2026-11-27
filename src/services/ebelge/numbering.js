/**
 * GİB belge numarası: 3 karakter seri + 4 hane yıl + 9 hane sıra (ör. EFT2026000000001).
 * Seri firma/tür/önek/yıl bazında satır kilidiyle (FOR UPDATE) boşluksuz artar; çağıran işlem
 * geri alınırsa numara da geri alınır.
 */

const KINDS = Object.freeze(['EFATURA', 'EARSIV', 'EIRSALIYE']);

function formatGibNumber(prefix, year, seq) {
  return `${prefix}${year}${String(seq).padStart(9, '0')}`;
}

async function nextGibNumber(client, { companyId, kind, prefix, year }) {
  if (!KINDS.includes(kind)) throw new Error(`Geçersiz seri türü: ${kind}`);
  const p = String(prefix || '').toUpperCase();
  if (!/^[A-Z0-9]{3}$/.test(p)) {
    const err = new Error(`GİB seri öneki 3 karakter (A-Z/0-9) olmalıdır: '${prefix}'`);
    err.status = 400;
    err.code = 'EBELGE_SERI_ONEK';
    throw err;
  }
  const y = Number(year);
  const cid = Number(companyId) || 0;
  await client.query(
    `INSERT INTO e_document_series (company_id, series_kind, prefix, year, last_number)
     VALUES ($1,$2,$3,$4,0)
     ON CONFLICT (company_id, series_kind, prefix, year) DO NOTHING`,
    [cid, kind, p, y]
  );
  const r = await client.query(
    `SELECT id, last_number FROM e_document_series
     WHERE company_id=$1 AND series_kind=$2 AND prefix=$3 AND year=$4
     FOR UPDATE`,
    [cid, kind, p, y]
  );
  const next = Number(r.rows[0].last_number) + 1;
  if (next > 999999999) {
    const err = new Error(`${p}${y} serisi doldu.`);
    err.status = 409;
    err.code = 'EBELGE_SERI_DOLU';
    throw err;
  }
  await client.query(
    `UPDATE e_document_series SET last_number=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
    [r.rows[0].id, next]
  );
  return formatGibNumber(p, y, next);
}

module.exports = { nextGibNumber, formatGibNumber, KINDS };
