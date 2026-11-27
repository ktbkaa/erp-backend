/** e-Belge entegrasyon testleri için izole (benzersiz kodlu) firma/cari/stok/belge kurulumu ve temizliği. */
require('dotenv').config();

const TAG = `EBT${Date.now().toString(36).toUpperCase()}`;

async function seed(pool) {
  const c = await pool.query(
    `INSERT INTO companies (company_code, company_name, tax_id, tax_office, address, phone, email, mersis_number)
     VALUES ($1, 'KTB e-Belge Test Sanayi A.Ş.', '1234567801', 'Büyük Mükellefler', 'OSB 3. Cadde', '+90 212 555 00 00', 'efatura@ktb.example.com.tr', '0123456789000015')
     RETURNING id`,
    [TAG]
  );
  const companyId = c.rows[0].id;
  await pool.query(
    `INSERT INTO e_document_settings (company_id, invoice_prefix, archive_prefix, despatch_prefix, invoice_sender_alias, despatch_sender_alias,
       street_name, building_number, district, city, postal_code, iban, bank_name)
     VALUES ($1, 'KTF', 'KTA', 'KTI', 'urn:mail:defaultgb@ktb.example.com.tr', 'urn:mail:irsaliyegb@ktb.example.com.tr',
       'Organize Sanayi Bölgesi 3. Cadde', '12', 'Başakşehir', 'İstanbul', '34490', 'TR33 0006 1005 1978 6457 8413 26', 'Örnek Bankası')`,
    [companyId]
  );
  const partner = await pool.query(
    `INSERT INTO partners (partner_code, partner_name, tax_id, tax_office, province, district, postal_code, country, bill_address_1, email, company_id)
     VALUES ($1, 'Örnek Çelik Ürünleri Ltd. Şti.', '9876543210', 'Çankaya', 'Ankara', 'Çankaya', '06420', 'Türkiye', 'Atatürk Bulvarı No:5', 'muhasebe@ornekcelik.example.com.tr', $2)
     RETURNING id`,
    [`${TAG}-C1`, companyId]
  );
  const person = await pool.query(
    `INSERT INTO partners (partner_code, partner_name, tax_id, first_name, last_name, province, district, postal_code, country, bill_address_1, company_id)
     VALUES ($1, 'Ayşe Gündoğdu', '10000000146', 'Ayşe', 'Gündoğdu', 'İstanbul', 'Şişli', '34360', 'Türkiye', 'Şişli Cad. 7', $2)
     RETURNING id`,
    [`${TAG}-C2`, companyId]
  );
  const items = [];
  for (const [code, name, uom, vat] of [
    [`${TAG}-SAC`, 'Sac Levha 2mm', 'KG', 20],
    [`${TAG}-HZM`, 'Kaynak İşçiliği', 'SAAT', 20],
    [`${TAG}-GDA`, 'Gıda Numune', 'ADET', 1],
  ]) {
    items.push((await pool.query(
      `INSERT INTO items (item_code, item_name, uom_code, default_vat_rate) VALUES ($1,$2,$3,$4) RETURNING id`,
      [code, name, uom, vat]
    )).rows[0].id);
  }
  const wh = (await pool.query(`SELECT id FROM warehouses ORDER BY id LIMIT 1`)).rows[0];
  return { companyId, partnerId: partner.rows[0].id, personId: person.rows[0].id, items, warehouseId: wh ? wh.id : null, tag: TAG };
}

let seq = 0;
async function createInvoice(pool, ctx, over = {}) {
  seq += 1;
  const o = {
    partnerId: ctx.partnerId, invoiceType: 'Satis', scenario: null, mailboxAlias: null, sourceId: null, currency: 'TRY', rate: null,
    lines: [
      { item: 0, qty: 10, price: 125.5, vat: 20, discount: 25.5 },
      { item: 1, qty: 2, price: 750, vat: 20 },
      { item: 2, qty: 3, price: 33.33, vat: 1 },
    ],
    ...over,
  };
  const r = await pool.query(
    `INSERT INTO invoices (invoice_no, partner_id, invoice_type, company_id, scenario, mailbox_alias, invoice_date, status,
                           invoice_source_id, currency_code, exchange_rate, description, total_amount)
     VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,'Taslak',$7,$8,$9,'e-Belge entegrasyon testi',0) RETURNING id`,
    [`${ctx.tag}-F${seq}`, o.partnerId, o.invoiceType, ctx.companyId, o.scenario, o.mailboxAlias, o.sourceId, o.currency, o.rate]
  );
  const id = r.rows[0].id;
  let n = 0;
  for (const l of o.lines) {
    n += 1;
    await pool.query(
      `INSERT INTO invoice_lines (invoice_id, item_id, quantity, unit_price, total_amount, vat_rate, discount_amount, line_no,
                                  withholding_code, withholding_rate, tax_exemption_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, ctx.items[l.item], l.qty, l.price, l.qty * l.price - (l.discount || 0), l.vat, l.discount || 0, n,
        l.withholdingCode || null, l.withholdingRate || null, l.exemptionCode || null]
    );
  }
  return id;
}

async function createDeliveryNote(pool, ctx, over = {}) {
  seq += 1;
  const r = await pool.query(
    `INSERT INTO delivery_notes (delivery_note_no, partner_id, warehouse_id, company_id, delivery_date, mailbox_alias,
                                 vehicle_plate, driver_name, driver_last_name, driver_national_id, ship_address_1, ship_city, ship_district, ship_postal_code)
     VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,'34 ABC 123','Mehmet','Öztürk','12345678950','Atatürk Bulvarı No:5','Ankara','Çankaya','06420')
     RETURNING id`,
    [`${ctx.tag}-I${seq}`, ctx.partnerId, ctx.warehouseId, ctx.companyId, over.mailboxAlias === undefined ? 'urn:mail:irsaliyepk@ornekcelik.example.com.tr' : over.mailboxAlias]
  );
  const id = r.rows[0].id;
  await pool.query(
    `INSERT INTO delivery_note_lines (delivery_note_id, item_id, quantity, unit_price, line_no) VALUES ($1,$2,10,125.5,1), ($1,$3,4,33.33,2)`,
    [id, ctx.items[0], ctx.items[2]]
  );
  return id;
}

/** Arşiv satırları sandbox'ta retain_until=bugün olduğundan silinebilir; olay kayıtları kalıcıdır (tasarım gereği). */
async function cleanup(pool, ctx) {
  if (!ctx) return;
  const client = await pool.connect();
  try {
    // Gönderilmiş test belgelerini silebilmek için belge kilidi tetikleyicilerinin oturum kaçışı (yoksa etkisiz).
    await client.query(`SELECT set_config('erp.belge_kilit_bypass', 'on', false)`);
    await cleanupWith(client, ctx);
  } finally {
    await client.query(`SELECT set_config('erp.belge_kilit_bypass', '', false)`).catch(() => {});
    client.release();
  }
}

async function cleanupWith(db, ctx) {
  const q = (sql, p) => db.query(sql, p).catch(() => {});
  const inv = (await db.query(`SELECT id FROM invoices WHERE company_id=$1`, [ctx.companyId]).catch(() => ({ rows: [] }))).rows.map((r) => r.id);
  const dn = (await db.query(`SELECT id FROM delivery_notes WHERE company_id=$1`, [ctx.companyId]).catch(() => ({ rows: [] }))).rows.map((r) => r.id);
  await q(`DELETE FROM e_document_archive WHERE company_id=$1`, [ctx.companyId]);
  await q(`DELETE FROM e_document_queue WHERE company_id=$1`, [ctx.companyId]);
  await q(`DELETE FROM invoice_lines WHERE invoice_id = ANY($1::int[])`, [inv]);
  await q(`DELETE FROM invoices WHERE id = ANY($1::int[])`, [inv]);
  await q(`DELETE FROM delivery_note_lines WHERE delivery_note_id = ANY($1::int[])`, [dn]);
  await q(`DELETE FROM delivery_notes WHERE id = ANY($1::int[])`, [dn]);
  await q(`DELETE FROM items WHERE id = ANY($1::int[])`, [ctx.items]);
  await q(`DELETE FROM partners WHERE id = ANY($1::int[])`, [[ctx.partnerId, ctx.personId]]);
  await q(`DELETE FROM e_document_series WHERE company_id=$1`, [ctx.companyId]);
  await q(`DELETE FROM e_document_settings WHERE company_id=$1`, [ctx.companyId]);
  await q(`DELETE FROM e_document_registered_users WHERE tax_id IN ('9876543210','10000000146') AND source='MANUEL'`);
  await q(`DELETE FROM companies WHERE id=$1`, [ctx.companyId]);
}

module.exports = { seed, createInvoice, createDeliveryNote, cleanup, TAG };
