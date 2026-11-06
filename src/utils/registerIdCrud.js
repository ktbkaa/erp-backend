/**
 * Mevcut liste/POST kaynağına GET/:id, PUT/:id, DELETE/:id ekler.
 * UI sil butonu `DELETE {endpoint}/{id}` çağırır; yoksa «Endpoint bulunamadı».
 */

function registerIdCrud(router, pool, opts) {
  const {
    path,
    table,
    notFound = 'Kayıt bulunamadı.',
    getSql = null,
    updatable = [],
    softDelete = false,
    softCol = 'is_active',
    /** async (row) => true | string hata */
    canDelete = null,
    skipGet = false,
    skipPut = false,
    skipDelete = false,
  } = opts;

  if (typeof path !== 'string' || !table) {
    throw new Error('registerIdCrud: path (string) ve table zorunlu');
  }

  if (!skipGet) {
    router.get(`${path}/:id`, async (req, res) => {
      try {
        const sql = getSql || `SELECT * FROM ${table} WHERE id=$1`;
        const r = await pool.query(sql, [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: notFound });
        res.json(r.rows[0]);
      } catch (err) {
        res.status(500).json({ hata: err.message });
      }
    });
  }

  if (!skipPut && updatable.length) {
    router.put(`${path}/:id`, async (req, res) => {
      try {
        const b = req.body || {};
        const sets = [];
        const params = [req.params.id];
        for (const col of updatable) {
          if (b[col] === undefined) continue;
          params.push(b[col]);
          sets.push(`${col}=$${params.length}`);
        }
        if (!sets.length) {
          const cur = await pool.query(getSql || `SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
          if (!cur.rows[0]) return res.status(404).json({ hata: notFound });
          return res.json(cur.rows[0]);
        }
        const r = await pool.query(
          `UPDATE ${table} SET ${sets.join(', ')} WHERE id=$1 RETURNING *`,
          params,
        );
        if (!r.rows[0]) return res.status(404).json({ hata: notFound });
        if (getSql) {
          const full = await pool.query(getSql, [req.params.id]);
          return res.json(full.rows[0] || r.rows[0]);
        }
        res.json(r.rows[0]);
      } catch (err) {
        res.status(500).json({ hata: err.message });
      }
    });
  }

  if (!skipDelete) {
    router.delete(`${path}/:id`, async (req, res) => {
      try {
        const cur = await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
        const row = cur.rows[0];
        if (!row) return res.status(404).json({ hata: notFound });
        if (typeof canDelete === 'function') {
          const ok = await canDelete(row, req);
          if (ok !== true) {
            return res.status(409).json({ hata: typeof ok === 'string' ? ok : 'Bu kayıt silinemez.' });
          }
        }
        if (softDelete) {
          const r = await pool.query(
            `UPDATE ${table} SET ${softCol}=FALSE WHERE id=$1 RETURNING id`,
            [req.params.id],
          );
          return res.json({ silindi: true, soft: true, id: Number(r.rows[0].id) });
        }
        const r = await pool.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`, [req.params.id]);
        res.json({ silindi: true, soft: false, id: Number(r.rows[0].id) });
      } catch (err) {
        if (err.code === '23503') {
          return res.status(409).json({
            hata: 'Kayıt bağlı veriler nedeniyle silinemedi. Önce ilişkili kayıtları kaldırın.',
          });
        }
        res.status(500).json({ hata: err.message });
      }
    });
  }
}

module.exports = { registerIdCrud };
