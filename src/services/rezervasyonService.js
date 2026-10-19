const { sonrakiBelgeNo } = require('../utils/belgeNo');
const { depoBakiyeListesi } = require('./stokHareketService');

async function kullanilabilirNet(pool, stokId, depoId = null) {
  const bakiyeler = await depoBakiyeListesi(pool, { stokId, stokStatu: 'Kullanilabilir', depoId });
  const bakiye = bakiyeler.reduce((s, b) => s + Number(b.bakiye), 0);
  const params = [stokId];
  let extra = '';
  if (depoId) {
    params.push(depoId);
    extra = ` AND depo_id = $${params.length}`;
  }
  const rez = await pool.query(
    `SELECT COALESCE(SUM(kalan_miktar),0)::numeric AS rezerve
     FROM stok_rezervasyonlari WHERE stok_id=$1 AND durum='Aktif' ${extra}`,
    params
  );
  const rezerve = Number(rez.rows[0].rezerve);
  return { bakiye, rezerve, kullanilabilir: bakiye - rezerve };
}

/**
 * Sipariş onayında / açıkça: satırları rezerve et.
 */
async function siparisRezerveEt(client, siparisId, { depoId = null } = {}) {
  const sip = await client.query(`SELECT * FROM siparisler WHERE id=$1 FOR UPDATE`, [siparisId]);
  if (!sip.rows[0]) throw Object.assign(new Error('Sipariş bulunamadı.'), { status: 404 });
  const satirlar = await client.query(
    `SELECT * FROM siparis_detaylari WHERE siparis_id=$1 ORDER BY id`,
    [siparisId]
  );
  const olusan = [];
  for (const s of satirlar.rows) {
    const hedef = Number(s.miktar) - Number(s.rezerve_miktar || 0) - Number(s.sevk_edilen_miktar || 0);
    if (hedef <= 1e-9) continue;
    const net = await kullanilabilirNet(client, s.stok_id, depoId);
    if (net.kullanilabilir + 1e-9 < hedef) {
      throw Object.assign(
        new Error(`Rezervasyon için yetersiz stok: stok_id=${s.stok_id} kullanılabilir=${net.kullanilabilir} ihtiyaç=${hedef}`),
        { status: 409, detay: net }
      );
    }
    const no = await sonrakiBelgeNo(client, 'REZERVASYON');
    const r = await client.query(
      `INSERT INTO stok_rezervasyonlari
        (rezervasyon_no, siparis_id, siparis_detay_id, stok_id, depo_id, miktar, kalan_miktar, durum)
       VALUES ($1,$2,$3,$4,$5,$6,$6,'Aktif') RETURNING *`,
      [no, siparisId, s.id, s.stok_id, depoId, hedef]
    );
    await client.query(
      `UPDATE siparis_detaylari SET rezerve_miktar = COALESCE(rezerve_miktar,0) + $2 WHERE id=$1`,
      [s.id, hedef]
    );
    olusan.push(r.rows[0]);
  }
  return olusan;
}

/** İrsaliye onayında rezervasyonu tüket */
async function rezervasyonTuket(client, { siparisDetayId, miktar }) {
  let kalan = Number(miktar);
  const rezler = await client.query(
    `SELECT * FROM stok_rezervasyonlari
     WHERE siparis_detay_id=$1 AND durum='Aktif' ORDER BY id FOR UPDATE`,
    [siparisDetayId]
  );
  for (const r of rezler.rows) {
    if (kalan <= 1e-9) break;
    const tuket = Math.min(Number(r.kalan_miktar), kalan);
    const yeniKalan = Number(r.kalan_miktar) - tuket;
    await client.query(
      `UPDATE stok_rezervasyonlari SET kalan_miktar=$2, durum=$3 WHERE id=$1`,
      [r.id, yeniKalan, yeniKalan <= 1e-9 ? 'Tuketildi' : 'Aktif']
    );
    await client.query(
      `UPDATE siparis_detaylari SET rezerve_miktar = GREATEST(0, COALESCE(rezerve_miktar,0) - $2) WHERE id=$1`,
      [siparisDetayId, tuket]
    );
    kalan -= tuket;
  }
}

async function rezervasyonIptalSiparis(client, siparisId) {
  const rezler = await client.query(
    `SELECT * FROM stok_rezervasyonlari WHERE siparis_id=$1 AND durum='Aktif' FOR UPDATE`,
    [siparisId]
  );
  for (const r of rezler.rows) {
    await client.query(
      `UPDATE stok_rezervasyonlari SET durum='Iptal', kalan_miktar=0, iptal_tarihi=NOW() WHERE id=$1`,
      [r.id]
    );
    if (r.siparis_detay_id) {
      await client.query(
        `UPDATE siparis_detaylari SET rezerve_miktar = GREATEST(0, COALESCE(rezerve_miktar,0) - $2) WHERE id=$1`,
        [r.siparis_detay_id, r.kalan_miktar]
      );
    }
  }
}

module.exports = {
  kullanilabilirNet,
  siparisRezerveEt,
  rezervasyonTuket,
  rezervasyonIptalSiparis,
};
