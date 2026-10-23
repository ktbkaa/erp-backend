const { cariHareketEkle } = require('./cariHareketService');
const {
  fisOlustur,
  kaynakFisVarMi,
  hesapIdCoz,
  round2,
} = require('./muhasebeMotorService');

async function kuralBul(client, belgeTipi) {
  const r = await client.query(
    `SELECT * FROM hesap_belirleme_kurallari
     WHERE belge_tipi=$1 AND aktif=TRUE
     ORDER BY CASE WHEN kural_kodu LIKE '%_TR' THEN 0 ELSE 1 END
     LIMIT 1`,
    [belgeTipi]
  );
  return r.rows[0] || null;
}

async function vergiOran(client, ulkeKodu, oran) {
  const r = await client.query(
    `
    SELECT vk.vergi_kodu, vk.indirilecek_hesap_kodu, vk.hesaplanan_hesap_kodu, vo.oran
    FROM finans_vergi_kodlari vk
    JOIN finans_vergi_oranlari vo ON vo.vergi_kod_id = vk.id
    WHERE vk.ulke_kodu=$1 AND vk.aktif
      AND vo.gecerlilik_baslangic <= CURRENT_DATE
      AND (vo.gecerlilik_bitis IS NULL OR vo.gecerlilik_bitis >= CURRENT_DATE)
      AND ABS(vo.oran - $2) < 0.01
    ORDER BY vo.gecerlilik_baslangic DESC
    LIMIT 1
    `,
    [ulkeKodu || 'TR', Number(oran) || 20]
  );
  return r.rows[0] || null;
}

/**
 * Onaylı faturadan muhasebe belgesi + cari hareket.
 * Idempotent: aynı fatura ikinci kez işlenmez.
 */
async function faturadanMuhasebe(client, faturaId, { kullaniciKodu = null, ulkeKodu = 'TR' } = {}) {
  const f = await client.query(`SELECT * FROM faturalar WHERE id=$1 FOR UPDATE`, [faturaId]);
  if (!f.rows[0]) throw Object.assign(new Error('Fatura bulunamadı.'), { status: 404 });
  const fatura = f.rows[0];

  const tip = String(fatura.fatura_turu || '').toLowerCase().includes('alis') ? 'Alis' : 'Satis';
  const kaynakTip = tip === 'Alis' ? 'ALIS_FATURA' : 'SATIS_FATURA';

  const mevcut = await kaynakFisVarMi(client, {
    firmaId: fatura.firma_id,
    kaynakBelgeTipi: kaynakTip,
    kaynakBelgeId: faturaId,
  });
  if (mevcut) {
    throw Object.assign(
      new Error(`Fatura zaten muhasebeleştirilmiş (fiş ${mevcut.belge_no}).`),
      { status: 409, kod: 'MUKERRER_FIS', muhasebe_belge_id: mevcut.id }
    );
  }

  const mal = round2(fatura.mal_hizmet_toplam || fatura.toplam_tutar || 0);
  const kdv = round2(fatura.toplam_kdv || 0);
  const odenecek = round2(fatura.odenecek_tutar || mal + kdv);
  if (odenecek <= 0) throw Object.assign(new Error('Fatura tutarı sıfır.'), { status: 400 });

  const kural = await kuralBul(client, tip);
  if (!kural) {
    throw Object.assign(new Error(`Hesap belirleme kuralı yok: ${tip}. Finans → Hesap Belirleme Kuralları.`), {
      status: 400,
      kod: 'KURAL_YOK',
    });
  }

  const ulke = ulkeKodu || 'TR';
  const lines = [];

  if (tip === 'Satis') {
    const alici = await hesapIdCoz(client, { hesap_kodu: kural.borc_hesap_kodu, ulke_kodu: ulke });
    const gelir = await hesapIdCoz(client, { hesap_kodu: kural.alacak_hesap_kodu, ulke_kodu: ulke });
    lines.push({
      hesap_id: alici, borc: odenecek, alacak: 0,
      cari_id: fatura.cari_id, aciklama: fatura.fatura_no,
    });
    lines.push({
      hesap_id: gelir, borc: 0, alacak: mal,
      aciklama: fatura.fatura_no,
    });
    if (kdv > 0) {
      const vo = await vergiOran(client, ulke, fatura.kdv_oran_varsayilan || 20);
      const kdvKod = vo?.hesaplanan_hesap_kodu || '391.01.001';
      const kdvHesap = await hesapIdCoz(client, { hesap_kodu: kdvKod, ulke_kodu: ulke });
      lines.push({
        hesap_id: kdvHesap, borc: 0, alacak: kdv,
        vergi_kodu: vo?.vergi_kodu || 'KDV20', aciklama: `KDV ${fatura.fatura_no}`,
      });
    }
  } else {
    const stok = await hesapIdCoz(client, { hesap_kodu: kural.borc_hesap_kodu, ulke_kodu: ulke });
    const satici = await hesapIdCoz(client, { hesap_kodu: kural.alacak_hesap_kodu, ulke_kodu: ulke });
    lines.push({
      hesap_id: stok, borc: mal, alacak: 0, aciklama: fatura.fatura_no,
    });
    if (kdv > 0) {
      const vo = await vergiOran(client, ulke, fatura.kdv_oran_varsayilan || 20);
      const kdvKod = vo?.indirilecek_hesap_kodu || '191.01.001';
      const kdvHesap = await hesapIdCoz(client, { hesap_kodu: kdvKod, ulke_kodu: ulke });
      lines.push({
        hesap_id: kdvHesap, borc: kdv, alacak: 0,
        vergi_kodu: vo?.vergi_kodu || 'KDV20', aciklama: `KDV ${fatura.fatura_no}`,
      });
    }
    lines.push({
      hesap_id: satici, borc: 0, alacak: odenecek,
      cari_id: fatura.cari_id, aciklama: fatura.fatura_no,
    });
  }

  const fis = await fisOlustur(client, {
    firmaId: fatura.firma_id || null,
    ulkeKodu: ulke,
    fisTipi: 'Mahsup',
    belgeTarihi: fatura.fatura_tarihi || null,
    aciklama: `${tip} fatura ${fatura.fatura_no}`,
    paraBirimi: fatura.para_birimi || 'TRY',
    kur: fatura.kur || 1,
    lines,
    kaynakBelgeTipi: kaynakTip,
    kaynakBelgeId: faturaId,
    olusturanKullanici: kullaniciKodu,
    kesinlestir: true,
  });

  if (tip === 'Satis') {
    await cariHareketEkle(client, {
      cariId: fatura.cari_id,
      yon: 'Borc',
      tutar: odenecek,
      belgeTipi: 'SATIS_FATURA',
      belgeId: faturaId,
      aciklama: `Satış fatura ${fatura.fatura_no}`,
    });
  } else {
    await cariHareketEkle(client, {
      cariId: fatura.cari_id,
      yon: 'Alacak',
      tutar: odenecek,
      belgeTipi: 'ALIS_FATURA',
      belgeId: faturaId,
      aciklama: `Alış fatura ${fatura.fatura_no}`,
    });
  }

  await client.query(
    `UPDATE faturalar SET muhasebelesti=TRUE, muhasebe_belge_id=$2, durum=COALESCE(durum,'Onayli')
     WHERE id=$1`,
    [faturaId, fis.id]
  ).catch(async () => {
    await client.query(
      `UPDATE faturalar SET muhasebelesti=TRUE WHERE id=$1`,
      [faturaId]
    ).catch(() => {});
  });

  return {
    muhasebe_belge_id: fis.id,
    belge_no: fis.belge_no,
    tutar: odenecek,
    mal_hizmet: mal,
    kdv,
    kural,
    kullaniciKodu,
    satir_sayisi: lines.length,
  };
}

module.exports = { faturadanMuhasebe, kuralBul };
