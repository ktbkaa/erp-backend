/**
 * e-Belge adaptör iskeleti.
 * Harici GİB / özel entegratör çağrısı yok; durum makinesi ve kuyruk kayıtları hazırlar.
 * Canlı gönderim bağlandığında provider_code üzerinden gerçek adaptör enjekte edilir.
 */

const STATUSES = Object.freeze([
  'Taslak',
  'Hazir',
  'Kuyrukta',
  'Gonderildi',
  'Hata',
  'Iptal',
]);

function assertTransition(from, to) {
  const allowed = {
    Taslak: ['Hazir', 'Iptal'],
    Hazir: ['Kuyrukta', 'Iptal', 'Taslak'],
    Kuyrukta: ['Gonderildi', 'Hata', 'Iptal'],
    Gonderildi: ['Iptal'],
    Hata: ['Hazir', 'Kuyrukta', 'Iptal'],
    Iptal: ['Taslak'],
  };
  const ok = (allowed[from] || []).includes(to);
  if (!ok) {
    const err = new Error(`e-Belge durum geçişi geçersiz: ${from} → ${to}`);
    err.status = 400;
    err.code = 'ERR-EBELGE-STATUS';
    throw err;
  }
}

async function loadSource(client, documentType, documentId) {
  if (documentType === 'Fatura') {
    const r = await client.query(
      `SELECT id, invoice_no AS document_no, company_id, uuid_ettn, gib_number,
              e_document_status, scenario, invoice_type, partner_id, payable_amount
       FROM invoices WHERE id=$1 AND COALESCE(is_deleted,FALSE)=FALSE`,
      [documentId]
    );
    return r.rows[0] || null;
  }
  if (documentType === 'Irsaliye') {
    try {
      const r = await client.query(
        `SELECT id, delivery_note_no AS document_no, company_id, uuid_ettn, gib_number,
                e_document_status, scenario, partner_id
         FROM delivery_notes WHERE id=$1 AND COALESCE(is_deleted,FALSE)=FALSE`,
        [documentId]
      );
      return r.rows[0] || null;
    } catch (_) {
      const r2 = await client.query(
        `SELECT id, delivery_note_no AS document_no, company_id, uuid_ettn, gib_number,
                e_document_status, scenario, partner_id
         FROM delivery_notes WHERE id=$1`,
        [documentId]
      );
      return r2.rows[0] || null;
    }
  }
  const err = new Error(`Desteklenmeyen belge tipi: ${documentType}`);
  err.status = 400;
  throw err;
}

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
    note: 'Yerel kuyruk — harici gönderim henüz bağlı değil.',
  };
}

async function prepare(client, { documentType, documentId, providerCode = null, kullaniciKodu = null }) {
  const src = await loadSource(client, documentType, documentId);
  if (!src) {
    const err = new Error('Kaynak belge bulunamadı.');
    err.status = 404;
    throw err;
  }
  const payload = buildPayload(src, documentType);
  const ins = await client.query(
    `INSERT INTO e_document_queue (
       company_id, document_type, document_id, document_no, direction, status,
       provider_code, uuid_ettn, gib_number, payload_json
     ) VALUES ($1,$2,$3,$4,'Giden','Hazir',$5,$6,$7,$8::jsonb)
     RETURNING *`,
    [
      src.company_id,
      documentType,
      documentId,
      src.document_no,
      providerCode,
      src.uuid_ettn || null,
      src.gib_number || null,
      JSON.stringify({ ...payload, prepared_by: kullaniciKodu || null }),
    ]
  );
  // Kaynak belgede durum alanını güncelle (varsa)
  if (documentType === 'Fatura') {
    await client.query(
      `UPDATE invoices SET e_document_status='Hazir', updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
      [documentId]
    ).catch(() => {});
  } else if (documentType === 'Irsaliye') {
    await client.query(
      `UPDATE delivery_notes SET e_document_status='Hazir' WHERE id=$1`,
      [documentId]
    ).catch(() => {});
  }
  return ins.rows[0];
}

async function enqueue(client, queueId) {
  const cur = await client.query(`SELECT * FROM e_document_queue WHERE id=$1`, [queueId]);
  const row = cur.rows[0];
  if (!row) {
    const err = new Error('Kuyruk kaydı bulunamadı.');
    err.status = 404;
    throw err;
  }
  assertTransition(row.status, 'Kuyrukta');
  const upd = await client.query(
    `UPDATE e_document_queue
     SET status='Kuyrukta', queued_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP, last_error=NULL
     WHERE id=$1 RETURNING *`,
    [queueId]
  );
  return upd.rows[0];
}

/**
 * Gerçek gönderim yok: kuyruktaki kaydı "simüle gönderildi" yapar veya
 * provider bağlı değilse bilgilendirici hata bırakır.
 */
async function sendOrSimulate(client, queueId, { simulate = true } = {}) {
  const cur = await client.query(`SELECT * FROM e_document_queue WHERE id=$1`, [queueId]);
  const row = cur.rows[0];
  if (!row) {
    const err = new Error('Kuyruk kaydı bulunamadı.');
    err.status = 404;
    throw err;
  }
  if (row.status !== 'Kuyrukta' && row.status !== 'Hazir') {
    assertTransition(row.status, 'Gonderildi');
  } else if (row.status === 'Hazir') {
    assertTransition('Hazir', 'Kuyrukta');
    await client.query(
      `UPDATE e_document_queue SET status='Kuyrukta', queued_at=CURRENT_TIMESTAMP WHERE id=$1`,
      [queueId]
    );
  }

  if (!simulate && !row.provider_code) {
    const upd = await client.query(
      `UPDATE e_document_queue
       SET status='Hata', last_error=$2, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [queueId, 'Harici e-belge sağlayıcısı tanımlı değil (provider_code boş). Canlı Gonderildi yazılmaz.']
    );
    return { row: upd.rows[0], simulated: false, live_blocked: true };
  }

  // Canlı + provider: henüz gerçek GİB/entegratör yok → Beklemede (sahte Gonderildi yok)
  if (!simulate && row.provider_code) {
    const upd = await client.query(
      `UPDATE e_document_queue
       SET status='Kuyrukta', last_error=$2, updated_at=CURRENT_TIMESTAMP,
           payload_json = COALESCE(payload_json,'{}'::jsonb) || $3::jsonb
       WHERE id=$1 RETURNING *`,
      [
        queueId,
        `Sağlayıcı ${row.provider_code} için canlı adapter henüz bağlı değil. Entegratör sözleşmesi sonrası tamamlanacak.`,
        JSON.stringify({ simulated: false, sent_mode: 'live-pending', provider_code: row.provider_code }),
      ]
    );
    return { row: upd.rows[0], simulated: false, live_pending: true };
  }

  const ettn = row.uuid_ettn || `SIM-${Date.now()}-${queueId}`;
  const gib = row.gib_number || `GIB-SIM-${queueId}`;
  const upd = await client.query(
    `UPDATE e_document_queue
     SET status='Gonderildi', sent_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP,
         uuid_ettn=COALESCE(uuid_ettn,$2), gib_number=COALESCE(gib_number,$3),
         last_error=NULL,
         payload_json = COALESCE(payload_json,'{}'::jsonb) || $4::jsonb
     WHERE id=$1 RETURNING *`,
    [queueId, ettn, gib, JSON.stringify({ simulated: true, sent_mode: 'simulate' })]
  );

  if (row.document_type === 'Fatura') {
    await client.query(
      `UPDATE invoices SET e_document_status='Gonderildi',
         uuid_ettn=COALESCE(uuid_ettn,$2), gib_number=COALESCE(gib_number,$3),
         updated_at=CURRENT_TIMESTAMP
       WHERE id=$1`,
      [row.document_id, ettn, gib]
    ).catch(() => {});
  } else if (row.document_type === 'Irsaliye') {
    await client.query(
      `UPDATE delivery_notes SET e_document_status='Gonderildi',
         uuid_ettn=COALESCE(uuid_ettn,$2), gib_number=COALESCE(gib_number,$3)
       WHERE id=$1`,
      [row.document_id, ettn, gib]
    ).catch(() => {});
  }

  return { row: upd.rows[0], simulated: true };
}

async function listQueue(client, { companyId = null, status = null, limit = 200 } = {}) {
  const params = [];
  const where = [];
  if (companyId) {
    params.push(Number(companyId));
    where.push(`company_id=$${params.length}`);
  }
  if (status) {
    params.push(String(status));
    where.push(`status=$${params.length}`);
  }
  params.push(Math.min(Number(limit) || 200, 500));
  const r = await client.query(
    `SELECT * FROM e_document_queue
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY id DESC
     LIMIT $${params.length}`,
    params
  );
  return r.rows;
}

module.exports = {
  STATUSES,
  assertTransition,
  prepare,
  enqueue,
  sendOrSimulate,
  listQueue,
  buildPayload,
};
