const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { kullaniciGetir, reqKullaniciKodu } = require('../src/utils/yetki');

function gunFarki(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.floor((b - a) / (24 * 3600 * 1000)) + 1;
}

router.get('/turler', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT * FROM hr_leave_types
       WHERE is_active=TRUE AND (company_id IS NULL OR company_id=$1)
       ORDER BY leave_code`,
      [firmaId || 0],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/talepler', async (req, res) => {
  try {
    const params = [];
    const where = [];
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`r.company_id=$${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`r.status=$${params.length}`);
    }
    if (req.query.employee_id) {
      params.push(req.query.employee_id);
      where.push(`r.employee_id=$${params.length}`);
    }
    const sql = `
      SELECT r.*, e.employee_no, e.first_name, e.last_name, t.leave_code, t.leave_name
      FROM hr_leave_requests r
      JOIN hr_employees e ON e.id = r.employee_id
      JOIN hr_leave_types t ON t.id = r.leave_type_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.id DESC LIMIT 500
    `;
    const rows = await pool.query(sql, params);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/talepler/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT r.*, e.employee_no, e.first_name, e.last_name, t.leave_code, t.leave_name
       FROM hr_leave_requests r
       JOIN hr_employees e ON e.id = r.employee_id
       JOIN hr_leave_types t ON t.id = r.leave_type_id
       WHERE r.id=$1`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'İzin talebi bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/talepler', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.employee_id || !b.leave_type_id || !b.start_date || !b.end_date) {
      return res.status(400).json({ hata: 'company_id, employee_id, leave_type_id, start_date, end_date zorunlu.' });
    }
    if (b.end_date < b.start_date) {
      return res.status(400).json({ hata: 'Bitiş tarihi başlangıçtan önce olamaz.' });
    }
    const qty = b.quantity != null ? Number(b.quantity) : gunFarki(b.start_date, b.end_date);
    const user = await kullaniciGetir(pool, reqKullaniciKodu(req));
    const id = await withTransaction(pool, async (client) => {
      // Çakışma kontrolü
      const cakisma = await client.query(
        `SELECT id, request_no FROM hr_leave_requests
         WHERE employee_id=$1 AND status IN ('Gonderildi','YoneticiOnay','IkOnay','Onaylandi')
           AND daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')
         LIMIT 1`,
        [b.employee_id, b.start_date, b.end_date],
      );
      if (cakisma.rows[0]) {
        const err = new Error(`Çakışan izin talebi var: ${cakisma.rows[0].request_no}`);
        err.status = 409;
        throw err;
      }
      const no = b.request_no || (await sonrakiKod(client, 'HR_LEAVE_REQ'));
      const ins = await client.query(
        `INSERT INTO hr_leave_requests (
           company_id, request_no, employee_id, leave_type_id, start_date, end_date,
           unit, quantity, status, description, requested_by_user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'Gun'),$8,COALESCE($9,'Taslak'),$10,$11)
         RETURNING id`,
        [
          firmaId, no, b.employee_id, b.leave_type_id, b.start_date, b.end_date,
          b.unit, qty, b.status || 'Taslak', b.description || null, user?.id || null,
        ],
      );
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_leave_requests WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/talepler/:id/gonder', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE hr_leave_requests SET status='Gonderildi', updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND status='Taslak' RETURNING *`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(400).json({ hata: 'Yalnızca Taslak talepler gönderilebilir.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/talepler/:id/onayla', async (req, res) => {
  try {
    const user = await kullaniciGetir(pool, reqKullaniciKodu(req));
    const out = await withTransaction(pool, async (client) => {
      const cur = await client.query(`SELECT * FROM hr_leave_requests WHERE id=$1 FOR UPDATE`, [req.params.id]);
      const talep = cur.rows[0];
      if (!talep) {
        const err = new Error('İzin talebi bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (!['Gonderildi', 'YoneticiOnay', 'IkOnay'].includes(talep.status)) {
        const err = new Error(`Bu durumda onaylanamaz: ${talep.status}`);
        err.status = 409;
        throw err;
      }
      const year = new Date(talep.start_date).getFullYear();
      let bal = await client.query(
        `SELECT * FROM hr_leave_balances
         WHERE employee_id=$1 AND leave_type_id=$2 AND year_no=$3 FOR UPDATE`,
        [talep.employee_id, talep.leave_type_id, year],
      );
      if (!bal.rows[0]) {
        const ins = await client.query(
          `INSERT INTO hr_leave_balances (employee_id, company_id, leave_type_id, year_no, accrued, closing_balance)
           VALUES ($1,$2,$3,$4,0,0) RETURNING *`,
          [talep.employee_id, talep.company_id, talep.leave_type_id, year],
        );
        bal = { rows: ins.rows };
      }
      const bakiye = bal.rows[0];
      const kalan = Number(bakiye.closing_balance);
      const tip = await client.query(`SELECT * FROM hr_leave_types WHERE id=$1`, [talep.leave_type_id]);
      if (tip.rows[0]?.accrual_method === 'YillikKidem' && Number(talep.quantity) > kalan) {
        const err = new Error(`Yetersiz izin bakiyesi (kalan=${kalan}, talep=${talep.quantity}).`);
        err.status = 400;
        throw err;
      }
      // Aynı talebin ikinci kez bakiyeyi düşürmesini engelle
      const once = await client.query(
        `SELECT 1 FROM hr_leave_balance_movements WHERE leave_request_id=$1 AND movement_type='Kullanim' LIMIT 1`,
        [talep.id],
      );
      if (!once.rows[0] && tip.rows[0]?.accrual_method === 'YillikKidem') {
        const used = Number(bakiye.used) + Number(talep.quantity);
        const closing = Number(bakiye.opening_balance) + Number(bakiye.accrued) + Number(bakiye.adjusted) - used;
        await client.query(
          `UPDATE hr_leave_balances SET used=$2, closing_balance=$3 WHERE id=$1`,
          [bakiye.id, used, closing],
        );
        await client.query(
          `INSERT INTO hr_leave_balance_movements (balance_id, employee_id, leave_request_id, movement_type, quantity, description)
           VALUES ($1,$2,$3,'Kullanim',$4,$5)`,
          [bakiye.id, talep.employee_id, talep.id, -Number(talep.quantity), `İzin onayı ${talep.request_no}`],
        );
      }
      const upd = await client.query(
        `UPDATE hr_leave_requests SET
           status='Onaylandi', approved_by_user_id=$2, approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
         WHERE id=$1 RETURNING *`,
        [talep.id, user?.id || null],
      );
      return upd.rows[0];
    });
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/talepler/:id/reddet', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE hr_leave_requests SET
         status='Reddedildi', rejection_reason=$2, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND status IN ('Gonderildi','YoneticiOnay','IkOnay')
       RETURNING *`,
      [req.params.id, req.body?.rejection_reason || req.body?.description || null],
    );
    if (!r.rows[0]) return res.status(400).json({ hata: 'Talep reddedilemedi.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/bakiyeler', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`b.company_id=$${params.length}`);
    }
    if (req.query.employee_id) {
      params.push(req.query.employee_id);
      where.push(`b.employee_id=$${params.length}`);
    }
    if (req.query.year_no) {
      params.push(req.query.year_no);
      where.push(`b.year_no=$${params.length}`);
    }
    const r = await pool.query(
      `SELECT b.*, e.employee_no, e.first_name, e.last_name, t.leave_code, t.leave_name
       FROM hr_leave_balances b
       JOIN hr_employees e ON e.id = b.employee_id
       JOIN hr_leave_types t ON t.id = b.leave_type_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY e.employee_no, t.leave_code`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Hak ediş bakiyesi oluştur / güncelle */
router.post('/bakiyeler/accrue', async (req, res) => {
  try {
    const { employee_id, leave_type_id, year_no, accrued, company_id } = req.body || {};
    const firmaId = firmaIdFromReq(req) || company_id;
    if (!firmaId || !employee_id || !leave_type_id || !year_no) {
      return res.status(400).json({ hata: 'employee_id, leave_type_id, year_no, company_id zorunlu.' });
    }
    const amount = Number(accrued || 0);
    const out = await withTransaction(pool, async (client) => {
      const existing = await client.query(
        `SELECT * FROM hr_leave_balances WHERE employee_id=$1 AND leave_type_id=$2 AND year_no=$3 FOR UPDATE`,
        [employee_id, leave_type_id, year_no],
      );
      let bal;
      if (existing.rows[0]) {
        const e = existing.rows[0];
        const accruedN = Number(e.accrued) + amount;
        const closing = Number(e.opening_balance) + accruedN + Number(e.adjusted) - Number(e.used);
        const upd = await client.query(
          `UPDATE hr_leave_balances SET accrued=$2, closing_balance=$3 WHERE id=$1 RETURNING *`,
          [e.id, accruedN, closing],
        );
        bal = upd.rows[0];
      } else {
        const ins = await client.query(
          `INSERT INTO hr_leave_balances (employee_id, company_id, leave_type_id, year_no, accrued, closing_balance)
           VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
          [employee_id, firmaId, leave_type_id, year_no, amount],
        );
        bal = ins.rows[0];
      }
      await client.query(
        `INSERT INTO hr_leave_balance_movements (balance_id, employee_id, movement_type, quantity, description)
         VALUES ($1,$2,'Hakedis',$3,$4)`,
        [bal.id, employee_id, amount, `Hak ediş ${year_no}`],
      );
      return bal;
    });
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
