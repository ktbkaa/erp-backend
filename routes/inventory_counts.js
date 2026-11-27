const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextDocumentNo } = require('../src/utils/belgeNo');
const { createStockMovement, listWarehouseBalances } = require('../src/services/stokHareketService');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { trimOrNull } = require('../src/utils/tanimCrud');

async function getDocument(id) {
  const b = await pool.query(
    `SELECT sb.*, d.warehouse_code, d.warehouse_name
     FROM inventory_counts sb
     JOIN warehouses d ON d.id = sb.warehouse_id
     WHERE sb.id = $1`,
    [id]
  );
  if (!b.rows[0]) return null;
  const satirlar = await pool.query(
    `SELECT ss.*, s.item_code, s.item_name, s.uom_code AS stock_uom
     FROM inventory_count_lines ss
     JOIN items s ON s.id = ss.item_id
     WHERE ss.document_id = $1 ORDER BY ss.id`,
    [id]
  );
  return { ...b.rows[0], satirlar: satirlar.rows };
}

function assertCompany(row, req) {
  const firmaId = companyIdFromReq(req);
  if (firmaId && row.company_id != null && Number(row.company_id) !== Number(firmaId)) return false;
  return true;
}

async function systemBalance(clientOrPool, depoId, stokId) {
  const bakiyeler = await listWarehouseBalances(clientOrPool, {
    depoId,
    stokId,
    stokStatu: 'Kullanilabilir',
  });
  return bakiyeler.reduce((sum, b) => sum + Number(b.bakiye || 0), 0);
}

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    const where = ['1=1'];
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`sb.company_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`sb.status = $${params.length}`);
    }
    if (req.query.warehouse_id) {
      params.push(Number(req.query.warehouse_id));
      where.push(`sb.warehouse_id = $${params.length}`);
    }
    const liste = await pool.query(
      `SELECT sb.id FROM inventory_counts sb
       WHERE ${where.join(' AND ')} ORDER BY sb.id DESC LIMIT 200`,
      params
    );
    const out = [];
    for (const r of liste.rows) out.push(await getDocument(r.id));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const belge = await getDocument(req.params.id);
    if (!belge || !assertCompany(belge, req)) {
      return res.status(404).json({ hata: 'Sayım belgesi bulunamadı.' });
    }
    res.json(belge);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const depoId = Number(req.body.warehouse_id);
    const satirlar = req.body.satirlar || [];
    if (!depoId) return res.status(400).json({ hata: 'warehouse_id zorunlu.' });
    if (!Array.isArray(satirlar) || !satirlar.length) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const no = await nextDocumentNo(client, 'SAYIM_BELGE');
      const firmaId = companyIdFromReq(req) || Number(req.body.company_id) || null;
      const ins = await client.query(
        `INSERT INTO inventory_counts
            (document_no, company_id, plant_id, warehouse_id, count_date, description, created_by, status)
         VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),$6,$7,'Taslak')
         RETURNING id`,
        [
          no, firmaId, req.body.plant_id || null, depoId,
          req.body.count_date || null,
          trimOrNull(req.body.description),
          req.headers['x-kullanici-kodu'] || req.body.created_by || null,
        ]
      );
      const belgeId = ins.rows[0].id;
      for (const s of satirlar) {
        if (!s.item_id) throw new Error('Satırda item_id zorunlu.');
        const stok = await client.query('SELECT uom_code FROM items WHERE id=$1', [s.item_id]);
        if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.item_id}`);
        let sistem = s.system_quantity;
        if (sistem == null || sistem === '') {
          sistem = await systemBalance(client, depoId, s.item_id);
        }
        const sayilan = s.counted_quantity != null ? Number(s.counted_quantity) : Number(sistem);
        await client.query(
          `INSERT INTO inventory_count_lines
              (document_id, item_id, system_quantity, counted_quantity, uom_code, lot_id, bin_code, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            belgeId, s.item_id, Number(sistem), sayilan,
            s.uom_code || stok.rows[0].uom_code, s.lot_id || null,
            trimOrNull(s.bin_code), trimOrNull(s.description),
          ]
        );
      }
      return belgeId;
    });
    res.status(201).json(await getDocument(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const mevcut = await getDocument(req.params.id);
    if (!mevcut || !assertCompany(mevcut, req)) {
      return res.status(404).json({ hata: 'Sayım belgesi bulunamadı.' });
    }
    if (mevcut.status !== 'Taslak') {
      return res.status(400).json({ hata: 'Yalnız Taslak belge düzenlenebilir.' });
    }
    await withTransaction(pool, async (client) => {
      await client.query(
        `UPDATE inventory_counts SET
            description = COALESCE($2, description),
            count_date = COALESCE($3::date, count_date),
            plant_id = COALESCE($4, plant_id)
         WHERE id=$1`,
        [
          req.params.id,
          trimOrNull(req.body.description),
          req.body.count_date || null,
          req.body.plant_id || null,
        ]
      );
      if (Array.isArray(req.body.satirlar)) {
        await client.query('DELETE FROM inventory_count_lines WHERE document_id=$1', [req.params.id]);
        for (const s of req.body.satirlar) {
          if (!s.item_id) throw new Error('Satırda item_id zorunlu.');
          let sistem = s.system_quantity;
          if (sistem == null || sistem === '') {
            sistem = await systemBalance(client, mevcut.warehouse_id, s.item_id);
          }
          const sayilan = s.counted_quantity != null ? Number(s.counted_quantity) : Number(sistem);
          await client.query(
            `INSERT INTO inventory_count_lines
                (document_id, item_id, system_quantity, counted_quantity, uom_code, lot_id, bin_code, description)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              req.params.id, s.item_id, Number(sistem), sayilan,
              s.uom_code || null, s.lot_id || null,
              trimOrNull(s.bin_code), trimOrNull(s.description),
            ]
          );
        }
      }
    });
    res.json(await getDocument(req.params.id));
  } catch (err) {
    next(err);
  }
});

/** Onayla → fark kadar SAYIM hareketi (giriş veya çıkış) */
router.post('/:id/onayla', async (req, res, next) => {
  try {
    const result = await withTransaction(pool, async (client) => {
      const lock = await client.query(
        `SELECT * FROM inventory_counts WHERE id=$1 FOR UPDATE`,
        [req.params.id]
      );
      const belge = lock.rows[0];
      if (!belge) {
        throw Object.assign(new Error('Sayım belgesi bulunamadı.'), { status: 404 });
      }
      if (belge.status !== 'Taslak') {
        throw Object.assign(new Error(`Durum ${belge.status}; yalnız Taslak onaylanır.`), { status: 400 });
      }
      const sat = await client.query(
        `SELECT * FROM inventory_count_lines WHERE document_id=$1`,
        [belge.id]
      );
      const farkSatirlar = [];
      for (const s of sat.rows) {
        const fark = Number(s.counted_quantity) - Number(s.system_quantity);
        if (Math.abs(fark) < 0.0000001) continue;
        farkSatirlar.push({
          item_id: s.item_id,
          quantity: Math.abs(fark),
          uom_code: s.uom_code,
          lot_id: s.lot_id,
          bin_code: s.bin_code,
          direction: fark > 0 ? 1 : -1,
        });
      }
      let hareketId = null;
      if (farkSatirlar.length) {
        const hareket = await createStockMovement(client, {
          hareketTipi: 'SAYIM',
          isYeriId: belge.plant_id,
          depoId: belge.warehouse_id,
          belgeTipi: 'SAYIM_BELGE',
          belgeId: belge.id,
          description: `Sayım ${belge.document_no}`,
          satirlar: farkSatirlar,
          depoZorunluAtla: true,
        });
        hareketId = hareket.hareket.id;
      }
      const approved_by = req.headers['x-kullanici-kodu'] || req.body.approved_by || null;
      await client.query(
        `UPDATE inventory_counts SET
            status='Onayli',
            approved_at=CURRENT_TIMESTAMP,
            approved_by=$2,
            movement_id=$3
         WHERE id=$1`,
        [belge.id, approved_by, hareketId]
      );
      return belge.id;
    });
    res.json(await getDocument(result));
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
    const mevcut = await getDocument(req.params.id);
    if (!mevcut || !assertCompany(mevcut, req)) {
      return res.status(404).json({ hata: 'Sayım belgesi bulunamadı.' });
    }
    if (mevcut.status !== 'Taslak') {
      return res.status(400).json({ hata: 'Yalnız Taslak belge iptal edilebilir.' });
    }
    await pool.query(`UPDATE inventory_counts SET status='Iptal' WHERE id=$1`, [req.params.id]);
    res.json(await getDocument(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const mevcut = await getDocument(req.params.id);
    if (!mevcut || !assertCompany(mevcut, req)) {
      return res.status(404).json({ hata: 'Sayım belgesi bulunamadı.' });
    }
    if (mevcut.status === 'Onayli') {
      return res.status(400).json({ hata: 'Onaylı sayım silinemez.' });
    }
    await pool.query('DELETE FROM inventory_counts WHERE id=$1', [req.params.id]);
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
