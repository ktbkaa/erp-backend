/**
 * Stok hareketi → muhasebe fişi (opsiyonel).
 * Parametre STOK_MUHASEBE=Evet ve account_determination_rules(STOK_HAREKET) gerekir.
 * Giriş: borç stok (150) / alacak geçici (veya tersi şablon).
 * Çıkış: borç COGS (600) / alacak stok (150).
 */
const { parametreAl } = require('../utils/yetki');
const { createJournalEntry, hasSourceJournalEntry } = require('./muhasebeMotorService');

async function maybePostStockJournal(client, { hareket, satir, kullaniciKodu = null } = {}) {
  const acik = String(await parametreAl(client, 'STOK_MUHASEBE', 'Hayir')).toLowerCase() === 'evet';
  if (!acik || !hareket?.id || !satir) return null;

  const qty = Number(satir.quantity) || 0;
  if (qty <= 0) return null;

  let birim = satir.uom_cost != null ? Number(satir.uom_cost) : null;
  if (birim == null) {
    const c = await client.query(`SELECT last_cost FROM items WHERE id=$1`, [satir.item_id]);
    birim = c.rows[0]?.last_cost != null ? Number(c.rows[0].last_cost) : null;
  }
  if (birim == null || !(birim > 0)) return null;

  const tutar = Math.round(qty * birim * 100) / 100;
  if (tutar <= 0) return null;

  const kaynakBelgeTipi = 'STOK_HAREKET_SATIR';
  const kaynakBelgeId = satir.id || null;
  if (kaynakBelgeId) {
    const mevcut = await hasSourceJournalEntry(client, {
      firmaId: hareket.company_id,
      kaynakBelgeTipi,
      kaynakBelgeId,
    });
    if (mevcut) return mevcut;
  }

  const rule = await client.query(
    `SELECT * FROM account_determination_rules
     WHERE document_type='STOK_HAREKET' AND is_active=TRUE
     ORDER BY id LIMIT 1`
  );
  if (!rule.rows[0]) return null;
  const stokHesap = rule.rows[0].debit_account_code || '150';
  const karsit = rule.rows[0].credit_account_code || '600';
  const dir = Number(satir.direction);

  // Giriş: Dr Stok / Cr karşı; Çıkış: Dr COGS / Cr Stok
  const lines = dir === 1
    ? [
      { account_code: stokHesap, debit: tutar, credit: 0, description: `Stok giriş #${hareket.movement_no || hareket.id}` },
      { account_code: karsit, debit: 0, credit: tutar, description: `Stok giriş karşı #${hareket.movement_no || hareket.id}` },
    ]
    : [
      { account_code: karsit, debit: tutar, credit: 0, description: `Stok çıkış COGS #${hareket.movement_no || hareket.id}` },
      { account_code: stokHesap, debit: 0, credit: tutar, description: `Stok çıkış #${hareket.movement_no || hareket.id}` },
    ];

  try {
    return await createJournalEntry(client, {
      firmaId: hareket.company_id || null,
      fisTipi: 'Mahsup',
      description: `Stok hareketi ${hareket.movement_no || hareket.id} satır`,
      lines,
      kaynakBelgeTipi,
      kaynakBelgeId,
      olusturanKullanici: kullaniciKodu,
      status: 'Taslak',
    });
  } catch (err) {
    // Hesap planı eksikse stok işlemini bozma
    if (err?.kod === 'HESAP_ZORUNLU' || err?.status === 400) return null;
    throw err;
  }
}

module.exports = { maybePostStockJournal };
