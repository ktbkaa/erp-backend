const { sonrakiBelgeNo } = require('../utils/belgeNo');
const { cariHareketEkle } = require('./cariHareketService');

async function kuralBul(client, belgeTipi) {
  const r = await client.query(
    `SELECT * FROM hesap_belirleme_kurallari WHERE belge_tipi=$1 AND aktif=TRUE LIMIT 1`,
    [belgeTipi]
  );
  return r.rows[0] || null;
}

async function hesapId(client, kod) {
  const r = await client.query(`SELECT id FROM muhasebe_hesaplari WHERE hesap_kodu=$1`, [kod]);
  return r.rows[0]?.id || null;
}

/**
 * Onaylı faturadan muhasebe belgesi + cari hareket önerisi/oluşturma.
 */
async function faturadanMuhasebe(client, faturaId, { kullaniciKodu = null } = {}) {
  const f = await client.query(`SELECT * FROM faturalar WHERE id=$1 FOR UPDATE`, [faturaId]);
  if (!f.rows[0]) throw Object.assign(new Error('Fatura bulunamadı.'), { status: 404 });
  const fatura = f.rows[0];
  const tutar = Number(fatura.odenecek_tutar || fatura.toplam_tutar || 0);
  if (tutar <= 0) throw Object.assign(new Error('Fatura tutarı sıfır.'), { status: 400 });

  const tip = String(fatura.fatura_turu || '').toLowerCase().includes('alis') ? 'Alis' : 'Satis';
  const kural = await kuralBul(client, tip);
  if (!kural) throw Object.assign(new Error(`Hesap kuralı yok: ${tip}`), { status: 400 });

  const borcId = await hesapId(client, kural.borc_hesap_kodu);
  const alacakId = await hesapId(client, kural.alacak_hesap_kodu);
  if (!borcId || !alacakId) {
    throw Object.assign(new Error('Muhasebe hesap kartı eksik (120/150/320/600 seed).'), { status: 400 });
  }

  const no = await sonrakiBelgeNo(client, 'MUHASEBE_BELGE').catch(async () => {
    // seri yoksa basit
    const n = await client.query(`SELECT COUNT(*)::int+1 AS n FROM muhasebe_belgeleri`);
    return `MB${String(n.rows[0].n).padStart(5, '0')}`;
  });

  const bel = await client.query(
    `INSERT INTO muhasebe_belgeleri (belge_no, belge_tarihi, aciklama, durum)
     VALUES ($1, CURRENT_DATE, $2, 'Onayli') RETURNING id`,
    [no, `${tip} fatura ${fatura.fatura_no}`]
  ).catch(async (err) => {
    // kolon farkları için minimal insert
    if (String(err.message).includes('column')) {
      return client.query(
        `INSERT INTO muhasebe_belgeleri (belge_no, aciklama) VALUES ($1,$2) RETURNING id`,
        [no, `${tip} fatura ${fatura.fatura_no}`]
      );
    }
    throw err;
  });
  const belgeId = bel.rows[0].id;

  // kalemler — şema değişken olabilir
  try {
    await client.query(
      `INSERT INTO muhasebe_belge_kalemleri (belge_id, hesap_id, borc, alacak, aciklama)
       VALUES ($1,$2,$3,0,$4), ($1,$5,0,$3,$4)`,
      [belgeId, borcId, tutar, fatura.fatura_no, alacakId]
    );
  } catch (_) {
    await client.query(
      `INSERT INTO muhasebe_belge_kalemleri (belge_id, hesap_kodu, borc_tutar, alacak_tutar)
       VALUES ($1,$2,$3,0), ($1,$4,0,$3)`,
      [belgeId, kural.borc_hesap_kodu, tutar, kural.alacak_hesap_kodu]
    ).catch(() => {});
  }

  // Cari hareket
  if (tip === 'Satis') {
    await cariHareketEkle(client, {
      cariId: fatura.cari_id,
      yon: 'Borc',
      tutar,
      belgeTipi: 'SATIS_FATURA',
      belgeId: faturaId,
      aciklama: `Satış fatura ${fatura.fatura_no}`,
    });
  } else {
    await cariHareketEkle(client, {
      cariId: fatura.cari_id,
      yon: 'Alacak',
      tutar,
      belgeTipi: 'ALIS_FATURA',
      belgeId: faturaId,
      aciklama: `Alış fatura ${fatura.fatura_no}`,
    });
  }

  return { muhasebe_belge_id: belgeId, belge_no: no, tutar, kural, kullaniciKodu };
}

module.exports = { faturadanMuhasebe, kuralBul };
