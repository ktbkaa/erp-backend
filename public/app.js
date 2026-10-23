const OPERATORS = [
  { id: 'icerir', label: 'İçerir' },
  { id: 'esit', label: 'Eşit' },
  { id: 'esit_degil', label: 'Eşit değil' },
  { id: 'arasinda', label: 'Arasında' },
];

const MODULES = [
  {
    id: 'sabit-tanimlar',
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
        codeField: 'seri_kodu',
        nameField: 'aciklama',
        numeratorSeri: null,
        filters: [
          { key: 'seri_kodu', label: 'Seri kodu' },
          { key: 'ekran_adi', label: 'Ekran adı' },
          { key: 'onek', label: 'Önek' },
        ],
        columns: [
          { key: 'seri_kodu', label: 'Seri', mono: true },
          { key: 'onek', label: 'Önek', mono: true },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'ekran_adi', label: 'Ekran' },
          { key: 'son_numara', label: 'Son no' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'seri_kodu', label: 'Seri kodu', code: true, editableOnNew: true, required: true },
          { key: 'onek', label: 'Önek' },
          { key: 'aciklama', label: 'Açıklama', name: true, required: true },
        ],
        detailFields: [
          { key: 'ekran_kodu', label: 'Ekran kodu' },
          { key: 'ekran_adi', label: 'Ekran adı' },
          { key: 'son_numara', label: 'Son numara', type: 'number' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'birim_kodu',
        nameField: 'birim_adi',
        numeratorSeri: null,
        filters: [
          { key: 'birim_kodu', label: 'Birim kodu' },
          { key: 'birim_adi', label: 'Birim adı' },
        ],
        columns: [
          { key: 'birim_kodu', label: 'Kod', mono: true },
          { key: 'birim_adi', label: 'Ad' },
        ],
        masterFields: [
          { key: 'birim_kodu', label: 'Birim kodu', code: true, editableOnNew: true, required: true },
          { key: 'birim_adi', label: 'Birim adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'kategori_kodu',
        nameField: 'kategori_adi',
        numeratorSeri: 'KATEGORI',
        filters: [
          { key: 'kategori_kodu', label: 'Kategori kodu' },
          { key: 'kategori_adi', label: 'Kategori adı' },
          { key: 'kategori_tipi', label: 'Tip' },
        ],
        columns: [
          { key: 'kategori_kodu', label: 'Kod', mono: true },
          { key: 'kategori_adi', label: 'Ad' },
          { key: 'kategori_tipi', label: 'Tip' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kategori_kodu', label: 'Kategori kodu', code: true, required: true },
          { key: 'kategori_adi', label: 'Kategori adı', name: true, required: true },
          { key: 'kategori_tipi', label: 'Kategori tipi', type: 'select', options: ['ABC', 'Marka', 'TeminSekli', 'Sektor', 'Bolge'], required: true },
        ],
        detailFields: [
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'ulke-tanimi',
        techId: 'MDM-CTRY-SCR-001',
        businessNameEn: 'CountryDefinitionScreen',
        title: 'Ülke Tanımı',
        endpoint: '/ulkeler',
        crud: true,
        codeField: 'ulke_kodu',
        nameField: 'ulke_adi',
        numeratorSeri: 'ULKE',
        filters: [
          { key: 'ulke_kodu', label: 'Ülke kodu' },
          { key: 'ulke_adi', label: 'Ülke adı' },
        ],
        columns: [
          { key: 'ulke_kodu', label: 'Kod', mono: true },
          { key: 'ulke_adi', label: 'Ad' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'ulke_kodu', label: 'Ülke kodu', code: true, required: true },
          { key: 'ulke_adi', label: 'Ülke adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'pb_kodu',
        nameField: 'pb_adi',
        numeratorSeri: 'PARA_BIRIM',
        filters: [
          { key: 'pb_kodu', label: 'PB kodu' },
          { key: 'pb_adi', label: 'PB adı' },
        ],
        columns: [
          { key: 'pb_kodu', label: 'Kod', mono: true },
          { key: 'pb_adi', label: 'Ad' },
          { key: 'sembol', label: 'Sembol' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'pb_kodu', label: 'Para birimi kodu', code: true, editableOnNew: true, required: true },
          { key: 'pb_adi', label: 'Para birimi adı', name: true, required: true },
          { key: 'sembol', label: 'Sembol' },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'sehir-tanimi',
        techId: 'MDM-CITY-SCR-001',
        businessNameEn: 'CityProvinceScreen',
        title: 'Şehir / İl Tanımı',
        endpoint: '/sehirler',
        crud: true,
        codeField: 'sehir_kodu',
        nameField: 'sehir_adi',
        numeratorSeri: 'SEHIR',
        filters: [
          { key: 'sehir_kodu', label: 'Şehir kodu' },
          { key: 'sehir_adi', label: 'Şehir adı' },
          { key: 'ulke_kodu', label: 'Ülke' },
        ],
        columns: [
          { key: 'sehir_kodu', label: 'Kod', mono: true },
          { key: 'sehir_adi', label: 'Ad' },
          { key: 'ulke_kodu', label: 'Ülke' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'sehir_kodu', label: 'Şehir kodu', code: true, editableOnNew: true, required: true },
          { key: 'sehir_adi', label: 'Şehir adı', name: true, required: true },
          { key: 'ulke_kodu', label: 'Ülke', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_kodu', labelKey: 'ulke_adi' },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'ilce-tanimi',
        techId: 'MDM-DIST-SCR-001',
        businessNameEn: 'DistrictDefinitionScreen',
        title: 'İlçe Tanımı',
        endpoint: '/ilceler',
        crud: true,
        codeField: 'ilce_kodu',
        nameField: 'ilce_adi',
        numeratorSeri: 'ILCE',
        filters: [
          { key: 'ilce_kodu', label: 'İlçe kodu' },
          { key: 'ilce_adi', label: 'İlçe adı' },
          { key: 'sehir_kodu', label: 'Şehir' },
        ],
        columns: [
          { key: 'ilce_kodu', label: 'Kod', mono: true },
          { key: 'ilce_adi', label: 'Ad' },
          { key: 'sehir_kodu', label: 'Şehir' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'ilce_kodu', label: 'İlçe kodu', code: true, editableOnNew: true, required: true },
          { key: 'ilce_adi', label: 'İlçe adı', name: true, required: true },
          { key: 'sehir_kodu', label: 'Şehir', type: 'lookup', lookup: 'sehirler', valueKey: 'sehir_kodu', labelKey: 'sehir_adi' },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'kosul_kodu',
        nameField: 'kosul_adi',
        numeratorSeri: 'ODEME_KOSUL',
        filters: [
          { key: 'kosul_kodu', label: 'Kod' },
          { key: 'kosul_adi', label: 'Ad' },
        ],
        columns: [
          { key: 'kosul_kodu', label: 'Kod', mono: true },
          { key: 'kosul_adi', label: 'Ad' },
          { key: 'vade_gun', label: 'Vade (gün)' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kosul_kodu', label: 'Koşul kodu', code: true, editableOnNew: true, required: true },
          { key: 'kosul_adi', label: 'Koşul adı', name: true, required: true },
          { key: 'vade_gun', label: 'Vade gün', type: 'number' },
        ],
        detailFields: [
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'kosul_kodu',
        nameField: 'kosul_adi',
        numeratorSeri: 'TESLIMAT_KOSUL',
        filters: [
          { key: 'kosul_kodu', label: 'Kod' },
          { key: 'kosul_adi', label: 'Ad' },
        ],
        columns: [
          { key: 'kosul_kodu', label: 'Kod', mono: true },
          { key: 'kosul_adi', label: 'Ad' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kosul_kodu', label: 'Koşul kodu', code: true, editableOnNew: true, required: true },
          { key: 'kosul_adi', label: 'Koşul adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'dil-tanimi',
        techId: 'MDM-LANG-SCR-001',
        businessNameEn: 'LanguageDefinitionScreen',
        title: 'Dil Tanımı',
        endpoint: '/diller',
        crud: true,
        codeField: 'dil_kodu',
        nameField: 'dil_adi',
        numeratorSeri: 'DIL',
        filters: [
          { key: 'dil_kodu', label: 'Kod' },
          { key: 'dil_adi', label: 'Ad' },
        ],
        columns: [
          { key: 'dil_kodu', label: 'Kod', mono: true },
          { key: 'dil_adi', label: 'Ad' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'dil_kodu', label: 'Dil kodu', code: true, editableOnNew: true, required: true, autoFillLanguageName: true },
          { key: 'dil_adi', label: 'Dil adı', name: true, required: true, readOnlyWhen: 'auto-dil' },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'banka-tanimi',
        techId: 'MDM-BANK-SCR-001',
        businessNameEn: 'BankDefinitionScreen',
        title: 'Banka Tanımı',
        endpoint: '/bankalar',
        crud: true,
        codeField: 'banka_kodu',
        nameField: 'banka_adi',
        numeratorSeri: 'BANKA',
        filters: [
          { key: 'banka_kodu', label: 'Kod' },
          { key: 'banka_adi', label: 'Ad' },
        ],
        columns: [
          { key: 'banka_kodu', label: 'Kod', mono: true },
          { key: 'banka_adi', label: 'Ad' },
          { key: 'swift_kodu', label: 'SWIFT' },
          { key: 'ulke_kodu', label: 'Ülke' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'banka_kodu', label: 'Banka kodu', code: true, editableOnNew: true, required: true },
          { key: 'banka_adi', label: 'Banka adı', name: true, required: true },
          { key: 'swift_kodu', label: 'SWIFT' },
          { key: 'ulke_kodu', label: 'Ülke', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_kodu', labelKey: 'ulke_adi' },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'doviz-kur-tanimi',
        techId: 'FIN-FX-SCR-001',
        businessNameEn: 'ExchangeRateScreen',
        title: 'Döviz Kurları',
        endpoint: '/doviz-kurlari',
        crud: true,
        codeField: 'kaynak_pb',
        nameField: 'hedef_pb',
        filters: [
          { key: 'kaynak_pb', label: 'Kaynak PB' },
          { key: 'hedef_pb', label: 'Hedef PB' },
        ],
        columns: [
          { key: 'kur_tarihi', label: 'Tarih' },
          { key: 'kaynak_pb', label: 'Kaynak', mono: true },
          { key: 'hedef_pb', label: 'Hedef', mono: true },
          { key: 'alis_kuru', label: 'Alış' },
          { key: 'satis_kuru', label: 'Satış' },
          { key: 'kaynak', label: 'Kaynak' },
        ],
        masterFields: [
          { key: 'kur_tarihi', label: 'Kur tarihi', type: 'date', required: true },
          { key: 'kaynak_pb', label: 'Kaynak PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', required: true },
          { key: 'hedef_pb', label: 'Hedef PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', required: true },
          { key: 'alis_kuru', label: 'Alış kuru', type: 'number', required: true },
          { key: 'satis_kuru', label: 'Satış kuru', type: 'number', required: true },
        ],
        detailFields: [
          { key: 'efektif_alis', label: 'Efektif alış', type: 'number' },
          { key: 'efektif_satis', label: 'Efektif satış', type: 'number' },
          { key: 'kaynak', label: 'Kaynak' },
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
        codeField: 'hareket_kodu',
        nameField: 'hareket_adi',
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
        categoryKey: 'belge_tipi',
        filters: [
          { key: 'hareket_kodu', label: 'Hareket kodu' },
          { key: 'hareket_adi', label: 'Hareket adı' },
          { key: 'belge_tipi', label: 'Belge tipi' },
        ],
        columns: [
          { key: 'hareket_kodu', label: 'Kod', mono: true },
          { key: 'hareket_adi', label: 'Ad' },
          { key: 'belge_tipi', label: 'Belge tipi' },
          { key: 'yon', label: 'Yön' },
          { key: 'stok_etkisi', label: 'Stok' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'hareket_kodu', label: 'Hareket kodu', code: true, required: true },
          { key: 'hareket_adi', label: 'Hareket adı', name: true, required: true },
          { key: 'belge_tipi', label: 'Belge tipi', type: 'select', options: ['SatisTeklif','SatisSiparis','SevkEmri','SatisIrsaliye','SatisFatura','SatinAlmaTalep','SatinAlmaSiparis','MalKabul','AlisFatura','UretimEmri','UretimGiris','UretimTuketim','Transfer','Sayim','Fire','Duzeltme'], required: true },
          { key: 'yon', label: 'Yön', type: 'select', options: ['Giris','Cikis','Transfer','Bilgi'], required: true },
        ],
        detailFields: [
          { key: 'stok_etkisi', label: 'Stok etkisi', type: 'checkbox' },
          { key: 'cari_zorunlu', label: 'Cari zorunlu', type: 'checkbox' },
          { key: 'depo_zorunlu', label: 'Depo zorunlu', type: 'checkbox' },
          { key: 'eksi_bakiye_izin', label: 'Eksi bakiye izin', type: 'checkbox' },
          { key: 'muhasebe_hesap_kodu', label: 'Muhasebe hesap kodu' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
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
      { id: 'gozlem', title: 'Gözlem', screenIds: ['audit-log', 'tablo-bilgileri'] },
    ],
    screens: [
      {
        id: 'kullanicilar',
        techId: 'SYS-USR-SCR-001',
        businessNameEn: 'UsersScreen',
        title: 'Kullanıcılar',
        endpoint: '/kullanicilar',
        crud: true,
        codeField: 'kullanici_adi',
        nameField: 'ad',
        numeratorSeri: null,
        filters: [
          { key: 'kullanici_adi', label: 'Kullanıcı adı' },
          { key: 'ad', label: 'Ad' },
          { key: 'rol', label: 'Rol' },
          { key: 'grup_kodu', label: 'Grup' },
        ],
        columns: [
          { key: 'kullanici_adi', label: 'Kullanıcı adı', mono: true },
          { key: 'ad', label: 'Ad' },
          { key: 'soyad', label: 'Soyad' },
          { key: 'rol', label: 'Rol' },
          { key: 'grup_kodu', label: 'Grup', mono: true },
          { key: 'parola_var', label: 'Şifre' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kullanici_adi', label: 'Kullanıcı adı', required: true },
          { key: 'sifre', label: 'Şifre', type: 'password', requiredOnNew: true },
          { key: 'ad', label: 'Ad', name: true, required: true },
          { key: 'soyad', label: 'Soyad', required: true },
          { key: 'unvan', label: 'Ünvan' },
          { key: 'rol', label: 'Rol', type: 'select', options: ['Yonetici', 'Personel', 'Satinalma', 'Uretim', 'Finans'] },
          {
            key: 'grup_kodu',
            label: 'Grup',
            type: 'lookup',
            lookup: 'kullanici-gruplari',
            valueKey: 'grup_kodu',
            labelKey: 'grup_adi',
            codeKey: 'grup_kodu',
            required: true,
          },
        ],
        detailFields: [
          { key: 'eposta', label: 'E-posta' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'kullanici_kodu', label: 'Kullanıcı kodu (opsiyonel)' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
        defaults: { rol: 'Yonetici', grup_kodu: 'ADMIN', aktif: true, yetkiler: [] },
        kullaniciYetkiPaneli: true,
      },
      {
        id: 'kullanici-gruplari',
        techId: 'SYS-GRP-SCR-001',
        businessNameEn: 'UserGroupsScreen',
        title: 'Kullanıcı Grupları',
        endpoint: '/kullanici-gruplari',
        crud: true,
        codeField: 'grup_kodu',
        nameField: 'grup_adi',
        numeratorSeri: 'KULLANICI_GRUP',
        filters: [
          { key: 'grup_kodu', label: 'Grup kodu' },
          { key: 'grup_adi', label: 'Grup adı' },
        ],
        columns: [
          { key: 'grup_kodu', label: 'Kod', mono: true },
          { key: 'grup_adi', label: 'Ad' },
          { key: 'satinalma_onay', label: 'SA onay' },
          { key: 'kalite_kontrol', label: 'Kalite' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'grup_kodu', label: 'Grup kodu', code: true, required: true },
          { key: 'grup_adi', label: 'Grup adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'satinalma_talep', label: 'SA talep oluşturabilir', type: 'checkbox' },
          { key: 'satinalma_onay', label: 'SA onay yetkisi', type: 'checkbox' },
          { key: 'kalite_kontrol', label: 'Kalite kontrol yetkisi', type: 'checkbox' },
          { key: 'modul_yetkileri', label: 'Modül yetkileri JSON (["*"] veya ["stok","satis"])' },
          { key: 'depo_yetkileri', label: 'Depo yetkileri JSON (["*"] veya depo kodları)' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'parametre_kodu',
        nameField: 'parametre_adi',
        numeratorSeri: null,
        filters: [
          { key: 'parametre_kodu', label: 'Parametre' },
          { key: 'modul', label: 'Modül' },
        ],
        columns: [
          { key: 'parametre_kodu', label: 'Kod', mono: true },
          { key: 'parametre_adi', label: 'Ad' },
          { key: 'deger', label: 'Değer' },
          { key: 'modul', label: 'Modül' },
        ],
        masterFields: [
          { key: 'parametre_kodu', label: 'Parametre kodu', code: true, editableOnNew: true, required: true },
          { key: 'parametre_adi', label: 'Parametre adı', name: true, required: true },
          { key: 'deger', label: 'Değer' },
        ],
        detailFields: [
          { key: 'modul', label: 'Modül' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
          { key: 'tablo_adi', label: 'Tablo', queryParam: true },
          { key: 'ekran', label: 'Ekran / yol', queryParam: true },
          { key: 'kullanici_kodu', label: 'Kullanıcı', queryParam: true },
          { key: 'islem', label: 'İşlem', queryParam: true },
        ],
        columns: [
          { key: 'kayit_tarihi', label: 'Zaman' },
          { key: 'kullanici_kodu', label: 'Kullanıcı', mono: true },
          { key: 'tablo_adi', label: 'Tablo', mono: true },
          { key: 'kayit_id', label: 'Kayıt' },
          { key: 'islem', label: 'İşlem' },
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
        id: 'eposta-gonderimleri',
        techId: 'SYS-MAIL-SCR-001',
        businessNameEn: 'EmailDispatchScreen',
        title: 'E-posta Gönderimleri',
        endpoint: '/eposta-gonderimleri',
        crud: false,
        readOnly: true,
        filters: [
          { key: 'durum', label: 'Durum' },
          { key: 'alici', label: 'Alıcı' },
          { key: 'kaynak_tipi', label: 'Kaynak' },
        ],
        columns: [
          { key: 'id', label: 'ID', mono: true },
          { key: 'kaynak_tipi', label: 'Kaynak' },
          { key: 'alici', label: 'Alıcı' },
          { key: 'konu', label: 'Konu' },
          { key: 'durum', label: 'Durum' },
          { key: 'deneme_sayisi', label: 'Deneme' },
          { key: 'gonderim_tarihi', label: 'Gönderim' },
          { key: 'son_hata', label: 'Hata' },
        ],
      },

    ],
  },
  {
    id: 'ana-veri',
    title: 'Ana Veri',
    sections: [
      { id: 'organizasyon', title: 'Organizasyon', screenIds: ['firmalar', 'is-yerleri', 'depolar'] },
    ],
    screens: [
      {
        id: 'firmalar',
        techId: 'MDM-CO-SCR-001',
        businessNameEn: 'CompanyScreen',
        title: 'Firmalar',
        endpoint: '/firmalar',
        crud: true,
        codeField: 'firma_kodu',
        nameField: 'firma_adi',
        numeratorSeri: 'FIRMA',
        filters: [
          { key: 'firma_kodu', label: 'Firma kodu' },
          { key: 'firma_adi', label: 'Firma adı' },
        ],
        columns: [
          { key: 'firma_kodu', label: 'Kod', mono: true },
          { key: 'firma_adi', label: 'Ad' },
        ],
        masterFields: [
          { key: 'firma_kodu', label: 'Firma kodu', code: true, required: true },
          { key: 'firma_adi', label: 'Firma adı', name: true, required: true },
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
        codeField: 'is_yeri_kodu',
        nameField: 'is_yeri_adi',
        numeratorSeri: 'ISYERI',
        filters: [
          { key: 'firma_adi', label: 'Firma' },
          { key: 'is_yeri_kodu', label: 'İş yeri kodu' },
          { key: 'is_yeri_adi', label: 'İş yeri adı' },
        ],
        columns: [
          { key: 'firma_adi', label: 'Firma' },
          { key: 'is_yeri_kodu', label: 'Kod', mono: true },
          { key: 'is_yeri_adi', label: 'Ad' },
          { key: 'adres', label: 'Adres' },
        ],
        masterFields: [
          { key: 'is_yeri_kodu', label: 'İş yeri kodu', code: true, required: true },
          { key: 'is_yeri_adi', label: 'İş yeri adı', name: true, required: true },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
        ],
        detailFields: [
          { key: 'adres', label: 'Adres' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'depolar',
        techId: 'MDM-WH-SCR-001',
        businessNameEn: 'WarehouseMasterScreen',
        title: 'Depolar',
        endpoint: '/depolar',
        crud: true,
        codeField: 'depo_kodu',
        nameField: 'depo_adi',
        numeratorSeri: 'DEPO',
        filters: [
          { key: 'firma_kodu', label: 'Firma' },
          { key: 'is_yeri_kodu', label: 'İş yeri' },
          { key: 'depo_kodu', label: 'Depo kodu' },
          { key: 'depo_adi', label: 'Depo adı' },
        ],
        columns: [
          { key: 'firma_kodu', label: 'Firma', mono: true },
          { key: 'is_yeri_kodu', label: 'İş yeri', mono: true },
          { key: 'depo_kodu', label: 'Kod', mono: true },
          { key: 'depo_adi', label: 'Ad' },
          { key: 'varsayilan', label: 'Varsayılan' },
        ],
        masterFields: [
          { key: 'depo_kodu', label: 'Depo kodu', code: true, required: true },
          { key: 'depo_adi', label: 'Depo adı', name: true, required: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
        ],
        detailFields: [
          { key: 'raf_kodu', label: 'Raf kodu' },
          { key: 'konum_kodu', label: 'Konum kodu' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        endpoint: '/stoklar',
        crud: true,
        codeField: 'stok_kodu',
        nameField: 'stok_adi',
        numeratorSeri: 'HAMMADDE',
        numeratorFromField: { field: 'stok_tipi', map: {
          Hammadde: 'HAMMADDE',
          YariMamul: 'YARIMAMUL',
          Mamul: 'MAMUL',
          Ticari: 'TICARI',
          Hizmet: 'TICARI',
        } },
        filters: [
          { key: 'firma_kodu', label: 'Firma' },
          { key: 'is_yeri_kodu', label: 'İş yeri' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'stok_adi', label: 'Stok adı' },
        ],
        columns: [
          { key: 'firma_kodu', label: 'Firma', mono: true },
          { key: 'is_yeri_kodu', label: 'İş yeri', mono: true },
          { key: 'stok_kodu', label: 'Stok kodu', mono: true },
          { key: 'stok_adi', label: 'Stok adı' },
          { key: 'stok_tipi', label: 'Tip' },
          { key: 'tedarik_tipi', label: 'Tedarik' },
          { key: 'birim', label: 'Birim' },
          { key: 'satis_fiyati', label: 'Fiyat' },
        ],
        masterFields: [
          { key: 'stok_tipi', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'], required: true, lead: true },
          { key: 'stok_kodu', label: 'Stok kodu', code: true, required: true },
          { key: 'stok_adi', label: 'Stok adı', name: true, required: true },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
        ],
        detailFields: [
          { key: 'boyut', label: 'Boyut' },
          { key: 'agirlik', label: 'Ağırlık', type: 'number' },
        ],
        detailKey: 'stok_detaylari',
        formTabs: [
          {
            id: 'ana', label: 'Stok Kart', kind: 'master-detail',
            masterFields: [
              // Firma / iş yeri — zorunlu (sorunlu) alanlar; master’da en üstte
              {
                key: 'firma_id',
                label: 'Firma',
                type: 'lookup',
                lookup: 'firmalar',
                valueKey: 'id',
                labelKey: 'firma_adi',
                codeKey: 'firma_kodu',
                required: true,
                lead: true,
                critical: true,
              },
              {
                key: 'is_yeri_id',
                label: 'İş yeri',
                type: 'lookup',
                lookup: 'is-yerleri',
                valueKey: 'id',
                labelKey: 'is_yeri_adi',
                codeKey: 'is_yeri_kodu',
                required: true,
                lead: true,
                critical: true,
              },
              { key: 'stok_tipi', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'], required: true, lead: true },
              { key: 'stok_kodu', label: 'Stok kodu', code: true, required: true },
              { key: 'stok_adi', label: 'Stok adı', name: true, required: true },
              { key: 'stok_adi_2', label: 'Stok adı 2' },
              { key: 'uzun_stok_kodu', label: 'Uzun stok kodu' },
              { key: 'tedarik_tipi', label: 'Tedarik tipi', type: 'select', options: ['Satinalma', 'Uretim'], hint: 'Satınalma veya üretim temini' },
              { key: 'birim', label: 'Baz birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', required: true },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'satis_fiyati', label: 'Satış fiyatı', type: 'number' },
              { key: 'aktif', label: 'Aktif', type: 'checkbox' },
            ],
            detailFields: [
              { key: 'ulke_mensei', label: 'Ülke menşei', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_kodu', labelKey: 'ulke_adi' },
              { key: 'uretici_kodu', label: 'Üretici kodu' },
              { key: 'eski_stok_kodu', label: 'Eski stok kodu' },
              { key: 'orijinal_kod', label: 'Orijinal kod' },
              { key: 'gtip_kodu', label: 'GTİP / gümrük kodu' },
              { key: 'sinif_kodu', label: 'Sınıf kodu' },
              { key: 'varsayilan_kdv_oran', label: 'Varsayılan KDV %', type: 'number' },
            ],
          },
          {
            id: 'olcu', label: 'Ölçü Bilgileri', kind: 'fields',
            fields: [
              { key: 'hacim', label: 'Hacim', type: 'number' },
              { key: 'hacim_birimi', label: 'Hacim birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'yogunluk', label: 'Yoğunluk', type: 'number' },
              { key: 'yogunluk_birimi', label: 'Yoğunluk birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'agirlik_birimi', label: 'Ağırlık birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'net_agirlik', label: 'Net ağırlık', type: 'number' },
              { key: 'brut_agirlik', label: 'Brüt ağırlık', type: 'number' },
              { key: 'koli_brut_agirlik', label: 'Koli brüt ağırlık', type: 'number' },
              { key: 'kutu_brut_agirlik', label: 'Kutu brüt ağırlık', type: 'number' },
              { key: 'kutu_en_mm', label: 'Kutu en (mm)', type: 'number' },
              { key: 'kutu_boy_mm', label: 'Kutu boy (mm)', type: 'number' },
              { key: 'kutu_yukseklik_mm', label: 'Kutu yükseklik (mm)', type: 'number' },
              { key: 'barkod', label: 'Barkod' },
              { key: 'raf_omru_gun', label: 'Raf ömrü (gün)', type: 'number' },
              { key: 'miktar_hassasiyeti', label: 'Miktar hassasiyeti', type: 'number' },
              { key: 'parti_politika', label: 'Parti politikası', type: 'select', options: ['Takipsiz', 'IstegeBagli', 'Zorunlu'] },
              { key: 'seri_politika', label: 'Seri politikası', type: 'select', options: ['Takipsiz', 'IstegeBagli', 'Zorunlu'] },
              { key: 'kalite_kontrol_gerekli', label: 'Kalite kontrol gerekli', type: 'checkbox' },
              { key: 'varsayilan_giris_depo_id', label: 'Varsayılan giriş depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
              { key: 'varsayilan_cikis_depo_id', label: 'Varsayılan çıkış depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
            ],
          },
          {
            id: 'birim', label: 'Birim Dönüşümleri', kind: 'grid', key: 'birim_tanimlari', slots: 3,
            fields: [
              { key: 'kaynak_katsayi', label: 'Katsayı', type: 'number', size: 'short', hint: 'Sol miktar' },
              { key: 'birim_kodu', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
              { key: '_esittir', label: '=', type: 'static', size: 'short' },
              { key: 'katsayi', label: 'Katsayı', type: 'number', size: 'short', hint: 'Sağ miktar' },
              { key: 'cevrilecek_birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
              { key: 'barkod', label: 'Barkod' },
              { key: 'takip_birimi_mi', label: 'Takip birimi', type: 'checkbox' },
            ],
          },
          {
            id: 'satinalma-stok', label: 'Satınalma', kind: 'fields',
            fields: [
              { key: 'satin_birimi', label: 'Satınalma birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'satis_birimi', label: 'Satış birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'sa_tolerans_min_yuzde', label: 'SA tolerans min %', type: 'number' },
              { key: 'sa_tolerans_max_yuzde', label: 'SA tolerans max %', type: 'number' },
              { key: 'varsayilan_kdv_oran', label: 'Varsayılan KDV %', type: 'number' },
              { key: 'temin_suresi_gun', label: 'Temin süresi (gün)', type: 'number' },
              { key: 'cikis_tipi', label: 'Çıkış tipi', type: 'select', options: ['Manuel', 'OtomatikEmis', 'PartiDagitim'] },
              { key: 'silindi', label: 'Silindi', type: 'checkbox' },
            ],
          },
          {
            id: 'detay', label: 'Stok Detay', kind: 'grid', key: 'stok_detaylari', slots: 1,
            fields: [
              { key: 'boyut', label: 'Boyut' },
              { key: 'agirlik', label: 'Ağırlık', type: 'number' },
            ],
          },
          {
            id: 'kategori', label: 'Kategoriler', kind: 'fields',
            fields: [
              { key: 'abc_kodu', label: 'ABC kodu', type: 'lookup', lookup: 'kategoriler-abc', valueKey: 'kategori_kodu', labelKey: 'kategori_adi' },
              { key: 'marka', label: 'Marka', type: 'lookup', lookup: 'kategoriler-marka', valueKey: 'kategori_kodu', labelKey: 'kategori_adi' },
              { key: 'sinif_kodu', label: 'Sınıf kodu' },
            ],
          },
          {
            id: 'barkod-tab', label: 'Barkod', kind: 'grid', key: 'barkodlar', slots: 3,
            fields: [
              { key: 'barkod', label: 'Barkod' },
              { key: 'birim_kodu', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
          },
          {
            id: 'dil-stok', label: 'Dil Tanımları', kind: 'grid', key: 'dil_tanimlari', slots: 2,
            fields: [
              { key: 'dil_kodu', label: 'Dil kodu', type: 'lookup', lookup: 'diller', valueKey: 'dil_kodu', labelKey: 'dil_adi', autoFillName: 'dil_adi' },
              { key: 'stok_adi', label: 'Stok adı (dil)' },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
          },
          {
            id: 'mrp',
            label: 'MRP',
            kind: 'fields',
            fields: [
              { key: 'emniyet_stok', label: 'Emniyet stok', type: 'number' },
              { key: 'minimum_stok', label: 'Minimum stok', type: 'number' },
              { key: 'yeniden_siparis_seviyesi', label: 'Yeniden sipariş seviyesi', type: 'number' },
              { key: 'sabit_siparis_miktari', label: 'Sabit sipariş miktarı', type: 'number' },
              { key: 'optimum_siparis_miktari', label: 'Optimum sipariş miktarı', type: 'number' },
              { key: 'temin_suresi_gun', label: 'Temin süresi (gün)', type: 'number' },
              { key: 'maksimum_stok', label: 'Maksimum stok', type: 'number' },
              { key: 'cikis_tipi', label: 'Çıkış tipi', type: 'select', options: ['Manuel', 'OtomatikEmis', 'PartiDagitim'] },
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
          { id: 'stok-hareketleri', label: 'Stok Hareketleri', openScreen: 'stok-hareketleri', passFilters: ['stok_kodu', 'depo_kodu', 'stok_id', 'depo_id'] },
        ],
        filters: [
          { key: 'depo_kodu', label: 'Depo kodu' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'stok_adi', label: 'Stok adı' },
          { key: 'stok_tipi', label: 'Stok tipi' },
          { key: 'stok_statu', label: 'Stok statü' },
          { key: 'parti_no', label: 'Parti no' },
          { key: 'yalnizca_stokta', label: 'Yalnızca stokta olanları göster', type: 'checkbox', default: true, queryParam: true },
        ],
        columns: [
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'stok_tipi', label: 'Tip' },
          { key: 'stok_statu', label: 'Statü' },
          { key: 'parti_no', label: 'Parti', mono: true },
          { key: 'bakiye', label: 'Bakiye', mono: true },
          { key: 'rezerve', label: 'Rezerve', mono: true },
          { key: 'bloke', label: 'Bloke', mono: true },
          { key: 'tahsis', label: 'Tahsis', mono: true },
          { key: 'yolda', label: 'Yolda', mono: true },
          { key: 'kullanilabilir', label: 'Kullanılabilir', mono: true },
          { key: 'emniyet_stok', label: 'Emniyet' },
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
        codeField: 'hareket_no',
        nameField: 'hareket_tipi',
        categoryKey: 'hareket_tipi',
        listCategories: [
          { id: 'STOK_GIRIS', label: 'Giriş' },
          { id: 'STOK_CIKIS', label: 'Çıkış' },
          { id: 'TRANSFER', label: 'Transfer' },
          { id: 'SAYIM', label: 'Sayım' },
          { id: 'FIRE', label: 'Fire' },
          { id: 'DUZELTME', label: 'Düzeltme' },
        ],
        filters: [
          { key: 'hareket_no', label: 'Hareket no' },
          { key: 'hareket_tipi', label: 'Tip' },
          { key: 'depo_kodu', label: 'Depo' },
          { key: 'hareket_kodu', label: 'Hareket kodu' },
        ],
        columns: [
          { key: 'hareket_no', label: 'Hareket', mono: true },
          { key: 'hareket_kodu', label: 'Kod', mono: true },
          { key: 'hareket_tipi', label: 'Tip' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'referans_no', label: 'Referans', mono: true },
          { key: 'fiziksel_tarih', label: 'Fiziksel' },
          { key: 'mali_tarih', label: 'Mali' },
          { key: 'maliyet_toplam', label: 'Maliyet' },
          { key: 'kullanici_kodu', label: 'Kullanıcı' },
          { key: 'onay_durumu', label: 'Onay' },
        ],
        masterFields: [
          { key: 'hareket_no', label: 'Hareket no', code: true },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-stok', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu', required: true },
          { key: 'depo_id', label: 'Depo (kaynak)', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'hedef_depo_id', label: 'Hedef depo (transfer)', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'hareket_tarihi', label: 'Tarih', type: 'date' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'barkod', label: 'Barkod', hint: 'Okutunca stok eşleşir' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'raf_kodu', label: 'Raf' },
          { key: 'konum_kodu', label: 'Konum' },
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
        codeField: 'emir_no',
        nameField: 'kaynak_depo_kodu',
        numeratorSeri: 'TRANSFER_EMRI',
        approveAction: { label: 'Onayla (Transfer)', path: '/transfer-emirleri/{id}/onayla' },
        filters: [
          { key: 'emir_no', label: 'Emir no' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'kaynak_depo_kodu', label: 'Kaynak', mono: true },
          { key: 'hedef_depo_kodu', label: 'Hedef', mono: true },
          { key: 'talep_tarihi', label: 'Talep' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'emir_no', label: 'Emir no', code: true },
          { key: 'kaynak_depo_id', label: 'Kaynak depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'hedef_depo_id', label: 'Hedef depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'talep_tarihi', label: 'Talep tarihi', type: 'date' },
          { key: 'planlanan_tarih', label: 'Planlanan', type: 'date' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim' },
          { key: 'raf_kodu', label: 'Raf' },
          { key: 'aciklama', label: 'Açıklama' },
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
        codeField: 'belge_no',
        nameField: 'depo_kodu',
        numeratorSeri: 'SAYIM_BELGE',
        approveAction: { label: 'Onayla (Düzelt)', path: '/sayim-belgeleri/{id}/onayla' },
        filters: [
          { key: 'belge_no', label: 'Belge no' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'belge_no', label: 'Belge', mono: true },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'sayim_tarihi', label: 'Tarih' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'belge_no', label: 'Belge no', code: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'sayim_tarihi', label: 'Sayım tarihi', type: 'date' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'sistem_miktar', label: 'Sistem', type: 'number' },
          { key: 'sayilan_miktar', label: 'Sayılan', type: 'number' },
          { key: 'birim', label: 'Birim' },
          { key: 'raf_kodu', label: 'Raf' },
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
        codeField: 'parti_no',
        nameField: 'stok_adi',
        filters: [
          { key: 'parti_no', label: 'Parti no' },
          { key: 'stok_kodu', label: 'Stok kodu' },
        ],
        columns: [
          { key: 'parti_no', label: 'Parti', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'parti_politika', label: 'Politika' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'parti_no', label: 'Parti no', code: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'uretim_tarihi', label: 'Üretim tarihi', type: 'date' },
          { key: 'son_kullanma_tarihi', label: 'SKT', type: 'date' },
        ],
        detailFields: [
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        nameField: 'stok_adi',
        numeratorSeri: 'MRP_BI',
        filters: [
          { key: 'ihtiyac_no', label: 'No' },
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'kaynak', label: 'Kaynak' },
        ],
        columns: [
          { key: 'ihtiyac_no', label: 'No', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'miktar', label: 'Miktar' },
          { key: 'ihtiyac_tarihi', label: 'İhtiyaç tar.' },
          { key: 'kaynak', label: 'Kaynak' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'ihtiyac_no', label: 'İhtiyaç no', code: true, required: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'miktar', label: 'Miktar', type: 'number', required: true },
          { key: 'ihtiyac_tarihi', label: 'İhtiyaç tarihi', type: 'date', required: true },
          { key: 'kaynak', label: 'Kaynak', type: 'select', options: ['Manuel', 'Siparis', 'Tahmin', 'Bütçe'] },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
        ],
        detailFields: [
          { key: 'birim', label: 'Birim' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
          { key: 'calisma_no', label: 'Çalışma no' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'calisma_no', label: 'No', mono: true },
          { key: 'durum', label: 'Durum' },
          { key: 'baslangic_ts', label: 'Başlangıç' },
          { key: 'bitis_ts', label: 'Bitiş' },
          { key: 'satir_sayisi', label: 'Satır' },
          { key: 'net_pozitif', label: 'Net>0' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        nested: { screenId: 'mrp-sonuclar', link: 'mrp-sonuc' },
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
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'oneri', label: 'Öneri' },
        ],
        columns: [
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'bagimsiz_ihtiyac', label: 'Bağımsız' },
          { key: 'bagimli_ihtiyac', label: 'Bağımlı' },
          { key: 'emniyet_stok', label: 'Emniyet' },
          { key: 'kullanilabilir_stok', label: 'Eldeki' },
          { key: 'acik_satinalma', label: 'Açık SA' },
          { key: 'planlanan_uretim', label: 'Açık UE' },
          { key: 'net_ihtiyac', label: 'Net' },
          { key: 'onerilen_miktar', label: 'Öneri miktar' },
          { key: 'oneri', label: 'Öneri' },
          { key: 'planlanan_baslangic', label: 'Plan baş.' },
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
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'oneri', label: 'Öneri' },
        ],
        columns: [
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'bagimsiz_ihtiyac', label: 'Bağımsız' },
          { key: 'bagimli_ihtiyac', label: 'Bağımlı' },
          { key: 'kullanilabilir_stok', label: 'Eldeki' },
          { key: 'net_ihtiyac', label: 'Net' },
          { key: 'onerilen_miktar', label: 'Öneri miktar' },
          { key: 'oneri', label: 'Öneri' },
          { key: 'donusturuldu', label: 'Dönüştü' },
          { key: 'donusum_belge_no', label: 'Belge' },
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
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'rezervasyon_no', label: 'No', mono: true },
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'miktar', label: 'Miktar' },
          { key: 'kalan_miktar', label: 'Kalan' },
          { key: 'durum', label: 'Durum' },
        ],
      },
      {
        id: 'stok-serileri',
        techId: 'INV-SER-SCR-001',
        businessNameEn: 'SerialNumberScreen',
        title: 'Stok Serileri',
        endpoint: '/stok-serileri',
        crud: true,
        codeField: 'seri_no',
        nameField: 'stok_adi',
        numeratorSeri: 'SERI',
        filters: [
          { key: 'seri_no', label: 'Seri no' },
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'seri_no', label: 'Seri', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'parti_no', label: 'Parti', mono: true },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'seri_no', label: 'Seri no', code: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Depoda', 'SevkEdildi', 'Hurda', 'Serviste'] },
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
        codeField: 'stok_kodu',
        nameField: 'ikame_stok_kodu',
        filters: [
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'ikame_stok_kodu', label: 'İkame' },
        ],
        columns: [
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'ikame_stok_kodu', label: 'İkame', mono: true },
          { key: 'ikame_stok_adi', label: 'İkame ad' },
          { key: 'oncelik', label: 'Öncelik' },
        ],
        masterFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'ikame_stok_id', label: 'İkame stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'oncelik', label: 'Öncelik', type: 'number' },
          { key: 'aciklama', label: 'Açıklama' },
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
        endpoint: '/cariler',
        crud: true,
        codeField: 'cari_kodu',
        nameField: 'cari_adi',
        numeratorSeri: 'MUSTERI',
        numeratorFromField: { field: 'cari_turu', map: {
          Musteri: 'MUSTERI',
          Tedarikci: 'TEDARIKCI',
          HerIkisi: 'CARI_HERIKISI',
        } },
        filters: [
          { key: 'is_yeri_kodu', label: 'İş yeri' },
          { key: 'cari_kodu', label: 'Cari kodu' },
          { key: 'cari_adi', label: 'Cari adı' },
          { key: 'cari_turu', label: 'Tür' },
        ],
        columns: [
          { key: 'cari_kodu', label: 'Kod', mono: true },
          { key: 'cari_adi', label: 'Ad' },
          { key: 'cari_turu', label: 'Tür' },
          { key: 'is_yeri_kodu', label: 'İş yeri', mono: true },
          { key: 'telefon', label: 'Telefon' },
          { key: 'il', label: 'İl' },
        ],
        masterFields: [
          { key: 'cari_turu', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true, lead: true },
          { key: 'cari_kodu', label: 'Cari kodu', code: true, required: true },
          { key: 'cari_adi', label: 'Cari adı', name: true, required: true },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'vergi_no', label: 'VKN / TCKN' },
          { key: 'fatura_adres1', label: 'Adres 1' },
        ],
        detailFields: [
          { key: 'adres', label: 'Adres' },
          { key: 'fatura_adresi', label: 'Fatura adresi' },
          { key: 'yetkili_adi', label: 'Yetkili' },
          { key: 'yetkili_telefon', label: 'Yetkili tel' },
        ],
        detailKey: 'cari_detaylari',
        formTabs: [
          {
            id: 'ana', label: 'Cari Kart', kind: 'master-detail',
            masterFields: [
              { key: 'cari_turu', label: 'Hesap türü', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true, lead: true, group: 'kimlik' },
              { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu', critical: true, group: 'organizasyon' },
              { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu', group: 'organizasyon' },
              { key: 'cari_kodu', label: 'Cari kodu', code: true, required: true, group: 'kimlik' },
              { key: 'cari_adi', label: 'Cari adı', name: true, required: true, group: 'kimlik' },
              { key: 'cari_adi_2', label: 'Cari adı 2', group: 'kimlik' },
              { key: 'aktif', label: 'Aktif', type: 'checkbox', group: 'durum' },
              { key: 'silindi', label: 'Silindi', type: 'checkbox', group: 'durum' },
            ],
            detailFields: [
              { key: 'vergi_no', label: 'VKN / TCKN', group: 'finans' },
              { key: 'vergi_dairesi', label: 'Vergi dairesi', group: 'finans' },
              { key: 'pasaport_no', label: 'Pasaport no', group: 'kimlik' },
              { key: 'ad', label: 'Ad', group: 'kimlik' },
              { key: 'soyad', label: 'Soyad', group: 'kimlik' },
              { key: 'ulke', label: 'Ülke', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_kodu', labelKey: 'ulke_adi', group: 'adres' },
              { key: 'il', label: 'İl', group: 'adres' },
              { key: 'ilce', label: 'İlçe', group: 'adres' },
              { key: 'posta_kodu', label: 'Posta kodu', group: 'adres' },
              { key: 'fatura_adres1', label: 'Adres 1', group: 'adres' },
              { key: 'fatura_adres2', label: 'Adres 2', group: 'adres' },
              { key: 'fatura_adres3', label: 'Adres 3', group: 'adres' },
              { key: 'telefon', label: 'Telefon 1', group: 'iletisim' },
              { key: 'telefon2', label: 'Telefon 2', group: 'iletisim' },
              { key: 'cep_tel', label: 'Cep tel', group: 'iletisim' },
              { key: 'email', label: 'E-posta', group: 'iletisim' },
              { key: 'website', label: 'Website', group: 'iletisim' },
              { key: 'fax', label: 'Fax', group: 'iletisim' },
              { key: 'yetkili_adi', label: 'Yetkili', group: 'iletisim' },
              { key: 'yetkili_telefon', label: 'Yetkili tel', group: 'iletisim' },
              { key: 'para_birimi', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', group: 'finans' },
              { key: 'odeme_vadesi_gun', label: 'Vade (gün)', type: 'number', group: 'finans' },
              { key: 'aciklama', label: 'Açıklama', group: 'durum' },
              { key: 'notlar', label: 'Notlar', group: 'durum' },
            ],
          },
          {
            id: 'firma-param', label: 'Firma Parametreleri', kind: 'grid', key: 'firma_parametreleri', slots: 2,
            fields: [
              { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
              { key: 'muhasebe_hesap_kodu', label: 'Muhasebe hesap' },
              { key: 'para_birimi', label: 'Para birimi' },
              { key: 'cari_tipi', label: 'Cari tipi' },
              { key: 'risk_grup_kodu', label: 'Risk grubu' },
              { key: 'nakit_akisa_dahil', label: 'Nakit akışa dahil', type: 'checkbox' },
              { key: 'kur_degerlemeye_dahil', label: 'Kur değerleme', type: 'checkbox' },
            ],
          },
          {
            id: 'banka', label: 'Banka Bilgisi', kind: 'grid', key: 'banka_bilgileri', slots: 3,
            fields: [
              { key: 'iban', label: 'IBAN' },
              { key: 'banka_kodu', label: 'Banka kodu' },
              { key: 'banka_adi', label: 'Banka adı' },
              { key: 'swift_no', label: 'SWIFT' },
              { key: 'para_birimi', label: 'Para birimi' },
              { key: 'sube_kodu', label: 'Şube kodu' },
              { key: 'sube_adi', label: 'Şube adı' },
              { key: 'hesap_no', label: 'Hesap no' },
              { key: 'muhabir_hesap_no', label: 'Muhabir hesap' },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'pasif', label: 'Pasif', type: 'checkbox' },
            ],
          },
          {
            id: 'sevk', label: 'Sevk Adresleri', kind: 'grid', key: 'sevk_adresleri', slots: 3,
            fields: [
              { key: 'adres_adi', label: 'Adres adı' },
              { key: 'adres1', label: 'Adres 1' },
              { key: 'adres2', label: 'Adres 2' },
              { key: 'adres3', label: 'Adres 3' },
              { key: 'ulke', label: 'Ülke' },
              { key: 'il', label: 'İl' },
              { key: 'ilce', label: 'İlçe' },
              { key: 'posta_kodu', label: 'Posta kodu' },
              { key: 'telefon', label: 'Telefon' },
              { key: 'yetkili_adi', label: 'Yetkili' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
              { key: 'pasif', label: 'Pasif', type: 'checkbox' },
            ],
          },
          {
            id: 'genel', label: 'Genel Bilgiler', kind: 'fields',
            fields: [
              { key: 'kurulus_tarihi', label: 'Kuruluş tarihi', type: 'date' },
              { key: 'sektor_kodu', label: 'Sektör', type: 'lookup', lookup: 'kategoriler-sektor', valueKey: 'kategori_kodu', labelKey: 'kategori_adi' },
              { key: 'bolge_kodu', label: 'Bölge', type: 'lookup', lookup: 'kategoriler-bolge', valueKey: 'kategori_kodu', labelKey: 'kategori_adi' },
              { key: 'nace_kodu', label: 'NACE kodu' },
              { key: 'sermaye', label: 'Sermaye', type: 'number' },
            ],
          },
          {
            id: 'dil', label: 'Dil Tanımları', kind: 'grid', key: 'dil_tanimlari', slots: 2,
            fields: [
              { key: 'dil_kodu', label: 'Dil kodu', type: 'lookup', lookup: 'diller', valueKey: 'dil_kodu', labelKey: 'dil_adi', autoFillName: 'dil_adi' },
              { key: 'cari_adi', label: 'Cari adı (dil)' },
              { key: 'aciklama', label: 'Açıklama' },
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
          { key: 'hareket_no', label: 'Hareket no' },
          { key: 'yon', label: 'Yön' },
          { key: 'belge_tipi', label: 'Belge tipi' },
        ],
        columns: [
          { key: 'hareket_no', label: 'No', mono: true },
          { key: 'hareket_tarihi', label: 'Tarih' },
          { key: 'yon', label: 'Yön' },
          { key: 'tutar', label: 'Tutar' },
          { key: 'belge_tipi', label: 'Belge' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
      },
      {
        id: 'tahsilat-odemeler',
        techId: 'FIN-APAR-SCR-001',
        businessNameEn: 'CollectionPaymentScreen',
        title: 'Tahsilat / Ödeme',
        endpoint: '/tahsilat-odemeler',
        crud: true,
        codeField: 'belge_no',
        nameField: 'cari_adi',
        numeratorSeri: 'TAHSILAT',
        filters: [
          { key: 'belge_no', label: 'Belge no' },
          { key: 'tip', label: 'Tip' },
          { key: 'cari_adi', label: 'Cari' },
        ],
        columns: [
          { key: 'belge_no', label: 'Belge', mono: true },
          { key: 'tip', label: 'Tip' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'tutar', label: 'Tutar' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'kur', label: 'Kur' },
          { key: 'odeme_sekli', label: 'Ödeme' },
          { key: 'kasa_hesap_kodu', label: 'Kasa', mono: true },
          { key: 'banka_hesap_kodu', label: 'Banka', mono: true },
          { key: 'cek_no', label: 'Çek no' },
          { key: 'vade_tarihi', label: 'Vade' },
          { key: 'belge_tarihi', label: 'Tarih' },
          { key: 'durum', label: 'Durum' },
          { key: 'proje_kodu', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'belge_no', label: 'Belge no', code: true },
          { key: 'tip', label: 'Tip', type: 'select', options: ['Tahsilat', 'Odeme'], required: true },
          { key: 'cari_id', label: 'Cari', type: 'lookup', lookup: 'cariler', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'tutar', label: 'Tutar', type: 'number', required: true },
          { key: 'para_birimi', label: 'PB' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'KrediKarti'] },
          { key: 'belge_tarihi', label: 'Tarih', type: 'date' },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli'] },
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
      { id: 'urun-agaci', title: 'Ürün Ağacı', screenIds: ['urun-agaci', 'bom-patlatma', 'bom-seviye-listesi', 'bom-malzeme-degisikligi'] },
      { id: 'is-emri', title: 'İş Emri', screenIds: ['uretim-planlari', 'uretim-emirleri', 'siparis-is-emri', 'toplu-is-emri', 'uretim-girisleri'] },
      { id: 'depo', title: 'Depo', screenIds: ['stok-depo'] },
      { id: 'tanimlar', title: 'Tanımlar', screenIds: ['sinif-tanimi', 'is-merkezleri', 'rotalar', 'uretim-emri-tipleri'] },
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
        codeField: 'agac_kodu',
        nameField: 'agac_adi',
        filters: [
          { key: 'agac_kodu', label: 'Ağaç kodu' },
          { key: 'agac_adi', label: 'Ağaç adı' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'stok_adi', label: 'Stok adı' },
        ],
        columns: [
          { key: 'agac_kodu', label: 'Kod', mono: true },
          { key: 'agac_adi', label: 'Ad' },
          { key: 'stok_kodu', label: 'Kök stok', mono: true },
          { key: 'stok_adi', label: 'Kök adı' },
          { key: 'stok_tipi', label: 'Tip' },
          { key: 'gecerlilik_bitis', label: 'Geç. bitiş' },
        ],
        masterFields: [
          { key: 'agac_kodu', label: 'Kod', code: true, required: true },
          { key: 'agac_adi', label: 'Ad', name: true, required: true },
          { key: 'mamul_stok_id', label: 'Kök stok (Mamul)', type: 'lookup', lookup: 'stoklar-mamul', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'gecerlilik_baslangic', label: 'Geçerlilik baş.', type: 'date' },
          { key: 'gecerlilik_bitis', label: 'Geçerlilik bitiş', type: 'date' },
          { key: 'min_miktar', label: 'Min miktar', type: 'number' },
          { key: 'max_miktar', label: 'Max miktar', type: 'number' },
        ],
        detailFields: [],
        detailKey: null,
        formTabs: [
          {
            id: 'agac',
            label: 'Ürün Ağacı',
            kind: 'bom-workspace',
            key: 'satirlar',
            headerFields: [
              { key: 'agac_kodu', label: 'Kod', code: true, required: true },
              { key: 'agac_adi', label: 'Ad', name: true, required: true },
              { key: 'mamul_stok_id', label: 'Mamul (kök)', type: 'lookup', lookup: 'stoklar-mamul', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
              { key: 'miktar', label: 'Miktar', type: 'number' },
            ],
            fields: [
              { key: 'bilesen_stok_id', label: 'Malzeme', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
              { key: 'miktar', label: 'Miktar', type: 'number', required: true },
              { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
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
        codeField: 'liste_kodu',
        nameField: 'aciklama',
        banner: 'MRP için: mamul/ağaç seçip miktar girin — tüm seviyeler (mamul → yarı mamul → hammadde) miktarlarıyla listelenir.',
        filters: [
          { key: 'agac_kodu', label: 'Ağaç kodu' },
          { key: 'mamul_stok_id', label: 'Mamul stok', type: 'lookup', lookup: 'stoklar-mamul', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'agac_id', label: 'Ağaç', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu' },
          { key: 'miktar', label: 'Mamul miktar', type: 'number' },
          { key: 'stok_kodu', label: 'Bileşen stok' },
        ],
        columns: [
          { key: 'seviye', label: 'Sev.' },
          { key: 'agac_kodu', label: 'Ağaç', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'stok_tipi', label: 'Tip' },
          { key: 'birim_miktar', label: 'Birim miktar' },
          { key: 'miktar', label: 'Toplam ihtiyaç' },
          { key: 'birim', label: 'Birim' },
          { key: 'yol', label: 'Yol' },
        ],
      },
      {
        id: 'bom-seviye-listesi',
        techId: 'MFG-BOM-SCR-003',
        businessNameEn: 'BomLevelListScreen',
        title: 'Ürün Ağacı Seviye Listesi',
        endpoint: '/bom/seviye-listesi',
        crud: false,
        readOnly: true,
        codeField: 'liste_kodu',
        nameField: 'aciklama',
        banner: 'Tüm ürün ağaçlarının düz seviye dökümü (where-used / seviye raporu). Miktarlı patlatma için «Ürün Ağacı Patlatma» ekranını kullanın.',
        filters: [
          { key: 'agac_kodu', label: 'Ağaç kodu' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'mamul_kodu', label: 'Mamul' },
        ],
        columns: [
          { key: 'agac_kodu', label: 'Ağaç', mono: true },
          { key: 'seviye', label: 'Seviye' },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'miktar', label: 'Miktar' },
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
        nameField: 'aciklama',
        numeratorSeri: null,
        filters: [
          { key: 'islem_kodu', label: 'İşlem' },
          { key: 'eski_stok_kodu', label: 'Eski stok' },
        ],
        columns: [
          { key: 'islem_kodu', label: 'İşlem', mono: true },
          { key: 'eski_stok_kodu', label: 'Eski', mono: true },
          { key: 'yeni_stok_kodu', label: 'Yeni', mono: true },
          { key: 'guncellenen_satir', label: 'Satır' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        masterFields: [
          { key: 'eski_stok_id', label: 'Eski stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'yeni_stok_id', label: 'Yeni stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'agac_id', label: 'Ağaç (opsiyonel)', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu' },
          { key: 'aciklama', label: 'Açıklama', name: true },
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
        codeField: 'sinif_kodu',
        nameField: 'sinif_adi',
        numeratorSeri: 'STOK_SINIF',
        filters: [
          { key: 'sinif_kodu', label: 'Sınıf kodu' },
          { key: 'sinif_adi', label: 'Sınıf adı' },
        ],
        columns: [
          { key: 'sinif_kodu', label: 'Kod', mono: true },
          { key: 'sinif_adi', label: 'Ad' },
          { key: 'ust_sinif_kodu', label: 'Üst', mono: true },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'sinif_kodu', label: 'Sınıf kodu', code: true, required: true },
          { key: 'sinif_adi', label: 'Sınıf adı', name: true, required: true },
          { key: 'ust_sinif_kodu', label: 'Üst sınıf kodu' },
        ],
        detailFields: [
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'merkez_kodu',
        nameField: 'merkez_adi',
        filters: [
          { key: 'merkez_kodu', label: 'Merkez kodu' },
          { key: 'merkez_adi', label: 'Merkez adı' },
          { key: 'is_yeri_adi', label: 'İş yeri' },
        ],
        columns: [
          { key: 'merkez_kodu', label: 'Kod', mono: true },
          { key: 'merkez_adi', label: 'Ad' },
          { key: 'is_yeri_adi', label: 'İş yeri' },
        ],
        masterFields: [
          { key: 'merkez_kodu', label: 'Kod', code: true },
          { key: 'merkez_adi', label: 'Ad', name: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
        ],
        detailFields: [],
      },
      {
        id: 'rotalar',
        techId: 'MFG-ROUT-SCR-001',
        businessNameEn: 'RoutingScreen',
        title: 'Rotalar',
        endpoint: '/rotalar',
        crud: true,
        numeratorSeri: 'ROTA',
        codeField: 'rota_kodu',
        nameField: 'rota_adi',
        filters: [
          { key: 'rota_kodu', label: 'Rota kodu' },
          { key: 'rota_adi', label: 'Rota adı' },
          { key: 'stok_kodu', label: 'Stok kodu' },
        ],
        columns: [
          { key: 'rota_kodu', label: 'Kod', mono: true },
          { key: 'rota_adi', label: 'Ad' },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'agac_kodu', label: 'Ürün ağacı', mono: true },
          { key: 'varsayilan', label: 'Varsayılan' },
          { key: 'sablon', label: 'Şablon' },
        ],
        masterFields: [
          { key: 'rota_kodu', label: 'Kod', code: true, required: true },
          { key: 'rota_adi', label: 'Ad', name: true, required: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          {
            key: 'urun_agaci_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari',
            valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu', required: true,
            dependsOn: 'stok_id', filterKey: 'mamul_stok_id',
          },
          { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
          { key: 'sablon', label: 'Şablon', type: 'checkbox' },
          { key: 'gecerlilik_baslangic', label: 'Geçerlilik baş.', type: 'date' },
          { key: 'gecerlilik_bitis', label: 'Geçerlilik bitiş', type: 'date' },
        ],
        detailFields: [],
        detailKey: null,
        formTabs: [
          {
            id: 'rota',
            label: 'Rota',
            kind: 'rota-workspace',
            key: 'operasyonlar',
            headerFields: [
              { key: 'rota_kodu', label: 'Kod', code: true, required: true },
              { key: 'rota_adi', label: 'Ad', name: true, required: true },
              { key: 'stok_id', label: 'Mamul stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
              {
                key: 'urun_agaci_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari',
                valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu', required: true,
                dependsOn: 'stok_id', filterKey: 'mamul_stok_id',
              },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
            fields: [
              { key: 'sira_no', label: 'Sıra', type: 'number', required: true },
              { key: 'operasyon_kodu', label: 'Kod', required: true },
              { key: 'operasyon_adi', label: 'Ad', required: true },
              { key: 'is_merkezi_id', label: 'İş merkezi', type: 'lookup', lookup: 'is-merkezleri', valueKey: 'id', labelKey: 'merkez_adi', codeKey: 'merkez_kodu' },
              { key: 'sure_dk', label: 'Süre (dk)', type: 'number' },
              {
                key: 'cikti_stok_id', label: 'Çıktı', type: 'lookup', lookup: 'stoklar',
                valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu',
                filterByBomKey: 'urun_agaci_id', includeBomRoot: true,
              },
            ],
            componentFields: [
              {
                key: 'stok_id', label: 'Malzeme', type: 'lookup', lookup: 'stoklar',
                valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu',
                filterByBomKey: 'urun_agaci_id',
              },
              { key: 'miktar', label: 'Miktar', type: 'number' },
              { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
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
        codeField: 'tip_kodu',
        nameField: 'tip_adi',
        filters: [
          { key: 'tip_kodu', label: 'Tip kodu' },
          { key: 'tip_adi', label: 'Tip adı' },
          { key: 'planli_kesin', label: 'Planlı/Kesin' },
        ],
        columns: [
          { key: 'tip_kodu', label: 'Kod', mono: true },
          { key: 'tip_adi', label: 'Ad' },
          { key: 'planli_kesin', label: 'Planlı/Kesin' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'tip_kodu', label: 'Tip kodu', code: true, required: true },
          { key: 'tip_adi', label: 'Tip adı', name: true, required: true },
          { key: 'planli_kesin', label: 'Planlı/Kesin', type: 'select', options: ['Kesin', 'Planli'], required: true },
        ],
        detailFields: [
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        nameField: 'stok_kodu',
        convertAction: { label: 'İş Emrine Çevir', path: '/uretim-planlari/{id}/cevir' },
        filters: [
          { key: 'plan_no', label: 'Plan no' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'plan_no', label: 'Plan', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'miktar', label: 'Miktar' },
          { key: 'teslim_tarihi', label: 'Teslim' },
          { key: 'baslatildi', label: 'Başlatıldı' },
          { key: 'durum', label: 'Durum' },
          { key: 'emir_no', label: 'Emir', mono: true },
        ],
        masterFields: [
          { key: 'plan_no', label: 'Plan no', code: true },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'miktar', label: 'Miktar', type: 'number', required: true },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'planlanan_baslangic', label: 'Planlanan başlangıç', type: 'date' },
          { key: 'teslim_tarihi', label: 'Teslim tarihi', type: 'date' },
          { key: 'baslatildi', label: 'Başlatıldı', type: 'checkbox' },
          { key: 'sabit', label: 'Sabit', type: 'checkbox' },
          { key: 'malzeme', label: 'Malzeme (MRP)', type: 'checkbox' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Baslatildi', 'Kapali', 'Iptal'] },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { durum: 'Acik', baslatildi: false, sabit: false, malzeme: false },
      },
      {
        id: 'uretim-emirleri',
        techId: 'MFG-WO-SCR-001',
        businessNameEn: 'WorkOrderScreen',
        title: 'Üretim Emirleri',
        endpoint: '/uretim-emirleri',
        crud: true,
        numeratorSeri: 'URETIM_EMRI',
        codeField: 'emir_no',
        nameField: 'stok_kodu',
        approveAction: { label: 'Onayla', path: '/uretim-emirleri/{id}/onayla' },
        secondaryAction: { label: 'Başlat', path: '/uretim-emirleri/{id}/baslat' },
        detailFillAction: { label: 'Detayları Doldur', path: '/uretim-emirleri/{id}/detaylari-doldur' },
        bomRotaChangeAction: { label: 'BOM/Rota Uygula', path: '/uretim-emirleri/{id}/bom-rota-degistir' },
        filters: [
          { key: 'emir_no', label: 'Emir no' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'emir_tipi_kodu', label: 'Tip' },
          { key: 'durum', label: 'Durum' },
          { key: 'acik_kapali', label: 'Açık/Kapalı' },
        ],
        columns: [
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'emir_tipi_kodu', label: 'Tip', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'planlanan_miktar', label: 'Plan' },
          { key: 'uretilen_miktar', label: 'Üretilen' },
          { key: 'planli_kesin', label: 'P/K' },
          { key: 'acik_kapali', label: 'A/K' },
          { key: 'onayli', label: 'Onay' },
          { key: 'baslatildi', label: 'Başlatıldı' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'emir_no', label: 'Emir no', code: true },
          { key: 'emir_tarihi', label: 'Emir tarihi', type: 'date', required: true },
          { key: 'emir_tipi_id', label: 'Emir tipi', type: 'lookup', lookup: 'uretim-emri-tipleri', valueKey: 'id', labelKey: 'tip_adi', codeKey: 'tip_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar-mamul', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'urun_agaci_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu', required: true },
          { key: 'rota_id', label: 'Rota', type: 'lookup', lookup: 'rotalar', valueKey: 'id', labelKey: 'rota_adi', codeKey: 'rota_kodu', required: true },
          { key: 'siparis_id', label: 'Satış siparişi', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', codeKey: 'siparis_no' },
          { key: 'planlanan_miktar', label: 'Planlanan miktar', type: 'number', required: true },
          { key: 'uretilen_miktar', label: 'Üretilen miktar', type: 'number', readOnly: true },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'hammadde_depo_id', label: 'Hammadde depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'yari_mamul_depo_id', label: 'Yarı mamul depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'mamul_depo_id', label: 'Mamul / giriş depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'plan_baslangic', label: 'Plan başlangıç', type: 'date' },
          { key: 'plan_bitis', label: 'Plan bitiş', type: 'date' },
          { key: 'bitis_tarihi', label: 'Bitiş tarihi', type: 'date' },
          { key: 'planli_kesin', label: 'Planlı/Kesin', type: 'select', options: ['Kesin', 'Planli'] },
          { key: 'acik_kapali', label: 'Açık/Kapalı', type: 'select', options: ['Acik', 'Kapali'] },
          { key: 'cikis_tipi', label: 'Çıkış tipi', type: 'select', options: ['Manuel', 'OtomatikEmis', 'PartiDagitim'] },
          { key: 'giris_tipi', label: 'Giriş tipi', type: 'select', options: ['Manuel', 'OtomatikEmis', 'PartiDagitim'] },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'OnayBekliyor', 'Acik', 'Uretimde', 'Kapali', 'Iptal'] },
          { key: 'onayli', label: 'Onaylı', type: 'checkbox' },
          { key: 'yayinlandi', label: 'Yayınlandı', type: 'checkbox' },
          { key: 'yazdirildi', label: 'Yazdırıldı', type: 'checkbox' },
          { key: 'urun_girisi_tamamlandi', label: 'Ürün girişi tamam', type: 'checkbox' },
          { key: 'baslatildi', label: 'Başlatıldı', type: 'checkbox', readOnly: true },
          { key: 'aciklama', label: 'Açıklama', size: 'wide' },
        ],
        detailFields: [
          { key: 'sira_no', label: 'Op. no', type: 'number', size: 'short' },
          { key: 'operasyon_kodu', label: 'Operasyon kodu', size: 'short' },
          { key: 'operasyon_adi', label: 'Operasyon adı' },
          { key: 'is_merkezi_id', label: 'İş merkezi', type: 'lookup', lookup: 'is-merkezleri', valueKey: 'id', labelKey: 'merkez_adi', codeKey: 'merkez_kodu' },
          { key: 'planlanan_miktar', label: 'Plan miktar', type: 'number', size: 'short' },
          { key: 'uretilen_miktar', label: 'Üretilen', type: 'number', size: 'short', readOnly: true },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Bekliyor', 'Hazir', 'Tamamlandi', 'Kapali'] },
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
              { key: 'sira_no', label: 'Sıra', type: 'number', size: 'short' },
              { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
              { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
              { key: 'planlanan_miktar', label: 'Plan miktar', type: 'number', size: 'short', required: true },
              { key: 'tuketilen_miktar', label: 'Tüketilen', type: 'number', size: 'short', readOnly: true },
              { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
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
        defaults: {
          cikis_tipi: 'Manuel',
          giris_tipi: 'Manuel',
          baslatildi: false,
          acik_kapali: 'Acik',
          planli_kesin: 'Kesin',
          onayli: false,
          yayinlandi: false,
          yazdirildi: false,
          urun_girisi_tamamlandi: false,
          durum: 'Acik',
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
        codeField: 'siparis_no',
        nameField: 'stok_kodu',
        filters: [
          { key: 'siparis_no', label: 'Sipariş' },
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'cari_adi', label: 'Cari' },
        ],
        columns: [
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'siparis_miktar', label: 'Sip. miktar' },
          { key: 'kalan_miktar', label: 'Kalan' },
          { key: 'onerilen_agac_kodu', label: 'Ağaç', mono: true },
          { key: 'onerilen_rota_kodu', label: 'Rota', mono: true },
        ],
        masterFields: [
          { key: 'siparis_id', label: 'Sipariş', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', codeKey: 'siparis_no', required: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'emir_tipi_id', label: 'Emir tipi', type: 'lookup', lookup: 'uretim-emri-tipleri', valueKey: 'id', labelKey: 'tip_adi', codeKey: 'tip_kodu' },
          { key: 'urun_agaci_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu', required: true },
          { key: 'rota_id', label: 'Rota', type: 'lookup', lookup: 'rotalar', valueKey: 'id', labelKey: 'rota_adi', codeKey: 'rota_kodu', required: true },
          { key: 'planlanan_miktar', label: 'Planlanan miktar', type: 'number', required: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'hammadde_depo_id', label: 'Hammadde depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'mamul_depo_id', label: 'Mamul depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'yari_mamul_depo_id', label: 'Yarı mamul depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
        ],
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
        codeField: 'siparis_no',
        nameField: 'stok_kodu',
        filters: [
          { key: 'siparis_no', label: 'Sipariş' },
          { key: 'stok_kodu', label: 'Stok' },
        ],
        columns: [
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'kalan_miktar', label: 'Kalan' },
          { key: 'onerilen_agac_kodu', label: 'Ağaç', mono: true },
          { key: 'onerilen_rota_kodu', label: 'Rota', mono: true },
        ],
        masterFields: [
          { key: 'emir_tipi_id', label: 'Ortak emir tipi', type: 'lookup', lookup: 'uretim-emri-tipleri', valueKey: 'id', labelKey: 'tip_adi', codeKey: 'tip_kodu' },
          { key: 'is_yeri_id', label: 'Ortak iş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'hammadde_depo_id', label: 'Ortak hammadde depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'mamul_depo_id', label: 'Ortak mamul depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'yari_mamul_depo_id', label: 'Ortak yarı mamul depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
        ],
        detailFields: [
          { key: 'siparis_id', label: 'Sipariş', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', codeKey: 'siparis_no', required: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'urun_agaci_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu', required: true },
          { key: 'rota_id', label: 'Rota', type: 'lookup', lookup: 'rotalar', valueKey: 'id', labelKey: 'rota_adi', codeKey: 'rota_kodu', required: true },
          { key: 'planlanan_miktar', label: 'Miktar', type: 'number', required: true },
        ],
        detailKey: 'kalemler',
        detailSlots: 6,
      },
      {
        id: 'stok-depo',
        techId: 'INV-WHL-SCR-001',
        businessNameEn: 'ItemWarehouseLinkScreen',
        title: 'Depo Stok Bağ',
        endpoint: '/stok-depo',
        crud: true,
        codeField: 'stok_kodu',
        nameField: 'depo_kodu',
        filters: [
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'depo_kodu', label: 'Depo' },
          { key: 'is_yeri_kodu', label: 'İş yeri' },
        ],
        columns: [
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Stok adı' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'depo_adi', label: 'Depo adı' },
          { key: 'is_yeri_kodu', label: 'İş yeri', mono: true },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
        ],
        detailFields: [
          { key: 'varsayilan_giris', label: 'Varsayılan giriş', type: 'checkbox' },
          { key: 'varsayilan_cikis', label: 'Varsayılan çıkış', type: 'checkbox' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        nameField: 'emir_no',
        numeratorSeri: null,
        filters: [
          { key: 'giris_no', label: 'Giriş no' },
          { key: 'emir_no', label: 'Emir no' },
          { key: 'stok_kodu', label: 'Stok' },
        ],
        columns: [
          { key: 'giris_no', label: 'Giriş', mono: true },
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'miktar', label: 'Miktar' },
          { key: 'kayit_tarihi', label: 'Tarih' },
        ],
        masterFields: [
          { key: 'emir_id', label: 'Üretim emri', type: 'lookup', lookup: 'uretim-emirleri', valueKey: 'id', labelKey: 'emir_no', required: true },
          { key: 'miktar', label: 'Miktar', type: 'number', required: true },
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
      { id: 'mal-kabul', title: 'Mal Kabul', screenIds: ['mal-kabuller', 'tedarikci-irsaliyeleri'] },
      { id: 'faturalar', title: 'Faturalar', screenIds: ['alis-faturalari', 'belge-yonetimi'] },
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
        nameField: 'aciklama',
        filters: [
          { key: 'istek_no', label: 'İstek no' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'istek_no', label: 'İstek', mono: true },
          { key: 'durum', label: 'Durum' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        masterFields: [
          { key: 'istek_no', label: 'İstek no', code: true },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Onayli', 'TeklifeDonustu', 'Iptal', 'Kapali'] },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
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
        codeField: 'teklif_no',
        nameField: 'cari_adi',
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
          { key: 'teklif_no', label: 'Teklif no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'teklif_no', label: 'Teklif', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'talep_no', label: 'Talep', mono: true },
          { key: 'para_birimi', label: 'PB' },
          { key: 'gecerlilik_tarihi', label: 'Geçerlilik' },
          { key: 'durum', label: 'Durum' },
          { key: 'proje_kodu', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'teklif_no', label: 'Teklif no', code: true },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'talep_id', label: 'Satınalma talebi', type: 'lookup', lookup: 'satin-alma-talepleri', valueKey: 'id', labelKey: 'talep_no', fillFrom: 'talep-satirlar' },
          { key: 'istek_id', label: 'Eski teklif isteği', type: 'number' },
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'para_birimi', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'gecerlilik_tarihi', label: 'Geçerlilik', type: 'date' },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'bolge', label: 'Bölge' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'SipariseDonustu', 'Iptal', 'Kapali'] },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'not_public', label: 'Tedarikçi notu' },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'satir_tipi', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', size: 'short' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'kur', label: 'Kur', type: 'number', size: 'short' },
          { key: 'iskonto_oran', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'kdv_durumu', label: 'KDV durum', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'teslim_tarihi', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'proje_kodu', label: 'Proje', size: 'short' },
          { key: 'bolge', label: 'Bölge', size: 'short' },
          { key: 'satir_aciklama', label: 'Açıklama' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { para_birimi: 'TRY', kur: 1, kur_tipi: 'TCMB-ALIS', kdv_durumu: 'Haric', satir_tipi: 'S' },
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
        nameField: 'cari_adi',
        filters: [
          { key: 'anlasma_no', label: 'Anlaşma no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'anlasma_no', label: 'Anlaşma', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'anlasma_no', label: 'Anlaşma no', code: true },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'teklif_id', label: 'Teklif', type: 'lookup', lookup: 'satin-alma-teklifleri', valueKey: 'id', labelKey: 'teklif_no' },
          { key: 'baslangic_tarihi', label: 'Başlangıç', type: 'date' },
          { key: 'bitis_tarihi', label: 'Bitiş', type: 'date' },
          { key: 'para_birimi', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi' },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kapali', 'Iptal'] },
          { key: 'aciklama', label: 'Açıklama', name: true },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi' },
          { key: 'kur', label: 'Kur', type: 'number' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { para_birimi: 'TRY', kur: 1, durum: 'Taslak' },
      },
      {
        id: 'alis-faturalari',
        techId: 'FIN-PINV-SCR-001',
        businessNameEn: 'PurchaseInvoiceScreen',
        title: 'Alış Faturaları',
        endpoint: '/faturalar?fatura_turu=Alis',
        crud: true,
        numeratorSeri: 'ALIS_FATURA',
        codeField: 'fatura_no',
        nameField: 'cari_adi',
        approveAction: { label: '3-way Eşleştir', path: '/faturalar/{id}/eslestir' },
        convertAction: { label: 'Muhasebeleştir', path: '/faturalar/{id}/muhasebelestir' },
        filters: [
          { key: 'fatura_no', label: 'Fatura no' },
          { key: 'cari_adi', label: 'Cari' },
        ],
        columns: [
          { key: 'fatura_no', label: 'Fatura', mono: true },
          { key: 'musteri_fatura_no', label: 'Ted. fatura no', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'fatura_turu', label: 'Tür' },
          { key: 'fatura_tarihi', label: 'Tarih' },
          { key: 'vade_tarihi', label: 'Vade' },
          { key: 'mal_hizmet_toplam', label: 'Ara top.' },
          { key: 'toplam_kdv', label: 'KDV' },
          { key: 'odenecek_tutar', label: 'Ödenecek' },
          { key: 'odeme_durumu', label: 'Ödeme' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'fatura_no', label: 'Fatura no', code: true },
          { key: 'musteri_fatura_no', label: 'Tedarikçi fatura no' },
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'fatura_turu', label: 'Fatura türü', type: 'select', options: ['Alis', 'AlisIade'], required: true },
          { key: 'fatura_tarihi', label: 'Fatura tarihi', type: 'date' },
          { key: 'vade_tarihi', label: 'Vade tarihi', type: 'date' },
          { key: 'mal_kabul_id', label: 'Mal kabul', type: 'lookup', lookup: 'mal-kabuller', valueKey: 'id', labelKey: 'kabul_no', fillFrom: 'mal-kabul-satirlar' },
          { key: 'siparis_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'siparis_no' },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'AcikHesap'] },
          { key: 'odeme_durumu', label: 'Ödeme durumu', type: 'select', options: ['Odenmedi', 'Kismi', 'Odendi', 'Iptal'] },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'bolge', label: 'Bölge' },
          { key: 'not_public', label: 'Not' },
          { key: 'not_internal', label: 'Dahili not' },
          { key: 'muhasebelesti', label: 'Muhasebeleşti', type: 'checkbox', readOnly: true },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'iskonto_oran', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'kdv_durumu', label: 'KDV durum', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
        defaults: { fatura_turu: 'Alis', para_birimi: 'TRY', kur: 1, kur_tipi: 'TCMB-ALIS', kdv_durumu: 'Haric' },
      },
      {
        id: 'satin-alma-talepleri',
        techId: 'PUR-REQ-SCR-001',
        businessNameEn: 'PurchaseRequisitionScreen',
        title: 'Satınalma Talepleri',
        endpoint: '/satin-alma-talepleri',
        crud: true,
        numeratorSeri: 'SATINALMA_TALEP',
        codeField: 'talep_no',
        nameField: 'aciklama',
        approveAction: { label: 'Onayla + E-posta', path: '/satin-alma-talepleri/{id}/onayla' },
        filters: [
          { key: 'talep_no', label: 'Talep no' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'talep_no', label: 'Talep', mono: true },
          { key: 'durum', label: 'Durum' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        masterFields: [
          { key: 'talep_no', label: 'Talep no', code: true },
          { key: 'talep_tarihi', label: 'Talep tarihi', type: 'date' },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu', required: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'tedarikci_cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
          { key: 'hedef_teslim_tarihi', label: 'Hedef teslim', type: 'date' },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'bolge', label: 'Bölge' },
          { key: 'para_birimi', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Onayli', 'SipariseDonustu', 'Iptal', 'Kapali'] },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'satir_tipi', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'miktar', label: 'Miktar', type: 'number', required: true, size: 'short' },
          { key: 'tahmini_birim_fiyat', label: 'Tahmini fiyat', type: 'number', size: 'short' },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', size: 'short' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'kur', label: 'Kur', type: 'number', size: 'short' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'kdv_durumu', label: 'KDV durum', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'iskonto_oran', label: 'İsk %', type: 'number', size: 'short' },
          { key: 'teslim_tarihi', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'proje_kodu', label: 'Proje', size: 'short' },
          { key: 'bolge', label: 'Bölge', size: 'short' },
          { key: 'tedarikci_stok_kodu', label: 'Ted. stok kodu' },
          { key: 'tedarikci_stok_adi', label: 'Ted. stok adı' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'rezervasyon_tipi', label: 'Rezervasyon tipi' },
          { key: 'rezervasyon_iliski_no', label: 'Rezervasyon ilişki no' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: {
          para_birimi: 'TRY', kur: 1, durum: 'Acik', kur_tipi: 'TCMB-ALIS',
          kdv_oran: 20, kdv_durumu: 'Haric', satir_tipi: 'S',
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
        codeField: 'siparis_no',
        nameField: 'cari_adi',
        filters: [
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'tedarikci_siparis_no', label: 'Ted. sip. no', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'siparis_tarihi', label: 'Tarih' },
          { key: 'teslim_tarihi', label: 'Teslim' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'ara_toplam', label: 'Ara top.' },
          { key: 'toplam_kdv', label: 'KDV' },
          { key: 'genel_toplam', label: 'Genel' },
          { key: 'odeme_kosulu', label: 'Ödeme koş.' },
          { key: 'durum', label: 'Durum' },
          { key: 'proje_kodu', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'siparis_no', label: 'Sipariş no', code: true },
          { key: 'tedarikci_siparis_no', label: 'Tedarikçi sipariş no' },
          { key: 'talep_id', label: 'Satınalma talebi', type: 'lookup', lookup: 'satin-alma-talepleri', valueKey: 'id', labelKey: 'talep_no', fillFrom: 'talep-satirlar' },
          { key: 'teklif_id', label: 'Satınalma teklifi', type: 'lookup', lookup: 'satin-alma-teklifleri', valueKey: 'id', labelKey: 'teklif_no', fillFrom: 'sa-teklif-satirlar' },
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'siparis_tarihi', label: 'Sipariş tarihi', type: 'date' },
          { key: 'teslim_tarihi', label: 'Teslim tarihi', type: 'date' },
          { key: 'sevk_tarihi', label: 'Sevk tarihi', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'KismiTeslim', 'Kapali', 'Iptal'] },
          { key: 'para_birimi', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'AcikHesap'] },
          { key: 'teslimat_kosulu', label: 'Teslimat koşulu', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'kosul_kodu', labelKey: 'kosul_adi' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'bolge', label: 'Bölge' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'not_public', label: 'Tedarikçi notu' },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'satir_tipi', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'miktar', label: 'Miktar', type: 'number', required: true, size: 'short' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number', required: true, size: 'short' },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', size: 'short' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'kur', label: 'Kur', type: 'number', size: 'short' },
          { key: 'iskonto_oran', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'kdv_durumu', label: 'KDV durum', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'tevkifat_kodu', label: 'Tevkifat kodu', size: 'short' },
          { key: 'tevkifat_oran', label: 'Tevkifat %', type: 'number', size: 'short' },
          { key: 'otv_oran', label: 'ÖTV %', type: 'number', size: 'short' },
          { key: 'teslim_tarihi', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'sevk_tarihi', label: 'Sevk', type: 'date', size: 'short' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'proje_kodu', label: 'Proje', size: 'short' },
          { key: 'bolge', label: 'Bölge', size: 'short' },
          { key: 'tedarikci_stok_kodu', label: 'Ted. stok kodu' },
          { key: 'tedarikci_stok_adi', label: 'Ted. stok adı' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'rezervasyon_tipi', label: 'Rezervasyon tipi' },
          { key: 'rezervasyon_iliski_no', label: 'Rezervasyon ilişki no' },
          { key: 'giren_miktar', label: 'Giren', type: 'number', size: 'short' },
          { key: 'kalan_miktar', label: 'Bekleyen', type: 'number', size: 'short' },
          { key: 'tutar_ht', label: 'Tutar HT', type: 'number', size: 'short' },
          { key: 'tutar_ttc', label: 'Tutar TTC', type: 'number', size: 'short' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { para_birimi: 'TRY', kur: 1, durum: 'Taslak', kur_tipi: 'TCMB-ALIS', kdv_durumu: 'Haric' },
      },
      {
        id: 'mal-kabuller',
        techId: 'PUR-GR-SCR-001',
        businessNameEn: 'GoodsReceiptScreen',
        title: 'Mal Kabuller',
        endpoint: '/mal-kabuller',
        crud: true,
        numeratorSeri: 'MAL_KABUL',
        codeField: 'kabul_no',
        nameField: 'siparis_no',
        convertAction: {
          label: 'Alış Faturası Oluştur',
          path: '/mal-kabuller/{id}/fatura-olustur',
          nested: { screenId: 'alis-faturalari', link: 'mal-kabul-fatura' },
        },
        filters: [
          { key: 'kabul_no', label: 'Kabul no' },
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'depo_kodu', label: 'Depo' },
        ],
        columns: [
          { key: 'kabul_no', label: 'Kabul', mono: true },
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'irsaliye_no_tedarikci', label: 'Ted. irsaliye', mono: true },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'kabul_tarihi', label: 'Tarih' },
          { key: 'durum', label: 'Durum' },
          { key: 'kabul_eden_kullanici', label: 'Kabul eden' },
          { key: 'gkk_gerekli', label: 'GKK' },
        ],
        masterFields: [
          { key: 'kabul_no', label: 'Kabul no', code: true },
          { key: 'siparis_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'siparis_no', required: true, fillFrom: 'siparis-satirlar' },
          { key: 'tedarikci_irsaliye_id', label: 'Tedarikçi irsaliyesi', type: 'lookup', lookup: 'tedarikci-irsaliyeleri', valueKey: 'id', labelKey: 'irsaliye_no', fillFrom: 'tedarikci-irsaliye-satirlar' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'kabul_tarihi', label: 'Kabul tarihi', type: 'date' },
          { key: 'irsaliye_no_tedarikci', label: 'Tedarikçi irsaliye no' },
          { key: 'irsaliye_tarihi', label: 'İrsaliye tarihi', type: 'date' },
          { key: 'fatura_no_tedarikci', label: 'Tedarikçi fatura no (opsiyonel)' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kismi', 'Iptal', 'Kapali'] },
          { key: 'gkk_gerekli', label: 'GKK gerekli', type: 'checkbox' },
          { key: 'kabul_eden_kullanici', label: 'Kabul eden' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'kabul_edilen', label: 'Kabul edilen', type: 'number' },
          { key: 'reddedilen', label: 'Reddedilen', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'parti_no', label: 'Parti no' },
          { key: 'seri_no', label: 'Seri no' },
          { key: 'stok_statu', label: 'Statü', type: 'select', options: ['Kalitede', 'Kullanilabilir', 'Bloke'] },
          { key: 'raf_kodu', label: 'Raf' },
          { key: 'son_kullanma_tarihi', label: 'SKT', type: 'date' },
          { key: 'satir_aciklama', label: 'Açıklama' },
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
        codeField: 'irsaliye_no',
        nameField: 'cari_adi',
        numeratorSeri: 'TEDARIKCI_IRSALIYE',
        filters: [
          { key: 'irsaliye_no', label: 'İrsaliye no' },
          { key: 'cari_adi', label: 'Tedarikçi' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'irsaliye_no', label: 'İrsaliye', mono: true },
          { key: 'cari_adi', label: 'Tedarikçi' },
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'irsaliye_tarihi', label: 'Tarih' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'irsaliye_no', label: 'İrsaliye no', code: true },
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'siparis_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'siparis_no', fillFrom: 'siparis-satirlar' },
          { key: 'irsaliye_tarihi', label: 'İrsaliye tarihi', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Kismi', 'Kapali', 'Iptal'] },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'kabul_edilen', label: 'Kabul edilen', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'satir_aciklama', label: 'Açıklama' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { durum: 'Acik' },
      },
      {
        id: 'belge-yonetimi',
        techId: 'PUR-DOC-SCR-001',
        businessNameEn: 'DeliveryInvoiceManagementScreen',
        title: 'İrsaliye / Fatura Yönetimi',
        endpoint: '/belge-yonetimi',
        crud: false,
        readOnly: true,
        hideActions: true,
        filters: [
          { key: 'yon', label: 'Alış / Satış', type: 'select', options: ['', 'alis', 'satis'], queryParam: true },
          { key: 'belge_turu', label: 'Belge türü', type: 'select', options: ['', 'irsaliye', 'fatura'], queryParam: true },
          { key: 'belge_no', label: 'Belge no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'belge_sinifi', label: 'Sınıf' },
          { key: 'belge_no', label: 'Belge no', mono: true },
          { key: 'yon', label: 'Yön' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'belge_tarihi', label: 'Tarih' },
          { key: 'tutar', label: 'Tutar', mono: true },
          { key: 'para_birimi', label: 'PB' },
          { key: 'durum', label: 'Durum' },
        ],
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
        codeField: 'asama_kodu',
        nameField: 'asama_adi',
        filters: [
          { key: 'asama_kodu', label: 'Kod' },
          { key: 'asama_adi', label: 'Ad' },
        ],
        columns: [
          { key: 'asama_kodu', label: 'Kod', mono: true },
          { key: 'asama_adi', label: 'Ad' },
          { key: 'sira_no', label: 'Sıra' },
          { key: 'kazanan', label: 'Kazanan' },
          { key: 'kaybeden', label: 'Kaybeden' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'asama_kodu', label: 'Aşama kodu', code: true, required: true },
          { key: 'asama_adi', label: 'Aşama adı', name: true, required: true },
          { key: 'sira_no', label: 'Sıra', type: 'number' },
        ],
        detailFields: [
          { key: 'kazanan', label: 'Kazanan aşama', type: 'checkbox' },
          { key: 'kaybeden', label: 'Kaybeden aşama', type: 'checkbox' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'tip_kodu',
        nameField: 'tip_adi',
        filters: [
          { key: 'tip_kodu', label: 'Kod' },
          { key: 'tip_adi', label: 'Ad' },
        ],
        columns: [
          { key: 'tip_kodu', label: 'Kod', mono: true },
          { key: 'tip_adi', label: 'Ad' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'tip_kodu', label: 'Tip kodu', code: true, required: true },
          { key: 'tip_adi', label: 'Tip adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'aday_kodu',
        nameField: 'aday_adi',
        convertAction: {
          label: 'Cariye Dönüştür',
          path: '/crm-adaylar/{id}/cariye-donustur',
        },
        filters: [
          { key: 'aday_kodu', label: 'Kod' },
          { key: 'aday_adi', label: 'Ad' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'aday_kodu', label: 'Kod', mono: true },
          { key: 'aday_adi', label: 'Ad' },
          { key: 'durum', label: 'Durum' },
          { key: 'oncelik', label: 'Öncelik' },
          { key: 'sorumlu_adi', label: 'Sorumlu' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
        ],
        masterFields: [
          { key: 'aday_kodu', label: 'Aday kodu', code: true },
          { key: 'aday_adi', label: 'Aday adı', name: true, required: true },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Yeni', 'Nitelikli', 'Kazanildi', 'Kaybedildi', 'Donusturuldu'], required: true },
          { key: 'sorumlu_id', label: 'Sorumlu', type: 'lookup', lookup: 'kisiler', valueKey: 'id', labelKey: 'ad', codeKey: 'kullanici_kodu' },
          { key: 'degerlendirme', label: 'Olasılık %', type: 'number' },
          { key: 'bulma_yontemi', label: 'Bulma yöntemi' },
          { key: 'tercih_sebebi', label: 'Tercih sebebi' },
          { key: 'oncelik', label: 'Öncelik', type: 'select', options: ['1.Sınıf', '2.Sınıf', '3.Sınıf'] },
          { key: 'telefon', label: 'Telefon' },
          { key: 'cep_tel', label: 'Cep' },
          { key: 'email', label: 'E-posta' },
          { key: 'website', label: 'Website' },
          { key: 'ulke', label: 'Ülke' },
          { key: 'il', label: 'İl' },
          { key: 'ilce', label: 'İlçe' },
          { key: 'adres', label: 'Adres' },
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
        codeField: 'kontak_kodu',
        nameField: 'ad',
        filters: [
          { key: 'kontak_kodu', label: 'Kod' },
          { key: 'ad', label: 'Ad' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'aday_adi', label: 'Aday' },
        ],
        columns: [
          { key: 'kontak_kodu', label: 'Kod', mono: true },
          { key: 'ad', label: 'Ad' },
          { key: 'soyad', label: 'Soyad' },
          { key: 'unvan', label: 'Ünvan' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'aday_adi', label: 'Aday' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
        ],
        masterFields: [
          { key: 'kontak_kodu', label: 'Kontak kodu', code: true },
          { key: 'ad', label: 'Ad', name: true, required: true },
          { key: 'soyad', label: 'Soyad', required: true },
          { key: 'unvan', label: 'Ünvan' },
          { key: 'cari_id', label: 'Cari', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
          { key: 'aday_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'aday_adi', codeKey: 'aday_kodu' },
          { key: 'email', label: 'E-posta' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'cep_tel', label: 'Cep' },
          { key: 'birincil', label: 'Birincil', type: 'checkbox' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'firsat_kodu',
        nameField: 'firsat_adi',
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
          { key: 'firsat_kodu', label: 'Kod' },
          { key: 'firsat_adi', label: 'Ad' },
          { key: 'asama_adi', label: 'Aşama' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Kazanildi', 'Kaybedildi', 'Iptal'] },
        ],
        columns: [
          { key: 'firsat_kodu', label: 'Kod', mono: true },
          { key: 'firsat_adi', label: 'Ad' },
          { key: 'musteri_tipi', label: 'Tip' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'aday_adi', label: 'Aday' },
          { key: 'asama_adi', label: 'Aşama' },
          { key: 'beklenen_gelir', label: 'Beklenen' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'firsat_kodu', label: 'Fırsat kodu', code: true },
          { key: 'firsat_adi', label: 'Fırsat adı', name: true, required: true },
          { key: 'konu', label: 'Konu' },
          { key: 'musteri_tipi', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Aday'], required: true },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
          { key: 'aday_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'aday_adi', codeKey: 'aday_kodu' },
          { key: 'asama_id', label: 'Aşama', type: 'lookup', lookup: 'crm-firsat-asamalari', valueKey: 'id', labelKey: 'asama_adi', codeKey: 'asama_kodu', required: true },
          { key: 'takip_eden_id', label: 'Takip eden', type: 'lookup', lookup: 'kisiler', valueKey: 'id', labelKey: 'ad', codeKey: 'kullanici_kodu' },
          { key: 'beklenen_gelir', label: 'Beklenen gelir', type: 'number' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'degerlendirme', label: 'Olasılık %', type: 'number' },
          { key: 'hedef_kapatma_tarihi', label: 'Hedef kapanış', type: 'date' },
          { key: 'ulke', label: 'Ülke' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Kazanildi', 'Kaybedildi', 'Iptal'] },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { musteri_tipi: 'Musteri', para_birimi: 'TRY', ulke: 'TR' },
      },
      {
        id: 'crm-faaliyet-planlari',
        techId: 'CRM-APLN-SCR-001',
        businessNameEn: 'ActivityPlanScreen',
        title: 'Faaliyet Planları',
        endpoint: '/crm-faaliyet-planlari',
        crud: true,
        numeratorSeri: 'CRM_PLAN',
        codeField: 'plan_kodu',
        nameField: 'konu',
        convertAction: {
          label: 'Faaliyet Oluştur',
          path: '/crm-faaliyet-planlari/{id}/faaliyet-olustur',
        },
        filters: [
          { key: 'plan_kodu', label: 'Kod' },
          { key: 'konu', label: 'Konu' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'plan_kodu', label: 'Kod', mono: true },
          { key: 'konu', label: 'Konu' },
          { key: 'faaliyet_tipi_adi', label: 'Tip' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'aday_adi', label: 'Aday' },
          { key: 'firsat_kodu', label: 'Fırsat', mono: true },
          { key: 'baslangic_tarihi', label: 'Başlangıç' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'plan_kodu', label: 'Plan kodu', code: true },
          { key: 'musteri_tipi', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Aday'], required: true },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
          { key: 'aday_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'aday_adi', codeKey: 'aday_kodu' },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_adi', codeKey: 'firsat_kodu' },
          { key: 'faaliyet_tipi_id', label: 'Faaliyet tipi', type: 'lookup', lookup: 'crm-faaliyet-tipleri', valueKey: 'id', labelKey: 'tip_adi', codeKey: 'tip_kodu' },
          { key: 'yapacak_id', label: 'Yapacak', type: 'lookup', lookup: 'kisiler', valueKey: 'id', labelKey: 'ad', codeKey: 'kullanici_kodu' },
          { key: 'kontak_id', label: 'Kontak', type: 'lookup', lookup: 'crm-kontaklar', valueKey: 'id', labelKey: 'ad', codeKey: 'kontak_kodu' },
          { key: 'baslangic_tarihi', label: 'Başlangıç', type: 'date' },
          { key: 'bitis_tarihi', label: 'Bitiş', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Planlandi', 'Devam', 'Tamamlandi', 'Iptal'] },
          { key: 'konu', label: 'Konu', name: true },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { musteri_tipi: 'Musteri', durum: 'Planlandi' },
      },
      {
        id: 'crm-faaliyetler',
        techId: 'CRM-ACT-SCR-001',
        businessNameEn: 'ActivityScreen',
        title: 'Faaliyetler',
        endpoint: '/crm-faaliyetler',
        crud: true,
        numeratorSeri: 'CRM_FAALIYET',
        codeField: 'faaliyet_kodu',
        nameField: 'konu',
        filters: [
          { key: 'faaliyet_kodu', label: 'Kod' },
          { key: 'konu', label: 'Konu' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'faaliyet_kodu', label: 'Kod', mono: true },
          { key: 'konu', label: 'Konu' },
          { key: 'faaliyet_tipi_adi', label: 'Tip' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'aday_adi', label: 'Aday' },
          { key: 'firsat_kodu', label: 'Fırsat', mono: true },
          { key: 'baslangic_tarihi', label: 'Tarih' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'faaliyet_kodu', label: 'Faaliyet kodu', code: true },
          { key: 'musteri_tipi', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Aday'], required: true },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
          { key: 'aday_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'aday_adi', codeKey: 'aday_kodu' },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_adi', codeKey: 'firsat_kodu' },
          { key: 'faaliyet_tipi_id', label: 'Faaliyet tipi', type: 'lookup', lookup: 'crm-faaliyet-tipleri', valueKey: 'id', labelKey: 'tip_adi', codeKey: 'tip_kodu' },
          { key: 'giren_id', label: 'Giren', type: 'lookup', lookup: 'kisiler', valueKey: 'id', labelKey: 'ad', codeKey: 'kullanici_kodu' },
          { key: 'kontak_id', label: 'Kontak', type: 'lookup', lookup: 'crm-kontaklar', valueKey: 'id', labelKey: 'ad', codeKey: 'kontak_kodu' },
          { key: 'baslangic_tarihi', label: 'Başlangıç', type: 'date' },
          { key: 'harcanan_dk', label: 'Harcanan (dk)', type: 'number' },
          { key: 'konu', label: 'Konu', name: true },
          { key: 'aciklama', label: 'Açıklama', required: true },
          { key: 'degerlendirme', label: 'Değerlendirme' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Devam', 'Tamamlandi', 'Iptal'] },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { musteri_tipi: 'Musteri', durum: 'Tamamlandi' },
      },
      {
        id: 'crm-gorevler',
        techId: 'CRM-TASK-SCR-001',
        businessNameEn: 'TaskScreen',
        title: 'Görevler',
        endpoint: '/crm-gorevler',
        crud: true,
        numeratorSeri: 'CRM_GOREV',
        codeField: 'gorev_kodu',
        nameField: 'baslik',
        approveAction: {
          label: 'Tamamla',
          path: '/crm-gorevler/{id}/tamamla',
        },
        filters: [
          { key: 'gorev_kodu', label: 'Kod' },
          { key: 'baslik', label: 'Başlık' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'gorev_kodu', label: 'Kod', mono: true },
          { key: 'baslik', label: 'Başlık' },
          { key: 'sorumlu_adi', label: 'Sorumlu' },
          { key: 'oncelik', label: 'Öncelik' },
          { key: 'son_tarih', label: 'Son tarih' },
          { key: 'firsat_kodu', label: 'Fırsat', mono: true },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'gorev_kodu', label: 'Görev kodu', code: true },
          { key: 'baslik', label: 'Başlık', name: true, required: true },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'sorumlu_id', label: 'Sorumlu', type: 'lookup', lookup: 'kisiler', valueKey: 'id', labelKey: 'ad', codeKey: 'kullanici_kodu' },
          { key: 'cari_id', label: 'Cari', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
          { key: 'aday_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'aday_adi', codeKey: 'aday_kodu' },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_adi', codeKey: 'firsat_kodu' },
          { key: 'oncelik', label: 'Öncelik', type: 'select', options: ['Dusuk', 'Normal', 'Yuksek', 'Kritik'] },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Devam', 'Tamamlandi', 'Iptal'] },
          { key: 'son_tarih', label: 'Son tarih', type: 'date' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { oncelik: 'Normal', durum: 'Acik' },
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
          { key: 'tip', label: 'Tip' },
        ],
        columns: [
          { key: 'baslik', label: 'Başlık' },
          { key: 'baslangic_at', label: 'Başlangıç' },
          { key: 'bitis_at', label: 'Bitiş' },
          { key: 'tip', label: 'Tip' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'kullanici_kodu', label: 'Kullanıcı', mono: true },
        ],
        masterFields: [
          { key: 'baslik', label: 'Başlık', name: true, required: true },
          { key: 'baslangic_at', label: 'Başlangıç', required: true },
          { key: 'bitis_at', label: 'Bitiş' },
          { key: 'tip', label: 'Tip', type: 'select', options: ['Toplanti', 'Arama', 'Ziyaret', 'Diger'] },
          { key: 'cari_id', label: 'Cari', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
          { key: 'kullanici_kodu', label: 'Kullanıcı kodu' },
          { key: 'aciklama', label: 'Açıklama' },
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
      { id: 'sevk', title: 'Sevk', screenIds: ['sevk-emirleri', 'irsaliyeler'] },
      { id: 'faturalar', title: 'Faturalar', screenIds: ['satis-faturalari'] },
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
        codeField: 'teklif_no',
        nameField: 'cari_adi',
        convertAction: {
          label: 'Siparişe Dönüştür',
          path: '/satis-teklifleri/{id}/siparise-donustur',
          nested: { screenId: 'satis-siparisleri', link: 'teklif-siparis' },
        },
        filters: [
          { key: 'teklif_no', label: 'Teklif no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'teklif_no', label: 'Teklif', mono: true },
          { key: 'musteri_teklif_no', label: 'Müş. ref', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'teklif_tarihi', label: 'Tarih' },
          { key: 'gecerlilik_tarihi', label: 'Geçerlilik' },
          { key: 'teslim_tarihi', label: 'Teslim' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'ara_toplam', label: 'Ara' },
          { key: 'toplam_kdv', label: 'KDV' },
          { key: 'genel_toplam', label: 'Genel' },
          { key: 'durum', label: 'Durum' },
          { key: 'firsat_kodu', label: 'Fırsat', mono: true },
          { key: 'proje_kodu', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'teklif_no', label: 'Teklif no', code: true },
          { key: 'musteri_teklif_no', label: 'Müşteri teklif ref' },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_adi', codeKey: 'firsat_kodu' },
          { key: 'aday_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'aday_adi', codeKey: 'aday_kodu' },
          { key: 'teklif_tarihi', label: 'Teklif tarihi', type: 'date' },
          { key: 'gecerlilik_tarihi', label: 'Geçerlilik', type: 'date' },
          { key: 'teslim_tarihi', label: 'Teslim tarihi', type: 'date' },
          { key: 'para_birimi', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'iskonto_oran', label: 'İskonto %', type: 'number' },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'KrediKarti', 'AcikHesap'] },
          { key: 'teslimat_kosulu', label: 'Teslimat koşulu', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'kosul_kodu', labelKey: 'kosul_adi' },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'fiyat_liste_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'liste_adi', codeKey: 'liste_kodu' },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'bolge', label: 'Bölge' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'SipariseDonustu', 'Red', 'Iptal', 'Kapali'] },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-teklif', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu' },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'not_public', label: 'Müşteri notu' },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'satir_tipi', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', size: 'short' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'kur', label: 'Kur', type: 'number', size: 'short' },
          { key: 'iskonto_oran', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'kdv_durumu', label: 'KDV durum', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'teslim_tarihi', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'proje_kodu', label: 'Proje', size: 'short' },
          { key: 'bolge', label: 'Bölge', size: 'short' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { para_birimi: 'TRY', kur: 1, kur_tipi: 'TCMB-SATIS', kdv_durumu: 'Haric', satir_tipi: 'S', durum: 'Taslak' },
      },
      {
        id: 'satis-siparisleri',
        techId: 'SAL-ORD-SCR-001',
        businessNameEn: 'SalesOrderScreen',
        title: 'Satış Siparişleri',
        endpoint: '/siparisler',
        crud: true,
        numeratorSeri: 'SATIS_SIPARIS',
        codeField: 'siparis_no',
        nameField: 'cari_adi',
        compactMaster: true,
        masterPrimaryMax: 16,
        convertAction: {
          label: 'Sevk Emri Oluştur',
          path: '/siparisler/{id}/sevk-emri-olustur',
          needs: ['depo_id'],
          dialog: 'depo',
          nested: { screenId: 'sevk-emirleri', link: 'siparis-sevk' },
        },
        approveAction: {
          label: 'Stok Rezerve Et',
          path: '/siparisler/{id}/rezerve',
          dialog: 'depo',
        },
        secondaryAction: {
          label: 'İş Emri Ekranı',
          openScreen: 'siparis-is-emri',
        },
        filters: [
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'musteri_siparis_no', label: 'Müş. sip. no', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'siparis_turu', label: 'Tür' },
          { key: 'siparis_tarihi', label: 'Tarih' },
          { key: 'teslim_tarihi', label: 'Teslim' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'ara_toplam', label: 'Ara top.' },
          { key: 'toplam_kdv', label: 'KDV' },
          { key: 'genel_toplam', label: 'Genel top.' },
          { key: 'odeme_kosulu', label: 'Ödeme koş.' },
          { key: 'odeme_sekli', label: 'Ödeme şekli' },
          { key: 'durum', label: 'Durum' },
          { key: 'faturalandi', label: 'Faturalandı' },
          { key: 'proje_kodu', label: 'Proje', mono: true },
        ],
        // Kompakt başlık — notlar alt şeritte; finans/geçerlilik kalemde; adres ayrı sekme
        masterFields: [
          { key: 'siparis_no', label: 'Sipariş no', code: true, lead: true },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true, lead: true, fillCariAdres: true },
          { key: 'siparis_tarihi', label: 'Tarih', type: 'date', lead: true },
          { key: 'teslim_tarihi', label: 'Teslim', type: 'date', lead: true },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kismi', 'Kapali', 'Iptal'], lead: true },
          { key: 'siparis_turu', label: 'Tür', type: 'select', options: ['SatisSiparis', 'AlinanSiparis'], required: true, lead: true },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu', lead: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu', lead: true },
          { key: 'teklif_id', label: 'Teklif', type: 'lookup', lookup: 'satis-teklifleri', valueKey: 'id', labelKey: 'teklif_no', fillFrom: 'teklif-satirlar' },
          { key: 'musteri_siparis_no', label: 'Müş. sip. no' },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-siparis', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu', lead: true },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu', lead: true },
          { key: 'teslimat_kosulu', label: 'Teslimat koşulu', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'kosul_kodu', labelKey: 'kosul_adi', lead: true },
          // Alt şerit (Belge notu alanı)
          { key: 'not_public', label: 'Müşteri notu' },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        // Finans + geçerlilik/fiyat listesi kalem formunda
        detailFields: [
          { key: 'satir_tipi', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', size: 'short' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'kur', label: 'Kur', type: 'number', size: 'short' },
          { key: 'iskonto_oran', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'kdv_durumu', label: 'KDV durum', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'fiyat_liste_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'liste_adi', codeKey: 'liste_kodu' },
          { key: 'gecerlilik_tarihi', label: 'Geçerlilik', type: 'date', size: 'short' },
          { key: 'teslim_tarihi', label: 'Teslim', type: 'date', size: 'short' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'proje_kodu', label: 'Proje', size: 'short' },
          { key: 'bolge', label: 'Bölge', size: 'short' },
          { key: 'sevk_edilen_miktar', label: 'Sevk edilen', type: 'number', size: 'short' },
          { key: 'fatura_edilen_miktar', label: 'Fatura edilen', type: 'number', size: 'short' },
          { key: 'rezerve_miktar', label: 'Rezerve', type: 'number', size: 'short' },
          { key: 'bekleyen_miktar', label: 'Bekleyen', type: 'number', size: 'short' },
          { key: 'kalan_sevk_miktar', label: 'Kalan sevk', type: 'number', size: 'short' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
        defaults: { para_birimi: 'TRY', kur: 1, kur_tipi: 'TCMB-SATIS', kdv_durumu: 'Haric', siparis_turu: 'SatisSiparis', durum: 'Taslak' },
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
            id: 'adres',
            label: 'Adres',
            kind: 'fields',
            fields: [
              { key: 'sevk_adresi', label: 'Sevk adresi', size: 'wide' },
              { key: 'sevk_il', label: 'İl' },
              { key: 'sevk_ilce', label: 'İlçe' },
              { key: 'sevk_ulke', label: 'Ülke' },
              { key: 'sevk_posta_kodu', label: 'Posta kodu' },
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
        codeField: 'sevk_no',
        nameField: 'cari_adi',
        convertAction: {
          label: 'İrsaliye Oluştur',
          path: '/irsaliyeler/sevk-emrinden',
          bodyKey: 'sevk_emri_id',
          dialog: 'irsaliye',
          nested: { screenId: 'irsaliyeler', link: 'sevk-irsaliye' },
        },
        filters: [
          { key: 'sevk_no', label: 'Sevk no' },
          { key: 'siparis_no', label: 'Sipariş' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'sevk_no', label: 'Sevk', mono: true },
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'sevk_tarihi', label: 'Sevk tar.' },
          { key: 'planlanan_sevk_tarihi', label: 'Plan' },
          { key: 'oncelik', label: 'Öncelik' },
          { key: 'tasiyici_unvan', label: 'Taşıyıcı' },
          { key: 'arac_plaka', label: 'Plaka' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'sevk_no', label: 'Sevk no', code: true },
          { key: 'siparis_id', label: 'Satış siparişi', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', required: true, fillFrom: 'siparis-kalemler' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'sevk_tarihi', label: 'Sevk tarihi', type: 'date' },
          { key: 'planlanan_sevk_tarihi', label: 'Planlanan sevk', type: 'date' },
          { key: 'oncelik', label: 'Öncelik', type: 'select', options: ['Dusuk', 'Normal', 'Yuksek', 'Acil'] },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'IrsaliyeDonustu', 'Iptal', 'Kapali'] },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'bolge', label: 'Bölge' },
          { key: 'sevk_adresi', label: 'Sevk adresi' },
          { key: 'sevk_il', label: 'İl' },
          { key: 'sevk_ilce', label: 'İlçe' },
          { key: 'sevk_ulke', label: 'Ülke' },
          { key: 'sevk_posta_kodu', label: 'Posta kodu' },
          { key: 'tasiyici_unvan', label: 'Taşıyıcı unvan' },
          { key: 'tasiyici_vkn', label: 'Taşıyıcı VKN' },
          { key: 'arac_plaka', label: 'Araç plaka' },
          { key: 'sofor_adi', label: 'Şoför' },
          { key: 'sofor_telefon', label: 'Şoför tel' },
          { key: 'paket_adet', label: 'Paket adet', type: 'number' },
          { key: 'brut_agirlik', label: 'Brüt kg', type: 'number' },
          { key: 'net_agirlik', label: 'Net kg', type: 'number' },
          { key: 'hacim', label: 'Hacim', type: 'number' },
          { key: 'not_public', label: 'Müşteri notu' },
          { key: 'not_internal', label: 'Dahili not' },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-sevk', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number', size: 'short' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'parti_id', label: 'Parti', type: 'lookup', lookup: 'stok-partileri', valueKey: 'id', labelKey: 'parti_no' },
          { key: 'seri_no', label: 'Seri no' },
          { key: 'raf_kodu', label: 'Raf' },
          { key: 'sevk_edilen_miktar', label: 'Sevk edilen', type: 'number', size: 'short' },
          { key: 'kalan_miktar', label: 'Bekleyen', type: 'number', size: 'short' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        defaults: { oncelik: 'Normal', durum: 'Taslak' },
      },
      {
        id: 'irsaliyeler',
        techId: 'SAL-DLV-SCR-001',
        businessNameEn: 'DeliveryNoteScreen',
        title: 'İrsaliyeler',
        endpoint: '/irsaliyeler',
        crud: true,
        numeratorSeri: 'IRSALIYE',
        codeField: 'irsaliye_no',
        nameField: 'cari_adi',
        compactMaster: false,
        masterPrimaryMax: 18,
        convertAction: {
          label: 'Fatura Oluştur',
          path: '/irsaliyeler/{id}/fatura-olustur',
          dialog: 'fatura-olustur',
          openTarget: { screenId: 'satis-faturalari', mode: 'duzelt' },
        },
        approveAction: { label: 'Onayla (Stok Çıkış)', path: '/irsaliyeler/{id}/onayla', dialog: 'onay-depo' },
        filters: [
          { key: 'irsaliye_no', label: 'İrsaliye no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
          { key: 'e_belge_durum', label: 'e-Belge' },
        ],
        columns: [
          { key: 'irsaliye_no', label: 'İrsaliye', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'irsaliye_tarihi', label: 'İrs. tar.' },
          { key: 'fiili_sevk_tarihi', label: 'Fiili sevk' },
          { key: 'arac_plaka', label: 'Plaka' },
          { key: 'e_belge_durum', label: 'e-Belge' },
          { key: 'ara_toplam', label: 'Mal' },
          { key: 'genel_toplam', label: 'Genel' },
          { key: 'fatura_durumu', label: 'Fatura' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'irsaliye_no', label: 'İrsaliye no', code: true, lead: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu', lead: true },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-irsaliye', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu', lead: true },
          { key: 'irsaliye_tarihi', label: 'Belge tarihi', type: 'date', lead: true },
          { key: 'irsaliye_zamani', label: 'Belge saati', lead: true },
          { key: 'belge_seri', label: 'Seri', lead: true },
          { key: 'belge_sira', label: 'Sıra', lead: true },
          { key: 'gib_no', label: 'GİB no' },
          { key: 'cari_id', label: 'Cari', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true, lead: true, fillCariAdres: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true, lead: true },
          { key: 'siparis_id', label: 'Sipariş', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', fillFrom: 'siparis-kalemler' },
          { key: 'sevk_emri_id', label: 'Sevk emri', type: 'lookup', lookup: 'sevk-emirleri', valueKey: 'id', labelKey: 'sevk_no', fillFrom: 'sevk-satirlar' },
          { key: 'para_birimi', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', lead: true },
          { key: 'kur', label: 'Kur', type: 'number', lead: true },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'kur_secenegi', label: 'Kur seçeneği', type: 'select', options: ['SevkTarihi', 'BelgeTarihi', 'Serbest'] },
          { key: 'e_belge_durum', label: 'e-Belge durum', type: 'select', options: ['Hazir', 'Bekliyor', 'Gonderildi', 'Hata', 'Iptal'], lead: true },
          { key: 'fiili_sevk_tarihi', label: 'Fiili sevk tarihi', type: 'date', lead: true },
          { key: 'fiili_sevk_zamani', label: 'Fiili sevk saati' },
          { key: 'vade_tarihi', label: 'Vade tarihi', type: 'date' },
          { key: 'vade_gun', label: 'Vade gün', type: 'number' },
          { key: 'odeme_plani', label: 'Ödeme planı' },
          { key: 'odeme_sekli', label: 'Ödeme şekli' },
          { key: 'teslimat_kosulu', label: 'Teslim şekli', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'kosul_kodu', labelKey: 'kosul_adi' },
          { key: 'nakliye_sirketi', label: 'Nakliye şirketi' },
          { key: 'nakliyeci', label: 'Nakliyeci' },
          { key: 'satis_temsilcisi', label: 'Satış temsilcisi' },
          { key: 'proje_kodu', label: 'Proje' },
          { key: 'bolge', label: 'Bölge' },
          { key: 'fatura_durumu', label: 'Fatura durumu', type: 'select', options: ['Irsaliye', 'Kismi', 'Faturalandi'] },
          { key: 'yazdirildi', label: 'Yazdırıldı', type: 'checkbox' },
          { key: 'yerel_para_cikti', label: 'Çıktı yerel PB', type: 'checkbox' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'FaturayaDonustu', 'Iptal', 'Kapali'], lead: true },
          { key: 'aciklama', label: 'Açıklama 1' },
          { key: 'aciklama_2', label: 'Açıklama 2' },
          { key: 'aciklama_3', label: 'Açıklama 3' },
          { key: 'irsaliye_alti_iskonto', label: 'İrs. altı iskonto', type: 'number' },
          { key: 'not_public', label: 'Müşteri notu' },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'satir_tipi', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', size: 'short' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'satir_aciklama2', label: 'Açıklama 2' },
          { key: 'satir_aciklama3', label: 'Açıklama 3' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'miktar', label: 'Miktar', type: 'number', size: 'short', required: true },
          { key: 'fiyat_liste_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'liste_adi', codeKey: 'liste_kodu' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number', size: 'short' },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', size: 'short' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'kur', label: 'Kur', type: 'number', size: 'short' },
          { key: 'yerel_birim_fiyat', label: 'Yerel br.fiyat', type: 'number', size: 'short', readOnly: true },
          { key: 'iskonto_oran', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'kdv_durumu', label: 'KDV durum', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'kdv_kodu', label: 'KDV kodu', size: 'short' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'tevkifat_kodu', label: 'Tevkifat kodu', size: 'short' },
          { key: 'tevkifat_oran', label: 'Tevkifat %', type: 'number', size: 'short' },
          { key: 'otv_kodu', label: 'ÖTV kodu', size: 'short' },
          { key: 'otv_oran', label: 'ÖTV %', type: 'number', size: 'short' },
          { key: 'bandrol_oran', label: 'Bandrol %', type: 'number', size: 'short' },
          { key: 'vergi_semasi', label: 'Vergi şeması', size: 'short' },
          { key: 'vade_tarihi', label: 'Vade', type: 'date', size: 'short' },
          { key: 'vade_gun', label: 'Vade gün', type: 'number', size: 'short' },
          { key: 'musteri_referans_kod', label: 'Müş. ref' },
          { key: 'parti_no', label: 'Parti', size: 'short' },
          { key: 'seri_no', label: 'Seri', size: 'short' },
          { key: 'siparis_detay_id', label: 'Sip. satır id', type: 'number', size: 'short' },
          { key: 'siparis_no', label: 'Sipariş no', size: 'short' },
          { key: 'fatura_edilen_miktar', label: 'Fatura edilen', type: 'number', size: 'short', readOnly: true },
          { key: 'tutar_ht', label: 'Tutar', type: 'number', size: 'short', readOnly: true },
          { key: 'stok_statu', label: 'Statü', type: 'select', options: ['Kullanilabilir', 'Kalitede', 'Bloke'], size: 'short' },
        ],
        detailKey: 'satirlar',
        detailSlots: 6,
        detailAsFields: false,
        defaults: {
          para_birimi: 'TRY',
          kur: 1,
          kur_tipi: 'TCMB-SATIS',
          kur_secenegi: 'SevkTarihi',
          senaryo: 'TEMELIRSALIYE',
          irsaliye_tipi: 'SEVK',
          e_belge_durum: 'Hazir',
          fatura_durumu: 'Irsaliye',
          durum: 'Taslak',
          yazdirildi: false,
          yerel_para_cikti: false,
          sevk_ulke: 'TR',
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
              { key: 'sevk_cari_id', label: 'Sevk cari', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
              { key: 'sevk_adres_tipi', label: 'Sevk adres tipi' },
              { key: 'sevk_ad', label: 'Sevk ad' },
              { key: 'sevk_soyad', label: 'Sevk soyad' },
              { key: 'sevk_adres1', label: 'Sevk adres 1', size: 'wide' },
              { key: 'sevk_adres2', label: 'Sevk adres 2', size: 'wide' },
              { key: 'sevk_adres3', label: 'Sevk adres 3', size: 'wide' },
              { key: 'sevk_ulke', label: 'Sevk ülke', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_adi', labelKey: 'ulke_adi' },
              { key: 'sevk_il', label: 'Sevk il', type: 'lookup', lookup: 'sehirler', valueKey: 'sehir_adi', labelKey: 'sehir_adi' },
              { key: 'sevk_ilce', label: 'Sevk ilçe', type: 'lookup', lookup: 'ilceler', valueKey: 'ilce_adi', labelKey: 'ilce_adi' },
              { key: 'sevk_posta_kodu', label: 'Sevk posta kodu' },
              { key: 'sevk_tel1', label: 'Sevk tel 1' },
              { key: 'sevk_tel2', label: 'Sevk tel 2' },
              { key: 'gumruk', label: 'Gümrük' },
              { key: 'sevk_adresi', label: 'Sevk adresi (özet)', size: 'wide' },
              { key: 'tevkifat_kodu', label: 'Tevkifat kodu' },
              { key: 'tevkifat_oran', label: 'Tevkifat oranı', type: 'number' },
              { key: 'tevkifat_tutari', label: 'Tevkifat tutarı', type: 'number' },
              { key: 'vergi_semasi', label: 'Vergi şeması' },
              { key: 'ozel_hareket_tipi', label: 'Özel hareket tipi' },
              { key: 'fin_vade_tarihi', label: 'Fin. vade tarih', type: 'date' },
              { key: 'fin_vade_gun', label: 'Fin. vade gün', type: 'number' },
              { key: 'stok_tarihi', label: 'Stok tarihi', type: 'date' },
              { key: 'fatura_adres1', label: 'Fatura adres 1', size: 'wide' },
              { key: 'fatura_adres2', label: 'Fatura adres 2', size: 'wide' },
              { key: 'fatura_adres3', label: 'Fatura adres 3', size: 'wide' },
              { key: 'fatura_posta_kodu', label: 'Fatura posta kodu' },
              { key: 'fatura_ulke', label: 'Fatura ülke', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_adi', labelKey: 'ulke_adi' },
              { key: 'fatura_il', label: 'Fatura il', type: 'lookup', lookup: 'sehirler', valueKey: 'sehir_adi', labelKey: 'sehir_adi' },
              { key: 'fatura_ilce', label: 'Fatura ilçe', type: 'lookup', lookup: 'ilceler', valueKey: 'ilce_adi', labelKey: 'ilce_adi' },
              { key: 'sozlesme_kodu', label: 'Sözleşme kodu' },
              { key: 'cari_unvan', label: 'Cari unvan', size: 'wide' },
              { key: 'cari_unvan2', label: 'Cari unvan 2', size: 'wide' },
              { key: 'vergi_dairesi', label: 'Vergi dairesi' },
              { key: 'vergi_no', label: 'Vergi no' },
            ],
          },
          {
            id: 'e-irsaliye',
            label: 'e-İrsaliye',
            kind: 'fields',
            fields: [
              { key: 'irsaliye_tipi', label: 'e-İrsaliye tipi', type: 'select', options: ['SEVK', 'MATBU', 'IADE'] },
              { key: 'senaryo', label: 'İrsaliye senaryosu', type: 'select', options: ['TEMELIRSALIYE', 'TICARIIRSALIYE'] },
              { key: 'ettn', label: 'ETTN', readOnly: true },
              { key: 'posta_kutusu_alias', label: 'Posta kutusu (alias)' },
              { key: 'alis_on_irsaliye', label: 'Alış ön irsaliye' },
              { key: 'matbu_seri', label: 'Matbu seri' },
              { key: 'matbu_sira', label: 'Matbu sıra' },
              { key: 'matbu_belge_tarihi', label: 'Matbu belge tarih', type: 'date' },
              { key: 'portal_iletildigi_tarih', label: 'Portala iletilen tarih', type: 'date' },
              { key: 'e_ticaret_web', label: 'e-Ticaret web adres', size: 'wide' },
              { key: 'e_ticaret_ad', label: 'e-Ticaret ad' },
              { key: 'e_ticaret_soyad', label: 'e-Ticaret soyad' },
              { key: 'e_ticaret_email', label: 'e-Ticaret email' },
            ],
          },
          {
            id: 'arac',
            label: 'Araç Bilgileri',
            kind: 'fields',
            fields: [
              { key: 'teslim_eden', label: 'Teslim eden' },
              { key: 'arac_kodu', label: 'Araç kodu' },
              { key: 'arac_plaka', label: 'Araç plaka' },
              { key: 'sofor_tckn', label: 'TCKN' },
              { key: 'sofor_adi', label: 'Şoför adı' },
              { key: 'sofor_soyadi', label: 'Şoför soyadı' },
              { key: 'sofor_cep', label: 'Cep no' },
              { key: 'arac_aciklama', label: 'Açıklama', size: 'wide' },
              { key: 'dorse_plaka', label: 'Dorse plaka no' },
              { key: 'kargo_no', label: 'Kargo numarası' },
              { key: 'tasiyici_unvan', label: 'Taşıyıcı ünvan', size: 'wide' },
              { key: 'tasiyici_vkn', label: 'Taşıyıcı VKN' },
            ],
          },
        ],
      },
      {
        id: 'satis-faturalari',
        techId: 'FIN-SINV-SCR-001',
        businessNameEn: 'SalesInvoiceScreen',
        title: 'Satış Faturaları',
        endpoint: '/faturalar?fatura_turu=Satis',
        crud: true,
        numeratorSeri: 'FATURA',
        codeField: 'fatura_no',
        nameField: 'cari_adi',
        compactMaster: false,
        masterPrimaryMax: 18,
        convertAction: { label: 'Muhasebeleştir', path: '/faturalar/{id}/muhasebelestir' },
        filters: [
          { key: 'fatura_no', label: 'Fatura no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'fatura_turu', label: 'Tür' },
          { key: 'e_belge_durum', label: 'e-Belge' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'fatura_no', label: 'Fatura', mono: true },
          { key: 'musteri_fatura_no', label: 'Müş. ref', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'fatura_tarihi', label: 'Tarih' },
          { key: 'vade_tarihi', label: 'Vade' },
          { key: 'senaryo', label: 'Senaryo' },
          { key: 'e_belge_durum', label: 'e-Belge' },
          { key: 'mal_hizmet_toplam', label: 'Ara top.' },
          { key: 'toplam_kdv', label: 'KDV' },
          { key: 'odenecek_tutar', label: 'Ödenecek' },
          { key: 'odeme_durumu', label: 'Ödeme' },
          { key: 'odeme_sekli', label: 'Şekli' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'durum', label: 'Durum' },
          { key: 'proje_kodu', label: 'Proje', mono: true },
        ],
        masterFields: [
          { key: 'fatura_no', label: 'Fatura no', code: true, lead: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu', lead: true },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-fatura', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu', lead: true },
          { key: 'fatura_tarihi', label: 'Belge tarihi', type: 'date', required: true, lead: true },
          { key: 'belge_seri', label: 'Seri', lead: true },
          { key: 'belge_sira', label: 'Sıra', lead: true },
          { key: 'gib_no', label: 'GİB no' },
          { key: 'musteri_fatura_no', label: 'Müşteri fatura ref' },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true, lead: true, fillCariAdres: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', lead: true },
          { key: 'fatura_turu', label: 'Fatura türü', type: 'select', options: ['Satis', 'Iade'], required: true, lead: true },
          { key: 'senaryo', label: 'Senaryo', type: 'select', options: ['TICARIFATURA', 'TEMELFATURA'], required: true, lead: true },
          { key: 'fatura_tipi', label: 'Fatura tipi', type: 'select', options: ['SATIS', 'IADE'], required: true },
          { key: 'irsaliye_id', label: 'İrsaliye', type: 'lookup', lookup: 'irsaliyeler', valueKey: 'id', labelKey: 'irsaliye_no', fillFrom: 'irsaliye-satirlar' },
          { key: 'siparis_id', label: 'Sipariş', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', fillFrom: 'siparis-kalemler' },
          { key: 'para_birimi', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', required: true, lead: true },
          { key: 'kur', label: 'Kur', type: 'number', lead: true },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'] },
          { key: 'kur_secenegi', label: 'Kur seçeneği', type: 'select', options: ['BelgeTarihi', 'SevkTarihi', 'Serbest'] },
          { key: 'e_belge_durum', label: 'e-Belge durum', type: 'select', options: ['Hazir', 'Bekliyor', 'Gonderildi', 'Hata', 'Iptal'], lead: true },
          { key: 'vade_tarihi', label: 'Vade tarihi', type: 'date', required: true },
          { key: 'vade_gun', label: 'Vade gün', type: 'number' },
          { key: 'odeme_vadesi_gun', label: 'Vade (gün)', type: 'number' },
          { key: 'odeme_plani', label: 'Ödeme planı' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'KrediKarti', 'AcikHesap'], required: true },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'odeme_durumu', label: 'Ödeme durumu', type: 'select', options: ['Odenmedi', 'Kismi', 'Odendi', 'Iptal'] },
          { key: 'teslimat_kosulu', label: 'Teslim şekli', type: 'lookup', lookup: 'teslimat-kosullari', valueKey: 'kosul_kodu', labelKey: 'kosul_adi' },
          { key: 'satis_temsilcisi', label: 'Satış temsilcisi' },
          { key: 'proje_kodu', label: 'Proje' },
          { key: 'bolge', label: 'Bölge' },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'fiyat_liste_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'liste_adi', codeKey: 'liste_kodu' },
          { key: 'yazdirildi', label: 'Yazdırıldı', type: 'checkbox' },
          { key: 'yerel_para_cikti', label: 'Çıktı yerel PB', type: 'checkbox' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Iptal', 'Kapali'], lead: true },
          { key: 'aciklama', label: 'Açıklama 1' },
          { key: 'aciklama_2', label: 'Açıklama 2' },
          { key: 'aciklama_3', label: 'Açıklama 3' },
          { key: 'fatura_alti_iskonto', label: 'Fatura altı iskonto', type: 'number' },
          { key: 'not_public', label: 'Müşteri notu' },
          { key: 'not_internal', label: 'Dahili not' },
          { key: 'muhasebelesti', label: 'Muhasebeleşti', type: 'checkbox', readOnly: true },
        ],
        detailFields: [
          { key: 'satir_tipi', label: 'Tip', type: 'select', options: ['S', 'H'], size: 'short' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', size: 'short' },
          { key: 'stok_id', label: 'Ürün', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'satir_aciklama2', label: 'Açıklama 2' },
          { key: 'satir_aciklama3', label: 'Açıklama 3' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi', size: 'short' },
          { key: 'miktar', label: 'Miktar', type: 'number', size: 'short', required: true },
          { key: 'fiyat_liste_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'liste_adi', codeKey: 'liste_kodu' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number', size: 'short', required: true },
          { key: 'para_birimi', label: 'PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'pb_kodu', labelKey: 'pb_adi', size: 'short' },
          { key: 'kur_tipi', label: 'Kur tipi', type: 'select', options: ['TCMB-ALIS', 'TCMB-SATIS', 'EFKT-ALIS', 'EFKT-SATIS', 'Serbest'], size: 'short' },
          { key: 'kur', label: 'Kur', type: 'number', size: 'short' },
          { key: 'yerel_birim_fiyat', label: 'Yerel br.fiyat', type: 'number', size: 'short', readOnly: true },
          { key: 'iskonto_oran', label: 'İsk1 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran2', label: 'İsk2 %', type: 'number', size: 'short' },
          { key: 'iskonto_oran3', label: 'İsk3 %', type: 'number', size: 'short' },
          { key: 'kdv_durumu', label: 'KDV durum', type: 'select', options: ['Haric', 'Dahil'], size: 'short' },
          { key: 'kdv_kodu', label: 'KDV kodu', size: 'short' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number', size: 'short' },
          { key: 'tevkifat_kodu', label: 'Tevkifat kodu', size: 'short' },
          { key: 'tevkifat_oran', label: 'Tevkifat %', type: 'number', size: 'short' },
          { key: 'otv_kodu', label: 'ÖTV kodu', size: 'short' },
          { key: 'otv_oran', label: 'ÖTV %', type: 'number', size: 'short' },
          { key: 'bandrol_oran', label: 'Bandrol %', type: 'number', size: 'short' },
          { key: 'vergi_semasi', label: 'Vergi şeması', size: 'short' },
          { key: 'vade_tarihi', label: 'Vade', type: 'date', size: 'short' },
          { key: 'vade_gun', label: 'Vade gün', type: 'number', size: 'short' },
          { key: 'musteri_referans_kod', label: 'Müş. ref' },
          { key: 'maliyet_birim', label: 'Maliyet', type: 'number', size: 'short' },
          { key: 'proje_kodu', label: 'Proje', size: 'short' },
          { key: 'seri_no', label: 'Seri no', size: 'short' },
          { key: 'siparis_no', label: 'Sipariş no', size: 'short' },
          { key: 'tutar_ht', label: 'Tutar', type: 'number', size: 'short', readOnly: true },
        ],
        detailKey: 'kalemler',
        detailSlots: 6,
        detailAsFields: false,
        defaults: {
          fatura_turu: 'Satis',
          senaryo: 'TICARIFATURA',
          fatura_tipi: 'SATIS',
          para_birimi: 'TRY',
          kur: 1,
          kur_tipi: 'TCMB-SATIS',
          kur_secenegi: 'BelgeTarihi',
          kdv_durumu: 'Haric',
          e_belge_durum: 'Hazir',
          odeme_durumu: 'Odenmedi',
          durum: 'Taslak',
          yazdirildi: false,
          yerel_para_cikti: false,
          sevk_ulke: 'TR',
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
              { key: 'sevk_cari_id', label: 'Sevk cari', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
              { key: 'sevk_adres_tipi', label: 'Sevk adres tipi' },
              { key: 'sevk_ad', label: 'Sevk ad' },
              { key: 'sevk_soyad', label: 'Sevk soyad' },
              { key: 'sevk_adres1', label: 'Sevk adres 1', size: 'wide' },
              { key: 'sevk_adres2', label: 'Sevk adres 2', size: 'wide' },
              { key: 'sevk_adres3', label: 'Sevk adres 3', size: 'wide' },
              { key: 'sevk_ulke', label: 'Sevk ülke', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_adi', labelKey: 'ulke_adi' },
              { key: 'sevk_il', label: 'Sevk il', type: 'lookup', lookup: 'sehirler', valueKey: 'sehir_adi', labelKey: 'sehir_adi' },
              { key: 'sevk_ilce', label: 'Sevk ilçe', type: 'lookup', lookup: 'ilceler', valueKey: 'ilce_adi', labelKey: 'ilce_adi' },
              { key: 'sevk_posta_kodu', label: 'Sevk posta kodu' },
              { key: 'sevk_tel1', label: 'Sevk tel 1' },
              { key: 'sevk_tel2', label: 'Sevk tel 2' },
              { key: 'gumruk', label: 'Gümrük' },
              { key: 'sevk_adresi', label: 'Sevk adresi (özet)', size: 'wide' },
              { key: 'tevkifat_kodu', label: 'Tevkifat kodu' },
              { key: 'tevkifat_oran', label: 'Tevkifat oranı', type: 'number' },
              { key: 'tevkifat_tutari', label: 'Tevkifat tutarı', type: 'number' },
              { key: 'vergi_semasi', label: 'Vergi şeması' },
              { key: 'ozel_hareket_tipi', label: 'Özel hareket tipi' },
              { key: 'fin_vade_tarihi', label: 'Fin. vade tarih', type: 'date' },
              { key: 'fin_vade_gun', label: 'Fin. vade gün', type: 'number' },
              { key: 'stok_tarihi', label: 'Stok tarihi', type: 'date' },
              { key: 'fatura_adres1', label: 'Fatura adres 1', size: 'wide' },
              { key: 'fatura_adres2', label: 'Fatura adres 2', size: 'wide' },
              { key: 'fatura_adres3', label: 'Fatura adres 3', size: 'wide' },
              { key: 'fatura_posta_kodu', label: 'Fatura posta kodu' },
              { key: 'fatura_ulke', label: 'Fatura ülke', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_adi', labelKey: 'ulke_adi' },
              { key: 'fatura_il', label: 'Fatura il', type: 'lookup', lookup: 'sehirler', valueKey: 'sehir_adi', labelKey: 'sehir_adi' },
              { key: 'fatura_ilce', label: 'Fatura ilçe', type: 'lookup', lookup: 'ilceler', valueKey: 'ilce_adi', labelKey: 'ilce_adi' },
              { key: 'sozlesme_kodu', label: 'Sözleşme kodu' },
              { key: 'cari_unvan', label: 'Cari unvan', size: 'wide' },
              { key: 'cari_unvan2', label: 'Cari unvan 2', size: 'wide' },
              { key: 'vergi_dairesi', label: 'Vergi dairesi', required: true },
              { key: 'vergi_no', label: 'Vergi no', required: true },
            ],
          },
          {
            id: 'e-fatura',
            label: 'e-Fatura',
            kind: 'fields',
            fields: [
              { key: 'senaryo', label: 'e-Fatura senaryosu', type: 'select', options: ['TICARIFATURA', 'TEMELFATURA'] },
              { key: 'fatura_tipi', label: 'Fatura tipi', type: 'select', options: ['SATIS', 'IADE'] },
              { key: 'ettn', label: 'ETTN', readOnly: true },
              { key: 'posta_kutusu_alias', label: 'Posta kutusu (alias)' },
              { key: 'portal_iletildigi_tarih', label: 'Portala iletilen tarih', type: 'date' },
              { key: 'e_ticaret_web', label: 'e-Ticaret web adres', size: 'wide' },
              { key: 'e_ticaret_ad', label: 'e-Ticaret ad' },
              { key: 'e_ticaret_soyad', label: 'e-Ticaret soyad' },
              { key: 'e_ticaret_email', label: 'e-Ticaret email' },
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
        title: 'GKK Emirleri',
        endpoint: '/kk-emirleri?yon=GKK',
        crud: false,
        codeField: 'emir_no',
        nameField: 'stok_adi',
        approveAction: { label: 'Onayla', path: '/kk-emirleri/{id}/onayla' },
        filters: [
          { key: 'emir_no', label: 'Emir no' },
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'parti_no', label: 'Parti', mono: true },
          { key: 'miktar', label: 'Miktar' },
          { key: 'uygun_miktar', label: 'Uygun' },
          { key: 'uygunsuz_miktar', label: 'Uygunsuz' },
          { key: 'durum', label: 'Durum' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
        ],
        masterFields: [
          { key: 'emir_no', label: 'Emir no', code: true },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'uygun_miktar', label: 'Uygun miktar', type: 'number' },
          { key: 'uygunsuz_miktar', label: 'Uygunsuz miktar', type: 'number' },
          { key: 'durum', label: 'Durum' },
          { key: 'aciklama', label: 'Açıklama' },
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
        title: 'ÇKK Emirleri',
        endpoint: '/kk-emirleri?yon=CKK',
        crud: false,
        codeField: 'emir_no',
        nameField: 'stok_adi',
        approveAction: { label: 'Onayla', path: '/kk-emirleri/{id}/onayla' },
        filters: [
          { key: 'emir_no', label: 'Emir no' },
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'parti_no', label: 'Parti', mono: true },
          { key: 'miktar', label: 'Miktar' },
          { key: 'uygun_miktar', label: 'Uygun' },
          { key: 'uygunsuz_miktar', label: 'Uygunsuz' },
          { key: 'durum', label: 'Durum' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
        ],
        masterFields: [
          { key: 'emir_no', label: 'Emir no', code: true },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'uygun_miktar', label: 'Uygun miktar', type: 'number' },
          { key: 'uygunsuz_miktar', label: 'Uygunsuz miktar', type: 'number' },
          { key: 'durum', label: 'Durum' },
          { key: 'aciklama', label: 'Açıklama' },
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
        nameField: 'aciklama',
        filters: [
          { key: 'emir_no', label: 'Emir no' },
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'id', label: 'ID', mono: true },
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'yon', label: 'Yön' },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'ret_kodu', label: 'Ret kodu', mono: true },
          { key: 'miktar', label: 'Miktar' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'emir_id', label: 'Emir ID', type: 'number', required: true },
          { key: 'ret_neden_id', label: 'Ret nedeni', type: 'lookup', lookup: 'kk-ret-nedenleri', valueKey: 'id', labelKey: 'neden_adi', codeKey: 'neden_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'duzeltici_faaliyet', label: 'Düzeltici faaliyet' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Kapali', 'Iptal'] },
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
          { key: 'durum', label: 'Durum' },
          { key: 'baslik', label: 'Başlık' },
        ],
        columns: [
          { key: 'capa_no', label: 'No', mono: true },
          { key: 'baslik', label: 'Başlık' },
          { key: 'uygunsuzluk_no', label: 'Uygunsuzluk', mono: true },
          { key: 'hedef_tarih', label: 'Hedef' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'capa_no', label: 'CAPA no', code: true },
          { key: 'baslik', label: 'Başlık', name: true, required: true },
          { key: 'uygunsuzluk_id', label: 'Uygunsuzluk ID', type: 'number' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'hedef_tarih', label: 'Hedef tarih', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Devam', 'Kapali', 'Iptal'] },
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
        codeField: 'plan_kodu',
        nameField: 'plan_adi',
        filters: [
          { key: 'plan_kodu', label: 'Plan kodu' },
          { key: 'plan_adi', label: 'Plan adı' },
          { key: 'yon', label: 'Yön' },
        ],
        columns: [
          { key: 'plan_kodu', label: 'Kod', mono: true },
          { key: 'plan_adi', label: 'Ad' },
          { key: 'yon', label: 'Yön' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'plan_kodu', label: 'Plan kodu', code: true, required: true },
          { key: 'plan_adi', label: 'Plan adı', name: true, required: true },
          { key: 'yon', label: 'Yön', type: 'select', options: ['GKK', 'CKK', 'HerIkisi'], required: true },
        ],
        detailFields: [
          { key: 'kriter_kodu', label: 'Kriter kodu' },
          { key: 'kriter_adi', label: 'Kriter adı' },
          { key: 'olcum_tipi', label: 'Ölçüm tipi', type: 'select', options: ['Sayisal', 'Metin', 'EvetHayir'] },
          { key: 'min_deger', label: 'Min', type: 'number' },
          { key: 'max_deger', label: 'Max', type: 'number' },
          { key: 'birim', label: 'Birim' },
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
        nameField: 'stok_kodu',
        filters: [
          { key: 'stok_kodu', label: 'Stok' },
          { key: 'yon', label: 'Yön' },
        ],
        columns: [
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'yon', label: 'Yön' },
          { key: 'plan_kodu', label: 'Plan', mono: true },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'plan_id', label: 'Plan', type: 'lookup', lookup: 'kk-kontrol-planlari', valueKey: 'id', labelKey: 'plan_adi', codeKey: 'plan_kodu', required: true },
          { key: 'yon', label: 'Yön', type: 'select', options: ['GKK', 'CKK'], required: true },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'neden_kodu',
        nameField: 'neden_adi',
        filters: [
          { key: 'neden_kodu', label: 'Kod' },
          { key: 'neden_adi', label: 'Ad' },
        ],
        columns: [
          { key: 'neden_kodu', label: 'Kod', mono: true },
          { key: 'neden_adi', label: 'Ad' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'neden_kodu', label: 'Neden kodu', code: true, required: true },
          { key: 'neden_adi', label: 'Neden adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        id: 'islem',
        title: 'Onay',
        screenIds: ['onaylarim', 'onay-izleme', 'onay-yetki-devri'],
      },
      {
        id: 'tanimlar',
        title: 'Sabit Tanımlar',
        screenIds: [
          'onay-rol-tanim',
          'onay-kural-tanim',
          'onay-rota-tanim',
          'onay-mesaj-sablon',
          'onay-durum-tanim',
        ],
      },
    ],
    screens: [
      {
        id: 'onaylarim',
        techId: 'SYS-APR-SCR-001',
        businessNameEn: 'MyApprovalsScreen',
        title: 'Onaylarım',
        endpoint: '/onay-kayitlari?benim=true',
        crud: false,
        readOnly: false,
        codeField: 'onay_no',
        nameField: 'belge_ozet',
        approveAction: { label: 'Onayla', path: '/onay-kayitlari/{id}/onayla' },
        banner: 'Size (rolünüz / yetki devri) atanmış bekleyen onaylar. İncele → Onayla veya Reddet.',
        filters: [
          { key: 'onay_no', label: 'Onay no' },
          { key: 'belge_no', label: 'Belge no' },
          { key: 'modul_kodu', label: 'Modül' },
        ],
        columns: [
          { key: 'onay_no', label: 'Onay', mono: true },
          { key: 'modul_kodu', label: 'Modül' },
          { key: 'belge_no', label: 'Belge', mono: true },
          { key: 'belge_ozet', label: 'Özet' },
          { key: 'tutar', label: 'Tutar' },
          { key: 'durum_adi', label: 'Durum' },
          { key: 'aktif_adim_sira', label: 'Adım' },
          { key: 'baslama_tarihi', label: 'Başlama' },
        ],
        masterFields: [
          { key: 'onay_no', label: 'Onay no', code: true },
          { key: 'modul_kodu', label: 'Modül' },
          { key: 'ekran_id', label: 'Ekran' },
          { key: 'belge_no', label: 'Belge no' },
          { key: 'belge_ozet', label: 'Özet', name: true },
          { key: 'tutar', label: 'Tutar', type: 'number' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'durum_kodu', label: 'Durum' },
          { key: 'rota_adi', label: 'Rota' },
          { key: 'baslatan_adi', label: 'Başlatan' },
          { key: 'aciklama', label: 'Açıklama / not' },
        ],
        detailFields: [
          { key: 'sira_no', label: 'Sıra', type: 'number' },
          { key: 'adim_adi', label: 'Adım' },
          { key: 'rol_adi', label: 'Rol' },
          { key: 'durum_kodu', label: 'Durum' },
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
        nameField: 'belge_ozet',
        banner: 'Tüm onay kayıtları — durum, belge ve rota izi.',
        filters: [
          { key: 'onay_no', label: 'Onay no' },
          { key: 'belge_no', label: 'Belge no' },
          { key: 'modul_kodu', label: 'Modül' },
          { key: 'durum_kodu', label: 'Durum' },
          { key: 'ekran_id', label: 'Ekran' },
        ],
        columns: [
          { key: 'onay_no', label: 'Onay', mono: true },
          { key: 'modul_kodu', label: 'Modül' },
          { key: 'ekran_id', label: 'Ekran', mono: true },
          { key: 'belge_no', label: 'Belge', mono: true },
          { key: 'tutar', label: 'Tutar' },
          { key: 'durum_adi', label: 'Durum' },
          { key: 'rota_adi', label: 'Rota' },
          { key: 'baslatan_adi', label: 'Başlatan' },
          { key: 'baslama_tarihi', label: 'Başlama' },
          { key: 'kapanis_tarihi', label: 'Kapanış' },
        ],
        masterFields: [
          { key: 'onay_no', label: 'Onay no', code: true },
          { key: 'modul_kodu', label: 'Modül' },
          { key: 'ekran_id', label: 'Ekran' },
          { key: 'belge_no', label: 'Belge no' },
          { key: 'belge_ozet', label: 'Özet', name: true },
          { key: 'tutar', label: 'Tutar', type: 'number' },
          { key: 'durum_kodu', label: 'Durum' },
          { key: 'rota_adi', label: 'Rota' },
          { key: 'kullanim_adi', label: 'Kullanım' },
          { key: 'baslatan_adi', label: 'Başlatan' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'sira_no', label: 'Sıra', type: 'number' },
          { key: 'adim_adi', label: 'Adım' },
          { key: 'rol_adi', label: 'Rol' },
          { key: 'durum_kodu', label: 'Durum' },
          { key: 'onaylayan_adi', label: 'Onaylayan' },
          { key: 'islem_tarihi', label: 'İşlem' },
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
        codeField: 'devir_kodu',
        nameField: 'aciklama',
        filters: [
          { key: 'devir_kodu', label: 'Devir kodu' },
          { key: 'veren_kodu', label: 'Veren' },
          { key: 'alan_kodu', label: 'Alan' },
        ],
        columns: [
          { key: 'devir_kodu', label: 'Kod', mono: true },
          { key: 'veren_adi', label: 'Veren' },
          { key: 'alan_adi', label: 'Alan' },
          { key: 'rol_adi', label: 'Rol' },
          { key: 'baslangic_tarihi', label: 'Başlangıç' },
          { key: 'bitis_tarihi', label: 'Bitiş' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'devir_kodu', label: 'Devir kodu', code: true },
          { key: 'veren_kisi_id', label: 'Yetkiyi veren', type: 'lookup', lookup: 'kisiler', valueKey: 'id', labelKey: 'ad', codeKey: 'kullanici_kodu', required: true },
          { key: 'alan_kisi_id', label: 'Yetkiyi alan', type: 'lookup', lookup: 'kisiler', valueKey: 'id', labelKey: 'ad', codeKey: 'kullanici_kodu', required: true },
          { key: 'rol_id', label: 'Rol (boş = tüm roller)', type: 'lookup', lookup: 'onay-rolleri', valueKey: 'id', labelKey: 'rol_adi', codeKey: 'rol_kodu' },
          { key: 'baslangic_tarihi', label: 'Başlangıç', type: 'date', required: true },
          { key: 'bitis_tarihi', label: 'Bitiş', type: 'date' },
        ],
        detailFields: [
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'onay-rol-tanim',
        techId: 'SYS-APR-SCR-004',
        businessNameEn: 'ApprovalRoleScreen',
        title: 'Onay Rolü',
        endpoint: '/onay-rolleri',
        crud: true,
        numeratorSeri: 'ONAY_ROL',
        codeField: 'rol_kodu',
        nameField: 'rol_adi',
        banner: 'Bir kişiye, firma ve iş yeri kapsamında onay rolü verilir. Rotadaki adımlar bu rol adına bakar.',
        filters: [
          { key: 'rol_adi', label: 'Rol adı' },
          { key: 'kisi_adi', label: 'Kişi' },
          { key: 'firma_kodu', label: 'Firma' },
        ],
        columns: [
          { key: 'rol_adi', label: 'Rol adı' },
          { key: 'kisi_adi', label: 'Kişi' },
          { key: 'kullanici_kodu', label: 'Kullanıcı', mono: true },
          { key: 'firma_adi', label: 'Firma' },
          { key: 'is_yeri_adi', label: 'İş yeri' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kisi_id', label: 'Kişi', type: 'lookup', lookup: 'kisiler', valueKey: 'id', labelKey: 'ad', codeKey: 'kullanici_kodu', required: true },
          { key: 'rol_adi', label: 'Onay rol adı', name: true, required: true },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu', required: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu', required: true },
        ],
        detailFields: [
          { key: 'rol_kodu', label: 'Kayıt kodu', code: true },
          { key: 'aciklama', label: 'Not' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
        defaults: { aktif: true },
      },
      {
        id: 'onay-kural-tanim',
        techId: 'SYS-APR-SCR-005',
        businessNameEn: 'ApprovalRuleScreen',
        title: 'Onay Kuralı',
        endpoint: '/onay-kurallari',
        crud: true,
        numeratorSeri: 'ONAY_KURAL',
        codeField: 'kural_kodu',
        nameField: 'kural_adi',
        banner: 'Hangi ekranda onay devreye girer? Koşullar VE mantığıyla çalışır — işaretlediklerinizin / doldurduklarınızın tümü sağlanmalı.',
        filters: [
          { key: 'kural_adi', label: 'Kural adı' },
          { key: 'ekran_id', label: 'Ekran' },
          { key: 'firma_kodu', label: 'Firma' },
        ],
        columns: [
          { key: 'sira_no', label: 'Sıra' },
          { key: 'kural_kodu', label: 'Kod', mono: true },
          { key: 'kural_adi', label: 'Ad' },
          { key: 'ekran_id', label: 'Ekran', mono: true },
          { key: 'firma_adi', label: 'Firma' },
          { key: 'is_yeri_adi', label: 'İş yeri' },
          { key: 'sablon_adi', label: 'Mesaj' },
          { key: 'otomatik_onay', label: 'Oto. onay' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'sira_no', label: 'Öncelik sırası', type: 'number', required: true },
          { key: 'kural_kodu', label: 'Kural kodu', code: true },
          { key: 'kural_adi', label: 'Kural adı', name: true, required: true },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          {
            key: 'ekran_id',
            label: 'Ekran (onaylanacak belge)',
            type: 'lookup',
            lookup: 'onay-ekranlari',
            valueKey: 'ekran_id',
            labelKey: 'ekran_adi',
            codeKey: 'ekran_id',
            required: true,
          },
          {
            key: 'sablon_id',
            label: 'Mesaj şablonu',
            type: 'lookup',
            lookup: 'onay-mesaj-sablonlari',
            valueKey: 'id',
            labelKey: 'sablon_adi',
            codeKey: 'sablon_kodu',
          },
          { key: 'kosul_yon', label: 'Belge yönü', type: 'select', options: ['Hepsi', 'Alis', 'Satis'] },
          { key: 'kosul_min_tutar', label: 'Min. tutar', type: 'number' },
          { key: 'kosul_max_tutar', label: 'Max. tutar', type: 'number' },
          { key: 'kosul_durumlar', label: 'Belge durumları (virgülle; boş = tümü)' },
          { key: 'otomatik_onay', label: 'Koşul sağlanırsa otomatik onayla', type: 'checkbox' },
          { key: 'onaylaninca_aktif', label: 'Onaylanınca belgeyi aktif et', type: 'checkbox' },
          { key: 'aktif', label: 'Kural aktif', type: 'checkbox' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        detailFields: [
          {
            key: 'hareket_kodu_id',
            label: 'Hareket kodu',
            type: 'lookup',
            lookup: 'hareket-kodlari',
            valueKey: 'id',
            labelKey: 'hareket_adi',
            codeKey: 'hareket_kodu',
            required: true,
          },
        ],
        detailKey: 'hareketler',
        defaults: {
          sira_no: 10,
          kosul_yon: 'Hepsi',
          otomatik_onay: false,
          onaylaninca_aktif: true,
          aktif: true,
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
        codeField: 'rota_kodu',
        nameField: 'rota_adi',
        banner: 'Kural + ekran bağlandıktan sonra onayın kimden kime gideceği burada adım adım kurulur.',
        filters: [
          { key: 'rota_adi', label: 'Rota adı' },
          { key: 'ekran_id', label: 'Ekran' },
          { key: 'kural_adi', label: 'Kural' },
        ],
        columns: [
          { key: 'rota_kodu', label: 'Kod', mono: true },
          { key: 'rota_adi', label: 'Ad' },
          { key: 'versiyon', label: 'Sürüm' },
          { key: 'ekran_id', label: 'Ekran', mono: true },
          { key: 'kural_adi', label: 'Kural' },
          { key: 'firma_adi', label: 'Firma' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'rota_kodu', label: 'Rota kodu', code: true },
          { key: 'rota_adi', label: 'Rota adı', name: true, required: true },
          { key: 'versiyon', label: 'Sürüm', type: 'number' },
          {
            key: 'ekran_id',
            label: 'Ekran',
            type: 'lookup',
            lookup: 'onay-ekranlari',
            valueKey: 'ekran_id',
            labelKey: 'ekran_adi',
            codeKey: 'ekran_id',
          },
          {
            key: 'kural_id',
            label: 'Bağlı kural',
            type: 'lookup',
            lookup: 'onay-kurallari',
            valueKey: 'id',
            labelKey: 'kural_adi',
            codeKey: 'kural_kodu',
          },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          {
            key: 'ilk_mesaj_sablon_id',
            label: 'İlk onay mesajı',
            type: 'lookup',
            lookup: 'onay-mesaj-sablonlari',
            valueKey: 'id',
            labelKey: 'sablon_adi',
            codeKey: 'sablon_kodu',
          },
          {
            key: 'red_mesaj_sablon_id',
            label: 'Red mesajı',
            type: 'lookup',
            lookup: 'onay-mesaj-sablonlari',
            valueKey: 'id',
            labelKey: 'sablon_adi',
            codeKey: 'sablon_kodu',
          },
          {
            key: 'ekstra_mesaj_sablon_id',
            label: 'Ek mesaj',
            type: 'lookup',
            lookup: 'onay-mesaj-sablonlari',
            valueKey: 'id',
            labelKey: 'sablon_adi',
            codeKey: 'sablon_kodu',
          },
          { key: 'iptal_rol_adi', label: 'İptali onaylayacak rol adı' },
          { key: 'ekli_dosya_mail', label: 'Ekleri mail ile gönder', type: 'checkbox' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [
          { key: 'sira_no', label: 'Adım no', type: 'number', required: true },
          { key: 'adim_adi', label: 'Adım açıklaması' },
          { key: 'rol_adi', label: 'Onay rol adı', required: true },
          { key: 'mail_gonder', label: 'Mail gönder', type: 'checkbox' },
          { key: 'sms_gonder', label: 'SMS gönder', type: 'checkbox' },
          { key: 'deger_degistirebilir', label: 'Değer değiştirebilir', type: 'checkbox' },
          { key: 'min_tutar', label: 'Bu adım için min. tutar', type: 'number' },
          { key: 'geri_gonder_sira', label: 'Düzeltmede dönülecek adım no', type: 'number' },
          { key: 'zorunlu', label: 'Zorunlu', type: 'checkbox' },
          { key: 'aciklama', label: 'Not' },
        ],
        detailKey: 'adimlar',
        defaults: { versiyon: 1, aktif: true, ekli_dosya_mail: false, adimlar: [] },
      },
      {
        id: 'onay-mesaj-sablon',
        techId: 'SYS-APR-SCR-007',
        businessNameEn: 'ApprovalMessageTemplateScreen',
        title: 'Onay Mesaj Şablonu',
        endpoint: '/onay-mesaj-sablonlari',
        crud: true,
        numeratorSeri: 'ONAY_SABLON',
        codeField: 'sablon_kodu',
        nameField: 'sablon_adi',
        filters: [
          { key: 'sablon_kodu', label: 'Kod' },
          { key: 'olay', label: 'Olay' },
        ],
        columns: [
          { key: 'sablon_kodu', label: 'Kod', mono: true },
          { key: 'sablon_adi', label: 'Ad' },
          { key: 'olay', label: 'Olay' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'sablon_kodu', label: 'Şablon kodu', code: true },
          { key: 'sablon_adi', label: 'Şablon adı', name: true, required: true },
          { key: 'olay', label: 'Olay', type: 'select', options: ['Bekleme', 'Onay', 'Red', 'Devret', 'Iptal', 'Tamam'], required: true },
          { key: 'konu', label: 'Konu' },
        ],
        detailFields: [
          { key: 'govde', label: 'Gövde ({{belge_no}}, {{modul}}, {{tutar}}, {{onayci}}, {{gerekce}})' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'onay-durum-tanim',
        techId: 'SYS-APR-SCR-008',
        businessNameEn: 'ApprovalStatusScreen',
        title: 'Onay Durum Tanımı',
        endpoint: '/onay-durumlari',
        crud: true,
        codeField: 'durum_kodu',
        nameField: 'durum_adi',
        filters: [
          { key: 'durum_kodu', label: 'Kod' },
          { key: 'durum_adi', label: 'Ad' },
        ],
        columns: [
          { key: 'durum_kodu', label: 'Kod', mono: true },
          { key: 'durum_adi', label: 'Ad' },
          { key: 'sira_no', label: 'Sıra' },
          { key: 'nihai', label: 'Nihai' },
          { key: 'olumlu', label: 'Olumlu' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'durum_kodu', label: 'Durum kodu', code: true, required: true },
          { key: 'durum_adi', label: 'Durum adı', name: true, required: true },
          { key: 'sira_no', label: 'Sıra', type: 'number' },
        ],
        detailFields: [
          { key: 'nihai', label: 'Nihai durum', type: 'checkbox' },
          { key: 'olumlu', label: 'Olumlu (onay)', type: 'checkbox' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
      { id: 'tanimlar', title: 'Tanımlar', screenIds: ['hesap-plani', 'hesap-belirleme-kurallari', 'fiyat-listeleri'] },
      { id: 'belgeler', title: 'Belgeler', screenIds: ['muhasebe-belgeleri', 'fatura-kontrolleri'] },
      { id: 'raporlar', title: 'Raporlar', screenIds: ['mizan', 'kokpit'] },
    ],
    screens: [
      {
        id: 'hesap-plani',
        techId: 'FIN-COA-SCR-001',
        businessNameEn: 'ChartOfAccountsScreen',
        title: 'Hesap Planı',
        endpoint: '/muhasebe-hesaplari',
        crud: true,
        codeField: 'hesap_kodu',
        nameField: 'hesap_adi',
        numeratorSeri: null,
        filters: [
          { key: 'hesap_kodu', label: 'Hesap kodu' },
          { key: 'hesap_adi', label: 'Hesap adı' },
          { key: 'hesap_tipi', label: 'Tip' },
        ],
        columns: [
          { key: 'hesap_kodu', label: 'Kod', mono: true },
          { key: 'hesap_adi', label: 'Ad' },
          { key: 'hesap_tipi', label: 'Tip' },
          { key: 'ust_hesap_kodu', label: 'Üst', mono: true },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'hesap_kodu', label: 'Hesap kodu', code: true, editableOnNew: true, required: true },
          { key: 'hesap_adi', label: 'Hesap adı', name: true, required: true },
          { key: 'hesap_tipi', label: 'Hesap tipi', type: 'select', options: ['Ana', 'Ust', 'Dogrudan'], required: true },
        ],
        detailFields: [
          { key: 'ust_hesap_kodu', label: 'Üst hesap kodu' },
          { key: 'para_birimi', label: 'Para birimi' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
          { key: 'silinecek', label: 'Silinecek', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'muhasebe-belgeleri',
        techId: 'FIN-JE-SCR-001',
        businessNameEn: 'AccountingDocumentScreen',
        title: 'Muhasebe Belgeleri',
        endpoint: '/muhasebe-belgeleri',
        crud: true,
        codeField: 'belge_no',
        nameField: 'aciklama',
        numeratorSeri: 'MUHASEBE_BELGE',
        filters: [
          { key: 'belge_no', label: 'Belge no' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'belge_no', label: 'Belge', mono: true },
          { key: 'belge_tarihi', label: 'Tarih' },
          { key: 'durum', label: 'Durum' },
          { key: 'toplam_borc', label: 'Borç' },
          { key: 'toplam_alacak', label: 'Alacak' },
        ],
        masterFields: [
          { key: 'belge_no', label: 'Belge no', code: true },
          { key: 'belge_tarihi', label: 'Belge tarihi', type: 'date' },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Iptal'] },
        ],
        detailFields: [
          { key: 'hesap_id', label: 'Hesap', type: 'lookup', lookup: 'muhasebe-hesaplari', valueKey: 'id', labelKey: 'hesap_adi', codeKey: 'hesap_kodu' },
          { key: 'borc', label: 'Borç', type: 'number' },
          { key: 'alacak', label: 'Alacak', type: 'number' },
          { key: 'aciklama', label: 'Kalem açıklama' },
        ],
        detailKey: 'kalemler',
        detailSlots: 6,
      },
      {
        id: 'mizan',
        techId: 'FIN-TB-RPT-001',
        businessNameEn: 'TrialBalanceReport',
        title: 'Mizan',
        endpoint: '/mizan',
        crud: false,
        codeField: 'hesap_kodu',
        nameField: 'hesap_adi',
        filters: [
          { key: 'hesap_kodu', label: 'Hesap kodu' },
          { key: 'hesap_adi', label: 'Hesap adı' },
        ],
        columns: [
          { key: 'hesap_kodu', label: 'Hesap', mono: true },
          { key: 'hesap_adi', label: 'Ad' },
          { key: 'borc', label: 'Borç' },
          { key: 'alacak', label: 'Alacak' },
          { key: 'bakiye', label: 'Bakiye' },
        ],
      },
      {
        id: 'hesap-belirleme-kurallari',
        techId: 'FIN-ACR-SCR-001',
        businessNameEn: 'AccountDeterminationRuleScreen',
        title: 'Hesap Belirleme Kuralları',
        endpoint: '/hesap-belirleme-kurallari',
        crud: true,
        codeField: 'kural_kodu',
        nameField: 'aciklama',
        filters: [
          { key: 'kural_kodu', label: 'Kural' },
          { key: 'belge_tipi', label: 'Belge tipi' },
        ],
        columns: [
          { key: 'kural_kodu', label: 'Kod', mono: true },
          { key: 'belge_tipi', label: 'Belge' },
          { key: 'borc_hesap_kodu', label: 'Borç', mono: true },
          { key: 'alacak_hesap_kodu', label: 'Alacak', mono: true },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kural_kodu', label: 'Kural kodu', code: true, required: true },
          { key: 'belge_tipi', label: 'Belge tipi', type: 'select', options: ['Satis', 'Alis'], required: true },
          { key: 'borc_hesap_kodu', label: 'Borç hesap' },
          { key: 'alacak_hesap_kodu', label: 'Alacak hesap' },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
        codeField: 'liste_kodu',
        nameField: 'liste_adi',
        numeratorSeri: 'FIYAT_LISTE',
        filters: [
          { key: 'liste_kodu', label: 'Liste kodu' },
          { key: 'liste_adi', label: 'Liste adı' },
        ],
        columns: [
          { key: 'liste_kodu', label: 'Kod', mono: true },
          { key: 'liste_adi', label: 'Ad' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'liste_kodu', label: 'Liste kodu', code: true },
          { key: 'liste_adi', label: 'Liste adı', name: true, required: true },
          { key: 'para_birimi', label: 'Para birimi' },
          { key: 'baslangic_tarihi', label: 'Başlangıç', type: 'date' },
          { key: 'bitis_tarihi', label: 'Bitiş', type: 'date' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'cari_id', label: 'Cari', type: 'lookup', lookup: 'cariler', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
          { key: 'min_miktar', label: 'Min miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'iskonto_oran', label: 'İskonto %', type: 'number' },
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
          { key: 'fatura_no', label: 'Fatura' },
          { key: 'sonuc', label: 'Sonuç' },
        ],
        columns: [
          { key: 'fatura_no', label: 'Fatura', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'kabul_no', label: 'Mal kabul', mono: true },
          { key: 'siparis_no', label: 'SA sipariş', mono: true },
          { key: 'fiyat_fark', label: 'Fiyat fark' },
          { key: 'miktar_fark', label: 'Miktar fark' },
          { key: 'sonuc', label: 'Sonuç' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
        masterFields: [
          { key: 'fatura_id', label: 'Alış faturası', type: 'lookup', lookup: 'alis-faturalari', valueKey: 'id', labelKey: 'fatura_no' },
          { key: 'mal_kabul_id', label: 'Mal kabul', type: 'lookup', lookup: 'mal-kabuller', valueKey: 'id', labelKey: 'kabul_no' },
          { key: 'siparis_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'siparis_no' },
          { key: 'fatura_no', label: 'Fatura no', code: true },
          { key: 'kabul_no', label: 'Mal kabul no' },
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'cari_adi', label: 'Cari', name: true },
          { key: 'fiyat_fark', label: 'Fiyat farkı', type: 'number' },
          { key: 'miktar_fark', label: 'Miktar farkı', type: 'number' },
          { key: 'sonuc', label: 'Sonuç', type: 'select', options: ['Bekliyor', 'Uyumlu', 'FiyatFark', 'MiktarFark', 'Askida'] },
          { key: 'aciklama', label: 'Açıklama' },
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
          { key: 'deger', label: 'Değer', mono: true },
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
    'firma_id',
    'is_yeri_id',
    'cari_id',
    'tedarikci_cari_id',
    'durum',
  ].filter(Boolean));

  const isDocRefId = (key) => (
    /_id$/.test(key)
    && !/^(stok|depo|parti|bilesen|fiyat_liste)_id$/.test(key)
  );

  const isLineish = (key) => (
    /^(stok_id|stok_kodu|stok_adi|miktar|birim_fiyat|birim|kdv_oran|kdv_durumu|satir_|iskonto_oran|tedarikci_stok_|giren_miktar|kabul_edilen|reddedilen|sevk_edilen|kalan_|rezerve_|bekleyen_|fatura_edilen)/i.test(key)
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
      // lead/critical: belge başlığında kalsın (satırda da olabilir — örn. teslim_tarihi)
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
    'stok-karti', 'cari-kartlari', 'urun-agaci', 'rotalar',
    'kullanicilar', 'kullanici-gruplari', 'firmalar', 'is-yerleri', 'depolar',
    'bom-malzeme-degisikligi', 'bom-patlatma', 'bom-seviye-listesi',
    'siparis-is-emri', 'toplu-is-emri',
    // Kart / tanım — belge kabuğu değil
    'crm-firsatlar', 'fiyat-listeleri', 'kk-kontrol-planlari',
  ]);
  if (skip.has(s.id)) return false;
  if ((s.formTabs || []).some((t) => /bom|rota|yetki|workspace/i.test(String(t.kind || '')))) return false;
  const dKeys = new Set(s.detailFields.map((f) => f.key));
  // Klasik malzeme/satır belgeleri (+ üretim emri operasyon satırları)
  return dKeys.has('stok_id') || dKeys.has('bilesen_stok_id')
    || dKeys.has('miktar') || dKeys.has('satir_aciklama');
}

const COMPACT_DROP_KEYS = new Set([
  'siparis_kaynak', 'teklif_kaynak', 'kaynak', 'belge_kaynak',
]);
const COMPACT_ADDR_RE = /^(sevk_|fatura_adres)/i;
const COMPACT_TO_LINE_RE = /^(para_birimi|kur|kur_tipi|iskonto_oran|iskonto_oran2|iskonto_oran3|kdv_oran|kdv_durumu|otv_oran|tevkifat_oran|fiyat_liste_id|gecerlilik_tarihi|proje_kodu|bolge)$/i;
const COMPACT_HEADER_LEAD_RE = /^(firma_id|is_yeri_id|cari_id|tedarikci_cari_id|durum|hareket_kodu_id|odeme_kosulu|odeme_sekli|teslimat_kosulu|siparis_turu|.*_tarihi$|.*_no$)$/i;

/**
 * Satış siparişi düzeni: kompakt başlık + Kalemler (+ Adres) + not alt şerit.
 * Finans/geçerlilik/fiyat listesi → kalem; sevk adresi → Adres sekmesi.
 */
function applyCompactBelgeShell(s) {
  if (!isCompactBelgeScreen(s)) return;

  // Mevcut formTabs’taki adres / not / başlık alanlarını da topla (elle tanımlı kabuklar)
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
  const adres = [];

  master.forEach((f) => {
    if (!f?.key) return;
    if (COMPACT_DROP_KEYS.has(f.key)) return;
    if (COMPACT_ADDR_RE.test(f.key)) {
      adres.push({ ...f });
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
    if ((f.key === 'cari_id' || f.key === 'tedarikci_cari_id') && !next.fillCariAdres) {
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
  if (adres.length) {
    tabs.push({
      id: 'adres',
      label: 'Adres',
      kind: 'fields',
      fields: adres,
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
      code: /(kod|_no$|seri_kodu|emir_no|talep_no|siparis_no|kabul_no)/i.test(c.key),
      name: /(_adi$|aciklama)/i.test(c.key),
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
  if (!s.detailFields.length && /satin-alma-talepleri|satin-alma-siparisleri|mal-kabuller|urun-agaci|rotalar|uretim-emirleri/.test(s.id)) {
    if (s.id === 'urun-agaci') {
      s.detailKey = s.detailKey || 'satirlar';
      s.detailFields = [
        { key: 'bilesen_stok_id', label: 'Bileşen stok ID', type: 'number' },
        { key: 'miktar', label: 'Miktar', type: 'number' },
        { key: 'birim', label: 'Birim' },
      ];
    } else if (s.id === 'rotalar') {
      s.detailKey = s.detailKey || 'operasyonlar';
      s.detailFields = [
        { key: 'operasyon_kodu', label: 'Operasyon kodu' },
        { key: 'operasyon_adi', label: 'Operasyon adı' },
        { key: 'sure_dk', label: 'Süre (dk)', type: 'number' },
      ];
    } else if (s.id === 'uretim-emirleri') {
      s.detailKey = s.detailKey || 'operasyonlar';
      s.detailFields = [
        { key: 'operasyon_kodu', label: 'Operasyon kodu' },
        { key: 'operasyon_adi', label: 'Operasyon adı' },
        { key: 'durum', label: 'Durum' },
      ];
    } else {
      s.detailKey = s.detailKey || 'satirlar';
      s.detailFields = [
        { key: 'stok_id', label: 'Stok ID', type: 'number' },
        { key: 'miktar', label: 'Miktar', type: 'number' },
        { key: 'birim', label: 'Birim' },
      ];
    }
  }

  if (s.detailSlots == null) {
    if (!s.detailFields.length) s.detailSlots = 0;
    else if (s.detailKey === 'stok_detaylari' || s.detailKey === 'cari_detaylari') s.detailSlots = 1;
    else s.detailSlots = 3;
  }

  // Satış siparişi kompakt kabuğu → tüm uygun belge ekranları
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
    // İş emri gibi Bilgiler + Malzemeler + Rota: başlık stok/miktar/birim kalemlerle paylaşılır,
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

  // Aktif checkbox → Pasif (DB aktif kalır; tik = pasif)
  const remapAktifToPasif = (fields) => {
    (fields || []).forEach((f) => {
      if (f && f.key === 'aktif' && f.type === 'checkbox' && f.label === 'Aktif') {
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
    if (c.key === 'aktif' && c.label === 'Aktif') c.label = 'Pasif';
  });

  // Tüm listelere firma / iş yeri (+ varsa aktif) filtreleri
  if (!Array.isArray(s.filters)) s.filters = [];
  const firmaLookup = {
    key: 'firma_id',
    label: 'Firma',
    type: 'lookup',
    lookup: 'firmalar',
    valueKey: 'id',
    labelKey: 'firma_adi',
    codeKey: 'firma_kodu',
  };
  const isYeriLookup = {
    key: 'is_yeri_id',
    label: 'İş yeri',
    type: 'lookup',
    lookup: 'is-yerleri',
    valueKey: 'id',
    labelKey: 'is_yeri_adi',
    codeKey: 'is_yeri_kodu',
  };
  const upgradeOrInject = (keys, def) => {
    if (s.scopeFirma === false && def.key === 'firma_id') return;
    if (s.scopeIsYeri === false && def.key === 'is_yeri_id') return;
    const idx = s.filters.findIndex((f) => keys.includes(f.key));
    if (idx >= 0) {
      s.filters[idx] = { ...def, label: s.filters[idx].label || def.label };
    } else {
      s.filters.unshift({ ...def });
    }
  };
  upgradeOrInject(['firma_id', 'firma_kodu', 'firma_adi'], firmaLookup);
  upgradeOrInject(['is_yeri_id', 'is_yeri_kodu', 'is_yeri_adi'], isYeriLookup);

  const hasFilter = (key) => s.filters.some((f) => f.key === key);
  const usesAktif = (
    (s.columns || []).some((c) => c.key === 'aktif')
    || (s.masterFields || []).some((f) => f.key === 'aktif')
    || (s.formTabs || []).some((t) =>
      [...(t.fields || []), ...(t.masterFields || [])].some((f) => f.key === 'aktif'))
  );
  if (usesAktif && !hasFilter('aktif')) {
    s.filters.unshift({ key: 'aktif', label: 'Aktif', type: 'bool' });
  }

  // Serbest metin tanım alanlarını Sabit Tanımlar lookup'ına çevir (tüm ekranlar)
  upgradeTanimLookups(s);

  // Filtreleri form alanlarından zenginleştir (select/lookup → açılır liste)
  enrichFiltersFromForm(s);

  return s;
}

/** Para birimi / ülke / il / ilçe → tanım ekranı lookup */
const TANIM_LOOKUP_BY_KEY = {
  para_birimi: {
    type: 'lookup',
    lookup: 'para-birimleri',
    valueKey: 'pb_kodu',
    labelKey: 'pb_adi',
    codeKey: 'pb_kodu',
  },
  ulke: {
    type: 'lookup',
    lookup: 'ulkeler',
    valueKey: 'ulke_kodu',
    labelKey: 'ulke_adi',
    codeKey: 'ulke_kodu',
  },
  sevk_ulke: {
    type: 'lookup',
    lookup: 'ulkeler',
    valueKey: 'ulke_kodu',
    labelKey: 'ulke_adi',
    codeKey: 'ulke_kodu',
  },
  ulke_mensei: {
    type: 'lookup',
    lookup: 'ulkeler',
    valueKey: 'ulke_kodu',
    labelKey: 'ulke_adi',
    codeKey: 'ulke_kodu',
  },
  ulke_kodu: {
    type: 'lookup',
    lookup: 'ulkeler',
    valueKey: 'ulke_kodu',
    labelKey: 'ulke_adi',
    codeKey: 'ulke_kodu',
  },
  il: {
    type: 'lookup',
    lookup: 'sehirler',
    valueKey: 'sehir_adi',
    labelKey: 'sehir_adi',
    codeKey: 'sehir_kodu',
    dependsOn: 'ulke',
    filterKey: 'ulke_kodu',
  },
  sehir: {
    type: 'lookup',
    lookup: 'sehirler',
    valueKey: 'sehir_adi',
    labelKey: 'sehir_adi',
    codeKey: 'sehir_kodu',
    dependsOn: 'ulke',
    filterKey: 'ulke_kodu',
  },
  sevk_il: {
    type: 'lookup',
    lookup: 'sehirler',
    valueKey: 'sehir_adi',
    labelKey: 'sehir_adi',
    codeKey: 'sehir_kodu',
    dependsOn: 'sevk_ulke',
    filterKey: 'ulke_kodu',
  },
  ilce: {
    type: 'lookup',
    lookup: 'ilceler',
    valueKey: 'ilce_adi',
    labelKey: 'ilce_adi',
    codeKey: 'ilce_kodu',
    dependsOn: 'il',
    filterKey: 'sehir_kodu',
    parentResolveLookup: 'sehirler',
    parentResolveBy: 'sehir_adi',
    parentResolveTo: 'sehir_kodu',
  },
  sevk_ilce: {
    type: 'lookup',
    lookup: 'ilceler',
    valueKey: 'ilce_adi',
    labelKey: 'ilce_adi',
    codeKey: 'ilce_kodu',
    dependsOn: 'sevk_il',
    filterKey: 'sehir_kodu',
    parentResolveLookup: 'sehirler',
    parentResolveBy: 'sehir_adi',
    parentResolveTo: 'sehir_kodu',
  },
  odeme_kosulu: {
    type: 'lookup',
    lookup: 'odeme-kosullari',
    valueKey: 'kosul_kodu',
    labelKey: 'kosul_adi',
    codeKey: 'kosul_kodu',
  },
  teslimat_kosulu: {
    type: 'lookup',
    lookup: 'teslimat-kosullari',
    valueKey: 'kosul_kodu',
    labelKey: 'kosul_adi',
    codeKey: 'kosul_kodu',
  },
  dil_kodu: {
    type: 'lookup',
    lookup: 'diller',
    valueKey: 'dil_kodu',
    labelKey: 'dil_adi',
    codeKey: 'dil_kodu',
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

/** Ülke adı/kodu → ulke_kodu; şehir adı/kodu → sehir_kodu */
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
      || (r.sehir_kodu && String(r.sehir_kodu) === raw)
      || (r.sehir_adi && String(r.sehir_adi) === raw));
    return hit ? hit[to] : null;
  }

  // ülke: kod veya ad
  if (field.filterKey === 'ulke_kodu') {
    const ulkeler = state.lookupCache.ulkeler || [];
    const hit = ulkeler.find((u) =>
      String(u.ulke_kodu) === raw || String(u.ulke_adi) === raw);
    return hit ? hit.ulke_kodu : raw;
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
  if (includeRoot && agac.mamul_stok_id) ids.add(Number(agac.mamul_stok_id));
  const flat = Array.isArray(agac.satirlar) ? agac.satirlar : [];
  flat.forEach((s) => {
    if (s.bilesen_stok_id) ids.add(Number(s.bilesen_stok_id));
  });
  if (!flat.length && Array.isArray(agac.agac)) {
    const walk = (nodes) => {
      (nodes || []).forEach((n) => {
        if (n.bilesen_stok_id) ids.add(Number(n.bilesen_stok_id));
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
  // ulke boşsa ulke_kodu'ya düş (bazı ekranlar ülke kodunu ayrı tutar)
  if ((parentRaw === undefined || parentRaw === null || parentRaw === '')
      && field.dependsOn === 'ulke' && ctx.ulke_kodu != null && ctx.ulke_kodu !== '') {
    parentRaw = ctx.ulke_kodu;
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
      // Kod–ad: select’te kod, title’da tam metin (dar kutu)
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
  const mapFields = (arr) => {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i += 1) arr[i] = applyTanimLookup(arr[i]);
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
    push(tab.masterFields);
    push(tab.detailFields);
    push(tab.grid?.fields);
  });
  return out;
}

/**
 * Filtrede bilinen seçenekleri açılır liste yap:
 * - formda select ise options kopyala
 * - formda lookup ise filtreyi lookup yap
 * - asama_adi / tip_adi gibi görünen adlar → ilgili lookup
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

    // asama_adi ← asama_id lookup (değer olarak ad ile filtrele)
    if (f.key === 'asama_adi' && byKey.asama_id?.lookup) {
      const L = byKey.asama_id;
      f.type = 'lookup';
      f.lookup = L.lookup;
      f.valueKey = L.labelKey || 'asama_adi';
      f.labelKey = L.labelKey || 'asama_adi';
      f.codeKey = L.codeKey || 'asama_kodu';
      return;
    }
    // faaliyet_tipi_adi ← faaliyet_tipi_id
    if ((f.key === 'faaliyet_tipi_adi' || f.key === 'tip_adi') && byKey.faaliyet_tipi_id?.lookup) {
      const L = byKey.faaliyet_tipi_id;
      f.type = 'lookup';
      f.lookup = L.lookup;
      f.valueKey = L.labelKey || 'tip_adi';
      f.labelKey = L.labelKey || 'tip_adi';
      f.codeKey = L.codeKey || 'tip_kodu';
      return;
    }
    // *_adi görünen ad + *_id lookup
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
  formContext: null,
  formActiveTab: null,
  lookupCache: {},
  formSeq: 0,
  gridSel: { key: null, idx: null },
  treeSel: null,
  treeExpanded: {},
  flowSel: null,
  flowCompSel: null,
  sidebarOpen: {},
  sidebarSectionOpen: {},
  tabCtxKey: null,
  nestedLink: null, // { fromScreenId, fromId, convertPath, bodyKey, extra }
  mrpCalismaId: null,
  formSolo: false, // ?view=form — yeni sekmede tam ekran form (sol menü yok)
  formPrefill: null,
  session: null,
  firmalar: [],
  activeFirmaId: null,
  activeIsYeriId: null,
  isYerleri: [],
};

/** Bağlı ekran ön doldurma haritası */
function buildLinkedPrefill(link, sourceRec, extra = {}) {
  if (link === 'teklif-siparis') {
    return {
      cari_id: sourceRec.cari_id,
      siparis_turu: 'SatisSiparis',
      durum: 'Onayli',
      para_birimi: sourceRec.para_birimi || 'TRY',
      kur: sourceRec.kur ?? 1,
      kur_tipi: sourceRec.kur_tipi || 'TCMB-SATIS',
      proje_kodu: sourceRec.proje_kodu || null,
      bolge: sourceRec.bolge || null,
      firma_id: sourceRec.firma_id || null,
      is_yeri_id: sourceRec.is_yeri_id || null,
      depo_id: sourceRec.depo_id || null,
      odeme_kosulu: sourceRec.odeme_kosulu || null,
      odeme_sekli: sourceRec.odeme_sekli || null,
      teslimat_kosulu: sourceRec.teslimat_kosulu || null,
      teslim_tarihi: sourceRec.teslim_tarihi || null,
      not_public: sourceRec.not_public || null,
      not_internal: sourceRec.not_internal || null,
      teklif_id: sourceRec.id,
      siparis_kaynak: 'Teklif',
      kaynak_belge_tipi: 'SATIS_TEKLIF',
      kaynak_belge_id: sourceRec.id,
      aciklama: `Teklif ${sourceRec.teklif_no || sourceRec.id}`,
      kalemler: (sourceRec.satirlar || sourceRec.kalemler || []).map((s, i) => ({
        sira_no: s.sira_no || i + 1,
        satir_tipi: s.satir_tipi || 'S',
        stok_id: s.stok_id,
        miktar: s.miktar,
        birim_fiyat: s.birim_fiyat,
        birim: s.birim,
        stok_birimi: s.birim,
        para_birimi: s.para_birimi || sourceRec.para_birimi || null,
        kur: s.kur ?? sourceRec.kur ?? 1,
        kur_tipi: s.kur_tipi || sourceRec.kur_tipi || null,
        iskonto_oran: s.iskonto_oran ?? 0,
        iskonto_oran2: s.iskonto_oran2 ?? 0,
        iskonto_oran3: s.iskonto_oran3 ?? 0,
        kdv_oran: s.kdv_oran ?? 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        teslim_tarihi: s.teslim_tarihi || sourceRec.teslim_tarihi || null,
        depo_id: s.depo_id || sourceRec.depo_id || null,
        proje_kodu: s.proje_kodu || sourceRec.proje_kodu || null,
        bolge: s.bolge || sourceRec.bolge || null,
        satir_aciklama: s.satir_aciklama || null,
        teklif_satir_id: s.id,
      })),
    };
  }
  if (link === 'sa-teklif-siparis') {
    return {
      cari_id: sourceRec.cari_id,
      teklif_id: sourceRec.id,
      talep_id: sourceRec.talep_id || null,
      durum: 'Onayli',
      para_birimi: sourceRec.para_birimi || 'TRY',
      kur: sourceRec.kur ?? 1,
      kur_tipi: sourceRec.kur_tipi || 'TCMB-ALIS',
      firma_id: sourceRec.firma_id || null,
      is_yeri_id: sourceRec.is_yeri_id || null,
      proje_kodu: sourceRec.proje_kodu || null,
      bolge: sourceRec.bolge || null,
      odeme_kosulu: sourceRec.odeme_kosulu || null,
      not_public: sourceRec.not_public || null,
      not_internal: sourceRec.not_internal || null,
      kaynak_belge_tipi: 'SATINALMA_TEKLIF',
      kaynak_belge_id: sourceRec.id,
      aciklama: `Teklif ${sourceRec.teklif_no || sourceRec.id}`,
      satirlar: (sourceRec.satirlar || []).map((s, i) => ({
        sira_no: s.sira_no || i + 1,
        satir_tipi: s.satir_tipi || 'S',
        stok_id: s.stok_id,
        miktar: s.miktar,
        birim: s.birim,
        birim_fiyat: s.birim_fiyat ?? 0,
        para_birimi: s.para_birimi || sourceRec.para_birimi || null,
        kur: s.kur ?? sourceRec.kur ?? 1,
        kur_tipi: s.kur_tipi || sourceRec.kur_tipi || null,
        iskonto_oran: s.iskonto_oran ?? 0,
        iskonto_oran2: s.iskonto_oran2 ?? 0,
        iskonto_oran3: s.iskonto_oran3 ?? 0,
        kdv_oran: s.kdv_oran ?? 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        teslim_tarihi: s.teslim_tarihi || null,
        proje_kodu: s.proje_kodu || sourceRec.proje_kodu || null,
        bolge: s.bolge || sourceRec.bolge || null,
        satir_aciklama: s.satir_aciklama || null,
        teklif_satir_id: s.id,
      })),
    };
  }
  if (link === 'mal-kabul-fatura') {
    return {
      cari_id: sourceRec.cari_id || null,
      fatura_turu: 'Alis',
      mal_kabul_id: sourceRec.id,
      siparis_id: sourceRec.siparis_id || null,
      para_birimi: sourceRec.para_birimi || 'TRY',
      kur: 1,
      kur_tipi: 'TCMB-ALIS',
      proje_kodu: sourceRec.proje_kodu || null,
      not_internal: sourceRec.not_internal || null,
      kaynak_belge_tipi: 'MAL_KABUL',
      kaynak_belge_id: sourceRec.id,
      aciklama: `Mal kabul ${sourceRec.kabul_no || sourceRec.id}`,
      kalemler: (sourceRec.satirlar || []).map((s, i) => ({
        sira_no: s.sira_no || i + 1,
        stok_id: s.stok_id,
        miktar: s.kabul_edilen ?? s.miktar,
        birim: s.birim,
        birim_fiyat: s.birim_fiyat ?? 0,
        kdv_oran: s.kdv_oran ?? 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        iskonto_oran: s.iskonto_oran ?? 0,
        satir_aciklama: s.satir_aciklama || null,
      })),
    };
  }
  if (link === 'siparis-sevk') {
    return {
      siparis_id: sourceRec.id,
      cari_id: sourceRec.cari_id,
      depo_id: extra.depo_id || null,
      sevk_adresi: sourceRec.sevk_adresi || '',
      durum: 'Onayli',
      kaynak_belge_tipi: 'SATIS_SIPARIS',
      kaynak_belge_id: sourceRec.id,
      aciklama: `Sipariş ${sourceRec.siparis_no || sourceRec.id}`,
      satirlar: (sourceRec.kalemler || sourceRec.satirlar || [])
        .filter((k) => k.stok_id && Number(k.kalan_sevk_miktar ?? k.miktar) > 0)
        .map((k, i) => ({
          sira_no: i + 1,
          stok_id: k.stok_id,
          siparis_detay_id: k.id,
          miktar: Number(k.kalan_sevk_miktar ?? k.miktar),
          birim: k.stok_birimi || k.birim || null,
        })),
    };
  }
  if (link === 'sevk-irsaliye') {
    return {
      cari_id: sourceRec.cari_id,
      depo_id: extra.depo_id || sourceRec.depo_id,
      siparis_id: sourceRec.siparis_id,
      sevk_emri_id: sourceRec.id,
      sevk_adresi: sourceRec.sevk_adresi,
      sevk_il: sourceRec.sevk_il,
      sevk_ilce: sourceRec.sevk_ilce,
      sevk_ulke: sourceRec.sevk_ulke || 'TR',
      sevk_posta_kodu: sourceRec.sevk_posta_kodu,
      arac_plaka: extra.arac_plaka || null,
      sofor_adi: extra.sofor_adi || null,
      sofor_soyadi: extra.sofor_soyadi || null,
      sofor_tckn: extra.sofor_tckn || null,
      tasiyici_unvan: extra.tasiyici_unvan || null,
      tasiyici_vkn: extra.tasiyici_vkn || null,
      durum: 'Taslak',
      kaynak_belge_tipi: 'SEVK_EMRI',
      kaynak_belge_id: sourceRec.id,
      aciklama: `Sevk ${sourceRec.sevk_no || sourceRec.id}`,
      satirlar: (sourceRec.satirlar || []).map((s, i) => ({
        sira_no: s.sira_no || i + 1,
        stok_id: s.stok_id,
        miktar: s.miktar,
        birim: s.birim,
        sevk_emri_satir_id: s.id,
        siparis_detay_id: s.siparis_detay_id,
      })),
    };
  }
  if (link === 'irsaliye-fatura') {
    return {
      cari_id: sourceRec.cari_id,
      fatura_turu: 'Satis',
      senaryo: 'TICARIFATURA',
      fatura_tipi: 'SATIS',
      para_birimi: 'TRY',
      irsaliye_id: sourceRec.id,
      siparis_id: sourceRec.siparis_id,
      sevk_adresi: sourceRec.sevk_adresi,
      durum: 'Taslak',
      kaynak_belge_tipi: 'IRSALIYE',
      kaynak_belge_id: sourceRec.id,
      aciklama: `İrsaliye ${sourceRec.irsaliye_no || sourceRec.id}`,
      kalemler: (sourceRec.satirlar || []).map((s, i) => ({
        sira_no: s.sira_no || i + 1,
        stok_id: s.stok_id,
        miktar: s.miktar,
        birim: s.birim,
        birim_fiyat: 0,
        kdv_oran: 20,
        irsaliye_satir_id: s.id,
        siparis_detay_id: s.siparis_detay_id,
      })),
    };
  }
  if (link === 'firsat-teklif') {
    return {
      cari_id: sourceRec.cari_id || extra.cari_id || null,
      firsat_id: sourceRec.id,
      aday_id: sourceRec.aday_id || null,
      para_birimi: sourceRec.para_birimi || 'TRY',
      durum: 'Taslak',
      kaynak_belge_tipi: 'CRM_FIRSAT',
      kaynak_belge_id: sourceRec.id,
      aciklama: `Fırsat ${sourceRec.firsat_kodu || sourceRec.id}`,
      satirlar: (sourceRec.satirlar || []).map((s, i) => ({
        sira_no: s.sira_no || i + 1,
        stok_id: s.stok_id,
        miktar: s.miktar,
        birim: s.birim,
        birim_fiyat: s.birim_fiyat || 0,
        kdv_oran: 20,
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
    if (f.type === 'checkbox') record[f.key] = f.key === 'pasif' ? false : true;
    else if (f.type === 'select') record[f.key] = f.options?.[0] || '';
    else if (f.key === 'firma_id' && getActiveFirmaId()) record[f.key] = getActiveFirmaId();
    else if (f.key === 'is_yeri_id' && state.activeIsYeriId) record[f.key] = state.activeIsYeriId;
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
    const { headers: optHeaders, ...restOpts } = options;
    res = await fetch(path, {
      ...restOpts,
      headers: {
        'Content-Type': 'application/json',
        ...(kullaniciKodu ? { 'X-Kullanici-Kodu': kullaniciKodu } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(firmaId ? { 'X-Firma-Id': String(firmaId) } : {}),
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

  const depolar = await api('/depolar').catch(() => []);
  const depoOpts = (depolar || []).map((d) =>
    `<option value="${d.id}" ${Number(d.id) === Number(rec.depo_id) ? 'selected' : ''}>${d.depo_kodu} — ${d.depo_adi}</option>`
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
      <label>Araç plaka <input id="cvtPlaka" value="${rec.arac_plaka || ''}" /></label>
      <label>Şoför adı <input id="cvtSoforAdi" value="${rec.sofor_adi || ''}" /></label>
      <label>Şoför soyadı <input id="cvtSoforSoyadi" value="${rec.sofor_soyadi || ''}" /></label>
      <label>Şoför TCKN <input id="cvtSoforTckn" value="${rec.sofor_tckn || ''}" /></label>
      <label>Taşıyıcı ünvan <input id="cvtTasiyici" value="${rec.tasiyici_unvan || ''}" /></label>
      <label>Taşıyıcı VKN <input id="cvtTasiyiciVkn" value="${rec.tasiyici_vkn || ''}" /></label>`;
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
      const depoId = Number($('#cvtDepo')?.value || rec.depo_id);
      try {
        const k = await api(`/irsaliyeler/${rec.id}/depo-kontrol?depo_id=${depoId}`);
        if (k.uygun) showConvertWarn('Depo bakiyesi yeterli.');
        else {
          const det = (k.satirlar || []).filter((s) => !s.yeterli).map((s) => {
            const onr = (s.onerilen_depolar || []).map((o) => `${o.depo_kodu}(${o.bakiye})`).join(', ') || '—';
            return `${s.stok_kodu}: bakiye ${s.bakiye} / gereken ${s.miktar} → ${onr}`;
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
        const sonuc = $('#cvtFirsatSonuc')?.value || 'Kazanildi';
        closeConvertDialog({
          sonuc,
          kapanis_nedeni: $('#cvtFirsatNeden')?.value || null,
        });
        return;
      }
      if (dialog === 'fatura-olustur') {
        const faturaNo = String($('#cvtFaturaNo')?.value || '').trim();
        if (!faturaNo) {
          showConvertWarn('Fatura numarası henüz hazır değil.');
          return;
        }
        closeConvertDialog({ fatura_no: faturaNo });
        return;
      }
      const depoId = Number($('#cvtDepo')?.value || 0);
      if ((dialog === 'depo' || dialog === 'irsaliye' || dialog === 'onay-depo') && !depoId) {
        showConvertWarn('Depo seçimi zorunlu.');
        return;
      }
      const payload = { depo_id: depoId };
      if (dialog === 'irsaliye') {
        payload.arac_plaka = $('#cvtPlaka')?.value || null;
        payload.sofor_adi = $('#cvtSoforAdi')?.value || null;
        payload.sofor_soyadi = $('#cvtSoforSoyadi')?.value || null;
        payload.sofor_tckn = $('#cvtSoforTckn')?.value || null;
        payload.tasiyici_unvan = $('#cvtTasiyici')?.value || null;
        payload.tasiyici_vkn = $('#cvtTasiyiciVkn')?.value || null;
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
  if (def.key === 'firma_id') {
    if (row.firma_id != null && row.firma_id !== '') return row.firma_id;
    if (screen?.id === 'firmalar') return row.id;
    if (row.firma_kodu && state.firmalar?.length) {
      const f = state.firmalar.find((x) => x.firma_kodu === row.firma_kodu);
      if (f) return f.id;
    }
    return null;
  }
  if (def.key === 'is_yeri_id') {
    if (row.is_yeri_id != null && row.is_yeri_id !== '') return row.is_yeri_id;
    if (screen?.id === 'is-yerleri') return row.id;
    return null;
  }
  return row[def.key];
}

function compareValues(cell, op, a, b, def) {
  // Ortak tanımlarda firma/iş yeri yoksa filtreyi geç
  if ((def?.key === 'firma_id' || def?.key === 'is_yeri_id')
    && (cell === null || cell === undefined || cell === '')) {
    return true;
  }
  const cellN = norm(cell);
  const aN = norm(a);
  const bN = norm(b);
  // Varsayılan: LIKE '%değer%' (büyük/küçük harf TR locale ile)
  if (op === 'icerir' || !op) return !aN || cellN.includes(aN);
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

function applyFilters(rows, screen) {
  const active = screen.filters
    .filter((f) => !f.queryParam) // sunucu filtreleri satır alanı değil
    .map((f) => ({ def: f, st: state.filterState[f.key] || { op: 'icerir', a: '', b: '' } }))
    .filter(({ st }) => (st.op === 'arasinda' ? Boolean(norm(st.a) || norm(st.b)) : Boolean(norm(st.a))));
  if (!active.length) return rows.slice();
  return rows.filter((row) =>
    active.every(({ def, st }) =>
      compareValues(resolveFilterCell(row, def, screen), st.op, st.a, st.b, def))
  );
}

function findScreen(id) {
  return ALL_SCREENS.find((s) => s.id === id) || null;
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
  const tipEl = document.querySelector(`[data-master="${tipKey}"]`);
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
    const codeEl = document.querySelector(`[data-master="${screen.codeField}"]`);
    if (codeEl) codeEl.value = kod;
  } catch (err) {
    toast(err.message || String(err));
  }
}

function bindNumeratorFieldListener(screen) {
  if (!screen?.numeratorFromField) return;
  if (state.formMode !== 'yeni' && state.formMode !== 'kopyala') return;
  const tipKey = screen.numeratorFromField.field;
  const tipEl = document.querySelector(`[data-master="${tipKey}"]`);
  if (!tipEl || tipEl.dataset.numeratorBound === '1') return;
  tipEl.dataset.numeratorBound = '1';
  tipEl.addEventListener('change', () => {
    refreshCodeFromNumeratorField(true);
  });
}

function showView(name) {
  const home = $('#viewHome');
  const screen = $('#viewScreen');
  const form = $('#viewForm');
  const meta = $('#viewMeta');
  if (!home || !screen || !form) {
    console.error('KTB ERP: view element missing', { home: !!home, screen: !!screen, form: !!form });
    return;
  }

  home.hidden = name !== 'home';
  screen.hidden = name !== 'screen';
  form.hidden = name !== 'form';
  if (meta) meta.hidden = name !== 'meta';

  home.style.display = name === 'home' ? 'grid' : 'none';
  screen.style.display = name === 'screen' ? 'grid' : 'none';
  form.style.display = name === 'form' ? 'flex' : 'none';
  if (meta) meta.style.display = name === 'meta' ? 'grid' : 'none';
}


function renderTabBar() {
  const bar = $('#tabBar');
  if (!bar) return;
  if (!state.openTabs.length) {
    bar.innerHTML = '';
    hideTabContextMenu();
    return;
  }
  bar.innerHTML = state.openTabs.map((t) => {
    const isForm = t.kind === 'form';
    const kind = isForm ? (MODE_LABELS[t.formMode] || 'Form') : 'Liste';
    const active = t.key === state.activeTabKey ? ' active' : '';
    return `
    <button type="button" class="tab-item ${isForm ? 'tab-form' : 'tab-list'}${active}" data-tab-key="${t.key}" title="${escapeAttr(t.title)}" aria-current="${t.key === state.activeTabKey ? 'page' : 'false'}">
      <span class="tab-kind">${kind}</span>
      <span class="tab-title">${escapeHtml(t.title)}</span>
      <span class="tab-close" data-tab-close-key="${t.key}" title="Sekmeyi kapat" aria-label="Sekmeyi kapat">×</span>
    </button>`;
  }).join('');
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
  'sabit-tanimlar': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
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
  const mods = s.modul_yetkileri;
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
    const ad = [s.ad, s.soyad].filter(Boolean).join(' ') || s.kullanici_adi || s.kullanici_kodu || 'Kullanıcı';
    nameEl.textContent = s.kullanici_adi || s.kullanici_kodu || ad;
    titleEl.textContent = s.unvan || s.rol || s.grup_adi || '';
    if (s.profil_resmi) {
      avatarEl.innerHTML = `<img src="${escAttr(s.profil_resmi)}" alt="" />`;
      avatarEl.classList.add('has-img');
    } else {
      const initials = (s.ad?.[0] || s.kullanici_adi?.[0] || '?').toUpperCase();
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

function showLoginView() {
  const login = $('#viewLogin');
  const shell = $('#appShell');
  if (shell) shell.hidden = true;
  if (login) login.hidden = false;
  document.body.classList.add('is-login');
  closeUserChipMenu();
  setLoginError('');
  const user = $('#loginUser');
  const pass = $('#loginPass');
  if (pass) pass.value = '';
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

function applySession(ses, kullanici_adi) {
  state.session = ses;
  const kod = ses.kullanici_kodu || kullanici_adi || '';
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
      kullanici_kodu: kod,
      kullanici_adi: kod,
      ad: kod,
      unvan: 'Yerel oturum',
      grup_kodu: 'ADMIN',
      rol: 'Yonetici',
      modul_yetkileri: ['*'],
      yetkiler: [],
      _soft: true,
    };
  } else if (state.session._soft !== false && !state.session.grup_kodu
    && !(Array.isArray(state.session.yetkiler) && state.session.yetkiler.length)) {
    state.session._soft = true;
    state.session.grup_kodu = state.session.grup_kodu || 'ADMIN';
    state.session.modul_yetkileri = state.session.modul_yetkileri || ['*'];
  }
  return true;
}

async function logoutUser() {
  try {
    const refresh = localStorage.getItem('ktb_refresh_token');
    const kod = localStorage.getItem('ktb_kullanici_kodu');
    await api('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refresh, kullanici_kodu: kod }),
    }).catch(() => {});
  } catch (_) { /* ignore */ }
  localStorage.removeItem('ktb_access_token');
  localStorage.removeItem('ktb_refresh_token');
  localStorage.removeItem('ktb_kullanici_kodu');
  localStorage.removeItem('ktb_cihaz_oturum');
  state.session = null;
  closeUserChipMenu();
  renderUserChip();
  renderSidebar();
  showLoginView();
  toast('Oturum kapatıldı.');
}

async function submitLoginForm(e) {
  if (e) e.preventDefault();
  closeUserChipMenu();
  const kullanici_adi = ($('#loginUser')?.value || '').trim();
  const sifre = ($('#loginPass')?.value || '').trim();
  const btn = $('#loginSubmit');
  if (!kullanici_adi) {
    setLoginError('Kullanıcı adı gerekli.');
    $('#loginUser')?.focus();
    return;
  }
  if (!sifre) {
    setLoginError('Şifre gerekli.');
    $('#loginPass')?.focus();
    return;
  }
  setLoginError('');
  if (btn) btn.disabled = true;
  try {
    const ses = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ kullanici_adi, sifre }),
    });
    applySession(ses, kullanici_adi);
    enterApp();
    await loadFirmalar().catch(() => {});
    renderFirmaPicker();
    showHome();
    toast(`Hoş geldiniz, ${ses.kullanici_adi || ses.ad || ''}`);
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
  const all = Array.isArray(state.firmalar) ? state.firmalar : [];
  const fy = state.session?.firma_yetkileri;
  if (!Array.isArray(fy) || !fy.length) return all;
  const ids = new Set(fy.map((f) => Number(f.firma_id ?? f.id)).filter(Boolean));
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
  // Oturum firma kısıtı varsa aktif firmayı listeye çek
  if (list.length && !list.some((f) => Number(f.id) === Number(state.activeFirmaId))) {
    state.activeFirmaId = Number(list[0].id);
    localStorage.setItem('ktb_firma_id', String(state.activeFirmaId));
  }
  const aktif = list.find((f) => Number(f.id) === Number(state.activeFirmaId)) || list[0];
  const yer = state.isYerleri.find((y) => Number(y.id) === Number(state.activeIsYeriId));
  nameEl.textContent = aktif
    ? (yer && state.isYerleri.length > 1
      ? `${aktif.firma_adi} · ${yer.is_yeri_kodu || yer.is_yeri_adi}`
      : aktif.firma_adi)
    : 'Firma seçin';
  menu.innerHTML = list.map((f) => `
    <li role="option">
      <button type="button" class="firma-picker-item ${Number(f.id) === Number(state.activeFirmaId) ? 'active' : ''}"
        data-firma-id="${f.id}">
        <span class="firma-kod">${f.firma_kodu || ''}</span>
        <span class="firma-adi">${f.firma_adi || ''}</span>
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
    } else if (f.key === 'aktif' || f.type === 'bool') {
      fs[f.key] = { op: 'esit', a: 'evet', b: '' };
    } else if (f.key === 'firma_id' && getActiveFirmaId()) {
      fs[f.key] = { op: 'esit', a: String(getActiveFirmaId()), b: '' };
    } else if (f.key === 'is_yeri_id' && state.activeIsYeriId) {
      fs[f.key] = { op: 'esit', a: String(state.activeIsYeriId), b: '' };
    } else if (f.type === 'lookup' || f.type === 'select' || (f.options && f.options.length)) {
      // Açılır listeler: varsayılan eşit, değer boş (= tümü)
      fs[f.key] = { op: 'esit', a: '', b: '' };
    } else {
      fs[f.key] = { op: 'icerir', a: '', b: '' };
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
    if (f.type === 'checkbox') {
      const on = String(st.a || '').toLowerCase() === 'evet' || st.a === '1' || st.a === true;
      extras.push(`${encodeURIComponent(f.key)}=${on ? '1' : '0'}`);
      return;
    }
    if (st.a != null && String(st.a).trim() !== '') {
      extras.push(`${encodeURIComponent(f.key)}=${encodeURIComponent(st.a)}`);
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
    kurEl.title = 'TRY için kur sabittir';
    return;
  }
  kurEl.disabled = false;
  kurEl.title = '';
  if (!force && kurEl.value && Number(kurEl.value) > 0 && Number(kurEl.value) !== 1) return;
  try {
    const r = await api(`/doviz-kurlari/cevir?miktar=1&kaynak_pb=${encodeURIComponent(pb)}&hedef_pb=TRY&tip=satis`);
    if (r?.kur != null) kurEl.value = String(r.kur);
  } catch (_) {
    /* kur yoksa kullanıcı girer */
  }
}

/**
 * Cari seçilince sevk adresini Adres sekmesine doldur.
 * Öncelik: varsayılan sevk adresi → fatura_adres* → adres.
 * Ödeme / PB alanları da boşsa cari kartından alınır.
 */
async function fillAdresFromCari(cariId, { force = false } = {}) {
  if (!cariId || !state.formRecord) return;
  try {
    const cari = await api(`/cariler/${cariId}`);
    if (!cari) return;
    const rec = state.formRecord;
    const sevkList = Array.isArray(cari.sevk_adresleri) ? cari.sevk_adresleri : [];
    const varsayilan = sevkList.find((a) => a.varsayilan && !a.pasif)
      || sevkList.find((a) => !a.pasif)
      || null;
    const adresSatir = varsayilan
      ? [varsayilan.adres1, varsayilan.adres2, varsayilan.adres3].filter(Boolean).join(' ').trim()
      : '';
    const patch = {
      sevk_adresi: adresSatir
        || cari.fatura_adres1
        || cari.fatura_adresi
        || cari.adres
        || '',
      sevk_il: (varsayilan && varsayilan.il) || cari.il || '',
      sevk_ilce: (varsayilan && varsayilan.ilce) || cari.ilce || '',
      sevk_ulke: (varsayilan && varsayilan.ulke) || cari.ulke || 'TR',
      sevk_posta_kodu: (varsayilan && varsayilan.posta_kodu) || cari.posta_kodu || '',
    };
    Object.entries(patch).forEach(([k, v]) => {
      if (force || !rec[k]) rec[k] = v;
    });
    // Ödeme sekmesi / satır varsayılanları — boşsa cari kartından
    if ((force || !rec.odeme_kosulu) && cari.odeme_kosulu) rec.odeme_kosulu = cari.odeme_kosulu;
    if ((force || !rec.odeme_sekli) && cari.odeme_sekli) rec.odeme_sekli = cari.odeme_sekli;
    if ((force || !rec.teslimat_kosulu) && cari.teslimat_kosulu) rec.teslimat_kosulu = cari.teslimat_kosulu;
    if ((force || !rec.para_birimi) && cari.para_birimi) rec.para_birimi = cari.para_birimi;
    // Açık kalem satırlarına PB yansıt (henüz boş olanlar)
    const detailKey = findScreen(state.screenId)?.detailKey || 'kalemler';
    const rows = Array.isArray(rec[detailKey]) ? rec[detailKey] : [];
    if (cari.para_birimi && rows.length) {
      rows.forEach((row) => {
        if (!row.para_birimi) row.para_birimi = cari.para_birimi;
      });
    }
  } catch (err) {
    console.warn('Cari adres doldurulamadı', err);
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
      if (talep.tedarikci_cari_id && state.formRecord.cari_id == null) {
        state.formRecord.cari_id = talep.tedarikci_cari_id;
      }
      if (talep.is_yeri_id && !state.formRecord.is_yeri_id) state.formRecord.is_yeri_id = talep.is_yeri_id;
      if (talep.firma_id && !state.formRecord.firma_id) state.formRecord.firma_id = talep.firma_id;
      if (talep.depo_id && !state.formRecord.depo_id) state.formRecord.depo_id = talep.depo_id;
      if (talep.proje_kodu && !state.formRecord.proje_kodu) state.formRecord.proje_kodu = talep.proje_kodu;
      if (talep.bolge && !state.formRecord.bolge) state.formRecord.bolge = talep.bolge;
      if (talep.para_birimi && !state.formRecord.para_birimi) state.formRecord.para_birimi = talep.para_birimi;
      if (talep.kur != null && (state.formRecord.kur == null || state.formRecord.kur === '')) {
        state.formRecord.kur = talep.kur;
      }
      if (talep.kur_tipi && !state.formRecord.kur_tipi) state.formRecord.kur_tipi = talep.kur_tipi;
      if (talep.hedef_teslim_tarihi && !state.formRecord.teslim_tarihi) {
        state.formRecord.teslim_tarihi = talep.hedef_teslim_tarihi;
      }
      state.formRecord.talep_id = Number(sourceId);
      state.formRecord[detailKey] = (talep.satirlar || []).map((s) => ({
        talep_satir_id: s.id,
        satir_tipi: s.satir_tipi || 'S',
        stok_id: s.stok_id,
        stok_kodu: s.stok_kodu,
        stok_adi: s.stok_adi,
        miktar: s.miktar,
        birim: s.birim,
        birim_fiyat: s.tahmini_birim_fiyat ?? s.birim_fiyat ?? 0,
        para_birimi: s.para_birimi || talep.para_birimi || null,
        kur: s.kur ?? talep.kur ?? 1,
        kur_tipi: s.kur_tipi || talep.kur_tipi || null,
        kdv_oran: s.kdv_oran ?? 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        iskonto_oran: s.iskonto_oran ?? 0,
        iskonto_oran2: s.iskonto_oran2 ?? 0,
        iskonto_oran3: s.iskonto_oran3 ?? 0,
        teslim_tarihi: s.teslim_tarihi || talep.hedef_teslim_tarihi || null,
        depo_id: s.depo_id || talep.depo_id || null,
        proje_kodu: s.proje_kodu || talep.proje_kodu || null,
        bolge: s.bolge || talep.bolge || null,
        tedarikci_stok_kodu: s.tedarikci_stok_kodu || null,
        tedarikci_stok_adi: s.tedarikci_stok_adi || null,
        rezervasyon_tipi: s.rezervasyon_tipi || null,
        rezervasyon_iliski_no: s.rezervasyon_iliski_no || null,
        satir_aciklama: s.satir_aciklama || s.aciklama || '',
        _satir_kayitli: false,
      }));
      toast(`Talep ${talep.talep_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'siparis-satirlar') {
      const sip = await api(`/satin-alma-siparisleri/${sourceId}`);
      if (!sip) return;
      state.formRecord.siparis_id = Number(sourceId);
      if (sip.cari_id && !state.formRecord.cari_id) state.formRecord.cari_id = sip.cari_id;
      if (sip.depo_id && !state.formRecord.depo_id) state.formRecord.depo_id = sip.depo_id;
      state.formRecord[detailKey] = (sip.satirlar || [])
        .filter((s) => Number(s.miktar) - Number(s.giren_miktar || 0) > 0)
        .map((s) => ({
          siparis_satir_id: s.id,
          stok_id: s.stok_id,
          stok_kodu: s.stok_kodu,
          stok_adi: s.stok_adi,
          miktar: Number(s.miktar) - Number(s.giren_miktar || 0),
          birim: s.birim,
          birim_fiyat: s.birim_fiyat,
          tedarikci_stok_kodu: s.tedarikci_stok_kodu || null,
          tedarikci_stok_adi: s.tedarikci_stok_adi || null,
          satir_aciklama: s.satir_aciklama || null,
          _satir_kayitli: false,
        }));
      toast(`Sipariş ${sip.siparis_no || sourceId} kalan satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'tedarikci-irsaliye-satirlar') {
      const ir = await api(`/tedarikci-irsaliyeleri/${sourceId}`);
      if (!ir) return;
      state.formRecord.tedarikci_irsaliye_id = Number(sourceId);
      if (ir.siparis_id) state.formRecord.siparis_id = ir.siparis_id;
      if (ir.irsaliye_no) state.formRecord.irsaliye_no_tedarikci = ir.irsaliye_no;
      if (ir.irsaliye_tarihi) state.formRecord.irsaliye_tarihi = ir.irsaliye_tarihi;
      state.formRecord[detailKey] = (ir.satirlar || [])
        .filter((s) => Number(s.kalan_miktar != null ? s.kalan_miktar : (s.miktar - (s.kabul_edilen || 0))) > 0)
        .map((s) => ({
          siparis_satir_id: s.siparis_satir_id,
          stok_id: s.stok_id,
          miktar: Number(s.kalan_miktar != null ? s.kalan_miktar : (s.miktar - (s.kabul_edilen || 0))),
          birim: s.birim,
          birim_fiyat: s.birim_fiyat,
          _satir_kayitli: false,
        }));
      toast(`İrsaliye ${ir.irsaliye_no || sourceId} kalan satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'teklif-satirlar') {
      const teklif = await api(`/satis-teklifleri/${sourceId}`);
      if (!teklif) return;
      state.formRecord.teklif_id = Number(sourceId);
      if (teklif.cari_id && !state.formRecord.cari_id) state.formRecord.cari_id = teklif.cari_id;
      if (teklif.firma_id && !state.formRecord.firma_id) state.formRecord.firma_id = teklif.firma_id;
      if (teklif.is_yeri_id && !state.formRecord.is_yeri_id) state.formRecord.is_yeri_id = teklif.is_yeri_id;
      if (teklif.depo_id && !state.formRecord.depo_id) state.formRecord.depo_id = teklif.depo_id;
      if (teklif.proje_kodu && !state.formRecord.proje_kodu) state.formRecord.proje_kodu = teklif.proje_kodu;
      if (teklif.bolge && !state.formRecord.bolge) state.formRecord.bolge = teklif.bolge;
      if (teklif.para_birimi && !state.formRecord.para_birimi) state.formRecord.para_birimi = teklif.para_birimi;
      if (teklif.kur != null && (state.formRecord.kur == null || state.formRecord.kur === '')) {
        state.formRecord.kur = teklif.kur;
      }
      if (teklif.kur_tipi && !state.formRecord.kur_tipi) state.formRecord.kur_tipi = teklif.kur_tipi;
      if (teklif.odeme_kosulu && !state.formRecord.odeme_kosulu) state.formRecord.odeme_kosulu = teklif.odeme_kosulu;
      if (teklif.odeme_sekli && !state.formRecord.odeme_sekli) state.formRecord.odeme_sekli = teklif.odeme_sekli;
      if (teklif.teslimat_kosulu && !state.formRecord.teslimat_kosulu) state.formRecord.teslimat_kosulu = teklif.teslimat_kosulu;
      if (teklif.teslim_tarihi && !state.formRecord.teslim_tarihi) state.formRecord.teslim_tarihi = teklif.teslim_tarihi;
      if (!state.formRecord.siparis_kaynak) state.formRecord.siparis_kaynak = 'Teklif';
      if (!state.formRecord.siparis_turu) state.formRecord.siparis_turu = 'SatisSiparis';
      state.formRecord[detailKey] = (teklif.satirlar || teklif.kalemler || []).map((s) => ({
        teklif_satir_id: s.id,
        satir_tipi: s.satir_tipi || 'S',
        stok_id: s.stok_id,
        stok_kodu: s.stok_kodu,
        stok_adi: s.stok_adi,
        miktar: s.miktar,
        birim: s.birim,
        birim_fiyat: s.birim_fiyat ?? 0,
        para_birimi: s.para_birimi || teklif.para_birimi || null,
        kur: s.kur ?? teklif.kur ?? 1,
        kur_tipi: s.kur_tipi || teklif.kur_tipi || null,
        kdv_oran: s.kdv_oran ?? 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        iskonto_oran: s.iskonto_oran ?? 0,
        iskonto_oran2: s.iskonto_oran2 ?? 0,
        iskonto_oran3: s.iskonto_oran3 ?? 0,
        teslim_tarihi: s.teslim_tarihi || teklif.teslim_tarihi || null,
        depo_id: s.depo_id || teklif.depo_id || null,
        proje_kodu: s.proje_kodu || teklif.proje_kodu || null,
        bolge: s.bolge || teklif.bolge || null,
        satir_aciklama: s.satir_aciklama || '',
        _satir_kayitli: false,
      }));
      toast(`Teklif ${teklif.teklif_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'sa-teklif-satirlar') {
      const teklif = await api(`/satin-alma-teklifleri/${sourceId}`);
      if (!teklif) return;
      state.formRecord.teklif_id = Number(sourceId);
      if (teklif.cari_id && !state.formRecord.cari_id) state.formRecord.cari_id = teklif.cari_id;
      if (teklif.talep_id && !state.formRecord.talep_id) state.formRecord.talep_id = teklif.talep_id;
      if (teklif.firma_id && !state.formRecord.firma_id) state.formRecord.firma_id = teklif.firma_id;
      if (teklif.is_yeri_id && !state.formRecord.is_yeri_id) state.formRecord.is_yeri_id = teklif.is_yeri_id;
      if (teklif.proje_kodu && !state.formRecord.proje_kodu) state.formRecord.proje_kodu = teklif.proje_kodu;
      if (teklif.bolge && !state.formRecord.bolge) state.formRecord.bolge = teklif.bolge;
      if (teklif.para_birimi && !state.formRecord.para_birimi) state.formRecord.para_birimi = teklif.para_birimi;
      if (teklif.kur != null && (state.formRecord.kur == null || state.formRecord.kur === '')) {
        state.formRecord.kur = teklif.kur;
      }
      if (teklif.kur_tipi && !state.formRecord.kur_tipi) state.formRecord.kur_tipi = teklif.kur_tipi;
      if (teklif.odeme_kosulu && !state.formRecord.odeme_kosulu) state.formRecord.odeme_kosulu = teklif.odeme_kosulu;
      state.formRecord[detailKey] = (teklif.satirlar || []).map((s) => ({
        teklif_satir_id: s.id,
        satir_tipi: s.satir_tipi || 'S',
        stok_id: s.stok_id,
        stok_kodu: s.stok_kodu,
        stok_adi: s.stok_adi,
        miktar: s.miktar,
        birim: s.birim,
        birim_fiyat: s.birim_fiyat ?? 0,
        para_birimi: s.para_birimi || teklif.para_birimi || null,
        kur: s.kur ?? teklif.kur ?? 1,
        kur_tipi: s.kur_tipi || teklif.kur_tipi || null,
        kdv_oran: s.kdv_oran ?? 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        iskonto_oran: s.iskonto_oran ?? 0,
        iskonto_oran2: s.iskonto_oran2 ?? 0,
        iskonto_oran3: s.iskonto_oran3 ?? 0,
        teslim_tarihi: s.teslim_tarihi || null,
        proje_kodu: s.proje_kodu || teklif.proje_kodu || null,
        bolge: s.bolge || teklif.bolge || null,
        satir_aciklama: s.satir_aciklama || '',
        _satir_kayitli: false,
      }));
      toast(`SA teklif ${teklif.teklif_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'siparis-kalemler') {
      const sip = await api(`/siparisler/${sourceId}`);
      if (!sip) return;
      state.formRecord.siparis_id = Number(sourceId);
      if (sip.cari_id && !state.formRecord.cari_id) state.formRecord.cari_id = sip.cari_id;
      if (sip.depo_id && !state.formRecord.depo_id) state.formRecord.depo_id = sip.depo_id;
      if (sip.firma_id && !state.formRecord.firma_id) state.formRecord.firma_id = sip.firma_id;
      if (sip.is_yeri_id && !state.formRecord.is_yeri_id) state.formRecord.is_yeri_id = sip.is_yeri_id;
      if (sip.proje_kodu && !state.formRecord.proje_kodu) state.formRecord.proje_kodu = sip.proje_kodu;
      if (sip.bolge && !state.formRecord.bolge) state.formRecord.bolge = sip.bolge;
      if (sip.para_birimi && !state.formRecord.para_birimi) state.formRecord.para_birimi = sip.para_birimi;
      if (sip.kur != null && (state.formRecord.kur == null || state.formRecord.kur === '')) state.formRecord.kur = sip.kur;
      if (sip.kur_tipi && !state.formRecord.kur_tipi) state.formRecord.kur_tipi = sip.kur_tipi;
      if (sip.sevk_adresi && !state.formRecord.sevk_adresi) state.formRecord.sevk_adresi = sip.sevk_adresi;
      if (sip.sevk_il && !state.formRecord.sevk_il) state.formRecord.sevk_il = sip.sevk_il;
      if (sip.sevk_ilce && !state.formRecord.sevk_ilce) state.formRecord.sevk_ilce = sip.sevk_ilce;
      if (sip.sevk_ulke && !state.formRecord.sevk_ulke) state.formRecord.sevk_ulke = sip.sevk_ulke;
      if (sip.sevk_posta_kodu && !state.formRecord.sevk_posta_kodu) state.formRecord.sevk_posta_kodu = sip.sevk_posta_kodu;
      const lines = sip.kalemler || sip.satirlar || [];
      state.formRecord[detailKey] = lines
        .filter((s) => {
          const kalan = Number(
            s.kalan_sevk_miktar != null
              ? s.kalan_sevk_miktar
              : (s.bekleyen_miktar != null ? s.bekleyen_miktar : (Number(s.miktar) - Number(s.sevk_edilen_miktar || 0)))
          );
          return s.stok_id && kalan > 0;
        })
        .map((s) => {
          const kalan = Number(
            s.kalan_sevk_miktar != null
              ? s.kalan_sevk_miktar
              : (s.bekleyen_miktar != null ? s.bekleyen_miktar : (Number(s.miktar) - Number(s.sevk_edilen_miktar || 0)))
          );
          return {
            siparis_detay_id: s.id,
            satir_tipi: s.satir_tipi || 'S',
            stok_id: s.stok_id,
            stok_kodu: s.stok_kodu || s.stok_kodu_ref,
            stok_adi: s.stok_adi || s.stok_adi_ref,
            miktar: kalan,
            birim: s.stok_birimi || s.birim,
            birim_fiyat: s.birim_fiyat ?? 0,
            para_birimi: s.para_birimi || sip.para_birimi || null,
            kur: s.kur ?? sip.kur ?? 1,
            kur_tipi: s.kur_tipi || sip.kur_tipi || null,
            iskonto_oran: s.iskonto_oran ?? 0,
            iskonto_oran2: s.iskonto_oran2 ?? 0,
            iskonto_oran3: s.iskonto_oran3 ?? 0,
            kdv_oran: s.kdv_oran ?? 20,
            kdv_durumu: s.kdv_durumu || 'Haric',
            depo_id: s.depo_id || sip.depo_id || null,
            proje_kodu: s.proje_kodu || sip.proje_kodu || null,
            bolge: s.bolge || sip.bolge || null,
            satir_aciklama: s.satir_aciklama || '',
            sevk_edilen_miktar: s.sevk_edilen_miktar || 0,
            fatura_edilen_miktar: s.fatura_edilen_miktar || 0,
            bekleyen_miktar: kalan,
            _satir_kayitli: false,
          };
        });
      toast(`Sipariş ${sip.siparis_no || sourceId} kalan kalemleri yüklendi`);
      renderForm(screen);
    } else if (kind === 'sevk-satirlar') {
      const sevk = await api(`/sevk-emirleri/${sourceId}`);
      if (!sevk) return;
      state.formRecord.sevk_emri_id = Number(sourceId);
      if (sevk.siparis_id) state.formRecord.siparis_id = sevk.siparis_id;
      if (sevk.cari_id && !state.formRecord.cari_id) state.formRecord.cari_id = sevk.cari_id;
      if (sevk.depo_id && !state.formRecord.depo_id) state.formRecord.depo_id = sevk.depo_id;
      if (sevk.sevk_adresi && !state.formRecord.sevk_adresi) state.formRecord.sevk_adresi = sevk.sevk_adresi;
      if (sevk.sevk_il && !state.formRecord.sevk_il) state.formRecord.sevk_il = sevk.sevk_il;
      if (sevk.sevk_ilce && !state.formRecord.sevk_ilce) state.formRecord.sevk_ilce = sevk.sevk_ilce;
      if (sevk.sevk_ulke && !state.formRecord.sevk_ulke) state.formRecord.sevk_ulke = sevk.sevk_ulke;
      if (sevk.arac_plaka && !state.formRecord.arac_plaka) state.formRecord.arac_plaka = sevk.arac_plaka;
      if (sevk.tasiyici_unvan && !state.formRecord.tasiyici_unvan) state.formRecord.tasiyici_unvan = sevk.tasiyici_unvan;
      state.formRecord[detailKey] = (sevk.satirlar || sevk.kalemler || []).map((s) => ({
        sevk_emri_satir_id: s.id,
        siparis_detay_id: s.siparis_detay_id || null,
        stok_id: s.stok_id,
        miktar: Number(s.kalan_miktar != null ? s.kalan_miktar : s.miktar) || s.miktar,
        birim: s.birim,
        birim_fiyat: s.birim_fiyat ?? 0,
        parti_id: s.parti_id || null,
        seri_no: s.seri_no || null,
        raf_kodu: s.raf_kodu || null,
        satir_aciklama: s.satir_aciklama || '',
        _satir_kayitli: false,
      }));
      toast(`Sevk ${sevk.sevk_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'irsaliye-satirlar') {
      const ir = await api(`/irsaliyeler/${sourceId}`);
      if (!ir) return;
      state.formRecord.irsaliye_id = Number(sourceId);
      if (ir.siparis_id && !state.formRecord.siparis_id) state.formRecord.siparis_id = ir.siparis_id;
      if (ir.cari_id && !state.formRecord.cari_id) state.formRecord.cari_id = ir.cari_id;
      if (ir.depo_id && !state.formRecord.depo_id) state.formRecord.depo_id = ir.depo_id;
      if (ir.para_birimi && !state.formRecord.para_birimi) state.formRecord.para_birimi = ir.para_birimi;
      if (ir.kur != null && (state.formRecord.kur == null || state.formRecord.kur === '')) state.formRecord.kur = ir.kur;
      if (ir.proje_kodu && !state.formRecord.proje_kodu) state.formRecord.proje_kodu = ir.proje_kodu;
      if (ir.sevk_adresi && !state.formRecord.sevk_adresi) state.formRecord.sevk_adresi = ir.sevk_adresi;
      if (!state.formRecord.fatura_turu) state.formRecord.fatura_turu = 'Satis';
      state.formRecord[detailKey] = (ir.satirlar || ir.kalemler || []).map((s) => ({
        irsaliye_satir_id: s.id,
        siparis_detay_id: s.siparis_detay_id || null,
        stok_id: s.stok_id,
        miktar: s.miktar,
        birim: s.birim,
        birim_fiyat: s.birim_fiyat ?? 0,
        iskonto_oran: s.iskonto_oran ?? 0,
        iskonto_oran2: s.iskonto_oran2 ?? 0,
        kdv_oran: s.kdv_oran ?? 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        depo_id: s.depo_id || ir.depo_id || null,
        satir_aciklama: s.satir_aciklama || '',
        seri_no: s.seri_no || null,
        _satir_kayitli: false,
      }));
      toast(`İrsaliye ${ir.irsaliye_no || sourceId} satırları yüklendi`);
      renderForm(screen);
    } else if (kind === 'mal-kabul-satirlar') {
      const mk = await api(`/mal-kabuller/${sourceId}`);
      if (!mk) return;
      state.formRecord.mal_kabul_id = Number(sourceId);
      if (mk.siparis_id && !state.formRecord.siparis_id) state.formRecord.siparis_id = mk.siparis_id;
      if (mk.cari_id && !state.formRecord.cari_id) state.formRecord.cari_id = mk.cari_id;
      if (!state.formRecord.fatura_turu) state.formRecord.fatura_turu = 'Alis';
      state.formRecord[detailKey] = (mk.satirlar || []).map((s) => ({
        mal_kabul_satir_id: s.id,
        siparis_satir_id: s.siparis_satir_id || null,
        stok_id: s.stok_id,
        miktar: s.kabul_edilen ?? s.miktar,
        birim: s.birim,
        birim_fiyat: s.birim_fiyat ?? 0,
        kdv_oran: s.kdv_oran ?? 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        iskonto_oran: s.iskonto_oran ?? 0,
        satir_aciklama: s.satir_aciklama || '',
        _satir_kayitli: false,
      }));
      toast(`Mal kabul ${mk.kabul_no || sourceId} satırları yüklendi`);
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
  toast(`Firma profili: ${state.firmalar.find((f) => Number(f.id) === id)?.firma_adi || id}`);
}

async function loadFirmalar() {
  try {
    // Firma listesi izolasyonsuz — seçim için tüm demo firmalar
    const rows = await api('/firmalar', { headers: { 'X-Firma-Id': '' } }).catch(() => api('/firmalar'));
    state.firmalar = Array.isArray(rows) ? rows : [];
  } catch (_) {
    state.firmalar = [];
  }
  const stored = Number(localStorage.getItem('ktb_firma_id') || 0);
  const prefer = state.firmalar.find((f) => Number(f.id) === stored)
    || state.firmalar.find((f) => f.firma_kodu === 'ELEK')
    || state.firmalar[0];
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
      op: document.querySelector(`[data-filter-op="${f.key}"]`)?.value || 'esit',
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
    const arasinda = opEl.value === 'arasinda';
    wrap.classList.toggle('split', arasinda);
    const b = wrap.querySelector(`[data-filter-b="${f.key}"]`);
    if (b) b.hidden = !arasinda;
  });
}

function filterBucket(f) {
  const k = f.key || '';
  if (k === 'firma_id' || k === 'firma_kodu' || k === 'firma_adi') return 'firma';
  if (k === 'is_yeri_id' || k === 'is_yeri_kodu' || k === 'is_yeri_adi') return 'isyeri';
  if (k === 'aktif' || f.type === 'bool') return 'aktif';
  if (f.type === 'date' || /tarih|_date$/i.test(k)) return 'tarih';
  return 'main';
}

function partitionFilters(filters) {
  const buckets = { firma: [], isyeri: [], tarih: [], aktif: [], main: [] };
  (filters || []).forEach((f) => {
    buckets[filterBucket(f)].push(f);
  });
  return {
    left: [...buckets.firma, ...buckets.isyeri, ...buckets.tarih, ...buckets.aktif],
    right: buckets.main,
  };
}

function filterValueControl(f, st) {
  if (f.type === 'lookup') {
    let rows = state.lookupCache[f.lookup];
    if (!Array.isArray(rows) || !rows.length) {
      if (f.lookup === 'firmalar') rows = state.firmalar;
      else if (f.lookup === 'is-yerleri') rows = state.isYerleri;
    }
    rows = Array.isArray(rows) ? rows : [];
    // Aynı görünen ad tekrarlanmasın (asama_adi ile filtrelerken)
    const vk = f.valueKey || 'id';
    const lk = f.labelKey || 'adi';
    const ck = f.codeKey;
    const seen = new Set();
    const opts = [`<option value="">— seçin —</option>`];
    rows.forEach((r) => {
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
      opts.push(`<option value="${escAttr(val)}" title="${escAttr(title)}" ${String(st.a) === String(val) ? 'selected' : ''}>${label}</option>`);
    });
    return `<select data-filter-a="${f.key}">${opts.join('')}</select>
      <input type="text" data-filter-b="${f.key}" value="" hidden />`;
  }
  if (f.type === 'select' || (Array.isArray(f.options) && f.options.length)) {
    const opts = f.options || [];
    return `<select data-filter-a="${f.key}">
      <option value="">— seçin —</option>
      ${opts.map((o) => {
        const v = typeof o === 'object' ? (o.value ?? o.id ?? o.v) : o;
        const l = typeof o === 'object' ? (o.label ?? o.adi ?? o.l ?? v) : o;
        return `<option value="${escAttr(v)}" ${String(st.a) === String(v) ? 'selected' : ''}>${l}</option>`;
      }).join('')}
    </select>
      <input type="text" data-filter-b="${f.key}" value="" hidden />`;
  }
  if (f.type === 'checkbox') {
    const on = String(st.a || '').toLowerCase() === 'evet' || st.a === '1' || st.a === true;
    return `<label class="filter-check"><input type="checkbox" data-filter-a="${f.key}" value="evet" ${on ? 'checked' : ''} /> Açık</label>
      <input type="text" data-filter-b="${f.key}" value="" hidden />`;
  }
  if (f.type === 'bool' || f.key === 'aktif') {
    const opts = [
      { v: 'evet', l: 'Evet' },
      { v: 'hayir', l: 'Hayır' },
    ];
    return `<select data-filter-a="${f.key}">
      <option value="">—</option>
      ${opts.map((o) => `<option value="${o.v}" ${norm(st.a) === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
    </select>
      <input type="text" data-filter-b="${f.key}" value="" hidden />`;
  }
  const isDate = f.type === 'date' || /tarih|_date$/i.test(f.key || '');
  if (isDate) {
    return `
      <input type="date" data-filter-a="${f.key}" value="${escAttr(String(st.a || '').slice(0, 10))}" />
      <input type="date" data-filter-b="${f.key}" value="${escAttr(String(st.b || '').slice(0, 10))}" ${st.op === 'arasinda' ? '' : 'hidden'} />`;
  }
  return `
    <input type="text" data-filter-a="${f.key}" value="${escAttr(st.a || '')}" placeholder="…" />
    <input type="text" data-filter-b="${f.key}" value="${escAttr(st.b || '')}" placeholder="…" ${st.op === 'arasinda' ? '' : 'hidden'} />`;
}

function filterOperatorsFor(f) {
  // Açılır liste / bool: yazma yok → eşit / eşit değil yeterli
  if (f.type === 'checkbox') {
    return OPERATORS.filter((o) => o.id === 'esit');
  }
  if (f.type === 'lookup' || f.type === 'select' || f.type === 'bool'
      || f.key === 'aktif' || (Array.isArray(f.options) && f.options.length)) {
    return OPERATORS.filter((o) => o.id === 'esit' || o.id === 'esit_degil');
  }
  return OPERATORS;
}

function renderFilterField(f) {
  const st = state.filterState[f.key] || { op: 'icerir', a: '', b: '' };
  const bucket = filterBucket(f);
  if (f.type === 'checkbox') {
    return `
    <div class="filter-field filter-field--${bucket} filter-field--check" data-filter-key="${f.key}">
      <label>${f.label}</label>
      <div class="filter-controls">
        <div class="filter-values" data-filter-values="${f.key}">
          ${filterValueControl(f, { ...st, op: 'esit' })}
        </div>
      </div>
    </div>`;
  }
  const ops = filterOperatorsFor(f);
  const op = ops.some((o) => o.id === st.op) ? st.op : (ops[0]?.id || 'esit');
  return `
    <div class="filter-field filter-field--${bucket}" data-filter-key="${f.key}">
      <label>${f.label}</label>
      <div class="filter-controls">
        <select class="filter-op" data-filter-op="${f.key}" title="Operatör">
          ${ops.map((o) => `<option value="${o.id}" ${op === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
        <div class="filter-values${op === 'arasinda' ? ' split' : ''}" data-filter-values="${f.key}">
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
}

/** Tüm listelerde ilk sütun: satır ID (ekran kolonlarında yoksa eklenir). */
function listColumns(screen) {
  const cols = (screen.columns || []).filter((c) => c.key !== 'id');
  return [{ key: 'id', label: 'ID', mono: true }, ...cols];
}

function cellHtml(col, row, index = 0) {
  let val = col.key === 'id' ? rowKey(row, index) : row[col.key];
  // Aktif kolonu Pasif olarak gösterilir: tik/Evet = pasif (aktif=false)
  if (col.key === 'aktif' && typeof val === 'boolean') {
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
  if (row.seri_kodu) return String(row.seri_kodu);
  const parts = [row.depo_id, row.stok_id, row.stok_statu, row.parti_id, row.stok_kodu, index];
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
  if (s.grup_kodu === 'ADMIN') return true;
  if (String(s.rol || '').toLowerCase() === 'yonetici') return true;
  const mods = s.modul_yetkileri;
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
    const mods = s.modul_yetkileri;
    // Yetki satırı yok + modül * veya tanımsız → aç
    return !mods || !mods.length || mods.includes('*');
  }
  const row = list.find((y) => y.ekran_id === screenId && y.erisim !== false);
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

    state.screenId = id;
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

    if (location.hash !== `#${id}`) {
      history.pushState({ screenId: id }, '', `#${id}`);
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
      data = await api(buildListEndpoint(screen));
    }
    if (state.screenId !== id) return;
    let rows = Array.isArray(data) ? data : [];
    if (screen.id === 'numarator-tanimi') {
      rows = rows.map((r) => ({ ...r, id: r.seri_kodu }));
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
  'olcu-birimleri': '/olcu-birimleri?aktif=true',
  firmalar: '/firmalar',
  'is-yerleri': '/is-yerleri',
  depolar: '/depolar',
  stoklar: '/stoklar?aktif=true',
  'stoklar-mamul': '/stoklar?aktif=true&tip=Mamul,YariMamul',
  ulkeler: '/ulkeler?aktif=true',
  'para-birimleri': '/para-birimleri?aktif=true',
  sehirler: '/sehirler?aktif=true',
  ilceler: '/ilceler?aktif=true',
  'odeme-kosullari': '/odeme-kosullari?aktif=true',
  'teslimat-kosullari': '/teslimat-kosullari?aktif=true',
  diller: '/diller?aktif=true',
  bankalar: '/bankalar?aktif=true',
  'doviz-kurlari': '/doviz-kurlari?son=true',
  'satin-alma-talepleri': '/satin-alma-talepleri',
  'satin-alma-teklifleri': '/satin-alma-teklifleri',
  'satin-alma-siparisleri': '/satin-alma-siparisleri',
  'tedarikci-irsaliyeleri': '/tedarikci-irsaliyeleri',
  'mal-kabuller': '/mal-kabuller',
  'alis-faturalari': '/faturalar?fatura_turu=Alis',
  'satis-teklifleri': '/satis-teklifleri',
  'satis-faturalari': '/faturalar?fatura_turu=Satis',
  'is-merkezleri': '/is-merkezleri',
  'uretim-emirleri': '/uretim-emirleri',
  'uretim-planlari': '/uretim-planlari',
  'uretim-emri-tipleri': '/uretim-emri-tipleri?aktif=true',
  'stok-depo': '/stok-depo?aktif=true',
  'stok-partileri': '/stok-partileri',
  'crm-adaylar': '/crm-adaylar?aktif=true',
  'crm-firsatlar': '/crm-firsatlar?durum=Acik',
  'crm-firsat-asamalari': '/crm-firsat-asamalari?aktif=true',
  'crm-faaliyet-tipleri': '/crm-faaliyet-tipleri?aktif=true',
  'crm-kontaklar': '/crm-kontaklar?aktif=true',
  kisiler: '/kisiler',
  'kullanici-gruplari': '/kullanici-gruplari',
  'satin-alma-siparisleri': '/satin-alma-siparisleri',
  'mal-kabuller': '/mal-kabuller',
  'fiyat-listeleri': '/fiyat-listeleri',
  'kk-kontrol-planlari': '/kk-kontrol-planlari',
  'kk-ret-nedenleri': '/kk-ret-nedenleri',
  'urun-agaclari': '/urun-agaclari?tip=hepsi',
  rotalar: '/rotalar?tip=hepsi',
  cariler: '/cariler?aktif=true',
  'cariler-musteri': '/cariler?tur=Musteri&aktif=true',
  'cariler-tedarikci': '/cariler?tur=Tedarikci&aktif=true',
  'kategoriler-abc': '/kategoriler?tip=ABC&aktif=true',
  'kategoriler-marka': '/kategoriler?tip=Marka&aktif=true',
  'kategoriler-temin': '/kategoriler?tip=TeminSekli&aktif=true',
  'kategoriler-sektor': '/kategoriler?tip=Sektor&aktif=true',
  'kategoriler-bolge': '/kategoriler?tip=Bolge&aktif=true',
  'muhasebe-hesaplari': '/muhasebe-hesaplari',
  siparisler: '/siparisler',
  'sevk-emirleri': '/sevk-emirleri',
  irsaliyeler: '/irsaliyeler',
  'hareket-kodlari': '/hareket-kodlari?aktif=true',
  'hareket-kodlari-teklif': '/hareket-kodlari?belge_tipi=SatisTeklif&aktif=true',
  'hareket-kodlari-siparis': '/hareket-kodlari?belge_tipi=SatisSiparis&aktif=true',
  'hareket-kodlari-sevk': '/hareket-kodlari?belge_tipi=SevkEmri&aktif=true',
  'hareket-kodlari-irsaliye': '/hareket-kodlari?belge_tipi=SatisIrsaliye&aktif=true',
  'hareket-kodlari-fatura': '/hareket-kodlari?belge_tipi=SatisFatura&aktif=true',
  'hareket-kodlari-stok': '/hareket-kodlari?aktif=true&grup=inv',
  'onay-rolleri': '/onay-rolleri',
  'onay-rotalari': '/onay-rotalari',
  'onay-mesaj-sablonlari': '/onay-mesaj-sablonlari?aktif=true',
  'onay-durumlari': '/onay-durumlari?aktif=true',
  'onay-modul-kullanimlari': '/onay-modul-kullanimlari?aktif=true',
  'onay-kurallari': '/onay-kurallari?aktif=true',
  'onay-ekranlari': '/onay-ekranlari',
};

/** Ekran kaydı → ek lookup anahtarları (endpoint eşleşmesi yetmezse / alias) */
const SCREEN_LOOKUP_EXTRAS = {
  'stok-karti': ['stoklar', 'stoklar-mamul', 'stok-depo', 'stok-partileri'],
  'cari-kartlari': ['cariler', 'cariler-musteri', 'cariler-tedarikci'],
  'kategori-tanimi': [
    'kategoriler-abc', 'kategoriler-marka', 'kategoriler-temin',
    'kategoriler-sektor', 'kategoriler-bolge',
  ],
  'hareket-kodlari': [
    'hareket-kodlari', 'hareket-kodlari-teklif', 'hareket-kodlari-siparis',
    'hareket-kodlari-sevk', 'hareket-kodlari-irsaliye', 'hareket-kodlari-fatura', 'hareket-kodlari-stok',
  ],
  kullanicilar: ['kisiler'],
  'satis-siparisleri': ['siparisler'],
  'satis-teklifleri': ['satis-teklifleri'],
  'alis-faturalari': ['alis-faturalari', 'mal-kabuller'],
  'fatura-kontrolleri': ['alis-faturalari', 'mal-kabuller', 'satin-alma-siparisleri'],
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
  else invalidateLookups(); // bilinmeyen ekran → tüm cache
}

async function fetchLookupKey(key) {
  const ep = LOOKUP_ENDPOINTS[key];
  if (!ep) {
    state.lookupCache[key] = state.lookupCache[key] || [];
    return state.lookupCache[key];
  }
  try {
    const rows = await api(ep);
    state.lookupCache[key] = Array.isArray(rows) ? rows : [];
    if (key === 'firmalar') state.firmalar = state.lookupCache[key];
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
    if (tab.kind === 'bom-tree' || tab.kind === 'bom-workspace'
        || tab.kind === 'rota-flow' || tab.kind === 'rota-workspace') {
      needed.add('stoklar');
      needed.add('stoklar-mamul');
      needed.add('urun-agaclari');
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
    // key=aktif alanı "Pasif" olarak gösterilir: tikli = pasif (aktif false)
    const checked = field.key === 'aktif' ? !v : !!v;
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
    return `<select ${name} ${dis} ${req}>
      ${(field.options || []).map((o) => `<option value="${o}" ${String(v) === String(o) ? 'selected' : ''}>${o || '—'}</option>`).join('')}
    </select>`;
  }
  if (field.type === 'lookup') {
    const scope = ctx || state.formRecord || {};
    const rows = lookupRowsForField(field, scope);
    const dep = field.dependsOn ? ` data-depends-on="${escAttr(field.dependsOn)}"` : '';
    const bom = field.filterByBomKey ? ` data-filter-bom="${escAttr(field.filterByBomKey)}"` : '';
    const sel = `<select class="lookup-select" ${name} ${dis} ${req}${dep}${bom}>${buildLookupOptionsHtml(field, v, rows)}</select>`;
    // Klasik ERP: dar kod select + geniş salt okunur ad
    if (field.codeKey) {
      const ad = lookupNameOnly(field, v) || '—';
      return `<div class="lookup-pair">${sel}<input type="text" class="lookup-name-ro" value="${escAttr(ad)}" readonly tabindex="-1" aria-label="${escAttr(field.label)} adı" /></div>`;
    }
    return sel;
  }
  if (field.type === 'number') {
    return `<input type="number" ${name} value="${escAttr(v)}" ${dis} ${req} />`;
  }
  if (field.type === 'date') {
    const dv = v ? String(v).slice(0, 10) : '';
    return `<input type="date" ${name} value="${escAttr(dv)}" ${dis} ${req} />`;
  }
  return `<input type="text" ${name} value="${escAttr(v)}" ${dis} ${req} />`;
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
    else if (f.key === 'kaynak_katsayi' || (f.key === 'katsayi' && f.type === 'number')) row[f.key] = 1;
    else row[f.key] = '';
  });
  return row;
}

/** Ürün ağacı boş satır — önceki satırın stok/miktar/görünüm alanlarını asla taşıma */
function blankBomRow(fields) {
  return {
    ...emptyRowFromFields(fields),
    bilesen_stok_id: '',
    miktar: '',
    birim: '',
    stok_kodu: '',
    stok_adi: '',
    stok_tipi: '',
    sira_no: '',
    alt_satirlar: [],
  };
}

/** Form kontrolüne tıklanınca satır seçimi / yeniden çizim tetiklenmesin */
function isFormControlClick(target) {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest(
    'select, input, textarea, option, label, button.btn, '
    + '.bom-inline-editor, .rota-op-body, .detail-slot-fields, .detail-table td input, '
    + '.detail-table td select, .lookup-pair, '
    + '[data-flow-editor], [data-bom-editor], [contenteditable="true"]'
  ));
}

/** Boş placeholder satır üretmez — yalnızca gerçek satırlar */
function normalizeGridRows(tab, rows) {
  const fields = tab.fields || [];
  return (Array.isArray(rows) ? rows : []).map((src) => {
    const row = emptyRowFromFields(fields);
    fields.forEach((f) => {
      if (f.type === 'static') return;
      if (f.type === 'checkbox') row[f.key] = Boolean(src?.[f.key]);
      else if (src?.[f.key] !== undefined && src?.[f.key] !== null && src[f.key] !== '') {
        row[f.key] = src[f.key];
      }
    });
    // nested children for rota etc.
    if (Array.isArray(src?.bilesenler)) row.bilesenler = src.bilesenler.map((b) => ({ ...b }));
    if (Array.isArray(src?.alt_satirlar)) row.alt_satirlar = src.alt_satirlar;
    Object.keys(src || {}).forEach((k) => {
      if (k.startsWith('_')) {
        row[k] = src[k];
        return;
      }
      if (row[k] === undefined && !['id'].includes(k)) row[k] = src[k];
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
    state.lookupCache.stoklar,
    state.lookupCache['stoklar-mamul'],
  ];
  for (const rows of pools) {
    if (!Array.isArray(rows)) continue;
    const hit = rows.find((r) => String(r.id) === String(id));
    if (hit) return hit;
  }
  return null;
}

function tipSeviyeLabel(tip) {
  const t = String(tip || '');
  if (/yarı|yari/i.test(t)) return 'Yarı mamul';
  if (/ham/i.test(t)) return 'Hammadde';
  if (/mamul/i.test(t)) return 'Mamul';
  return t || 'Malzeme';
}

function tipBadge(tip) {
  const t = tip || '';
  const cls = /mamul/i.test(t) && !/yarı|yari/i.test(t) ? 'tip-mamul'
    : /yarı|yari/i.test(t) ? 'tip-ym'
      : /ham/i.test(t) ? 'tip-hm' : 'tip-other';
  const label = tipSeviyeLabel(t);
  return `<span class="tip-badge ${cls}">${label === 'Malzeme' ? (t || '—') : label}</span>`;
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
    if (s.ust_satir_id && byId.has(s.ust_satir_id)) {
      byId.get(s.ust_satir_id).alt_satirlar.push(s);
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
    const hasUst = rec.satirlar.some((s) => s.ust_satir_id);
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
  return (nodes || []).map((n) => ({
    bilesen_stok_id: n.bilesen_stok_id || n.stok_id,
    miktar: n.miktar,
    birim: n.birim || null,
    sira_no: n.sira_no,
    alt_satirlar: flattenBomForSave(n.alt_satirlar || []),
  })).filter((n) => n.bilesen_stok_id && n.miktar != null && n.miktar !== '');
}

/** Başlıkta tutulacak alan sayısı — fazlası “Ek bilgiler”e iner (master ≤ ~%25). */
const MASTER_PRIMARY_MAX = 6;

/** Alt şeride inen not / açıklama alanları (master’dan ayrılır). */
function isFooterNoteField(f) {
  const k = String(f?.key || '');
  return /^(aciklama(_\d+)?|not_public|not_internal|acma_kapama|kaynak|onay_durumu|irsaliye_alti_iskonto)$/i.test(k)
    || /^not_/i.test(k);
}

/** Belge satırlarından ara / KDV / genel toplam (çoklu isk + KDV dahil/hariç + ÖTV + tevkifat). */
function computeDocumentTotals(rows, fields) {
  const list = Array.isArray(rows) ? rows : [];
  const keys = new Set((fields || []).map((f) => f.key));
  const hasFiyat = keys.has('birim_fiyat') || list.some((r) => r.birim_fiyat != null && r.birim_fiyat !== '');
  const hasMiktar = keys.has('miktar') || list.some((r) => r.miktar != null && r.miktar !== '');
  if (!hasFiyat || !hasMiktar) {
    return { count: list.length, ara_toplam: null, toplam_kdv: null, genel_toplam: null };
  }
  let ara = 0;
  let kdv = 0;
  let otv = 0;
  let tev = 0;
  let bandrol = 0;
  let iskToplam = 0;
  list.forEach((row) => {
    const miktar = Number(row.miktar) || 0;
    let fiyat = Number(row.birim_fiyat) || 0;
    const isk1 = Number(row.iskonto_oran) || 0;
    const isk2 = Number(row.iskonto_oran2) || 0;
    const isk3 = Number(row.iskonto_oran3) || 0;
    const kdvOran = Number(row.kdv_oran) || 0;
    const otvOran = Number(row.otv_oran) || 0;
    const tevOran = Number(row.tevkifat_oran) || 0;
    const bandOran = Number(row.bandrol_oran) || 0;
    const dahil = String(row.kdv_durumu || 'Haric').toLocaleLowerCase('tr').startsWith('dahil');
    if (dahil && kdvOran > 0) fiyat /= (1 + kdvOran / 100);
    const brut = miktar * fiyat;
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
    ara_toplam: ara,
    toplam_iskonto: iskToplam,
    toplam_otv: otv,
    toplam_kdv: kdv,
    toplam_tevkifat: tev,
    toplam_bandrol: bandrol,
    genel_toplam: ara + otv + kdv - tev + bandrol,
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
  const showMoney = totals.ara_toplam != null;
  if (!notes.length && !showMoney && !gridKey) return '';
  const notesHtml = notes.length
    ? notes.map((f) => fieldShell(f, fieldControl(f, rec?.[f.key], 'data-master', '', rec || {}), rec?.[f.key])).join('')
    : '<div class="md-footer-empty">Belge notu / bağlantı alanı yok</div>';
  const extraRows = [];
  if (showMoney && totals.toplam_iskonto > 0) {
    extraRows.push(`<div class="md-total-row"><label>Toplam iskonto</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.toplam_iskonto))}" /></div>`);
  }
  if (showMoney && totals.toplam_otv > 0) {
    extraRows.push(`<div class="md-total-row"><label>Toplam ÖTV</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.toplam_otv))}" /></div>`);
  }
  if (showMoney && totals.toplam_tevkifat > 0) {
    extraRows.push(`<div class="md-total-row"><label>Tevkifat</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.toplam_tevkifat))}" /></div>`);
  }
  if (showMoney && totals.toplam_bandrol > 0) {
    extraRows.push(`<div class="md-total-row"><label>Bandrol</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.toplam_bandrol))}" /></div>`);
  }
  const altiIsk = Number(rec?.irsaliye_alti_iskonto) || 0;
  if (showMoney && altiIsk > 0) {
    extraRows.push(`<div class="md-total-row"><label>İrs. altı iskonto</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(altiIsk))}" /></div>`);
  }
  const genel = showMoney ? (Number(totals.genel_toplam) || 0) - altiIsk : null;
  const totalsHtml = showMoney
    ? `
      <div class="md-total-row"><label>Mal tutarı</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.ara_toplam))}" /></div>
      ${extraRows.join('')}
      <div class="md-total-row"><label>Toplam KDV</label><input type="text" readonly tabindex="-1" value="${escAttr(formatTotalAmount(totals.toplam_kdv))}" /></div>
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
  if (f.key === 'durum') s += 65;
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
  if (!rec.is_yeri_id && bags.length) {
    const first = bags.find((b) => b.is_yeri_id) || bags[0];
    if (first?.is_yeri_id) rec.is_yeri_id = Number(first.is_yeri_id);
  }
  if (!rec.firma_id && getActiveFirmaId()) {
    rec.firma_id = getActiveFirmaId();
  }
}

function syncStokFirmaIsYeriForSave(master) {
  const firmaId = Number(master.firma_id) || getActiveFirmaId() || null;
  const iyId = Number(master.is_yeri_id) || null;
  if (firmaId) master.firma_id = firmaId;
  if (iyId) {
    master.is_yeri_id = iyId;
    const bags = Array.isArray(master.is_yeri_baglari) ? [...master.is_yeri_baglari] : [];
    const has = bags.some((b) => Number(b.is_yeri_id) === iyId);
    if (!has) bags.unshift({ is_yeri_id: iyId, aktif: true });
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
  if (/miktar|fiyat|tutar|oran|kur/i.test(f?.key || '')) return 'col--m col--num';
  return 'col--m';
}

/** Don’t Make Me Think: detay alanlarını tarama bloklarına ayır (kimlik / adres / …). */
const FIELD_GROUP_DEFS = [
  { id: 'kimlik', title: 'Kimlik', re: /^(cari_|stok_|aday_|firsat_|kontak_|kisi_|seri_|emir_|talep_|siparis_|fatura_|irsaliye_|teklif_|kabul_|parti_|agac_|rota_|hareket_|kod|adi|aciklama|turu|tipi|vergi_|pasaport|uzun_stok|tedarik_tipi|stok_tipi|musteri_tipi|ad$|soyad$|unvan)/i },
  { id: 'organizasyon', title: 'Organizasyon', re: /^(firma_id|is_yeri_id|depo_id|hedef_depo|bolge_|sektor_|nace_|is_merkezi|emir_tipi|asama_|sorumlu_|takip_eden)/i },
  { id: 'adres', title: 'Adres', re: /^(ulke|il$|ilce|sehir|posta_|adres|fatura_adres|sevk_|enlem|boylam)/i },
  { id: 'iletisim', title: 'İletişim', re: /^(telefon|cep_|email|website|fax|yetkili)/i },
  { id: 'finans', title: 'Finans', re: /^(para_birimi|kur$|odeme_|vade|iban|banka_|swift|hesap_|risk_|nakit_|kur_deger|sermaye|genel_toplam|iskonto|kdv_|birim_fiyat|beklenen_gelir|muhasebe_)/i },
  { id: 'olcu', title: 'Ölçü / birim', re: /^(birim|miktar|agirlik|hacim|yogunluk|stok_takip|cevrilecek|olcu)/i },
  { id: 'durum', title: 'Durum', re: /^(durum|aktif|pasif|notlar|not_|oncelik|gecerlilik|kaynak)/i },
];
const FIELD_GROUP_ORDER = FIELD_GROUP_DEFS.map((g) => g.id).concat(['diger']);

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

/** Kısa veri alanları dar; lookup/ad/açıklama geniş — her alanı küçültme */
function inferFieldSizeClass(f) {
  if (f?.size === 'wide' || f?.size === 'short' || f?.size === 'medium') {
    return `field--${f.size}`;
  }
  const k = String(f?.key || '');
  if (f?.name || /aciklama|adres|not_|satir_aciklama/i.test(k)) return 'field--wide';
  if (f?.type === 'lookup' && (f.codeKey || /stok|cari|depo|siparis|talep|irsaliye|firma|is_yeri|mamul|agac|teklif/i.test(k))) {
    return 'field--wide';
  }
  if (
    f?.type === 'checkbox'
    || f?.code
    || f?.type === 'number'
    || /^(miktar|kur|katsayi|sira_no|.*_oran|kdv|iskonto|giren_miktar|kabul_edilen|reddedilen)$/i.test(k)
    || /^(birim|para_birimi|dil_kodu|pb)$/i.test(k)
  ) {
    return 'field--short';
  }
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
  if (isReq) cls.push('required');
  if (f.critical) cls.push('field--critical');
  if (f.type === 'lookup') cls.push('lookup');
  if (f.type === 'password') cls.push('field--password');
  if (f.code) cls.push('field--code');
  if (f.name) cls.push('field--name');
  const empty = value !== undefined ? fieldIsEmptyValue(value) : true;
  // Eksik zorunlu alan: kırmızı *
  const star = (isReq && empty && state.formMode !== 'incele')
    ? '<span class="req-star" title="Doldurulması zorunlu">*</span>'
    : '';
  const hint = f.critical
    ? '<span class="field-critical-hint">zorunlu</span>'
    : '';
  return `<div class="${cls.join(' ')}" data-field-key="${escAttr(f.key)}" title="F1: tablo / alan bilgisi"><label>${star}${f.label}${hint}</label>${controlHtml}</div>`;
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
  if (rec.grup_kodu === 'ADMIN') return true;
  return String(rec.rol || '').toLowerCase() === 'yonetici';
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
    if (!y?.ekran_id) return;
    map[y.ekran_id] = {
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
    const r = y.find((x) => x.ekran_id === s.id);
    return r && r.yeni && r.incele && r.duzelt && r.kopyala && r.sil;
  });
  if (full || y.length === 0) {
    // Boş = tüm mevcut + ileride eklenecek ekranlara tam yetki
    master.yetkiler = [];
  }
  const firms = Array.isArray(state.firmalar) ? state.firmalar : [];
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
  const src = rec.profil_resmi || '';
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
  const firmalar = Array.isArray(state.firmalar) ? state.firmalar : [];
  const rawSel = (rec.firma_yetkileri || []).map((f) => Number(f.firma_id ?? f.id)).filter(Boolean);
  // ADMIN + boş liste = tüm firmalar (kısıt yok) — formda hepsi işaretli
  const selected = new Set(
    (!rawSel.length && isAdminLikeUser(rec))
      ? firmalar.map((f) => Number(f.id))
      : rawSel
  );
  const rows = firmalar.length
    ? firmalar.map((f) => `
      <tr data-firma-yetki="${escAttr(f.id)}">
        <td class="yetki-erisim">
          <input type="checkbox" data-firma-check="1" ${selected.has(Number(f.id)) ? 'checked' : ''} ${dis} />
        </td>
        <td class="yetki-ekran mono">${escapeHtml(f.firma_kodu || '')}</td>
        <td>${escapeHtml(f.firma_adi || '')}</td>
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
      <p class="hint yetki-hint">Kullanıcının işlem yapabileceği firmaları satırdan işaretleyin. ADMIN’de hepsi / boş kayıt = tüm firmalar (kısıt yok).</p>
      <div class="firma-yetki-scroll">
        <table class="yetki-table" id="firmaYetkiTable">
          <thead>
            <tr>
              <th class="yetki-erisim">
                <label class="yetki-th-hepsi" title="Tüm firmalar">
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
  let lastMod = null;
  const body = rows.map((s) => {
    const y = map[s.id] || { erisim: false, yeni: false, incele: false, duzelt: false, kopyala: false, sil: false };
    const hepsi = YETKI_ACTIONS.every((a) => y[a.id]);
    let modRow = '';
    if (s.moduleTitle !== lastMod) {
      lastMod = s.moduleTitle;
      modRow = `<tr class="yetki-mod-row"><td colspan="8">${escapeHtml(s.moduleTitle)}</td></tr>`;
    }
    return `${modRow}
      <tr data-yetki-ekran="${escAttr(s.id)}">
        <td class="yetki-erisim">
          <input type="checkbox" data-yetki="erisim" ${y.erisim ? 'checked' : ''} ${dis} title="Ekran erişimi" />
        </td>
        <td class="yetki-ekran">${escapeHtml(s.title)}</td>
        ${YETKI_ACTIONS.map((a) => `
          <td class="yetki-act">
            <input type="checkbox" data-yetki="${a.id}" ${y[a.id] ? 'checked' : ''} ${dis} ${y.erisim ? '' : 'disabled'} title="${a.label}" />
          </td>`).join('')}
        <td class="yetki-act">
          <input type="checkbox" data-yetki="hepsi" ${hepsi && y.erisim ? 'checked' : ''} ${dis} ${y.erisim ? '' : 'disabled'} title="Hepsi" />
        </td>
      </tr>`;
  }).join('');

  return `
    <section class="yetki-pane" aria-label="Ekran yetkileri">
      <div class="yetki-pane-head">
        <div class="section-label">Yetkiler</div>
        <div class="yetki-pane-actions"${readonly ? ' hidden' : ''}>
          <button type="button" class="btn ghost" id="yetkiSelectAll">Tüm ekranlar</button>
          <button type="button" class="btn ghost" id="yetkiClearAll">Temizle</button>
        </div>
      </div>
      <p class="hint yetki-hint">Sol kutu ekran erişimi; sağda aksiyonlar. ADMIN / Yönetici için tümü işaretli kaydedilirse yetki listesi boş tutulur — yeni eklenen ekranlar da otomatik açılır. Yalnızca İncele işaretliyse o ekranda sadece incele kullanılabilir.</p>
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
    const y = { ekran_id: tr.getAttribute('data-yetki-ekran'), erisim: true };
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
    if (id) out.push({ firma_id: id });
  });
  return out;
}

function bindYetkiGridEvents() {
  const table = $('#yetkiTable');
  if (!table || state.formMode === 'incele') return;

  const syncRow = (tr) => {
    const erisim = tr.querySelector('[data-yetki="erisim"]');
    const acts = YETKI_ACTIONS.map((a) => tr.querySelector(`[data-yetki="${a.id}"]`));
    const hepsi = tr.querySelector('[data-yetki="hepsi"]');
    const on = Boolean(erisim?.checked);
    acts.forEach((el) => { if (el) el.disabled = !on; });
    if (hepsi) hepsi.disabled = !on;
    if (!on) {
      acts.forEach((el) => { if (el) el.checked = false; });
      if (hepsi) hepsi.checked = false;
      return;
    }
    if (hepsi) hepsi.checked = acts.every((el) => el?.checked);
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
        state.formRecord.profil_resmi = data;
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
    state.formRecord.profil_resmi = null;
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
  const { primary, extras, footerNotes } = partitionMasterFields(tab.masterFields || []);
  const dFields = [...(tab.detailFields || [])];
  const bodyFields = [...extras, ...dFields];
  // Az alanlı kart: hepsi başlıkta kalsın, boş gövde gösterme
  const useBody = bodyFields.length > 0;
  const shell = renderClassicShell({
    rec,
    primary: useBody ? primary : [...primary, ...extras],
    extras: [],
    bodyHtml: useBody
      ? `<div class="field-groups">${renderDetailFieldGrid(bodyFields, rec)}</div>`
      : '<div class="detail-empty detail-empty--quiet"></div>',
    footerNotes,
    bodyLabel: 'Ek bilgiler',
    natural: isUserCard || !useBody,
  });
  if (!isUserCard) return shell;
  return `
    <div class="kullanici-form-stack">
      ${shell}
      ${renderKullaniciProfilBlok(rec)}
      ${renderFirmaYetkiPane(rec)}
      ${renderYetkiGrid(rec)}
    </div>`;
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
    bodyLabel: 'Kalemler',
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
    <div class="form-tab-fields form-tab-fields--master form-tab-fields--compact" aria-label="Belge başlığı">
      ${renderFieldGrid(primary, rec || {})}
    </div>`;
}

function renderGridToolbar(tabKey, { canEdit }) {
  if (!canEdit) {
    return `<div class="inline-toolbar"><span class="toolbar-hint">İnceleme — satıra tıklayarak bakın</span></div>`;
  }
  return `<div class="inline-toolbar" data-grid-toolbar="${tabKey}">
    <button type="button" class="btn action" data-grid-act="yeni" data-grid-key="${tabKey}">Yeni</button>
    <button type="button" class="btn action ghost" data-grid-act="sil" data-grid-key="${tabKey}">Sil</button>
    <span class="toolbar-hint">Yeni satır ekler · satırda Kaydet satırı onaylar (belge üstteki Kaydet ile yazılır)</span>
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
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, idx) => {
            const selected = selIdx === idx;
            const saved = row._satir_kayitli === true || row.id != null;
            // Liste satırı: Düzelt ↔ Kaydet aynı yerde (ikisi birden değil)
            const rowEditing = row._satir_duzenleniyor === true || !saved;
            const rowActBtn = rowEditing
              ? `<button type="button" class="btn action ghost sm" data-row-act="kaydet" data-grid-key="${key}" data-grid-idx="${idx}" title="Satırı onayla (belgeyi kaydetmez)">Kaydet</button>`
              : `<button type="button" class="btn action ghost sm" data-row-act="duzelt" data-grid-key="${key}" data-grid-idx="${idx}" title="Satırı düzenle">Düzelt</button>`;
            const rowFieldsEditable = canEdit && rowEditing;
            return `
              <tr class="${selected ? 'selected' : ''} ${saved && !rowEditing ? 'detail-row--saved' : 'detail-row--draft'}"
                  data-grid-row="${key}" data-grid-idx="${idx}" data-grid-pick="${key}">
                ${canEdit ? `
                <td class="col-acts">
                  <div class="detail-row-actions" role="group" aria-label="Satır işlemleri">
                    ${rowActBtn}
                    <button type="button" class="btn action ghost sm" data-row-act="kopyala" data-grid-key="${key}" data-grid-idx="${idx}" title="Satırı kopyala">Kopyala</button>
                  </div>
                </td>` : ''}
                <td class="col-seq">${idx + 1}</td>
                ${fields.map((f) => `<td class="${detailColClass(f)}">${renderDetailCell(f, row, idx, key, rowFieldsEditable)}</td>`).join('')}
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
    const st = stokLookupById(n.bilesen_stok_id);
    crumbs.push(st?.stok_kodu || n.stok_kodu || '…');
    cur = n.alt_satirlar || [];
  }
  return crumbs;
}

/** Salt okunur mini ağaç (rota ekranında ürün ağacı önizleme) */
function renderBomPreviewTree(agacRec, mamulFallback) {
  if (!agacRec) {
    return '<div class="detail-empty">Ürün ağacı seçin — Mamul → Yarı mamul → Hammadde burada görünür.</div>';
  }
  const mamul = stokLookupById(agacRec.mamul_stok_id) || mamulFallback;
  const roots = Array.isArray(agacRec.agac) && agacRec.agac.length
    ? agacRec.agac
    : (Array.isArray(agacRec.satirlar) ? (() => {
      // flat → shallow list if no nested build
      const flat = agacRec.satirlar;
      const byId = new Map(flat.map((s) => [s.id, { ...s, alt_satirlar: [] }]));
      const kok = [];
      flat.forEach((s) => {
        const n = byId.get(s.id);
        if (s.ust_satir_id && byId.has(s.ust_satir_id)) byId.get(s.ust_satir_id).alt_satirlar.push(n);
        else kok.push(n);
      });
      return kok;
    })() : []);

  const walk = (nodes, depth) => (nodes || []).map((n) => {
    const st = stokLookupById(n.bilesen_stok_id) || n;
    const tip = n.stok_tipi || st.stok_tipi || '';
    const qty = n.miktar != null ? n.miktar : '';
    const kids = n.alt_satirlar || [];
    return `
      <div class="bom-preview-node" style="--depth:${depth}">
        <div class="bom-preview-row">
          ${tipBadge(tip)}
          <span class="bom-code mono">${st.stok_kodu || n.stok_kodu || '—'}</span>
          <span class="bom-name">${st.stok_adi || n.stok_adi || ''}</span>
          <span class="bom-qty">${qty}${n.birim ? ` ${n.birim}` : ''}</span>
        </div>
        ${kids.length ? `<div class="bom-preview-kids">${walk(kids, depth + 1)}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="bom-preview">
      <div class="bom-preview-root">
        ${tipBadge(mamul?.stok_tipi || 'Mamul')}
        <span class="bom-code mono">${mamul?.stok_kodu || agacRec.stok_kodu || '—'}</span>
        <span class="bom-name">${mamul?.stok_adi || agacRec.stok_adi || agacRec.agac_adi || ''}</span>
        <span class="bom-preview-tag">${agacRec.agac_kodu || ''}</span>
      </div>
      ${roots.length
    ? walk(roots, 0)
    : '<div class="detail-empty">Bu ağaçta satır yok.</div>'}
    </div>`;
}

function renderBomNode(node, path, depth, tab, canEdit) {
  const stok = stokLookupById(node.bilesen_stok_id);
  const kod = node.stok_kodu || stok?.stok_kodu || '';
  const adi = node.stok_adi || stok?.stok_adi || '';
  const tip = node.stok_tipi || stok?.stok_tipi || '';
  const kids = node.alt_satirlar || [];
  const forceOpen = kids.length > 0 && (
    state.treeExpanded[path] !== false
    || (state.treeSel != null && String(state.treeSel).startsWith(`${path}.`))
  );
  const selected = String(state.treeSel) === path;
  const hasStok = Boolean(node.bilesen_stok_id || kod);
  const qty = (node.miktar !== '' && node.miktar != null) ? node.miktar : '';
  const isYm = /yarı|yari/i.test(tip);

  return `
    <div class="bom-node-wrap" style="--depth:${depth}">
      <div class="bom-node-row ${selected ? 'selected' : ''} ${hasStok ? '' : 'bom-node-empty'}" data-bom-path="${path}">
        <button type="button" class="bom-toggle" data-bom-toggle="${path}" title="Aç/kapa">
          ${kids.length ? (forceOpen ? '▾' : '▸') : '·'}
        </button>
        <button type="button" class="bom-node-main" data-bom-path="${path}">
          ${hasStok ? tipBadge(tip) : `<span class="tip-badge tip-other">${depth === 0 ? 'Yarı / Ham' : 'Malzeme'}</span>`}
          <span class="bom-code mono">${kod || '—'}</span>
          <span class="bom-name">${adi || (hasStok ? '' : 'Malzeme seçin')}</span>
          <span class="bom-qty">${qty}${qty !== '' && node.birim ? ` ${node.birim}` : (node.birim || '')}</span>
          ${kids.length ? `<span class="bom-child-count">${kids.length} alt</span>` : ''}
        </button>
        ${canEdit ? `
          <div class="bom-node-actions">
            ${isYm || !hasStok ? `<button type="button" class="btn tiny ghost" data-bom-act="yeni-alt" data-bom-path="${path}" title="Alt hammadde/yarı ekle">+ Alt</button>` : ''}
            <button type="button" class="btn tiny danger" data-bom-act="sil" data-bom-path="${path}" title="Sil">×</button>
          </div>` : ''}
      </div>
      ${selected && canEdit ? `
        <div class="bom-inline-editor" data-bom-editor>
          <div class="bom-inline-crumb">Yol: Mamul › ${bomPathCrumbs(ensureBomTree(state.formRecord || {}), path).join(' › ') || '…'}</div>
          <div class="form-tab-fields bom-inline-fields">
            ${(tab.fields || []).map((f) => fieldShell(f, fieldControl(f, node[f.key], 'data-bom-field'), node[f.key])).join('')}
          </div>
          <div class="bom-editor-actions">
            <button type="button" class="btn action" data-bom-act="uygula">Satırı uygula</button>
            ${isYm || /yarı|yari/i.test(stok?.stok_tipi || '')
    ? '<button type="button" class="btn action ghost" data-bom-act="yeni-alt" data-bom-path="' + path + '">+ Alt hammadde</button>'
    : '<button type="button" class="btn action ghost" data-bom-act="uygula-ve-yeni">Uygula + kardeş</button>'}
          </div>
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
  const mamul = stokLookupById(rec.mamul_stok_id);
  const headerFields = tab.headerFields || [];

  // Varsayılan: tüm seviyeler açık (mamul → ym → hm görünsün)
  nodes.forEach((_, i) => {
    if (state.treeExpanded[String(i)] === undefined) state.treeExpanded[String(i)] = true;
  });

  return `
    <div class="bom-workspace">
      ${headerFields.length ? `
        <div class="bom-workspace-header">
          <div class="section-label">Mamul (kök)</div>
          <div class="form-tab-fields bom-header-fields">
            ${headerFields.map((f) => fieldShell(f, fieldControl(f, rec[f.key], 'data-master'), rec[f.key])).join('')}
          </div>
          <p class="toolbar-hint">Önce mamul seçin; ağaç <strong>Mamul → Yarı mamul → Hammadde</strong> şeklinde aşağı doğru büyür.</p>
        </div>` : ''}
      <div class="bom-workspace-tree">
        <div class="bom-tree-legend">
          <span>${tipBadge('Mamul')} Mamul</span>
          <span>${tipBadge('YariMamul')} Yarı mamul</span>
          <span>${tipBadge('Hammadde')} Hammadde</span>
        </div>
        <div class="inline-toolbar">
          ${canEdit ? `
            <button type="button" class="btn action" data-bom-act="yeni-kok">+ Kök altına yarı mamul / hammadde</button>
          ` : ''}
        </div>
        <div class="bom-tree" data-bom-tree>
          <div class="bom-root">
            ${tipBadge(mamul?.stok_tipi || 'Mamul')}
            <span class="bom-code mono">${mamul?.stok_kodu || rec.stok_kodu || '—'}</span>
            <span class="bom-name">${mamul?.stok_adi || rec.stok_adi || rec.agac_adi || 'Yukarıdan mamul seçin'}</span>
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

function renderRotaFlow(tab, rec) {
  const ops = normalizeGridRows(
    { fields: tab.fields },
    Array.isArray(rec.operasyonlar) ? rec.operasyonlar : []
  ).map((op) => ({
    ...op,
    bilesenler: Array.isArray(op.bilesenler) ? op.bilesenler : [],
  }));
  ops.sort((a, b) => Number(a.sira_no || 0) - Number(b.sira_no || 0));
  rec.operasyonlar = ops;
  const canEdit = state.formMode !== 'incele';
  const sel = state.flowSel;
  const bomId = rec.urun_agaci_id;
  const bomRec = bomId
    ? (state.lookupCache['urun-agaclari'] || []).find((a) => String(a.id) === String(bomId))
    : null;
  const mamul = stokLookupById(rec.stok_id);
  const headerFields = tab.headerFields || [];

  return `
    <div class="rota-workspace">
      ${headerFields.length ? `
        <div class="bom-workspace-header">
          <div class="section-label">Rota başlığı</div>
          <div class="form-tab-fields bom-header-fields">
            ${headerFields.map((f) => fieldShell(f, fieldControl(f, rec[f.key], 'data-master'), rec[f.key])).join('')}
          </div>
        </div>` : ''}
      <div class="rota-workspace-body">
        <aside class="rota-bom-side">
          <div class="section-label">Ürün ağacı (malzeme kaynağı)</div>
          ${renderBomPreviewTree(bomRec, mamul)}
          <p class="toolbar-hint">Operasyon malzemeleri bu ağaçtan seçilir.</p>
        </aside>
        <div class="rota-flow-main">
          <div class="inline-toolbar">
            ${canEdit ? `
              <button type="button" class="btn action" data-flow-act="yeni-op">+ Operasyon</button>
            ` : ''}
          </div>
          <div class="rota-flow">
            ${ops.length ? ops.map((op, idx) => {
    const open = sel === idx;
    const hasKod = Boolean(op.operasyon_kodu || op.operasyon_adi);
    const cikti = stokLookupById(op.cikti_stok_id);
    return `
              <div class="rota-op-block ${open ? 'selected' : ''} ${hasKod ? '' : 'rota-op-empty'}" data-flow-idx="${idx}">
                <button type="button" class="rota-op-head" data-flow-idx="${idx}">
                  <span class="rota-op-seq">${idx + 1}. adım · Sıra ${op.sira_no || '—'}</span>
                  <span class="rota-op-title"><span class="mono">${op.operasyon_kodu || '—'}</span> ${op.operasyon_adi || (hasKod ? '' : 'Operasyon girin')}</span>
                  <span class="rota-op-comp-count">${(op.bilesenler || []).length} malzeme${cikti ? ` · çıktı ${cikti.stok_kodu}` : ''}</span>
                </button>
                ${open ? `
                  <div class="rota-op-body">
                    <div class="form-tab-fields" data-flow-editor>
                      ${(tab.fields || []).map((f) => fieldShell(f, fieldControl(f, op[f.key], 'data-flow-field'), op[f.key])).join('')}
                    </div>
                    ${canEdit ? `
                      <div class="bom-editor-actions rota-editor-actions">
                        <button type="button" class="btn action" data-flow-act="uygula-op">Operasyonu uygula</button>
                        <button type="button" class="btn action danger" data-flow-act="sil-op">Operasyonu sil</button>
                      </div>` : ''}
                    <div class="section-label">Bu adımın malzemeleri (ağaçtan)</div>
                    <div class="inline-toolbar">
                      ${canEdit && bomId ? `
                        <button type="button" class="btn action" data-flow-act="yeni-comp">+ Malzeme</button>
                      ` : (!bomId ? '<span class="toolbar-hint">Önce ürün ağacı seçin.</span>' : '')}
                    </div>
                    ${(op.bilesenler || []).length ? op.bilesenler.map((b, ci) => {
    const st = stokLookupById(b.stok_id);
    const picked = state.flowCompSel === ci;
    const qty = (b.miktar !== '' && b.miktar != null) ? b.miktar : '';
    return `
                      <div class="detail-slot ${picked ? 'selected' : ''} ${st || b.stok_id ? '' : 'detail-slot-empty'}" data-flow-comp="${ci}">
                        <button type="button" class="detail-slot-pick" data-flow-comp-pick="${ci}">
                          <span class="detail-slot-summary">${st ? `${tipBadge(st.stok_tipi)} ${st.stok_kodu} — ${st.stok_adi}` : (b.stok_id || 'Malzeme seçin')}${qty !== '' ? ` · ${qty}${b.birim ? ` ${b.birim}` : ''}` : ''}</span>
                        </button>
                        ${picked && canEdit ? `
                          <div class="detail-slot-fields">
                            ${(tab.componentFields || []).map((f) => fieldShell(f, fieldControl(f, b[f.key], 'data-flow-comp-field'), b[f.key])).join('')}
                            <div class="bom-editor-actions rota-editor-actions">
                              <button type="button" class="btn action" data-flow-act="uygula-comp">Malzemeyi uygula</button>
                              <button type="button" class="btn action ghost" data-flow-act="uygula-comp-ve-yeni">Uygula + yeni</button>
                              <button type="button" class="btn action danger" data-flow-act="sil-comp">Sil</button>
                            </div>
                          </div>` : ''}
                      </div>`;
  }).join('') : `<div class="detail-empty">${canEdit && bomId ? '«+ Malzeme» ile ağaçtan satır ekleyin.' : 'Malzeme yok.'}</div>`}
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
  if (screen.id !== 'irsaliyeler' || !rec?.id) {
    strip.hidden = true;
    strip.innerHTML = '';
    return;
  }
  strip.hidden = false;
  strip.innerHTML = '<span>Zincir yükleniyor…</span>';
  api(`/irsaliyeler/${rec.id}/zincir`).then((z) => {
    const adimlar = z.adimlar || [];
    strip.innerHTML = adimlar.map((a) => {
      const aktif = a.tip === 'IRSALIYE' && Number(a.id) === Number(rec.id);
      return `<span class="${aktif ? 'aktif' : ''}">${a.tip}: ${a.no || a.id} (${a.durum || '—'})</span>`;
    }).join('') || '<span>Zincir yok</span>';
  }).catch(() => {
    strip.innerHTML = '';
    strip.hidden = true;
  });
}

function renderForm(screen) {
  const readonly = state.formMode === 'incele';
  const rec = state.formRecord || {};
  $('#formModeBadge').textContent = MODE_LABELS[state.formMode] || state.formMode;
  $('#formScreenLabel').textContent = `${screen.title} · ${MODE_LABELS[state.formMode] || ''}`;
  $('#btnFormSave').hidden = readonly;
  const conv = $('#btnFormConvert');
  if (conv) {
    const act = screen.convertAction || screen.approveAction;
    // P39: Taslak irsaliyede fatura dönüşümü gösterme — önce onay
    let show = Boolean(act && rec.id && state.formMode !== 'yeni');
    if (screen.id === 'irsaliyeler' && rec.durum === 'Taslak') {
      show = Boolean(screen.approveAction);
    }
    if (screen.id === 'irsaliyeler' && rec.durum === 'Onayli') {
      // Fatura Oluştur: yalnızca GİB’e gönderildikten sonra aktif
      show = Boolean(screen.convertAction && String(rec.e_belge_durum || '') === 'Gonderildi');
    }
    if (screen.id === 'irsaliyeler' && rec.durum === 'FaturayaDonustu') {
      show = false;
    }
    if (screen.id === 'uretim-emirleri') {
      show = Boolean(screen.approveAction && ['Taslak', 'OnayBekliyor'].includes(rec.durum));
    }
    if (screen.id === 'uretim-planlari') {
      show = Boolean(screen.convertAction && rec.durum === 'Acik' && !rec.uretim_emri_id);
    }
    if (screen.id === 'crm-adaylar') {
      show = Boolean(screen.convertAction && rec.durum !== 'Donusturuldu');
    }
    if (screen.id === 'crm-firsatlar') {
      // Açık fırsatta teklif + kapat (ikincil)
      if (rec.durum === 'Acik' && screen.convertAction) {
        show = true;
      } else {
        show = false;
      }
    }
    const secBtn = $('#btnFormSecondary');
    if (secBtn) {
      let secShow = false;
      let secLabel = '';
      if (screen.id === 'crm-firsatlar' && rec.durum === 'Acik' && screen.approveAction) {
        secShow = true;
        secLabel = screen.approveAction.label;
        secBtn.dataset.secKind = 'approve';
      } else if (screen.id === 'satis-siparisleri' && rec.id && screen.secondaryAction
        && ['Taslak', 'Onayli', 'Kismi'].includes(rec.durum)) {
        secShow = true;
        secLabel = screen.secondaryAction.label;
        secBtn.dataset.secKind = 'secondary';
      } else if (screen.id === 'uretim-emirleri' && rec.id && screen.secondaryAction
        && ['Acik', 'Uretimde'].includes(rec.durum) && !rec.baslatildi) {
        secShow = true;
        secLabel = screen.secondaryAction.label;
        secBtn.dataset.secKind = 'baslat';
      } else if ((screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk')
        && screen.approveAction && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.durum)) {
        // Onay birincil convert'de; reddet ikincil
        secShow = true;
        secLabel = 'Reddet';
        secBtn.dataset.secKind = 'kk-red';
      } else if (screen.id === 'onaylarim' && rec.id && rec.durum_kodu === 'BEKLIYOR') {
        secShow = true;
        secLabel = 'Reddet';
        secBtn.dataset.secKind = 'onay-red';
      }
      secBtn.hidden = !secShow;
      if (secShow) secBtn.textContent = secLabel;
    }
    if (screen.id === 'crm-gorevler') {
      show = Boolean(screen.approveAction && ['Acik', 'Devam'].includes(rec.durum));
    }
    if (screen.id === 'crm-faaliyet-planlari') {
      show = Boolean(screen.convertAction && ['Planlandi', 'Devam'].includes(rec.durum));
    }
    if (screen.id === 'satin-alma-talepleri') {
      show = Boolean(screen.approveAction && rec.durum === 'Acik');
    }
    if (screen.id === 'satin-alma-teklifleri') {
      if (rec.durum === 'Taslak') {
        show = Boolean(screen.approveAction);
      } else if (rec.durum === 'Onayli') {
        show = Boolean(screen.convertAction);
      } else {
        show = false;
      }
    }
    if (screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk') {
      show = Boolean(screen.approveAction && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.durum));
    }
    if (screen.id === 'onaylarim') {
      show = Boolean(screen.approveAction && rec.durum_kodu === 'BEKLIYOR');
    }
    conv.hidden = !show;
    if (show) {
      const preferApprove = (screen.approveAction && (
        (screen.id === 'irsaliyeler' && rec.durum === 'Taslak')
        || (screen.id === 'uretim-emirleri' && ['Taslak', 'OnayBekliyor'].includes(rec.durum))
        || (screen.id === 'crm-gorevler' && ['Acik', 'Devam'].includes(rec.durum))
        || (screen.id === 'satin-alma-talepleri' && rec.durum === 'Acik')
        || (screen.id === 'satin-alma-teklifleri' && rec.durum === 'Taslak')
        || ((screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk')
            && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.durum))
        || (screen.id === 'onaylarim' && rec.durum_kodu === 'BEKLIYOR')
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
    && !rec.baslatildi
    && Number(rec.uretilen_miktar || 0) <= 0
    && !['Kapali', 'Iptal'].includes(rec.durum);
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
    // Adres / Ödeme gibi yan sekmeler: tüm alanlar gövdede (üstte ikinci “Başlık” yok)
    if (!masterLike) {
      const bodyHtml = tabFields.length
        ? `<div class="field-groups">${renderDetailFieldGrid(tabFields, rec)}</div>`
        : '<div class="detail-empty">Bu sekmede alan yok.</div>';
      return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
        ${renderClassicShell({
          rec,
          primary: [],
          extras: [],
          bodyHtml,
          footerNotes: [],
          bodyLabel: tab.label || 'Alanlar',
        })}
      </div>`;
    }
    const { primary, extras, footerNotes } = partitionMasterFields(tabFields);
    const bodyHtml = extras.length
      ? `<div class="field-groups">${renderDetailFieldGrid(extras, rec)}</div>`
      : '<div class="detail-empty">Bu sekmede alan yok.</div>';
    return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
      ${renderClassicShell({
        rec,
        primary,
        extras: [],
        bodyHtml,
        footerNotes,
        bodyLabel: 'Ek bilgiler',
      })}
    </div>`;
  }).join('');

  state.formRecord = rec;
  bindNumeratorFieldListener(screen);
  bindPasswordFieldPersist();
  bindCascadeLookups(screen);
  if (screen.kullaniciYetkiPaneli) {
    bindYetkiGridEvents();
    bindFirmaYetkiEvents();
    bindAvatarEvents();
  }
}

function readFieldValue(el, field) {
  if (!el) return undefined;
  if (field.type === 'checkbox') {
    // Pasif tikli → aktif=false
    if (field.key === 'aktif') return !el.checked;
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

function readMasterFromForm(screen) {
  const out = { ...(state.formRecord || {}) };
  collectTabFields(screen).forEach((f) => {
    const el = document.querySelector(`[data-master="${f.key}"]`);
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
    push(tab.masterFields);
    push(tab.detailFields);
    push(tab.grid?.fields);
    push(tab.componentFields);
  });
  return out;
}

function findFieldDefByKey(screen, key) {
  return collectLookupFieldDefs(screen).find((f) => f.key === key)
    || (TANIM_LOOKUP_BY_KEY[key] ? applyTanimLookup({ key, label: key }) : null);
}

function cascadeScopeContext(el) {
  const didx = el.getAttribute('data-didx');
  const grid = el.getAttribute('data-grid');
  if (didx != null && grid) {
    const ctx = {};
    document.querySelectorAll(`[data-detail][data-didx="${didx}"][data-grid="${grid}"]`).forEach((sib) => {
      const k = sib.getAttribute('data-detail');
      if (!k) return;
      ctx[k] = sib.type === 'checkbox' ? sib.checked : sib.value;
    });
    return { ctx, didx, grid, isDetail: true };
  }
  const ctx = { ...(state.formRecord || {}) };
  document.querySelectorAll('[data-master]').forEach((sib) => {
    const k = sib.getAttribute('data-master');
    if (!k) return;
    ctx[k] = sib.type === 'checkbox' ? sib.checked : sib.value;
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
}

/** Ülke/il / stok→ağaç / ağaç→BOM malzeme bağımlı listeleri yenile */
function refreshDependentLookups(screen, changedEl) {
  const changedKey = changedEl.getAttribute('data-master')
    || changedEl.getAttribute('data-detail');
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
      // Zincir: ülke→il→ilçe / stok→ağaç→malzeme
      if (el.hasAttribute('data-master') || el.hasAttribute('data-detail')) {
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
  // Sarı lookup: panodan kod/ad yapıştırınca eşleşen seçeneği bul
  root.addEventListener('paste', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLSelectElement)) return;
    if (!el.classList.contains('lookup-select') && el.getAttribute('data-master') == null
      && el.getAttribute('data-detail') == null && el.getAttribute('data-bom-field') == null
      && el.getAttribute('data-flow-field') == null && el.getAttribute('data-flow-comp-field') == null) {
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

    // Kod–ad lookup: ad kutusunu güncelle
    if (el instanceof HTMLSelectElement && el.classList.contains('lookup-select')) {
      const pair = el.closest('.lookup-pair');
      const nameRo = pair?.querySelector('.lookup-name-ro');
      if (nameRo) {
        const opt = el.selectedOptions?.[0];
        const title = opt?.getAttribute('title') || opt?.textContent || '';
        const ad = title.includes('—') ? title.split('—').slice(1).join('—').trim() : (title || '—');
        nameRo.value = el.value ? (ad || '—') : '—';
      }
    }

    // BOM sağ panel alanları — birim/miktar otomatik doldurulmaz (kullanıcı girer)
    if (el.hasAttribute('data-bom-field')) {
      return;
    }

    const masterKey = el.getAttribute('data-master');
    const detailKey = el.getAttribute('data-detail');
    const fieldKey = masterKey || detailKey;

    // Barkod → stok eşleştirme (yanlış malzeme engeli)
    if (fieldKey === 'barkod' && el instanceof HTMLInputElement && el.value.trim()) {
      const kod = el.value.trim();
      try {
        const stoklar = state.lookupCache.stoklar || await api('/stoklar?aktif=true');
        state.lookupCache.stoklar = stoklar;
        let hit = null;
        for (const s of stoklar) {
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
          ? document.querySelector(`select[data-detail="stok_id"][data-didx="${el.getAttribute('data-didx')}"][data-grid="${el.getAttribute('data-grid')}"]`)
          : document.querySelector('select[data-master="stok_id"]');
        if (stokEl) {
          const current = stokEl.value;
          if (current && String(current) !== String(hit.id)) {
            toast('Barkod başka bir stokla eşleşiyor — yanlış malzeme engellendi.');
            el.value = '';
            return;
          }
          stokEl.value = String(hit.id);
          stokEl.dispatchEvent(new Event('change', { bubbles: true }));
          toast(`Barkod → ${hit.stok_kodu}`);
        }
      } catch (err) {
        toast(err.message || 'Barkod çözülemedi');
      }
      return;
    }

    if (!(el instanceof HTMLSelectElement) && !(el instanceof HTMLInputElement && fieldKey === 'dil_kodu')) {
      if (!(el instanceof HTMLSelectElement)) return;
    }
    if (!el.hasAttribute('data-master') && !el.hasAttribute('data-detail')) return;

    if (masterKey && state.formRecord) {
      const f = collectTabFields(scr).find((x) => x.key === masterKey)
        || (scr.masterFields || []).find((x) => x.key === masterKey);
      state.formRecord[masterKey] = f ? readFieldValue(el, f) : el.value;
    }
    refreshDependentLookups(scr, el);

    // Dil kodu → dil adı
    if (fieldKey === 'dil_kodu') {
      const kod = String(el.value || '').toUpperCase();
      let adi = DIL_AD_MAP[kod];
      const dilRows = state.lookupCache.diller || [];
      const hit = dilRows.find((d) => String(d.dil_kodu).toUpperCase() === kod);
      if (hit?.dil_adi) adi = hit.dil_adi;
      if (adi) {
        if (masterKey) {
          const nameEl = document.querySelector('[data-master="dil_adi"]');
          if (nameEl) nameEl.value = adi;
          if (state.formRecord) state.formRecord.dil_adi = adi;
        } else if (detailKey) {
          const didx = el.getAttribute('data-didx');
          const grid = el.getAttribute('data-grid');
          const nameEl = document.querySelector(
            `[data-detail="dil_adi"][data-didx="${didx}"][data-grid="${grid}"]`
          );
          if (nameEl) nameEl.value = adi;
        }
      }
    }

    // Para birimi → kur
    if (fieldKey === 'para_birimi') {
      const pb = el.value;
      if (masterKey) {
        const kurEl = document.querySelector('[data-master="kur"]');
        await applyKurForParaBirimi(pb, kurEl, { force: true });
        if (state.formRecord && kurEl) state.formRecord.kur = Number(kurEl.value) || 1;
      } else if (detailKey) {
        const didx = el.getAttribute('data-didx');
        const grid = el.getAttribute('data-grid');
        const kurEl = document.querySelector(
          `[data-detail="kur"][data-didx="${didx}"][data-grid="${grid}"]`
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
        toast('Cari adres / ödeme bilgileri forma aktarıldı');
        return;
      }
    }

    // Ürün ağacı / rota: mamul veya ağaç değişince tek ekranı yenile (kök + önizleme)
    if (masterKey && ['mamul_stok_id', 'stok_id', 'urun_agaci_id'].includes(masterKey)
        && (scr.id === 'urun-agaci' || scr.id === 'rotalar')) {
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(scr) };
      if (masterKey === 'mamul_stok_id' || masterKey === 'stok_id') {
        const st = stokLookupById(state.formRecord[masterKey]);
        if (st && scr.id === 'urun-agaci' && !String(state.formRecord.agac_adi || '').trim()) {
          state.formRecord.agac_adi = `${st.stok_adi} Ağacı`;
        }
      }
      renderForm(scr);
    }
  });
}

function syncGridRowFromDom(tab, idx, baseRow = {}) {
  const row = { ...baseRow };
  let any = false;
  const missing = [];
  (tab.fields || []).forEach((f) => {
    if (f.type === 'static') return;
    const el = document.querySelector(`[data-detail="${f.key}"][data-didx="${idx}"][data-grid="${tab.key}"]`);
    if (!el) return;
    row[f.key] = readFieldValue(el, f);
    if (f.type === 'checkbox') { if (el.checked) any = true; }
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
      if (k === 'katsayi' || k === 'kaynak_katsayi') return false;
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
    const el = document.querySelector(`[data-bom-field="${f.key}"]`);
    if (!el) return;
    node[f.key] = readFieldValue(el, f);
  });
  const st = stokLookupById(node.bilesen_stok_id);
  if (st) {
    node.stok_kodu = st.stok_kodu;
    node.stok_adi = st.stok_adi;
    node.stok_tipi = st.stok_tipi;
  }
  if (!Array.isArray(node.alt_satirlar)) node.alt_satirlar = [];
  return node;
}

function findBomTab(screen) {
  return (screen.formTabs || []).find((t) => t.kind === 'bom-tree' || t.kind === 'bom-workspace');
}
function findRotaTab(screen) {
  return (screen.formTabs || []).find((t) => t.kind === 'rota-flow' || t.kind === 'rota-workspace');
}

/** Satır içi editör → ağaç: malzeme + miktar zorunlu */
function applyBomEditorSelection(screen, { addAnother = false } = {}) {
  const tab = findBomTab(screen);
  if (!tab) return false;
  if (state.treeSel == null) {
    toast('Önce bir satır seçin veya «+ Kök altına…» ekleyin.');
    return false;
  }
  const master = readMasterFromForm(screen);
  state.formRecord = { ...(state.formRecord || {}), ...master };
  // agac eski kopyayı ezmesin — satırları tek kaynak yap
  if (Array.isArray(state.formRecord.satirlar)) {
    state.formRecord.agac = state.formRecord.satirlar;
  }
  const node = persistBomEditor(state.formRecord, tab);
  if (!node) {
    toast('Bileşen satırı bulunamadı.');
    return false;
  }
  const nodes = state.formRecord.satirlar;
  const stokId = node.bilesen_stok_id;
  const miktar = Number(node.miktar);
  if (!stokId) {
    toast('Bileşen stok seçin.');
    return false;
  }
  if (!Number.isFinite(miktar) || miktar <= 0) {
    toast('Miktar 0’dan büyük olmalı.');
    return false;
  }
  const st = stokLookupById(stokId);
  if (st) {
    node.stok_kodu = st.stok_kodu;
    node.stok_adi = st.stok_adi;
    node.stok_tipi = st.stok_tipi;
    // birim kullanıcı boş bıraktıysa doldurma — bilinçli boş kalabilir
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
    toast(`${st?.stok_kodu || 'Bileşen'} ağaca eklendi — yeni satır hazır.`);
  } else {
    toast(`${st?.stok_kodu || 'Bileşen'} ağaca kaydedildi.`);
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
    const el = document.querySelector(`[data-flow-field="${f.key}"]`);
    if (!el) return;
    op[f.key] = readFieldValue(el, f);
  });
  if (state.flowCompSel != null && op.bilesenler?.[state.flowCompSel]) {
    const b = op.bilesenler[state.flowCompSel];
    (tab.componentFields || []).forEach((f) => {
      const el = document.querySelector(`[data-flow-comp-field="${f.key}"]`);
      if (!el) return;
      b[f.key] = readFieldValue(el, f);
    });
  }
  // auto-link sonraki_sira_no if empty: next op in list
  ops.sort((a, b) => Number(a.sira_no || 0) - Number(b.sira_no || 0));
  for (let i = 0; i < ops.length; i += 1) {
    if (ops[i].sonraki_sira_no == null || ops[i].sonraki_sira_no === '') {
      ops[i].sonraki_sira_no = ops[i + 1] ? Number(ops[i + 1].sira_no) : null;
    }
  }
  rec.operasyonlar = ops;
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
  if (!op.operasyon_kodu && !op.operasyon_adi) {
    toast('Operasyon kodu veya adı girin.');
    return false;
  }
  toast(`${op.operasyon_kodu || 'Operasyon'} kaydedildi.`);
  renderForm(screen);
  persistActiveFormTab();
  return true;
}

/** Sağ panel → bileşen: stok + miktar zorunlu (ürün ağacı kapsamı) */
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
  if (!state.formRecord.urun_agaci_id) {
    toast('Bileşen için önce Başlık sekmesinde ürün ağacı seçin.');
    return false;
  }
  persistFlowEditor(state.formRecord, tab);
  const op = state.formRecord.operasyonlar?.[state.flowSel];
  const b = op?.bilesenler?.[state.flowCompSel];
  if (!b) {
    toast('Bileşen satırı bulunamadı.');
    return false;
  }
  const stokId = b.stok_id;
  const miktar = Number(b.miktar);
  if (!stokId) {
    toast('Bileşen stok seçin (ürün ağacı malzemeleri).');
    return false;
  }
  if (!Number.isFinite(miktar) || miktar <= 0) {
    toast('Miktar 0’dan büyük olmalı.');
    return false;
  }
  const st = stokLookupById(stokId);
  if (st) {
    b.stok_kodu = st.stok_kodu;
    b.stok_adi = st.stok_adi;
    b.stok_tipi = st.stok_tipi;
  }

  if (addAnother) {
    const blank = emptyRowFromFields(tab.componentFields);
    op.bilesenler.push(blank);
    state.flowCompSel = op.bilesenler.length - 1;
    toast(`${st?.stok_kodu || 'Bileşen'} eklendi — yeni satır hazır.`);
  } else {
    toast(`${st?.stok_kodu || 'Bileşen'} kaydedildi.`);
  }
  renderForm(screen);
  persistActiveFormTab();
  return true;
}

/** Başlıktan düşürülen PB/kur/depo gibi alanları ilk kalemden geri doldur (API bekler). */
function backfillHeaderFromLines(out, screen) {
  const lineKeys = ['para_birimi', 'kur', 'kur_tipi', 'depo_id', 'proje_kodu', 'bolge', 'teslim_tarihi', 'sevk_tarihi', 'iskonto_oran', 'fiyat_liste_id', 'gecerlilik_tarihi'];
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
        bilesenler: (op.bilesenler || []).filter((b) => b.stok_id && b.miktar != null && b.miktar !== ''),
      }));
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
        // aktif varsayılan true → Pasif kutusu boş
        record[f.key] = f.key === 'pasif' ? false : true;
      } else if (f.type === 'select') record[f.key] = f.options?.[0] || '';
      else if (f.key === 'firma_id' && getActiveFirmaId()) record[f.key] = getActiveFirmaId();
      else if (f.key === 'is_yeri_id' && state.activeIsYeriId) record[f.key] = state.activeIsYeriId;
      else if (record[f.key] === undefined) record[f.key] = '';
    });
  };

  function initSpecialTabs(src) {
    (screen.formTabs || []).forEach((tab) => {
      if (tab.kind === 'grid') {
        const raw = Array.isArray(src[tab.key]) ? src[tab.key] : [];
        record[tab.key] = normalizeGridRows(tab, raw.map(({ id, ...rest }) => rest));
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
        record[gkey] = normalizeGridRows(gtab, raw.map(({ id, ...rest }) => rest));
      }
      if (tab.kind === 'bom-tree' || tab.kind === 'bom-workspace') {
        record.satirlar = Array.isArray(src.agac) && src.agac.length
          ? src.agac
          : (Array.isArray(src.satirlar) ? src.satirlar : []);
        ensureBomTree(record);
      }
      if (tab.kind === 'rota-flow' || tab.kind === 'rota-workspace') {
        record.operasyonlar = Array.isArray(src.operasyonlar)
          ? src.operasyonlar.map((op) => ({
            ...op,
            bilesenler: Array.isArray(op.bilesenler) ? op.bilesenler.map(({ id, ...b }) => b) : [],
          }))
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
        siparis_id: adayPrefill.siparis_id,
        stok_id: adayPrefill.stok_id,
        urun_agaci_id: adayPrefill.onerilen_agac_id || '',
        rota_id: adayPrefill.onerilen_rota_id || '',
        planlanan_miktar: adayPrefill.kalan_miktar || adayPrefill.siparis_miktar || '',
      });
    }
    if (adayPrefill && screen.id === 'toplu-is-emri') {
      record.kalemler = [{
        siparis_id: adayPrefill.siparis_id,
        stok_id: adayPrefill.stok_id,
        urun_agaci_id: adayPrefill.onerilen_agac_id || '',
        rota_id: adayPrefill.onerilen_rota_id || '',
        planlanan_miktar: adayPrefill.kalan_miktar || adayPrefill.siparis_miktar || '',
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
    record.aktif = true;
    if (mode === 'yeni') record.seri_kodu = '';
  }

  if (screen.id === 'stok-karti') {
    hydrateStokFirmaIsYeri(record);
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

async function saveForm() {
  const screen = findScreen(state.screenId);
  if (!screen || state.formMode === 'incele') return;

  const master = readTabbedPayload(screen);

  // Stok kartı: master’daki firma / iş yeri zorunlu bağ
  if (screen.id === 'stok-karti') {
    syncStokFirmaIsYeriForSave(master);
  }

  // Kullanıcı kartı: giriş adı + şifre + yetki + profil
  if (screen.id === 'kullanicilar') {
    const adi = String(master.kullanici_adi || '').trim();
    if (adi && !master.kullanici_kodu) master.kullanici_kodu = adi;
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
    compressYetkilerForSave(master);
    if (state.formRecord && Object.prototype.hasOwnProperty.call(state.formRecord, 'profil_resmi')) {
      master.profil_resmi = state.formRecord.profil_resmi;
    }
  }

  const reqErr = validateRequired(screen, master);
  if (reqErr) {
    toast(reqErr);
    return;
  }

  // Bağlı ekrandan kayıt → kaynak dönüşüm API'si
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
          if (s.siparis_detay_id) body.miktarlar[s.siparis_detay_id] = s.miktar;
        });
      }
      const sonuc = await api(path, { method: 'POST', body: JSON.stringify(body) });
      toast('Bağlı belge oluşturuldu.');
      invalidateLookups();
      state.nestedLink = null;
      const formKey = state.activeTabKey;
      state.formMode = null;
      state.formRecord = null;
      state.openTabs = state.openTabs.filter((t) => t.key !== formKey);
      const nextScreen = (sonuc?.siparis_id && screen.id === 'satis-siparisleri') ? 'satis-siparisleri'
        : (sonuc?.siparis_no && screen.id === 'satin-alma-siparisleri') ? 'satin-alma-siparisleri'
        : (sonuc?.sevk_no || (sonuc?.id && screen.id === 'sevk-emirleri')) ? 'sevk-emirleri'
        : (sonuc?.irsaliye_no || sonuc?.ettn) ? 'irsaliyeler'
        : (sonuc?.fatura?.id) ? 'satis-faturalari'
        : (sonuc?.fatura_turu === 'Alis' || (sonuc?.mal_kabul_id && sonuc?.fatura_no)) ? 'alis-faturalari'
        : (sonuc?.fatura_no && screen.id === 'alis-faturalari') ? 'alis-faturalari'
        : (sonuc?.teklif_id || sonuc?.teklif_no) ? 'satis-teklifleri'
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
  if (screen.id === 'rotalar') {
    master.operasyonlar = (master.operasyonlar || []).filter((o) => o.operasyon_kodu || o.operasyon_adi);
    if (!master.operasyonlar.length) {
      toast('En az bir operasyon ekleyin.');
      return;
    }
  }

  try {
    if (screen.id === 'numarator-tanimi') {
      if (state.formMode === 'duzelt') {
        await api(`/kod-serileri/${encodeURIComponent(master.seri_kodu)}`, {
          method: 'PUT',
          body: JSON.stringify(master),
        });
      } else {
        await api('/kod-serileri', { method: 'POST', body: JSON.stringify(master) });
      }
    } else if (state.formMode === 'duzelt') {
      await api(`${screenApiBase(screen.endpoint)}/${master.id}`, { method: 'PUT', body: JSON.stringify(master) });
    } else {
      const postUrl = screen.createEndpoint || screenApiBase(screen.endpoint);
      let body = master;
      if (screen.id === 'toplu-is-emri') {
        body = {
          ortak: {
            emir_tipi_id: master.emir_tipi_id || null,
            is_yeri_id: master.is_yeri_id || null,
            hammadde_depo_id: master.hammadde_depo_id,
            mamul_depo_id: master.mamul_depo_id,
            yari_mamul_depo_id: master.yari_mamul_depo_id || null,
          },
          kalemler: (master.kalemler || []).filter((k) => k.stok_id && k.siparis_id),
        };
        if (!body.kalemler.length) {
          toast('En az bir kalem ekleyin.');
          return;
        }
      }
      const sonuc = await api(postUrl, { method: 'POST', body: JSON.stringify(body) });
      invalidateLookupsForScreen(screen);
      if (screen.id === 'toplu-is-emri' && sonuc?.olusturulan_sayisi) {
        toast(`${sonuc.olusturulan_sayisi} iş emri oluşturuldu${sonuc.hata_sayisi ? ` (${sonuc.hata_sayisi} hata)` : ''}.`);
      } else if (screen.id === 'siparis-is-emri' && sonuc?.emir_no) {
        toast(`İş emri ${sonuc.emir_no} oluşturuldu.`);
      } else {
        toast('Kaydedildi.');
      }
      const formKey = state.activeTabKey;
      state.formMode = null;
      state.formRecord = null;
      state.openTabs = state.openTabs.filter((t) => t.key !== formKey);
      if (leaveFormSolo(screen.id === 'siparis-is-emri' || screen.id === 'toplu-is-emri' ? 'uretim-emirleri' : screen.id)) {
        return;
      }
      if (screen.id === 'siparis-is-emri' || screen.id === 'toplu-is-emri') {
        await openScreen('uretim-emirleri');
      } else {
        await openScreen(screen.id);
      }
      return;
    }
    toast('Kaydedildi.');
    invalidateLookupsForScreen(screen);
    const formKey = state.activeTabKey;
    state.formMode = null;
    state.formRecord = null;
    state.openTabs = state.openTabs.filter((t) => t.key !== formKey);
    if (leaveFormSolo(screen.id)) return;
    await openScreen(screen.id);
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
        <dt>Oluşturan</dt><dd>${escapeHtml(info.olusturan || '—')}</dd>
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
      tablo_adi: auditTablo ? { op: 'esit', a: String(auditTablo), b: '' } : { op: 'icerir', a: '', b: '' },
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
    // Patlatma: miktar sunucuda çarpılır — filtreyle API’yi yeniden çağır
    if (screen.id === 'bom-patlatma') {
      try {
        $('#listMeta').textContent = 'Patlatılıyor…';
        const qs = new URLSearchParams();
        const st = state.filterState || {};
        const pick = (k) => String(st[k]?.a || '').trim();
        if (pick('agac_id')) qs.set('agac_id', pick('agac_id'));
        if (pick('mamul_stok_id')) qs.set('mamul_stok_id', pick('mamul_stok_id'));
        if (pick('agac_kodu')) qs.set('agac_kodu', pick('agac_kodu'));
        const miktar = pick('miktar');
        if (miktar) qs.set('miktar', miktar);
        const data = await api(`${screen.endpoint}?${qs.toString()}`);
        state.rows = ensureRowIds(Array.isArray(data) ? data : []);
        // Sunucu filtreleri satır alanı değil — yalnız bileşen stok kodu client süzülür
        const stokQ = pick('stok_kodu').toLocaleLowerCase('tr');
        state.filtered = stokQ
          ? state.rows.filter((r) => String(r.stok_kodu || '').toLocaleLowerCase('tr').includes(stokQ))
          : state.rows.slice();
        state.selectedId = null;
        renderList(screen);
        const banner = $('#screenBanner');
        if (banner) {
          banner.textContent = `${screen.title} — ${state.filtered.length} satır patlatıldı`
            + (miktar ? ` (mamul × ${miktar})` : '');
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

  $('#btnFormSave').addEventListener('click', () => {
    saveForm();
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
    if (sel?.stok_id) body.stok_idler = [sel.stok_id];
    if (screen?.mrpSonucMode && state.mrpCalismaId) body.calisma_id = state.mrpCalismaId;
    if (getActiveFirmaId()) body.firma_id = getActiveFirmaId();
    if (state.activeIsYeriId) body.is_yeri_id = state.activeIsYeriId;
    const sonuc = await api('/mrp/talep-olustur', { method: 'POST', body: JSON.stringify(body) });
    toast(`SA talep oluştu: ${sonuc.talep_no || sonuc.id}`);
    openScreen('satin-alma-talepleri');
  }

  async function mrpUretimOlustur() {
    const screen = findScreen(state.screenId);
    const sel = selectedRow();
    const body = {};
    if (sel?.stok_id) body.stok_idler = [sel.stok_id];
    if (screen?.mrpSonucMode && state.mrpCalismaId) body.calisma_id = state.mrpCalismaId;
    if (getActiveFirmaId()) body.firma_id = getActiveFirmaId();
    if (state.activeIsYeriId) body.is_yeri_id = state.activeIsYeriId;
    const sonuc = await api('/mrp/uretim-emri-olustur', { method: 'POST', body: JSON.stringify(body) });
    toast(`${sonuc.olusan || 0} üretim emri oluştu`);
    openScreen('uretim-emirleri');
  }

  async function mrpCalistirKaydet() {
    const body = {
      aciklama: 'UI MRP çalışması',
      firma_id: getActiveFirmaId() || null,
      is_yeri_id: state.activeIsYeriId || null,
    };
    const sonuc = await api('/mrp/calistir', { method: 'POST', body: JSON.stringify(body) });
    state.mrpCalismaId = sonuc.calisma?.id || null;
    toast(`MRP tamam: ${sonuc.calisma?.calisma_no || ''} · net>0: ${sonuc.calisma?.net_pozitif ?? '?'}`);
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
          const sonuc = await api(path, { method: 'POST', body: JSON.stringify(bodyExtra || {}) });
          toast(screen.approveAction.label + ' tamam.');
          state.formRecord = sonuc;
          renderForm(screen);
        } else if (kind === 'kk-red') {
          const path = `/kk-emirleri/${rec.id}/reddet`;
          const sonuc = await api(path, { method: 'POST', body: JSON.stringify({}) });
          toast('Reddedildi.');
          state.formRecord = sonuc;
          renderForm(screen);
        } else if (kind === 'onay-red') {
          const gerekce = window.prompt('Red gerekçesi (opsiyonel):', '') ?? null;
          if (gerekce === null) return;
          const path = `/onay-kayitlari/${rec.id}/reddet`;
          const sonuc = await api(path, { method: 'POST', body: JSON.stringify({ notlar: gerekce }) });
          toast('Onay reddedildi.');
          state.formRecord = sonuc;
          renderForm(screen);
        } else if (kind === 'secondary' && screen.secondaryAction?.openScreen) {
          openScreen(screen.secondaryAction.openScreen);
        } else if (kind === 'baslat' && screen.secondaryAction?.path) {
          const path = screen.secondaryAction.path.replace('{id}', rec.id);
          const sonuc = await api(path, { method: 'POST', body: JSON.stringify({}) });
          toast(screen.secondaryAction.label + ' tamam.');
          state.formRecord = sonuc;
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
        const sonuc = await api(path, { method: 'POST', body: JSON.stringify({}) });
        const nMal = sonuc._doldurulan?.malzeme ?? (sonuc.malzemeler || []).length;
        const nOp = sonuc._doldurulan?.operasyon ?? (sonuc.operasyonlar || []).length;
        toast(`${screen.detailFillAction.label}: ${nMal} malzeme, ${nOp} operasyon.`);
        state.formRecord = sonuc;
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
      const urunAgaciId = master.urun_agaci_id ?? rec.urun_agaci_id;
      const rotaId = master.rota_id ?? rec.rota_id;
      if (!urunAgaciId && !rotaId) {
        toast('Ürün ağacı veya rota seçin.');
        return;
      }
      if (!window.confirm('Formdaki ürün ağacı / rota emre uygulanacak; malzemeler ve operasyonlar yenilenecek. Devam?')) return;
      try {
        const path = screen.bomRotaChangeAction.path.replace('{id}', rec.id);
        const sonuc = await api(path, {
          method: 'POST',
          body: JSON.stringify({
            urun_agaci_id: urunAgaciId || undefined,
            rota_id: rotaId || undefined,
            detaylari_doldur: true,
          }),
        });
        toast(screen.bomRotaChangeAction.label + ' tamam.');
        state.formRecord = sonuc;
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
        const sonuc = await api(path, { method: 'POST', body: JSON.stringify(body) });
        invalidateLookups();
        if (sonuc?.stok_uyari?.length) {
          toast('Uyarı: bazı kalemlerde depo bakiyesi yetersiz olabilir.');
        }
        if (kind === 'approve') {
          toast(act.label + ' tamam.');
          state.formRecord = sonuc;
          renderForm(screen);
        } else if (act.openTarget?.screenId && sonuc?.fatura?.id) {
          toast(sonuc.mesaj || 'Fatura ekranına yönlendiriliyorsunuz');
          await openRecordById(act.openTarget.screenId, sonuc.fatura.id, act.openTarget.mode || 'duzelt');
        } else if (sonuc?.siparis_id) {
          toast(act.label + ' tamam.');
          openScreen('satis-siparisleri');
        } else if (sonuc?.sevk_no) {
          toast(act.label + ' tamam.');
          openScreen('sevk-emirleri');
        } else if (sonuc?.irsaliye_no || sonuc?.ettn) {
          toast(act.label + ' tamam.');
          openScreen('irsaliyeler');
        } else if (sonuc?.fatura?.id) {
          toast(sonuc.mesaj || 'Fatura ekranına yönlendiriliyorsunuz');
          await openRecordById('satis-faturalari', sonuc.fatura.id, 'duzelt');
        } else if (sonuc?.teklif_id || sonuc?.teklif_no) {
          toast(act.label + ' tamam.');
          openScreen('satis-teklifleri');
        } else if (sonuc?.cari?.id || sonuc?.aday) {
          toast(act.label + ' tamam.');
          openScreen('cari-kartlari');
        } else if (sonuc?.faaliyet?.id || (screen.id === 'crm-faaliyet-planlari' && sonuc?.ok)) {
          toast(act.label + ' tamam.');
          openScreen('crm-faaliyetler');
        } else if (sonuc?.siparis_no && screen.id === 'satin-alma-teklifleri') {
          toast(act.label + ' tamam.');
          openScreen('satin-alma-siparisleri');
        } else if (sonuc?.fatura_turu === 'Alis' || (sonuc?.mal_kabul_id && sonuc?.fatura_no)) {
          toast(act.label + ' tamam.');
          openScreen('alis-faturalari');
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
            const onr = (s.onerilen_depolar || []).map((o) => o.depo_kodu).join(',') || '—';
            return `${s.stok_kodu || s.stok_id}: bakiye ${s.bakiye} / ${s.miktar} → öneri ${onr}`;
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

    // Satır düzeyinde Kaydet / Düzelt / Kopyala
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
      if (state.gridSel.key === key && state.gridSel.idx != null && rows[state.gridSel.idx]) {
        const { row } = syncGridRowFromDom(tab, state.gridSel.idx, rows[state.gridSel.idx]);
        rows[state.gridSel.idx] = row;
      }
      if (act === 'duzelt') {
        // Düzelt → aynı yerde Kaydet; diğer satırlar kilitli kalsın
        rows.forEach((r, i) => {
          if (!r) return;
          r._satir_duzenleniyor = i === idx;
        });
        state.formRecord[key] = rows;
        state.gridSel = { key, idx };
        renderForm(screen);
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
        // Onaydan sonra buton tekrar Düzelt olur.
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
      // Mevcut editörü önce ESKİ treeSel’e yaz; data-bom-path ile hedefi sonra seç
      const actPath = bomAct.getAttribute('data-bom-path');
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      const nodes = ensureBomTree(state.formRecord);
      const blank = blankBomRow(tab.fields);
      if (act === 'yeni-kok') {
        if (!state.formRecord.mamul_stok_id) {
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
        if (!parent.bilesen_stok_id) {
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
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      const ops = Array.isArray(state.formRecord.operasyonlar) ? [...state.formRecord.operasyonlar] : [];
      if (act === 'yeni-op') {
        const nextSira = ops.reduce((m, o) => Math.max(m, Number(o.sira_no) || 0), 0) + 10;
        ops.push({
          ...emptyRowFromFields(tab.fields),
          sira_no: nextSira,
          operasyon_kodu: `OP${nextSira}`,
          bilesenler: [],
        });
        // önceki son ops'un sonraki_sira_no bağla
        if (ops.length >= 2) {
          ops[ops.length - 2].sonraki_sira_no = nextSira;
        }
        state.formRecord.operasyonlar = ops;
        state.flowSel = ops.length - 1;
        state.flowCompSel = null;
      } else if (act === 'sil-op') {
        if (state.flowSel == null) { toast('Operasyon seçin.'); return; }
        ops.splice(state.flowSel, 1);
        state.formRecord.operasyonlar = ops;
        state.flowSel = null;
        state.flowCompSel = null;
      } else if (act === 'yeni-comp') {
        if (state.flowSel == null) { toast('Önce operasyon seçin.'); return; }
        if (!state.formRecord.urun_agaci_id) {
          toast('Malzeme eklemek için önce ürün ağacı seçin (solda görünür).');
          return;
        }
        const op = ops[state.flowSel];
        if (!op.bilesenler) op.bilesenler = [];
        // Seçili satırdaki sağ panel değişikliklerini kaybetme
        persistFlowEditor(state.formRecord, tab);
        op.bilesenler.push(emptyRowFromFields(tab.componentFields));
        state.flowCompSel = op.bilesenler.length - 1;
        state.formRecord.operasyonlar = ops;
      } else if (act === 'sil-comp') {
        if (state.flowSel == null || state.flowCompSel == null) {
          toast('Bileşen seçin.');
          return;
        }
        ops[state.flowSel].bilesenler.splice(state.flowCompSel, 1);
        state.flowCompSel = null;
        state.formRecord.operasyonlar = ops;
      }
      // Yeni op/malzeme: önce çiz (eski DOM değerleri boş satıra yazılmasın)
      renderForm(screen);
      persistActiveFormTab();
      return;
    }
    // Yalnızca başlık satırından seç — gövdedeki sarı lookup tıklanınca renderForm olmasın
    const flowHead = e.target.closest('.rota-op-head[data-flow-idx]');
    if (flowHead && screen && !e.target.closest('[data-flow-act]') && !isFormControlClick(e.target)) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      state.flowSel = Number(flowHead.getAttribute('data-flow-idx'));
      state.flowCompSel = null;
      renderForm(screen);
      persistActiveFormTab();
      return;
    }
    const flowCompPick = e.target.closest('[data-flow-comp-pick]');
    if (flowCompPick && screen && !isFormControlClick(e.target)) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      state.flowCompSel = Number(flowCompPick.getAttribute('data-flow-comp-pick'));
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
          body: JSON.stringify({ kullanici_kodu: kod }),
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
