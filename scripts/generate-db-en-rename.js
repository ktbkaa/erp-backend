/**
 * Türkçe şema → İngilizce RENAME migration + kod dönüşüm haritası üretir.
 * Çalıştırma: node scripts/generate-db-en-rename.js
 *
 * Kurallar:
 * - Yalnızca ALTER ... RENAME (veri silinmez)
 * - schema_migrations dokunulmaz
 * - Görünen UI metinleri (TR label) değişmez; DB/API alan adları EN olur
 */
const fs = require('fs');
const path = require('path');

const inv = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'db-naming', 'schema-inventory.json'), 'utf8'),
);

/** Tablo → İngilizce (ekran / iş adı ile hizalı, snake_case, çoğul) */
const TABLE_MAP = {
  audit_log: 'audit_logs',
  bankalar: 'banks',
  belge_numaralari: 'document_numbers',
  belge_tipleri: 'document_types',
  cari_banka_bilgileri: 'partner_bank_accounts',
  cari_detaylari: 'partner_details',
  cari_dil_tanimlari: 'partner_languages',
  cari_firma_parametreleri: 'partner_company_params',
  cari_hareketleri: 'partner_ledger_entries',
  cari_sevk_adresleri: 'partner_ship_to_addresses',
  cariler: 'partners',
  crm_adaylar: 'crm_leads',
  crm_ajanda: 'crm_calendar_entries',
  crm_faaliyet_planlari: 'crm_activity_plans',
  crm_faaliyet_tipleri: 'crm_activity_types',
  crm_faaliyetler: 'crm_activities',
  crm_firsat_asamalari: 'crm_opportunity_stages',
  crm_firsat_satirlari: 'crm_opportunity_lines',
  crm_firsatlar: 'crm_opportunities',
  crm_gorevler: 'crm_tasks',
  crm_kontaklar: 'crm_contacts',
  depolar: 'warehouses',
  diller: 'languages',
  doviz_kurlari: 'exchange_rates',
  eposta_gonderimleri: 'email_dispatches',
  fatura_detaylari: 'invoice_lines',
  fatura_eslestirme: 'invoice_matches',
  faturalar: 'invoices',
  finans_banka_hesaplari: 'fin_bank_accounts',
  finans_kasa_hesaplari: 'fin_cash_accounts',
  finans_nakit_hareketleri: 'fin_cash_movements',
  finans_ulke_paketleri: 'fin_country_packs',
  finans_vergi_kodlari: 'fin_tax_codes',
  finans_vergi_oranlari: 'fin_tax_rates',
  firmalar: 'companies',
  fiyat_liste_satirlari: 'price_list_lines',
  fiyat_listeleri: 'price_lists',
  hareket_kodlari: 'movement_codes',
  hesap_belirleme_kurallari: 'account_determination_rules',
  ilceler: 'districts',
  irsaliye_satirlari: 'delivery_note_lines',
  irsaliyeler: 'delivery_notes',
  is_merkezleri: 'work_centers',
  is_yerleri: 'plants',
  kategori_tanimlari: 'categories',
  kisiler: 'users',
  kk_capa: 'qc_capa',
  kk_emirleri: 'qc_orders',
  kk_kontrol_planlari: 'qc_control_plans',
  kk_kriterleri: 'qc_criteria',
  kk_olcumler: 'qc_measurements',
  kk_onay_gecmisi: 'qc_approval_history',
  kk_ret_nedenleri: 'qc_rejection_reasons',
  kk_stok_planlari: 'qc_item_plans',
  kk_uygunsuzluklar: 'qc_nonconformances',
  kod_serileri: 'number_series',
  kullanici_depo: 'user_warehouses',
  kullanici_ekran_yetkileri: 'user_screen_permissions',
  kullanici_firma_yetkileri: 'user_company_permissions',
  kullanici_gruplari: 'user_groups',
  // users table may be named differently — check
  mal_kabul_satirlari: 'goods_receipt_lines',
  mal_kabuller: 'goods_receipts',
  mali_yillar: 'fiscal_years',
  mrp_bagimsiz_ihtiyaclar: 'mrp_independent_requirements',
  mrp_calismalari: 'mrp_runs',
  mrp_sonuclar: 'mrp_results',
  muhasebe_belge_kalemleri: 'journal_entry_lines',
  muhasebe_belgeleri: 'journal_entries',
  muhasebe_donemleri: 'accounting_periods',
  muhasebe_hesaplari: 'gl_accounts',
  odeme_kosullari: 'payment_terms',
  olcu_birimleri: 'units_of_measure',
  onay_durumlari: 'approval_statuses',
  onay_kayit_adimlari: 'approval_record_steps',
  onay_kayitlari: 'approval_records',
  onay_kural_hareketleri: 'approval_rule_movements',
  onay_kurallari: 'approval_rules',
  onay_mesaj_sablonlari: 'approval_message_templates',
  onay_modul_kullanimlari: 'approval_module_usages',
  onay_rolleri: 'approval_roles',
  onay_rota_adimlari: 'approval_route_steps',
  onay_rotalari: 'approval_routes',
  onay_yetki_devirleri: 'approval_delegations',
  para_birimleri: 'currencies',
  rota_operasyon_bilesenleri: 'routing_operation_components',
  rota_operasyonlari: 'routing_operations',
  rotalar: 'routings',
  sabit_kiymetler: 'fixed_assets',
  satin_alma_anlasma_satirlari: 'purchase_agreement_lines',
  satin_alma_anlasmalari: 'purchase_agreements',
  satin_alma_siparis_satirlari: 'purchase_order_lines',
  satin_alma_siparisleri: 'purchase_orders',
  satin_alma_talep_satirlari: 'purchase_requisition_lines',
  satin_alma_talepleri: 'purchase_requisitions',
  satin_alma_teklif_istek_satirlari: 'rfq_lines',
  satin_alma_teklif_istekleri: 'rfqs',
  satin_alma_teklif_satirlari: 'purchase_quotation_lines',
  satin_alma_teklifleri: 'purchase_quotations',
  satis_teklif_satirlari: 'sales_quotation_lines',
  satis_teklifleri: 'sales_quotations',
  sayim_belge_satirlari: 'inventory_count_lines',
  sayim_belgeleri: 'inventory_counts',
  schema_migrations: 'schema_migrations',
  sehirler: 'cities',
  sevk_emirleri: 'shipment_orders',
  sevk_emri_satirlari: 'shipment_order_lines',
  siparis_detaylari: 'sales_order_lines',
  siparisler: 'sales_orders',
  sistem_parametreleri: 'system_parameters',
  stok_barkod_okumalari: 'item_barcode_scans',
  stok_barkodlari: 'item_barcodes',
  stok_birim_tanimlari: 'item_uom_conversions',
  stok_depo: 'item_warehouses',
  stok_detaylari: 'item_details',
  stok_dil_tanimlari: 'item_languages',
  stok_hareket_satirlari: 'stock_movement_lines',
  stok_hareketleri: 'stock_movements',
  stok_ikame: 'item_substitutes',
  stok_is_yeri: 'item_plants',
  stok_maliyet_hareket: 'item_cost_movements',
  stok_partileri: 'item_lots',
  stok_rezervasyonlari: 'item_reservations',
  stok_serileri: 'item_serials',
  stok_siniflari: 'item_classes',
  stoklar: 'items',
  tahsilat_odemeler: 'receipts_payments',
  tedarikci_degerlendirme: 'supplier_evaluations',
  tedarikci_irsaliye_satirlari: 'vendor_delivery_note_lines',
  tedarikci_irsaliyeleri: 'vendor_delivery_notes',
  teslimat_kosullari: 'delivery_terms',
  transfer_emirleri: 'transfer_orders',
  transfer_emri_satirlari: 'transfer_order_lines',
  ulkeler: 'countries',
  uretim_emirleri: 'production_orders',
  uretim_emri_bilesenleri: 'production_order_components',
  uretim_emri_operasyon_bilesenleri: 'production_order_operation_components',
  uretim_emri_operasyonlari: 'production_order_operations',
  uretim_emri_tipleri: 'production_order_types',
  uretim_girisleri: 'production_receipts',
  uretim_planlari: 'production_plans',
  uretim_yan_urunler: 'production_byproducts',
  urun_agaci_satirlari: 'bom_lines',
  urun_agaclari: 'boms',
};

/** Token / tam eşleşme sözlüğü (alan adları) — uzun olanlar önce uygulanır */
const TOKEN_MAP = [
  ['kabul_eden_kullanici', 'received_by'],
  ['kabul_edilen', 'accepted_flag'],
  ['kabul_edilen_miktar', 'accepted_quantity'],
  ['sevk_edilen_miktar', 'shipped_quantity'],
  ['irsaliye_edilen_miktar', 'delivered_quantity'],
  ['uretim_tarihi', 'production_date'],
  ['satin_birimi', 'purchase_uom'],
  ['satinalma_talep', 'purchase_requisition_ref'],
  ['adim_adi', 'step_name'],
  ['aktif_adim_sira', 'active_step_no'],
  ['kosul_durumlar', 'condition_statuses'],
  ['teslim_edilen_miktar', 'delivered_quantity'],
  ['teslim_edilen', 'delivered'],
  ['edilen_miktar', 'delivered_quantity'],
  ['kalan_miktar', 'remaining_quantity'],
  ['siparis_miktar', 'order_quantity'],
  ['uretilen_miktar', 'produced_quantity'],
  ['sevk_edilen_miktar', 'shipped_quantity'],
  ['fatura_edilen_miktar', 'invoiced_quantity'],
  ['tablo_adi', 'table_name'],
  ['alan_adi', 'field_name'],
  ['eski_deger', 'old_value'],
  ['yeni_deger', 'new_value'],
  ['islem', 'action'],
  ['kullanici_adi', 'username'],
  ['kullanici_kodu', 'user_code'],
  ['kullanici_grup', 'user_group'],
  ['olusturan_kullanici', 'created_by'],
  ['onaylayan_kullanici', 'approved_by'],
  ['kapatan_kullanici', 'closed_by'],
  ['guncelleyen_kullanici', 'updated_by'],
  ['kayit_tarihi', 'created_at'],
  ['guncelleme_tarihi', 'updated_at'],
  ['kesinlestirme_tarihi', 'posted_at'],
  ['kapanis_tarihi', 'closed_at'],
  ['baslangic_tarihi', 'start_date'],
  ['bitis_tarihi', 'end_date'],
  ['gecerlilik_baslangic', 'valid_from'],
  ['gecerlilik_bitis', 'valid_to'],
  ['fatura_tarihi', 'invoice_date'],
  ['irsaliye_tarihi', 'delivery_date'],
  ['siparis_tarihi', 'order_date'],
  ['teklif_tarihi', 'quotation_date'],
  ['talep_tarihi', 'requisition_date'],
  ['vade_tarihi', 'due_date'],
  ['belge_tarihi', 'document_date'],
  ['hareket_tarihi', 'movement_date'],
  ['fiili_sevk_tarihi', 'actual_ship_date'],
  ['fiili_sevk_zamani', 'actual_ship_time'],
  ['portal_iletildigi_tarih', 'portal_sent_date'],
  ['matbu_belge_tarihi', 'paper_document_date'],
  ['stok_tarihi', 'stock_date'],
  ['fin_vade_tarihi', 'fin_due_date'],
  ['muhasebe_ulke_kodu', 'accounting_country_code'],
  ['islem_ulke_kodu', 'transaction_country_code'],
  ['vergi_ulke_kodu', 'tax_country_code'],
  ['ulke_kodu', 'country_code'],
  ['hesap_plani_kodu', 'chart_of_accounts_code'],
  ['raporlama_cercevesi', 'reporting_framework'],
  ['mali_yil_baslangic_ay', 'fiscal_year_start_month'],
  ['fonksiyonel_pb', 'functional_currency'],
  ['ebelge_saglayici', 'e_document_provider'],
  ['ebelge_notu', 'e_document_note'],
  ['e_belge_durum', 'e_document_status'],
  ['fatura_durumu', 'invoice_status'],
  ['odeme_durumu', 'payment_status'],
  ['odeme_sekli', 'payment_method'],
  ['odeme_kosulu', 'payment_term_code'],
  ['odeme_plani', 'payment_plan'],
  ['odeme_vadesi_gun', 'payment_due_days'],
  ['teslimat_kosulu', 'delivery_term_code'],
  ['mal_hizmet_toplam', 'net_amount'],
  ['toplam_kdv', 'tax_amount'],
  ['odenecek_tutar', 'payable_amount'],
  ['toplam_tutar', 'total_amount'],
  ['genel_toplam', 'grand_total'],
  ['ara_toplam', 'subtotal'],
  ['birim_fiyat', 'unit_price'],
  ['yerel_birim_fiyat', 'local_unit_price'],
  ['iskonto_oran', 'discount_rate'],
  ['iskonto_oran2', 'discount_rate_2'],
  ['iskonto_oran3', 'discount_rate_3'],
  ['kdv_oran', 'vat_rate'],
  ['kdv_durumu', 'vat_mode'],
  ['kdv_kodu', 'vat_code'],
  ['tevkifat_kodu', 'withholding_code'],
  ['tevkifat_oran', 'withholding_rate'],
  ['tevkifat_tutari', 'withholding_amount'],
  ['otv_kodu', 'excise_code'],
  ['otv_oran', 'excise_rate'],
  ['bandrol_oran', 'bandrol_rate'],
  ['vergi_semasi', 'tax_schema'],
  ['vergi_dairesi', 'tax_office'],
  ['vergi_no', 'tax_id'],
  ['vergi_kodu', 'tax_code'],
  ['vergi_adi', 'tax_name'],
  ['vergi_turu', 'tax_type'],
  ['hesaplanan_hesap_kodu', 'output_tax_account_code'],
  ['indirilecek_hesap_kodu', 'input_tax_account_code'],
  ['muhasebe_hesap_id', 'gl_account_id'],
  ['muhasebelesti', 'is_posted'],
  ['muhasebelestir', 'post_to_gl'],
  ['kaynak_belge_tipi', 'source_document_type'],
  ['kaynak_belge_id', 'source_document_id'],
  ['ters_belge_id', 'reversal_document_id'],
  ['orijinal_belge_id', 'original_document_id'],
  ['yevmiye_no', 'journal_number'],
  ['fis_tipi', 'voucher_type'],
  ['toplam_borc', 'total_debit'],
  ['toplam_alacak', 'total_credit'],
  ['normal_bakiye', 'normal_balance'],
  ['kontrol_hesabi', 'is_control_account'],
  ['mutabakat_tipi', 'reconciliation_type'],
  ['hesap_sinifi', 'account_class'],
  ['hesap_tipi', 'account_type'],
  ['hesap_kodu', 'account_code'],
  ['hesap_adi', 'account_name'],
  ['ust_hesap_kodu', 'parent_account_code'],
  ['karsi_hesap_kodu', 'offset_account_code'],
  ['borc_hesap_kodu', 'debit_account_code'],
  ['alacak_hesap_kodu', 'credit_account_code'],
  ['banka_hesap_id', 'bank_account_id'],
  ['kasa_hesap_id', 'cash_account_id'],
  ['hareket_no', 'movement_no'],
  ['hareket_kodu_id', 'movement_code_id'],
  ['hareket_kodu', 'movement_code'],
  ['hareket_adi', 'movement_name'],
  ['belge_seri', 'document_series'],
  ['belge_sira', 'document_sequence'],
  ['belge_no', 'document_no'],
  ['fatura_no', 'invoice_no'],
  ['musteri_fatura_no', 'customer_invoice_ref'],
  ['irsaliye_no', 'delivery_note_no'],
  ['irsaliye_no_tedarikci', 'vendor_delivery_note_no'],
  ['fatura_no_tedarikci', 'vendor_invoice_no'],
  ['siparis_no', 'order_no'],
  ['teklif_no', 'quotation_no'],
  ['talep_no', 'requisition_no'],
  ['sevk_no', 'shipment_no'],
  ['kabul_no', 'receipt_no'],
  ['emir_no', 'order_no'],
  ['calisma_no', 'run_no'],
  ['cari_kodu', 'partner_code'],
  ['cari_adi', 'partner_name'],
  ['cari_turu', 'partner_type'],
  ['cari_unvan', 'partner_title'],
  ['cari_unvan2', 'partner_title_2'],
  ['stok_kodu', 'item_code'],
  ['stok_adi', 'item_name'],
  ['stok_tipi', 'item_type'],
  ['stok_id', 'item_id'],
  ['stok_statu', 'stock_status'],
  ['depo_kodu', 'warehouse_code'],
  ['depo_adi', 'warehouse_name'],
  ['depo_id', 'warehouse_id'],
  ['firma_kodu', 'company_code'],
  ['firma_adi', 'company_name'],
  ['firma_id', 'company_id'],
  ['is_yeri_kodu', 'plant_code'],
  ['is_yeri_adi', 'plant_name'],
  ['is_yeri_id', 'plant_id'],
  ['is_merkezi', 'work_center'],
  ['pb_kodu', 'currency_code'],
  ['pb_adi', 'currency_name'],
  ['para_birimi', 'currency_code'],
  ['kur_tipi', 'rate_type'],
  ['kur_secenegi', 'rate_option'],
  ['alis_kuru', 'buy_rate'],
  ['satis_kuru', 'sell_rate'],
  ['efektif_alis', 'effective_buy_rate'],
  ['efektif_satis', 'effective_sell_rate'],
  ['birim_kodu', 'uom_code'],
  ['birim_adi', 'uom_name'],
  ['satis_birimi', 'sales_uom'],
  ['satis_fiyati', 'sales_price'],
  ['satis_temsilcisi', 'sales_rep'],
  ['maliyet_birim', 'unit_cost'],
  ['maliyet_merkezi', 'cost_center'],
  ['proje_kodu', 'project_code'],
  ['liste_kodu', 'list_code'],
  ['liste_adi', 'list_name'],
  ['fiyat_liste_id', 'price_list_id'],
  ['seri_kodu', 'series_code'],
  ['kosul_kodu', 'term_code'],
  ['kosul_adi', 'term_name'],
  ['asama_kodu', 'stage_code'],
  ['asama_adi', 'stage_name'],
  ['tip_kodu', 'type_code'],
  ['tip_adi', 'type_name'],
  ['aday_kodu', 'lead_code'],
  ['aday_adi', 'lead_name'],
  ['parti_no', 'lot_no'],
  ['seri_no', 'serial_no'],
  ['sira_no', 'line_no'],
  ['donem_no', 'period_no'],
  ['mali_yil_id', 'fiscal_year_id'],
  ['mali_yil', 'fiscal_year'],
  ['saklama_yil', 'retention_years'],
  ['yerel_pb', 'local_currency'],
  ['ulke_adi', 'country_name'],
  ['sehir_adi', 'city_name'],
  ['ilce_adi', 'district_name'],
  ['banka_adi', 'bank_name'],
  ['banka_kodu', 'bank_code'],
  ['banka_id', 'bank_id'],
  ['kasa_kodu', 'cash_code'],
  ['kasa_adi', 'cash_name'],
  ['grup_kodu', 'group_code'],
  ['grup_adi', 'group_name'],
  ['rol_kodu', 'role_code'],
  ['rol_adi', 'role_name'],
  ['kural_kodu', 'rule_code'],
  ['belge_tipi', 'document_type'],
  ['fatura_turu', 'invoice_type'],
  ['fatura_tipi', 'invoice_category'],
  ['irsaliye_tipi', 'delivery_note_type'],
  ['satir_tipi', 'line_type'],
  ['satir_aciklama', 'line_description'],
  ['satir_aciklama2', 'line_description_2'],
  ['satir_aciklama3', 'line_description_3'],
  ['aciklama_2', 'description_2'],
  ['aciklama_3', 'description_3'],
  ['not_public', 'public_note'],
  ['not_internal', 'internal_note'],
  ['posta_kutusu_alias', 'mailbox_alias'],
  ['posta_kodu', 'postal_code'],
  ['sevk_posta_kodu', 'ship_postal_code'],
  ['fatura_posta_kodu', 'bill_postal_code'],
  ['sevk_adresi', 'ship_to_address'],
  ['sevk_adres1', 'ship_address_1'],
  ['sevk_adres2', 'ship_address_2'],
  ['sevk_adres3', 'ship_address_3'],
  ['sevk_adres_tipi', 'ship_address_type'],
  ['sevk_cari_id', 'ship_to_partner_id'],
  ['sevk_ulke', 'ship_country'],
  ['sevk_il', 'ship_city'],
  ['sevk_ilce', 'ship_district'],
  ['sevk_tel1', 'ship_phone_1'],
  ['sevk_tel2', 'ship_phone_2'],
  ['sevk_ad', 'ship_name'],
  ['sevk_soyad', 'ship_last_name'],
  ['fatura_adres1', 'bill_address_1'],
  ['fatura_adres2', 'bill_address_2'],
  ['fatura_adres3', 'bill_address_3'],
  ['fatura_ulke', 'bill_country'],
  ['fatura_il', 'bill_city'],
  ['fatura_ilce', 'bill_district'],
  ['fatura_adresi', 'billing_address'],
  ['nakliye_sirketi', 'carrier_company'],
  ['nakliyeci', 'carrier'],
  ['arac_plaka', 'vehicle_plate'],
  ['arac_kodu', 'vehicle_code'],
  ['arac_aciklama', 'vehicle_description'],
  ['dorse_plaka', 'trailer_plate'],
  ['sofor_tckn', 'driver_national_id'],
  ['sofor_adi', 'driver_name'],
  ['sofor_soyadi', 'driver_last_name'],
  ['sofor_cep', 'driver_mobile'],
  ['teslim_eden', 'delivered_by'],
  ['tasiyici_unvan', 'carrier_title'],
  ['tasiyici_vkn', 'carrier_tax_id'],
  ['kargo_no', 'cargo_no'],
  ['alis_on_irsaliye', 'purchase_pre_delivery'],
  ['matbu_seri', 'paper_series'],
  ['matbu_sira', 'paper_sequence'],
  ['e_ticaret_web', 'ecommerce_web'],
  ['e_ticaret_ad', 'ecommerce_name'],
  ['e_ticaret_soyad', 'ecommerce_last_name'],
  ['e_ticaret_email', 'ecommerce_email'],
  ['yerel_para_cikti', 'print_local_currency'],
  ['yazdirildi', 'is_printed'],
  ['faturalandi', 'is_invoiced'],
  ['fatura_edilen_miktar', 'invoiced_quantity'],
  ['tutar_ht', 'amount_ex_tax'],
  ['fatura_alti_iskonto', 'invoice_footer_discount'],
  ['irsaliye_alti_iskonto', 'delivery_footer_discount'],
  ['ozel_hareket_tipi', 'special_movement_type'],
  ['fin_vade_gun', 'fin_due_days'],
  ['vade_gun', 'due_days'],
  ['musteri_referans_kod', 'customer_ref_code'],
  ['gib_no', 'gib_number'],
  ['posta_kutusu', 'mailbox'],
  ['kaynak_notu', 'source_note'],
  ['profil_resmi', 'profile_image'],
  ['modul_yetkileri', 'module_permissions'],
  ['ekran_id', 'screen_id'],
  ['ekran_adi', 'screen_name'],
  ['tech_id', 'tech_id'],
  ['durum_kodu', 'status_code'],
  ['sira_no', 'line_no'],
  ['ust_hesap', 'parent_account'],
  ['silinecek', 'marked_for_deletion'],
  ['kilitli', 'is_locked'],
  ['kazanan', 'is_won'],
  ['kaybeden', 'is_lost'],
  ['baslatildi', 'is_started'],
  ['uretim_emri_id', 'production_order_id'],
  ['mal_kabul_id', 'goods_receipt_id'],
  ['irsaliye_id', 'delivery_note_id'],
  // siparis_id / siparis_detay_id: tabloya göre (aşağıda TABLE_COL_OVERRIDES)
  ['siparis_detay_id', 'sales_order_line_id'],
  ['yeniden_siparis_seviyesi', 'reorder_level'],
  ['yeniden_siparis', 'reorder_point'],
  ['sabit_siparis_miktari', 'fixed_order_quantity'],
  ['optimum_siparis_miktari', 'optimum_order_quantity'],
  ['emniyet_stok', 'safety_stock'],
  ['minimum_stok', 'min_stock'],
  ['maksimum_stok', 'max_stock'],
  ['kullanilabilir_stok', 'available_stock'],
  ['yeni', 'can_create'],
  ['teklif_id', 'quotation_id'],
  ['sevk_emri_id', 'shipment_order_id'],
  ['tedarikci_irsaliye_id', 'vendor_delivery_note_id'],
  ['tedarikci_cari_id', 'supplier_partner_id'],
  ['cari_id', 'partner_id'],
  ['fatura_id', 'invoice_id'],
  ['donem_id', 'period_id'],
  ['vergi_kod_id', 'tax_code_id'],
  ['hedef_teslim_tarihi', 'target_delivery_date'],
  ['uygun_miktar', 'accepted_quantity'],
  ['uygunsuz_miktar', 'rejected_quantity'],
  ['hammadde_depo_id', 'component_warehouse_id'],
  ['mamul_depo_id', 'fg_warehouse_id'],
  ['yari_mamul_depo_id', 'wip_warehouse_id'],
  ['emir_tipi_id', 'order_type_id'],
  ['operasyon_kodu', 'operation_code'],
  ['operasyon_adi', 'operation_name'],
  ['agac_kodu', 'bom_code'],
  ['alt_satirlar', 'child_lines'],
  ['satirlar', 'lines'],
  ['kalemler', 'lines'],
  ['aciklama', 'description'],
  ['durum', 'status'],
  ['aktif', 'is_active'],
  ['pasif', 'is_inactive'],
  ['miktar', 'quantity'],
  ['birim', 'uom_code'],
  ['tutar', 'amount'],
  ['bakiye', 'balance'],
  ['borc', 'debit'],
  ['alacak', 'credit'],
  ['kur', 'exchange_rate'],
  ['oran', 'rate'],
  ['yon', 'direction'],
  ['bolge', 'region'],
  ['unvan', 'title'],
  ['soyad', 'last_name'],
  ['ad', 'first_name'],
  ['rol', 'role'],
  ['sifre', 'password_hash'],
  ['iban', 'iban'],
  ['swift', 'swift'],
  ['ettn', 'uuid_ettn'],
  ['senaryo', 'scenario'],
  ['gumruk', 'customs'],
  ['oncelik', 'priority'],
  ['kullanici', 'user_ref'],
];

const SKIP_TABLES = new Set(['schema_migrations']);

/**
 * Tabloya özel kolon hedefi (aynı TR kolon farklı EN anlam).
 * Anahtar: eski_tablo.eski_kolon
 */
const TABLE_COL_OVERRIDES = {
  'mal_kabuller.siparis_id': 'purchase_order_id',
  'satin_alma_siparis_satirlari.siparis_id': 'purchase_order_id',
  'tedarikci_irsaliyeleri.siparis_id': 'purchase_order_id',
  // satış / genel sipariş bağlamı
  'faturalar.siparis_id': 'sales_order_id',
  'fatura_eslestirme.siparis_id': 'sales_order_id',
  'irsaliyeler.siparis_id': 'sales_order_id',
  'siparis_detaylari.siparis_id': 'sales_order_id',
  'sevk_emirleri.siparis_id': 'sales_order_id',
  'stok_rezervasyonlari.siparis_id': 'sales_order_id',
  'uretim_emirleri.siparis_id': 'sales_order_id',
  'mrp_bagimsiz_ihtiyaclar.siparis_id': 'sales_order_id',
};

/** Tek token sözlüğü (underscore parçaları) */
const PART_MAP = {
  kullanici: 'user',
  olusturan: 'created_by',
  onaylayan: 'approved_by',
  kapatan: 'closed_by',
  guncelleyen: 'updated_by',
  kayit: 'created',
  guncelleme: 'updated',
  baslangic: 'start',
  bitis: 'end',
  gecerlilik: 'valid',
  fatura: 'invoice',
  irsaliye: 'delivery',
  siparis: 'order',
  teklif: 'quotation',
  talep: 'requisition',
  sevk: 'ship',
  kabul: 'receipt',
  emir: 'order',
  calisma: 'run',
  cari: 'partner',
  stok: 'stock', // item_* için TOKEN_MAP / idFix; yalnız stok miktar bağlamı
  depo: 'warehouse',
  firma: 'company',
  is: 'work',
  yeri: 'plant',
  merkezi: 'center',
  merkez: 'center',
  para: 'currency',
  birimi: 'uom',
  birim: 'uom',
  kur: 'rate',
  alis: 'buy',
  satis: 'sales',
  efektif: 'effective',
  maliyet: 'cost',
  proje: 'project',
  liste: 'list',
  seri: 'series',
  kosul: 'term',
  asama: 'stage',
  tip: 'type',
  tipı: 'type',
  aday: 'lead',
  durumlar: 'statuses',
  uretim: 'production',
  satin: 'purchase',
  eden: 'by',
  adim: 'step',
  edilen: 'done',
  kalan: 'remaining',
  uretilen: 'produced',
  tablo: 'table',
  alan: 'field',
  islem: 'action',
  eski: 'old',
  // yeni → can_create sadece TOKEN_MAP tam eşleşme; parçada 'new' reserved riski
  deger: 'value',
  emniyet: 'safety',
  yeniden: 'reorder',
  sabit: 'fixed',
  optimum: 'optimum',
  kullanilabilir: 'available',
  seviye: 'level',
  seviyesi: 'level',
  parti: 'lot',
  sira: 'line',
  donem: 'period',
  mali: 'fiscal',
  yil: 'year',
  saklama: 'retention',
  yerel: 'local',
  ulke: 'country',
  sehir: 'city',
  ilce: 'district',
  banka: 'bank',
  kasa: 'cash',
  grup: 'group',
  rol: 'role',
  kural: 'rule',
  belge: 'document',
  hareket: 'movement',
  hesap: 'account',
  ust: 'parent',
  alt: 'child',
  satir: 'line',
  kalem: 'line',
  aciklama: 'description',
  durum: 'status',
  aktif: 'is_active',
  pasif: 'is_inactive',
  miktar: 'quantity',
  tutar: 'amount',
  bakiye: 'balance',
  borc: 'debit',
  alacak: 'credit',
  oran: 'rate',
  yon: 'direction',
  bolge: 'region',
  unvan: 'title',
  soyad: 'last_name',
  ad: 'first_name',
  adi: 'name',
  kodu: 'code',
  kod: 'code',
  tarihi: 'date',
  tarih: 'date',
  zamani: 'time',
  zaman: 'time',
  tutari: 'amount',
  miktari: 'quantity',
  orani: 'rate',
  durumu: 'status',
  turu: 'type',
  tipi: 'type',
  sekli: 'method',
  no: 'no',
  numarasi: 'number',
  sube: 'branch',
  mamul: 'finished_good',
  hammadde: 'component',
  tuketim: 'consumption',
  cikti: 'output',
  bilesen: 'component',
  bileseni: 'component',
  urun: 'product',
  agaci: 'bom',
  agac: 'bom',
  sonuc: 'result',
  sonuclari: 'results',
  yetki: 'permission',
  ekran: 'screen',
  modul: 'module',
  mesaj: 'message',
  sablon: 'template',
  rota: 'route',
  kayit: 'record',
  kesinlestirme: 'posted',
  kapanis: 'closed',
  muhasebe: 'gl',
  vergi: 'tax',
  odeme: 'payment',
  teslimat: 'delivery',
  teslim: 'delivery',
  nakliye: 'freight',
  nakliyeci: 'carrier',
  arac: 'vehicle',
  sofor: 'driver',
  tasiyici: 'carrier',
  kargo: 'cargo',
  matbu: 'paper',
  yazdirildi: 'is_printed',
  faturalandi: 'is_invoiced',
  muhasebelesti: 'is_posted',
  kilitli: 'is_locked',
  silinecek: 'marked_for_deletion',
  baslatildi: 'is_started',
  kazanan: 'is_won',
  kaybeden: 'is_lost',
  uygun: 'accepted',
  uygunsuz: 'rejected',
  uygunsuzluk: 'nonconformance',
  hedef: 'target',
  fiili: 'actual',
  musteri: 'customer',
  tedarikci: 'supplier',
  referans: 'ref',
  public: 'public',
  internal: 'internal',
  not: 'note',
  profil: 'profile',
  resmi: 'image',
  sifre: 'password_hash',
  iban: 'iban',
  swift: 'swift',
  ettn: 'uuid_ettn',
  senaryo: 'scenario',
  gumruk: 'customs',
  oncelik: 'priority',
  plaka: 'plate',
  dorse: 'trailer',
  cep: 'mobile',
  tckn: 'national_id',
  vkn: 'tax_id',
  daire: 'office',
  semasi: 'schema',
  tevkifat: 'withholding',
  otv: 'excise',
  bandrol: 'bandrol',
  kdv: 'vat',
  iskonto: 'discount',
  genel: 'grand',
  ara: 'sub',
  toplam: 'total',
  odenecek: 'payable',
  mal: 'goods',
  hizmet: 'service',
  plani: 'plan',
  plan: 'plan',
  vadesi: 'due',
  vade: 'due',
  gun: 'days',
  ay: 'month',
  tipı: 'type',
  kategori: 'category',
  sinif: 'class',
  sinifi: 'class',
  normal: 'normal',
  kontrol: 'control',
  mutabakat: 'reconciliation',
  parent: 'parent',
  kaynak: 'source',
  ters: 'reversal',
  orijinal: 'original',
  yevmiye: 'journal',
  fis: 'voucher',
  karsi: 'offset',
  belirleme: 'determination',
  kurallari: 'rules',
  kuralı: 'rule',
  paketleri: 'packs',
  paketi: 'pack',
  oranlari: 'rates',
  kodlari: 'codes',
  hesaplari: 'accounts',
  hareketleri: 'movements',
  belgeleri: 'documents',
  kalemleri: 'lines',
  satirlari: 'lines',
  detaylari: 'details',
  bilgileri: 'info',
  parametreleri: 'params',
  adresleri: 'addresses',
  adres: 'address',
  tel: 'phone',
  posta: 'postal',
  kutusu: 'box',
  alias: 'alias',
  iletildigi: 'sent',
  portal: 'portal',
  gib: 'gib',
  e: 'e',
  ticaret: 'commerce',
  web: 'web',
  email: 'email',
  ciktı: 'output',
  para: 'currency',
  ciktı: 'print',
  alti: 'footer',
  ozel: 'special',
  fin: 'fin',
  sozlesme: 'contract',
  risk: 'risk',
  limit: 'limit',
  bakiyesi: 'balance',
  bakiyesi: 'balance',
};

function renameColumn(col) {
  if (col === 'id') return 'id';

  for (const [from, to] of TOKEN_MAP) {
    if (col === from) return to;
  }

  let out = col;
  const multi = [...TOKEN_MAP]
    .filter(([f]) => f.includes('_'))
    .sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of multi) {
    const re = new RegExp(`(?<![a-z0-9])${from}(?![a-z0-9])`, 'g');
    out = out.replace(re, to);
  }

  out = out
    .split('_')
    .map((t) => PART_MAP[t] || t)
    .join('_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const idFix = [
    [/_stok_id$/, '_item_id'],
    [/_cari_id$/, '_partner_id'],
    [/_depo_id$/, '_warehouse_id'],
    [/_firma_id$/, '_company_id'],
    // siparis_id varsayılanı sales; PO bağlamı TABLE_COL_OVERRIDES ile
    [/_siparis_id$/, '_sales_order_id'],
    [/_fatura_id$/, '_invoice_id'],
    [/_irsaliye_id$/, '_delivery_note_id'],
    [/_teklif_id$/, '_quotation_id'],
    [/_sevk_emri_id$/, '_shipment_order_id'],
    [/_mal_kabul_id$/, '_goods_receipt_id'],
    [/_uretim_emri_id$/, '_production_order_id'],
    [/_banka_id$/, '_bank_id'],
    [/_donem_id$/, '_period_id'],
    [/_mali_yil_id$/, '_fiscal_year_id'],
    [/_vergi_kod_id$/, '_tax_code_id'],
    [/_fiyat_liste_id$/, '_price_list_id'],
    [/_hareket_kodu_id$/, '_movement_code_id'],
    [/_is_yeri_id$/, '_plant_id'],
    [/_is_merkezi_id$/, '_work_center_id'],
    [/_urun_agaci_id$/, '_bom_id'],
    [/_ust_satir_id$/, '_parent_line_id'],
    [/_bilesen_item_id$/, '_component_item_id'],
    [/_mamul_item_id$/, '_finished_item_id'],
    [/_tedarikci_delivery_note_id$/, '_vendor_delivery_note_id'],
    [/_tedarikci_partner_id$/, '_supplier_partner_id'],
    [/_muhasebe_account_id$/, '_gl_account_id'],
    [/_gl_account_id$/, '_gl_account_id'],
    [/^emniyet_stock$/, 'safety_stock'],
    [/^available_stock$/, 'available_stock'],
    [/^reorder_order$/, 'reorder_point'],
    [/^reorder_order_level$/, 'reorder_level'],
    [/^fixed_order_quantity$/, 'fixed_order_quantity'],
  ];
  for (const [re, to] of idFix) {
    if (re.test(out)) out = out.replace(re, to);
  }

  // semantic tidy
  out = out
    .replace(/created_date/g, 'created_at')
    .replace(/updated_date/g, 'updated_at')
    .replace(/posted_date/g, 'posted_at')
    .replace(/closed_date/g, 'closed_at')
    .replace(/currency_uom/g, 'currency_code')
    .replace(/work_plant/g, 'plant')
    .replace(/work_center_center/g, 'work_center')
    .replace(/delivery_date_date/g, 'delivery_date')
    .replace(/ship_date/g, 'ship_date')
    .replace(/e_document_status/g, 'e_document_status');

  return out || col;
}

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

// Build column maps per table
const colsByTable = {};
for (const r of inv.tables) {
  (colsByTable[r.table_name] ||= []).push(r.column_name);
}

const missingTables = Object.keys(colsByTable).filter((t) => !TABLE_MAP[t] && !SKIP_TABLES.has(t));
if (missingTables.length) {
  console.warn('WARN missing TABLE_MAP:', missingTables.join(', '));
}

// Discover users table
for (const t of Object.keys(colsByTable)) {
  if (!TABLE_MAP[t] && /kullanici/.test(t)) console.warn('user-like table', t);
}

const tableRenames = [];
const columnRenames = []; // {table, from, to}
const columnMapGlobal = {}; // oldCol -> newCol (majority); for code replace use table-aware

for (const [oldT, cols] of Object.entries(colsByTable)) {
  if (SKIP_TABLES.has(oldT)) continue;
  const newT = TABLE_MAP[oldT] || oldT;
  if (newT !== oldT) tableRenames.push({ from: oldT, to: newT });

  const used = new Set();
  for (const c of cols) {
    let nc = TABLE_COL_OVERRIDES[`${oldT}.${c}`] || renameColumn(c);
    if (nc !== c && used.has(nc)) {
      // collision — keep suffix
      nc = `${nc}_x`;
    }
    used.add(nc);
    if (nc !== c) {
      columnRenames.push({ table: oldT, newTable: newT, from: c, to: nc });
    }
    columnMapGlobal[`${oldT}.${c}`] = `${newT}.${nc}`;
  }
}

// Index renames: rebuild simple names idx_<table>_<cols>
const indexRenames = [];
for (const ix of inv.indexes) {
  if (ix.indexname.endsWith('_pkey')) continue;
  if (SKIP_TABLES.has(ix.tablename)) continue;
  const newTable = TABLE_MAP[ix.tablename] || ix.tablename;
  // generate new name from definition columns if possible
  let newName = ix.indexname
    .replace(ix.tablename, newTable)
    .replace(/muhasebe_/g, 'journal_')
    .replace(/cari_/g, 'partner_')
    .replace(/stok_/g, 'item_')
    .replace(/fatura_/g, 'invoice_')
    .replace(/irsaliye_/g, 'dn_')
    .replace(/siparis_/g, 'so_')
    .replace(/satin_alma_/g, 'po_')
    .replace(/uretim_/g, 'prod_')
    .replace(/kullanici_/g, 'user_')
    .replace(/finans_/g, 'fin_');
  // also apply column tokens inside index name
  for (const [from, to] of [...TOKEN_MAP].sort((a, b) => b[0].length - a[0].length)) {
    if (newName.includes(from)) newName = newName.split(from).join(to);
  }
  if (newName !== ix.indexname) {
    indexRenames.push({ from: ix.indexname, to: newName, table: ix.tablename });
  }
}

// Constraint renames (FK)
const constraintRenames = [];
for (const fk of inv.fks) {
  const newName = fk.constraint_name
    .replace(fk.table_name, TABLE_MAP[fk.table_name] || fk.table_name)
    .replace(fk.foreign_table_name, TABLE_MAP[fk.foreign_table_name] || fk.foreign_table_name);
  let nn = newName;
  for (const [from, to] of [...TOKEN_MAP].sort((a, b) => b[0].length - a[0].length)) {
    if (nn.includes(from)) nn = nn.split(from).join(to);
  }
  if (nn !== fk.constraint_name) {
    constraintRenames.push({
      table: fk.table_name,
      newTable: TABLE_MAP[fk.table_name] || fk.table_name,
      from: fk.constraint_name,
      to: nn,
    });
  }
}

// Deduplicate index/constraint targets
function dedupeRename(list, key = 'to') {
  const seen = new Map();
  return list.map((row) => {
    let t = row[key];
    if (seen.has(t)) {
      let i = 2;
      while (seen.has(`${t}_${i}`)) i++;
      t = `${t}_${i}`;
    }
    seen.set(t, true);
    return { ...row, [key]: t };
  });
}

const indexRenamesD = dedupeRename(indexRenames);
const constraintRenamesD = dedupeRename(constraintRenames);

// Emit SQL — order: columns first (on old table names), then tables, then indexes, then constraints
// Not: 042 canlıya uygulandıysa bu dosyayı yeniden yazmayız; yalnızca docs/harita güncellenir.
const outDir = path.join(__dirname, '..', 'docs', 'db-naming');
fs.mkdirSync(outDir, { recursive: true });
const migPath = path.join(__dirname, '..', 'db', 'migrations', '042_schema_english_rename.sql');
const skipRewrite042 = process.env.REWRITE_042 !== '1' && fs.existsSync(migPath);

let sql = `-- 042: Schema rename Turkish → English (RENAME only, no data loss)
-- Generated by scripts/generate-db-en-rename.js
-- UI labels remain Turkish; physical names become English snake_case.

BEGIN;

`;

sql += '-- ========== COLUMNS (old table names) ==========\n';
for (const r of columnRenames) {
  sql += `ALTER TABLE ${quoteIdent(r.table)} RENAME COLUMN ${quoteIdent(r.from)} TO ${quoteIdent(r.to)};\n`;
}

sql += '\n-- ========== TABLES ==========\n';
for (const r of tableRenames) {
  sql += `ALTER TABLE ${quoteIdent(r.from)} RENAME TO ${quoteIdent(r.to)};\n`;
}

sql += '\n-- ========== INDEXES ==========\n';
for (const r of indexRenamesD) {
  sql += `ALTER INDEX IF EXISTS ${quoteIdent(r.from)} RENAME TO ${quoteIdent(r.to)};\n`;
}

sql += '\n-- ========== FK CONSTRAINTS ==========\n';
for (const r of constraintRenamesD) {
  sql += `ALTER TABLE ${quoteIdent(r.newTable)} RENAME CONSTRAINT ${quoteIdent(r.from)} TO ${quoteIdent(r.to)};\n`;
}

sql += '\nCOMMIT;\n';

if (!skipRewrite042) {
  fs.writeFileSync(migPath, sql);
} else {
  fs.writeFileSync(path.join(outDir, '042_schema_english_rename.desired.sql'), sql);
  console.log('Skipped rewrite of applied 042; desired SQL → docs/db-naming/042_schema_english_rename.desired.sql');
}

const map = {
  generatedAt: new Date().toISOString(),
  tables: Object.fromEntries(tableRenames.map((r) => [r.from, r.to])),
  columns: columnRenames,
  indexes: indexRenamesD,
  constraints: constraintRenamesD,
  stats: {
    tables: tableRenames.length,
    columns: columnRenames.length,
    indexes: indexRenamesD.length,
    constraints: constraintRenamesD.length,
  },
};
fs.writeFileSync(path.join(outDir, 'rename-map.json'), JSON.stringify(map, null, 2));

// Flat column replace map for code (ambiguous columns → most common English)
const flatCol = {};
const votes = {};
for (const r of columnRenames) {
  votes[r.from] ||= {};
  votes[r.from][r.to] = (votes[r.from][r.to] || 0) + 1;
}
for (const [from, tos] of Object.entries(votes)) {
  const best = Object.entries(tos).sort((a, b) => b[1] - a[1])[0][0];
  flatCol[from] = best;
}
fs.writeFileSync(path.join(outDir, 'column-flat-map.json'), JSON.stringify(flatCol, null, 2));

console.log(skipRewrite042 ? 'Maps updated (042 left as applied)' : 'Wrote ' + migPath);
console.log(map.stats);
console.log('flat columns', Object.keys(flatCol).length);
console.log('sample tables', tableRenames.slice(0, 8));
