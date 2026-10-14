const OPERATORS = [
  { id: 'esit', label: 'Eşit' },
  { id: 'esit_degil', label: 'Eşit değil' },
  { id: 'arasinda', label: 'Arasında' },
];

const MODULES = [
  {
    id: 'sistem',
    title: 'Sistem',
    screens: [
      {
        id: 'numarator-tanimi',
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
          { key: 'seri_kodu', label: 'Seri kodu', code: true, editableOnNew: true },
          { key: 'onek', label: 'Önek' },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'ekran_kodu', label: 'Ekran kodu' },
          { key: 'ekran_adi', label: 'Ekran adı' },
          { key: 'son_numara', label: 'Son numara', type: 'number' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
      },
    ],
  },
  {
    id: 'ana-veri',
    title: 'Ana Veri',
    screens: [
      {
        id: 'firmalar',
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
          { key: 'firma_kodu', label: 'Firma kodu', code: true },
          { key: 'firma_adi', label: 'Firma adı', name: true },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'is-yerleri',
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
          { key: 'is_yeri_kodu', label: 'İş yeri kodu', code: true },
          { key: 'is_yeri_adi', label: 'İş yeri adı', name: true },
          { key: 'firma_id', label: 'Firma ID', type: 'number' },
          { key: 'adres', label: 'Adres' },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'depolar',
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
          { key: 'depo_kodu', label: 'Depo kodu', code: true },
          { key: 'depo_adi', label: 'Depo adı', name: true },
          { key: 'is_yeri_id', label: 'İş yeri ID', type: 'number' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
          { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
      },
    ],
  },
  {
    id: 'stok',
    title: 'Stok',
    screens: [
            {
        id: 'stok-karti',
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
          { key: 'stok_kodu', label: 'Stok kodu', code: true, required: true },
          { key: 'stok_adi', label: 'Stok adı', name: true, required: true },
          { key: 'stok_adi_2', label: 'Stok adı 2' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'uzun_stok_kodu', label: 'Uzun stok kodu' },
          { key: 'stok_tipi', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'], required: true },
          { key: 'tedarik_tipi', label: 'Tedarik tipi', type: 'select', options: ['Satinalma', 'Uretim'] },
          { key: 'stok_takip_birimi', label: 'Stok takip birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'satis_fiyati', label: 'Satış fiyatı', type: 'number' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [
          { key: 'boyut', label: 'Boyut' },
          { key: 'agirlik', label: 'Ağırlık', type: 'number' },
        ],
        detailKey: 'stok_detaylari',
        formTabs: [
          {
            id: 'ana', label: 'Stok Kart', kind: 'fields',
            fields: [
              { key: 'stok_kodu', label: 'Stok kodu', code: true, required: true },
              { key: 'stok_adi', label: 'Stok adı', name: true, required: true },
              { key: 'stok_adi_2', label: 'Stok adı 2' },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'uzun_stok_kodu', label: 'Uzun stok kodu' },
              { key: 'stok_tipi', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'], required: true },
              { key: 'tedarik_tipi', label: 'Tedarik tipi', type: 'select', options: ['Satinalma', 'Uretim'] },
              { key: 'stok_takip_birimi', label: 'Stok takip birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'satis_fiyati', label: 'Satış fiyatı', type: 'number' },
              { key: 'aktif', label: 'Aktif', type: 'checkbox' },
            ],
          },
          {
            id: 'olcu', label: 'Ölçü Bilgileri', kind: 'fields',
            fields: [
              { key: 'abc_kodu', label: 'ABC kodu', type: 'select', options: ['', 'A', 'B', 'C'] },
              { key: 'hacim', label: 'Hacim', type: 'number' },
              { key: 'hacim_birimi', label: 'Hacim birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'yogunluk', label: 'Yoğunluk', type: 'number' },
              { key: 'yogunluk_birimi', label: 'Yoğunluk birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'agirlik_birimi', label: 'Ağırlık birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'koli_brut_agirlik', label: 'Koli brüt ağırlık', type: 'number' },
              { key: 'kutu_brut_agirlik', label: 'Kutu brüt ağırlık', type: 'number' },
              { key: 'kutu_en_mm', label: 'Kutu en (mm)', type: 'number' },
              { key: 'kutu_boy_mm', label: 'Kutu boy (mm)', type: 'number' },
              { key: 'kutu_yukseklik_mm', label: 'Kutu yükseklik (mm)', type: 'number' },
              { key: 'barkod', label: 'Barkod' },
              { key: 'emniyet_stok', label: 'Emniyet stok', type: 'number' },
              { key: 'maksimum_stok', label: 'Maksimum stok', type: 'number' },
              { key: 'ulke_mensei', label: 'Ülke menşei' },
              { key: 'raf_omru_gun', label: 'Raf ömrü (gün)', type: 'number' },
              { key: 'marka', label: 'Marka' },
              { key: 'temin_sekli', label: 'Temin şekli' },
              { key: 'miktar_hassasiyeti', label: 'Miktar hassasiyeti', type: 'number' },
            ],
          },
          {
            id: 'birim', label: 'Birim Tanımları', kind: 'grid', key: 'birim_tanimlari', slots: 3,
            fields: [
              { key: 'birim_kodu', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'katsayi', label: 'Katsayı', type: 'number' },
              { key: 'cevrilecek_birim', label: 'Çevrilecek birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'barkod', label: 'Barkod' },
              { key: 'kutu_en_mm', label: 'Kutu en', type: 'number' },
              { key: 'kutu_boy_mm', label: 'Kutu boy', type: 'number' },
              { key: 'kutu_yukseklik_mm', label: 'Kutu yükseklik', type: 'number' },
              { key: 'hacim', label: 'Hacim', type: 'number' },
              { key: 'agirlik', label: 'Ağırlık', type: 'number' },
              { key: 'takip_birimi_mi', label: 'Takip birimi', type: 'checkbox' },
            ],
          },
          { id: 'detay', label: 'Stok Detay', kind: 'grid', key: 'stok_detaylari', slots: 1,
            fields: [
              { key: 'boyut', label: 'Boyut' },
              { key: 'agirlik', label: 'Ağırlık', type: 'number' },
            ],
          },
          { id: 'barkod-tab', label: 'Barkod', kind: 'stub', note: 'Barkod alt modeli henüz tanımlanmadı; sahte CRUD yok.' },
          { id: 'kategori', label: 'Kategoriler', kind: 'stub', note: 'Kategori ana verisi ve kuralları netleşince eklenecek.' },
          { id: 'alternatif', label: 'Alternatif Stok', kind: 'stub', note: 'Alternatif stok ilişkisi kapsamı netleşecek.' },
          { id: 'dil-stok', label: 'Dil Tanımları', kind: 'stub', note: 'Stok dil tanımları tablosu henüz yok.' },
          { id: 'mrp', label: 'MRP', kind: 'stub', note: 'MRP parametreleri üretim planlama fazında ele alınacak.' },
        ],
      },
      {
        id: 'depo-bakiye',
        title: 'Depo Bakiye',
        endpoint: '/stok-bakiyeleri',
        crud: false,
        filters: [
          { key: 'depo_kodu', label: 'Depo kodu' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'stok_adi', label: 'Stok adı' },
          { key: 'stok_tipi', label: 'Stok tipi' },
        ],
        columns: [
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'stok_tipi', label: 'Tip' },
          { key: 'bakiye', label: 'Bakiye', mono: true },
        ],
      },
    ],
  },
  {
    id: 'cari',
    title: 'Cari',
    screens: [
            {
        id: 'cari-kartlari',
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
          { key: 'cari_kodu', label: 'Cari kodu', code: true, required: true },
          { key: 'cari_adi', label: 'Cari adı', name: true, required: true },
          { key: 'cari_turu', label: 'Tür', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
          { key: 'vergi_no', label: 'VKN / TCKN' },
          { key: 'vergi_dairesi', label: 'Vergi dairesi' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
            id: 'ana', label: 'Cari Kart', kind: 'fields',
            fields: [
              { key: 'cari_kodu', label: 'Cari kodu', code: true, required: true },
              { key: 'cari_adi', label: 'Cari adı', name: true, required: true },
              { key: 'cari_adi_2', label: 'Cari adı 2' },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'cari_turu', label: 'Cari tipi', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true },
              { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
              { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
              { key: 'vergi_dairesi', label: 'Vergi dairesi' },
              { key: 'vergi_no', label: 'VKN / TCKN' },
              { key: 'pasaport_no', label: 'Pasaport no' },
              { key: 'ulke', label: 'Ülke' },
              { key: 'ad', label: 'Ad' },
              { key: 'soyad', label: 'Soyad' },
              { key: 'fatura_adres1', label: 'Fatura adres 1' },
              { key: 'fatura_adres2', label: 'Fatura adres 2' },
              { key: 'fatura_adres3', label: 'Fatura adres 3' },
              { key: 'il', label: 'İl' },
              { key: 'ilce', label: 'İlçe' },
              { key: 'posta_kodu', label: 'Posta kodu' },
              { key: 'enlem', label: 'Enlem', type: 'number' },
              { key: 'boylam', label: 'Boylam', type: 'number' },
              { key: 'telefon', label: 'Telefon 1' },
              { key: 'telefon2', label: 'Telefon 2' },
              { key: 'cep_tel', label: 'Cep tel' },
              { key: 'email', label: 'E-posta' },
              { key: 'website', label: 'Website' },
              { key: 'fax', label: 'Fax' },
              { key: 'yetkili_adi', label: 'Yetkili' },
              { key: 'yetkili_telefon', label: 'Yetkili tel' },
              { key: 'para_birimi', label: 'Para birimi' },
              { key: 'odeme_vadesi_gun', label: 'Vade (gün)', type: 'number' },
              { key: 'aktif', label: 'Aktif', type: 'checkbox' },
              { key: 'notlar', label: 'Notlar' },
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
              { key: 'sektor_kodu', label: 'Sektör kodu' },
              { key: 'bolge_kodu', label: 'Bölge kodu' },
              { key: 'nace_kodu', label: 'NACE kodu' },
              { key: 'sermaye', label: 'Sermaye', type: 'number' },
            ],
          },
          {
            id: 'dil', label: 'Dil Tanımları', kind: 'grid', key: 'dil_tanimlari', slots: 2,
            fields: [
              { key: 'dil_kodu', label: 'Dil kodu' },
              { key: 'dil_adi', label: 'Dil adı' },
              { key: 'cari_adi', label: 'Cari adı' },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
          },
          { id: 'euyum', label: 'e-Uyum', kind: 'stub', note: 'e-Fatura/e-Uyum entegrasyonu yok; dış servis simüle edilmeyecek.' },
          { id: 'kategori', label: 'Kategoriler', kind: 'stub', note: 'Kategori ana verisi tanımlanınca eklenecek.' },
          { id: 'ekalan', label: 'Ek Alanlar', kind: 'stub', note: 'Esnek ek alan altyapısı henüz yok.' },
        ],
      },
    ],
  },
  {
    id: 'uretim',
    title: 'Üretim',
    screens: [
      {
        id: 'urun-agaci',
        title: 'Ürün Ağacı',
        endpoint: '/urun-agaclari',
        crud: false,
        numeratorSeri: 'URUN_AGACI',
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
        ],
      },
      {
        id: 'is-merkezleri',
        title: 'İş Merkezleri',
        endpoint: '/is-merkezleri',
        crud: false,
        numeratorSeri: 'IS_MERKEZI',
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
      },
      {
        id: 'rotalar',
        title: 'Rotalar',
        endpoint: '/rotalar',
        crud: false,
        numeratorSeri: 'ROTA',
        filters: [
          { key: 'rota_kodu', label: 'Rota kodu' },
          { key: 'rota_adi', label: 'Rota adı' },
          { key: 'stok_kodu', label: 'Stok kodu' },
        ],
        columns: [
          { key: 'rota_kodu', label: 'Kod', mono: true },
          { key: 'rota_adi', label: 'Ad' },
          { key: 'stok_kodu', label: 'Stok', mono: true },
        ],
      },
      {
        id: 'uretim-emirleri',
        title: 'Üretim Emirleri',
        endpoint: '/uretim-emirleri',
        crud: false,
        numeratorSeri: 'URETIM_EMRI',
        filters: [
          { key: 'emir_no', label: 'Emir no' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'planlanan_miktar', label: 'Plan' },
          { key: 'uretilen_miktar', label: 'Üretilen' },
          { key: 'durum', label: 'Durum' },
        ],
      },
    ],
  },
  {
    id: 'satinalma',
    title: 'Satınalma',
    screens: [
      {
        id: 'satin-alma-talepleri',
        title: 'Satınalma Talepleri',
        endpoint: '/satin-alma-talepleri',
        crud: false,
        numeratorSeri: 'SATINALMA_TALEP',
        filters: [
          { key: 'talep_no', label: 'Talep no' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'talep_no', label: 'Talep', mono: true },
          { key: 'durum', label: 'Durum' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
      },
      {
        id: 'satin-alma-siparisleri',
        title: 'Satınalma Siparişleri',
        endpoint: '/satin-alma-siparisleri',
        crud: false,
        numeratorSeri: 'SATINALMA_SIPARIS',
        filters: [
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'talep_no', label: 'Talep', mono: true },
          { key: 'durum', label: 'Durum' },
        ],
      },
      {
        id: 'mal-kabuller',
        title: 'Mal Kabuller',
        endpoint: '/mal-kabuller',
        crud: false,
        numeratorSeri: 'MAL_KABUL',
        filters: [
          { key: 'kabul_no', label: 'Kabul no' },
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'depo_kodu', label: 'Depo' },
        ],
        columns: [
          { key: 'kabul_no', label: 'Kabul', mono: true },
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'depo_kodu', label: 'Depo', mono: true },
        ],
      },
    ],
  },
];

function normalizeScreen(raw, moduleId, moduleTitle) {
  const s = { ...raw, moduleId, moduleTitle };
  s.readOnly = s.id === 'depo-bakiye';
  s.crud = !s.readOnly;

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
  return s;
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
  detailRows: [],
  openTabs: [],
  formContext: null,
  formActiveTab: null,
  lookupCache: {},
};

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

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { /* ignore */ }
  if (!res.ok) {
    const msg = (data && (data.hata || data.detay)) || text || res.statusText;
    throw new Error(msg);
  }
  return data;
}

function norm(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'evet' : 'hayir';
  return String(v).trim().toLocaleLowerCase('tr');
}

function compareValues(cell, op, a, b) {
  const cellN = norm(cell);
  const aN = norm(a);
  const bN = norm(b);
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
    .map((f) => ({ def: f, st: state.filterState[f.key] || { op: 'esit', a: '', b: '' } }))
    .filter(({ st }) => (st.op === 'arasinda' ? Boolean(norm(st.a) || norm(st.b)) : Boolean(norm(st.a))));
  if (!active.length) return rows.slice();
  return rows.filter((row) =>
    active.every(({ def, st }) => compareValues(row[def.key], st.op, st.a, st.b))
  );
}

function findScreen(id) {
  return ALL_SCREENS.find((s) => s.id === id) || null;
}

function selectedRow() {
  return state.filtered.find((r) => String(r.id) === String(state.selectedId)) || null;
}

function resolveNumeratorSeri(screen, record = {}) {
  if (screen.numeratorFromField) {
    const val = record[screen.numeratorFromField.field];
    return screen.numeratorFromField.map[val] || screen.numeratorSeri;
  }
  return screen.numeratorSeri;
}

async function ayirKod(seriKodu) {
  if (!seriKodu) throw new Error('Bu ekran için numaratör bağlı değil.');
  const data = await api(`/kod-serileri/${encodeURIComponent(seriKodu)}/ayir`, { method: 'POST' });
  return data.kod;
}

function showView(name) {
  const home = $('#viewHome');
  const screen = $('#viewScreen');
  const form = $('#viewForm');
  if (!home || !screen || !form) {
    console.error('KTB ERP: view element missing', { home: !!home, screen: !!screen, form: !!form });
    return;
  }

  // Sadece native hidden — CSS class savaşları yok
  home.hidden = name !== 'home';
  screen.hidden = name !== 'screen';
  form.hidden = name !== 'form';

  // Inline stil yedek (eski CSS cache’ine karşı)
  home.style.display = name === 'home' ? 'grid' : 'none';
  screen.style.display = name === 'screen' ? 'grid' : 'none';
  form.style.display = name === 'form' ? 'flex' : 'none';
}


function renderTabBar() {
  const bar = $('#tabBar');
  if (!bar) return;
  if (!state.openTabs.length) {
    bar.innerHTML = '';
    return;
  }
  bar.innerHTML = state.openTabs.map((t) => `
    <button type="button" class="tab-item${t.id === state.screenId && !state.formMode ? ' active' : ''}${t.id === state.screenId && state.formMode ? ' active' : ''}" data-tab="${t.id}">
      <span>${t.title}</span>
      <span class="tab-close" data-tab-close="${t.id}" title="Kapat">×</span>
    </button>
  `).join('');
}

function addOpenTab(screen) {
  if (!screen) return;
  if (!state.openTabs.some((t) => t.id === screen.id)) {
    state.openTabs.push({ id: screen.id, title: screen.title });
  }
  renderTabBar();
}

function closeOpenTab(id) {
  state.openTabs = state.openTabs.filter((t) => t.id !== id);
  if (state.screenId === id) {
    state.formMode = null;
    const next = state.openTabs[state.openTabs.length - 1];
    if (next) openScreen(next.id);
    else showHome();
  } else {
    renderTabBar();
  }
}

function renderSidebar() {
  const nav = $('#sidebarNav');
  if (!nav) return;
  nav.innerHTML = MODULES.map((mod) => `
    <div class="mod-group">
      <div class="mod-title">${mod.title}</div>
      ${mod.screens.map((s) => `
        <button type="button" class="mod-item${state.screenId === s.id ? ' active' : ''}" data-screen="${s.id}">
          ${s.title}
        </button>
      `).join('')}
    </div>
  `).join('');
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
  $('#homeSearchWrap').hidden = false;
  $('#screenTitle').textContent = 'Ana Sayfa';
  $('#screenSearch').value = '';
  $('#searchResults').hidden = true;
  renderSidebar();
  renderTabBar();
}

function readFilterState(screen) {
  const next = {};
  screen.filters.forEach((f) => {
    next[f.key] = {
      op: document.querySelector(`[data-filter-op="${f.key}"]`)?.value || 'esit',
      a: document.querySelector(`[data-filter-a="${f.key}"]`)?.value || '',
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

function renderFilterPane(screen) {
  const grid = $('#filterGrid');
  grid.innerHTML = screen.filters.map((f) => {
    const st = state.filterState[f.key] || { op: 'esit', a: '', b: '' };
    return `
      <div class="filter-field">
        <label>${f.label}</label>
        <select data-filter-op="${f.key}">
          ${OPERATORS.map((o) => `<option value="${o.id}" ${st.op === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
        <div class="filter-values${st.op === 'arasinda' ? ' split' : ''}" data-filter-values="${f.key}">
          <input type="text" data-filter-a="${f.key}" value="${st.a || ''}" placeholder="Değer" />
          <input type="text" data-filter-b="${f.key}" value="${st.b || ''}" placeholder="Bitiş" ${st.op === 'arasinda' ? '' : 'hidden'} />
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('[data-filter-op]').forEach((el) => {
    el.addEventListener('change', () => syncBetweenInputs(screen));
  });
}

function cellHtml(col, row) {
  let val = row[col.key];
  if (typeof val === 'boolean') val = val ? 'Evet' : 'Hayır';
  if (val === null || val === undefined || val === '') val = '—';
  return col.mono ? `<span class="mono">${val}</span>` : String(val);
}

function renderList(screen) {
  const head = $('#dataHead');
  const body = $('#dataBody');
  head.innerHTML = `<tr>${screen.columns.map((c) => `<th>${c.label}</th>`).join('')}</tr>`;
  if (!state.filtered.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="${screen.columns.length}">Kayıt yok.</td></tr>`;
  } else {
    body.innerHTML = state.filtered.map((row) => `
      <tr data-id="${row.id}" class="${String(row.id) === String(state.selectedId) ? 'selected' : ''}">
        ${screen.columns.map((c) => `<td>${cellHtml(c, row)}</td>`).join('')}
      </tr>
    `).join('');
  }
  $('#listMeta').textContent = `${state.filtered.length} / ${state.rows.length} kayıt`;
  updateActionButtons(screen);
}

function updateActionButtons(screen) {
  const hasSel = Boolean(state.selectedId);
  document.querySelectorAll('#actionBar [data-action]').forEach((btn) => {
    const act = btn.dataset.action;
    if (screen.readOnly) {
      btn.disabled = act !== 'incele' || !hasSel;
      return;
    }
    if (act === 'yeni') btn.disabled = false;
    else btn.disabled = !hasSel;
  });
}

async function openScreen(id) {
  try {
    const screen = findScreen(id);
    if (!screen) {
      toast(`Ekran bulunamadı: ${id || '?'}`);
      return;
    }

    state.screenId = id;
    state.selectedId = null;
    state.formMode = null;
    state.filterState = {};
    (screen.filters || []).forEach((f) => {
      state.filterState[f.key] = { op: 'esit', a: '', b: '' };
    });

    if (location.hash !== `#${id}`) {
      history.pushState({ screenId: id }, '', `#${id}`);
    }

    addOpenTab(screen);
    showView('screen');
    $('#homeSearchWrap').hidden = true;
    $('#screenTitle').textContent = screen.title;
    const banner = $('#screenBanner');
    if (banner) banner.textContent = `${screen.title} açık · UI build 20261014a`;
    $('#searchResults').hidden = true;
    $('#listMeta').textContent = 'Yükleniyor…';
    $('#dataBody').innerHTML = `<tr class="empty-row"><td colspan="${(screen.columns || []).length}">Yükleniyor…</td></tr>`;

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

    const data = await api(screen.endpoint);
    if (state.screenId !== id) return;
    let rows = Array.isArray(data) ? data : [];
    if (screen.id === 'numarator-tanimi') {
      rows = rows.map((r) => ({ ...r, id: r.seri_kodu }));
    }
    state.rows = rows;
    state.filtered = applyFilters(state.rows, screen);
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
    $('#dataBody').innerHTML = `<tr class="empty-row"><td colspan="${(screen.columns || []).length}">${err.message}</td></tr>`;
    $('#listMeta').textContent = 'Hata';
    updateActionButtons(screen);
  }
}

const LOOKUP_ENDPOINTS = {
  'olcu-birimleri': '/olcu-birimleri',
  firmalar: '/firmalar',
  'is-yerleri': '/is-yerleri',
};

async function ensureLookups(screen) {
  const needed = new Set();
  const collect = (fields) => {
    (fields || []).forEach((f) => {
      if (f.type === 'lookup' && f.lookup) needed.add(f.lookup);
    });
  };
  collect(screen.masterFields);
  collect(screen.detailFields);
  (screen.formTabs || []).forEach((tab) => collect(tab.fields));
  for (const key of needed) {
    if (state.lookupCache[key]) continue;
    const ep = LOOKUP_ENDPOINTS[key];
    if (!ep) continue;
    try {
      state.lookupCache[key] = await api(ep);
    } catch (_) {
      state.lookupCache[key] = [];
    }
  }
}

function escAttr(v) {
  return String(v ?? '').replace(/"/g, '&quot;');
}

function fieldControl(field, value, attrName = 'data-master', extraAttrs = '') {
  const codeLocked = field.code && !(field.editableOnNew && state.formMode === 'yeni');
  const forceDisabled = state.formMode === 'incele' || codeLocked;
  const dis = forceDisabled ? 'disabled' : '';
  const v = value ?? '';
  const name = `${attrName}="${field.key}" ${extraAttrs}`.trim();
  if (field.type === 'checkbox') {
    return `<input type="checkbox" ${name} ${v ? 'checked' : ''} ${dis} />`;
  }
  if (field.type === 'select') {
    return `<select ${name} ${dis}>
      ${(field.options || []).map((o) => `<option value="${o}" ${String(v) === String(o) ? 'selected' : ''}>${o || '—'}</option>`).join('')}
    </select>`;
  }
  if (field.type === 'lookup') {
    const rows = state.lookupCache[field.lookup] || [];
    const vk = field.valueKey || 'id';
    const lk = field.labelKey || 'adi';
    const ck = field.codeKey;
    const opts = [`<option value="">— seçin —</option>`].concat(
      rows.map((r) => {
        const val = r[vk];
        const label = ck ? `${r[ck] || ''} — ${r[lk] || ''}` : `${r[vk]} — ${r[lk] || ''}`;
        return `<option value="${escAttr(val)}" ${String(v) === String(val) ? 'selected' : ''}>${label}</option>`;
      })
    );
    return `<select class="lookup-select" ${name} ${dis}>${opts.join('')}</select>`;
  }
  if (field.type === 'number') {
    return `<input type="number" ${name} value="${escAttr(v)}" ${dis} />`;
  }
  if (field.type === 'date') {
    const dv = v ? String(v).slice(0, 10) : '';
    return `<input type="date" ${name} value="${escAttr(dv)}" ${dis} />`;
  }
  return `<input type="text" ${name} value="${escAttr(v)}" ${dis} />`;
}

function detailFieldControl(field, value, idx, gridKey = null) {
  const extra = gridKey
    ? `data-didx="${idx}" data-grid="${gridKey}"`
    : `data-didx="${idx}"`;
  return fieldControl(field, value, 'data-detail', extra);
}

function ensureDetailSlots(screen, rows) {
  const slots = screen.detailSlots || 0;
  const fields = screen.detailFields || [];
  const out = [];
  for (let i = 0; i < slots; i += 1) {
    const src = rows[i] || {};
    const row = {};
    fields.forEach((f) => {
      if (f.type === 'checkbox') row[f.key] = Boolean(src[f.key]);
      else row[f.key] = src[f.key] ?? '';
    });
    out.push(row);
  }
  return out;
}

function ensureGridSlots(tab, rows) {
  const slots = tab.slots || 0;
  const fields = tab.fields || [];
  const out = [];
  for (let i = 0; i < slots; i += 1) {
    const src = rows[i] || {};
    const row = {};
    fields.forEach((f) => {
      if (f.type === 'checkbox') row[f.key] = Boolean(src[f.key]);
      else row[f.key] = src[f.key] ?? '';
    });
    out.push(row);
  }
  return out;
}

function fieldShell(f, controlHtml) {
  const cls = ['field'];
  if (f.required) cls.push('required');
  if (f.type === 'lookup') cls.push('lookup');
  return `<div class="${cls.join(' ')}"><label>${f.label}</label>${controlHtml}</div>`;
}

function renderForm(screen) {
  const readonly = state.formMode === 'incele';
  const rec = state.formRecord || {};
  $('#formModeBadge').textContent = MODE_LABELS[state.formMode] || state.formMode;
  $('#formScreenLabel').textContent = screen.title;
  $('#btnFormSave').hidden = readonly;

  const tabsLayout = $('#formTabsLayout');
  const classic = $('#formSplitClassic');
  const hasTabs = Array.isArray(screen.formTabs) && screen.formTabs.length;

  if (hasTabs) {
    if (classic) classic.hidden = true;
    if (tabsLayout) tabsLayout.hidden = false;
    if (!state.formActiveTab) state.formActiveTab = screen.formTabs[0].id;
    const nav = $('#formTabNav');
    const body = $('#formTabBody');
    nav.innerHTML = screen.formTabs.map((tab) => `
      <button type="button" class="form-tab-btn ${tab.kind === 'stub' ? 'stub' : ''} ${state.formActiveTab === tab.id ? 'active' : ''}"
        data-form-tab="${tab.id}">${tab.label}</button>
    `).join('');

    body.innerHTML = screen.formTabs.map((tab) => {
      const active = state.formActiveTab === tab.id;
      if (tab.kind === 'stub') {
        return `<div class="form-tab-panel" data-tab-panel="${tab.id}" ${active ? '' : 'hidden'}>
          <h2>${tab.label}</h2>
          <div class="stub-panel">${tab.note || 'Bu sekmenin kapsamı henüz netleştirilmedi.'}</div>
        </div>`;
      }
      if (tab.kind === 'grid') {
        const rows = ensureGridSlots(tab, Array.isArray(rec[tab.key]) ? rec[tab.key] : []);
        rec[tab.key] = rows;
        return `<div class="form-tab-panel" data-tab-panel="${tab.id}" ${active ? '' : 'hidden'}>
          <h2>${tab.label}</h2>
          <div class="detail-grid">
            ${rows.map((row, idx) => `
              <div class="detail-slot">
                <div class="detail-slot-title">${tab.label} ${idx + 1}</div>
                <div class="detail-slot-fields">
                  ${(tab.fields || []).map((f) => fieldShell(f, detailFieldControl(f, row[f.key], idx, tab.key))).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
      }
      // fields
      return `<div class="form-tab-panel" data-tab-panel="${tab.id}" ${active ? '' : 'hidden'}>
        <h2>${tab.label}</h2>
        <div class="form-tab-fields">
          ${(tab.fields || []).map((f) => fieldShell(f, fieldControl(f, rec[f.key]))).join('')}
        </div>
      </div>`;
    }).join('');
    state.formRecord = rec;
    return;
  }

  if (tabsLayout) tabsLayout.hidden = true;
  if (classic) classic.hidden = false;

  $('#masterGrid').innerHTML = (screen.masterFields || []).map((f) => fieldShell(f, fieldControl(f, rec[f.key]))).join('');

  const grid = $('#detailGrid');
  const dFields = screen.detailFields || [];
  const slots = screen.detailSlots || 0;
  if (!grid) return;
  if (!dFields.length || !slots) {
    grid.innerHTML = `<div class="detail-empty">Bu ekranda ek detay alanı yok.</div>`;
    return;
  }

  state.detailRows = ensureDetailSlots(screen, state.detailRows || []);
  grid.innerHTML = state.detailRows.map((row, idx) => `
    <div class="detail-slot">
      <div class="detail-slot-title">Detay ${idx + 1}</div>
      <div class="detail-slot-fields">
        ${dFields.map((f) => fieldShell(f, detailFieldControl(f, row[f.key], idx))).join('')}
      </div>
    </div>
  `).join('');
}

function readFieldValue(el, field) {
  if (!el) return undefined;
  if (field.type === 'checkbox') return el.checked;
  if (field.type === 'number') return el.value === '' ? null : Number(el.value);
  if (field.type === 'lookup' && (field.valueKey === 'id' || field.lookup === 'firmalar' || field.lookup === 'is-yerleri')) {
    return el.value === '' ? null : (Number.isNaN(Number(el.value)) ? el.value : Number(el.value));
  }
  return el.value;
}

function readMasterFromForm(screen) {
  const out = { ...(state.formRecord || {}) };
  const fields = [];
  if (screen.formTabs?.length) {
    screen.formTabs.forEach((tab) => {
      if (tab.kind === 'fields') fields.push(...(tab.fields || []));
    });
  } else {
    fields.push(...(screen.masterFields || []));
  }
  fields.forEach((f) => {
    const el = document.querySelector(`[data-master="${f.key}"]`);
    if (!el) return;
    out[f.key] = readFieldValue(el, f);
  });
  return out;
}

function readDetailsFromForm(screen) {
  if (!screen.detailFields?.length || !screen.detailSlots) return [];
  const rows = [];
  for (let idx = 0; idx < screen.detailSlots; idx += 1) {
    const row = {};
    let any = false;
    screen.detailFields.forEach((f) => {
      const el = document.querySelector(`[data-detail="${f.key}"][data-didx="${idx}"]:not([data-grid])`);
      if (!el) return;
      row[f.key] = readFieldValue(el, f);
      if (f.type === 'checkbox') { if (el.checked) any = true; }
      else if (el.value !== '') any = true;
    });
    if (any) rows.push(row);
  }
  return rows;
}

function readGridFromForm(tab) {
  const rows = [];
  for (let idx = 0; idx < (tab.slots || 0); idx += 1) {
    const row = {};
    let any = false;
    (tab.fields || []).forEach((f) => {
      const el = document.querySelector(`[data-detail="${f.key}"][data-didx="${idx}"][data-grid="${tab.key}"]`);
      if (!el) return;
      row[f.key] = readFieldValue(el, f);
      if (f.type === 'checkbox') { if (el.checked) any = true; }
      else if (el.value !== '') any = true;
    });
    if (any) rows.push(row);
  }
  return rows;
}

function readTabbedPayload(screen) {
  const out = readMasterFromForm(screen);
  (screen.formTabs || []).forEach((tab) => {
    if (tab.kind === 'grid') out[tab.key] = readGridFromForm(tab);
  });
  return out;
}

function validateRequired(screen, payload) {
  const fields = [];
  if (screen.formTabs?.length) {
    screen.formTabs.forEach((tab) => {
      if (tab.kind === 'fields') fields.push(...(tab.fields || []));
    });
  } else {
    fields.push(...(screen.masterFields || []));
  }
  for (const f of fields) {
    if (!f.required) continue;
    if (f.code && state.formMode === 'duzelt') continue;
    const v = payload[f.key];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      return `${f.label} zorunlu.`;
    }
  }
  return null;
}

async function openForm(mode) {
  const screen = findScreen(state.screenId);
  if (!screen) return;
  if (screen.readOnly && mode !== 'incele') {
    toast('Bu ekran yalnızca incelenebilir.');
    return;
  }

  const needsRow = mode === 'incele' || mode === 'duzelt' || mode === 'kopyala';
  const row = selectedRow();
  if (needsRow && !row) {
    toast('Önce listeden bir satır seçin.');
    return;
  }

  state.formMode = mode;
  state.formActiveTab = screen.formTabs?.[0]?.id || null;
  let record = {};

  async function loadRecord(id) {
    try {
      return await api(`${screen.endpoint}/${id}`);
    } catch (_) {
      return { ...row };
    }
  }

  await ensureLookups(screen);

  const seedFields = () => {
    const all = [];
    if (screen.formTabs?.length) {
      screen.formTabs.forEach((t) => { if (t.kind === 'fields') all.push(...(t.fields || [])); });
    } else {
      all.push(...(screen.masterFields || []));
    }
    all.forEach((f) => {
      if (f.type === 'checkbox') record[f.key] = true;
      else if (f.type === 'select') record[f.key] = f.options?.[0] || '';
      else if (record[f.key] === undefined) record[f.key] = '';
    });
  };

  if (mode === 'yeni') {
    record = {};
    seedFields();
    const seri = resolveNumeratorSeri(screen, record);
    if (seri) {
      try { record[screen.codeField] = await ayirKod(seri); }
      catch (err) { toast(err.message); }
    }
    state.detailRows = ensureDetailSlots(screen, []);
    (screen.formTabs || []).forEach((tab) => {
      if (tab.kind === 'grid') record[tab.key] = ensureGridSlots(tab, []);
    });
  } else if (mode === 'kopyala') {
    const full = await loadRecord(row.id);
    record = { ...full };
    delete record.id;
    if (screen.nameField) record[screen.nameField] = '';
    const seri = resolveNumeratorSeri(screen, record);
    if (seri) {
      try { record[screen.codeField] = await ayirKod(seri); }
      catch (err) { toast(err.message); }
    }
    const rawDetails = Array.isArray(full[screen.detailKey]) ? full[screen.detailKey] : [];
    state.detailRows = ensureDetailSlots(screen, rawDetails.map(({ id, ...rest }) => rest));
    (screen.formTabs || []).forEach((tab) => {
      if (tab.kind === 'grid') {
        const raw = Array.isArray(full[tab.key]) ? full[tab.key] : [];
        record[tab.key] = ensureGridSlots(tab, raw.map(({ id, ...rest }) => rest));
      }
    });
  } else {
    const full = await loadRecord(row.id);
    record = { ...full };
    const rawDetails = Array.isArray(full[screen.detailKey]) ? full[screen.detailKey] : [];
    state.detailRows = ensureDetailSlots(screen, rawDetails.map((d) => ({ ...d })));
    (screen.formTabs || []).forEach((tab) => {
      if (tab.kind === 'grid') {
        const raw = Array.isArray(full[tab.key]) ? full[tab.key] : [];
        record[tab.key] = ensureGridSlots(tab, raw.map((d) => ({ ...d })));
      }
    });
  }

  if (screen.id === 'numarator-tanimi' && (mode === 'yeni' || mode === 'kopyala')) {
    record.son_numara = 0;
    record.aktif = true;
    if (mode === 'yeni') record.seri_kodu = '';
  }

  state.formRecord = record;
  addOpenTab(screen);
  showView('form');
  $('#homeSearchWrap').hidden = true;
  $('#screenTitle').textContent = `${screen.title} · ${MODE_LABELS[mode]}`;
  renderForm(screen);
  renderTabBar();
}

async function saveForm() {
  const screen = findScreen(state.screenId);
  if (!screen || state.formMode === 'incele') return;

  const master = screen.formTabs?.length
    ? readTabbedPayload(screen)
    : (() => {
        const m = readMasterFromForm(screen);
        const details = readDetailsFromForm(screen);
        if (screen.detailKey) m[screen.detailKey] = details;
        return m;
      })();

  const reqErr = validateRequired(screen, master);
  if (reqErr) {
    toast(reqErr);
    return;
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
      await api(`${screen.endpoint}/${master.id}`, { method: 'PUT', body: JSON.stringify(master) });
    } else {
      await api(screen.endpoint, { method: 'POST', body: JSON.stringify(master) });
    }
    toast('Kaydedildi.');
    state.formMode = null;
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
  if (screen.id === 'numarator-tanimi') {
    toast('Numaratör silinmez; pasife alın.');
    return;
  }
  if (!confirm(`${row[screen.codeField] || row.id} silinsin mi?`)) return;
  try {
    await api(`${screen.endpoint}/${row.id}`, { method: 'DELETE' });
    toast('Silindi.');
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
    s.title.toLocaleLowerCase('tr').includes(query) ||
    s.moduleTitle.toLocaleLowerCase('tr').includes(query)
  ).slice(0, 12);
  if (!hits.length) {
    box.hidden = false;
    box.innerHTML = '<div class="search-empty">Eşleşen ekran yok.</div>';
    return;
  }
  box.hidden = false;
  box.innerHTML = hits.map((s) => `
    <button type="button" class="search-hit" data-screen="${s.id}">
      <strong>${s.title}</strong>
      <span>${s.moduleTitle}</span>
    </button>
  `).join('');
}

function bindEvents() {
  const nav = $('#sidebarNav');
  if (nav && !nav.dataset.bound) {
    nav.dataset.bound = '1';
    nav.addEventListener('click', (e) => {
      const screenBtn = e.target.closest('[data-screen]');
      if (!screenBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = screenBtn.getAttribute('data-screen');
      openScreen(id);
    });
  }

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
      else openForm(act).catch((err) => toast(err.message));
      return;
    }

    const row = e.target.closest('#dataBody tr[data-id]');
    if (row) {
      state.selectedId = row.dataset.id;
      const screen = findScreen(state.screenId);
      if (screen) renderList(screen);
      return;
    }

    const tabClose = e.target.closest('[data-tab-close]');
    if (tabClose) {
      e.preventDefault();
      e.stopPropagation();
      closeOpenTab(tabClose.getAttribute('data-tab-close'));
      return;
    }

    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      e.preventDefault();
      openScreen(tabBtn.getAttribute('data-tab'));
      return;
    }

    const wrap = $('#homeSearchWrap');
    if (wrap && !wrap.contains(e.target)) $('#searchResults').hidden = true;
  });

  $('#btnHome').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showHome();
  });

  $('#btnMenu').addEventListener('click', () => {
    const shell = $('#appShell');
    const sidebar = $('#sidebar');
    if (window.matchMedia('(max-width: 900px)').matches) {
      sidebar.classList.toggle('open');
    } else {
      shell.classList.toggle('sidebar-collapsed');
    }
  });

  $('#btnApplyFilter').addEventListener('click', () => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    readFilterState(screen);
    state.filtered = applyFilters(state.rows, screen);
    state.selectedId = null;
    renderList(screen);
  });

  $('#btnClearFilter').addEventListener('click', () => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    state.filterState = {};
    screen.filters.forEach((f) => { state.filterState[f.key] = { op: 'esit', a: '', b: '' }; });
    renderFilterPane(screen);
    state.filtered = state.rows.slice();
    state.selectedId = null;
    renderList(screen);
  });

  $('#btnFormCancel').addEventListener('click', () => {
    state.formMode = null;
    const id = state.screenId;
    openScreen(id);
  });

  $('#btnFormSave').addEventListener('click', () => {
    saveForm();
  });

  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-form-tab]');
    if (!tabBtn) return;
    const screen = findScreen(state.screenId);
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

function bootFromHash() {
  renderSidebar();
  bindEvents();
  const id = (location.hash || '').replace(/^#/, '');
  if (id && findScreen(id)) openScreen(id);
  else showHome();
}

bootFromHash();
