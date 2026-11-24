/**
 * Metal Marvel — stok, cari, BOM, rota, fiyat
 */
const { nextSequenceCode, itemTypeFromSeriesCode, partnerTypeFromSeriesCode } = require('../../src/utils/kodUretici');
const { TAG, log } = require('./marvel-common');

async function createPartner(client, { name, type, companyId, plantId, tag }) {
  const kod = await nextSequenceCode(client, partnerTypeFromSeriesCode(type));
  const existing = (await client.query(
    `SELECT * FROM partners WHERE partner_code=$1 AND company_id=$2`,
    [kod, companyId],
  )).rows[0];
  if (existing) return existing;
  return (await client.query(
    `INSERT INTO partners (
       partner_code, partner_name, partner_type, phone, email, province, country, currency_code,
       payment_due_days, is_active, company_id, plant_id, notes,
       billing_address, address, authorized_person
     ) VALUES ($1,$2,$3,'02125550200',$4,'Kocaeli','Türkiye','TRY',30,TRUE,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      kod, name, type, `${kod.toLowerCase()}@metalmarvel.demo`, companyId, plantId, tag,
      `${name} Fatura Adresi`, `${name} Sevk Adresi Gebze`, 'Yetkili',
    ],
  )).rows[0];
}

async function createItem(client, {
  name, type, uom, price, companyId, plantId, girisWh, cikisWh, tag, qc = false, itemCode = null,
}) {
  const kod = itemCode || await nextSequenceCode(client, itemTypeFromSeriesCode(type));
  const existing = (await client.query(
    `SELECT * FROM items WHERE item_code=$1 AND company_id=$2`,
    [kod, companyId],
  )).rows[0];
  if (existing) return existing;
  const tedarik = type === 'Mamul' || type === 'YariMamul' ? 'Uretim' : 'Satinalma';
  const ins = (await client.query(
    `INSERT INTO items (
       item_code, item_name, uom_code, sales_price, purchase_price, item_type, procurement_type,
       is_active, company_id, default_receipt_warehouse_id, default_issue_warehouse_id,
       quality_control_required, description, lead_time_days, safety_stock, lot_policy
     ) VALUES ($1,$2,$3,$4,$4,$5,$6,TRUE,$7,$8,$9,$10,$11,3,50,
       CASE WHEN $5 IN ('Mamul','Hammadde') THEN 'IstegeBagli' ELSE 'Takipsiz' END)
     RETURNING *`,
    [kod, name, uom, price || 0, type, tedarik, companyId, girisWh, cikisWh, qc, `[${tag}] ${name}`],
  )).rows[0];
  await client.query(
    `INSERT INTO item_plants (item_id, plant_id, is_active) VALUES ($1,$2,TRUE)
     ON CONFLICT (item_id, plant_id) DO UPDATE SET is_active=TRUE`,
    [ins.id, plantId],
  );
  for (const wid of [girisWh, cikisWh].filter(Boolean)) {
    await client.query(
      `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
       SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
         SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2)`,
      [ins.id, wid, plantId],
    ).catch(() => null);
  }
  return ins;
}

async function seedMasterData(client, ctx) {
  const { firma, plant, wh, wc, tag = TAG.W1 } = ctx;
  const partners = {
    tedAlloy: await createPartner(client, {
      name: 'Anadolu Alaşım Tedarik A.Ş.', type: 'Tedarikci', companyId: firma.id, plantId: plant.id, tag,
    }),
    tedResin: await createPartner(client, {
      name: 'Epoksi & Reçine Kimya Ltd.', type: 'Tedarikci', companyId: firma.id, plantId: plant.id, tag,
    }),
    tedPack: await createPartner(client, {
      name: 'Hero Paketleme Sanayi', type: 'Tedarikci', companyId: firma.id, plantId: plant.id, tag,
    }),
    mus1: await createPartner(client, {
      name: 'Kaplan Koleksiyon Dünyası', type: 'Musteri', companyId: firma.id, plantId: plant.id, tag,
    }),
    mus2: await createPartner(client, {
      name: 'GeekZone Figür Mağazaları', type: 'Musteri', companyId: firma.id, plantId: plant.id, tag,
    }),
  };

  const items = {};
  const hmSpecs = [
    ['MM-ZN-AL', 'Zn-Al Döküm Alaşımı', 'KG', 180],
    ['MM-AL-6061', 'Alüminyum 6061 CNC Çubuk', 'KG', 95],
    ['MM-EPOXY', 'Figür Epoksi Reçine', 'KG', 120],
    ['MM-PAK-KUTU', 'Limited Edition Kutu & EVA', 'AD', 85],
    ['MM-BOYA', 'Metalik Boya Seti', 'LT', 220],
  ];
  for (const [code, name, uom, price] of hmSpecs) {
    items[code] = await createItem(client, {
      itemCode: code, name, type: 'Hammadde', uom, price, companyId: firma.id, plantId: plant.id,
      girisWh: wh.hmd.id, cikisWh: wh.hmd.id, tag, qc: code.startsWith('MM-ZN') || code.startsWith('MM-AL'),
    });
  }

  const castFgs = [
    ['MM-MAM-IRONMAN', 'Döküm Iron Man Figürü 1/6', 4200],
    ['MM-MAM-THOR', 'Döküm Thor Çekiç Figürü', 3900],
    ['MM-MAM-HULK', 'Döküm Hulk Smash Figürü', 4500],
  ];
  const cncFgs = [
    ['MM-MAM-SPIDER', 'CNC Spider-Man Figürü 1/6', 5200],
    ['MM-MAM-PANTHER', 'CNC Black Panther Figürü', 5100],
    ['MM-MAM-CAP', 'CNC Captain America Figürü', 4800],
  ];
  const semi = ['MM-YM-DOK-GOVDE', 'Döküm Gövde Yarı Mamul', 650];
  const semiCnc = ['MM-YM-CNC-GOVDE', 'CNC İşlenmiş Gövde YM', 780];

  for (const [code, name, price] of castFgs) {
    items[code] = await createItem(client, {
      itemCode: code, name, type: 'Mamul', uom: 'AD', price, companyId: firma.id, plantId: plant.id,
      girisWh: wh.mam.id, cikisWh: wh.mam.id, tag, qc: true,
    });
  }
  for (const [code, name, price] of cncFgs) {
    items[code] = await createItem(client, {
      itemCode: code, name, type: 'Mamul', uom: 'AD', price, companyId: firma.id, plantId: plant.id,
      girisWh: wh.mam.id, cikisWh: wh.mam.id, tag, qc: true,
    });
  }
  items[semi[0]] = await createItem(client, {
    itemCode: semi[0], name: semi[1], type: 'YariMamul', uom: 'AD', price: semi[2],
    companyId: firma.id, plantId: plant.id, girisWh: wh.dok_wip.id, cikisWh: wh.dok_wip.id, tag,
  });
  items[semiCnc[0]] = await createItem(client, {
    itemCode: semiCnc[0], name: semiCnc[1], type: 'YariMamul', uom: 'AD', price: semiCnc[2],
    companyId: firma.id, plantId: plant.id, girisWh: wh.cnc_wip.id, cikisWh: wh.cnc_wip.id, tag,
  });

  const fgCast = items['MM-MAM-IRONMAN'];
  const fgCnc = items['MM-MAM-SPIDER'];

  const bomCastCode = await nextSequenceCode(client, 'URUN_AGACI').catch(() => `UA-MMC-${Date.now()}`);
  const bomCast = (await client.query(
    `INSERT INTO boms (
       finished_good_item_id, bom_code, bom_name, quantity, uom_code,
       company_id, plant_id, alternative_no, bom_type, design_department, bom_status, is_active,
       is_default_for_wo, fg_warehouse_id, notes
     ) VALUES ($1,$2,$3,1,'AD',$4,$5,'00','Uretim','UretimDokum','Onayli',TRUE,TRUE,$6,$7)
     RETURNING *`,
    [fgCast.id, bomCastCode, 'Iron Man Döküm BOM', firma.id, plant.id, wh.mam.id, tag],
  )).rows[0];

  const castLines = [
    [items['MM-ZN-AL'].id, 1.8, 'KG'],
    [items['MM-EPOXY'].id, 0.25, 'KG'],
    [items['MM-BOYA'].id, 0.1, 'LT'],
    [items['MM-PAK-KUTU'].id, 1, 'AD'],
  ];
  let ln = 10;
  for (const [itemId, qty, uom] of castLines) {
    await client.query(
      `INSERT INTO bom_lines (
         product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity,
         scrap_pct, qty_entry_type, warehouse_id, line_type, goes_to_wo
       ) VALUES ($1,$2,$3,$4,$5,$4,$4,2,'Net',$6,'Malzeme',TRUE)`,
      [bomCast.id, ln, itemId, qty, uom, wh.hmd.id],
    );
    ln += 10;
  }

  const bomCncCode = await nextSequenceCode(client, 'URUN_AGACI').catch(() => `UA-MMN-${Date.now()}`);
  const bomCnc = (await client.query(
    `INSERT INTO boms (
       finished_good_item_id, bom_code, bom_name, quantity, uom_code,
       company_id, plant_id, alternative_no, bom_type, design_department, bom_status, is_active,
       is_default_for_wo, fg_warehouse_id, notes
     ) VALUES ($1,$2,$3,1,'AD',$4,$5,'00','Uretim','UretimCnc','Onayli',TRUE,TRUE,$6,$7)
     RETURNING *`,
    [fgCnc.id, bomCncCode, 'Spider-Man CNC BOM', firma.id, plant.id, wh.mam.id, tag],
  )).rows[0];

  const cncLines = [
    [items['MM-AL-6061'].id, 0.45, 'KG'],
    [items[semiCnc[0]].id, 1, 'AD'],
    [items['MM-BOYA'].id, 0.08, 'LT'],
    [items['MM-PAK-KUTU'].id, 1, 'AD'],
  ];
  ln = 10;
  for (const [itemId, qty, uom] of cncLines) {
    await client.query(
      `INSERT INTO bom_lines (
         product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity,
         scrap_pct, qty_entry_type, warehouse_id, line_type, goes_to_wo
       ) VALUES ($1,$2,$3,$4,$5,$4,$4,1,'Net',$6,'Malzeme',TRUE)`,
      [bomCnc.id, ln, itemId, qty, uom, wh.hmd.id],
    );
    ln += 10;
  }

  const routeCastCode = await nextSequenceCode(client, 'ROTA');
  const rotaCast = (await client.query(
    `INSERT INTO routings (
       item_id, product_bom_id, route_code, route_name, template, is_default,
       company_id, plant_id, route_type, alternative_no, is_active, notes
     ) VALUES ($1,$2,$3,$4,FALSE,TRUE,$5,$6,'Uretim','00',TRUE,$7) RETURNING *`,
    [fgCast.id, bomCast.id, routeCastCode, 'Iron Man Döküm Rotası', firma.id, plant.id, tag],
  )).rows[0];

  const castOps = [
    { ln: 10, code: 'D10', name: 'Kalıp & Döküm', wc: wc.dokum.id, min: 45, next: 20, out: items[semi[0]].id },
    { ln: 20, code: 'D20', name: 'Tesviye & Boyama', wc: wc.boyama.id, min: 30, next: 30, out: null },
    { ln: 30, code: 'D30', name: 'Kalite & Paket', wc: wc.boyama.id, min: 15, next: null, out: fgCast.id },
  ];
  const opMap = {};
  for (const op of castOps) {
    const ins = await client.query(
      `INSERT INTO routing_operations (
         route_id, line_no, operation_code, operation_name, work_center_id,
         duration_minutes, op_time, op_time_uom, next_line_no, output_item_id, require_qc
       ) VALUES ($1,$2,$3,$4,$5,$6,$6,'dk',$7,$8,TRUE) RETURNING id`,
      [rotaCast.id, op.ln, op.code, op.name, op.wc, op.min, op.next, op.out],
    );
    opMap[op.code] = ins.rows[0].id;
  }
  await client.query(
    `INSERT INTO routing_operation_components (operation_id, item_id, quantity, uom_code) VALUES
     ($1,$2,1.8,'KG'), ($1,$3,0.25,'KG')`,
    [opMap.D10, items['MM-ZN-AL'].id, items['MM-EPOXY'].id],
  );

  const routeCncCode = await nextSequenceCode(client, 'ROTA');
  const rotaCnc = (await client.query(
    `INSERT INTO routings (
       item_id, product_bom_id, route_code, route_name, template, is_default,
       company_id, plant_id, route_type, alternative_no, is_active, notes
     ) VALUES ($1,$2,$3,$4,FALSE,TRUE,$5,$6,'Uretim','00',TRUE,$7) RETURNING *`,
    [fgCnc.id, bomCnc.id, routeCncCode, 'Spider-Man CNC Rotası', firma.id, plant.id, tag],
  )).rows[0];

  const cncOps = [
    { ln: 10, code: 'C10', name: 'CNC Freze', wc: wc.cnc.id, min: 55, next: 20, out: items[semiCnc[0]].id },
    { ln: 20, code: 'C20', name: 'Montaj & Boyama', wc: wc.boyama.id, min: 25, next: null, out: fgCnc.id },
  ];
  for (const op of cncOps) {
    await client.query(
      `INSERT INTO routing_operations (
         route_id, line_no, operation_code, operation_name, work_center_id,
         duration_minutes, op_time, op_time_uom, next_line_no, output_item_id, require_qc
       ) VALUES ($1,$2,$3,$4,$5,$6,$6,'dk',$7,$8,TRUE) RETURNING id`,
      [rotaCnc.id, op.ln, op.code, op.name, op.wc, op.min, op.next, op.out],
    );
  }

  const listCode = `MARVEL-SAT-${firma.id}`;
  const pl = (await client.query(
    `INSERT INTO price_lists (list_code, list_name, currency_code, start_date, is_active, company_id)
     VALUES ($1,'MARVEL Satış Fiyat Listesi','TRY',$2,TRUE,$3)
     ON CONFLICT DO NOTHING RETURNING *`,
    [listCode, '2026-11-01', firma.id],
  )).rows[0] || (await client.query(`SELECT * FROM price_lists WHERE list_code=$1`, [listCode])).rows[0];

  if (pl) {
    for (const it of Object.values(items)) {
      if (it.item_type === 'Mamul') {
        await client.query(
          `INSERT INTO price_list_lines (list_id, item_id, unit_price)
           SELECT $1,$2,COALESCE($3,0) WHERE NOT EXISTS (
             SELECT 1 FROM price_list_lines WHERE list_id=$1 AND item_id=$2)`,
          [pl.id, it.id, it.sales_price],
        );
      }
    }
  }

  log(`Master data: ${Object.keys(items).length} stok, ${Object.keys(partners).length} cari, 2 BOM, 2 rota`);
  return {
    partners,
    items,
    fgCast,
    fgCnc,
    bomCast,
    bomCnc,
    rotaCast,
    rotaCnc,
    priceList: pl,
  };
}

module.exports = { seedMasterData, createItem, createPartner };