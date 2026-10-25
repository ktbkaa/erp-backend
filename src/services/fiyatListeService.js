async function fiyatBul(pool, { stokId, cariId = null, quantity = 1, tarih = null }) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  const r = await pool.query(
    `
    SELECT s.unit_price, s.discount_rate, l.list_code, l.currency_code
    FROM price_list_lines s
    JOIN price_lists l ON l.id = s.list_id AND l.is_active = TRUE
    WHERE s.item_id = $1
      AND (s.partner_id IS NULL OR s.partner_id = $2)
      AND s.min_quantity <= $3
      AND (l.start_date IS NULL OR l.start_date <= $4::date)
      AND (l.end_date IS NULL OR l.end_date >= $4::date)
    ORDER BY
      CASE WHEN s.partner_id IS NOT NULL THEN 0 ELSE 1 END,
      s.min_quantity DESC
    LIMIT 1
    `,
    [stokId, cariId, quantity, t]
  );
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  const iskonto = Number(row.discount_rate || 0);
  const net = Number(row.unit_price) * (1 - iskonto / 100);
  return { ...row, net_unit_price: net };
}

module.exports = { fiyatBul };
