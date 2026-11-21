/**
 * Fason Yönetimi — emanet stok, sevk/tüketim/iade/teslimat, maliyet.
 * Ayrımlar: sevk≠tüketim, teslim≠KK kabul, sipariş≠fatura, tahmini≠gerçekleşen.
 */
const { createStockMovement, warehouseItemBalance } = require('./stokHareketService');
const { nextDocumentNo } = require('../utils/belgeNo');

const OP_STATUS = {
  PLANLANDI: 'Planlandi',
  SIPARIS_BEKLIYOR: 'SiparisBekliyor',
  ONAY_BEKLIYOR: 'OnayBekliyor',
  MALZEME_HAZIR: 'MalzemeHazirlaniyor',
  SEVKE_HAZIR: 'SevkeHazir',
  KISMI_GONDERILDI: 'KismiGonderildi',
  FASONDDA: 'Fasoncuda',
  KISMI_TESLIM: 'KismiTeslimAlindi',
  TESLIM: 'TeslimAlindi',
  KK_BEKLIYOR: 'KaliteKontrolBekliyor',
  TAMAMLANDI: 'Tamamlandi',
  IPTAL: 'Iptal',
};

async function getParams(client, companyId) {
  if (!companyId) return null;
  const r = await client.query(
    `SELECT * FROM subcontract_parameters WHERE company_id=$1`,
    [companyId],
  );
  return r.rows[0] || null;
}

async function ensureEmanetWarehouse(client, { companyId, plantId, partnerId }) {
  const p = await client.query(
    `SELECT id, partner_code, partner_name, is_subcontractor FROM partners WHERE id=$1`,
    [partnerId],
  );
  if (!p.rows[0]) throw Object.assign(new Error('Fasoncu cari bulunamadı.'), { status: 404 });
  if (!p.rows[0].is_subcontractor) {
    // Otomatik rol aç — ikinci cari kartı oluşturma
    await client.query(`UPDATE partners SET is_subcontractor=TRUE WHERE id=$1`, [partnerId]);
  }
  const code = `FAS-${p.rows[0].partner_code}`.slice(0, 40);
  const existing = await client.query(
    `SELECT * FROM warehouses WHERE partner_id=$1 AND warehouse_role='FasonEmanet' LIMIT 1`,
    [partnerId],
  );
  if (existing.rows[0]) return existing.rows[0];

  let plant = plantId;
  if (!plant && companyId) {
    const pl = await client.query(
      `SELECT id FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`,
      [companyId],
    );
    plant = pl.rows[0]?.id || null;
  }
  if (!plant) {
    const pl = await client.query(`SELECT id FROM plants ORDER BY id LIMIT 1`);
    plant = pl.rows[0]?.id;
  }
  if (!plant) throw new Error('Fason emanet deposu için iş yeri gerekli.');

  const ins = await client.query(
    `
    INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_role, partner_id)
    VALUES ($1,$2,$3,TRUE,'FasonEmanet',$4)
    RETURNING *
    `,
    [plant, code, `Fason Emanet — ${p.rows[0].partner_name}`, partnerId],
  );
  return ins.rows[0];
}

async function movementCodeId(client, code) {
  const r = await client.query(`SELECT id FROM movement_codes WHERE movement_code=$1`, [code]);
  if (!r.rows[0]) throw new Error(`Hareket kodu tanımlı değil: ${code}`);
  return r.rows[0].id;
}

async function refreshOrderLineTotals(client, orderId) {
  await client.query(
    `
    UPDATE subcontract_orders o SET
      estimated_amount = COALESCE((
        SELECT SUM(ordered_qty * unit_price) FROM subcontract_order_lines WHERE order_id=o.id
      ),0),
      actual_amount = COALESCE((
        SELECT SUM(accepted_qty * unit_price) FROM subcontract_order_lines WHERE order_id=o.id
      ),0),
      updated_at = NOW()
    WHERE o.id=$1
    `,
    [orderId],
  );
}

async function syncOperationStatus(client, opId, opts = {}) {
  if (!opId) return;
  const r = await client.query(`SELECT * FROM production_order_operations WHERE id=$1`, [opId]);
  const op = r.rows[0];
  if (!op || !op.is_subcontract) return;
  const sent = Number(op.qty_sent || 0);
  const recv = Number(op.qty_received || 0);
  const acc = Number(op.qty_accepted || 0);
  const plan = Number(op.planned_quantity || 0);
  const blockUntilQc = opts.blockUntilQc !== false;
  let status = OP_STATUS.PLANLANDI;
  if (acc >= plan && plan > 0) status = OP_STATUS.TAMAMLANDI;
  else if (blockUntilQc && recv > 0 && acc + 1e-9 < recv) status = OP_STATUS.KK_BEKLIYOR;
  else if (recv > 0 && recv < plan) status = OP_STATUS.KISMI_TESLIM;
  else if (recv >= plan && plan > 0) status = OP_STATUS.TESLIM;
  else if (sent > 0 && sent < plan) status = OP_STATUS.KISMI_GONDERILDI;
  else if (sent >= plan && plan > 0) status = OP_STATUS.FASONDDA;
  else if (sent === 0) status = OP_STATUS.SEVKE_HAZIR;
  // KK beklerken produced_qty kabul miktarını aşmasın
  const produced = blockUntilQc ? acc : Math.max(acc, recv);
  await client.query(
    `UPDATE production_order_operations SET subcontract_status=$2,
      produced_quantity = GREATEST(COALESCE(produced_quantity,0), $3)
     WHERE id=$1`,
    [opId, status, produced],
  );
}

/** Firma + operasyon + istek gövdesinden GKK isteği */
function resolveWantQc({ createQc, params, opDefQc }) {
  if (createQc != null) return Boolean(createQc);
  if (opDefQc != null) return Boolean(opDefQc);
  if (params?.qc_on_receipt != null) return Boolean(params.qc_on_receipt);
  return params?.qc_required !== false; // varsayılan açık
}

async function addCostEntry(client, row) {
  await client.query(
    `
    INSERT INTO subcontract_cost_entries
      (company_id, order_id, order_line_id, production_order_id, production_order_operation_id,
       cost_type, amount, currency_code, quantity, unit_price, invoice_id, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `,
    [
      row.company_id || null,
      row.order_id || null,
      row.order_line_id || null,
      row.production_order_id || null,
      row.production_order_operation_id || null,
      row.cost_type,
      row.amount || 0,
      row.currency_code || 'TRY',
      row.quantity || null,
      row.unit_price || null,
      row.invoice_id || null,
      row.notes || null,
    ],
  );
}

/** Malzeme sevki: şirket deposu → fason emanet (tüketim değil) */
async function shipMaterials(client, {
  orderId, fromWarehouseId, lines, companyId, userCode, description,
}) {
  const ord = await client.query(`SELECT * FROM subcontract_orders WHERE id=$1 FOR UPDATE`, [orderId]);
  if (!ord.rows[0]) throw Object.assign(new Error('Fason siparişi bulunamadı.'), { status: 404 });
  const order = ord.rows[0];
  if (['Iptal', 'Kapali'].includes(order.status)) {
    throw Object.assign(new Error('İptal/kapalı siparişe sevk yapılamaz.'), { status: 400 });
  }
  if (!Array.isArray(lines) || !lines.length) throw new Error('Sevk satırları zorunlu.');
  if (!fromWarehouseId) throw new Error('Çıkış deposu zorunlu.');

  const emanet = await ensureEmanetWarehouse(client, {
    companyId: companyId || order.company_id,
    plantId: order.plant_id,
    partnerId: order.partner_id,
  });

  const hkId = await movementCodeId(client, 'FAS-SEVK');
  const shipmentNo = await nextDocumentNo(client, 'FASON_SEVK');

  // Transfer: çıkış kaynak depodan, giriş emanet depoya (iki hareket)
  const outMv = await createStockMovement(client, {
    hareketTipi: 'TRANSFER',
    isYeriId: order.plant_id,
    depoId: fromWarehouseId,
    hedefDepoId: emanet.id,
    belgeTipi: 'FasonSevk',
    belgeId: null,
    description: description || `Fason sevk ${shipmentNo}`,
    hareketKoduId: hkId,
    firmaId: order.company_id,
    cariId: order.partner_id,
    kullaniciKodu: userCode,
    depoZorunluAtla: true,
    satirlar: lines.map((l) => ({
      item_id: l.item_id,
      quantity: Number(l.quantity),
      direction: -1,
      lot_id: l.lot_id || null,
      uom_code: l.uom_code || null,
      stock_status: 'Kullanilabilir',
    })),
  });

  const inMv = await createStockMovement(client, {
    hareketTipi: 'TRANSFER',
    isYeriId: order.plant_id,
    depoId: emanet.id,
    belgeTipi: 'FasonSevk',
    belgeId: null,
    description: description || `Fason sevk emanet ${shipmentNo}`,
    hareketKoduId: hkId,
    firmaId: order.company_id,
    cariId: order.partner_id,
    kullaniciKodu: userCode,
    bagliHareketId: outMv.hareket.id,
    depoZorunluAtla: true,
    satirlar: lines.map((l) => ({
      item_id: l.item_id,
      quantity: Number(l.quantity),
      direction: 1,
      lot_id: l.lot_id || null,
      uom_code: l.uom_code || null,
      stock_status: 'Kullanilabilir',
      otomatik_parti: false,
    })),
  });

  const sh = await client.query(
    `
    INSERT INTO subcontract_shipments
      (company_id, shipment_no, partner_id, order_id, production_order_id,
       from_warehouse_id, to_warehouse_id, stock_movement_id, description, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
    `,
    [
      order.company_id, shipmentNo, order.partner_id, order.id, order.production_order_id,
      fromWarehouseId, emanet.id, outMv.hareket.id, description || null, userCode || null,
    ],
  );

  for (const l of lines) {
    await client.query(
      `
      INSERT INTO subcontract_shipment_lines
        (shipment_id, order_line_id, item_id, lot_id, quantity, uom_code, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [sh.rows[0].id, l.order_line_id || null, l.item_id, l.lot_id || null, l.quantity, l.uom_code || null, l.notes || null],
    );
    if (l.order_line_id) {
      await client.query(
        `UPDATE subcontract_order_lines SET sent_qty = COALESCE(sent_qty,0) + $2 WHERE id=$1`,
        [l.order_line_id, Number(l.quantity)],
      );
      const ol = await client.query(`SELECT production_order_operation_id FROM subcontract_order_lines WHERE id=$1`, [l.order_line_id]);
      const opId = ol.rows[0]?.production_order_operation_id;
      if (opId) {
        await client.query(
          `UPDATE production_order_operations SET qty_sent = COALESCE(qty_sent,0) + $2 WHERE id=$1`,
          [opId, Number(l.quantity)],
        );
        await syncOperationStatus(client, opId);
      }
    }
  }

  if (['Taslak', 'Onayli', 'Acik'].includes(order.status) || order.status === 'Planlandi') {
    await client.query(`UPDATE subcontract_orders SET status='SevkEdildi', updated_at=NOW() WHERE id=$1`, [order.id]);
  } else {
    await client.query(`UPDATE subcontract_orders SET status='KismiSevk', updated_at=NOW() WHERE id=$1 AND status NOT IN ('Tamamlandi','Iptal')`, [order.id]);
  }

  return { shipment: sh.rows[0], outMovement: outMv.hareket, inMovement: inMv.hareket, emanet };
}

/** Tüketim bildirimi: emanet stoktan çıkış (fire ayrı) — mülkiyet tüketimi */
async function reportConsumption(client, {
  orderId, lines, companyId, userCode, description,
}) {
  const ord = await client.query(`SELECT * FROM subcontract_orders WHERE id=$1 FOR UPDATE`, [orderId]);
  if (!ord.rows[0]) throw Object.assign(new Error('Fason siparişi bulunamadı.'), { status: 404 });
  const order = ord.rows[0];
  const params = await getParams(client, order.company_id || companyId);

  // Firma seçeneği: 5→GKK→6 — bekleyen giriş KK varken emanet tüketimi yok
  if (params?.require_qc_before_consume) {
    const pending = await client.query(
      `
      SELECT COUNT(*)::int AS n
      FROM subcontract_receipts
      WHERE order_id=$1 AND status='KaliteKontrolBekliyor'
      `,
      [orderId],
    );
    if (Number(pending.rows[0]?.n || 0) > 0) {
      throw Object.assign(
        new Error('Giriş kalite kontrolü bekleyen teslimat var — tüketim engellendi (require_qc_before_consume).'),
        { status: 409, code: 'FASON_GKK_BEKLIYOR' },
      );
    }
  }

  const emanet = await ensureEmanetWarehouse(client, {
    companyId: order.company_id,
    plantId: order.plant_id,
    partnerId: order.partner_id,
  });

  for (const l of lines) {
    const total = Number(l.consumed_qty || 0) + Number(l.scrap_qty || 0);
    if (total <= 0) throw new Error('Tüketim/fire miktarı gerekli.');
    const bal = await warehouseItemBalance(client, emanet.id, l.item_id, { stokStatu: 'Kullanilabilir', partiId: l.lot_id || null });
    if (bal + 1e-9 < total) {
      throw Object.assign(
        new Error(`Emanet stok yetersiz. item_id=${l.item_id} bakiye=${bal} istenen=${total}`),
        { status: 400, code: 'EMANET_YETERSIZ' },
      );
    }
    if (l.order_line_id && params) {
      const ol = await client.query(`SELECT ordered_qty, sent_qty, consumed_qty, scrap_qty FROM subcontract_order_lines WHERE id=$1`, [l.order_line_id]);
      const row = ol.rows[0];
      if (row) {
        const scrapPct = (Number(row.scrap_qty || 0) + Number(l.scrap_qty || 0))
          / Math.max(Number(row.sent_qty || 0) + Number(l.consumed_qty || 0) + Number(l.scrap_qty || 0), 1) * 100;
        if (scrapPct > Number(params.max_scrap_pct || 100)) {
          throw Object.assign(
            new Error(`Fire oranı (%${scrapPct.toFixed(2)}) maksimum %${params.max_scrap_pct} aştı — onay gerekli.`),
            { status: 409, code: 'FIRE_TOLERANS' },
          );
        }
      }
    }
  }

  const hkId = await movementCodeId(client, 'FAS-TUKET');
  const no = await nextDocumentNo(client, 'FASON_TUKET');
  const mvLines = [];
  for (const l of lines) {
    const qty = Number(l.consumed_qty || 0) + Number(l.scrap_qty || 0);
    mvLines.push({
      item_id: l.item_id,
      quantity: qty,
      direction: -1,
      lot_id: l.lot_id || null,
      uom_code: l.uom_code || null,
      stock_status: 'Kullanilabilir',
    });
  }

  const mv = await createStockMovement(client, {
    hareketTipi: 'URETIM_TUKETIM',
    isYeriId: order.plant_id,
    depoId: emanet.id,
    belgeTipi: 'FasonTuketim',
    description: description || `Fason tüketim ${no}`,
    hareketKoduId: hkId,
    firmaId: order.company_id,
    cariId: order.partner_id,
    kullaniciKodu: userCode,
    depoZorunluAtla: true,
    satirlar: mvLines,
  });

  const cons = await client.query(
    `
    INSERT INTO subcontract_consumptions
      (company_id, consumption_no, partner_id, order_id, production_order_id,
       emanet_warehouse_id, stock_movement_id, description, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      order.company_id, no, order.partner_id, order.id, order.production_order_id,
      emanet.id, mv.hareket.id, description || null, userCode || null,
    ],
  );

  for (const l of lines) {
    await client.query(
      `
      INSERT INTO subcontract_consumption_lines
        (consumption_id, order_line_id, item_id, lot_id, consumed_qty, scrap_qty, scrap_reason, uom_code, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        cons.rows[0].id, l.order_line_id || null, l.item_id, l.lot_id || null,
        Number(l.consumed_qty || 0), Number(l.scrap_qty || 0), l.scrap_reason || null,
        l.uom_code || null, l.notes || null,
      ],
    );
    if (l.order_line_id) {
      await client.query(
        `
        UPDATE subcontract_order_lines SET
          consumed_qty = COALESCE(consumed_qty,0) + $2,
          scrap_qty = COALESCE(scrap_qty,0) + $3
        WHERE id=$1
        `,
        [l.order_line_id, Number(l.consumed_qty || 0), Number(l.scrap_qty || 0)],
      );
      const ol = await client.query(
        `SELECT production_order_id, production_order_operation_id FROM subcontract_order_lines WHERE id=$1`,
        [l.order_line_id],
      );
      const opId = ol.rows[0]?.production_order_operation_id;
      const woId = ol.rows[0]?.production_order_id || order.production_order_id;
      if (opId) {
        await client.query(
          `UPDATE production_order_operations SET qty_scrap = COALESCE(qty_scrap,0) + $2 WHERE id=$1`,
          [opId, Number(l.scrap_qty || 0)],
        );
      }
      // WO bileşen tüketimi (varsa aynı malzeme satırı)
      if (woId && Number(l.consumed_qty || 0) > 0) {
        await client.query(
          `
          UPDATE production_order_components
          SET consumed_quantity = COALESCE(consumed_quantity,0) + $3
          WHERE order_id=$1 AND item_id=$2
          `,
          [woId, l.item_id, Number(l.consumed_qty || 0)],
        );
      }
      if (Number(l.scrap_qty || 0) > 0) {
        await addCostEntry(client, {
          company_id: order.company_id,
          order_id: order.id,
          order_line_id: l.order_line_id,
          production_order_id: woId,
          production_order_operation_id: opId,
          cost_type: 'Fire',
          amount: 0,
          quantity: Number(l.scrap_qty),
          notes: l.scrap_reason || 'Fason fire',
        });
      }
    }
  }

  return { consumption: cons.rows[0], movement: mv.hareket };
}

/** Kullanılmayan malzeme iadesi: emanet → şirket (otomatik kullanılabilir olmayabilir) */
async function returnMaterials(client, {
  orderId, toWarehouseId, lines, companyId, userCode, description, reason, quarantine,
}) {
  const ord = await client.query(`SELECT * FROM subcontract_orders WHERE id=$1 FOR UPDATE`, [orderId]);
  if (!ord.rows[0]) throw Object.assign(new Error('Fason siparişi bulunamadı.'), { status: 404 });
  const order = ord.rows[0];
  const emanet = await ensureEmanetWarehouse(client, {
    companyId: order.company_id || companyId,
    plantId: order.plant_id,
    partnerId: order.partner_id,
  });
  if (!toWarehouseId) throw new Error('Hedef depo zorunlu.');

  const hkId = await movementCodeId(client, 'FAS-IADE');
  const no = await nextDocumentNo(client, 'FASON_IADE');
  const stockStatus = quarantine ? 'Kalitede' : 'Kullanilabilir';

  const outMv = await createStockMovement(client, {
    hareketTipi: 'IADE_CIKIS',
    isYeriId: order.plant_id,
    depoId: emanet.id,
    hedefDepoId: toWarehouseId,
    belgeTipi: 'FasonIade',
    description: description || `Fason iade ${no}`,
    hareketKoduId: hkId,
    firmaId: order.company_id,
    cariId: order.partner_id,
    kullaniciKodu: userCode,
    depoZorunluAtla: true,
    satirlar: lines.map((l) => ({
      item_id: l.item_id,
      quantity: Number(l.quantity),
      direction: -1,
      lot_id: l.lot_id || null,
      uom_code: l.uom_code || null,
      stock_status: 'Kullanilabilir',
    })),
  });

  await createStockMovement(client, {
    hareketTipi: 'IADE_GIRIS',
    isYeriId: order.plant_id,
    depoId: toWarehouseId,
    belgeTipi: 'FasonIade',
    description: description || `Fason iade giriş ${no}`,
    hareketKoduId: hkId,
    firmaId: order.company_id,
    cariId: order.partner_id,
    kullaniciKodu: userCode,
    bagliHareketId: outMv.hareket.id,
    depoZorunluAtla: true,
    satirlar: lines.map((l) => ({
      item_id: l.item_id,
      quantity: Number(l.quantity),
      direction: 1,
      lot_id: l.lot_id || null,
      uom_code: l.uom_code || null,
      stock_status: stockStatus,
      otomatik_parti: false,
    })),
  });

  const ret = await client.query(
    `
    INSERT INTO subcontract_returns
      (company_id, return_no, partner_id, order_id, production_order_id,
       from_warehouse_id, to_warehouse_id, stock_movement_id, qc_required, reason, description, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
    `,
    [
      order.company_id, no, order.partner_id, order.id, order.production_order_id,
      emanet.id, toWarehouseId, outMv.hareket.id, Boolean(quarantine), reason || null,
      description || null, userCode || null,
    ],
  );

  for (const l of lines) {
    await client.query(
      `
      INSERT INTO subcontract_return_lines
        (return_id, order_line_id, item_id, lot_id, quantity, uom_code, stock_status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        ret.rows[0].id, l.order_line_id || null, l.item_id, l.lot_id || null,
        l.quantity, l.uom_code || null, stockStatus, l.notes || null,
      ],
    );
    if (l.order_line_id) {
      await client.query(
        `UPDATE subcontract_order_lines SET returned_qty = COALESCE(returned_qty,0) + $2 WHERE id=$1`,
        [l.order_line_id, Number(l.quantity)],
      );
    }
  }

  return { returnDoc: ret.rows[0], movement: outMv.hareket };
}

/** Ürün teslimatı — stok girişi; KK kabulü ayrı adım */
async function receiveProduct(client, {
  orderId, toWarehouseId, lines, companyId, userCode, description, createQc,
}) {
  const ord = await client.query(`SELECT * FROM subcontract_orders WHERE id=$1 FOR UPDATE`, [orderId]);
  if (!ord.rows[0]) throw Object.assign(new Error('Fason siparişi bulunamadı.'), { status: 404 });
  const order = ord.rows[0];
  const params = await getParams(client, order.company_id || companyId);
  if (!toWarehouseId) throw new Error('Teslim depo zorunlu.');
  if (!Array.isArray(lines) || !lines.length) throw new Error('Teslimat satırları zorunlu.');

  // Operasyon tanımı KK bayrağı (satır bazında; yoksa firma)
  let opDefQc = null;
  for (const l of lines) {
    if (!l.order_line_id) continue;
    const ol = await client.query(
      `
      SELECT sol.*, od.qc_required AS op_qc
      FROM subcontract_order_lines sol
      LEFT JOIN subcontract_operation_defs od
        ON od.operation_code = sol.operation_code
       AND (od.company_id IS NULL OR od.company_id = $2)
      WHERE sol.id=$1
      LIMIT 1
      `,
      [l.order_line_id, order.company_id],
    );
    if (ol.rows[0]?.op_qc != null) {
      opDefQc = Boolean(ol.rows[0].op_qc);
      break;
    }
  }
  const wantQc = resolveWantQc({ createQc, params, opDefQc });
  const blockUntilQc = params?.block_production_until_qc !== false;

  for (const l of lines) {
    if (!l.order_line_id) continue;
    const ol = await client.query(`SELECT * FROM subcontract_order_lines WHERE id=$1 FOR UPDATE`, [l.order_line_id]);
    const row = ol.rows[0];
    if (!row) throw new Error(`Sipariş satırı yok: ${l.order_line_id}`);
    const nextRecv = Number(row.received_qty || 0) + Number(l.received_qty || 0);
    const ordered = Number(row.ordered_qty || 0);
    const tol = params?.allow_over_receipt
      ? ordered * (1 + Number(params.over_receipt_tolerance_pct || 0) / 100)
      : ordered;
    if (nextRecv > tol + 1e-9) {
      throw Object.assign(
        new Error(`Fazla teslimat engellendi. sipariş=${ordered} gelen=${nextRecv}`),
        { status: 409, code: 'FAZLA_TESLIMAT' },
      );
    }
  }

  const {
    createQcOrder,
    resolveIncomingQcWarehouse,
  } = require('./kaliteService');

  // GKK zorunluysa mümkünse giriş kalite deposuna al; yoksa hedef depoda Kalitede beklet
  let receiptWarehouseId = toWarehouseId;
  if (wantQc) {
    const gkk = await resolveIncomingQcWarehouse(client, order.plant_id);
    if (gkk?.id) receiptWarehouseId = gkk.id;
  }

  // Stok-depo bağı zorunlu (otomatik oluşturma yok)
  const { assertItemWarehouseAllowed } = require('./stokHareketService');
  for (const wid of [...new Set([receiptWarehouseId, toWarehouseId].filter(Boolean))]) {
    for (const l of lines) {
      await assertItemWarehouseAllowed(client, l.item_id, wid);
    }
  }

  const hkId = await movementCodeId(client, 'FAS-TESLIM');
  const no = await nextDocumentNo(client, 'FASON_TESLIM');

  const mv = await createStockMovement(client, {
    hareketTipi: 'URETIM_GIRIS',
    isYeriId: order.plant_id,
    depoId: receiptWarehouseId,
    belgeTipi: 'FasonTeslimat',
    description: description || `Fason teslimat ${no}`,
    hareketKoduId: hkId,
    firmaId: order.company_id,
    cariId: order.partner_id,
    kullaniciKodu: userCode,
    satirlar: lines.map((l) => ({
      item_id: l.item_id,
      quantity: Number(l.received_qty),
      direction: 1,
      lot_id: l.lot_id || null,
      lot_no: l.lot_no || null,
      uom_code: l.uom_code || null,
      stock_status: wantQc ? 'Kalitede' : 'Kullanilabilir',
      uom_cost: l.unit_price != null ? Number(l.unit_price) : undefined,
    })),
  });

  const rec = await client.query(
    `
    INSERT INTO subcontract_receipts
      (company_id, receipt_no, partner_id, order_id, production_order_id,
       to_warehouse_id, stock_movement_id, qc_order_id, status, description, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
    `,
    [
      order.company_id, no, order.partner_id, order.id, order.production_order_id,
      toWarehouseId, mv.hareket.id, null,
      wantQc ? 'KaliteKontrolBekliyor' : 'TeslimAlindi',
      description || null, userCode || null,
    ],
  );

  let firstQcOrderId = null;
  const qcOrders = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const mvLine = mv.satirlar?.[i];
    const accepted = wantQc ? 0 : Number(l.received_qty);
    let lineQcId = null;

    if (wantQc) {
      const emir = await createQcOrder(client, {
        direction: 'GKK',
        stokId: l.item_id,
        partiId: mvLine?.lot_id || l.lot_id || null,
        depoId: receiptWarehouseId,
        hedefDepoId: toWarehouseId,
        quantity: Number(l.received_qty),
        kaynakTipi: 'FASON_TESLIMAT',
        kaynakId: rec.rows[0].id,
        stokHareketId: mv.hareket.id,
        description: `Fason teslimat ${no} — giriş kalite`,
        companyId: order.company_id,
      });
      lineQcId = emir.id;
      if (!firstQcOrderId) firstQcOrderId = emir.id;
      qcOrders.push(emir);
    }

    await client.query(
      `
      INSERT INTO subcontract_receipt_lines
        (receipt_id, order_line_id, production_order_operation_id, item_id, lot_id,
         received_qty, accepted_qty, rejected_qty, uom_code, unit_price, notes, qc_order_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `,
      [
        rec.rows[0].id, l.order_line_id || null, l.production_order_operation_id || null,
        l.item_id, mvLine?.lot_id || l.lot_id || null, Number(l.received_qty), accepted, 0,
        l.uom_code || null, l.unit_price != null ? Number(l.unit_price) : null, l.notes || null,
        lineQcId,
      ],
    );
    if (l.order_line_id) {
      await client.query(
        `
        UPDATE subcontract_order_lines SET
          received_qty = COALESCE(received_qty,0) + $2,
          accepted_qty = COALESCE(accepted_qty,0) + $3
        WHERE id=$1
        `,
        [l.order_line_id, Number(l.received_qty), accepted],
      );
      const ol = await client.query(`SELECT * FROM subcontract_order_lines WHERE id=$1`, [l.order_line_id]);
      const row = ol.rows[0];
      const opId = row?.production_order_operation_id || l.production_order_operation_id;
      if (opId) {
        await client.query(
          `
          UPDATE production_order_operations SET
            qty_received = COALESCE(qty_received,0) + $2,
            qty_accepted = COALESCE(qty_accepted,0) + $3
          WHERE id=$1
          `,
          [opId, Number(l.received_qty), accepted],
        );
        await syncOperationStatus(client, opId, { blockUntilQc });
      }
      const unitPrice = Number(l.unit_price != null ? l.unit_price : row?.unit_price || 0);
      await addCostEntry(client, {
        company_id: order.company_id,
        order_id: order.id,
        order_line_id: l.order_line_id,
        production_order_id: order.production_order_id,
        production_order_operation_id: opId,
        cost_type: wantQc ? 'Tahmini' : 'Gerceklesen',
        amount: unitPrice * Number(l.received_qty),
        quantity: Number(l.received_qty),
        unit_price: unitPrice,
        currency_code: order.currency_code,
        notes: wantQc ? 'Teslimat — GKK bekliyor' : 'Teslimat kabul',
      });
    }
  }

  if (firstQcOrderId) {
    await client.query(
      `UPDATE subcontract_receipts SET qc_order_id=$2 WHERE id=$1`,
      [rec.rows[0].id, firstQcOrderId],
    );
    rec.rows[0].qc_order_id = firstQcOrderId;
  }

  await refreshOrderLineTotals(client, order.id);
  await client.query(
    `
    UPDATE subcontract_orders SET status = CASE
      WHEN $2::boolean THEN 'KaliteKontrolBekliyor'
      WHEN (SELECT COALESCE(SUM(received_qty),0) FROM subcontract_order_lines WHERE order_id=$1)
         >= (SELECT COALESCE(SUM(ordered_qty),0) FROM subcontract_order_lines WHERE order_id=$1)
      THEN 'TeslimAlindi'
      ELSE 'KismiTeslim'
    END, updated_at=NOW()
    WHERE id=$1 AND status NOT IN ('Iptal','Tamamlandi')
    `,
    [order.id, wantQc],
  );

  return {
    receipt: rec.rows[0],
    movement: mv.hareket,
    qcOrderId: firstQcOrderId,
    qcOrders,
    wantQc,
  };
}

/** KK sonucu sonrası kabul/ret güncelle */
async function applyQcResult(client, {
  receiptLineId, acceptedQty, rejectedQty, userCode,
}) {
  const rl = await client.query(
    `
    SELECT rl.*, r.order_id, r.production_order_id, r.id AS receipt_id
    FROM subcontract_receipt_lines rl
    JOIN subcontract_receipts r ON r.id = rl.receipt_id
    WHERE rl.id=$1
    FOR UPDATE OF rl
    `,
    [receiptLineId],
  );
  if (!rl.rows[0]) throw Object.assign(new Error('Teslimat satırı yok.'), { status: 404 });
  const row = rl.rows[0];
  const acc = Number(acceptedQty || 0);
  const rej = Number(rejectedQty || 0);
  if (acc + rej > Number(row.received_qty) + 1e-9) {
    throw new Error('Kabul+ret, teslim miktarını aşamaz.');
  }
  const deltaAcc = acc - Number(row.accepted_qty || 0);
  const deltaRej = rej - Number(row.rejected_qty || 0);
  await client.query(
    `UPDATE subcontract_receipt_lines SET accepted_qty=$2, rejected_qty=$3 WHERE id=$1`,
    [receiptLineId, acc, rej],
  );
  if (row.order_line_id) {
    await client.query(
      `
      UPDATE subcontract_order_lines SET
        accepted_qty = COALESCE(accepted_qty,0) + $2,
        rejected_qty = COALESCE(rejected_qty,0) + $3
      WHERE id=$1
      `,
      [row.order_line_id, deltaAcc, deltaRej],
    );
  }
  if (row.production_order_operation_id) {
    await client.query(
      `
      UPDATE production_order_operations SET
        qty_accepted = COALESCE(qty_accepted,0) + $2,
        qty_rejected = COALESCE(qty_rejected,0) + $3
      WHERE id=$1
      `,
      [row.production_order_operation_id, deltaAcc, deltaRej],
    );
    await syncOperationStatus(client, row.production_order_operation_id);
  }
  if (deltaAcc > 0) {
    const ol = row.order_line_id
      ? (await client.query(`SELECT unit_price FROM subcontract_order_lines WHERE id=$1`, [row.order_line_id])).rows[0]
      : null;
    const companyId = (await client.query(
      `SELECT company_id FROM subcontract_orders WHERE id=$1`,
      [row.order_id],
    )).rows[0]?.company_id || null;
    await addCostEntry(client, {
      company_id: companyId,
      order_id: row.order_id,
      order_line_id: row.order_line_id,
      production_order_id: row.production_order_id,
      production_order_operation_id: row.production_order_operation_id,
      cost_type: 'Gerceklesen',
      amount: Number(ol?.unit_price || row.unit_price || 0) * deltaAcc,
      quantity: deltaAcc,
      unit_price: Number(ol?.unit_price || row.unit_price || 0),
      notes: `GKK kabul (${userCode || ''})`,
    });
  }

  // Teslimat başlık durumu
  const sums = await client.query(
    `
    SELECT
      COALESCE(SUM(received_qty),0)::numeric AS recv,
      COALESCE(SUM(accepted_qty),0)::numeric AS acc,
      COALESCE(SUM(rejected_qty),0)::numeric AS rej
    FROM subcontract_receipt_lines WHERE receipt_id=$1
    `,
    [row.receipt_id],
  );
  const s = sums.rows[0];
  let receiptStatus = 'KaliteKontrolBekliyor';
  if (Number(s.acc) + Number(s.rej) + 1e-9 >= Number(s.recv) && Number(s.recv) > 0) {
    receiptStatus = Number(s.rej) > 0 && Number(s.acc) > 0 ? 'KismiKabul'
      : Number(s.acc) <= 0 ? 'Red'
      : 'TeslimAlindi';
  }
  await client.query(
    `UPDATE subcontract_receipts SET status=$2 WHERE id=$1`,
    [row.receipt_id, receiptStatus],
  );

  // Sipariş: bekleyen GKK kalmadıysa teslim durumuna geç
  const pending = await client.query(
    `
    SELECT COUNT(*)::int AS n FROM subcontract_receipts
    WHERE order_id=$1 AND status='KaliteKontrolBekliyor'
    `,
    [row.order_id],
  );
  if (Number(pending.rows[0]?.n || 0) === 0) {
    await client.query(
      `
      UPDATE subcontract_orders SET status = CASE
        WHEN (SELECT COALESCE(SUM(accepted_qty),0) FROM subcontract_order_lines WHERE order_id=$1)
           >= (SELECT COALESCE(SUM(ordered_qty),0) FROM subcontract_order_lines WHERE order_id=$1)
        THEN 'TeslimAlindi'
        ELSE 'KismiTeslim'
      END, updated_at=NOW()
      WHERE id=$1 AND status NOT IN ('Iptal','Tamamlandi')
      `,
      [row.order_id],
    );
  }

  await refreshOrderLineTotals(client, row.order_id);
  return { ok: true, accepted_qty: acc, rejected_qty: rej, receipt_status: receiptStatus };
}

async function createOrderFromWorkOrder(client, {
  productionOrderId, partnerId, operationIds, companyId, userCode, orderMode = 'Operasyon',
}) {
  const wo = await client.query(`SELECT * FROM production_orders WHERE id=$1`, [productionOrderId]);
  if (!wo.rows[0]) throw Object.assign(new Error('Üretim emri yok.'), { status: 404 });
  const emir = wo.rows[0];
  let ops;
  if (Array.isArray(operationIds) && operationIds.length) {
    ops = await client.query(
      `SELECT * FROM production_order_operations WHERE order_id=$1 AND id = ANY($2::int[]) ORDER BY line_no`,
      [productionOrderId, operationIds],
    );
  } else {
    ops = await client.query(
      `SELECT * FROM production_order_operations WHERE order_id=$1 AND is_subcontract=TRUE ORDER BY line_no`,
      [productionOrderId],
    );
  }
  if (!ops.rows.length) throw new Error('Fason operasyon bulunamadı.');

  const partner = partnerId || ops.rows[0].subcontractor_partner_id || emir.subcontractor_partner_id;
  if (!partner) throw new Error('Fasoncu seçilmeli.');

  const no = await nextDocumentNo(client, 'FASON_SIPARIS');
  const baslik = await client.query(
    `
    INSERT INTO subcontract_orders
      (company_id, plant_id, order_no, partner_id, production_order_id, route_id,
       order_mode, status, currency_code, description, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'Acik',$8,$9,$10)
    RETURNING *
    `,
    [
      companyId || emir.company_id, emir.plant_id, no, partner, emir.id, emir.route_id,
      orderMode, 'TRY', `WO ${emir.order_no} fason`, userCode || null,
    ],
  );

  let lineNo = 10;
  for (const op of ops.rows) {
    const price = Number(op.estimated_unit_price || 0);
    const qty = Number(op.planned_quantity || emir.planned_quantity || 0);
    await client.query(
      `
      INSERT INTO subcontract_order_lines
        (order_id, line_no, production_order_id, production_order_operation_id,
         item_id, operation_code, operation_name, ordered_qty, unit_price, line_amount)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        baslik.rows[0].id, lineNo, emir.id, op.id,
        op.output_item_id || emir.item_id, op.operation_code, op.operation_name,
        qty, price, qty * price,
      ],
    );
    await client.query(
      `
      UPDATE production_order_operations SET
        is_subcontract=TRUE,
        subcontractor_partner_id=COALESCE(subcontractor_partner_id,$2),
        subcontract_status=$3
      WHERE id=$1
      `,
      [op.id, partner, OP_STATUS.SIPARIS_BEKLIYOR],
    );
    await addCostEntry(client, {
      company_id: emir.company_id,
      order_id: baslik.rows[0].id,
      production_order_id: emir.id,
      production_order_operation_id: op.id,
      cost_type: 'Tahmini',
      amount: qty * price,
      quantity: qty,
      unit_price: price,
      notes: 'Sipariş tahmini',
    });
    lineNo += 10;
  }

  await refreshOrderLineTotals(client, baslik.rows[0].id);
  await client.query(
    `UPDATE production_orders SET is_subcontract=TRUE, subcontractor_partner_id=COALESCE(subcontractor_partner_id,$2) WHERE id=$1`,
    [emir.id, partner],
  );

  return fetchOrder(client, baslik.rows[0].id);
}

async function fetchOrder(clientOrPool, id) {
  const t = await clientOrPool.query(
    `
    SELECT o.*, c.partner_code, c.partner_name, po.order_no AS production_order_no
    FROM subcontract_orders o
    JOIN partners c ON c.id = o.partner_id
    LEFT JOIN production_orders po ON po.id = o.production_order_id
    WHERE o.id=$1
    `,
    [id],
  );
  if (!t.rows[0]) return null;
  const lines = await clientOrPool.query(
    `
    SELECT ls.*, s.item_code, s.item_name,
      (COALESCE(ls.ordered_qty,0) - COALESCE(ls.received_qty,0)) AS remaining_qty,
      (COALESCE(ls.sent_qty,0) - COALESCE(ls.consumed_qty,0) - COALESCE(ls.scrap_qty,0) - COALESCE(ls.returned_qty,0)) AS emanet_qty
    FROM subcontract_order_lines ls
    LEFT JOIN items s ON s.id = ls.item_id
    WHERE ls.order_id=$1
    ORDER BY ls.line_no, ls.id
    `,
    [id],
  );
  const costs = await clientOrPool.query(
    `SELECT * FROM subcontract_cost_entries WHERE order_id=$1 ORDER BY id`,
    [id],
  );
  return { ...t.rows[0], satirlar: lines.rows, maliyetler: costs.rows };
}

async function emanetBalances(pool, { partnerId, companyId } = {}) {
  const params = [];
  const where = [`d.warehouse_role = 'FasonEmanet'`];
  if (partnerId) {
    params.push(partnerId);
    where.push(`d.partner_id = $${params.length}`);
  }
  if (companyId) {
    params.push(companyId);
    where.push(`(st.company_id = $${params.length} OR h.company_id = $${params.length})`);
  }
  const res = await pool.query(
    `
    SELECT
      d.partner_id,
      p.partner_code,
      p.partner_name,
      h.warehouse_id,
      d.warehouse_code,
      d.warehouse_name,
      s.item_id,
      st.item_code,
      st.item_name,
      COALESCE(SUM(s.quantity * s.direction),0)::numeric AS bakiye
    FROM stock_movement_lines s
    JOIN stock_movements h ON h.id = s.movement_id
    JOIN warehouses d ON d.id = h.warehouse_id
    JOIN items st ON st.id = s.item_id
    LEFT JOIN partners p ON p.id = d.partner_id
    WHERE ${where.join(' AND ')}
    GROUP BY d.partner_id, p.partner_code, p.partner_name, h.warehouse_id, d.warehouse_code, d.warehouse_name, s.item_id, st.item_code, st.item_name
    HAVING COALESCE(SUM(s.quantity * s.direction),0) <> 0
    ORDER BY p.partner_code, st.item_code
    `,
    params,
  );
  return res.rows;
}

module.exports = {
  OP_STATUS,
  getParams,
  ensureEmanetWarehouse,
  shipMaterials,
  reportConsumption,
  returnMaterials,
  receiveProduct,
  applyQcResult,
  createOrderFromWorkOrder,
  fetchOrder,
  refreshOrderLineTotals,
  emanetBalances,
  addCostEntry,
};
