/**
 * Genel onay kapısı.
 *
 * Belge türleri `approval_document_types` kaydından, devreye girme koşulları
 * `approval_rules.document_type_code` bağlı kurallardan okunur. Belge tarafı yalnızca
 * geçiş anında `submitForApproval` çağırır; aktif kural yoksa `{ gated: false }` döner
 * ve belge eski akışına devam eder.
 */

const columnCache = new Map();

function httpError(status, message, kod) {
  const err = new Error(message);
  err.status = status;
  if (kod) err.code = kod;
  return err;
}

function ident(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function asObject(v) {
  if (!v) return {};
  if (typeof v === 'string') {
    try { return JSON.parse(v) || {}; } catch (_) { return {}; }
  }
  return v;
}

async function tableColumns(client, table) {
  if (columnCache.has(table)) return columnCache.get(table);
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = $1`,
    [table],
  );
  const set = new Set(r.rows.map((x) => x.column_name));
  if (set.size) columnCache.set(table, set);
  return set;
}

/** Değer haritasındaki kolonların belge tablosunda var olduğunu doğrular. */
async function validateValueMap(client, table, values, label = 'değer') {
  const cols = await tableColumns(client, table);
  if (!cols.size) throw httpError(400, `Belge tablosu bulunamadı: ${table}`, 'ONAY_BELGE_TABLO_YOK');
  for (const k of Object.keys(asObject(values))) {
    if (!cols.has(k)) {
      throw httpError(400, `${table}.${k} kolonu yok (${label}).`, 'ONAY_BELGE_KOLON_YOK');
    }
  }
}

function normalizeDocType(row) {
  if (!row) return null;
  return {
    ...row,
    pending_values: asObject(row.pending_values),
    approved_values: asObject(row.approved_values),
    outcomes: asObject(row.outcomes),
  };
}

async function getDocumentType(client, code, { activeOnly = true } = {}) {
  if (!code) return null;
  const r = await client.query(
    `SELECT * FROM approval_document_types
     WHERE document_type_code = $1 ${activeOnly ? 'AND is_active = TRUE' : ''}`,
    [code],
  );
  return normalizeDocType(r.rows[0]);
}

async function listDocumentTypes(client, { activeOnly = false } = {}) {
  const r = await client.query(
    `SELECT dt.*,
            (SELECT COUNT(*)::int FROM approval_rules k
              WHERE k.document_type_code = dt.document_type_code AND k.is_active = TRUE) AS active_rule_count
     FROM approval_document_types dt
     ${activeOnly ? 'WHERE dt.is_active = TRUE' : ''}
     ORDER BY dt.module_code, dt.document_type_name`,
  );
  return r.rows.map(normalizeDocType);
}

function pendingStatus(dt) {
  return dt ? dt.pending_values[dt.status_column] ?? null : null;
}

function approvedStatus(dt) {
  return dt ? dt.approved_values[dt.status_column] ?? null : null;
}

function outcomeCodes(dt) {
  return dt ? Object.keys(dt.outcomes) : [];
}

function documentContext(dt, row) {
  const pick = (col) => (col && row ? row[col] ?? null : null);
  return {
    documentNo: pick(dt.no_column),
    status: pick(dt.status_column),
    companyId: pick(dt.company_column),
    plantId: pick(dt.plant_column),
    amount: Number(pick(dt.amount_column)) || 0,
    currency: pick(dt.currency_column) || 'TRY',
  };
}

async function loadDocument(client, dt, documentId, { forUpdate = false } = {}) {
  const r = await client.query(
    `SELECT * FROM ${ident(dt.table_name)} WHERE id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [documentId],
  );
  return r.rows[0] || null;
}

function resolveToken(value, user) {
  if (value === '$now') return { raw: 'CURRENT_TIMESTAMP' };
  if (value === '$user_id') return { value: user?.id ?? null };
  if (value === '$user_code') return { value: user?.user_code ?? null };
  return { value };
}

/** Kayıttaki değer haritasını belgeye yazar; `expectStatus` verilirse yalnız o durumdaysa. */
async function setDocumentValues(client, dt, documentId, values, { user = null, expectStatus } = {}) {
  const map = asObject(values);
  const keys = Object.keys(map);
  if (!keys.length) return 0;
  await validateValueMap(client, dt.table_name, map);
  const params = [documentId];
  const sets = keys.map((k) => {
    const t = resolveToken(map[k], user);
    if (t.raw) return `${ident(k)} = ${t.raw}`;
    params.push(t.value);
    return `${ident(k)} = $${params.length}`;
  });
  let where = 'id = $1';
  if (expectStatus !== undefined) {
    params.push(expectStatus);
    where += ` AND ${ident(dt.status_column)} = $${params.length}`;
  }
  const r = await client.query(
    `UPDATE ${ident(dt.table_name)} SET ${sets.join(', ')} WHERE ${where}`,
    params,
  );
  return r.rowCount;
}

async function logAudit(client, entry) {
  await client.query(
    `INSERT INTO approval_audit_log (
       company_id, document_type_code, screen_id, document_id, document_no, record_id,
       step_line_no, action, from_status, to_status, user_id, user_code, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      entry.company_id || null,
      entry.document_type_code || null,
      entry.screen_id || null,
      entry.document_id || null,
      entry.document_no || null,
      entry.record_id || null,
      entry.step_line_no ?? null,
      entry.action,
      entry.from_status || null,
      entry.to_status || null,
      entry.user?.id || entry.user_id || null,
      entry.user?.user_code || entry.user_code || null,
      entry.notes || null,
    ],
  );
}

async function listAudit(client, {
  documentTypeCode = null, documentId = null, recordId = null, companyId = null, limit = 500,
} = {}) {
  const params = [];
  const where = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (documentTypeCode) add('a.document_type_code = ?', documentTypeCode);
  if (documentId) add('a.document_id = ?', Number(documentId));
  if (recordId) add('a.record_id = ?', Number(recordId));
  if (companyId) add('(a.company_id IS NULL OR a.company_id = ?)', companyId);
  params.push(Math.min(Number(limit) || 500, 2000));
  const r = await client.query(
    `SELECT a.*, dt.document_type_name, k.approval_no,
            CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) AS user_name
     FROM approval_audit_log a
     LEFT JOIN approval_document_types dt ON dt.document_type_code = a.document_type_code
     LEFT JOIN approval_records k ON k.id = a.record_id
     LEFT JOIN users u ON u.id = a.user_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY a.id DESC
     LIMIT $${params.length}`,
    params,
  );
  return r.rows;
}

async function findOpenRecord(client, documentTypeCode, documentId) {
  const r = await client.query(
    `SELECT id FROM approval_records
     WHERE document_type_code = $1 AND document_id = $2 AND status_code = 'BEKLIYOR'
     ORDER BY id DESC LIMIT 1`,
    [documentTypeCode, documentId],
  );
  return r.rows[0]?.id || null;
}

/** Belge için devreye girecek ilk aktif kural (yoksa null → onay kapalı). */
async function findGateRule(client, dt, ctx) {
  const { ruleMatchesContext } = require('./onayService');
  const r = await client.query(
    `SELECT * FROM approval_rules
     WHERE document_type_code = $1 AND is_active = TRUE
       AND (company_id IS NULL OR company_id = $2)
       AND (plant_id IS NULL OR plant_id = $3)
     ORDER BY line_no, company_id NULLS LAST, plant_id NULLS LAST, id`,
    [dt.document_type_code, ctx.companyId || null, ctx.plantId || null],
  );
  for (const rule of r.rows) {
    if (await ruleMatchesContext(client, rule, {
      amount: ctx.amount,
      direction: dt.direction,
      status: ctx.status,
    })) return rule;
  }
  return null;
}

/** Belge şu an onaya tabi mi? (kural var + belge onay bekleyen durumda değil) */
async function isApprovalRequired(client, documentTypeCode, documentRow) {
  const dt = await getDocumentType(client, documentTypeCode);
  if (!dt || !documentRow) return false;
  return Boolean(await findGateRule(client, dt, documentContext(dt, documentRow)));
}

/**
 * Belgeyi onaya gönderir.
 * `fromStatuses` verilirse belge yalnız bu durumlardayken onaya gönderilir.
 * Dönüş: { gated: false } — kural yok / otomatik onay / durum uygun değil → çağıran eski akışa devam eder.
 *        { gated: true, record, status } — belge onay bekleyen duruma alındı.
 */
async function submitForApproval(client, {
  documentTypeCode, documentId, user = null, notes = null, summary = null, fromStatuses = null,
}) {
  const dt = await getDocumentType(client, documentTypeCode);
  if (!dt) return { gated: false };
  const row = await loadDocument(client, dt, documentId, { forUpdate: true });
  if (!row) throw httpError(404, 'Belge bulunamadı.');
  const ctx = documentContext(dt, row);
  if (Array.isArray(fromStatuses) && !fromStatuses.includes(ctx.status)) {
    return { gated: false, status: ctx.status };
  }

  const openId = await findOpenRecord(client, dt.document_type_code, documentId);
  if (openId) {
    const { getRecord } = require('./onayService');
    return { gated: true, existing: true, record: await getRecord(client, openId), status: ctx.status };
  }

  const rule = await findGateRule(client, dt, ctx);
  if (!rule) return { gated: false };

  const { startApproval, getRecord } = require('./onayService');
  const started = await startApproval(client, {
    rule_id: rule.id,
    screen_id: dt.screen_id,
    module_code: dt.module_code,
    document_id: documentId,
    document_no: ctx.documentNo,
    document_summary: summary || `${dt.document_type_name} ${ctx.documentNo || documentId}`,
    amount: ctx.amount,
    currency_code: ctx.currency,
    company_id: ctx.companyId,
    plant_id: ctx.plantId,
    initiator_user_id: user?.id || null,
    description: notes,
    direction: dt.direction,
  });

  const auditBase = {
    company_id: ctx.companyId,
    document_type_code: dt.document_type_code,
    screen_id: dt.screen_id,
    document_id: documentId,
    document_no: ctx.documentNo,
    user,
  };

  if (started?.atlandi) {
    await logAudit(client, {
      ...auditBase,
      action: 'OTOMATIK_ONAY',
      from_status: ctx.status,
      notes: `Kural ${rule.rule_code}: ${started.neden}`,
    });
    return { gated: false, autoApproved: true, rule_id: rule.id };
  }

  await client.query(
    `UPDATE approval_records SET document_type_code = $2, reject_outcome = $3, cancel_outcome = $4
     WHERE id = $1`,
    [
      started.id,
      dt.document_type_code,
      rule.reject_outcome || dt.default_reject_outcome,
      rule.cancel_outcome || dt.default_cancel_outcome,
    ],
  );
  await setDocumentValues(client, dt, documentId, dt.pending_values, { user });
  const pending = pendingStatus(dt);
  await logAudit(client, {
    ...auditBase,
    record_id: started.id,
    action: 'GONDERILDI',
    from_status: ctx.status,
    to_status: pending,
    notes: notes || `Kural ${rule.rule_code}`,
  });
  return { gated: true, record: await getRecord(client, started.id), status: pending };
}

const OUTCOME_ACTION = { APPROVED: 'ONAYLANDI', REJECTED: 'REDDEDILDI', CANCELLED: 'IPTAL' };

/** Onay kaydı kapanınca (onay / ret / iptal) belgeye kayıttaki sonucu uygular. */
async function applyRecordOutcome(client, record, kind, { user = null, notes = null } = {}) {
  if (!record?.document_type_code || !record.document_id) return null;
  const dt = await getDocumentType(client, record.document_type_code, { activeOnly: false });
  if (!dt) return null;

  let values;
  let outcomeCode = null;
  if (kind === 'APPROVED') {
    values = dt.approved_values;
  } else {
    outcomeCode = kind === 'REJECTED'
      ? record.reject_outcome || dt.default_reject_outcome
      : record.cancel_outcome || dt.default_cancel_outcome;
    values = dt.outcomes[outcomeCode];
    if (!values) {
      throw httpError(400, `${dt.document_type_name} için "${outcomeCode}" sonucu tanımlı değil.`, 'ONAY_SONUC_YOK');
    }
  }

  const row = await loadDocument(client, dt, record.document_id, { forUpdate: true });
  const ctx = row ? documentContext(dt, row) : {};
  const pending = pendingStatus(dt);
  const auditBase = {
    company_id: record.company_id,
    document_type_code: dt.document_type_code,
    screen_id: dt.screen_id,
    document_id: record.document_id,
    document_no: record.document_no,
    record_id: record.id,
    user,
  };

  if (!row || ctx.status !== pending) {
    if (kind === 'APPROVED') {
      throw httpError(
        409,
        `Belge onay bekleyen durumda değil (durum: ${ctx.status || 'yok'}); onay tamamlanamadı.`,
        'ONAY_BELGE_DURUM',
      );
    }
    await logAudit(client, {
      ...auditBase,
      action: OUTCOME_ACTION[kind],
      from_status: ctx.status || null,
      notes: `Belge durumu değişmiş; sonuç uygulanmadı.${notes ? ` ${notes}` : ''}`,
    });
    return { applied: false };
  }

  await setDocumentValues(client, dt, record.document_id, values, { user, expectStatus: pending });
  const toStatus = asObject(values)[dt.status_column] ?? ctx.status;
  await logAudit(client, {
    ...auditBase,
    action: OUTCOME_ACTION[kind],
    from_status: pending,
    to_status: toStatus,
    notes: [outcomeCode ? `Sonuç: ${outcomeCode}` : null, notes].filter(Boolean).join(' · ') || null,
  });
  return { applied: true, status: toStatus };
}

/**
 * Belge açık onay sürecindeyse işlemi engeller (sevk, mal kabul, başlatma vb. aşağı akış).
 * Onay kaydı olmadan onay bekleyen durumda duran belgeler (kapı dışı eski akışlar) etkilenmez.
 */
async function assertNotPending(client, documentTypeCode, documentRow, actionLabel = 'Bu işlem') {
  const dt = await getDocumentType(client, documentTypeCode, { activeOnly: false });
  if (!dt || !documentRow?.id) return;
  const pending = pendingStatus(dt);
  if (pending == null || documentRow[dt.status_column] !== pending) return;
  if (!(await findOpenRecord(client, dt.document_type_code, documentRow.id))) return;
  throw httpError(
    409,
    `${dt.document_type_name} onay bekliyor; ${actionLabel} onay tamamlanmadan yapılamaz.`,
    'ONAY_BEKLIYOR',
  );
}

/**
 * Elle durum değişikliğinin onay kapısını delmesini engeller:
 * açık onay sürecindeki belgenin durumu değiştirilemez; aktif kural varsa onay bekleyen
 * ve onaylı durumlar elle verilemez. Kural ve açık kayıt yoksa hiçbir şey engellenmez.
 */
async function assertManualStatusChange(client, documentTypeCode, documentRow, requestedStatus) {
  const dt = await getDocumentType(client, documentTypeCode, { activeOnly: false });
  if (!dt || !documentRow || requestedStatus == null || requestedStatus === '') return;
  const current = documentRow[dt.status_column];
  if (requestedStatus === current) return;
  if (documentRow.id && await findOpenRecord(client, dt.document_type_code, documentRow.id)) {
    throw httpError(409, `${dt.document_type_name} onay bekliyor; durum yalnız onay süreciyle değişir.`, 'ONAY_BEKLIYOR');
  }
  const pending = pendingStatus(dt);
  const approved = approvedStatus(dt);
  if (requestedStatus !== pending && requestedStatus !== approved) return;
  if (!dt.is_active || !(await findGateRule(client, dt, documentContext(dt, documentRow)))) return;
  if (requestedStatus === pending) {
    throw httpError(409, `"${pending}" durumu elle verilemez; belge onaya gönderilmeli.`, 'ONAY_DURUM_ELLE');
  }
  throw httpError(409, `${dt.document_type_name} için onay kuralı aktif; "${requestedStatus}" durumuna onayla geçilir.`, 'ONAY_GEREKLI');
}

module.exports = {
  getDocumentType,
  listDocumentTypes,
  validateValueMap,
  pendingStatus,
  approvedStatus,
  outcomeCodes,
  documentContext,
  findGateRule,
  findOpenRecord,
  isApprovalRequired,
  submitForApproval,
  applyRecordOutcome,
  assertNotPending,
  assertManualStatusChange,
  logAudit,
  listAudit,
};
