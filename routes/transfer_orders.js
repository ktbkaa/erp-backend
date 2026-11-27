const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { trimOrNull } = require('../src/utils/tanimCrud');

async function emirGetir(id) {
  const e = await pool.query(
    `SELECT te.*,
            kd.warehouse_code AS kaynak_depo_kodu, kd.warehouse_name AS kaynak_depo_adi,
            hd.warehouse_code AS hedef_depo_kodu, hd.warehouse_name AS hedef_depo_adi
     FROM transfer_orders te
     JOIN warehouses kd ON kd.id = te.source_warehouse_id
     JOIN warehouses hd ON hd.id = te.target_warehouse_id
     WHERE te.id = $1`,
    [id]
  );
  if (!e.rows[0]) return null;
  const satirlar = await pool.query(
    `SELECT ts.*, s.item_code, s.item_name, s.uom_code AS stock_uom
     FROM transfer_order_lines ts
     JOIN items s ON s.id = ts.item_id
     WHERE ts.order_id = $1 ORDER BY ts.id`,
    [id]
  );
  return { ...e.rows[0], satirlar: satirlar.rows };
}

function assertFirma(row, req) {
  const firmaId = firmaIdFromReq(req);
  if (firmaId && row.company_id != null && Number(row.company_id) !== Number(firmaId)) {
    return false;
  }
  return true;
}

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    const where = ['1=1'];
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`te.company_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`te.status = $${params.length}`);
    }
    const liste = await pool.query(
      `SELECT te.id FROM transfer_orders te
       WHERE ${where.join(' AND ')} ORDER BY te.id DESC LIMIT 200`,
      params
    );
    const out = [];
    for (const r of liste.rows) out.push(await emirGetir(r.id));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const emir = await emirGetir(req.params.id);
    if (!emir || !assertFirma(emir, req)) {
      return res.status(404).json({ hata: 'Transfer emri bulunamadı.' });
    }
    res.json(emir);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const source = Number(req.body.source_warehouse_id);
    const hedef = Number(req.body.target_warehouse_id);
    const satirlar = req.body.satirlar || [];
    if (!source || !hedef) return res.status(400).json({ hata: 'source_warehouse_id ve target_warehouse_id zorunlu.' });
    if (source === hedef) return res.status(400).json({ hata: 'Kaynak ve hedef depo aynı olamaz.' });
    if (!Array.isArray(satirlar) || !satirlar.length) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'TRANSFER_EMRI');
      const firmaId = firmaIdFromReq(req) || Number(req.body.company_id) || null;
      const ins = await client.query(
        `INSERT INTO transfer_orders
            (order_no, company_id, plant_id, source_warehouse_id, target_warehouse_id,
             requisition_date, planlanan_date, description, created_by, status)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7,$8,$9,'Taslak')
         RETURNING id`,
        [
          no, firmaId, req.body.plant_id || null, source, hedef,
          req.body.requisition_date || null, req.body.planlanan_date || null,
          trimOrNull(req.body.description),
          req.headers['x-kullanici-kodu'] || req.body.created_by || null,
        ]
      );
      const emirId = ins.rows[0].id;
      for (const s of satirlar) {
        if (!s.item_id || !s.quantity) throw new Error('Satırda item_id ve quantity zorunlu.');
        const stok = await client.query('SELECT uom_code FROM items WHERE id=$1', [s.item_id]);
        if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.item_id}`);
        await client.query(
          `INSERT INTO transfer_order_lines
              (order_id, item_id, quantity, uom_code, lot_id, raf_code, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            emirId, s.item_id, Number(s.quantity),
            s.uom_code || stok.rows[0].uom_code, s.lot_id || null,
            trimOrNull(s.raf_code), trimOrNull(s.description),
          ]
        );
      }
      return emirId;
    });
    res.status(201).json(await emirGetir(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const mevcut = await emirGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Transfer emri bulunamadı.' });
    }
    if (mevcut.status !== 'Taslak') {
      return res.status(400).json({ hata: 'Yalnız Taslak emir düzenlenebilir.' });
    }
    await withTransaction(pool, async (client) => {
      await client.query(
        `UPDATE transfer_orders SET
            source_warehouse_id = COALESCE($2, source_warehouse_id),
            target_warehouse_id = COALESCE($3, target_warehouse_id),
            plant_id = COALESCE($4, plant_id),
            planlanan_date = COALESCE($5::date, planlanan_date),
            description = COALESCE($6, description)
         WHERE id=$1`,
        [
          req.params.id,
          req.body.source_warehouse_id || null,
          req.body.target_warehouse_id || null,
          req.body.plant_id || null,
          req.body.planlanan_date || null,
          trimOrNull(req.body.description),
        ]
      );
      if (Array.isArray(req.body.satirlar)) {
        await client.query('DELETE FROM transfer_order_lines WHERE order_id=$1', [req.params.id]);
        for (const s of req.body.satirlar) {
          if (!s.item_id || !s.quantity) throw new Error('Satırda item_id ve quantity zorunlu.');
          await client.query(
            `INSERT INTO transfer_order_lines
                (order_id, item_id, quantity, uom_code, lot_id, raf_code, description)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              req.params.id, s.item_id, Number(s.quantity), s.uom_code || null,
              s.lot_id || null, trimOrNull(s.raf_code), trimOrNull(s.description),
            ]
          );
        }
      }
    });
    res.json(await emirGetir(req.params.id));
  } catch (err) {
    next(err);
  }
});

/** Onayla → source depodan çıkış + hedef depoya giriş */
router.post('/:id/onayla', async (req, res, next) => {
  try {
    const result = await withTransaction(pool, async (client) => {
      const lock = await client.query(
        `SELECT * FROM transfer_orders WHERE id=$1 FOR UPDATE`,
        [req.params.id]
      );
      const emir = lock.rows[0];
      if (!emir) {
        const e = new Error('Transfer emri bulunamadı.');
        e.status = 404;
        throw e;
      }
      if (emir.status !== 'Taslak') {
        throw Object.assign(new Error(`Durum ${emir.status}; yalnız Taslak onaylanır.`), { status: 400 });
      }
      const sat = await client.query(
        `SELECT * FROM transfer_order_lines WHERE order_id=$1`,
        [emir.id]
      );
      if (!sat.rows.length) throw new Error('Emirde satır yok.');

      const satirHazir = sat.rows.map((s) => ({
        item_id: s.item_id,
        quantity: Number(s.quantity),
        uom_code: s.uom_code,
        lot_id: s.lot_id,
        raf_code: s.raf_code,
      }));

      // Emir onayında item_warehouses master zorunluluğu kalkar; yetersiz stok yine engellenir
      const cikis = await stokHareketOlustur(client, {
        hareketTipi: 'TRANSFER',
        isYeriId: emir.plant_id,
        depoId: emir.source_warehouse_id,
        hedefDepoId: emir.target_warehouse_id,
        belgeTipi: 'TRANSFER_EMRI',
        belgeId: emir.id,
        description: `Transfer emri ${emir.order_no}`,
        satirlar: satirHazir.map((s) => ({ ...s, direction: -1 })),
        depoZorunluAtla: true,
      });
      const giris = await stokHareketOlustur(client, {
        hareketTipi: 'TRANSFER',
        isYeriId: emir.plant_id,
        depoId: emir.target_warehouse_id,
        belgeTipi: 'TRANSFER_EMRI',
        belgeId: emir.id,
        bagliHareketId: cikis.hareket.id,
        description: `Transfer emri ${emir.order_no} (giriş)`,
        satirlar: satirHazir.map((s) => ({ ...s, direction: 1 })),
        depoZorunluAtla: true,
      });
      await client.query(
        `UPDATE stock_movements SET bagli_movement_id=$2, target_warehouse_id=$3 WHERE id=$1`,
        [cikis.hareket.id, giris.hareket.id, emir.target_warehouse_id]
      );

      const approved_by = req.headers['x-kullanici-kodu'] || req.body.approved_by || null;
      await client.query(
        `UPDATE transfer_orders SET
            status='Tamamlandi',
            onay_date=CURRENT_TIMESTAMP,
            approved_by=$2,
            source_movement_id=$3,
            target_movement_id=$4
         WHERE id=$1`,
        [emir.id, approved_by, cikis.hareket.id, giris.hareket.id]
      );
      return emir.id;
    });
    res.json(await emirGetir(result));
  } catch (err) {
    const status = err.status || (err.code === 'YETERSIZ_STOK' ? 400 : 500);
    res.status(status).json({
      hata: err.message,
      kod: err.code || undefined,
      detay: err.detay || undefined,
    });
  }
});

router.post('/:id/iptal', async (req, res, next) => {
  try {
    const mevcut = await emirGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Transfer emri bulunamadı.' });
    }
    if (mevcut.status !== 'Taslak') {
      return res.status(400).json({ hata: 'Yalnız Taslak emir iptal edilebilir.' });
    }
    await pool.query(`UPDATE transfer_orders SET status='Iptal' WHERE id=$1`, [req.params.id]);
    res.json(await emirGetir(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const mevcut = await emirGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Transfer emri bulunamadı.' });
    }
    if (mevcut.status !== 'Taslak' && mevcut.status !== 'Iptal') {
      return res.status(400).json({ hata: 'Tamamlanmış emir silinemez.' });
    }
    await pool.query('DELETE FROM transfer_orders WHERE id=$1', [req.params.id]);
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
