/**
 * Finans/muhasebe motor kabul testleri (çekirdek).
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const {
  fisOlustur,
  fisKesinlestir,
  fisTersKayit,
  assertLines,
  donemKapat,
  donemYenidenAc,
  kaynakFisVarMi,
} = require('../src/services/muhasebeMotorService');
const { faturadanMuhasebe } = require('../src/services/muhasebeEntegrasyonService');

async function hesapId(kod) {
  const r = await pool.query(`SELECT id FROM gl_accounts WHERE account_code=$1`, [kod]);
  assert.ok(r.rows[0], `hesap yok: ${kod}`);
  return r.rows[0].id;
}

describe('finans muhasebe motor', () => {
  before(async () => {
    // migration 041 uygulanmış olmalı
    const t = await pool.query(`SELECT to_regclass('public.fin_country_packs') AS t`);
    assert.ok(t.rows[0].t, 'fin_country_packs yok — npm run migrate');
  });

  it('1) dengeli fiş kaydedilir ve kesinleşir', async () => {
    const h100 = await hesapId('100.01.001');
    const h120 = await hesapId('120.01.001');
    const fis = await withTransaction(pool, (c) => fisOlustur(c, {
      ulkeKodu: 'TR',
      belgeTarihi: new Date().toISOString().slice(0, 10),
      description: 'test dengeli',
      lines: [
        { account_id: h100, debit: 100, credit: 0 },
        { account_id: h120, debit: 0, credit: 100 },
      ],
      kesinlestir: true,
      olusturanKullanici: 'test',
    }));
    assert.equal(fis.status, 'Onayli');
    assert.equal(fis.toplam_borc, 100);
  });

  it('2) dengesiz fiş kesinleştirilemez', () => {
    assert.throws(
      () => assertLines([
        { account_id: 1, debit: 50, credit: 0 },
        { account_id: 2, debit: 0, credit: 40 },
      ]),
      /dengeli değil|FIS_DENGESIZ/i
    );
  });

  it('3) is_inactive / ana hesapla kesinleştirme engellenir', async () => {
    const ana = await pool.query(`SELECT id FROM gl_accounts WHERE account_type='Ana' LIMIT 1`);
    const h120 = await hesapId('120.01.001');
    await assert.rejects(
      () => withTransaction(pool, (c) => fisOlustur(c, {
        lines: [
          { account_id: ana.rows[0].id, debit: 10, credit: 0 },
          { account_id: h120, debit: 0, credit: 10 },
        ],
        kesinlestir: true,
      })),
      /Doğrudan|HESAP_TIPI/i
    );
  });

  it('4) aynı source belge ikinci kez mükerrer fiş üretmez', async () => {
    const h100 = await hesapId('100.01.001');
    const h120 = await hesapId('120.01.001');
    const kaynakId = 900001 + Math.floor(Math.random() * 1000);
    await withTransaction(pool, (c) => fisOlustur(c, {
      lines: [
        { account_id: h100, debit: 25, credit: 0 },
        { account_id: h120, debit: 0, credit: 25 },
      ],
      kaynakBelgeTipi: 'TEST_BELGE',
      kaynakBelgeId: kaynakId,
      kesinlestir: true,
    }));
    await assert.rejects(
      () => withTransaction(pool, (c) => fisOlustur(c, {
        lines: [
          { account_id: h100, debit: 25, credit: 0 },
          { account_id: h120, debit: 0, credit: 25 },
        ],
        kaynakBelgeTipi: 'TEST_BELGE',
        kaynakBelgeId: kaynakId,
        kesinlestir: true,
      })),
      /MUKERRER|muhasebeleştirilmiş/i
    );
  });

  it('5) kesinleşmiş fiş PUT ile değiştirilemez — ters kayıt çalışır', async () => {
    const h100 = await hesapId('100.01.001');
    const h600 = await hesapId('600.01.001');
    const fis = await withTransaction(pool, (c) => fisOlustur(c, {
      lines: [
        { account_id: h100, debit: 80, credit: 0 },
        { account_id: h600, debit: 0, credit: 80 },
      ],
      kesinlestir: true,
    }));
    const ters = await withTransaction(pool, (c) => fisTersKayit(c, fis.id, { kullaniciKodu: 'test' }));
    assert.ok(ters.id);
    const orig = await pool.query(`SELECT reversal_document_id, is_locked FROM journal_entries WHERE id=$1`, [fis.id]);
    assert.equal(Number(orig.rows[0].reversal_document_id), ters.id);
    assert.equal(orig.rows[0].is_locked, true);
  });

  it('6) kapalı döneme kesin kayıt engellenir', async () => {
    const period = await pool.query(
      `SELECT id FROM accounting_periods WHERE status IN ('Acik','YenidenAcik') ORDER BY id DESC LIMIT 1`
    );
    assert.ok(period.rows[0]);
    await withTransaction(pool, (c) => donemKapat(c, period.rows[0].id, { kullaniciKodu: 'test' }));
    const d = await pool.query(`SELECT start_date FROM accounting_periods WHERE id=$1`, [period.rows[0].id]);
    const h100 = await hesapId('100.01.001');
    const h120 = await hesapId('120.01.001');
    await assert.rejects(
      () => withTransaction(pool, (c) => fisOlustur(c, {
        belgeTarihi: d.rows[0].start_date,
        lines: [
          { account_id: h100, debit: 5, credit: 0 },
          { account_id: h120, debit: 0, credit: 5 },
        ],
        kesinlestir: true,
      })),
      /Kapalı dönem|DONEM_KAPALI/i
    );
    await withTransaction(pool, (c) => donemYenidenAc(c, period.rows[0].id, { kullaniciKodu: 'test' }));
  });

  it('7) ülke paketleri seed', async () => {
    const r = await pool.query(`SELECT country_code FROM fin_country_packs ORDER BY 1`);
    const codes = r.rows.map((x) => x.country_code);
    assert.deepEqual(codes, ['AZ', 'DE', 'NL', 'TR']);
  });

  it('8) vergi oranı tarihli yapılandırma', async () => {
    const r = await pool.query(
      `
      SELECT vo.rate FROM fin_tax_codes vk
      JOIN fin_tax_rates vo ON vo.tax_code_id=vk.id
      WHERE vk.country_code='TR' AND vk.tax_code='KDV20'
      `
    );
    assert.equal(Number(r.rows[0].rate), 20);
  });
});
