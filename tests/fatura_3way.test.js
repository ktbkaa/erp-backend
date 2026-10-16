const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');
const { withTransaction } = require('../src/utils/withTransaction');
const { faturaEslestir } = require('../src/services/faturaEslestirmeService');

describe('fatura 3-way match', () => {
  let app, pool;
  before(() => {
    ({ app, pool } = createApp());
  });

  it('eşleştirme kaydı üretir (alış)', async () => {
    const faturaId = await withTransaction(pool, async (client) => {
      const cari = await client.query(`SELECT id FROM cariler ORDER BY id LIMIT 1`);
      const stok = await client.query(`SELECT id FROM stoklar ORDER BY id LIMIT 1`);
      if (!cari.rows[0] || !stok.rows[0]) return null;
      const no = `AF-3W-${Date.now()}`;
      const f = await client.query(
        `INSERT INTO faturalar (fatura_no, cari_id, fatura_turu, toplam_tutar, durum)
         VALUES ($1,$2,'Alis',100,'Taslak') RETURNING id`,
        [no, cari.rows[0].id]
      );
      await client.query(
        `INSERT INTO fatura_detaylari (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar)
         VALUES ($1,$2,10,10,100)`,
        [f.rows[0].id, stok.rows[0].id]
      );
      return f.rows[0].id;
    });

    if (!faturaId) {
      console.log('SKIP 3way — seed eksik');
      return;
    }

    const row = await withTransaction(pool, (client) => faturaEslestir(client, faturaId));
    assert.ok(row.id);
    assert.ok(['Bekliyor', 'Uyumlu', 'FiyatFark', 'MiktarFark', 'Askida'].includes(row.sonuc));

    const api = await request(app, 'GET', `/fatura-kontrolleri?fatura_id=${faturaId}`);
    assert.equal(api.status, 200);
    assert.ok(Array.isArray(api.json));
    assert.ok(api.json.some((r) => Number(r.fatura_id) === Number(faturaId)));
  });

  it('satış faturasında 3-way reddeder', async () => {
    const faturaId = await withTransaction(pool, async (client) => {
      const cari = await client.query(`SELECT id FROM cariler ORDER BY id LIMIT 1`);
      const stok = await client.query(`SELECT id FROM stoklar ORDER BY id LIMIT 1`);
      if (!cari.rows[0] || !stok.rows[0]) return null;
      const f = await client.query(
        `INSERT INTO faturalar (fatura_no, cari_id, fatura_turu, toplam_tutar)
         VALUES ($1,$2,'Satis',50) RETURNING id`,
        [`SF-3W-${Date.now()}`, cari.rows[0].id]
      );
      await client.query(
        `INSERT INTO fatura_detaylari (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar)
         VALUES ($1,$2,1,50,50)`,
        [f.rows[0].id, stok.rows[0].id]
      );
      return f.rows[0].id;
    });
    if (!faturaId) return;

    let status = 200;
    try {
      await withTransaction(pool, (client) => faturaEslestir(client, faturaId));
    } catch (e) {
      status = e.status || 500;
    }
    assert.equal(status, 400);
  });
});
