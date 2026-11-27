const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

/** GET /finans-country-paketleri */
router.get('/paketler', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM fin_country_packs WHERE is_active=TRUE ORDER BY country_code`
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/** Aktif firmanın muhasebe ülkesi + geçici işlem bağlamı yardımcıları */
router.get('/is_active', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    let firma = null;
    if (firmaId) {
      const f = await pool.query(
        `SELECT id, company_code, company_name, accounting_country_code, functional_currency,
                chart_of_accounts_code, reporting_framework, fiscal_year_start_month, e_document_provider
         FROM companies WHERE id=$1`,
        [firmaId]
      );
      firma = f.rows[0] || null;
    }
    const country = (firma?.accounting_country_code || 'TR').toUpperCase();
    const paket = await pool.query(
      `SELECT * FROM fin_country_packs WHERE country_code=$1`,
      [country]
    );
    res.json({
      firma,
      accounting_country_code: country,
      paket: paket.rows[0] || null,
      description:
        'Varsayılan ülke is_active şirketin muhasebe ülkesidir. Geçici işlem ülkesi ana ülkeyi değiştirmez; '
        + 'kesinleşmiş fişlerin ülkesi geriye dönük güncellenmez.',
    });
  } catch (err) {
    next(err);
  }
});

/** Firma muhasebe ülkesi güncelle (kalıcı) */
router.put('/firma/:id', async (req, res, next) => {
  try {
    const {
      accounting_country_code, functional_currency, chart_of_accounts_code,
      reporting_framework, fiscal_year_start_month, e_document_provider,
    } = req.body || {};
    if (accounting_country_code) {
      const p = await pool.query(
        `SELECT country_code, local_currency, chart_of_accounts_code FROM fin_country_packs WHERE country_code=$1 AND is_active`,
        [accounting_country_code]
      );
      if (!p.rows[0]) {
        return res.status(400).json({
          hata: `Geçersiz veya is_inactive ülke paketi: ${accounting_country_code}`,
          kod: 'ULKE_PAKET_YOK',
        });
      }
      const upd = await pool.query(
        `
        UPDATE companies SET
          accounting_country_code=$2,
          functional_currency=COALESCE($3, $4, functional_currency),
          chart_of_accounts_code=COALESCE($5, $6, chart_of_accounts_code),
          reporting_framework=COALESCE($7, reporting_framework),
          fiscal_year_start_month=COALESCE($8, fiscal_year_start_month),
          e_document_provider=COALESCE($9, e_document_provider)
        WHERE id=$1 RETURNING *
        `,
        [
          req.params.id, accounting_country_code,
          functional_currency, p.rows[0].local_currency,
          chart_of_accounts_code, p.rows[0].chart_of_accounts_code,
          reporting_framework, fiscal_year_start_month, e_document_provider,
        ]
      );
      if (!upd.rows[0]) return res.status(404).json({ hata: 'Firma bulunamadı.' });
      return res.json(upd.rows[0]);
    }
    res.status(400).json({ hata: 'accounting_country_code gerekli.' });
  } catch (err) {
    next(err);
  }
});

/** Belirli ülke için hesap planı (lookup) */
router.get('/hesaplar/:ulkeKodu', async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT * FROM gl_accounts
      WHERE is_active=TRUE AND (country_code=$1 OR country_code IS NULL)
      ORDER BY account_code
      `,
      [req.params.ulkeKodu]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
