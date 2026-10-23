const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

function tarihFiltre(query, alias = 'b') {
  const params = [];
  let sql = '';
  if (query.baslangic) {
    params.push(query.baslangic);
    sql += ` AND ${alias}.document_date >= $${params.length}`;
  }
  if (query.bitis) {
    params.push(query.bitis);
    sql += ` AND ${alias}.document_date <= $${params.length}`;
  }
  return { sql, params };
}

/** Yevmiye defteri */
router.get('/yevmiye', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const { sql, params } = tarihFiltre(req.query);
    if (firmaId) {
      params.push(firmaId);
    }
    const r = await pool.query(
      `
      SELECT b.id AS document_id, b.document_no, b.journal_number, b.document_date, b.voucher_type, b.description AS belge_aciklama,
             b.country_code, k.line_no, h.account_code, h.account_name, k.debit, k.credit, k.description AS kalem_aciklama
      FROM journal_entries b
      JOIN journal_entry_lines k ON k.document_id = b.id
      JOIN gl_accounts h ON h.id = k.account_id
      WHERE b.status = 'Onayli' ${sql}
        ${firmaId ? `AND (b.company_id = $${params.length} OR b.company_id IS NULL)` : ''}
      ORDER BY b.document_date, b.journal_number NULLS LAST, b.id, k.line_no, k.id
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/** Büyük defter (hesap ekstresi) */
router.get('/buyuk-defter', async (req, res, next) => {
  try {
    const { account_code, account_id } = req.query;
    if (!account_code && !account_id) {
      return res.status(400).json({ hata: 'account_code veya account_id gerekli.' });
    }
    const { sql, params } = tarihFiltre(req.query);
    let hid = account_id ? Number(account_id) : null;
    if (!hid) {
      const h = await pool.query(`SELECT id FROM gl_accounts WHERE account_code=$1`, [account_code]);
      if (!h.rows[0]) return res.status(404).json({ hata: 'Hesap bulunamadı.' });
      hid = h.rows[0].id;
    }
    params.push(hid);
    const r = await pool.query(
      `
      SELECT b.document_date, b.document_no, b.journal_number, b.description AS belge_aciklama,
             k.debit, k.credit, k.description AS kalem_aciklama, h.account_code, h.account_name
      FROM journal_entry_lines k
      JOIN journal_entries b ON b.id = k.document_id
      JOIN gl_accounts h ON h.id = k.account_id
      WHERE b.status='Onayli' AND k.account_id=$${params.length} ${sql}
      ORDER BY b.document_date, b.journal_number NULLS LAST, k.id
      `,
      params
    );
    let debit = 0;
    let credit = 0;
    const rows = r.rows.map((row) => {
      debit += Number(row.debit);
      credit += Number(row.credit);
      return { ...row, kumulatif_bakiye: debit - credit };
    });
    res.json({ account_id: hid, hareketler: rows, toplam_borc: debit, toplam_alacak: credit, bakiye: debit - credit });
  } catch (err) {
    next(err);
  }
});

/** Basit bilanço / gelir tablosu — hesap sınıfı özetleri (TR TDHP) */
router.get('/bilanco', async (req, res, next) => {
  try {
    const bitis = req.query.bitis || new Date().toISOString().slice(0, 10);
    const country = (req.query.country_code || 'TR').toUpperCase();
    const r = await pool.query(
      `
      SELECT h.account_class,
             COALESCE(SUM(k.debit),0) AS debit,
             COALESCE(SUM(k.credit),0) AS credit
      FROM gl_accounts h
      LEFT JOIN journal_entry_lines k ON k.account_id = h.id
      LEFT JOIN journal_entries b ON b.id = k.document_id AND b.status='Onayli' AND b.document_date <= $1::date
      WHERE h.is_active AND h.account_type='Dogrudan'
        AND (h.country_code=$2 OR ($2='TR' AND (h.country_code IS NULL OR h.country_code='TR')))
        AND h.account_class IN ('1','2','3','4','5')
      GROUP BY h.account_class
      ORDER BY h.account_class
      `,
      [bitis, country]
    );
    const sinifAd = {
      1: 'Dönen varlıklar',
      2: 'Duran varlıklar',
      3: 'Kısa vadeli yabancı kaynaklar',
      4: 'Uzun vadeli yabancı kaynaklar',
      5: 'Özkaynaklar',
    };
    const satirlar = r.rows.map((x) => {
      const debit = Number(x.debit);
      const credit = Number(x.credit);
      const varlik = ['1', '2'].includes(x.account_class);
      return {
        sinif: x.account_class,
        first_name: sinifAd[x.account_class] || x.account_class,
        amount: varlik ? debit - credit : credit - debit,
        debit,
        credit,
      };
    });
    const varlik = satirlar.filter((s) => ['1', '2'].includes(s.sinif)).reduce((a, s) => a + s.amount, 0);
    const source = satirlar.filter((s) => ['3', '4', '5'].includes(s.sinif)).reduce((a, s) => a + s.amount, 0);
    res.json({
      bitis,
      country_code: country,
      satirlar,
      toplam_varlik: varlik,
      toplam_kaynak: source,
      dengeli: Math.abs(varlik - source) < 0.05,
      not: 'Özet bilanço — detay hesap dökümü büyük defter/mizan ile doğrulanmalıdır.',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/gelir-tablosu', async (req, res, next) => {
  try {
    const baslangic = req.query.baslangic || `${new Date().getFullYear()}-01-01`;
    const bitis = req.query.bitis || new Date().toISOString().slice(0, 10);
    const country = (req.query.country_code || 'TR').toUpperCase();
    const r = await pool.query(
      `
      SELECT h.account_code, h.account_name, h.normal_balance,
             COALESCE(SUM(k.debit),0) AS debit,
             COALESCE(SUM(k.credit),0) AS credit
      FROM gl_accounts h
      LEFT JOIN journal_entry_lines k ON k.account_id=h.id
      LEFT JOIN journal_entries b ON b.id=k.document_id AND b.status='Onayli'
        AND b.document_date BETWEEN $1::date AND $2::date
      WHERE h.is_active AND h.account_type='Dogrudan'
        AND h.account_class='6'
        AND (h.country_code=$3 OR ($3='TR' AND (h.country_code IS NULL OR h.country_code='TR')))
      GROUP BY h.id
      HAVING COALESCE(SUM(k.debit),0) <> 0 OR COALESCE(SUM(k.credit),0) <> 0
      ORDER BY h.account_code
      `,
      [baslangic, bitis, country]
    );
    let gelir = 0;
    let gider = 0;
    const satirlar = r.rows.map((x) => {
      const net = Number(x.credit) - Number(x.debit);
      if (net >= 0) gelir += net;
      else gider += -net;
      return { ...x, net };
    });
    res.json({
      baslangic,
      bitis,
      country_code: country,
      satirlar,
      toplam_gelir: gelir,
      toplam_gider: gider,
      donem_kar_zarar: gelir - gider,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
