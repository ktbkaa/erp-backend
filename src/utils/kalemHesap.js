/**
 * Profesyonel satır tutarı hesabı (TR satınalma / satış).
 * Çoklu iskonto zinciri, KDV dahil/hariç, tevkifat, ÖTV, kur.
 */

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function round6(n) {
  return Math.round((Number(n) || 0) * 1e6) / 1e6;
}

/**
 * @param {object} p
 * @param {number} p.miktar
 * @param {number} p.birim_fiyat  belge PB cinsinden birim fiyat
 * @param {number} [p.iskonto_oran]
 * @param {number} [p.iskonto_oran2]
 * @param {number} [p.iskonto_oran3]
 * @param {number} [p.kdv_oran]
 * @param {'Haric'|'Dahil'|string} [p.kdv_durumu]
 * @param {number} [p.tevkifat_oran]
 * @param {number} [p.otv_oran]
 * @param {number} [p.kur]  belge PB → yerel PB
 */
function satirHesapla({
  miktar,
  birim_fiyat,
  iskonto_oran = 0,
  iskonto_oran2 = 0,
  iskonto_oran3 = 0,
  kdv_oran = 20,
  kdv_durumu = 'Haric',
  tevkifat_oran = 0,
  otv_oran = 0,
  kur = 1,
} = {}) {
  const m = Number(miktar) || 0;
  const f = Number(birim_fiyat) || 0;
  const isk1 = Number(iskonto_oran) || 0;
  const isk2 = Number(iskonto_oran2) || 0;
  const isk3 = Number(iskonto_oran3) || 0;
  const kdvOran = Number(kdv_oran) || 0;
  const tevOran = Number(tevkifat_oran) || 0;
  const otvOran = Number(otv_oran) || 0;
  const k = Number(kur) > 0 ? Number(kur) : 1;
  const dahil = String(kdv_durumu || 'Haric').toLocaleLowerCase('tr').startsWith('dahil');

  let birimNet = f;
  if (dahil && kdvOran > 0) {
    birimNet = f / (1 + kdvOran / 100);
  }

  const brut = m * birimNet;
  const iskonto_tutari = round2(brut * (isk1 / 100));
  const after1 = brut - iskonto_tutari;
  const iskonto_tutari2 = round2(after1 * (isk2 / 100));
  const after2 = after1 - iskonto_tutari2;
  const iskonto_tutari3 = round2(after2 * (isk3 / 100));
  const mal_hizmet_tutari = round2(after2 - iskonto_tutari3);

  const otv_tutari = round2(mal_hizmet_tutari * (otvOran / 100));
  const kdv_matrah = mal_hizmet_tutari + otv_tutari;
  const kdv_tutari = round2(kdv_matrah * (kdvOran / 100));
  const tevkifat_tutari = round2(kdv_tutari * (tevOran / 100));
  const satir_toplam = round2(mal_hizmet_tutari + otv_tutari + kdv_tutari - tevkifat_tutari);

  return {
    iskonto_oran: isk1,
    iskonto_oran2: isk2,
    iskonto_oran3: isk3,
    iskonto_tutari,
    iskonto_tutari2,
    iskonto_tutari3,
    kdv_oran: kdvOran,
    kdv_durumu: dahil ? 'Dahil' : 'Haric',
    kdv_tutari,
    tevkifat_oran: tevOran,
    tevkifat_tutari,
    otv_oran: otvOran,
    otv_tutari,
    mal_hizmet_tutari,
    tutar_ht: mal_hizmet_tutari,
    tutar_ttc: satir_toplam,
    satir_toplam,
    yp_birim_fiyat: round6(birimNet * k),
    yp_tutar: round2(mal_hizmet_tutari * k),
    kur: k,
  };
}

function belgelerToplam(satirlar) {
  let mal = 0;
  let isk = 0;
  let kdv = 0;
  let tev = 0;
  let otv = 0;
  let odenecek = 0;
  for (const s of satirlar) {
    mal += Number(s.mal_hizmet_tutari ?? s.tutar_ht) || 0;
    isk += (Number(s.iskonto_tutari) || 0)
      + (Number(s.iskonto_tutari2) || 0)
      + (Number(s.iskonto_tutari3) || 0);
    kdv += Number(s.kdv_tutari) || 0;
    tev += Number(s.tevkifat_tutari) || 0;
    otv += Number(s.otv_tutari) || 0;
    odenecek += Number(s.satir_toplam ?? s.tutar_ttc
      ?? ((Number(s.mal_hizmet_tutari) || 0) + (Number(s.kdv_tutari) || 0))) || 0;
  }
  return {
    mal_hizmet_toplam: round2(mal),
    ara_toplam: round2(mal),
    toplam_iskonto: round2(isk),
    toplam_kdv: round2(kdv),
    toplam_tevkifat: round2(tev),
    toplam_otv: round2(otv),
    odenecek_tutar: round2(odenecek),
    genel_toplam: round2(odenecek),
    toplam_tutar: round2(odenecek),
  };
}

module.exports = { satirHesapla, belgelerToplam, round2 };
