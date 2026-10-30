const OPERATORS = [
  { id: '', label: '' }, // boş satır = filtresiz (alan uygulanmaz)
  { id: 'icerir', label: 'İçerir' },
  { id: 'esit', label: 'Eşit' },
  { id: 'esit_degil', label: 'Eşit değil' },
  { id: 'arasinda', label: 'Arasında' },
];

/** Boş operatör satırı = filtresiz; değer kutusu gizlenir */
function filterOpHidesValues(op) {
  return !op;
}

function filterOpNeedsBetween(op) {
  return op === 'arasinda';
}

const MODULES = [
  {
    id: 'fixed-tanimlar',
    title: 'Sabit Tanımlar',
    // Genel tanımlar — alt başlık yok (tek liste)
    screens: [
      {
        id: 'numarator-tanimi',
        techId: 'SYS-NUM-SCR-001',
        businessNameEn: 'NumberSeriesScreen',
        title: 'Numaratör Tanımı',
        endpoint: '/kod-serileri',
        crud: true,
        codeField: 'series_code',
        nameField: 'description',
        numeratorSeri: null,
        filters: [
          { key: 'series_code', label: 'Seri kodu' },
          { key: 'screen_name', label: 'Ekran adı' },
          { key: 'onek', label: 'Ön ek' },
        ],
        columns: [
          { key: 'series_code', label: 'Seri', mono: true },
          { key: 'onek', label: 'Ön ek', mono: true },
          { key: 'description', label: 'Açıklama' },
          { key: 'screen_name', label: 'Ekran' },
          { key: 'son_numara', label: 'Son no' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'series_code', label: 'Seri kodu', code: true, editableOnNew: true, required: true },
          { key: 'onek', label: 'Ön ek', required: true, maxLength: 4 },
          { key: 'description', label: 'Açıklama', name: true, required: true },
        ],
        detailFields: [
          {
            key: 'screen_code',
            label: 'Ekran kodu',
            type: 'lookup',
            lookup: 'ekranlar',
            valueKey: 'screen_code',
            labelKey: 'screen_name',
            codeKey: 'screen_code',
            autoFillName: 'screen_name',
          },
          { key: 'screen_name', label: 'Ekran adı', readOnly: true },
          { key: 'son_numara', label: 'Son numara', type: 'number' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'olcu-birimleri',
        techId: 'MDM-UOM-SCR-001',
        businessNameEn: 'UnitOfMeasureScreen',
        title: 'Ölçü Birimleri',
        endpoint: '/olcu-birimleri',
        crud: true,
        codeField: 'uom_code',
        nameField: 'uom_name',
        numeratorSeri: null,
        filters: [
          { key: 'uom_code', label: 'Birim kodu' },
          { key: 'uom_name', label: 'Birim adı' },
        ],
        columns: [
          { key: 'uom_code', label: 'Kod', mono: true },
          { key: 'uom_name', label: 'Ad' },
        ],
        masterFields: [
          { key: 'uom_code', label: 'Birim kodu', code: true, editableOnNew: true, required: true },
          { key: 'uom_name', label: 'Birim adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'kategori-tanimi',
        techId: 'MDM-CAT-SCR-001',
        businessNameEn: 'CategoryDefinitionScreen',
        title: 'Kategori Tanımı',
        endpoint: '/kategoriler',
        crud: true,
        codeField: 'category_code',
        nameField: 'category_name',
        numeratorSeri: 'KATEGORI',
        filters: [
          { key: 'category_code', label: 'Kategori kodu' },
          { key: 'category_name', label: 'Kategori adı' },
          { key: 'category_type', label: 'Tip' },
        ],
        columns: [
          { key: 'category_code', label: 'Kod', mono: true },
          { key: 'category_name', label: 'Ad' },
          { key: 'category_type', label: 'Tip' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'category_code', label: 'Kategori kodu', code: true, required: true },
          { key: 'category_name', label: 'Kategori adı', name: true, required: true },
          { key: 'category_type', label: 'Kategori tipi', type: 'select', options: ['ABC', 'Marka', 'TeminSekli', 'Sektor', 'Bolge'], required: true },
        ],
        detailFields: [
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'country-tanimi',
        techId: 'MDM-CTRY-SCR-001',
        businessNameEn: 'CountryDefinitionScreen',
        title: 'Ülke Tanımı',
        endpoint: '/countries',
        crud: true,
        codeField: 'country_code',
        nameField: 'country_name',
        numeratorSeri: 'ULKE',
        filters: [
          { key: 'country_code', label: 'Ülke kodu' },
          { key: 'country_name', label: 'Ülke adı' },
        ],
        columns: [
          { key: 'country_code', label: 'Kod', mono: true },
          { key: 'country_name', label: 'Ad' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'country_code', label: 'Ülke kodu', code: true, required: true },
          { key: 'country_name', label: 'Ülke adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'para-birimi-tanimi',
        techId: 'MDM-CUR-SCR-001',
        businessNameEn: 'CurrencyDefinitionScreen',
        title: 'Para Birimi Tanımı',
        endpoint: '/para-birimleri',
        crud: true,
        codeField: 'currency_code',
        nameField: 'currency_name',
        numeratorSeri: 'PARA_BIRIM',
        filters: [
          { key: 'currency_code', label: 'PB kodu' },
          { key: 'currency_name', label: 'PB adı' },
        ],
        columns: [
          { key: 'currency_code', label: 'Kod', mono: true },
          { key: 'currency_name', label: 'Ad' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'currency_code', label: 'Para birimi kodu', code: true, editableOnNew: true, required: true, maxLength: 10 },
          { key: 'currency_name', label: 'Para birimi adı', name: true, required: true },
          { key: 'sembol', label: 'Sembol', maxLength: 10 },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'sehir-tanimi',
        techId: 'MDM-CITY-SCR-001',
        businessNameEn: 'CityProvinceScreen',
        title: 'Şehir / İl Tanımı',
        endpoint: '/cities',
        crud: true,
        codeField: 'city_code',
        nameField: 'city_name',
        numeratorSeri: 'SEHIR',
        filters: [
          { key: 'city_code', label: 'Şehir kodu' },
          { key: 'city_name', label: 'Şehir adı' },
          { key: 'country_code', label: 'Ülke' },
        ],
        columns: [
          { key: 'city_code', label: 'Kod', mono: true },
          { key: 'city_name', label: 'Ad' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'city_code', label: 'Şehir kodu', code: true, editableOnNew: true, required: true },
          { key: 'city_name', label: 'Şehir adı', name: true, required: true },
          { key: 'country_code', label: 'Ülke', type: 'lookup', lookup: 'countries', valueKey: 'country_code', labelKey: 'country_name' },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'district-tanimi',
        techId: 'MDM-DIST-SCR-001',
        businessNameEn: 'DistrictDefinitionScreen',
        title: 'İlçe Tanımı',
        endpoint: '/districts',
        crud: true,
        codeField: 'district_code',
        nameField: 'district_name',
        numeratorSeri: 'ILCE',
        filters: [
          { key: 'district_code', label: 'İlçe kodu' },
          { key: 'district_name', label: 'İlçe adı' },
          { key: 'city_code', label: 'Şehir' },
        ],
        columns: [
          { key: 'district_code', label: 'Kod', mono: true },
          { key: 'district_name', label: 'Ad' },
          { key: 'city_code', label: 'Şehir' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'district_code', label: 'İlçe kodu', code: true, editableOnNew: true, required: true },
          { key: 'district_name', label: 'İlçe adı', name: true, required: true },
          { key: 'city_code', label: 'Şehir', type: 'lookup', lookup: 'cities', valueKey: 'city_code', labelKey: 'city_name' },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'odeme-kosulu-tanimi',
        techId: 'MDM-PAYT-SCR-001',
        businessNameEn: 'PaymentTermsScreen',
        title: 'Ödeme Koşulu',
        endpoint: '/odeme-kosullari',
        crud: true,
        codeField: 'term_code',
        nameField: 'term_name',
        numeratorSeri: 'ODEME_KOSUL',
        filters: [
          { key: 'term_code', label: 'Kod' },
          { key: 'term_name', label: 'Ad' },
        ],
        columns: [
          { key: 'term_code', label: 'Kod', mono: true },
          { key: 'term_name', label: 'Ad' },
          { key: 'due_days', label: 'Vade (gün)' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'term_code', label: 'Koşul kodu', code: true, editableOnNew: true, required: true },
          { key: 'term_name', label: 'Koşul adı', name: true, required: true },
          { key: 'due_days', label: 'Vade gün', type: 'number' },
        ],
        detailFields: [
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'teslimat-kosulu-tanimi',
        techId: 'MDM-DLVT-SCR-001',
        businessNameEn: 'DeliveryTermsScreen',
        title: 'Teslimat Koşulu',
        endpoint: '/teslimat-kosullari',
        crud: true,
        codeField: 'term_code',
        nameField: 'term_name',
        numeratorSeri: 'TESLIMAT_KOSUL',
        filters: [
          { key: 'term_code', label: 'Kod' },
          { key: 'term_name', label: 'Ad' },
        ],
        columns: [
          { key: 'term_code', label: 'Kod', mono: true },
          { key: 'term_name', label: 'Ad' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'term_code', label: 'Koşul kodu', code: true, editableOnNew: true, required: true },
          { key: 'term_name', label: 'Koşul adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'dil-tanimi',
        techId: 'MDM-LANG-SCR-001',
        businessNameEn: 'LanguageDefinitionScreen',
        title: 'Dil Tanımı',
        endpoint: '/languages',
        crud: true,
        codeField: 'dil_code',
        nameField: 'dil_name',
        numeratorSeri: 'DIL',
        filters: [
          { key: 'dil_code', label: 'Kod' },
          { key: 'dil_name', label: 'Ad' },
        ],
        columns: [
          { key: 'dil_code', label: 'Kod', mono: true },
          { key: 'dil_name', label: 'Ad' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'dil_code', label: 'Dil kodu', code: true, editableOnNew: true, required: true, autoFillLanguageName: true },
          { key: 'dil_name', label: 'Dil adı', name: true, required: true, readOnlyWhen: 'auto-dil' },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'banka-tanimi',
        techId: 'MDM-BANK-SCR-001',
        businessNameEn: 'BankDefinitionScreen',
        title: 'Banka Tanımı',
        endpoint: '/banks',
        crud: true,
        codeField: 'bank_code',
        nameField: 'bank_name',
        numeratorSeri: 'BANKA',
        filters: [
          { key: 'bank_code', label: 'Kod' },
          { key: 'bank_name', label: 'Ad' },
        ],
        columns: [
          { key: 'bank_code', label: 'Kod', mono: true },
          { key: 'bank_name', label: 'Ad' },
          { key: 'swift_code', label: 'SWIFT' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'bank_code', label: 'Banka kodu', code: true, editableOnNew: true, required: true },
          { key: 'bank_name', label: 'Banka adı', name: true, required: true },
          { key: 'swift_code', label: 'SWIFT' },
          { key: 'country_code', label: 'Ülke', type: 'lookup', lookup: 'countries', valueKey: 'country_code', labelKey: 'country_name' },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'doviz-exchange_rate-tanimi',
        techId: 'FIN-FX-SCR-001',
        businessNameEn: 'ExchangeRateScreen',
        title: 'Döviz Kurları',
        endpoint: '/doviz-kurlari',
        crud: true,
        codeField: 'source_pb',
        nameField: 'target_pb',
        filters: [
          { key: 'source_pb', label: 'Kaynak PB' },
          { key: 'target_pb', label: 'Hedef PB' },
        ],
        columns: [
          { key: 'rate_date', label: 'Tarih' },
          { key: 'source_pb', label: 'Kaynak', mono: true },
          { key: 'target_pb', label: 'Hedef', mono: true },
          { key: 'buy_rate', label: 'Alış' },
          { key: 'sell_rate', label: 'Satış' },
          { key: 'source', label: 'Kaynak' },
        ],
        masterFields: [
          { key: 'rate_date', label: 'Kur tarihi', type: 'date', required: true },
          { key: 'source_pb', label: 'Kaynak PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', required: true },
          { key: 'target_pb', label: 'Hedef PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', required: true },
          { key: 'buy_rate', label: 'Alış kuru', type: 'number', required: true },
          { key: 'sell_rate', label: 'Satış kuru', type: 'number', required: true },
        ],
        detailFields: [
          { key: 'effective_buy_rate', label: 'Efektif alış', type: 'number' },
          { key: 'effective_sell_rate', label: 'Efektif satış', type: 'number' },
          { key: 'source', label: 'Kaynak' },
        ],
        detailKey: null,
        detailAsFields: true,
      },

      {
        id: 'hareket-kodlari',
        techId: 'INV-MVTC-SCR-001',
        businessNameEn: 'MovementCodeScreen',
        title: 'Hareket Kodları',
        endpoint: '/hareket-kodlari',
        crud: true,
        codeField: 'movement_code',
        nameField: 'movement_name',
        numeratorSeri: 'HAREKET_KOD',
        listCategories: [
          { id: 'SatisTeklif', label: 'Satış Teklifi' },
          { id: 'SatisSiparis', label: 'Satış Siparişi' },
          { id: 'SevkEmri', label: 'Sevk Emri' },
          { id: 'SatisIrsaliye', label: 'Satış İrsaliyesi' },
          { id: 'SatisFatura', label: 'Satış Faturası' },
          { id: 'SatinAlmaTalep', label: 'Satınalma Talebi' },
          { id: 'SatinAlmaSiparis', label: 'Satınalma Siparişi' },
          { id: 'MalKabul', label: 'Mal Kabul' },
          { id: 'AlisFatura', label: 'Alış Faturası' },
          { id: 'UretimEmri', label: 'Üretim Emri' },
          { id: 'UretimGiris', label: 'Üretim Girişi' },
          { id: 'UretimTuketim', label: 'Üretim Tüketim' },
          { id: 'Transfer', label: 'Transfer' },
          { id: 'Sayim', label: 'Sayım' },
          { id: 'Fire', label: 'Fire / Sarf' },
          { id: 'Duzeltme', label: 'Stok Düzeltme' },
        ],
        categoryKey: 'document_type',
        filters: [
          { key: 'movement_code', label: 'Hareket kodu' },
          { key: 'movement_name', label: 'Hareket adı' },
          { key: 'document_type', label: 'Belge tipi' },
        ],
        columns: [
          { key: 'movement_code', label: 'Kod', mono: true },
          { key: 'movement_name', label: 'Ad' },
          { key: 'document_type', label: 'Belge tipi' },
          { key: 'direction', label: 'Yön' },
          { key: 'stock_etkisi', label: 'Stok' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'movement_code', label: 'Hareket kodu', code: true, required: true },
          { key: 'movement_name', label: 'Hareket adı', name: true, required: true },
          { key: 'document_type', label: 'Belge tipi', type: 'select', options: ['SatisTeklif','SatisSiparis','SevkEmri','SatisIrsaliye','SatisFatura','SatinAlmaTalep','SatinAlmaSiparis','MalKabul','AlisFatura','UretimEmri','UretimGiris','UretimTuketim','Transfer','Sayim','Fire','Duzeltme'], required: true },
          { key: 'direction', label: 'Yön', type: 'select', options: ['Giris','Cikis','Transfer','Bilgi'], required: true },
        ],
        detailFields: [
          { key: 'stock_etkisi', label: 'Stok etkisi', type: 'checkbox' },
          { key: 'partner_zorunlu', label: 'Cari zorunlu', type: 'checkbox' },
          { key: 'warehouse_zorunlu', label: 'Depo zorunlu', type: 'checkbox' },
          { key: 'eksi_balance_izin', label: 'Eksi bakiye izin', type: 'checkbox' },
          { key: 'gl_account_code', label: 'Muhasebe hesap kodu' },
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'belge-tipleri',
        techId: 'MDM-DOCTYPE-SCR-001',
        businessNameEn: 'DocumentTypeScreen',
        title: 'Belge Tipleri',
        endpoint: '/belge-tipleri',
        crud: true,
        codeField: 'document_type_code',
        nameField: 'document_type_name',
        filters: [
          { key: 'document_type_code', label: 'Kod' },
          { key: 'module', label: 'Modül' },
        ],
        columns: [
          { key: 'document_type_code', label: 'Kod', mono: true },
          { key: 'document_type_name', label: 'Ad' },
          { key: 'module', label: 'Modül' },
          { key: 'stock_etkisi', label: 'Stok etkisi' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'document_type_code', label: 'Belge tipi kodu', code: true, required: true, editableOnNew: true },
          { key: 'document_type_name', label: 'Belge tipi adı', name: true, required: true },
          { key: 'module', label: 'Modül' },
          { key: 'stock_etkisi', label: 'Stok etkisi', type: 'checkbox' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        defaults: { is_active: true },
      },

    ],
  },

  {
    id: 'sistem',
    title: 'Sistem',
    sections: [
      { id: 'kullanicilar', title: 'Kullanıcılar', screenIds: ['kullanicilar', 'kullanici-gruplari'] },
      { id: 'tanimlar', title: 'Tanımlar', screenIds: ['sistem-parametreleri'] },
      { id: 'iletisim', title: 'İletişim', screenIds: ['eposta-gonderimleri'] },
      { id: 'gozlem', title: 'Gözlem', screenIds: ['audit-log', 'tablo-bilgileri', 'sql-sorgu'] },
    ],
    screens: [
      {
        id: 'kullanicilar',
        techId: 'SYS-USR-SCR-001',
        businessNameEn: 'UsersScreen',
        title: 'Kullanıcılar',
        endpoint: '/kullanicilar',
        crud: true,
        codeField: 'username',
        nameField: 'first_name',
        numeratorSeri: null,
        filters: [
          { key: 'username', label: 'Kullanıcı adı' },
          { key: 'first_name', label: 'Ad' },
          { key: 'role', label: 'Rol' },
          { key: 'group_code', label: 'Grup' },
        ],
        columns: [
          { key: 'username', label: 'Kullanıcı adı', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'role', label: 'Rol' },
          { key: 'group_code', label: 'Grup', mono: true },
          { key: 'parola_var', label: 'Şifre' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'username', label: 'Kullanıcı adı', required: true },
          { key: 'sifre', label: 'Şifre', type: 'password', requiredOnNew: true },
          { key: 'first_name', label: 'Ad', name: true, required: true },
          { key: 'last_name', label: 'Soyad', required: true },
          { key: 'title', label: 'Ünvan' },
          { key: 'role', label: 'Rol', type: 'select', options: ['Yonetici', 'Personel', 'Satinalma', 'Uretim', 'Finans'] },
          {
            key: 'group_code',
            label: 'Grup',
            type: 'lookup',
            lookup: 'kullanici-gruplari',
            valueKey: 'group_code',
            labelKey: 'group_name',
            codeKey: 'group_code',
            required: true,
          },
        ],
        detailFields: [
          { key: 'eposta', label: 'E-posta' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'user_code', label: 'Kullanıcı kodu (opsiyonel)' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
        defaults: {
          role: 'Yonetici',
          group_code: 'ADMIN',
          is_active: true,
          yetkiler: [],
          sql_permissions: { can_select: true, can_insert: false, can_update: false, can_delete: false },
        },
        kullaniciYetkiPaneli: true,
      },
      {
        id: 'kullanici-gruplari',
        techId: 'SYS-GRP-SCR-001',
        businessNameEn: 'UserGroupsScreen',
        title: 'Kullanıcı Grupları',
        endpoint: '/kullanici-gruplari',
        crud: true,
        codeField: 'group_code',
        nameField: 'group_name',
        numeratorSeri: 'KULLANICI_GRUP',
        filters: [
          { key: 'group_code', label: 'Grup kodu' },
          { key: 'group_name', label: 'Grup adı' },
        ],
        columns: [
          { key: 'group_code', label: 'Kod', mono: true },
          { key: 'group_name', label: 'Ad' },
          { key: 'satinalma_onay', label: 'SA onay' },
          { key: 'kalite_control', label: 'Kalite' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'group_code', label: 'Grup kodu', code: true, required: true },
          { key: 'group_name', label: 'Grup adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'description', label: 'Açıklama' },
          { key: 'purchase_requisition_ref', label: 'SA talep oluşturabilir', type: 'checkbox' },
          { key: 'satinalma_onay', label: 'SA onay yetkisi', type: 'checkbox' },
          { key: 'kalite_control', label: 'Kalite kontrol yetkisi', type: 'checkbox' },
          { key: 'module_permissions', label: 'Modül yetkileri JSON (["*"] veya ["stok","satis"])' },
          { key: 'warehouse_yetkileri', label: 'Depo yetkileri JSON (["*"] veya depo kodları)' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'sistem-parametreleri',
        techId: 'SYS-PRM-SCR-001',
        businessNameEn: 'SystemParametersScreen',
        title: 'Sistem Parametreleri',
        endpoint: '/sistem-parametreleri',
        crud: true,
        codeField: 'parametre_code',
        nameField: 'parametre_name',
        numeratorSeri: null,
        filters: [
          { key: 'parametre_code', label: 'Parametre' },
          { key: 'module', label: 'Modül' },
        ],
        columns: [
          { key: 'parametre_code', label: 'Kod', mono: true },
          { key: 'parametre_name', label: 'Ad' },
          { key: 'value', label: 'Değer' },
          { key: 'module', label: 'Modül' },
        ],
        masterFields: [
          { key: 'parametre_code', label: 'Parametre kodu', code: true, editableOnNew: true, required: true },
          { key: 'parametre_name', label: 'Parametre adı', name: true, required: true },
          { key: 'value', label: 'Değer' },
        ],
        detailFields: [
          { key: 'module', label: 'Modül' },
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },

      {
        id: 'audit-log',
        techId: 'SYS-AUD-SCR-001',
        businessNameEn: 'AuditLogScreen',
        title: 'Audit Log',
        endpoint: '/audit-log',
        crud: false,
        readOnly: true,
        filters: [
          { key: 'table_name', label: 'Tablo', queryParam: true },
          { key: 'ekran', label: 'Ekran / yol', queryParam: true },
          { key: 'user_code', label: 'Kullanıcı', queryParam: true },
          { key: 'action', label: 'İşlem', queryParam: true },
        ],
        columns: [
          { key: 'created_at', label: 'Zaman' },
          { key: 'user_code', label: 'Kullanıcı', mono: true },
          { key: 'table_name', label: 'Tablo', mono: true },
          { key: 'record_id', label: 'Kayıt' },
          { key: 'action', label: 'İşlem' },
          { key: 'yol', label: 'Yol' },
        ],
      },
      {
        id: 'tablo-bilgileri',
        techId: 'SYS-META-SCR-001',
        businessNameEn: 'ScreenTableCatalogScreen',
        title: 'Tablo Bilgileri',
        endpoint: '/meta/ekranlar',
        crud: false,
        readOnly: true,
        metaExplorer: true,
        filters: [],
        columns: [
          { key: 'title', label: 'Ekran' },
          { key: 'techId', label: 'Teknik kimlik', mono: true },
          { key: 'primaryTable', label: 'Ana tablo', mono: true },
        ],
      },
      {
        id: 'sql-sorgu',
        techId: 'SYS-SQL-SCR-001',
        businessNameEn: 'SqlQueryScreen',
        title: 'SQL Sorgu',
        endpoint: '/sql-console',
        crud: false,
        sqlConsole: true,
        filters: [],
        columns: [],
      },
      {
        id: 'eposta-gonderimleri',
        techId: 'SYS-MAIL-SCR-001',
        businessNameEn: 'EmailDispatchScreen',
        title: 'E-posta Gönderimleri',
        endpoint: '/eposta-gonderimleri',
        crud: false,
        readOnly: true,
        filters: [
          { key: 'status', label: 'Durum' },
          { key: 'alici', label: 'Alıcı' },
          { key: 'source_type', label: 'Kaynak' },
        ],
        columns: [
          { key: 'id', label: 'ID', mono: true },
          { key: 'source_type', label: 'Kaynak' },
          { key: 'alici', label: 'Alıcı' },
          { key: 'konu', label: 'Konu' },
          { key: 'status', label: 'Durum' },
          { key: 'deneme_sayisi', label: 'Deneme' },
          { key: 'gonderim_date', label: 'Gönderim' },
          { key: 'son_hata', label: 'Hata' },
        ],
      },

    ],
  },
  {
    id: 'ana-veri',
    title: 'Ana Veri',
    sections: [
      { id: 'organizasyon', title: 'Organizasyon', screenIds: ['companies', 'is-yerleri', 'warehouses'] },
    ],
    screens: [
      {
        id: 'companies',
        techId: 'MDM-CO-SCR-001',
        businessNameEn: 'CompanyScreen',
        title: 'Firmalar',
        endpoint: '/companies',
        crud: true,
        // Org tanımı: aktif firma izolasyonu listede uygulanmaz
        scopeFirma: false,
        scopeIsYeri: false,
        codeField: 'company_code',
        nameField: 'company_name',
        numeratorSeri: 'FIRMA',
        filters: [
          { key: 'company_code', label: 'Firma kodu' },
          { key: 'company_name', label: 'Firma adı' },
        ],
        columns: [
          { key: 'company_code', label: 'Kod', mono: true },
          { key: 'company_name', label: 'Ad' },
        ],
        masterFields: [
          { key: 'company_code', label: 'Firma kodu', code: true, required: true },
          { key: 'company_name', label: 'Firma adı', name: true, required: true },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'is-yerleri',
        techId: 'MDM-PLANT-SCR-001',
        businessNameEn: 'PlantSiteScreen',
        title: 'İş Yerleri',
        endpoint: '/is-yerleri',
        crud: true,
        scopeFirma: false,
        scopeIsYeri: false,
        codeField: 'plant_code',
        nameField: 'plant_name',
        numeratorSeri: 'ISYERI',
        filters: [
          { key: 'company_name', label: 'Firma' },
          { key: 'plant_code', label: 'İş yeri kodu' },
          { key: 'plant_name', label: 'İş yeri adı' },
        ],
        columns: [
          { key: 'company_name', label: 'Firma' },
          { key: 'plant_code', label: 'Kod', mono: true },
          { key: 'plant_name', label: 'Ad' },
          { key: 'address', label: 'Adres' },
        ],
        masterFields: [
          { key: 'plant_code', label: 'İş yeri kodu', code: true, required: true },
          { key: 'plant_name', label: 'İş yeri adı', name: true, required: true },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
        ],
        detailFields: [
          { key: 'address', label: 'Adres' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'warehouses',
        techId: 'MDM-WH-SCR-001',
        businessNameEn: 'WarehouseMasterScreen',
        title: 'Depolar',
        endpoint: '/warehouses',
        crud: true,
        scopeFirma: false,
        scopeIsYeri: false,
        codeField: 'warehouse_code',
        nameField: 'warehouse_name',
        numeratorSeri: 'DEPO',
        filters: [
          { key: 'company_code', label: 'Firma' },
          { key: 'plant_code', label: 'İş yeri' },
          { key: 'warehouse_code', label: 'Depo kodu' },
          { key: 'warehouse_name', label: 'Depo adı' },
        ],
        columns: [
          { key: 'company_code', label: 'Firma', mono: true },
          { key: 'plant_code', label: 'İş yeri', mono: true },
          { key: 'warehouse_code', label: 'Kod', mono: true },
          { key: 'warehouse_name', label: 'Ad' },
          { key: 'varsayilan', label: 'Varsayılan' },
        ],
        masterFields: [
          { key: 'warehouse_code', label: 'Depo kodu', code: true, required: true },
          { key: 'warehouse_name', label: 'Depo adı', name: true, required: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
        ],
        detailFields: [
          { key: 'raf_code', label: 'Raf kodu' },
          { key: 'konum_code', label: 'Konum kodu' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
    ],
  },
  {
    id: 'stok',
    title: 'Stok',
    sections: [
      { id: 'kartlar', title: 'Kartlar', screenIds: ['stok-karti'] },
      { id: 'bakiye-hareket', title: 'Bakiye & Hareket', screenIds: ['depo-bakiye', 'stok-hareketleri', 'transfer-emirleri', 'sayim-belgeleri', 'stok-partileri', 'stok-rezervasyonlari', 'stok-serileri', 'stok-ikame'] },
      { id: 'planlama', title: 'Planlama', screenIds: ['mrp-bagimsiz-ihtiyac', 'mrp-calisma', 'mrp-hesap', 'mrp-sonuclar'] },
    ],
    screens: [
      {
        id: 'stok-karti',
        techId: 'INV-ITM-SCR-001',
        businessNameEn: 'ItemMasterScreen',
        title: 'Stok Kartı',
        endpoint: '/items',
        crud: true,
        codeField: 'item_code',
        nameField: 'item_name',
        numeratorSeri: 'HAMMADDE',
        numeratorFromField: { field: 'item_type', map: {
          Hammadde: 'HAMMADDE',
          YariMamul: 'YARIMAMUL',
          Mamul: 'MAMUL',
          Ticari: 'TICARI',
          Hizmet: 'TICARI',
        } },
        filters: [
          { key: 'company_code', label: 'Firma' },
          { key: 'plant_code', label: 'İş yeri' },
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'item_name', label: 'Stok adı' },
        ],
        columns: [
          { key: 'company_code', label: 'Firma', mono: true },
          { key: 'plant_code', label: 'İş yeri', mono: true },
          { key: 'item_code', label: 'Stok kodu', mono: true },
          { key: 'item_name', label: 'Stok adı' },
          { key: 'item_type', label: 'Tip' },
          { key: 'tedarik_type', label: 'Tedarik' },
          { key: 'uom_code', label: 'Birim' },
          { key: 'sales_price', label: 'Fiyat' },
        ],
        masterFields: [
          { key: 'item_type', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'], required: true, lead: true },
          { key: 'item_code', label: 'Stok kodu', code: true, required: true },
          { key: 'item_name', label: 'Stok adı', name: true, required: true },
          { key: 'description', label: 'Açıklama' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
        ],
        detailFields: [
          { key: 'boyut', label: 'Boyut' },
          { key: 'agirlik', label: 'Ağırlık', type: 'number' },
        ],
        detailKey: 'item_details',
        formTabs: [
          {
            id: 'ana', label: 'Stok Kart', kind: 'master-detail',
            masterFields: [
              {
                key: 'company_id',
                label: 'Firma',
                type: 'lookup',
                lookup: 'companies',
                valueKey: 'id',
                labelKey: 'company_name',
                codeKey: 'company_code',
                required: true,
                lead: true,
                critical: true,
                group: 'organizasyon',
              },
              {
                key: 'plant_id',
                label: 'İş yeri',
                type: 'lookup',
                lookup: 'is-yerleri',
                valueKey: 'id',
                labelKey: 'plant_name',
                codeKey: 'plant_code',
                required: true,
                lead: true,
                critical: true,
                group: 'organizasyon',
              },
              { key: 'item_type', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'], required: true, lead: true, group: 'kimlik' },
              { key: 'item_code', label: 'Stok kodu', code: true, required: true, group: 'kimlik' },
              { key: 'item_name', label: 'Stok adı', name: true, required: true, group: 'kimlik' },
              { key: 'item_name_2', label: 'Stok adı 2', group: 'kimlik' },
              { key: 'uzun_item_code', label: 'Uzun stok kodu', group: 'kimlik' },
              { key: 'tedarik_type', label: 'Tedarik tipi', type: 'select', options: ['Satinalma', 'Uretim'], hint: 'Satınalma veya üretim temini', group: 'kimlik' },
              { key: 'uom_code', label: 'Baz birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', required: true, group: 'olcu' },
              { key: 'sales_price', label: 'Satış fiyatı', type: 'number', group: 'finans' },
              { key: 'is_active', label: 'Aktif', type: 'checkbox', group: 'status' },
            ],
            detailFields: [
              { key: 'country_mensei', label: 'Ülke menşei', type: 'lookup', lookup: 'countries', valueKey: 'country_code', labelKey: 'country_name', group: 'address' },
              { key: 'uretici_code', label: 'Üretici kodu', group: 'kimlik' },
              { key: 'old_item_code', label: 'Eski stok kodu', group: 'kimlik' },
              { key: 'original_code', label: 'Orijinal kod', group: 'kimlik' },
              { key: 'gtip_code', label: 'GTİP / gümrük kodu', group: 'kimlik' },
              { key: 'class_code', label: 'Sınıf kodu', group: 'kimlik' },
              { key: 'varsayilan_vat_rate', label: 'Varsayılan KDV %', type: 'number', group: 'finans' },
              { key: 'description', label: 'Açıklama', group: 'status' },
            ],
          },
          {
            id: 'olcu', label: 'Ölçü Bilgileri', kind: 'fields',
            fields: [
              { key: 'hacim', label: 'Hacim', type: 'number' },
              { key: 'hacim_uom', label: 'Hacim birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
              { key: 'yogunluk', label: 'Yoğunluk', type: 'number' },
              { key: 'yogunluk_uom', label: 'Yoğunluk birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
              { key: 'agirlik_uom', label: 'Ağırlık birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
              { key: 'net_agirlik', label: 'Net ağırlık', type: 'number' },
              { key: 'brut_agirlik', label: 'Brüt ağırlık', type: 'number' },
              { key: 'koli_brut_agirlik', label: 'Koli brüt ağırlık', type: 'number' },
              { key: 'kutu_brut_agirlik', label: 'Kutu brüt ağırlık', type: 'number' },
              { key: 'kutu_en_mm', label: 'Kutu en (mm)', type: 'number' },
              { key: 'kutu_boy_mm', label: 'Kutu boy (mm)', type: 'number' },
              { key: 'kutu_yukseklik_mm', label: 'Kutu yükseklik (mm)', type: 'number' },
              { key: 'barkod', label: 'Barkod' },
              { key: 'raf_omru_days', label: 'Raf ömrü (gün)', type: 'number' },
              { key: 'quantity_hassasiyeti', label: 'Miktar hassasiyeti', type: 'number' },
              { key: 'lot_politika', label: 'Parti politikası', type: 'select', options: ['Takipsiz', 'IstegeBagli', 'Zorunlu'] },
              { key: 'series_politika', label: 'Seri politikası', type: 'select', options: ['Takipsiz', 'IstegeBagli', 'Zorunlu'] },
              { key: 'kalite_control_gerekli', label: 'Kalite kontrol gerekli', type: 'checkbox' },
              { key: 'varsayilan_giris_warehouse_id', label: 'Varsayılan giriş depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
              { key: 'varsayilan_cikis_warehouse_id', label: 'Varsayılan çıkış depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
            ],
          },
          {
            id: 'uom_code', label: 'Birim Dönüşümleri', kind: 'grid', key: 'birim_tanimlari', slots: 3,
            fields: [
              { key: 'source_katsayi', label: 'Katsayı', type: 'number', size: 'short', hint: 'Sol quantity' },
              { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
              { key: '_esittir', label: '=', type: 'static', size: 'short' },
              { key: 'katsayi', label: 'Katsayı', type: 'number', size: 'short', hint: 'Sağ quantity' },
              { key: 'cevrilecek_uom', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
              { key: 'barkod', label: 'Barkod' },
              { key: 'takip_uom_mi', label: 'Takip birimi', type: 'checkbox' },
            ],
          },
          {
            id: 'satinalma-stok', label: 'Satınalma', kind: 'fields',
            fields: [
              { key: 'purchase_uom', label: 'Satınalma birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
              { key: 'sales_uom', label: 'Satış birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
              { key: 'sa_tolerans_min_yuzde', label: 'SA tolerans min %', type: 'number' },
              { key: 'sa_tolerans_max_yuzde', label: 'SA tolerans max %', type: 'number' },
              { key: 'varsayilan_vat_rate', label: 'Varsayılan KDV %', type: 'number' },
              { key: 'temin_suresi_days', label: 'Temin süresi (gün)', type: 'number' },
              { key: 'cikis_type', label: 'Çıkış tipi', type: 'select', options: ['Manuel', 'OtomatikEmis', 'PartiDagitim'] },
              { key: 'silindi', label: 'Silindi', type: 'checkbox' },
            ],
          },
          {
            id: 'detay', label: 'Stok Detay', kind: 'grid', key: 'item_details', slots: 1,
            fields: [
              { key: 'boyut', label: 'Boyut' },
              { key: 'agirlik', label: 'Ağırlık', type: 'number' },
            ],
          },
          {
            id: 'kategori', label: 'Kategoriler', kind: 'fields',
            fields: [
              { key: 'abc_code', label: 'ABC kodu', type: 'lookup', lookup: 'kategoriler-abc', valueKey: 'category_code', labelKey: 'category_name' },
              { key: 'marka', label: 'Marka', type: 'lookup', lookup: 'kategoriler-marka', valueKey: 'category_code', labelKey: 'category_name' },
              { key: 'class_code', label: 'Sınıf kodu' },
            ],
          },
          {
            id: 'barkod-tab', label: 'Barkod', kind: 'grid', key: 'barkodlar', slots: 3,
            fields: [
              { key: 'barkod', label: 'Barkod' },
              { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
          },
          {
            id: 'dil-stok', label: 'Dil Tanımları', kind: 'grid', key: 'dil_tanimlari', slots: 2,
            fields: [
              { key: 'dil_code', label: 'Dil kodu', type: 'lookup', lookup: 'languages', valueKey: 'dil_code', labelKey: 'dil_name', autoFillName: 'dil_name' },
              { key: 'item_name', label: 'Stok adı (dil)' },
              { key: 'description', label: 'Açıklama' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
          },
          {
            id: 'mrp',
            label: 'MRP',
            kind: 'fields',
            fields: [
              { key: 'safety_stock', label: 'Emniyet stok', type: 'number' },
              { key: 'min_stock', label: 'Minimum stok', type: 'number' },
              { key: 'reorder_level', label: 'Yeniden sipariş seviyesi', type: 'number' },
              { key: 'fixed_order_quantity', label: 'Sabit sipariş miktarı', type: 'number' },
              { key: 'optimum_order_quantity', label: 'Optimum sipariş miktarı', type: 'number' },
              { key: 'temin_suresi_days', label: 'Temin süresi (gün)', type: 'number' },
              { key: 'max_stock', label: 'Maksimum stok', type: 'number' },
              { key: 'cikis_type', label: 'Çıkış tipi', type: 'select', options: ['Manuel', 'OtomatikEmis', 'PartiDagitim'] },
            ],
          },
        ],
      },
      {
        id: 'depo-bakiye',
        techId: 'INV-BAL-SCR-001',
        businessNameEn: 'WarehouseBalanceScreen',
        title: 'Depo Bakiye',
        endpoint: '/stok-bakiyeleri',
        crud: false,
        readOnly: true,
        hideActions: true,
        contextMenu: [
          { id: 'stok-hareketleri', label: 'Stok Hareketleri', openScreen: 'stok-hareketleri', passFilters: ['item_code', 'warehouse_code', 'item_id', 'warehouse_id'] },
        ],
        filters: [
          { key: 'warehouse_code', label: 'Depo kodu' },
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'item_name', label: 'Stok adı' },
          { key: 'item_type', label: 'Stok tipi' },
          { key: 'stock_status', label: 'Stok statü' },
          { key: 'lot_no', label: 'Parti no' },
          { key: 'yalnizca_stokta', label: 'Yalnızca stokta olanları göster', type: 'checkbox', default: true, queryParam: true },
        ],
        columns: [
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'item_type', label: 'Tip' },
          { key: 'stock_status', label: 'Statü' },
          { key: 'lot_no', label: 'Parti', mono: true },
          { key: 'bakiye', label: 'Bakiye', mono: true },
          { key: 'rezerve', label: 'Rezerve', mono: true },
          { key: 'bloke', label: 'Bloke', mono: true },
          { key: 'tahsis', label: 'Tahsis', mono: true },
          { key: 'yolda', label: 'Yolda', mono: true },
          { key: 'kullanilabilir', label: 'Kullanılabilir', mono: true },
          { key: 'safety_stock', label: 'Emniyet' },
        ],
      },
      {
        id: 'stok-hareketleri',
        techId: 'INV-MVT-SCR-001',
        businessNameEn: 'StockMovementScreen',
        title: 'Stok Hareketleri',
        endpoint: '/stok-hareketleri',
        crud: true,
        numeratorSeri: 'STOK_HAREKET',
        codeField: 'movement_no',
        nameField: 'movement_type',
        categoryKey: 'movement_type',
        listCategories: [
          { id: 'STOK_GIRIS', label: 'Giriş' },
          { id: 'STOK_CIKIS', label: 'Çıkış' },
          { id: 'TRANSFER', label: 'Transfer' },
          { id: 'SAYIM', label: 'Sayım' },
          { id: 'FIRE', label: 'Fire' },
          { id: 'DUZELTME', label: 'Düzeltme' },
        ],
        filters: [
          { key: 'movement_no', label: 'Hareket no' },
          { key: 'movement_type', label: 'Tip' },
          { key: 'warehouse_code', label: 'Depo' },
          { key: 'movement_code', label: 'Hareket kodu' },
        ],
        columns: [
          { key: 'movement_no', label: 'Hareket', mono: true },
          { key: 'movement_code', label: 'Kod', mono: true },
          { key: 'movement_type', label: 'Tip' },
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'ref_no', label: 'Referans', mono: true },
          { key: 'fiziksel_date', label: 'Fiziksel' },
          { key: 'fiscal_date', label: 'Mali' },
          { key: 'cost_total', label: 'Maliyet' },
          { key: 'user_code', label: 'Kullanıcı' },
          { key: 'onay_status', label: 'Onay' },
        ],
        masterFields: [
          { key: 'movement_no', label: 'Hareket no', code: true },
          { key: 'movement_code_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-stok', valueKey: 'id', labelKey: 'movement_name', codeKey: 'movement_code', required: true },
          { key: 'warehouse_id', label: 'Depo (source)', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true },
          { key: 'target_warehouse_id', label: 'Hedef depo (transfer)', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'movement_date', label: 'Tarih', type: 'date' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'barkod', label: 'Barkod', hint: 'Okutunca stok eşleşir' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
          { key: 'raf_code', label: 'Raf' },
          { key: 'konum_code', label: 'Konum' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'transfer-emirleri',
        techId: 'WMS-XFER-SCR-001',
        businessNameEn: 'TransferOrderScreen',
        title: 'Transfer Emirleri',
        endpoint: '/transfer-emirleri',
        crud: true,
        codeField: 'order_no',
        nameField: 'kaynak_depo_kodu',
        numeratorSeri: 'TRANSFER_EMRI',
        approveAction: { label: 'Onayla (Transfer)', path: '/transfer-emirleri/{id}/onayla' },
        filters: [
          { key: 'order_no', label: 'Emir no' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'order_no', label: 'Emir', mono: true },
          { key: 'kaynak_depo_kodu', label: 'Kaynak', mono: true },
          { key: 'hedef_depo_kodu', label: 'Hedef', mono: true },
          { key: 'requisition_date', label: 'Talep' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'order_no', label: 'Emir no', code: true },
          { key: 'source_warehouse_id', label: 'Kaynak depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true },
          { key: 'target_warehouse_id', label: 'Hedef depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'requisition_date', label: 'Talep tarihi', type: 'date' },
          { key: 'planlanan_date', label: 'Planlanan', type: 'date' },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'uom_code', label: 'Birim' },
          { key: 'raf_code', label: 'Raf' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'sayim-belgeleri',
        techId: 'WMS-CNT-SCR-001',
        businessNameEn: 'PhysicalCountScreen',
        title: 'Sayım Belgeleri',
        endpoint: '/sayim-belgeleri',
        crud: true,
        codeField: 'document_no',
        nameField: 'warehouse_code',
        numeratorSeri: 'SAYIM_BELGE',
        approveAction: { label: 'Onayla (Düzelt)', path: '/sayim-belgeleri/{id}/onayla' },
        filters: [
          { key: 'document_no', label: 'Belge no' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'document_no', label: 'Belge', mono: true },
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'sayim_date', label: 'Tarih' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'document_no', label: 'Belge no', code: true },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'sayim_date', label: 'Sayım tarihi', type: 'date' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'sistem_quantity', label: 'Sistem', type: 'number' },
          { key: 'sayilan_quantity', label: 'Sayılan', type: 'number' },
          { key: 'uom_code', label: 'Birim' },
          { key: 'raf_code', label: 'Raf' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'stok-partileri',
        techId: 'INV-LOT-SCR-001',
        businessNameEn: 'LotBatchScreen',
        title: 'Stok Partileri',
        endpoint: '/stok-partileri',
        crud: true,
        numeratorSeri: 'PARTI',
        codeField: 'lot_no',
        nameField: 'item_name',
        filters: [
          { key: 'lot_no', label: 'Parti no' },
          { key: 'item_code', label: 'Stok kodu' },
        ],
        columns: [
          { key: 'lot_no', label: 'Parti', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'lot_politika', label: 'Politika' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'lot_no', label: 'Parti no', code: true },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'production_date', label: 'Üretim tarihi', type: 'date' },
          { key: 'son_kullanma_date', label: 'SKT', type: 'date' },
        ],
        detailFields: [
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'mrp-bagimsiz-ihtiyac',
        techId: 'MFG-IR-SCR-001',
        businessNameEn: 'IndependentRequirementsScreen',
        title: 'MRP Bağımsız İhtiyaç',
        endpoint: '/mrp/bagimsiz-ihtiyaclar',
        crud: true,
        codeField: 'ihtiyac_no',
        nameField: 'item_name',
        numeratorSeri: 'MRP_BI',
        filters: [
          { key: 'ihtiyac_no', label: 'No' },
          { key: 'item_code', label: 'Stok' },
          { key: 'source', label: 'Kaynak' },
        ],
        columns: [
          { key: 'ihtiyac_no', label: 'No', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'quantity', label: 'Miktar' },
          { key: 'ihtiyac_date', label: 'İhtiyaç tar.' },
          { key: 'source', label: 'Kaynak' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'ihtiyac_no', label: 'İhtiyaç no', code: true, required: true },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'quantity', label: 'Miktar', type: 'number', required: true },
          { key: 'ihtiyac_date', label: 'İhtiyaç tarihi', type: 'date', required: true },
          { key: 'source', label: 'Kaynak', type: 'select', options: ['Manuel', 'Siparis', 'Tahmin', 'Bütçe'] },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
        ],
        detailFields: [
          { key: 'uom_code', label: 'Birim' },
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'mrp-calisma',
        techId: 'MFG-MRP-SCR-001',
        businessNameEn: 'MrpRunScreen',
        title: 'MRP Çalıştır',
        endpoint: '/mrp/calismalar',
        crud: false,
        readOnly: true,
        mrpCalistirAction: true,
        filters: [
          { key: 'run_no', label: 'Çalışma no' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'run_no', label: 'No', mono: true },
          { key: 'status', label: 'Durum' },
          { key: 'start_ts', label: 'Başlangıç' },
          { key: 'end_ts', label: 'Bitiş' },
          { key: 'line_sayisi', label: 'Satır' },
          { key: 'net_pozitif', label: 'Net>0' },
          { key: 'description', label: 'Açıklama' },
        ],
        nested: { screenId: 'mrp-sonuclar', link: 'mrp-result' },
      },
      {
        id: 'mrp-hesap',
        techId: 'MFG-MRP-SCR-002',
        businessNameEn: 'MrpInstantCalcScreen',
        title: 'MRP Anlık Hesap',
        endpoint: '/mrp',
        crud: false,
        readOnly: true,
        mrpTalepAction: true,
        mrpUretimAction: true,
        mrpCalistirAction: true,
        filters: [
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'oneri', label: 'Öneri' },
        ],
        columns: [
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'bagimsiz_ihtiyac', label: 'Bağımsız' },
          { key: 'bagimli_ihtiyac', label: 'Bağımlı' },
          { key: 'safety_stock', label: 'Emniyet' },
          { key: 'available_stock', label: 'Eldeki' },
          { key: 'acik_satinalma', label: 'Açık SA' },
          { key: 'planlanan_production', label: 'Açık UE' },
          { key: 'net_ihtiyac', label: 'Net' },
          { key: 'onerilen_quantity', label: 'Öneri quantity' },
          { key: 'oneri', label: 'Öneri' },
          { key: 'planlanan_start', label: 'Plan baş.' },
        ],
      },
      {
        id: 'mrp-sonuclar',
        techId: 'MFG-MRP-RES-001',
        businessNameEn: 'MrpResultsScreen',
        title: 'MRP Sonuçları',
        endpoint: '/mrp/calismalar',
        crud: false,
        readOnly: true,
        mrpTalepAction: true,
        mrpUretimAction: true,
        mrpSonucMode: true,
        filters: [
          { key: 'item_code', label: 'Stok' },
          { key: 'oneri', label: 'Öneri' },
        ],
        columns: [
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'bagimsiz_ihtiyac', label: 'Bağımsız' },
          { key: 'bagimli_ihtiyac', label: 'Bağımlı' },
          { key: 'available_stock', label: 'Eldeki' },
          { key: 'net_ihtiyac', label: 'Net' },
          { key: 'onerilen_quantity', label: 'Öneri quantity' },
          { key: 'oneri', label: 'Öneri' },
          { key: 'donusturuldu', label: 'Dönüştü' },
          { key: 'donusum_document_no', label: 'Belge' },
        ],
      },
      {
        id: 'stok-rezervasyonlari',
        techId: 'INV-RSV-SCR-001',
        businessNameEn: 'StockReservationScreen',
        title: 'Stok Rezervasyonları',
        endpoint: '/stok-rezervasyonlari',
        crud: false,
        readOnly: true,
        filters: [
          { key: 'rezervasyon_no', label: 'Rezervasyon' },
          { key: 'item_code', label: 'Stok' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'rezervasyon_no', label: 'No', mono: true },
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'quantity', label: 'Miktar' },
          { key: 'remaining_quantity', label: 'Kalan' },
          { key: 'status', label: 'Durum' },
        ],
      },
      {
        id: 'stok-serileri',
        techId: 'INV-SER-SCR-001',
        businessNameEn: 'SerialNumberScreen',
        title: 'Stok Serileri',
        endpoint: '/stok-serileri',
        crud: true,
        codeField: 'serial_no',
        nameField: 'item_name',
        numeratorSeri: 'SERI',
        filters: [
          { key: 'serial_no', label: 'Seri no' },
          { key: 'item_code', label: 'Stok' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'serial_no', label: 'Seri', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'lot_no', label: 'Parti', mono: true },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'serial_no', label: 'Seri no', code: true },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Depoda', 'SevkEdildi', 'Hurda', 'Serviste'] },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'stok-ikame',
        techId: 'INV-SUB-SCR-001',
        businessNameEn: 'ItemSubstitutionScreen',
        title: 'Stok İkame',
        endpoint: '/stok-ikame',
        crud: true,
        codeField: 'item_code',
        nameField: 'ikame_stok_kodu',
        filters: [
          { key: 'item_code', label: 'Stok' },
          { key: 'ikame_stok_kodu', label: 'İkame' },
        ],
        columns: [
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'ikame_stok_kodu', label: 'İkame', mono: true },
          { key: 'ikame_stok_adi', label: 'İkame first_name' },
          { key: 'priority', label: 'Öncelik' },
        ],
        masterFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'ikame_item_id', label: 'İkame stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'priority', label: 'Öncelik', type: 'number' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
      },

    ],
  },
  {
    id: 'cari',
    title: 'Cari',
    sections: [
      { id: 'kartlar', title: 'Kartlar', screenIds: ['cari-kartlari'] },
      { id: 'finans', title: 'Finans', screenIds: ['cari-ekstre', 'tahsilat-odemeler'] },
    ],
    screens: [
      {
        id: 'cari-kartlari',
        techId: 'MDM-BP-SCR-001',
        businessNameEn: 'BusinessPartnerScreen',
        title: 'Cari Kartları',
        endpoint: '/partners',
        crud: true,
        codeField: 'partner_code',
        nameField: 'partner_name',
        numeratorSeri: 'MUSTERI',
        numeratorFromField: { field: 'partner_type', map: {
          Musteri: 'MUSTERI',
          Tedarikci: 'TEDARIKCI',
          HerIkisi: 'CARI_HERIKISI',
        } },
        filters: [
          { key: 'plant_code', label: 'İş yeri' },
          { key: 'partner_code', label: 'Cari kodu' },
          { key: 'partner_name', label: 'Cari adı' },
          { key: 'partner_type', label: 'Tür' },
        ],
        columns: [
          { key: 'partner_code', label: 'Kod', mono: true },
          { key: 'partner_name', label: 'Ad' },
          { key: 'partner_type', label: 'Tür' },
          { key: 'plant_code', label: 'İş yeri', mono: true },
          { key: 'telefon', label: 'Telefon' },
          { key: 'il', label: 'İl' },
        ],
        masterFields: [
          { key: 'partner_type', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true, lead: true },
          { key: 'partner_code', label: 'Cari kodu', code: true, required: true },
          { key: 'partner_name', label: 'Cari adı', name: true, required: true },
          { key: 'description', label: 'Açıklama' },
          { key: 'tax_id', label: 'VKN / TCKN' },
          { key: 'bill_address_1', label: 'Adres 1' },
        ],
        detailFields: [
          { key: 'address', label: 'Adres' },
          { key: 'billing_address', label: 'Fatura adresi' },
          { key: 'yetkili_name', label: 'Yetkili' },
          { key: 'yetkili_telefon', label: 'Yetkili tel' },
        ],
        detailKey: 'partner_details',
        formTabs: [
          {
            id: 'ana', label: 'Cari Kart', kind: 'master-detail',
            masterFields: [
              { key: 'partner_type', label: 'Hesap türü', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true, lead: true, group: 'kimlik' },
              { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', critical: true, group: 'organizasyon' },
              { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', group: 'organizasyon' },
              { key: 'partner_code', label: 'Cari kodu', code: true, required: true, group: 'kimlik' },
              { key: 'partner_name', label: 'Cari adı', name: true, required: true, group: 'kimlik' },
              { key: 'partner_name_2', label: 'Cari adı 2', group: 'kimlik' },
              { key: 'is_active', label: 'Aktif', type: 'checkbox', group: 'status' },
              { key: 'silindi', label: 'Silindi', type: 'checkbox', group: 'status' },
            ],
            detailFields: [
              { key: 'tax_id', label: 'VKN / TCKN', group: 'finans' },
              { key: 'tax_office', label: 'Vergi dairesi', group: 'finans' },
              { key: 'pasaport_no', label: 'Pasaport no', group: 'kimlik' },
              { key: 'first_name', label: 'Ad', group: 'kimlik' },
              { key: 'last_name', label: 'Soyad', group: 'kimlik' },
              { key: 'country', label: 'Ülke', type: 'lookup', lookup: 'countries', valueKey: 'country_code', labelKey: 'country_name', group: 'address' },
              { key: 'il', label: 'İl', group: 'address' },
              { key: 'district', label: 'İlçe', group: 'address' },
              { key: 'postal_code', label: 'Posta kodu', group: 'address' },
              { key: 'bill_address_1', label: 'Adres 1', group: 'address' },
              { key: 'bill_address_2', label: 'Adres 2', group: 'address' },
              { key: 'bill_address_3', label: 'Adres 3', group: 'address' },
              { key: 'telefon', label: 'Telefon 1', group: 'iletisim' },
              { key: 'telefon2', label: 'Telefon 2', group: 'iletisim' },
              { key: 'mobile_phone', label: 'Cep tel', group: 'iletisim' },
              { key: 'email', label: 'E-posta', group: 'iletisim' },
              { key: 'website', label: 'Website', group: 'iletisim' },
              { key: 'fax', label: 'Fax', group: 'iletisim' },
              { key: 'yetkili_name', label: 'Yetkili', group: 'iletisim' },
              { key: 'yetkili_telefon', label: 'Yetkili tel', group: 'iletisim' },
              { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', group: 'finans' },
              { key: 'payment_due_days', label: 'Vade (gün)', type: 'number', group: 'finans' },
              { key: 'description', label: 'Açıklama', group: 'status' },
              { key: 'notlar', label: 'Notlar', group: 'status' },
            ],
          },
          {
            id: 'firma-param', label: 'Firma Parametreleri', kind: 'grid', key: 'firma_parametreleri', slots: 2,
            fields: [
              { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
              { key: 'gl_account_code', label: 'Muhasebe hesap' },
              { key: 'currency_code', label: 'Para birimi' },
              { key: 'partner_type', label: 'Cari tipi' },
              { key: 'risk_group_code', label: 'Risk grubu' },
              { key: 'nakit_akisa_dahil', label: 'Nakit akışa dahil', type: 'checkbox' },
              { key: 'rate_degerlemeye_dahil', label: 'Kur değerleme', type: 'checkbox' },
            ],
          },
          {
            id: 'banka', label: 'Banka Bilgisi', kind: 'grid', key: 'banka_bilgileri', slots: 3,
            fields: [
              { key: 'iban', label: 'IBAN' },
              { key: 'bank_code', label: 'Banka kodu' },
              { key: 'bank_name', label: 'Banka adı' },
              { key: 'swift_no', label: 'SWIFT' },
              { key: 'currency_code', label: 'Para birimi' },
              { key: 'branch_code', label: 'Şube kodu' },
              { key: 'branch_name', label: 'Şube adı' },
              { key: 'account_no', label: 'Hesap no' },
              { key: 'muhabir_account_no', label: 'Muhabir hesap' },
              { key: 'description', label: 'Açıklama' },
              { key: 'is_inactive', label: 'Pasif', type: 'checkbox' },
            ],
          },
          {
            id: 'sevk', label: 'Sevk Adresleri', kind: 'grid', key: 'sevk_adresleri', slots: 3,
            fields: [
              { key: 'address_name', label: 'Adres adı' },
              { key: 'adres1', label: 'Adres 1' },
              { key: 'adres2', label: 'Adres 2' },
              { key: 'adres3', label: 'Adres 3' },
              { key: 'country', label: 'Ülke' },
              { key: 'il', label: 'İl' },
              { key: 'district', label: 'İlçe' },
              { key: 'postal_code', label: 'Posta kodu' },
              { key: 'telefon', label: 'Telefon' },
              { key: 'yetkili_name', label: 'Yetkili' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
              { key: 'is_inactive', label: 'Pasif', type: 'checkbox' },
            ],
          },
          {
            id: 'genel', label: 'Genel Bilgiler', kind: 'fields',
            fields: [
              { key: 'kurulus_date', label: 'Kuruluş tarihi', type: 'date' },
              { key: 'sektor_code', label: 'Sektör', type: 'lookup', lookup: 'kategoriler-sektor', valueKey: 'category_code', labelKey: 'category_name' },
              { key: 'region_code', label: 'Bölge', type: 'lookup', lookup: 'kategoriler-region', valueKey: 'category_code', labelKey: 'category_name' },
              { key: 'nace_code', label: 'NACE kodu' },
              { key: 'sermaye', label: 'Sermaye', type: 'number' },
            ],
          },
          {
            id: 'dil', label: 'Dil Tanımları', kind: 'grid', key: 'dil_tanimlari', slots: 2,
            fields: [
              { key: 'dil_code', label: 'Dil kodu', type: 'lookup', lookup: 'languages', valueKey: 'dil_code', labelKey: 'dil_name', autoFillName: 'dil_name' },
              { key: 'partner_name', label: 'Cari adı (dil)' },
              { key: 'description', label: 'Açıklama' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
          },
          { id: 'kategori', label: 'Kategoriler', kind: 'stub', note: 'Cari kategori modeli henüz yok.' },
          { id: 'ekalan', label: 'Ek Alanlar', kind: 'stub', note: 'Esnek ek alan altyapısı henüz yok.' },
        ],
      },
      {
        id: 'cari-ekstre',
        techId: 'FIN-BPST-SCR-001',
        businessNameEn: 'BusinessPartnerStatementScreen',
        title: 'Cari Ekstre',
        endpoint: '/cari-hareketleri',
        crud: false,
        readOnly: true,
        filters: [
          { key: 'movement_no', label: 'Hareket no' },
          { key: 'direction', label: 'Yön' },
          { key: 'document_type', label: 'Belge tipi' },
        ],
        columns: [
          { key: 'movement_no', label: 'No', mono: true },
          { key: 'movement_date', label: 'Tarih' },
          { key: 'direction', label: 'Yön' },
          { key: 'amount', label: 'Tutar' },
          { key: 'document_type', label: 'Belge' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'tahsilat-odemeler',
        techId: 'FIN-APAR-SCR-001',
        businessNameEn: 'CollectionPaymentScreen',
        title: 'Tahsilat / Ödeme',
        endpoint: '/tahsilat-odemeler',
        crud: true,
        codeField: 'document_no',
        nameField: 'partner_name',
        numeratorSeri: 'TAHSILAT',
        filters: [
          { key: 'document_no', label: 'Belge no' },
          { key: 'type', label: 'Tip' },
          { key: 'partner_name', label: 'Cari' },
        ],
        columns: [
          { key: 'document_no', label: 'Belge', mono: true },
          { key: 'type', label: 'Tip' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'amount', label: 'Tutar' },
          { key: 'currency_code', label: 'PB' },
          { key: 'exchange_rate', label: 'Kur' },
          { key: 'payment_method', label: 'Ödeme' },
          { key: 'cash_account_code', label: 'Kasa', mono: true },
          { key: 'bank_account_code', label: 'Banka', mono: true },
          { key: 'cek_no', label: 'Çek no' },
          { key: 'due_date', label: 'Vade' },
          { key: 'document_date', label: 'Tarih' },
          { key: 'status', label: 'Durum' },
          { key: 'project_code', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'document_no', label: 'Belge no', code: true },
          { key: 'type', label: 'Tip', type: 'select', options: ['Tahsilat', 'Odeme'], required: true },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true },
          { key: 'amount', label: 'Tutar', type: 'number', required: true },
          { key: 'currency_code', label: 'PB' },
          { key: 'payment_method', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'KrediKarti'] },
          { key: 'document_date', label: 'Tarih', type: 'date' },
          { key: 'description', label: 'Açıklama', name: true },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli'] },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
      },
    ],
  },
  {
    id: 'uretim',
    title: 'Üretim',
    sections: [
      { id: 'urun-agaci', title: 'Ürün Ağacı', screenIds: ['urun-agaci', 'bom-patlatma', 'bom-level-listesi', 'bom-malzeme-degisikligi'] },
      { id: 'is-emri', title: 'İş Emri', screenIds: ['uretim-planlari', 'uretim-emirleri', 'siparis-is-emri', 'toplu-is-emri', 'uretim-girisleri'] },
      { id: 'depo', title: 'Depo', screenIds: ['stok-depo'] },
      { id: 'tanimlar', title: 'Tanımlar', screenIds: ['sinif-tanimi', 'is-merkezleri', 'is-istasyonlari', 'routings', 'uretim-emri-tipleri'] },
    ],
    screens: [
      {
        id: 'urun-agaci',
        techId: 'MFG-BOM-SCR-001',
        businessNameEn: 'BillOfMaterialsScreen',
        title: 'Ürün Ağacı',
        endpoint: '/urun-agaclari',
        crud: true,
        numeratorSeri: 'URUN_AGACI',
        codeField: 'bom_code',
        nameField: 'bom_name',
        // BOMT01 liste filtreleri
        filters: [
          { key: 'bom_code', label: 'Ü.A. no' },
          { key: 'item_code', label: 'Malzeme no' },
          { key: 'bom_name', label: 'Açıklama' },
          { key: 'plant_id', label: 'Tesis', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'category', label: 'Kategori', type: 'select', options: ['Standart', 'Alternatif', 'Varyant', 'Demontaj', 'Benzer'] },
          { key: 'alt_no', label: 'Alt no' },
          { key: 'version_code', label: 'Versiyon' },
          { key: 'bom_type', label: 'Tip', type: 'select', options: ['Uretim', 'Satis', 'Prototype', 'YariMamul'] },
          { key: 'design_department', label: 'Bölüm', type: 'select', options: ['Standart', 'Muhendislik', 'Uretim', 'Kalite'] },
          { key: 'bom_status', label: 'Statü', type: 'select', options: ['Aktif', 'Taslak', 'Onayli', 'Pasif', 'TarihceYok'] },
          { key: 'silindi', label: 'Silinen', type: 'checkbox' },
        ],
        columns: [
          { key: 'company_code', label: 'Firma', mono: true },
          { key: 'plant_code', label: 'Tesis', mono: true },
          { key: 'alt_no', label: 'Alt', mono: true },
          { key: 'version_code', label: 'Ver.' },
          { key: 'bom_code', label: 'Ü.A. no', mono: true },
          { key: 'item_code', label: 'Malzeme', mono: true },
          { key: 'bom_name', label: 'Açıklama' },
          { key: 'fg_warehouse_code', label: 'Giriş depo', mono: true },
          { key: 'valid_from', label: 'Geç. baş.' },
          { key: 'valid_to', label: 'Geç. bitiş' },
          { key: 'category', label: 'Ktg.' },
          { key: 'bom_type', label: 'Tip' },
          { key: 'bom_status', label: 'Statü' },
          { key: 'is_default_for_wo', label: 'İE vars.' },
          { key: 'precost_amount', label: 'Ön maliyet' },
        ],
        masterFields: [
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', group: 'organizasyon', lead: true },
          { key: 'plant_id', label: 'Tesis', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', group: 'organizasyon', lead: true },
          { key: 'category', label: 'Ü.A. kategori', type: 'select', options: ['Standart', 'Alternatif', 'Varyant', 'Demontaj', 'Benzer'], required: true, group: 'kimlik', lead: true },
          { key: 'bom_code', label: 'Ü.A. no', code: true, required: true, group: 'kimlik' },
          { key: 'bom_name', label: 'Açıklama', name: true, required: true, group: 'kimlik' },
          { key: 'finished_good_item_id', label: 'Malzeme no', type: 'lookup', lookup: 'items-mamul', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, lead: true, group: 'kimlik' },
          { key: 'alt_no', label: 'Alt no', required: true, group: 'kimlik' },
          { key: 'alt_description', label: 'Alt açıklama', group: 'kimlik' },
          { key: 'version_code', label: 'Versiyon', group: 'kimlik' },
          { key: 'revision', label: 'Revizyon', group: 'kimlik' },
          { key: 'brand_code', label: 'Marka', group: 'kimlik' },
          { key: 'attr3_code', label: 'Özellik 3', group: 'kimlik' },
          { key: 'fg_warehouse_id', label: 'Mamul giriş depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', group: 'organizasyon' },
          { key: 'quantity', label: 'Temel miktar', type: 'number', required: true, group: 'olcu' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', group: 'olcu' },
          { key: 'min_quantity', label: 'Min. parti', type: 'number', group: 'olcu' },
          { key: 'max_quantity', label: 'Maks. parti', type: 'number', group: 'olcu' },
          { key: 'valid_from', label: 'Başlangıç tarihi', type: 'date', group: 'planlama' },
          { key: 'valid_to', label: 'Bitiş tarihi', type: 'date', group: 'planlama' },
          { key: 'bom_type', label: 'Ü.A. tipi', type: 'select', options: ['Uretim', 'Satis', 'Prototype', 'YariMamul'], required: true, group: 'kimlik' },
          { key: 'design_department', label: 'Tasarım bölümü', type: 'select', options: ['Standart', 'Muhendislik', 'Uretim', 'Kalite'], required: true, group: 'kimlik' },
          { key: 'bom_status', label: 'Ü.A. statüsü', type: 'select', options: ['Aktif', 'Taslak', 'Onayli', 'Pasif', 'TarihceYok'], required: true, group: 'status' },
          { key: 'wo_change_mode', label: 'İE değişiklik izni', type: 'select', options: ['Serbest', 'Yasak', 'Onayli'], group: 'status' },
          { key: 'lock_when_used_in_route', label: 'Rotada kilitli', type: 'checkbox', group: 'status' },
          { key: 'element_interval', label: 'Eleman aralığı', type: 'number', group: 'kimlik' },
          { key: 'proportional_qty', label: 'Oransal miktar', type: 'number', group: 'olcu' },
          { key: 'drawing_no', label: 'Çizim no', group: 'kimlik' },
          { key: 'customer_partner_id', label: 'Müşteri', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', group: 'kimlik' },
          { key: 'precost_amount', label: 'Ön maliyet', type: 'number', group: 'status' },
          { key: 'is_cad', label: 'CAD', type: 'checkbox', group: 'status' },
          { key: 'is_default_for_wo', label: 'İş emri varsayılan', type: 'checkbox', group: 'status' },
          { key: 'is_disassembly', label: 'Demontaj', type: 'checkbox', group: 'status' },
          { key: 'is_active', label: 'Aktif / devrede', type: 'checkbox', group: 'status' },
          { key: 'silindi', label: 'Silindi', type: 'checkbox', group: 'status' },
          { key: 'notes', label: 'Notlar', size: 'wide', group: 'status' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: {
          category: 'Standart',
          alt_no: '00',
          bom_type: 'Uretim',
          design_department: 'Standart',
          bom_status: 'Aktif',
          wo_change_mode: 'Serbest',
          quantity: 1,
          element_interval: 10,
          proportional_qty: 1,
          min_quantity: 0,
          max_quantity: 999999999,
          is_active: true,
          is_default_for_wo: false,
          is_disassembly: false,
          is_cad: false,
          lock_when_used_in_route: false,
          silindi: false,
        },
        formLinks: {
          finished_good_item_id: [
            { field: 'uom_code', fromItem: 'uom_code' },
            { field: 'bom_name', fromItem: 'item_name', asName: true },
            { field: 'brand_code', fromItem: 'marka' },
          ],
          category: [
            { field: 'is_disassembly', valueFromCategory: 'Demontaj' },
          ],
        },
        formTabs: [
          {
            id: 'genel',
            label: 'Genel',
            kind: 'fields',
            fields: [
              { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', group: 'organizasyon' },
              { key: 'plant_id', label: 'Tesis', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', group: 'organizasyon' },
              { key: 'fg_warehouse_id', label: 'Mamul giriş depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', group: 'organizasyon' },
              { key: 'bom_code', label: 'Ü.A. no', code: true, required: true, group: 'kimlik' },
              { key: 'alt_no', label: 'Alt no', required: true, group: 'kimlik' },
              { key: 'alt_description', label: 'Alt açıklama', group: 'kimlik' },
              { key: 'finished_good_item_id', label: 'Malzeme no', type: 'lookup', lookup: 'items-mamul', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, lead: true, group: 'kimlik' },
              { key: 'bom_name', label: 'Açıklama', name: true, required: true, group: 'kimlik' },
              { key: 'version_code', label: 'Versiyon', group: 'kimlik' },
              { key: 'revision', label: 'Revizyon', group: 'kimlik' },
              { key: 'brand_code', label: 'Marka', group: 'kimlik' },
              { key: 'attr3_code', label: 'Özellik 3', group: 'kimlik' },
              { key: 'quantity', label: 'Temel miktar', type: 'number', required: true, group: 'olcu' },
              { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', group: 'olcu' },
              { key: 'min_quantity', label: 'Min. parti', type: 'number', group: 'olcu' },
              { key: 'max_quantity', label: 'Maks. parti', type: 'number', group: 'olcu' },
              { key: 'valid_from', label: 'Başlangıç tarihi', type: 'date', group: 'planlama' },
              { key: 'valid_to', label: 'Bitiş tarihi', type: 'date', group: 'planlama' },
              { key: 'bom_type', label: 'Ü.A. tipi', type: 'select', options: ['Uretim', 'Satis', 'Prototype', 'YariMamul'], required: true, group: 'kimlik' },
              { key: 'design_department', label: 'Tasarım bölümü', type: 'select', options: ['Standart', 'Muhendislik', 'Uretim', 'Kalite'], required: true, group: 'kimlik' },
              { key: 'bom_status', label: 'Ü.A. statüsü', type: 'select', options: ['Aktif', 'Taslak', 'Onayli', 'Pasif', 'TarihceYok'], required: true, group: 'status' },
              { key: 'category', label: 'Kategori', type: 'select', options: ['Standart', 'Alternatif', 'Varyant', 'Demontaj', 'Benzer'], required: true, group: 'kimlik' },
              { key: 'wo_change_mode', label: 'İE değişiklik izni', type: 'select', options: ['Serbest', 'Yasak', 'Onayli'], group: 'status' },
              { key: 'lock_when_used_in_route', label: 'Rotada kilitli', type: 'checkbox', group: 'status' },
              { key: 'element_interval', label: 'Eleman aralığı', type: 'number', group: 'kimlik' },
              { key: 'proportional_qty', label: 'Oransal miktar', type: 'number', group: 'olcu' },
              { key: 'drawing_no', label: 'Çizim no', group: 'kimlik' },
              { key: 'customer_partner_id', label: 'Müşteri', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', group: 'kimlik' },
              { key: 'precost_amount', label: 'Ön maliyet', type: 'number', group: 'status' },
              { key: 'is_default_for_wo', label: 'İş emri varsayılan', type: 'checkbox', group: 'status' },
              { key: 'is_disassembly', label: 'Demontaj', type: 'checkbox', group: 'status' },
              { key: 'is_active', label: 'Devrede', type: 'checkbox', group: 'status' },
              { key: 'is_cad', label: 'CAD', type: 'checkbox', group: 'status' },
              { key: 'silindi', label: 'Silindi', type: 'checkbox', group: 'status' },
              { key: 'notes', label: 'Notlar', size: 'wide', group: 'status' },
            ],
          },
          {
            id: 'agac',
            label: 'Elemanlar',
            kind: 'bom-workspace',
            key: 'satirlar',
            headerFields: [
              { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
              { key: 'plant_id', label: 'Tesis', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
              { key: 'fg_warehouse_id', label: 'Mamul giriş depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
              { key: 'bom_code', label: 'Ü.A. no', code: true, required: true },
              { key: 'alt_no', label: 'Alt no', required: true },
              { key: 'alt_description', label: 'Alt açıklama' },
              { key: 'version_code', label: 'Versiyon' },
              { key: 'revision', label: 'Revizyon' },
              { key: 'finished_good_item_id', label: 'Malzeme no', type: 'lookup', lookup: 'items-mamul', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, lead: true },
              { key: 'bom_name', label: 'Açıklama', name: true, required: true },
              { key: 'quantity', label: 'Temel miktar', type: 'number', required: true },
              { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
              { key: 'min_quantity', label: 'Min. parti', type: 'number' },
              { key: 'max_quantity', label: 'Maks. parti', type: 'number' },
              { key: 'valid_from', label: 'Başlangıç', type: 'date' },
              { key: 'valid_to', label: 'Bitiş', type: 'date' },
              { key: 'wo_change_mode', label: 'İE değişiklik', type: 'select', options: ['Serbest', 'Yasak', 'Onayli'] },
              { key: 'lock_when_used_in_route', label: 'Rotada kilitli', type: 'checkbox' },
              { key: 'is_default_for_wo', label: 'İş emri varsayılan', type: 'checkbox' },
              { key: 'is_disassembly', label: 'Demontaj', type: 'checkbox' },
              { key: 'is_active', label: 'Devrede', type: 'checkbox' },
              { key: 'precost_amount', label: 'Ön maliyet', type: 'number' },
            ],
            fields: [
              { key: 'line_no', label: 'Kalem', type: 'number', size: 'short' },
              { key: 'line_type', label: 'Satır tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Diger'], size: 'short' },
              { key: 'component_type', label: 'Komp. tipi', type: 'select', options: ['Stok', 'Phantom', 'Metin', 'YanUrun', 'Fason'], size: 'short' },
              { key: 'component_item_id', label: 'Eleman / malzeme', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
              { key: 'component_alt_no', label: 'K. alt no', size: 'short' },
              { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
              { key: 'qty_entry_type', label: 'Miktar giriş', type: 'select', options: ['Net', 'Brut'], size: 'short' },
              { key: 'quantity', label: 'Miktar', type: 'number', required: true, size: 'short' },
              { key: 'net_quantity', label: 'Net miktar', type: 'number', size: 'short' },
              { key: 'gross_quantity', label: 'Brüt miktar', type: 'number', size: 'short' },
              { key: 'scrap_pct', label: 'Fire %', type: 'number', size: 'short' },
              { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
              { key: 'operation_seq', label: 'Op. sırası', type: 'number', size: 'short' },
              { key: 'operation_code', label: 'Operasyon kod', size: 'short' },
              { key: 'operation_name', label: 'Operasyon ad' },
              { key: 'operation_no', label: 'Operasyon no', size: 'short' },
              { key: 'position_no', label: 'Pozisyon no', size: 'short' },
              { key: 'drawing_no', label: 'Çizim no', size: 'short' },
              { key: 'line_revision', label: 'Revizyon', size: 'short' },
              { key: 'brand_code', label: 'Marka', size: 'short' },
              { key: 'attr3_code', label: 'Özellik 3', size: 'short' },
              { key: 'delivery_control_code', label: 'Teslimat kontrol', size: 'short' },
              { key: 'packaging_type_code', label: 'Paketleme tip kod', size: 'short' },
              { key: 'packaging_type_name', label: 'Paketleme tip ad' },
              { key: 'byproduct_cost_ratio', label: 'Yan ürün maliyet oranı', type: 'number', size: 'short' },
              { key: 'line_description', label: 'Açıklama' },
              { key: 'line_description_2', label: 'Açıklama 2' },
              { key: 'disassemble_operation_code', label: 'Demonte op. kod', size: 'short' },
              { key: 'disassemble_operation_name', label: 'Demonte op. ad' },
              { key: 'disassemble_operation_no', label: 'Demonte op. no', size: 'short' },
              { key: 'is_fixed_qty', label: 'Sabit miktar', type: 'checkbox' },
              { key: 'goes_to_wo', label: 'İş emrine', type: 'checkbox' },
              { key: 'is_phantom', label: 'Phantom / hayalet', type: 'checkbox' },
              { key: 'is_byproduct', label: 'Yan ürün', type: 'checkbox' },
              { key: 'stop_explosion', label: 'Patlatmayı durdur', type: 'checkbox' },
              { key: 'no_consume_on_receipt', label: 'Üretim girişinde tüketilmesin', type: 'checkbox' },
              { key: 'no_subcontract', label: 'Fasona gönderilemez', type: 'checkbox' },
              { key: 'is_disassemble', label: 'Demonte olur', type: 'checkbox' },
              { key: 'packaging_dependent', label: 'Paketleme tipine bağlı', type: 'checkbox' },
            ],
            altFields: [
              { key: 'alt_item_id', label: 'Alternatif stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
              { key: 'priority', label: 'Öncelik', type: 'number', size: 'short' },
              { key: 'quantity', label: 'Miktar', type: 'number', size: 'short' },
              { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
              { key: 'quality_code', label: 'Kalite kodu', size: 'short' },
              { key: 'color_code', label: 'Renk kodu', size: 'short' },
              { key: 'packaging_type_code', label: 'Ambalaj tip kodu', size: 'short' },
              { key: 'notes', label: 'Not' },
            ],
          },
        ],
      },
      {
        id: 'bom-patlatma',
        techId: 'MFG-BOM-SCR-002',
        businessNameEn: 'BomExplosionScreen',
        title: 'Ürün Ağacı Patlatma',
        endpoint: '/bom/patlatma',
        crud: false,
        readOnly: true,
        codeField: 'list_code',
        nameField: 'description',
        banner: 'Mamul/ağaç + miktar ile çok seviyeli patlatma (yarı mamul ağaçları dahil). Fire % satırdan uygulanır.',
        filters: [
          { key: 'bom_code', label: 'Ağaç kodu' },
          { key: 'finished_good_item_id', label: 'Mamul stok', type: 'lookup', lookup: 'items-mamul', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'agac_id', label: 'Ağaç', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'bom_name', codeKey: 'bom_code' },
          { key: 'quantity', label: 'Mamul miktar', type: 'number' },
          { key: 'item_code', label: 'Bileşen stok' },
        ],
        columns: [
          { key: 'level', label: 'Sev.' },
          { key: 'bom_code', label: 'Ağaç', mono: true },
          { key: 'alt_no', label: 'Alt', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'item_type', label: 'Tip' },
          { key: 'component_type', label: 'Komp.' },
          { key: 'birim_miktar', label: 'Birim miktar' },
          { key: 'scrap_pct', label: 'Fire %' },
          { key: 'quantity', label: 'Toplam ihtiyaç' },
          { key: 'uom_code', label: 'Birim' },
          { key: 'operation_seq', label: 'Op.' },
          { key: 'yol', label: 'Yol' },
        ],
      },
      {
        id: 'bom-level-listesi',
        techId: 'MFG-BOM-SCR-003',
        businessNameEn: 'BomLevelListScreen',
        title: 'Ürün Ağacı Seviye Listesi',
        endpoint: '/bom/level-listesi',
        crud: false,
        readOnly: true,
        codeField: 'list_code',
        nameField: 'description',
        banner: 'Tüm ürün ağaçlarının düz level dökümü (where-used / level raporu). Miktarlı patlatma için «Ürün Ağacı Patlatma» ekranını kullanın.',
        filters: [
          { key: 'bom_code', label: 'Ağaç kodu' },
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'mamul_kodu', label: 'Mamul' },
        ],
        columns: [
          { key: 'bom_code', label: 'Ağaç', mono: true },
          { key: 'level', label: 'Seviye' },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'quantity', label: 'Miktar' },
          { key: 'yol', label: 'Yol' },
        ],
      },
      {
        id: 'bom-malzeme-degisikligi',
        techId: 'MFG-BOM-SCR-004',
        businessNameEn: 'BomMaterialChangeScreen',
        title: 'Malzeme Değişikliği',
        endpoint: '/bom/malzeme-degisikligi',
        crud: true,
        codeField: 'islem_kodu',
        nameField: 'description',
        numeratorSeri: null,
        filters: [
          { key: 'islem_kodu', label: 'İşlem' },
          { key: 'old_item_code', label: 'Eski stok' },
        ],
        columns: [
          { key: 'islem_kodu', label: 'İşlem', mono: true },
          { key: 'old_item_code', label: 'Eski', mono: true },
          { key: 'yeni_stok_kodu', label: 'Yeni', mono: true },
          { key: 'guncellenen_satir', label: 'Satır' },
          { key: 'description', label: 'Açıklama' },
        ],
        masterFields: [
          { key: 'eski_stok_id', label: 'Eski stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'yeni_stok_id', label: 'Yeni stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'agac_id', label: 'Ağaç (opsiyonel)', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'bom_name', codeKey: 'bom_code' },
          { key: 'description', label: 'Açıklama', name: true },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'sinif-tanimi',
        techId: 'MFG-CLS-SCR-001',
        businessNameEn: 'ClassDefinitionScreen',
        title: 'Sınıf Tanımı',
        endpoint: '/stok-siniflari',
        crud: true,
        codeField: 'class_code',
        nameField: 'class_name',
        numeratorSeri: 'STOK_SINIF',
        filters: [
          { key: 'class_code', label: 'Sınıf kodu' },
          { key: 'class_name', label: 'Sınıf adı' },
        ],
        columns: [
          { key: 'class_code', label: 'Kod', mono: true },
          { key: 'class_name', label: 'Ad' },
          { key: 'parent_class_code', label: 'Üst', mono: true },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'class_code', label: 'Sınıf kodu', code: true, required: true },
          { key: 'class_name', label: 'Sınıf adı', name: true, required: true },
          { key: 'parent_class_code', label: 'Üst sınıf kodu' },
        ],
        detailFields: [
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'is-merkezleri',
        techId: 'MFG-WC-SCR-001',
        businessNameEn: 'WorkCenterScreen',
        title: 'İş Merkezleri',
        endpoint: '/is-merkezleri',
        crud: true,
        numeratorSeri: 'IS_MERKEZI',
        codeField: 'center_code',
        nameField: 'center_name',
        filters: [
          { key: 'center_code', label: 'Merkez kodu' },
          { key: 'center_name', label: 'Merkez adı' },
          { key: 'plant_name', label: 'İş yeri' },
        ],
        columns: [
          { key: 'center_code', label: 'Kod', mono: true },
          { key: 'center_name', label: 'Ad' },
          { key: 'plant_name', label: 'İş yeri' },
        ],
        masterFields: [
          { key: 'center_code', label: 'Kod', code: true },
          { key: 'center_name', label: 'Ad', name: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
        ],
        detailFields: [],
      },
      {
        id: 'is-istasyonlari',
        techId: 'MFG-WS-SCR-001',
        businessNameEn: 'WorkStationScreen',
        title: 'İş İstasyonları',
        endpoint: '/is-istasyonlari',
        crud: true,
        numeratorSeri: 'IS_ISTASYONU',
        codeField: 'station_code',
        nameField: 'station_name',
        filters: [
          { key: 'station_code', label: 'İstasyon kodu' },
          { key: 'station_name', label: 'İstasyon adı' },
          { key: 'center_name', label: 'İş merkezi' },
        ],
        columns: [
          { key: 'station_code', label: 'Kod', mono: true },
          { key: 'station_name', label: 'Ad' },
          { key: 'center_code', label: 'Merkez', mono: true },
          { key: 'center_name', label: 'Merkez adı' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'station_code', label: 'Kod', code: true },
          { key: 'station_name', label: 'Ad', name: true, required: true },
          { key: 'work_center_id', label: 'İş merkezi', type: 'lookup', lookup: 'is-merkezleri', valueKey: 'id', labelKey: 'center_name', codeKey: 'center_code', required: true },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [],
        defaults: { is_active: true },
      },
      {
        id: 'routings',
        techId: 'MFG-ROUT-SCR-001',
        businessNameEn: 'RoutingScreen',
        title: 'Rotalar',
        endpoint: '/routings',
        crud: true,
        numeratorSeri: 'ROTA',
        codeField: 'route_code',
        nameField: 'route_name',
        filters: [
          { key: 'route_code', label: 'Rota kodu' },
          { key: 'route_name', label: 'Rota adı' },
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'plant_id', label: 'Tesis', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'route_type', label: 'Tip', type: 'select', options: ['Uretim', 'Demontaj', 'Fason', 'Prototype'] },
          { key: 'alt_no', label: 'Alt no' },
        ],
        columns: [
          { key: 'route_code', label: 'Kod', mono: true },
          { key: 'route_name', label: 'Ad' },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'alt_no', label: 'Alt', mono: true },
          { key: 'route_type', label: 'Tip' },
          { key: 'bom_code', label: 'Ürün ağacı', mono: true },
          { key: 'plant_code', label: 'Tesis', mono: true },
          { key: 'varsayilan', label: 'Varsayılan' },
          { key: 'template', label: 'Şablon' },
          { key: 'is_reverse', label: 'Ters' },
        ],
        masterFields: [
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', group: 'organizasyon' },
          { key: 'plant_id', label: 'İş yeri / tesis', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', group: 'organizasyon' },
          { key: 'route_code', label: 'Kod', code: true, required: true, group: 'kimlik' },
          { key: 'route_name', label: 'Ad', name: true, required: true, group: 'kimlik' },
          { key: 'route_type', label: 'Rota tipi', type: 'select', options: ['Uretim', 'Demontaj', 'Fason', 'Prototype'], required: true, group: 'kimlik' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, group: 'kimlik' },
          {
            key: 'product_bom_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari',
            valueKey: 'id', labelKey: 'bom_name', codeKey: 'bom_code', required: true, group: 'kimlik',
            dependsOn: 'item_id', filterKey: 'finished_good_item_id',
          },
          { key: 'alt_no', label: 'Alternatif no', group: 'kimlik' },
          { key: 'alt_description', label: 'Alternatif açıklama', group: 'kimlik' },
          { key: 'revision', label: 'Revizyon', group: 'kimlik' },
          { key: 'brand_code', label: 'Marka', group: 'kimlik' },
          { key: 'attr3_code', label: 'Özellik 3', group: 'kimlik' },
          { key: 'min_quantity', label: 'Min. miktar', type: 'number', group: 'olcu' },
          { key: 'max_quantity', label: 'Maks. miktar', type: 'number', group: 'olcu' },
          { key: 'valid_from', label: 'Geçerlilik baş.', type: 'date', group: 'planlama' },
          { key: 'valid_to', label: 'Geçerlilik bitiş', type: 'date', group: 'planlama' },
          { key: 'wo_change_mode', label: 'İE değişiklik izni', type: 'select', options: ['Serbest', 'Yasak', 'Onayli'], group: 'status' },
          { key: 'varsayilan', label: 'Varsayılan ürün rotası', type: 'checkbox', group: 'status' },
          { key: 'template', label: 'Şablon', type: 'checkbox', group: 'status' },
          { key: 'is_reverse', label: 'Ters rota', type: 'checkbox', group: 'status' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox', group: 'status' },
          { key: 'notes', label: 'Not', size: 'wide', group: 'status' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: {
          route_type: 'Uretim',
          alt_no: '00',
          min_quantity: 0,
          max_quantity: 999999999,
          wo_change_mode: 'Serbest',
          varsayilan: false,
          template: false,
          is_reverse: false,
          is_active: true,
        },
        formLinks: {
          item_id: [
            { field: 'product_bom_id', pick: 'bomForItem' },
            { field: 'brand_code', fromItem: 'marka' },
          ],
        },
        formTabs: [
          {
            id: 'rota',
            label: 'Rota',
            kind: 'rota-workspace',
            key: 'operasyonlar',
            headerFields: [
              { key: 'item_id', label: 'Mamul stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, lead: true, critical: true, group: 'kimlik' },
              {
                key: 'product_bom_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari',
                valueKey: 'id', labelKey: 'bom_name', codeKey: 'bom_code', required: true, lead: true, critical: true, group: 'kimlik',
                dependsOn: 'item_id', filterKey: 'finished_good_item_id',
              },
              { key: 'route_code', label: 'Kod', code: true, required: true, lead: true, group: 'kimlik' },
              { key: 'route_name', label: 'Ad', name: true, required: true, lead: true, group: 'kimlik' },
              { key: 'route_type', label: 'Rota tipi', type: 'select', options: ['Uretim', 'Demontaj', 'Fason', 'Prototype'], group: 'kimlik' },
              { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', group: 'organizasyon' },
              { key: 'alt_no', label: 'Alt no', group: 'kimlik' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox', group: 'status' },
              { key: 'is_active', label: 'Aktif', type: 'checkbox', group: 'status' },
            ],
            // Üst alanlar (malzemeler ayrı render) → sonra planlama / gelişmiş accordion
            fields: [
              { key: 'work_center_id', label: 'İş merkezi', type: 'lookup', lookup: 'is-merkezleri', valueKey: 'id', labelKey: 'center_name', codeKey: 'center_code', lead: true, group: 'organizasyon' },
              {
                key: 'work_station_id', label: 'İş istasyonu', type: 'lookup', lookup: 'is-istasyonlari',
                valueKey: 'id', labelKey: 'station_name', codeKey: 'station_code', lead: true, group: 'organizasyon',
                dependsOn: 'work_center_id', filterKey: 'work_center_id',
              },
              { key: 'line_no', label: 'Operasyon no', type: 'number', required: true, size: 'short', lead: true, group: 'kimlik' },
              { key: 'operation_code', label: 'Operasyon kodu', required: true, size: 'short', lead: true, group: 'kimlik' },
              { key: 'operation_name', label: 'Operasyon', required: true, lead: true, group: 'kimlik' },
              {
                key: 'item_id', label: 'Adım stoğu (mamul / yarı mamul)', type: 'lookup', lookup: 'items-mamul',
                valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', lead: true, group: 'kimlik',
              },
              { key: 'op_time', label: 'Op birim süre', type: 'number', size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'op_time_uom', label: 'Op. birim', type: 'select', options: ['dk', 'sn', 'saat'], size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'setup_time', label: 'Hazırlık süre', type: 'number', size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'setup_time_uom', label: 'H. birim', type: 'select', options: ['dk', 'sn', 'saat'], size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'wait_time', label: 'Bekleme süre', type: 'number', size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'wait_time_uom', label: 'B. birim', type: 'select', options: ['dk', 'sn', 'saat'], size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'unload_time', label: 'Boşaltma süre', type: 'number', size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'unload_time_uom', label: 'Boş. birim', type: 'select', options: ['dk', 'sn', 'saat'], size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'sure_dk', label: 'Süre dk (eski)', type: 'number', size: 'short', group: 'planlama', section: 'planlama' },
              { key: 'description', label: 'Açıklama', group: 'status', section: 'gelismis' },
              {
                key: 'output_item_id', label: 'Çıktı', type: 'lookup', lookup: 'items',
                valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', group: 'olcu', section: 'gelismis',
                filterByBomKey: 'product_bom_id', includeBomRoot: true,
              },
              { key: 'cost_factor_1', label: 'Maliyet katsayısı 1', type: 'number', size: 'short', group: 'finans', section: 'gelismis' },
              { key: 'cost_factor_2', label: 'Maliyet katsayısı 2', type: 'number', size: 'short', group: 'finans', section: 'gelismis' },
              { key: 'include_precost', label: 'Ön maliyet', type: 'checkbox', group: 'finans', section: 'gelismis' },
              { key: 'include_std_cost', label: 'Standart maliyet', type: 'checkbox', group: 'finans', section: 'gelismis' },
              { key: 'include_actual_cost', label: 'Fiili maliyette dikkate al', type: 'checkbox', group: 'finans', section: 'gelismis' },
              { key: 'is_disassemble', label: 'Demonte operasyon', type: 'checkbox', group: 'status', section: 'gelismis' },
              { key: 'is_subcontract', label: 'Fason operasyon', type: 'checkbox', group: 'status', section: 'gelismis' },
              { key: 'is_shared_op', label: 'Ortak operasyonda kullanılır', type: 'checkbox', group: 'status', section: 'gelismis' },
              { key: 'require_qc', label: 'Kalite kontrolü yapılacak', type: 'checkbox', group: 'status', section: 'gelismis' },
              { key: 'require_spc', label: 'SPC kontrolü yapılacak', type: 'checkbox', group: 'status', section: 'gelismis' },
              { key: 'note1', label: 'Not 1', group: 'status', section: 'gelismis' },
              { key: 'note2', label: 'Not 2', group: 'status', section: 'gelismis' },
            ],
            componentFields: [
              {
                key: 'item_id', label: 'Malzeme', type: 'lookup', lookup: 'items',
                valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code',
                filterByBomKey: 'product_bom_id',
              },
              { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
              { key: 'quantity', label: 'Miktar', type: 'number' },
            ],
            equipmentFields: [
              { key: 'line_no', label: 'Satır no', type: 'number', size: 'short' },
              { key: 'equipment_code', label: 'Ekipman kodu', required: true, size: 'short' },
              { key: 'equipment_name', label: 'Ekipman adı' },
              { key: 'cavity_count', label: 'Göz sayısı', type: 'number', size: 'short' },
              { key: 'used_cavity_count', label: 'Kullanılan göz', type: 'number', size: 'short' },
              { key: 'notes', label: 'Not' },
            ],
          },
        ],
      },
      {
        id: 'uretim-emri-tipleri',
        techId: 'MFG-WOT-SCR-001',
        businessNameEn: 'WorkOrderTypeScreen',
        title: 'Üretim Emri Tipleri',
        endpoint: '/uretim-emri-tipleri',
        crud: true,
        numeratorSeri: 'URETIM_EMRI_TIP',
        codeField: 'type_code',
        nameField: 'type_name',
        filters: [
          { key: 'type_code', label: 'Tip kodu' },
          { key: 'type_name', label: 'Tip adı' },
          { key: 'planli_kesin', label: 'Planlı/Kesin' },
        ],
        columns: [
          { key: 'type_code', label: 'Kod', mono: true },
          { key: 'type_name', label: 'Ad' },
          { key: 'planli_kesin', label: 'Planlı/Kesin' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'type_code', label: 'Tip kodu', code: true, required: true },
          { key: 'type_name', label: 'Tip adı', name: true, required: true },
          { key: 'planli_kesin', label: 'Planlı/Kesin', type: 'select', options: ['Kesin', 'Planli'], required: true },
        ],
        detailFields: [
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'uretim-planlari',
        techId: 'MFG-PLN-SCR-001',
        businessNameEn: 'ProductionPlanScreen',
        title: 'Üretim Planları',
        endpoint: '/uretim-planlari',
        crud: true,
        numeratorSeri: 'URETIM_PLAN',
        codeField: 'plan_no',
        nameField: 'item_code',
        convertAction: { label: 'İş Emrine Çevir', path: '/uretim-planlari/{id}/cevir' },
        filters: [
          { key: 'plan_no', label: 'Plan no' },
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'plan_no', label: 'Plan', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'quantity', label: 'Miktar' },
          { key: 'delivery_date', label: 'Teslim' },
          { key: 'is_started', label: 'Başlatıldı' },
          { key: 'status', label: 'Durum' },
          { key: 'order_no', label: 'Emir', mono: true },
        ],
        masterFields: [
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', group: 'organizasyon' },
          { key: 'plan_no', label: 'Plan no', code: true, group: 'kimlik' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, lead: true, group: 'kimlik' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', group: 'kimlik' },
          { key: 'quantity', label: 'Miktar', type: 'number', required: true, group: 'kimlik' },
          { key: 'planlanan_start', label: 'Planlanan başlangıç', type: 'date', group: 'planlama' },
          { key: 'delivery_date', label: 'Teslim tarihi', type: 'date', group: 'planlama' },
          { key: 'is_started', label: 'Başlatıldı', type: 'checkbox', group: 'status' },
          { key: 'fixed', label: 'Sabit', type: 'checkbox', group: 'status' },
          { key: 'malzeme', label: 'Malzeme (MRP)', type: 'checkbox', group: 'status' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Baslatildi', 'Kapali', 'Iptal'], group: 'status' },
          { key: 'description', label: 'Açıklama', group: 'status' },
        ],
        formLinks: {
          item_id: [
            { field: 'uom_code', fromItem: 'uom_code' },
          ],
        },
        detailFields: [],
        detailKey: null,
        defaults: { status: 'Acik', is_started: false, fixed: false, malzeme: false },
      },
      {
        id: 'uretim-emirleri',
        techId: 'MFG-WO-SCR-001',
        businessNameEn: 'WorkOrderScreen',
        title: 'Üretim Emirleri',
        endpoint: '/uretim-emirleri',
        crud: true,
        numeratorSeri: 'URETIM_EMRI',
        codeField: 'order_no',
        nameField: 'item_code',
        approveAction: { label: 'Onayla', path: '/uretim-emirleri/{id}/onayla' },
        secondaryAction: { label: 'Başlat', path: '/uretim-emirleri/{id}/baslat' },
        detailFillAction: { label: 'Detayları Doldur', path: '/uretim-emirleri/{id}/detaylari-doldur' },
        bomRotaChangeAction: { label: 'BOM/Rota Uygula', path: '/uretim-emirleri/{id}/bom-rota-degistir' },
        filters: [
          { key: 'order_no', label: 'Emir no' },
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'emir_tipi_kodu', label: 'Tip' },
          { key: 'status', label: 'Durum' },
          { key: 'acik_kapali', label: 'Açık/Kapalı' },
        ],
        columns: [
          { key: 'order_no', label: 'Emir', mono: true },
          { key: 'emir_tipi_kodu', label: 'Tip', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'planlanan_quantity', label: 'Plan' },
          { key: 'produced_quantity', label: 'Üretilen' },
          { key: 'planli_kesin', label: 'P/K' },
          { key: 'acik_kapali', label: 'A/K' },
          { key: 'onayli', label: 'Onay' },
          { key: 'is_started', label: 'Başlatıldı' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          // 1) Organizasyon
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', group: 'organizasyon', lead: true },
          { key: 'order_type_id', label: 'Emir tipi', type: 'lookup', lookup: 'uretim-emri-tipleri', valueKey: 'id', labelKey: 'type_name', codeKey: 'type_code', group: 'organizasyon' },
          // 2) Üretim kimliği — stok → ağaç → rota (önem / bağımlılık sırası)
          { key: 'order_no', label: 'Emir no', code: true, group: 'kimlik' },
          { key: 'order_date', label: 'Emir tarihi', type: 'date', required: true, group: 'kimlik' },
          {
            key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items-mamul',
            valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, lead: true, group: 'kimlik',
          },
          {
            key: 'product_bom_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari',
            valueKey: 'id', labelKey: 'bom_name', codeKey: 'bom_code', required: true, group: 'kimlik',
            dependsOn: 'item_id', filterKey: 'finished_good_item_id',
          },
          {
            key: 'route_id', label: 'Rota', type: 'lookup', lookup: 'routings',
            valueKey: 'id', labelKey: 'route_name', codeKey: 'route_code', required: true, group: 'kimlik',
            dependsOn: 'item_id', filterKey: 'item_id',
          },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', group: 'kimlik' },
          { key: 'planlanan_quantity', label: 'Planlanan quantity', type: 'number', required: true, group: 'kimlik' },
          { key: 'produced_quantity', label: 'Üretilen quantity', type: 'number', readOnly: true, group: 'kimlik' },
          { key: 'sales_order_id', label: 'Satış siparişi', type: 'lookup', lookup: 'sales_orders', valueKey: 'id', labelKey: 'order_no', codeKey: 'order_no', group: 'kimlik' },
          // 3) Depolar — stok kartı varsayılan giriş/çıkış
          { key: 'component_warehouse_id', label: 'Hammadde depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true, group: 'depo' },
          { key: 'wip_warehouse_id', label: 'Yarı mamul depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', group: 'depo' },
          { key: 'fg_warehouse_id', label: 'Mamul / giriş depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true, group: 'depo' },
          // 4) Planlama
          { key: 'plan_start', label: 'Plan başlangıç', type: 'date', group: 'planlama' },
          { key: 'plan_end', label: 'Plan bitiş', type: 'date', group: 'planlama' },
          { key: 'end_date', label: 'Bitiş tarihi', type: 'date', group: 'planlama' },
          { key: 'planli_kesin', label: 'Planlı/Kesin', type: 'select', options: ['Kesin', 'Planli'], group: 'planlama' },
          { key: 'cikis_type', label: 'Çıkış tipi', type: 'select', options: ['Manuel', 'OtomatikEmis', 'PartiDagitim'], group: 'planlama' },
          { key: 'giris_type', label: 'Giriş tipi', type: 'select', options: ['Manuel', 'OtomatikEmis', 'PartiDagitim'], group: 'planlama' },
          // 5) Durum / notlar
          { key: 'acik_kapali', label: 'Açık/Kapalı', type: 'select', options: ['Acik', 'Kapali'], group: 'status' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'OnayBekliyor', 'Acik', 'Uretimde', 'Kapali', 'Iptal'], group: 'status' },
          { key: 'onayli', label: 'Onaylı', type: 'checkbox', group: 'status' },
          { key: 'yayinlandi', label: 'Yayınlandı', type: 'checkbox', group: 'status' },
          { key: 'is_printed', label: 'Yazdırıldı', type: 'checkbox', group: 'status' },
          { key: 'product_girisi_tamamlandi', label: 'Ürün girişi tamam', type: 'checkbox', group: 'status' },
          { key: 'is_started', label: 'Başlatıldı', type: 'checkbox', readOnly: true, group: 'status' },
          { key: 'description', label: 'Açıklama', size: 'wide', group: 'status' },
        ],
        detailFields: [
          { key: 'line_no', label: 'Op. no', type: 'number', size: 'short' },
          { key: 'operation_code', label: 'Operasyon kodu', size: 'short' },
          { key: 'operation_name', label: 'Operasyon adı' },
          { key: 'work_center_id', label: 'İş merkezi', type: 'lookup', lookup: 'is-merkezleri', valueKey: 'id', labelKey: 'center_name', codeKey: 'center_code' },
          { key: 'planlanan_quantity', label: 'Plan quantity', type: 'number', size: 'short' },
          { key: 'produced_quantity', label: 'Üretilen', type: 'number', size: 'short', readOnly: true },
          { key: 'status', label: 'Durum', type: 'select', options: ['Bekliyor', 'Hazir', 'Tamamlandi', 'Kapali'] },
          { key: 'ilk_operasyon', label: 'İlk op?', type: 'checkbox', readOnly: true },
          { key: 'son_operasyon', label: 'Son op?', type: 'checkbox', readOnly: true },
        ],
        detailKey: 'operasyonlar',
        detailSlots: 6,
        formTabs: [
          {
            id: 'bilgiler',
            label: 'İş Emri Bilgileri',
            kind: 'fields',
            fields: null, // masterFields (normalize)
          },
          {
            id: 'malzemeler',
            label: 'İş Emri Malzemeleri',
            kind: 'grid',
            key: 'malzemeler',
            slots: 6,
            fields: [
              { key: 'line_no', label: 'Sıra', type: 'number', size: 'short' },
              { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
              { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
              { key: 'planlanan_quantity', label: 'Plan quantity', type: 'number', size: 'short', required: true },
              { key: 'tuketilen_quantity', label: 'Tüketilen', type: 'number', size: 'short', readOnly: true },
              { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
            ],
          },
          {
            id: 'rota',
            label: 'Rota',
            kind: 'grid',
            key: 'operasyonlar',
            slots: 6,
            fields: null, // detailFields
          },
        ],
        // Stok seçilince ağaç / rota / birim / depolar otomatik
        formLinks: {
          item_id: [
            { field: 'product_bom_id', pick: 'bomForItem' },
            { field: 'route_id', pick: 'routeForItem' },
            { field: 'uom_code', fromItem: 'uom_code' },
            { field: 'component_warehouse_id', fromItem: 'varsayilan_cikis_warehouse_id' },
            { field: 'fg_warehouse_id', fromItem: 'varsayilan_giris_warehouse_id' },
          ],
          product_bom_id: [
            { field: 'route_id', pick: 'routeForBom' },
          ],
        },
        defaults: {
          cikis_type: 'Manuel',
          giris_type: 'Manuel',
          is_started: false,
          acik_kapali: 'Acik',
          planli_kesin: 'Kesin',
          onayli: false,
          yayinlandi: false,
          is_printed: false,
          product_girisi_tamamlandi: false,
          status: 'Acik',
        },
      },
      {
        id: 'siparis-is-emri',
        techId: 'MFG-WO-SCR-002',
        businessNameEn: 'OrderToWorkOrderScreen',
        title: 'Siparişten İş Emri',
        endpoint: '/uretim-emirleri/siparis-adaylari',
        createEndpoint: '/uretim-emirleri/satis-siparisinden',
        crud: true,
        codeField: 'order_no',
        nameField: 'item_code',
        filters: [
          { key: 'order_no', label: 'Sipariş' },
          { key: 'item_code', label: 'Stok' },
          { key: 'partner_name', label: 'Cari' },
        ],
        columns: [
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'siparis_miktar', label: 'Sip. quantity' },
          { key: 'remaining_quantity', label: 'Kalan' },
          { key: 'onerilen_agac_kodu', label: 'Ağaç', mono: true },
          { key: 'onerilen_rota_kodu', label: 'Rota', mono: true },
        ],
        masterFields: [
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', group: 'organizasyon' },
          { key: 'order_type_id', label: 'Emir tipi', type: 'lookup', lookup: 'uretim-emri-tipleri', valueKey: 'id', labelKey: 'type_name', codeKey: 'type_code', group: 'organizasyon' },
          { key: 'sales_order_id', label: 'Sipariş', type: 'lookup', lookup: 'sales_orders', valueKey: 'id', labelKey: 'order_no', codeKey: 'order_no', required: true, group: 'kimlik' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, lead: true, group: 'kimlik' },
          {
            key: 'product_bom_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari',
            valueKey: 'id', labelKey: 'bom_name', codeKey: 'bom_code', required: true, group: 'kimlik',
            dependsOn: 'item_id', filterKey: 'finished_good_item_id',
          },
          {
            key: 'route_id', label: 'Rota', type: 'lookup', lookup: 'routings',
            valueKey: 'id', labelKey: 'route_name', codeKey: 'route_code', required: true, group: 'kimlik',
            dependsOn: 'item_id', filterKey: 'item_id',
          },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', group: 'kimlik' },
          { key: 'planlanan_quantity', label: 'Planlanan quantity', type: 'number', required: true, group: 'kimlik' },
          { key: 'component_warehouse_id', label: 'Hammadde depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true, group: 'depo' },
          { key: 'fg_warehouse_id', label: 'Mamul depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true, group: 'depo' },
          { key: 'wip_warehouse_id', label: 'Yarı mamul depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', group: 'depo' },
        ],
        formLinks: {
          item_id: [
            { field: 'product_bom_id', pick: 'bomForItem' },
            { field: 'route_id', pick: 'routeForItem' },
            { field: 'uom_code', fromItem: 'uom_code' },
            { field: 'component_warehouse_id', fromItem: 'varsayilan_cikis_warehouse_id' },
            { field: 'fg_warehouse_id', fromItem: 'varsayilan_giris_warehouse_id' },
          ],
          product_bom_id: [
            { field: 'route_id', pick: 'routeForBom' },
          ],
        },
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'toplu-is-emri',
        techId: 'MFG-WO-SCR-003',
        businessNameEn: 'BulkWorkOrderScreen',
        title: 'Toplu İş Emri',
        endpoint: '/uretim-emirleri/siparis-adaylari',
        createEndpoint: '/uretim-emirleri/toplu',
        crud: true,
        codeField: 'order_no',
        nameField: 'item_code',
        filters: [
          { key: 'order_no', label: 'Sipariş' },
          { key: 'item_code', label: 'Stok' },
        ],
        columns: [
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'remaining_quantity', label: 'Kalan' },
          { key: 'onerilen_agac_kodu', label: 'Ağaç', mono: true },
          { key: 'onerilen_rota_kodu', label: 'Rota', mono: true },
        ],
        masterFields: [
          { key: 'order_type_id', label: 'Ortak emir tipi', type: 'lookup', lookup: 'uretim-emri-tipleri', valueKey: 'id', labelKey: 'type_name', codeKey: 'type_code' },
          { key: 'plant_id', label: 'Ortak iş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'component_warehouse_id', label: 'Ortak hammadde depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true },
          { key: 'fg_warehouse_id', label: 'Ortak mamul depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true },
          { key: 'wip_warehouse_id', label: 'Ortak yarı mamul depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
        ],
        detailFields: [
          { key: 'sales_order_id', label: 'Sipariş', type: 'lookup', lookup: 'sales_orders', valueKey: 'id', labelKey: 'order_no', codeKey: 'order_no', required: true },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          {
            key: 'product_bom_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari',
            valueKey: 'id', labelKey: 'bom_name', codeKey: 'bom_code', required: true,
            dependsOn: 'item_id', filterKey: 'finished_good_item_id',
          },
          {
            key: 'route_id', label: 'Rota', type: 'lookup', lookup: 'routings',
            valueKey: 'id', labelKey: 'route_name', codeKey: 'route_code', required: true,
            dependsOn: 'item_id', filterKey: 'item_id',
          },
          { key: 'planlanan_quantity', label: 'Miktar', type: 'number', required: true },
        ],
        detailKey: 'kalemler',
        detailSlots: 6,
        formLinks: {
          item_id: [
            { field: 'product_bom_id', pick: 'bomForItem' },
            { field: 'route_id', pick: 'routeForItem' },
          ],
          product_bom_id: [
            { field: 'route_id', pick: 'routeForBom' },
          ],
        },
      },
      {
        id: 'stok-depo',
        techId: 'INV-WHL-SCR-001',
        businessNameEn: 'ItemWarehouseLinkScreen',
        title: 'Depo Stok Bağ',
        endpoint: '/stok-depo',
        crud: true,
        codeField: 'item_code',
        nameField: 'warehouse_code',
        filters: [
          { key: 'item_code', label: 'Stok' },
          { key: 'warehouse_code', label: 'Depo' },
          { key: 'plant_code', label: 'İş yeri' },
        ],
        columns: [
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Stok adı' },
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'warehouse_name', label: 'Depo adı' },
          { key: 'plant_code', label: 'İş yeri', mono: true },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
        ],
        detailFields: [
          { key: 'varsayilan_giris', label: 'Varsayılan giriş', type: 'checkbox' },
          { key: 'varsayilan_cikis', label: 'Varsayılan çıkış', type: 'checkbox' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'uretim-girisleri',
        techId: 'MFG-RCPT-SCR-001',
        businessNameEn: 'ProductionReceiptScreen',
        title: 'Üretim Girişleri',
        endpoint: '/uretim-girisleri',
        crud: true,
        codeField: 'giris_no',
        nameField: 'order_no',
        numeratorSeri: null,
        filters: [
          { key: 'giris_no', label: 'Giriş no' },
          { key: 'order_no', label: 'Emir no' },
          { key: 'item_code', label: 'Stok' },
        ],
        columns: [
          { key: 'giris_no', label: 'Giriş', mono: true },
          { key: 'order_no', label: 'Emir', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'quantity', label: 'Miktar' },
          { key: 'created_at', label: 'Tarih' },
        ],
        masterFields: [
          { key: 'order_id', label: 'Üretim emri', type: 'lookup', lookup: 'uretim-emirleri', valueKey: 'id', labelKey: 'order_no', required: true },
          { key: 'quantity', label: 'Miktar', type: 'number', required: true },
        ],
        detailFields: [],
        detailKey: null,
      },
    ],
  },
  {
    id: 'satinalma',
    title: 'Satınalma',
    sections: [
      { id: 'teklif', title: 'Teklif', screenIds: ['satin-alma-teklifleri', 'satin-alma-anlasmalari'] },
      { id: 'siparis', title: 'Sipariş', screenIds: ['satin-alma-talepleri', 'satin-alma-siparisleri'] },
      { id: 'mal-kabul', title: 'Mal Kabul', screenIds: ['mal-kabuller', 'tedarikci-irsaliyeleri', 'giris-kontrolleri'] },
    ],
    screens: [
      {
        id: 'satin-alma-teklif-istekleri',
        techId: 'PUR-RFQ-SCR-001',
        businessNameEn: 'RequestForQuotationScreen',
        title: 'Satınalma Teklif İstekleri',
        endpoint: '/satin-alma-teklif-istekleri',
        hidden: true,
        deprecated: true,
        crud: true,
        numeratorSeri: 'SATINALMA_TEKLIF_ISTEK',
        codeField: 'istek_no',
        nameField: 'description',
        filters: [
          { key: 'istek_no', label: 'İstek no' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'istek_no', label: 'İstek', mono: true },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
        masterFields: [
          { key: 'istek_no', label: 'İstek no', code: true },
          { key: 'description', label: 'Açıklama', name: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Onayli', 'TeklifeDonustu', 'Iptal', 'Kapali'] },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'satin-alma-teklifleri',
        techId: 'PUR-QUO-SCR-001',
        businessNameEn: 'PurchaseQuotationScreen',
        title: 'Satınalma Teklifleri',
        endpoint: '/satin-alma-teklifleri',
        crud: true,
        numeratorSeri: 'SATINALMA_TEKLIF',
        codeField: 'quotation_no',
        nameField: 'partner_name',
        approveAction: {
          label: 'Teklifi Onayla',
          path: '/satin-alma-teklifleri/{id}/onayla',
        },
        convertAction: {
          label: 'Siparişe Dönüştür',
          path: '/satin-alma-teklifleri/{id}/siparise-donustur',
          nested: { screenId: 'satin-alma-siparisleri', link: 'sa-teklif-siparis' },
        },
        filters: [
          { key: 'quotation_no', label: 'Teklif no' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'quotation_no', label: 'Teklif', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'requisition_no', label: 'Talep', mono: true },
          { key: 'currency_code', label: 'PB' },
          { key: 'valid_date', label: 'Geçerlilik' },
          { key: 'status', label: 'Durum' },
          { key: 'project_code', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'quotation_no', label: 'Teklif no', code: true },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'requisition_id', label: 'Satınalma talebi', type: 'lookup', lookup: 'satin-alma-talepleri', valueKey: 'id', labelKey: 'requisition_no', fillFrom: 'talep-satirlar' },
          { key: 'istek_id', label: 'Eski teklif isteği', type: 'number' },
          { key: 'partner_id', label: 'Tedarikçi', type: 'lookup', lookup: 'partners-tedarikci', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'exchange_rate', label: 'Kur', type: 'number' },
          { key: 'valid_date', label: 'Geçerlilik', type: 'date' },
          { key: 'payment_term_code', label: 'Ödeme koşulu' },
          { key: 'project_code', label: 'Proje kodu' },
          { key: 'region', label: 'Bölge' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'SipariseDonustu', 'Iptal', 'Kapali'] },
          { key: 'description', label: 'Açıklama', name: true },
          { key: 'public_note', label: 'Tedarikçi notu' },
          { key: 'internal_note', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'line_type', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'quantity', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', size: 'short' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'exchange_rate', label: 'Kur', type: 'number', size: 'short' },
          { key: 'discount_rate', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'discount_rate_2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'discount_rate_3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'vat_rate', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'vat_mode', label: 'KDV status', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'delivery_date', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'project_code', label: 'Proje', size: 'short' },
          { key: 'region', label: 'Bölge', size: 'short' },
          { key: 'line_description', label: 'Açıklama' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { currency_code: 'TRY', exchange_rate: 1, rate_type: 'TCMB-ALIS', vat_mode: 'Haric', line_type: 'S' },
      },
      {
        id: 'satin-alma-anlasmalari',
        techId: 'PUR-AGR-SCR-001',
        businessNameEn: 'PurchaseAgreementScreen',
        title: 'Satınalma Anlaşmaları',
        endpoint: '/satin-alma-anlasmalari',
        crud: true,
        numeratorSeri: 'SATINALMA_ANLASMA',
        codeField: 'anlasma_no',
        nameField: 'partner_name',
        filters: [
          { key: 'anlasma_no', label: 'Anlaşma no' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'anlasma_no', label: 'Anlaşma', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'anlasma_no', label: 'Anlaşma no', code: true },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'partner_id', label: 'Tedarikçi', type: 'lookup', lookup: 'partners-tedarikci', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true },
          { key: 'quotation_id', label: 'Teklif', type: 'lookup', lookup: 'satin-alma-teklifleri', valueKey: 'id', labelKey: 'quotation_no' },
          { key: 'start_date', label: 'Başlangıç', type: 'date' },
          { key: 'end_date', label: 'Bitiş', type: 'date' },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'exchange_rate', label: 'Kur', type: 'number' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kapali', 'Iptal'] },
          { key: 'description', label: 'Açıklama', name: true },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number' },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'exchange_rate', label: 'Kur', type: 'number' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { currency_code: 'TRY', exchange_rate: 1, status: 'Taslak' },
      },
      {
        id: 'satin-alma-talepleri',
        techId: 'PUR-REQ-SCR-001',
        businessNameEn: 'PurchaseRequisitionScreen',
        title: 'Satınalma Talepleri',
        endpoint: '/satin-alma-talepleri',
        crud: true,
        numeratorSeri: 'SATINALMA_TALEP',
        codeField: 'requisition_no',
        nameField: 'description',
        approveAction: { label: 'Onayla + E-posta', path: '/satin-alma-talepleri/{id}/onayla' },
        filters: [
          { key: 'requisition_no', label: 'Talep no' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'requisition_no', label: 'Talep', mono: true },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
        masterFields: [
          { key: 'requisition_no', label: 'Talep no', code: true },
          { key: 'requisition_date', label: 'Talep tarihi', type: 'date' },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', required: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'supplier_partner_id', label: 'Tedarikçi', type: 'lookup', lookup: 'partners-tedarikci', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'target_delivery_date', label: 'Hedef teslim', type: 'date' },
          { key: 'project_code', label: 'Proje kodu' },
          { key: 'region', label: 'Bölge' },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'exchange_rate', label: 'Kur', type: 'number' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Onayli', 'SipariseDonustu', 'Iptal', 'Kapali'] },
          { key: 'description', label: 'Açıklama', name: true },
          { key: 'internal_note', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'line_type', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
          { key: 'quantity', label: 'Miktar', type: 'number', required: true, size: 'short' },
          { key: 'tahmini_unit_price', label: 'Tahmini fiyat', type: 'number', size: 'short' },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', size: 'short' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'exchange_rate', label: 'Kur', type: 'number', size: 'short' },
          { key: 'vat_rate', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'vat_mode', label: 'KDV status', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'discount_rate', label: 'İsk %', type: 'number', size: 'short' },
          { key: 'delivery_date', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'project_code', label: 'Proje', size: 'short' },
          { key: 'region', label: 'Bölge', size: 'short' },
          { key: 'supplier_item_code', label: 'Ted. stok kodu' },
          { key: 'supplier_item_name', label: 'Ted. stok adı' },
          { key: 'line_description', label: 'Açıklama' },
          { key: 'rezervasyon_type', label: 'Rezervasyon tipi' },
          { key: 'rezervasyon_iliski_no', label: 'Rezervasyon ilişki no' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: {
          currency_code: 'TRY', exchange_rate: 1, status: 'Acik', rate_type: 'TCMB-ALIS',
          vat_rate: 20, vat_mode: 'Haric', line_type: 'S',
        },
      },
      {
        id: 'satin-alma-siparisleri',
        techId: 'PUR-ORD-SCR-001',
        businessNameEn: 'PurchaseOrderScreen',
        title: 'Satınalma Siparişleri',
        endpoint: '/satin-alma-siparisleri',
        crud: true,
        numeratorSeri: 'SATINALMA_SIPARIS',
        codeField: 'order_no',
        nameField: 'partner_name',
        filters: [
          { key: 'order_no', label: 'Sipariş no' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'supplier_order_no', label: 'Ted. sip. no', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'order_date', label: 'Tarih' },
          { key: 'delivery_date', label: 'Teslim' },
          { key: 'currency_code', label: 'PB' },
          { key: 'subtotal', label: 'Ara top.' },
          { key: 'tax_amount', label: 'KDV' },
          { key: 'grand_total', label: 'Genel' },
          { key: 'payment_term_code', label: 'Ödeme koş.' },
          { key: 'status', label: 'Durum' },
          { key: 'project_code', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'partner_id', label: 'Tedarikçi', type: 'lookup', lookup: 'partners-tedarikci', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true, lead: true, critical: true, group: 'kimlik' },
          { key: 'order_no', label: 'Sipariş no', code: true, lead: true, group: 'kimlik' },
          { key: 'order_date', label: 'Sipariş tarihi', type: 'date', lead: true, group: 'kimlik' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'KismiTeslim', 'Kapali', 'Iptal'], lead: true, group: 'status' },
          { key: 'delivery_date', label: 'Teslim tarihi', type: 'date', group: 'planlama' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', group: 'depo' },
          { key: 'requisition_id', label: 'Satınalma talebi', type: 'lookup', lookup: 'satin-alma-talepleri', valueKey: 'id', labelKey: 'requisition_no', fillFrom: 'talep-satirlar', group: 'kimlik' },
          { key: 'quotation_id', label: 'Satınalma teklifi', type: 'lookup', lookup: 'satin-alma-teklifleri', valueKey: 'id', labelKey: 'quotation_no', fillFrom: 'sa-teklif-satirlar', group: 'kimlik' },
          { key: 'supplier_order_no', label: 'Tedarikçi sipariş no', group: 'kimlik' },
          { key: 'ship_date', label: 'Sevk tarihi', type: 'date', group: 'planlama' },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', group: 'finans' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], group: 'finans' },
          { key: 'exchange_rate', label: 'Kur', type: 'number', group: 'finans' },
          { key: 'payment_term_code', label: 'Ödeme koşulu', group: 'finans' },
          { key: 'payment_method', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'AcikHesap'], group: 'finans' },
          { key: 'delivery_term_code', label: 'Teslimat koşulu', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'term_code', labelKey: 'term_name', group: 'planlama' },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', group: 'organizasyon' },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', group: 'organizasyon' },
          { key: 'project_code', label: 'Proje kodu', group: 'organizasyon' },
          { key: 'region', label: 'Bölge', group: 'organizasyon' },
          { key: 'description', label: 'Açıklama', group: 'status' },
          { key: 'public_note', label: 'Tedarikçi notu', group: 'status' },
          { key: 'internal_note', label: 'Dahili not', group: 'status' },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true, lead: true, group: 'kimlik' },
          { key: 'quantity', label: 'Miktar', type: 'number', required: true, size: 'short', lead: true, group: 'olcu' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short', group: 'olcu' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number', required: true, size: 'short', lead: true, group: 'finans' },
          { key: 'line_type', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short', group: 'kimlik' },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', size: 'short', group: 'finans' },
          { key: 'vat_rate', label: 'KDV %', type: 'number', size: 'short', group: 'finans' },
          { key: 'vat_mode', label: 'KDV status', type: 'select', options: ['Haric', 'Dahil'], size: 'short', group: 'finans' },
          { key: 'discount_rate', label: 'İsk1 %', type: 'number', size: 'short', group: 'finans' },
          { key: 'discount_rate_2', label: 'İsk2 %', type: 'number', size: 'short', group: 'finans' },
          { key: 'discount_rate_3', label: 'İsk3 %', type: 'number', size: 'short', group: 'finans' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short', group: 'finans' },
          { key: 'exchange_rate', label: 'Kur', type: 'number', size: 'short', group: 'finans' },
          { key: 'withholding_code', label: 'Tevkifat kodu', size: 'short', group: 'finans' },
          { key: 'withholding_rate', label: 'Tevkifat %', type: 'number', size: 'short', group: 'finans' },
          { key: 'excise_rate', label: 'ÖTV %', type: 'number', size: 'short', group: 'finans' },
          { key: 'delivery_date', label: 'Teslim', type: 'date', size: 'short', group: 'planlama' },
          { key: 'ship_date', label: 'Sevk', type: 'date', size: 'short', group: 'planlama' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', group: 'depo' },
          { key: 'project_code', label: 'Proje', size: 'short', group: 'organizasyon' },
          { key: 'region', label: 'Bölge', size: 'short', group: 'organizasyon' },
          { key: 'supplier_item_code', label: 'Ted. stok kodu', group: 'kimlik' },
          { key: 'supplier_item_name', label: 'Ted. stok adı', group: 'kimlik' },
          { key: 'line_description', label: 'Açıklama', group: 'status' },
          { key: 'rezervasyon_type', label: 'Rezervasyon tipi', group: 'status' },
          { key: 'rezervasyon_iliski_no', label: 'Rezervasyon ilişki no', group: 'status' },
          { key: 'giren_quantity', label: 'Giren', type: 'number', size: 'short', group: 'olcu' },
          { key: 'remaining_quantity', label: 'Bekleyen', type: 'number', size: 'short', group: 'olcu' },
          { key: 'amount_ex_tax', label: 'Tutar HT', type: 'number', size: 'short', group: 'finans' },
          { key: 'amount_ttc', label: 'Tutar TTC', type: 'number', size: 'short', group: 'finans' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { currency_code: 'TRY', exchange_rate: 1, status: 'Taslak', rate_type: 'TCMB-ALIS', vat_mode: 'Haric' },
      },
      {
        id: 'mal-kabuller',
        techId: 'PUR-GR-SCR-001',
        businessNameEn: 'GoodsReceiptScreen',
        title: 'Mal Kabuller',
        endpoint: '/mal-kabuller',
        crud: true,
        numeratorSeri: 'MAL_KABUL',
        codeField: 'receipt_no',
        nameField: 'order_no',
        convertAction: {
          label: 'Alış Faturası Oluştur',
          path: '/mal-kabuller/{id}/fatura-olustur',
          nested: { screenId: 'fatura-yonetimi', link: 'mal-kabul-fatura' },
        },
        filters: [
          { key: 'receipt_no', label: 'Kabul no' },
          { key: 'order_no', label: 'Sipariş no' },
          { key: 'warehouse_code', label: 'Depo' },
        ],
        columns: [
          { key: 'receipt_no', label: 'Kabul', mono: true },
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'vendor_delivery_note_no', label: 'Ted. irsaliye', mono: true },
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'receipt_date', label: 'Tarih' },
          { key: 'status', label: 'Durum' },
          { key: 'received_by', label: 'Kabul eden' },
          { key: 'gkk_gerekli', label: 'GKK' },
        ],
        masterFields: [
          { key: 'receipt_no', label: 'Kabul no', code: true },
          { key: 'purchase_order_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'order_no', required: true, fillFrom: 'siparis-satirlar' },
          { key: 'vendor_delivery_note_id', label: 'Tedarikçi irsaliyesi', type: 'lookup', lookup: 'tedarikci-irsaliyeleri', valueKey: 'id', labelKey: 'delivery_note_no', fillFrom: 'tedarikci-irsaliye-satirlar' },
          { key: 'warehouse_id', label: 'Depo (bilgi)', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'receipt_date', label: 'Kabul tarihi', type: 'date' },
          { key: 'vendor_delivery_note_no', label: 'Tedarikçi irsaliye no' },
          { key: 'delivery_date', label: 'İrsaliye tarihi', type: 'date' },
          { key: 'vendor_invoice_no', label: 'Tedarikçi fatura no (opsiyonel)' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kismi', 'Iptal', 'Kapali'] },
          { key: 'gkk_gerekli', label: 'GKK gerekli', type: 'checkbox' },
          { key: 'received_by', label: 'Kabul eden' },
          { key: 'description', label: 'Açıklama' },
          { key: 'internal_note', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'accepted_flag', label: 'Kabul edilen', type: 'number' },
          { key: 'reddedilen', label: 'Reddedilen', type: 'number' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number' },
          { key: 'lot_no', label: 'Parti no' },
          { key: 'serial_no', label: 'Seri no' },
          { key: 'stock_status', label: 'Statü', type: 'select', options: ['Kalitede', 'Kullanilabilir', 'Bloke'] },
          { key: 'raf_code', label: 'Raf' },
          { key: 'son_kullanma_date', label: 'SKT', type: 'date' },
          { key: 'line_description', label: 'Açıklama' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'tedarikci-irsaliyeleri',
        techId: 'PUR-DLV-SCR-001',
        businessNameEn: 'SupplierDeliveryNoteScreen',
        title: 'Tedarikçi İrsaliyeleri',
        endpoint: '/tedarikci-irsaliyeleri',
        crud: true,
        codeField: 'delivery_note_no',
        nameField: 'partner_name',
        numeratorSeri: 'TEDARIKCI_IRSALIYE',
        filters: [
          { key: 'delivery_note_no', label: 'İrsaliye no' },
          { key: 'partner_name', label: 'Tedarikçi' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'delivery_note_no', label: 'İrsaliye', mono: true },
          { key: 'partner_name', label: 'Tedarikçi' },
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'delivery_date', label: 'Tarih' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'delivery_note_no', label: 'İrsaliye no', code: true },
          { key: 'partner_id', label: 'Tedarikçi', type: 'lookup', lookup: 'partners-tedarikci', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true },
          { key: 'purchase_order_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'order_no', fillFrom: 'siparis-satirlar' },
          { key: 'delivery_date', label: 'İrsaliye tarihi', type: 'date' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Kismi', 'Kapali', 'Iptal'] },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'accepted_flag', label: 'Kabul edilen', type: 'number' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number' },
          { key: 'line_description', label: 'Açıklama' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { status: 'Acik' },
      },
      {
        id: 'giris-kontrolleri',
        techId: 'QLT-INC-SCR-001',
        businessNameEn: 'IncomingInspectionScreen',
        title: 'Giriş Kontrolleri',
        endpoint: '/giris-kontrolleri',
        crud: false,
        codeField: 'inspection_no',
        nameField: 'order_no',
        approveAction: { label: 'Onayla → Giriş Kalite', path: '/giris-kontrolleri/{id}/onayla' },
        filters: [
          { key: 'inspection_no', label: 'Kontrol no' },
          { key: 'order_no', label: 'Sipariş' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'inspection_no', label: 'Kontrol', mono: true },
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'receipt_no', label: 'Mal kabul', mono: true },
          { key: 'kaynak_depo_kodu', label: 'Giriş depo', mono: true },
          { key: 'hedef_depo_kodu', label: 'Kalite depo', mono: true },
          { key: 'inspection_date', label: 'Tarih' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'inspection_no', label: 'Kontrol no', code: true },
          { key: 'order_no', label: 'Sipariş no' },
          { key: 'receipt_no', label: 'Mal kabul no' },
          { key: 'kaynak_depo_kodu', label: 'Giriş depo' },
          { key: 'hedef_depo_kodu', label: 'Giriş kalite depo' },
          { key: 'status', label: 'Durum' },
          { key: 'inspected_by', label: 'Kontrol eden' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'item_name', label: 'Stok adı' },
          { key: 'ordered_quantity', label: 'Sipariş miktarı', type: 'number' },
          { key: 'received_quantity', label: 'Gelen miktar', type: 'number' },
          { key: 'accepted_quantity', label: 'Kabul miktarı', type: 'number' },
          { key: 'rejected_quantity', label: 'Red miktarı', type: 'number' },
          { key: 'uom_code', label: 'Birim' },
          { key: 'match_ok', label: 'Tutarlı', type: 'checkbox' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        readOnly: false,
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    sections: [
      { id: 'pipeline', title: 'Pipeline', screenIds: ['crm-adaylar', 'crm-kontaklar', 'crm-firsatlar'] },
      { id: 'faaliyet', title: 'Faaliyet', screenIds: ['crm-faaliyet-planlari', 'crm-faaliyetler', 'crm-gorevler', 'crm-ajanda'] },
      { id: 'tanimlar', title: 'Tanımlar', screenIds: ['crm-firsat-asamalari', 'crm-faaliyet-tipleri'] },
    ],
    screens: [
      {
        id: 'crm-firsat-asamalari',
        techId: 'CRM-STG-SCR-001',
        businessNameEn: 'OpportunityStageScreen',
        title: 'Fırsat Aşamaları',
        endpoint: '/crm-firsat-asamalari',
        crud: true,
        codeField: 'stage_code',
        nameField: 'stage_name',
        filters: [
          { key: 'stage_code', label: 'Kod' },
          { key: 'stage_name', label: 'Ad' },
        ],
        columns: [
          { key: 'stage_code', label: 'Kod', mono: true },
          { key: 'stage_name', label: 'Ad' },
          { key: 'line_no', label: 'Sıra' },
          { key: 'is_won', label: 'Kazanan' },
          { key: 'is_lost', label: 'Kaybeden' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'stage_code', label: 'Aşama kodu', code: true, required: true },
          { key: 'stage_name', label: 'Aşama adı', name: true, required: true },
          { key: 'line_no', label: 'Sıra', type: 'number' },
        ],
        detailFields: [
          { key: 'is_won', label: 'Kazanan aşama', type: 'checkbox' },
          { key: 'is_lost', label: 'Kaybeden aşama', type: 'checkbox' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'crm-faaliyet-tipleri',
        techId: 'CRM-ACTT-SCR-001',
        businessNameEn: 'ActivityTypeScreen',
        title: 'Faaliyet Tipleri',
        endpoint: '/crm-faaliyet-tipleri',
        crud: true,
        codeField: 'type_code',
        nameField: 'type_name',
        filters: [
          { key: 'type_code', label: 'Kod' },
          { key: 'type_name', label: 'Ad' },
        ],
        columns: [
          { key: 'type_code', label: 'Kod', mono: true },
          { key: 'type_name', label: 'Ad' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'type_code', label: 'Tip kodu', code: true, required: true },
          { key: 'type_name', label: 'Tip adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'crm-adaylar',
        techId: 'CRM-LEAD-SCR-001',
        businessNameEn: 'LeadScreen',
        title: 'Müşteri Adayları',
        endpoint: '/crm-adaylar',
        crud: true,
        numeratorSeri: 'CRM_ADAY',
        codeField: 'lead_code',
        nameField: 'lead_name',
        convertAction: {
          label: 'Cariye Dönüştür',
          path: '/crm-adaylar/{id}/cariye-donustur',
        },
        filters: [
          { key: 'lead_code', label: 'Kod' },
          { key: 'lead_name', label: 'Ad' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'lead_code', label: 'Kod', mono: true },
          { key: 'lead_name', label: 'Ad' },
          { key: 'status', label: 'Durum' },
          { key: 'priority', label: 'Öncelik' },
          { key: 'sorumlu_adi', label: 'Sorumlu' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
        ],
        masterFields: [
          { key: 'lead_code', label: 'Aday kodu', code: true },
          { key: 'lead_name', label: 'Aday adı', name: true, required: true },
          { key: 'status', label: 'Durum', type: 'select', options: ['Yeni', 'Nitelikli', 'Kazanildi', 'Kaybedildi', 'Donusturuldu'], required: true },
          { key: 'sorumlu_id', label: 'Sorumlu', type: 'lookup', lookup: 'users', valueKey: 'id', labelKey: 'first_name', codeKey: 'user_code' },
          { key: 'degerlendirme', label: 'Olasılık %', type: 'number' },
          { key: 'bulma_yontemi', label: 'Bulma yöntemi' },
          { key: 'tercih_sebebi', label: 'Tercih sebebi' },
          { key: 'priority', label: 'Öncelik', type: 'select', options: ['1.Sınıf', '2.Sınıf', '3.Sınıf'] },
          { key: 'telefon', label: 'Telefon' },
          { key: 'mobile_phone', label: 'Cep' },
          { key: 'email', label: 'E-posta' },
          { key: 'website', label: 'Website' },
          { key: 'country', label: 'Ülke' },
          { key: 'il', label: 'İl' },
          { key: 'district', label: 'İlçe' },
          { key: 'address', label: 'Adres' },
          { key: 'notlar', label: 'Notlar' },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'crm-kontaklar',
        techId: 'CRM-CNT-SCR-001',
        businessNameEn: 'ContactScreen',
        title: 'Kontaklar',
        endpoint: '/crm-kontaklar',
        crud: true,
        numeratorSeri: 'CRM_KONTAK',
        codeField: 'kontak_code',
        nameField: 'first_name',
        filters: [
          { key: 'kontak_code', label: 'Kod' },
          { key: 'first_name', label: 'Ad' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'lead_name', label: 'Aday' },
        ],
        columns: [
          { key: 'kontak_code', label: 'Kod', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'title', label: 'Ünvan' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'lead_name', label: 'Aday' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
        ],
        masterFields: [
          { key: 'kontak_code', label: 'Kontak kodu', code: true },
          { key: 'first_name', label: 'Ad', name: true, required: true },
          { key: 'last_name', label: 'Soyad', required: true },
          { key: 'title', label: 'Ünvan' },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'lead_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'lead_name', codeKey: 'lead_code' },
          { key: 'email', label: 'E-posta' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'mobile_phone', label: 'Cep' },
          { key: 'birincil', label: 'Birincil', type: 'checkbox' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'notlar', label: 'Notlar' },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'crm-firsatlar',
        techId: 'CRM-OPP-SCR-001',
        businessNameEn: 'OpportunityScreen',
        title: 'Fırsatlar',
        endpoint: '/crm-firsatlar',
        crud: true,
        numeratorSeri: 'CRM_FIRSAT',
        codeField: 'firsat_code',
        nameField: 'firsat_name',
        convertAction: {
          label: 'Teklife Dönüştür',
          path: '/crm-firsatlar/{id}/teklife-donustur',
          nested: { screenId: 'satis-teklifleri', link: 'firsat-teklif' },
        },
        approveAction: {
          label: 'Fırsatı Kapat',
          path: '/crm-firsatlar/{id}/kapat',
          dialog: 'firsat-kapat',
        },
        filters: [
          { key: 'firsat_code', label: 'Kod' },
          { key: 'firsat_name', label: 'Ad' },
          { key: 'stage_name', label: 'Aşama' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Kazanildi', 'Kaybedildi', 'Iptal'] },
        ],
        columns: [
          { key: 'firsat_code', label: 'Kod', mono: true },
          { key: 'firsat_name', label: 'Ad' },
          { key: 'customer_type', label: 'Tip' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'lead_name', label: 'Aday' },
          { key: 'stage_name', label: 'Aşama' },
          { key: 'beklenen_gelir', label: 'Beklenen' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'firsat_code', label: 'Fırsat kodu', code: true },
          { key: 'firsat_name', label: 'Fırsat adı', name: true, required: true },
          { key: 'konu', label: 'Konu' },
          { key: 'customer_type', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Aday'], required: true },
          { key: 'partner_id', label: 'Müşteri', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'lead_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'lead_name', codeKey: 'lead_code' },
          { key: 'stage_id', label: 'Aşama', type: 'lookup', lookup: 'crm-firsat-asamalari', valueKey: 'id', labelKey: 'stage_name', codeKey: 'stage_code', required: true },
          { key: 'takip_by_id', label: 'Takip eden', type: 'lookup', lookup: 'users', valueKey: 'id', labelKey: 'first_name', codeKey: 'user_code' },
          { key: 'beklenen_gelir', label: 'Beklenen gelir', type: 'number' },
          { key: 'currency_code', label: 'PB' },
          { key: 'degerlendirme', label: 'Olasılık %', type: 'number' },
          { key: 'target_kapatma_date', label: 'Hedef kapanış', type: 'date' },
          { key: 'country', label: 'Ülke' },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Kazanildi', 'Kaybedildi', 'Iptal'] },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { customer_type: 'Musteri', currency_code: 'TRY', country: 'TR' },
      },
      {
        id: 'crm-faaliyet-planlari',
        techId: 'CRM-APLN-SCR-001',
        businessNameEn: 'ActivityPlanScreen',
        title: 'Faaliyet Planları',
        endpoint: '/crm-faaliyet-planlari',
        crud: true,
        numeratorSeri: 'CRM_PLAN',
        codeField: 'plan_code',
        nameField: 'konu',
        convertAction: {
          label: 'Faaliyet Oluştur',
          path: '/crm-faaliyet-planlari/{id}/faaliyet-olustur',
        },
        filters: [
          { key: 'plan_code', label: 'Kod' },
          { key: 'konu', label: 'Konu' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'plan_code', label: 'Kod', mono: true },
          { key: 'konu', label: 'Konu' },
          { key: 'faaliyet_tipi_adi', label: 'Tip' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'lead_name', label: 'Aday' },
          { key: 'firsat_code', label: 'Fırsat', mono: true },
          { key: 'start_date', label: 'Başlangıç' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'plan_code', label: 'Plan kodu', code: true },
          { key: 'customer_type', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Aday'], required: true },
          { key: 'partner_id', label: 'Müşteri', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'lead_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'lead_name', codeKey: 'lead_code' },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_name', codeKey: 'firsat_code' },
          { key: 'faaliyet_type_id', label: 'Faaliyet tipi', type: 'lookup', lookup: 'crm-faaliyet-tipleri', valueKey: 'id', labelKey: 'type_name', codeKey: 'type_code' },
          { key: 'yapacak_id', label: 'Yapacak', type: 'lookup', lookup: 'users', valueKey: 'id', labelKey: 'first_name', codeKey: 'user_code' },
          { key: 'kontak_id', label: 'Kontak', type: 'lookup', lookup: 'crm-kontaklar', valueKey: 'id', labelKey: 'first_name', codeKey: 'kontak_code' },
          { key: 'start_date', label: 'Başlangıç', type: 'date' },
          { key: 'end_date', label: 'Bitiş', type: 'date' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Planlandi', 'Devam', 'Tamamlandi', 'Iptal'] },
          { key: 'konu', label: 'Konu', name: true },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { customer_type: 'Musteri', status: 'Planlandi' },
      },
      {
        id: 'crm-faaliyetler',
        techId: 'CRM-ACT-SCR-001',
        businessNameEn: 'ActivityScreen',
        title: 'Faaliyetler',
        endpoint: '/crm-faaliyetler',
        crud: true,
        numeratorSeri: 'CRM_FAALIYET',
        codeField: 'faaliyet_code',
        nameField: 'konu',
        filters: [
          { key: 'faaliyet_code', label: 'Kod' },
          { key: 'konu', label: 'Konu' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'faaliyet_code', label: 'Kod', mono: true },
          { key: 'konu', label: 'Konu' },
          { key: 'faaliyet_tipi_adi', label: 'Tip' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'lead_name', label: 'Aday' },
          { key: 'firsat_code', label: 'Fırsat', mono: true },
          { key: 'start_date', label: 'Tarih' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'faaliyet_code', label: 'Faaliyet kodu', code: true },
          { key: 'customer_type', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Aday'], required: true },
          { key: 'partner_id', label: 'Müşteri', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'lead_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'lead_name', codeKey: 'lead_code' },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_name', codeKey: 'firsat_code' },
          { key: 'faaliyet_type_id', label: 'Faaliyet tipi', type: 'lookup', lookup: 'crm-faaliyet-tipleri', valueKey: 'id', labelKey: 'type_name', codeKey: 'type_code' },
          { key: 'giren_id', label: 'Giren', type: 'lookup', lookup: 'users', valueKey: 'id', labelKey: 'first_name', codeKey: 'user_code' },
          { key: 'kontak_id', label: 'Kontak', type: 'lookup', lookup: 'crm-kontaklar', valueKey: 'id', labelKey: 'first_name', codeKey: 'kontak_code' },
          { key: 'start_date', label: 'Başlangıç', type: 'date' },
          { key: 'harcanan_dk', label: 'Harcanan (dk)', type: 'number' },
          { key: 'konu', label: 'Konu', name: true },
          { key: 'description', label: 'Açıklama', required: true },
          { key: 'degerlendirme', label: 'Değerlendirme' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Devam', 'Tamamlandi', 'Iptal'] },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { customer_type: 'Musteri', status: 'Tamamlandi' },
      },
      {
        id: 'crm-gorevler',
        techId: 'CRM-TASK-SCR-001',
        businessNameEn: 'TaskScreen',
        title: 'Görevler',
        endpoint: '/crm-gorevler',
        crud: true,
        numeratorSeri: 'CRM_GOREV',
        codeField: 'gorev_code',
        nameField: 'baslik',
        approveAction: {
          label: 'Tamamla',
          path: '/crm-gorevler/{id}/tamamla',
        },
        filters: [
          { key: 'gorev_code', label: 'Kod' },
          { key: 'baslik', label: 'Başlık' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'gorev_code', label: 'Kod', mono: true },
          { key: 'baslik', label: 'Başlık' },
          { key: 'sorumlu_adi', label: 'Sorumlu' },
          { key: 'priority', label: 'Öncelik' },
          { key: 'son_date', label: 'Son tarih' },
          { key: 'firsat_code', label: 'Fırsat', mono: true },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'gorev_code', label: 'Görev kodu', code: true },
          { key: 'baslik', label: 'Başlık', name: true, required: true },
          { key: 'description', label: 'Açıklama' },
          { key: 'sorumlu_id', label: 'Sorumlu', type: 'lookup', lookup: 'users', valueKey: 'id', labelKey: 'first_name', codeKey: 'user_code' },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'lead_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'lead_name', codeKey: 'lead_code' },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_name', codeKey: 'firsat_code' },
          { key: 'priority', label: 'Öncelik', type: 'select', options: ['Dusuk', 'Normal', 'Yuksek', 'Kritik'] },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Devam', 'Tamamlandi', 'Iptal'] },
          { key: 'son_date', label: 'Son tarih', type: 'date' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { priority: 'Normal', status: 'Acik' },
      },
      {
        id: 'crm-ajanda',
        techId: 'CRM-CAL-SCR-001',
        businessNameEn: 'AgendaCalendarScreen',
        title: 'Ajanda',
        endpoint: '/crm-ajanda',
        crud: true,
        codeField: 'baslik',
        nameField: 'baslik',
        filters: [
          { key: 'baslik', label: 'Başlık' },
          { key: 'type', label: 'Tip' },
        ],
        columns: [
          { key: 'baslik', label: 'Başlık' },
          { key: 'start_at', label: 'Başlangıç' },
          { key: 'end_at', label: 'Bitiş' },
          { key: 'type', label: 'Tip' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'user_code', label: 'Kullanıcı', mono: true },
        ],
        masterFields: [
          { key: 'baslik', label: 'Başlık', name: true, required: true },
          { key: 'start_at', label: 'Başlangıç', required: true },
          { key: 'end_at', label: 'Bitiş' },
          { key: 'type', label: 'Tip', type: 'select', options: ['Toplanti', 'Arama', 'Ziyaret', 'Diger'] },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'user_code', label: 'Kullanıcı kodu' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
      },
    ],
  },
  {
    id: 'satis',
    title: 'Satış',
    sections: [
      { id: 'siparis', title: 'Sipariş', screenIds: ['satis-teklifleri', 'satis-siparisleri'] },
      { id: 'sevk', title: 'Sevk', screenIds: ['sevk-emirleri'] },
      { id: 'belge-yonetim', title: 'Belge Yönetimi', screenIds: ['irsaliye-yonetimi', 'fatura-yonetimi'] },
    ],
    screens: [
      {
        id: 'satis-teklifleri',
        techId: 'SAL-QUO-SCR-001',
        businessNameEn: 'SalesQuotationScreen',
        title: 'Satış Teklifleri',
        endpoint: '/satis-teklifleri',
        crud: true,
        numeratorSeri: 'SATIS_TEKLIF',
        codeField: 'quotation_no',
        nameField: 'partner_name',
        convertAction: {
          label: 'Siparişe Dönüştür',
          path: '/satis-teklifleri/{id}/siparise-donustur',
          nested: { screenId: 'satis-siparisleri', link: 'teklif-siparis' },
        },
        filters: [
          { key: 'quotation_no', label: 'Teklif no' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'quotation_no', label: 'Teklif', mono: true },
          { key: 'customer_quotation_no', label: 'Müş. ref', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'quotation_date', label: 'Tarih' },
          { key: 'valid_date', label: 'Geçerlilik' },
          { key: 'delivery_date', label: 'Teslim' },
          { key: 'currency_code', label: 'PB' },
          { key: 'subtotal', label: 'Ara' },
          { key: 'tax_amount', label: 'KDV' },
          { key: 'grand_total', label: 'Genel' },
          { key: 'status', label: 'Durum' },
          { key: 'firsat_code', label: 'Fırsat', mono: true },
          { key: 'project_code', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'quotation_no', label: 'Teklif no', code: true },
          { key: 'customer_quotation_no', label: 'Müşteri teklif ref' },
          { key: 'partner_id', label: 'Müşteri', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_name', codeKey: 'firsat_code' },
          { key: 'lead_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'lead_name', codeKey: 'lead_code' },
          { key: 'quotation_date', label: 'Teklif tarihi', type: 'date' },
          { key: 'valid_date', label: 'Geçerlilik', type: 'date' },
          { key: 'delivery_date', label: 'Teslim tarihi', type: 'date' },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'exchange_rate', label: 'Kur', type: 'number' },
          { key: 'discount_rate', label: 'İskonto %', type: 'number' },
          { key: 'payment_term_code', label: 'Ödeme koşulu' },
          { key: 'payment_method', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'KrediKarti', 'AcikHesap'] },
          { key: 'delivery_term_code', label: 'Teslimat koşulu', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'term_code', labelKey: 'term_name' },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'price_list_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'list_name', codeKey: 'list_code' },
          { key: 'project_code', label: 'Proje kodu' },
          { key: 'region', label: 'Bölge' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'SipariseDonustu', 'Red', 'Iptal', 'Kapali'] },
          { key: 'movement_code_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-teklif', valueKey: 'id', labelKey: 'movement_name', codeKey: 'movement_code' },
          { key: 'description', label: 'Açıklama', name: true },
          { key: 'public_note', label: 'Müşteri notu' },
          { key: 'internal_note', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'line_type', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'line_description', label: 'Açıklama' },
          { key: 'quantity', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', size: 'short' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'exchange_rate', label: 'Kur', type: 'number', size: 'short' },
          { key: 'discount_rate', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'discount_rate_2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'discount_rate_3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'vat_rate', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'vat_mode', label: 'KDV status', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'delivery_date', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'project_code', label: 'Proje', size: 'short' },
          { key: 'region', label: 'Bölge', size: 'short' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { currency_code: 'TRY', exchange_rate: 1, rate_type: 'TCMB-SATIS', vat_mode: 'Haric', line_type: 'S', status: 'Taslak' },
      },
      {
        id: 'satis-siparisleri',
        techId: 'SAL-ORD-SCR-001',
        businessNameEn: 'SalesOrderScreen',
        title: 'Satış Siparişleri',
        endpoint: '/sales_orders',
        crud: true,
        numeratorSeri: 'SATIS_SIPARIS',
        codeField: 'order_no',
        nameField: 'partner_name',
        compactMaster: true,
        masterPrimaryMax: 16,
        convertAction: {
          label: 'Sevk Emri Oluştur',
          path: '/sales_orders/{id}/sevk-emri-olustur',
          needs: ['warehouse_id'],
          dialog: 'depo',
          nested: { screenId: 'sevk-emirleri', link: 'siparis-sevk' },
        },
        approveAction: {
          label: 'Stok Rezerve Et',
          path: '/sales_orders/{id}/rezerve',
          dialog: 'depo',
        },
        secondaryAction: {
          label: 'İş Emri Ekranı',
          openScreen: 'siparis-is-emri',
        },
        filters: [
          { key: 'order_no', label: 'Sipariş no' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'customer_order_no', label: 'Müş. sip. no', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'order_type', label: 'Tür' },
          { key: 'order_date', label: 'Tarih' },
          { key: 'delivery_date', label: 'Teslim' },
          { key: 'currency_code', label: 'PB' },
          { key: 'subtotal', label: 'Ara top.' },
          { key: 'tax_amount', label: 'KDV' },
          { key: 'grand_total', label: 'Genel top.' },
          { key: 'payment_term_code', label: 'Ödeme koş.' },
          { key: 'payment_method', label: 'Ödeme şekli' },
          { key: 'status', label: 'Durum' },
          { key: 'is_invoiced', label: 'Faturalandı' },
          { key: 'project_code', label: 'Proje', mono: true },
        ],
        // Kompakt başlık — notlar alt şeritte; finans/geçerlilik kalemde; address ayrı sekme
        masterFields: [
          { key: 'order_no', label: 'Sipariş no', code: true, lead: true },
          { key: 'partner_id', label: 'Müşteri', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true, lead: true, fillCariAdres: true },
          { key: 'order_date', label: 'Tarih', type: 'date', lead: true },
          { key: 'delivery_date', label: 'Teslim', type: 'date', lead: true },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kismi', 'Kapali', 'Iptal'], lead: true },
          { key: 'order_type', label: 'Tür', type: 'select', options: ['SatisSiparis', 'AlinanSiparis'], required: true, lead: true },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', lead: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', lead: true },
          { key: 'quotation_id', label: 'Teklif', type: 'lookup', lookup: 'satis-teklifleri', valueKey: 'id', labelKey: 'quotation_no', fillFrom: 'teklif-satirlar' },
          { key: 'customer_order_no', label: 'Müş. sip. no' },
          { key: 'movement_code_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-siparis', valueKey: 'id', labelKey: 'movement_name', codeKey: 'movement_code', lead: true },
          { key: 'payment_term_code', label: 'Ödeme koşulu', lead: true },
          { key: 'delivery_term_code', label: 'Teslimat koşulu', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'term_code', labelKey: 'term_name', lead: true },
          // Alt şerit (Belge notu alanı)
          { key: 'public_note', label: 'Müşteri notu' },
          { key: 'internal_note', label: 'Dahili not' },
        ],
        // Finans + geçerlilik/fiyat listesi kalem formunda
        // Kalem sırası: stok → birim → miktar → depo (bağlantı / önem)
        detailFields: [
          { key: 'line_type', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
          { key: 'quantity', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'line_description', label: 'Açıklama' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', size: 'short' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'exchange_rate', label: 'Kur', type: 'number', size: 'short' },
          { key: 'discount_rate', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'discount_rate_2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'discount_rate_3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'vat_rate', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'vat_mode', label: 'KDV status', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'price_list_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'list_name', codeKey: 'list_code' },
          { key: 'valid_date', label: 'Geçerlilik', type: 'date', size: 'short' },
          { key: 'delivery_date', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'project_code', label: 'Proje', size: 'short' },
          { key: 'region', label: 'Bölge', size: 'short' },
          { key: 'shipped_quantity', label: 'Sevk edilen', type: 'number', size: 'short' },
          { key: 'invoiced_quantity', label: 'Fatura edilen', type: 'number', size: 'short' },
          { key: 'rezerve_quantity', label: 'Rezerve', type: 'number', size: 'short' },
          { key: 'bekleyen_quantity', label: 'Bekleyen', type: 'number', size: 'short' },
          { key: 'kalan_sevk_miktar', label: 'Kalan sevk', type: 'number', size: 'short' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
        defaults: { currency_code: 'TRY', exchange_rate: 1, rate_type: 'TCMB-SATIS', vat_mode: 'Haric', order_type: 'SatisSiparis', status: 'Taslak' },
        formTabs: [
          {
            id: 'kalemler',
            label: 'Kalemler',
            kind: 'master-grid',
            masterFields: null, // screen.masterFields (normalize)
            grid: {
              key: 'kalemler',
              slots: 5,
              fields: null, // detailFields (normalize)
            },
          },
          {
            id: 'address',
            label: 'Adres',
            kind: 'fields',
            fields: [
              { key: 'ship_to_address', label: 'Sevk adresi', size: 'wide' },
              { key: 'ship_city', label: 'İl' },
              { key: 'ship_district', label: 'İlçe' },
              { key: 'ship_country', label: 'Ülke' },
              { key: 'ship_postal_code', label: 'Posta kodu' },
            ],
          },
        ],
      },
      {
        id: 'sevk-emirleri',
        techId: 'SAL-SHP-SCR-001',
        businessNameEn: 'ShipmentScreen',
        title: 'Sevk Emirleri',
        endpoint: '/sevk-emirleri',
        crud: true,
        numeratorSeri: 'SEVK_EMRI',
        codeField: 'shipment_no',
        nameField: 'partner_name',
        convertAction: {
          label: 'İrsaliye Oluştur',
          path: '/delivery_notes/sevk-emrinden',
          bodyKey: 'shipment_order_id',
          dialog: 'irsaliye',
          nested: { screenId: 'irsaliye-yonetimi', link: 'sevk-irsaliye' },
        },
        filters: [
          { key: 'shipment_no', label: 'Sevk no' },
          { key: 'order_no', label: 'Sipariş' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'shipment_no', label: 'Sevk', mono: true },
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'ship_date', label: 'Sevk tar.' },
          { key: 'planlanan_ship_date', label: 'Plan' },
          { key: 'priority', label: 'Öncelik' },
          { key: 'carrier_title', label: 'Taşıyıcı' },
          { key: 'vehicle_plate', label: 'Plaka' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'shipment_no', label: 'Sevk no', code: true },
          { key: 'sales_order_id', label: 'Satış siparişi', type: 'lookup', lookup: 'sales_orders', valueKey: 'id', labelKey: 'order_no', required: true, fillFrom: 'siparis-kalemler' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true },
          { key: 'ship_date', label: 'Sevk tarihi', type: 'date' },
          { key: 'planlanan_ship_date', label: 'Planlanan sevk', type: 'date' },
          { key: 'priority', label: 'Öncelik', type: 'select', options: ['Dusuk', 'Normal', 'Yuksek', 'Acil'] },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'IrsaliyeDonustu', 'Iptal', 'Kapali'] },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          { key: 'project_code', label: 'Proje kodu' },
          { key: 'region', label: 'Bölge' },
          { key: 'ship_to_address', label: 'Sevk adresi' },
          { key: 'ship_city', label: 'İl' },
          { key: 'ship_district', label: 'İlçe' },
          { key: 'ship_country', label: 'Ülke' },
          { key: 'ship_postal_code', label: 'Posta kodu' },
          { key: 'carrier_title', label: 'Taşıyıcı title' },
          { key: 'carrier_tax_id', label: 'Taşıyıcı VKN' },
          { key: 'vehicle_plate', label: 'Araç plaka' },
          { key: 'driver_name', label: 'Şoför' },
          { key: 'driver_telefon', label: 'Şoför tel' },
          { key: 'paket_adet', label: 'Paket adet', type: 'number' },
          { key: 'brut_agirlik', label: 'Brüt kg', type: 'number' },
          { key: 'net_agirlik', label: 'Net kg', type: 'number' },
          { key: 'hacim', label: 'Hacim', type: 'number' },
          { key: 'public_note', label: 'Müşteri notu' },
          { key: 'internal_note', label: 'Dahili not' },
          { key: 'movement_code_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-sevk', valueKey: 'id', labelKey: 'movement_name', codeKey: 'movement_code' },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'line_description', label: 'Açıklama' },
          { key: 'quantity', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
          { key: 'lot_id', label: 'Parti', type: 'lookup', lookup: 'stok-partileri', valueKey: 'id', labelKey: 'lot_no' },
          { key: 'serial_no', label: 'Seri no' },
          { key: 'raf_code', label: 'Raf' },
          { key: 'shipped_quantity', label: 'Sevk edilen', type: 'number', size: 'short' },
          { key: 'remaining_quantity', label: 'Bekleyen', type: 'number', size: 'short' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { priority: 'Normal', status: 'Taslak' },
      },
      {
        id: 'irsaliye-yonetimi',
        techId: 'SAL-DLV-SCR-001',
        businessNameEn: 'DeliveryNoteManagementScreen',
        title: 'İrsaliye Yönetimi',
        endpoint: '/delivery_notes',
        crud: true,
        numeratorSeri: 'IRSALIYE',
        codeField: 'delivery_note_no',
        nameField: 'partner_name',
        compactMaster: false,
        masterPrimaryMax: 18,
        helpText: 'Satış irsaliyelerinin oluşturulması, onayı, e-İrsaliye durumu ve faturalandırması bu ekrandan yönetilir.',
        convertAction: {
          label: 'Fatura Oluştur',
          path: '/delivery_notes/{id}/fatura-olustur',
          dialog: 'fatura-olustur',
          openTarget: { screenId: 'fatura-yonetimi', mode: 'duzelt' },
        },
        approveAction: { label: 'Onayla (Stok Çıkış)', path: '/delivery_notes/{id}/onayla', dialog: 'onay-depo' },
        filters: [
          { key: 'delivery_note_no', label: 'İrsaliye no' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'status', label: 'Durum' },
          { key: 'e_document_status', label: 'e-Belge' },
        ],
        columns: [
          { key: 'delivery_note_no', label: 'İrsaliye', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'delivery_date', label: 'İrs. tar.' },
          { key: 'actual_ship_date', label: 'Fiili sevk' },
          { key: 'vehicle_plate', label: 'Plaka' },
          { key: 'e_document_status', label: 'e-Belge' },
          { key: 'subtotal', label: 'Mal' },
          { key: 'grand_total', label: 'Genel' },
          { key: 'invoice_status', label: 'Fatura' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'delivery_note_no', label: 'İrsaliye no', code: true, lead: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', lead: true },
          { key: 'movement_code_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-irsaliye', valueKey: 'id', labelKey: 'movement_name', codeKey: 'movement_code', lead: true },
          { key: 'delivery_date', label: 'Belge tarihi', type: 'date', lead: true },
          { key: 'delivery_time', label: 'Belge saati', lead: true },
          { key: 'document_series', label: 'Seri', lead: true },
          { key: 'document_sequence', label: 'Sıra', lead: true },
          { key: 'gib_number', label: 'GİB no' },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true, lead: true, fillCariAdres: true },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', required: true, lead: true },
          { key: 'sales_order_id', label: 'Sipariş', type: 'lookup', lookup: 'sales_orders', valueKey: 'id', labelKey: 'order_no', fillFrom: 'siparis-kalemler' },
          { key: 'shipment_order_id', label: 'Sevk emri', type: 'lookup', lookup: 'sevk-emirleri', valueKey: 'id', labelKey: 'shipment_no', fillFrom: 'sevk-satirlar' },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', lead: true },
          { key: 'exchange_rate', label: 'Kur', type: 'number', lead: true },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'rate_option', label: 'Kur seçeneği', type: 'select', options: ['SevkTarihi', 'BelgeTarihi', 'Serbest'] },
          { key: 'e_document_status', label: 'e-Belge status', type: 'select', options: ['Hazir', 'Bekliyor', 'Gonderildi', 'Hata', 'Iptal'], lead: true },
          { key: 'actual_ship_date', label: 'Fiili sevk tarihi', type: 'date', lead: true },
          { key: 'actual_ship_time', label: 'Fiili sevk saati' },
          { key: 'due_date', label: 'Vade tarihi', type: 'date' },
          { key: 'due_days', label: 'Vade gün', type: 'number' },
          { key: 'payment_plan', label: 'Ödeme planı' },
          { key: 'payment_method', label: 'Ödeme şekli' },
          { key: 'delivery_term_code', label: 'Teslim şekli', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'term_code', labelKey: 'term_name' },
          { key: 'carrier_company', label: 'Nakliye şirketi' },
          { key: 'carrier', label: 'Nakliyeci' },
          { key: 'sales_rep', label: 'Satış temsilcisi' },
          { key: 'project_code', label: 'Proje' },
          { key: 'region', label: 'Bölge' },
          { key: 'invoice_status', label: 'Fatura durumu', type: 'select', options: ['Irsaliye', 'Kismi', 'Faturalandi'] },
          { key: 'is_printed', label: 'Yazdırıldı', type: 'checkbox' },
          { key: 'print_local_currency', label: 'Çıktı yerel PB', type: 'checkbox' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'FaturayaDonustu', 'Iptal', 'Kapali'], lead: true },
          { key: 'description', label: 'Açıklama 1' },
          { key: 'description_2', label: 'Açıklama 2' },
          { key: 'description_3', label: 'Açıklama 3' },
          { key: 'delivery_footer_discount', label: 'İrs. altı iskonto', type: 'number' },
          { key: 'public_note', label: 'Müşteri notu' },
          { key: 'internal_note', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'line_type', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
          { key: 'quantity', label: 'Miktar', type: 'number', size: 'short', required: true },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', size: 'short' },
          { key: 'line_description', label: 'Açıklama' },
          { key: 'line_description_2', label: 'Açıklama 2' },
          { key: 'line_description_3', label: 'Açıklama 3' },
          { key: 'price_list_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'list_name', codeKey: 'list_code' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', size: 'short' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'exchange_rate', label: 'Kur', type: 'number', size: 'short' },
          { key: 'local_unit_price', label: 'Yerel br.fiyat', type: 'number', size: 'short', readOnly: true },
          { key: 'discount_rate', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'discount_rate_2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'discount_rate_3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'vat_mode', label: 'KDV status', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'vat_code', label: 'KDV kodu', size: 'short' },
          { key: 'vat_rate', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'withholding_code', label: 'Tevkifat kodu', size: 'short' },
          { key: 'withholding_rate', label: 'Tevkifat %', type: 'number', size: 'short' },
          { key: 'excise_code', label: 'ÖTV kodu', size: 'short' },
          { key: 'excise_rate', label: 'ÖTV %', type: 'number', size: 'short' },
          { key: 'bandrol_rate', label: 'Bandrol %', type: 'number', size: 'short' },
          { key: 'tax_schema', label: 'Vergi şeması', size: 'short' },
          { key: 'due_date', label: 'Vade', type: 'date', size: 'short' },
          { key: 'due_days', label: 'Vade gün', type: 'number', size: 'short' },
          { key: 'customer_ref_code', label: 'Müş. ref' },
          { key: 'lot_no', label: 'Parti', size: 'short' },
          { key: 'serial_no', label: 'Seri', size: 'short' },
          { key: 'sales_order_line_id', label: 'Sip. satır id', type: 'number', size: 'short' },
          { key: 'order_no', label: 'Sipariş no', size: 'short' },
          { key: 'invoiced_quantity', label: 'Fatura edilen', type: 'number', size: 'short', readOnly: true },
          { key: 'amount_ex_tax', label: 'Tutar', type: 'number', size: 'short', readOnly: true },
          { key: 'stock_status', label: 'Statü', type: 'select', options: ['Kullanilabilir', 'Kalitede', 'Bloke'], size: 'short' },
        ],
        detailKey: 'satirlar',
        detailSlots: 6,
        detailAsFields: false,
        defaults: {
          currency_code: 'TRY',
          exchange_rate: 1,
          rate_type: 'TCMB-SATIS',
          rate_option: 'SevkTarihi',
          scenario: 'TEMELIRSALIYE',
          delivery_note_type: 'SEVK',
          e_document_status: 'Hazir',
          invoice_status: 'Irsaliye',
          status: 'Taslak',
          is_printed: false,
          print_local_currency: false,
          ship_country: 'TR',
        },
        formTabs: [
          {
            id: 'giris',
            label: 'İrsaliye Giriş',
            kind: 'master-grid',
            masterFields: null,
            grid: {
              key: 'satirlar',
              slots: 6,
              fields: null,
            },
          },
          {
            id: 'genel',
            label: 'Genel Bilgiler',
            kind: 'fields',
            fields: [
              { key: 'ship_to_partner_id', label: 'Sevk cari', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
              { key: 'ship_address_type', label: 'Sevk address tipi' },
              { key: 'ship_name', label: 'Sevk first_name' },
              { key: 'ship_last_name', label: 'Sevk last_name' },
              { key: 'ship_address_1', label: 'Sevk address 1', size: 'wide' },
              { key: 'ship_address_2', label: 'Sevk address 2', size: 'wide' },
              { key: 'ship_address_3', label: 'Sevk address 3', size: 'wide' },
              { key: 'ship_country', label: 'Sevk ülke', type: 'lookup', lookup: 'countries', valueKey: 'country_name', labelKey: 'country_name' },
              { key: 'ship_city', label: 'Sevk il', type: 'lookup', lookup: 'cities', valueKey: 'city_name', labelKey: 'city_name' },
              { key: 'ship_district', label: 'Sevk ilçe', type: 'lookup', lookup: 'districts', valueKey: 'district_name', labelKey: 'district_name' },
              { key: 'ship_postal_code', label: 'Sevk posta kodu' },
              { key: 'ship_phone_1', label: 'Sevk tel 1' },
              { key: 'ship_phone_2', label: 'Sevk tel 2' },
              { key: 'customs', label: 'Gümrük' },
              { key: 'ship_to_address', label: 'Sevk adresi (özet)', size: 'wide' },
              { key: 'withholding_code', label: 'Tevkifat kodu' },
              { key: 'withholding_rate', label: 'Tevkifat oranı', type: 'number' },
              { key: 'withholding_amount', label: 'Tevkifat tutarı', type: 'number' },
              { key: 'tax_schema', label: 'Vergi şeması' },
              { key: 'special_movement_type', label: 'Özel hareket tipi' },
              { key: 'fin_due_date', label: 'Fin. vade tarih', type: 'date' },
              { key: 'fin_due_days', label: 'Fin. vade gün', type: 'number' },
              { key: 'stock_date', label: 'Stok tarihi', type: 'date' },
              { key: 'bill_address_1', label: 'Fatura address 1', size: 'wide' },
              { key: 'bill_address_2', label: 'Fatura address 2', size: 'wide' },
              { key: 'bill_address_3', label: 'Fatura address 3', size: 'wide' },
              { key: 'bill_postal_code', label: 'Fatura posta kodu' },
              { key: 'bill_country', label: 'Fatura ülke', type: 'lookup', lookup: 'countries', valueKey: 'country_name', labelKey: 'country_name' },
              { key: 'bill_city', label: 'Fatura il', type: 'lookup', lookup: 'cities', valueKey: 'city_name', labelKey: 'city_name' },
              { key: 'bill_district', label: 'Fatura ilçe', type: 'lookup', lookup: 'districts', valueKey: 'district_name', labelKey: 'district_name' },
              { key: 'contract_code', label: 'Sözleşme kodu' },
              { key: 'partner_title', label: 'Cari title', size: 'wide' },
              { key: 'partner_title_2', label: 'Cari title 2', size: 'wide' },
              { key: 'tax_office', label: 'Vergi dairesi' },
              { key: 'tax_id', label: 'Vergi no' },
            ],
          },
          {
            id: 'e-irsaliye',
            label: 'e-İrsaliye',
            kind: 'fields',
            fields: [
              { key: 'delivery_note_type', label: 'e-İrsaliye tipi', type: 'select', options: ['SEVK', 'MATBU', 'IADE'] },
              { key: 'scenario', label: 'İrsaliye senaryosu', type: 'select', options: ['TEMELIRSALIYE', 'TICARIIRSALIYE'] },
              { key: 'uuid_ettn', label: 'ETTN', readOnly: true },
              { key: 'mailbox_alias', label: 'Posta kutusu (alias)' },
              { key: 'purchase_pre_delivery', label: 'Alış ön irsaliye' },
              { key: 'paper_series', label: 'Matbu seri' },
              { key: 'paper_sequence', label: 'Matbu sıra' },
              { key: 'paper_document_date', label: 'Matbu belge tarih', type: 'date' },
              { key: 'portal_sent_date', label: 'Portala iletilen tarih', type: 'date' },
              { key: 'ecommerce_web', label: 'e-Ticaret web address', size: 'wide' },
              { key: 'ecommerce_name', label: 'e-Ticaret first_name' },
              { key: 'ecommerce_last_name', label: 'e-Ticaret last_name' },
              { key: 'ecommerce_email', label: 'e-Ticaret email' },
            ],
          },
          {
            id: 'arac',
            label: 'Araç Bilgileri',
            kind: 'fields',
            fields: [
              { key: 'delivered_by', label: 'Teslim eden' },
              { key: 'vehicle_code', label: 'Araç kodu' },
              { key: 'vehicle_plate', label: 'Araç plaka' },
              { key: 'driver_national_id', label: 'TCKN' },
              { key: 'driver_name', label: 'Şoför adı' },
              { key: 'driver_last_name', label: 'Şoför soyadı' },
              { key: 'driver_mobile', label: 'Cep no' },
              { key: 'vehicle_description', label: 'Açıklama', size: 'wide' },
              { key: 'trailer_plate', label: 'Dorse plaka no' },
              { key: 'cargo_no', label: 'Kargo numarası' },
              { key: 'carrier_title', label: 'Taşıyıcı ünvan', size: 'wide' },
              { key: 'carrier_tax_id', label: 'Taşıyıcı VKN' },
            ],
          },
        ],
      },
      {
        id: 'fatura-yonetimi',
        techId: 'SAL-INV-SCR-001',
        businessNameEn: 'InvoiceManagementScreen',
        title: 'Fatura Yönetimi',
        endpoint: '/invoices',
        crud: true,
        numeratorSeri: 'FATURA',
        numeratorFromField: {
          field: 'invoice_type',
          map: {
            Satis: 'FATURA',
            Iade: 'FATURA',
            SatisIade: 'FATURA',
            Alis: 'ALIS_FATURA',
            AlisIade: 'ALIS_FATURA',
          },
        },
        codeField: 'invoice_no',
        nameField: 'partner_name',
        compactMaster: false,
        masterPrimaryMax: 18,
        helpText: 'Alış ve satış faturaları tek ekranda yönetilir. Tür filtresiyle yön seçin; alışta mal kabul / 3-way eşleştirme, satışta e-Fatura alanları kullanılır.',
        approveAction: { label: '3-way Eşleştir', path: '/invoices/{id}/eslestir' },
        convertAction: { label: 'Muhasebeleştir', path: '/invoices/{id}/muhasebelestir' },
        filters: [
          { key: 'invoice_no', label: 'Fatura no' },
          { key: 'partner_name', label: 'Cari' },
          {
            key: 'invoice_type',
            label: 'Tür',
            type: 'select',
            options: ['', 'Satis', 'Iade', 'Alis', 'AlisIade'],
            queryParam: true,
          },
          { key: 'e_document_status', label: 'e-Belge' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'invoice_no', label: 'Fatura', mono: true },
          { key: 'invoice_type', label: 'Tür' },
          { key: 'customer_invoice_ref', label: 'Müş./Ted. ref', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'invoice_date', label: 'Tarih' },
          { key: 'due_date', label: 'Vade' },
          { key: 'scenario', label: 'Senaryo' },
          { key: 'e_document_status', label: 'e-Belge' },
          { key: 'net_amount', label: 'Ara top.' },
          { key: 'tax_amount', label: 'KDV' },
          { key: 'payable_amount', label: 'Ödenecek' },
          { key: 'payment_status', label: 'Ödeme' },
          { key: 'payment_method', label: 'Şekli' },
          { key: 'currency_code', label: 'PB' },
          { key: 'status', label: 'Durum' },
          { key: 'project_code', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'invoice_no', label: 'Fatura no', code: true, lead: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', lead: true },
          { key: 'movement_code_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-fatura', valueKey: 'id', labelKey: 'movement_name', codeKey: 'movement_code', lead: true },
          { key: 'invoice_date', label: 'Belge tarihi', type: 'date', required: true, lead: true },
          { key: 'document_series', label: 'Seri', lead: true },
          { key: 'document_sequence', label: 'Sıra', lead: true },
          { key: 'gib_number', label: 'GİB no' },
          { key: 'customer_invoice_ref', label: 'Müşteri / tedarikçi fatura ref' },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true, lead: true, fillCariAdres: true },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', lead: true },
          {
            key: 'invoice_type',
            label: 'Fatura türü',
            type: 'select',
            options: ['Satis', 'Iade', 'Alis', 'AlisIade'],
            required: true,
            lead: true,
          },
          { key: 'scenario', label: 'Senaryo', type: 'select', options: ['TICARIFATURA', 'TEMELFATURA'], required: true, lead: true },
          { key: 'invoice_category', label: 'Fatura tipi', type: 'select', options: ['SATIS', 'IADE'], required: true },
          { key: 'delivery_note_id', label: 'İrsaliye', type: 'lookup', lookup: 'delivery_notes', valueKey: 'id', labelKey: 'delivery_note_no', fillFrom: 'irsaliye-satirlar' },
          { key: 'goods_receipt_id', label: 'Mal kabul (alış)', type: 'lookup', lookup: 'mal-kabuller', valueKey: 'id', labelKey: 'receipt_no', fillFrom: 'mal-kabul-satirlar' },
          { key: 'sales_order_id', label: 'Sipariş', type: 'lookup', lookup: 'sales_orders', valueKey: 'id', labelKey: 'order_no', fillFrom: 'siparis-kalemler' },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', required: true, lead: true },
          { key: 'exchange_rate', label: 'Kur', type: 'number', lead: true },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'rate_option', label: 'Kur seçeneği', type: 'select', options: ['BelgeTarihi', 'SevkTarihi', 'Serbest'] },
          { key: 'e_document_status', label: 'e-Belge status', type: 'select', options: ['Hazir', 'Bekliyor', 'Gonderildi', 'Hata', 'Iptal'], lead: true },
          { key: 'due_date', label: 'Vade tarihi', type: 'date', required: true },
          { key: 'due_days', label: 'Vade gün', type: 'number' },
          { key: 'payment_due_days', label: 'Vade (gün)', type: 'number' },
          { key: 'payment_plan', label: 'Ödeme planı' },
          { key: 'payment_method', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'KrediKarti', 'AcikHesap'], required: true },
          { key: 'payment_term_code', label: 'Ödeme koşulu' },
          { key: 'payment_status', label: 'Ödeme durumu', type: 'select', options: ['Odenmedi', 'Kismi', 'Odendi', 'Iptal'] },
          { key: 'delivery_term_code', label: 'Teslim şekli', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'term_code', labelKey: 'term_name' },
          { key: 'sales_rep', label: 'Satış temsilcisi' },
          { key: 'project_code', label: 'Proje' },
          { key: 'region', label: 'Bölge' },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'price_list_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'list_name', codeKey: 'list_code' },
          { key: 'is_printed', label: 'Yazdırıldı', type: 'checkbox' },
          { key: 'print_local_currency', label: 'Çıktı yerel PB', type: 'checkbox' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Iptal', 'Kapali'], lead: true },
          { key: 'description', label: 'Açıklama 1' },
          { key: 'description_2', label: 'Açıklama 2' },
          { key: 'description_3', label: 'Açıklama 3' },
          { key: 'invoice_footer_discount', label: 'Fatura altı iskonto', type: 'number' },
          { key: 'public_note', label: 'Müşteri notu' },
          { key: 'internal_note', label: 'Dahili not' },
          { key: 'is_posted', label: 'Muhasebeleşti', type: 'checkbox', readOnly: true },
        ],
        detailFields: [
          { key: 'line_type', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'warehouse_id', label: 'Depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code', size: 'short' },
          { key: 'item_id', label: 'Ürün', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'line_description', label: 'Açıklama' },
          { key: 'line_description_2', label: 'Açıklama 2' },
          { key: 'line_description_3', label: 'Açıklama 3' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name', size: 'short' },
          { key: 'quantity', label: 'Miktar', type: 'number', size: 'short', required: true },
          { key: 'price_list_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'list_name', codeKey: 'list_code' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number', size: 'short', required: true },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', size: 'short' },
          { key: 'rate_type', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'exchange_rate', label: 'Kur', type: 'number', size: 'short' },
          { key: 'local_unit_price', label: 'Yerel br.fiyat', type: 'number', size: 'short', readOnly: true },
          { key: 'discount_rate', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'discount_rate_2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'discount_rate_3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'vat_mode', label: 'KDV status', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'vat_code', label: 'KDV kodu', size: 'short' },
          { key: 'vat_rate', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'withholding_code', label: 'Tevkifat kodu', size: 'short' },
          { key: 'withholding_rate', label: 'Tevkifat %', type: 'number', size: 'short' },
          { key: 'excise_code', label: 'ÖTV kodu', size: 'short' },
          { key: 'excise_rate', label: 'ÖTV %', type: 'number', size: 'short' },
          { key: 'bandrol_rate', label: 'Bandrol %', type: 'number', size: 'short' },
          { key: 'tax_schema', label: 'Vergi şeması', size: 'short' },
          { key: 'due_date', label: 'Vade', type: 'date', size: 'short' },
          { key: 'due_days', label: 'Vade gün', type: 'number', size: 'short' },
          { key: 'customer_ref_code', label: 'Müş. ref' },
          { key: 'unit_cost', label: 'Maliyet', type: 'number', size: 'short' },
          { key: 'project_code', label: 'Proje', size: 'short' },
          { key: 'serial_no', label: 'Seri no', size: 'short' },
          { key: 'order_no', label: 'Sipariş no', size: 'short' },
          { key: 'amount_ex_tax', label: 'Tutar', type: 'number', size: 'short', readOnly: true },
        ],
        detailKey: 'kalemler',
        detailSlots: 6,
        detailAsFields: false,
        defaults: {
          invoice_type: 'Satis',
          scenario: 'TICARIFATURA',
          invoice_category: 'SATIS',
          currency_code: 'TRY',
          exchange_rate: 1,
          rate_type: 'TCMB-SATIS',
          rate_option: 'BelgeTarihi',
          vat_mode: 'Haric',
          e_document_status: 'Hazir',
          payment_status: 'Odenmedi',
          status: 'Taslak',
          is_printed: false,
          print_local_currency: false,
          ship_country: 'TR',
        },
        formTabs: [
          {
            id: 'giris',
            label: 'Fatura Giriş',
            kind: 'master-grid',
            masterFields: null,
            grid: {
              key: 'kalemler',
              slots: 6,
              fields: null,
            },
          },
          {
            id: 'genel',
            label: 'Genel Bilgiler',
            kind: 'fields',
            fields: [
              { key: 'ship_to_partner_id', label: 'Sevk cari', type: 'lookup', lookup: 'partners-musteri', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
              { key: 'ship_address_type', label: 'Sevk address tipi' },
              { key: 'ship_name', label: 'Sevk first_name' },
              { key: 'ship_last_name', label: 'Sevk last_name' },
              { key: 'ship_address_1', label: 'Sevk address 1', size: 'wide' },
              { key: 'ship_address_2', label: 'Sevk address 2', size: 'wide' },
              { key: 'ship_address_3', label: 'Sevk address 3', size: 'wide' },
              { key: 'ship_country', label: 'Sevk ülke', type: 'lookup', lookup: 'countries', valueKey: 'country_name', labelKey: 'country_name' },
              { key: 'ship_city', label: 'Sevk il', type: 'lookup', lookup: 'cities', valueKey: 'city_name', labelKey: 'city_name' },
              { key: 'ship_district', label: 'Sevk ilçe', type: 'lookup', lookup: 'districts', valueKey: 'district_name', labelKey: 'district_name' },
              { key: 'ship_postal_code', label: 'Sevk posta kodu' },
              { key: 'ship_phone_1', label: 'Sevk tel 1' },
              { key: 'ship_phone_2', label: 'Sevk tel 2' },
              { key: 'customs', label: 'Gümrük' },
              { key: 'ship_to_address', label: 'Sevk adresi (özet)', size: 'wide' },
              { key: 'withholding_code', label: 'Tevkifat kodu' },
              { key: 'withholding_rate', label: 'Tevkifat oranı', type: 'number' },
              { key: 'withholding_amount', label: 'Tevkifat tutarı', type: 'number' },
              { key: 'tax_schema', label: 'Vergi şeması' },
              { key: 'special_movement_type', label: 'Özel hareket tipi' },
              { key: 'fin_due_date', label: 'Fin. vade tarih', type: 'date' },
              { key: 'fin_due_days', label: 'Fin. vade gün', type: 'number' },
              { key: 'stock_date', label: 'Stok tarihi', type: 'date' },
              { key: 'bill_address_1', label: 'Fatura address 1', size: 'wide' },
              { key: 'bill_address_2', label: 'Fatura address 2', size: 'wide' },
              { key: 'bill_address_3', label: 'Fatura address 3', size: 'wide' },
              { key: 'bill_postal_code', label: 'Fatura posta kodu' },
              { key: 'bill_country', label: 'Fatura ülke', type: 'lookup', lookup: 'countries', valueKey: 'country_name', labelKey: 'country_name' },
              { key: 'bill_city', label: 'Fatura il', type: 'lookup', lookup: 'cities', valueKey: 'city_name', labelKey: 'city_name' },
              { key: 'bill_district', label: 'Fatura ilçe', type: 'lookup', lookup: 'districts', valueKey: 'district_name', labelKey: 'district_name' },
              { key: 'contract_code', label: 'Sözleşme kodu' },
              { key: 'partner_title', label: 'Cari title', size: 'wide' },
              { key: 'partner_title_2', label: 'Cari title 2', size: 'wide' },
              { key: 'tax_office', label: 'Vergi dairesi', required: true },
              { key: 'tax_id', label: 'Vergi no', required: true },
            ],
          },
          {
            id: 'e-fatura',
            label: 'e-Fatura',
            kind: 'fields',
            fields: [
              { key: 'scenario', label: 'e-Fatura senaryosu', type: 'select', options: ['TICARIFATURA', 'TEMELFATURA'] },
              { key: 'invoice_category', label: 'Fatura tipi', type: 'select', options: ['SATIS', 'IADE'] },
              { key: 'uuid_ettn', label: 'ETTN', readOnly: true },
              { key: 'mailbox_alias', label: 'Posta kutusu (alias)' },
              { key: 'portal_sent_date', label: 'Portala iletilen tarih', type: 'date' },
              { key: 'ecommerce_web', label: 'e-Ticaret web address', size: 'wide' },
              { key: 'ecommerce_name', label: 'e-Ticaret first_name' },
              { key: 'ecommerce_last_name', label: 'e-Ticaret last_name' },
              { key: 'ecommerce_email', label: 'e-Ticaret email' },
            ],
          },
        ],
      },
    ],
  },

  {
    id: 'kalite',
    title: 'Kalite',
    sections: [
      { id: 'emirler', title: 'Emirler', screenIds: ['kk-emirleri-gkk', 'kk-emirleri-ckk', 'kk-uygunsuzluklar', 'kk-capa'] },
      { id: 'tanimlar', title: 'Tanımlar', screenIds: ['kk-kontrol-planlari', 'kk-stok-planlari', 'kk-ret-nedenleri'] },
    ],
    screens: [
      {
        id: 'kk-emirleri-gkk',
        techId: 'QLT-IQC-SCR-001',
        businessNameEn: 'IncomingQcOrderScreen',
        title: 'Giriş Kalite Emirleri',
        endpoint: '/kk-emirleri?direction=GKK',
        crud: false,
        codeField: 'order_no',
        nameField: 'item_name',
        approveAction: { label: 'Onayla', path: '/kk-emirleri/{id}/onayla' },
        filters: [
          { key: 'order_no', label: 'Emir no' },
          { key: 'item_code', label: 'Stok' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'order_no', label: 'Emir', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'lot_no', label: 'Parti', mono: true },
          { key: 'quantity', label: 'Miktar' },
          { key: 'accepted_quantity', label: 'Uygun' },
          { key: 'rejected_quantity', label: 'Uygunsuz' },
          { key: 'status', label: 'Durum' },
          { key: 'warehouse_code', label: 'Depo', mono: true },
        ],
        masterFields: [
          { key: 'order_no', label: 'Emir no', code: true },
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'accepted_quantity', label: 'Uygun quantity', type: 'number' },
          { key: 'rejected_quantity', label: 'Uygunsuz quantity', type: 'number' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
        readOnly: false,
      },
      {
        id: 'kk-emirleri-ckk',
        techId: 'QLT-OQC-SCR-001',
        businessNameEn: 'OutgoingQcOrderScreen',
        title: 'Çıkış Kalite Emirleri',
        endpoint: '/kk-emirleri?direction=CKK',
        crud: false,
        codeField: 'order_no',
        nameField: 'item_name',
        approveAction: { label: 'Onayla', path: '/kk-emirleri/{id}/onayla' },
        filters: [
          { key: 'order_no', label: 'Emir no' },
          { key: 'item_code', label: 'Stok' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'order_no', label: 'Emir', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'lot_no', label: 'Parti', mono: true },
          { key: 'quantity', label: 'Miktar' },
          { key: 'accepted_quantity', label: 'Uygun' },
          { key: 'rejected_quantity', label: 'Uygunsuz' },
          { key: 'status', label: 'Durum' },
          { key: 'warehouse_code', label: 'Depo', mono: true },
        ],
        masterFields: [
          { key: 'order_no', label: 'Emir no', code: true },
          { key: 'item_code', label: 'Stok kodu' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'accepted_quantity', label: 'Uygun quantity', type: 'number' },
          { key: 'rejected_quantity', label: 'Uygunsuz quantity', type: 'number' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
        readOnly: false,
      },
      {
        id: 'kk-uygunsuzluklar',
        techId: 'QLT-NCR-SCR-001',
        businessNameEn: 'NonconformanceScreen',
        title: 'KK Uygunsuzluklar',
        endpoint: '/kk-uygunsuzluklar',
        crud: true,
        codeField: 'id',
        nameField: 'description',
        filters: [
          { key: 'order_no', label: 'Emir no' },
          { key: 'item_code', label: 'Stok' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'id', label: 'ID', mono: true },
          { key: 'order_no', label: 'Emir', mono: true },
          { key: 'direction', label: 'Yön' },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'ret_kodu', label: 'Ret kodu', mono: true },
          { key: 'quantity', label: 'Miktar' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'order_id', label: 'Emir ID', type: 'number', required: true },
          { key: 'ret_neden_id', label: 'Ret nedeni', type: 'lookup', lookup: 'kk-ret-nedenleri', valueKey: 'id', labelKey: 'neden_name', codeKey: 'neden_code' },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'description', label: 'Açıklama', name: true },
          { key: 'duzeltici_faaliyet', label: 'Düzeltici faaliyet' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Kapali', 'Iptal'] },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'kk-capa',
        techId: 'QLT-CAPA-SCR-001',
        businessNameEn: 'CapaScreen',
        title: 'CAPA',
        endpoint: '/kk-capa',
        crud: true,
        codeField: 'capa_no',
        nameField: 'baslik',
        numeratorSeri: 'CAPA',
        filters: [
          { key: 'capa_no', label: 'CAPA no' },
          { key: 'status', label: 'Durum' },
          { key: 'baslik', label: 'Başlık' },
        ],
        columns: [
          { key: 'capa_no', label: 'No', mono: true },
          { key: 'baslik', label: 'Başlık' },
          { key: 'uygunsuzluk_no', label: 'Uygunsuzluk', mono: true },
          { key: 'target_date', label: 'Hedef' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'capa_no', label: 'CAPA no', code: true },
          { key: 'baslik', label: 'Başlık', name: true, required: true },
          { key: 'nonconformance_id', label: 'Uygunsuzluk ID', type: 'number' },
          { key: 'description', label: 'Açıklama' },
          { key: 'target_date', label: 'Hedef tarih', type: 'date' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Devam', 'Kapali', 'Iptal'] },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'kk-kontrol-planlari',
        techId: 'QLT-PLAN-SCR-001',
        businessNameEn: 'ControlPlanScreen',
        title: 'KK Kontrol Planları',
        endpoint: '/kk-kontrol-planlari',
        crud: true,
        numeratorSeri: 'KK_PLAN',
        codeField: 'plan_code',
        nameField: 'plan_name',
        filters: [
          { key: 'plan_code', label: 'Plan kodu' },
          { key: 'plan_name', label: 'Plan adı' },
          { key: 'direction', label: 'Yön' },
        ],
        columns: [
          { key: 'plan_code', label: 'Kod', mono: true },
          { key: 'plan_name', label: 'Ad' },
          { key: 'direction', label: 'Yön' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'plan_code', label: 'Plan kodu', code: true, required: true },
          { key: 'plan_name', label: 'Plan adı', name: true, required: true },
          { key: 'direction', label: 'Yön', type: 'select', options: ['GKK', 'CKK', 'HerIkisi'], required: true },
        ],
        detailFields: [
          { key: 'kriter_code', label: 'Kriter kodu' },
          { key: 'kriter_name', label: 'Kriter adı' },
          { key: 'olcum_type', label: 'Ölçüm tipi', type: 'select', options: ['Sayisal', 'Metin', 'EvetHayir'] },
          { key: 'min_value', label: 'Min', type: 'number' },
          { key: 'max_value', label: 'Max', type: 'number' },
          { key: 'uom_code', label: 'Birim' },
          { key: 'zorunlu', label: 'Zorunlu', type: 'checkbox' },
        ],
        detailKey: 'kriterler',
        detailSlots: 5,
      },
      {
        id: 'kk-stok-planlari',
        techId: 'QLT-ITMP-SCR-001',
        businessNameEn: 'ItemControlPlanLinkScreen',
        title: 'KK Stok Plan Bağları',
        endpoint: '/kk-stok-planlari',
        crud: true,
        codeField: 'id',
        nameField: 'item_code',
        filters: [
          { key: 'item_code', label: 'Stok' },
          { key: 'direction', label: 'Yön' },
        ],
        columns: [
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'direction', label: 'Yön' },
          { key: 'plan_code', label: 'Plan', mono: true },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code', required: true },
          { key: 'plan_id', label: 'Plan', type: 'lookup', lookup: 'kk-kontrol-planlari', valueKey: 'id', labelKey: 'plan_name', codeKey: 'plan_code', required: true },
          { key: 'direction', label: 'Yön', type: 'select', options: ['GKK', 'CKK'], required: true },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'kk-ret-nedenleri',
        techId: 'QLT-REJ-SCR-001',
        businessNameEn: 'RejectionReasonScreen',
        title: 'KK Ret Nedenleri',
        endpoint: '/kk-ret-nedenleri',
        crud: true,
        codeField: 'neden_code',
        nameField: 'neden_name',
        filters: [
          { key: 'neden_code', label: 'Kod' },
          { key: 'neden_name', label: 'Ad' },
        ],
        columns: [
          { key: 'neden_code', label: 'Kod', mono: true },
          { key: 'neden_name', label: 'Ad' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'neden_code', label: 'Neden kodu', code: true, required: true },
          { key: 'neden_name', label: 'Neden adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
    ],
  },
  {
    id: 'onay',
    title: 'Onay Yönetimi',
    sections: [
      {
        id: 'action',
        title: 'Onay',
        screenIds: ['onaylarim', 'onay-izleme', 'onay-yetki-devri'],
      },
      {
        id: 'tanimlar',
        title: 'Sabit Tanımlar',
        screenIds: [
          'onay-role-tanim',
          'onay-kural-tanim',
          'onay-rota-tanim',
          'onay-message-template',
          'onay-status-tanim',
          'onay-modul-kullanimlari',
        ],
      },
    ],
    screens: [
      {
        id: 'onay-modul-kullanimlari',
        techId: 'SYS-APR-SCR-USG',
        businessNameEn: 'ApprovalModuleUsageScreen',
        title: 'Onay Modül Kullanımları',
        endpoint: '/onay-module-kullanimlari',
        crud: true,
        numeratorSeri: 'ONAY_KULLANIM',
        codeField: 'kullanim_code',
        nameField: 'kullanim_name',
        columns: [
          { key: 'kullanim_code', label: 'Kod', mono: true },
          { key: 'kullanim_name', label: 'Ad' },
          { key: 'module_code', label: 'Modül' },
          { key: 'screen_id', label: 'Ekran' },
          { key: 'route_code', label: 'Rota' },
          { key: 'company_name', label: 'Firma' },
          { key: 'min_amount', label: 'Min tutar' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kullanim_code', label: 'Kullanım kodu', code: true },
          { key: 'kullanim_name', label: 'Ad', name: true, required: true },
          { key: 'module_code', label: 'Modül kodu', required: true },
          { key: 'screen_id', label: 'Ekran id', required: true },
          { key: 'route_id', label: 'Onay rotası', type: 'lookup', lookup: 'onay-rota-tanim', valueKey: 'id', labelKey: 'route_name', codeKey: 'route_code', required: true },
          { key: 'company_id', label: 'Firma (opsiyonel)', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'template_id', label: 'Mesaj şablonu', type: 'lookup', lookup: 'onay-message-template', valueKey: 'id', labelKey: 'template_name', codeKey: 'template_code' },
          { key: 'min_amount', label: 'Min tutar', type: 'number' },
          { key: 'otomatik_gonder', label: 'Otomatik gönder', type: 'checkbox' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
        defaults: { is_active: true, min_amount: 0 },
      },
      {
        id: 'onaylarim',
        techId: 'SYS-APR-SCR-001',
        businessNameEn: 'MyApprovalsScreen',
        title: 'Onaylarım',
        endpoint: '/onay-kayitlari?benim=true',
        crud: false,
        readOnly: false,
        codeField: 'onay_no',
        nameField: 'document_ozet',
        approveAction: { label: 'Onayla', path: '/onay-kayitlari/{id}/onayla' },
        banner: 'Size (rolünüz / yetki devri) atanmış bekleyen onaylar. İncele → Onayla veya Reddet.',
        filters: [
          { key: 'onay_no', label: 'Onay no' },
          { key: 'document_no', label: 'Belge no' },
          { key: 'module_code', label: 'Modül' },
        ],
        columns: [
          { key: 'onay_no', label: 'Onay', mono: true },
          { key: 'module_code', label: 'Modül' },
          { key: 'document_no', label: 'Belge', mono: true },
          { key: 'document_ozet', label: 'Özet' },
          { key: 'amount', label: 'Tutar' },
          { key: 'status_name', label: 'Durum' },
          { key: 'active_step_no', label: 'Adım' },
          { key: 'baslama_date', label: 'Başlama' },
        ],
        masterFields: [
          { key: 'onay_no', label: 'Onay no', code: true },
          { key: 'module_code', label: 'Modül' },
          { key: 'screen_id', label: 'Ekran' },
          { key: 'document_no', label: 'Belge no' },
          { key: 'document_ozet', label: 'Özet', name: true },
          { key: 'amount', label: 'Tutar', type: 'number' },
          { key: 'currency_code', label: 'PB' },
          { key: 'status_code', label: 'Durum' },
          { key: 'route_name', label: 'Rota' },
          { key: 'baslatan_adi', label: 'Başlatan' },
          { key: 'description', label: 'Açıklama / not' },
        ],
        detailFields: [
          { key: 'line_no', label: 'Sıra', type: 'number' },
          { key: 'step_name', label: 'Adım' },
          { key: 'role_name', label: 'Rol' },
          { key: 'status_code', label: 'Durum' },
          { key: 'onaylayan_adi', label: 'Onaylayan' },
          { key: 'notlar', label: 'Not' },
        ],
        detailKey: 'adimlar',
      },
      {
        id: 'onay-izleme',
        techId: 'SYS-APR-SCR-002',
        businessNameEn: 'ApprovalMonitoringScreen',
        title: 'Onay İzleme',
        endpoint: '/onay-kayitlari',
        crud: false,
        readOnly: true,
        codeField: 'onay_no',
        nameField: 'document_ozet',
        banner: 'Tüm onay kayıtları — status, belge ve rota izi.',
        filters: [
          { key: 'onay_no', label: 'Onay no' },
          { key: 'document_no', label: 'Belge no' },
          { key: 'module_code', label: 'Modül' },
          { key: 'status_code', label: 'Durum' },
          { key: 'screen_id', label: 'Ekran' },
        ],
        columns: [
          { key: 'onay_no', label: 'Onay', mono: true },
          { key: 'module_code', label: 'Modül' },
          { key: 'screen_id', label: 'Ekran', mono: true },
          { key: 'document_no', label: 'Belge', mono: true },
          { key: 'amount', label: 'Tutar' },
          { key: 'status_name', label: 'Durum' },
          { key: 'route_name', label: 'Rota' },
          { key: 'baslatan_adi', label: 'Başlatan' },
          { key: 'baslama_date', label: 'Başlama' },
          { key: 'closed_at', label: 'Kapanış' },
        ],
        masterFields: [
          { key: 'onay_no', label: 'Onay no', code: true },
          { key: 'module_code', label: 'Modül' },
          { key: 'screen_id', label: 'Ekran' },
          { key: 'document_no', label: 'Belge no' },
          { key: 'document_ozet', label: 'Özet', name: true },
          { key: 'amount', label: 'Tutar', type: 'number' },
          { key: 'status_code', label: 'Durum' },
          { key: 'route_name', label: 'Rota' },
          { key: 'kullanim_name', label: 'Kullanım' },
          { key: 'baslatan_adi', label: 'Başlatan' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'line_no', label: 'Sıra', type: 'number' },
          { key: 'step_name', label: 'Adım' },
          { key: 'role_name', label: 'Rol' },
          { key: 'status_code', label: 'Durum' },
          { key: 'onaylayan_adi', label: 'Onaylayan' },
          { key: 'action_date', label: 'İşlem' },
          { key: 'notlar', label: 'Not' },
        ],
        detailKey: 'adimlar',
      },
      {
        id: 'onay-yetki-devri',
        techId: 'SYS-APR-SCR-003',
        businessNameEn: 'ApprovalDelegationScreen',
        title: 'Onay Yetki Devri',
        endpoint: '/onay-yetki-devirleri',
        crud: true,
        numeratorSeri: 'ONAY_DEVIR',
        codeField: 'devir_code',
        nameField: 'description',
        filters: [
          { key: 'devir_code', label: 'Devir kodu' },
          { key: 'veren_kodu', label: 'Veren' },
          { key: 'alan_kodu', label: 'Alan' },
        ],
        columns: [
          { key: 'devir_code', label: 'Kod', mono: true },
          { key: 'veren_adi', label: 'Veren' },
          { key: 'alan_adi', label: 'Alan' },
          { key: 'role_name', label: 'Rol' },
          { key: 'start_date', label: 'Başlangıç' },
          { key: 'end_date', label: 'Bitiş' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'devir_code', label: 'Devir kodu', code: true },
          { key: 'veren_kisi_id', label: 'Yetkiyi veren', type: 'lookup', lookup: 'users', valueKey: 'id', labelKey: 'first_name', codeKey: 'user_code', required: true },
          { key: 'field_kisi_id', label: 'Yetkiyi alan', type: 'lookup', lookup: 'users', valueKey: 'id', labelKey: 'first_name', codeKey: 'user_code', required: true },
          { key: 'role_id', label: 'Rol (boş = tüm roller)', type: 'lookup', lookup: 'onay-rolleri', valueKey: 'id', labelKey: 'role_name', codeKey: 'role_code' },
          { key: 'start_date', label: 'Başlangıç', type: 'date', required: true },
          { key: 'end_date', label: 'Bitiş', type: 'date' },
        ],
        detailFields: [
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'onay-role-tanim',
        techId: 'SYS-APR-SCR-004',
        businessNameEn: 'ApprovalRoleScreen',
        title: 'Onay Rolü',
        endpoint: '/onay-rolleri',
        crud: true,
        numeratorSeri: 'ONAY_ROL',
        codeField: 'role_code',
        nameField: 'role_name',
        banner: 'Bir kişiye, firma ve iş yeri kapsamında onay rolü verilir. Rotadaki adımlar bu role adına bakar.',
        filters: [
          { key: 'role_name', label: 'Rol adı' },
          { key: 'kisi_adi', label: 'Kişi' },
          { key: 'company_code', label: 'Firma' },
        ],
        columns: [
          { key: 'role_name', label: 'Rol adı' },
          { key: 'kisi_adi', label: 'Kişi' },
          { key: 'user_code', label: 'Kullanıcı', mono: true },
          { key: 'company_name', label: 'Firma' },
          { key: 'plant_name', label: 'İş yeri' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kisi_id', label: 'Kişi', type: 'lookup', lookup: 'users', valueKey: 'id', labelKey: 'first_name', codeKey: 'user_code', required: true },
          { key: 'role_name', label: 'Onay role adı', name: true, required: true },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', required: true },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', required: true },
        ],
        detailFields: [
          { key: 'role_code', label: 'Kayıt kodu', code: true },
          { key: 'description', label: 'Not' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
        defaults: { is_active: true },
      },
      {
        id: 'onay-kural-tanim',
        techId: 'SYS-APR-SCR-005',
        businessNameEn: 'ApprovalRuleScreen',
        title: 'Onay Kuralı',
        endpoint: '/onay-kurallari',
        crud: true,
        numeratorSeri: 'ONAY_KURAL',
        codeField: 'rule_code',
        nameField: 'rule_name',
        banner: 'Hangi ekranda onay devreye girer? Koşullar VE mantığıyla çalışır — işaretlediklerinizin / doldurduklarınızın tümü sağlanmalı.',
        filters: [
          { key: 'rule_name', label: 'Kural adı' },
          { key: 'screen_id', label: 'Ekran' },
          { key: 'company_code', label: 'Firma' },
        ],
        columns: [
          { key: 'line_no', label: 'Sıra' },
          { key: 'rule_code', label: 'Kod', mono: true },
          { key: 'rule_name', label: 'Ad' },
          { key: 'screen_id', label: 'Ekran', mono: true },
          { key: 'company_name', label: 'Firma' },
          { key: 'plant_name', label: 'İş yeri' },
          { key: 'template_name', label: 'Mesaj' },
          { key: 'otomatik_onay', label: 'Oto. onay' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'line_no', label: 'Öncelik sırası', type: 'number', required: true },
          { key: 'rule_code', label: 'Kural kodu', code: true },
          { key: 'rule_name', label: 'Kural adı', name: true, required: true },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          {
            key: 'screen_id',
            label: 'Ekran (onaylanacak belge)',
            type: 'lookup',
            lookup: 'onay-ekranlari',
            valueKey: 'screen_id',
            labelKey: 'screen_name',
            codeKey: 'screen_id',
            required: true,
          },
          {
            key: 'template_id',
            label: 'Mesaj şablonu',
            type: 'lookup',
            lookup: 'onay-message-sablonlari',
            valueKey: 'id',
            labelKey: 'template_name',
            codeKey: 'template_code',
          },
          { key: 'term_direction', label: 'Belge yönü', type: 'select', options: ['Hepsi', 'Alis', 'Satis'] },
          { key: 'term_min_amount', label: 'Min. amount', type: 'number' },
          { key: 'term_max_amount', label: 'Max. amount', type: 'number' },
          { key: 'condition_statuses', label: 'Belge durumları (virgülle; boş = tümü)' },
          { key: 'otomatik_onay', label: 'Koşul sağlanırsa otomatik onayla', type: 'checkbox' },
          { key: 'onaylaninca_is_active', label: 'Onaylanınca belgeyi is_active et', type: 'checkbox' },
          { key: 'is_active', label: 'Kural is_active', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [
          {
            key: 'movement_code_id',
            label: 'Hareket kodu',
            type: 'lookup',
            lookup: 'hareket-kodlari',
            valueKey: 'id',
            labelKey: 'movement_name',
            codeKey: 'movement_code',
            required: true,
          },
        ],
        detailKey: 'hareketler',
        defaults: {
          line_no: 10,
          term_direction: 'Hepsi',
          otomatik_onay: false,
          onaylaninca_is_active: true,
          is_active: true,
          hareketler: [],
        },
      },
      {
        id: 'onay-rota-tanim',
        techId: 'SYS-APR-SCR-006',
        businessNameEn: 'ApprovalRouteScreen',
        title: 'Onay Rotası',
        endpoint: '/onay-rotalari',
        crud: true,
        numeratorSeri: 'ONAY_ROTA',
        codeField: 'route_code',
        nameField: 'route_name',
        banner: 'Kural + ekran bağlandıktan sonra onayın kimden kime gideceği burada adım adım kurulur.',
        filters: [
          { key: 'route_name', label: 'Rota adı' },
          { key: 'screen_id', label: 'Ekran' },
          { key: 'rule_name', label: 'Kural' },
        ],
        columns: [
          { key: 'route_code', label: 'Kod', mono: true },
          { key: 'route_name', label: 'Ad' },
          { key: 'versiyon', label: 'Sürüm' },
          { key: 'screen_id', label: 'Ekran', mono: true },
          { key: 'rule_name', label: 'Kural' },
          { key: 'company_name', label: 'Firma' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'route_code', label: 'Rota kodu', code: true },
          { key: 'route_name', label: 'Rota adı', name: true, required: true },
          { key: 'versiyon', label: 'Sürüm', type: 'number' },
          {
            key: 'screen_id',
            label: 'Ekran',
            type: 'lookup',
            lookup: 'onay-ekranlari',
            valueKey: 'screen_id',
            labelKey: 'screen_name',
            codeKey: 'screen_id',
          },
          {
            key: 'rule_id',
            label: 'Bağlı kural',
            type: 'lookup',
            lookup: 'onay-kurallari',
            valueKey: 'id',
            labelKey: 'rule_name',
            codeKey: 'rule_code',
          },
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code' },
          { key: 'plant_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code' },
          {
            key: 'ilk_message_template_id',
            label: 'İlk onay mesajı',
            type: 'lookup',
            lookup: 'onay-message-sablonlari',
            valueKey: 'id',
            labelKey: 'template_name',
            codeKey: 'template_code',
          },
          {
            key: 'red_message_template_id',
            label: 'Red mesajı',
            type: 'lookup',
            lookup: 'onay-message-sablonlari',
            valueKey: 'id',
            labelKey: 'template_name',
            codeKey: 'template_code',
          },
          {
            key: 'ekstra_message_template_id',
            label: 'Ek message',
            type: 'lookup',
            lookup: 'onay-message-sablonlari',
            valueKey: 'id',
            labelKey: 'template_name',
            codeKey: 'template_code',
          },
          { key: 'iptal_role_name', label: 'İptali onaylayacak role adı' },
          { key: 'ekli_dosya_mail', label: 'Ekleri mail ile gönder', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [
          { key: 'line_no', label: 'Adım no', type: 'number', required: true },
          { key: 'step_name', label: 'Adım açıklaması' },
          { key: 'role_name', label: 'Onay role adı', required: true },
          { key: 'mail_gonder', label: 'Mail gönder', type: 'checkbox' },
          { key: 'sms_gonder', label: 'SMS gönder', type: 'checkbox' },
          { key: 'value_degistirebilir', label: 'Değer değiştirebilir', type: 'checkbox' },
          { key: 'min_amount', label: 'Bu adım için min. amount', type: 'number' },
          { key: 'geri_gonder_line', label: 'Düzeltmede dönülecek adım no', type: 'number' },
          { key: 'zorunlu', label: 'Zorunlu', type: 'checkbox' },
          { key: 'description', label: 'Not' },
        ],
        detailKey: 'adimlar',
        defaults: { versiyon: 1, is_active: true, ekli_dosya_mail: false, adimlar: [] },
      },
      {
        id: 'onay-message-template',
        techId: 'SYS-APR-SCR-007',
        businessNameEn: 'ApprovalMessageTemplateScreen',
        title: 'Onay Mesaj Şablonu',
        endpoint: '/onay-message-sablonlari',
        crud: true,
        numeratorSeri: 'ONAY_SABLON',
        codeField: 'template_code',
        nameField: 'template_name',
        filters: [
          { key: 'template_code', label: 'Kod' },
          { key: 'olay', label: 'Olay' },
        ],
        columns: [
          { key: 'template_code', label: 'Kod', mono: true },
          { key: 'template_name', label: 'Ad' },
          { key: 'olay', label: 'Olay' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'template_code', label: 'Şablon kodu', code: true },
          { key: 'template_name', label: 'Şablon adı', name: true, required: true },
          { key: 'olay', label: 'Olay', type: 'select', options: ['Bekleme', 'Onay', 'Red', 'Devret', 'Iptal', 'Tamam'], required: true },
          { key: 'konu', label: 'Konu' },
        ],
        detailFields: [
          { key: 'govde', label: 'Gövde ({{document_no}}, {{module}}, {{amount}}, {{onayci}}, {{gerekce}})' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'onay-status-tanim',
        techId: 'SYS-APR-SCR-008',
        businessNameEn: 'ApprovalStatusScreen',
        title: 'Onay Durum Tanımı',
        endpoint: '/onay-durumlari',
        crud: true,
        codeField: 'status_code',
        nameField: 'status_name',
        filters: [
          { key: 'status_code', label: 'Kod' },
          { key: 'status_name', label: 'Ad' },
        ],
        columns: [
          { key: 'status_code', label: 'Kod', mono: true },
          { key: 'status_name', label: 'Ad' },
          { key: 'line_no', label: 'Sıra' },
          { key: 'nihai', label: 'Nihai' },
          { key: 'olumlu', label: 'Olumlu' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'status_code', label: 'Durum kodu', code: true, required: true },
          { key: 'status_name', label: 'Durum adı', name: true, required: true },
          { key: 'line_no', label: 'Sıra', type: 'number' },
        ],
        detailFields: [
          { key: 'nihai', label: 'Nihai status', type: 'checkbox' },
          { key: 'olumlu', label: 'Olumlu (onay)', type: 'checkbox' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
    ],
  },
  {
    id: 'finans',
    title: 'Finans',
    sections: [
      { id: 'tanimlar', title: 'Tanımlar', screenIds: ['hesap-plani', 'hesap-belirleme-kurallari', 'finans-vergi-kodlari', 'finans-ulke-paketleri', 'mali-yillar', 'muhasebe-donemleri', 'fiyat-listeleri'] },
      { id: 'belgeler', title: 'Belgeler', screenIds: ['muhasebe-belgeleri', 'finans-nakit-hareketleri', 'fatura-kontrolleri'] },
      { id: 'nakit', title: 'Banka / Kasa', screenIds: ['finans-banka-hesaplari', 'finans-kasa-hesaplari'] },
      { id: 'raporlar', title: 'Raporlar', screenIds: ['mizan', 'finans-yevmiye', 'finans-bilanco', 'finans-gelir-tablosu', 'kokpit'] },
    ],
    screens: [
      {
        id: 'hesap-plani',
        techId: 'FIN-COA-SCR-001',
        businessNameEn: 'ChartOfAccountsScreen',
        title: 'Hesap Planı',
        endpoint: '/muhasebe-hesaplari',
        crud: true,
        codeField: 'account_code',
        nameField: 'account_name',
        numeratorSeri: null,
        helpText: 'Ana/Üst hesaplar sınıflandırma içindir; fiş yalnızca Doğrudan (yaprak) hesaplara yazılır. Ülke paketi şirketin muhasebe ülkesine göre filtrelenir.',
        filters: [
          { key: 'account_code', label: 'Hesap kodu' },
          { key: 'account_name', label: 'Hesap adı' },
          { key: 'account_type', label: 'Tip' },
          { key: 'country_code', label: 'Ülke', queryParam: true },
        ],
        columns: [
          { key: 'account_code', label: 'Kod', mono: true },
          { key: 'account_name', label: 'Ad' },
          { key: 'account_type', label: 'Tip' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'account_class', label: 'Sınıf' },
          { key: 'parent_account_code', label: 'Üst', mono: true },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'account_code', label: 'Hesap kodu', code: true, editableOnNew: true, required: true },
          { key: 'account_name', label: 'Hesap adı', name: true, required: true },
          { key: 'account_type', label: 'Hesap tipi', type: 'select', options: ['Ana', 'Ust', 'Dogrudan'], required: true },
          { key: 'country_code', label: 'Ülke', type: 'select', options: ['TR', 'AZ', 'DE', 'NL'], required: true },
          { key: 'chart_of_accounts_code', label: 'Hesap planı' },
          { key: 'account_class', label: 'Sınıf (1–6)' },
          { key: 'normal_balance', label: 'Normal bakiye', type: 'select', options: ['Borc', 'Alacak'] },
        ],
        detailFields: [
          { key: 'parent_account_code', label: 'Üst hesap kodu' },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'is_control_account', label: 'Kontrol hesabı', type: 'checkbox' },
          { key: 'reconciliation_type', label: 'Mutabakat', type: 'select', options: ['', 'Cari', 'Banka', 'Kasa', 'Stok', 'SabitKiymet'] },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'marked_for_deletion', label: 'Silinecek', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
        defaults: { country_code: 'TR', chart_of_accounts_code: 'TDHP', account_type: 'Dogrudan', normal_balance: 'Borc', is_active: true },
      },
      {
        id: 'muhasebe-belgeleri',
        techId: 'FIN-JE-SCR-001',
        businessNameEn: 'AccountingDocumentScreen',
        title: 'Muhasebe Belgeleri',
        endpoint: '/muhasebe-belgeleri',
        crud: true,
        codeField: 'document_no',
        nameField: 'description',
        numeratorSeri: 'MUHASEBE_BELGE',
        approveAction: { label: 'Kesinleştir', path: '/muhasebe-belgeleri/{id}/kesinlestir' },
        convertAction: { label: 'Ters Kayıt', path: '/muhasebe-belgeleri/{id}/ters-kayit' },
        helpText: 'Toplam borç = toplam credit olmalıdır. Kesinleşmiş fiş değiştirilemez; hata için ters kayıt kullanın.',
        filters: [
          { key: 'document_no', label: 'Belge no' },
          { key: 'status', label: 'Durum' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'voucher_type', label: 'Fiş tipi' },
        ],
        columns: [
          { key: 'document_no', label: 'Belge', mono: true },
          { key: 'journal_number', label: 'Yevmiye' },
          { key: 'document_date', label: 'Tarih' },
          { key: 'voucher_type', label: 'Tip' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'status', label: 'Durum' },
          { key: 'toplam_borc', label: 'Borç' },
          { key: 'toplam_alacak', label: 'Alacak' },
        ],
        masterFields: [
          { key: 'document_no', label: 'Belge no', code: true },
          { key: 'document_date', label: 'Belge tarihi', type: 'date', required: true },
          { key: 'voucher_type', label: 'Fiş tipi', type: 'select', options: ['Mahsup', 'Tahsilat', 'Tediye', 'Acilis', 'Kapanis', 'Ters'], required: true },
          { key: 'country_code', label: 'Muhasebe ülkesi', type: 'select', options: ['TR', 'AZ', 'DE', 'NL'], required: true },
          { key: 'transaction_country_code', label: 'İşlem ülkesi', type: 'select', options: ['TR', 'AZ', 'DE', 'NL', ''] },
          { key: 'tax_country_code', label: 'Vergi ülkesi', type: 'select', options: ['TR', 'AZ', 'DE', 'NL', ''] },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'exchange_rate', label: 'Kur', type: 'number' },
          { key: 'description', label: 'Açıklama', name: true },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Iptal'], readOnly: true },
          { key: 'journal_number', label: 'Yevmiye no', readOnly: true },
        ],
        detailFields: [
          { key: 'account_id', label: 'Hesap', type: 'lookup', lookup: 'muhasebe-hesaplari', valueKey: 'id', labelKey: 'account_name', codeKey: 'account_code', required: true },
          { key: 'debit', label: 'Borç', type: 'number', help: 'Hesabın sol tarafı (varlık/gider artışı genelde borç).' },
          { key: 'credit', label: 'Alacak', type: 'number', help: 'Hesabın sağ tarafı (source/gelir artışı genelde credit).' },
          { key: 'tax_code', label: 'Vergi kodu' },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'description', label: 'Kalem açıklama' },
        ],
        detailKey: 'kalemler',
        detailSlots: 8,
        defaults: { voucher_type: 'Mahsup', country_code: 'TR', currency_code: 'TRY', exchange_rate: 1, status: 'Taslak' },
      },
      {
        id: 'muhasebe-donemleri',
        techId: 'FIN-PER-SCR-001',
        businessNameEn: 'AccountingPeriodScreen',
        title: 'Muhasebe Dönemleri',
        endpoint: '/muhasebe-donemleri',
        crud: false,
        codeField: 'period_no',
        nameField: 'status',
        approveAction: { label: 'Dönemi Kapat', path: '/muhasebe-donemleri/{id}/kapat' },
        convertAction: { label: 'Yeniden Aç', path: '/muhasebe-donemleri/{id}/yeniden-ac' },
        helpText: 'Kapalı döneme kesin fiş yazılamaz. Yeniden açma yetki ve audit ile izlenir.',
        filters: [
          { key: 'mali_yil', label: 'Mali yıl' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'mali_yil', label: 'Yıl' },
          { key: 'period_no', label: 'Dönem' },
          { key: 'start_date', label: 'Başlangıç' },
          { key: 'end_date', label: 'Bitiş' },
          { key: 'status', label: 'Durum' },
          { key: 'closed_by', label: 'Kapatan' },
        ],
        masterFields: [
          { key: 'mali_yil', label: 'Mali yıl', readOnly: true },
          { key: 'period_no', label: 'Dönem no', readOnly: true },
          { key: 'start_date', label: 'Başlangıç', type: 'date', readOnly: true },
          { key: 'end_date', label: 'Bitiş', type: 'date', readOnly: true },
          { key: 'status', label: 'Durum', readOnly: true },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'finans-vergi-kodlari',
        techId: 'FIN-TAX-SCR-001',
        businessNameEn: 'TaxCodeScreen',
        title: 'Vergi Kodları',
        endpoint: '/finans-vergi-kodlari',
        crud: true,
        codeField: 'tax_code',
        nameField: 'tax_name',
        filters: [
          { key: 'country_code', label: 'Ülke', queryParam: true },
          { key: 'tax_code', label: 'Kod' },
        ],
        columns: [
          { key: 'country_code', label: 'Ülke' },
          { key: 'tax_code', label: 'Kod', mono: true },
          { key: 'tax_name', label: 'Ad' },
          { key: 'tax_type', label: 'Tür' },
          { key: 'rate', label: 'Oran %' },
          { key: 'output_tax_account_code', label: 'Hesaplanan' },
          { key: 'input_tax_account_code', label: 'İndirilecek' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'tax_code', label: 'Vergi kodu', code: true, required: true, editableOnNew: true },
          { key: 'tax_name', label: 'Vergi adı', name: true, required: true },
          { key: 'country_code', label: 'Ülke', required: true },
          { key: 'tax_type', label: 'Tür', type: 'select', options: ['KDV', 'OTV', 'Stopaj', 'Diger'] },
          { key: 'output_tax_account_code', label: 'Hesaplanan KDV hesabı' },
          { key: 'input_tax_account_code', label: 'İndirilecek KDV hesabı' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: 'oranlar',
        detailSlots: 4,
        formTabs: [
          {
            id: 'oranlar',
            label: 'Oranlar',
            kind: 'grid',
            key: 'oranlar',
            slots: 4,
            fields: [
              { key: 'rate', label: 'Oran %', type: 'number', required: true },
              { key: 'valid_from', label: 'Geçerlilik başı', type: 'date', required: true },
              { key: 'valid_to', label: 'Geçerlilik sonu', type: 'date' },
              { key: 'source_note', label: 'Kaynak' },
            ],
          },
        ],
        defaults: { country_code: 'TR', tax_type: 'KDV', is_active: true },
      },
      {
        id: 'finans-ulke-paketleri',
        techId: 'FIN-CPK-SCR-001',
        businessNameEn: 'CountryPackScreen',
        title: 'Finans Ülke Paketleri',
        endpoint: '/finans-country/paketler',
        crud: true,
        codeField: 'country_code',
        nameField: 'country_name',
        columns: [
          { key: 'country_code', label: 'Ülke', mono: true },
          { key: 'country_name', label: 'Ad' },
          { key: 'local_currency', label: 'PB' },
          { key: 'chart_of_accounts_code', label: 'Hesap planı' },
          { key: 'reporting_framework', label: 'Raporlama' },
          { key: 'retention_years', label: 'Saklama (yıl)' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'country_code', label: 'Ülke kodu', code: true, required: true, editableOnNew: true },
          { key: 'country_name', label: 'Ülke adı', name: true, required: true },
          { key: 'local_currency', label: 'Yerel para birimi' },
          { key: 'chart_of_accounts_code', label: 'Hesap planı kodu' },
          { key: 'reporting_framework', label: 'Raporlama çerçevesi' },
          { key: 'retention_years', label: 'Saklama süresi (yıl)', type: 'number' },
          { key: 'e_document_note', label: 'e-Belge notu' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        defaults: { is_active: true, retention_years: 10 },
      },
      {
        id: 'mali-yillar',
        techId: 'FIN-FY-SCR-001',
        businessNameEn: 'FiscalYearScreen',
        title: 'Mali Yıllar',
        endpoint: '/muhasebe-donemleri/mali-yillar',
        crud: true,
        codeField: 'year',
        nameField: 'year',
        columns: [
          { key: 'year', label: 'Yıl' },
          { key: 'start_date', label: 'Başlangıç' },
          { key: 'end_date', label: 'Bitiş' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'year', label: 'Yıl', type: 'number', required: true },
          { key: 'start_date', label: 'Başlangıç', type: 'date' },
          { key: 'end_date', label: 'Bitiş', type: 'date' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Kapali'] },
        ],
        defaults: { status: 'Acik' },
      },
      {
        id: 'finans-banka-hesaplari',
        techId: 'FIN-BNK-SCR-001',
        businessNameEn: 'BankAccountScreen',
        title: 'Banka Hesapları',
        endpoint: '/finans-nakit/banka-hesaplari',
        crud: true,
        codeField: 'account_code',
        nameField: 'account_name',
        numeratorSeri: 'FIN_BANKA_HESAP',
        filters: [
          { key: 'account_code', label: 'Kod' },
          { key: 'account_name', label: 'Ad' },
        ],
        columns: [
          { key: 'account_code', label: 'Kod', mono: true },
          { key: 'account_name', label: 'Ad' },
          { key: 'iban', label: 'IBAN', mono: true },
          { key: 'currency_code', label: 'PB' },
          { key: 'bank_name', label: 'Banka' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'account_code', label: 'Hesap kodu', code: true },
          { key: 'account_name', label: 'Hesap adı', name: true, required: true },
          { key: 'bank_id', label: 'Banka', type: 'lookup', lookup: 'banks', valueKey: 'id', labelKey: 'bank_name', codeKey: 'bank_code' },
          { key: 'iban', label: 'IBAN' },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', required: true },
          { key: 'gl_account_id', label: 'Muhasebe hesabı', type: 'lookup', lookup: 'muhasebe-hesaplari', valueKey: 'id', labelKey: 'account_name', codeKey: 'account_code' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
        defaults: { currency_code: 'TRY', is_active: true },
      },
      {
        id: 'finans-kasa-hesaplari',
        techId: 'FIN-CSH-SCR-001',
        businessNameEn: 'CashAccountScreen',
        title: 'Kasa Hesapları',
        endpoint: '/finans-nakit/kasa-hesaplari',
        crud: true,
        codeField: 'cash_code',
        nameField: 'cash_name',
        numeratorSeri: 'FIN_KASA',
        filters: [
          { key: 'cash_code', label: 'Kod' },
          { key: 'cash_name', label: 'Ad' },
        ],
        columns: [
          { key: 'cash_code', label: 'Kod', mono: true },
          { key: 'cash_name', label: 'Ad' },
          { key: 'currency_code', label: 'PB' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'cash_code', label: 'Kasa kodu', code: true },
          { key: 'cash_name', label: 'Kasa adı', name: true, required: true },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', required: true },
          { key: 'gl_account_id', label: 'Muhasebe hesabı', type: 'lookup', lookup: 'muhasebe-hesaplari', valueKey: 'id', labelKey: 'account_name', codeKey: 'account_code' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
        defaults: { currency_code: 'TRY', is_active: true },
      },
      {
        id: 'finans-nakit-hareketleri',
        techId: 'FIN-CSHMV-SCR-001',
        businessNameEn: 'CashMovementScreen',
        title: 'Nakit Hareketleri',
        endpoint: '/finans-nakit/hareketler',
        crud: true,
        codeField: 'movement_no',
        nameField: 'description',
        numeratorSeri: 'FIN_NAKIT_HAREKET',
        filters: [
          { key: 'movement_no', label: 'No' },
          { key: 'direction', label: 'Yön' },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'movement_no', label: 'No', mono: true },
          { key: 'movement_date', label: 'Tarih' },
          { key: 'direction', label: 'Yön' },
          { key: 'amount', label: 'Tutar' },
          { key: 'currency_code', label: 'PB' },
          { key: 'partner_name', label: 'Cari' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'movement_no', label: 'Hareket no', code: true },
          { key: 'movement_date', label: 'Tarih', type: 'date', required: true },
          { key: 'direction', label: 'Yön', type: 'select', options: ['Giris', 'Cikis', 'Virman'], required: true },
          { key: 'amount', label: 'Tutar', type: 'number', required: true },
          { key: 'currency_code', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'bank_account_id', label: 'Banka hesabı', type: 'number' },
          { key: 'cash_account_id', label: 'Kasa', type: 'number' },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'muhasebelestir', label: 'Muhasebeleştir', type: 'checkbox' },
          { key: 'karsi_hesap_kodu', label: 'Karşı hesap kodu' },
          { key: 'description', label: 'Açıklama', name: true },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
        defaults: { direction: 'Giris', currency_code: 'TRY', muhasebelestir: true },
      },
      {
        id: 'mizan',
        techId: 'FIN-TB-RPT-001',
        businessNameEn: 'TrialBalanceReport',
        title: 'Mizan',
        endpoint: '/mizan',
        crud: false,
        codeField: 'account_code',
        nameField: 'account_name',
        filters: [
          { key: 'account_code', label: 'Hesap kodu' },
          { key: 'account_name', label: 'Hesap adı' },
          { key: 'baslangic', label: 'Başlangıç', queryParam: true },
          { key: 'bitis', label: 'Bitiş', queryParam: true },
        ],
        columns: [
          { key: 'account_code', label: 'Hesap', mono: true },
          { key: 'account_name', label: 'Ad' },
          { key: 'debit', label: 'Borç' },
          { key: 'credit', label: 'Alacak' },
          { key: 'bakiye', label: 'Bakiye' },
        ],
      },
      {
        id: 'finans-yevmiye',
        techId: 'FIN-JL-RPT-001',
        businessNameEn: 'JournalReport',
        title: 'Yevmiye Defteri',
        endpoint: '/finans-raporlar/yevmiye',
        crud: false,
        codeField: 'document_no',
        nameField: 'account_code',
        filters: [
          { key: 'baslangic', label: 'Başlangıç', queryParam: true },
          { key: 'bitis', label: 'Bitiş', queryParam: true },
        ],
        columns: [
          { key: 'document_date', label: 'Tarih' },
          { key: 'journal_number', label: 'Yevmiye' },
          { key: 'document_no', label: 'Belge', mono: true },
          { key: 'account_code', label: 'Hesap', mono: true },
          { key: 'account_name', label: 'Ad' },
          { key: 'debit', label: 'Borç' },
          { key: 'credit', label: 'Alacak' },
        ],
      },
      {
        id: 'finans-bilanco',
        techId: 'FIN-BS-RPT-001',
        businessNameEn: 'BalanceSheetReport',
        title: 'Bilanço (Özet)',
        endpoint: '/finans-raporlar/bilanco',
        crud: false,
        codeField: 'sinif',
        nameField: 'first_name',
        listResponseKey: 'satirlar',
        filters: [
          { key: 'bitis', label: 'Tarih', queryParam: true },
          { key: 'country_code', label: 'Ülke', queryParam: true },
        ],
        columns: [
          { key: 'sinif', label: 'Sınıf' },
          { key: 'first_name', label: 'Kalem' },
          { key: 'amount', label: 'Tutar' },
        ],
      },
      {
        id: 'finans-gelir-tablosu',
        techId: 'FIN-PL-RPT-001',
        businessNameEn: 'IncomeStatementReport',
        title: 'Gelir Tablosu',
        endpoint: '/finans-raporlar/gelir-tablosu',
        crud: false,
        codeField: 'account_code',
        nameField: 'account_name',
        listResponseKey: 'satirlar',
        filters: [
          { key: 'baslangic', label: 'Başlangıç', queryParam: true },
          { key: 'bitis', label: 'Bitiş', queryParam: true },
          { key: 'country_code', label: 'Ülke', queryParam: true },
        ],
        columns: [
          { key: 'account_code', label: 'Hesap', mono: true },
          { key: 'account_name', label: 'Ad' },
          { key: 'debit', label: 'Borç' },
          { key: 'credit', label: 'Alacak' },
          { key: 'net', label: 'Net' },
        ],
      },
      {
        id: 'hesap-belirleme-kurallari',
        techId: 'FIN-ACR-SCR-001',
        businessNameEn: 'AccountDeterminationRuleScreen',
        title: 'Hesap Belirleme Kuralları',
        endpoint: '/hesap-belirleme-kurallari',
        crud: true,
        codeField: 'rule_code',
        nameField: 'description',
        filters: [
          { key: 'rule_code', label: 'Kural' },
          { key: 'document_type', label: 'Belge tipi' },
        ],
        columns: [
          { key: 'rule_code', label: 'Kod', mono: true },
          { key: 'document_type', label: 'Belge' },
          { key: 'debit_account_code', label: 'Borç', mono: true },
          { key: 'credit_account_code', label: 'Alacak', mono: true },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'rule_code', label: 'Kural kodu', code: true, required: true },
          { key: 'document_type', label: 'Belge tipi', type: 'select', options: ['Satis', 'Alis'], required: true },
          { key: 'debit_account_code', label: 'Borç hesap' },
          { key: 'credit_account_code', label: 'Alacak hesap' },
          { key: 'description', label: 'Açıklama', name: true },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'fiyat-listeleri',
        techId: 'FIN-PRC-SCR-001',
        businessNameEn: 'PriceListScreen',
        title: 'Fiyat Listeleri',
        endpoint: '/fiyat-listeleri',
        crud: true,
        codeField: 'list_code',
        nameField: 'list_name',
        numeratorSeri: 'FIYAT_LISTE',
        filters: [
          { key: 'list_code', label: 'Liste kodu' },
          { key: 'list_name', label: 'Liste adı' },
        ],
        columns: [
          { key: 'list_code', label: 'Kod', mono: true },
          { key: 'list_name', label: 'Ad' },
          { key: 'currency_code', label: 'PB' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'list_code', label: 'Liste kodu', code: true },
          { key: 'list_name', label: 'Liste adı', name: true, required: true },
          { key: 'currency_code', label: 'Para birimi' },
          { key: 'start_date', label: 'Başlangıç', type: 'date' },
          { key: 'end_date', label: 'Bitiş', type: 'date' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'partner_id', label: 'Cari', type: 'lookup', lookup: 'partners', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code' },
          { key: 'min_quantity', label: 'Min quantity', type: 'number' },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number' },
          { key: 'discount_rate', label: 'İskonto %', type: 'number' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'fatura-kontrolleri',
        techId: 'FIN-3WAY-SCR-001',
        businessNameEn: 'ThreeWayMatchScreen',
        title: 'Fatura Kontrolleri (3-way)',
        endpoint: '/fatura-kontrolleri',
        crud: false,
        readOnly: true,
        filters: [
          { key: 'invoice_no', label: 'Fatura' },
          { key: 'result', label: 'Sonuç' },
        ],
        columns: [
          { key: 'invoice_no', label: 'Fatura', mono: true },
          { key: 'partner_name', label: 'Cari' },
          { key: 'receipt_no', label: 'Mal kabul', mono: true },
          { key: 'order_no', label: 'SA sipariş', mono: true },
          { key: 'fiyat_fark', label: 'Fiyat fark' },
          { key: 'quantity_fark', label: 'Miktar fark' },
          { key: 'result', label: 'Sonuç' },
          { key: 'description', label: 'Açıklama' },
        ],
        masterFields: [
          { key: 'invoice_id', label: 'Alış faturası', type: 'lookup', lookup: 'alis-faturalari', valueKey: 'id', labelKey: 'invoice_no' },
          { key: 'goods_receipt_id', label: 'Mal kabul', type: 'lookup', lookup: 'mal-kabuller', valueKey: 'id', labelKey: 'receipt_no' },
          { key: 'purchase_order_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'order_no' },
          { key: 'invoice_no', label: 'Fatura no', code: true },
          { key: 'receipt_no', label: 'Mal kabul no' },
          { key: 'order_no', label: 'Sipariş no' },
          { key: 'partner_name', label: 'Cari', name: true },
          { key: 'fiyat_fark', label: 'Fiyat farkı', type: 'number' },
          { key: 'quantity_fark', label: 'Miktar farkı', type: 'number' },
          { key: 'result', label: 'Sonuç', type: 'select', options: ['Bekliyor', 'Uyumlu', 'FiyatFark', 'MiktarFark', 'Askida'] },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'kokpit',
        techId: 'RPT-CPIT-SCR-001',
        businessNameEn: 'CockpitDashboardScreen',
        title: 'Kokpit',
        endpoint: '/kokpit',
        crud: false,
        readOnly: true,
        filters: [
          { key: 'metrik', label: 'Metrik' },
        ],
        columns: [
          { key: 'metrik', label: 'Metrik' },
          { key: 'value', label: 'Değer', mono: true },
        ],
      },
    ],
  },

  {
    id: 'insan-kaynaklari',
    title: 'İnsan Kaynakları',
    sections: [
      { id: 'ozluk', title: 'Özlük', screenIds: ['hr-personel'] },
      { id: 'zaman', title: 'Zaman & İzin', screenIds: ['hr-izin-talepleri', 'hr-izin-bakiyeleri', 'hr-puantaj', 'hr-vardiya-atamalari'] },
      { id: 'bordro', title: 'Ücret & Bordro', screenIds: ['hr-ucretler', 'hr-avanslar', 'hr-bordro-donemleri', 'hr-bordro-calismalari'] },
      { id: 'ise-alim', title: 'İşe Alım & Çıkış', screenIds: ['hr-is-ilanlari', 'hr-adaylar', 'hr-onboarding', 'hr-zimmetler', 'hr-isten-cikis'] },
      {
        id: 'tanimlar',
        title: 'Tanımlar / Parametreler',
        screenIds: [
          'hr-departmanlar',
          'hr-pozisyonlar',
          'hr-calisma-takvimleri',
          'hr-vardiyalar',
          'hr-resmi-tatiller',
          'hr-izin-turleri',
          'hr-bordro-parametreleri',
          'hr-cikis-nedenleri',
        ],
      },
    ],
    screens: [
      {
        id: 'hr-personel',
        techId: 'HR-EMP-SCR-001',
        businessNameEn: 'EmployeeMasterScreen',
        title: 'Personel Kartları',
        endpoint: '/hr-personel',
        crud: true,
        numeratorSeri: 'HR_EMPLOYEE',
        codeField: 'employee_no',
        nameField: 'first_name',
        filters: [
          { key: 'q', label: 'Ara' },
          { key: 'employment_status', label: 'Durum' },
        ],
        columns: [
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'department_name', label: 'Departman' },
          { key: 'position_name', label: 'Pozisyon' },
          { key: 'hire_date', label: 'İşe giriş' },
          { key: 'employment_status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'employee_no', label: 'Personel no', code: true },
          { key: 'first_name', label: 'Ad', name: true, required: true },
          { key: 'last_name', label: 'Soyad', required: true },
          { key: 'national_id', label: 'T.C. / Kimlik no' },
          { key: 'birth_date', label: 'Doğum tarihi', type: 'date' },
          { key: 'nationality_code', label: 'Uyruğu' },
          { key: 'country_code', label: 'Ülke kodu' },
          { key: 'marital_status', label: 'Medeni hâl', type: 'select', options: ['', 'Bekar', 'Evli', 'Diger'] },
          { key: 'blood_type', label: 'Kan grubu' },
          { key: 'email', label: 'E-posta' },
          { key: 'phone', label: 'Telefon' },
          { key: 'mobile_phone', label: 'Cep' },
          { key: 'address', label: 'Adres' },
          { key: 'emergency_contact_name', label: 'Acil kişi' },
          { key: 'emergency_contact_phone', label: 'Acil telefon' },
          { key: 'department_id', label: 'Departman', type: 'lookup', lookup: 'hr-departmanlar', valueKey: 'id', labelKey: 'department_name', codeKey: 'department_code' },
          { key: 'position_id', label: 'Pozisyon', type: 'lookup', lookup: 'hr-pozisyonlar', valueKey: 'id', labelKey: 'position_name', codeKey: 'position_code' },
          { key: 'manager_employee_id', label: 'Yönetici', type: 'lookup', lookup: 'hr-personel', valueKey: 'id', labelKey: 'first_name', codeKey: 'employee_no' },
          { key: 'hire_date', label: 'İşe giriş', type: 'date', required: true },
          { key: 'contract_type', label: 'Sözleşme', type: 'select', options: ['BelirsizSureli', 'BelirliSureli', 'KismiSureli', 'Stajyer'] },
          { key: 'employment_status', label: 'Durum', type: 'select', options: ['Aktif', 'Izinli', 'Ayrildi', 'Askida'] },
          { key: 'probation_end_date', label: 'Deneme bitiş', type: 'date' },
          { key: 'contract_end_date', label: 'Sözleşme bitiş', type: 'date' },
          { key: 'work_calendar_id', label: 'Çalışma takvimi', type: 'lookup', lookup: 'hr-calisma-takvimleri', valueKey: 'id', labelKey: 'calendar_name', codeKey: 'calendar_code' },
          { key: 'shift_id', label: 'Vardiya', type: 'lookup', lookup: 'hr-vardiyalar', valueKey: 'id', labelKey: 'shift_name', codeKey: 'shift_code' },
          { key: 'cost_center_code', label: 'Maliyet merkezi' },
          { key: 'employee_type', label: 'Personel türü' },
          { key: 'iban', label: 'IBAN' },
          { key: 'bank_name', label: 'Banka' },
          { key: 'sgk_sicil_no', label: 'SGK sicil' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-departmanlar',
        techId: 'HR-DEPT-SCR-001',
        businessNameEn: 'DepartmentScreen',
        title: 'Departmanlar',
        endpoint: '/hr-org/departmanlar',
        crud: true,
        numeratorSeri: 'HR_DEPT',
        codeField: 'department_code',
        nameField: 'department_name',
        columns: [
          { key: 'department_code', label: 'Kod', mono: true },
          { key: 'department_name', label: 'Ad' },
          { key: 'parent_name', label: 'Üst departman' },
          { key: 'cost_center_code', label: 'Maliyet mer.' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'department_code', label: 'Kod', code: true },
          { key: 'department_name', label: 'Ad', name: true, required: true },
          { key: 'parent_id', label: 'Üst departman', type: 'lookup', lookup: 'hr-departmanlar', valueKey: 'id', labelKey: 'department_name', codeKey: 'department_code' },
          { key: 'cost_center_code', label: 'Maliyet merkezi' },
          { key: 'manager_employee_id', label: 'Yönetici', type: 'lookup', lookup: 'hr-personel', valueKey: 'id', labelKey: 'first_name', codeKey: 'employee_no' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-pozisyonlar',
        techId: 'HR-POS-SCR-001',
        businessNameEn: 'PositionScreen',
        title: 'Pozisyonlar',
        endpoint: '/hr-org/pozisyonlar',
        crud: true,
        numeratorSeri: 'HR_POS',
        codeField: 'position_code',
        nameField: 'position_name',
        columns: [
          { key: 'position_code', label: 'Kod', mono: true },
          { key: 'position_name', label: 'Ad' },
          { key: 'department_name', label: 'Departman' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'position_code', label: 'Kod', code: true },
          { key: 'position_name', label: 'Ad', name: true, required: true },
          { key: 'department_id', label: 'Departman', type: 'lookup', lookup: 'hr-departmanlar', valueKey: 'id', labelKey: 'department_name', codeKey: 'department_code' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-calisma-takvimleri',
        techId: 'HR-CAL-SCR-001',
        businessNameEn: 'WorkCalendarScreen',
        title: 'Çalışma Takvimleri',
        endpoint: '/hr-takvim/takvimler',
        crud: true,
        numeratorSeri: 'HR_CAL',
        codeField: 'calendar_code',
        nameField: 'calendar_name',
        columns: [
          { key: 'calendar_code', label: 'Kod', mono: true },
          { key: 'calendar_name', label: 'Ad' },
          { key: 'version_no', label: 'Sürüm' },
          { key: 'work_days_per_week', label: 'Gün/hafta' },
          { key: 'daily_net_hours', label: 'Net saat' },
          { key: 'weekly_net_hours', label: 'Haftalık net' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'calendar_code', label: 'Kod', code: true },
          { key: 'calendar_name', label: 'Ad', name: true, required: true },
          { key: 'country_code', label: 'Ülke' },
          { key: 'work_days_per_week', label: 'Çalışma günü/hafta', type: 'number' },
          { key: 'daily_presence_hours', label: 'Günlük bulunma', type: 'number' },
          { key: 'daily_net_hours', label: 'Günlük net', type: 'number' },
          { key: 'break_minutes', label: 'Ara (dk)', type: 'number' },
          { key: 'weekly_net_hours', label: 'Haftalık net', type: 'number' },
          { key: 'effective_from', label: 'Geçerlilik başı', type: 'date' },
          { key: 'effective_to', label: 'Geçerlilik sonu', type: 'date' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-vardiyalar',
        techId: 'HR-SHF-SCR-001',
        businessNameEn: 'ShiftScreen',
        title: 'Vardiyalar',
        endpoint: '/hr-takvim/vardiyalar',
        crud: true,
        numeratorSeri: 'HR_SHIFT',
        codeField: 'shift_code',
        nameField: 'shift_name',
        columns: [
          { key: 'shift_code', label: 'Kod', mono: true },
          { key: 'shift_name', label: 'Ad' },
          { key: 'start_time', label: 'Başlangıç' },
          { key: 'end_time', label: 'Bitiş' },
          { key: 'break_minutes', label: 'Ara' },
          { key: 'crosses_midnight', label: 'Gece aşımı' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'shift_code', label: 'Kod', code: true },
          { key: 'shift_name', label: 'Ad', name: true, required: true },
          { key: 'start_time', label: 'Başlangıç', required: true },
          { key: 'end_time', label: 'Bitiş', required: true },
          { key: 'break_minutes', label: 'Ara (dk)', type: 'number' },
          { key: 'crosses_midnight', label: 'Gece yarısını aşar', type: 'checkbox' },
          { key: 'net_hours', label: 'Net saat', type: 'number' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-resmi-tatiller',
        techId: 'HR-HOL-SCR-001',
        businessNameEn: 'PublicHolidayScreen',
        title: 'Resmî Tatiller',
        endpoint: '/hr-takvim/tatiller',
        crud: true,
        columns: [
          { key: 'holiday_date', label: 'Tarih' },
          { key: 'holiday_name', label: 'Ad' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'year_no', label: 'Yıl' },
          { key: 'is_half_day', label: 'Yarım gün' },
        ],
        masterFields: [
          { key: 'holiday_date', label: 'Tarih', type: 'date', required: true },
          { key: 'holiday_name', label: 'Ad', name: true, required: true },
          { key: 'country_code', label: 'Ülke' },
          { key: 'year_no', label: 'Yıl', type: 'number' },
          { key: 'is_half_day', label: 'Yarım gün', type: 'checkbox' },
        ],
      },
      {
        id: 'hr-izin-talepleri',
        techId: 'HR-LV-SCR-001',
        businessNameEn: 'LeaveRequestScreen',
        title: 'İzin Talepleri',
        endpoint: '/hr-izin/talepler',
        crud: true,
        numeratorSeri: 'HR_LEAVE_REQ',
        codeField: 'request_no',
        approveAction: { label: 'Onayla', path: '/hr-izin/talepler/{id}/onayla' },
        convertAction: { label: 'Gönder', path: '/hr-izin/talepler/{id}/gonder' },
        columns: [
          { key: 'request_no', label: 'No', mono: true },
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'leave_name', label: 'İzin türü' },
          { key: 'start_date', label: 'Başlangıç' },
          { key: 'end_date', label: 'Bitiş' },
          { key: 'quantity', label: 'Süre' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'request_no', label: 'Talep no', code: true },
          { key: 'employee_id', label: 'Personel', type: 'lookup', lookup: 'hr-personel', valueKey: 'id', labelKey: 'first_name', codeKey: 'employee_no', required: true },
          { key: 'leave_type_id', label: 'İzin türü', type: 'lookup', lookup: 'hr-izin-turleri', valueKey: 'id', labelKey: 'leave_name', codeKey: 'leave_code', required: true },
          { key: 'start_date', label: 'Başlangıç', type: 'date', required: true },
          { key: 'end_date', label: 'Bitiş', type: 'date', required: true },
          { key: 'unit', label: 'Birim', type: 'select', options: ['Gun', 'Saat', 'YarimGun'] },
          { key: 'quantity', label: 'Miktar', type: 'number' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-izin-turleri',
        techId: 'HR-LVT-SCR-001',
        businessNameEn: 'LeaveTypeScreen',
        title: 'İzin Türleri',
        endpoint: '/hr-izin/turler',
        crud: true,
        codeField: 'leave_code',
        nameField: 'leave_name',
        filters: [
          { key: 'leave_code', label: 'Kod' },
          { key: 'leave_name', label: 'Ad' },
        ],
        columns: [
          { key: 'leave_code', label: 'Kod', mono: true },
          { key: 'leave_name', label: 'Ad' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'is_paid', label: 'Ücretli' },
          { key: 'unit', label: 'Birim' },
          { key: 'accrual_method', label: 'Hak ediş' },
          { key: 'requires_document', label: 'Belge' },
          { key: 'affects_payroll', label: 'Bordro' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'leave_code', label: 'Kod', code: true, required: true, editableOnNew: true },
          { key: 'leave_name', label: 'Ad', name: true, required: true },
          { key: 'country_code', label: 'Ülke' },
          { key: 'is_paid', label: 'Ücretli', type: 'checkbox' },
          { key: 'unit', label: 'Birim', type: 'select', options: ['Gun', 'Saat', 'YarimGun'] },
          { key: 'accrual_method', label: 'Hak ediş yöntemi', type: 'select', options: ['YillikKidem', 'Talep', 'Sabit'] },
          { key: 'requires_document', label: 'Belge zorunlu', type: 'checkbox' },
          { key: 'affects_payroll', label: 'Bordroya etki', type: 'checkbox' },
          { key: 'approval_route_screen', label: 'Onay ekranı' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
        defaults: {
          country_code: 'TR',
          is_paid: true,
          unit: 'Gun',
          accrual_method: 'Talep',
          affects_payroll: true,
          is_active: true,
        },
      },
      {
        id: 'hr-vardiya-atamalari',
        techId: 'HR-SHA-SCR-001',
        businessNameEn: 'ShiftAssignmentScreen',
        title: 'Vardiya Atamaları',
        endpoint: '/hr-takvim/vardiya-atamalari',
        crud: true,
        columns: [
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'shift_code', label: 'Vardiya', mono: true },
          { key: 'shift_name', label: 'Vardiya adı' },
          { key: 'start_date', label: 'Başlangıç' },
          { key: 'end_date', label: 'Bitiş' },
        ],
        masterFields: [
          { key: 'employee_id', label: 'Personel', type: 'lookup', lookup: 'hr-personel', valueKey: 'id', labelKey: 'first_name', codeKey: 'employee_no', required: true },
          { key: 'shift_id', label: 'Vardiya', type: 'lookup', lookup: 'hr-vardiyalar', valueKey: 'id', labelKey: 'shift_name', codeKey: 'shift_code', required: true },
          { key: 'start_date', label: 'Başlangıç', type: 'date', required: true },
          { key: 'end_date', label: 'Bitiş', type: 'date' },
        ],
      },
      {
        id: 'hr-cikis-nedenleri',
        techId: 'HR-TRR-SCR-001',
        businessNameEn: 'TerminationReasonScreen',
        title: 'Çıkış Nedenleri',
        endpoint: '/hr-ise-alim/cikis-nedenleri',
        crud: true,
        codeField: 'reason_code',
        nameField: 'reason_name',
        columns: [
          { key: 'reason_code', label: 'Kod', mono: true },
          { key: 'reason_name', label: 'Ad' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'severance_default', label: 'Kıdem varsayılan' },
          { key: 'notice_default', label: 'İhbar varsayılan' },
          { key: 'requires_document', label: 'Belge' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'reason_code', label: 'Kod', code: true, required: true, editableOnNew: true },
          { key: 'reason_name', label: 'Ad', name: true, required: true },
          { key: 'country_code', label: 'Ülke' },
          { key: 'severance_default', label: 'Kıdem uygun varsayılan', type: 'checkbox' },
          { key: 'notice_default', label: 'İhbar uygun varsayılan', type: 'checkbox' },
          { key: 'requires_document', label: 'Belge zorunlu', type: 'checkbox' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
          { key: 'description', label: 'Açıklama' },
        ],
        defaults: { country_code: 'TR', is_active: true },
      },
      {
        id: 'hr-izin-bakiyeleri',
        techId: 'HR-LVB-SCR-001',
        businessNameEn: 'LeaveBalanceScreen',
        title: 'İzin Bakiyeleri',
        endpoint: '/hr-izin/bakiyeler',
        crud: false,
        readOnly: true,
        columns: [
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'leave_name', label: 'İzin türü' },
          { key: 'year_no', label: 'Yıl' },
          { key: 'accrued', label: 'Hak ediş' },
          { key: 'used', label: 'Kullanılan' },
          { key: 'closing_balance', label: 'Kalan' },
        ],
        masterFields: [
          { key: 'employee_no', label: 'Sicil' },
          { key: 'leave_name', label: 'İzin türü' },
          { key: 'year_no', label: 'Yıl' },
          { key: 'closing_balance', label: 'Kalan' },
        ],
      },
      {
        id: 'hr-puantaj',
        techId: 'HR-ATT-SCR-001',
        businessNameEn: 'AttendanceDayScreen',
        title: 'Günlük Puantaj',
        endpoint: '/hr-puantaj/gunluk',
        crud: false,
        readOnly: true,
        columns: [
          { key: 'work_date', label: 'Tarih' },
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'planned_minutes', label: 'Plan (dk)' },
          { key: 'actual_minutes', label: 'Gerçek (dk)' },
          { key: 'overtime_minutes', label: 'FM (dk)' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'work_date', label: 'Tarih' },
          { key: 'planned_minutes', label: 'Plan' },
          { key: 'actual_minutes', label: 'Gerçek' },
          { key: 'overtime_minutes', label: 'Fazla mesai' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-ucretler',
        techId: 'HR-SAL-SCR-001',
        businessNameEn: 'EmployeeSalaryScreen',
        title: 'Ücret Tanımları',
        endpoint: '/hr-bordro/ucretler',
        crud: true,
        columns: [
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'effective_from', label: 'Geçerlilik' },
          { key: 'wage_type', label: 'Tür' },
          { key: 'gross_amount', label: 'Brüt' },
          { key: 'currency_code', label: 'PB' },
        ],
        masterFields: [
          { key: 'employee_id', label: 'Personel', type: 'lookup', lookup: 'hr-personel', valueKey: 'id', labelKey: 'first_name', codeKey: 'employee_no', required: true },
          { key: 'effective_from', label: 'Geçerlilik başı', type: 'date', required: true },
          { key: 'effective_to', label: 'Geçerlilik sonu', type: 'date' },
          { key: 'wage_type', label: 'Ücret türü', type: 'select', options: ['Aylik', 'Gunluk', 'Saatlik'] },
          { key: 'gross_amount', label: 'Brüt tutar', type: 'number', required: true },
          { key: 'currency_code', label: 'Para birimi' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-avanslar',
        techId: 'HR-ADV-SCR-001',
        businessNameEn: 'AdvanceScreen',
        title: 'Avanslar',
        endpoint: '/hr-bordro/avanslar',
        crud: true,
        numeratorSeri: 'HR_ADVANCE',
        codeField: 'advance_no',
        approveAction: { label: 'Onayla', path: '/hr-bordro/avanslar/{id}/onayla' },
        convertAction: { label: 'Öde', path: '/hr-bordro/avanslar/{id}/ode' },
        columns: [
          { key: 'advance_no', label: 'No', mono: true },
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'amount', label: 'Tutar' },
          { key: 'paid_amount', label: 'Ödenen' },
          { key: 'deducted_amount', label: 'Mahsup' },
          { key: 'remaining_balance', label: 'Kalan' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'advance_no', label: 'Avans no', code: true },
          { key: 'employee_id', label: 'Personel', type: 'lookup', lookup: 'hr-personel', valueKey: 'id', labelKey: 'first_name', codeKey: 'employee_no', required: true },
          { key: 'request_date', label: 'Talep tarihi', type: 'date' },
          { key: 'amount', label: 'Tutar', type: 'number', required: true },
          { key: 'currency_code', label: 'PB' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-bordro-donemleri',
        techId: 'HR-PRP-SCR-001',
        businessNameEn: 'PayrollPeriodScreen',
        title: 'Bordro Dönemleri',
        endpoint: '/hr-bordro/donemler',
        crud: true,
        codeField: 'period_code',
        columns: [
          { key: 'period_code', label: 'Dönem', mono: true },
          { key: 'year_no', label: 'Yıl' },
          { key: 'month_no', label: 'Ay' },
          { key: 'start_date', label: 'Başlangıç' },
          { key: 'end_date', label: 'Bitiş' },
          { key: 'status', label: 'Durum' },
          { key: 'country_code', label: 'Ülke' },
        ],
        masterFields: [
          { key: 'period_code', label: 'Dönem kodu', code: true },
          { key: 'year_no', label: 'Yıl', type: 'number', required: true },
          { key: 'month_no', label: 'Ay', type: 'number', required: true },
          { key: 'start_date', label: 'Başlangıç', type: 'date' },
          { key: 'end_date', label: 'Bitiş', type: 'date' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'status', label: 'Durum' },
        ],
      },
      {
        id: 'hr-bordro-calismalari',
        techId: 'HR-PRR-SCR-001',
        businessNameEn: 'PayrollRunScreen',
        title: 'Bordro Çalışmaları',
        endpoint: '/hr-bordro/calismalar',
        crud: true,
        numeratorSeri: 'HR_PAYROLL_RUN',
        codeField: 'run_no',
        approveAction: { label: 'Onayla', path: '/hr-bordro/calismalar/{id}/onayla' },
        convertAction: { label: 'Kesinleştir', path: '/hr-bordro/calismalar/{id}/kesinlestir' },
        secondaryAction: { label: 'Hesapla', path: '/hr-bordro/calismalar/{id}/hesapla' },
        columns: [
          { key: 'run_no', label: 'No', mono: true },
          { key: 'period_code', label: 'Dönem' },
          { key: 'status', label: 'Durum' },
          { key: 'employee_count', label: 'Kişi' },
          { key: 'total_gross', label: 'Toplam brüt' },
          { key: 'total_net', label: 'Toplam net' },
          { key: 'total_employer_cost', label: 'İşveren maliyeti' },
        ],
        masterFields: [
          { key: 'run_no', label: 'Çalışma no', code: true },
          { key: 'period_id', label: 'Dönem', type: 'lookup', lookup: 'hr-bordro-donemleri', valueKey: 'id', labelKey: 'period_code', required: true },
          { key: 'status', label: 'Durum' },
          { key: 'employee_count', label: 'Personel sayısı', type: 'number' },
          { key: 'total_gross', label: 'Toplam brüt', type: 'number' },
          { key: 'total_net', label: 'Toplam net', type: 'number' },
          { key: 'total_employer_cost', label: 'İşveren maliyeti', type: 'number' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-bordro-parametreleri',
        techId: 'HR-PRM-SCR-001',
        businessNameEn: 'PayrollParamScreen',
        title: 'Bordro Parametreleri',
        endpoint: '/hr-bordro/parametreler',
        crud: true,
        codeField: 'set_code',
        nameField: 'set_name',
        filters: [
          { key: 'country_code', label: 'Ülke', queryParam: true },
          { key: 'set_code', label: 'Kod' },
        ],
        columns: [
          { key: 'set_code', label: 'Kod', mono: true },
          { key: 'set_name', label: 'Ad' },
          { key: 'country_code', label: 'Ülke' },
          { key: 'effective_from', label: 'Başlangıç' },
          { key: 'effective_to', label: 'Bitiş' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'set_code', label: 'Set kodu', code: true, required: true, editableOnNew: true },
          { key: 'set_name', label: 'Set adı', name: true, required: true },
          { key: 'country_code', label: 'Ülke', required: true },
          { key: 'effective_from', label: 'Geçerlilik başı', type: 'date', required: true },
          { key: 'effective_to', label: 'Geçerlilik sonu', type: 'date' },
          { key: 'source_url', label: 'Kaynak URL' },
          { key: 'source_note', label: 'Kaynak notu' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: 'param_values',
        detailSlots: 8,
        formTabs: [
          {
            id: 'degerler',
            label: 'Parametre değerleri',
            kind: 'grid',
            key: 'param_values',
            slots: 10,
            fields: [
              { key: 'param_key', label: 'Anahtar', required: true },
              { key: 'param_value', label: 'Değer', type: 'number', required: true },
              { key: 'description', label: 'Açıklama' },
            ],
          },
          {
            id: 'dilimler',
            label: 'GV dilimleri',
            kind: 'grid',
            key: 'tax_brackets',
            slots: 6,
            fields: [
              { key: 'line_no', label: 'Sıra', type: 'number' },
              { key: 'up_to_amount', label: 'Üst sınır', type: 'number' },
              { key: 'rate', label: 'Oran', type: 'number', required: true },
              { key: 'fixed_amount', label: 'Sabit', type: 'number' },
            ],
          },
        ],
        defaults: { country_code: 'TR', is_active: true },
      },
      {
        id: 'hr-is-ilanlari',
        techId: 'HR-JOB-SCR-001',
        businessNameEn: 'JobRequisitionScreen',
        title: 'İş İlanları',
        endpoint: '/hr-ise-alim/ilanlar',
        crud: true,
        numeratorSeri: 'HR_JOB_REQ',
        codeField: 'requisition_no',
        columns: [
          { key: 'requisition_no', label: 'No', mono: true },
          { key: 'title', label: 'Başlık' },
          { key: 'department_name', label: 'Departman' },
          { key: 'position_name', label: 'Pozisyon' },
          { key: 'headcount', label: 'Adet' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'requisition_no', label: 'İlan no', code: true },
          { key: 'title', label: 'Başlık', name: true, required: true },
          { key: 'department_id', label: 'Departman', type: 'lookup', lookup: 'hr-departmanlar', valueKey: 'id', labelKey: 'department_name', codeKey: 'department_code' },
          { key: 'position_id', label: 'Pozisyon', type: 'lookup', lookup: 'hr-pozisyonlar', valueKey: 'id', labelKey: 'position_name', codeKey: 'position_code' },
          { key: 'headcount', label: 'Kontenjan', type: 'number' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Acik', 'Kapali', 'Iptal'] },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-adaylar',
        techId: 'HR-CAND-SCR-001',
        businessNameEn: 'CandidateScreen',
        title: 'Adaylar',
        endpoint: '/hr-ise-alim/adaylar',
        crud: true,
        numeratorSeri: 'HR_CANDIDATE',
        codeField: 'candidate_no',
        convertAction: { label: 'İşe Al → Personel', path: '/hr-ise-alim/adaylar/{id}/ise-al' },
        columns: [
          { key: 'candidate_no', label: 'No', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'last_name', label: 'Soyad' },
          { key: 'email', label: 'E-posta' },
          { key: 'requisition_title', label: 'İlan' },
          { key: 'status', label: 'Durum' },
          { key: 'employee_no', label: 'Personel' },
        ],
        masterFields: [
          { key: 'candidate_no', label: 'Aday no', code: true },
          { key: 'first_name', label: 'Ad', name: true, required: true },
          { key: 'last_name', label: 'Soyad', required: true },
          { key: 'email', label: 'E-posta' },
          { key: 'phone', label: 'Telefon' },
          { key: 'requisition_id', label: 'İş ilanı', type: 'lookup', lookup: 'hr-is-ilanlari', valueKey: 'id', labelKey: 'title', codeKey: 'requisition_no' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-onboarding',
        techId: 'HR-ONB-SCR-001',
        businessNameEn: 'OnboardingTaskScreen',
        title: 'Onboarding Görevleri',
        endpoint: '/hr-ise-alim/onboarding',
        crud: false,
        readOnly: true,
        approveAction: { label: 'Tamamla', path: '/hr-ise-alim/onboarding/{id}/tamamla' },
        columns: [
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'task_code', label: 'Kod', mono: true },
          { key: 'task_name', label: 'Görev' },
          { key: 'status', label: 'Durum' },
          { key: 'due_date', label: 'Termin' },
        ],
        masterFields: [
          { key: 'task_code', label: 'Kod' },
          { key: 'task_name', label: 'Görev' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-zimmetler',
        techId: 'HR-AST-SCR-001',
        businessNameEn: 'AssetAssignmentScreen',
        title: 'Zimmetler',
        endpoint: '/hr-ise-alim/zimmetler',
        crud: true,
        approveAction: { label: 'İade Al', path: '/hr-ise-alim/zimmetler/{id}/iade' },
        columns: [
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'asset_code', label: 'Kod', mono: true },
          { key: 'asset_name', label: 'Ad' },
          { key: 'assigned_at', label: 'Teslim' },
          { key: 'returned_at', label: 'İade' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'employee_id', label: 'Personel', type: 'lookup', lookup: 'hr-personel', valueKey: 'id', labelKey: 'first_name', codeKey: 'employee_no', required: true },
          { key: 'asset_code', label: 'Zimmet kodu', code: true, required: true },
          { key: 'asset_name', label: 'Zimmet adı', name: true, required: true },
          { key: 'assigned_at', label: 'Teslim tarihi', type: 'date' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
      {
        id: 'hr-isten-cikis',
        techId: 'HR-TRM-SCR-001',
        businessNameEn: 'TerminationScreen',
        title: 'İşten Çıkış',
        endpoint: '/hr-ise-alim/cikislar',
        crud: true,
        numeratorSeri: 'HR_TERMINATION',
        codeField: 'termination_no',
        approveAction: { label: 'Onayla & Pasife Al', path: '/hr-ise-alim/cikislar/{id}/onayla' },
        columns: [
          { key: 'termination_no', label: 'No', mono: true },
          { key: 'employee_no', label: 'Sicil', mono: true },
          { key: 'first_name', label: 'Ad' },
          { key: 'termination_date', label: 'Çıkış' },
          { key: 'reason_code', label: 'Neden' },
          { key: 'severance_eligible', label: 'Kıdem?' },
          { key: 'net_settlement', label: 'Net hesaplaşma' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'termination_no', label: 'Çıkış no', code: true },
          { key: 'employee_id', label: 'Personel', type: 'lookup', lookup: 'hr-personel', valueKey: 'id', labelKey: 'first_name', codeKey: 'employee_no', required: true },
          { key: 'notice_date', label: 'Bildirim', type: 'date' },
          { key: 'last_work_date', label: 'Son çalışma', type: 'date' },
          { key: 'termination_date', label: 'Ayrılış tarihi', type: 'date', required: true },
          { key: 'reason_code', label: 'Neden', type: 'lookup', lookup: 'hr-cikis-nedenleri', valueKey: 'reason_code', labelKey: 'reason_name', codeKey: 'reason_code', required: true },
          { key: 'reason_name', label: 'Neden açıklama' },
          { key: 'unused_leave_days', label: 'Kullanılmamış izin (gün)', type: 'number' },
          { key: 'other_amount', label: 'Diğer ödemeler', type: 'number' },
          { key: 'deduction_amount', label: 'Kesintiler', type: 'number' },
          { key: 'severance_eligible', label: 'Kıdem uygun', type: 'checkbox' },
          { key: 'notice_eligible', label: 'İhbar uygun', type: 'checkbox' },
          { key: 'severance_amount', label: 'Kıdem tutarı', type: 'number' },
          { key: 'notice_amount', label: 'İhbar tutarı', type: 'number' },
          { key: 'unused_leave_amount', label: 'İzin ücreti', type: 'number' },
          { key: 'net_settlement', label: 'Net hesaplaşma', type: 'number' },
          { key: 'status', label: 'Durum' },
          { key: 'description', label: 'Açıklama' },
        ],
      },
    ],
  },

];

/** Modül menü bölümleri — sections yoksa düz liste (Sabit Tanımlar). */
function moduleMenuSections(mod) {
  const screens = (mod.screens || []).filter((s) => s && s.id && !s.hidden && !s.deprecated);
  const byId = Object.fromEntries(screens.map((s) => [s.id, s]));
  if (Array.isArray(mod.sections) && mod.sections.length) {
    const used = new Set();
    const sections = mod.sections.map((sec) => {
      const secScreens = (sec.screenIds || [])
        .map((id) => {
          used.add(id);
          return byId[id];
        })
        .filter(Boolean);
      return { id: sec.id || sec.title, title: sec.title, screens: secScreens };
    }).filter((sec) => sec.screens.length);
    const leftovers = screens.filter((s) => !used.has(s.id));
    if (leftovers.length) {
      sections.push({ id: '_diger', title: 'Diğer', screens: leftovers });
    }
    return sections;
  }
  return [{ id: '_all', title: null, screens }];
}

/**
 * Başlık ↔ kalem tekrarı: aynı alan hem master’da hem grid’de ise başlıktan düşür.
 * Satır niteliğindeki alanlar yalnızca master’daysa kaleme taşı.
 */
function dedupeMasterAgainstGrid(screen) {
  const ALWAYS_KEEP = new Set([
    screen.codeField,
    screen.nameField,
    'company_id',
    'plant_id',
    'partner_id',
    'supplier_partner_id',
    'status',
  ].filter(Boolean));

  const isDocRefId = (key) => (
    /_id$/.test(key)
    && !/^(stok|depo|parti|bilesen|fiyat_liste)_id$/.test(key)
  );

  const isLineish = (key) => (
    /^(item_id|item_code|item_name|quantity|unit_price|uom_code|vat_rate|vat_mode|satir_|discount_rate|tedarikci_stok_|giren_quantity|accepted_flag|reddedilen|sevk_edilen|kalan_|rezerve_|bekleyen_|fatura_edilen)/i.test(key)
  );

  const apply = (masterFields, gridFields) => {
    if (!Array.isArray(masterFields) || !Array.isArray(gridFields) || !gridFields.length) {
      return { masterFields, gridFields };
    }
    const gridKeys = new Set(gridFields.map((f) => f.key));
    const moved = [];
    const kept = [];
    masterFields.forEach((f) => {
      if (!f?.key) return;
      // lead/critical: belge başlığında kalsın (satırda da olabilir — örn. delivery_date)
      if (ALWAYS_KEEP.has(f.key) || isDocRefId(f.key) || f.lead || f.critical) {
        kept.push(f);
        return;
      }
      if (gridKeys.has(f.key)) return; // kalemde var → başlıktan çıkar
      if (isLineish(f.key)) {
        moved.push(f);
        return;
      }
      kept.push(f);
    });
    const nextGrid = moved.length
      ? gridFields.concat(moved.filter((f) => !gridKeys.has(f.key)))
      : gridFields;
    return { masterFields: kept, gridFields: nextGrid };
  };

  if (Array.isArray(screen.masterFields) && Array.isArray(screen.detailFields) && screen.detailFields.length) {
    const r = apply(screen.masterFields, screen.detailFields);
    screen.masterFields = r.masterFields;
    screen.detailFields = r.gridFields;
  }

  (screen.formTabs || []).forEach((tab) => {
    if (tab.kind === 'master-grid') {
      // null/boş grid.fields → ekran detailFields (satış siparişi kompakt kabuk)
      if (tab.grid && (!Array.isArray(tab.grid.fields) || !tab.grid.fields.length)
          && Array.isArray(screen.detailFields) && screen.detailFields.length) {
        tab.grid.fields = screen.detailFields.map((f) => ({ ...f }));
      }
      const gFields = tab.grid?.fields || tab.detailFields || screen.detailFields || [];
      const r = apply(tab.masterFields || screen.masterFields || [], gFields);
      tab.masterFields = r.masterFields;
      if (tab.grid) tab.grid.fields = r.gridFields;
      else tab.detailFields = r.gridFields;
    }
    if (tab.kind === 'master-detail') {
      const r = apply(tab.masterFields || [], tab.detailFields || []);
      tab.masterFields = r.masterFields;
      tab.detailFields = r.gridFields;
    }
  });
}

/**
 * Belge ekranı mı? (başlık + kalem satırları — stok kartı / BOM / rota hariç)
 * Satış siparişi kompakt kabuğu bu ekranlara uygulanır.
 */
function isCompactBelgeScreen(s) {
  if (!s || s.compactMaster === false) return false;
  if (s.detailAsFields) return false;
  if (!Array.isArray(s.detailFields) || !s.detailFields.length) return false;
  if (!(s.detailSlots > 0)) return false;
  const skip = new Set([
    'stok-karti', 'cari-kartlari', 'urun-agaci', 'routings',
    'kullanicilar', 'kullanici-gruplari', 'companies', 'is-yerleri', 'warehouses',
    'bom-malzeme-degisikligi', 'bom-patlatma', 'bom-level-listesi',
    'siparis-is-emri', 'toplu-is-emri',
    // Kart / tanım — belge kabuğu değil
    'crm-firsatlar', 'fiyat-listeleri', 'kk-kontrol-planlari',
  ]);
  if (skip.has(s.id)) return false;
  if ((s.formTabs || []).some((t) => /bom|rota|yetki|workspace/i.test(String(t.kind || '')))) return false;
  const dKeys = new Set(s.detailFields.map((f) => f.key));
  // Klasik malzeme/satır belgeleri (+ üretim emri operasyon satırları)
  return dKeys.has('item_id') || dKeys.has('component_item_id')
    || dKeys.has('quantity') || dKeys.has('line_description');
}

const COMPACT_DROP_KEYS = new Set([
  'order_source', 'teklif_kaynak', 'source', 'belge_kaynak',
]);
const COMPACT_ADDR_RE = /^(sevk_|fatura_adres)/i;
const COMPACT_TO_LINE_RE = /^(currency_code|exchange_rate|rate_type|discount_rate|discount_rate_2|discount_rate_3|vat_rate|vat_mode|excise_rate|withholding_rate|price_list_id|valid_date|project_code|region)$/i;
const COMPACT_HEADER_LEAD_RE = /^(company_id|plant_id|partner_id|supplier_partner_id|status|movement_code_id|payment_term_code|payment_method|delivery_term_code|order_type|.*_tarihi$|.*_no$)$/i;

/**
 * Satış siparişi düzeni: kompakt başlık + Kalemler (+ Adres) + not alt şerit.
 * Finans/geçerlilik/fiyat listesi → kalem; sevk adresi → Adres sekmesi.
 */
function applyCompactBelgeShell(s) {
  if (!isCompactBelgeScreen(s)) return;

  // Mevcut formTabs’taki address / not / başlık alanlarını da topla (elle tanımlı kabuklar)
  const fromTabs = [];
  (s.formTabs || []).forEach((tab) => {
    if (tab.kind === 'fields' && Array.isArray(tab.fields)) fromTabs.push(...tab.fields);
    if (Array.isArray(tab.masterFields)) fromTabs.push(...tab.masterFields);
  });

  const seen = new Set();
  const master = [];
  [...(s.masterFields || []), ...fromTabs].forEach((f) => {
    if (!f?.key || seen.has(f.key)) return;
    seen.add(f.key);
    master.push(f);
  });

  const detail = Array.isArray(s.detailFields) ? [...s.detailFields] : [];
  const detailKeys = new Set(detail.map((f) => f.key));
  const header = [];
  const address = [];

  master.forEach((f) => {
    if (!f?.key) return;
    if (COMPACT_DROP_KEYS.has(f.key)) return;
    if (COMPACT_ADDR_RE.test(f.key)) {
      address.push({ ...f });
      return;
    }
    if (isFooterNoteField(f)) {
      header.push({ ...f }); // notlar master’da kalır → footer’a iner
      return;
    }
    if (COMPACT_TO_LINE_RE.test(f.key)) {
      if (!detailKeys.has(f.key)) {
        detail.push({
          ...f,
          size: f.size || (f.type === 'date' || f.type === 'number' ? 'short' : undefined),
        });
        detailKeys.add(f.key);
      }
      return;
    }
    const next = { ...f };
    if (f.code || f.required || COMPACT_HEADER_LEAD_RE.test(f.key) || /tarih/i.test(f.key)) {
      next.lead = true;
    }
    if ((f.key === 'partner_id' || f.key === 'supplier_partner_id') && !next.fillCariAdres) {
      next.fillCariAdres = true;
    }
    header.push(next);
  });

  s.masterFields = header;
  s.detailFields = detail;
  s.compactMaster = true;
  if (!s.masterPrimaryMax || s.masterPrimaryMax < 12) s.masterPrimaryMax = 16;

  const kalemLabel = /irsaliye|sevk|mal-kabul/i.test(s.id) ? 'Satırlar' : 'Kalemler';

  const tabs = [{
    id: 'kalemler',
    label: kalemLabel,
    kind: 'master-grid',
    masterFields: header.map((f) => ({ ...f })),
    grid: {
      key: s.detailKey || '_detail',
      slots: s.detailSlots,
      fields: detail.map((f) => ({ ...f })),
    },
  }];
  if (address.length) {
    tabs.push({
      id: 'address',
      label: 'Adres',
      kind: 'fields',
      fields: address,
    });
  }
  s.formTabs = tabs;
}

function normalizeScreen(raw, moduleId, moduleTitle) {
  const s = { ...raw, moduleId, moduleTitle };
  s.readOnly = s.id === 'depo-bakiye' || s.crud === false;
  s.crud = s.readOnly ? false : (s.crud !== false);

  if (!s.masterFields || !s.masterFields.length) {
    s.masterFields = (s.columns || []).map((c) => ({
      key: c.key,
      label: c.label,
      code: /(kod|_no$|series_code|order_no|requisition_no|order_no|receipt_no)/i.test(c.key),
      name: /(_adi$|description)/i.test(c.key),
    }));
  }
  if (!s.codeField) {
    s.codeField = (s.masterFields.find((f) => f.code) || s.masterFields[0] || {}).key;
  }
  if (!s.nameField) {
    s.nameField = (s.masterFields.find((f) => f.name) || s.masterFields[1] || s.masterFields[0] || {}).key;
  }
  if (!Array.isArray(s.detailFields)) s.detailFields = [];

  // Belge satırları için varsayılan detay
  if (!s.detailFields.length && /satin-alma-talepleri|satin-alma-siparisleri|mal-kabuller|urun-agaci|routings|uretim-emirleri/.test(s.id)) {
    if (s.id === 'urun-agaci') {
      s.detailKey = s.detailKey || 'satirlar';
      s.detailFields = [
        { key: 'component_item_id', label: 'Bileşen stok ID', type: 'number' },
        { key: 'quantity', label: 'Miktar', type: 'number' },
        { key: 'uom_code', label: 'Birim' },
      ];
    } else if (s.id === 'routings') {
      s.detailKey = s.detailKey || 'operasyonlar';
      s.detailFields = [
        { key: 'operation_code', label: 'Operasyon kodu' },
        { key: 'operation_name', label: 'Operasyon adı' },
        { key: 'sure_dk', label: 'Süre (dk)', type: 'number' },
      ];
    } else if (s.id === 'uretim-emirleri') {
      s.detailKey = s.detailKey || 'operasyonlar';
      s.detailFields = [
        { key: 'operation_code', label: 'Operasyon kodu' },
        { key: 'operation_name', label: 'Operasyon adı' },
        { key: 'status', label: 'Durum' },
      ];
    } else {
      s.detailKey = s.detailKey || 'satirlar';
      s.detailFields = [
        { key: 'item_id', label: 'Stok ID', type: 'number' },
        { key: 'quantity', label: 'Miktar', type: 'number' },
        { key: 'uom_code', label: 'Birim' },
      ];
    }
  }

  if (s.detailSlots == null) {
    if (!s.detailFields.length) s.detailSlots = 0;
    else if (s.detailKey === 'item_details' || s.detailKey === 'partner_details') s.detailSlots = 1;
    else s.detailSlots = 3;
  }

  // Satış siparişi kompakt kabuğu → tüm accepted belge ekranları
  applyCompactBelgeShell(s);

  // Elle tanımlı master-grid: master/grid boşsa ekran alanlarından kopyala
  (s.formTabs || []).forEach((tab) => {
    if (tab?.kind !== 'master-grid') return;
    if ((!Array.isArray(tab.masterFields) || !tab.masterFields.length)
        && Array.isArray(s.masterFields) && s.masterFields.length) {
      tab.masterFields = s.masterFields.map((f) => ({ ...f }));
    }
    if (tab.grid
        && (!Array.isArray(tab.grid.fields) || !tab.grid.fields.length)
        && Array.isArray(s.detailFields) && s.detailFields.length) {
      tab.grid.fields = s.detailFields.map((f) => ({ ...f }));
    }
  });

  // Önce başlık↔kalem tekrarını temizle (formTabs’tan önce)
  if (!Array.isArray(s.formTabs) || !s.formTabs.length) {
    dedupeMasterAgainstGrid(s);
  }

  // Tek ekran: master üstte, detay altta (ayrı Master/Detay sekmeleri yok)
  if (!Array.isArray(s.formTabs) || !s.formTabs.length) {
    if (s.detailAsFields && s.detailFields.length) {
      s.formTabs = [{
        id: 'kart',
        label: s.title,
        kind: 'master-detail',
        masterFields: s.masterFields,
        detailFields: s.detailFields,
      }];
    } else if (s.detailFields.length && s.detailSlots) {
      s.formTabs = [{
        id: 'kart',
        label: s.title,
        kind: 'master-grid',
        masterFields: s.masterFields,
        grid: {
          key: s.detailKey || '_detail',
          slots: s.detailSlots,
          fields: s.detailFields,
        },
      }];
    } else {
      s.formTabs = [{
        id: 'kart',
        label: s.title,
        kind: 'fields',
        fields: s.masterFields,
      }];
    }
  } else {
    // Elle / kompakt kabuk formTabs — yine dedupe
    // İş emri gibi Bilgiler + Malzemeler + Rota: başlık stok/quantity/uom_code kalemlerle paylaşılır,
    // dedupe onları başlıktan siler — çok grid’li elle kabukta atla.
    const multiGridShell = (s.formTabs || []).filter((t) => t?.kind === 'grid').length >= 1
      && (s.formTabs || []).some((t) => t?.kind === 'fields');
    if (!multiGridShell) {
      dedupeMasterAgainstGrid(s);
    }
  }

  // fields: null → masterFields / detailFields (iş emri Bilgiler + Rota vb.)
  (s.formTabs || []).forEach((tab) => {
    if (!tab) return;
    if (tab.kind === 'fields' && !Array.isArray(tab.fields)) {
      tab.fields = (s.masterFields || []).map((f) => ({ ...f }));
    }
    if (tab.kind === 'grid' && !Array.isArray(tab.fields)) {
      if (tab.key === s.detailKey || tab.key === 'operasyonlar') {
        tab.fields = (s.detailFields || []).map((f) => ({ ...f }));
      } else {
        tab.fields = [];
      }
    }
  });

  // Aktif checkbox → Pasif (DB is_active kalır; tik = is_inactive)
  const remapAktifToPasif = (fields) => {
    (fields || []).forEach((f) => {
      if (f && f.key === 'is_active' && f.type === 'checkbox' && f.label === 'Aktif') {
        f.label = 'Pasif';
      }
    });
  };
  remapAktifToPasif(s.masterFields);
  remapAktifToPasif(s.detailFields);
  (s.formTabs || []).forEach((tab) => {
    remapAktifToPasif(tab.fields);
    remapAktifToPasif(tab.masterFields);
    remapAktifToPasif(tab.detailFields);
    remapAktifToPasif(tab.grid?.fields);
  });
  (s.columns || []).forEach((c) => {
    if (c.key === 'is_active' && c.label === 'Aktif') c.label = 'Pasif';
  });

  // Tüm listelere firma / iş yeri (+ varsa is_active) filtreleri
  if (!Array.isArray(s.filters)) s.filters = [];
  const firmaLookup = {
    key: 'company_id',
    label: 'Firma',
    type: 'lookup',
    lookup: 'companies',
    valueKey: 'id',
    labelKey: 'company_name',
    codeKey: 'company_code',
  };
  const isYeriLookup = {
    key: 'plant_id',
    label: 'İş yeri',
    type: 'lookup',
    lookup: 'is-yerleri',
    valueKey: 'id',
    labelKey: 'plant_name',
    codeKey: 'plant_code',
  };
  const upgradeOrInject = (keys, def) => {
    if (s.scopeFirma === false && def.key === 'company_id') return;
    if (s.scopeIsYeri === false && def.key === 'plant_id') return;
    const idx = s.filters.findIndex((f) => keys.includes(f.key));
    if (idx >= 0) {
      s.filters[idx] = { ...def, label: s.filters[idx].label || def.label };
    } else {
      s.filters.unshift({ ...def });
    }
  };
  upgradeOrInject(['company_id', 'company_code', 'company_name'], firmaLookup);
  upgradeOrInject(['plant_id', 'plant_code', 'plant_name'], isYeriLookup);

  const hasFilter = (key) => s.filters.some((f) => f.key === key);
  const usesAktif = (
    (s.columns || []).some((c) => c.key === 'is_active')
    || (s.masterFields || []).some((f) => f.key === 'is_active')
    || (s.formTabs || []).some((t) =>
      [...(t.fields || []), ...(t.masterFields || [])].some((f) => f.key === 'is_active'))
  );
  if (usesAktif && !hasFilter('is_active')) {
    s.filters.unshift({ key: 'is_active', label: 'Aktif', type: 'bool' });
  }

  // Serbest metin tanım alanlarını Sabit Tanımlar lookup'ına çevir (tüm ekranlar)
  upgradeTanimLookups(s);

  // Filtreleri form alanlarından zenginleştir (select/lookup → açılır liste)
  enrichFiltersFromForm(s);

  return s;
}

/** Para birimi / ülke / il / ilçe → tanım ekranı lookup */
const TANIM_LOOKUP_BY_KEY = {
  currency_code: {
    type: 'lookup',
    lookup: 'para-birimleri',
    valueKey: 'currency_code',
    labelKey: 'currency_name',
    codeKey: 'currency_code',
  },
  country: {
    type: 'lookup',
    lookup: 'countries',
    valueKey: 'country_code',
    labelKey: 'country_name',
    codeKey: 'country_code',
  },
  ship_country: {
    type: 'lookup',
    lookup: 'countries',
    valueKey: 'country_code',
    labelKey: 'country_name',
    codeKey: 'country_code',
  },
  country_mensei: {
    type: 'lookup',
    lookup: 'countries',
    valueKey: 'country_code',
    labelKey: 'country_name',
    codeKey: 'country_code',
  },
  country_code: {
    type: 'lookup',
    lookup: 'countries',
    valueKey: 'country_code',
    labelKey: 'country_name',
    codeKey: 'country_code',
  },
  il: {
    type: 'lookup',
    lookup: 'cities',
    valueKey: 'city_name',
    labelKey: 'city_name',
    codeKey: 'city_code',
    dependsOn: 'country',
    filterKey: 'country_code',
  },
  sehir: {
    type: 'lookup',
    lookup: 'cities',
    valueKey: 'city_name',
    labelKey: 'city_name',
    codeKey: 'city_code',
    dependsOn: 'country',
    filterKey: 'country_code',
  },
  ship_city: {
    type: 'lookup',
    lookup: 'cities',
    valueKey: 'city_name',
    labelKey: 'city_name',
    codeKey: 'city_code',
    dependsOn: 'ship_country',
    filterKey: 'country_code',
  },
  district: {
    type: 'lookup',
    lookup: 'districts',
    valueKey: 'district_name',
    labelKey: 'district_name',
    codeKey: 'district_code',
    dependsOn: 'il',
    filterKey: 'city_code',
    parentResolveLookup: 'cities',
    parentResolveBy: 'city_name',
    parentResolveTo: 'city_code',
  },
  ship_district: {
    type: 'lookup',
    lookup: 'districts',
    valueKey: 'district_name',
    labelKey: 'district_name',
    codeKey: 'district_code',
    dependsOn: 'ship_city',
    filterKey: 'city_code',
    parentResolveLookup: 'cities',
    parentResolveBy: 'city_name',
    parentResolveTo: 'city_code',
  },
  payment_term_code: {
    type: 'lookup',
    lookup: 'odeme-kosullari',
    valueKey: 'term_code',
    labelKey: 'term_name',
    codeKey: 'term_code',
  },
  delivery_term_code: {
    type: 'lookup',
    lookup: 'teslimat-kosullari',
    valueKey: 'term_code',
    labelKey: 'term_name',
    codeKey: 'term_code',
  },
  dil_code: {
    type: 'lookup',
    lookup: 'languages',
    valueKey: 'dil_code',
    labelKey: 'dil_name',
    codeKey: 'dil_code',
  },
};

function applyTanimLookup(field) {
  if (!field || !field.key) return field;
  const def = TANIM_LOOKUP_BY_KEY[field.key];
  if (!def) return field;
  // select/checkbox/number/date veya zaten doğru lookup ise dokunma (label/required koru)
  if (field.type === 'checkbox' || field.type === 'number' || field.type === 'date' || field.type === 'password') {
    return field;
  }
  if (field.type === 'select' && Array.isArray(field.options) && field.options.length) {
    return field;
  }
  return {
    ...field,
    type: 'lookup',
    lookup: def.lookup,
    valueKey: def.valueKey,
    labelKey: def.labelKey,
    codeKey: def.codeKey,
    dependsOn: def.dependsOn,
    filterKey: def.filterKey,
    parentResolveLookup: def.parentResolveLookup,
    parentResolveBy: def.parentResolveBy,
    parentResolveTo: def.parentResolveTo,
  };
}

/** Ülke adı/kodu → country_code; şehir adı/kodu → city_code */
function resolveCascadeParentValue(field, parentRaw) {
  if (parentRaw === undefined || parentRaw === null || parentRaw === '') return null;
  const raw = String(parentRaw).trim();
  if (!raw) return null;

  if (field.parentResolveLookup) {
    const rows = state.lookupCache[field.parentResolveLookup] || [];
    const by = field.parentResolveBy;
    const to = field.parentResolveTo;
    const hit = rows.find((r) =>
      String(r[by]) === raw
      || String(r[to]) === raw
      || (r.city_code && String(r.city_code) === raw)
      || (r.city_name && String(r.city_name) === raw));
    return hit ? hit[to] : null;
  }

  // ülke: kod veya first_name
  if (field.filterKey === 'country_code') {
    const countries = state.lookupCache.countries || [];
    const hit = countries.find((u) =>
      String(u.country_code) === raw || String(u.country_name) === raw);
    return hit ? hit.country_code : raw;
  }
  return raw;
}

/** Seçili ürün ağacındaki bileşen (ve isteğe bağlı kök) stok id seti */
function bomScopeStokIds(agacId, { includeRoot = false } = {}) {
  if (agacId == null || agacId === '') return null;
  const agac = (state.lookupCache['urun-agaclari'] || [])
    .find((a) => String(a.id) === String(agacId));
  if (!agac) return new Set();
  const ids = new Set();
  if (includeRoot && agac.finished_good_item_id) ids.add(Number(agac.finished_good_item_id));
  const flat = Array.isArray(agac.satirlar) ? agac.satirlar : [];
  flat.forEach((s) => {
    if (s.component_item_id) ids.add(Number(s.component_item_id));
  });
  if (!flat.length && Array.isArray(agac.agac)) {
    const walk = (nodes) => {
      (nodes || []).forEach((n) => {
        if (n.component_item_id) ids.add(Number(n.component_item_id));
        if (n.alt_satirlar?.length) walk(n.alt_satirlar);
      });
    };
    walk(agac.agac);
  }
  return ids;
}

function lookupRowsForField(field, ctx = {}) {
  const all = state.lookupCache[field.lookup] || [];
  let rows = all;

  if (field.filterByBomKey) {
    const bomId = ctx[field.filterByBomKey]
      ?? state.formRecord?.[field.filterByBomKey];
    if (bomId == null || bomId === '') return [];
    const ids = bomScopeStokIds(bomId, { includeRoot: Boolean(field.includeBomRoot) });
    rows = all.filter((r) => ids && ids.has(Number(r.id)));
  }

  if (!field.dependsOn || !field.filterKey) return rows;
  let parentRaw = ctx[field.dependsOn];
  // country boşsa country_code'ya düş (bazı ekranlar ülke kodunu ayrı amount)
  if ((parentRaw === undefined || parentRaw === null || parentRaw === '')
      && field.dependsOn === 'country' && ctx.country_code != null && ctx.country_code !== '') {
    parentRaw = ctx.country_code;
  }
  if ((parentRaw === undefined || parentRaw === null || parentRaw === '')
      && field.dependsOn === 'il' && ctx.sehir != null && ctx.sehir !== '') {
    parentRaw = ctx.sehir;
  }
  const parentVal = resolveCascadeParentValue(field, parentRaw);
  if (!parentVal) return [];
  return rows.filter((r) => String(r[field.filterKey]) === String(parentVal));
}

function lookupOptionSelected(field, row, value) {
  const vk = field.valueKey || 'id';
  const lk = field.labelKey || 'adi';
  const ck = field.codeKey;
  const v = value ?? '';
  return String(v) === String(row[vk])
    || (lk && String(v) === String(row[lk]))
    || (ck && String(v) === String(row[ck]));
}

function buildLookupOptionsHtml(field, value, rows) {
  const vk = field.valueKey || 'id';
  const lk = field.labelKey || 'adi';
  const ck = field.codeKey;
  let emptyLabel = '—';
  if (!(value || rows.length)) {
    if (field.filterByBomKey) emptyLabel = '— önce ürün ağacı —';
    else if (field.dependsOn) emptyLabel = '— önce üst alan —';
  }
  const opts = [`<option value="">${emptyLabel}</option>`].concat(
    rows.map((r) => {
      const val = r[vk];
      // Kod–first_name: select’te kod, title’da tam metin (dar kutu)
      const code = ck ? String(r[ck] || val || '') : '';
      const name = String(r[lk] || '');
      const label = ck ? (code || String(val)) : `${val} — ${name}`;
      const title = ck ? `${code} — ${name}` : label;
      return `<option value="${escAttr(val)}" title="${escAttr(title)}" ${lookupOptionSelected(field, r, value) ? 'selected' : ''}>${label}</option>`;
    })
  );
  return opts.join('');
}

function lookupNameOnly(field, value) {
  if (value === undefined || value === null || value === '') return '';
  const rows = state.lookupCache[field.lookup] || [];
  const vk = field.valueKey || 'id';
  const lk = field.labelKey || 'adi';
  const ck = field.codeKey;
  const hit = rows.find((r) =>
    String(r[vk]) === String(value)
    || (lk && String(r[lk]) === String(value))
    || (ck && String(r[ck]) === String(value)));
  if (!hit) return '';
  return String(hit[lk] || '');
}

function upgradeTanimLookups(screen) {
  const ownCode = screen?.codeField;
  const mapFields = (arr) => {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i += 1) {
      const f = arr[i];
      // Tanım ekranının kendi kod alanı / code:true alanlar manuel kalır
      // (para birimi tanımında currency_code'u kendi tablosundan lookup yapma)
      if (f && (f.code === true || (ownCode && f.key === ownCode) || f.noTanimLookup)) {
        continue;
      }
      arr[i] = applyTanimLookup(f);
    }
  };
  mapFields(screen.masterFields);
  mapFields(screen.detailFields);
  mapFields(screen.filters);
  (screen.formTabs || []).forEach((tab) => {
    mapFields(tab.fields);
    mapFields(tab.headerFields);
    mapFields(tab.masterFields);
    mapFields(tab.detailFields);
    mapFields(tab.grid?.fields);
    mapFields(tab.componentFields);
  });
}

/** Ekrandaki tüm form alanlarını topla */
function collectScreenFormFields(screen) {
  const out = [];
  const push = (arr) => { (arr || []).forEach((f) => { if (f?.key) out.push(f); }); };
  push(screen.masterFields);
  push(screen.detailFields);
  (screen.formTabs || []).forEach((tab) => {
    push(tab.fields);
    push(tab.headerFields);
    push(tab.masterFields);
    push(tab.detailFields);
    push(tab.grid?.fields);
    push(tab.componentFields);
    push(tab.equipmentFields);
  });
  return out;
}

/**
 * Filtrede bilinen seçenekleri açılır liste yap:
 * - formda select ise options kopyala
 * - formda lookup ise filtreyi lookup yap
 * - stage_name / type_name gibi görünen adlar → ilgili lookup
 */
function enrichFiltersFromForm(screen) {
  const fields = collectScreenFormFields(screen);
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));

  (screen.filters || []).forEach((f) => {
    if (!f || f.type === 'lookup' || f.type === 'bool' || f.type === 'date') return;
    if (Array.isArray(f.options) && f.options.length) {
      f.type = f.type || 'select';
      return;
    }

    // Doğrudan aynı key
    const src = byKey[f.key];
    if (src?.type === 'select' && src.options?.length) {
      f.type = 'select';
      f.options = [...src.options];
      return;
    }
    if (src?.type === 'lookup' && src.lookup) {
      f.type = 'lookup';
      f.lookup = src.lookup;
      f.valueKey = src.valueKey || 'id';
      f.labelKey = src.labelKey || 'adi';
      f.codeKey = src.codeKey;
      return;
    }

    // stage_name ← stage_id lookup (değer olarak first_name ile filtrele)
    if (f.key === 'stage_name' && byKey.stage_id?.lookup) {
      const L = byKey.stage_id;
      f.type = 'lookup';
      f.lookup = L.lookup;
      f.valueKey = L.labelKey || 'stage_name';
      f.labelKey = L.labelKey || 'stage_name';
      f.codeKey = L.codeKey || 'stage_code';
      return;
    }
    // faaliyet_tipi_adi ← faaliyet_type_id
    if ((f.key === 'faaliyet_tipi_adi' || f.key === 'type_name') && byKey.faaliyet_type_id?.lookup) {
      const L = byKey.faaliyet_type_id;
      f.type = 'lookup';
      f.lookup = L.lookup;
      f.valueKey = L.labelKey || 'type_name';
      f.labelKey = L.labelKey || 'type_name';
      f.codeKey = L.codeKey || 'type_code';
      return;
    }
    // *_adi görünen first_name + *_id lookup
    const idKey = f.key.replace(/_adi$/, '_id');
    if (idKey !== f.key && byKey[idKey]?.type === 'lookup') {
      const L = byKey[idKey];
      f.type = 'lookup';
      f.lookup = L.lookup;
      f.valueKey = L.labelKey || 'adi';
      f.labelKey = L.labelKey || 'adi';
      f.codeKey = L.codeKey;
    }
  });
}

const ALL_SCREENS = MODULES.flatMap((m) =>
  m.screens.map((s) => normalizeScreen(s, m.id, m.title))
);

const MODE_LABELS = {
  yeni: 'Yeni',
  incele: 'İncele',
  duzelt: 'Düzelt',
  kopyala: 'Kopyala',
};

const state = {
  screenId: null,
  rows: [],
  filtered: [],
  filterState: {},
  selectedId: null,
  formMode: null,
  formRecord: null,
  formNumeratorSeri: null,
  detailRows: [],
  openTabs: [],
  activeTabKey: null,
  /** Alt sekme şeridi varsayılan açık; kullanıcı kapatırsa false */
  docTabsPreferOpen: true,
  formContext: null,
  formActiveTab: null,
  lookupCache: {},
  formSeq: 0,
  gridSel: { key: null, idx: null },
  treeSel: null,
  treeExpanded: {},
  flowSel: null,
  flowCompSel: null,
  flowEquipSel: null,
  rotaShowPlanlama: false,
  rotaShowAdvanced: false,
  sidebarOpen: {},
  sidebarSectionOpen: {},
  yetkiModOpen: {},
  tabCtxKey: null,
  nestedLink: null, // { fromScreenId, fromId, convertPath, bodyKey, extra }
  mrpCalismaId: null,
  formSolo: false, // ?view=form — yeni sekmede tam ekran form (sol menü yok)
  formPrefill: null,
  session: null,
  companies: [],
  activeFirmaId: null,
  activeIsYeriId: null,
  isYerleri: [],
};

/** Bağlı ekran ön doldurma haritası */
function buildLinkedPrefill(link, sourceRec, extra = {}) {
  if (link === 'teklif-siparis') {
    return {
      partner_id: sourceRec.partner_id,
      order_type: 'SatisSiparis',
      status: 'Onayli',
      currency_code: sourceRec.currency_code || 'TRY',
      exchange_rate: sourceRec.exchange_rate ?? 1,
      rate_type: sourceRec.rate_type || 'TCMB-SATIS',
      project_code: sourceRec.project_code || null,
      region: sourceRec.region || null,
      company_id: sourceRec.company_id || null,
      plant_id: sourceRec.plant_id || null,
      warehouse_id: sourceRec.warehouse_id || null,
      payment_term_code: sourceRec.payment_term_code || null,
      payment_method: sourceRec.payment_method || null,
      delivery_term_code: sourceRec.delivery_term_code || null,
      delivery_date: sourceRec.delivery_date || null,
      public_note: sourceRec.public_note || null,
      internal_note: sourceRec.internal_note || null,
      quotation_id: sourceRec.id,
      order_source: 'Teklif',
      source_document_type: 'SATIS_TEKLIF',
      source_document_id: sourceRec.id,
      description: `Teklif ${sourceRec.quotation_no || sourceRec.id}`,
      kalemler: (sourceRec.satirlar || sourceRec.kalemler || []).map((s, i) => ({
        line_no: s.line_no || i + 1,
        line_type: s.line_type || 'S',
        item_id: s.item_id,
        quantity: s.quantity,
        unit_price: s.unit_price,
        uom_code: s.uom_code,
        stock_uom: s.uom_code,
        currency_code: s.currency_code || sourceRec.currency_code || null,
        exchange_rate: s.exchange_rate ?? sourceRec.exchange_rate ?? 1,
        rate_type: s.rate_type || sourceRec.rate_type || null,
        discount_rate: s.discount_rate ?? 0,
        discount_rate_2: s.discount_rate_2 ?? 0,
        discount_rate_3: s.discount_rate_3 ?? 0,
        vat_rate: s.vat_rate ?? 20,
        vat_mode: s.vat_mode || 'Haric',
        delivery_date: s.delivery_date || sourceRec.delivery_date || null,
        warehouse_id: s.warehouse_id || sourceRec.warehouse_id || null,
        project_code: s.project_code || sourceRec.project_code || null,
        region: s.region || sourceRec.region || null,
        line_description: s.line_description || null,
        quotation_line_id: s.id,
      })),
    };
  }
  if (link === 'sa-teklif-siparis') {
    return {
      partner_id: sourceRec.partner_id,
      quotation_id: sourceRec.id,
      requisition_id: sourceRec.requisition_id || null,
      status: 'Onayli',
      currency_code: sourceRec.currency_code || 'TRY',
      exchange_rate: sourceRec.exchange_rate ?? 1,
      rate_type: sourceRec.rate_type || 'TCMB-ALIS',
      company_id: sourceRec.company_id || null,
      plant_id: sourceRec.plant_id || null,
      project_code: sourceRec.project_code || null,
      region: sourceRec.region || null,
      payment_term_code: sourceRec.payment_term_code || null,
      public_note: sourceRec.public_note || null,
      internal_note: sourceRec.internal_note || null,
      source_document_type: 'SATINALMA_TEKLIF',
      source_document_id: sourceRec.id,
      description: `Teklif ${sourceRec.quotation_no || sourceRec.id}`,
      satirlar: (sourceRec.satirlar || []).map((s, i) => ({
        line_no: s.line_no || i + 1,
        line_type: s.line_type || 'S',
        item_id: s.item_id,
        quantity: s.quantity,
        uom_code: s.uom_code,
        unit_price: s.unit_price ?? 0,
        currency_code: s.currency_code || sourceRec.currency_code || null,
        exchange_rate: s.exchange_rate ?? sourceRec.exchange_rate ?? 1,
        rate_type: s.rate_type || sourceRec.rate_type || null,
        discount_rate: s.discount_rate ?? 0,
        discount_rate_2: s.discount_rate_2 ?? 0,
        discount_rate_3: s.discount_rate_3 ?? 0,
        vat_rate: s.vat_rate ?? 20,
        vat_mode: s.vat_mode || 'Haric',
        delivery_date: s.delivery_date || null,
        project_code: s.project_code || sourceRec.project_code || null,
        region: s.region || sourceRec.region || null,
        line_description: s.line_description || null,
        quotation_line_id: s.id,
      })),
    };
  }
  if (link === 'mal-kabul-fatura') {
    return {
      partner_id: sourceRec.partner_id || null,
      invoice_type: 'Alis',
      goods_receipt_id: sourceRec.id,
      sales_order_id: sourceRec.purchase_order_id || sourceRec.sales_order_id || null,
      currency_code: sourceRec.currency_code || 'TRY',
      exchange_rate: 1,
      rate_type: 'TCMB-ALIS',
      project_code: sourceRec.project_code || null,
      internal_note: sourceRec.internal_note || null,
      source_document_type: 'MAL_KABUL',
      source_document_id: sourceRec.id,
      description: `Mal kabul ${sourceRec.receipt_no || sourceRec.id}`,
      kalemler: (sourceRec.satirlar || []).map((s, i) => ({
        line_no: s.line_no || i + 1,
        item_id: s.item_id,
        quantity: s.accepted_flag ?? s.quantity,
        uom_code: s.uom_code,
        unit_price: s.unit_price ?? 0,
        vat_rate: s.vat_rate ?? 20,
        vat_mode: s.vat_mode || 'Haric',
        discount_rate: s.discount_rate ?? 0,
        line_description: s.line_description || null,
      })),
    };
  }
  if (link === 'siparis-sevk') {
    return {
      sales_order_id: sourceRec.id,
      partner_id: sourceRec.partner_id,
      warehouse_id: extra.warehouse_id || null,
      ship_to_address: sourceRec.ship_to_address || '',
      status: 'Onayli',
      source_document_type: 'SATIS_SIPARIS',
      source_document_id: sourceRec.id,
      description: `Sipariş ${sourceRec.order_no || sourceRec.id}`,
      satirlar: (sourceRec.kalemler || sourceRec.satirlar || [])
        .filter((k) => k.item_id && Number(k.kalan_sevk_miktar ?? k.quantity) > 0)
        .map((k, i) => ({
          line_no: i + 1,
          item_id: k.item_id,
          sales_order_line_id: k.id,
          quantity: Number(k.kalan_sevk_miktar ?? k.quantity),
          uom_code: k.stock_uom || k.uom_code || null,
        })),
    };
  }
  if (link === 'sevk-irsaliye') {
    return {
      partner_id: sourceRec.partner_id,
      warehouse_id: extra.warehouse_id || sourceRec.warehouse_id,
      sales_order_id: sourceRec.sales_order_id,
      shipment_order_id: sourceRec.id,
      ship_to_address: sourceRec.ship_to_address,
      ship_city: sourceRec.ship_city,
      ship_district: sourceRec.ship_district,
      ship_country: sourceRec.ship_country || 'TR',
      ship_postal_code: sourceRec.ship_postal_code,
      vehicle_plate: extra.vehicle_plate || null,
      driver_name: extra.driver_name || null,
      driver_last_name: extra.driver_last_name || null,
      driver_national_id: extra.driver_national_id || null,
      carrier_title: extra.carrier_title || null,
      carrier_tax_id: extra.carrier_tax_id || null,
      status: 'Taslak',
      source_document_type: 'SEVK_EMRI',
      source_document_id: sourceRec.id,
      description: `Sevk ${sourceRec.shipment_no || sourceRec.id}`,
      satirlar: (sourceRec.satirlar || []).map((s, i) => ({
        line_no: s.line_no || i + 1,
        item_id: s.item_id,
        quantity: s.quantity,
        uom_code: s.uom_code,
        ship_emri_line_id: s.id,
        sales_order_line_id: s.sales_order_line_id,
      })),
    };
  }
  if (link === 'irsaliye-fatura') {
    return {
      partner_id: sourceRec.partner_id,
      invoice_type: 'Satis',
      scenario: 'TICARIFATURA',
      invoice_category: 'SATIS',
      currency_code: 'TRY',
      delivery_note_id: sourceRec.id,
      sales_order_id: sourceRec.sales_order_id,
      ship_to_address: sourceRec.ship_to_address,
      status: 'Taslak',
      source_document_type: 'IRSALIYE',
      source_document_id: sourceRec.id,
      description: `İrsaliye ${sourceRec.delivery_note_no || sourceRec.id}`,
      kalemler: (sourceRec.satirlar || []).map((s, i) => ({
        line_no: s.line_no || i + 1,
        item_id: s.item_id,
        quantity: s.quantity,
        uom_code: s.uom_code,
        unit_price: 0,
        vat_rate: 20,
        delivery_line_id: s.id,
        sales_order_line_id: s.sales_order_line_id,
      })),
    };
  }
  if (link === 'firsat-teklif') {
    return {
      partner_id: sourceRec.partner_id || extra.partner_id || null,
      firsat_id: sourceRec.id,
      lead_id: sourceRec.lead_id || null,
      currency_code: sourceRec.currency_code || 'TRY',
      status: 'Taslak',
      source_document_type: 'CRM_FIRSAT',
      source_document_id: sourceRec.id,
      description: `Fırsat ${sourceRec.firsat_code || sourceRec.id}`,
      satirlar: (sourceRec.satirlar || []).map((s, i) => ({
        line_no: s.line_no || i + 1,
        item_id: s.item_id,
        quantity: s.quantity,
        uom_code: s.uom_code,
        unit_price: s.unit_price || 0,
        vat_rate: 20,
      })),
    };
  }
  return { ...extra };
}

async function openLinkedForm({ targetScreenId, link, sourceRec, convertAct, extra = {} }) {
  const target = findScreen(targetScreenId);
  if (!target) {
    toast('Hedef ekran bulunamadı.');
    return;
  }
  const prefill = buildLinkedPrefill(link, sourceRec, extra);
  persistActiveFormTab();

  state.nestedLink = {
    fromScreenId: state.screenId,
    fromId: sourceRec.id,
    link,
    convertPath: convertAct.path,
    bodyKey: convertAct.bodyKey || null,
    extra,
  };

  // Hedef ekranı "Yeni" gibi aç, prefill bas
  state.screenId = target.id;
  state.formMode = 'yeni';
  state.formActiveTab = target.formTabs?.[0]?.id || null;
  state.gridSel = { key: null, idx: null };
  await ensureLookups(target);

  let record = { ...(target.defaults || {}), ...prefill };
  collectTabFields(target).forEach((f) => {
    if (record[f.key] !== undefined) return;
    if (f.type === 'checkbox') record[f.key] = f.key === 'is_inactive' ? false : true;
    else if (f.type === 'select') record[f.key] = f.options?.[0] || '';
    else if (f.key === 'company_id' && getActiveFirmaId()) record[f.key] = getActiveFirmaId();
    else if (f.key === 'plant_id' && state.activeIsYeriId) record[f.key] = state.activeIsYeriId;
    else record[f.key] = '';
  });
  const seri = resolveNumeratorSeri(target, record);
  if (seri && target.codeField) {
    try {
      record[target.codeField] = await ayirKod(seri);
      state.formNumeratorSeri = seri;
    } catch (err) { toast(err.message); }
  } else {
    state.formNumeratorSeri = null;
  }
  // grid satırlarını normalize et
  (target.formTabs || []).forEach((tab) => {
    if (tab.kind === 'master-grid') {
      const gkey = tab.grid?.key || '_detail';
      const gtab = { key: gkey, fields: tab.grid?.fields || [] };
      const raw = Array.isArray(record[gkey]) ? record[gkey] : [];
      record[gkey] = normalizeGridRows(gtab, raw);
    }
    if (tab.kind === 'grid') {
      const raw = Array.isArray(record[tab.key]) ? record[tab.key] : [];
      record[tab.key] = normalizeGridRows(tab, raw);
    }
  });

  state.formRecord = record;
  addFormTab(target, 'yeni', record);
  showView('form');
  ensureSearchBarVisible();
  $('#screenTitle').textContent = `${target.title} · Yeni (bağlı)`;
  renderForm(target);
  renderSidebar();
  renderTabBar();
  playNestedEnterAnimation();
}

const $ = (sel) => document.querySelector(sel);

function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2800);
}

function screenApiBase(endpoint) {
  if (!endpoint) return endpoint;
  const q = endpoint.indexOf('?');
  return q >= 0 ? endpoint.slice(0, q) : endpoint;
}

function getActiveFirmaId() {
  if (state.activeFirmaId) return state.activeFirmaId;
  const stored = Number(localStorage.getItem('ktb_firma_id') || 0);
  return stored > 0 ? stored : null;
}

async function api(path, options = {}) {
  let res;
  try {
    const kullaniciKodu = (typeof localStorage !== 'undefined' && localStorage.getItem('ktb_kullanici_kodu')) || '';
    const accessToken = (typeof localStorage !== 'undefined' && localStorage.getItem('ktb_access_token')) || '';
    const firmaId = getActiveFirmaId();
    const { headers: optHeaders, skipFirma = false, ...restOpts } = options;
    // skipFirma / boş X-Firma-Id → org tanım listelerinde tüm firmalar
    const headerFirma = optHeaders && Object.prototype.hasOwnProperty.call(optHeaders, 'X-Firma-Id')
      ? null
      : (skipFirma ? null : firmaId);
    res = await fetch(path, {
      ...restOpts,
      headers: {
        'Content-Type': 'application/json',
        ...(kullaniciKodu ? { 'X-Kullanici-Kodu': kullaniciKodu } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(headerFirma ? { 'X-Firma-Id': String(headerFirma) } : {}),
        ...(optHeaders || {}),
      },
    });
  } catch (netErr) {
    const origin = typeof location !== 'undefined' ? location.origin : '';
    const err = new Error(
      `API'ye ulaşılamadı (${path}). Sayfayı http://localhost:3000 üzerinden açın; sunucu kapalıysa yeniden başlatın.`
    );
    err.cause = netErr;
    err.status = 0;
    err.origin = origin;
    throw err;
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { /* ignore */ }
  if (!res.ok) {
    const msg = (data && (data.hata || data.detay)) || text || res.statusText;
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    err.payload = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Dönüşüm / onay diyaloğu (P04 depo seçimi, P31 prompt kaldır) */
let _cvtResolve = null;

function showConvertWarn(text) {
  const w = $('#cvtWarn');
  if (!w) return;
  w.hidden = !text;
  w.textContent = text || '';
}

function closeConvertDialog(value) {
  const overlay = $('#convertDialog');
  if (overlay) overlay.hidden = true;
  showConvertWarn('');
  const okBtn = $('#cvtOk');
  if (okBtn) {
    okBtn.disabled = false;
    okBtn.textContent = 'Devam';
  }
  if (_cvtResolve) {
    const r = _cvtResolve;
    _cvtResolve = null;
    r(value);
  }
}

/** Oluşturulan kaydı hedef ekranda düzelt/incele modunda aç */
async function openRecordById(screenId, id, mode = 'duzelt') {
  const target = findScreen(screenId);
  if (!target || id == null) {
    toast('Hedef kayıt açılamadı.');
    return;
  }
  state.nestedLink = null;
  state.screenId = target.id;
  const row = { id: Number(id) || id };
  state.rows = [row];
  state.filtered = [row];
  state.selectedId = row.id;
  await openForm(mode, { inPlace: true });
}

async function openConvertDialog(act, rec, kind) {
  const dialog = act.dialog;
  if (!dialog) return {};

  const overlay = $('#convertDialog');
  const body = $('#cvtBody');
  const title = $('#cvtTitle');
  const okBtn = $('#cvtOk');
  if (!overlay || !body || !title) return {};

  title.textContent = act.label || 'Dönüşüm';
  showConvertWarn('');

  const warehouses = await api('/warehouses').catch(() => []);
  const depoOpts = (warehouses || []).map((d) =>
    `<option value="${d.id}" ${Number(d.id) === Number(rec.warehouse_id) ? 'selected' : ''}>${d.warehouse_code} — ${d.warehouse_name}</option>`
  ).join('');

  if (dialog === 'depo') {
    body.innerHTML = `
      <p>Sevk emri için çıkış deposunu seçin. Açık sipariş miktarları kullanılır.</p>
      <label>Depo
        <select id="cvtDepo">${depoOpts || '<option value="">Depo yok</option>'}</select>
      </label>`;
  } else if (dialog === 'irsaliye') {
    body.innerHTML = `
      <p>Sevk emrinden irsaliye. Depo ve taşıyıcı bilgilerini girin.</p>
      <label>Depo
        <select id="cvtDepo">${depoOpts || '<option value="">Depo yok</option>'}</select>
      </label>
      <label>Araç plaka <input id="cvtPlaka" value="${rec.vehicle_plate || ''}" /></label>
      <label>Şoför adı <input id="cvtSoforAdi" value="${rec.driver_name || ''}" /></label>
      <label>Şoför soyadı <input id="cvtSoforSoyadi" value="${rec.driver_last_name || ''}" /></label>
      <label>Şoför TCKN <input id="cvtSoforTckn" value="${rec.driver_national_id || ''}" /></label>
      <label>Taşıyıcı ünvan <input id="cvtTasiyici" value="${rec.carrier_title || ''}" /></label>
      <label>Taşıyıcı VKN <input id="cvtTasiyiciVkn" value="${rec.carrier_tax_id || ''}" /></label>`;
  } else if (dialog === 'onay-depo') {
    body.innerHTML = `
      <p>İrsaliye onayı stok çıkışı yapar. Depo bakiyesini doğrulayın.</p>
      <label>Depo
        <select id="cvtDepo">${depoOpts || '<option value="">Depo yok</option>'}</select>
      </label>
      <button type="button" class="btn ghost" id="cvtCheckDepo">Bakiyeyi kontrol et</button>`;
  } else if (dialog === 'firsat-kapat') {
    body.innerHTML = `
      <p>Fırsatı kapatın. Sonuç aşamayı ve kapanış tarihini günceller.</p>
      <label>Sonuç
        <select id="cvtFirsatSonuc">
          <option value="Kazanildi">Kazanıldı</option>
          <option value="Kaybedildi">Kaybedildi</option>
        </select>
      </label>
      <label>Kapanış nedeni <input id="cvtFirsatNeden" /></label>`;
  } else if (dialog === 'fatura-olustur') {
    body.innerHTML = `
      <p>İrsaliyeden satış faturası oluşturulacak. Numaratörden fatura numarası ayrılıyor…</p>
      <label>Fatura no
        <input id="cvtFaturaNo" readonly value="" placeholder="Yükleniyor…" />
      </label>
      <p class="cvt-hint">Onayladığınızda fatura kaydı oluşur ve fatura ekranına yönlendirilirsiniz.</p>`;
    if (okBtn) okBtn.textContent = 'Fatura Oluştur';
  } else {
    return {};
  }

  overlay.hidden = false;

  if (dialog === 'fatura-olustur') {
    try {
      const kod = await ayirKod('FATURA');
      const inp = $('#cvtFaturaNo');
      if (inp) inp.value = kod;
      body.querySelector('p') && (body.querySelector('p').textContent =
        'İrsaliyeden satış faturası oluşturulacak. Aşağıdaki numara FATURA numaratöründen ayrıldı.');
    } catch (e) {
      showConvertWarn(e.message || 'Numaratörden fatura numarası alınamadı.');
      if (okBtn) okBtn.disabled = true;
    }
  }

  const checkBtn = $('#cvtCheckDepo');
  if (checkBtn) {
    checkBtn.onclick = async () => {
      const depoId = Number($('#cvtDepo')?.value || rec.warehouse_id);
      try {
        const k = await api(`/delivery_notes/${rec.id}/depo-kontrol?warehouse_id=${depoId}`);
        if (k.accepted) showConvertWarn('Depo bakiyesi yeterli.');
        else {
          const det = (k.satirlar || []).filter((s) => !s.yeterli).map((s) => {
            const onr = (s.onerilen_depolar || []).map((o) => `${o.warehouse_code}(${o.bakiye})`).join(', ') || '—';
            return `${s.item_code}: bakiye ${s.bakiye} / gereken ${s.quantity} → ${onr}`;
          }).join('\n');
          showConvertWarn(det || 'Yetersiz stok.');
        }
      } catch (e) {
        showConvertWarn(e.message);
      }
    };
  }

  return new Promise((resolve) => {
    _cvtResolve = resolve;
    if (okBtn && dialog !== 'fatura-olustur') okBtn.disabled = false;
    okBtn.onclick = () => {
      if (dialog === 'firsat-kapat') {
        const result = $('#cvtFirsatSonuc')?.value || 'Kazanildi';
        closeConvertDialog({
          result,
          closed_nedeni: $('#cvtFirsatNeden')?.value || null,
        });
        return;
      }
      if (dialog === 'fatura-olustur') {
        const faturaNo = String($('#cvtFaturaNo')?.value || '').trim();
        if (!faturaNo) {
          showConvertWarn('Fatura numarası henüz hazır değil.');
          return;
        }
        closeConvertDialog({ invoice_no: faturaNo });
        return;
      }
      const depoId = Number($('#cvtDepo')?.value || 0);
      if ((dialog === 'depo' || dialog === 'irsaliye' || dialog === 'onay-depo') && !depoId) {
        showConvertWarn('Depo seçimi zorunlu.');
        return;
      }
      const payload = { warehouse_id: depoId };
      if (dialog === 'irsaliye') {
        payload.vehicle_plate = $('#cvtPlaka')?.value || null;
        payload.driver_name = $('#cvtSoforAdi')?.value || null;
        payload.driver_last_name = $('#cvtSoforSoyadi')?.value || null;
        payload.driver_national_id = $('#cvtSoforTckn')?.value || null;
        payload.carrier_title = $('#cvtTasiyici')?.value || null;
        payload.carrier_tax_id = $('#cvtTasiyiciVkn')?.value || null;
      }
      closeConvertDialog(payload);
    };
  });
}

function norm(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'evet' : 'hayir';
  return String(v).trim().toLocaleLowerCase('tr');
}

function resolveFilterCell(row, def, screen) {
  if (!def) return row?.[def?.key];
  if (def.key === 'company_id') {
    if (row.company_id != null && row.company_id !== '') return row.company_id;
    if (screen?.id === 'companies') return row.id;
    if (row.company_code && state.companies?.length) {
      const f = state.companies.find((x) => x.company_code === row.company_code);
      if (f) return f.id;
    }
    return null;
  }
  if (def.key === 'plant_id') {
    if (row.plant_id != null && row.plant_id !== '') return row.plant_id;
    if (screen?.id === 'is-yerleri') return row.id;
    return null;
  }
  return row[def.key];
}

function compareValues(cell, op, a, b, def) {
  // Ortak tanımlarda firma/iş yeri yoksa filtreyi geç
  if ((def?.key === 'company_id' || def?.key === 'plant_id')
    && (cell === null || cell === undefined || cell === '')) {
    return true;
  }
  // Boş operatör satırı = filtresiz
  if (!op) return true;

  const cellN = norm(cell);
  const aN = norm(a);
  const bN = norm(b);
  // Varsayılan: LIKE '%değer%' (büyük/küçük harf TR locale ile)
  if (op === 'icerir') return !aN || cellN.includes(aN);
  if (op === 'esit') return !aN || cellN === aN;
  if (op === 'esit_degil') return !aN || cellN !== aN;
  if (op === 'arasinda') {
    if (!aN && !bN) return true;
    if (aN && cellN < aN) return false;
    if (bN && cellN > bN) return false;
    return true;
  }
  return true;
}

function filterStateIsActive(st) {
  if (!st) return false;
  const op = st.op || '';
  if (!op) return false; // boş satır = filtresiz
  if (op === 'arasinda') return Boolean(norm(st.a) || norm(st.b));
  return Boolean(norm(st.a));
}

function applyFilters(rows, screen) {
  const active = screen.filters
    .filter((f) => !f.queryParam) // sunucu filtreleri satır alanı değil
    .map((f) => ({ def: f, st: state.filterState[f.key] || { op: '', a: '', b: '' } }))
    .filter(({ st }) => filterStateIsActive(st));
  if (!active.length) return rows.slice();
  return rows.filter((row) =>
    active.every(({ def, st }) =>
      compareValues(resolveFilterCell(row, def, screen), st.op, st.a, st.b, def))
  );
}

/** Eski ekran id → yeni kanonik id (menü birleştirmesi sonrası geriye uyum) */
const SCREEN_ALIASES = {
  delivery_notes: 'irsaliye-yonetimi',
  'satis-faturalari': 'fatura-yonetimi',
  'alis-faturalari': 'fatura-yonetimi',
  'belge-yonetimi': 'fatura-yonetimi',
  sales_orders: 'satis-siparisleri',
};

function resolveScreenId(id) {
  if (!id) return id;
  return SCREEN_ALIASES[id] || id;
}

function findScreen(id) {
  const resolved = resolveScreenId(id);
  return ALL_SCREENS.find((s) => s.id === resolved) || null;
}

function isIrsaliyeYonetimiScreen(screenOrId) {
  const id = typeof screenOrId === 'string' ? screenOrId : screenOrId?.id;
  return resolveScreenId(id) === 'irsaliye-yonetimi';
}

function isFaturaYonetimiScreen(screenOrId) {
  const id = typeof screenOrId === 'string' ? screenOrId : screenOrId?.id;
  return resolveScreenId(id) === 'fatura-yonetimi';
}

function selectedRow() {
  return state.filtered.find((r, i) => String(rowKey(r, i)) === String(state.selectedId)) || null;
}

function resolveNumeratorSeri(screen, record = {}) {
  if (screen.numeratorFromField) {
    const val = record[screen.numeratorFromField.field];
    if (val == null || val === '') return null;
    return screen.numeratorFromField.map[val] || screen.numeratorSeri;
  }
  return screen.numeratorSeri;
}

async function ayirKod(seriKodu) {
  if (!seriKodu) throw new Error('Bu ekran için numaratör bağlı değil.');
  const data = await api(`/kod-serileri/${encodeURIComponent(seriKodu)}/ayir`, { method: 'POST' });
  return data.kod;
}

/** Tip/tür değişince (Yeni/Kopyala) ilgili seriden yeni kod üret. */
async function refreshCodeFromNumeratorField(force = false) {
  const screen = findScreen(state.screenId);
  if (!screen?.numeratorFromField || !screen.codeField) return;
  if (state.formMode !== 'yeni' && state.formMode !== 'kopyala') return;
  const tipKey = screen.numeratorFromField.field;
  const tipEl = findAttrControl('data-master', tipKey);
  const tipVal = tipEl ? tipEl.value : state.formRecord?.[tipKey];
  if (tipVal == null || tipVal === '') return;
  if (state.formRecord) state.formRecord[tipKey] = tipVal;
  const seri = resolveNumeratorSeri(screen, { ...(state.formRecord || {}), [tipKey]: tipVal });
  if (!seri) return;
  if (!force && state.formNumeratorSeri === seri && state.formRecord?.[screen.codeField]) return;
  try {
    const kod = await ayirKod(seri);
    if (!state.formRecord) state.formRecord = {};
    state.formRecord[screen.codeField] = kod;
    state.formNumeratorSeri = seri;
    const codeEl = findAttrControl('data-master', screen.codeField);
    if (codeEl) codeEl.value = kod;
  } catch (err) {
    toast(err.message || String(err));
  }
}

function bindNumeratorFieldListener(screen) {
  if (!screen?.numeratorFromField) return;
  if (state.formMode !== 'yeni' && state.formMode !== 'kopyala') return;
  const tipKey = screen.numeratorFromField.field;
  const tipControls = [
    ...document.querySelectorAll(`input[type="radio"][data-master="${tipKey}"]`),
  ];
  const tipEl = tipControls[0] || findAttrControl('data-master', tipKey);
  if (!tipEl || tipEl.dataset.numeratorBound === '1') return;
  tipEl.dataset.numeratorBound = '1';
  const onChange = () => { refreshCodeFromNumeratorField(true); };
  if (tipControls.length) tipControls.forEach((r) => r.addEventListener('change', onChange));
  else tipEl.addEventListener('change', onChange);
}

function showView(name) {
  const home = $('#viewHome');
  const screen = $('#viewScreen');
  const form = $('#viewForm');
  const meta = $('#viewMeta');
  const sql = $('#viewSql');
  if (!home || !screen || !form) {
    console.error('KTB ERP: view element missing', { home: !!home, screen: !!screen, form: !!form });
    return;
  }

  home.hidden = name !== 'home';
  screen.hidden = name !== 'screen';
  form.hidden = name !== 'form';
  if (meta) meta.hidden = name !== 'meta';
  if (sql) sql.hidden = name !== 'sql';

  home.style.display = name === 'home' ? 'grid' : 'none';
  screen.style.display = name === 'screen' ? 'grid' : 'none';
  form.style.display = name === 'form' ? 'flex' : 'none';
  if (meta) meta.style.display = name === 'meta' ? 'grid' : 'none';
  if (sql) sql.style.display = name === 'sql' ? 'grid' : 'none';
}


function setDocTabsOpen(open) {
  const want = !!open && (state.openTabs?.length > 0);
  document.body.classList.toggle('doc-tabs-open', want);
  const bar = $('#tabBar');
  if (bar) {
    bar.hidden = !want;
    if (!state.openTabs?.length) bar.innerHTML = '';
  }
  const btn = $('#btnOpenTabs');
  if (btn) {
    btn.setAttribute('aria-expanded', want ? 'true' : 'false');
    btn.title = want ? 'Açık sekmeleri gizle' : 'Açık sekmeleri göster';
    btn.setAttribute('aria-label', btn.title);
    btn.disabled = !(state.openTabs?.length > 0);
  }
}

/** Alt sekme şeridi: varsayılan açık; kullanıcı isteğe göre kapatır. */
function toggleDocTabs() {
  const next = !document.body.classList.contains('doc-tabs-open');
  state.docTabsPreferOpen = next;
  setDocTabsOpen(next);
}

const TAB_GLYPH_LIST = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3.5" width="9" height="9" rx="1.3"/><path d="M7.5 2h5.2a1.3 1.3 0 0 1 1.3 1.3V10"/></svg>`;
const TAB_GLYPH_FORM = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round" aria-hidden="true"><rect x="1.5" y="4" width="8.5" height="8.5" rx="1.2"/><rect x="4.5" y="2" width="8.5" height="8.5" rx="1.2"/><path d="M7.2 7.8h4M9.2 5.8v4" stroke-linecap="round"/></svg>`;

function renderTabBar() {
  const bar = $('#tabBar');
  if (!bar) return;
  if (!state.openTabs.length) {
    bar.innerHTML = '';
    bar.hidden = true;
    hideTabContextMenu();
    setDocTabsOpen(false);
    return;
  }
  bar.innerHTML = state.openTabs.map((t) => {
    const isForm = t.kind === 'form';
    const kind = isForm ? (MODE_LABELS[t.formMode] || 'Form') : 'Liste';
    const active = t.key === state.activeTabKey ? ' active' : '';
    const glyph = isForm ? TAB_GLYPH_FORM : TAB_GLYPH_LIST;
    return `
    <button type="button" class="tab-item ${isForm ? 'tab-form' : 'tab-list'}${active}" data-tab-key="${t.key}" title="${escapeAttr(t.title)}" aria-current="${t.key === state.activeTabKey ? 'page' : 'false'}">
      <span class="tab-glyph">${glyph}</span>
      <span class="tab-kind">${kind}</span>
      <span class="tab-title">${escapeHtml(t.title)}</span>
      <span class="tab-close" data-tab-close-key="${t.key}" title="Sekmeyi kapat" aria-label="Sekmeyi kapat">×</span>
    </button>`;
  }).join('');
  // Varsayılan açık; kullanıcı gizlediyse (docTabsPreferOpen=false) kapalı kalır
  if (state.docTabsPreferOpen === undefined) state.docTabsPreferOpen = true;
  setDocTabsOpen(state.docTabsPreferOpen !== false);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

function hideTabContextMenu() {
  const menu = $('#tabCtxMenu');
  if (menu) menu.hidden = true;
  state.tabCtxKey = null;
  const listMenu = $('#listCtxMenu');
  if (listMenu) listMenu.hidden = true;
  const formMenu = $('#formCtxMenu');
  if (formMenu) formMenu.hidden = true;
}

/**
 * Belge zinciri: kaynak (önceki) + sonraki işlem bağlantıları.
 * enabled=false → menüde disable görünür.
 */
const BELGE_BAGLANTI = {
  'satin-alma-talepleri': {
    kaynaklar: [],
    sonrakiler: [
      { id: 'sa-teklif', label: 'Satınalma teklifi', screenId: 'satin-alma-teklifleri', findBy: ['requisition_id'] },
      { id: 'sa-siparis', label: 'Satınalma siparişi', screenId: 'satin-alma-siparisleri', findBy: ['requisition_id'] },
    ],
  },
  'satin-alma-teklifleri': {
    kaynaklar: [
      { id: 'talep', label: 'Satınalma talebi (kaynak)', field: 'requisition_id', screenId: 'satin-alma-talepleri' },
    ],
    sonrakiler: [
      { id: 'sa-siparis', label: 'Satınalma siparişi', screenId: 'satin-alma-siparisleri', findBy: ['quotation_id'] },
    ],
  },
  'satin-alma-siparisleri': {
    kaynaklar: [
      { id: 'talep', label: 'Satınalma talebi (kaynak)', field: 'requisition_id', screenId: 'satin-alma-talepleri' },
      { id: 'teklif', label: 'Satınalma teklifi (kaynak)', field: 'quotation_id', screenId: 'satin-alma-teklifleri' },
    ],
    sonrakiler: [
      {
        id: 'mal-kabul',
        label: 'Mal kabul',
        screenId: 'mal-kabuller',
        findBy: ['purchase_order_id', 'sales_order_id'],
      },
    ],
  },
  'mal-kabuller': {
    kaynaklar: [
      { id: 'sa-siparis', label: 'Satınalma siparişi (kaynak)', field: 'purchase_order_id', altFields: ['sales_order_id'], screenId: 'satin-alma-siparisleri' },
      { id: 'ted-irs', label: 'Tedarikçi irsaliyesi (kaynak)', field: 'vendor_delivery_note_id', screenId: 'tedarikci-irsaliyeleri' },
    ],
    sonrakiler: [
      {
        id: 'giris-kontrol',
        label: 'Giriş kontrol',
        screenId: 'giris-kontrolleri',
        findBy: ['goods_receipt_id'],
      },
      {
        id: 'alis-fatura',
        label: 'Alış faturası',
        screenId: 'fatura-yonetimi',
        findBy: ['goods_receipt_id', 'source_document_id'],
        findExtra: (row, rec) => String(row.invoice_type || '').toLowerCase().includes('alis')
          && (Number(row.goods_receipt_id) === Number(rec.id)
            || (row.source_document_type === 'MAL_KABUL' && Number(row.source_document_id) === Number(rec.id))),
      },
    ],
  },
  'giris-kontrolleri': {
    kaynaklar: [
      { id: 'mal-kabul', label: 'Mal kabul (kaynak)', field: 'goods_receipt_id', screenId: 'mal-kabuller' },
      { id: 'sa-siparis', label: 'Satınalma siparişi (kaynak)', field: 'purchase_order_id', screenId: 'satin-alma-siparisleri' },
    ],
    sonrakiler: [
      { id: 'gkk', label: 'Giriş kalite emri', screenId: 'kk-emirleri-gkk', findBy: ['source_id'] },
    ],
  },
  'satis-teklifleri': {
    kaynaklar: [],
    sonrakiler: [
      { id: 'satis-siparis', label: 'Satış siparişi', screenId: 'sales_orders', findBy: ['quotation_id'] },
    ],
  },
  'sales_orders': {
    kaynaklar: [
      { id: 'teklif', label: 'Satış teklifi (kaynak)', field: 'quotation_id', screenId: 'satis-teklifleri' },
    ],
    sonrakiler: [
      { id: 'sevk', label: 'Sevk emri', screenId: 'sevk-emirleri', findBy: ['sales_order_id'] },
      { id: 'irsaliye', label: 'Satış irsaliyesi', screenId: 'irsaliye-yonetimi', findBy: ['sales_order_id'] },
      { id: 'fatura', label: 'Satış faturası', screenId: 'fatura-yonetimi', findBy: ['sales_order_id'] },
    ],
  },
  'sevk-emirleri': {
    kaynaklar: [
      { id: 'siparis', label: 'Satış siparişi (kaynak)', field: 'sales_order_id', screenId: 'sales_orders' },
    ],
    sonrakiler: [
      { id: 'irsaliye', label: 'Satış irsaliyesi', screenId: 'irsaliye-yonetimi', findBy: ['shipment_order_id'] },
    ],
  },
  'irsaliye-yonetimi': {
    kaynaklar: [
      { id: 'siparis', label: 'Satış siparişi (kaynak)', field: 'sales_order_id', screenId: 'sales_orders' },
      { id: 'sevk', label: 'Sevk emri (kaynak)', field: 'shipment_order_id', screenId: 'sevk-emirleri' },
    ],
    sonrakiler: [
      {
        id: 'fatura',
        label: 'Satış faturası',
        screenId: 'fatura-yonetimi',
        findBy: ['delivery_note_id'],
      },
    ],
  },
  'fatura-yonetimi': {
    kaynaklar: [
      { id: 'irsaliye', label: 'İrsaliye (kaynak)', field: 'delivery_note_id', screenId: 'irsaliye-yonetimi' },
      { id: 'siparis', label: 'Satış siparişi (kaynak)', field: 'sales_order_id', screenId: 'sales_orders' },
      { id: 'mal-kabul', label: 'Mal kabul (kaynak)', field: 'goods_receipt_id', screenId: 'mal-kabuller' },
    ],
    sonrakiler: [],
  },
};

function getBelgeBaglanti(screen) {
  if (!screen) return { kaynaklar: [], sonrakiler: [] };
  const base = BELGE_BAGLANTI[screen.id] || { kaynaklar: [], sonrakiler: [] };
  // Ekran özel override
  return {
    kaynaklar: screen.documentNav?.kaynaklar || base.kaynaklar || [],
    sonrakiler: screen.documentNav?.sonrakiler || base.sonrakiler || [],
  };
}

function recSourceId(rec, link) {
  if (!rec || !link) return null;
  const keys = [link.field].concat(link.altFields || []).filter(Boolean);
  for (const k of keys) {
    const v = rec[k];
    if (v != null && v !== '') return Number(v) || v;
  }
  return null;
}

async function findLinkedRecord(link, rec) {
  const target = findScreen(link.screenId);
  if (!target?.endpoint || !rec?.id) return null;
  try {
    const data = await api(target.endpoint);
    const rows = Array.isArray(data) ? data : [];
    const keys = link.findBy || [];
    return rows.find((row) => {
      if (typeof link.findExtra === 'function' && link.findExtra(row, rec)) return true;
      return keys.some((k) => Number(row[k]) === Number(rec.id));
    }) || null;
  } catch (_) {
    return null;
  }
}

async function buildFormBaglantiMenuItems(screen, rec) {
  const cfg = getBelgeBaglanti(screen);
  const items = [];
  if (cfg.kaynaklar.length) {
    items.push({ type: 'heading', label: 'Kaynak belge' });
    cfg.kaynaklar.forEach((k) => {
      const tid = recSourceId(rec, k);
      items.push({
        type: 'item',
        id: `src:${k.id}`,
        label: k.label,
        enabled: Boolean(tid),
        screenId: k.screenId,
        targetId: tid,
        kind: 'kaynak',
      });
    });
  }
  if (cfg.sonrakiler.length) {
    items.push({ type: 'heading', label: 'Sonraki işlem' });
    for (const s of cfg.sonrakiler) {
      const found = await findLinkedRecord(s, rec);
      items.push({
        type: 'item',
        id: `next:${s.id}`,
        label: s.label,
        enabled: Boolean(found?.id),
        screenId: s.screenId,
        targetId: found?.id || null,
        kind: 'sonraki',
        hint: found ? null : 'Henüz oluşturulmadı',
      });
    }
  }
  return items;
}

async function showFormContextMenu(clientX, clientY) {
  const menu = $('#formCtxMenu');
  const screen = findScreen(state.screenId);
  if (!menu || !screen || !state.formMode) return;
  const rec = state.formRecord || {};
  if (!recordIdentity(screen, rec) || state.formMode === 'yeni' || state.formMode === 'kopyala') {
    menu.innerHTML = `<span class="ctx-heading">Belge bağlantısı</span>
      <button type="button" disabled class="is-disabled">Kayıt kaydedildikten sonra kullanılabilir</button>`;
  } else {
    menu.innerHTML = `<span class="ctx-heading">Yükleniyor…</span>`;
    menu.hidden = false;
    positionCtxMenu(menu, clientX, clientY);
    const items = await buildFormBaglantiMenuItems(screen, rec);
    if (!items.length) {
      menu.innerHTML = `<span class="ctx-heading">Belge bağlantısı</span>
        <button type="button" disabled class="is-disabled">Bu ekranda tanımlı bağlantı yok</button>`;
    } else {
      menu.innerHTML = items.map((it) => {
        if (it.type === 'heading') return `<span class="ctx-heading">${escAttr(it.label)}</span>`;
        if (it.type === 'sep') return '<div class="ctx-sep"></div>';
        const dis = it.enabled ? '' : 'disabled class="is-disabled"';
        const title = it.hint ? ` title="${escAttr(it.hint)}"` : '';
        return `<button type="button" role="menuitem" ${dis}${title}
          data-form-ctx="${escAttr(it.id)}"
          data-open-screen="${escAttr(it.screenId || '')}"
          data-open-id="${escAttr(it.targetId != null ? String(it.targetId) : '')}">${escAttr(it.label)}</button>`;
      }).join('');
    }
  }
  menu.hidden = false;
  positionCtxMenu(menu, clientX, clientY);
  if (!menu.dataset.bound) {
    menu.dataset.bound = '1';
    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-form-ctx]');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      menu.hidden = true;
      const sid = btn.getAttribute('data-open-screen');
      const rid = btn.getAttribute('data-open-id');
      if (sid && rid) {
        openRecordById(sid, rid, 'incele').catch((err) => toast(err.message));
      }
    });
  }
}

function positionCtxMenu(menu, clientX, clientY) {
  const pad = 6;
  const mw = menu.offsetWidth || 220;
  const mh = menu.offsetHeight || 120;
  let left = clientX;
  let top = clientY;
  if (left + mw > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - mw - pad);
  if (top + mh > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - mh - pad);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

/** Kayıt kimliği: numeric id yoksa codeField (numaratör series_code vb.) */
function recordIdentity(screen, rec) {
  if (!rec || typeof rec !== 'object') return null;
  if (rec.id !== undefined && rec.id !== null && rec.id !== '') return rec.id;
  const cf = screen?.codeField;
  if (cf && rec[cf] !== undefined && rec[cf] !== null && rec[cf] !== '') return rec[cf];
  if (rec.series_code) return rec.series_code;
  return null;
}

function ensureFormRecordId(screen, rec) {
  if (!rec || typeof rec !== 'object') return rec;
  const id = recordIdentity(screen, rec);
  if (id != null && (rec.id === undefined || rec.id === null || rec.id === '')) {
    rec.id = id;
  }
  return rec;
}

/** Form üst çubuğu: İncele → Yeni/Düzelt/Kopyala/Sil; Düzelt → Yeni/Kopyala/Sil */
function updateFormCrudButtons(screen) {
  const mode = state.formMode;
  if (screen && state.formRecord) ensureFormRecordId(screen, state.formRecord);
  const hasId = Boolean(recordIdentity(screen, state.formRecord));
  const wrap = $('#formCrudActions');
  const map = {
    yeni: $('#btnFormYeni'),
    duzelt: $('#btnFormDuzelt'),
    kopyala: $('#btnFormKopyala'),
    sil: $('#btnFormSil'),
  };
  if (!wrap || !map.yeni) return;
  if (!screen || screen.readOnly || screen.crud === false || screen.hideActions) {
    Object.values(map).forEach((b) => { if (b) { b.hidden = true; b.disabled = true; } });
    return;
  }
  const showYeni = mode === 'incele' || mode === 'duzelt';
  const showDuzelt = mode === 'incele' && hasId;
  const showKopyala = (mode === 'incele' || mode === 'duzelt') && hasId;
  // Numaratör fiziksel silinmez — Sil gizle
  const showSil = (mode === 'incele' || mode === 'duzelt') && hasId && screen.id !== 'numarator-tanimi';

  map.yeni.hidden = !showYeni;
  map.duzelt.hidden = !showDuzelt;
  map.kopyala.hidden = !showKopyala;
  map.sil.hidden = !showSil;

  map.yeni.disabled = showYeni ? !ekranYetkisi(screen.id, 'yeni') : true;
  map.duzelt.disabled = showDuzelt ? !ekranYetkisi(screen.id, 'duzelt') : true;
  map.kopyala.disabled = showKopyala ? !ekranYetkisi(screen.id, 'kopyala') : true;
  map.sil.disabled = showSil ? !ekranYetkisi(screen.id, 'sil') : true;

  wrap.hidden = !(showYeni || showDuzelt || showKopyala || showSil);
}

async function formCrudAction(act) {
  const screen = findScreen(state.screenId);
  if (!screen) return;
  const rec = ensureFormRecordId(screen, state.formRecord || {}) || {};
  if (act === 'yeni') {
    await openForm('yeni', { inPlace: true });
    return;
  }
  const rid = recordIdentity(screen, rec);
  if (rid == null) {
    toast('Önce kayıtlı bir belge gerekli.');
    return;
  }
  // openForm selectedRow() kullanır
  state.selectedId = rid;
  if (!state.rows?.some((r) => String(r.id) === String(rid))) {
    state.rows = [{ ...rec, id: rid }];
    state.filtered = state.rows;
  } else {
    state.filtered = state.rows;
  }
  if (act === 'duzelt') {
    await openForm('duzelt', { inPlace: true });
    return;
  }
  if (act === 'kopyala') {
    await openForm('kopyala', { inPlace: true });
    return;
  }
  if (act === 'sil') {
    await deleteSelected();
  }
}

function showListContextMenu(screen, clientX, clientY) {
  const menu = $('#listCtxMenu');
  if (!menu || !screen?.contextMenu?.length) return;
  menu.innerHTML = screen.contextMenu.map((item) => `
    <button type="button" role="menuitem" data-list-ctx="${escAttr(item.id)}"
      data-open-screen="${escAttr(item.openScreen || '')}">${escAttr(item.label)}</button>
  `).join('');
  menu.hidden = false;
  const pad = 6;
  const mw = menu.offsetWidth || 200;
  const mh = menu.offsetHeight || 80;
  let left = clientX;
  let top = clientY;
  if (left + mw > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - mw - pad);
  if (top + mh > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - mh - pad);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  if (!menu.dataset.bound) {
    menu.dataset.bound = '1';
    menu.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-list-ctx]');
      if (!btn) return;
      e.preventDefault();
      menu.hidden = true;
      const openId = btn.getAttribute('data-open-screen');
      const item = (findScreen(state.screenId)?.contextMenu || [])
        .find((x) => x.id === btn.getAttribute('data-list-ctx'));
      const row = selectedRow();
      if (openId) {
        // Hedef ekrana filtre/query geçir
        const pass = item?.passFilters || [];
        const qs = [];
        pass.forEach((k) => {
          if (row?.[k] != null && row[k] !== '') qs.push(`${encodeURIComponent(k)}=${encodeURIComponent(row[k])}`);
        });
        openScreen(openId).then(() => {
          const target = findScreen(openId);
          if (!target || !row) return;
          pass.forEach((k) => {
            if (row[k] == null || row[k] === '') return;
            if (!state.filterState) state.filterState = {};
            state.filterState[k] = { op: 'esit', a: String(row[k]), b: '' };
          });
          if (target.filters?.some((f) => f.queryParam) || qs.length) {
            api(buildListEndpoint(target)).then((data) => {
              state.rows = ensureRowIds(Array.isArray(data) ? data : []);
              state.filtered = applyFilters(state.rows, target);
              renderList(target);
              renderFilterPane(target);
            }).catch((err) => toast(err.message));
          } else {
            state.filtered = applyFilters(state.rows, target);
            renderList(target);
            renderFilterPane(target);
          }
        });
      }
    });
  }
}

function showTabContextMenu(tabKey, clientX, clientY) {
  const menu = $('#tabCtxMenu');
  if (!menu || !state.openTabs.some((t) => t.key === tabKey)) return;
  state.tabCtxKey = tabKey;
  menu.hidden = false;
  const pad = 6;
  const mw = menu.offsetWidth || 180;
  const mh = menu.offsetHeight || 120;
  let left = clientX;
  let top = clientY;
  if (left + mw > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - mw - pad);
  if (top + mh > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - mh - pad);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function closeAllTabs() {
  hideTabContextMenu();
  state.openTabs = [];
  state.activeTabKey = null;
  state.formMode = null;
  state.formRecord = null;
  showHome();
}

async function refreshTab(tabKey) {
  const tab = state.openTabs.find((t) => t.key === tabKey);
  if (!tab) return;
  if (state.activeTabKey !== tabKey) {
    await activateTab(tabKey);
  }
  if (tab.kind === 'list') {
    await openScreen(tab.id, { skipTab: true });
    return;
  }
  const screen = findScreen(tab.screenId || tab.id);
  if (!screen) return;
  const recId = tab.formRecord?.id;
  if (recId && tab.formMode !== 'yeni') {
    try {
      const fresh = await api(`${screenApiBase(screen.endpoint)}/${recId}`);
      tab.formRecord = fresh;
      state.formRecord = { ...fresh };
    } catch (err) {
      toast(err.message || 'Yenileme başarısız');
      return;
    }
  }
  state.formMode = tab.formMode;
  state.formActiveTab = tab.formActiveTab || screen.formTabs?.[0]?.id || null;
  await ensureLookups(screen);
  showView('form');
  $('#screenTitle').textContent = tab.title;
  renderForm(screen);
  renderTabBar();
}

function addOpenTab(screen) {
  addListTab(screen);
}

function closeOpenTab(tabKey) {
  const closing = state.openTabs.find((t) => t.key === tabKey);
  state.openTabs = state.openTabs.filter((t) => t.key !== tabKey);
  if (state.activeTabKey === tabKey) {
    state.formMode = null;
    state.formRecord = null;
    const next = state.openTabs[state.openTabs.length - 1];
    if (next) activateTab(next.key);
    else showHome();
  } else {
    renderTabBar();
  }
  void closing;
}

const MOD_ICONS = {
  'fixed-tanimlar': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  sistem: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/></svg>',
  'ana-veri': '<svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h12"/></svg>',
  stok: '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>',
  cari: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  uretim: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z"/></svg>',
  crm: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  satinalma: '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  satis: '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  kalite: '<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
  finans: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  'insan-kaynaklari': '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

function ensureSidebarPath(screen) {
  if (!screen?.moduleId) return;
  state.sidebarOpen = state.sidebarOpen || {};
  state.sidebarSectionOpen = state.sidebarSectionOpen || {};
  state.sidebarOpen[screen.moduleId] = true;
  const mod = MODULES.find((m) => m.id === screen.moduleId);
  if (!mod) return;
  for (const sec of moduleMenuSections(mod)) {
    if (sec.title == null) continue;
    if (sec.screens.some((s) => s.id === screen.id)) {
      state.sidebarSectionOpen[`${mod.id}:${sec.id}`] = true;
    }
  }
}

/** Menüdeki tüm modül + bölüm anahtarlarını topla */
function collectSidebarKeys() {
  const mods = [];
  const sections = [];
  MODULES.filter((m) => modulYetkiliMi(m.id)).forEach((mod) => {
    mods.push(mod.id);
    moduleMenuSections(mod).forEach((sec) => {
      if (sec.title == null) return;
      if (!sec.screens.some((s) => ekranMenuGorunurMu(s.id))) return;
      sections.push(`${mod.id}:${sec.id}`);
    });
  });
  return { mods, sections };
}

/** Açık ekranı menüde bul: yolu aç + kaydır + kısa vurgu */
function sidebarLocateActive() {
  const screen = findScreen(state.screenId);
  if (!screen) {
    toast('Önce bir ekran açın.');
    return;
  }
  ensureSidebarPath(screen);
  renderSidebar();
  requestAnimationFrame(() => {
    const nav = $('#sidebarNav');
    const active = nav?.querySelector(`.mod-item.active[data-screen="${screen.id}"]`);
    if (!active) {
      toast('Ekran menüde bulunamadı.');
      return;
    }
    active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    active.classList.add('menu-flash');
    setTimeout(() => active.classList.remove('menu-flash'), 1200);
  });
}

function sidebarExpandAll() {
  const { mods, sections } = collectSidebarKeys();
  state.sidebarOpen = state.sidebarOpen || {};
  state.sidebarSectionOpen = state.sidebarSectionOpen || {};
  mods.forEach((id) => { state.sidebarOpen[id] = true; });
  sections.forEach((k) => { state.sidebarSectionOpen[k] = true; });
  renderSidebar();
}

function sidebarCollapseAll() {
  const { mods, sections } = collectSidebarKeys();
  state.sidebarOpen = state.sidebarOpen || {};
  state.sidebarSectionOpen = state.sidebarSectionOpen || {};
  mods.forEach((id) => { state.sidebarOpen[id] = false; });
  sections.forEach((k) => { state.sidebarSectionOpen[k] = false; });
  renderSidebar();
}

function modulYetkiliMi(modId) {
  const s = state.session;
  if (!s) return true;
  if (isSessionTamYetkili()) return true;
  const list = Array.isArray(s.yetkiler) ? s.yetkiler : [];
  if (list.length) {
    // Ekran yetkisi tanımlıysa modülde en az bir ekran erişimi olmalı
    const mod = MODULES.find((m) => m.id === modId);
    if (!mod) return false;
    return (mod.screens || []).some((sc) => ekranYetkisi(sc.id));
  }
  const mods = s.module_permissions;
  if (!mods || !mods.length || mods.includes('*')) return true;
  return mods.includes(modId);
}

function ekranMenuGorunurMu(screenId) {
  return ekranYetkisi(screenId);
}

function renderSidebar() {
  const nav = $('#sidebarNav');
  if (!nav) return;
  if (!state.sidebarOpen) state.sidebarOpen = {};
  if (!state.sidebarSectionOpen) state.sidebarSectionOpen = {};
  // Aktif ekranın modülü açık kalsın (alt başlık kullanıcı tercihine saygı)
  const activeScreen = findScreen(state.screenId);
  const activeMod = activeScreen?.moduleId;
  if (activeMod) state.sidebarOpen[activeMod] = true;

  nav.innerHTML = MODULES.filter((mod) => modulYetkiliMi(mod.id)).map((mod) => {
    const open = Boolean(state.sidebarOpen[mod.id]);
    const icon = MOD_ICONS[mod.id] || MOD_ICONS['ana-veri'];
    const sections = moduleMenuSections(mod);
    const itemsHtml = sections.map((sec) => {
      const secKey = `${mod.id}:${sec.id}`;
      if (sec.title == null) {
        const visible = sec.screens.filter((s) => ekranMenuGorunurMu(s.id));
        if (!visible.length) return '';
        const screensHtml = visible.map((s) => `
          <button type="button" class="mod-item${state.screenId === s.id ? ' active' : ''}" data-screen="${s.id}">
            ${escapeHtml(s.title)}
          </button>`).join('');
        return `<div class="mod-section mod-section--flat">${screensHtml}</div>`;
      }
      if (state.sidebarSectionOpen[secKey] === undefined) {
        state.sidebarSectionOpen[secKey] = true;
      }
      const isOpen = Boolean(state.sidebarSectionOpen[secKey]);
      const visible = sec.screens.filter((s) => ekranMenuGorunurMu(s.id));
      if (!visible.length) return '';
      const screensHtml = visible.map((s) => `
          <button type="button" class="mod-item${state.screenId === s.id ? ' active' : ''}" data-screen="${s.id}">
            ${escapeHtml(s.title)}
          </button>`).join('');
      return `
        <div class="mod-section ${isOpen ? 'open' : 'collapsed'}" data-section-key="${secKey}">
          <button type="button" class="mod-section-title" data-section-toggle="${secKey}" aria-expanded="${isOpen}">
            <span class="mod-section-label">${escapeHtml(sec.title)}</span>
            <span class="mod-section-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="mod-section-items" ${isOpen ? '' : 'hidden'}>
            ${screensHtml}
          </div>
        </div>`;
    }).join('');
    return `
    <div class="mod-group ${open ? 'open' : 'collapsed'}" data-mod="${mod.id}">
      <button type="button" class="mod-title" data-mod-toggle="${mod.id}" aria-expanded="${open}">
        <span class="mod-icon" aria-hidden="true">${icon}</span>
        <span class="mod-title-text">${escapeHtml(mod.title)}</span>
        <span class="mod-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="mod-items" ${open ? '' : 'hidden'}>
        ${itemsHtml}
      </div>
    </div>`;
  }).join('');
}

function showHome() {
  state.screenId = null;
  state.rows = [];
  state.filtered = [];
  state.selectedId = null;
  state.formMode = null;
  state.formRecord = null;
  if (location.hash && location.hash !== '#') {
    history.pushState({ screenId: null }, '', location.pathname);
  }
  showView('home');
  ensureSearchBarVisible();
  const title = $('#screenTitle');
  if (title) {
    title.hidden = true;
    title.textContent = '';
  }
  $('#searchResults').hidden = true;
  renderSidebar();
  renderTabBar();
}

/** Üst arama çubuğu her zaman görünür (ana sayfa / liste / form) */
function ensureSearchBarVisible() {
  const wrap = $('#homeSearchWrap');
  if (wrap) wrap.hidden = false;
}

function renderUserChip() {
  const chip = $('#userChip');
  const nameEl = $('#userChipName');
  const titleEl = $('#userChipTitle');
  const avatarEl = $('#userChipAvatar');
  const menu = $('#userChipMenu');
  if (!chip || !nameEl || !titleEl || !avatarEl) return;
  const s = state.session;
  if (!s) {
    nameEl.textContent = 'Oturum yok';
    titleEl.textContent = 'Sağ tık → Giriş';
    avatarEl.innerHTML = '<span class="user-avatar-initials">?</span>';
    avatarEl.classList.remove('has-img');
  } else {
    const first_name = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.username || s.user_code || 'Kullanıcı';
    nameEl.textContent = s.username || s.user_code || first_name;
    titleEl.textContent = s.title || s.role || s.group_name || '';
    if (s.profile_image) {
      avatarEl.innerHTML = `<img src="${escAttr(s.profile_image)}" alt="" />`;
      avatarEl.classList.add('has-img');
    } else {
      const initials = (s.first_name?.[0] || s.username?.[0] || '?').toUpperCase();
      avatarEl.innerHTML = `<span class="user-avatar-initials">${escapeHtml(initials)}</span>`;
      avatarEl.classList.remove('has-img');
    }
  }
  if (menu) {
    const loginBtn = menu.querySelector('[data-user-action="login"]');
    const logoutBtn = menu.querySelector('[data-user-action="logout"]');
    if (loginBtn) loginBtn.hidden = Boolean(s);
    if (logoutBtn) logoutBtn.hidden = !s;
  }
}

function closeUserChipMenu() {
  const menu = $('#userChipMenu');
  if (menu) menu.hidden = true;
}

function openUserChipMenu(x, y) {
  const menu = $('#userChipMenu');
  const area = $('#userProfileArea');
  if (!menu || !area) return;
  renderUserChip();
  menu.hidden = false;
  const rect = area.getBoundingClientRect();
  const left = Math.min(Math.max(8, (x ?? rect.left) - rect.left), Math.max(8, rect.width - 160));
  menu.style.left = `${left}px`;
  menu.style.top = 'calc(100% + 0.35rem)';
}

function setLoginError(msg) {
  const el = $('#loginError');
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function isLoginRememberOn() {
  return Boolean($('#loginRemember')?.checked);
}

function isLoginLdapOn() {
  return $('#loginLdapToggle')?.getAttribute('aria-checked') === 'true';
}

function applyLoginRememberUi() {
  const remember = $('#loginRemember');
  const user = $('#loginUser');
  if (!remember || !user) return;
  const on = localStorage.getItem('ktb_remember_me') === '1';
  remember.checked = on;
  if (on) {
    const saved = localStorage.getItem('ktb_remember_user') || '';
    if (saved && !user.value) user.value = saved;
  }
}

function persistLoginRemember(username) {
  if (isLoginRememberOn()) {
    localStorage.setItem('ktb_remember_me', '1');
    if (username) localStorage.setItem('ktb_remember_user', username);
  } else {
    localStorage.removeItem('ktb_remember_me');
    localStorage.removeItem('ktb_remember_user');
  }
}

function setLoginLdapMode(on) {
  const btn = $('#loginLdapToggle');
  const wrap = btn?.closest('.login-ldap-switch');
  const view = $('#viewLogin');
  const sub = $('#loginCardSub');
  const available = btn?.dataset.ldapAvailable === '1';
  // Hazır değilse anahtar açık kalamaz — çelişkili «LDAP açık» metni olmasın
  const checked = Boolean(on) && available;
  if (btn) {
    btn.setAttribute('aria-checked', checked ? 'true' : 'false');
  }
  wrap?.classList.toggle('is-on', checked);
  wrap?.classList.toggle('is-unavailable', !available);
  view?.classList.toggle('is-ldap', checked);
  localStorage.setItem('ktb_ldap_login', checked ? '1' : '0');
  if (sub) {
    if (checked) {
      sub.textContent = 'LDAP açık — domain / bilgisayar şifrenizle oturum açın.';
    } else if (!available && btn?.dataset.ldapMessage) {
      sub.textContent = btn.dataset.ldapMessage;
    } else {
      sub.textContent = 'Kullanıcı adı ve şifrenizle oturum açın.';
    }
  }
}

async function refreshLoginLdapStatus() {
  const btn = $('#loginLdapToggle');
  if (!btn) return;
  let status = { available: false, enabled: false, configured: false, message: '' };
  try {
    status = await api('/auth/ldap-status', { skipFirma: true });
  } catch (_) { /* sunucu yoksa yerel tercih */ }
  btn.dataset.ldapAvailable = status.available ? '1' : '0';
  btn.dataset.ldapMessage = status.message || '';
  btn.title = status.message || 'LDAP girişi';
  const pref = localStorage.getItem('ktb_ldap_login') === '1';
  setLoginLdapMode(pref && status.available);
}

/** Şifre gizli → kapalı göz; görünür → açık göz (CSS aria-pressed ile). */
function syncLoginPassEye() {
  const pass = $('#loginPass');
  const btn = $('#loginPassToggle');
  if (!pass || !btn) return;
  const visible = pass.type === 'text';
  btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
  btn.setAttribute('aria-label', visible ? 'Şifreyi gizle' : 'Şifreyi göster');
  btn.title = visible ? 'Şifreyi gizle' : 'Şifreyi göster';
}

function toggleLoginPasswordVisibility() {
  const pass = $('#loginPass');
  if (!pass) return;
  pass.type = pass.type === 'password' ? 'text' : 'password';
  syncLoginPassEye();
}

function showLoginView() {
  const login = $('#viewLogin');
  const shell = $('#appShell');
  if (shell) shell.hidden = true;
  if (login) login.hidden = false;
  document.body.classList.add('is-login');
  closeUserChipMenu();
  setLoginError('');
  applyLoginRememberUi();
  refreshLoginLdapStatus().catch(() => {});
  const user = $('#loginUser');
  const pass = $('#loginPass');
  if (pass) {
    pass.value = '';
    pass.type = 'password';
  }
  syncLoginPassEye();
  // Odak: varsa kullanıcı adı doluysa şifre, değilse kullanıcı adı
  requestAnimationFrame(() => {
    if (user && !user.value) user.focus();
    else if (pass) pass.focus();
  });
}

function enterApp() {
  const login = $('#viewLogin');
  const shell = $('#appShell');
  if (login) login.hidden = true;
  if (shell) shell.hidden = false;
  document.body.classList.remove('is-login');
  ensureSearchBarVisible();
  renderUserChip();
  renderSidebar();
  renderFirmaPicker();
}

function applySession(ses, username) {
  state.session = ses;
  const kod = ses.user_code || username || '';
  if (kod) localStorage.setItem('ktb_kullanici_kodu', kod);
  if (ses.access_token) localStorage.setItem('ktb_access_token', ses.access_token);
  if (ses.refresh_token) localStorage.setItem('ktb_refresh_token', ses.refresh_token);
  // Bu cihazda oturum açıldı — boot’ta giriş ekranı zorlanmaz
  localStorage.setItem('ktb_cihaz_oturum', '1');
}

function softSessionFromStorage() {
  const kod = localStorage.getItem('ktb_kullanici_kodu');
  if (!kod) return false;
  if (!state.session) {
    // Soft oturum: token yokken ekranları kilitleme (_soft → tam erişim)
    state.session = {
      user_code: kod,
      username: kod,
      first_name: kod,
      title: 'Yerel oturum',
      group_code: 'ADMIN',
      role: 'Yonetici',
      module_permissions: ['*'],
      yetkiler: [],
      _soft: true,
    };
  } else if (state.session._soft !== false && !state.session.group_code
    && !(Array.isArray(state.session.yetkiler) && state.session.yetkiler.length)) {
    state.session._soft = true;
    state.session.group_code = state.session.group_code || 'ADMIN';
    state.session.module_permissions = state.session.module_permissions || ['*'];
  }
  return true;
}

async function logoutUser() {
  try {
    const refresh = localStorage.getItem('ktb_refresh_token');
    const kod = localStorage.getItem('ktb_kullanici_kodu');
    await api('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refresh, user_code: kod }),
    }).catch(() => {});
  } catch (_) { /* ignore */ }
  const rememberUser = localStorage.getItem('ktb_remember_me') === '1'
    ? (localStorage.getItem('ktb_remember_user') || localStorage.getItem('ktb_kullanici_kodu') || '')
    : '';
  localStorage.removeItem('ktb_access_token');
  localStorage.removeItem('ktb_refresh_token');
  localStorage.removeItem('ktb_kullanici_kodu');
  localStorage.removeItem('ktb_cihaz_oturum');
  if (rememberUser) localStorage.setItem('ktb_remember_user', rememberUser);
  state.session = null;
  closeUserChipMenu();
  renderUserChip();
  renderSidebar();
  showLoginView();
  if (rememberUser && $('#loginUser')) $('#loginUser').value = rememberUser;
  toast('Oturum kapatıldı.');
}

async function submitLoginForm(e) {
  if (e) e.preventDefault();
  closeUserChipMenu();
  const username = ($('#loginUser')?.value || '').trim();
  const sifre = ($('#loginPass')?.value || '').trim();
  const btn = $('#loginSubmit');
  let ldap = isLoginLdapOn();
  if (ldap && $('#loginLdapToggle')?.dataset.ldapAvailable !== '1') {
    setLoginLdapMode(false);
    ldap = false;
    setLoginError($('#loginLdapToggle')?.dataset.ldapMessage
      || 'LDAP hazır değil. Anahtar kapatıldı — yerel şifre ile deneyin veya LDAP ayarlarını tamamlayın.');
    return;
  }
  if (!username) {
    setLoginError('Kullanıcı adı gerekli.');
    $('#loginUser')?.focus();
    return;
  }
  if (!sifre) {
    setLoginError(ldap ? 'Domain / bilgisayar şifresi gerekli.' : 'Şifre gerekli.');
    $('#loginPass')?.focus();
    return;
  }
  setLoginError('');
  if (btn) btn.disabled = true;
  try {
    const ses = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, sifre, ldap }),
    });
    persistLoginRemember(username);
    applySession(ses, username);
    enterApp();
    await loadFirmalar().catch(() => {});
    renderFirmaPicker();
    showHome();
    const via = ses.auth_method === 'ldap' ? ' (LDAP)' : '';
    toast(`Hoş geldiniz, ${ses.username || ses.first_name || ''}${via}`);
  } catch (err) {
    setLoginError(err.message || 'Giriş başarısız');
    $('#loginPass')?.focus();
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** Eski prompt tabanlı giriş — menüden çağrılırsa giriş ekranına yönlendir. */
function promptLogin() {
  showLoginView();
}

function allowedFirmalar() {
  const all = Array.isArray(state.companies) ? state.companies : [];
  const fy = state.session?.firma_yetkileri;
  if (!Array.isArray(fy) || !fy.length) return all;
  const ids = new Set(fy.map((f) => Number(f.company_id ?? f.id)).filter(Boolean));
  const filtered = all.filter((f) => ids.has(Number(f.id)));
  return filtered.length ? filtered : all;
}

function renderFirmaPicker() {
  const nameEl = $('#firmaPickerName');
  const menu = $('#firmaPickerMenu');
  const labelEl = $('#firmaProfileLabel');
  if (labelEl) labelEl.textContent = 'Firma profil alanı';
  if (!nameEl || !menu) return;
  const list = allowedFirmalar();
  // Oturum firma kısıtı varsa is_active firmayı listeye çek
  if (list.length && !list.some((f) => Number(f.id) === Number(state.activeFirmaId))) {
    state.activeFirmaId = Number(list[0].id);
    localStorage.setItem('ktb_firma_id', String(state.activeFirmaId));
  }
  const is_active = list.find((f) => Number(f.id) === Number(state.activeFirmaId)) || list[0];
  const yer = state.isYerleri.find((y) => Number(y.id) === Number(state.activeIsYeriId));
  nameEl.textContent = is_active
    ? (yer && state.isYerleri.length > 1
      ? `${is_active.company_name} · ${yer.plant_code || yer.plant_name}`
      : is_active.company_name)
    : 'Firma seçin';
  menu.innerHTML = list.map((f) => `
    <li role="option">
      <button type="button" class="firma-picker-item ${Number(f.id) === Number(state.activeFirmaId) ? 'active' : ''}"
        data-firma-id="${f.id}">
        <span class="firma-kod">${f.company_code || ''}</span>
        <span class="firma-adi">${f.company_name || ''}</span>
      </button>
    </li>`).join('');
}

async function loadIsYerleriForActiveFirma() {
  const firmaId = getActiveFirmaId();
  try {
    const rows = await api('/is-yerleri');
    state.isYerleri = Array.isArray(rows) ? rows : [];
  } catch (_) {
    state.isYerleri = [];
  }
  if (!firmaId) {
    state.activeIsYeriId = null;
    return state.isYerleri;
  }
  // Tek iş yeri varsa otomatik seç
  if (state.isYerleri.length === 1) {
    state.activeIsYeriId = Number(state.isYerleri[0].id);
  } else if (state.activeIsYeriId
    && !state.isYerleri.some((y) => Number(y.id) === Number(state.activeIsYeriId))) {
    state.activeIsYeriId = null;
  }
  return state.isYerleri;
}

function buildDefaultFilterState(screen) {
  const fs = {};
  (screen.filters || []).forEach((f) => {
    if (f.type === 'checkbox') {
      const on = f.default === true || f.default === 'true' || f.default === 1;
      fs[f.key] = { op: 'esit', a: on ? 'evet' : '', b: '' };
    } else if (f.key === 'is_active' || f.type === 'bool') {
      fs[f.key] = { op: 'esit', a: 'evet', b: '' };
    } else if (f.key === 'company_id' && getActiveFirmaId() && screen.scopeFirma !== false) {
      fs[f.key] = { op: 'esit', a: String(getActiveFirmaId()), b: '' };
    } else if (f.key === 'plant_id' && state.activeIsYeriId && screen.scopeIsYeri !== false) {
      fs[f.key] = { op: 'esit', a: String(state.activeIsYeriId), b: '' };
    } else if (f.type === 'lookup' || f.type === 'select' || (f.options && f.options.length)) {
      // Açılır listeler: boş operatör satırı = filtresiz
      fs[f.key] = { op: '', a: '', b: '' };
    } else {
      fs[f.key] = { op: '', a: '', b: '' };
    }
  });
  return fs;
}

/** Liste endpoint’ine queryParam filtrelerini ekle (depo bakiye / belge yönetimi) */
function buildListEndpoint(screen) {
  let url = screen.endpoint || '';
  const extras = [];
  (screen.filters || []).forEach((f) => {
    if (!f.queryParam) return;
    const st = state.filterState?.[f.key];
    if (!st) return;
    if (!st.op) return; // boş operatör = filtresiz
    if (f.type === 'checkbox') {
      const on = String(st.a || '').toLowerCase() === 'evet' || st.a === '1' || st.a === true;
      if (st.op === 'esit' && !on && String(st.a || '').trim() === '') return;
      extras.push(`${encodeURIComponent(f.key)}=${on ? '1' : '0'}`);
      return;
    }
    if (st.a != null && String(st.a).trim() !== '') {
      extras.push(`${encodeURIComponent(f.key)}=${encodeURIComponent(st.a)}`);
    }
    if (st.op === 'arasinda' && st.b != null && String(st.b).trim() !== '') {
      extras.push(`${encodeURIComponent(f.key + '_max')}=${encodeURIComponent(st.b)}`);
    }
  });
  if (!extras.length) return url;
  return url.includes('?') ? `${url}&${extras.join('&')}` : `${url}?${extras.join('&')}`;
}

const DIL_AD_MAP = {
  TR: 'Türkçe', EN: 'English', DE: 'Deutsch', FR: 'Français',
  IT: 'Italiano', ES: 'Español', RU: 'Русский', AR: 'العربية',
  NL: 'Nederlands', PT: 'Português', ZH: '中文', JA: '日本語',
};

async function applyKurForParaBirimi(pbKod, kurEl, { force = false } = {}) {
  if (!kurEl) return;
  const pb = String(pbKod || 'TRY').toUpperCase();
  if (pb === 'TRY' || pb === 'TL') {
    kurEl.value = '1';
    kurEl.disabled = true;
    kurEl.title = 'TRY için exchange_rate sabittir';
    return;
  }
  kurEl.disabled = false;
  kurEl.title = '';
  if (!force && kurEl.value && Number(kurEl.value) > 0 && Number(kurEl.value) !== 1) return;
  try {
    const r = await api(`/doviz-kurlari/cevir?quantity=1&source_pb=${encodeURIComponent(pb)}&target_pb=TRY&type=satis`);
    if (r?.exchange_rate != null) kurEl.value = String(r.exchange_rate);
  } catch (_) {
    /* exchange_rate yoksa kullanıcı girer */
  }
}

/**
 * Cari seçilince sevk adresini Adres sekmesine doldur.
 * Öncelik: varsayılan sevk adresi → fatura_adres* → address.
 * Ödeme / PB alanları da boşsa cari kartından alınır.
 */
async function fillAdresFromCari(cariId, { force = false } = {}) {
  if (!cariId || !state.formRecord) return;
  try {
    const cari = await api(`/partners/${cariId}`);
    if (!cari) return;
    const rec = state.formRecord;
    const sevkList = Array.isArray(cari.sevk_adresleri) ? cari.sevk_adresleri : [];
    const varsayilan = sevkList.find((a) => a.varsayilan && !a.is_inactive)
      || sevkList.find((a) => !a.is_inactive)
      || null;
    const adresSatir = varsayilan
      ? [varsayilan.adres1, varsayilan.adres2, varsayilan.adres3].filter(Boolean).join(' ').trim()
      : '';
    const patch = {
      ship_to_address: adresSatir
        || cari.bill_address_1
        || cari.billing_address
        || cari.address
        || '',
      ship_city: (varsayilan && varsayilan.il) || cari.il || '',
      ship_district: (varsayilan && varsayilan.district) || cari.district || '',
      ship_country: (varsayilan && varsayilan.country) || cari.country || 'TR',
      ship_postal_code: (varsayilan && varsayilan.postal_code) || cari.postal_code || '',
    };
    Object.entries(patch).forEach(([k, v]) => {
      if (force || !rec[k]) rec[k] = v;
    });
    // Ödeme sekmesi / satır varsayılanları — boşsa cari kartından
    if ((force || !rec.payment_term_code) && cari.payment_term_code) rec.payment_term_code = cari.payment_term_code;
    if ((force || !rec.payment_method) && cari.payment_method) rec.payment_method = cari.payment_method;
    if ((force || !rec.delivery_term_code) && cari.delivery_term_code) rec.delivery_term_code = cari.delivery_term_code;
    if ((force || !rec.currency_code) && cari.currency_code) rec.currency_code = cari.currency_code;
    // Açık kalem satırlarına PB yansıt (henüz boş olanlar)
    const detailKey = findScreen(state.screenId)?.detailKey || 'kalemler';
    const rows = Array.isArray(rec[detailKey]) ? rec[detailKey] : [];
    if (cari.currency_code && rows.length) {
      rows.forEach((row) => {
        if (!row.currency_code) row.currency_code = cari.currency_code;
      });
    }
  } catch (err) {
    console.warn('Cari address doldurulamadı', err);
  }
}

async function fillLinesFromSource(kind, sourceId) {
  if (!sourceId || !state.formRecord) return;
  const screen = findScreen(state.screenId);
  if (!screen) return;
  const detailKey = screen.detailKey || 'satirlar';
  try {
    if (kind === 'talep-satirlar') {
      const talep = await api(`/satin-alma-talepleri/${sourceId}`);
      if (!talep) return;
      if (talep.supplier_partner_id && state.formRecord.partner_id == null) {
        state.formRecord.partner_id = talep.supplier_partner_id;
      }
      if (talep.plant_id && !state.formRecord.plant_id) state.formRecord.plant_id = talep.plant_id;
      if (talep.company_id && !state.formRecord.company_id) state.formRecord.company_id = talep.company_id;
      if (talep.warehouse_id && !state.formRecord.warehouse_id) state.formRecord.warehouse_id = talep.warehouse_id;
      if (talep.project_code && !state.formRecord.project_code) state.formRecord.project_code = talep.project_code;
      if (talep.region && !state.formRecord.region) state.formRecord.region = talep.region;
      if (talep.currency_code && !state.formRecord.currency_code) state.formRecord.currency_code = talep.currency_code;
      if (talep.exchange_rate != null && (state.formRecord.exchange_rate == null || state.formRecord.exchange_rate === '')) {
        state.formRecord.exchange_rate = talep.exchange_rate;
      }
      if (talep.rate_type && !state.formRecord.rate_type) state.formRecord.rate_type = talep.rate_type;
      if (talep.target_delivery_date && !state.formRecord.delivery_date) {
        state.formRecord.delivery_date = talep.target_delivery_date;
      }
      state.formRecord.requisition_id = Number(sourceId);
      state.formRecord[detailKey] = (talep.satirlar || []).map((s) => ({
        requisition_line_id: s.id,
        line_type: s.line_type || 'S',
        item_id: s.item_id,
        item_code: s.item_code,
        item_name: s.item_name,
        quantity: s.quantity,
        uom_code: s.uom_code,
        unit_price: s.tahmini_unit_price ?? s.unit_price ?? 0,
        currency_code: s.currency_code || talep.currency_code || null,
        exchange_rate: s.exchange_rate ?? talep.exchange_rate ?? 1,
        rate_type: s.rate_type || talep.rate_type || null,
        vat_rate: s.vat_rate ?? 20,
        vat_mode: s.vat_mode || 'Haric',
        discount_rate: s.discount_rate ?? 0,
        discount_rate_2: s.discount_rate_2 ?? 0,
        discount_rate_3: s.discount_rate_3 ?? 0,
        delivery_date: s.delivery_date || talep.target_delivery_date || null,
        warehouse_id: s.warehouse_id || talep.warehouse_id || null,
        project_code: s.project_code || talep.project_code || null,
        region: s.region || talep.region || null,
        supplier_item_code: s.supplier_item_code || null,
        supplier_item_name: s.supplier_item_name || null,
        rezervasyon_type: s.rezervasyon_type || null,
        rezervasyon_iliski_no: s.rezervasyon_iliski_no || null,
        line_description: s.line_description || s.description || '',
        _satir_kayitli: false,
      }));
      toast(`Talep ${talep.requisition_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'siparis-satirlar') {
      const sip = await api(`/satin-alma-siparisleri/${sourceId}`);
      if (!sip) return;
      state.formRecord.purchase_order_id = Number(sourceId);
      state.formRecord.sales_order_id = Number(sourceId); // geriye uyum
      if (sip.partner_id && !state.formRecord.partner_id) state.formRecord.partner_id = sip.partner_id;
      if (sip.warehouse_id && !state.formRecord.warehouse_id) state.formRecord.warehouse_id = sip.warehouse_id;
      state.formRecord[detailKey] = (sip.satirlar || [])
        .filter((s) => Number(s.quantity) - Number(s.giren_quantity || 0) > 0)
        .map((s) => ({
          order_line_id: s.id,
          item_id: s.item_id,
          item_code: s.item_code,
          item_name: s.item_name,
          quantity: Number(s.quantity) - Number(s.giren_quantity || 0),
          uom_code: s.uom_code,
          unit_price: s.unit_price,
          supplier_item_code: s.supplier_item_code || null,
          supplier_item_name: s.supplier_item_name || null,
          line_description: s.line_description || null,
          _satir_kayitli: false,
        }));
      toast(`Sipariş ${sip.order_no || sourceId} kalan satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'tedarikci-irsaliye-satirlar') {
      const ir = await api(`/tedarikci-irsaliyeleri/${sourceId}`);
      if (!ir) return;
      state.formRecord.vendor_delivery_note_id = Number(sourceId);
      if (ir.purchase_order_id || ir.sales_order_id) {
        const poId = Number(ir.purchase_order_id || ir.sales_order_id);
        state.formRecord.purchase_order_id = poId;
        state.formRecord.sales_order_id = poId;
      }
      if (ir.delivery_note_no) state.formRecord.vendor_delivery_note_no = ir.delivery_note_no;
      if (ir.delivery_date) state.formRecord.delivery_date = ir.delivery_date;
      state.formRecord[detailKey] = (ir.satirlar || [])
        .filter((s) => Number(s.remaining_quantity != null ? s.remaining_quantity : (s.quantity - (s.accepted_flag || 0))) > 0)
        .map((s) => ({
          order_line_id: s.order_line_id,
          item_id: s.item_id,
          quantity: Number(s.remaining_quantity != null ? s.remaining_quantity : (s.quantity - (s.accepted_flag || 0))),
          uom_code: s.uom_code,
          unit_price: s.unit_price,
          _satir_kayitli: false,
        }));
      toast(`İrsaliye ${ir.delivery_note_no || sourceId} kalan satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'teklif-satirlar') {
      const teklif = await api(`/satis-teklifleri/${sourceId}`);
      if (!teklif) return;
      state.formRecord.quotation_id = Number(sourceId);
      if (teklif.partner_id && !state.formRecord.partner_id) state.formRecord.partner_id = teklif.partner_id;
      if (teklif.company_id && !state.formRecord.company_id) state.formRecord.company_id = teklif.company_id;
      if (teklif.plant_id && !state.formRecord.plant_id) state.formRecord.plant_id = teklif.plant_id;
      if (teklif.warehouse_id && !state.formRecord.warehouse_id) state.formRecord.warehouse_id = teklif.warehouse_id;
      if (teklif.project_code && !state.formRecord.project_code) state.formRecord.project_code = teklif.project_code;
      if (teklif.region && !state.formRecord.region) state.formRecord.region = teklif.region;
      if (teklif.currency_code && !state.formRecord.currency_code) state.formRecord.currency_code = teklif.currency_code;
      if (teklif.exchange_rate != null && (state.formRecord.exchange_rate == null || state.formRecord.exchange_rate === '')) {
        state.formRecord.exchange_rate = teklif.exchange_rate;
      }
      if (teklif.rate_type && !state.formRecord.rate_type) state.formRecord.rate_type = teklif.rate_type;
      if (teklif.payment_term_code && !state.formRecord.payment_term_code) state.formRecord.payment_term_code = teklif.payment_term_code;
      if (teklif.payment_method && !state.formRecord.payment_method) state.formRecord.payment_method = teklif.payment_method;
      if (teklif.delivery_term_code && !state.formRecord.delivery_term_code) state.formRecord.delivery_term_code = teklif.delivery_term_code;
      if (teklif.delivery_date && !state.formRecord.delivery_date) state.formRecord.delivery_date = teklif.delivery_date;
      if (!state.formRecord.order_source) state.formRecord.order_source = 'Teklif';
      if (!state.formRecord.order_type) state.formRecord.order_type = 'SatisSiparis';
      state.formRecord[detailKey] = (teklif.satirlar || teklif.kalemler || []).map((s) => ({
        quotation_line_id: s.id,
        line_type: s.line_type || 'S',
        item_id: s.item_id,
        item_code: s.item_code,
        item_name: s.item_name,
        quantity: s.quantity,
        uom_code: s.uom_code,
        unit_price: s.unit_price ?? 0,
        currency_code: s.currency_code || teklif.currency_code || null,
        exchange_rate: s.exchange_rate ?? teklif.exchange_rate ?? 1,
        rate_type: s.rate_type || teklif.rate_type || null,
        vat_rate: s.vat_rate ?? 20,
        vat_mode: s.vat_mode || 'Haric',
        discount_rate: s.discount_rate ?? 0,
        discount_rate_2: s.discount_rate_2 ?? 0,
        discount_rate_3: s.discount_rate_3 ?? 0,
        delivery_date: s.delivery_date || teklif.delivery_date || null,
        warehouse_id: s.warehouse_id || teklif.warehouse_id || null,
        project_code: s.project_code || teklif.project_code || null,
        region: s.region || teklif.region || null,
        line_description: s.line_description || '',
        _satir_kayitli: false,
      }));
      toast(`Teklif ${teklif.quotation_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'sa-teklif-satirlar') {
      const teklif = await api(`/satin-alma-teklifleri/${sourceId}`);
      if (!teklif) return;
      state.formRecord.quotation_id = Number(sourceId);
      if (teklif.partner_id && !state.formRecord.partner_id) state.formRecord.partner_id = teklif.partner_id;
      if (teklif.requisition_id && !state.formRecord.requisition_id) state.formRecord.requisition_id = teklif.requisition_id;
      if (teklif.company_id && !state.formRecord.company_id) state.formRecord.company_id = teklif.company_id;
      if (teklif.plant_id && !state.formRecord.plant_id) state.formRecord.plant_id = teklif.plant_id;
      if (teklif.project_code && !state.formRecord.project_code) state.formRecord.project_code = teklif.project_code;
      if (teklif.region && !state.formRecord.region) state.formRecord.region = teklif.region;
      if (teklif.currency_code && !state.formRecord.currency_code) state.formRecord.currency_code = teklif.currency_code;
      if (teklif.exchange_rate != null && (state.formRecord.exchange_rate == null || state.formRecord.exchange_rate === '')) {
        state.formRecord.exchange_rate = teklif.exchange_rate;
      }
      if (teklif.rate_type && !state.formRecord.rate_type) state.formRecord.rate_type = teklif.rate_type;
      if (teklif.payment_term_code && !state.formRecord.payment_term_code) state.formRecord.payment_term_code = teklif.payment_term_code;
      state.formRecord[detailKey] = (teklif.satirlar || []).map((s) => ({
        quotation_line_id: s.id,
        line_type: s.line_type || 'S',
        item_id: s.item_id,
        item_code: s.item_code,
        item_name: s.item_name,
        quantity: s.quantity,
        uom_code: s.uom_code,
        unit_price: s.unit_price ?? 0,
        currency_code: s.currency_code || teklif.currency_code || null,
        exchange_rate: s.exchange_rate ?? teklif.exchange_rate ?? 1,
        rate_type: s.rate_type || teklif.rate_type || null,
        vat_rate: s.vat_rate ?? 20,
        vat_mode: s.vat_mode || 'Haric',
        discount_rate: s.discount_rate ?? 0,
        discount_rate_2: s.discount_rate_2 ?? 0,
        discount_rate_3: s.discount_rate_3 ?? 0,
        delivery_date: s.delivery_date || null,
        project_code: s.project_code || teklif.project_code || null,
        region: s.region || teklif.region || null,
        line_description: s.line_description || '',
        _satir_kayitli: false,
      }));
      toast(`SA teklif ${teklif.quotation_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'siparis-kalemler') {
      const sip = await api(`/sales_orders/${sourceId}`);
      if (!sip) return;
      state.formRecord.sales_order_id = Number(sourceId);
      if (sip.partner_id && !state.formRecord.partner_id) state.formRecord.partner_id = sip.partner_id;
      if (sip.warehouse_id && !state.formRecord.warehouse_id) state.formRecord.warehouse_id = sip.warehouse_id;
      if (sip.company_id && !state.formRecord.company_id) state.formRecord.company_id = sip.company_id;
      if (sip.plant_id && !state.formRecord.plant_id) state.formRecord.plant_id = sip.plant_id;
      if (sip.project_code && !state.formRecord.project_code) state.formRecord.project_code = sip.project_code;
      if (sip.region && !state.formRecord.region) state.formRecord.region = sip.region;
      if (sip.currency_code && !state.formRecord.currency_code) state.formRecord.currency_code = sip.currency_code;
      if (sip.exchange_rate != null && (state.formRecord.exchange_rate == null || state.formRecord.exchange_rate === '')) state.formRecord.exchange_rate = sip.exchange_rate;
      if (sip.rate_type && !state.formRecord.rate_type) state.formRecord.rate_type = sip.rate_type;
      if (sip.ship_to_address && !state.formRecord.ship_to_address) state.formRecord.ship_to_address = sip.ship_to_address;
      if (sip.ship_city && !state.formRecord.ship_city) state.formRecord.ship_city = sip.ship_city;
      if (sip.ship_district && !state.formRecord.ship_district) state.formRecord.ship_district = sip.ship_district;
      if (sip.ship_country && !state.formRecord.ship_country) state.formRecord.ship_country = sip.ship_country;
      if (sip.ship_postal_code && !state.formRecord.ship_postal_code) state.formRecord.ship_postal_code = sip.ship_postal_code;
      const lines = sip.kalemler || sip.satirlar || [];
      state.formRecord[detailKey] = lines
        .filter((s) => {
          const kalan = Number(
            s.kalan_sevk_miktar != null
              ? s.kalan_sevk_miktar
              : (s.bekleyen_quantity != null ? s.bekleyen_quantity : (Number(s.quantity) - Number(s.shipped_quantity || 0)))
          );
          return s.item_id && kalan > 0;
        })
        .map((s) => {
          const kalan = Number(
            s.kalan_sevk_miktar != null
              ? s.kalan_sevk_miktar
              : (s.bekleyen_quantity != null ? s.bekleyen_quantity : (Number(s.quantity) - Number(s.shipped_quantity || 0)))
          );
          return {
            sales_order_line_id: s.id,
            line_type: s.line_type || 'S',
            item_id: s.item_id,
            item_code: s.item_code || s.stok_kodu_ref,
            item_name: s.item_name || s.stok_adi_ref,
            quantity: kalan,
            uom_code: s.stock_uom || s.uom_code,
            unit_price: s.unit_price ?? 0,
            currency_code: s.currency_code || sip.currency_code || null,
            exchange_rate: s.exchange_rate ?? sip.exchange_rate ?? 1,
            rate_type: s.rate_type || sip.rate_type || null,
            discount_rate: s.discount_rate ?? 0,
            discount_rate_2: s.discount_rate_2 ?? 0,
            discount_rate_3: s.discount_rate_3 ?? 0,
            vat_rate: s.vat_rate ?? 20,
            vat_mode: s.vat_mode || 'Haric',
            warehouse_id: s.warehouse_id || sip.warehouse_id || null,
            project_code: s.project_code || sip.project_code || null,
            region: s.region || sip.region || null,
            line_description: s.line_description || '',
            shipped_quantity: s.shipped_quantity || 0,
            invoiced_quantity: s.invoiced_quantity || 0,
            bekleyen_quantity: kalan,
            _satir_kayitli: false,
          };
        });
      toast(`Sipariş ${sip.order_no || sourceId} kalan kalemleri yüklendi`);
      renderForm(screen);
    } else if (kind === 'sevk-satirlar') {
      const sevk = await api(`/sevk-emirleri/${sourceId}`);
      if (!sevk) return;
      state.formRecord.shipment_order_id = Number(sourceId);
      if (sevk.sales_order_id) state.formRecord.sales_order_id = sevk.sales_order_id;
      if (sevk.partner_id && !state.formRecord.partner_id) state.formRecord.partner_id = sevk.partner_id;
      if (sevk.warehouse_id && !state.formRecord.warehouse_id) state.formRecord.warehouse_id = sevk.warehouse_id;
      if (sevk.ship_to_address && !state.formRecord.ship_to_address) state.formRecord.ship_to_address = sevk.ship_to_address;
      if (sevk.ship_city && !state.formRecord.ship_city) state.formRecord.ship_city = sevk.ship_city;
      if (sevk.ship_district && !state.formRecord.ship_district) state.formRecord.ship_district = sevk.ship_district;
      if (sevk.ship_country && !state.formRecord.ship_country) state.formRecord.ship_country = sevk.ship_country;
      if (sevk.vehicle_plate && !state.formRecord.vehicle_plate) state.formRecord.vehicle_plate = sevk.vehicle_plate;
      if (sevk.carrier_title && !state.formRecord.carrier_title) state.formRecord.carrier_title = sevk.carrier_title;
      state.formRecord[detailKey] = (sevk.satirlar || sevk.kalemler || []).map((s) => ({
        ship_emri_line_id: s.id,
        sales_order_line_id: s.sales_order_line_id || null,
        item_id: s.item_id,
        quantity: Number(s.remaining_quantity != null ? s.remaining_quantity : s.quantity) || s.quantity,
        uom_code: s.uom_code,
        unit_price: s.unit_price ?? 0,
        lot_id: s.lot_id || null,
        serial_no: s.serial_no || null,
        raf_code: s.raf_code || null,
        line_description: s.line_description || '',
        _satir_kayitli: false,
      }));
      toast(`Sevk ${sevk.shipment_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'irsaliye-satirlar') {
      const ir = await api(`/delivery_notes/${sourceId}`);
      if (!ir) return;
      state.formRecord.delivery_note_id = Number(sourceId);
      if (ir.sales_order_id && !state.formRecord.sales_order_id) state.formRecord.sales_order_id = ir.sales_order_id;
      if (ir.partner_id && !state.formRecord.partner_id) state.formRecord.partner_id = ir.partner_id;
      if (ir.warehouse_id && !state.formRecord.warehouse_id) state.formRecord.warehouse_id = ir.warehouse_id;
      if (ir.currency_code && !state.formRecord.currency_code) state.formRecord.currency_code = ir.currency_code;
      if (ir.exchange_rate != null && (state.formRecord.exchange_rate == null || state.formRecord.exchange_rate === '')) state.formRecord.exchange_rate = ir.exchange_rate;
      if (ir.project_code && !state.formRecord.project_code) state.formRecord.project_code = ir.project_code;
      if (ir.ship_to_address && !state.formRecord.ship_to_address) state.formRecord.ship_to_address = ir.ship_to_address;
      if (!state.formRecord.invoice_type) state.formRecord.invoice_type = 'Satis';
      state.formRecord[detailKey] = (ir.satirlar || ir.kalemler || []).map((s) => ({
        delivery_line_id: s.id,
        sales_order_line_id: s.sales_order_line_id || null,
        item_id: s.item_id,
        quantity: s.quantity,
        uom_code: s.uom_code,
        unit_price: s.unit_price ?? 0,
        discount_rate: s.discount_rate ?? 0,
        discount_rate_2: s.discount_rate_2 ?? 0,
        vat_rate: s.vat_rate ?? 20,
        vat_mode: s.vat_mode || 'Haric',
        warehouse_id: s.warehouse_id || ir.warehouse_id || null,
        line_description: s.line_description || '',
        serial_no: s.serial_no || null,
        _satir_kayitli: false,
      }));
      toast(`İrsaliye ${ir.delivery_note_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'mal-kabul-satirlar') {
      const mk = await api(`/mal-kabuller/${sourceId}`);
      if (!mk) return;
      state.formRecord.goods_receipt_id = Number(sourceId);
      if ((mk.purchase_order_id || mk.sales_order_id) && !state.formRecord.sales_order_id) {
        state.formRecord.sales_order_id = mk.purchase_order_id || mk.sales_order_id;
      }
      if (mk.partner_id && !state.formRecord.partner_id) state.formRecord.partner_id = mk.partner_id;
      if (!state.formRecord.invoice_type) state.formRecord.invoice_type = 'Alis';
      state.formRecord[detailKey] = (mk.satirlar || []).map((s) => ({
        mal_kabul_satir_id: s.id,
        order_line_id: s.order_line_id || null,
        item_id: s.item_id,
        quantity: s.accepted_flag ?? s.quantity,
        uom_code: s.uom_code,
        unit_price: s.unit_price ?? 0,
        vat_rate: s.vat_rate ?? 20,
        vat_mode: s.vat_mode || 'Haric',
        discount_rate: s.discount_rate ?? 0,
        line_description: s.line_description || '',
        _satir_kayitli: false,
      }));
      toast(`Mal kabul ${mk.receipt_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    }
  } catch (err) {
    toast(err.message || 'Kaynak satırlar yüklenemedi');
  }
}

function closeFirmaPicker() {
  const menu = $('#firmaPickerMenu');
  const btn = $('#firmaPickerBtn');
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

async function setActiveFirma(firmaId, { reload = true } = {}) {
  const id = Number(firmaId);
  if (!id || Number(state.activeFirmaId) === id) {
    closeFirmaPicker();
    return;
  }
  state.activeFirmaId = id;
  localStorage.setItem('ktb_firma_id', String(id));
  state.lookupCache = {};
  state.activeIsYeriId = null;
  await loadIsYerleriForActiveFirma();
  // Açık form sekmelerini kapat — yanlış firmada işlem riski
  state.openTabs = state.openTabs.filter((t) => t.kind === 'list');
  state.activeTabKey = state.openTabs[0]?.key || null;
  state.formMode = null;
  state.formRecord = null;
  closeFirmaPicker();
  renderFirmaPicker();
  renderTabBar();
  if (!reload) return;
  if (state.screenId) {
    const screen = findScreen(state.screenId);
    if (screen) await openScreen(screen.id);
    else showHome();
  } else {
    showHome();
  }
  toast(`Firma profili: ${state.companies.find((f) => Number(f.id) === id)?.company_name || id}`);
}

async function loadFirmalar() {
  try {
    // Firma listesi izolasyonsuz — seçim için tüm demo companies
    const rows = await api('/companies', { headers: { 'X-Firma-Id': '' } }).catch(() => api('/companies'));
    state.companies = Array.isArray(rows) ? rows : [];
  } catch (_) {
    state.companies = [];
  }
  const stored = Number(localStorage.getItem('ktb_firma_id') || 0);
  const prefer = state.companies.find((f) => Number(f.id) === stored)
    || state.companies.find((f) => f.company_code === 'ELEK')
    || state.companies[0];
  state.activeFirmaId = prefer ? Number(prefer.id) : null;
  if (state.activeFirmaId) localStorage.setItem('ktb_firma_id', String(state.activeFirmaId));
  await loadIsYerleriForActiveFirma();
  renderFirmaPicker();
}

function readFilterState(screen) {
  const next = {};
  screen.filters.forEach((f) => {
    const aEl = document.querySelector(`[data-filter-a="${f.key}"]`);
    let a = '';
    if (aEl) {
      if (aEl.type === 'checkbox') a = aEl.checked ? 'evet' : '';
      else a = aEl.value || '';
    }
    next[f.key] = {
      op: document.querySelector(`[data-filter-op="${f.key}"]`)?.value || '',
      a,
      b: document.querySelector(`[data-filter-b="${f.key}"]`)?.value || '',
    };
  });
  state.filterState = next;
}

function syncBetweenInputs(screen) {
  screen.filters.forEach((f) => {
    const opEl = document.querySelector(`[data-filter-op="${f.key}"]`);
    const wrap = document.querySelector(`[data-filter-values="${f.key}"]`);
    if (!opEl || !wrap) return;
    const op = opEl.value;
    const arasinda = filterOpNeedsBetween(op);
    const hideVals = filterOpHidesValues(op);
    wrap.classList.toggle('split', arasinda);
    wrap.classList.toggle('filter-values--hidden', hideVals);
    wrap.hidden = hideVals;
    const field = wrap.closest('.filter-field');
    if (field) field.classList.toggle('filter-field--noval', hideVals);
    // a/b görünürlüğü
    wrap.querySelectorAll(`[data-filter-a="${f.key}"]`).forEach((el) => {
      const widget = el.closest('.lookup-widget');
      if (widget) widget.hidden = hideVals;
      else el.hidden = hideVals;
    });
    wrap.querySelectorAll(`[data-filter-b="${f.key}"]`).forEach((el) => {
      const widget = el.closest('.lookup-widget');
      const showB = arasinda && !hideVals;
      if (widget) widget.hidden = !showB;
      else el.hidden = !showB;
    });
  });
}

function filterBucket(f) {
  const k = f.key || '';
  if (k === 'company_id' || k === 'company_code' || k === 'company_name') return 'firma';
  if (k === 'plant_id' || k === 'plant_code' || k === 'plant_name') return 'isyeri';
  if (k === 'is_active' || f.type === 'bool') return 'is_active';
  if (f.type === 'date' || /tarih|_date$/i.test(k)) return 'tarih';
  return 'main';
}

function partitionFilters(filters) {
  const buckets = { firma: [], isyeri: [], tarih: [], is_active: [], main: [] };
  (filters || []).forEach((f) => {
    buckets[filterBucket(f)].push(f);
  });
  return {
    left: [...buckets.firma, ...buckets.isyeri, ...buckets.tarih, ...buckets.is_active],
    right: buckets.main,
  };
}

function buildFilterSelectOptions(rows, f, selectedVal) {
  const vk = f.valueKey || 'id';
  const lk = f.labelKey || 'adi';
  const ck = f.codeKey;
  const seen = new Set();
  const opts = [`<option value="">— seçin —</option>`];
  let curLabel = '';
  (rows || []).forEach((r) => {
    const val = r[vk];
    if (val == null || val === '') return;
    const sig = String(val);
    if (seen.has(sig)) return;
    seen.add(sig);
    const code = ck ? (r[ck] || '') : '';
    const name = r[lk] || '';
    let label = code || name || String(val);
    if (code && name && String(val) !== code) {
      const short = name.length > 28 ? `${name.slice(0, 26)}…` : name;
      label = `${code} — ${short}`;
    } else if (!code && name) {
      label = name;
    }
    const title = code && name ? `${code} — ${name}` : (name || code || String(val));
    if (String(selectedVal) === String(val)) curLabel = title;
    opts.push(`<option value="${escAttr(val)}" title="${escAttr(title)}" ${String(selectedVal) === String(val) ? 'selected' : ''}>${label}</option>`);
  });
  return { optsHtml: opts.join(''), curLabel };
}

function filterValueControl(f, st) {
  const arasinda = filterOpNeedsBetween(st.op);
  const hideVals = filterOpHidesValues(st.op);
  if (f.type === 'lookup') {
    let rows = state.lookupCache[f.lookup];
    if (!Array.isArray(rows) || !rows.length) {
      if (f.lookup === 'companies') rows = state.companies;
      else if (f.lookup === 'is-yerleri') rows = state.isYerleri;
    }
    rows = Array.isArray(rows) ? rows : [];
    const a = buildFilterSelectOptions(rows, f, st.a);
    const b = buildFilterSelectOptions(rows, f, st.b);
    const aHtml = wrapLookupCombobox(
      `<select class="lookup-pick lookup-combo-select" data-filter-a="${f.key}">${a.optsHtml}</select>`,
      a.curLabel,
      false,
    );
    let bHtml = wrapLookupCombobox(
      `<select class="lookup-pick lookup-combo-select" data-filter-b="${f.key}">${b.optsHtml}</select>`,
      b.curLabel,
      false,
    );
    if (!arasinda) bHtml = bHtml.replace('class="lookup-widget lookup-combobox"', 'class="lookup-widget lookup-combobox" hidden');
    return `${aHtml}${bHtml}`;
  }
  if (f.type === 'select' || (Array.isArray(f.options) && f.options.length)) {
    const opts = f.options || [];
    const optHtml = (selected) => `
      <option value="">— seçin —</option>
      ${opts.map((o) => {
        const v = typeof o === 'object' ? (o.value ?? o.id ?? o.v) : o;
        const l = typeof o === 'object' ? (o.label ?? o.adi ?? o.l ?? v) : o;
        return `<option value="${escAttr(v)}" ${String(selected) === String(v) ? 'selected' : ''}>${l}</option>`;
      }).join('')}`;
    const curA = st.a == null || st.a === '' ? '' : String(st.a);
    const curB = st.b == null || st.b === '' ? '' : String(st.b);
    const aHtml = wrapLookupCombobox(`<select class="lookup-pick lookup-combo-select" data-filter-a="${f.key}">${optHtml(curA)}</select>`, curA, false);
    let bHtml = wrapLookupCombobox(`<select class="lookup-pick lookup-combo-select" data-filter-b="${f.key}">${optHtml(curB)}</select>`, curB, false);
    if (!arasinda) bHtml = bHtml.replace('class="lookup-widget lookup-combobox"', 'class="lookup-widget lookup-combobox" hidden');
    return `${aHtml}${bHtml}`;
  }
  if (f.type === 'checkbox') {
    const on = String(st.a || '').toLowerCase() === 'evet' || st.a === '1' || st.a === true;
    return `<label class="filter-check"><input type="checkbox" data-filter-a="${f.key}" value="evet" ${on ? 'checked' : ''} /> Açık</label>
      <input type="text" data-filter-b="${f.key}" value="" hidden />`;
  }
  if (f.type === 'bool' || f.key === 'is_active') {
    const opts = [
      { v: 'evet', l: 'Evet' },
      { v: 'hayir', l: 'Hayır' },
    ];
    return `<select data-filter-a="${f.key}">
      <option value="">—</option>
      ${opts.map((o) => `<option value="${o.v}" ${norm(st.a) === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
    </select>
      <select data-filter-b="${f.key}" ${arasinda ? '' : 'hidden'}>
        <option value="">—</option>
        ${opts.map((o) => `<option value="${o.v}" ${norm(st.b) === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
      </select>`;
  }
  const isDate = f.type === 'date' || /tarih|_date$/i.test(f.key || '');
  if (isDate) {
    return `
      <input type="date" data-filter-a="${f.key}" value="${escAttr(String(st.a || '').slice(0, 10))}" ${hideVals ? 'hidden' : ''} />
      <input type="date" data-filter-b="${f.key}" value="${escAttr(String(st.b || '').slice(0, 10))}" ${arasinda && !hideVals ? '' : 'hidden'} />`;
  }
  return `
    <input type="text" data-filter-a="${f.key}" value="${escAttr(st.a || '')}" placeholder="…" ${hideVals ? 'hidden' : ''} />
    <input type="text" data-filter-b="${f.key}" value="${escAttr(st.b || '')}" placeholder="…" ${arasinda && !hideVals ? '' : 'hidden'} />`;
}

function filterOperatorsFor(f) {
  if (f.type === 'checkbox') {
    return OPERATORS.filter((o) => o.id === '' || o.id === 'esit');
  }
  // Açılır liste / bool: boş satır (filtresiz) + eşit/eşit değil + arasında
  if (f.type === 'lookup' || f.type === 'select' || f.type === 'bool'
      || f.key === 'is_active' || (Array.isArray(f.options) && f.options.length)) {
    return OPERATORS.filter((o) =>
      o.id === '' || o.id === 'esit' || o.id === 'esit_degil' || o.id === 'arasinda');
  }
  return OPERATORS;
}

function renderFilterField(f) {
  const st = state.filterState[f.key] || { op: '', a: '', b: '' };
  const bucket = filterBucket(f);
  if (f.type === 'checkbox') {
    const ops = filterOperatorsFor(f);
    const rawCk = (st.op === 'filtresiz' || st.op === 'bos' || st.op === 'bos_degil') ? '' : (st.op || '');
    const op = ops.some((o) => o.id === rawCk) ? rawCk : '';
    return `
    <div class="filter-field filter-field--${bucket} filter-field--check" data-filter-key="${f.key}">
      <label>${f.label}</label>
      <div class="filter-controls">
        <select class="filter-op" data-filter-op="${f.key}" title="Operatör (boş = filtresiz)">
          ${ops.map((o) => `<option value="${escAttr(o.id)}" ${op === o.id ? 'selected' : ''}>${o.label === '' ? '\u00A0' : o.label}</option>`).join('')}
        </select>
        <div class="filter-values${filterOpHidesValues(op) ? ' filter-values--hidden' : ''}" data-filter-values="${f.key}" ${filterOpHidesValues(op) ? 'hidden' : ''}>
          ${filterValueControl(f, { ...st, op })}
        </div>
      </div>
    </div>`;
  }
  const ops = filterOperatorsFor(f);
  // Eski filtresiz/bos değerlerini boş satıra taşı
  const rawOp = (st.op === 'filtresiz' || st.op === 'bos' || st.op === 'bos_degil') ? '' : (st.op || '');
  const op = ops.some((o) => o.id === rawOp) ? rawOp : '';
  const hideVals = filterOpHidesValues(op);
  return `
    <div class="filter-field filter-field--${bucket}${hideVals ? ' filter-field--noval' : ''}" data-filter-key="${f.key}">
      <label>${f.label}</label>
      <div class="filter-controls">
        <select class="filter-op" data-filter-op="${f.key}" title="Operatör (boş = filtresiz)">
          ${ops.map((o) => `<option value="${escAttr(o.id)}" ${op === o.id ? 'selected' : ''}>${o.label === '' ? '\u00A0' : o.label}</option>`).join('')}
        </select>
        <div class="filter-values${op === 'arasinda' ? ' split' : ''}${hideVals ? ' filter-values--hidden' : ''}" data-filter-values="${f.key}" ${hideVals ? 'hidden' : ''}>
          ${filterValueControl(f, { ...st, op })}
        </div>
      </div>
    </div>`;
}

function renderFilterPane(screen) {
  const grid = $('#filterGrid');
  const { left, right } = partitionFilters(screen.filters || []);
  grid.innerHTML = `
    <div class="filter-col filter-col--scope">
      ${left.map(renderFilterField).join('') || '<div class="filter-col-empty"></div>'}
    </div>
    <div class="filter-col filter-col--main">
      ${right.map(renderFilterField).join('') || '<div class="filter-col-empty"></div>'}
    </div>`;
  grid.querySelectorAll('[data-filter-op]').forEach((el) => {
    el.addEventListener('change', () => syncBetweenInputs(screen));
  });
  syncBetweenInputs(screen);
}

/** Tüm listelerde ilk sütun: satır ID (ekran kolonlarında yoksa eklenir). */
function listColumns(screen) {
  const cols = (screen.columns || []).filter((c) => c.key !== 'id');
  return [{ key: 'id', label: 'ID', mono: true }, ...cols];
}

function cellHtml(col, row, index = 0) {
  let val = col.key === 'id' ? rowKey(row, index) : row[col.key];
  // Aktif kolonu Pasif olarak gösterilir: tik/Evet = is_inactive (is_active=false)
  if (col.key === 'is_active' && typeof val === 'boolean') {
    val = val ? 'Hayır' : 'Evet';
  } else if (col.key === 'parola_var') {
    val = val ? 'Var' : 'Yok';
  } else if (typeof val === 'boolean') {
    val = val ? 'Evet' : 'Hayır';
  }
  if (val === null || val === undefined || val === '') val = '—';
  return col.mono ? `<span class="mono">${val}</span>` : String(val);
}

function renderListSideNav(screen) {
  const nav = $('#listSideNav');
  if (!nav) return;
  const cats = screen.listCategories || [];
  if (!cats.length) {
    nav.hidden = true;
    nav.innerHTML = '';
    return;
  }
  nav.hidden = false;
  const active = state.listCategory || cats[0].id;
  state.listCategory = active;
  nav.innerHTML = cats.map((c) => `
    <button type="button" data-list-cat="${c.id}" class="${c.id === active ? 'active' : ''}">${c.label}</button>
  `).join('');
}

function rowsForList(screen) {
  let rows = state.rows || [];
  if (screen.listCategories?.length && screen.categoryKey && state.listCategory) {
    rows = rows.filter((r) => String(r[screen.categoryKey]) === String(state.listCategory));
  }
  return applyFilters(rows, screen);
}

/** Liste satır anahtarı — id yoksa bileşik anahtar (depo bakiye vb. tüm satır seçimini önler). */
function rowKey(row, index = 0) {
  if (row == null) return `row:${index}`;
  if (row.id !== undefined && row.id !== null && row.id !== '') return String(row.id);
  if (row.series_code) return String(row.series_code);
  const parts = [row.warehouse_id, row.item_id, row.stock_status, row.lot_id, row.item_code, index];
  const key = parts.filter((p) => p !== undefined && p !== null && p !== '').join(':');
  return key || `row:${index}`;
}

function ensureRowIds(rows) {
  return (rows || []).map((row, index) => {
    if (row && row.id !== undefined && row.id !== null && row.id !== '') return row;
    return { ...row, id: rowKey(row, index) };
  });
}

function renderList(screen) {
  const head = $('#dataHead');
  const body = $('#dataBody');
  const cols = listColumns(screen);
  renderListSideNav(screen);
  state.filtered = rowsForList(screen);
  head.innerHTML = `<tr>${cols.map((c) => `<th>${c.label}</th>`).join('')}</tr>`;
  if (!state.filtered.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="${cols.length}">Kayıt yok.</td></tr>`;
  } else {
    body.innerHTML = state.filtered.map((row, index) => {
      const key = rowKey(row, index);
      const selected = state.selectedId != null && String(key) === String(state.selectedId);
      return `
      <tr data-id="${escapeAttr(key)}" class="${selected ? 'selected' : ''}">
        ${cols.map((c) => `<td>${cellHtml(c, row, index)}</td>`).join('')}
      </tr>`;
    }).join('');
  }
  const baseCount = (screen.listCategories?.length && screen.categoryKey && state.listCategory)
    ? (state.rows || []).filter((r) => String(r[screen.categoryKey]) === String(state.listCategory)).length
    : (state.rows || []).length;
  $('#listMeta').textContent = `${state.filtered.length} / ${baseCount} kayıt`;
  updateActionButtons(screen);
}

function isSessionTamYetkili() {
  const s = state.session;
  if (!s) return true; // oturum yoksa eski davranış (açık demo)
  if (s._soft) return true; // token yok / soft oturum — ekranları kilitleme
  if (s.group_code === 'ADMIN') return true;
  if (String(s.role || '').toLowerCase() === 'yonetici') return true;
  const mods = s.module_permissions;
  if (Array.isArray(mods) && mods.includes('*')) return true;
  return false;
}

/**
 * Ekran erişim / aksiyon yetkisi.
 * ADMIN / Yönetici / soft oturum → her zaman tam erişim.
 * Kısıtlı kullanıcıda yalnızca yetki satırları geçerlidir.
 */
function ekranYetkisi(screenId, action = null) {
  const s = state.session;
  if (!s) return true;
  // Önce tam yetki — kısmi yetki satırları ADMIN'i engellemesin
  if (isSessionTamYetkili()) return true;
  const list = Array.isArray(s.yetkiler) ? s.yetkiler : [];
  if (!list.length) {
    const mods = s.module_permissions;
    // Yetki satırı yok + modül * veya tanımsız → aç
    return !mods || !mods.length || mods.includes('*');
  }
  const canonical = resolveScreenId(screenId);
  const aliasIds = Object.entries(SCREEN_ALIASES)
    .filter(([, v]) => v === canonical)
    .map(([k]) => k);
  const candidates = [screenId, canonical, ...aliasIds];
  const row = list.find((y) => candidates.includes(y.screen_id) && y.erisim !== false);
  if (!row) return false;
  if (!action) return true;
  if (action === 'export-csv' || action === 'mrp-talep' || action === 'mrp-uretim' || action === 'mrp-calistir') {
    return Boolean(row.incele || row.duzelt || row.yeni);
  }
  return Boolean(row[action]);
}

function updateActionButtons(screen) {
  const hasSel = Boolean(state.selectedId);
  document.querySelectorAll('#actionBar [data-action]').forEach((btn) => {
    const act = btn.dataset.action;
    if (screen.hideActions || (screen.readOnly && screen.crud === false)) {
      // Salt okunur kontrol ekranı — Yeni/İncele/Düzelt gizle; CSV kalabilir
      if (['yeni', 'incele', 'duzelt', 'kopyala', 'sil'].includes(act)) {
        btn.hidden = true;
        btn.disabled = true;
        return;
      }
      btn.hidden = false;
    } else {
      btn.hidden = false;
    }
    if (screen.readOnly && !screen.hideActions) {
      btn.disabled = act !== 'incele' || !hasSel;
      return;
    }
    const allowed = ekranYetkisi(screen.id, act === 'export-csv' || act === 'mrp-talep' ? act : act);
    if (!allowed && ['yeni', 'incele', 'duzelt', 'kopyala', 'sil'].includes(act)) {
      btn.disabled = true;
      return;
    }
    if (act === 'yeni') btn.disabled = !ekranYetkisi(screen.id, 'yeni');
    else if (act === 'export-csv') btn.disabled = !ekranYetkisi(screen.id, 'export-csv');
    else if (act === 'mrp-talep') {
      btn.hidden = !screen.mrpTalepAction;
      btn.disabled = !ekranYetkisi(screen.id, 'mrp-talep');
    } else if (act === 'mrp-uretim') {
      btn.hidden = !screen.mrpUretimAction;
      btn.disabled = !ekranYetkisi(screen.id, 'mrp-uretim');
    } else if (act === 'mrp-calistir') {
      btn.hidden = !screen.mrpCalistirAction;
      btn.disabled = !ekranYetkisi(screen.id, 'mrp-calistir');
    } else btn.disabled = !hasSel || !ekranYetkisi(screen.id, act);
  });
  const mrpBtn = $('#btnMrpTalep');
  if (mrpBtn) mrpBtn.hidden = !screen.mrpTalepAction;
  const mrpUe = $('#btnMrpUretim');
  if (mrpUe) mrpUe.hidden = !screen.mrpUretimAction;
  const mrpRun = $('#btnMrpCalistir');
  if (mrpRun) mrpRun.hidden = !screen.mrpCalistirAction;
}

async function openScreen(id, opts = {}) {
  try {
    const screen = findScreen(id);
    if (!screen) {
      toast(`Ekran bulunamadı: ${id || '?'}`);
      return;
    }
    if (!ekranYetkisi(screen.id)) {
      toast('Bu ekrana erişim yetkiniz yok.');
      return;
    }

    if (screen.metaExplorer) {
      state.screenId = id;
      state.formMode = null;
      state.selectedId = null;
      if (location.hash !== `#${id}`) {
        history.pushState({ screenId: id }, '', `#${id}`);
      }
      if (!opts.skipTab) addListTab(screen);
      else {
        state.activeTabKey = `list:${screen.id}`;
        renderTabBar();
      }
      ensureSidebarPath(screen);
      showView('meta');
      const banner = $('#metaBanner');
      if (banner) {
        banner.textContent = screen.techId
          ? `${screen.title} · ${screen.techId}`
          : screen.title;
      }
      await openMetaExplorer(opts.focusScreenId || state.metaFocusScreenId || null);
      return;
    }

    if (screen.sqlConsole) {
      state.screenId = id;
      state.formMode = null;
      state.selectedId = null;
      if (location.hash !== `#${id}`) {
        history.pushState({ screenId: id }, '', `#${id}`);
      }
      if (!opts.skipTab) addListTab(screen);
      else {
        state.activeTabKey = `list:${screen.id}`;
        renderTabBar();
      }
      ensureSidebarPath(screen);
      showView('sql');
      const banner = $('#sqlBanner');
      if (banner) {
        banner.textContent = screen.techId
          ? `${screen.title} · ${screen.techId}`
          : screen.title;
      }
      await openSqlConsole();
      return;
    }

    state.screenId = screen.id;
    state.selectedId = null;
    state.formMode = null;
    state.listCategory = screen.listCategories?.[0]?.id || null;
    if (!state.isYerleri.length && getActiveFirmaId()) {
      await loadIsYerleriForActiveFirma();
    }
    // Filtre lookup'larını yükle (firma / iş yeri seçicileri)
    await ensureFilterLookups(screen);
    state.filterState = buildDefaultFilterState(screen);
    if (opts.filterState && typeof opts.filterState === 'object') {
      state.filterState = { ...state.filterState, ...opts.filterState };
    }
    ensureSidebarPath(screen);

    if (location.hash !== `#${screen.id}`) {
      history.pushState({ screenId: screen.id }, '', `#${screen.id}`);
    }

    if (!opts.skipTab) addListTab(screen);
    else {
      state.activeTabKey = `list:${screen.id}`;
      renderTabBar();
    }
    showView('screen');
    ensureSearchBarVisible();
    {
      const title = $('#screenTitle');
      if (title) { title.hidden = false; title.textContent = screen.title; }
    }
    const banner = $('#screenBanner');
    if (banner) {
      banner.textContent = screen.banner
        ? `${screen.title} — ${screen.banner}${screen.techId ? ' · ' + screen.techId : ''}`
        : `${screen.title} açık${screen.techId ? ' · ' + screen.techId : ''} · UI build 20261017v`;
    }
    $('#searchResults').hidden = true;
    $('#listMeta').textContent = 'Yükleniyor…';
    {
      const cols = listColumns(screen);
      const head = $('#dataHead');
      if (head) head.innerHTML = `<tr>${cols.map((c) => `<th>${c.label}</th>`).join('')}</tr>`;
      $('#dataBody').innerHTML = `<tr class="empty-row"><td colspan="${cols.length || 1}">Yükleniyor…</td></tr>`;
    }

    // Zorunlu: ana alan gerçekten görünür mü?
    const screenEl = $('#viewScreen');
    if (screenEl && (screenEl.hidden || getComputedStyle(screenEl).display === 'none')) {
      screenEl.hidden = false;
      screenEl.style.cssText = 'display:grid !important;visibility:visible !important;opacity:1 !important;';
    }

    // Tıklama bitmeden menüyü yeniden çizme (bazı tarayıcılarda click iptal olabiliyor)
    requestAnimationFrame(() => renderSidebar());
    renderFilterPane(screen);

    if (window.matchMedia('(max-width: 900px)').matches) {
      $('#sidebar').classList.remove('open');
    }

    let data;
    if (screen.mrpSonucMode) {
      // Son seçilen veya en son MRP çalışmasının sonuçları
      let calismaId = state.mrpCalismaId;
      if (!calismaId) {
        const calismalar = await api('/mrp/calismalar');
        calismaId = Array.isArray(calismalar) && calismalar[0] ? calismalar[0].id : null;
        state.mrpCalismaId = calismaId;
      }
      data = calismaId ? await api(`/mrp/calismalar/${calismaId}/sonuclar`) : [];
      if (banner && calismaId) {
        banner.textContent = `${screen.title} · çalışma #${calismaId} · UI build 20261017u`;
      }
    } else {
      data = await api(
        buildListEndpoint(screen),
        screen.scopeFirma === false ? { skipFirma: true } : {},
      );
    }
    if (state.screenId !== screen.id) return;
    let rows = Array.isArray(data) ? data : [];
    if (!Array.isArray(data) && data && typeof data === 'object' && screen.listResponseKey) {
      rows = Array.isArray(data[screen.listResponseKey]) ? data[screen.listResponseKey] : [];
    }
    if (screen.id === 'numarator-tanimi') {
      rows = rows.map((r) => ({ ...r, id: r.series_code }));
    }
    state.rows = ensureRowIds(rows);
    renderList(screen);
    renderTabBar();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Ekran açılamadı');
    const screen = findScreen(id);
    if (!screen || state.screenId !== id) return;
    state.rows = [];
    state.filtered = [];
    showView('screen');
    const cols = listColumns(screen);
    const head = $('#dataHead');
    if (head) head.innerHTML = `<tr>${cols.map((c) => `<th>${c.label}</th>`).join('')}</tr>`;
    const msg = String(err.message || 'Ekran açılamadı').replace(/</g, '&lt;');
    $('#dataBody').innerHTML = `<tr class="empty-row"><td colspan="${cols.length || 1}">${msg}</td></tr>`;
    $('#listMeta').textContent = 'Hata';
    updateActionButtons(screen);
  }
}

const LOOKUP_ENDPOINTS = {
  'olcu-birimleri': '/olcu-birimleri?is_active=true',
  companies: '/companies',
  'is-yerleri': '/is-yerleri',
  warehouses: '/warehouses',
  items: '/items?is_active=true',
  'items-mamul': '/items?is_active=true&type=Mamul,YariMamul',
  countries: '/countries?is_active=true',
  'para-birimleri': '/para-birimleri?is_active=true',
  cities: '/cities?is_active=true',
  districts: '/districts?is_active=true',
  'odeme-kosullari': '/odeme-kosullari?is_active=true',
  'teslimat-kosullari': '/teslimat-kosullari?is_active=true',
  languages: '/languages?is_active=true',
  banks: '/banks?is_active=true',
  'doviz-kurlari': '/doviz-kurlari?son=true',
  'satin-alma-talepleri': '/satin-alma-talepleri',
  'satin-alma-teklifleri': '/satin-alma-teklifleri',
  'satin-alma-siparisleri': '/satin-alma-siparisleri',
  'tedarikci-irsaliyeleri': '/tedarikci-irsaliyeleri',
  'mal-kabuller': '/mal-kabuller',
  'giris-kontrolleri': '/giris-kontrolleri',
  'alis-faturalari': '/invoices?invoice_type=Alis',
  'satis-teklifleri': '/satis-teklifleri',
  'satis-faturalari': '/invoices?invoice_type=Satis',
  'fatura-yonetimi': '/invoices',
  'irsaliye-yonetimi': '/delivery_notes',
  'is-merkezleri': '/is-merkezleri',
  'is-istasyonlari': '/is-istasyonlari?is_active=true',
  'rota-sablonlari': '/routings?type=hepsi&template=true',
  'uretim-emirleri': '/uretim-emirleri',
  'uretim-planlari': '/uretim-planlari',
  'uretim-emri-tipleri': '/uretim-emri-tipleri?is_active=true',
  'stok-depo': '/stok-depo?is_active=true',
  'stok-partileri': '/stok-partileri',
  'crm-adaylar': '/crm-adaylar?is_active=true',
  'crm-firsatlar': '/crm-firsatlar?status=Acik',
  'crm-firsat-asamalari': '/crm-firsat-asamalari?is_active=true',
  'crm-faaliyet-tipleri': '/crm-faaliyet-tipleri?is_active=true',
  'crm-kontaklar': '/crm-kontaklar?is_active=true',
  users: '/users',
  'kullanici-gruplari': '/kullanici-gruplari',
  'satin-alma-siparisleri': '/satin-alma-siparisleri',
  'mal-kabuller': '/mal-kabuller',
  'fiyat-listeleri': '/fiyat-listeleri',
  'kk-kontrol-planlari': '/kk-kontrol-planlari',
  'kk-ret-nedenleri': '/kk-ret-nedenleri',
  'urun-agaclari': '/urun-agaclari?type=hepsi',
  routings: '/routings?type=hepsi',
  partners: '/partners?is_active=true',
  'partners-musteri': '/partners?tur=Musteri&is_active=true',
  'partners-tedarikci': '/partners?tur=Tedarikci&is_active=true',
  'kategoriler-abc': '/kategoriler?type=ABC&is_active=true',
  'kategoriler-marka': '/kategoriler?type=Marka&is_active=true',
  'kategoriler-temin': '/kategoriler?type=TeminSekli&is_active=true',
  'kategoriler-sektor': '/kategoriler?type=Sektor&is_active=true',
  'kategoriler-region': '/kategoriler?type=Bolge&is_active=true',
  'muhasebe-hesaplari': '/muhasebe-hesaplari',
  sales_orders: '/sales_orders',
  'sevk-emirleri': '/sevk-emirleri',
  delivery_notes: '/delivery_notes',
  'hareket-kodlari': '/hareket-kodlari?is_active=true',
  'hareket-kodlari-teklif': '/hareket-kodlari?document_type=SatisTeklif&is_active=true',
  'hareket-kodlari-siparis': '/hareket-kodlari?document_type=SatisSiparis&is_active=true',
  'hareket-kodlari-sevk': '/hareket-kodlari?document_type=SevkEmri&is_active=true',
  'hareket-kodlari-irsaliye': '/hareket-kodlari?document_type=SatisIrsaliye&is_active=true',
  'hareket-kodlari-fatura': '/hareket-kodlari?document_type=SatisFatura&is_active=true',
  'hareket-kodlari-stok': '/hareket-kodlari?is_active=true&grup=inv',
  'onay-rolleri': '/onay-rolleri',
  'onay-rotalari': '/onay-rotalari',
  'onay-message-sablonlari': '/onay-message-sablonlari?is_active=true',
  'onay-durumlari': '/onay-durumlari?is_active=true',
  'onay-module-kullanimlari': '/onay-module-kullanimlari?is_active=true',
  'onay-modul-kullanimlari': '/onay-module-kullanimlari?is_active=true',
  'onay-kurallari': '/onay-kurallari?is_active=true',
  'onay-ekranlari': '/onay-ekranlari',
  'onay-rota-tanim': '/onay-rotalari',
  'onay-message-template': '/onay-message-sablonlari?is_active=true',
  // İK / HR tanımları
  'hr-personel': '/hr-personel',
  'hr-departmanlar': '/hr-org/departmanlar',
  'hr-pozisyonlar': '/hr-org/pozisyonlar',
  'hr-calisma-takvimleri': '/hr-takvim/takvimler',
  'hr-vardiyalar': '/hr-takvim/vardiyalar',
  'hr-resmi-tatiller': '/hr-takvim/tatiller',
  'hr-izin-turleri': '/hr-izin/turler?is_active=true',
  'hr-izin-talepleri': '/hr-izin/talepler',
  'hr-bordro-donemleri': '/hr-bordro/donemler',
  'hr-bordro-parametreleri': '/hr-bordro/parametreler',
  'hr-bordro-calismalari': '/hr-bordro/calismalar',
  'hr-is-ilanlari': '/hr-ise-alim/ilanlar',
  'hr-adaylar': '/hr-ise-alim/adaylar',
  'hr-cikis-nedenleri': '/hr-ise-alim/cikis-nedenleri',
  'hr-ucretler': '/hr-bordro/ucretler',
  'hr-avanslar': '/hr-bordro/avanslar',
  // Diğer tanım ekranları
  'belge-tipleri': '/belge-tipleri?is_active=true',
  'finans-vergi-kodlari': '/finans-vergi-kodlari',
  'finans-ulke-paketleri': '/finans-country/paketler',
  'mali-yillar': '/muhasebe-donemleri/mali-yillar',
  'muhasebe-donemleri': '/muhasebe-donemleri',
};

/** Ekran kaydı → ek lookup anahtarları (endpoint eşleşmesi yetmezse / alias) */
const SCREEN_LOOKUP_EXTRAS = {
  companies: ['companies'],
  'is-yerleri': ['is-yerleri', 'companies'],
  warehouses: ['warehouses', 'is-yerleri', 'companies'],
  'stok-karti': ['items', 'items-mamul', 'stok-depo', 'stok-partileri'],
  'cari-kartlari': ['partners', 'partners-musteri', 'partners-tedarikci'],
  'kategori-tanimi': [
    'kategoriler-abc', 'kategoriler-marka', 'kategoriler-temin',
    'kategoriler-sektor', 'kategoriler-region',
  ],
  'hareket-kodlari': [
    'hareket-kodlari', 'hareket-kodlari-teklif', 'hareket-kodlari-siparis',
    'hareket-kodlari-sevk', 'hareket-kodlari-irsaliye', 'hareket-kodlari-fatura', 'hareket-kodlari-stok',
  ],
  kullanicilar: ['users'],
  'satis-siparisleri': ['sales_orders'],
  'satis-teklifleri': ['satis-teklifleri'],
  'alis-faturalari': ['alis-faturalari', 'mal-kabuller'],
  'fatura-yonetimi': ['fatura-yonetimi', 'alis-faturalari', 'satis-faturalari', 'mal-kabuller'],
  'irsaliye-yonetimi': ['irsaliye-yonetimi', 'delivery_notes'],
  'fatura-kontrolleri': ['alis-faturalari', 'fatura-yonetimi', 'mal-kabuller', 'satin-alma-siparisleri'],
  routings: ['is-istasyonlari', 'rota-sablonlari', 'is-merkezleri', 'urun-agaclari'],
  'is-istasyonlari': ['is-merkezleri', 'is-istasyonlari'],
  'hr-izin-turleri': ['hr-izin-turleri'],
  'hr-personel': ['hr-personel'],
  'hr-departmanlar': ['hr-departmanlar'],
  'hr-pozisyonlar': ['hr-pozisyonlar'],
  'hr-calisma-takvimleri': ['hr-calisma-takvimleri'],
  'hr-vardiyalar': ['hr-vardiyalar'],
  'hr-cikis-nedenleri': ['hr-cikis-nedenleri'],
  'hr-bordro-donemleri': ['hr-bordro-donemleri'],
  'hr-is-ilanlari': ['hr-is-ilanlari'],
  'belge-tipleri': ['belge-tipleri'],
  'finans-vergi-kodlari': ['finans-vergi-kodlari'],
  'finans-ulke-paketleri': ['finans-ulke-paketleri'],
  'mali-yillar': ['mali-yillar'],
  'onay-rota-tanim': ['onay-rota-tanim', 'onay-rotalari'],
  'onay-message-template': ['onay-message-template', 'onay-message-sablonlari'],
};

function invalidateLookups(...keys) {
  if (!keys.length) {
    state.lookupCache = {};
    return;
  }
  keys.forEach((k) => {
    delete state.lookupCache[k];
  });
}

/** Bu ekrana kaydedilen veri hangi sarı alan listelerini besler? */
function lookupsFedByScreen(screen) {
  if (!screen) return [];
  const keys = new Set(SCREEN_LOOKUP_EXTRAS[screen.id] || []);
  const base = typeof screenApiBase === 'function'
    ? screenApiBase(screen.endpoint || '')
    : String(screen.endpoint || '').split('?')[0];
  if (base) {
    Object.entries(LOOKUP_ENDPOINTS).forEach(([k, url]) => {
      const path = String(url).split('?')[0];
      if (path === base || path.startsWith(`${base}/`)) keys.add(k);
    });
  }
  return [...keys];
}

function invalidateLookupsForScreen(screen) {
  const keys = lookupsFedByScreen(screen);
  if (keys.length) invalidateLookups(...keys);
  // Bilinmeyen ekranda tüm cache’i silme — gereksiz yavaşlık + liste boşalması
}

/** Lookup anahtarı → API yolu. LOOKUP_ENDPOINTS yoksa ekran id / endpoint’ten çöz. */
function resolveLookupEndpoint(key) {
  if (!key) return null;
  if (LOOKUP_ENDPOINTS[key]) return LOOKUP_ENDPOINTS[key];
  // lookup: 'ekran-id' kalıbı — tanım ekranı endpoint’ini kullan
  const screen = (typeof findScreen === 'function' && findScreen(key))
    || (typeof screenForLookupKey === 'function' && screenForLookupKey(key))
    || null;
  if (screen?.endpoint) {
    const base = typeof screenApiBase === 'function'
      ? screenApiBase(screen.endpoint)
      : String(screen.endpoint).split('?')[0];
    return base || null;
  }
  return null;
}

function buildEkranLookupRows() {
  return (ALL_SCREENS || []).map((s) => ({
    id: s.id,
    screen_code: s.id,
    screen_id: s.id,
    screen_name: s.title,
    tech_id: s.techId || '',
    module_title: s.moduleTitle || '',
  })).sort((a, b) => String(a.screen_name).localeCompare(String(b.screen_name), 'tr'));
}

async function fetchLookupKey(key) {
  // UI ekran kataloğu — API’ye gitmeden MODULES’ten
  if (key === 'ekranlar' || key === 'screens' || key === 'onay-ekranlari') {
    // onay-ekranlari API varsa onu tercih et; yoksa tam katalog
    if (key === 'onay-ekranlari') {
      try {
        const rows = await api('/onay-ekranlari');
        if (Array.isArray(rows) && rows.length) {
          state.lookupCache[key] = rows.map((r) => ({
            ...r,
            screen_code: r.screen_code || r.screen_id,
            screen_name: r.screen_name || r.title,
          }));
          return state.lookupCache[key];
        }
      } catch (_) { /* fallback */ }
    }
    state.lookupCache[key] = buildEkranLookupRows();
    return state.lookupCache[key];
  }
  const ep = resolveLookupEndpoint(key);
  if (!ep) {
    state.lookupCache[key] = state.lookupCache[key] || [];
    return state.lookupCache[key];
  }
  try {
    // Firmalar her zaman tam liste (backend zaten izolasyonsuz).
    // İş yeri/depo lookup’ı aktif firmaya bağlı kalsın — org liste ekranları
    // openScreen’de skipFirma ile ayrı yüklenir; cache karışmasın.
    const rows = await api(ep, key === 'companies' ? { skipFirma: true } : {});
    state.lookupCache[key] = Array.isArray(rows) ? rows : [];
    if (key === 'companies') state.companies = state.lookupCache[key];
    if (key === 'is-yerleri') state.isYerleri = state.lookupCache[key];
  } catch (_) {
    state.lookupCache[key] = [];
  }
  return state.lookupCache[key];
}

function collectScreenLookupKeys(screen) {
  const needed = new Set();
  const collect = (fields) => {
    (fields || []).forEach((f) => {
      if (f.type === 'lookup' && f.lookup) needed.add(f.lookup);
    });
  };
  collect(screen.masterFields);
  collect(screen.detailFields);
  (screen.filters || []).forEach((f) => {
    if (f.type === 'lookup' && f.lookup) needed.add(f.lookup);
  });
  (screen.formTabs || []).forEach((tab) => {
    collect(tab.fields);
    collect(tab.masterFields);
    collect(tab.detailFields);
    collect(tab.grid?.fields);
    collect(tab.componentFields);
    collect(tab.altFields);
    if (tab.kind === 'bom-tree' || tab.kind === 'bom-workspace'
        || tab.kind === 'rota-flow' || tab.kind === 'rota-workspace') {
      needed.add('items');
      needed.add('items-mamul');
      needed.add('urun-agaclari');
      needed.add('warehouses');
      needed.add('olcu-birimleri');
    }
    collect(tab.headerFields);
  });
  return needed;
}

async function ensureFilterLookups(screen) {
  const needed = new Set();
  (screen.filters || []).forEach((f) => {
    if (f.type === 'lookup' && f.lookup) needed.add(f.lookup);
  });
  // Liste filtreleri de sarı alan — her açılışta taze veri
  await Promise.all([...needed].map((key) => fetchLookupKey(key)));
}

/**
 * Sarı alan (lookup) listeleri: form/liste her açılışında API'den yenilenir.
 * Aksi halde yeni kaydedilen kartlar eski cache yüzünden görünmez.
 */
async function ensureLookups(screen) {
  const needed = collectScreenLookupKeys(screen);
  await Promise.all([...needed].map((key) => fetchLookupKey(key)));
}

function escAttr(v) {
  return String(v ?? '').replace(/"/g, '&quot;');
}

/** Noktalı halka — tıklanınca ekran benzeri liste/CRUD popup; ↓ tuşu native listeyi açar */
function lookupBrowseButtonHtml(disabled) {
  if (disabled) return '';
  return `<button type="button" class="lookup-browse-btn" tabindex="-1" title="Liste / ekran aç" aria-label="Kayıt listesini ve ekran işlemlerini aç"><span class="lookup-browse-dot" aria-hidden="true"></span></button>`;
}

/** LIKE %metin% — kullanıcı % yazsa da tek sarmalama */
function normalizeLikeNeedle(q) {
  let s = String(q || '').trim();
  s = s.replace(/^%+/, '').replace(/%+$/, '').trim();
  return s.toLocaleLowerCase('tr');
}

function likeIncludes(haystack, needle) {
  if (!needle) return true;
  return String(haystack ?? '').toLocaleLowerCase('tr').includes(needle);
}

function wrapLookupPick(innerHtml, disabled = false) {
  return `<div class="lookup-widget">${innerHtml}${lookupBrowseButtonHtml(disabled)}</div>`;
}

/** Yazılabilir lookup: gizli select (değer) + typeahead (manuel arama %…%) */
function wrapLookupCombobox(selectHtml, displayText, disabled = false) {
  const shown = displayText && displayText !== '—' ? displayText : '';
  return `<div class="lookup-widget lookup-combobox">
    <div class="lookup-combo-main">
      ${selectHtml}
      <input type="text" class="lookup-typeahead" value="${escAttr(shown)}"
        placeholder="Yazarak ara (%…%)" ${disabled ? 'disabled' : ''} autocomplete="off"
        spellcheck="false" />
      <div class="lookup-suggest" hidden role="listbox"></div>
    </div>
    ${lookupBrowseButtonHtml(disabled)}
  </div>`;
}

function syncLookupTypeaheadFromSelect(sel) {
  if (!sel) return;
  const widget = sel.closest('.lookup-widget');
  const ta = widget?.querySelector('.lookup-typeahead');
  if (!ta) return;
  const opt = sel.selectedOptions?.[0];
  let text = opt?.getAttribute('title') || opt?.textContent || '';
  if (!sel.value || text === '—' || text === emptyLookupLabel()) text = '';
  ta.value = text;
}

function emptyLookupLabel() {
  return '—';
}

function fieldControl(field, value, attrName = 'data-master', extraAttrs = '', ctx = null) {
  if (field.type === 'static') {
    return `<span class="field-static" aria-hidden="true">${escAttr(field.label || '=')}</span>`;
  }
  const codeLocked = field.code && !(field.editableOnNew && state.formMode === 'yeni');
  const forceDisabled = state.formMode === 'incele' || codeLocked || field.readOnly;
  const dis = forceDisabled ? 'disabled' : '';
  const req = field.required ? 'aria-required="true"' : '';
  const v = value ?? '';
  const name = `${attrName}="${field.key}" ${extraAttrs}`.trim();
  if (field.type === 'checkbox') {
    // key=is_active alanı "Pasif" olarak gösterilir: tikli = is_inactive (is_active false)
    const checked = field.key === 'is_active' ? !v : !!v;
    return `<input type="checkbox" ${name} ${checked ? 'checked' : ''} ${dis} ${req} />`;
  }
  if (field.type === 'password') {
    const needNew = field.requiredOnNew && state.formMode === 'yeni';
    const ph = state.formMode === 'duzelt' || state.formMode === 'incele'
      ? 'Boş bırakırsanız şifre değişmez'
      : 'Giriş şifresi';
    const reqPw = needNew ? 'aria-required="true"' : req;
    // Mevcut hash asla forma basılmaz — yaz-only
    return `<input type="password" ${name} value="" autocomplete="new-password" placeholder="${escAttr(ph)}" ${dis} ${reqPw} />`;
  }
  if (field.type === 'select') {
    const opts = field.options || [];
    // İki seçenek: dropdown yerine kompakt aç/kapa (segment)
    if (opts.length === 2) {
      // Her segment örneği benzersiz name alsın (master/grid/bom/flow — tüm ekranlar)
      if (!fieldControl._segSeq) fieldControl._segSeq = 0;
      fieldControl._segSeq += 1;
      const radioName = `seg_${String(attrName || 'f').replace(/[^a-z0-9]+/gi, '_')}_${field.key}_${fieldControl._segSeq}`;
      const cur = (v === '' || v == null) ? opts[0] : v;
      return `<div class="seg-toggle" role="radiogroup" aria-label="${escAttr(field.label || field.key)}">${opts.map((o) => {
        const on = String(cur) === String(o);
        return `<label class="seg-opt">
          <input type="radio" name="${escAttr(radioName)}" ${name} value="${escAttr(o)}" ${on ? 'checked' : ''} ${dis} ${req} />
          <span>${escAttr(o)}</span>
        </label>`;
      }).join('')}</div>`;
    }
    const sel = `<select class="lookup-pick lookup-combo-select" ${name} ${dis} ${req}>
      <option value="">—</option>
      ${opts.map((o) => `<option value="${o}" ${String(v) === String(o) ? 'selected' : ''}>${o || '—'}</option>`).join('')}
    </select>`;
    return wrapLookupCombobox(sel, v === '' || v == null ? '' : String(v), Boolean(dis));
  }
  if (field.type === 'lookup') {
    const scope = ctx || state.formRecord || {};
    const rows = lookupRowsForField(field, scope);
    const dep = field.dependsOn ? ` data-depends-on="${escAttr(field.dependsOn)}"` : '';
    const bom = field.filterByBomKey ? ` data-filter-bom="${escAttr(field.filterByBomKey)}"` : '';
    const sel = `<select class="lookup-select lookup-pick lookup-combo-select" ${name} ${dis} ${req}${dep}${bom}>${buildLookupOptionsHtml(field, v, rows)}</select>`;
    const display = lookupDisplay(field, v);
    return wrapLookupCombobox(sel, display === '—' ? '' : display, Boolean(dis));
  }
  if (field.type === 'number') {
    return `<input type="number" ${name} value="${escAttr(v)}" ${dis} ${req} />`;
  }
  if (field.type === 'date') {
    const dv = v ? String(v).slice(0, 10) : '';
    return `<input type="date" ${name} value="${escAttr(dv)}" ${dis} ${req} />`;
  }
  const maxLen = Number(field.maxLength) > 0
    ? ` maxlength="${Number(field.maxLength)}"`
    : '';
  return `<input type="text" ${name} value="${escAttr(v)}" ${dis} ${req}${maxLen} />`;
}

function detailFieldControl(field, value, idx, gridKey = null, rowCtx = null) {
  const extra = gridKey
    ? `data-didx="${idx}" data-grid="${gridKey}"`
    : `data-didx="${idx}"`;
  return fieldControl(field, value, 'data-detail', extra, rowCtx || {});
}

function emptyRowFromFields(fields) {
  const row = {};
  (fields || []).forEach((f) => {
    if (f.type === 'static') return;
    if (f.type === 'checkbox') row[f.key] = false;
    else if (f.key === 'source_katsayi' || (f.key === 'katsayi' && f.type === 'number')) row[f.key] = 1;
    else row[f.key] = '';
  });
  return row;
}

/** Ürün ağacı boş satır — önceki satırın stok/quantity/görünüm alanlarını asla taşıma */
function blankBomRow(fields) {
  return {
    ...emptyRowFromFields(fields),
    component_item_id: '',
    quantity: '',
    net_quantity: '',
    gross_quantity: '',
    qty_entry_type: 'Net',
    uom_code: '',
    item_code: '',
    item_name: '',
    item_type: '',
    line_no: '',
    line_type: '',
    component_type: 'Stok',
    component_alt_no: '00',
    line_description: '',
    line_description_2: '',
    scrap_pct: 0,
    operation_seq: '',
    operation_code: '',
    operation_name: '',
    operation_no: '',
    warehouse_id: '',
    is_fixed_qty: false,
    goes_to_wo: true,
    is_phantom: false,
    is_byproduct: false,
    stop_explosion: false,
    no_consume_on_receipt: false,
    no_subcontract: false,
    is_disassemble: false,
    packaging_dependent: false,
    byproduct_cost_ratio: 0,
    alternatifler: [],
    alt_satirlar: [],
  };
}

function blankBomAltRow(altFields) {
  return {
    ...emptyRowFromFields(altFields || []),
    alt_item_id: '',
    priority: 10,
    quantity: '',
    uom_code: '',
    quality_code: '',
    color_code: '',
    packaging_type_code: '',
    notes: '',
  };
}

function syncBomQtyFields(node) {
  if (!node) return node;
  const scrap = Math.max(0, Number(node.scrap_pct) || 0);
  const factor = 1 + scrap / 100;
  const entry = String(node.qty_entry_type || 'Net');
  const isBrut = /^brut|brüt$/i.test(entry);
  if (isBrut) {
    const gross = Number(node.gross_quantity != null && node.gross_quantity !== '' ? node.gross_quantity : node.quantity) || 0;
    node.gross_quantity = gross;
    node.net_quantity = factor > 0 ? +(gross / factor).toFixed(6) : gross;
    node.quantity = node.net_quantity;
    node.qty_entry_type = 'Brut';
  } else {
    const net = Number(node.net_quantity != null && node.net_quantity !== '' ? node.net_quantity : node.quantity) || 0;
    node.net_quantity = net;
    node.gross_quantity = +(net * factor).toFixed(6);
    node.quantity = net;
    node.qty_entry_type = 'Net';
  }
  return node;
}

/** Form kontrolüne tıklanınca satır seçimi / yeniden çizim tetiklenmesin */
function isFormControlClick(target) {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest(
    'select, input, textarea, option, label, button.btn, button.lookup-browse-btn, '
    + '.bom-inline-editor, .rota-op-body, .detail-slot-fields, .detail-table td input, '
    + '.detail-table td select, .lookup-pair, .lookup-widget, '
    + '[data-flow-editor], [data-bom-editor], [contenteditable="true"]'
  ));
}

/** Boş placeholder satır üretmez — yalnızca gerçek satırlar */
function normalizeGridRows(tab, rows) {
  const fields = tab.fields || [];
  return (Array.isArray(rows) ? rows : []).map((src) => {
    const row = emptyRowFromFields(fields);
    // DB satır kimliği her zaman korunsun (UI alanında olmasa bile)
    if (src?.id !== undefined && src?.id !== null && src.id !== '') row.id = src.id;
    fields.forEach((f) => {
      if (f.type === 'static') return;
      if (f.type === 'checkbox') row[f.key] = Boolean(src?.[f.key]);
      else if (src?.[f.key] !== undefined && src?.[f.key] !== null && src[f.key] !== '') {
        row[f.key] = src[f.key];
      }
    });
    // nested children for rota etc.
    if (Array.isArray(src?.bilesenler)) row.bilesenler = src.bilesenler.map((b) => ({ ...b }));
    if (Array.isArray(src?.ekipmanlar)) row.ekipmanlar = src.ekipmanlar.map((e) => ({ ...e }));
    if (Array.isArray(src?.alt_satirlar)) row.alt_satirlar = src.alt_satirlar;
    Object.keys(src || {}).forEach((k) => {
      if (k.startsWith('_')) {
        row[k] = src[k];
        return;
      }
      if (row[k] === undefined) row[k] = src[k];
    });
    return row;
  });
}

function ensureGridSlots(tab, rows) {
  return normalizeGridRows(tab, rows);
}

function lookupDisplay(field, value) {
  if (value === undefined || value === null || value === '') return '—';
  const rows = state.lookupCache[field.lookup] || [];
  const vk = field.valueKey || 'id';
  const lk = field.labelKey || 'adi';
  const ck = field.codeKey;
  const hit = rows.find((r) =>
    String(r[vk]) === String(value)
    || (lk && String(r[lk]) === String(value))
    || (ck && String(r[ck]) === String(value)));
  if (!hit) return String(value);
  return ck ? `${hit[ck] || ''} — ${hit[lk] || ''}` : `${hit[lk] || hit[vk]}`;
}

function stokLookupById(id) {
  if (id == null || id === '') return null;
  const pools = [
    state.lookupCache.items,
    state.lookupCache['items-mamul'],
  ];
  for (const rows of pools) {
    if (!Array.isArray(rows)) continue;
    const hit = rows.find((r) => String(r.id) === String(id));
    if (hit) return hit;
  }
  return null;
}

function tipSeviyeLabel(type) {
  const t = String(type || '');
  if (/yarı|yari/i.test(t)) return 'Yarı mamul';
  if (/ham/i.test(t)) return 'Hammadde';
  if (/mamul/i.test(t)) return 'Mamul';
  return t || 'Malzeme';
}

function tipBadge(type) {
  const t = type || '';
  const cls = /mamul/i.test(t) && !/yarı|yari/i.test(t) ? 'type-mamul'
    : /yarı|yari/i.test(t) ? 'type-ym'
      : /ham/i.test(t) ? 'type-hm' : 'type-other';
  const label = tipSeviyeLabel(t);
  return `<span class="type-badge ${cls}">${label === 'Malzeme' ? (t || '—') : label}</span>`;
}

function gridRowSummary(tab, row) {
  const parts = (tab.fields || []).slice(0, 3).map((f) => {
    if (f.type === 'lookup') return lookupDisplay(f, row[f.key]);
    if (f.type === 'checkbox') return row[f.key] ? f.label : null;
    const v = row[f.key];
    return v === '' || v == null ? null : String(v);
  }).filter(Boolean);
  return parts.join(' · ') || '(boş satır)';
}

function buildBomTreeFromFlat(satirlar) {
  const list = Array.isArray(satirlar) ? satirlar.map((s) => ({
    ...s,
    alt_satirlar: [],
  })) : [];
  const byId = new Map();
  list.forEach((s) => { if (s.id != null) byId.set(s.id, s); });
  const roots = [];
  list.forEach((s) => {
    if (s.parent_line_id && byId.has(s.parent_line_id)) {
      byId.get(s.parent_line_id).alt_satirlar.push(s);
    } else {
      roots.push(s);
    }
  });
  // API nested agac already has alt_satirlar
  if (!list.length && Array.isArray(satirlar)) return [];
  return roots.length ? roots : list.map((s) => ({ ...s, alt_satirlar: s.alt_satirlar || [] }));
}

function ensureBomTree(rec) {
  // satırlar düzenleme kaynağıdır. agac ile aynı referansa zorlamak
  // (agac.map → satirlar) kayıtları silip «eklendi» toast’una rağmen boş ağaç bırakıyordu.
  let nodes;
  if (Array.isArray(rec.satirlar)) {
    const hasNest = rec.satirlar.some((s) => Array.isArray(s.alt_satirlar) && s.alt_satirlar.length);
    const hasUst = rec.satirlar.some((s) => s.parent_line_id);
    if (!hasNest && hasUst) nodes = buildBomTreeFromFlat(rec.satirlar);
    else {
      nodes = rec.satirlar.map((s) => ({
        ...s,
        alt_satirlar: Array.isArray(s.alt_satirlar) ? s.alt_satirlar : [],
      }));
    }
  } else if (Array.isArray(rec.agac) && rec.agac.length) {
    nodes = rec.agac.map((n) => ({
      ...n,
      alt_satirlar: Array.isArray(n.alt_satirlar) ? n.alt_satirlar : [],
    }));
  } else {
    nodes = [];
  }
  rec.satirlar = nodes;
  rec.agac = nodes;
  return nodes;
}

function getBomNode(nodes, path) {
  if (!path && path !== 0) return null;
  const parts = String(path).split('.').map(Number);
  let cur = nodes;
  let node = null;
  for (const p of parts) {
    node = cur?.[p];
    if (!node) return null;
    cur = node.alt_satirlar || [];
  }
  return node;
}

function setBomNodeChildren(nodes, path, children) {
  const node = getBomNode(nodes, path);
  if (node) node.alt_satirlar = children;
}

function removeBomNode(nodes, path) {
  const parts = String(path).split('.').map(Number);
  if (parts.length === 1) {
    nodes.splice(parts[0], 1);
    return nodes;
  }
  const parentPath = parts.slice(0, -1).join('.');
  const parent = getBomNode(nodes, parentPath);
  if (parent?.alt_satirlar) parent.alt_satirlar.splice(parts[parts.length - 1], 1);
  return nodes;
}

function flattenBomForSave(nodes) {
  return (nodes || []).map((raw) => {
    const n = syncBomQtyFields({ ...raw });
    return {
      component_item_id: n.component_item_id || n.item_id,
      quantity: n.quantity,
      net_quantity: n.net_quantity,
      gross_quantity: n.gross_quantity,
      qty_entry_type: n.qty_entry_type || 'Net',
      uom_code: n.uom_code || null,
      line_no: n.line_no,
      line_type: n.line_type || null,
      component_type: n.component_type || 'Stok',
      component_alt_no: n.component_alt_no != null ? String(n.component_alt_no) : '00',
      line_description: n.line_description || n.description || null,
      line_description_2: n.line_description_2 || null,
      scrap_pct: n.scrap_pct != null ? Number(n.scrap_pct) : 0,
      operation_seq: n.operation_seq !== '' && n.operation_seq != null ? Number(n.operation_seq) : null,
      operation_code: n.operation_code || null,
      operation_name: n.operation_name || null,
      operation_no: n.operation_no || null,
      warehouse_id: n.warehouse_id || null,
      position_no: n.position_no || null,
      drawing_no: n.drawing_no || null,
      line_revision: n.line_revision || null,
      brand_code: n.brand_code || null,
      attr3_code: n.attr3_code || null,
      delivery_control_code: n.delivery_control_code || null,
      packaging_type_code: n.packaging_type_code || null,
      packaging_type_name: n.packaging_type_name || null,
      byproduct_cost_ratio: n.byproduct_cost_ratio != null ? Number(n.byproduct_cost_ratio) : 0,
      disassemble_operation_code: n.disassemble_operation_code || null,
      disassemble_operation_name: n.disassemble_operation_name || null,
      disassemble_operation_no: n.disassemble_operation_no || null,
      is_fixed_qty: Boolean(n.is_fixed_qty),
      goes_to_wo: n.goes_to_wo == null ? true : Boolean(n.goes_to_wo),
      is_phantom: Boolean(n.is_phantom) || n.component_type === 'Phantom',
      is_byproduct: Boolean(n.is_byproduct) || n.component_type === 'YanUrun',
      stop_explosion: Boolean(n.stop_explosion),
      no_consume_on_receipt: Boolean(n.no_consume_on_receipt),
      no_subcontract: Boolean(n.no_subcontract),
      is_disassemble: Boolean(n.is_disassemble),
      packaging_dependent: Boolean(n.packaging_dependent),
      valid_from: n.valid_from || null,
      valid_to: n.valid_to || null,
      alternatifler: (Array.isArray(n.alternatifler) ? n.alternatifler : [])
        .filter((a) => a && (a.alt_item_id || a.component_item_id))
        .map((a) => ({
          alt_item_id: a.alt_item_id || a.component_item_id,
          priority: a.priority != null ? Number(a.priority) : 10,
          quantity: a.quantity !== '' && a.quantity != null ? Number(a.quantity) : null,
          uom_code: a.uom_code || null,
          quality_code: a.quality_code || null,
          color_code: a.color_code || null,
          packaging_type_code: a.packaging_type_code || null,
          notes: a.notes || null,
        })),
      alt_satirlar: flattenBomForSave(n.alt_satirlar || []),
    };
  }).filter((n) => n.component_item_id && n.quantity != null && n.quantity !== '');
}

/** Başlıkta tutulacak alan sayısı — fazlası “Ek bilgiler”e iner (master ≤ ~%25). */
const MASTER_PRIMARY_MAX = 6;

/** Alt şeride inen not / açıklama alanları (master’dan ayrılır). */
function isFooterNoteField(f) {
  const k = String(f?.key || '');
  return /^(description(_\d+)?|public_note|internal_note|acma_kapama|source|onay_status|delivery_footer_discount)$/i.test(k)
    || /^not_/i.test(k);
}

/** Belge satırlarından ara / KDV / genel toplam (çoklu isk + KDV dahil/hariç + ÖTV + tevkifat). */
function computeDocumentTotals(rows, fields) {
  const list = Array.isArray(rows) ? rows : [];
  const keys = new Set((fields || []).map((f) => f.key));
  const hasFiyat = keys.has('unit_price') || list.some((r) => r.unit_price != null && r.unit_price !== '');
  const hasMiktar = keys.has('quantity') || list.some((r) => r.quantity != null && r.quantity !== '');
  if (!hasFiyat || !hasMiktar) {
    return { count: list.length, subtotal: null, tax_amount: null, grand_total: null };
  }
  let ara = 0;
  let kdv = 0;
  let otv = 0;
  let tev = 0;
  let bandrol = 0;
  let iskToplam = 0;
  list.forEach((row) => {
    const quantity = Number(row.quantity) || 0;
    let fiyat = Number(row.unit_price) || 0;
    const isk1 = Number(row.discount_rate) || 0;
    const isk2 = Number(row.discount_rate_2) || 0;
    const isk3 = Number(row.discount_rate_3) || 0;
    const kdvOran = Number(row.vat_rate) || 0;
    const otvOran = Number(row.excise_rate) || 0;
    const tevOran = Number(row.withholding_rate) || 0;
    const bandOran = Number(row.bandrol_rate) || 0;
    const dahil = String(row.vat_mode || 'Haric').toLocaleLowerCase('tr').startsWith('dahil');
    if (dahil && kdvOran > 0) fiyat /= (1 + kdvOran / 100);
    const brut = quantity * fiyat;
    const i1 = brut * (isk1 / 100);
    const after1 = brut - i1;
    const i2 = after1 * (isk2 / 100);
    const after2 = after1 - i2;
    const i3 = after2 * (isk3 / 100);
    const mal = after2 - i3;
    const otvSatir = mal * (otvOran / 100);
    const kdvSatir = (mal + otvSatir) * (kdvOran / 100);
    const tevSatir = kdvSatir * (tevOran / 100);
    const bandSatir = mal * (bandOran / 100);
    ara += mal;
    kdv += kdvSatir;
    otv += otvSatir;
    tev += tevSatir;
    bandrol += bandSatir;
    iskToplam += i1 + i2 + i3;
  });
  return {
    count: list.length,
    subtotal: ara,
    total_discount: iskToplam,
    total_excise: otv,
    tax_amount: kdv,
    total_withholding: tev,
    total_bandrol: bandrol,
    grand_total: ara + otv + kdv - tev + bandrol,
  };
}

function formatTotalAmount(n) {
  if (n == null || Number.isNaN(Number(n))) return '';
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderDocumentFooter(rec, noteFields, gridFields, gridKey) {
  const notes = Array.isArray(noteFields) ? noteFields : [];
  const rows = gridKey && Array.isArray(rec?.[gridKey]) ? rec[gridKey] : [];
  const totals = computeDocumentTotals(rows, gridFields);
  const showMoney = totals.subtotal != null;
  if (!notes.length && !showMoney && !gridKey) return '';
  const notesHtml = notes.length
    ? notes.map((f) => fieldShell(f, fieldControl(f, rec?.[f.key], 'data-master', '', rec || {}), rec?.[f.key])).join('')
    : '<div class="md-footer-empty">Belge notu / bağlantı alanı yok</div>';
  const extraRows = [];
  if (showMoney && totals.total_discount > 0) {
    extraRows.push(`<div class="md-total-row"><label>Toplam iskonto</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.total_discount))}" /></div>`);
  }
  if (showMoney && totals.total_excise > 0) {
    extraRows.push(`<div class="md-total-row"><label>Toplam ÖTV</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.total_excise))}" /></div>`);
  }
  if (showMoney && totals.total_withholding > 0) {
    extraRows.push(`<div class="md-total-row"><label>Tevkifat</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.total_withholding))}" /></div>`);
  }
  if (showMoney && totals.total_bandrol > 0) {
    extraRows.push(`<div class="md-total-row"><label>Bandrol</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.total_bandrol))}" /></div>`);
  }
  const altiIsk = Number(rec?.delivery_footer_discount) || 0;
  if (showMoney && altiIsk > 0) {
    extraRows.push(`<div class="md-total-row"><label>İrs. altı iskonto</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(altiIsk))}" /></div>`);
  }
  const genel = showMoney ? (Number(totals.grand_total) || 0) - altiIsk : null;
  const totalsHtml = showMoney
    ? `
      <div class="md-total-row"><label>Mal tutarı</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.subtotal))}" /></div>
      ${extraRows.join('')}
      <div class="md-total-row"><label>Toplam KDV</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.tax_amount))}" /></div>
      <div class="md-total-row md-total-row--grand"><label>Genel toplam</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(genel))}" /></div>`
    : `
      <div class="md-total-row"><label>Satır</label><input type="text" readonly tabindex="-1" value="${totals.count} adet" /></div>`;
  return `
    <footer class="md-footer" aria-label="Toplam ve bağlantı">
      <div class="md-footer-notes">${notesHtml}</div>
      <div class="md-footer-totals">${totalsHtml}</div>
    </footer>`;
}

function masterFieldScore(f) {
  let s = 0;
  if (f.lead) s += 1000; // numaratör sürücü / önce seçilecek alan
  if (f.critical) s += 900; // sorunlu / olmazsa olmaz — master’da kalsın
  if (f.code) s += 100;
  if (f.name) s += 90;
  if (f.required) s += 70;
  if (f.key === 'status') s += 65;
  if (f.type === 'date' || /tarih/i.test(f.key || '')) s += 55;
  if (f.type === 'lookup') s += 45;
  if (f.type === 'select') s += 35;
  if (/_no$|_kodu$|_adi$/.test(f.key || '')) s += 20;
  return s;
}

/** Stok kartı: master firma/iş yeri ↔ is_yeri_baglari senkronu */
function hydrateStokFirmaIsYeri(rec) {
  if (!rec) return;
  const bags = Array.isArray(rec.is_yeri_baglari) ? rec.is_yeri_baglari : [];
  if (!rec.plant_id && bags.length) {
    const first = bags.find((b) => b.plant_id) || bags[0];
    if (first?.plant_id) rec.plant_id = Number(first.plant_id);
  }
  if (!rec.company_id && getActiveFirmaId()) {
    rec.company_id = getActiveFirmaId();
  }
}

function syncStokFirmaIsYeriForSave(master) {
  const firmaId = Number(master.company_id) || getActiveFirmaId() || null;
  const iyId = Number(master.plant_id) || null;
  if (firmaId) master.company_id = firmaId;
  if (iyId) {
    master.plant_id = iyId;
    const bags = Array.isArray(master.is_yeri_baglari) ? [...master.is_yeri_baglari] : [];
    const has = bags.some((b) => Number(b.plant_id) === iyId);
    if (!has) bags.unshift({ plant_id: iyId, is_active: true });
    master.is_yeri_baglari = bags;
  }
}

/** Kalabalık master listesini birincil + ek + alt şerit notlarına böler. */
function partitionMasterFields(fields, maxPrimary = MASTER_PRIMARY_MAX) {
  const raw = Array.isArray(fields) ? fields : [];
  const footerNotes = raw.filter((f) => isFooterNoteField(f));
  const list = raw.filter((f) => !isFooterNoteField(f));
  if (list.length <= maxPrimary) {
    const leads = list.filter((f) => f.lead);
    const rest = list.filter((f) => !f.lead);
    return {
      primary: leads.length ? [...leads, ...rest] : list,
      extras: [],
      footerNotes,
    };
  }
  const ranked = list
    .map((f, i) => ({ f, i, s: masterFieldScore(f) }))
    .sort((a, b) => b.s - a.s || a.i - b.i);
  const keep = new Set(ranked.slice(0, maxPrimary).map((x) => x.i));
  const picked = list.filter((_, i) => keep.has(i));
  const leads = picked.filter((f) => f.lead);
  const rest = picked.filter((f) => !f.lead);
  return {
    primary: [...leads, ...rest],
    extras: list.filter((_, i) => !keep.has(i)),
    footerNotes,
  };
}

function detailColClass(f) {
  if (f?.type === 'static') return 'col--eq';
  const size = inferFieldSizeClass(f).replace('field--', '');
  if (size === 'short' || f?.type === 'number' || f?.type === 'checkbox' || f?.code) return 'col--s';
  if (size === 'wide' || f?.name || f?.type === 'lookup') return 'col--l';
  if (/quantity|fiyat|amount|rate|exchange_rate/i.test(f?.key || '')) return 'col--m col--num';
  return 'col--m';
}

/** Don’t Make Me Think: detay alanlarını tarama bloklarına ayır (kimlik / address / …). */
const FIELD_GROUP_DEFS = [
  { id: 'organizasyon', title: 'Organizasyon', re: /^(company_id|plant_id|hedef_depo|bolge_|sektor_|nace_|is_merkezi|work_center|work_station|emir_tipi|order_type_id|asama_|sorumlu_|takip_eden)/i },
  { id: 'kimlik', title: 'Genel bilgiler', re: /^(cari_|stok_|aday_|firsat_|kontak_|kisi_|seri_|emir_|talep_|siparis_|fatura_|irsaliye_|teklif_|kabul_|parti_|agac_|rota_|hareket_|operation_|line_no|order_no|quotation_no|partner_|item_code|item_name|kod|adi|turu|tipi|vergi_|pasaport|uzun_stok|uzun_item|tedarik_type|item_type|customer_type|first_name$|last_name$|title|order_type|order_date|item_id$|product_bom|route_id|sales_order|uretici_|old_item|original_code|gtip_|class_code|output_item)/i },
  { id: 'olcu', title: 'Ölçü / miktar', re: /^(uom_code|quantity|agirlik|hacim|yogunluk|stok_takip|cevrilecek|olcu|produced_quantity|planlanan_quantity)/i },
  { id: 'depo', title: 'Depo / stok yeri', re: /^(warehouse_id|depo|component_warehouse|wip_warehouse|fg_warehouse)/i },
  { id: 'planlama', title: 'Planlama', re: /^(plan_|planli|planlanan|plan_start|plan_end|end_date|teslim|delivery_date|gecerlilik|cikis_type|giris_type|op_time|setup_time|wait_time|unload_time|sure_dk)/i },
  { id: 'address', title: 'Adres', re: /^(country|il$|district|sehir|posta_|address|bill_address|fatura_adres|sevk_|enlem|boylam|mensei)/i },
  { id: 'iletisim', title: 'İletişim', re: /^(telefon|cep_|mobile_|email|website|fax|yetkili)/i },
  { id: 'finans', title: 'Finans', re: /^(currency_code|exchange_rate$|odeme_|payment_|vade|iban|banka_|swift|hesap_|risk_|nakit_|kur_deger|sermaye|grand_total|iskonto|kdv_|unit_price|sales_price|varsayilan_vat|tax_|beklenen_gelir|muhasebe_|delivery_term)/i },
  { id: 'status', title: 'Durum / notlar', re: /^(status|is_active|is_inactive|silindi|description|notlar|not_|priority|source|onayli|yayinlandi|is_printed|is_started|acik_kapali|product_girisi|planli_kesin)/i },
];
const FIELD_GROUP_ORDER = FIELD_GROUP_DEFS.map((g) => g.id).concat(['diger']);

/** Form düzeni: master (tanım/kart) | document (başlık-kalem belge) */
function findScreenModule(screen) {
  if (!screen) return null;
  return MODULES.find((m) => (m.screens || []).some((s) => s.id === screen.id)) || null;
}

function inferFormLayoutKind(screen) {
  if (!screen) return 'master';
  if (screen.formLayout === 'document' || screen.formLayout === 'master') return screen.formLayout;
  if (screen.compactMaster) return 'document';
  if (screen.detailAsFields || screen.kullaniciYetkiPaneli) return 'master';
  const tabs = screen.formTabs || [];
  if (tabs.some((t) => t.kind === 'master-grid')) return 'document';
  if (tabs.some((t) => t.kind === 'fields' || t.kind === 'master-detail')) return 'master';
  if (Array.isArray(screen.detailFields) && screen.detailFields.length && screen.detailSlots) {
    return 'document';
  }
  return 'master';
}

function applyFormLayoutChrome(screen) {
  const view = $('#viewForm');
  if (!view) return;
  const kind = inferFormLayoutKind(screen);
  view.classList.toggle('erp-form--master', kind === 'master');
  view.classList.toggle('erp-form--document', kind === 'document');
  view.dataset.formLayout = kind;
}

/** Küçük grupları birleştir — 1 alanlık başlık gürültüsü yok. */
function mergeTinyFieldGroups(clusters, minSize = 2) {
  const src = (clusters || []).map((c) => ({ ...c, fields: [...(c.fields || [])] }));
  if (src.length <= 1) return src;
  const out = [];
  for (const c of src) {
    if (c.fields.length < minSize && out.length) {
      out[out.length - 1].fields.push(...c.fields);
      continue;
    }
    if (c.fields.length < minSize && !out.length) {
      out.push(c);
      continue;
    }
    if (out.length && out[out.length - 1].fields.length < minSize) {
      c.fields = out.pop().fields.concat(c.fields);
    }
    out.push(c);
  }
  return out;
}

/** auto-fit ızgara: açıklama tam satır; diğerleri eşit paylaşır. */
function fieldSpanClass(f) {
  if (isFooterNoteField(f) || f?.size === 'wide') return 'field-span-full';
  if (f?.type === 'checkbox' || isBinarySelectField(f)) return 'field-span-1 field-span--compact';
  return 'field-span-1';
}

/** Tanım/kart: tek panel, bölüm başlıklı 3 kolon — kart yığını yok. */
function renderGroupedFieldCards(fields, rec, attrName = 'data-master') {
  const list = (fields || []).filter((f) => f && f.type !== 'static');
  if (!list.length) return '<div class="detail-empty detail-empty--quiet"></div>';
  const ctx = rec || {};
  // Tek alanlık grupları birleştir; 2+ alanlı bölümler kalsın
  const clusters = mergeTinyFieldGroups(clusterFieldsByGroup(list), 2);
  const renderCell = (f) => fieldShell(
    f,
    fieldControl(f, ctx[f.key], attrName, '', ctx),
    ctx[f.key],
  ).replace(
    /^<div class="/,
    `<div class="${fieldSpanClass(f)} `,
  );
  if (list.length < 4 || clusters.length <= 1) {
    return `<div class="erp-balanced">
      <div class="erp-section-grid">${list.map(renderCell).join('')}</div>
    </div>`;
  }
  return `<div class="erp-balanced">
    ${clusters.map((c) => `
      <section class="erp-section" data-group="${escAttr(c.id)}">
        <h3 class="erp-section-title">${escAttr(c.title)}</h3>
        <div class="erp-section-grid">${c.fields.map(renderCell).join('')}</div>
      </section>`).join('')}
  </div>`;
}

function isBinarySelectField(field) {
  return field?.type === 'select' && Array.isArray(field.options) && field.options.length === 2;
}

function inferFieldGroup(f) {
  if (f?.group && typeof f.group === 'object') return f.group;
  if (typeof f?.group === 'string') {
    const hit = FIELD_GROUP_DEFS.find((g) => g.id === f.group);
    return hit || { id: f.group, title: f.groupLabel || f.group };
  }
  const k = f?.key || '';
  for (const g of FIELD_GROUP_DEFS) {
    if (g.re.test(k)) return { id: g.id, title: g.title };
  }
  return { id: 'diger', title: 'Diğer' };
}

function clusterFieldsByGroup(fields) {
  const buckets = new Map();
  (fields || []).forEach((f) => {
    const g = inferFieldGroup(f);
    if (!buckets.has(g.id)) buckets.set(g.id, { id: g.id, title: g.title, fields: [] });
    buckets.get(g.id).fields.push(f);
  });
  return FIELD_GROUP_ORDER
    .filter((id) => buckets.has(id))
    .map((id) => buckets.get(id))
    .concat([...buckets.values()].filter((b) => !FIELD_GROUP_ORDER.includes(b.id)));
}

function renderFieldGrid(fields, rec, attrName = 'data-master', opts = {}) {
  const ctx = rec || {};
  const list = fields || [];
  const renderFlat = (arr, gridCls) => `
    <div class="form-tab-fields ${gridCls}">
      ${arr.map((f) => fieldShell(f, fieldControl(f, rec?.[f.key], attrName, '', ctx), rec?.[f.key])).join('')}
    </div>`;

  const gridCls = opts.gridClass
    || (attrName === 'data-master' ? 'form-tab-fields--master' : 'form-tab-fields--detail');

  // Başlık (primary) düz kalır — tarama için grup yok (çağıran zaten grid sarıyor)
  if (!opts.grouped) {
    return list.map((f) => fieldShell(f, fieldControl(f, rec?.[f.key], attrName, '', ctx), rec?.[f.key])).join('');
  }

  const clusters = clusterFieldsByGroup(list);
  if (list.length < 4 || clusters.length <= 1) {
    return renderFlat(list, gridCls);
  }

  return clusters.map((c) => `
    <div class="field-group" data-group="${escAttr(c.id)}">
      <div class="field-group-title">${c.title}</div>
      ${renderFlat(c.fields, gridCls)}
    </div>`).join('');
}

function renderDetailFieldGrid(fields, rec, attrName = 'data-master') {
  return renderFieldGrid(fields, rec, attrName, { grouped: true });
}

/** Grid satırı düzenlerken alanları gruplu göster */
function renderGroupedDetailControls(fields, row, idx, gridKey) {
  const list = fields || [];
  if (list.length < 5) {
    return `<div class="form-tab-fields form-tab-fields--detail detail-slot-fields-grid">${
      list.map((f) => fieldShell(f, detailFieldControl(f, row[f.key], idx, gridKey, row), row[f.key])).join('')
    }</div>`;
  }
  const clusters = clusterFieldsByGroup(list);
  if (clusters.length <= 1) {
    return `<div class="form-tab-fields form-tab-fields--detail detail-slot-fields-grid">${
      list.map((f) => fieldShell(f, detailFieldControl(f, row[f.key], idx, gridKey, row), row[f.key])).join('')
    }</div>`;
  }
  return clusters.map((c) => `
    <div class="field-group" data-group="${escAttr(c.id)}">
      <div class="field-group-title">${c.title}</div>
      <div class="form-tab-fields form-tab-fields--detail detail-slot-fields-grid">
        ${c.fields.map((f) => fieldShell(f, detailFieldControl(f, row[f.key], idx, gridKey, row), row[f.key])).join('')}
      </div>
    </div>`).join('');
}

/** Alan genişliği veri tipine göre: kısa kod/sayı ≠ yarım ekran. */
function inferFieldSizeClass(f) {
  if (f?.size === 'wide' || f?.size === 'short' || f?.size === 'medium') {
    return `field--${f.size}`;
  }
  const k = String(f?.key || '');
  if (f?.type === 'checkbox') return 'field--check';
  if (isBinarySelectField(f)) return 'field--seg';
  if (f?.name || /description|address|not_|line_description|public_note|internal_note/i.test(k)) {
    return 'field--wide';
  }
  // Kod+ad lookup: orta (çift kontrol); tek başına full-wide değil
  if (f?.type === 'lookup' && f.codeKey) return 'field--medium';
  if (f?.type === 'lookup') return 'field--medium';
  if (
    f?.code
    || f?.type === 'number'
    || f?.type === 'date'
    || /^(quantity|exchange_rate|katsayi|line_no|.*_oran|kdv|iskonto|giren_quantity|accepted_flag|reddedilen|status)$/i.test(k)
    || /^(uom_code|currency_code|dil_code|pb|order_type|item_type|tedarik_type)$/i.test(k)
  ) {
    return 'field--short';
  }
  if ((f?.type === 'select') && (f.options || []).length <= 5) return 'field--short';
  return 'field--medium';
}

function fieldIsEmptyValue(val) {
  if (val === null || val === undefined) return true;
  if (typeof val === 'boolean') return false;
  return String(val).trim() === '';
}

function fieldShell(f, controlHtml, value) {
  if (f.type === 'static') {
    return `<div class="field field--static field--short"><span class="field-static">${escAttr(f.label || '=')}</span></div>`;
  }
  const cls = ['field', inferFieldSizeClass(f)];
  const isReq = Boolean(f.required || (f.requiredOnNew && state.formMode === 'yeni'));
  const codeLocked = f.code && !(f.editableOnNew && state.formMode === 'yeni');
  const isRo = Boolean(f.readOnly || state.formMode === 'incele' || codeLocked);
  if (isReq) cls.push('required');
  if (isRo) cls.push('field--readonly');
  if (f.critical) cls.push('field--critical');
  if (f.type === 'lookup') cls.push('lookup');
  if (f.type === 'password') cls.push('field--password');
  if (f.code) cls.push('field--code');
  if (f.name) cls.push('field--name');
  const empty = value !== undefined ? fieldIsEmptyValue(value) : true;
  // Eksik zorunlu alan: kırmızı *
  const star = (isReq && empty && state.formMode !== 'incele')
    ? '<span class="req-star" title="Doldurulması zorunlu">*</span>'
    : (isReq ? '<span class="req-mark" title="Zorunlu alan">*</span>' : '');
  return `<div class="${cls.join(' ')}" data-field-key="${escAttr(f.key)}" title="F1: tablo / alan bilgisi"><label>${star}${f.label}</label>${controlHtml}</div>`;
}

const YETKI_ACTIONS = [
  { id: 'yeni', label: 'Yeni' },
  { id: 'incele', label: 'İncele' },
  { id: 'duzelt', label: 'Düzelt' },
  { id: 'kopyala', label: 'Kopyala' },
  { id: 'sil', label: 'Sil' },
];

function allScreensCatalog() {
  const out = [];
  MODULES.forEach((mod) => {
    (mod.screens || []).forEach((s) => {
      out.push({
        id: s.id,
        title: s.title,
        moduleId: mod.id,
        moduleTitle: mod.title,
      });
    });
  });
  return out;
}

function isAdminLikeUser(rec) {
  if (!rec) return false;
  if (rec.group_code === 'ADMIN') return true;
  return String(rec.role || '').toLowerCase() === 'yonetici';
}

/**
 * ADMIN / Yönetici + boş yetki listesi = tüm ekranlar (gelecekte eklenenler dahil).
 * Formda görsel olarak hepsi işaretli gösterilir.
 */
function yetkiMapFromRecord(rec) {
  const map = {};
  const list = rec?.yetkiler || [];
  if (!list.length && isAdminLikeUser(rec)) {
    allScreensCatalog().forEach((s) => {
      map[s.id] = {
        erisim: true, yeni: true, incele: true, duzelt: true, kopyala: true, sil: true,
      };
    });
    return map;
  }
  list.forEach((y) => {
    if (!y?.screen_id) return;
    map[y.screen_id] = {
      erisim: y.erisim !== false,
      yeni: Boolean(y.yeni),
      incele: Boolean(y.incele),
      duzelt: Boolean(y.duzelt),
      kopyala: Boolean(y.kopyala),
      sil: Boolean(y.sil),
    };
  });
  return map;
}

/** Tam yetkili kaydı küçük tut: tüm ekranlar doluysa boş dizi (= wildcard). */
function compressYetkilerForSave(master) {
  const all = allScreensCatalog();
  const y = Array.isArray(master.yetkiler) ? master.yetkiler : [];
  if (!isAdminLikeUser(master)) return;
  const full = all.length > 0 && all.every((s) => {
    const r = y.find((x) => x.screen_id === s.id);
    return r && r.yeni && r.incele && r.duzelt && r.kopyala && r.sil;
  });
  if (full || y.length === 0) {
    // Boş = tüm mevcut + ileride eklenecek ekranlara tam yetki
    master.yetkiler = [];
  }
  const firms = Array.isArray(state.companies) ? state.companies : [];
  const fy = Array.isArray(master.firma_yetkileri) ? master.firma_yetkileri : [];
  if (!firms.length || fy.length === 0 || fy.length >= firms.length) {
    master.firma_yetkileri = [];
  }
}

function resizeImageToDataUrl(file, maxSide = 256, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const data = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(url);
        resolve(data);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Resim okunamadı'));
    };
    img.src = url;
  });
}

function renderKullaniciProfilBlok(rec) {
  const src = rec.profile_image || '';
  const readonly = state.formMode === 'incele';
  return `
    <section class="user-avatar-pane" aria-label="Profil resmi">
      <div class="section-label">Profil resmi</div>
      <div class="user-avatar-row">
        <div class="user-avatar-preview" id="userAvatarPreview">
          ${src
            ? `<img src="${escAttr(src)}" alt="Profil" />`
            : '<span class="user-avatar-placeholder">Resim yok</span>'}
        </div>
        <div class="user-avatar-actions">
          <label class="btn ghost user-avatar-pick"${readonly ? ' hidden' : ''}>
            Resim seç
            <input type="file" id="userAvatarFile" accept="image/*" hidden ${readonly ? 'disabled' : ''} />
          </label>
          <button type="button" class="btn ghost" id="userAvatarClear" ${readonly || !src ? 'hidden' : ''}>Kaldır</button>
          <p class="hint">JPG/PNG; kayıtta otomatik küçültülür. ADMIN’de boş yetki = tüm ekranlar (yeniler dahil).</p>
        </div>
      </div>
    </section>`;
}

function renderFirmaYetkiPane(rec) {
  const readonly = state.formMode === 'incele';
  const dis = readonly ? 'disabled' : '';
  const companies = Array.isArray(state.companies) ? state.companies : [];
  const rawSel = (rec.firma_yetkileri || []).map((f) => Number(f.company_id ?? f.id)).filter(Boolean);
  // ADMIN + boş liste = tüm companies (kısıt yok) — formda hepsi işaretli
  const selected = new Set(
    (!rawSel.length && isAdminLikeUser(rec))
      ? companies.map((f) => Number(f.id))
      : rawSel
  );
  const rows = companies.length
    ? companies.map((f) => `
      <tr data-firma-yetki="${escAttr(f.id)}">
        <td class="yetki-erisim">
          <input type="checkbox" data-firma-check="1" ${selected.has(Number(f.id)) ? 'checked' : ''} ${dis} />
        </td>
        <td class="yetki-ekran mono">${escapeHtml(f.company_code || '')}</td>
        <td>${escapeHtml(f.company_name || '')}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" class="detail-empty">Firma listesi yok.</td></tr>';

  return `
    <section class="firma-yetki-pane" aria-label="Firma profil yetkisi">
      <div class="yetki-pane-head">
        <div class="section-label">Firma profil yetkisi</div>
        <div class="yetki-pane-actions"${readonly ? ' hidden' : ''}>
          <button type="button" class="btn ghost" id="firmaYetkiSelectAll">Hepsi</button>
          <button type="button" class="btn ghost" id="firmaYetkiClearAll">Temizle</button>
        </div>
      </div>
      <p class="hint yetki-hint">Kullanıcının işlem yapabileceği firmaları satırdan işaretleyin. ADMIN’de hepsi / boş kayıt = tüm companies (kısıt yok).</p>
      <div class="firma-yetki-scroll">
        <table class="yetki-table" id="firmaYetkiTable">
          <thead>
            <tr>
              <th class="yetki-erisim">
                <label class="yetki-th-hepsi" title="Tüm companies">
                  <input type="checkbox" data-firma-head="hepsi" ${dis} />
                  <span>Hepsi</span>
                </label>
              </th>
              <th class="yetki-ekran">Kod</th>
              <th>Firma adı</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
}

function renderYetkiGrid(rec) {
  const map = yetkiMapFromRecord(rec);
  const readonly = state.formMode === 'incele';
  const dis = readonly ? 'disabled' : '';
  const rows = allScreensCatalog();
  const byMod = [];
  rows.forEach((s) => {
    const last = byMod[byMod.length - 1];
    if (!last || last.title !== s.moduleTitle) {
      byMod.push({ id: s.moduleId || s.moduleTitle, title: s.moduleTitle, screens: [s] });
    } else {
      last.screens.push(s);
    }
  });

  const body = byMod.map((mod) => {
    // Default kapalı — yalnızca bu oturumda açılanlar açık kalsın
    const open = Boolean(state.yetkiModOpen?.[mod.id]);
    const modRow = `
      <tr class="yetki-mod-row${open ? ' is-open' : ''}" data-yetki-mod="${escAttr(mod.id)}">
        <td colspan="8">
          <button type="button" class="yetki-mod-toggle" data-yetki-mod-toggle="${escAttr(mod.id)}"
            aria-expanded="${open ? 'true' : 'false'}">
            <span class="yetki-mod-caret" aria-hidden="true">▸</span>
            <span>${escapeHtml(mod.title)}</span>
            <span class="yetki-mod-count">${mod.screens.length} ekran</span>
          </button>
        </td>
      </tr>`;
    const screenRows = mod.screens.map((s) => {
      const y = map[s.id] || { erisim: false, yeni: false, incele: false, duzelt: false, kopyala: false, sil: false };
      const hepsi = YETKI_ACTIONS.every((a) => y[a.id]);
      return `
      <tr class="yetki-screen-row${open ? '' : ' is-collapsed'}${y.erisim ? ' has-erisim' : ''}"
          data-yetki-ekran="${escAttr(s.id)}" data-yetki-mod-of="${escAttr(mod.id)}">
        <td class="yetki-erisim">
          <input type="checkbox" data-yetki="erisim" ${y.erisim ? 'checked' : ''} ${dis} title="Ekran erişimi" />
        </td>
        <td class="yetki-ekran">${escapeHtml(s.title)}</td>
        ${YETKI_ACTIONS.map((a) => `
          <td class="yetki-act">
            <label class="yetki-act-cell" title="${a.label}">
              <span class="yetki-act-letter">${escapeHtml(a.label.slice(0, 1))}</span>
              <input type="checkbox" data-yetki="${a.id}" ${y[a.id] ? 'checked' : ''} ${dis} ${y.erisim ? '' : 'disabled'} aria-label="${a.label}" />
            </label>
          </td>`).join('')}
        <td class="yetki-act">
          <label class="yetki-act-cell" title="Hepsi">
            <span class="yetki-act-letter">H</span>
            <input type="checkbox" data-yetki="hepsi" ${hepsi && y.erisim ? 'checked' : ''} ${dis} ${y.erisim ? '' : 'disabled'} aria-label="Hepsi" />
          </label>
        </td>
      </tr>`;
    }).join('');
    return `${modRow}${screenRows}`;
  }).join('');

  return `
    <section class="yetki-pane" aria-label="Ekran yetkileri">
      <div class="yetki-pane-head">
        <div class="section-label">Yetkiler</div>
        <div class="yetki-pane-actions"${readonly ? ' hidden' : ''}>
          <button type="button" class="btn ghost" id="yetkiExpandAllMods">Başlıkları aç</button>
          <button type="button" class="btn ghost" id="yetkiCollapseAllMods">Başlıkları kapat</button>
          <button type="button" class="btn ghost" id="yetkiSelectAll">Tüm ekranlar</button>
          <button type="button" class="btn ghost" id="yetkiClearAll">Temizle</button>
        </div>
      </div>
      <p class="hint yetki-hint">Modül başlığına tıklayarak ekran listesini açın/kapatın (varsayılan kapalı). Sol yuvarlak kutu erişim; açılınca Yeni / İncele / Düzelt / Kopyala / Sil kutuları etkinleşir. ADMIN’de tümü işaretli kaydedilirse yetki listesi boş tutulur.</p>
      <div class="yetki-scroll">
        <table class="yetki-table" id="yetkiTable">
          <thead>
            <tr>
              <th class="yetki-erisim">
                <div class="yetki-th">Erişim</div>
                <label class="yetki-th-hepsi" title="Tüm erişimleri seç">
                  <input type="checkbox" data-yetki-head="erisim" ${dis} />
                  <span>Hepsi</span>
                </label>
              </th>
              <th class="yetki-ekran">Ekran</th>
              ${YETKI_ACTIONS.map((a) => `
                <th class="yetki-act">
                  <div class="yetki-th">${a.label}</div>
                  <label class="yetki-th-hepsi" title="Tüm satırlarda ${a.label}">
                    <input type="checkbox" data-yetki-head="${a.id}" ${dis} />
                    <span>Hepsi</span>
                  </label>
                </th>`).join('')}
              <th class="yetki-act">
                <div class="yetki-th">Hepsi</div>
                <label class="yetki-th-hepsi" title="Tüm aksiyonları seç">
                  <input type="checkbox" data-yetki-head="hepsi" ${dis} />
                  <span>Hepsi</span>
                </label>
              </th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>`;
}

function readYetkiGridFromDom() {
  const rows = [];
  document.querySelectorAll('#yetkiTable tbody tr[data-yetki-ekran]').forEach((tr) => {
    const erisim = tr.querySelector('[data-yetki="erisim"]')?.checked;
    if (!erisim) return;
    const y = { screen_id: tr.getAttribute('data-yetki-ekran'), erisim: true };
    YETKI_ACTIONS.forEach((a) => {
      y[a.id] = Boolean(tr.querySelector(`[data-yetki="${a.id}"]`)?.checked);
    });
    y.hepsi = YETKI_ACTIONS.every((a) => y[a.id]);
    rows.push(y);
  });
  return rows;
}

function readFirmaYetkiFromDom() {
  const out = [];
  document.querySelectorAll('#firmaYetkiTable tbody tr[data-firma-yetki]').forEach((tr) => {
    if (!tr.querySelector('[data-firma-check]')?.checked) return;
    const id = Number(tr.getAttribute('data-firma-yetki'));
    if (id) out.push({ company_id: id });
  });
  return out;
}

function setYetkiModOpen(modId, open) {
  if (!state.yetkiModOpen) state.yetkiModOpen = {};
  state.yetkiModOpen[modId] = Boolean(open);
  const table = $('#yetkiTable');
  if (!table) return;
  const modRow = table.querySelector(`tr.yetki-mod-row[data-yetki-mod="${CSS.escape(modId)}"]`);
  const btn = modRow?.querySelector('[data-yetki-mod-toggle]');
  modRow?.classList.toggle('is-open', open);
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  table.querySelectorAll(`tr.yetki-screen-row[data-yetki-mod-of="${CSS.escape(modId)}"]`).forEach((tr) => {
    tr.classList.toggle('is-collapsed', !open);
  });
}

function bindYetkiGridEvents() {
  const table = $('#yetkiTable');
  if (!table) return;

  table.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-yetki-mod-toggle]');
    if (!toggle) return;
    e.preventDefault();
    const modId = toggle.getAttribute('data-yetki-mod-toggle');
    if (!modId) return;
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setYetkiModOpen(modId, open);
  });

  $('#yetkiExpandAllMods')?.addEventListener('click', () => {
    table.querySelectorAll('tr.yetki-mod-row[data-yetki-mod]').forEach((tr) => {
      setYetkiModOpen(tr.getAttribute('data-yetki-mod'), true);
    });
  });
  $('#yetkiCollapseAllMods')?.addEventListener('click', () => {
    table.querySelectorAll('tr.yetki-mod-row[data-yetki-mod]').forEach((tr) => {
      setYetkiModOpen(tr.getAttribute('data-yetki-mod'), false);
    });
  });

  if (state.formMode === 'incele') return;

  const syncRow = (tr) => {
    const erisim = tr.querySelector('[data-yetki="erisim"]');
    const acts = YETKI_ACTIONS.map((a) => tr.querySelector(`[data-yetki="${a.id}"]`));
    const hepsi = tr.querySelector('[data-yetki="hepsi"]');
    const on = Boolean(erisim?.checked);
    tr.classList.toggle('has-erisim', on);
    acts.forEach((el) => { if (el) el.disabled = !on; });
    if (hepsi) hepsi.disabled = !on;
    if (!on) {
      acts.forEach((el) => { if (el) el.checked = false; });
      if (hepsi) hepsi.checked = false;
      return;
    }
    if (hepsi) hepsi.checked = acts.every((el) => el?.checked);
    // Erişim açılınca satırın modülü kapalıysa aç — Yeni/Düzelt görünsün
    const modId = tr.getAttribute('data-yetki-mod-of');
    if (modId && tr.classList.contains('is-collapsed')) setYetkiModOpen(modId, true);
  };

  const syncHeadChecks = () => {
    const rows = [...table.querySelectorAll('tr[data-yetki-ekran]')];
    const setHead = (key, pred) => {
      const el = table.querySelector(`[data-yetki-head="${key}"]`);
      if (!el) return;
      el.checked = rows.length > 0 && rows.every(pred);
      el.indeterminate = false;
    };
    setHead('erisim', (tr) => tr.querySelector('[data-yetki="erisim"]')?.checked);
    YETKI_ACTIONS.forEach((a) => {
      setHead(a.id, (tr) => tr.querySelector(`[data-yetki="${a.id}"]`)?.checked);
    });
    setHead('hepsi', (tr) => tr.querySelector('[data-yetki="hepsi"]')?.checked);
  };

  table.addEventListener('change', (e) => {
    const head = e.target.closest('input[data-yetki-head]');
    if (head) {
      const kind = head.getAttribute('data-yetki-head');
      const on = head.checked;
      table.querySelectorAll('tr[data-yetki-ekran]').forEach((tr) => {
        if (kind === 'erisim') {
          const erisim = tr.querySelector('[data-yetki="erisim"]');
          if (erisim) erisim.checked = on;
          if (on) {
            const incele = tr.querySelector('[data-yetki="incele"]');
            if (incele) incele.checked = true;
          }
          syncRow(tr);
          return;
        }
        if (kind === 'hepsi') {
          const erisim = tr.querySelector('[data-yetki="erisim"]');
          if (erisim && on) erisim.checked = true;
          YETKI_ACTIONS.forEach((a) => {
            const el = tr.querySelector(`[data-yetki="${a.id}"]`);
            if (el) el.checked = on;
          });
          syncRow(tr);
          return;
        }
        // tek aksiyon sütunu (yeni/incele/…)
        const erisim = tr.querySelector('[data-yetki="erisim"]');
        if (on && erisim) erisim.checked = true;
        const el = tr.querySelector(`[data-yetki="${kind}"]`);
        if (el) el.checked = on;
        syncRow(tr);
      });
      syncHeadChecks();
      return;
    }

    const inp = e.target.closest('input[data-yetki]');
    if (!inp) return;
    const tr = inp.closest('tr[data-yetki-ekran]');
    if (!tr) return;
    const kind = inp.getAttribute('data-yetki');
    if (kind === 'erisim') {
      if (inp.checked) {
        const incele = tr.querySelector('[data-yetki="incele"]');
        if (incele && !YETKI_ACTIONS.some((a) => tr.querySelector(`[data-yetki="${a.id}"]`)?.checked)) {
          incele.checked = true;
        }
      }
      syncRow(tr);
      syncHeadChecks();
      return;
    }
    if (kind === 'hepsi') {
      YETKI_ACTIONS.forEach((a) => {
        const el = tr.querySelector(`[data-yetki="${a.id}"]`);
        if (el) el.checked = inp.checked;
      });
      syncRow(tr);
      syncHeadChecks();
      return;
    }
    syncRow(tr);
    syncHeadChecks();
  });

  $('#yetkiSelectAll')?.addEventListener('click', () => {
    table.querySelectorAll('tr[data-yetki-ekran]').forEach((tr) => {
      const erisim = tr.querySelector('[data-yetki="erisim"]');
      if (erisim) erisim.checked = true;
      YETKI_ACTIONS.forEach((a) => {
        const el = tr.querySelector(`[data-yetki="${a.id}"]`);
        if (el) el.checked = true;
      });
      syncRow(tr);
    });
    syncHeadChecks();
  });
  $('#yetkiClearAll')?.addEventListener('click', () => {
    table.querySelectorAll('tr[data-yetki-ekran]').forEach((tr) => {
      const erisim = tr.querySelector('[data-yetki="erisim"]');
      if (erisim) erisim.checked = false;
      syncRow(tr);
    });
    syncHeadChecks();
  });
  syncHeadChecks();
}

function bindFirmaYetkiEvents() {
  const table = $('#firmaYetkiTable');
  if (!table || state.formMode === 'incele') return;

  const syncHead = () => {
    const head = table.querySelector('[data-firma-head="hepsi"]');
    if (!head) return;
    const boxes = [...table.querySelectorAll('[data-firma-check]')];
    head.checked = boxes.length > 0 && boxes.every((b) => b.checked);
  };

  table.addEventListener('change', (e) => {
    const head = e.target.closest('[data-firma-head="hepsi"]');
    if (head) {
      table.querySelectorAll('[data-firma-check]').forEach((b) => { b.checked = head.checked; });
      return;
    }
    if (e.target.closest('[data-firma-check]')) syncHead();
  });
  $('#firmaYetkiSelectAll')?.addEventListener('click', () => {
    table.querySelectorAll('[data-firma-check]').forEach((b) => { b.checked = true; });
    syncHead();
  });
  $('#firmaYetkiClearAll')?.addEventListener('click', () => {
    table.querySelectorAll('[data-firma-check]').forEach((b) => { b.checked = false; });
    syncHead();
  });
  syncHead();
}

function bindAvatarEvents() {
  const file = $('#userAvatarFile');
  const clearBtn = $('#userAvatarClear');
  if (file) {
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      if (f.size > 5_000_000) {
        toast('Resim çok büyük (max 5MB; otomatik küçültülür).');
        file.value = '';
        return;
      }
      try {
        const data = await resizeImageToDataUrl(f, 256, 0.72);
        if (!state.formRecord) state.formRecord = {};
        state.formRecord.profile_image = data;
        const preview = $('#userAvatarPreview');
        if (preview) preview.innerHTML = `<img src="${escAttr(data)}" alt="Profil" />`;
        if (clearBtn) clearBtn.hidden = false;
      } catch (err) {
        toast(err.message || 'Resim işlenemedi');
        file.value = '';
      }
    });
  }
  clearBtn?.addEventListener('click', () => {
    if (!state.formRecord) state.formRecord = {};
    state.formRecord.profile_image = null;
    const preview = $('#userAvatarPreview');
    if (preview) preview.innerHTML = '<span class="user-avatar-placeholder">Resim yok</span>';
    if (file) file.value = '';
    clearBtn.hidden = true;
  });
}

/** Klasik ERP kabuğu (satınalma teklifi ile aynı dil): kompakt başlık + gövde + alt şerit. */
function renderClassicShell({
  rec, primary, extras, bodyHtml, footerNotes, bodyLabel, metaHtml, natural, footerFields, footerKey, compact,
}) {
  const row = rec || {};
  const notes = Array.isArray(footerNotes) ? footerNotes : [];
  const extrasBlock = extras?.length ? `
        <section class="md-extras" aria-label="Ek başlık alanları">
          <div class="section-label">Ek bilgiler</div>
          <div class="md-extras-scroll">
            <div class="field-groups">${renderDetailFieldGrid(extras, row)}</div>
          </div>
        </section>` : '';
  const showFooter = notes.length || (footerFields && footerKey);
  const footer = showFooter
    ? renderDocumentFooter(row, notes, footerFields || [], footerKey || null)
    : '';
  const hasHead = (primary && primary.length) || (extras && extras.length);
  const headBlock = hasHead ? `
      <div class="md-head${compact ? ' md-head--compact' : ''}">
        ${primary?.length ? `
        <section class="md-master${compact ? ' md-master--compact' : ''}" aria-label="Başlık alanları">
          ${compact ? '' : '<div class="section-label">Başlık</div>'}
          <div class="form-tab-fields form-tab-fields--master${compact ? ' form-tab-fields--compact' : ''}">
            ${renderFieldGrid(primary, row)}
          </div>
        </section>` : ''}
        ${extrasBlock}
      </div>` : '';
  return `
    <div class="md-split md-split--grid${compact ? ' md-split--compact' : ''}${natural ? ' md-split--natural' : ''}${hasHead ? '' : ' md-split--grid-only'}">
      ${headBlock}
      <section class="md-detail" aria-label="${escAttr(bodyLabel || 'Detay')}">
        <div class="md-detail-head">
          <div class="section-label">${escAttr(bodyLabel || 'Detay')}</div>
          ${metaHtml || ''}
        </div>
        <div class="md-detail-scroll">
          ${bodyHtml}
        </div>
      </section>
      ${footer}
    </div>`;
}

function renderMasterDetailPanel(tab, rec) {
  const screen = findScreen(state.screenId);
  const isUserCard = Boolean(screen?.kullaniciYetkiPaneli);
  // Master/tanım: açıklama notları ızgarada kalsın — altta boşluk + yetim şerit yok
  const all = [...(tab.masterFields || []), ...(tab.detailFields || [])];
  const shell = `
    <div class="erp-master-panel md-split--natural">
      ${renderGroupedFieldCards(all, rec)}
    </div>`;
  if (!isUserCard) return shell;
  return `
    <div class="kullanici-form-stack">
      ${shell}
      ${renderKullaniciProfilBlok(rec)}
      ${renderFirmaYetkiPane(rec)}
      ${renderSqlYetkiPane(rec)}
      ${renderYetkiGrid(rec)}
    </div>`;
}

function renderSqlYetkiPane(rec) {
  const p = rec?.sql_permissions || {
    can_select: true,
    can_insert: false,
    can_update: false,
    can_delete: false,
  };
  const readonly = state.formMode === 'incele';
  const dis = readonly ? 'disabled' : '';
  const chk = (key, label) => `
    <label class="sql-yetki-opt">
      <input type="checkbox" data-sql-yetki="${key}" ${p[key] ? 'checked' : ''} ${dis} />
      <span>${label}</span>
    </label>`;
  return `
    <section class="yetki-pane sql-yetki-pane" aria-label="SQL Sorgu yetkileri">
      <div class="yetki-pane-head">
        <div class="section-label">SQL Sorgu yetkileri</div>
      </div>
      <p class="hint yetki-hint">SQL Sorgu ekranında bu kullanıcının çalıştırabileceği ifade türleri. INSERT / UPDATE / DELETE için ekranda COMMIT veya ROLLBACK seçimi zorunludur.</p>
      <div class="sql-yetki-checks">
        ${chk('can_select', 'SELECT')}
        ${chk('can_insert', 'INSERT')}
        ${chk('can_update', 'UPDATE')}
        ${chk('can_delete', 'DELETE')}
      </div>
    </section>`;
}

function readSqlYetkiFromDom() {
  const box = document.querySelector('.sql-yetki-pane');
  if (!box) {
    return { can_select: true, can_insert: false, can_update: false, can_delete: false };
  }
  const val = (key, def) => {
    const el = box.querySelector(`[data-sql-yetki="${key}"]`);
    return el ? el.checked : def;
  };
  return {
    can_select: val('can_select', true),
    can_insert: val('can_insert', false),
    can_update: val('can_update', false),
    can_delete: val('can_delete', false),
  };
}

/** Master alanlar üstte + kalem tablosu + alt toplam/bağlantı — klasik ERP */
function renderMasterGridPanel(tab, rec) {
  const screen = findScreen(state.screenId);
  const maxPrimary = Number(screen?.masterPrimaryMax) > 0
    ? Number(screen.masterPrimaryMax)
    : MASTER_PRIMARY_MAX;
  const compact = Boolean(screen?.compactMaster);
  const allMaster = tab.masterFields || screen?.masterFields || [];
  const partitioned = partitionMasterFields(allMaster, maxPrimary);
  // compactMaster: kimlik/org üst şeritte — notlar yine alt şeritte kalsın
  const primary = compact ? [] : partitioned.primary;
  const extras = compact ? [] : partitioned.extras;
  const footerNotes = partitioned.footerNotes;
  const gridTab = {
    kind: 'grid',
    key: tab.grid?.key || tab.key || '_detail',
    slots: tab.grid?.slots,
    fields: tab.grid?.fields || tab.detailFields || screen?.detailFields || [],
  };
  const rowCount = Array.isArray(rec?.[gridTab.key]) ? rec[gridTab.key].length : 0;
  return renderClassicShell({
    rec,
    primary,
    extras,
    bodyHtml: renderDynamicGrid(gridTab, rec),
    footerNotes,
    bodyLabel: 'Detay kalemleri',
    metaHtml: `<span class="md-detail-meta">${rowCount} satır</span>`,
    footerFields: gridTab.fields,
    footerKey: gridTab.key,
    compact: false,
  });
}

/** Kompakt başlık şeridi (sekmelerin üstünde — satış siparişi prototipi). */
function renderCompactMasterBar(screen, rec) {
  const el = $('#formCompactMaster');
  if (!el) return;
  if (!screen?.compactMaster) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  const maxPrimary = Number(screen.masterPrimaryMax) > 0
    ? Number(screen.masterPrimaryMax)
    : MASTER_PRIMARY_MAX;
  const fields = screen.masterFields || [];
  const { primary } = partitionMasterFields(fields, maxPrimary);
  el.hidden = false;
  el.innerHTML = `
    <div class="erp-doc-header" aria-label="Belge üst bilgileri">
      <div class="erp-doc-header-label">Belge üst bilgileri</div>
      <div class="form-tab-fields form-tab-fields--master form-tab-fields--compact">
        ${renderFieldGrid(primary, rec || {})}
      </div>
    </div>`;
}

function renderGridToolbar(tabKey, { canEdit }) {
  if (!canEdit) {
    return `<div class="inline-toolbar erp-grid-toolbar"><span class="toolbar-hint">İnceleme — satıra tıklayarak bakın</span></div>`;
  }
  return `<div class="inline-toolbar erp-grid-toolbar" data-grid-toolbar="${tabKey}">
    <button type="button" class="btn action" data-grid-act="yeni" data-grid-key="${tabKey}" title="Yeni satır">＋ Satır</button>
    <button type="button" class="btn action ghost" data-grid-act="sil" data-grid-key="${tabKey}" title="Seçili satırı sil">✕ Sil</button>
    <span class="toolbar-hint">Satırda Kaydet yalnızca satırı onaylar · belge üstteki Kaydet ile yazılır</span>
  </div>`;
}

function renderDetailCell(field, row, idx, gridKey, canEdit) {
  if (field.type === 'static') {
    return `<span class="cell-static" aria-hidden="true">${escAttr(field.label || '=')}</span>`;
  }
  if (!canEdit) {
    let text = '';
    if (field.type === 'lookup') text = lookupDisplay(field, row[field.key]);
    else if (field.type === 'checkbox') text = row[field.key] ? '✓' : '';
    else text = row[field.key] == null || row[field.key] === '' ? '' : String(row[field.key]);
    const mono = field.code || field.type === 'lookup' ? ' mono' : '';
    return `<span class="cell-ro${mono}">${escAttr(text)}</span>`;
  }
  return detailFieldControl(field, row[field.key], idx, gridKey, row);
}

function renderDynamicGrid(tab, rec) {
  const key = tab.key;
  const fields = tab.fields || [];
  const rows = normalizeGridRows(tab, Array.isArray(rec[key]) ? rec[key] : []);
  rec[key] = rows;
  const canEdit = state.formMode !== 'incele';
  const selIdx = state.gridSel.key === key ? state.gridSel.idx : null;

  if (!rows.length) {
    return `
      ${renderGridToolbar(key, { canEdit })}
      <div class="detail-empty">Henüz satır yok. ${canEdit ? 'Yeni ile ekleyin; satırda Kaydet onaylar, belge üstteki Kaydet ile yazılır.' : ''}</div>`;
  }

  return `
    ${renderGridToolbar(key, { canEdit })}
    <div class="detail-table-wrap" data-grid-list="${key}">
      <table class="detail-table">
        <thead>
          <tr>
            ${canEdit ? '<th class="col-acts">İşlem</th>' : ''}
            <th class="col-seq">#</th>
            ${fields.map((f) => `<th class="${detailColClass(f)}" title="${escAttr(f.label)}">${escAttr(f.label)}</th>`).join('')}
            <th class="col-id" title="Satır ID">ID</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, idx) => {
            const selected = selIdx === idx;
            const saved = row._satir_kayitli === true || row.id != null;
            // Manuel yazma: form düzenlenebilirse satır alanları doğrudan yazılabilir
            const rowFieldsEditable = canEdit;
            const rowIdText = (row.id != null && row.id !== '') ? String(row.id) : '—';
            return `
              <tr class="${selected ? 'selected' : ''} ${saved ? 'detail-row--saved' : 'detail-row--draft'}"
                  data-grid-row="${key}" data-grid-idx="${idx}" data-grid-pick="${key}">
                ${canEdit ? `
                <td class="col-acts">
                  <div class="detail-row-actions" role="group" aria-label="Satır işlemleri">
                    <button type="button" class="btn action ghost sm" data-row-act="kaydet" data-grid-key="${key}" data-grid-idx="${idx}" title="Satırı onayla (belgeyi kaydetmez)">✓</button>
                    <button type="button" class="btn action ghost sm" data-row-act="kopyala" data-grid-key="${key}" data-grid-idx="${idx}" title="Satırı kopyala">⧉</button>
                    <button type="button" class="btn action ghost sm danger" data-row-act="sil" data-grid-key="${key}" data-grid-idx="${idx}" title="Satırı sil">✕</button>
                  </div>
                </td>` : ''}
                <td class="col-seq">${idx + 1}</td>
                ${fields.map((f) => `<td class="${detailColClass(f)}">${renderDetailCell(f, row, idx, key, rowFieldsEditable)}</td>`).join('')}
                <td class="col-id"><span class="mono cell-ro">${escAttr(rowIdText)}</span></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function bomPathCrumbs(nodes, path) {
  const parts = String(path).split('.');
  const crumbs = [];
  let cur = nodes;
  for (let i = 0; i < parts.length; i += 1) {
    const n = cur[Number(parts[i])];
    if (!n) break;
    const st = stokLookupById(n.component_item_id);
    crumbs.push(st?.item_code || n.item_code || '…');
    cur = n.alt_satirlar || [];
  }
  return crumbs;
}

/** Salt okunur mini ağaç (rota ekranında ürün ağacı önizleme) */
function renderBomPreviewTree(agacRec, mamulFallback) {
  if (!agacRec) {
    return '<div class="detail-empty">Ürün ağacı seçin — Mamul → Yarı mamul → Hammadde burada görünür.</div>';
  }
  const mamul = stokLookupById(agacRec.finished_good_item_id) || mamulFallback;
  const roots = Array.isArray(agacRec.agac) && agacRec.agac.length
    ? agacRec.agac
    : (Array.isArray(agacRec.satirlar) ? (() => {
      // flat → shallow list if no nested build
      const flat = agacRec.satirlar;
      const byId = new Map(flat.map((s) => [s.id, { ...s, alt_satirlar: [] }]));
      const kok = [];
      flat.forEach((s) => {
        const n = byId.get(s.id);
        if (s.parent_line_id && byId.has(s.parent_line_id)) byId.get(s.parent_line_id).alt_satirlar.push(n);
        else kok.push(n);
      });
      return kok;
    })() : []);

  const walk = (nodes, depth) => (nodes || []).map((n) => {
    const st = stokLookupById(n.component_item_id) || n;
    const type = n.item_type || st.item_type || '';
    const qty = n.quantity != null ? n.quantity : '';
    const kids = n.alt_satirlar || [];
    return `
      <div class="bom-preview-node" style="--depth:${depth}">
        <div class="bom-preview-row">
          ${tipBadge(type)}
          <span class="bom-code mono">${st.item_code || n.item_code || '—'}</span>
          <span class="bom-name">${st.item_name || n.item_name || ''}</span>
          <span class="bom-qty">${qty}${n.uom_code ? ` ${n.uom_code}` : ''}</span>
        </div>
        ${kids.length ? `<div class="bom-preview-kids">${walk(kids, depth + 1)}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="bom-preview">
      <div class="bom-preview-root">
        ${tipBadge(mamul?.item_type || 'Mamul')}
        <span class="bom-code mono">${mamul?.item_code || agacRec.item_code || '—'}</span>
        <span class="bom-name">${mamul?.item_name || agacRec.item_name || agacRec.bom_name || ''}</span>
        <span class="bom-preview-tag">${agacRec.bom_code || ''}</span>
      </div>
      ${roots.length
    ? walk(roots, 0)
    : '<div class="detail-empty">Bu ağaçta satır yok.</div>'}
    </div>`;
}

function renderBomNode(node, path, depth, tab, canEdit) {
  const stok = stokLookupById(node.component_item_id);
  const kod = node.item_code || stok?.item_code || '';
  const adi = node.item_name || stok?.item_name || '';
  const type = node.item_type || stok?.item_type || '';
  const kids = node.alt_satirlar || [];
  const forceOpen = kids.length > 0 && (
    state.treeExpanded[path] !== false
    || (state.treeSel != null && String(state.treeSel).startsWith(`${path}.`))
  );
  const selected = String(state.treeSel) === path;
  const hasStok = Boolean(node.component_item_id || kod);
  const qty = (node.quantity !== '' && node.quantity != null) ? node.quantity : '';
  const isYm = /yarı|yari/i.test(type);

  return `
    <div class="bom-node-wrap" style="--depth:${depth}">
      <div class="bom-node-row ${selected ? 'selected' : ''} ${hasStok ? '' : 'bom-node-empty'}" data-bom-path="${path}">
        <button type="button" class="bom-toggle" data-bom-toggle="${path}" title="Aç/kapa">
          ${kids.length ? (forceOpen ? '▾' : '▸') : '·'}
        </button>
        <button type="button" class="bom-node-main" data-bom-path="${path}">
          ${hasStok ? tipBadge(type) : `<span class="type-badge type-other">${depth === 0 ? 'Yarı / Ham' : 'Malzeme'}</span>`}
          <span class="bom-code mono">${kod || '—'}</span>
          <span class="bom-name">${adi || (hasStok ? '' : 'Malzeme seçin')}</span>
          <span class="bom-qty">${qty}${qty !== '' && node.uom_code ? ` ${node.uom_code}` : (node.uom_code || '')}</span>
          ${node.scrap_pct ? `<span class="bom-scrap" title="Fire %">F${node.scrap_pct}%</span>` : ''}
          ${node.gross_quantity != null && node.gross_quantity !== '' && Number(node.gross_quantity) !== Number(node.quantity)
    ? `<span class="bom-qty" title="Brüt">B${node.gross_quantity}</span>` : ''}
          ${node.operation_code || (node.operation_seq != null && node.operation_seq !== '')
    ? `<span class="bom-op mono" title="Operasyon">${escapeHtml(node.operation_code || `Op.${node.operation_seq}`)}</span>` : ''}
          ${node.warehouse_code || node.warehouse_id ? `<span class="bom-op mono" title="Depo">${escapeHtml(node.warehouse_code || 'Depo')}</span>` : ''}
          ${node.component_type && node.component_type !== 'Stok' ? `<span class="type-badge type-other">${escapeHtml(node.component_type)}</span>` : ''}
          ${node.stop_explosion ? '<span class="type-badge type-other" title="Patlatmayı durdur">Dur</span>' : ''}
          ${(node.alternatifler || []).length ? `<span class="bom-child-count">${node.alternatifler.length} ikame</span>` : ''}
          ${kids.length ? `<span class="bom-child-count">${kids.length} alt</span>` : ''}
        </button>
        ${canEdit ? `
          <div class="bom-node-actions">
            ${isYm || !hasStok ? `<button type="button" class="btn tiny ghost" data-bom-act="yeni-alt" data-bom-path="${path}" title="Alt hammadde/yarı ekle">+ Alt</button>` : ''}
            <button type="button" class="btn tiny danger" data-bom-act="sil" data-bom-path="${path}" title="Sil">×</button>
          </div>` : ''}
      </div>
      ${selected ? `
        <div class="bom-inline-editor" data-bom-editor>
          <div class="bom-inline-crumb">Yol: Mamul › ${bomPathCrumbs(ensureBomTree(state.formRecord || {}), path).join(' › ') || '…'}</div>
          <div class="form-tab-fields bom-inline-fields">
            ${(tab.fields || []).map((f) => fieldShell(f, fieldControl(f, node[f.key], 'data-bom-field'), node[f.key])).join('')}
          </div>
          ${renderBomAltMaterials(node, tab, canEdit)}
          ${canEdit ? `
          <div class="bom-editor-actions">
            <button type="button" class="btn action" data-bom-act="uygula">Satırı uygula</button>
            ${isYm || /yarı|yari/i.test(stok?.item_type || '')
    ? '<button type="button" class="btn action ghost" data-bom-act="yeni-alt" data-bom-path="' + path + '">+ Alt hammadde</button>'
    : '<button type="button" class="btn action ghost" data-bom-act="uygula-ve-yeni">Uygula + kardeş</button>'}
          </div>` : ''}
        </div>` : ''}
      ${forceOpen && kids.length ? `
        <div class="bom-children">
          ${kids.map((ch, i) => renderBomNode(ch, `${path}.${i}`, depth + 1, tab, canEdit)).join('')}
        </div>` : ''}
    </div>`;
}

function renderBomTree(tab, rec) {
  const nodes = ensureBomTree(rec);
  const canEdit = state.formMode !== 'incele';
  const mamul = stokLookupById(rec.finished_good_item_id);
  const headerFields = tab.headerFields || [];

  // Varsayılan: tüm seviyeler açık (mamul → ym → hm görünsün)
  nodes.forEach((_, i) => {
    if (state.treeExpanded[String(i)] === undefined) state.treeExpanded[String(i)] = true;
  });

  return `
    <div class="bom-workspace">
      ${headerFields.length ? `
        <div class="bom-workspace-header">
          <div class="section-label">Ürün ağacı başlığı (BOMT01)</div>
          <div class="form-tab-fields bom-header-fields">
            ${headerFields.map((f) => fieldShell(f, fieldControl(f, rec[f.key], 'data-master'), rec[f.key])).join('')}
          </div>
          <p class="toolbar-hint">Firma · Tesis · Malzeme · Alt no · Temel miktar / birim · Geçerlilik. Ağaç: <strong>Mamul → Yarı mamul → Hammadde</strong>.</p>
        </div>` : ''}
      <div class="bom-workspace-tree">
        <div class="bom-tree-legend">
          <span>${tipBadge('Mamul')} Mamul</span>
          <span>${tipBadge('YariMamul')} Yarı mamul</span>
          <span>${tipBadge('Hammadde')} Hammadde</span>
        </div>
        <div class="inline-toolbar">
          ${canEdit ? `
            <button type="button" class="btn action" data-bom-act="yeni-kok">+ Eleman ekle</button>
            <button type="button" class="btn action ghost" data-bom-act="coklu-ekle">Çoklu malzeme ekle</button>
            <button type="button" class="btn action ghost" data-bom-act="eleman-kopyala" ${state.treeSel == null ? 'disabled' : ''}>Eleman kopyala</button>
          ` : ''}
          <button type="button" class="btn action ghost" data-bom-act="on-maliyet" title="Stok son maliyeti × brüt miktar">Ön maliyet</button>
          ${rec.precost_amount != null && rec.precost_amount !== ''
    ? `<span class="toolbar-hint">Son ön maliyet: <strong>${escapeHtml(String(rec.precost_amount))}</strong></span>` : ''}
        </div>
        <div class="bom-tree" data-bom-tree>
          <div class="bom-root">
            ${tipBadge(mamul?.item_type || 'Mamul')}
            <span class="bom-code mono">${mamul?.item_code || rec.item_code || '—'}</span>
            <span class="bom-name">${mamul?.item_name || rec.item_name || rec.bom_name || 'Yukarıdan mamul seçin'}</span>
          </div>
          ${nodes.length
    ? nodes.map((n, i) => renderBomNode(n, String(i), 0, tab, canEdit)).join('')
    : `<div class="detail-empty">${canEdit
      ? (mamul
        ? 'Henüz satır yok. «+ Kök altına…» ile yarı mamul veya hammadde ekleyin.'
        : 'Önce mamul (kök) seçin.')
      : 'Ağaç boş.'}</div>`}
        </div>
      </div>
    </div>`;
}

/** Ürün ağacı satırlarından rotaya aktarılacak malzemeler (yaprak / iş emrine giden). */
function collectBomMaterialsForRota(bomRec) {
  if (!bomRec) return [];
  let flat = Array.isArray(bomRec.satirlar) ? bomRec.satirlar.slice() : [];
  if (!flat.length && Array.isArray(bomRec.agac)) {
    const out = [];
    const walk = (nodes) => {
      (nodes || []).forEach((n) => {
        out.push(n);
        if (n.alt_satirlar?.length) walk(n.alt_satirlar);
      });
    };
    walk(bomRec.agac);
    flat = out;
  }
  flat = flat.filter((s) => s && s.component_item_id);
  flat = flat.filter((s) => s.goes_to_wo !== false && s.goes_to_wo !== 0 && s.goes_to_wo !== '0');
  const parentIds = new Set(flat.map((s) => s.parent_line_id).filter((v) => v != null && v !== ''));
  const hasHierarchy = parentIds.size > 0;
  const lines = hasHierarchy
    ? flat.filter((s) => !parentIds.has(s.id))
    : flat;
  // Aynı stok birden fazla satırda olabilir → birleştir
  const byItem = new Map();
  lines.forEach((s) => {
    const id = Number(s.component_item_id);
    if (!Number.isFinite(id)) return;
    const qty = Number(s.quantity != null && s.quantity !== '' ? s.quantity : s.net_quantity) || 0;
    const uom = s.uom_code || s.item_uom_code || '';
    const prev = byItem.get(id);
    if (prev) {
      prev.quantity = Number(prev.quantity || 0) + qty;
    } else {
      byItem.set(id, {
        item_id: id,
        quantity: qty,
        uom_code: uom,
        operation_seq: s.operation_seq,
        operation_code: s.operation_code || '',
      });
    }
  });
  return [...byItem.values()];
}

function emptyRotaOperation(lineNo = 10, seed = {}) {
  return {
    line_no: lineNo,
    operation_code: `OP${lineNo}`,
    operation_name: 'Üretim',
    item_id: seed.item_id || '',
    product_bom_id: seed.product_bom_id || '',
    op_time_uom: 'dk',
    setup_time_uom: 'dk',
    wait_time_uom: 'dk',
    unload_time_uom: 'dk',
    include_precost: true,
    include_std_cost: true,
    include_actual_cost: true,
    cost_factor_1: 1,
    cost_factor_2: 1,
    bilesenler: [],
    ekipmanlar: [],
  };
}

function materialToRotaComp(m) {
  return {
    item_id: m.item_id,
    quantity: m.quantity,
    uom_code: m.uom_code || '',
  };
}

/**
 * Ağaç malzemelerini operasyonlara dağıt.
 * BOM satırında op kodu/sırası varsa eşleştir; yoksa ilk operasyona yaz.
 */
function distributeBomMaterialsToOps(ops, materials, { replace = true } = {}) {
  const list = Array.isArray(ops) ? ops.map((o) => ({
    ...o,
    bilesenler: Array.isArray(o.bilesenler) ? [...o.bilesenler] : [],
    ekipmanlar: Array.isArray(o.ekipmanlar) ? [...o.ekipmanlar] : [],
  })) : [];
  if (!list.length) list.push(emptyRotaOperation(10));
  if (replace) list.forEach((op) => { op.bilesenler = []; });

  const unassigned = [];
  (materials || []).forEach((m) => {
    let idx = -1;
    if (m.operation_code) {
      idx = list.findIndex((o) => String(o.operation_code || '') === String(m.operation_code));
    }
    if (idx < 0 && m.operation_seq != null && m.operation_seq !== '') {
      idx = list.findIndex((o) => Number(o.line_no) === Number(m.operation_seq));
    }
    if (idx >= 0) list[idx].bilesenler.push(materialToRotaComp(m));
    else unassigned.push(m);
  });
  if (unassigned.length) {
    list[0].bilesenler.push(...unassigned.map(materialToRotaComp));
  }
  return list;
}

async function loadBomRecordForRota(bomId) {
  if (bomId == null || bomId === '') return null;
  let bomRec = (state.lookupCache['urun-agaclari'] || [])
    .find((a) => String(a.id) === String(bomId));
  const thin = bomRec && !((bomRec.satirlar && bomRec.satirlar.length) || (bomRec.agac && bomRec.agac.length));
  if (!bomRec || thin) {
    try {
      bomRec = await api(`/urun-agaclari/${bomId}`);
      const cache = state.lookupCache['urun-agaclari'] || [];
      const i = cache.findIndex((a) => String(a.id) === String(bomId));
      if (i >= 0) cache[i] = bomRec;
      else cache.push(bomRec);
      state.lookupCache['urun-agaclari'] = cache;
    } catch (_) {
      /* cache’teki haliyle devam */
    }
  }
  return bomRec || null;
}

/** Başlık ürün ağacından seçili operasyona malzeme aktar. */
async function applyBomMaterialsToRota(screen, { quiet = false, force = false, opIdx = null } = {}) {
  const tab = findRotaTab(screen);
  if (!tab) return false;
  const master = readMasterFromForm(screen);
  state.formRecord = { ...(state.formRecord || {}), ...master };
  persistFlowEditor(state.formRecord, tab);
  const ops = Array.isArray(state.formRecord.operasyonlar) ? [...state.formRecord.operasyonlar] : [];
  const idx = opIdx != null ? Number(opIdx) : state.flowSel;
  if (idx == null || !ops[idx]) {
    if (!quiet) toast('Önce bir operasyon seçin.');
    return false;
  }
  const bomId = state.formRecord.product_bom_id;
  if (!bomId) {
    if (!quiet) toast('Önce rota başlığında ürün ağacı seçin.');
    return false;
  }
  const op = { ...ops[idx], bilesenler: Array.isArray(ops[idx].bilesenler) ? [...ops[idx].bilesenler] : [] };
  const bomRec = await loadBomRecordForRota(bomId);
  const materials = collectBomMaterialsForRota(bomRec);
  if (!materials.length) {
    if (!quiet) toast('Ürün ağacında aktarılacak malzeme satırı yok.');
    return false;
  }
  const existingCount = (op.bilesenler || []).filter((b) => b.item_id).length;
  if (existingCount && !force) {
    if (!window.confirm(
      `Bu operasyonda ${existingCount} malzeme var. Ağaçtan ${materials.length} satır ile değiştirilsin mi?`,
    )) return false;
  }
  op.bilesenler = materials.map(materialToRotaComp);
  ops[idx] = op;
  state.formRecord.operasyonlar = ops;
  state.flowSel = idx;
  state.flowCompSel = null;
  state.flowEquipSel = null;
  if (!quiet) {
    toast(`${materials.length} malzeme bu operasyona aktarıldı — gerekmeyen satırları silebilirsiniz.`);
  }
  renderForm(screen);
  persistActiveFormTab();
  return true;
}

/** Operasyon üst alanları düz grid (grup başlıksız) — sıra tanım sırası. */
function renderRotaPrimaryFields(fields, op, attrName = 'data-flow-field') {
  const list = (fields || []).filter((f) => f && f.type !== 'static');
  if (!list.length) return '';
  const ctx = op || {};
  return `<div class="erp-balanced rota-op-primary">
    <div class="erp-section-grid">${list.map((f) => fieldShell(
    f,
    fieldControl(f, ctx[f.key], attrName, '', ctx),
    ctx[f.key],
  ).replace(/^<div class="/, `<div class="${fieldSpanClass(f)} `)).join('')}</div>
  </div>`;
}

/** Operasyon üst alanları + Planlama / Gelişmiş accordion. materialsHtml üst alanlardan sonra gömülür. */
function renderRotaOpFields(tab, op, { materialsHtml = '', headerBomId = '' } = {}) {
  const all = tab.fields || [];
  const opCtx = { ...op, product_bom_id: op.product_bom_id || headerBomId || '' };
  const primary = all.filter((f) => !f.section);
  const planlama = all.filter((f) => f.section === 'planlama');
  const gelismis = all.filter((f) => f.section === 'gelismis');
  const showPlan = Boolean(state.rotaShowPlanlama);
  const showAdv = Boolean(state.rotaShowAdvanced);
  return `
    <div data-flow-editor>
      ${renderRotaPrimaryFields(primary, opCtx, 'data-flow-field')}
      ${materialsHtml || ''}
      ${planlama.length ? `
        <details class="rota-advanced" data-rota-section="planlama" ${showPlan ? 'open' : ''}>
          <summary>Planlama (${planlama.length})</summary>
          <div class="rota-advanced-body">
            ${renderGroupedFieldCards(planlama, opCtx, 'data-flow-field')}
          </div>
        </details>` : ''}
      ${gelismis.length ? `
        <details class="rota-advanced" data-rota-section="gelismis" ${showAdv ? 'open' : ''}>
          <summary>Gelişmiş alanlar (${gelismis.length})</summary>
          <div class="rota-advanced-body">
            ${renderGroupedFieldCards(gelismis, opCtx, 'data-flow-field')}
          </div>
        </details>` : ''}
    </div>`;
}

function renderRotaFlow(tab, rec) {
  const ops = normalizeGridRows(
    { fields: tab.fields },
    Array.isArray(rec.operasyonlar) ? rec.operasyonlar : []
  ).map((op) => ({
    ...op,
    bilesenler: Array.isArray(op.bilesenler) ? op.bilesenler : [],
    ekipmanlar: Array.isArray(op.ekipmanlar) ? op.ekipmanlar : [],
  }));
  ops.sort((a, b) => Number(a.line_no || 0) - Number(b.line_no || 0));
  rec.operasyonlar = ops;
  // İncele / açılışta ilk adım seçili olsun — çoklu operasyon görünür kalsın
  if (ops.length && (state.flowSel == null || state.flowSel < 0 || state.flowSel >= ops.length)) {
    state.flowSel = 0;
  }
  const canEdit = state.formMode !== 'incele';
  const sel = state.flowSel;
  const selOp = sel != null ? ops[sel] : null;
  const bomId = rec.product_bom_id || '';
  const bomRec = bomId
    ? (state.lookupCache['urun-agaclari'] || []).find((a) => String(a.id) === String(bomId))
    : null;
  const headerStok = stokLookupById(rec.item_id);
  const headerFields = tab.headerFields || [];
  const equipFields = tab.equipmentFields || [];
  const sablonField = {
    key: '_sablon_rota_id',
    label: 'Şablon rota',
    type: 'lookup',
    lookup: 'rota-sablonlari',
    valueKey: 'id',
    labelKey: 'route_name',
    codeKey: 'route_code',
  };
  const matTotal = ops.reduce((n, o) => n + (o.bilesenler || []).length, 0);
  const canPullBom = Boolean(canEdit && sel != null && bomId);

  const renderOpMaterials = (op) => {
    const mats = op.bilesenler || [];
    const opCtx = { ...op, product_bom_id: op.product_bom_id || bomId || '' };
    return `
      <div class="rota-op-materials">
        <div class="section-label">Bu adımın malzemeleri</div>
        <div class="inline-toolbar">
          ${canEdit && bomId ? `
            <button type="button" class="btn action ghost" data-flow-act="agactan-malzeme">Ağaçtan yenile</button>
            <button type="button" class="btn action ghost" data-flow-act="yeni-comp">+ Elle malzeme</button>
          ` : (canEdit ? '<span class="toolbar-hint">Önce rota başlığında ürün ağacı seçin.</span>' : '')}
        </div>
        ${mats.length ? mats.map((b, ci) => {
    const st = stokLookupById(b.item_id);
    const picked = state.flowCompSel === ci;
    const qty = (b.quantity !== '' && b.quantity != null) ? b.quantity : '';
    return `
          <div class="detail-slot rota-mat-slot ${picked ? 'selected' : ''} ${st || b.item_id ? '' : 'detail-slot-empty'}" data-flow-comp="${ci}">
            <div class="rota-mat-row">
              <button type="button" class="detail-slot-pick" data-flow-comp-pick="${ci}">
                <span class="detail-slot-summary">${st ? `${tipBadge(st.item_type)} ${st.item_code} — ${st.item_name}` : (b.item_id || 'Malzeme seçin')}${qty !== '' ? ` · ${qty}${b.uom_code ? ` ${b.uom_code}` : ''}` : ''}</span>
              </button>
              ${canEdit ? `
                <button type="button" class="btn tiny danger" data-flow-act="sil-comp" data-flow-comp-idx="${ci}" title="Malzemeyi sil">Sil</button>
              ` : ''}
            </div>
            ${picked && canEdit ? `
              <div class="detail-slot-fields">
                ${(tab.componentFields || []).map((f) => fieldShell(f, fieldControl(f, b[f.key], 'data-flow-comp-field', '', { ...opCtx, ...b }), b[f.key])).join('')}
                <div class="bom-editor-actions rota-editor-actions">
                  <button type="button" class="btn action" data-flow-act="uygula-comp">Kaydet</button>
                </div>
              </div>` : ''}
          </div>`;
  }).join('') : `<div class="detail-empty">${canEdit && bomId ? '«Ağaçtan malzemeleri getir» ile doldurun veya elle ekleyin.' : 'Malzeme yok.'}</div>`}
      </div>`;
  };

  return `
    <div class="rota-workspace">
      ${headerFields.length ? `
        <div class="bom-workspace-header">
          <div class="section-label">Rota başlığı</div>
          <div class="bom-header-fields">
            ${renderGroupedFieldCards(headerFields, rec, 'data-master')}
          </div>
        </div>` : ''}
      <div class="rota-workspace-body">
        <aside class="rota-bom-side">
          <div class="section-label">Seçili operasyon ağacı</div>
          ${!bomId
    ? '<div class="detail-empty">Rota başlığında stok / ürün ağacı seçin — ağaç burada bilgi olarak görünür.</div>'
    : renderBomPreviewTree(bomRec, headerStok)}
          <p class="toolbar-hint">Ürün ağacı başlıktaki stoğa bağlıdır; operasyonlara malzeme buradan taşınır.</p>
          ${canEdit ? `
            <div class="inline-toolbar" style="margin-top:.5rem;flex-wrap:wrap">
              <button type="button" class="btn action" data-flow-act="agactan-malzeme" ${canPullBom ? '' : 'disabled'} title="Başlık ağacından seçili operasyona malzeme yaz">
                Ağaçtan malzemeleri getir
              </button>
            </div>
            <div class="section-label" style="margin-top:1rem">Şablon uygula</div>
            <div class="form-tab-fields">
              ${fieldShell(sablonField, fieldControl(sablonField, rec._sablon_rota_id, 'data-master', '', rec), rec._sablon_rota_id)}
            </div>
            <div class="inline-toolbar">
              <button type="button" class="btn action ghost" data-flow-act="sablon-uygula">Şablonu uygula</button>
            </div>
            <p class="toolbar-hint">Şablon operasyonları mevcut adımların yerine kopyalanır.</p>
          ` : ''}
        </aside>
        <div class="rota-flow-main">
          <div class="inline-toolbar">
            <span class="toolbar-hint">${ops.length} operasyon${matTotal ? ` · ${matTotal} malzeme` : ''}${selOp ? ` · seçili: ${selOp.operation_code || `#${(sel || 0) + 1}`}` : ''}</span>
            ${canEdit ? `
              <button type="button" class="btn action" data-flow-act="yeni-op">+ Operasyon</button>
              <button type="button" class="btn action" data-flow-act="agactan-malzeme" ${canPullBom ? '' : 'disabled'}>Ağaçtan malzeme</button>
              ${sel != null ? `
                <button type="button" class="btn action" data-flow-act="uygula-op">Kaydet</button>
                <button type="button" class="btn action danger" data-flow-act="sil-op">Seçili operasyonu sil</button>
              ` : ''}
            ` : ''}
          </div>
          <div class="rota-flow">
            ${ops.length ? ops.map((op, idx) => {
    const open = sel === idx;
    const hasKod = Boolean(op.operation_code || op.operation_name);
    const cikti = stokLookupById(op.output_item_id);
    const opItem = stokLookupById(op.item_id);
    const eqCount = (op.ekipmanlar || []).length;
    const matCount = (op.bilesenler || []).length;
    return `
              <div class="rota-op-block ${open ? 'selected' : ''} ${hasKod ? '' : 'rota-op-empty'}" data-flow-idx="${idx}">
                <button type="button" class="rota-op-head" data-flow-idx="${idx}">
                  <span class="rota-op-seq">${idx + 1} / ${ops.length} · Sıra ${op.line_no || '—'}</span>
                  <span class="rota-op-title"><span class="mono">${op.operation_code || '—'}</span> ${op.operation_name || (hasKod ? '' : 'Operasyon girin')}</span>
                  <span class="rota-op-comp-count">${opItem ? `${opItem.item_code} · ` : ''}${matCount} malzeme${eqCount ? ` · ${eqCount} ekipman` : ''}${cikti ? ` · çıktı ${cikti.item_code}` : ''}</span>
                </button>
                ${open ? `
                  <div class="rota-op-body">
                    ${renderRotaOpFields(tab, op, {
    headerBomId: bomId,
    materialsHtml: renderOpMaterials(op),
  })}
                    ${canEdit ? `
                      <div class="bom-editor-actions rota-editor-actions">
                        <button type="button" class="btn action" data-flow-act="uygula-op">Kaydet</button>
                        <button type="button" class="btn action danger" data-flow-act="sil-op">Operasyonu sil</button>
                      </div>` : ''}
                    ${equipFields.length ? `
                    <details class="rota-advanced rota-equip-block">
                      <summary>Ekipman (opsiyonel)${eqCount ? ` — ${eqCount}` : ''}</summary>
                      <div class="inline-toolbar">
                        ${canEdit ? `
                          <button type="button" class="btn action ghost" data-flow-act="yeni-eq">+ Ekipman</button>
                        ` : ''}
                      </div>
                      ${(op.ekipmanlar || []).length ? op.ekipmanlar.map((eq, ei) => {
    const picked = state.flowEquipSel === ei;
    const label = eq.equipment_code
      ? `${eq.equipment_code}${eq.equipment_name ? ` — ${eq.equipment_name}` : ''}`
      : 'Ekipman girin';
    return `
                      <div class="detail-slot ${picked ? 'selected' : ''} ${eq.equipment_code ? '' : 'detail-slot-empty'}" data-flow-eq="${ei}">
                        <button type="button" class="detail-slot-pick" data-flow-eq-pick="${ei}">
                          <span class="detail-slot-summary"><span class="mono">${escAttr(label)}</span>${eq.cavity_count ? ` · ${eq.cavity_count} göz` : ''}</span>
                        </button>
                        ${picked && canEdit ? `
                          <div class="detail-slot-fields">
                            ${equipFields.map((f) => fieldShell(f, fieldControl(f, eq[f.key], 'data-flow-equip-field', '', eq), eq[f.key])).join('')}
                            <div class="bom-editor-actions rota-editor-actions">
                              <button type="button" class="btn action" data-flow-act="uygula-eq">Kaydet</button>
                              <button type="button" class="btn action danger" data-flow-act="sil-eq">Sil</button>
                            </div>
                          </div>` : ''}
                      </div>`;
  }).join('') : `<div class="detail-empty">${canEdit ? 'Gerekirse ekipman ekleyin.' : 'Ekipman yok.'}</div>`}
                    </details>
                    ` : ''}
                  </div>` : ''}
              </div>
              ${idx < ops.length - 1 ? '<div class="rota-arrow">↓</div>' : ''}`;
  }).join('') : `<div class="detail-empty">${canEdit ? '«+ Operasyon» ile üretim adımlarını sırayla ekleyin.' : 'Operasyon yok.'}</div>`}
          </div>
        </div>
      </div>
    </div>`;
}

function renderZincirStrip(screen, rec) {
  let strip = $('#zincirStrip');
  if (!strip) {
    strip = document.createElement('div');
    strip.id = 'zincirStrip';
    strip.className = 'zincir-strip';
    const top = document.querySelector('.form-topbar');
    if (top && top.parentNode) top.parentNode.insertBefore(strip, top.nextSibling);
  }
  if (!isIrsaliyeYonetimiScreen(screen) || !rec?.id) {
    strip.hidden = true;
    strip.innerHTML = '';
    return;
  }
  strip.hidden = false;
  strip.innerHTML = '<span>Zincir yükleniyor…</span>';
  api(`/delivery_notes/${rec.id}/zincir`).then((z) => {
    const adimlar = z.adimlar || [];
    strip.innerHTML = adimlar.map((a) => {
      const is_active = a.type === 'IRSALIYE' && Number(a.id) === Number(rec.id);
      return `<span class="${is_active ? 'is_active' : ''}">${a.type}: ${a.no || a.id} (${a.status || '—'})</span>`;
    }).join('') || '<span>Zincir yok</span>';
  }).catch(() => {
    strip.innerHTML = '';
    strip.hidden = true;
  });
}

function renderForm(screen) {
  // Segment radio name sayacı — her render’da sıfırla
  if (typeof fieldControl === 'function') fieldControl._segSeq = 0;
  const readonly = state.formMode === 'incele';
  const rec = state.formRecord || {};
  applyFormLayoutChrome(screen);
  const mod = findScreenModule(screen);
  const modEl = $('#formModuleLabel');
  if (modEl) modEl.textContent = mod?.title || 'ERP';
  const modeLabel = MODE_LABELS[state.formMode] || state.formMode;
  const badge = $('#formModeBadge');
  if (badge) {
    badge.textContent = modeLabel;
    badge.dataset.mode = state.formMode || '';
  }
  const screenLabel = $('#formScreenLabel');
  if (screenLabel) screenLabel.textContent = screen.title;
  const chip = $('#formRecordChip');
  if (chip) {
    const codeKey = screen.codeField;
    const codeVal = codeKey ? rec?.[codeKey] : null;
    const statusVal = rec?.status;
    const parts = [];
    if (codeVal) parts.push(String(codeVal));
    if (statusVal) parts.push(String(statusVal));
    if (parts.length) {
      chip.hidden = false;
      chip.textContent = parts.join(' · ');
    } else {
      chip.hidden = true;
      chip.textContent = '';
    }
  }
  const saveHidden = readonly;
  ['btnFormSave', 'btnFormSaveClose', 'btnFormSaveNew'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = saveHidden;
  });
  const saveGroup = $('#formSaveGroup');
  if (saveGroup) saveGroup.hidden = saveHidden;
  updateFormCrudButtons(screen);
  const conv = $('#btnFormConvert');
  if (conv) {
    const act = screen.convertAction || screen.approveAction;
    // P39: Taslak irsaliyede fatura dönüşümü gösterme — önce onay
    let show = Boolean(act && rec.id && state.formMode !== 'yeni');
    if (isIrsaliyeYonetimiScreen(screen) && rec.status === 'Taslak') {
      show = Boolean(screen.approveAction);
    }
    if (isIrsaliyeYonetimiScreen(screen) && rec.status === 'Onayli') {
      // Fatura Oluştur: yalnızca GİB’e gönderildikten sonra is_active
      show = Boolean(screen.convertAction && String(rec.e_document_status || '') === 'Gonderildi');
    }
    if (isIrsaliyeYonetimiScreen(screen) && rec.status === 'FaturayaDonustu') {
      show = false;
    }
    if (isFaturaYonetimiScreen(screen)) {
      const alis = String(rec.invoice_type || '').toLowerCase().includes('alis');
      if (alis && !rec.is_posted) {
        // Alış: 3-way eşleştir (approve) veya muhasebeleştir (convert) — convert birincil
        show = Boolean(screen.convertAction || screen.approveAction);
      }
    }
    if (screen.id === 'muhasebe-belgeleri') {
      if (rec.status === 'Taslak') show = Boolean(screen.approveAction);
      else if (rec.status === 'Onayli' && !rec.reversal_document_id) show = Boolean(screen.convertAction);
      else show = false;
    }
    if (screen.id === 'muhasebe-donemleri') {
      if (rec.status === 'Kapali') show = Boolean(screen.convertAction);
      else if (['Acik', 'YenidenAcik'].includes(rec.status)) show = Boolean(screen.approveAction);
      else show = false;
    }
    if (screen.id === 'uretim-emirleri') {
      show = Boolean(
        screen.approveAction
        && rec.id
        && state.formMode !== 'yeni'
        && ['Taslak', 'OnayBekliyor'].includes(rec.status)
      );
    }
    if (screen.id === 'uretim-planlari') {
      show = Boolean(screen.convertAction && rec.status === 'Acik' && !rec.production_order_id);
    }
    if (screen.id === 'crm-adaylar') {
      show = Boolean(screen.convertAction && rec.status !== 'Donusturuldu');
    }
    if (screen.id === 'crm-firsatlar') {
      // Açık fırsatta teklif + kapat (ikincil)
      if (rec.status === 'Acik' && screen.convertAction) {
        show = true;
      } else {
        show = false;
      }
    }
    const secBtn = $('#btnFormSecondary');
    if (secBtn) {
      let secShow = false;
      let secLabel = '';
      if (screen.id === 'crm-firsatlar' && rec.status === 'Acik' && screen.approveAction) {
        secShow = true;
        secLabel = screen.approveAction.label;
        secBtn.dataset.secKind = 'approve';
      } else if (screen.id === 'satis-siparisleri' && rec.id && screen.secondaryAction
        && ['Taslak', 'Onayli', 'Kismi'].includes(rec.status)) {
        secShow = true;
        secLabel = screen.secondaryAction.label;
        secBtn.dataset.secKind = 'secondary';
      } else if (screen.id === 'uretim-emirleri' && rec.id && screen.secondaryAction
        && ['Acik', 'Uretimde'].includes(rec.status) && !rec.is_started) {
        secShow = true;
        secLabel = screen.secondaryAction.label;
        secBtn.dataset.secKind = 'baslat';
      } else if ((screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk')
        && screen.approveAction && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.status)) {
        // Onay birincil convert'de; reddet ikincil
        secShow = true;
        secLabel = 'Reddet';
        secBtn.dataset.secKind = 'kk-red';
      } else if (screen.id === 'onaylarim' && rec.id && rec.status_code === 'BEKLIYOR') {
        secShow = true;
        secLabel = 'Reddet';
        secBtn.dataset.secKind = 'onay-red';
      } else if (isFaturaYonetimiScreen(screen) && rec.id && screen.approveAction
        && String(rec.invoice_type || '').toLowerCase().includes('alis')) {
        secShow = true;
        secLabel = screen.approveAction.label;
        secBtn.dataset.secKind = 'approve';
      } else if (screen.id === 'hr-bordro-calismalari' && rec.id && screen.secondaryAction
        && ['Taslak', 'Hesaplandi'].includes(rec.status)) {
        secShow = true;
        secLabel = screen.secondaryAction.label;
        secBtn.dataset.secKind = 'baslat';
      }
      secBtn.hidden = !secShow;
      if (secShow) secBtn.textContent = secLabel;
    }
    if (screen.id === 'crm-gorevler') {
      show = Boolean(screen.approveAction && ['Acik', 'Devam'].includes(rec.status));
    }
    if (screen.id === 'crm-faaliyet-planlari') {
      show = Boolean(screen.convertAction && ['Planlandi', 'Devam'].includes(rec.status));
    }
    if (screen.id === 'satin-alma-talepleri') {
      show = Boolean(screen.approveAction && rec.status === 'Acik');
    }
    if (screen.id === 'satin-alma-teklifleri') {
      if (rec.status === 'Taslak') {
        show = Boolean(screen.approveAction);
      } else if (rec.status === 'Onayli') {
        show = Boolean(screen.convertAction);
      } else {
        show = false;
      }
    }
    if (screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk') {
      show = Boolean(screen.approveAction && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.status));
    }
    if (screen.id === 'onaylarim') {
      show = Boolean(screen.approveAction && rec.status_code === 'BEKLIYOR');
    }
    if (screen.id === 'hr-izin-talepleri') {
      if (rec.status === 'Taslak') show = Boolean(screen.convertAction);
      else if (['Gonderildi', 'YoneticiOnay', 'IkOnay'].includes(rec.status)) show = Boolean(screen.approveAction);
      else show = false;
    }
    if (screen.id === 'hr-avanslar') {
      if (['Taslak', 'OnayBekliyor'].includes(rec.status)) show = Boolean(screen.approveAction);
      else if (rec.status === 'Onaylandi') show = Boolean(screen.convertAction);
      else show = false;
    }
    if (screen.id === 'hr-bordro-calismalari') {
      if (rec.status === 'Hesaplandi') show = Boolean(screen.approveAction);
      else if (rec.status === 'Onaylandi') show = Boolean(screen.convertAction);
      else show = false;
    }
    if (screen.id === 'hr-adaylar') {
      show = Boolean(screen.convertAction && rec.status !== 'IseAlindi' && !rec.employee_id);
    }
    if (screen.id === 'hr-onboarding') {
      show = Boolean(screen.approveAction && rec.status === 'Bekliyor');
    }
    if (screen.id === 'hr-zimmetler') {
      show = Boolean(screen.approveAction && rec.status === 'Zimmette');
    }
    if (screen.id === 'hr-isten-cikis') {
      show = Boolean(screen.approveAction && ['Taslak', 'Kontrol'].includes(rec.status));
    }
    conv.hidden = !show;
    if (show) {
      const preferApprove = (screen.approveAction && (
        (isIrsaliyeYonetimiScreen(screen) && rec.status === 'Taslak')
        || (screen.id === 'muhasebe-belgeleri' && rec.status === 'Taslak')
        || (screen.id === 'muhasebe-donemleri' && ['Acik', 'YenidenAcik'].includes(rec.status))
        || (screen.id === 'uretim-emirleri' && ['Taslak', 'OnayBekliyor'].includes(rec.status))
        || (screen.id === 'crm-gorevler' && ['Acik', 'Devam'].includes(rec.status))
        || (screen.id === 'satin-alma-talepleri' && rec.status === 'Acik')
        || (screen.id === 'satin-alma-teklifleri' && rec.status === 'Taslak')
        || ((screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk')
            && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.status))
        || (screen.id === 'onaylarim' && rec.status_code === 'BEKLIYOR')
        || (screen.id === 'hr-izin-talepleri' && ['Gonderildi', 'YoneticiOnay', 'IkOnay'].includes(rec.status))
        || (screen.id === 'hr-avanslar' && ['Taslak', 'OnayBekliyor'].includes(rec.status))
        || (screen.id === 'hr-bordro-calismalari' && rec.status === 'Hesaplandi')
        || (screen.id === 'hr-onboarding' && rec.status === 'Bekliyor')
        || (screen.id === 'hr-zimmetler' && rec.status === 'Zimmette')
        || (screen.id === 'hr-isten-cikis' && ['Taslak', 'Kontrol'].includes(rec.status))
      ));
      const label = preferApprove
        ? screen.approveAction.label
        : (screen.convertAction?.label || act.label);
      conv.textContent = label;
      conv.dataset.convertKind = preferApprove ? 'approve' : 'convert';
    }
  }

  // İş emri: Detayları Doldur + BOM/Rota Uygula (başlatılmamış, açık emir)
  const fillBtn = $('#btnFormDetailFill');
  const bomBtn = $('#btnFormBomRota');
  const woCanRefill = screen.id === 'uretim-emirleri'
    && rec.id
    && state.formMode !== 'yeni'
    && !readonly
    && !rec.is_started
    && Number(rec.produced_quantity || 0) <= 0
    && !['Kapali', 'Iptal'].includes(rec.status);
  if (fillBtn) {
    const showFill = woCanRefill && screen.detailFillAction;
    fillBtn.hidden = !showFill;
    if (showFill) fillBtn.textContent = screen.detailFillAction.label;
  }
  if (bomBtn) {
    const showBom = woCanRefill && screen.bomRotaChangeAction;
    bomBtn.hidden = !showBom;
    if (showBom) bomBtn.textContent = screen.bomRotaChangeAction.label;
  }

  // Belge zinciri şeridi (irsaliye)
  renderZincirStrip(screen, rec);

  const tabsLayoutEl = $('#formTabsLayout');
  const classic = $('#formSplitClassic');
  if (classic) {
    classic.hidden = true;
    classic.style.display = 'none';
  }
  if (tabsLayoutEl) {
    tabsLayoutEl.hidden = false;
    tabsLayoutEl.style.display = 'grid';
  }

  // Kompakt kimlik/org — sekmelerin üstünde (Adres/Ödeme'de de görünür)
  renderCompactMasterBar(screen, rec);

  const tabs = screen.formTabs || [];
  if (!state.formActiveTab || !tabs.some((t) => t.id === state.formActiveTab)) {
    state.formActiveTab = tabs[0]?.id || null;
  }

  const nav = $('#formTabNav');
  const body = $('#formTabBody');
  if (!nav || !body) return;

  // Tek sekme / tek kart: sol menüyü gizle, tam genişlik
  const singlePane = tabs.length <= 1;
  if (tabsLayoutEl) tabsLayoutEl.classList.toggle('form-tabs-layout--single', singlePane);
  nav.hidden = singlePane;
  nav.innerHTML = singlePane ? '' : tabs.map((tab) => `
    <button type="button" class="form-tab-btn ${tab.kind === 'stub' ? 'stub' : ''} ${state.formActiveTab === tab.id ? 'active' : ''}"
      data-form-tab="${tab.id}">${tab.label}</button>
  `).join('');

  body.innerHTML = tabs.map((tab) => {
    const active = state.formActiveTab === tab.id;
    const hide = active ? '' : 'hidden';
    if (tab.kind === 'stub') {
      return `<div class="form-tab-panel" data-tab-panel="${tab.id}" ${hide}>
        <div class="stub-panel">${tab.note || 'Bu bölüm henüz hazır değil.'}</div>
      </div>`;
    }
    if (tab.kind === 'master-detail') {
      const scrollCls = screen.kullaniciYetkiPaneli ? ' form-tab-panel--scrollable' : '';
      return `<div class="form-tab-panel form-tab-panel--md${scrollCls}" data-tab-panel="${tab.id}" ${hide}>
        ${renderMasterDetailPanel(tab, rec)}
      </div>`;
    }
    if (tab.kind === 'master-grid') {
      return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
        ${renderMasterGridPanel(tab, rec)}
      </div>`;
    }
    if (tab.kind === 'grid') {
      const rows = Array.isArray(rec?.[tab.key]) ? rec[tab.key].length : 0;
      return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
        ${renderClassicShell({
          rec,
          primary: [],
          extras: [],
          bodyHtml: renderDynamicGrid(tab, rec),
          footerNotes: [],
          bodyLabel: tab.label || 'Kalemler',
          metaHtml: `<span class="md-detail-meta">${rows} satır</span>`,
          footerFields: tab.fields || [],
          footerKey: tab.key,
        })}
      </div>`;
    }
    if (tab.kind === 'bom-tree' || tab.kind === 'bom-workspace') {
      return `<div class="form-tab-panel form-tab-panel--scroll" data-tab-panel="${tab.id}" ${hide}>
        ${renderBomTree(tab, rec)}
      </div>`;
    }
    if (tab.kind === 'rota-flow' || tab.kind === 'rota-workspace') {
      return `<div class="form-tab-panel form-tab-panel--scroll" data-tab-panel="${tab.id}" ${hide}>
        ${renderRotaFlow(tab, rec)}
      </div>`;
    }
    const masterLike = tab.id === 'master' || tab.id === 'ana' || tab.id === 'kart'
      || tab.id === 'baslik' || tab.id === 'bilgiler';
    const tabFields = tab.fields || [];
    const layoutKind = inferFormLayoutKind(screen);
    // Tanım / kart formları: bölümlü 3 kolon — notlar da aynı ızgarada
    if (layoutKind === 'master' || masterLike) {
      return `<div class="form-tab-panel form-tab-panel--md erp-master-panel" data-tab-panel="${tab.id}" ${hide}>
        ${tabFields.length ? renderGroupedFieldCards(tabFields, rec) : '<div class="detail-empty">Bu sekmede alan yok.</div>'}
      </div>`;
    }
    // Belge yan sekmeleri (Adres vb.): gruplu kartlar
    const bodyHtml = tabFields.length
      ? renderGroupedFieldCards(tabFields, rec)
      : '<div class="detail-empty">Bu sekmede alan yok.</div>';
    return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
      <div class="erp-doc-side-panel">
        <div class="erp-doc-side-label">${escAttr(tab.label || 'Alanlar')}</div>
        ${bodyHtml}
      </div>
    </div>`;
  }).join('');

  state.formRecord = rec;
  bindNumeratorFieldListener(screen);
  bindPasswordFieldPersist();
  bindCascadeLookups(screen);
  enableDetailTableColumnResize(screen);
  if (screen.kullaniciYetkiPaneli) {
    bindYetkiGridEvents();
    bindFirmaYetkiEvents();
    bindAvatarEvents();
  }
}

/** Detay tablolarında sütun genişliğini sürükleyerek ayarla (localStorage’da saklanır). */
function detailColWidthStorageKey(screen, gridKey) {
  const sid = screen?.id || screen?.screenId || 'form';
  return `ktb_detail_col_widths:${sid}:${gridKey || 'default'}`;
}

function readStoredDetailColWidths(screen, gridKey) {
  try {
    const raw = localStorage.getItem(detailColWidthStorageKey(screen, gridKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredDetailColWidths(screen, gridKey, widths) {
  try {
    localStorage.setItem(detailColWidthStorageKey(screen, gridKey), JSON.stringify(widths));
  } catch { /* ignore quota */ }
}

function syncStickyDetailOffsets(table) {
  if (!table) return;
  const actsTh = table.querySelector('thead th.col-acts');
  const seqTh = table.querySelector('thead th.col-seq');
  if (!actsTh || !seqTh) return;
  const actsW = Math.round(actsTh.getBoundingClientRect().width);
  table.querySelectorAll('th.col-seq, td.col-seq').forEach((el) => {
    el.style.left = `${actsW}px`;
  });
}

function enableDetailTableColumnResize(screen) {
  const root = document.getElementById('viewForm') || document;
  root.querySelectorAll('.detail-table-wrap .detail-table').forEach((table) => {
    if (table.dataset.colResizeBound === '1') return;
    table.dataset.colResizeBound = '1';
    const wrap = table.closest('.detail-table-wrap');
    const gridKey = wrap?.getAttribute('data-grid-list') || 'default';
    const stored = readStoredDetailColWidths(screen, gridKey) || {};
    const heads = [...table.querySelectorAll('thead th')];
    heads.forEach((th, colIdx) => {
      th.style.position = th.style.position || '';
      if (!th.style.position) th.style.position = 'sticky';
      const key = th.classList.contains('col-acts') ? 'acts'
        : th.classList.contains('col-seq') ? 'seq'
          : th.classList.contains('col-id') ? 'id'
            : `c${colIdx}`;
      th.dataset.colKey = key;
      if (stored[key]) {
        const w = Math.max(40, Number(stored[key]) || 0);
        if (w) {
          th.style.width = `${w}px`;
          th.style.minWidth = `${w}px`;
          th.style.maxWidth = `${w}px`;
        }
      }
      if (th.querySelector('.col-resizer')) return;
      const grip = document.createElement('span');
      grip.className = 'col-resizer';
      grip.title = 'Sütun genişliğini sürükleyerek ayarla';
      grip.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = th.getBoundingClientRect().width;
        grip.classList.add('active');
        document.body.classList.add('col-resizing');
        const onMove = (ev) => {
          const next = Math.max(40, Math.round(startW + (ev.clientX - startX)));
          th.style.width = `${next}px`;
          th.style.minWidth = `${next}px`;
          th.style.maxWidth = `${next}px`;
          if (th.classList.contains('col-acts')) syncStickyDetailOffsets(table);
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          grip.classList.remove('active');
          document.body.classList.remove('col-resizing');
          const widths = {};
          heads.forEach((h) => {
            const k = h.dataset.colKey;
            if (!k) return;
            widths[k] = Math.round(h.getBoundingClientRect().width);
          });
          writeStoredDetailColWidths(screen, gridKey, widths);
          syncStickyDetailOffsets(table);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      th.appendChild(grip);
    });
    syncStickyDetailOffsets(table);
  });
}

function readFieldValue(el, field) {
  if (!el) return undefined;
  if (field.type === 'checkbox') {
    // Pasif tikli → is_active=false
    if (field.key === 'is_active') return !el.checked;
    return el.checked;
  }
  if (field.type === 'number') return el.value === '' ? null : Number(el.value);
  if (field.type === 'lookup' && (field.valueKey === 'id' || /_id$/.test(field.key))) {
    return el.value === '' ? null : (Number.isNaN(Number(el.value)) ? el.value : Number(el.value));
  }
  return el.value;
}

function resolveGridTab(screen, key) {
  for (const t of screen.formTabs || []) {
    if (t.kind === 'grid' && t.key === key) return t;
    if (t.kind === 'master-grid' && (t.grid?.key || t.key) === key) {
      return {
        kind: 'grid',
        key: t.grid?.key || t.key || '_detail',
        slots: t.grid?.slots,
        fields: t.grid?.fields || t.detailFields || [],
      };
    }
  }
  return null;
}

function collectTabFields(screen) {
  const fields = [];
  (screen.formTabs || []).forEach((tab) => {
    if (tab.kind === 'fields') fields.push(...(tab.fields || []));
    if (tab.kind === 'bom-workspace' || tab.kind === 'rota-workspace') {
      fields.push(...(tab.headerFields || []));
    }
    if (tab.kind === 'master-detail' || tab.kind === 'master-grid') {
      fields.push(...(tab.masterFields || []));
      if (tab.kind === 'master-detail') fields.push(...(tab.detailFields || []));
    }
  });
  return fields;
}

/** Radio ise işaretli olanı tercih et (segment S/H, Haric/Dahil vb.). */
function findAttrControl(attrName, key, root = document, extraSel = '') {
  if (!attrName || key == null) return null;
  const q = `[${attrName}="${key}"]${extraSel || ''}`;
  const radios = root.querySelectorAll(`input[type="radio"]${q}`);
  if (radios.length) return [...radios].find((r) => r.checked) || radios[0];
  return root.querySelector(q);
}

function findFieldControlEl(attrName, key) {
  return findAttrControl(attrName, key, document);
}

/** Form kontrolünden değer oku; unchecked radio’yu yok say. */
function controlDomValue(el) {
  if (!el) return undefined;
  if (el.type === 'radio') return el.checked ? el.value : undefined;
  if (el.type === 'checkbox') return el.checked;
  return el.value;
}

function assignControlInto(ctx, key, el) {
  if (!key || !el) return;
  if (el.type === 'radio' && !el.checked) return;
  ctx[key] = controlDomValue(el);
}

function readMasterFromForm(screen) {
  const out = { ...(state.formRecord || {}) };
  collectTabFields(screen).forEach((f) => {
    const el = findFieldControlEl('data-master', f.key);
    if (!el) return;
    // Şifre alanı render'da her zaman value="" basılır; boş DOM, formRecord'daki
    // (veya input sırasında saklanan) değeri silmesin — aksi halde kayıt şifresiz gider.
    if (f.type === 'password') {
      const v = String(el.value || '').trim();
      if (v) out[f.key] = v;
      else if (!out[f.key]) delete out[f.key];
      return;
    }
    out[f.key] = readFieldValue(el, f);
  });
  return out;
}

/** Şifre yazıldıkça formRecord'a yaz — yeniden çizimde input temizlense bile kayıtta kalsın. */
function bindPasswordFieldPersist() {
  document.querySelectorAll('input[type="password"][data-master]').forEach((el) => {
    if (el.dataset.pwBound) return;
    el.dataset.pwBound = '1';
    const key = el.getAttribute('data-master');
    if (!key) return;
    el.addEventListener('input', () => {
      if (!state.formRecord) state.formRecord = {};
      const v = String(el.value || '').trim();
      if (v) state.formRecord[key] = v;
      else delete state.formRecord[key];
    });
  });
}

/** Ekrandaki tüm lookup alan tanımlarını topla (master + grid + rota bileşen) */
function collectLookupFieldDefs(screen) {
  const out = [];
  const push = (arr) => { (arr || []).forEach((f) => { if (f?.type === 'lookup' && f.key) out.push(f); }); };
  push(screen.masterFields);
  push(screen.detailFields);
  (screen.formTabs || []).forEach((tab) => {
    push(tab.fields);
    push(tab.headerFields);
    push(tab.masterFields);
    push(tab.detailFields);
    push(tab.grid?.fields);
    push(tab.componentFields);
    push(tab.equipmentFields);
  });
  return out;
}

function findFieldDefByKey(screen, key) {
  return collectLookupFieldDefs(screen).find((f) => f.key === key)
    || (TANIM_LOOKUP_BY_KEY[key] ? applyTanimLookup({ key, label: key }) : null);
}

/** Lookup / select popup: tablo kolonları */
const LOOKUP_BROWSER_COLUMNS = {
  items: [
    { key: 'item_code', label: 'Stok kodu', mono: true },
    { key: 'item_name', label: 'Stok adı' },
    { key: 'uom_code', label: 'Birim' },
    { key: 'item_type', label: 'Tip' },
  ],
  'items-mamul': [
    { key: 'item_code', label: 'Stok kodu', mono: true },
    { key: 'item_name', label: 'Stok adı' },
    { key: 'uom_code', label: 'Birim' },
    { key: 'item_type', label: 'Tip' },
  ],
  partners: [
    { key: 'partner_code', label: 'Cari kodu', mono: true },
    { key: 'partner_name', label: 'Cari adı' },
    { key: 'partner_type', label: 'Tür' },
  ],
  'partners-musteri': [
    { key: 'partner_code', label: 'Cari kodu', mono: true },
    { key: 'partner_name', label: 'Cari adı' },
    { key: 'partner_type', label: 'Tür' },
  ],
  'partners-tedarikci': [
    { key: 'partner_code', label: 'Cari kodu', mono: true },
    { key: 'partner_name', label: 'Cari adı' },
    { key: 'partner_type', label: 'Tür' },
  ],
  companies: [
    { key: 'company_code', label: 'Firma kodu', mono: true },
    { key: 'company_name', label: 'Firma adı' },
  ],
  'is-yerleri': [
    { key: 'plant_code', label: 'İş yeri kodu', mono: true },
    { key: 'plant_name', label: 'İş yeri adı' },
  ],
  warehouses: [
    { key: 'warehouse_code', label: 'Depo kodu', mono: true },
    { key: 'warehouse_name', label: 'Depo adı' },
  ],
  'olcu-birimleri': [
    { key: 'uom_code', label: 'Birim kodu', mono: true },
    { key: 'uom_name', label: 'Birim adı' },
  ],
  'hr-izin-turleri': [
    { key: 'leave_code', label: 'Kod', mono: true },
    { key: 'leave_name', label: 'Ad' },
    { key: 'is_paid', label: 'Ücretli' },
    { key: 'accrual_method', label: 'Hak ediş' },
  ],
  'hr-personel': [
    { key: 'employee_no', label: 'Sicil', mono: true },
    { key: 'first_name', label: 'Ad' },
    { key: 'last_name', label: 'Soyad' },
    { key: 'department_name', label: 'Departman' },
  ],
  'hr-departmanlar': [
    { key: 'department_code', label: 'Kod', mono: true },
    { key: 'department_name', label: 'Ad' },
  ],
  'hr-pozisyonlar': [
    { key: 'position_code', label: 'Kod', mono: true },
    { key: 'position_name', label: 'Ad' },
  ],
  'hr-vardiyalar': [
    { key: 'shift_code', label: 'Kod', mono: true },
    { key: 'shift_name', label: 'Ad' },
  ],
  'hr-calisma-takvimleri': [
    { key: 'calendar_code', label: 'Kod', mono: true },
    { key: 'calendar_name', label: 'Ad' },
  ],
  'hr-cikis-nedenleri': [
    { key: 'reason_code', label: 'Kod', mono: true },
    { key: 'reason_name', label: 'Ad' },
  ],
  'hr-bordro-donemleri': [
    { key: 'period_code', label: 'Dönem', mono: true },
    { key: 'year_no', label: 'Yıl' },
    { key: 'month_no', label: 'Ay' },
  ],
  'hr-is-ilanlari': [
    { key: 'requisition_no', label: 'No', mono: true },
    { key: 'title', label: 'Başlık' },
  ],
  countries: [
    { key: 'country_code', label: 'Ülke kodu', mono: true },
    { key: 'country_name', label: 'Ülke adı' },
  ],
  cities: [
    { key: 'city_code', label: 'Şehir kodu', mono: true },
    { key: 'city_name', label: 'Şehir adı' },
  ],
  districts: [
    { key: 'district_code', label: 'İlçe kodu', mono: true },
    { key: 'district_name', label: 'İlçe adı' },
  ],
  'para-birimleri': [
    { key: 'currency_code', label: 'PB', mono: true },
    { key: 'currency_name', label: 'Para birimi' },
  ],
  'urun-agaclari': [
    { key: 'bom_code', label: 'Ü.A. no', mono: true },
    { key: 'alt_no', label: 'Alt', mono: true },
    { key: 'item_code', label: 'Malzeme', mono: true },
    { key: 'bom_name', label: 'Açıklama' },
    { key: 'category', label: 'Kategori' },
    { key: 'bom_status', label: 'Statü' },
  ],
  routings: [
    { key: 'route_code', label: 'Rota kodu', mono: true },
    { key: 'route_name', label: 'Rota adı' },
  ],
  'is-merkezleri': [
    { key: 'center_code', label: 'Merkez kodu', mono: true },
    { key: 'center_name', label: 'Merkez adı' },
  ],
  'is-istasyonlari': [
    { key: 'station_code', label: 'İstasyon kodu', mono: true },
    { key: 'station_name', label: 'İstasyon adı' },
    { key: 'center_code', label: 'Merkez', mono: true },
    { key: 'center_name', label: 'Merkez adı' },
  ],
  'rota-sablonlari': [
    { key: 'route_code', label: 'Şablon kodu', mono: true },
    { key: 'route_name', label: 'Şablon adı' },
    { key: 'item_code', label: 'Stok', mono: true },
    { key: 'alt_no', label: 'Alt', mono: true },
  ],
  sales_orders: [
    { key: 'order_no', label: 'Sipariş no', mono: true },
  ],
  'uretim-emri-tipleri': [
    { key: 'type_code', label: 'Tip kodu', mono: true },
    { key: 'type_name', label: 'Tip adı' },
  ],
  ekranlar: [
    { key: 'screen_code', label: 'Ekran kodu', mono: true },
    { key: 'screen_name', label: 'Ekran adı' },
    { key: 'module_title', label: 'Modül' },
    { key: 'tech_id', label: 'Tech ID', mono: true },
  ],
  screens: [
    { key: 'screen_code', label: 'Ekran kodu', mono: true },
    { key: 'screen_name', label: 'Ekran adı' },
    { key: 'module_title', label: 'Modül' },
    { key: 'tech_id', label: 'Tech ID', mono: true },
  ],
};

function lookupBrowserColumnsFor(field) {
  if (field?.lookup && LOOKUP_BROWSER_COLUMNS[field.lookup]) {
    return LOOKUP_BROWSER_COLUMNS[field.lookup].map((c) => ({ ...c }));
  }
  const cols = [];
  if (field?.codeKey) cols.push({ key: field.codeKey, label: 'Kod', mono: true });
  if (field?.labelKey) cols.push({ key: field.labelKey, label: 'Ad' });
  if (!cols.length && field?.valueKey) cols.push({ key: field.valueKey, label: 'Değer' });
  if (!cols.length && Array.isArray(field?.options)) {
    return [{ key: '_opt', label: 'Seçenek' }];
  }
  return cols.length ? cols : [{ key: 'id', label: 'Id' }];
}

function warehouseIdFromCtx(ctx) {
  const keys = [
    'warehouse_id', 'component_warehouse_id', 'source_warehouse_id',
    'fg_warehouse_id', 'target_warehouse_id', 'wip_warehouse_id',
    'varsayilan_cikis_warehouse_id', 'varsayilan_giris_warehouse_id',
  ];
  for (const k of keys) {
    const v = ctx?.[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return null;
}

let _lookupBrowserState = null;
let _lookupBrowserFocusBound = false;

/** Lookup anahtarı → kaynak ekran (CRUD popup için) */
const LOOKUP_TO_SCREEN = {
  items: 'stok-karti',
  'items-mamul': 'stok-karti',
  'stok-depo': 'stok-depo',
  'stok-partileri': 'stok-partileri',
  partners: 'cari-kartlari',
  'partners-musteri': 'cari-kartlari',
  'partners-tedarikci': 'cari-kartlari',
  companies: 'companies',
  'is-yerleri': 'is-yerleri',
  warehouses: 'warehouses',
  'olcu-birimleri': 'olcu-birimleri',
  countries: 'country-tanimi',
  cities: 'sehir-tanimi',
  districts: 'district-tanimi',
  'para-birimleri': 'para-birimi-tanimi',
  'odeme-kosullari': 'odeme-kosulu-tanimi',
  'teslimat-kosullari': 'teslimat-kosulu-tanimi',
  languages: 'dil-tanimi',
  banks: 'banka-tanimi',
  'doviz-kurlari': 'doviz-exchange_rate-tanimi',
  'kategoriler-abc': 'kategori-tanimi',
  'kategoriler-marka': 'kategori-tanimi',
  'kategoriler-temin': 'kategori-tanimi',
  'kategoriler-sektor': 'kategori-tanimi',
  'kategoriler-region': 'kategori-tanimi',
  'urun-agaclari': 'urun-agaci',
  routings: 'routings',
  'rota-sablonlari': 'routings',
  'is-merkezleri': 'is-merkezleri',
  'is-istasyonlari': 'is-istasyonlari',
  'uretim-emri-tipleri': 'uretim-emri-tipleri',
  'uretim-emirleri': 'uretim-emirleri',
  'uretim-planlari': 'uretim-planlari',
  'satin-alma-talepleri': 'satin-alma-talepleri',
  'satin-alma-teklifleri': 'satin-alma-teklifleri',
  'satin-alma-siparisleri': 'satin-alma-siparisleri',
  'tedarikci-irsaliyeleri': 'tedarikci-irsaliyeleri',
  'mal-kabuller': 'mal-kabuller',
  'satis-teklifleri': 'satis-teklifleri',
  sales_orders: 'satis-siparisleri',
  'sevk-emirleri': 'sevk-emirleri',
  delivery_notes: 'irsaliye-yonetimi',
  'irsaliye-yonetimi': 'irsaliye-yonetimi',
  'alis-faturalari': 'fatura-yonetimi',
  'satis-faturalari': 'fatura-yonetimi',
  'fatura-yonetimi': 'fatura-yonetimi',
  users: 'kullanicilar',
  'kullanici-gruplari': 'kullanici-gruplari',
  'hareket-kodlari': 'hareket-kodlari',
  'hareket-kodlari-teklif': 'hareket-kodlari',
  'hareket-kodlari-siparis': 'hareket-kodlari',
  'hareket-kodlari-sevk': 'hareket-kodlari',
  'hareket-kodlari-irsaliye': 'hareket-kodlari',
  'hareket-kodlari-fatura': 'hareket-kodlari',
  'hareket-kodlari-stok': 'hareket-kodlari',
  'crm-adaylar': 'crm-adaylar',
  'crm-firsatlar': 'crm-firsatlar',
  'crm-kontaklar': 'crm-kontaklar',
  'crm-firsat-asamalari': 'crm-firsat-asamalari',
  'crm-faaliyet-tipleri': 'crm-faaliyet-tipleri',
  'kk-kontrol-planlari': 'kk-kontrol-planlari',
  'kk-ret-nedenleri': 'kk-ret-nedenleri',
  'fiyat-listeleri': 'fiyat-listeleri',
  'muhasebe-hesaplari': 'muhasebe-hesaplari',
  'onay-rolleri': 'onay-rolleri',
  'onay-rotalari': 'onay-rota-tanim',
  'onay-rota-tanim': 'onay-rota-tanim',
  'onay-message-template': 'onay-message-template',
  'onay-message-sablonlari': 'onay-message-template',
  'hr-personel': 'hr-personel',
  'hr-departmanlar': 'hr-departmanlar',
  'hr-pozisyonlar': 'hr-pozisyonlar',
  'hr-calisma-takvimleri': 'hr-calisma-takvimleri',
  'hr-vardiyalar': 'hr-vardiyalar',
  'hr-resmi-tatiller': 'hr-resmi-tatiller',
  'hr-izin-turleri': 'hr-izin-turleri',
  'hr-izin-talepleri': 'hr-izin-talepleri',
  'hr-bordro-donemleri': 'hr-bordro-donemleri',
  'hr-bordro-parametreleri': 'hr-bordro-parametreleri',
  'hr-is-ilanlari': 'hr-is-ilanlari',
  'hr-adaylar': 'hr-adaylar',
  'hr-cikis-nedenleri': 'hr-cikis-nedenleri',
  'belge-tipleri': 'belge-tipleri',
  'finans-vergi-kodlari': 'finans-vergi-kodlari',
  'finans-ulke-paketleri': 'finans-ulke-paketleri',
  'mali-yillar': 'mali-yillar',
  'muhasebe-donemleri': 'muhasebe-donemleri',
};

function screenForLookupKey(lookupKey) {
  if (!lookupKey) return null;
  const mapped = LOOKUP_TO_SCREEN[lookupKey];
  if (mapped) return findScreen(mapped);
  const byId = findScreen(lookupKey);
  if (byId) return byId;
  const ep = LOOKUP_ENDPOINTS[lookupKey];
  if (!ep) return null;
  const path = String(ep).split('?')[0];
  const hit = ALL_SCREENS.find((s) => {
    const base = typeof screenApiBase === 'function'
      ? screenApiBase(s.endpoint || '')
      : String(s.endpoint || '').split('?')[0];
    return base && (path === base || path.startsWith(`${base}/`));
  });
  return hit ? findScreen(hit.id) : null;
}

function closeLookupBrowser() {
  const dlg = $('#lookupBrowserDialog');
  if (dlg) dlg.hidden = true;
  _lookupBrowserState = null;
  const selBtn = $('#lookupBrowserSelect');
  if (selBtn) selBtn.disabled = true;
}

function resolveSelectFieldDef(sel) {
  const screen = findScreen(state.screenId);
  const filterKey = sel.getAttribute('data-filter-a');
  if (filterKey && screen) {
    const ff = (screen.filters || []).find((f) => f.key === filterKey);
    if (ff) return applyTanimLookup({ ...ff });
  }
  const key = sel.getAttribute('data-master')
    || sel.getAttribute('data-detail')
    || sel.getAttribute('data-bom-field')
    || sel.getAttribute('data-flow-field')
    || sel.getAttribute('data-flow-comp-field')
    || sel.getAttribute('data-flow-equip-field');
  if (key && screen) {
    if (key === '_sablon_rota_id') {
      return {
        key: '_sablon_rota_id',
        label: 'Şablon rota',
        type: 'lookup',
        lookup: 'rota-sablonlari',
        valueKey: 'id',
        labelKey: 'route_name',
        codeKey: 'route_code',
      };
    }
    const hit = findFieldDefByKey(screen, key)
      || collectScreenFormFields(screen).find((f) => f.key === key);
    if (hit) return hit;
  }
  // Statik option select — sanal alan
  const opts = [...sel.options].filter((o) => o.value !== '');
  return {
    key: key || filterKey || 'secim',
    label: sel.closest('.field')?.querySelector('label')?.textContent?.replace(/^\*/, '').trim() || 'Seçim',
    type: 'select',
    options: opts.map((o) => o.value),
    valueKey: '_opt',
    labelKey: '_opt',
  };
}

async function enrichLookupRowsWithQty(field, rows, ctx) {
  const isStok = field?.lookup === 'items' || field?.lookup === 'items-mamul';
  if (!isStok) return { rows, qtyCol: null };
  const wh = warehouseIdFromCtx(ctx || {});
  if (!wh) return { rows, qtyCol: null };
  try {
    const bak = await api(`/stok-bakiyeleri?warehouse_id=${encodeURIComponent(wh)}&yalnizca_stokta=0`);
    const map = new Map((Array.isArray(bak) ? bak : []).map((b) => [String(b.item_id), b]));
    const enriched = rows.map((r) => {
      const b = map.get(String(r.id));
      const qty = b == null ? '' : (b.kullanilabilir != null ? b.kullanilabilir : b.bakiye);
      return { ...r, _depo_miktar: qty };
    });
    return { rows: enriched, qtyCol: { key: '_depo_miktar', label: 'Miktar', num: true } };
  } catch (_) {
    return { rows, qtyCol: null };
  }
}

function lookupBrowserRowValue(row, valueKey) {
  if (!row) return '';
  if (row._opt != null) return row._opt;
  return row[valueKey];
}

function renderLookupBrowserTable(rows, cols, selectedVal, valueKey) {
  if (!rows.length) {
    return '<div class="lookup-browser-empty">Kayıt bulunamadı.</div>';
  }
  const head = cols.map((c) => `<th class="${c.mono ? 'mono' : ''}${c.num ? ' num' : ''}">${escAttr(c.label)}</th>`).join('');
  const body = rows.map((r, idx) => {
    const val = lookupBrowserRowValue(r, valueKey);
    const sel = String(val) === String(selectedVal) ? ' is-selected' : '';
    const rid = r.id != null ? String(r.id) : '';
    const cells = cols.map((c) => {
      let raw = r[c.key];
      if (c.key === '_opt') raw = r._opt;
      if (raw == null || raw === '') raw = '—';
      if (c.num && raw !== '—' && !Number.isNaN(Number(raw))) {
        raw = Number(raw).toLocaleString('tr-TR', { maximumFractionDigits: 4 });
      }
      return `<td class="${c.mono ? 'mono' : ''}${c.num ? ' num' : ''}">${escAttr(String(raw))}</td>`;
    }).join('');
    return `<tr class="lookup-browser-row${sel}" data-lookup-val="${escAttr(val)}" data-lookup-id="${escAttr(rid)}" data-lookup-idx="${idx}" tabindex="0">${cells}</tr>`;
  }).join('');
  return `<div class="lookup-browser-table-wrap"><table class="lookup-browser-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function filterLookupBrowserRows(rows, cols, q) {
  // Arka plan: yazılan metin LIKE %metin% olarak uygulanır
  const needle = normalizeLikeNeedle(q);
  if (!needle) return rows;
  return rows.filter((r) => cols.some((c) => {
    const v = c.key === '_opt' ? r._opt : r[c.key];
    return likeIncludes(v, needle);
  }));
}

function updateLookupBrowserActionButtons() {
  const st = _lookupBrowserState;
  const bar = $('#lookupBrowserActions');
  const selBtn = $('#lookupBrowserSelect');
  if (!st) {
    if (bar) bar.hidden = true;
    if (selBtn) selBtn.disabled = true;
    return;
  }
  const screen = st.targetScreen;
  const canCrud = Boolean(screen && screen.crud !== false && !screen.readOnly && !screen.hideActions);
  if (bar) {
    bar.hidden = !canCrud;
    if (canCrud) {
      const hasId = st.selectedRow?.id != null && st.selectedRow?.id !== '';
      bar.querySelectorAll('[data-lb-act]').forEach((btn) => {
        const act = btn.getAttribute('data-lb-act');
        if (act === 'yeni') {
          btn.disabled = !ekranYetkisi(screen.id, 'yeni');
        } else if (act === 'sil') {
          btn.disabled = !hasId || !ekranYetkisi(screen.id, 'sil');
        } else {
          btn.disabled = !hasId || !ekranYetkisi(screen.id, act);
        }
      });
    }
  }
  if (selBtn) {
    const hasPick = st.selectedVal != null && String(st.selectedVal) !== '';
    selBtn.disabled = !hasPick;
  }
}

function paintLookupBrowser() {
  const st = _lookupBrowserState;
  if (!st) return;
  const body = $('#lookupBrowserBody');
  const search = $('#lookupBrowserSearch');
  const count = $('#lookupBrowserCount');
  if (!body) return;
  const filtered = filterLookupBrowserRows(st.allRows, st.cols, search?.value || '');
  st.filteredRows = filtered;
  if (count) count.textContent = `${filtered.length} kayıt`;
  body.innerHTML = renderLookupBrowserTable(
    filtered,
    st.cols,
    st.selectedVal,
    st.valueKey,
  );
  updateLookupBrowserActionButtons();
}

function setLookupBrowserSelection(val, row) {
  const st = _lookupBrowserState;
  if (!st) return;
  st.selectedVal = val != null ? String(val) : '';
  st.selectedRow = row || st.allRows.find((r) => String(lookupBrowserRowValue(r, st.valueKey)) === String(val)) || null;
  paintLookupBrowser();
}

async function reloadLookupBrowserRows() {
  const st = _lookupBrowserState;
  if (!st?.sel) return;
  const field = st.field;
  const { ctx } = cascadeScopeContext(st.sel);
  let rows = [];
  if (field.type === 'lookup' && field.lookup) {
    invalidateLookups(field.lookup);
    await fetchLookupKey(field.lookup);
    rows = lookupRowsForField(field, ctx);
    // Formdaki select seçeneklerini de taze tut
    const html = buildLookupOptionsHtml(field, st.sel.value, rows);
    st.sel.innerHTML = html;
  } else if (Array.isArray(field.options) && field.options.length) {
    rows = field.options.map((o) => ({ _opt: o }));
  } else {
    rows = [...st.sel.options]
      .filter((o) => o.value !== '')
      .map((o) => ({ _opt: o.value, _label: o.textContent }));
  }
  let cols = lookupBrowserColumnsFor(field);
  if (st.valueKey === '_opt' && cols[0]?.key === '_opt') {
    cols = [{ key: '_opt', label: field.label || 'Seçenek' }];
  }
  const enriched = await enrichLookupRowsWithQty(field, rows, ctx);
  st.allRows = enriched.rows;
  st.cols = enriched.qtyCol ? cols.concat([enriched.qtyCol]) : cols;
  if (st.selectedVal) {
    st.selectedRow = st.allRows.find((r) => String(lookupBrowserRowValue(r, st.valueKey)) === String(st.selectedVal)) || null;
  }
  paintLookupBrowser();
}

async function openLookupBrowserForSelect(sel) {
  if (!sel || sel.disabled) return;
  const field = resolveSelectFieldDef(sel);
  const { ctx } = cascadeScopeContext(sel);
  let rows = [];
  let valueKey = field.valueKey || 'id';

  if (field.type === 'lookup' && field.lookup) {
    await fetchLookupKey(field.lookup);
    rows = lookupRowsForField(field, ctx);
    valueKey = field.valueKey || 'id';
  } else if (Array.isArray(field.options) && field.options.length) {
    rows = field.options.map((o) => ({ _opt: o }));
    valueKey = '_opt';
  } else {
    rows = [...sel.options]
      .filter((o) => o.value !== '')
      .map((o) => ({ _opt: o.value, _label: o.textContent }));
    valueKey = '_opt';
  }

  let cols = lookupBrowserColumnsFor(field);
  if (valueKey === '_opt' && cols[0]?.key === '_opt') {
    cols = [{ key: '_opt', label: field.label || 'Seçenek' }];
  }
  const enriched = await enrichLookupRowsWithQty(field, rows, ctx);
  rows = enriched.rows;
  if (enriched.qtyCol) cols = cols.concat([enriched.qtyCol]);

  const targetScreen = field.lookup ? screenForLookupKey(field.lookup) : null;
  const initialVal = sel.value || '';
  const initialRow = rows.find((r) => String(lookupBrowserRowValue(r, valueKey)) === String(initialVal)) || null;

  _lookupBrowserState = {
    sel,
    field,
    valueKey,
    cols,
    allRows: rows,
    filteredRows: rows,
    selectedVal: initialVal,
    selectedRow: initialRow,
    targetScreen,
  };

  const dlg = $('#lookupBrowserDialog');
  const title = $('#lookupBrowserTitle');
  const search = $('#lookupBrowserSearch');
  if (!dlg) return;
  const screenTitle = targetScreen?.title || field.label || 'Kayıt';
  if (title) title.textContent = `${screenTitle}`;
  // Typeahead’teki metni arama kutusuna taşı (LIKE %…%)
  const typed = sel.closest('.lookup-widget')?.querySelector('.lookup-typeahead')?.value || '';
  if (search) {
    search.value = typed.trim();
    search.placeholder = 'Ara — LIKE %metin% …';
  }
  paintLookupBrowser();
  dlg.hidden = false;
  search?.focus();
  if (search && !search.dataset.bound) {
    search.dataset.bound = '1';
    search.addEventListener('input', () => {
      if (_lookupBrowserState) paintLookupBrowser();
    });
  }
  if (!_lookupBrowserFocusBound) {
    _lookupBrowserFocusBound = true;
    window.addEventListener('focus', () => {
      if (!_lookupBrowserState) return;
      const d = $('#lookupBrowserDialog');
      if (!d || d.hidden) return;
      // Yeni/Düzelt sekmesinden dönünce listeyi yenile
      reloadLookupBrowserRows().catch(() => {});
    });
  }
}

function applyLookupBrowserValue(val) {
  const st = _lookupBrowserState;
  if (!st?.sel) return;
  const sel = st.sel;
  const str = String(val ?? '');
  if (str && st.field?.type === 'lookup' && st.field.lookup) {
    // seçenek listesini taze satırlarla doldur
    const rows = st.allRows || [];
    sel.innerHTML = buildLookupOptionsHtml(st.field, str, rows);
  } else if (str && ![...sel.options].some((o) => String(o.value) === str)) {
    const opt = document.createElement('option');
    opt.value = str;
    const row = st.selectedRow;
    const title = row?._label
      || (st.field?.codeKey && row?.[st.field.codeKey]
        ? `${row[st.field.codeKey]} — ${row[st.field.labelKey] || ''}`
        : null)
      || row?.[st.field?.labelKey]
      || str;
    opt.textContent = title;
    opt.setAttribute('title', title);
    sel.appendChild(opt);
  }
  sel.value = str;
  syncLookupTypeaheadFromSelect(sel);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  closeLookupBrowser();
  const ta = sel.closest('.lookup-widget')?.querySelector('.lookup-typeahead');
  (ta || sel).focus();
}

async function lookupBrowserCrudAction(act) {
  const st = _lookupBrowserState;
  if (!st) return;
  const screen = st.targetScreen;
  if (!screen) {
    toast('Bu alan için bağlı ekran yok.');
    return;
  }
  if (act === 'yeni') {
    openFormInNewBrowserTab(screen, 'yeni');
    return;
  }
  const row = st.selectedRow;
  const rowId = row?.id;
  if (rowId == null || rowId === '') {
    toast('Önce listeden bir kayıt seçin.');
    return;
  }
  if (act === 'incele' || act === 'duzelt' || act === 'kopyala') {
    openFormInNewBrowserTab(screen, act, { rowId });
    return;
  }
  if (act === 'sil') {
    if (!ekranYetkisi(screen.id, 'sil')) {
      toast('Bu ekranda silme yetkiniz yok.');
      return;
    }
    if (screen.id === 'numarator-tanimi') {
      toast('Numaratör silinmez; pasife alın.');
      return;
    }
    const label = row[screen.codeField] || row[st.field?.codeKey] || rowId;
    if (!confirm(`${label} silinsin mi?`)) return;
    try {
      await api(`${screenApiBase(screen.endpoint)}/${rowId}`, { method: 'DELETE' });
      toast('Silindi.');
      if (String(st.selectedVal) === String(lookupBrowserRowValue(row, st.valueKey))) {
        st.selectedVal = '';
        st.selectedRow = null;
        if (st.sel) {
          st.sel.value = '';
          st.sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      await reloadLookupBrowserRows();
    } catch (err) {
      toast(err.message || String(err));
    }
  }
}

function closeLookupSuggest(widget) {
  const box = widget?.querySelector('.lookup-suggest');
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
}

function paintLookupSuggest(widget, sel, needle) {
  const box = widget?.querySelector('.lookup-suggest');
  if (!box || !sel) return;
  const n = normalizeLikeNeedle(needle);
  const opts = [...sel.options].filter((o) => o.value !== '');
  const matches = n
    ? opts.filter((o) => likeIncludes(o.getAttribute('title') || o.textContent, n)
      || likeIncludes(o.value, n))
    : opts.slice(0, 40);
  const limited = matches.slice(0, 40);
  if (!limited.length) {
    box.innerHTML = `<div class="lookup-suggest-empty">Eşleşme yok (LIKE %${escAttr(n || '')}% )</div>`;
    box.hidden = false;
    return;
  }
  box.innerHTML = limited.map((o) => {
    const label = o.getAttribute('title') || o.textContent || o.value;
    return `<button type="button" class="lookup-suggest-item" role="option" data-lookup-pick="${escAttr(o.value)}" title="${escAttr(label)}">${escAttr(label)}</button>`;
  }).join('');
  box.hidden = false;
}

function applyLookupTypeaheadPick(widget, val) {
  const sel = widget?.querySelector('select.lookup-pick, select.lookup-select, select[data-filter-a]');
  if (!sel) return;
  const str = String(val ?? '');
  if (str && ![...sel.options].some((o) => String(o.value) === str)) return;
  sel.value = str;
  syncLookupTypeaheadFromSelect(sel);
  closeLookupSuggest(widget);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}

function bindLookupBrowseUi() {
  if (document.documentElement.dataset.lookupBrowseBound === '1') return;
  document.documentElement.dataset.lookupBrowseBound = '1';

  // Manuel yazma: typeahead → LIKE %…% öneri listesi
  document.addEventListener('input', (e) => {
    const ta = e.target?.closest?.('.lookup-typeahead');
    if (!ta) return;
    const widget = ta.closest('.lookup-widget');
    const sel = widget?.querySelector('select.lookup-pick, select.lookup-select, select[data-filter-a]');
    if (!sel || sel.disabled) return;
    paintLookupSuggest(widget, sel, ta.value);
  });
  document.addEventListener('focusin', (e) => {
    const ta = e.target?.closest?.('.lookup-typeahead');
    if (!ta) return;
    const widget = ta.closest('.lookup-widget');
    const sel = widget?.querySelector('select.lookup-pick, select.lookup-select, select[data-filter-a]');
    if (!sel || sel.disabled) return;
    // Seçili değeri göster; boşsa öneri aç
    if (!ta.value) paintLookupSuggest(widget, sel, '');
  });
  document.addEventListener('keydown', (e) => {
    const ta = e.target?.closest?.('.lookup-typeahead');
    if (!ta) return;
    const widget = ta.closest('.lookup-widget');
    const box = widget?.querySelector('.lookup-suggest');
    if (e.key === 'Escape') {
      closeLookupSuggest(widget);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = box && !box.hidden ? box.querySelector('.lookup-suggest-item') : null;
      if (first) {
        applyLookupTypeaheadPick(widget, first.getAttribute('data-lookup-pick'));
        return;
      }
      // Öneri yoksa liste popup’ı aç (yazılan metin LIKE aramasına gider)
      const sel = widget?.querySelector('select.lookup-pick, select.lookup-select, select[data-filter-a]');
      if (sel) openLookupBrowserForSelect(sel).catch((err) => toast(err.message || String(err)));
      return;
    }
    if (e.key === 'ArrowDown' && (e.altKey || box?.hidden)) {
      e.preventDefault();
      const sel = widget?.querySelector('select.lookup-pick, select.lookup-select, select[data-filter-a]');
      if (sel) openLookupBrowserForSelect(sel).catch((err) => toast(err.message || String(err)));
    }
  });
  document.addEventListener('mousedown', (e) => {
    const item = e.target.closest?.('.lookup-suggest-item');
    if (item) {
      e.preventDefault();
      const widget = item.closest('.lookup-widget');
      applyLookupTypeaheadPick(widget, item.getAttribute('data-lookup-pick'));
      return;
    }
    if (!e.target.closest?.('.lookup-combobox')) {
      document.querySelectorAll('.lookup-suggest:not([hidden])').forEach((box) => {
        box.hidden = true;
        box.innerHTML = '';
      });
    }
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.lookup-browse-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      const widget = btn.closest('.lookup-widget');
      const sel = widget?.querySelector('select.lookup-pick, select.lookup-select, select[data-filter-a]');
      if (sel) openLookupBrowserForSelect(sel).catch((err) => toast(err.message || String(err)));
      return;
    }

    const dlg = $('#lookupBrowserDialog');
    if (!dlg || dlg.hidden) return;

    const actBtn = e.target.closest?.('#lookupBrowserActions [data-lb-act]');
    if (actBtn && !actBtn.disabled) {
      e.preventDefault();
      lookupBrowserCrudAction(actBtn.getAttribute('data-lb-act')).catch((err) => toast(err.message || String(err)));
      return;
    }

    if (e.target.id === 'lookupBrowserSelect') {
      e.preventDefault();
      if (_lookupBrowserState?.selectedVal != null && String(_lookupBrowserState.selectedVal) !== '') {
        applyLookupBrowserValue(_lookupBrowserState.selectedVal);
      } else {
        toast('Önce listeden bir satır seçin.');
      }
      return;
    }

    const row = e.target.closest?.('.lookup-browser-row');
    if (row) {
      e.preventDefault();
      const val = row.getAttribute('data-lookup-val');
      const idx = Number(row.getAttribute('data-lookup-idx'));
      const filtered = _lookupBrowserState?.filteredRows || [];
      const hit = Number.isFinite(idx) ? filtered[idx] : null;
      setLookupBrowserSelection(val, hit);
      return;
    }

    if (e.target.id === 'lookupBrowserClose' || e.target.id === 'lookupBrowserCancel') {
      e.preventDefault();
      closeLookupBrowser();
      return;
    }
    if (e.target.id === 'lookupBrowserDialog') {
      closeLookupBrowser();
    }
  });

  // Çift tık → alana uygula (Seç)
  document.addEventListener('dblclick', (e) => {
    const dlg = $('#lookupBrowserDialog');
    if (!dlg || dlg.hidden) return;
    const row = e.target.closest?.('.lookup-browser-row');
    if (!row) return;
    e.preventDefault();
    const val = row.getAttribute('data-lookup-val');
    const idx = Number(row.getAttribute('data-lookup-idx'));
    const filtered = _lookupBrowserState?.filteredRows || [];
    const hit = Number.isFinite(idx) ? filtered[idx] : null;
    setLookupBrowserSelection(val, hit);
    applyLookupBrowserValue(val);
  });

  document.addEventListener('keydown', (e) => {
    const dlg = $('#lookupBrowserDialog');
    if (dlg && !dlg.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLookupBrowser();
        return;
      }
      if (e.key === 'Enter') {
        const row = e.target.closest?.('.lookup-browser-row');
        if (row) {
          e.preventDefault();
          const val = row.getAttribute('data-lookup-val');
          applyLookupBrowserValue(val);
          return;
        }
        if (_lookupBrowserState?.selectedVal && document.activeElement?.id === 'lookupBrowserSearch') {
          e.preventDefault();
          applyLookupBrowserValue(_lookupBrowserState.selectedVal);
        }
      }
      return;
    }
  });

  // Select’e tıklayınca native liste açılmasın; odaklansın. ↓ / Alt+↓ / Space native açar.
  document.addEventListener('mousedown', (e) => {
    const sel = e.target.closest?.('select.lookup-pick');
    if (!sel || sel.disabled) return;
    if (e.target.closest?.('.lookup-browse-btn')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    sel.focus();
  }, true);
}

function cascadeScopeContext(el) {
  const didx = el.getAttribute('data-didx');
  const grid = el.getAttribute('data-grid');
  if (didx != null && grid) {
    const ctx = {};
    document.querySelectorAll(`[data-detail][data-didx="${didx}"][data-grid="${grid}"]`).forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-detail'), sib);
    });
    return { ctx, didx, grid, isDetail: true };
  }
  if (el.hasAttribute('data-bom-field')) {
    const ctx = { ...(state.formRecord || {}) };
    document.querySelectorAll('[data-bom-field]').forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-bom-field'), sib);
    });
    document.querySelectorAll('[data-master]').forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-master'), sib);
    });
    return { ctx, isDetail: false, isBomField: true };
  }
  if (el.hasAttribute('data-flow-comp-field')) {
    const ctx = { ...(state.formRecord || {}) };
    document.querySelectorAll('[data-flow-field]').forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-flow-field'), sib);
    });
    document.querySelectorAll('[data-flow-comp-field]').forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-flow-comp-field'), sib);
    });
    document.querySelectorAll('[data-master]').forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-master'), sib);
    });
    return { ctx, isDetail: false, isFlowComp: true };
  }
  if (el.hasAttribute('data-flow-field') || el.hasAttribute('data-flow-equip-field')) {
    const ctx = { ...(state.formRecord || {}) };
    document.querySelectorAll('[data-flow-field]').forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-flow-field'), sib);
    });
    document.querySelectorAll('[data-flow-equip-field]').forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-flow-equip-field'), sib);
    });
    document.querySelectorAll('[data-master]').forEach((sib) => {
      assignControlInto(ctx, sib.getAttribute('data-master'), sib);
    });
    return { ctx, isDetail: false, isFlowField: true };
  }
  const ctx = { ...(state.formRecord || {}) };
  document.querySelectorAll('[data-master]').forEach((sib) => {
    assignControlInto(ctx, sib.getAttribute('data-master'), sib);
  });
  return { ctx, isDetail: false };
}

function refreshLookupSelect(el, field, ctx) {
  if (!el || !field) return;
  const rows = lookupRowsForField(field, ctx);
  const prev = el.value;
  el.innerHTML = buildLookupOptionsHtml(field, prev, rows);
  // Önceki değer filtrelenmiş listede yoksa temizle
  const stillValid = rows.some((r) => lookupOptionSelected(field, r, el.value));
  if (!stillValid) el.value = '';
  syncLookupTypeaheadFromSelect(el);
}

/** Bağlı alan doldurma — yeniden giriş kilidi */
let _formLinking = false;

function pickDefaultBomForItem(itemId) {
  if (itemId == null || itemId === '') return null;
  const rows = (state.lookupCache['urun-agaclari'] || [])
    .filter((r) => String(r.finished_good_item_id) === String(itemId)
      && r.is_active !== false && !r.silindi);
  if (!rows.length) {
    const any = (state.lookupCache['urun-agaclari'] || [])
      .filter((r) => String(r.finished_good_item_id) === String(itemId));
    if (!any.length) return null;
    return any.slice().sort((a, b) => Number(b.id) - Number(a.id))[0] || null;
  }
  const woDef = rows.find((r) => r.is_default_for_wo);
  if (woDef) return woDef;
  return rows.slice().sort((a, b) => {
    const aa = String(a.alt_no || '00');
    const bb = String(b.alt_no || '00');
    if (aa !== bb) return aa.localeCompare(bb, 'tr');
    return Number(b.id) - Number(a.id);
  })[0] || null;
}

function pickDefaultRouteForItem(itemId, bomId = null) {
  if (itemId == null || itemId === '') return null;
  let rows = (state.lookupCache.routings || [])
    .filter((r) => String(r.item_id) === String(itemId));
  if (!rows.length) return null;
  if (bomId != null && bomId !== '') {
    const forBom = rows.filter((r) => String(r.product_bom_id) === String(bomId));
    if (forBom.length) rows = forBom;
  }
  const def = rows.find((r) => r.varsayilan);
  if (def) return def;
  return rows.slice().sort((a, b) => Number(b.id) - Number(a.id))[0] || null;
}

function syncLookupNameRo(sel) {
  if (!(sel instanceof HTMLSelectElement)) return;
  const pair = sel.closest('.lookup-pair');
  const nameRo = pair?.querySelector('.lookup-name-ro');
  if (!nameRo) return;
  const opt = sel.selectedOptions?.[0];
  const title = opt?.getAttribute('title') || opt?.textContent || '';
  const first_name = title.includes('—') ? title.split('—').slice(1).join('—').trim() : (title || '—');
  nameRo.value = sel.value ? (first_name || '—') : '—';
}

/** Select değerini seçenek yoksa ekleyerek yazar; name-ro + formRecord günceller. */
function setLinkedSelectValue(sel, value, fieldKey) {
  if (!sel || sel.disabled) return false;
  const str = value == null || value === '' ? '' : String(value);
  if (str && ![...sel.options].some((o) => String(o.value) === str)) {
    const opt = document.createElement('option');
    opt.value = str;
    opt.textContent = str;
    sel.appendChild(opt);
  }
  if (String(sel.value) === str) {
    syncLookupNameRo(sel);
    return false;
  }
  sel.value = str;
  syncLookupNameRo(sel);
  if (sel.hasAttribute('data-master') && state.formRecord && fieldKey) {
    state.formRecord[fieldKey] = str;
  }
  return true;
}

function resolveFormLinkValue(rule, ctx) {
  const itemId = ctx.item_id || ctx.finished_good_item_id || ctx.component_item_id;
  if (rule.fromItem) {
    const st = stokLookupById(itemId);
    if (!st) return '';
    let v = st[rule.fromItem];
    if (rule.asName && rule.fromItem === 'item_name' && v) {
      // Ürün ağacı adı: «Malzeme Adı Ağacı» — kullanıcı boş bırakmışsa
      const cur = ctx.bom_name;
      if (cur && String(cur).trim()) return cur;
      return `${v} Ağacı`;
    }
    return v == null ? '' : v;
  }
  if (rule.valueFromCategory) {
    return String(ctx.category || '') === String(rule.valueFromCategory);
  }
  if (rule.pick === 'bomForItem') {
    return pickDefaultBomForItem(itemId)?.id ?? '';
  }
  if (rule.pick === 'routeForItem') {
    return pickDefaultRouteForItem(itemId, ctx.product_bom_id)?.id ?? '';
  }
  if (rule.pick === 'routeForBom') {
    return pickDefaultRouteForItem(itemId, ctx.product_bom_id || ctx[rule.bomKey || 'product_bom_id'])?.id ?? '';
  }
  if (rule.value != null) return rule.value;
  return '';
}

/** Satınalma / mal kabul gibi giriş yönlü ekranlar — varsayılan giriş deposu */
function isInboundWarehouseScreen(screen) {
  const id = String(screen?.id || '');
  return /satin-alma|mal-kabul|tedarikci-irsaliye|alis|purchase/i.test(id);
}

function findLinkedTargetEl(targetKey, { isDetail, didx, grid, isBomField, isFlowComp }) {
  if (isBomField) {
    return document.querySelector(
      `select[data-bom-field="${targetKey}"], input[data-bom-field="${targetKey}"]`
    );
  }
  if (isFlowComp) {
    return document.querySelector(
      `select[data-flow-comp-field="${targetKey}"], input[data-flow-comp-field="${targetKey}"]`
    );
  }
  if (isDetail && didx != null && grid) {
    return document.querySelector(
      `select[data-detail="${targetKey}"][data-didx="${didx}"][data-grid="${grid}"], `
      + `input[data-detail="${targetKey}"][data-didx="${didx}"][data-grid="${grid}"]`
    );
  }
  return document.querySelector(
    `select[data-master="${targetKey}"], input[data-master="${targetKey}"]`
  );
}

/**
 * Ekran formLinks + satır stok→birim/depo bağlantıları.
 * Parent değişince bağımlı alanları filtreler ve varsayılanları yazar.
 */
async function applyFormLinkages(screen, changedKey, changedEl) {
  if (_formLinking || !screen || !changedKey || !changedEl) return;
  const links = screen.formLinks?.[changedKey];
  const isDetail = changedEl.hasAttribute('data-detail');
  const isBomField = changedEl.hasAttribute('data-bom-field');
  const isFlowComp = changedEl.hasAttribute('data-flow-comp-field');
  const didx = changedEl.getAttribute('data-didx');
  const grid = changedEl.getAttribute('data-grid');
  const scope = { isDetail, didx, grid, isBomField, isFlowComp };

  const stokChanged = ['item_id', 'component_item_id', 'finished_good_item_id'].includes(changedKey);
  const whFrom = isInboundWarehouseScreen(screen)
    ? 'varsayilan_giris_warehouse_id'
    : 'varsayilan_cikis_warehouse_id';

  // Satır / BOM / rota bileşen stok → birim / açıklama (+ grid’de depo)
  const detailStokRules = (stokChanged && (isDetail || isBomField || isFlowComp))
    ? [
      { field: 'uom_code', fromItem: 'uom_code' },
      ...(isBomField ? [{ field: 'line_description', fromItem: 'item_name' }] : []),
      ...(isDetail ? [{ field: 'warehouse_id', fromItem: whFrom }] : []),
    ]
    : [];

  const rules = [...(links || []), ...detailStokRules];
  if (!rules.length) return;

  _formLinking = true;
  try {
    // BOM/rota listeleri güncel olsun
    if (['item_id', 'finished_good_item_id', 'product_bom_id', 'component_item_id'].includes(changedKey)) {
      await Promise.all([
        fetchLookupKey('urun-agaclari'),
        fetchLookupKey('routings'),
        fetchLookupKey('items'),
        fetchLookupKey('items-mamul'),
      ]);
    }

    const { ctx } = cascadeScopeContext(changedEl);
    ctx[changedKey] = changedEl.type === 'checkbox' ? changedEl.checked : changedEl.value;

    // Önce bağımlı lookup seçeneklerini yenile
    refreshDependentLookups(screen, changedEl);

    // ctx’i DOM’dan tazele (filtre sonrası)
    const fresh = cascadeScopeContext(changedEl).ctx;
    Object.assign(ctx, fresh);
    ctx[changedKey] = changedEl.type === 'checkbox' ? changedEl.checked : changedEl.value;

    const filled = [];
    for (const rule of rules) {
      const targetKey = rule.field;
      if (!targetKey) continue;
      const target = findLinkedTargetEl(targetKey, scope);
      if (!target || target.disabled) continue;

      // Parent temizlendiyse bağımlıyı da temizle (isim / kategori bayrakları hariç)
      const parentEmpty = ctx[changedKey] == null || ctx[changedKey] === '';
      if (parentEmpty && (rule.asName || rule.valueFromCategory)) continue;
      const nextVal = parentEmpty ? '' : resolveFormLinkValue(rule, ctx);

      // Lookup seçeneklerini hedef için yenile (dependsOn zinciri)
      const fieldDef = collectLookupFieldDefs(screen).find((f) => f.key === targetKey)
        || (screen.masterFields || []).find((f) => f.key === targetKey)
        || (isDetail || isBomField || isFlowComp
          ? (screen.formTabs || []).flatMap((t) => [
            ...(t.fields || []),
            ...(t.headerFields || []),
            ...(t.componentFields || []),
            ...(t.grid?.fields || []),
          ]).find((f) => f.key === targetKey)
            || (screen.detailFields || []).find((f) => f.key === targetKey)
          : (screen.formTabs || []).flatMap((t) => t.fields || []).find((f) => f.key === targetKey));
      if (target instanceof HTMLSelectElement && fieldDef?.type === 'lookup') {
        refreshLookupSelect(target, fieldDef, ctx);
      }

      const writeMaster = !isDetail && !isBomField && !isFlowComp;
      if (target instanceof HTMLSelectElement) {
        if (setLinkedSelectValue(target, nextVal, writeMaster ? targetKey : null)) {
          filled.push(targetKey);
          ctx[targetKey] = target.value;
          // Rota, ağaç seçimine göre yeniden seçilsin diye zincir
          if (targetKey === 'product_bom_id' && screen.formLinks?.product_bom_id) {
            for (const sub of screen.formLinks.product_bom_id) {
              const subEl = findLinkedTargetEl(sub.field, scope);
              if (!subEl || subEl.disabled) continue;
              const subDef = collectLookupFieldDefs(screen).find((f) => f.key === sub.field);
              if (subDef) refreshLookupSelect(subEl, subDef, ctx);
              const subVal = parentEmpty ? '' : resolveFormLinkValue(sub, ctx);
              if (setLinkedSelectValue(subEl, subVal, writeMaster ? sub.field : null)) {
                filled.push(sub.field);
                ctx[sub.field] = subEl.value;
              }
            }
          }
        }
      } else if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        const on = Boolean(nextVal);
        if (target.checked !== on) {
          target.checked = on;
          filled.push(targetKey);
          if (writeMaster && state.formRecord) state.formRecord[targetKey] = on;
        }
      } else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const str = nextVal == null || nextVal === false ? '' : String(nextVal);
        // asName: dolu adı ezme
        if (rule.asName && String(target.value || '').trim()) continue;
        if (target.value !== str) {
          target.value = str;
          filled.push(targetKey);
          if (writeMaster && state.formRecord) state.formRecord[targetKey] = str;
        }
      }
    }

    if (filled.length && stokChanged) {
      const labels = filled.map((k) => {
        if (k === 'product_bom_id') return 'ürün ağacı';
        if (k === 'route_id') return 'rota';
        if (k === 'uom_code') return 'birim';
        if (k.includes('warehouse')) return 'depo';
        return k;
      });
      const uniq = [...new Set(labels)];
      toast(`Stok bağlantısı: ${uniq.join(', ')} dolduruldu`);
    }
  } finally {
    _formLinking = false;
  }
}

/** Ülke/il / stok→ağaç / ağaç→BOM malzeme bağımlı listeleri yenile */
function refreshDependentLookups(screen, changedEl) {
  const changedKey = changedEl.getAttribute('data-master')
    || changedEl.getAttribute('data-detail')
    || changedEl.getAttribute('data-flow-field')
    || changedEl.getAttribute('data-flow-comp-field')
    || changedEl.getAttribute('data-bom-field');
  if (!changedKey) return;
  const { ctx, didx, grid, isDetail } = cascadeScopeContext(changedEl);
  ctx[changedKey] = changedEl.type === 'checkbox' ? changedEl.checked : changedEl.value;
  if (state.formRecord && changedEl.hasAttribute('data-master')) {
    state.formRecord[changedKey] = ctx[changedKey];
  }
  const defs = collectLookupFieldDefs(screen);
  const dependents = defs.filter((f) =>
    f.dependsOn === changedKey || f.filterByBomKey === changedKey);
  if (!dependents.length) return;

  dependents.forEach((dep) => {
    let els = [];
    if (isDetail) {
      const one = document.querySelector(
        `select[data-detail="${dep.key}"][data-didx="${didx}"][data-grid="${grid}"]`
      );
      if (one) els = [one];
    } else {
      // Master/başlık: yalnızca dependsOn zinciri (BOM filtreli alan master stok'u ezmesin)
      if (dep.dependsOn === changedKey) {
        const master = document.querySelector(`select[data-master="${dep.key}"]`);
        if (master) els.push(master);
      }
      // Rota akış / bileşen — BOM kapsamı burada
      document.querySelectorAll(
        `select[data-flow-field="${dep.key}"], select[data-flow-comp-field="${dep.key}"]`
      ).forEach((el) => els.push(el));
    }
    els.forEach((el) => {
      refreshLookupSelect(el, dep, ctx);
      ctx[dep.key] = el.value;
      // Zincir: ülke→il→ilçe / stok→ağaç→malzeme / merkez→istasyon
      if (el.hasAttribute('data-master') || el.hasAttribute('data-detail')
        || el.hasAttribute('data-flow-field') || el.hasAttribute('data-flow-comp-field')) {
        refreshDependentLookups(screen, el);
      }
    });
  });
}

function bindCascadeLookups(_screen) {
  const root = document.getElementById('viewForm') || document;
  if (root.dataset?.cascadeBound === '1' || document.documentElement.dataset.cascadeBound === '1') {
    return;
  }
  if (root.dataset) root.dataset.cascadeBound = '1';
  else document.documentElement.dataset.cascadeBound = '1';
  // Sarı lookup: panodan kod/first_name yapıştırınca eşleşen seçeneği bul
  root.addEventListener('paste', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLSelectElement)) return;
    if (!el.classList.contains('lookup-select') && el.getAttribute('data-master') == null
      && el.getAttribute('data-detail') == null && el.getAttribute('data-bom-field') == null
      && el.getAttribute('data-flow-field') == null && el.getAttribute('data-flow-comp-field') == null
      && el.getAttribute('data-flow-equip-field') == null) {
      return;
    }
    const text = String(e.clipboardData?.getData('text') || '').trim();
    if (!text) return;
    e.preventDefault();
    const needle = text.toLocaleLowerCase('tr');
    const opts = [...el.options];
    const hit = opts.find((o) => o.value && (
      String(o.value).toLocaleLowerCase('tr') === needle
      || String(o.text).toLocaleLowerCase('tr') === needle
      || String(o.text).toLocaleLowerCase('tr').startsWith(needle)
      || String(o.text).toLocaleLowerCase('tr').includes(needle)
    ));
    if (hit) {
      el.value = hit.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      toast(`Yapıştırıldı: ${hit.text}`);
    } else {
      toast(`Eşleşen seçenek yok: ${text}`);
    }
  });
  root.addEventListener('change', async (e) => {
    const el = e.target;
    if (!(el instanceof HTMLSelectElement) && !(el instanceof HTMLInputElement)) return;
    const scr = findScreen(state.screenId);
    if (!scr || state.formMode == null) return;

    // Kod–first_name lookup: first_name kutusunu güncelle
    if (el instanceof HTMLSelectElement && (
      el.classList.contains('lookup-select')
      || el.classList.contains('lookup-pick')
      || el.classList.contains('lookup-combo-select')
    )) {
      syncLookupTypeaheadFromSelect(el);
      const pair = el.closest('.lookup-pair');
      const nameRo = pair?.querySelector('.lookup-name-ro');
      if (nameRo) {
        const opt = el.selectedOptions?.[0];
        const title = opt?.getAttribute('title') || opt?.textContent || '';
        const first_name = title.includes('—') ? title.split('—').slice(1).join('—').trim() : (title || '—');
        nameRo.value = el.value ? (first_name || '—') : '—';
      }
    }

    // BOM satır editörü — stok seçilince birim otomatik; miktarı kullanıcı girer
    if (el.hasAttribute('data-bom-field')) {
      const bomKey = el.getAttribute('data-bom-field');
      if (!_formLinking && bomKey) {
        await applyFormLinkages(scr, bomKey, el);
      }
      return;
    }

    const masterKey = el.getAttribute('data-master');
    const detailKey = el.getAttribute('data-detail');
    const flowCompKey = el.getAttribute('data-flow-comp-field');
    const fieldKey = masterKey || detailKey || flowCompKey;

    // Barkod → stok eşleştirme (yanlış malzeme engeli)
    if (fieldKey === 'barkod' && el instanceof HTMLInputElement && el.value.trim()) {
      const kod = el.value.trim();
      try {
        const items = state.lookupCache.items || await api('/items?is_active=true');
        state.lookupCache.items = items;
        let hit = null;
        for (const s of items) {
          if (String(s.barkod || '') === kod) { hit = s; break; }
          const bars = Array.isArray(s.barkodlar) ? s.barkodlar : [];
          if (bars.some((b) => String(b.barkod) === kod)) { hit = s; break; }
        }
        if (!hit) {
          // nested barkod endpoint yoksa stok listesinde ara
          toast(`Barkod bulunamadı: ${kod}`);
          return;
        }
        const stokEl = detailKey
          ? document.querySelector(`select[data-detail="item_id"][data-didx="${el.getAttribute('data-didx')}"][data-grid="${el.getAttribute('data-grid')}"]`)
          : document.querySelector('select[data-master="item_id"]');
        if (stokEl) {
          const current = stokEl.value;
          if (current && String(current) !== String(hit.id)) {
            toast('Barkod başka bir stokla eşleşiyor — yanlış malzeme engellendi.');
            el.value = '';
            return;
          }
          stokEl.value = String(hit.id);
          stokEl.dispatchEvent(new Event('change', { bubbles: true }));
          toast(`Barkod → ${hit.item_code}`);
        }
      } catch (err) {
        toast(err.message || 'Barkod çözülemedi');
      }
      return;
    }

    if (!(el instanceof HTMLSelectElement) && !(el instanceof HTMLInputElement && fieldKey === 'dil_code')) {
      if (!(el instanceof HTMLSelectElement)) return;
    }
    if (!el.hasAttribute('data-master') && !el.hasAttribute('data-detail')
        && !el.hasAttribute('data-flow-comp-field')) return;

    if (masterKey && state.formRecord) {
      const f = collectTabFields(scr).find((x) => x.key === masterKey)
        || (scr.masterFields || []).find((x) => x.key === masterKey);
      state.formRecord[masterKey] = f ? readFieldValue(el, f) : el.value;
    }
    refreshDependentLookups(scr, el);
    if (!_formLinking && fieldKey) {
      await applyFormLinkages(scr, fieldKey, el);
    }

    // Rota: başlık stok / ürün ağacı değişince yan paneli yenile
    if (scr.id === 'routings' && ['product_bom_id', 'item_id'].includes(masterKey) && state.formMode !== 'incele') {
      renderForm(scr);
      persistActiveFormTab();
      return;
    }

    // Dil kodu → dil adı
    if (fieldKey === 'dil_code') {
      const kod = String(el.value || '').toUpperCase();
      let adi = DIL_AD_MAP[kod];
      const dilRows = state.lookupCache.languages || [];
      const hit = dilRows.find((d) => String(d.dil_code).toUpperCase() === kod);
      if (hit?.dil_name) adi = hit.dil_name;
      if (adi) {
        if (masterKey) {
          const nameEl = document.querySelector('[data-master="dil_name"]');
          if (nameEl) nameEl.value = adi;
          if (state.formRecord) state.formRecord.dil_name = adi;
        } else if (detailKey) {
          const didx = el.getAttribute('data-didx');
          const grid = el.getAttribute('data-grid');
          const nameEl = document.querySelector(
            `[data-detail="dil_name"][data-didx="${didx}"][data-grid="${grid}"]`
          );
          if (nameEl) nameEl.value = adi;
        }
      }
    }

    // autoFillName: lookup seçilince bağlı ad alanını doldur (ekran kodu → ekran adı vb.)
    if (el instanceof HTMLSelectElement && fieldKey) {
      const fDef = collectTabFields(scr).find((x) => x.key === fieldKey)
        || (scr.masterFields || []).find((x) => x.key === fieldKey)
        || (scr.detailFields || []).find((x) => x.key === fieldKey);
      const targetKey = fDef?.autoFillName;
      if (targetKey) {
        const rows = state.lookupCache[fDef.lookup] || [];
        const vk = fDef.valueKey || 'id';
        const lk = fDef.labelKey || 'adi';
        const hit = rows.find((r) => String(r[vk]) === String(el.value));
        const adi = hit ? (hit[lk] || hit.screen_name || hit.dil_name || '') : '';
        const fillTarget = (sel) => {
          if (!sel) return;
          sel.value = adi;
          if (state.formRecord && (masterKey || !detailKey)) state.formRecord[targetKey] = adi;
        };
        if (masterKey || (detailKey && !el.getAttribute('data-didx'))) {
          fillTarget(document.querySelector(`[data-master="${targetKey}"]`)
            || document.querySelector(`[data-detail="${targetKey}"]`));
        } else if (detailKey) {
          const didx = el.getAttribute('data-didx');
          const grid = el.getAttribute('data-grid');
          fillTarget(document.querySelector(
            `[data-detail="${targetKey}"][data-didx="${didx}"][data-grid="${grid}"]`
          ));
        }
      }
    }

    // Para birimi → exchange_rate
    if (fieldKey === 'currency_code') {
      const pb = el.value;
      if (masterKey) {
        const kurEl = document.querySelector('[data-master="exchange_rate"]');
        await applyKurForParaBirimi(pb, kurEl, { force: true });
        if (state.formRecord && kurEl) state.formRecord.exchange_rate = Number(kurEl.value) || 1;
      } else if (detailKey) {
        const didx = el.getAttribute('data-didx');
        const grid = el.getAttribute('data-grid');
        const kurEl = document.querySelector(
          `[data-detail="exchange_rate"][data-didx="${didx}"][data-grid="${grid}"]`
        );
        await applyKurForParaBirimi(pb, kurEl, { force: true });
      }
    }

    // fillFrom: teklif / talep / sipariş / sevk / irsaliye / mal-kabul satır doldurma
    if (masterKey && el instanceof HTMLSelectElement) {
      const f = collectTabFields(scr).find((x) => x.key === masterKey)
        || (scr.masterFields || []).find((x) => x.key === masterKey);
      if (f?.fillFrom && el.value) {
        await fillLinesFromSource(f.fillFrom, el.value);
        return;
      }
      // fillCariAdres: müşteri → Adres sekmesi (sevk_*) otomatik
      if (f?.fillCariAdres && el.value) {
        state.formRecord = { ...state.formRecord, ...readTabbedPayload(scr) };
        await fillAdresFromCari(el.value, { force: true });
        renderForm(scr);
        toast('Cari address / ödeme bilgileri forma aktarıldı');
        return;
      }
    }

    // Ürün ağacı / rota: mamul veya ağaç değişince tek ekranı yenile (kök + önizleme)
    if (masterKey && ['finished_good_item_id', 'item_id', 'product_bom_id'].includes(masterKey)
        && (scr.id === 'urun-agaci' || scr.id === 'routings')) {
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(scr) };
      if (masterKey === 'finished_good_item_id' || masterKey === 'item_id') {
        const st = stokLookupById(state.formRecord[masterKey]);
        if (st && scr.id === 'urun-agaci' && !String(state.formRecord.bom_name || '').trim()) {
          state.formRecord.bom_name = `${st.item_name} Ağacı`;
        }
      }
      renderForm(scr);
    }
  });
}

function findDetailControlEl(key, idx, gridKey) {
  return findAttrControl('data-detail', key, document, `[data-didx="${idx}"][data-grid="${gridKey}"]`);
}

function syncGridRowFromDom(tab, idx, baseRow = {}) {
  const row = { ...baseRow };
  let any = false;
  const missing = [];
  (tab.fields || []).forEach((f) => {
    if (f.type === 'static') return;
    const el = findDetailControlEl(f.key, idx, tab.key);
    if (!el) return;
    row[f.key] = readFieldValue(el, f);
    if (f.type === 'checkbox') { if (el.checked) any = true; }
    else if (el.type === 'radio') { if (el.checked && el.value !== '') any = true; }
    else if (el.value !== '') any = true;
    if (f.required) {
      const v = row[f.key];
      if (v === undefined || v === null || v === '') missing.push(f);
    }
  });
  return { row, any, missing };
}

function readGridFromForm(tab) {
  const existing = Array.isArray(state.formRecord?.[tab.key]) ? state.formRecord[tab.key] : [];
  const count = Math.max(
    existing.length,
    document.querySelectorAll(`[data-grid-row="${tab.key}"]`).length
  );
  const rows = [];
  for (let idx = 0; idx < count; idx += 1) {
    const { row, any } = syncGridRowFromDom(tab, idx, existing[idx] || {});
    const hasContent = any || Object.keys(row).some((k) => {
      if (k === 'bilesenler' || k === 'alt_satirlar' || k.startsWith('_')) return false;
      // Varsayılan katsayı 1 boş satır sayılmaz
      if (k === 'katsayi' || k === 'source_katsayi') return false;
      const v = row[k];
      return v !== '' && v != null && v !== false;
    });
    if (hasContent) {
      if (Array.isArray(existing[idx]?.bilesenler)) row.bilesenler = existing[idx].bilesenler;
      // UI-only alanları API'ye gönderme
      delete row._esittir;
      delete row._satir_kayitli;
      delete row._satir_duzenleniyor;
      rows.push(row);
    }
  }
  return rows;
}

function persistBomEditor(rec, tab) {
  if (state.treeSel == null) return null;
  const nodes = ensureBomTree(rec);
  const node = getBomNode(nodes, state.treeSel);
  if (!node) return null;
  (tab.fields || []).forEach((f) => {
    const el = findAttrControl('data-bom-field', f.key);
    if (!el) return;
    node[f.key] = readFieldValue(el, f);
  });
  // Alternatif malzemeler
  const altFields = tab.altFields || [];
  const altRows = [];
  document.querySelectorAll('[data-bom-alt-row]').forEach((rowEl) => {
    const idx = Number(rowEl.getAttribute('data-bom-alt-row'));
    const row = { ...(node.alternatifler?.[idx] || blankBomAltRow(altFields)) };
    altFields.forEach((f) => {
      const el = findAttrControl('data-bom-alt-field', f.key, rowEl);
      if (!el) return;
      row[f.key] = readFieldValue(el, f);
    });
    if (row.alt_item_id) altRows.push(row);
  });
  node.alternatifler = altRows;
  syncBomQtyFields(node);
  const st = stokLookupById(node.component_item_id);
  if (st) {
    node.item_code = st.item_code;
    node.item_name = st.item_name;
    node.item_type = st.item_type;
    if (!node.line_type && st.item_type) {
      if (/yarı|yari/i.test(st.item_type)) node.line_type = 'YariMamul';
      else if (/ham/i.test(st.item_type)) node.line_type = 'Hammadde';
      else if (/mamul/i.test(st.item_type)) node.line_type = 'Mamul';
    }
  }
  if (!Array.isArray(node.alt_satirlar)) node.alt_satirlar = [];
  return node;
}

function renderBomAltMaterials(node, tab, canEdit) {
  const altFields = tab.altFields || [];
  if (!altFields.length) return '';
  const rows = Array.isArray(node.alternatifler) ? node.alternatifler : [];
  return `
    <div class="bom-alt-materials" data-bom-alts>
      <div class="section-label">Alternatif malzemeler</div>
      ${rows.length ? rows.map((row, idx) => `
        <div class="bom-alt-row" data-bom-alt-row="${idx}">
          <div class="form-tab-fields bom-inline-fields">
            ${altFields.map((f) => fieldShell(f, fieldControl(f, row[f.key], 'data-bom-alt-field'), row[f.key])).join('')}
          </div>
          ${canEdit ? `<button type="button" class="btn tiny danger" data-bom-act="alt-sil" data-bom-alt-idx="${idx}" title="Alternatifi sil">×</button>` : ''}
        </div>`).join('') : '<div class="detail-empty">Bu satır için alternatif yok.</div>'}
      ${canEdit ? `<button type="button" class="btn action ghost" data-bom-act="alt-ekle">+ Alternatif ekle</button>` : ''}
    </div>`;
}

function findBomTab(screen) {
  return (screen.formTabs || []).find((t) => t.kind === 'bom-tree' || t.kind === 'bom-workspace');
}
function findRotaTab(screen) {
  return (screen.formTabs || []).find((t) => t.kind === 'rota-flow' || t.kind === 'rota-workspace');
}

/** Satır içi editör → ağaç: malzeme + quantity zorunlu */
/** BOMT01 — çoklu malzeme seçimi (Ctrl/çoklu işaret → ağaca ekle) */
async function openBomMultiItemPicker(screen, tab) {
  await fetchLookupKey('items');
  const items = state.lookupCache.items || [];
  if (!items.length) {
    toast('Stok listesi boş.');
    return;
  }
  const dlg = document.createElement('div');
  dlg.className = 'cvt-overlay';
  dlg.innerHTML = `
    <div class="cvt-dialog lookup-browser-dialog" role="dialog" aria-modal="true" style="max-width:52rem">
      <header class="cvt-dialog-head">
        <strong>Çoklu malzeme ekleme</strong>
        <button type="button" class="btn action ghost" data-bom-multi-close>×</button>
      </header>
      <div class="cvt-dialog-body">
        <p class="toolbar-hint">Ctrl/Shift ile birden fazla satır seçin veya soldaki kutuları işaretleyin; Onay ile köke eklenir.</p>
        <input type="search" class="filter-input" data-bom-multi-q placeholder="Kod / ad ara…" style="width:100%;margin-bottom:.5rem" />
        <div class="detail-table-wrap" style="max-height:22rem;overflow:auto">
          <table class="detail-table">
            <thead><tr><th></th><th>Kod</th><th>Ad</th><th>Tip</th><th>Birim</th></tr></thead>
            <tbody data-bom-multi-body></tbody>
          </table>
        </div>
      </div>
      <footer class="cvt-dialog-foot">
        <button type="button" class="btn action ghost" data-bom-multi-close>Kapat</button>
        <button type="button" class="btn action" data-bom-multi-ok>Onay</button>
      </footer>
    </div>`;
  document.body.appendChild(dlg);
  const body = dlg.querySelector('[data-bom-multi-body]');
  const qEl = dlg.querySelector('[data-bom-multi-q]');
  const selected = new Set();

  const paint = () => {
    const q = String(qEl.value || '').trim().toLocaleLowerCase('tr');
    const rows = items.filter((r) => {
      if (!q) return true;
      return String(r.item_code || '').toLocaleLowerCase('tr').includes(q)
        || String(r.item_name || '').toLocaleLowerCase('tr').includes(q);
    }).slice(0, 400);
    body.innerHTML = rows.map((r) => `
      <tr data-id="${escAttr(r.id)}">
        <td><input type="checkbox" data-bom-multi-chk value="${escAttr(r.id)}" ${selected.has(String(r.id)) ? 'checked' : ''} /></td>
        <td class="mono">${escapeHtml(r.item_code || '')}</td>
        <td>${escapeHtml(r.item_name || '')}</td>
        <td>${escapeHtml(r.item_type || '')}</td>
        <td class="mono">${escapeHtml(r.uom_code || '')}</td>
      </tr>`).join('');
  };
  paint();
  qEl.addEventListener('input', paint);
  body.addEventListener('change', (e) => {
    const chk = e.target.closest('[data-bom-multi-chk]');
    if (!chk) return;
    if (chk.checked) selected.add(String(chk.value));
    else selected.delete(String(chk.value));
  });
  const close = () => dlg.remove();
  dlg.querySelectorAll('[data-bom-multi-close]').forEach((b) => b.addEventListener('click', close));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.querySelector('[data-bom-multi-ok]').addEventListener('click', () => {
    if (!selected.size) {
      toast('En az bir malzeme seçin.');
      return;
    }
    const nodes = ensureBomTree(state.formRecord);
    const fields = tab.fields || [];
    [...selected].forEach((id) => {
      const st = stokLookupById(id);
      if (!st) return;
      const row = blankBomRow(fields);
      row.component_item_id = String(st.id);
      row.uom_code = st.uom_code || '';
      row.quantity = 1;
      row.line_description = st.item_name || '';
      row.item_code = st.item_code;
      row.item_name = st.item_name;
      row.item_type = st.item_type;
      nodes.push(row);
    });
    state.formRecord.satirlar = nodes;
    state.formRecord.agac = nodes;
    state.treeSel = String(nodes.length - 1);
    close();
    renderForm(screen);
    toast(`${selected.size} malzeme eklendi — miktarları kontrol edip kaydedin.`);
  });
  qEl.focus();
}

function applyBomEditorSelection(screen, { addAnother = false } = {}) {
  const tab = findBomTab(screen);
  if (!tab) return false;
  if (state.treeSel == null) {
    toast('Önce bir satır seçin veya «+ Eleman ekle» kullanın.');
    return false;
  }
  const master = readMasterFromForm(screen);
  state.formRecord = { ...(state.formRecord || {}), ...master };
  // agac eski kopyayı ezmesin — satırları tek source yap
  if (Array.isArray(state.formRecord.satirlar)) {
    state.formRecord.agac = state.formRecord.satirlar;
  }
  const node = persistBomEditor(state.formRecord, tab);
  if (!node) {
    toast('Bileşen satırı bulunamadı.');
    return false;
  }
  const nodes = state.formRecord.satirlar;
  const stokId = node.component_item_id;
  const quantity = Number(node.quantity);
  if (!stokId) {
    toast('Bileşen stok seçin.');
    return false;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    toast('Miktar 0’dan büyük olmalı.');
    return false;
  }
  const st = stokLookupById(stokId);
  if (st) {
    node.item_code = st.item_code;
    node.item_name = st.item_name;
    node.item_type = st.item_type;
    // uom_code kullanıcı boş bıraktıysa doldurma — bilinçli boş kalabilir
  }
  state.formRecord.satirlar = nodes;
  state.formRecord.agac = nodes;
  state.treeExpanded[state.treeSel] = true;

  if (addAnother) {
    const blank = blankBomRow(tab.fields);
    const parts = String(state.treeSel).split('.');
    if (parts.length === 1) {
      nodes.push(blank);
      state.treeSel = String(nodes.length - 1);
    } else {
      const parentPath = parts.slice(0, -1).join('.');
      const parent = getBomNode(nodes, parentPath);
      if (!parent.alt_satirlar) parent.alt_satirlar = [];
      parent.alt_satirlar.push(blank);
      state.treeSel = `${parentPath}.${parent.alt_satirlar.length - 1}`;
      state.treeExpanded[parentPath] = true;
    }
    toast(`${st?.item_code || 'Bileşen'} ağaca eklendi — yeni satır hazır.`);
  } else {
    toast(`${st?.item_code || 'Bileşen'} ağaca kaydedildi.`);
  }
  // Önce DOM’u yeni seçime göre çiz; sonra sekme anlık görüntüsü al
  // (aksi halde eski editör değerleri boş satıra yazılır)
  renderForm(screen);
  persistActiveFormTab();
  return true;
}

function persistFlowEditor(rec, tab) {
  const ops = Array.isArray(rec.operasyonlar) ? rec.operasyonlar : [];
  if (state.flowSel == null || !ops[state.flowSel]) return;
  const op = ops[state.flowSel];
  (tab.fields || []).forEach((f) => {
    const el = findAttrControl('data-flow-field', f.key);
    if (!el) return;
    op[f.key] = readFieldValue(el, f);
  });
  if (state.flowCompSel != null && op.bilesenler?.[state.flowCompSel]) {
    const b = op.bilesenler[state.flowCompSel];
    (tab.componentFields || []).forEach((f) => {
      const el = findAttrControl('data-flow-comp-field', f.key);
      if (!el) return;
      b[f.key] = readFieldValue(el, f);
    });
  }
  if (state.flowEquipSel != null && op.ekipmanlar?.[state.flowEquipSel]) {
    const eq = op.ekipmanlar[state.flowEquipSel];
    (tab.equipmentFields || []).forEach((f) => {
      const el = findAttrControl('data-flow-equip-field', f.key);
      if (!el) return;
      eq[f.key] = readFieldValue(el, f);
    });
  }
  // auto-link sonraki_line_no if empty: next op in list
  ops.sort((a, b) => Number(a.line_no || 0) - Number(b.line_no || 0));
  for (let i = 0; i < ops.length; i += 1) {
    if (ops[i].sonraki_line_no == null || ops[i].sonraki_line_no === '') {
      ops[i].sonraki_line_no = ops[i + 1] ? Number(ops[i + 1].line_no) : null;
    }
  }
  rec.operasyonlar = ops;
}

/** Ekipman satırı uygula */
function applyRotaEquipSelection(screen, { addAnother = false } = {}) {
  const tab = findRotaTab(screen);
  if (!tab) return false;
  if (state.flowSel == null) {
    toast('Önce operasyon seçin.');
    return false;
  }
  if (state.flowEquipSel == null) {
    toast('Önce bir ekipman satırı seçin veya «+ Ekipman» ekleyin.');
    return false;
  }
  const master = readMasterFromForm(screen);
  state.formRecord = { ...(state.formRecord || {}), ...master };
  persistFlowEditor(state.formRecord, tab);
  const op = state.formRecord.operasyonlar?.[state.flowSel];
  const eq = op?.ekipmanlar?.[state.flowEquipSel];
  if (!eq) {
    toast('Ekipman satırı bulunamadı.');
    return false;
  }
  if (!eq.equipment_code && !eq.equipment_name) {
    toast('Ekipman kodu veya adı girin.');
    return false;
  }
  if (!eq.equipment_code && eq.equipment_name) eq.equipment_code = eq.equipment_name;
  if (addAnother) {
    const blank = emptyRowFromFields(tab.equipmentFields);
    const next = (op.ekipmanlar || []).reduce((m, e) => Math.max(m, Number(e.line_no) || 0), 0) + 10;
    blank.line_no = next;
    op.ekipmanlar.push(blank);
    state.flowEquipSel = op.ekipmanlar.length - 1;
    toast(`${eq.equipment_code} eklendi — yeni satır hazır.`);
  } else {
    toast(`${eq.equipment_code} kaydedildi.`);
  }
  renderForm(screen);
  persistActiveFormTab();
  return true;
}

/** Şablon rota operasyonlarını bu forma uygula (kayıtlıysa API, değilse istemci kopyası). */
async function applyRotaSablon(screen) {
  const rec = state.formRecord || {};
  const master = readMasterFromForm(screen);
  Object.assign(rec, master);
  const sablonEl = document.querySelector('[data-master="_sablon_rota_id"]');
  if (sablonEl) rec._sablon_rota_id = sablonEl.value || '';
  state.formRecord = rec;
  const sablonId = rec._sablon_rota_id;
  if (!sablonId) {
    toast('Önce şablon rota seçin.');
    return false;
  }
  if (!window.confirm('Şablon operasyonları mevcut adımların yerine yazılacak. Devam?')) return false;

  try {
    if (rec.id && state.formMode === 'duzelt') {
      const result = await api(`/routings/${rec.id}/sablon-uygula`, {
        method: 'POST',
        body: JSON.stringify({ template_id: Number(sablonId) }),
      });
      state.formRecord = {
        ...result,
        _sablon_rota_id: sablonId,
      };
      state.flowSel = result.operasyonlar?.length ? 0 : null;
      state.flowCompSel = null;
      state.flowEquipSel = null;
      toast(`${(result.operasyonlar || []).length} operasyon şablondan uygulandı.`);
      renderForm(screen);
      persistActiveFormTab();
      return true;
    }

    // Yeni kayıt: şablonu çekip istemcide kopyala
    const sablon = await api(`/routings/${Number(sablonId)}`);
    const ops = (sablon.operasyonlar || []).map((op) => {
      const { id, route_id, ...rest } = op;
      return {
        ...rest,
        bilesenler: (op.bilesenler || []).map(({ id: _bid, operasyon_id, ...b }) => ({ ...b })),
        ekipmanlar: (op.ekipmanlar || []).map(({ id: _eid, operation_id, ...e }) => ({ ...e })),
      };
    });
    state.formRecord.operasyonlar = ops;
    state.flowSel = ops.length ? 0 : null;
    state.flowCompSel = null;
    state.flowEquipSel = null;
    toast(`${ops.length} operasyon şablondan kopyalandı (kayıtta yazılır).`);
    renderForm(screen);
    persistActiveFormTab();
    return true;
  } catch (err) {
    toast(err.message || 'Şablon uygulanamadı.');
    return false;
  }
}

/** Sağ panel → akış: operasyon alanlarını sola yaz */
function applyRotaOpSelection(screen) {
  const tab = findRotaTab(screen);
  if (!tab) return false;
  if (state.flowSel == null) {
    toast('Önce soldan bir operasyon seçin veya «Yeni operasyon» ekleyin.');
    return false;
  }
  const master = readMasterFromForm(screen);
  state.formRecord = { ...(state.formRecord || {}), ...master };
  persistFlowEditor(state.formRecord, tab);
  const op = state.formRecord.operasyonlar?.[state.flowSel];
  if (!op) {
    toast('Operasyon bulunamadı.');
    return false;
  }
  if (!op.operation_code && !op.operation_name) {
    toast('Operasyon kodu veya adı girin.');
    return false;
  }
  toast(`${op.operation_code || 'Operasyon'} kaydedildi — belgeyi kaydetmeyi unutmayın.`);
  renderForm(screen);
  persistActiveFormTab();
  return true;
}

/** Sağ panel → bileşen: stok + quantity zorunlu (ürün ağacı kapsamı) */
function applyRotaCompSelection(screen, { addAnother = false } = {}) {
  const tab = findRotaTab(screen);
  if (!tab) return false;
  if (state.flowSel == null) {
    toast('Önce operasyon seçin.');
    return false;
  }
  if (state.flowCompSel == null) {
    toast('Önce bir bileşen satırı seçin veya «Yeni bileşen» ekleyin.');
    return false;
  }
  const master = readMasterFromForm(screen);
  state.formRecord = { ...(state.formRecord || {}), ...master };
  persistFlowEditor(state.formRecord, tab);
  const op = state.formRecord.operasyonlar?.[state.flowSel];
  if (!master.product_bom_id && !state.formRecord?.product_bom_id) {
    toast('Bileşen için önce rota başlığında ürün ağacı seçin.');
    return false;
  }
  const b = op?.bilesenler?.[state.flowCompSel];
  if (!b) {
    toast('Bileşen satırı bulunamadı.');
    return false;
  }
  const stokId = b.item_id;
  const quantity = Number(b.quantity);
  if (!stokId) {
    toast('Bileşen stok seçin (ürün ağacı malzemeleri).');
    return false;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    toast('Miktar 0’dan büyük olmalı.');
    return false;
  }
  const st = stokLookupById(stokId);
  if (st) {
    b.item_code = st.item_code;
    b.item_name = st.item_name;
    b.item_type = st.item_type;
  }

  if (addAnother) {
    const blank = emptyRowFromFields(tab.componentFields);
    op.bilesenler.push(blank);
    state.flowCompSel = op.bilesenler.length - 1;
    toast(`${st?.item_code || 'Bileşen'} eklendi — yeni satır hazır.`);
  } else {
    toast(`${st?.item_code || 'Bileşen'} kaydedildi.`);
  }
  renderForm(screen);
  persistActiveFormTab();
  return true;
}

/** Başlıktan düşürülen PB/exchange_rate/depo gibi alanları ilk kalemden geri doldur (API bekler). */
function backfillHeaderFromLines(out, screen) {
  const lineKeys = ['currency_code', 'exchange_rate', 'rate_type', 'warehouse_id', 'project_code', 'region', 'delivery_date', 'ship_date', 'discount_rate', 'price_list_id', 'valid_date'];
  let lines = null;
  (screen.formTabs || []).forEach((tab) => {
    if (lines) return;
    if (tab.kind === 'grid' && Array.isArray(out[tab.key]) && out[tab.key].length) lines = out[tab.key];
    if (tab.kind === 'master-grid') {
      const k = tab.grid?.key || tab.key || '_detail';
      if (Array.isArray(out[k]) && out[k].length) lines = out[k];
    }
  });
  if (!lines?.length) return;
  const first = lines[0] || {};
  lineKeys.forEach((k) => {
    if (out[k] == null || out[k] === '') {
      if (first[k] != null && first[k] !== '') out[k] = first[k];
      else if (screen.defaults && screen.defaults[k] != null) out[k] = screen.defaults[k];
    }
  });
}

function readTabbedPayload(screen) {
  const out = readMasterFromForm(screen);
  (screen.formTabs || []).forEach((tab) => {
    if (tab.kind === 'grid') out[tab.key] = readGridFromForm(tab);
    if (tab.kind === 'master-grid') {
      const g = {
        kind: 'grid',
        key: tab.grid?.key || tab.key || '_detail',
        fields: tab.grid?.fields || tab.detailFields || [],
      };
      out[g.key] = readGridFromForm(g);
    }
    if (tab.kind === 'bom-tree' || tab.kind === 'bom-workspace') {
      persistBomEditor(out, tab);
      out.satirlar = ensureBomTree(out);
      out.agac = out.satirlar;
    }
    if (tab.kind === 'rota-flow' || tab.kind === 'rota-workspace') {
      persistFlowEditor(out, tab);
      out.operasyonlar = (out.operasyonlar || []).map((op) => ({
        ...op,
        bilesenler: (op.bilesenler || []).filter((b) => b.item_id && b.quantity != null && b.quantity !== ''),
        ekipmanlar: (op.ekipmanlar || []).filter((e) => e.equipment_code || e.equipment_name),
      }));
      // Şablon seçimi formda kalsın; API kaydında strip edilir
      const sablonEl = document.querySelector('[data-master="_sablon_rota_id"]');
      if (sablonEl) out._sablon_rota_id = sablonEl.value || '';
    }
  });
  backfillHeaderFromLines(out, screen);
  return out;
}

function validateRequired(screen, payload) {
  for (const f of collectTabFields(screen)) {
    const need = f.required || (f.requiredOnNew && state.formMode === 'yeni');
    if (!need) continue;
    if (f.code && state.formMode === 'duzelt') continue;
    // Şifre: düzeltmede boş = değiştirme
    if (f.type === 'password' && state.formMode === 'duzelt') continue;
    const v = payload[f.key];
    if (v === undefined || v === null || (typeof v === 'string' && !String(v).trim())) {
      return `${f.label} zorunlu.`;
    }
  }
  return null;
}

function snapshotFormSession() {
  const screen = findScreen(state.screenId);
  if (!screen || !state.formMode) return null;
  const payload = screen.formTabs?.length
    ? readTabbedPayload(screen)
    : { ...(state.formRecord || {}) };
  return {
    screenId: state.screenId,
    formMode: state.formMode,
    formRecord: payload,
    formActiveTab: state.formActiveTab,
    selectedId: state.selectedId,
  };
}

function persistActiveFormTab() {
  if (!state.activeTabKey || !String(state.activeTabKey).startsWith('form:')) return;
  const snap = snapshotFormSession();
  if (!snap) return;
  const tab = state.openTabs.find((t) => t.key === state.activeTabKey);
  if (tab) {
    tab.formMode = snap.formMode;
    tab.formRecord = snap.formRecord;
    tab.formActiveTab = snap.formActiveTab;
    tab.screenId = snap.screenId;
  }
}

function addListTab(screen, { activate = true } = {}) {
  if (!screen) return;
  const key = `list:${screen.id}`;
  if (!state.openTabs.some((t) => t.key === key)) {
    state.openTabs.push({
      key,
      kind: 'list',
      id: screen.id,
      title: screen.title,
    });
  }
  if (activate) state.activeTabKey = key;
  renderTabBar();
  return key;
}

function addFormTab(screen, mode, record) {
  state.formSeq += 1;
  const code = record?.[screen.codeField] || '';
  const key = `form:${screen.id}:${mode}:${state.formSeq}`;
  const title = code
    ? `${screen.title} · ${code}`
    : `${screen.title}`;
  state.openTabs.push({
    key,
    kind: 'form',
    id: screen.id,
    screenId: screen.id,
    title,
    formMode: mode,
    formRecord: record,
    formActiveTab: screen.formTabs?.[0]?.id || null,
  });
  state.activeTabKey = key;
  renderTabBar();
  return key;
}

async function activateTab(tabKey) {
  const tab = state.openTabs.find((t) => t.key === tabKey);
  if (!tab) return;

  // mevcut formu kaydet
  if (state.activeTabKey && String(state.activeTabKey).startsWith('form:')) {
    persistActiveFormTab();
  }

  state.activeTabKey = tabKey;

  if (tab.kind === 'list') {
    state.formMode = null;
    state.formRecord = null;
    await openScreen(tab.id, { skipTab: true });
    return;
  }

  // form sekmesi
  const screen = findScreen(tab.screenId || tab.id);
  if (!screen) return;
  state.screenId = screen.id;
  state.formMode = tab.formMode;
  state.formRecord = { ...(tab.formRecord || {}) };
  state.formActiveTab = tab.formActiveTab || screen.formTabs?.[0]?.id || null;
  ensureSidebarPath(screen);
  await ensureLookups(screen);
  showView('form');
  ensureSearchBarVisible();
  $('#screenTitle').textContent = tab.title;
  renderForm(screen);
  renderSidebar();
  renderTabBar();
}

function parseFormSoloQuery() {
  try {
    const q = new URLSearchParams(location.search || '');
    if (q.get('view') !== 'form') return null;
    const screenId = q.get('screen');
    const mode = q.get('mode');
    if (!screenId || !mode) return null;
    return {
      screenId,
      mode,
      id: q.get('id') || null,
      prefillKey: q.get('prefill') || null,
    };
  } catch (_) {
    return null;
  }
}

function applyFormSoloChrome() {
  state.formSolo = true;
  document.body.classList.add('form-solo');
  const shell = $('#appShell');
  if (shell) {
    shell.classList.add('form-solo', 'sidebar-collapsed');
  }
}

function revealFormSoloReady() {
  document.documentElement.classList.remove('form-solo-boot');
  document.body.classList.remove('form-solo-booting');
  const loader = $('#formSoloLoader');
  if (loader) {
    loader.hidden = true;
    loader.setAttribute('aria-busy', 'false');
  }
  const shell = $('#appShell');
  if (shell) {
    shell.style.opacity = '';
    shell.style.pointerEvents = '';
  }
}

function leaveFormSolo(screenId) {
  if (!state.formSolo) return false;
  try { window.close(); } catch (_) { /* ignore */ }
  const target = screenId ? `/?#${encodeURIComponent(screenId)}` : '/';
  setTimeout(() => {
    try {
      if (!window.closed) location.href = target;
    } catch (_) {
      location.href = target;
    }
  }, 120);
  return true;
}

function openFormInNewBrowserTab(screen, mode, { rowId = null, prefill = null } = {}) {
  const params = new URLSearchParams({
    view: 'form',
    screen: screen.id,
    mode,
  });
  if (rowId != null && rowId !== '') params.set('id', String(rowId));
  if (prefill) {
    const key = `ktb-form-prefill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      // localStorage: sessionStorage sekmeler arası paylaşılmaz
      localStorage.setItem(key, JSON.stringify(prefill));
      params.set('prefill', key);
    } catch (_) { /* depolama doluysa yine de aç */ }
  }
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  const win = window.open(url, '_blank');
  if (win) {
    try { win.focus(); } catch (_) { /* ignore */ }
    return true;
  }
  toast('Tarayıcı yeni sekmeyi engelledi — açılır pencere izni verin.');
  return false;
}

/** Liste / meta ekranını yeni tarayıcı sekmesinde aç (Bilgi → Ekran / Log). */
function openScreenInNewBrowserTab(screenId, opts = {}) {
  if (!screenId || !findScreen(screenId)) {
    toast(`Ekran bulunamadı: ${screenId || '?'}`);
    return false;
  }
  const params = new URLSearchParams({
    view: 'screen',
    screen: screenId,
  });
  if (opts.focusScreenId) params.set('focus', String(opts.focusScreenId));
  if (opts.banner) params.set('banner', String(opts.banner));
  if (opts.filterState && typeof opts.filterState === 'object') {
    const key = `ktb-screen-filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      localStorage.setItem(key, JSON.stringify(opts.filterState));
      params.set('filters', key);
    } catch (_) { /* depolama doluysa filtresiz aç */ }
  }
  const url = `${location.origin}${location.pathname}?${params.toString()}#${encodeURIComponent(screenId)}`;
  const win = window.open(url, '_blank');
  if (win) {
    try { win.focus(); } catch (_) { /* ignore */ }
    return true;
  }
  toast('Tarayıcı yeni sekmeyi engelledi — açılır pencere izni verin.');
  return false;
}

function parseScreenOpenQuery() {
  try {
    const q = new URLSearchParams(location.search || '');
    if (q.get('view') !== 'screen') return null;
    const screenId = q.get('screen') || (location.hash || '').replace(/^#/, '');
    if (!screenId) return null;
    return {
      screenId,
      focusScreenId: q.get('focus') || null,
      filtersKey: q.get('filters') || null,
      banner: q.get('banner') || null,
    };
  } catch (_) {
    return null;
  }
}

async function openForm(mode, opts = {}) {
  const screen = findScreen(state.screenId);
  if (!screen) return;
  if (screen.readOnly && mode !== 'incele') {
    toast('Bu ekran yalnızca incelenebilir.');
    return;
  }
  if (!ekranYetkisi(screen.id, mode)) {
    toast(`Bu ekranda «${MODE_LABELS[mode] || mode}» yetkiniz yok.`);
    return;
  }
  // Kullanıcı yetki grid: form her açıldığında modül başlıkları kapalı
  if (screen.kullaniciYetkiPaneli) state.yetkiModOpen = {};

  // Sipariş adayından iş emri: satır seçip Düzelt → Yeni + ön doldurma
  let adayPrefill = state.formPrefill || null;
  state.formPrefill = null;
  if (!adayPrefill && screen.createEndpoint && (screen.id === 'siparis-is-emri' || screen.id === 'toplu-is-emri')
      && (mode === 'duzelt' || mode === 'incele' || mode === 'kopyala')) {
    const sel = selectedRow();
    if (!sel) {
      toast('Önce bir sipariş kalemi seçin.');
      return;
    }
    adayPrefill = sel;
    mode = 'yeni';
  }

  const needsRow = mode === 'incele' || mode === 'duzelt' || mode === 'kopyala';
  const row = selectedRow();
  if (needsRow && !row) {
    toast('Önce listeden bir satır seçin.');
    return;
  }

  // Liste ekranından: formu tarayıcıda yeni sekmede aç (sol menüsüz tam ekran)
  if (!state.formSolo && !opts.inPlace) {
    openFormInNewBrowserTab(screen, mode, {
      rowId: needsRow ? row.id : null,
      prefill: adayPrefill,
    });
    return;
  }

  // Liste sekmesi yerinde kalsın; form yan (yeni) sekme olarak açılsın
  if (!state.formSolo) addListTab(screen, { activate: false });
  state.nestedLink = null;

  state.formMode = mode;
  state.formActiveTab = screen.formTabs?.[0]?.id || null;
  state.gridSel = { key: null, idx: null };
  state.treeSel = null;
  state.treeExpanded = {};
  state.flowSel = null;
  state.flowCompSel = null;
  state.flowEquipSel = null;
  let record = {};

  async function loadRecord(id) {
    try {
      return await api(`${screenApiBase(screen.endpoint)}/${id}`);
    } catch (_) {
      return { ...row };
    }
  }

  await ensureLookups(screen);

  const seedFields = () => {
    collectTabFields(screen).forEach((f) => {
      if (f.type === 'checkbox') {
        // is_active varsayılan true → Pasif kutusu boş
        record[f.key] = f.key === 'is_inactive' ? false : true;
      } else if (f.type === 'select') record[f.key] = f.options?.[0] || '';
      else if (f.key === 'company_id' && getActiveFirmaId()) record[f.key] = getActiveFirmaId();
      else if (f.key === 'plant_id' && state.activeIsYeriId) record[f.key] = state.activeIsYeriId;
      else if (record[f.key] === undefined) record[f.key] = '';
    });
  };

  function initSpecialTabs(src) {
    const stripIds = mode === 'kopyala' || mode === 'yeni';
    const keepOrStrip = (row) => {
      if (!row || typeof row !== 'object') return row;
      if (!stripIds) return { ...row };
      const { id, ...rest } = row;
      return rest;
    };
    (screen.formTabs || []).forEach((tab) => {
      if (tab.kind === 'grid') {
        const raw = Array.isArray(src[tab.key]) ? src[tab.key] : [];
        record[tab.key] = normalizeGridRows(tab, raw.map(keepOrStrip));
      }
      if (tab.kind === 'master-grid') {
        const gkey = tab.grid?.key || tab.key || '_detail';
        const gtab = {
          kind: 'grid',
          key: gkey,
          fields: tab.grid?.fields || tab.detailFields || [],
          slots: tab.grid?.slots,
        };
        const raw = Array.isArray(src[gkey]) ? src[gkey] : [];
        record[gkey] = normalizeGridRows(gtab, raw.map(keepOrStrip));
      }
      if (tab.kind === 'bom-tree' || tab.kind === 'bom-workspace') {
        record.satirlar = Array.isArray(src.agac) && src.agac.length
          ? src.agac
          : (Array.isArray(src.satirlar) ? src.satirlar : []);
        ensureBomTree(record);
      }
      if (tab.kind === 'rota-flow' || tab.kind === 'rota-workspace') {
        record.operasyonlar = Array.isArray(src.operasyonlar)
          ? src.operasyonlar.map((op) => {
            const base = keepOrStrip(op);
            return {
              ...base,
              bilesenler: Array.isArray(op.bilesenler) ? op.bilesenler.map(keepOrStrip) : [],
              ekipmanlar: Array.isArray(op.ekipmanlar) ? op.ekipmanlar.map(keepOrStrip) : [],
            };
          })
          : [];
      }
    });
  }

  if (mode === 'yeni') {
    record = { ...(screen.defaults || {}) };
    if (screen.categoryKey && state.listCategory) {
      record[screen.categoryKey] = state.listCategory;
    }
    seedFields();
    if (adayPrefill && screen.id === 'siparis-is-emri') {
      Object.assign(record, {
        sales_order_id: adayPrefill.sales_order_id,
        item_id: adayPrefill.item_id,
        product_bom_id: adayPrefill.onerilen_agac_id || '',
        route_id: adayPrefill.onerilen_rota_id || '',
        planlanan_quantity: adayPrefill.remaining_quantity || adayPrefill.siparis_miktar || '',
      });
    }
    if (adayPrefill && screen.id === 'toplu-is-emri') {
      record.kalemler = [{
        sales_order_id: adayPrefill.sales_order_id,
        item_id: adayPrefill.item_id,
        product_bom_id: adayPrefill.onerilen_agac_id || '',
        route_id: adayPrefill.onerilen_rota_id || '',
        planlanan_quantity: adayPrefill.remaining_quantity || adayPrefill.siparis_miktar || '',
      }];
    }
    const seri = resolveNumeratorSeri(screen, record);
    if (seri && screen.codeField) {
      try {
        record[screen.codeField] = await ayirKod(seri);
        state.formNumeratorSeri = seri;
      } catch (err) { toast(err.message); }
    } else {
      state.formNumeratorSeri = null;
    }
    initSpecialTabs(adayPrefill && screen.id === 'toplu-is-emri' ? { kalemler: record.kalemler } : {});
  } else if (mode === 'kopyala') {
    const full = await loadRecord(row.id);
    record = { ...full };
    delete record.id;
    if (screen.nameField) record[screen.nameField] = '';
    const seri = resolveNumeratorSeri(screen, record);
    if (seri && screen.codeField) {
      try {
        record[screen.codeField] = await ayirKod(seri);
        state.formNumeratorSeri = seri;
      } catch (err) { toast(err.message); }
    } else {
      state.formNumeratorSeri = null;
    }
    initSpecialTabs(full);
  } else {
    const full = await loadRecord(row.id);
    record = { ...full };
    state.formNumeratorSeri = null;
    initSpecialTabs(full);
  }

  if (screen.id === 'numarator-tanimi' && (mode === 'yeni' || mode === 'kopyala')) {
    record.son_numara = 0;
    record.is_active = true;
    // Seri kodu kullanıcıdan yeniden alınır (PK)
    record.series_code = '';
  }

  if (screen.id === 'stok-karti') {
    hydrateStokFirmaIsYeri(record);
  }

  // İncele/Düzelt: API’de id yoksa codeField’dan kimlik (numaratör series_code vb.)
  // Yeni/Kopyala’da id ekleme — kayıt henüz kaydedilmedi
  if (mode === 'incele' || mode === 'duzelt') {
    ensureFormRecordId(screen, record);
  }
  state.formRecord = record;
  addFormTab(screen, mode, record);
  showView('form');
  ensureSearchBarVisible();
  $('#screenTitle').textContent = `${screen.title} · ${MODE_LABELS[mode]}`;
  renderForm(screen);
  renderTabBar();
}

function playNestedEnterAnimation() {
  const view = $('#viewForm');
  if (!view) return;
  view.classList.remove('nested-enter');
  // reflow
  void view.offsetWidth;
  view.classList.add('nested-enter');
  clearTimeout(playNestedEnterAnimation._t);
  playNestedEnterAnimation._t = setTimeout(() => view.classList.remove('nested-enter'), 420);
}

/**
 * Firma / iş yeri kaydından sonra aktif firma bağlamını güncelle.
 * Yoksa yenilemede X-Firma-Id eski firmada kalır, yeni kayıtlar listede görünmez.
 * Not: setActiveFirma tüm cache/sekmeleri siler — burada hafif güncelleme yapılır.
 */
async function syncActiveFirmaAfterOrgSave(screen, saved) {
  if (!saved) return;
  let nextFirmaId = null;
  if (screen.id === 'companies' && saved.id) {
    nextFirmaId = Number(saved.id);
    if (!state.companies?.some((c) => Number(c.id) === nextFirmaId)) {
      state.companies = [saved, ...(state.companies || [])];
      state.lookupCache.companies = state.companies;
    }
  } else if (screen.id === 'is-yerleri' && saved.company_id) {
    nextFirmaId = Number(saved.company_id);
  } else if (screen.id === 'warehouses' && saved.plant_id) {
    const plant = (state.lookupCache['is-yerleri'] || state.isYerleri || [])
      .find((p) => Number(p.id) === Number(saved.plant_id));
    if (plant?.company_id) nextFirmaId = Number(plant.company_id);
  }
  if (!nextFirmaId || Number(getActiveFirmaId()) === nextFirmaId) {
    renderFirmaPicker();
    return;
  }
  state.activeFirmaId = nextFirmaId;
  localStorage.setItem('ktb_firma_id', String(nextFirmaId));
  // Org lookup’larını taze tut; diğer cache’e dokunma
  delete state.lookupCache['is-yerleri'];
  delete state.lookupCache.warehouses;
  try {
    await loadIsYerleriForActiveFirma();
  } catch (_) { /* ignore */ }
  renderFirmaPicker();
}

/** Kayıt sonrası: stay = formda kal, close = listeye dön, new = yeni form */
async function finishSaveForm(screen, saved, after = 'stay') {
  const listScreenId = (screen.id === 'siparis-is-emri' || screen.id === 'toplu-is-emri')
    ? 'uretim-emirleri'
    : screen.id;
  const formKey = state.activeTabKey;
  const id = saved?.id ?? state.formRecord?.id ?? null;

  if (after === 'stay' && id != null && screen.id !== 'toplu-is-emri' && screen.id !== 'siparis-is-emri') {
    state.selectedId = id;
    if (!state.rows?.some((r) => String(r.id) === String(id))) {
      state.rows = [{ ...(saved || {}), id }, ...(state.rows || [])];
    } else {
      state.rows = state.rows.map((r) => (String(r.id) === String(id) ? { ...r, ...(saved || {}) } : r));
    }
    state.filtered = applyFilters(state.rows, screen);
    // Aynı sekmede Düzelt’e geç — yeni sekme açma
    let record = { ...(saved || {}), id };
    try {
      record = await api(`${screenApiBase(screen.endpoint)}/${id}`);
    } catch (_) { /* kaydedilen haliyle devam */ }
    state.formMode = 'duzelt';
    state.formRecord = record;
    state.formActiveTab = state.formActiveTab || screen.formTabs?.[0]?.id || null;
    const tab = state.openTabs.find((t) => t.key === formKey);
    if (tab) {
      tab.formMode = 'duzelt';
      tab.formRecord = record;
      const code = record?.[screen.codeField] || '';
      tab.title = code ? `${screen.title} · ${code}` : screen.title;
    }
    showView('form');
    ensureSearchBarVisible();
    const titleEl = $('#screenTitle');
    if (titleEl) titleEl.textContent = `${screen.title} · ${MODE_LABELS.duzelt}`;
    renderForm(screen);
    renderTabBar();
    return;
  }

  state.formMode = null;
  state.formRecord = null;
  state.openTabs = state.openTabs.filter((t) => t.key !== formKey);

  if (after === 'new') {
    if (leaveFormSolo(listScreenId)) return;
    if (listScreenId !== screen.id) {
      await openScreen(listScreenId);
    } else {
      state.screenId = screen.id;
      addListTab(screen, { activate: false });
    }
    await openForm('yeni', { inPlace: true });
    return;
  }

  // close → liste
  if (leaveFormSolo(listScreenId)) return;
  await openScreen(listScreenId);
}

async function saveForm({ after = 'stay' } = {}) {
  const screen = findScreen(state.screenId);
  if (!screen || state.formMode === 'incele') return;

  const master = readTabbedPayload(screen);

  // Stok kartı: master’daki firma / iş yeri zorunlu bağ
  if (screen.id === 'stok-karti') {
    syncStokFirmaIsYeriForSave(master);
  }

  // Kullanıcı kartı: giriş adı + şifre + yetki + profil
  if (screen.id === 'kullanicilar') {
    const adi = String(master.username || '').trim();
    if (adi && !master.user_code) master.user_code = adi;
    // DOM boş olsa bile input sırasında saklanan şifreyi kullan
    const sifreDom = String(document.querySelector('[data-master="sifre"]')?.value || '').trim();
    const sifreMem = String(master.sifre || state.formRecord?.sifre || '').trim();
    const sifre = sifreDom || sifreMem;
    if (sifre) master.sifre = sifre;
    else delete master.sifre;
    delete master.parola_var;
    delete master.parola_hash;
    delete master.refresh_token_hash;
    delete master.profil_var;
    master.yetkiler = readYetkiGridFromDom();
    master.firma_yetkileri = readFirmaYetkiFromDom();
    master.sql_permissions = readSqlYetkiFromDom();
    compressYetkilerForSave(master);
    if (state.formRecord && Object.prototype.hasOwnProperty.call(state.formRecord, 'profile_image')) {
      master.profile_image = state.formRecord.profile_image;
    }
  }

  const reqErr = validateRequired(screen, master);
  if (reqErr) {
    toast(reqErr);
    return;
  }

  // Bağlı ekrandan kayıt → source dönüşüm API'si
  if (state.nestedLink?.convertPath && state.formMode === 'yeni') {
    const nl = state.nestedLink;
    try {
      const path = nl.convertPath.replace('{id}', nl.fromId);
      const body = { ...(nl.extra || {}), ...master };
      if (nl.bodyKey) body[nl.bodyKey] = nl.fromId;
      // sevk: kalem miktarları
      if (nl.link === 'siparis-sevk' && Array.isArray(master.satirlar)) {
        body.miktarlar = {};
        master.satirlar.forEach((s) => {
          if (s.sales_order_line_id) body.miktarlar[s.sales_order_line_id] = s.quantity;
        });
      }
      const result = await api(path, { method: 'POST', body: JSON.stringify(body) });
      toast('Bağlı belge oluşturuldu.');
      invalidateLookups();
      state.nestedLink = null;
      const formKey = state.activeTabKey;
      state.formMode = null;
      state.formRecord = null;
      state.openTabs = state.openTabs.filter((t) => t.key !== formKey);
      const nextScreen = (result?.sales_order_id && screen.id === 'satis-siparisleri') ? 'satis-siparisleri'
        : (result?.order_no && screen.id === 'satin-alma-siparisleri') ? 'satin-alma-siparisleri'
        : (result?.shipment_no || (result?.id && screen.id === 'sevk-emirleri')) ? 'sevk-emirleri'
        : (result?.delivery_note_no || result?.uuid_ettn) ? 'irsaliye-yonetimi'
        : (result?.fatura?.id || result?.invoice_no || result?.invoice_type) ? 'fatura-yonetimi'
        : (result?.quotation_id || result?.quotation_no) ? 'satis-teklifleri'
        : screen.id;
      if (leaveFormSolo(nextScreen)) return;
      await openScreen(nextScreen);
      return;
    } catch (err) {
      toast(err.message || 'Bağlı kayıt başarısız');
      return;
    }
  }

  // Ürün ağacı: kayıt için iç içe alt_satirlar formatı
  if (screen.id === 'urun-agaci') {
    master.satirlar = flattenBomForSave(ensureBomTree(master));
    if (!master.satirlar.length) {
      toast('Ağaca en az bir bileşen ekleyin.');
      return;
    }
  }
  if (screen.id === 'routings') {
    master.operasyonlar = (master.operasyonlar || []).filter((o) => o.operation_code || o.operation_name);
    if (!master.operasyonlar.length) {
      toast('En az bir operasyon ekleyin.');
      return;
    }
    delete master._sablon_rota_id;
  }

  // Para birimi: sembol boşsa kodun aynısı
  if (screen.id === 'para-birimi-tanimi') {
    const kod = String(master.currency_code || '').trim();
    if (kod) master.currency_code = kod.toUpperCase();
    if (!String(master.sembol || '').trim() && master.currency_code) {
      master.sembol = master.currency_code;
    }
  }

  try {
    let saved = { ...master };
    if (screen.id === 'numarator-tanimi') {
      const onek = String(master.onek || '').trim().toUpperCase();
      master.onek = onek;
      if (!onek) {
        toast('Ön ek zorunludur.');
        return;
      }
      if (onek.length > 4) {
        toast('Ön ek en fazla 4 karakter olabilir.');
        return;
      }
      if (state.formMode === 'duzelt') {
        await api(`/kod-serileri/${encodeURIComponent(master.series_code)}`, {
          method: 'PUT',
          body: JSON.stringify(master),
        });
      } else {
        await api('/kod-serileri', { method: 'POST', body: JSON.stringify(master) });
      }
      toast('Kaydedildi.');
      invalidateLookupsForScreen(screen);
      await finishSaveForm(screen, saved, after === 'stay' ? 'close' : after);
      return;
    }

    if (state.formMode === 'duzelt') {
      const result = await api(`${screenApiBase(screen.endpoint)}/${master.id}`, {
        method: 'PUT',
        body: JSON.stringify(master),
      });
      saved = (result && typeof result === 'object') ? { ...master, ...result } : { ...master };
      toast('Kaydedildi.');
      invalidateLookupsForScreen(screen);
      await syncActiveFirmaAfterOrgSave(screen, saved);
      await finishSaveForm(screen, saved, after);
      return;
    }

    const postUrl = screen.createEndpoint || screenApiBase(screen.endpoint);
    let body = master;
    if (screen.id === 'toplu-is-emri') {
      body = {
        ortak: {
          order_type_id: master.order_type_id || null,
          plant_id: master.plant_id || null,
          component_warehouse_id: master.component_warehouse_id,
          fg_warehouse_id: master.fg_warehouse_id,
          wip_warehouse_id: master.wip_warehouse_id || null,
        },
        kalemler: (master.kalemler || []).filter((k) => k.item_id && k.sales_order_id),
      };
      if (!body.kalemler.length) {
        toast('En az bir kalem ekleyin.');
        return;
      }
    }
    const result = await api(postUrl, { method: 'POST', body: JSON.stringify(body) });
    invalidateLookupsForScreen(screen);
    if (screen.id === 'toplu-is-emri' && result?.olusturulan_sayisi) {
      toast(`${result.olusturulan_sayisi} iş emri oluşturuldu${result.hata_sayisi ? ` (${result.hata_sayisi} hata)` : ''}.`);
    } else if (screen.id === 'siparis-is-emri' && result?.order_no) {
      toast(`İş emri ${result.order_no} oluşturuldu.`);
    } else {
      toast('Kaydedildi.');
    }
    saved = (result && typeof result === 'object') ? { ...master, ...result } : { ...master };
    await syncActiveFirmaAfterOrgSave(screen, saved);
    // Toplu / sipariş→İE oluşturma: formda kalmak anlamsız → kapat
    const effectiveAfter = (screen.id === 'toplu-is-emri' || screen.id === 'siparis-is-emri')
      ? (after === 'new' ? 'new' : 'close')
      : after;
    await finishSaveForm(screen, saved, effectiveAfter);
  } catch (err) {
    toast(err.message);
  }
}

async function deleteSelected() {
  const screen = findScreen(state.screenId);
  const row = selectedRow();
  if (!screen || screen.readOnly || !row) {
    toast('Silmek için satır seçin.');
    return;
  }
  if (!ekranYetkisi(screen.id, 'sil')) {
    toast('Bu ekranda silme yetkiniz yok.');
    return;
  }
  if (screen.id === 'numarator-tanimi') {
    toast('Numaratör silinmez; pasife alın.');
    return;
  }
  if (!confirm(`${row[screen.codeField] || row.id} silinsin mi?`)) return;
  try {
    await api(`${screenApiBase(screen.endpoint)}/${row.id}`, { method: 'DELETE' });
    toast('Silindi.');
    invalidateLookupsForScreen(screen);
    state.selectedId = null;
    await openScreen(screen.id);
  } catch (err) {
    toast(err.message);
  }
}

function runSearch(q) {
  const box = $('#searchResults');
  const query = q.trim().toLocaleLowerCase('tr');
  if (query.length < 3) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const hits = ALL_SCREENS.filter((s) =>
    ekranMenuGorunurMu(s.id) && (
      s.title.toLocaleLowerCase('tr').includes(query) ||
      s.moduleTitle.toLocaleLowerCase('tr').includes(query) ||
      (s.techId && s.techId.toLocaleLowerCase('tr').includes(query)) ||
      (s.businessNameEn && s.businessNameEn.toLocaleLowerCase('en').includes(query))
    )
  ).slice(0, 12);
  if (!hits.length) {
    box.hidden = false;
    box.innerHTML = '<div class="search-empty">Eşleşen ekran yok.</div>';
    return;
  }
  box.hidden = false;
  box.innerHTML = hits.map((s) => `
    <button type="button" class="search-hit" data-screen="${s.id}" data-tech-id="${s.techId || ''}">
      <strong>${s.title}</strong>
      <span>${s.moduleTitle}${s.techId ? ' · ' + s.techId : ''}</span>
    </button>
  `).join('');
}


/* ========== Tablo Bilgileri / F1 / Form Bilgi menüsü ========== */
state.metaFocusScreenId = state.metaFocusScreenId || null;
state.metaNavCache = state.metaNavCache || null;
state.metaOpenMods = state.metaOpenMods || {};

function fmtMetaTs(v) {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  } catch (_) {
    return String(v);
  }
}

async function openMetaExplorer(focusScreenId) {
  const navBody = $('#metaNavBody');
  const detail = $('#metaDetail');
  if (!navBody || !detail) return;
  navBody.innerHTML = '<div class="meta-empty">Yükleniyor…</div>';
  detail.innerHTML = '<div class="meta-empty">Soldan bir ekran seçin.</div>';
  try {
    const data = await api('/meta/ekranlar');
    state.metaNavCache = data;
    renderMetaNav(data, focusScreenId);
    if (focusScreenId) {
      state.metaFocusScreenId = focusScreenId;
      await loadMetaScreenDetail(focusScreenId);
    }
  } catch (err) {
    navBody.innerHTML = `<div class="meta-empty">${escapeHtml(err.message || 'Yüklenemedi')}</div>`;
  }
}

function renderMetaNav(data, focusScreenId) {
  const navBody = $('#metaNavBody');
  if (!navBody) return;
  const q = String($('#metaNavSearch')?.value || '').trim().toLocaleLowerCase('tr');
  const modules = data?.modules || [];
  const html = modules.map((mod) => {
    let screens = mod.screens || [];
    if (q) {
      screens = screens.filter((s) =>
        s.title.toLocaleLowerCase('tr').includes(q)
        || s.screenId.includes(q)
        || (s.techId || '').toLocaleLowerCase('tr').includes(q)
        || (s.primaryTable || '').includes(q)
        || (s.tables || []).some((t) => String(t).includes(q))
      );
    }
    if (!screens.length) return '';
    const open = state.metaOpenMods[mod.id] !== false
      || screens.some((s) => s.screenId === focusScreenId);
    state.metaOpenMods[mod.id] = open;
    return `
      <div class="meta-mod ${open ? 'open' : ''}" data-meta-mod="${escAttr(mod.id)}">
        <button type="button" class="meta-mod-toggle" data-meta-mod-toggle="${escAttr(mod.id)}">
          <span>${escapeHtml(mod.title)}</span>
          <span class="meta-mod-count">${screens.length}</span>
        </button>
        <div class="meta-mod-screens" ${open ? '' : 'hidden'}>
          ${screens.map((s) => `
            <button type="button" class="meta-screen-item${s.screenId === focusScreenId ? ' active' : ''}"
              data-meta-screen="${escAttr(s.screenId)}">
              <strong>${escapeHtml(s.title)}</strong>
              <span>${escapeHtml(s.techId || s.screenId)}${s.primaryTable ? ' · ' + escapeHtml(s.primaryTable) : ''}</span>
            </button>
          `).join('')}
        </div>
      </div>`;
  }).join('');
  navBody.innerHTML = html || '<div class="meta-empty">Eşleşen ekran yok.</div>';
}

async function loadMetaScreenDetail(screenId) {
  const detail = $('#metaDetail');
  if (!detail) return;
  detail.innerHTML = '<div class="meta-empty">Yükleniyor…</div>';
  document.querySelectorAll('.meta-screen-item').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-meta-screen') === screenId);
  });
  try {
    const d = await api(`/meta/ekranlar/${encodeURIComponent(screenId)}`);
    state.metaFocusScreenId = screenId;
    detail.innerHTML = `
      <header class="meta-detail-head">
        <div>
          <h2>${escapeHtml(d.title)}</h2>
          <p class="meta-sub">
            <code>${escapeHtml(d.techId || '—')}</code>
            · route <code>#${escapeHtml(d.screenId)}</code>
            ${d.endpoint ? '· API <code>' + escapeHtml(d.endpoint) + '</code>' : ''}
          </p>
        </div>
        <button type="button" class="btn ghost sm" data-open-screen="${escAttr(d.screenId)}">Ekranı aç</button>
      </header>
      <p class="meta-hint">Aşağıda bu ekranın kullandığı tablo(lar) ve kolon adları listelenir. Formda bir alana tıklayıp <kbd>F1</kbd> ile de aynı bilgiyi görebilirsiniz.</p>
      ${(d.tables || []).map((t) => `
        <section class="meta-table-card">
          <h3>
            <code>${escapeHtml(t.name)}</code>
            <span class="meta-role">${t.role === 'master' ? 'Ana tablo' : 'İlgili tablo'}</span>
            <span class="meta-col-count">${t.columnCount} alan</span>
          </h3>
          <div class="table-scroll meta-cols-scroll">
            <table class="meta-cols">
              <thead><tr><th>Alan adı</th><th>Veri tipi</th><th>Null</th><th>Varsayılan</th></tr></thead>
              <tbody>
                ${(t.columns || []).map((c) => `
                  <tr>
                    <td><code>${escapeHtml(c.name)}</code></td>
                    <td>${escapeHtml(c.dataType)}${c.maxLength ? '(' + c.maxLength + ')' : ''}</td>
                    <td>${c.nullable ? 'Evet' : 'Hayır'}</td>
                    <td class="muted">${escapeHtml(c.defaultValue || '—')}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4">Kolon yok</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>
      `).join('') || '<div class="meta-empty">Bu ekran için tablo eşlemesi yok.</div>'}
    `;
  } catch (err) {
    detail.innerHTML = `<div class="meta-empty">${escapeHtml(err.message || 'Detay yüklenemedi')}</div>`;
  }
}

function bindMetaExplorerEvents() {
  const nav = $('#metaNav');
  if (nav && !nav.dataset.bound) {
    nav.dataset.bound = '1';
    nav.addEventListener('click', (e) => {
      const tog = e.target.closest('[data-meta-mod-toggle]');
      if (tog) {
        const id = tog.getAttribute('data-meta-mod-toggle');
        state.metaOpenMods[id] = !state.metaOpenMods[id];
        renderMetaNav(state.metaNavCache, state.metaFocusScreenId);
        return;
      }
      const item = e.target.closest('[data-meta-screen]');
      if (item) {
        loadMetaScreenDetail(item.getAttribute('data-meta-screen'));
        return;
      }
      const openScr = e.target.closest('[data-open-screen]');
      if (openScr) {
        openScreen(openScr.getAttribute('data-open-screen'));
      }
    });
  }
  const search = $('#metaNavSearch');
  if (search && !search.dataset.bound) {
    search.dataset.bound = '1';
    search.addEventListener('input', () => {
      if (state.metaNavCache) renderMetaNav(state.metaNavCache, state.metaFocusScreenId);
    });
  }
  const detail = $('#metaDetail');
  if (detail && !detail.dataset.bound) {
    detail.dataset.bound = '1';
    detail.addEventListener('click', (e) => {
      const openScr = e.target.closest('[data-open-screen]');
      if (openScr) openScreen(openScr.getAttribute('data-open-screen'));
    });
  }
}

function closeFieldHelp() {
  const dlg = $('#fieldHelpDialog');
  if (dlg) dlg.hidden = true;
}
function closeRecordInfo() {
  const dlg = $('#recordInfoDialog');
  if (dlg) dlg.hidden = true;
}

async function showFieldHelpForElement(el) {
  if (!el) return;
  const fieldEl = el.closest('[data-field-key], [data-master], [data-detail]');
  if (!fieldEl && !el.getAttribute?.('data-master') && !el.getAttribute?.('data-detail')) return;
  const key = fieldEl?.getAttribute('data-field-key')
    || el.getAttribute('data-master')
    || el.getAttribute('data-detail')
    || fieldEl?.querySelector?.('[data-master], [data-detail]')?.getAttribute('data-master')
    || fieldEl?.querySelector?.('[data-detail]')?.getAttribute('data-detail');
  const screen = findScreen(state.screenId);
  if (!screen || !key) {
    toast('Alan bilgisi için önce bir form alanı seçin.');
    return;
  }
  const body = $('#fieldHelpBody');
  const dlg = $('#fieldHelpDialog');
  if (!body || !dlg) return;
  body.innerHTML = '<p>Yükleniyor…</p>';
  dlg.hidden = false;
  try {
    const info = await api(`/meta/alan?screen=${encodeURIComponent(screen.id)}&field=${encodeURIComponent(key)}`);
    body.innerHTML = `
      <dl class="meta-dl">
        <dt>Ekran</dt><dd>${escapeHtml(info.screenTitle)} <code>${escapeHtml(info.techId || info.screenId)}</code></dd>
        <dt>Form alanı</dt><dd><code>${escapeHtml(info.fieldKey)}</code></dd>
        <dt>Tablo</dt><dd><code>${escapeHtml(info.tableName || '—')}</code> ${info.role === 'master' ? '(ana)' : info.found ? '' : ''}</dd>
        <dt>Kolon</dt><dd><code>${escapeHtml(info.columnName || '—')}</code></dd>
        <dt>Veri tipi</dt><dd>${escapeHtml(info.dataType || '—')}</dd>
      </dl>
      ${info.found === false ? `<p class="meta-warn">${escapeHtml(info.note || '')}</p>` : ''}
      <p class="meta-hint">İpucu: Tablo Bilgileri ekranından tüm alan listesine de ulaşabilirsiniz.</p>
    `;
  } catch (err) {
    body.innerHTML = `<p class="meta-warn">${escapeHtml(err.message || 'Alınamadı')}</p>`;
  }
}

async function showRecordInfo() {
  const screen = findScreen(state.screenId);
  const id = state.formRecord?.id || state.selectedId;
  const body = $('#recordInfoBody');
  const dlg = $('#recordInfoDialog');
  if (!body || !dlg) return;
  if (!screen) return toast('Ekran yok');
  if (!id) {
    body.innerHTML = '<p class="meta-warn">Kayıt bilgisi için önce kayıtlı bir belge/kart açın (yeni kayıtta oluşturan bilgisi henüz yoktur).</p>';
    dlg.hidden = false;
    return;
  }
  body.innerHTML = '<p>Yükleniyor…</p>';
  dlg.hidden = false;
  try {
    const info = await api(`/meta/kayit-bilgi?screen=${encodeURIComponent(screen.id)}&id=${encodeURIComponent(id)}`);
    body.innerHTML = `
      <dl class="meta-dl">
        <dt>Ekran</dt><dd>${escapeHtml(info.screenTitle)} <code>${escapeHtml(info.techId || info.screenId)}</code></dd>
        <dt>Kayıt no (id)</dt><dd><code>${escapeHtml(info.recordId)}</code></dd>
        <dt>Ana tablo</dt><dd><code>${escapeHtml(info.primaryTable || '—')}</code></dd>
        <dt>Oluşturan</dt><dd>${escapeHtml(info.created_by || '—')}</dd>
        <dt>Oluşturma</dt><dd>${escapeHtml(fmtMetaTs(info.olusturmaTarihi))}</dd>
        <dt>Son güncelleyen</dt><dd>${escapeHtml(info.guncelleyen || '—')}</dd>
        <dt>Son güncelleme</dt><dd>${escapeHtml(fmtMetaTs(info.guncellemeTarihi))}</dd>
      </dl>
      <p class="meta-hint">Bilgi satırdaki denetim kolonlarından ve audit log özetinden derlenir.</p>
    `;
  } catch (err) {
    body.innerHTML = `<p class="meta-warn">${escapeHtml(err.message || 'Alınamadı')}</p>`;
  }
}

function toggleFormInfoMenu(force) {
  const menu = $('#formInfoMenu');
  const btn = $('#btnFormCancel');
  if (!menu || !btn) return;
  const open = force != null ? force : menu.hidden;
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

async function formInfoAction(act) {
  toggleFormInfoMenu(false);
  const screen = findScreen(state.screenId);
  if (!screen) return;
  if (act === 'kayit') {
    await showRecordInfo();
    return;
  }
  if (act === 'ekran') {
    openScreenInNewBrowserTab('tablo-bilgileri', { focusScreenId: screen.id });
    return;
  }
  if (act === 'log') {
    let auditTablo = null;
    try {
      const meta = await api(`/meta/audit-anahtar/${encodeURIComponent(screen.id)}`);
      auditTablo = meta.auditTablo || null;
    } catch (_) { /* ignore */ }
    const filterState = {
      table_name: auditTablo ? { op: 'esit', a: String(auditTablo), b: '' } : { op: 'icerir', a: '', b: '' },
      ekran: { op: 'icerir', a: String(auditTablo || screen.id), b: '' },
    };
    openScreenInNewBrowserTab('audit-log', {
      filterState,
      banner: `Audit Log — ${screen.title}${auditTablo ? ' · ' + auditTablo : ''}`,
    });
  }
}

function bindMetaHelpGlobal() {
  if (window.__ktbMetaHelpBound) return;
  window.__ktbMetaHelpBound = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'F1' && e.code !== 'F1') return;
    const viewForm = $('#viewForm');
    if (!viewForm || viewForm.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    const el = document.activeElement;
    showFieldHelpForElement(el);
  }, true);
  // Alan etiketine çift tıklama da F1 ile aynı yardımı açar
  document.addEventListener('dblclick', (e) => {
    const viewForm = $('#viewForm');
    if (!viewForm || viewForm.hidden) return;
    const field = e.target.closest?.('[data-field-key], [data-master], [data-detail]');
    if (!field) return;
    const ctl = field.matches('[data-master], [data-detail]')
      ? field
      : field.querySelector('[data-master], [data-detail]');
    showFieldHelpForElement(ctl || field);
  });
  document.addEventListener('click', (e) => {
    const wrap = $('#formInfoWrap');
    const menu = $('#formInfoMenu');
    if (!wrap || !menu || menu.hidden) return;
    if (!wrap.contains(e.target)) toggleFormInfoMenu(false);
  });
  $('#fieldHelpClose')?.addEventListener('click', closeFieldHelp);
  $('#fieldHelpOk')?.addEventListener('click', closeFieldHelp);
  $('#recordInfoClose')?.addEventListener('click', closeRecordInfo);
  $('#recordInfoOk')?.addEventListener('click', closeRecordInfo);
  $('#fieldHelpDialog')?.addEventListener('click', (e) => {
    if (e.target.id === 'fieldHelpDialog') closeFieldHelp();
  });
  $('#recordInfoDialog')?.addEventListener('click', (e) => {
    if (e.target.id === 'recordInfoDialog') closeRecordInfo();
  });
}

function bindEvents() {
  bindMetaExplorerEvents();
  bindMetaHelpGlobal();
  bindLookupBrowseUi();
  const nav = $('#sidebarNav');
  if (nav && !nav.dataset.bound) {
    nav.dataset.bound = '1';
    nav.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-mod-toggle]');
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        const modId = toggle.getAttribute('data-mod-toggle');
        state.sidebarOpen = state.sidebarOpen || {};
        state.sidebarOpen[modId] = !state.sidebarOpen[modId];
        renderSidebar();
        return;
      }
      const secToggle = e.target.closest('[data-section-toggle]');
      if (secToggle) {
        e.preventDefault();
        e.stopPropagation();
        const secKey = secToggle.getAttribute('data-section-toggle');
        state.sidebarSectionOpen = state.sidebarSectionOpen || {};
        state.sidebarSectionOpen[secKey] = !state.sidebarSectionOpen[secKey];
        renderSidebar();
        return;
      }
      const screenBtn = e.target.closest('[data-screen]');
      if (!screenBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = screenBtn.getAttribute('data-screen');
      openScreen(id);
    });
  }

  const tabBar = $('#tabBar');
  if (tabBar && !tabBar.dataset.bound) {
    tabBar.dataset.bound = '1';
    tabBar.addEventListener('contextmenu', (e) => {
      const tabBtn = e.target.closest('[data-tab-key]');
      if (!tabBtn || !tabBar.contains(tabBtn)) return;
      e.preventDefault();
      e.stopPropagation();
      showTabContextMenu(tabBtn.getAttribute('data-tab-key'), e.clientX, e.clientY);
    });
  }

  // Liste satırı sağ tık — ekran contextMenu (depo bakiye → stok hareketleri)
  const dataBody = $('#dataBody');
  if (dataBody && !dataBody.dataset.ctxBound) {
    dataBody.dataset.ctxBound = '1';
    dataBody.addEventListener('contextmenu', (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const screen = findScreen(state.screenId);
      if (!screen?.contextMenu?.length) return;
      e.preventDefault();
      e.stopPropagation();
      state.selectedId = tr.getAttribute('data-id');
      document.querySelectorAll('#dataBody tr.selected').forEach((x) => x.classList.remove('selected'));
      tr.classList.add('selected');
      updateActionButtons(screen);
      showListContextMenu(screen, e.clientX, e.clientY);
    });
  }

  const tabCtx = $('#tabCtxMenu');
  if (tabCtx && !tabCtx.dataset.bound) {
    tabCtx.dataset.bound = '1';
    tabCtx.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab-ctx]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const action = btn.getAttribute('data-tab-ctx');
      const key = state.tabCtxKey;
      hideTabContextMenu();
      if (!key && action !== 'close-all') return;
      if (action === 'close') closeOpenTab(key);
      else if (action === 'refresh') refreshTab(key).catch((err) => toast(err.message));
      else if (action === 'close-all') closeAllTabs();
    });
  }

  // Sağ tık menüsü: yalnızca sol tık / menü dışı kapatır (contextmenu sonrası click menüyü düşürmesin)
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('#tabCtxMenu')) return;
    hideTabContextMenu();
  }, true);

  document.addEventListener('click', (e) => {
    const screenBtn = e.target.closest('[data-screen]');
    if (screenBtn) {
      // sidebar kendi handler'ında; arama sonuçları burada
      if (screenBtn.closest('#sidebarNav')) return;
      e.preventDefault();
      openScreen(screenBtn.getAttribute('data-screen'));
      return;
    }

    const actionBtn = e.target.closest('#actionBar [data-action]');
    if (actionBtn && !actionBtn.disabled) {
      const act = actionBtn.dataset.action;
      if (act === 'sil') deleteSelected();
      else if (act === 'export-csv') exportListCsv();
      else if (act === 'mrp-talep') mrpTalepOlustur().catch((err) => toast(err.message));
      else if (act === 'mrp-uretim') mrpUretimOlustur().catch((err) => toast(err.message));
      else if (act === 'mrp-calistir') mrpCalistirKaydet().catch((err) => toast(err.message));
      else if (act === 'incele' && state.screenId === 'mrp-calisma') {
        const sel = selectedRow();
        if (sel?.id) {
          state.mrpCalismaId = sel.id;
          openScreen('mrp-sonuclar');
        } else toast('Önce bir MRP çalışması seçin.');
      } else openForm(act).catch((err) => toast(err.message));
      return;
    }

    const row = e.target.closest('#dataBody tr[data-id]');
    if (row) {
      const screen = findScreen(state.screenId);
      // Listeyi yeniden çizme — metin seçimi / kopyala-yapıştır bozulmasın
      const newId = row.dataset.id;
      if (String(state.selectedId) !== String(newId)) {
        state.selectedId = newId;
        document.querySelectorAll('#dataBody tr.selected').forEach((tr) => tr.classList.remove('selected'));
        row.classList.add('selected');
        if (screen) updateActionButtons(screen);
      }
      if (e.detail >= 2) {
        if (screen?.id === 'mrp-calisma') {
          state.mrpCalismaId = Number(row.dataset.id) || row.dataset.id;
          openScreen('mrp-sonuclar');
        } else {
          openForm(screen?.readOnly ? 'incele' : 'duzelt').catch((err) => toast(err.message));
        }
      }
      return;
    }

    const tabClose = e.target.closest('[data-tab-close-key]');
    if (tabClose) {
      e.preventDefault();
      e.stopPropagation();
      hideTabContextMenu();
      closeOpenTab(tabClose.getAttribute('data-tab-close-key'));
      return;
    }

    const tabBtn = e.target.closest('[data-tab-key]');
    if (tabBtn) {
      e.preventDefault();
      activateTab(tabBtn.getAttribute('data-tab-key')).catch((err) => toast(err.message));
      return;
    }

    const wrap = $('#homeSearchWrap');
    if (wrap && !wrap.contains(e.target)) $('#searchResults').hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTabContextMenu();
  });

  // Form ctx menü dışına tıklanınca kapat (list/tab ile aynı)
  document.addEventListener('click', (e) => {
    const formMenu = $('#formCtxMenu');
    if (formMenu && !formMenu.hidden && !e.target.closest('#formCtxMenu')) {
      formMenu.hidden = true;
    }
  }, true);

  $('#btnHome').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showHome();
  });

  $('#firmaPickerBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const menu = $('#firmaPickerMenu');
    const btn = $('#firmaPickerBtn');
    if (!menu || !btn) return;
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $('#firmaPickerMenu')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-firma-id]');
    if (!btn) return;
    e.preventDefault();
    setActiveFirma(btn.getAttribute('data-firma-id'));
  });
  document.addEventListener('click', (e) => {
    const picker = $('#firmaPicker');
    if (picker && !picker.contains(e.target)) closeFirmaPicker();
    const userArea = $('#userProfileArea');
    if (userArea && !userArea.contains(e.target)) closeUserChipMenu();
  });

  const userChip = $('#userChip');
  if (userChip && !userChip.dataset.bound) {
    userChip.dataset.bound = '1';
    userChip.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openUserChipMenu(e.clientX, e.clientY);
    });
    // Sol tık da menüyü açsın (dokunmatik / keşfedilebilirlik)
    userChip.addEventListener('click', (e) => {
      e.preventDefault();
      const menu = $('#userChipMenu');
      if (menu && !menu.hidden) closeUserChipMenu();
      else openUserChipMenu(e.clientX, e.clientY);
    });
  }
  $('#userChipMenu')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-user-action]');
    if (!btn) return;
    e.preventDefault();
    const act = btn.getAttribute('data-user-action');
    if (act === 'logout') logoutUser();
    else if (act === 'login') showLoginView();
  });

  const loginForm = $('#loginForm');
  if (loginForm && !loginForm.dataset.bound) {
    loginForm.dataset.bound = '1';
    loginForm.addEventListener('submit', submitLoginForm);
    $('#loginPassToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleLoginPasswordVisibility();
    });
    $('#loginRemember')?.addEventListener('change', () => {
      if (!isLoginRememberOn()) {
        localStorage.removeItem('ktb_remember_me');
        localStorage.removeItem('ktb_remember_user');
      } else {
        localStorage.setItem('ktb_remember_me', '1');
        const u = ($('#loginUser')?.value || '').trim();
        if (u) localStorage.setItem('ktb_remember_user', u);
      }
    });
    $('#loginLdapToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      const btn = $('#loginLdapToggle');
      if (!btn || btn.disabled) return;
      const next = btn.getAttribute('aria-checked') !== 'true';
      if (next && btn.dataset.ldapAvailable !== '1') {
        setLoginError(btn.dataset.ldapMessage
          || 'LDAP kullanılamıyor. Sistem Parametreleri’nde LDAP_ENABLED=Evet ve LDAP_URL / UPN ayarlayın.');
        setLoginLdapMode(false);
        return;
      }
      setLoginError('');
      setLoginLdapMode(next);
    });
    applyLoginRememberUi();
    refreshLoginLdapStatus().catch(() => {});
    syncLoginPassEye();
  }

  $('#btnMenu').addEventListener('click', () => {
    const shell = $('#appShell');
    const sidebar = $('#sidebar');
    if (window.matchMedia('(max-width: 900px)').matches) {
      sidebar.classList.toggle('open');
    } else {
      shell.classList.toggle('sidebar-collapsed');
    }
  });

  $('#btnSidebarLocate')?.addEventListener('click', (e) => {
    e.preventDefault();
    sidebarLocateActive();
  });
  $('#btnSidebarExpand')?.addEventListener('click', (e) => {
    e.preventDefault();
    sidebarExpandAll();
  });
  $('#btnSidebarCollapse')?.addEventListener('click', (e) => {
    e.preventDefault();
    sidebarCollapseAll();
  });
  $('#btnOpenTabs')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!(state.openTabs?.length > 0)) {
      toast('Açık sekme yok');
      return;
    }
    toggleDocTabs();
  });

  $('#btnApplyFilter').addEventListener('click', async () => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    readFilterState(screen);
    // queryParam filtreleri sunucuya gider — listeyi yeniden yükle
    if ((screen.filters || []).some((f) => f.queryParam)) {
      try {
        $('#listMeta').textContent = 'Yükleniyor…';
        const data = await api(buildListEndpoint(screen));
        state.rows = ensureRowIds(Array.isArray(data) ? data : []);
        state.filtered = applyFilters(state.rows, screen);
        state.selectedId = null;
        renderList(screen);
      } catch (err) {
        toast(err.message || 'Filtre uygulanamadı');
      }
      return;
    }
    // Patlatma: quantity sunucuda çarpılır — filtreyle API’yi yeniden çağır
    if (screen.id === 'bom-patlatma') {
      try {
        $('#listMeta').textContent = 'Patlatılıyor…';
        const qs = new URLSearchParams();
        const st = state.filterState || {};
        const pick = (k) => String(st[k]?.a || '').trim();
        if (pick('agac_id')) qs.set('agac_id', pick('agac_id'));
        if (pick('finished_good_item_id')) qs.set('finished_good_item_id', pick('finished_good_item_id'));
        if (pick('bom_code')) qs.set('bom_code', pick('bom_code'));
        const quantity = pick('quantity');
        if (quantity) qs.set('quantity', quantity);
        const data = await api(`${screen.endpoint}?${qs.toString()}`);
        state.rows = ensureRowIds(Array.isArray(data) ? data : []);
        // Sunucu filtreleri satır alanı değil — yalnız bileşen stok kodu client süzülür
        const stokQ = pick('item_code').toLocaleLowerCase('tr');
        state.filtered = stokQ
          ? state.rows.filter((r) => String(r.item_code || '').toLocaleLowerCase('tr').includes(stokQ))
          : state.rows.slice();
        state.selectedId = null;
        renderList(screen);
        const banner = $('#screenBanner');
        if (banner) {
          banner.textContent = `${screen.title} — ${state.filtered.length} satır patlatıldı`
            + (quantity ? ` (mamul × ${quantity})` : '');
        }
      } catch (err) {
        toast(err.message || 'Patlatma başarısız');
      }
      return;
    }
    state.filtered = applyFilters(state.rows, screen);
    state.selectedId = null;
    renderList(screen);
  });

  $('#btnClearFilter').addEventListener('click', async () => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    state.filterState = buildDefaultFilterState(screen);
    renderFilterPane(screen);
    if (screen.id === 'bom-patlatma') {
      try {
        const data = await api(screen.endpoint);
        state.rows = ensureRowIds(Array.isArray(data) ? data : []);
      } catch (err) {
        toast(err.message || 'Liste yenilenemedi');
      }
    }
    state.filtered = applyFilters(state.rows, screen);
    state.selectedId = null;
    renderList(screen);
  });

  $('#btnFormCancel').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFormInfoMenu();
  });
  $('#formInfoMenu')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-info-act]');
    if (!btn) return;
    formInfoAction(btn.getAttribute('data-info-act'));
  });

  $('#btnFormSave')?.addEventListener('click', () => {
    saveForm({ after: 'stay' }).catch((err) => toast(err.message));
  });
  $('#btnFormSaveClose')?.addEventListener('click', () => {
    saveForm({ after: 'close' }).catch((err) => toast(err.message));
  });
  $('#btnFormSaveNew')?.addEventListener('click', () => {
    saveForm({ after: 'new' }).catch((err) => toast(err.message));
  });

  $('#formCrudActions')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-form-act]');
    if (!btn || btn.disabled || btn.hidden) return;
    e.preventDefault();
    formCrudAction(btn.getAttribute('data-form-act')).catch((err) => toast(err.message));
  });

  // Form boş alanına sağ tık → belge kaynağı / sonraki işlem
  const viewFormEl = $('#viewForm');
  viewFormEl?.addEventListener('contextmenu', (e) => {
    if (!state.formMode) return;
    // Input/lookup içinde tarayıcı menüsü kalsın
    if (e.target.closest('input, textarea, select, button, a, .lookup-panel, .tab-ctx-menu')) return;
    e.preventDefault();
    showFormContextMenu(e.clientX, e.clientY).catch((err) => toast(err.message));
  });

  function exportListCsv() {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    const cols = (typeof listColumns === 'function' ? listColumns(screen) : screen.columns) || [];
    const rows = state.filtered || [];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      cols.map((c) => esc(c.label)).join(';'),
      ...rows.map((r, i) => cols.map((c) => {
        const key = c.key === 'id' ? (typeof rowKey === 'function' ? rowKey(r, i) : r.id) : r[c.key];
        return esc(key);
      }).join(';')),
    ];
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${screen.id || 'liste'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('CSV indirildi.');
  }

  async function mrpTalepOlustur() {
    const screen = findScreen(state.screenId);
    const sel = selectedRow();
    const body = {};
    if (sel?.item_id) body.stok_idler = [sel.item_id];
    if (screen?.mrpSonucMode && state.mrpCalismaId) body.run_id = state.mrpCalismaId;
    if (getActiveFirmaId()) body.company_id = getActiveFirmaId();
    if (state.activeIsYeriId) body.plant_id = state.activeIsYeriId;
    const result = await api('/mrp/talep-olustur', { method: 'POST', body: JSON.stringify(body) });
    toast(`SA talep oluştu: ${result.requisition_no || result.id}`);
    openScreen('satin-alma-talepleri');
  }

  async function mrpUretimOlustur() {
    const screen = findScreen(state.screenId);
    const sel = selectedRow();
    const body = {};
    if (sel?.item_id) body.stok_idler = [sel.item_id];
    if (screen?.mrpSonucMode && state.mrpCalismaId) body.run_id = state.mrpCalismaId;
    if (getActiveFirmaId()) body.company_id = getActiveFirmaId();
    if (state.activeIsYeriId) body.plant_id = state.activeIsYeriId;
    const result = await api('/mrp/uretim-emri-olustur', { method: 'POST', body: JSON.stringify(body) });
    toast(`${result.olusan || 0} üretim emri oluştu`);
    openScreen('uretim-emirleri');
  }

  async function mrpCalistirKaydet() {
    const body = {
      description: 'UI MRP çalışması',
      company_id: getActiveFirmaId() || null,
      plant_id: state.activeIsYeriId || null,
    };
    const result = await api('/mrp/calistir', { method: 'POST', body: JSON.stringify(body) });
    state.mrpCalismaId = result.calisma?.id || null;
    toast(`MRP tamam: ${result.calisma?.run_no || ''} · net>0: ${result.calisma?.net_pozitif ?? '?'}`);
    openScreen('mrp-sonuclar');
  }

  const btnSecondary = $('#btnFormSecondary');
  if (btnSecondary) {
    btnSecondary.addEventListener('click', async () => {
      const screen = findScreen(state.screenId);
      const rec = state.formRecord;
      if (!screen || !rec?.id) return;
      const kind = btnSecondary.dataset.secKind;
      try {
        if (kind === 'approve' && screen.approveAction) {
          const bodyExtra = await openConvertDialog(screen.approveAction, rec, 'approve');
          if (bodyExtra === null) return;
          const path = screen.approveAction.path.replace('{id}', rec.id);
          const result = await api(path, { method: 'POST', body: JSON.stringify(bodyExtra || {}) });
          toast(screen.approveAction.label + ' tamam.');
          state.formRecord = result;
          renderForm(screen);
        } else if (kind === 'kk-red') {
          const path = `/kk-emirleri/${rec.id}/reddet`;
          const result = await api(path, { method: 'POST', body: JSON.stringify({}) });
          toast('Reddedildi.');
          state.formRecord = result;
          renderForm(screen);
        } else if (kind === 'onay-red') {
          const gerekce = window.prompt('Red gerekçesi (opsiyonel):', '') ?? null;
          if (gerekce === null) return;
          const path = `/onay-kayitlari/${rec.id}/reddet`;
          const result = await api(path, { method: 'POST', body: JSON.stringify({ notlar: gerekce }) });
          toast('Onay reddedildi.');
          state.formRecord = result;
          renderForm(screen);
        } else if (kind === 'secondary' && screen.secondaryAction?.openScreen) {
          openScreen(screen.secondaryAction.openScreen);
        } else if (kind === 'baslat' && screen.secondaryAction?.path) {
          const path = screen.secondaryAction.path.replace('{id}', rec.id);
          const result = await api(path, { method: 'POST', body: JSON.stringify({}) });
          toast(screen.secondaryAction.label + ' tamam.');
          state.formRecord = result;
          renderForm(screen);
        }
      } catch (err) {
        toast(err.message || 'İşlem başarısız');
      }
    });
  }

  const btnDetailFill = $('#btnFormDetailFill');
  if (btnDetailFill) {
    btnDetailFill.addEventListener('click', async () => {
      const screen = findScreen(state.screenId);
      const rec = state.formRecord;
      if (!screen?.detailFillAction || !rec?.id) return;
      if (!window.confirm('Malzeme ve rota satırları ürün ağacı + rotadan yeniden doldurulacak. Devam?')) return;
      try {
        const path = screen.detailFillAction.path.replace('{id}', rec.id);
        const result = await api(path, { method: 'POST', body: JSON.stringify({}) });
        const nMal = result._doldurulan?.malzeme ?? (result.malzemeler || []).length;
        const nOp = result._doldurulan?.operasyon ?? (result.operasyonlar || []).length;
        toast(`${screen.detailFillAction.label}: ${nMal} malzeme, ${nOp} operasyon.`);
        state.formRecord = result;
        renderForm(screen);
      } catch (err) {
        toast(err.message || 'Detay doldurma başarısız');
      }
    });
  }

  const btnBomRota = $('#btnFormBomRota');
  if (btnBomRota) {
    btnBomRota.addEventListener('click', async () => {
      const screen = findScreen(state.screenId);
      const rec = state.formRecord;
      if (!screen?.bomRotaChangeAction || !rec?.id) return;
      const master = readMasterFromForm(screen);
      const urunAgaciId = master.product_bom_id ?? rec.product_bom_id;
      const rotaId = master.route_id ?? rec.route_id;
      if (!urunAgaciId && !rotaId) {
        toast('Ürün ağacı veya rota seçin.');
        return;
      }
      if (!window.confirm('Formdaki ürün ağacı / rota emre uygulanacak; malzemeler ve operasyonlar yenilenecek. Devam?')) return;
      try {
        const path = screen.bomRotaChangeAction.path.replace('{id}', rec.id);
        const result = await api(path, {
          method: 'POST',
          body: JSON.stringify({
            product_bom_id: urunAgaciId || undefined,
            route_id: rotaId || undefined,
            detaylari_doldur: true,
          }),
        });
        toast(screen.bomRotaChangeAction.label + ' tamam.');
        state.formRecord = result;
        renderForm(screen);
      } catch (err) {
        toast(err.message || 'BOM/rota uygulaması başarısız');
      }
    });
  }

  const btnConvert = $('#btnFormConvert');
  if (btnConvert) {
    btnConvert.addEventListener('click', async () => {
      const screen = findScreen(state.screenId);
      const rec = state.formRecord;
      if (!screen || !rec?.id) return;
      const kind = btnConvert.dataset.convertKind || 'convert';
      const act = kind === 'approve' ? screen.approveAction : screen.convertAction;
      if (!act) return;
      try {
        const bodyExtra = await openConvertDialog(act, rec, kind);
        if (bodyExtra === null) return;

        // Bağlı ekran: iç içe yeni form (onay API'si hariç)
        if (kind !== 'approve' && act.nested?.screenId && act.nested?.link) {
          await openLinkedForm({
            targetScreenId: act.nested.screenId,
            link: act.nested.link,
            sourceRec: rec,
            convertAct: act,
            extra: bodyExtra || {},
          });
          return;
        }

        let path = act.path.replace('{id}', rec.id);
        let body = { ...bodyExtra };
        if (act.bodyKey) body[act.bodyKey] = rec.id;
        const result = await api(path, { method: 'POST', body: JSON.stringify(body) });
        invalidateLookups();
        if (result?.stok_uyari?.length) {
          toast('Uyarı: bazı kalemlerde depo bakiyesi yetersiz olabilir.');
        }
        if (kind === 'approve') {
          toast(act.label + ' tamam.');
          state.formRecord = result;
          renderForm(screen);
        } else if (act.openTarget?.screenId && result?.fatura?.id) {
          toast(result.message || 'Fatura ekranına yönlendiriliyorsunuz');
          await openRecordById(act.openTarget.screenId, result.fatura.id, act.openTarget.mode || 'duzelt');
        } else if (result?.sales_order_id) {
          toast(act.label + ' tamam.');
          openScreen('satis-siparisleri');
        } else if (result?.shipment_no) {
          toast(act.label + ' tamam.');
          openScreen('sevk-emirleri');
        } else if (result?.delivery_note_no || result?.uuid_ettn) {
          toast(act.label + ' tamam.');
          openScreen('irsaliye-yonetimi');
        } else if (result?.fatura?.id) {
          toast(result.message || 'Fatura ekranına yönlendiriliyorsunuz');
          await openRecordById('fatura-yonetimi', result.fatura.id, 'duzelt');
        } else if (result?.quotation_id || result?.quotation_no) {
          toast(act.label + ' tamam.');
          openScreen('satis-teklifleri');
        } else if (result?.cari?.id || result?.aday) {
          toast(act.label + ' tamam.');
          openScreen('cari-kartlari');
        } else if (result?.faaliyet?.id || (screen.id === 'crm-faaliyet-planlari' && result?.ok)) {
          toast(act.label + ' tamam.');
          openScreen('crm-faaliyetler');
        } else if (result?.order_no && screen.id === 'satin-alma-teklifleri') {
          toast(act.label + ' tamam.');
          openScreen('satin-alma-siparisleri');
        } else if (result?.invoice_type || (result?.goods_receipt_id && result?.invoice_no)) {
          toast(act.label + ' tamam.');
          openScreen('fatura-yonetimi');
        } else {
          toast(act.label + ' tamam.');
          openScreen(screen.id);
        }
      } catch (err) {
        const msg = err.message || 'Dönüşüm başarısız';
        toast(msg);
        if (err.payload?.depo_kontrol) {
          const satirlar = err.payload.depo_kontrol.satirlar || [];
          const det = satirlar.filter((s) => !s.yeterli).map((s) => {
            const onr = (s.onerilen_depolar || []).map((o) => o.warehouse_code).join(',') || '—';
            return `${s.item_code || s.item_id}: bakiye ${s.bakiye} / ${s.quantity} → öneri ${onr}`;
          }).join('\n');
          if (det) showConvertWarn(det);
        }
      }
    });
  }

  $('#cvtClose')?.addEventListener('click', () => closeConvertDialog(null));
  $('#cvtCancel')?.addEventListener('click', () => closeConvertDialog(null));

  document.addEventListener('click', (e) => {
    const screen = findScreen(state.screenId);

    const listCat = e.target.closest('[data-list-cat]');
    if (listCat && screen?.listCategories) {
      e.preventDefault();
      state.listCategory = listCat.getAttribute('data-list-cat');
      state.selectedId = null;
      // Yeni kayıtta belge tipini önceden seçili kategoriye bağla
      renderList(screen);
      return;
    }

    // --- Detay grid: seç / Yeni / Düzelt / Sil ---
    const gridAct = e.target.closest('[data-grid-act]');
    if (gridAct && screen) {
      e.preventDefault();
      e.stopPropagation();
      const key = gridAct.getAttribute('data-grid-key');
      const act = gridAct.getAttribute('data-grid-act');
      const tab = resolveGridTab(screen, key);
      if (!tab) return;
      // Master alanları koru; grid satırlarını boş diye silme
      const masterSnap = readMasterFromForm(screen);
      state.formRecord = { ...(state.formRecord || {}), ...masterSnap };
      let rows = Array.isArray(state.formRecord[key]) ? state.formRecord[key].map((r) => ({ ...r })) : [];
      if (state.gridSel.key === key && state.gridSel.idx != null && rows[state.gridSel.idx]) {
        const { row } = syncGridRowFromDom(tab, state.gridSel.idx, rows[state.gridSel.idx]);
        rows[state.gridSel.idx] = row;
      }
      if (act === 'yeni') {
        rows.forEach((r) => { if (r) r._satir_duzenleniyor = false; });
        const blank = emptyRowFromFields(tab.fields);
        blank._satir_kayitli = false;
        blank._satir_duzenleniyor = true;
        rows.push(blank);
        state.formRecord[key] = rows;
        state.gridSel = { key, idx: rows.length - 1 };
      } else if (act === 'duzelt') {
        if (state.gridSel.key !== key || state.gridSel.idx == null) {
          toast('Düzeltmek için önce bir satır seçin.');
          return;
        }
        rows.forEach((r, i) => {
          if (!r) return;
          r._satir_duzenleniyor = i === state.gridSel.idx;
        });
        state.formRecord[key] = rows;
      } else if (act === 'sil') {
        if (state.gridSel.key !== key || state.gridSel.idx == null) {
          toast('Silmek için önce bir satır seçin.');
          return;
        }
        rows.splice(state.gridSel.idx, 1);
        state.formRecord[key] = rows;
        state.gridSel = { key: null, idx: null };
      }
      renderForm(screen);
      return;
    }

    // Satır düzeyinde Kaydet / Kopyala / Sil
    const rowAct = e.target.closest('[data-row-act]');
    if (rowAct && screen) {
      e.preventDefault();
      e.stopPropagation();
      const key = rowAct.getAttribute('data-grid-key');
      const idx = Number(rowAct.getAttribute('data-grid-idx'));
      const act = rowAct.getAttribute('data-row-act');
      const tab = resolveGridTab(screen, key);
      if (!tab) return;
      const masterSnap = readMasterFromForm(screen);
      state.formRecord = { ...(state.formRecord || {}), ...masterSnap };
      let rows = Array.isArray(state.formRecord[key]) ? state.formRecord[key].map((r) => ({ ...r })) : [];
      // Aktif satır DOM’dan oku (manuel yazılan değerler kaybolmasın)
      if (rows[idx]) {
        const { row } = syncGridRowFromDom(tab, idx, rows[idx]);
        rows[idx] = row;
      } else if (state.gridSel.key === key && state.gridSel.idx != null && rows[state.gridSel.idx]) {
        const { row } = syncGridRowFromDom(tab, state.gridSel.idx, rows[state.gridSel.idx]);
        rows[state.gridSel.idx] = row;
      }
      if (act === 'duzelt') {
        rows.forEach((r, i) => {
          if (!r) return;
          r._satir_duzenleniyor = i === idx;
        });
        state.formRecord[key] = rows;
        state.gridSel = { key, idx };
        renderForm(screen);
        return;
      }
      if (act === 'sil') {
        if (!rows[idx]) return;
        rows.splice(idx, 1);
        state.formRecord[key] = rows;
        state.gridSel = rows.length
          ? { key, idx: Math.min(idx, rows.length - 1) }
          : { key: null, idx: null };
        renderForm(screen);
        toast('Satır silindi.');
        return;
      }
      if (act === 'kopyala') {
        if (!rows[idx]) return;
        rows.forEach((r) => { if (r) r._satir_duzenleniyor = false; });
        const copy = { ...rows[idx] };
        delete copy.id;
        copy._satir_kayitli = false;
        copy._satir_duzenleniyor = true;
        rows.splice(idx + 1, 0, copy);
        state.formRecord[key] = rows;
        state.gridSel = { key, idx: idx + 1 };
        renderForm(screen);
        toast('Satır kopyalandı — Kaydet ile onaylayın.');
        return;
      }
      if (act === 'kaydet') {
        // Satır Kaydet yalnızca bellek/UI — belgeyi (saveForm) kaydetmez.
        if (rows[idx]) {
          const { row, missing } = syncGridRowFromDom(tab, idx, rows[idx]);
          if (missing?.length) {
            toast(`Satır eksik: ${missing.map((f) => f.label || f.key).join(', ')}`);
            return;
          }
          row._satir_kayitli = true;
          row._satir_duzenleniyor = false;
          rows[idx] = row;
        }
        state.formRecord[key] = rows;
        state.gridSel = { key, idx };
        renderForm(screen);
        toast('Satır onaylandı — belgeyi kaydetmek için üstteki Kaydet’i kullanın.');
        return;
      }
    }
    const gridPick = e.target.closest('[data-grid-pick]');
    if (gridPick && screen) {
      // Tablo hücresindeki input/select tıklanınca formu yeniden çizme (odak kaybı)
      if (isFormControlClick(e.target)) {
        const keyQuiet = gridPick.getAttribute('data-grid-pick');
        const idxQuiet = Number(gridPick.getAttribute('data-grid-idx'));
        if (keyQuiet != null && !Number.isNaN(idxQuiet)) {
          state.gridSel = { key: keyQuiet, idx: idxQuiet };
          document.querySelectorAll(`tr[data-grid-row="${keyQuiet}"]`).forEach((tr) => {
            tr.classList.toggle('selected', Number(tr.getAttribute('data-grid-idx')) === idxQuiet);
          });
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const key = gridPick.getAttribute('data-grid-pick');
      const tab = resolveGridTab(screen, key);
      const masterSnap = readMasterFromForm(screen);
      state.formRecord = { ...(state.formRecord || {}), ...masterSnap };
      if (tab && state.gridSel.key === key && state.gridSel.idx != null) {
        const rows = Array.isArray(state.formRecord[key]) ? [...state.formRecord[key]] : [];
        if (rows[state.gridSel.idx]) {
          const { row } = syncGridRowFromDom(tab, state.gridSel.idx, rows[state.gridSel.idx]);
          rows[state.gridSel.idx] = row;
          state.formRecord[key] = rows;
        }
      }
      state.gridSel = {
        key,
        idx: Number(gridPick.getAttribute('data-grid-idx')),
      };
      renderForm(screen);
      return;
    }

    // --- BOM ağaç ---
    const bomAct = e.target.closest('[data-bom-act]');
    if (bomAct && screen) {
      e.preventDefault();
      e.stopPropagation();
      const act = bomAct.getAttribute('data-bom-act');
      const tab = findBomTab(screen);
      if (!tab) return;
      if (act === 'uygula' || act === 'uygula-ve-yeni') {
        applyBomEditorSelection(screen, { addAnother: act === 'uygula-ve-yeni' });
        return;
      }
      if (act === 'on-maliyet') {
        const id = state.formRecord?.id;
        if (!id) {
          toast('Ön maliyet için önce ürün ağacını kaydedin.');
          return;
        }
        api(`/urun-agaclari/${id}/on-maliyet`)
          .then((r) => {
            state.formRecord.precost_amount = r.precost_amount;
            const n = (r.kalemler || []).length;
            toast(`Ön maliyet: ${Number(r.precost_amount || 0).toLocaleString('tr-TR', { maximumFractionDigits: 4 })} (${n} kalem)`);
            renderForm(screen);
          })
          .catch((err) => toast(err.message || 'Ön maliyet hesaplanamadı'));
        return;
      }
      if (act === 'alt-ekle' || act === 'alt-sil') {
        state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
        const node = persistBomEditor(state.formRecord, tab);
        if (!node) {
          toast('Önce bir eleman satırı seçin.');
          return;
        }
        if (!Array.isArray(node.alternatifler)) node.alternatifler = [];
        if (act === 'alt-ekle') {
          node.alternatifler.push(blankBomAltRow(tab.altFields));
        } else {
          const idx = Number(bomAct.getAttribute('data-bom-alt-idx'));
          if (!Number.isNaN(idx)) node.alternatifler.splice(idx, 1);
        }
        renderForm(screen);
        return;
      }
      // Mevcut editörü önce ESKİ treeSel’e yaz; data-bom-path ile hedefi sonra seç
      const actPath = bomAct.getAttribute('data-bom-path');
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      const nodes = ensureBomTree(state.formRecord);
      const blank = blankBomRow(tab.fields);
      if (act === 'coklu-ekle') {
        if (!state.formRecord.finished_good_item_id) {
          toast('Önce mamul (kök) seçin.');
          return;
        }
        openBomMultiItemPicker(screen, tab).catch((err) => toast(err.message || 'Malzeme seçilemedi'));
        return;
      }
      if (act === 'eleman-kopyala') {
        if (state.treeSel == null) {
          toast('Kopyalanacak elemanı seçin.');
          return;
        }
        const src = getBomNode(nodes, state.treeSel);
        if (!src?.component_item_id) {
          toast('Seçili satırda malzeme yok.');
          return;
        }
        const copy = {
          ...blankBomRow(tab.fields),
          ...src,
          alt_satirlar: [],
          id: undefined,
          line_no: '',
        };
        const parts = String(state.treeSel).split('.');
        if (parts.length === 1) {
          nodes.push(copy);
          state.treeSel = String(nodes.length - 1);
        } else {
          const parentPath = parts.slice(0, -1).join('.');
          const parent = getBomNode(nodes, parentPath);
          if (!parent.alt_satirlar) parent.alt_satirlar = [];
          parent.alt_satirlar.push(copy);
          state.treeSel = `${parentPath}.${parent.alt_satirlar.length - 1}`;
        }
        state.formRecord.satirlar = nodes;
        state.formRecord.agac = nodes;
        renderForm(screen);
        toast('Eleman kopyalandı — kaydetmeyi unutmayın.');
        return;
      }
      if (act === 'yeni-kok') {
        if (!state.formRecord.finished_good_item_id) {
          toast('Önce mamul (kök) seçin.');
          return;
        }
        nodes.push(blank);
        state.treeSel = String(nodes.length - 1);
        state.treeExpanded[state.treeSel] = true;
      } else if (act === 'yeni-alt') {
        const parentPath = actPath != null ? actPath : state.treeSel;
        if (parentPath == null) {
          toast('Alt malzeme için önce üst satırı (yarı mamul) seçin.');
          return;
        }
        state.treeSel = parentPath;
        const parent = getBomNode(nodes, parentPath);
        if (!parent) return;
        if (!parent.component_item_id) {
          toast('Önce bu satıra malzeme seçip «Satırı uygula» deyin.');
          return;
        }
        if (!Array.isArray(parent.alt_satirlar)) parent.alt_satirlar = [];
        parent.alt_satirlar.push(blank);
        state.treeExpanded[parentPath] = true;
        state.treeSel = `${parentPath}.${parent.alt_satirlar.length - 1}`;
      } else if (act === 'sil') {
        const delPath = actPath != null ? actPath : state.treeSel;
        if (delPath == null) {
          toast('Silmek için satır seçin.');
          return;
        }
        removeBomNode(nodes, delPath);
        state.treeSel = null;
      }
      state.formRecord.satirlar = nodes;
      state.formRecord.agac = nodes;
      // DOM henüz eski satırı gösteriyor — önce çiz, sonra sekme kaydı
      renderForm(screen);
      persistActiveFormTab();
      return;
    }
    const bomToggle = e.target.closest('[data-bom-toggle]');
    if (bomToggle && screen) {
      e.preventDefault();
      e.stopPropagation();
      const path = bomToggle.getAttribute('data-bom-toggle');
      // Varsayılan açık: undefined/true → kapat; false → aç
      const open = state.treeExpanded[path] !== false;
      state.treeExpanded[path] = !open;
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      renderForm(screen);
      return;
    }
    const bomNode = e.target.closest('[data-bom-path]');
    if (bomNode && screen && !e.target.closest('[data-bom-act]') && !isFormControlClick(e.target)) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      const path = bomNode.getAttribute('data-bom-path');
      state.treeSel = path;
      state.treeExpanded[path] = true;
      renderForm(screen);
      persistActiveFormTab();
      return;
    }

    // --- Rota akışı ---
    const flowAct = e.target.closest('[data-flow-act]');
    if (flowAct && screen) {
      e.preventDefault();
      const act = flowAct.getAttribute('data-flow-act');
      const tab = findRotaTab(screen);
      if (!tab) return;
      if (act === 'uygula-op') {
        applyRotaOpSelection(screen);
        return;
      }
      if (act === 'uygula-comp' || act === 'uygula-comp-ve-yeni') {
        applyRotaCompSelection(screen, { addAnother: act === 'uygula-comp-ve-yeni' });
        return;
      }
      if (act === 'uygula-eq' || act === 'uygula-eq-ve-yeni') {
        applyRotaEquipSelection(screen, { addAnother: act === 'uygula-eq-ve-yeni' });
        return;
      }
      if (act === 'sablon-uygula') {
        applyRotaSablon(screen).catch((err) => toast(err.message || String(err)));
        return;
      }
      if (act === 'agactan-malzeme') {
        applyBomMaterialsToRota(screen).catch((err) => toast(err.message || String(err)));
        return;
      }
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      const ops = Array.isArray(state.formRecord.operasyonlar) ? [...state.formRecord.operasyonlar] : [];
      if (act === 'yeni-op') {
        const nextSira = ops.reduce((m, o) => Math.max(m, Number(o.line_no) || 0), 0) + 10;
        const headerItem = state.formRecord?.item_id || '';
        ops.push({
          ...emptyRowFromFields(tab.fields),
          ...emptyRotaOperation(nextSira, { item_id: headerItem }),
          line_no: nextSira,
          operation_code: `OP${nextSira}`,
        });
        // önceki son ops'un sonraki_line_no bağla
        if (ops.length >= 2) {
          ops[ops.length - 2].sonraki_line_no = nextSira;
        }
        state.formRecord.operasyonlar = ops;
        state.flowSel = ops.length - 1;
        state.flowCompSel = null;
        state.flowEquipSel = null;
      } else if (act === 'sil-op') {
        if (state.flowSel == null) { toast('Operasyon seçin.'); return; }
        ops.splice(state.flowSel, 1);
        state.formRecord.operasyonlar = ops;
        state.flowSel = ops.length ? Math.min(state.flowSel, ops.length - 1) : null;
        state.flowCompSel = null;
        state.flowEquipSel = null;
      } else if (act === 'yeni-comp') {
        if (state.flowSel == null) { toast('Önce operasyon seçin.'); return; }
        const op = ops[state.flowSel];
        if (!state.formRecord?.product_bom_id) {
          toast('Malzeme eklemek için önce rota başlığında ürün ağacı seçin.');
          return;
        }
        if (!op.bilesenler) op.bilesenler = [];
        // Seçili satırdaki sağ panel değişikliklerini kaybetme
        persistFlowEditor(state.formRecord, tab);
        op.bilesenler.push(emptyRowFromFields(tab.componentFields));
        state.flowCompSel = op.bilesenler.length - 1;
        state.flowEquipSel = null;
        state.formRecord.operasyonlar = ops;
      } else if (act === 'sil-comp') {
        if (state.flowSel == null) {
          toast('Önce operasyon seçin.');
          return;
        }
        const idxAttr = flowAct.getAttribute('data-flow-comp-idx');
        const compIdx = idxAttr != null && idxAttr !== ''
          ? Number(idxAttr)
          : state.flowCompSel;
        if (compIdx == null || Number.isNaN(compIdx)) {
          toast('Bileşen seçin.');
          return;
        }
        if (!ops[state.flowSel].bilesenler) ops[state.flowSel].bilesenler = [];
        ops[state.flowSel].bilesenler.splice(compIdx, 1);
        state.flowCompSel = null;
        state.formRecord.operasyonlar = ops;
      } else if (act === 'yeni-eq') {
        if (state.flowSel == null) { toast('Önce operasyon seçin.'); return; }
        const op = ops[state.flowSel];
        if (!op.ekipmanlar) op.ekipmanlar = [];
        persistFlowEditor(state.formRecord, tab);
        const blank = emptyRowFromFields(tab.equipmentFields);
        blank.line_no = op.ekipmanlar.reduce((m, e) => Math.max(m, Number(e.line_no) || 0), 0) + 10;
        op.ekipmanlar.push(blank);
        state.flowEquipSel = op.ekipmanlar.length - 1;
        state.flowCompSel = null;
        state.formRecord.operasyonlar = ops;
      } else if (act === 'sil-eq') {
        if (state.flowSel == null || state.flowEquipSel == null) {
          toast('Ekipman seçin.');
          return;
        }
        if (!ops[state.flowSel].ekipmanlar) ops[state.flowSel].ekipmanlar = [];
        ops[state.flowSel].ekipmanlar.splice(state.flowEquipSel, 1);
        state.flowEquipSel = null;
        state.formRecord.operasyonlar = ops;
      }
      // Yeni op/malzeme: önce çiz (eski DOM değerleri boş satıra yazılmasın)
      renderForm(screen);
      persistActiveFormTab();
      return;
    }
    // Planlama / Gelişmiş accordion açık-kapalı durumu
    const rotaSection = e.target.closest('details.rota-advanced[data-rota-section]');
    if (rotaSection && e.target.closest('summary') && screen) {
      const sec = rotaSection.getAttribute('data-rota-section');
      // toggle native; bir tick sonra open durumunu sakla
      setTimeout(() => {
        if (sec === 'planlama') state.rotaShowPlanlama = rotaSection.open;
        if (sec === 'gelismis') state.rotaShowAdvanced = rotaSection.open;
      }, 0);
    }
    // Yalnızca başlık satırından seç — gövdedeki sarı lookup tıklanınca renderForm olmasın
    const flowHead = e.target.closest('.rota-op-head[data-flow-idx]');
    if (flowHead && screen && !e.target.closest('[data-flow-act]') && !isFormControlClick(e.target)) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      state.flowSel = Number(flowHead.getAttribute('data-flow-idx'));
      state.flowCompSel = null;
      state.flowEquipSel = null;
      renderForm(screen);
      persistActiveFormTab();
      return;
    }
    const flowCompPick = e.target.closest('[data-flow-comp-pick]');
    if (flowCompPick && screen && !isFormControlClick(e.target)) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      state.flowCompSel = Number(flowCompPick.getAttribute('data-flow-comp-pick'));
      state.flowEquipSel = null;
      renderForm(screen);
      persistActiveFormTab();
      return;
    }
    const flowEqPick = e.target.closest('[data-flow-eq-pick]');
    if (flowEqPick && screen && !isFormControlClick(e.target)) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      state.flowEquipSel = Number(flowEqPick.getAttribute('data-flow-eq-pick'));
      state.flowCompSel = null;
      renderForm(screen);
      persistActiveFormTab();
      return;
    }

    const tabBtn = e.target.closest('[data-form-tab]');
    if (!tabBtn) return;
    if (!screen?.formTabs) return;
    // preserve current values into formRecord before switching
    if (screen.formTabs.length) {
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
    }
    state.formActiveTab = tabBtn.getAttribute('data-form-tab');
    renderForm(screen);
  });

  const search = $('#screenSearch');
  search.addEventListener('input', () => runSearch(search.value));
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#searchResults').hidden = true;
  });

  window.addEventListener('popstate', () => {
    const id = (location.hash || '').replace(/^#/, '');
    if (id && findScreen(id)) openScreen(id);
    else showHome();
  });
}

async function tryRefreshAccessToken() {
  const refresh = localStorage.getItem('ktb_refresh_token');
  if (!refresh) return false;
  try {
    const data = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (data?.access_token) {
      localStorage.setItem('ktb_access_token', data.access_token);
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

async function restoreSession() {
  try {
    const kod = localStorage.getItem('ktb_kullanici_kodu');
    const token = localStorage.getItem('ktb_access_token');
    const cihaz = localStorage.getItem('ktb_cihaz_oturum') === '1';
    if (!kod && !token && !cihaz) return false;

    if (token) {
      try {
        state.session = await api('/auth/me');
        localStorage.setItem('ktb_cihaz_oturum', '1');
        return Boolean(state.session);
      } catch (_) { /* access süresi dolmuş */ }
    }

    if (await tryRefreshAccessToken()) {
      try {
        state.session = await api('/auth/me');
        localStorage.setItem('ktb_cihaz_oturum', '1');
        return Boolean(state.session);
      } catch (_) { /* ignore */ }
    }

    // Parolasız kullanıcılar için kod ile yenileme
    if (kod) {
      try {
        const ses = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ user_code: kod }),
        });
        applySession(ses, kod);
        return true;
      } catch (_) { /* parola zorunlu — yine de bu cihaz oturumunu koru */ }
    }

    // Bu cihazdan daha önce giriş yapıldıysa token olmasa da uygulamayı aç
    if (kod || cihaz) {
      softSessionFromStorage();
      if (kod && $('#loginUser') && !$('#loginUser').value) {
        $('#loginUser').value = kod;
      }
      return true;
    }
    return false;
  } catch (_) {
    return softSessionFromStorage();
  } finally {
    renderUserChip();
  }
}

/* ========== SQL Sorgu ekranı ========== */
const SQL_SHEETS_KEY = 'ktb_sql_sheets_v1';
const SQL_SPLIT_KEY = 'ktb_sql_split_ratio';

const sqlConsoleState = {
  meta: null,
  bound: false,
  sheets: [],
  activeId: null,
  sheetSeq: 1,
};

function sqlNewSheet(partial = {}) {
  const n = sqlConsoleState.sheetSeq++;
  return {
    id: `s${Date.now()}_${n}`,
    name: partial.name || `Sheet ${n}`,
    sql: partial.sql || 'SELECT * FROM items LIMIT 50;',
    result: partial.result || null,
    txMode: partial.txMode || null,
  };
}

function sqlLoadSheetsFromStorage() {
  try {
    const raw = localStorage.getItem(SQL_SHEETS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.sheets) || !parsed.sheets.length) return false;
    sqlConsoleState.sheets = parsed.sheets.map((s, i) => ({
      id: s.id || `s_restored_${i}`,
      name: s.name || `Sheet ${i + 1}`,
      sql: s.sql || '',
      result: null,
      txMode: s.txMode || null,
    }));
    sqlConsoleState.activeId = parsed.activeId && sqlConsoleState.sheets.some((s) => s.id === parsed.activeId)
      ? parsed.activeId
      : sqlConsoleState.sheets[0].id;
    sqlConsoleState.sheetSeq = sqlConsoleState.sheets.length + 1;
    return true;
  } catch (_) {
    return false;
  }
}

function sqlPersistSheets() {
  try {
    localStorage.setItem(SQL_SHEETS_KEY, JSON.stringify({
      activeId: sqlConsoleState.activeId,
      sheets: sqlConsoleState.sheets.map(({ id, name, sql, txMode }) => ({ id, name, sql, txMode })),
    }));
  } catch (_) { /* ignore quota */ }
}

function sqlActiveSheet() {
  return sqlConsoleState.sheets.find((s) => s.id === sqlConsoleState.activeId) || sqlConsoleState.sheets[0];
}

function sqlEscapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sqlHighlight(text) {
  const esc = sqlEscapeHtml(text);
  return esc.replace(
    /\b(SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|LIMIT|OFFSET|AS|WITH|DISTINCT|HAVING|CASE|WHEN|THEN|ELSE|END|NULL|TRUE|FALSE|NOT|IN|LIKE|ILIKE|BETWEEN|EXISTS|UNION|ALL|BEGIN|COMMIT|ROLLBACK|RETURNING)\b/gi,
    '<span class="sql-kw">$1</span>'
  ).replace(/('[^']*')/g, '<span class="sql-str">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="sql-num">$1</span>');
}

function sqlDetectWrite(sql) {
  const t = String(sql || '').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ').trim();
  return /^(INSERT|UPDATE|DELETE|MERGE)\b/i.test(t);
}

function sqlSyncHighlight() {
  const ed = $('#sqlEditor');
  const hi = $('#sqlHighlight');
  if (!ed || !hi) return;
  hi.innerHTML = `${sqlHighlight(ed.value)}\n`;
  hi.scrollTop = ed.scrollTop;
  hi.scrollLeft = ed.scrollLeft;
  const tx = $('#sqlTxWrap');
  if (tx) tx.hidden = !sqlDetectWrite(ed.value);
  const sheet = sqlActiveSheet();
  if (sheet) sheet.sql = ed.value;
}

function sqlCaptureEditorToSheet() {
  const sheet = sqlActiveSheet();
  const ed = $('#sqlEditor');
  if (!sheet || !ed) return;
  sheet.sql = ed.value;
  const checked = document.querySelector('input[name="sqlTx"]:checked');
  sheet.txMode = checked?.value || null;
}

function sqlApplySheetToEditor(sheet) {
  const ed = $('#sqlEditor');
  if (!ed || !sheet) return;
  ed.value = sheet.sql || '';
  document.querySelectorAll('input[name="sqlTx"]').forEach((inp) => {
    inp.checked = sheet.txMode ? inp.value === sheet.txMode : false;
  });
  sqlSyncHighlight();
  sqlRenderResult(sheet.result);
}

function sqlRenderSheetBar() {
  const bar = $('#sqlSheetBar');
  if (!bar) return;
  bar.innerHTML = [
    ...sqlConsoleState.sheets.map((s) => `
      <button type="button" class="sql-sheet-tab${s.id === sqlConsoleState.activeId ? ' active' : ''}" data-sql-sheet="${escAttr(s.id)}" title="${escAttr(s.name)}">
        <span class="sql-sheet-name">${escAttr(s.name)}</span>
        ${sqlConsoleState.sheets.length > 1 ? `<span class="sql-sheet-close" data-sql-sheet-close="${escAttr(s.id)}" title="Kapat">×</span>` : ''}
      </button>`),
    `<button type="button" class="sql-sheet-add" id="sqlSheetAdd" title="Yeni sorgu sayfası">+</button>`,
  ].join('');
}

function sqlSwitchSheet(id) {
  if (!id || id === sqlConsoleState.activeId) return;
  sqlCaptureEditorToSheet();
  if (!sqlConsoleState.sheets.some((s) => s.id === id)) return;
  sqlConsoleState.activeId = id;
  sqlApplySheetToEditor(sqlActiveSheet());
  sqlRenderSheetBar();
  sqlPersistSheets();
}

function sqlAddSheet() {
  sqlCaptureEditorToSheet();
  const sheet = sqlNewSheet();
  sqlConsoleState.sheets.push(sheet);
  sqlConsoleState.activeId = sheet.id;
  sqlApplySheetToEditor(sheet);
  sqlRenderSheetBar();
  sqlPersistSheets();
  $('#sqlEditor')?.focus();
}

function sqlCloseSheet(id) {
  if (sqlConsoleState.sheets.length <= 1) return;
  sqlCaptureEditorToSheet();
  const idx = sqlConsoleState.sheets.findIndex((s) => s.id === id);
  if (idx < 0) return;
  sqlConsoleState.sheets.splice(idx, 1);
  if (sqlConsoleState.activeId === id) {
    const next = sqlConsoleState.sheets[Math.max(0, idx - 1)];
    sqlConsoleState.activeId = next.id;
  }
  sqlApplySheetToEditor(sqlActiveSheet());
  sqlRenderSheetBar();
  sqlPersistSheets();
}

function sqlRenameSheet(id) {
  const sheet = sqlConsoleState.sheets.find((s) => s.id === id);
  if (!sheet) return;
  const name = prompt('Sayfa adı', sheet.name);
  if (name == null) return;
  const trimmed = String(name).trim();
  if (!trimmed) return;
  sheet.name = trimmed.slice(0, 40);
  sqlRenderSheetBar();
  sqlPersistSheets();
}

function sqlFillConnectionForm(conn, profiles) {
  const sel = $('#sqlProfile');
  if (sel && Array.isArray(profiles)) {
    sel.innerHTML = `<option value="">— aktif / özel —</option>${profiles.map((p) =>
      `<option value="${p.id}" data-host="${escAttr(p.host)}" data-port="${p.port}" data-db="${escAttr(p.database_name)}" data-user="${escAttr(p.username)}">${escAttr(p.profile_name)}${p.is_default ? ' (varsayılan)' : ''}</option>`
    ).join('')}`;
  }
  if (!conn) return;
  const set = (id, v) => { const el = $(id); if (el) el.value = v ?? ''; };
  set('#sqlHost', conn.host);
  set('#sqlPort', conn.port);
  set('#sqlDatabase', conn.database);
  set('#sqlUser', conn.user);
  const label = `${conn.user}@${conn.host}:${conn.port}/${conn.database}${conn.override ? ' (oturum)' : ''}`;
  const st = $('#sqlConnStatus');
  if (st) st.textContent = `${conn.label || 'Bağlantı'}: ${label}`;
  const chip = $('#sqlConnChip');
  if (chip) chip.textContent = `${conn.database || 'db'} · ${conn.host || 'host'}`;
}

function sqlSetDbModalOpen(open) {
  const modal = $('#sqlDbModal');
  if (!modal) return;
  modal.hidden = !open;
}

function sqlRenderResult(payload) {
  const meta = $('#sqlResultMeta');
  const head = $('#sqlResultHead');
  const body = $('#sqlResultBody');
  if (!meta || !head || !body) return;
  const sheet = sqlActiveSheet();
  if (sheet) sheet.result = payload || null;
  if (payload?.hata) {
    meta.innerHTML = `<span class="sql-error">${escAttr(payload.hata)}</span>`;
    head.innerHTML = '';
    body.innerHTML = '';
    return;
  }
  if (!payload) {
    meta.innerHTML = '';
    head.innerHTML = '';
    body.innerHTML = '';
    return;
  }
  const fields = payload.fields || [];
  meta.innerHTML = [
    `<span>${escAttr(payload.verb || '')}</span>`,
    `<span>${payload.rowCount ?? 0} satır</span>`,
    payload.transaction ? `<span class="sql-tx-badge">${escAttr(payload.transaction)}</span>` : '',
    `<span>${payload.ms ?? 0} ms</span>`,
    payload.truncated ? '<span class="sql-warn">ilk 1000 satır</span>' : '',
  ].filter(Boolean).join(' · ');
  head.innerHTML = `<tr>${fields.map((f) => `<th>${escAttr(f)}</th>`).join('')}</tr>`;
  body.innerHTML = (payload.rows || []).map((row) =>
    `<tr>${fields.map((f) => `<td>${escAttr(row[f])}</td>`).join('')}</tr>`
  ).join('') || `<tr><td colspan="${Math.max(fields.length, 1)}" class="sql-empty">Satır yok</td></tr>`;
}

function sqlApplySplitRatio(ratio) {
  const split = $('#sqlSplit');
  if (!split) return;
  const r = Math.min(0.8, Math.max(0.2, Number(ratio) || 0.4));
  split.style.setProperty('--sql-editor-ratio', `${(r * 100).toFixed(1)}%`);
  try { localStorage.setItem(SQL_SPLIT_KEY, String(r)); } catch (_) { /* ignore */ }
}

function sqlBindSplitter() {
  const handle = $('#sqlSplitter');
  const split = $('#sqlSplit');
  if (!handle || !split) return;
  let dragging = false;
  const onMove = (e) => {
    if (!dragging) return;
    const rect = split.getBoundingClientRect();
    if (rect.height < 40) return;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    sqlApplySplitRatio(y / rect.height);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('sql-splitting');
  };
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    document.body.classList.add('sql-splitting');
  });
  handle.addEventListener('touchstart', (e) => {
    dragging = true;
    document.body.classList.add('sql-splitting');
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);
}

async function openSqlConsole() {
  bindSqlConsoleEvents();
  if (!sqlConsoleState.sheets.length) {
    if (!sqlLoadSheetsFromStorage()) {
      const first = sqlNewSheet();
      sqlConsoleState.sheets = [first];
      sqlConsoleState.activeId = first.id;
    }
  }
  sqlRenderSheetBar();
  sqlApplySheetToEditor(sqlActiveSheet());
  const savedRatio = Number(localStorage.getItem(SQL_SPLIT_KEY) || 0.4);
  sqlApplySplitRatio(savedRatio);
  try {
    const meta = await api('/sql-console/meta');
    sqlConsoleState.meta = meta;
    sqlFillConnectionForm(meta.connection, meta.profiles);
  } catch (err) {
    toast(err.message || 'SQL konsol yüklenemedi');
  }
}

function bindSqlConsoleEvents() {
  if (sqlConsoleState.bound) return;
  sqlConsoleState.bound = true;
  const ed = $('#sqlEditor');
  if (ed) {
    ed.addEventListener('input', () => {
      sqlSyncHighlight();
      sqlPersistSheets();
    });
    ed.addEventListener('scroll', () => {
      const hi = $('#sqlHighlight');
      if (hi) { hi.scrollTop = ed.scrollTop; hi.scrollLeft = ed.scrollLeft; }
    });
    ed.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sqlRun();
      }
    });
  }
  $('#sqlBtnRun')?.addEventListener('click', () => sqlRun());
  $('#sqlBtnDb')?.addEventListener('click', () => sqlSetDbModalOpen(true));
  $('#sqlDbModal')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-sql-db-close]')) sqlSetDbModalOpen(false);
  });
  $('#sqlBtnTest')?.addEventListener('click', () => sqlConnectionAction('test'));
  $('#sqlBtnUse')?.addEventListener('click', () => sqlConnectionAction('use'));
  $('#sqlBtnReset')?.addEventListener('click', async () => {
    try {
      await api('/sql-console/connection/reset', { method: 'POST', body: JSON.stringify({}) });
      toast('Varsayılan bağlantıya dönüldü');
      const meta = await api('/sql-console/meta');
      sqlConsoleState.meta = meta;
      sqlFillConnectionForm(meta.connection, meta.profiles);
    } catch (err) { toast(err.message); }
  });
  $('#sqlProfile')?.addEventListener('change', (e) => {
    const opt = e.target.selectedOptions?.[0];
    if (!opt || !opt.value) return;
    $('#sqlHost').value = opt.dataset.host || '';
    $('#sqlPort').value = opt.dataset.port || '5432';
    $('#sqlDatabase').value = opt.dataset.db || '';
    $('#sqlUser').value = opt.dataset.user || '';
  });
  $('#sqlSheetBar')?.addEventListener('click', (e) => {
    const close = e.target.closest('[data-sql-sheet-close]');
    if (close) {
      e.preventDefault();
      e.stopPropagation();
      sqlCloseSheet(close.getAttribute('data-sql-sheet-close'));
      return;
    }
    if (e.target.closest('#sqlSheetAdd')) {
      sqlAddSheet();
      return;
    }
    const tab = e.target.closest('[data-sql-sheet]');
    if (tab) sqlSwitchSheet(tab.getAttribute('data-sql-sheet'));
  });
  $('#sqlSheetBar')?.addEventListener('dblclick', (e) => {
    const tab = e.target.closest('[data-sql-sheet]');
    if (tab) sqlRenameSheet(tab.getAttribute('data-sql-sheet'));
  });
  document.querySelectorAll('input[name="sqlTx"]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const sheet = sqlActiveSheet();
      if (sheet) sheet.txMode = document.querySelector('input[name="sqlTx"]:checked')?.value || null;
      sqlPersistSheets();
    });
  });
  sqlBindSplitter();
}

function sqlReadConnBody() {
  return {
    host: $('#sqlHost')?.value?.trim(),
    port: Number($('#sqlPort')?.value || 5432),
    database: $('#sqlDatabase')?.value?.trim(),
    user: $('#sqlUser')?.value?.trim(),
    password: $('#sqlPassword')?.value ?? '',
    label: 'Oturum bağlantısı',
  };
}

async function sqlConnectionAction(kind) {
  const body = sqlReadConnBody();
  try {
    if (kind === 'test') {
      const r = await api('/sql-console/connection/test', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast(`Bağlantı OK · ${r.db} / ${r.usr}`);
    } else {
      await api('/sql-console/connection/use', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast('Bağlantı oturuma alındı');
      $('#sqlPassword').value = '';
      const meta = await api('/sql-console/meta');
      sqlConsoleState.meta = meta;
      sqlFillConnectionForm(meta.connection, meta.profiles);
      sqlSetDbModalOpen(false);
    }
  } catch (err) {
    toast(err.message || 'Bağlantı hatası');
  }
}

async function sqlRun() {
  sqlCaptureEditorToSheet();
  const sql = $('#sqlEditor')?.value || '';
  const isWrite = sqlDetectWrite(sql);
  let txMode = null;
  if (isWrite) {
    const checked = document.querySelector('input[name="sqlTx"]:checked');
    if (!checked) {
      toast('Yazma sorgusu için COMMIT veya ROLLBACK seçin.');
      $('#sqlTxWrap').hidden = false;
      return;
    }
    txMode = checked.value;
  }
  try {
    const payload = await api('/sql-console/execute', {
      method: 'POST',
      body: JSON.stringify({ sql, txMode }),
    });
    sqlRenderResult(payload);
    sqlPersistSheets();
  } catch (err) {
    sqlRenderResult({ hata: err.message || String(err) });
  }
}

/** Uygulamayı aç; giriş ekranı yalnızca çıkış / «Giriş yap» ile manuel açılır. */
async function bootIntoApp() {
  enterApp();
  await loadFirmalar().catch(() => {});
  renderFirmaPicker();

  const solo = parseFormSoloQuery();
  if (solo && findScreen(solo.screenId)) {
    applyFormSoloChrome();
    state.screenId = solo.screenId;
    if (solo.id) {
      const rid = Number(solo.id);
      const row = { id: Number.isFinite(rid) ? rid : solo.id };
      state.rows = [row];
      state.filtered = [row];
      state.selectedId = row.id;
    }
    if (solo.prefillKey) {
      try {
        const raw = localStorage.getItem(solo.prefillKey);
        if (raw) state.formPrefill = JSON.parse(raw);
        localStorage.removeItem(solo.prefillKey);
      } catch (_) { /* ignore */ }
    }
    document.title = `${findScreen(solo.screenId).title} · ${MODE_LABELS[solo.mode] || solo.mode} · KTB ERP`;
    try {
      await openForm(solo.mode, { inPlace: true });
    } finally {
      revealFormSoloReady();
    }
    return;
  }

  // Normal açılış — boot sınıfı kalmışsa temizle
  revealFormSoloReady();

  const screenOpen = parseScreenOpenQuery();
  if (screenOpen && findScreen(screenOpen.screenId)) {
    let filterState = null;
    if (screenOpen.filtersKey) {
      try {
        const raw = localStorage.getItem(screenOpen.filtersKey);
        if (raw) filterState = JSON.parse(raw);
        localStorage.removeItem(screenOpen.filtersKey);
      } catch (_) { /* ignore */ }
    }
    if (screenOpen.focusScreenId) state.metaFocusScreenId = screenOpen.focusScreenId;
    await openScreen(screenOpen.screenId, {
      focusScreenId: screenOpen.focusScreenId || undefined,
      filterState: filterState || undefined,
    });
    if (screenOpen.banner) {
      const banner = $('#screenBanner') || $('#metaBanner');
      if (banner) banner.textContent = screenOpen.banner;
    }
    // URL’yi sadeleştir (yenilemede tekrar localStorage aramasın)
    try {
      history.replaceState(
        { screenId: screenOpen.screenId },
        '',
        `${location.pathname}#${encodeURIComponent(screenOpen.screenId)}`,
      );
    } catch (_) { /* ignore */ }
    return;
  }

  const id = (location.hash || '').replace(/^#/, '');
  if (id && findScreen(id)) openScreen(id);
  else showHome();
}

function bootFromHash() {
  bindEvents();
  restoreSession()
    .then(() => bootIntoApp())
    .catch(() => bootIntoApp());
}

bootFromHash();
