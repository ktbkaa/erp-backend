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
  const r = await pool.query(`SELECT id FROM muhasebe_hesaplari WHERE hesap_kodu=$1`, [kod]);
  assert.ok(r.rows[0], `hesap yok: ${kod}`);
  return r.rows[0].id;
}

describe('finans muhasebe motor', () => {
  before(async () => {
    // migration 041 uygulanmış olmalı
    const t = await pool.query(`SELECT to_regclass('public.finans_ulke_paketleri') AS t`);
    assert.ok(t.rows[0].t, 'finans_ulke_paketleri yok — npm run migrate');
  });

  it('1) dengeli fiş kaydedilir ve kesinleşir', async () => {
    const h100 = await hesapId('100.01.001');
    const h120 = await hesapId('120.01.001');
    const fis = await withTransaction(pool, (c) => fisOlustur(c, {
      ulkeKodu: 'TR',
      belgeTarihi: new Date().toISOString().slice(0, 10),
      aciklama: 'test dengeli',
      lines: [
        { hesap_id: h100, borc: 100, alacak: 0 },
        { hesap_id: h120, borc: 0, alacak: 100 },
      ],
      kesinlestir: true,
      olusturanKullanici: 'test',
    }));
    assert.equal(fis.durum, 'Onayli');
    assert.equal(fis.toplam_borc, 100);
  });

  it('2) dengesiz fiş kesinleştirilemez', () => {
    assert.throws(
      () => assertLines([
        { hesap_id: 1, borc: 50, alacak: 0 },
        { hesap_id: 2, borc: 0, alacak: 40 },
      ]),
      /dengeli değil|FIS_DENGESIZ/i
    );
  });

  it('3) pasif / ana hesapla kesinleştirme engellenir', async () => {
    const ana = await pool.query(`SELECT id FROM muhasebe_hesaplari WHERE hesap_tipi='Ana' LIMIT 1`);
    const h120 = await hesapId('120.01.001');
    await assert.rejects(
      () => withTransaction(pool, (c) => fisOlustur(c, {
        lines: [
          { hesap_id: ana.rows[0].id, borc: 10, alacak: 0 },
          { hesap_id: h120, borc: 0, alacak: 10 },
        ],
        kesinlestir: true,
      })),
      /Doğrudan|HESAP_TIPI/i
    );
  });

  it('4) aynı kaynak belge ikinci kez mükerrer fiş üretmez', async () => {
    const h100 = await hesapId('100.01.001');
    const h120 = await hesapId('120.01.001');
    const kaynakId = 900001 + Math.floor(Math.random() * 1000);
    await withTransaction(pool, (c) => fisOlustur(c, {
      lines: [
        { hesap_id: h100, borc: 25, alacak: 0 },
        { hesap_id: h120, borc: 0, alacak: 25 },
      ],
      kaynakBelgeTipi: 'TEST_BELGE',
      kaynakBelgeId: kaynakId,
      kesinlestir: true,
    }));
    await assert.rejects(
      () => withTransaction(pool, (c) => fisOlustur(c, {
        lines: [
          { hesap_id: h100, borc: 25, alacak: 0 },
          { hesap_id: h120, borc: 0, alacak: 25 },
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
        { hesap_id: h100, borc: 80, alacak: 0 },
        { hesap_id: h600, borc: 0, alacak: 80 },
      ],
      kesinlestir: true,
    }));
    const ters = await withTransaction(pool, (c) => fisTersKayit(c, fis.id, { kullaniciKodu: 'test' }));
    assert.ok(ters.id);
    const orig = await pool.query(`SELECT ters_belge_id, kilitli FROM muhasebe_belgeleri WHERE id=$1`, [fis.id]);
    assert.equal(Number(orig.rows[0].ters_belge_id), ters.id);
    assert.equal(orig.rows[0].kilitli, true);
  });

  it('6) kapalı döneme kesin kayıt engellenir', async () => {
    const donem = await pool.query(
      `SELECT id FROM muhasebe_donemleri WHERE durum IN ('Acik','YenidenAcik') ORDER BY id DESC LIMIT 1`
    );
    assert.ok(donem.rows[0]);
    await withTransaction(pool, (c) => donemKapat(c, donem.rows[0].id, { kullaniciKodu: 'test' }));
    const d = await pool.query(`SELECT baslangic_tarihi FROM muhasebe_donemleri WHERE id=$1`, [donem.rows[0].id]);
    const h100 = await hesapId('100.01.001');
    const h120 = await hesapId('120.01.001');
    await assert.rejects(
      () => withTransaction(pool, (c) => fisOlustur(c, {
        belgeTarihi: d.rows[0].baslangic_tarihi,
        lines: [
          { hesap_id: h100, borc: 5, alacak: 0 },
          { hesap_id: h120, borc: 0, alacak: 5 },
        ],
        kesinlestir: true,
      })),
      /Kapalı dönem|DONEM_KAPALI/i
    );
    await withTransaction(pool, (c) => donemYenidenAc(c, donem.rows[0].id, { kullaniciKodu: 'test' }));
  });

  it('7) ülke paketleri seed', async () => {
    const r = await pool.query(`SELECT ulke_kodu FROM finans_ulke_paketleri ORDER BY 1`);
    const codes = r.rows.map((x) => x.ulke_kodu);
    assert.deepEqual(codes, ['AZ', 'DE', 'NL', 'TR']);
  });

  it('8) vergi oranı tarihli yapılandırma', async () => {
    const r = await pool.query(
      `
      SELECT vo.oran FROM finans_vergi_kodlari vk
      JOIN finans_vergi_oranlari vo ON vo.vergi_kod_id=vk.id
      WHERE vk.ulke_kodu='TR' AND vk.vergi_kodu='KDV20'
      `
    );
    assert.equal(Number(r.rows[0].oran), 20);
  });
});
