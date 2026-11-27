const express = require('express');
const router = express.Router();
const pool = require('../db');
const { partnerStatement, partnerBalance, addPartnerLedgerEntry } = require('../src/services/cariHareketService');
const { withTransaction } = require('../src/utils/withTransaction');

router.get('/', async (req, res, next) => {
  try {
    const cariId = req.query.partner_id ? Number(req.query.partner_id) : null;
    const baslangic = req.query.baslangic || null;
    const bitis = req.query.bitis || null;
    const format = String(req.query.format || 'json').toLowerCase();

    if (!cariId) {
      const params = [];
      const where = [];
      if (baslangic) {
        params.push(baslangic);
        where.push(`h.movement_date >= $${params.length}`);
      }
      if (bitis) {
        params.push(bitis);
        where.push(`h.movement_date <= $${params.length}`);
      }
      if (req.query.partner_code) {
        params.push(`%${String(req.query.partner_code).trim()}%`);
        where.push(`c.partner_code ILIKE $${params.length}`);
      }
      const r = await pool.query(
        `SELECT h.*, c.partner_code, c.partner_name
         FROM partner_ledger_entries h
         JOIN partners c ON c.id = h.partner_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY h.movement_date DESC, h.id DESC
         LIMIT 500`,
        params
      );
      if (format === 'html' || format === 'pdf') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(renderListeEkstreHtml({
          baslangic, bitis, hareketler: r.rows, title: 'Cari Ekstre (liste)',
        }));
      }
      return res.json(r.rows);
    }
    const data = await partnerStatement(pool, cariId, { baslangic, bitis });
    if (format === 'html' || format === 'pdf') {
      const cari = (await pool.query(
        `SELECT id, partner_code, partner_name FROM partners WHERE id=$1`,
        [cariId]
      )).rows[0];
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(renderListeEkstreHtml({
        baslangic, bitis,
        cari,
        ozet: { debit: data.debit, credit: data.credit, bakiye: data.bakiye },
        hareketler: data.hareketler || [],
        title: `Cari Ekstre — ${cari?.partner_code || cariId}`,
      }));
    }
    res.json(data.hareketler || data);
  } catch (err) {
    next(err);
  }
});

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderListeEkstreHtml({ title, baslangic, bitis, cari, ozet, hareketler }) {
  const rows = (hareketler || []).map((h) => `<tr>
    <td class="mono">${esc(h.partner_code || cari?.partner_code || '')}</td>
    <td>${esc(h.partner_name || cari?.partner_name || '')}</td>
    <td class="mono">${esc(h.movement_no)}</td>
    <td>${esc(h.movement_date)}</td>
    <td>${esc(h.direction)}</td>
    <td class="num">${esc(h.amount)}</td>
    <td>${esc(h.document_type || '')}</td>
    <td>${esc(h.description || '')}</td>
  </tr>`).join('');
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/>
<title>${esc(title || 'Cari Ekstre')}</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;margin:24px}
h1{font-size:1.2rem;margin:0 0 .35rem}
.meta{color:#555;margin-bottom:1rem}
table{width:100%;border-collapse:collapse;font-size:.8rem}
th,td{border:1px solid #d1d5db;padding:.35rem .4rem}
th{background:#f9fafb;text-align:left}
.num{text-align:right}
.mono{font-family:ui-monospace,Consolas,monospace}
@media print{.noprint{display:none}}
</style></head><body>
<div class="noprint"><button onclick="window.print()">Yazdır / PDF</button></div>
<h1>${esc(title || 'Cari Ekstre')}</h1>
<div class="meta">Tarih: ${esc(baslangic || '…')} → ${esc(bitis || '…')}
${ozet ? ` · Borç ${esc(ozet.debit)} / Alacak ${esc(ozet.credit)} / Bakiye ${esc(ozet.bakiye)}` : ''}
</div>
<table><thead><tr>
<th>Cari kod</th><th>Cari ad</th><th>No</th><th>Tarih</th><th>Yön</th><th>Tutar</th><th>Belge</th><th>Açıklama</th>
</tr></thead><tbody>${rows || '<tr><td colspan="8">Kayıt yok</td></tr>'}</tbody></table>
</body></html>`;
}

router.get('/bakiye/:cariId', async (req, res, next) => {
  try {
    res.json(await partnerBalance(pool, Number(req.params.cariId)));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const row = await withTransaction(pool, (client) =>
      addPartnerLedgerEntry(client, {
        cariId: body.partner_id,
        direction: body.direction,
        amount: body.amount,
        paraBirimi: body.currency_code,
        exchange_rate: body.exchange_rate,
        belgeTipi: body.document_type,
        belgeId: body.document_id,
        description: body.description,
        hareketTarihi: body.movement_date,
      })
    );
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
