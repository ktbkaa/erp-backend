const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { reqKullaniciKodu } = require('../src/utils/yetki');
const { fisOlustur, hesapIdCoz } = require('../src/services/muhasebeMotorService');
const { registerIdCrud } = require('../src/utils/registerIdCrud');

async function bankaListe(firmaId) {
  const r = await pool.query(
    `
    SELECT b.*, h.account_code AS gl_account_code, bk.bank_name
    FROM fin_bank_accounts b
    LEFT JOIN gl_accounts h ON h.id=b.gl_account_id
    LEFT JOIN banks bk ON bk.id=b.bank_id
    WHERE ($1::int IS NULL OR b.company_id=$1 OR b.company_id IS NULL)
    ORDER BY b.id DESC
    `,
    [firmaId]
  );
  return r.rows;
}

router.get('/banka-hesaplari', async (req, res, next) => {
  try {
    res.json(await bankaListe(firmaIdFromReq(req)));
  } catch (err) {
    next(err);
  }
});

router.post('/banka-hesaplari', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const { account_code, account_name, bank_id, iban, currency_code, gl_account_id } = req.body || {};
    if (!account_name) return res.status(400).json({ hata: 'account_name zorunlu.' });
    const kod = account_code || (await withTransaction(pool, (c) => sonrakiBelgeNo(c, 'FIN_BANKA_HESAP')));
    const r = await pool.query(
      `
      INSERT INTO fin_bank_accounts
        (company_id, account_code, account_name, bank_id, iban, currency_code, gl_account_id)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,'TRY'),$7) RETURNING *
      `,
      [firmaId, kod, account_name, bank_id || null, iban || null, currency_code, gl_account_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/kasa-hesaplari', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `
      SELECT k.*, h.account_code AS gl_account_code
      FROM fin_cash_accounts k
      LEFT JOIN gl_accounts h ON h.id=k.gl_account_id
      WHERE ($1::int IS NULL OR k.company_id=$1 OR k.company_id IS NULL)
      ORDER BY k.id DESC
      `,
      [firmaId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/kasa-hesaplari', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const { cash_code, cash_name, currency_code, gl_account_id } = req.body || {};
    if (!cash_name) return res.status(400).json({ hata: 'cash_name zorunlu.' });
    const kod = cash_code || (await withTransaction(pool, (c) => sonrakiBelgeNo(c, 'FIN_KASA')));
    const r = await pool.query(
      `
      INSERT INTO fin_cash_accounts (company_id, cash_code, cash_name, currency_code, gl_account_id)
      VALUES ($1,$2,$3,COALESCE($4,'TRY'),$5) RETURNING *
      `,
      [firmaId, kod, cash_name, currency_code, gl_account_id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/hareketler', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `
      SELECT n.*, c.partner_name
      FROM fin_cash_movements n
      LEFT JOIN partners c ON c.id=n.partner_id
      WHERE ($1::int IS NULL OR n.company_id=$1 OR n.company_id IS NULL)
      ORDER BY n.id DESC
      `,
      [firmaId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * Nakit hareket + isteğe bağlı muhasebe fişi
 * body: direction, amount, bank_account_id|cash_account_id, karsi_hesap_kodu, muhasebelestir
 */
router.post('/hareketler', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const {
      direction, amount, currency_code, exchange_rate, bank_account_id, cash_account_id,
      partner_id, description, movement_date, muhasebelestir, karsi_hesap_kodu, country_code,
    } = req.body || {};
    if (!['Giris', 'Cikis', 'Virman'].includes(direction)) {
      return res.status(400).json({ hata: 'direction Giris|Cikis|Virman olmalı.' });
    }
    if (!(Number(amount) > 0)) return res.status(400).json({ hata: 'amount > 0 olmalı.' });
    if (!bank_account_id && !cash_account_id) {
      return res.status(400).json({ hata: 'bank_account_id veya cash_account_id gerekli.' });
    }

    const result = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'FIN_NAKIT_HAREKET');
      const ins = await client.query(
        `
        INSERT INTO fin_cash_movements
          (company_id, movement_no, movement_date, direction, amount, currency_code, exchange_rate,
           bank_account_id, cash_account_id, partner_id, description, status)
        VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,$5,COALESCE($6,'TRY'),COALESCE($7,1),
                $8,$9,$10,$11,'Onayli')
        RETURNING *
        `,
        [
          firmaId, no, movement_date || null, direction, Number(amount), currency_code, exchange_rate,
          bank_account_id || null, cash_account_id || null, partner_id || null, description || null,
        ]
      );
      const har = ins.rows[0];
      let fis = null;
      if (muhasebelestir) {
        let nakitHesapId = null;
        if (bank_account_id) {
          const bh = await client.query(`SELECT gl_account_id FROM fin_bank_accounts WHERE id=$1`, [bank_account_id]);
          nakitHesapId = bh.rows[0]?.gl_account_id;
        } else {
          const kh = await client.query(`SELECT gl_account_id FROM fin_cash_accounts WHERE id=$1`, [cash_account_id]);
          nakitHesapId = kh.rows[0]?.gl_account_id;
        }
        if (!nakitHesapId) {
          nakitHesapId = await hesapIdCoz(client, {
            account_code: bank_account_id ? '102.01.001' : '100.01.001',
            country_code: country_code || 'TR',
          });
        }
        const karsiKod = karsi_hesap_kodu || (direction === 'Giris' ? '120.01.001' : '320.01.001');
        const karsiId = await hesapIdCoz(client, { account_code: karsiKod, country_code: country_code || 'TR' });
        const t = Number(amount);
        const lines = direction === 'Cikis'
          ? [
            { account_id: karsiId, debit: t, credit: 0, description },
            { account_id: nakitHesapId, debit: 0, credit: t, description },
          ]
          : [
            { account_id: nakitHesapId, debit: t, credit: 0, description },
            { account_id: karsiId, debit: 0, credit: t, description },
          ];
        fis = await fisOlustur(client, {
          firmaId,
          ulkeKodu: country_code || 'TR',
          fisTipi: direction === 'Giris' ? 'Tahsilat' : 'Tediye',
          belgeTarihi: har.movement_date,
          description: description || `${direction} ${no}`,
          paraBirimi: currency_code || 'TRY',
          exchange_rate: exchange_rate || 1,
          lines,
          kaynakBelgeTipi: 'NAKIT_HAREKET',
          kaynakBelgeId: har.id,
          olusturanKullanici: reqKullaniciKodu(req),
          kesinlestir: true,
        });
        await client.query(
          `UPDATE fin_cash_movements SET gl_document_id=$2 WHERE id=$1`,
          [har.id, fis.id]
        );
      }
      return { hareket: har, fis };
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

registerIdCrud(router, pool, {
  path: '/banka-hesaplari',
  table: 'fin_bank_accounts',
  notFound: 'Banka hesabı bulunamadı.',
  updatable: ['account_name', 'bank_id', 'iban', 'currency_code', 'gl_account_id'],
});
registerIdCrud(router, pool, {
  path: '/kasa-hesaplari',
  table: 'fin_cash_accounts',
  notFound: 'Kasa hesabı bulunamadı.',
  updatable: ['cash_name', 'currency_code', 'gl_account_id'],
});
registerIdCrud(router, pool, {
  path: '/hareketler',
  table: 'fin_cash_movements',
  notFound: 'Nakit hareket bulunamadı.',
  canDelete: async (row) => {
    if (row.gl_document_id) return 'Muhasebeleşmiş nakit hareket silinemez.';
    return true;
  },
});

module.exports = router;
