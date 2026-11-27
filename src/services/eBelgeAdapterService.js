/**
 * e-Belge (e-Fatura / e-Arşiv / e-İrsaliye) orkestrasyonu.
 *
 *   hazırla  → kaynak belgeden UBL-TR 1.2 XML + GİB zarfı üret, XSD + kural doğrulaması, GİB no + ETTN ata
 *   kuyruk   → Kuyrukta; zamanı gelen kayıtlar processDueQueue ile gönderilir
 *   gönder   → resolveConfig() kararına göre mock / test / canlı adaptör; geçici hatada geri çekilmeli yeniden deneme
 *   durum    → adaptör queryStatus (Tamamlandi / Kabul / Red)
 *   iptal    → gönderilmemiş: yerel iptal; e-Arşiv: adaptör iptali; e-Fatura/e-İrsaliye: iade faturası / portal / KEP referansı
 *   arşiv    → gönderilen UBL, zarf, PDF görüntü ve yanıtlar değiştirilemez arşivde (retain_until)
 *
 * Canlı gönderim yalnız GIB_CANLI=Evet ve kimlik bilgileri eksiksizken yapılır; eksikse kayıt Hata'da kalır,
 * mock'a düşülmez. Mock/test gönderimleri is_simulated=TRUE ile işaretlenir.
 */
const crypto = require('crypto');
const mapper = require('./ebelge/mapper');
const { buildInvoiceXml, computeInvoice } = require('./ebelge/ublInvoice');
const { buildDespatchXml } = require('./ebelge/ublDespatch');
const { buildEnvelopeXml } = require('./ebelge/envelope');
const { validate, ID_RE } = require('./ebelge/validator');
const { nextGibNumber } = require('./ebelge/numbering');
const { resolveConfig, publicSummary } = require('./ebelge/config');
const { createAdapter } = require('./ebelge/adapters');
const { AdapterError } = require('./ebelge/adapters/contract');
const { parametreAl } = require('../utils/yetki');

const STATUSES = Object.freeze([
  'Taslak',
  'Hazir',
  'Kuyrukta',
  'Gonderildi',
  'Tamamlandi',
  'Kabul',
  'Red',
  'Hata',
  'Iptal',
  'ManuelBekliyor',
]);

const TRANSITIONS = Object.freeze({
  Taslak: ['Hazir', 'Iptal'],
  Hazir: ['Kuyrukta', 'Iptal', 'Taslak', 'Hazir'],
  Kuyrukta: ['Gonderildi', 'Tamamlandi', 'ManuelBekliyor', 'Hata', 'Iptal'],
  Gonderildi: ['Tamamlandi', 'Kabul', 'Red', 'Hata', 'Iptal'],
  Tamamlandi: ['Kabul', 'Red', 'Iptal'],
  Kabul: ['Iptal'],
  Red: ['Iptal'],
  Hata: ['Hazir', 'Kuyrukta', 'Gonderildi', 'Tamamlandi', 'Iptal'],
  ManuelBekliyor: ['Gonderildi', 'Tamamlandi', 'Kabul', 'Red', 'Hata', 'Iptal'],
  Iptal: ['Taslak'],
});

const SENT_STATUSES = Object.freeze(['Gonderildi', 'Tamamlandi', 'Kabul', 'Red', 'ManuelBekliyor']);
const ACTIVE_STATUSES = Object.freeze(['Hazir', 'Kuyrukta', 'Hata', ...SENT_STATUSES]);

/** Kaynak belgedeki e_document_status alanına yansıtılan değer. */
const SOURCE_STATUS = Object.freeze({
  Taslak: null,
  Hazir: 'Hazir',
  Kuyrukta: 'Kuyrukta',
  ManuelBekliyor: 'Kuyrukta',
  Gonderildi: 'Gonderildi',
  Tamamlandi: 'Gonderildi',
  Kabul: 'Gonderildi',
  Red: 'Red',
  Hata: 'Hata',
  Iptal: 'Iptal',
});

/** Geçici hata sonrası bekleme (dakika), deneme sırasına göre. */
const BACKOFF_MINUTES = Object.freeze([1, 5, 15, 60, 360]);

const DOC_TYPES = Object.freeze({
  Fatura: { table: 'invoices', noCol: 'invoice_no', kind: 'INVOICE' },
  Irsaliye: { table: 'delivery_notes', noCol: 'delivery_note_no', kind: 'DESPATCHADVICE' },
});

function httpError(status, code, message, extra = {}) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  Object.assign(err, extra);
  return err;
}

function normalizeDocType(t) {
  const v = String(t || '').trim().toLowerCase();
  if (['fatura', 'invoice', 'efatura', 'e-fatura', 'earsiv', 'e-arsiv'].includes(v)) return 'Fatura';
  if (['irsaliye', 'despatch', 'despatchadvice', 'eirsaliye', 'e-irsaliye', 'sevk_irsaliyesi'].includes(v)) return 'Irsaliye';
  throw httpError(400, 'EBELGE_BELGE_TIPI', `Desteklenmeyen belge tipi: ${t} (Fatura | Irsaliye)`);
}

function assertTransition(from, to) {
  if (!(TRANSITIONS[from] || []).includes(to)) {
    throw httpError(400, 'ERR-EBELGE-STATUS', `e-Belge durum geçişi geçersiz: ${from} → ${to}`);
  }
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function backoffMinutes(attempt) {
  return BACKOFF_MINUTES[Math.min(Math.max(attempt, 1), BACKOFF_MINUTES.length) - 1];
}

function retainUntil(issueDate, years, live) {
  if (!live) return new Date().toISOString().slice(0, 10);
  const y = Number(String(issueDate || '').slice(0, 4)) || new Date().getFullYear();
  return `${y + years}-12-31`;
}

async function logEvent(client, e) {
  await client.query(
    `INSERT INTO e_document_events
       (queue_id, company_id, event_type, status_from, status_to, success, send_mode, error_code, message, detail_json, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
    [
      e.queueId,
      e.companyId || null,
      e.type,
      e.from || null,
      e.to || null,
      e.success !== false,
      e.mode || null,
      e.errorCode || null,
      e.message ? String(e.message).slice(0, 4000) : null,
      e.detail ? JSON.stringify(e.detail) : null,
      e.by || null,
    ]
  );
}

async function archive(client, row, { kind, mime, fileName, content, retain, by }) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
  const r = await client.query(
    `INSERT INTO e_document_archive
       (queue_id, company_id, document_type, document_id, uuid_ettn, gib_number,
        content_kind, mime_type, file_name, content, sha256, byte_size, retain_until, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id, content_kind, file_name, sha256, byte_size, retain_until`,
    [row.id, row.company_id, row.document_type, row.document_id, row.uuid_ettn, row.gib_number,
      kind, mime, fileName, buf, sha256(buf), buf.length, retain, by || null]
  );
  return r.rows[0];
}

async function setSourceStatus(client, row, status, { uuid, gibNumber } = {}) {
  const def = DOC_TYPES[row.document_type];
  const value = SOURCE_STATUS[status];
  if (!def || value === undefined || value === null) return;
  const params = [row.document_id, value];
  const sets = ['e_document_status=$2'];
  if (uuid) {
    params.push(uuid);
    sets.push(`uuid_ettn=$${params.length}::uuid`);
  }
  if (gibNumber) {
    params.push(gibNumber);
    sets.push(`gib_number=$${params.length}`);
  }
  await client.query(`UPDATE ${def.table} SET ${sets.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, params);
}

async function loadQueueRow(client, queueId, { lock = true } = {}) {
  const r = await client.query(`SELECT * FROM e_document_queue WHERE id=$1 ${lock ? 'FOR UPDATE' : ''}`, [queueId]);
  if (!r.rows[0]) throw httpError(404, 'EBELGE_KAYIT_YOK', 'Kuyruk kaydı bulunamadı.');
  return r.rows[0];
}

async function updateRow(client, id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k}=$${i + 2}`);
  const r = await client.query(
    `UPDATE e_document_queue SET ${sets.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
    [id, ...keys.map((k) => fields[k])]
  );
  return r.rows[0];
}

// ─── Model / XML üretimi ────────────────────────────────────────────────────

async function loadSource(client, documentType, documentId, { lock = false } = {}) {
  const src = documentType === 'Fatura'
    ? await mapper.loadInvoiceSource(client, documentId, { lock })
    : await mapper.loadDespatchSource(client, documentId, { lock });
  if (!src) throw httpError(404, 'EBELGE_KAYNAK_YOK', 'Kaynak belge bulunamadı.');
  return src;
}

function buildModel(documentType, src, opts) {
  return documentType === 'Fatura' ? mapper.buildInvoiceModel(src, opts) : mapper.buildDespatchModel(src, opts);
}

function sourceRecord(documentType, src) {
  return documentType === 'Fatura' ? src.invoice : src.deliveryNote;
}

/**
 * Model → UBL XML (+ zarf) + doğrulama. Saf: DB'ye yazmaz.
 * e-Arşiv faturada GİB zarfı yoktur (rapor entegratör/GİB e-Arşiv servisiyle gider).
 */
async function renderXml(documentType, built, { envelopeId } = {}) {
  const def = DOC_TYPES[documentType];
  const xml = documentType === 'Fatura' ? buildInvoiceXml(built.model) : buildDespatchXml(built.model);
  const result = await validate(xml, def.kind);
  let envelope = null;
  const needsEnvelope = built.model.profileId !== 'EARSIVFATURA';
  if (needsEnvelope && built.meta.receiverAlias) {
    const supplier = built.model.supplier;
    const customer = built.model.customer;
    const env = buildEnvelopeXml({
      elementType: def.kind,
      documentXml: xml,
      instanceId: envelopeId || undefined,
      sender: {
        alias: built.meta.senderAlias || `urn:mail:defaultgb@${supplier.id}`,
        name: supplier.name || `${supplier.firstName || ''} ${supplier.familyName || ''}`.trim(),
        id: supplier.id,
      },
      receiver: {
        alias: built.meta.receiverAlias,
        name: customer.name || `${customer.firstName || ''} ${customer.familyName || ''}`.trim(),
        id: customer.id,
      },
    });
    const envResult = await validate(env.xml, 'ENVELOPE');
    envelope = { xml: env.xml, instanceId: env.instanceId, valid: envResult.valid, errors: envResult.errors };
  }
  return {
    xml,
    sha256: sha256(xml),
    valid: result.valid && (!envelope || envelope.valid),
    xsdValid: result.xsdValid,
    errors: [...result.errors, ...(envelope ? envelope.errors.map((e) => ({ ...e, scope: 'zarf' })) : [])],
    envelope,
  };
}

function blockingIssues(issues) {
  return issues.filter((i) => i.level === 'error');
}

/** Numara tüketmeden XML + doğrulama önizlemesi. */
async function preview(client, { documentType, documentId, now } = {}) {
  const type = normalizeDocType(documentType);
  const src = await loadSource(client, type, Number(documentId));
  const rec = sourceRecord(type, src);
  const draft = buildModel(type, src, { now });
  const placeholder = ID_RE.test(String(rec.gib_number || '')) ? rec.gib_number : `${draft.meta.prefix}${draft.meta.year}000000000`;
  const built = buildModel(type, src, { gibNumber: placeholder, uuid: rec.uuid_ettn || crypto.randomUUID(), now });
  const out = await renderXml(type, built);
  return {
    document_type: type,
    document_id: rec.id,
    gecerli: out.valid && blockingIssues(built.issues).length === 0,
    uyarilar: built.issues,
    xml_hatalari: out.errors,
    profil: built.model.profileId,
    tip: built.model.invoiceTypeCode || built.model.despatchTypeCode,
    gib_no_onizleme: placeholder,
    xml: out.xml,
    zarf_xml: out.envelope ? out.envelope.xml : null,
    model: built.model,
  };
}

// ─── Hazırla ────────────────────────────────────────────────────────────────

/**
 * Etiketi bilinmeyen alıcı için entegratörden (test/canlı) GİB kayıtlı kullanıcı sorgusu; e-Fatura mükellefine
 * yanlışlıkla e-Arşiv düzenlenmesini önler. Mock modda sorgu yapılmaz (önbellek / manuel etiket kullanılır).
 */
async function lookupReceiver(client, type, src, rec) {
  if (rec.mailbox_alias || (src.registeredAliases || []).length) return [];
  const taxId = mapper.digits(rec.tax_id || (src.partner && src.partner.tax_id));
  if (!(taxId.length === 10 || taxId.length === 11)) return [];
  const cfg = await resolveConfig(client, { companyId: rec.company_id });
  if (cfg.mode === 'mock' || cfg.liveBlocked || cfg.provider !== 'REST') return [];
  try {
    const u = await checkUser(client, { taxId, documentKind: type === 'Fatura' ? 'EFATURA' : 'EIRSALIYE', companyId: rec.company_id });
    if (u.kayitli && u.etiketler.length) src.registeredAliases = u.etiketler.map((a) => a.alias);
    return [];
  } catch (e) {
    return [{ level: 'warning', code: 'MUKELLEF_SORGU', message: `Mükellef sorgusu yapılamadı (${e.code || ''} ${e.message}).` }];
  }
}

async function prepare(client, { documentType, documentId, providerCode = null, kullaniciKodu = null, now } = {}) {
  const type = normalizeDocType(documentType);
  const def = DOC_TYPES[type];
  const id = Number(documentId);
  const src = await loadSource(client, type, id, { lock: true });
  const rec = sourceRecord(type, src);

  const history = (await client.query(
    `SELECT * FROM e_document_queue WHERE document_type=$1 AND document_id=$2 ORDER BY id DESC FOR UPDATE`,
    [type, id]
  )).rows;
  const sentBefore = history.some((h) => h.sent_at || SENT_STATUSES.includes(h.status));
  const active = history.find((h) => ACTIVE_STATUSES.includes(h.status));
  if (active && !['Hazir', 'Hata'].includes(active.status)) {
    throw httpError(409, 'EBELGE_ZATEN_GONDERILDI',
      `Belge e-belge sürecinde (kuyruk #${active.id}, durum ${active.status}); yeniden hazırlanamaz. İptal/iade akışını kullanın.`);
  }
  if (active && active.status === 'Hata' && active.sent_at) {
    throw httpError(409, 'EBELGE_ZATEN_GONDERILDI', `Kuyruk #${active.id} sağlayıcıya iletilmiş; durum sorgulayın veya iptal akışını kullanın.`);
  }

  const preparedAt = now ? new Date(now) : new Date();
  const lookupNotes = await lookupReceiver(client, type, src, rec);
  const draft = buildModel(type, src, { now: preparedAt });
  draft.issues.push(...lookupNotes);
  const errors = blockingIssues(draft.issues);
  if (errors.length) {
    throw httpError(422, 'EBELGE_VERI_EKSIK', `e-Belge üretilemiyor: ${errors.map((e) => e.message).join(' ')}`, { detay: draft.issues });
  }

  // Daha önce bu belge için seriden atanmış (ve hiç gönderilmemiş) numara/ETTN yeniden kullanılır: seride boşluk oluşmaz.
  const ownNumbered = history.find((h) => h.gib_number && ID_RE.test(h.gib_number));
  let gibNumber = null;
  let uuid = null;
  if (!sentBefore && ownNumbered && ownNumbered.gib_number.startsWith(`${draft.meta.prefix}${draft.meta.year}`)) {
    gibNumber = ownNumbered.gib_number;
    uuid = ownNumbered.uuid_ettn;
  }
  if (!gibNumber) {
    gibNumber = await nextGibNumber(client, {
      companyId: rec.company_id, kind: draft.meta.seriesKind, prefix: draft.meta.prefix, year: draft.meta.year,
    });
  }
  if (!uuid) uuid = !sentBefore && rec.uuid_ettn ? String(rec.uuid_ettn) : crypto.randomUUID();

  const built = buildModel(type, src, { gibNumber, uuid, now: preparedAt });
  const out = await renderXml(type, built, { envelopeId: active && active.envelope_uuid });
  if (!out.valid) {
    throw httpError(422, 'EBELGE_XML_GECERSIZ', `Üretilen UBL-TR XML şema/kural doğrulamasından geçmedi (${out.errors.length} hata).`, { detay: out.errors });
  }

  const cfg = await resolveConfig(client, { companyId: rec.company_id, providerOverride: providerCode });
  const payload = {
    model: built.model,
    xml: out.xml,
    envelope_xml: out.envelope ? out.envelope.xml : null,
    source_payable: built.meta.sourcePayable,
    prepared_by: kullaniciKodu || null,
    prepared_at: preparedAt.toISOString(),
    reproducible: true,
  };
  const fields = {
    company_id: rec.company_id || null,
    document_no: rec[def.noCol] || null,
    status: 'Hazir',
    provider_code: cfg.provider,
    uuid_ettn: uuid,
    gib_number: gibNumber,
    payload_json: JSON.stringify(payload),
    profile_id: built.model.profileId,
    invoice_type_code: built.model.invoiceTypeCode || built.model.despatchTypeCode,
    series_kind: built.meta.seriesKind,
    sender_alias: built.meta.senderAlias,
    receiver_alias: built.meta.receiverAlias,
    envelope_uuid: out.envelope ? out.envelope.instanceId : null,
    xml_sha256: out.sha256,
    validation_json: JSON.stringify({ gecerli: true, uyarilar: built.issues }),
    max_attempts: cfg.maxAttempts,
    last_error: null,
    last_error_code: null,
    retryable: null,
    next_attempt_at: null,
  };

  let row;
  if (active) {
    row = await updateRow(client, active.id, fields);
  } else {
    const keys = Object.keys(fields);
    const ins = await client.query(
      `INSERT INTO e_document_queue (document_type, document_id, direction, created_by, ${keys.join(', ')})
       VALUES ($1, $2, 'Giden', $3, ${keys.map((_, i) => `$${i + 4}`).join(', ')}) RETURNING *`,
      [type, id, kullaniciKodu, ...keys.map((k) => fields[k])]
    );
    row = ins.rows[0];
  }
  await setSourceStatus(client, row, 'Hazir', { uuid, gibNumber });
  await logEvent(client, {
    queueId: row.id, companyId: row.company_id, type: 'HAZIRLA', from: active ? active.status : null, to: 'Hazir',
    message: `${built.model.profileId}/${fields.invoice_type_code} ${gibNumber} hazırlandı.`,
    detail: { uyarilar: built.issues, sha256: out.sha256 }, by: kullaniciKodu,
  });
  return row;
}

// ─── Kuyruk / gönderim ──────────────────────────────────────────────────────

async function enqueue(client, queueId, { kullaniciKodu = null } = {}) {
  const row = await loadQueueRow(client, queueId);
  assertTransition(row.status, 'Kuyrukta');
  const upd = await updateRow(client, row.id, {
    status: 'Kuyrukta', queued_at: new Date(), next_attempt_at: new Date(), last_error: null, last_error_code: null,
  });
  await setSourceStatus(client, upd, 'Kuyrukta');
  await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'KUYRUK', from: row.status, to: 'Kuyrukta', by: kullaniciKodu });
  return upd;
}

function sendPayload(row) {
  const p = row.payload_json || {};
  const m = p.model || {};
  return {
    documentType: DOC_TYPES[row.document_type].kind,
    profileId: row.profile_id,
    uuid: row.uuid_ettn,
    gibNumber: row.gib_number,
    xml: p.xml,
    envelopeXml: p.envelope_xml || null,
    envelopeId: row.envelope_uuid || null,
    senderAlias: row.sender_alias,
    receiverAlias: row.receiver_alias,
    sender: { id: m.supplier && m.supplier.id, name: m.supplier && m.supplier.name },
    receiver: { id: m.customer && m.customer.id, name: m.customer && m.customer.name },
  };
}

async function archiveSent(client, row, cfg, response, by) {
  const p = row.payload_json || {};
  const live = cfg.mode === 'live';
  const retain = retainUntil(p.model && p.model.issueDate, cfg.archiveYears, live);
  const base = row.gib_number || `kuyruk-${row.id}`;
  const out = [];
  out.push(await archive(client, row, { kind: 'UBL_XML', mime: 'application/xml', fileName: `${base}.xml`, content: p.xml, retain, by }));
  if (p.envelope_xml) {
    out.push(await archive(client, row, { kind: 'ZARF_XML', mime: 'application/xml', fileName: `${row.envelope_uuid || base}-zarf.xml`, content: p.envelope_xml, retain, by }));
  }
  try {
    const pdf = await renderQueuePdf(client, row, { watermark: live ? null : `SANDBOX (${cfg.mode}) — GEÇERSİZ` });
    out.push(await archive(client, row, { kind: 'PDF', mime: 'application/pdf', fileName: `${base}.pdf`, content: pdf, retain, by }));
  } catch (_) {
    // PDF görüntü üretilemese de UBL arşivi yasal kayıttır; gönderim akışı durmaz.
  }
  if (response) {
    out.push(await archive(client, row, { kind: 'YANIT', mime: 'application/json', fileName: `${base}-gonderim-yanit.json`, content: JSON.stringify(response, null, 2), retain, by }));
  }
  return out;
}

/**
 * Hazırlanan XML, kaynak belgenin bugünkü hâlinden (aynı numara/ETTN/hazırlama anıyla) yeniden üretilen XML ile aynı mı?
 * Farklıysa belge hazırlandıktan sonra değişmiştir; eski XML gönderilmemelidir.
 */
async function sourceDrift(client, row) {
  const p = row.payload_json || {};
  if (!p.reproducible || !p.prepared_at) return null;
  let src;
  try {
    src = await loadSource(client, row.document_type, row.document_id);
  } catch (e) {
    return e.code === 'EBELGE_KAYNAK_YOK' ? 'Kaynak belge silinmiş.' : null;
  }
  const built = buildModel(row.document_type, src, { gibNumber: row.gib_number, uuid: row.uuid_ettn, now: new Date(p.prepared_at) });
  const xml = row.document_type === 'Fatura' ? buildInvoiceXml(built.model) : buildDespatchXml(built.model);
  return xml === p.xml ? null : 'Kaynak belge hazırlandıktan sonra değişmiş.';
}

/**
 * Kuyruk kaydını sağlayıcıya gönderir. Hata durumunda kayıt Hata'da kalır ve (geçiciyse) next_attempt_at ayarlanır;
 * fonksiyon fırlatmaz, sonucu döndürür (çağıran işlem COMMIT etmeli ki hata kaydı kalıcı olsun).
 */
async function send(client, queueId, { kullaniciKodu = null, providerOverride = null, env = process.env } = {}) {
  let row = await loadQueueRow(client, queueId);
  if (row.status === 'Hazir') {
    row = await updateRow(client, row.id, { status: 'Kuyrukta', queued_at: new Date() });
  }
  if (!['Kuyrukta', 'Hata'].includes(row.status)) {
    throw httpError(409, 'ERR-EBELGE-STATUS', `Kuyruk #${row.id} ${row.status} durumunda; gönderilemez.`);
  }
  if (row.status === 'Hata' && row.sent_at) {
    throw httpError(409, 'EBELGE_GIB_RED', `Kuyruk #${row.id} GİB/entegratör tarafından reddedildi (${row.last_error_code || ''}); iptal edip belgeyi düzelterek yeniden hazırlayın.`);
  }
  if (!row.payload_json || !row.payload_json.xml) {
    throw httpError(409, 'EBELGE_HAZIRLANMAMIS', 'Kayıtta UBL XML yok; önce /e-belge/hazirla ile yeniden hazırlayın.');
  }
  const from = row.status;
  const drift = await sourceDrift(client, row);
  if (drift) {
    const message = `${drift} Gönderilmedi; belgeyi /e-belge/hazirla ile yeniden hazırlayın.`;
    const upd = await updateRow(client, row.id, {
      status: 'Hata', last_error: message, last_error_code: 'EBELGE_KAYNAK_DEGISTI', retryable: false, next_attempt_at: null,
    });
    await setSourceStatus(client, upd, 'Hata');
    await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'HATA', from, to: 'Hata', success: false, errorCode: 'EBELGE_KAYNAK_DEGISTI', message, by: kullaniciKodu });
    return { row: upd, ok: false, kaynak_degisti: true, simulated: false };
  }
  const cfg = await resolveConfig(client, { companyId: row.company_id, providerOverride: providerOverride || row.provider_code, env });
  const attempt = Number(row.attempt_count || 0) + 1;
  const base = { attempt_count: attempt, last_attempt_at: new Date(), send_mode: cfg.mode, provider_code: cfg.provider };

  let adapter;
  try {
    adapter = createAdapter(cfg);
  } catch (e) {
    const upd = await updateRow(client, row.id, {
      ...base, send_mode: cfg.liveBlocked ? 'live' : cfg.mode, status: 'Hata', last_error: e.message,
      last_error_code: e.code || 'EBELGE_YAPILANDIRMA', retryable: false, next_attempt_at: null,
    });
    await setSourceStatus(client, upd, 'Hata');
    await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'HATA', from, to: 'Hata', success: false, mode: 'live', errorCode: e.code, message: e.message, detail: { eksikler: cfg.missingLive }, by: kullaniciKodu });
    return { row: upd, ok: false, live_blocked: Boolean(cfg.liveBlocked), eksikler: cfg.missingLive, simulated: false };
  }

  try {
    const res = await adapter.send(sendPayload(row));
    const status = ['Gonderildi', 'Tamamlandi', 'ManuelBekliyor'].includes(res.status) ? res.status : 'Gonderildi';
    const upd = await updateRow(client, row.id, {
      ...base,
      status,
      sent_at: status === 'ManuelBekliyor' ? null : new Date(),
      completed_at: status === 'Tamamlandi' && row.profile_id !== 'TICARIFATURA' ? new Date() : null,
      provider_ref: res.providerRef || row.provider_ref || null,
      provider_status_code: res.statusCode || null,
      provider_status_message: res.statusMessage || null,
      is_simulated: cfg.mode !== 'live',
      last_error: null, last_error_code: null, retryable: null, next_attempt_at: null,
    });
    await setSourceStatus(client, upd, status, { uuid: upd.uuid_ettn, gibNumber: upd.gib_number });
    const archived = status === 'ManuelBekliyor' ? [] : await archiveSent(client, upd, cfg, res.raw || res, kullaniciKodu);
    await logEvent(client, {
      queueId: row.id, companyId: row.company_id, type: 'GONDER', from, to: status, mode: cfg.mode,
      message: res.statusMessage || null, detail: { providerRef: res.providerRef, statusCode: res.statusCode, attempt, arsiv: archived.map((a) => a.id) }, by: kullaniciKodu,
    });
    return { row: upd, ok: true, simulated: cfg.mode !== 'live', mode: cfg.mode, provider: cfg.provider, arsiv: archived };
  } catch (e) {
    if (!(e instanceof AdapterError)) throw e;
    if (e.code === 'GIB_1163') {
      // Mükerrer ETTN: önceki deneme sağlayıcıya ulaşmış; durum sorgusu ile netleşir.
      const upd = await updateRow(client, row.id, {
        ...base, status: 'Gonderildi', sent_at: row.sent_at || new Date(), is_simulated: cfg.mode !== 'live',
        provider_status_code: '1163', provider_status_message: e.message, last_error: null, last_error_code: null, retryable: null, next_attempt_at: null,
      });
      await setSourceStatus(client, upd, 'Gonderildi', { uuid: upd.uuid_ettn, gibNumber: upd.gib_number });
      await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'GONDER', from, to: 'Gonderildi', mode: cfg.mode, errorCode: e.code, message: 'Mükerrer gönderim: belge sağlayıcıda zaten var.', by: kullaniciKodu });
      return { row: upd, ok: true, duplicate: true, simulated: cfg.mode !== 'live', mode: cfg.mode };
    }
    const canRetry = e.retryable && attempt < Number(row.max_attempts || cfg.maxAttempts);
    const next = canRetry ? new Date(Date.now() + backoffMinutes(attempt) * 60000) : null;
    const upd = await updateRow(client, row.id, {
      ...base, status: 'Hata', last_error: e.message, last_error_code: e.code || 'EBELGE_SAGLAYICI_HATA',
      retryable: canRetry, next_attempt_at: next,
    });
    await setSourceStatus(client, upd, 'Hata');
    await logEvent(client, {
      queueId: row.id, companyId: row.company_id, type: 'HATA', from, to: 'Hata', success: false, mode: cfg.mode,
      errorCode: e.code, message: e.message, detail: { attempt, retryable: e.retryable, httpStatus: e.httpStatus, next_attempt_at: next, raw: e.raw }, by: kullaniciKodu,
    });
    return { row: upd, ok: false, retryable: canRetry, next_attempt_at: next, hata: e.message, kod: e.code, mode: cfg.mode };
  }
}

/**
 * Eski arayüz. Mod kararı her zaman resolveConfig()'tedir: GIB_CANLI=Hayir → mock/test (is_simulated),
 * GIB_CANLI=Evet → canlı veya engelli. `simulate` bayrağı canlıyı mock'a çeviremez (route 409 döner).
 */
async function sendOrSimulate(client, queueId, { kullaniciKodu = null } = {}) {
  return send(client, queueId, { kullaniciKodu });
}

async function retry(client, queueId, { kullaniciKodu = null } = {}) {
  const row = await loadQueueRow(client, queueId);
  if (row.status !== 'Hata') throw httpError(409, 'ERR-EBELGE-STATUS', `Yalnız Hata durumundaki kayıt yeniden denenir (şu an ${row.status}).`);
  if (row.sent_at) throw httpError(409, 'EBELGE_GIB_RED', 'Sağlayıcıya ulaşmış ve reddedilmiş belge yeniden denenmez; iptal edip yeniden hazırlayın.');
  const upd = await updateRow(client, row.id, {
    status: 'Kuyrukta', next_attempt_at: new Date(), retryable: true, attempt_count: 0, last_error: null, last_error_code: null,
  });
  await setSourceStatus(client, upd, 'Kuyrukta');
  await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'YENIDEN_DENE', from: 'Hata', to: 'Kuyrukta', message: `Önceki hata: ${row.last_error_code || ''} ${row.last_error || ''}`.trim(), by: kullaniciKodu });
  return upd;
}

// ─── Durum sorgu ────────────────────────────────────────────────────────────

async function refreshStatus(client, queueId, { kullaniciKodu = null, env = process.env } = {}) {
  const row = await loadQueueRow(client, queueId);
  if (!['Gonderildi', 'Tamamlandi', 'ManuelBekliyor'].includes(row.status)) {
    return { row, changed: false, final: !['Hazir', 'Kuyrukta', 'Hata'].includes(row.status) };
  }
  const cfg = await resolveConfig(client, { companyId: row.company_id, providerOverride: row.provider_code, env });
  let adapter;
  try {
    adapter = createAdapter(cfg);
  } catch (e) {
    return { row, changed: false, hata: e.message, kod: e.code };
  }
  try {
    const res = await adapter.queryStatus({ documentType: DOC_TYPES[row.document_type].kind, uuid: row.uuid_ettn, providerRef: row.provider_ref, profileId: row.profile_id });
    const fields = { last_status_check_at: new Date(), provider_status_code: res.statusCode || row.provider_status_code, provider_status_message: res.statusMessage || row.provider_status_message };
    let to = res.status;
    if (to === 'Hata') {
      fields.last_error = res.statusMessage || 'Sağlayıcı belgeyi reddetti.';
      fields.last_error_code = res.statusCode ? `GIB_${res.statusCode}` : 'EBELGE_SAGLAYICI_RED';
      fields.retryable = false;
    }
    const changed = to && to !== row.status && (TRANSITIONS[row.status] || []).includes(to);
    if (changed) {
      fields.status = to;
      if (['Tamamlandi', 'Kabul', 'Red'].includes(to) && res.final) fields.completed_at = new Date();
    } else {
      to = row.status;
    }
    const upd = await updateRow(client, row.id, fields);
    if (changed) {
      await setSourceStatus(client, upd, to);
      await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'DURUM', from: row.status, to, success: to !== 'Hata', mode: cfg.mode, errorCode: to === 'Hata' ? fields.last_error_code : null, message: res.statusMessage, detail: { statusCode: res.statusCode }, by: kullaniciKodu });
      if (res.final && ['Kabul', 'Red', 'Hata'].includes(to)) {
        const live = upd.send_mode === 'live';
        await archive(client, upd, {
          kind: 'YANIT', mime: 'application/json', fileName: `${upd.gib_number}-${to.toLowerCase()}-yanit.json`,
          content: JSON.stringify(res.raw || res, null, 2), retain: retainUntil(upd.payload_json && upd.payload_json.model && upd.payload_json.model.issueDate, cfg.archiveYears, live), by: kullaniciKodu,
        });
      }
    }
    return { row: upd, changed, final: Boolean(res.final) };
  } catch (e) {
    if (!(e instanceof AdapterError)) throw e;
    const upd = await updateRow(client, row.id, { last_status_check_at: new Date() });
    await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'DURUM', from: row.status, to: row.status, success: false, mode: cfg.mode, errorCode: e.code, message: e.message, by: kullaniciKodu });
    return { row: upd, changed: false, hata: e.message, kod: e.code, retryable: e.retryable };
  }
}

/**
 * Zamanı gelmiş kayıtları işler (her kayıt ayrı işlemde, SKIP LOCKED ile paralel güvenli).
 * @param {import('pg').Pool} pool
 */
async function processDueQueue(pool, { limit = 20, statusCheckAfterSec = 300, companyId = null } = {}) {
  const params = [Math.min(Number(limit) || 20, 200)];
  const scope = companyId ? `AND company_id=$${params.push(Number(companyId))}` : '';
  const due = await pool.query(
    `SELECT id FROM e_document_queue
     WHERE (status='Kuyrukta' OR (status='Hata' AND retryable IS TRUE AND sent_at IS NULL))
       AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP) ${scope}
     ORDER BY COALESCE(next_attempt_at, queued_at, created_at), id
     LIMIT $1`,
    params
  );
  const sent = [];
  for (const { id } of due.rows) {
    sent.push(await inOwnTx(pool, id, (c) => send(c, id)));
  }
  const pParams = [params[0], Number(statusCheckAfterSec) || 0];
  const pScope = companyId ? `AND company_id=$${pParams.push(Number(companyId))}` : '';
  const poll = await pool.query(
    `SELECT id FROM e_document_queue
     WHERE status IN ('Gonderildi','Tamamlandi')
       AND NOT (status='Tamamlandi' AND completed_at IS NOT NULL)
       AND (last_status_check_at IS NULL OR last_status_check_at <= CURRENT_TIMESTAMP - ($2 || ' seconds')::interval) ${pScope}
     ORDER BY COALESCE(last_status_check_at, sent_at), id
     LIMIT $1`,
    pParams
  );
  const checked = [];
  for (const { id } of poll.rows) {
    checked.push(await inOwnTx(pool, id, (c) => refreshStatus(c, id)));
  }
  return {
    gonderilen: sent.filter(Boolean).map((r) => ({ id: r.row.id, durum: r.row.status, ok: r.ok, kod: r.kod || null })),
    sorgulanan: checked.filter(Boolean).map((r) => ({ id: r.row.id, durum: r.row.status, degisti: r.changed })),
  };
}

/**
 * EBELGE_KUYRUK_ARALIK_SN > 0 ise kuyruğu süreç içinde periyodik işler (0: kapalı, POST /e-belge/kuyruk/isle ile tetiklenir).
 * Çok süreçli kurulumda SKIP LOCKED sayesinde aynı kayıt iki kez gönderilmez.
 */
async function startQueueScheduler(pool, logger = console) {
  const sec = Number(await parametreAl(pool, 'EBELGE_KUYRUK_ARALIK_SN', '0').catch(() => '0')) || 0;
  if (sec <= 0) return null;
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const r = await processDueQueue(pool, {});
      if (r.gonderilen.length || r.sorgulanan.some((x) => x.degisti)) {
        logger.log(`[e-belge] kuyruk: gönderilen ${r.gonderilen.length}, durum değişen ${r.sorgulanan.filter((x) => x.degisti).length}`);
      }
    } catch (err) {
      logger.error('[e-belge] kuyruk işlenemedi:', err.message);
    } finally {
      running = false;
    }
  }, Math.max(10, sec) * 1000);
  if (timer.unref) timer.unref();
  logger.log(`[e-belge] kuyruk zamanlayıcısı: ${Math.max(10, sec)} sn`);
  return timer;
}

async function inOwnTx(pool, id, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lock = await client.query(`SELECT id FROM e_document_queue WHERE id=$1 FOR UPDATE SKIP LOCKED`, [id]);
    if (!lock.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    return { row: { id, status: 'Hata' }, ok: false, kod: e.code || 'EBELGE_ISLEM_HATA', hata: e.message };
  } finally {
    client.release();
  }
}

// ─── İptal / iade ───────────────────────────────────────────────────────────

const CANCEL_METHODS = Object.freeze(['IADE_FATURASI', 'PORTAL_IPTAL', 'KEP_NOTER', 'ALICI_RED']);

/**
 * @param {{reason:string, method?:string, ref?:string, iadeInvoiceId?:number}} opts
 *  - Gönderilmemiş (Hazir/Kuyrukta/Hata): yerel iptal; GİB numarası belgeye bağlı kalır, yeniden hazırlamada kullanılır.
 *  - e-Arşiv: sağlayıcı iptali (adaptör cancel).
 *  - e-Fatura / e-İrsaliye: elektronik iptal yok → iade faturası, GİB portal iptal talebi veya KEP/noter referansı zorunlu.
 *  - Red (alıcı reddi): referanssız kapatılır.
 */
async function cancel(client, queueId, { reason, method = null, ref = null, iadeInvoiceId = null, kullaniciKodu = null, env = process.env } = {}) {
  const row = await loadQueueRow(client, queueId);
  if (!reason || String(reason).trim().length < 3) throw httpError(400, 'EBELGE_IPTAL_GEREKCE', 'İptal gerekçesi zorunludur.');
  assertTransition(row.status, 'Iptal');
  const from = row.status;
  const fields = { status: 'Iptal', cancelled_at: new Date(), cancel_reason: String(reason).trim(), next_attempt_at: null, retryable: null };
  let mode = row.send_mode || null;
  let response = null;

  const sent = SENT_STATUSES.includes(row.status) || Boolean(row.sent_at);
  // GİB/entegratör reddi (Hata + sent_at) yasal olarak düzenlenmiş belge sayılmaz; referanssız kapatılır.
  const gibRejected = row.status === 'Hata' && Boolean(row.sent_at);
  if (gibRejected) {
    fields.cancel_ref = `GIB_RED:${row.last_error_code || ''}`.slice(0, 100);
  } else if (sent && row.status !== 'Red') {
    if (row.profile_id === 'EARSIVFATURA') {
      const cfg = await resolveConfig(client, { companyId: row.company_id, providerOverride: row.provider_code, env });
      mode = cfg.mode;
      const adapter = createAdapter(cfg);
      try {
        response = await adapter.cancel({ documentType: 'INVOICE', uuid: row.uuid_ettn, providerRef: row.provider_ref, profileId: row.profile_id, reason });
      } catch (e) {
        if (!(e instanceof AdapterError)) throw e;
        await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'IPTAL', from, to: from, success: false, mode, errorCode: e.code, message: e.message, by: kullaniciKodu });
        throw httpError(e.retryable ? 503 : 409, e.code, e.message);
      }
      fields.cancel_ref = (response && response.statusCode) || 'EARSIV_IPTAL';
    } else {
      const m = String(method || (iadeInvoiceId ? 'IADE_FATURASI' : '')).toUpperCase();
      if (!CANCEL_METHODS.includes(m) || m === 'ALICI_RED') {
        throw httpError(409, 'EBELGE_IPTAL_YONTEM',
          'Gönderilmiş e-Fatura/e-İrsaliye elektronik olarak geri çekilemez. iptal_yontemi: IADE_FATURASI (iade_fatura_id), PORTAL_IPTAL (GİB portal iptal talebi no) veya KEP_NOTER (referans) ile kaydedin.');
      }
      let cancelRef = ref ? String(ref).trim() : null;
      if (m === 'IADE_FATURASI') {
        if (!iadeInvoiceId) throw httpError(400, 'EBELGE_IADE_REFERANS', 'iade_fatura_id zorunlu.');
        const ir = (await client.query(`SELECT id, invoice_no, gib_number, invoice_type FROM invoices WHERE id=$1`, [iadeInvoiceId])).rows[0];
        if (!ir || !/iade/i.test(String(ir.invoice_type || ''))) throw httpError(400, 'EBELGE_IADE_REFERANS', 'iade_fatura_id bir iade faturası olmalıdır.');
        cancelRef = ir.gib_number || ir.invoice_no;
      }
      if (!cancelRef) throw httpError(400, 'EBELGE_IPTAL_REFERANS', `${m} için referans (iptal_referans) zorunludur.`);
      fields.cancel_ref = `${m}:${cancelRef}`.slice(0, 100);
    }
  } else if (row.status === 'Red') {
    fields.cancel_ref = 'ALICI_RED';
  }

  const upd = await updateRow(client, row.id, fields);
  await setSourceStatus(client, upd, 'Iptal');
  if (response) {
    await archive(client, upd, {
      kind: 'YANIT', mime: 'application/json', fileName: `${upd.gib_number}-iptal-yanit.json`, content: JSON.stringify(response, null, 2),
      retain: retainUntil(upd.payload_json && upd.payload_json.model && upd.payload_json.model.issueDate, Number(await parametreAl(client, 'EBELGE_ARSIV_YIL', '10')) || 10, upd.send_mode === 'live'),
      by: kullaniciKodu,
    });
  }
  await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'IPTAL', from, to: 'Iptal', mode, message: fields.cancel_reason, detail: { cancel_ref: fields.cancel_ref || null, gonderilmisti: sent }, by: kullaniciKodu });
  return upd;
}

// ─── Manuel (GİB portal) durum ──────────────────────────────────────────────

const MANUAL_TARGETS = Object.freeze(['Gonderildi', 'Tamamlandi', 'Kabul', 'Red', 'Hata']);

async function manualStatus(client, queueId, { status, ref = null, message = null, kullaniciKodu = null } = {}) {
  const row = await loadQueueRow(client, queueId);
  if (row.provider_code !== 'GIB_PORTAL') {
    throw httpError(409, 'EBELGE_MANUEL_DURUM', 'Manuel durum yalnız GIB_PORTAL sağlayıcısıyla gönderilen kayıtlar için girilir.');
  }
  if (!MANUAL_TARGETS.includes(status)) throw httpError(400, 'EBELGE_MANUEL_DURUM', `Geçersiz durum: ${status}`);
  assertTransition(row.status, status);
  const upd = await updateRow(client, row.id, {
    status,
    provider_ref: ref || row.provider_ref,
    provider_status_message: message || null,
    sent_at: row.sent_at || (status !== 'Hata' ? new Date() : null),
    completed_at: ['Tamamlandi', 'Kabul', 'Red'].includes(status) ? new Date() : null,
    last_error: status === 'Hata' ? message || 'Portal yüklemesi başarısız.' : null,
    last_error_code: status === 'Hata' ? 'GIB_PORTAL_HATA' : null,
    retryable: status === 'Hata' ? false : null,
  });
  await setSourceStatus(client, upd, status);
  if (status !== 'Hata' && !row.sent_at) {
    const cfg = await resolveConfig(client, { companyId: row.company_id, providerOverride: 'GIB_PORTAL' });
    await archiveSent(client, upd, cfg, { manuel: true, ref, message }, kullaniciKodu);
  }
  await logEvent(client, { queueId: row.id, companyId: row.company_id, type: 'MANUEL', from: row.status, to: status, success: status !== 'Hata', mode: row.send_mode, message, detail: { ref }, by: kullaniciKodu });
  return upd;
}

// ─── Mükellef sorgu ─────────────────────────────────────────────────────────

async function checkUser(client, { taxId, documentKind = 'EFATURA', companyId = null, env = process.env } = {}) {
  const t = mapper.digits(taxId);
  if (!(t.length === 10 || t.length === 11)) throw httpError(400, 'EBELGE_VKN', 'VKN (10) veya TCKN (11) hane olmalıdır.');
  const kind = String(documentKind).toUpperCase() === 'EIRSALIYE' ? 'EIRSALIYE' : 'EFATURA';
  const cfg = await resolveConfig(client, { companyId, env });
  const adapter = createAdapter(cfg);
  const res = await adapter.checkUser({ taxId: t, documentKind: kind });
  if (res.registered !== null && cfg.mode !== 'mock') {
    for (const a of res.aliases || []) {
      await client.query(
        `INSERT INTO e_document_registered_users (tax_id, document_kind, alias, title, registered_at, source, is_active)
         VALUES ($1,$2,$3,$4,$5,'ENTEGRATOR',TRUE)
         ON CONFLICT (tax_id, document_kind, alias) DO UPDATE
           SET title=EXCLUDED.title, registered_at=EXCLUDED.registered_at, is_active=TRUE, updated_at=CURRENT_TIMESTAMP`,
        [t, kind, a.alias, a.title || null, a.registeredAt || null]
      );
    }
    await client.query(
      `UPDATE e_document_registered_users SET is_active=FALSE, updated_at=CURRENT_TIMESTAMP
       WHERE tax_id=$1 AND document_kind=$2 AND source='ENTEGRATOR' AND NOT (alias = ANY($3::text[]))`,
      [t, kind, (res.aliases || []).map((a) => a.alias)]
    );
  }
  const cached = (await client.query(
    `SELECT alias, title, registered_at, source, is_active FROM e_document_registered_users WHERE tax_id=$1 AND document_kind=$2 ORDER BY is_active DESC, id`,
    [t, kind]
  )).rows;
  return { vkn_tckn: t, tur: kind, mod: cfg.mode, kayitli: res.registered, etiketler: res.aliases || [], onbellek: cached };
}

async function registerUserManual(client, { taxId, documentKind = 'EFATURA', alias, title = null }) {
  const t = mapper.digits(taxId);
  if (!(t.length === 10 || t.length === 11)) throw httpError(400, 'EBELGE_VKN', 'VKN (10) veya TCKN (11) hane olmalıdır.');
  if (!/^urn:mail:[^@\s]+@[^@\s]+$/i.test(String(alias || ''))) throw httpError(400, 'EBELGE_ETIKET', "Etiket 'urn:mail:defaultpk@firma.com.tr' biçiminde olmalıdır.");
  const kind = String(documentKind).toUpperCase() === 'EIRSALIYE' ? 'EIRSALIYE' : 'EFATURA';
  const r = await client.query(
    `INSERT INTO e_document_registered_users (tax_id, document_kind, alias, title, source, is_active)
     VALUES ($1,$2,$3,$4,'MANUEL',TRUE)
     ON CONFLICT (tax_id, document_kind, alias) DO UPDATE SET title=COALESCE(EXCLUDED.title, e_document_registered_users.title), is_active=TRUE, updated_at=CURRENT_TIMESTAMP
     RETURNING *`,
    [t, kind, alias, title]
  );
  return r.rows[0];
}

// ─── PDF ────────────────────────────────────────────────────────────────────

async function pdfOptions(client, documentType, companyId, template) {
  const { loadSettings } = require('./ebelge/config');
  const settings = await loadSettings(client, companyId);
  const tpl = template === 'matbu' || template === 'standart' ? template : settings.pdf_template || 'standart';
  let matbuLayout = null;
  if (tpl === 'matbu') {
    const raw = await parametreAl(client, documentType === 'Fatura' ? 'MATBU_SABLON_FATURA' : 'MATBU_SABLON_IRSALIYE', '').catch(() => '');
    if (raw) {
      try {
        matbuLayout = JSON.parse(raw);
      } catch (_) {
        matbuLayout = null;
      }
    }
  }
  return { template: tpl, matbuLayout, footerNote: settings.pdf_footer_note || null };
}

async function renderQueuePdf(client, row, { template = null, watermark } = {}) {
  const { renderInvoicePdf, renderDespatchPdf } = require('./belgePdfService');
  const model = row.payload_json && row.payload_json.model;
  if (!model) throw httpError(409, 'EBELGE_HAZIRLANMAMIS', 'Kayıtta e-belge modeli yok.');
  const opts = await pdfOptions(client, row.document_type, row.company_id, template);
  let wm = watermark;
  if (wm === undefined) {
    if (row.status === 'Iptal') wm = 'İPTAL';
    else if (!SENT_STATUSES.includes(row.status)) wm = 'TASLAK — GÖNDERİLMEDİ';
    else if (row.is_simulated) wm = 'SANDBOX — GEÇERSİZ';
    else wm = null;
  }
  const render = row.document_type === 'Fatura' ? renderInvoicePdf : renderDespatchPdf;
  return render(model, { ...opts, watermark: wm });
}

/**
 * Belge PDF'i: e-belge kaydı varsa onun modeli (resmi GİB no/ETTN), yoksa kaynak belgeden taslak.
 * @returns {Promise<{buffer:Buffer, fileName:string, queueId:number|null, taslak:boolean}>}
 */
async function documentPdf(client, { documentType, documentId, template = null }) {
  const type = normalizeDocType(documentType);
  const q = (await client.query(
    `SELECT * FROM e_document_queue WHERE document_type=$1 AND document_id=$2 AND payload_json ? 'model'
     ORDER BY (status <> 'Iptal') DESC, id DESC LIMIT 1`,
    [type, Number(documentId)]
  )).rows[0];
  if (q) {
    const buffer = await renderQueuePdf(client, q, { template });
    return { buffer, fileName: `${q.gib_number || q.document_no || q.id}.pdf`, queueId: q.id, taslak: !SENT_STATUSES.includes(q.status) };
  }
  const { renderInvoicePdf, renderDespatchPdf } = require('./belgePdfService');
  const src = await loadSource(client, type, Number(documentId));
  const rec = sourceRecord(type, src);
  const built = buildModel(type, src, { gibNumber: ID_RE.test(String(rec.gib_number || '')) ? rec.gib_number : null });
  const opts = await pdfOptions(client, type, rec.company_id, template);
  const render = type === 'Fatura' ? renderInvoicePdf : renderDespatchPdf;
  const buffer = await render(built.model, { ...opts, watermark: 'TASLAK — e-BELGE DEĞİL' });
  return { buffer, fileName: `${rec[DOC_TYPES[type].noCol] || rec.id}-taslak.pdf`, queueId: null, taslak: true };
}

/** documentHtml için QR metni (GİB görüntü formatı) — kayıt yoksa null. */
async function qrTextFor(client, documentType, documentId) {
  const { invoiceQrText, despatchQrText } = require('./ebelge/qr');
  const q = (await client.query(
    `SELECT payload_json->'model' AS model, document_type FROM e_document_queue
     WHERE document_type=$1 AND document_id=$2 AND payload_json ? 'model' ORDER BY id DESC LIMIT 1`,
    [documentType, Number(documentId)]
  )).rows[0];
  if (!q || !q.model) return null;
  return documentType === 'Fatura' ? invoiceQrText(q.model, computeInvoice(q.model)) : despatchQrText(q.model);
}

// ─── Liste / özet ───────────────────────────────────────────────────────────

async function listQueue(client, { companyId = null, status = null, documentType = null, documentId = null, limit = 200 } = {}) {
  const params = [];
  const where = [];
  if (companyId) where.push(`company_id=$${params.push(Number(companyId))}`);
  if (status) where.push(`status=$${params.push(String(status))}`);
  if (documentType) where.push(`document_type=$${params.push(normalizeDocType(documentType))}`);
  if (documentId) where.push(`document_id=$${params.push(Number(documentId))}`);
  params.push(Math.min(Number(limit) || 200, 500));
  const r = await client.query(
    `SELECT id, company_id, document_type, document_id, document_no, direction, status, provider_code, send_mode, is_simulated,
            profile_id, invoice_type_code, gib_number, uuid_ettn, receiver_alias, provider_ref, provider_status_code,
            provider_status_message, attempt_count, max_attempts, next_attempt_at, retryable, last_error_code, last_error,
            queued_at, sent_at, completed_at, cancelled_at, cancel_reason, cancel_ref, created_at, updated_at
     FROM e_document_queue
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY id DESC
     LIMIT $${params.length}`,
    params
  );
  return r.rows;
}

async function listEvents(client, queueId) {
  return (await client.query(`SELECT * FROM e_document_events WHERE queue_id=$1 ORDER BY id`, [queueId])).rows;
}

async function listArchive(client, queueId) {
  return (await client.query(
    `SELECT id, queue_id, content_kind, mime_type, file_name, sha256, byte_size, retain_until, created_at, created_by
     FROM e_document_archive WHERE queue_id=$1 ORDER BY id`,
    [queueId]
  )).rows;
}

async function statusSummary(client, { companyId = null } = {}) {
  const cfg = await resolveConfig(client, { companyId });
  const params = [];
  const scope = companyId ? `WHERE company_id=$${params.push(Number(companyId))}` : '';
  const counts = (await client.query(`SELECT status, COUNT(*)::int AS adet FROM e_document_queue ${scope} GROUP BY status ORDER BY status`, params)).rows;
  return { yapilandirma: publicSummary(cfg), durumlar: counts };
}

/** Geriye uyumluluk: eski özet payload. */
function buildPayload(src, documentType) {
  return {
    document_type: documentType,
    document_id: src.id,
    document_no: src.document_no,
    company_id: src.company_id,
    partner_id: src.partner_id || null,
    scenario: src.scenario || null,
    uuid_ettn: src.uuid_ettn || null,
    gib_number: src.gib_number || null,
    amount: src.payable_amount != null ? Number(src.payable_amount) : null,
    prepared_at: new Date().toISOString(),
  };
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  SENT_STATUSES,
  SOURCE_STATUS,
  BACKOFF_MINUTES,
  CANCEL_METHODS,
  assertTransition,
  normalizeDocType,
  backoffMinutes,
  preview,
  prepare,
  enqueue,
  send,
  sendOrSimulate,
  retry,
  refreshStatus,
  processDueQueue,
  startQueueScheduler,
  cancel,
  manualStatus,
  checkUser,
  registerUserManual,
  documentPdf,
  renderQueuePdf,
  qrTextFor,
  listQueue,
  listEvents,
  listArchive,
  statusSummary,
  buildPayload,
};
