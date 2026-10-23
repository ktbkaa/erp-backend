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
  'musteri_fatura_no', 'proje_kodu', 'firma_id', 'is_yeri_id', 'fiyat_liste_id', 'depo_id',
  'odeme_sekli', 'odeme_kosulu', 'odeme_plani', 'teslimat_kosulu', 'vade_tarihi', 'vade_gun',
  'odeme_durumu', 'odenen_tutar', 'kalan_tutar', 'fatura_kaynak_id', 'iade_mi',
  'not_public', 'not_internal', 'olusturan_kullanici', 'onaylayan_kullanici',
  'para_birimi', 'kur', 'kur_tipi', 'kur_secenegi', 'bolge', 'satis_temsilcisi',
  'sevk_adresi', 'aciklama', 'aciklama_2', 'aciklama_3', 'senaryo', 'fatura_tipi', 'fatura_tarihi',
  'odeme_vadesi_gun', 'mal_kabul_id', 'siparis_id', 'irsaliye_id',
  'e_belge_durum', 'belge_seri', 'belge_sira', 'gib_no', 'ettn', 'ozellestirme_no',
  'posta_kutusu_alias', 'portal_iletildigi_tarih',
  'e_ticaret_web', 'e_ticaret_ad', 'e_ticaret_soyad', 'e_ticaret_email',
  'sevk_cari_id', 'sevk_adres_tipi', 'sevk_ad', 'sevk_soyad',
  'sevk_adres1', 'sevk_adres2', 'sevk_adres3', 'sevk_tel1', 'sevk_tel2',
  'sevk_il', 'sevk_ilce', 'sevk_ulke', 'sevk_posta_kodu', 'gumruk',
  'fatura_adres1', 'fatura_adres2', 'fatura_adres3', 'fatura_posta_kodu',
  'fatura_ulke', 'fatura_il', 'fatura_ilce',
  'sozlesme_kodu', 'cari_unvan', 'cari_unvan2', 'vergi_dairesi', 'vergi_no',
  'tevkifat_kodu', 'tevkifat_oran', 'tevkifat_tutari', 'vergi_semasi', 'ozel_hareket_tipi',
  'fin_vade_tarihi', 'fin_vade_gun', 'stok_tarihi',
  'yazdirildi', 'yerel_para_cikti',
  'fatura_alti_iskonto', 'toplam_otv', 'toplam_tevkifat', 'toplam_bandrol',
  'hareket_kodu_id', 'kaynak_belge_tipi', 'kaynak_belge_id', 'durum',
];

const FATURA_SATIR = [
  'satir_tipi', 'satir_aciklama', 'satir_aciklama2', 'satir_aciklama3',
  'net_birim_fiyat', 'tutar_ht', 'tutar_ttc', 'urun_tipi',
  'maliyet_birim', 'depo_id', 'parti_id', 'seri_no', 'fiyat_liste_id',
  'para_birimi', 'kur_tipi', 'kur', 'yerel_birim_fiyat', 'yerel_para_tutari',
  'iskonto_oran', 'iskonto_oran2', 'iskonto_oran3',
  'iskonto_tutari', 'iskonto_tutari2', 'iskonto_tutari3',
  'kdv_kodu', 'kdv_oran', 'kdv_tutari', 'kdv_durumu',
  'tevkifat_kodu', 'tevkifat_oran', 'tevkifat_tutari',
  'otv_kodu', 'otv_oran', 'otv_tutari', 'bandrol_oran', 'bandrol_tutari',
  'vergi_semasi', 'vade_tarihi', 'vade_gun', 'musteri_referans_kod',
  'proje_kodu', 'siparis_no', 'birim', 'sira_no',
  'irsaliye_satir_id', 'siparis_detay_id',
  'kaynak_belge_tipi', 'kaynak_belge_id', 'kaynak_belge_satir_id',
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
