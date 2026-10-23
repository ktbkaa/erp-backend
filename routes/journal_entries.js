const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { reqKullaniciKodu } = require('../src/utils/yetki');
const {
  fisOlustur,
  fisKesinlestir,
  fisTersKayit,
  assertLines,
} = require('../src/services/muhasebeMotorService');

async function belgeGetir(id) {
  const b = await pool.query('SELECT * FROM journal_entries WHERE id=$1', [id]);
  if (!b.rows[0]) return null;
  const kalemler = await pool.query(
    `
    SELECT k.*, h.account_code, h.account_name
    FROM journal_entry_lines k
    JOIN gl_accounts h ON h.id = k.account_id
    WHERE k.document_id=$1
    ORDER BY COALESCE(k.line_no, k.id), k.id
    `,
    [id]
  );
  const debit = kalemler.rows.reduce((s, r) => s + Number(r.debit), 0);
  const credit = kalemler.rows.reduce((s, r) => s + Number(r.credit), 0);
  return {
    ...b.rows[0],
    kalemler: kalemler.rows,
    satirlar: kalemler.rows,
    toplam_borc: debit,
    toplam_alacak: credit,
    dengeli: Math.abs(debit - credit) < 0.005,
  };
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const liste = await pool.query(
      `
      SELECT id FROM journal_entries
      WHERE ($1::int IS NULL OR company_id=$1 OR company_id IS NULL)
      ORDER BY id DESC
      LIMIT 500
      `,
      [firmaId]
    );
    const result = [];
    for (const r of liste.rows) result.push(await belgeGetir(r.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const belge = await belgeGetir(req.params.id);
    if (!belge) return res.status(404).json({ hata: 'Belge bulunamadı.' });
    res.json(belge);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      document_date, description, kalemler, satirlar, voucher_type, country_code,
      transaction_country_code, tax_country_code, currency_code, exchange_rate, kesinlestir, status,
      source_document_type, source_document_id,
    } = req.body;
    const lines = kalemler || satirlar;
    assertLines(lines || []);
    const created = await withTransaction(pool, (client) => fisOlustur(client, {
      firmaId: firmaIdFromReq(req),
      ulkeKodu: country_code || 'TR',
      islemUlkeKodu: transaction_country_code,
      vergiUlkeKodu: tax_country_code,
      fisTipi: voucher_type || 'Mahsup',
      belgeTarihi: document_date,
      description,
      paraBirimi: currency_code || 'TRY',
      exchange_rate: exchange_rate || 1,
      lines,
      kaynakBelgeTipi: source_document_type,
      kaynakBelgeId: source_document_id,
      olusturanKullanici: reqKullaniciKodu(req),
      kesinlestir: Boolean(kesinlestir) || status === 'Onayli',
      status: status || 'Taslak',
    }));
    res.status(201).json(await belgeGetir(created.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod, ...err });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { document_date, description, kalemler, satirlar, voucher_type } = req.body;
    const lines = kalemler || satirlar;
    const id = await withTransaction(pool, async (client) => {
      const mevcut = await client.query(
        'SELECT id, status, is_locked FROM journal_entries WHERE id=$1 FOR UPDATE',
        [req.params.id]
      );
      if (!mevcut.rows[0]) {
        throw Object.assign(new Error('Belge bulunamadı.'), { status: 404 });
      }
      if (mevcut.rows[0].status === 'Onayli' || mevcut.rows[0].is_locked) {
        throw Object.assign(
          new Error(
            'Kesinleşmiş fiş satırları değiştirilemez. Düzeltmek için «Ters kayıt» kullanın; '
            + 'orijinal fiş denetim izinde kalır.'
          ),
          { status: 400, kod: 'KESIN_FIS_KILIT' }
        );
      }
      await client.query(
        `
        UPDATE journal_entries SET
          document_date = COALESCE($2::date, document_date),
          description = COALESCE($3, description),
          voucher_type = COALESCE($4, voucher_type)
        WHERE id=$1
        `,
        [req.params.id, document_date || null, description ?? null, voucher_type || null]
      );
      if (Array.isArray(lines)) {
        assertLines(lines);
        await client.query('DELETE FROM journal_entry_lines WHERE document_id=$1', [req.params.id]);
        let sira = 1;
        for (const k of lines) {
          if (!k.account_id) throw Object.assign(new Error('account_id zorunlu.'), { status: 400 });
          await client.query(
            `
            INSERT INTO journal_entry_lines (document_id, account_id, debit, credit, description, line_no)
            VALUES ($1,$2,$3,$4,$5,$6)
            `,
            [req.params.id, k.account_id, Number(k.debit || 0), Number(k.credit || 0), k.description || null, sira++]
          );
        }
      }
      return Number(req.params.id);
    });
    res.json(await belgeGetir(id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

router.post('/:id/onayla', async (req, res) => {
  try {
    await withTransaction(pool, (client) => fisKesinlestir(client, Number(req.params.id), {
      kullaniciKodu: reqKullaniciKodu(req),
      firmaId: firmaIdFromReq(req),
    }));
    res.json(await belgeGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

router.post('/:id/kesinlestir', async (req, res) => {
  try {
    await withTransaction(pool, (client) => fisKesinlestir(client, Number(req.params.id), {
      kullaniciKodu: reqKullaniciKodu(req),
      firmaId: firmaIdFromReq(req),
    }));
    res.json(await belgeGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

/** Eski API — onay kaldırma kapalı; ters kayıt yönlendir */
router.post('/:id/onay-kaldir', async (req, res) => {
  res.status(400).json({
    hata: 'Kesinleşmiş fişin onayı kaldırılamaz. Denetim izi için «Ters kayıt» kullanın.',
    kod: 'ONAY_KALDIR_KAPALI',
    alternatif: `POST /muhasebe-belgeleri/${req.params.id}/ters-kayit`,
  });
});

router.post('/:id/ters-kayit', async (req, res) => {
  try {
    const ters = await withTransaction(pool, (client) => fisTersKayit(client, Number(req.params.id), {
      kullaniciKodu: reqKullaniciKodu(req),
      description: req.body?.description,
    }));
    res.status(201).json({
      orijinal: await belgeGetir(req.params.id),
      ters: await belgeGetir(ters.id),
      message: 'Ters kayıt oluşturuldu. Orijinal fiş is_locked kaldı.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const mevcut = await pool.query('SELECT status, is_locked FROM journal_entries WHERE id=$1', [req.params.id]);
    if (!mevcut.rows[0]) return res.status(404).json({ hata: 'Belge bulunamadı.' });
    if (mevcut.rows[0].status === 'Onayli' || mevcut.rows[0].is_locked) {
      return res.status(400).json({
        hata: 'Onaylı/is_locked belge silinemez. Ters kayıt kullanın.',
        kod: 'KESIN_FIS_KILIT',
      });
    }
    await pool.query('DELETE FROM journal_entries WHERE id=$1', [req.params.id]);
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
