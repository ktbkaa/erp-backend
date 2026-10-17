/**
 * Belge başlık/satır opsiyonel alanları (021).
 * Kaynak: Dolibarr commande/facture, ERPNext SO/SI, Sage fulfillment.
 */

const SIPARIS_BASLIK = [
  'musteri_siparis_no', 'proje_kodu', 'is_yeri_id', 'depo_id', 'fiyat_liste_id',
  'teslim_tarihi', 'gecerlilik_tarihi', 'kur', 'iskonto_oran', 'iskonto_tutari',
  'ara_toplam', 'toplam_kdv', 'genel_toplam', 'odeme_sekli', 'odeme_kosulu', 'teslimat_kosulu',
  'sevk_adresi', 'sevk_il', 'sevk_ilce', 'sevk_ulke', 'sevk_posta_kodu',
  'para_birimi', 'aciklama', 'not_public', 'not_internal', 'siparis_kaynak',
  'firma_id', 'olusturan_kullanici', 'onaylayan_kullanici',
];

const SIPARIS_SATIR = [
  'satir_aciklama', 'teslim_tarihi', 'depo_id', 'net_birim_fiyat', 'tutar_ht',
  'tutar_ttc', 'urun_tipi', 'maliyet_birim', 'kar_marji', 'iskonto_oran',
  'iskonto_tutari', 'kdv_oran', 'kdv_tutari', 'sira_no',
];

const FATURA_BASLIK = [
  'musteri_fatura_no', 'proje_kodu', 'firma_id', 'is_yeri_id', 'fiyat_liste_id',
  'odeme_sekli', 'odeme_kosulu', 'teslimat_kosulu', 'vade_tarihi', 'odeme_durumu', 'odenen_tutar',
  'kalan_tutar', 'fatura_kaynak_id', 'iade_mi', 'not_public', 'not_internal',
  'olusturan_kullanici', 'onaylayan_kullanici', 'para_birimi', 'kur',
  'sevk_adresi', 'aciklama', 'senaryo', 'fatura_tipi', 'fatura_tarihi',
  'odeme_vadesi_gun', 'mal_kabul_id', 'siparis_id', 'irsaliye_id',
];

const FATURA_SATIR = [
  'satir_aciklama', 'net_birim_fiyat', 'tutar_ht', 'tutar_ttc', 'urun_tipi',
  'maliyet_birim', 'depo_id', 'parti_id', 'seri_no', 'iskonto_oran',
  'iskonto_tutari', 'kdv_oran', 'kdv_tutari', 'birim', 'sira_no',
];

function pickFields(body, keys) {
  const out = {};
  if (!body || typeof body !== 'object') return out;
  for (const k of keys) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

/** INSERT için kolon/değer genişletici */
function appendInsert(cols, vals, extras) {
  for (const [k, v] of Object.entries(extras || {})) {
    cols.push(k);
    vals.push(v);
  }
  return { cols, vals, placeholders: vals.map((_, i) => `$${i + 1}`).join(',') };
}

/** UPDATE SET parçası */
function buildUpdateSets(extras, startIdx = 2) {
  const sets = [];
  const params = [];
  let i = startIdx;
  for (const [k, v] of Object.entries(extras || {})) {
    sets.push(`${k} = $${i++}`);
    params.push(v);
  }
  return { sets, params };
}

module.exports = {
  SIPARIS_BASLIK,
  SIPARIS_SATIR,
  FATURA_BASLIK,
  FATURA_SATIR,
  pickFields,
  appendInsert,
  buildUpdateSets,
};
