const OPERATORS = [
  { id: 'esit', label: 'Eşit' },
  { id: 'esit_degil', label: 'Eşit değil' },
  { id: 'arasinda', label: 'Arasında' },
];

const MODULES = [
  {
    id: 'sabit-tanimlar',
    title: 'Sabit Tanımlar',
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
    ],
  },

  {
    id: 'sistem',
    title: 'Sistem',
    screens: [
      {
        id: 'kullanicilar',
        title: 'Kullanıcılar',
        endpoint: '/kullanicilar',
        crud: true,
        codeField: 'kullanici_kodu',
        nameField: 'ad',
        numeratorSeri: 'KULLANICI',
        filters: [
          { key: 'kullanici_kodu', label: 'Kullanıcı kodu' },
          { key: 'ad', label: 'Ad' },
          { key: 'rol', label: 'Rol' },
        ],
        columns: [
          { key: 'kullanici_kodu', label: 'Kod', mono: true },
          { key: 'ad', label: 'Ad' },
          { key: 'soyad', label: 'Soyad' },
          { key: 'rol', label: 'Rol' },
          { key: 'grup_kodu', label: 'Grup', mono: true },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'kullanici_kodu', label: 'Kullanıcı kodu', code: true, required: true },
          { key: 'ad', label: 'Ad', name: true, required: true },
          { key: 'soyad', label: 'Soyad', required: true },
          { key: 'rol', label: 'Rol', type: 'select', options: ['Personel', 'Yonetici', 'Satinalma', 'Uretim', 'Finans'] },
        ],
        detailFields: [
          { key: 'eposta', label: 'E-posta' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'grup_kodu', label: 'Grup kodu' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'kullanici-gruplari',
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
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'grup_kodu', label: 'Grup kodu', code: true, required: true },
          { key: 'grup_adi', label: 'Grup adı', name: true, required: true },
        ],
        detailFields: [
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailKey: null,
        detailAsFields: true,
      },
      {
        id: 'sistem-parametreleri',
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
          { key: 'firma_kodu', label: 'Firma kodu', code: true, required: true },
          { key: 'firma_adi', label: 'Firma adı', name: true, required: true },
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
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'stok_tipi', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'], required: true },
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
              { key: 'ulke_mensei', label: 'Ülke menşei', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_kodu', labelKey: 'ulke_adi' },
              { key: 'temin_sekli', label: 'Temin şekli', type: 'lookup', lookup: 'kategoriler-temin', valueKey: 'kategori_kodu', labelKey: 'kategori_adi' },
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
              { key: 'koli_brut_agirlik', label: 'Koli brüt ağırlık', type: 'number' },
              { key: 'kutu_brut_agirlik', label: 'Kutu brüt ağırlık', type: 'number' },
              { key: 'kutu_en_mm', label: 'Kutu en (mm)', type: 'number' },
              { key: 'kutu_boy_mm', label: 'Kutu boy (mm)', type: 'number' },
              { key: 'kutu_yukseklik_mm', label: 'Kutu yükseklik (mm)', type: 'number' },
              { key: 'barkod', label: 'Barkod' },
              { key: 'emniyet_stok', label: 'Emniyet stok', type: 'number' },
              { key: 'maksimum_stok', label: 'Maksimum stok', type: 'number' },
              { key: 'raf_omru_gun', label: 'Raf ömrü (gün)', type: 'number' },
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
              { key: 'takip_birimi_mi', label: 'Takip birimi', type: 'checkbox' },
            ],
          },
          {
            id: 'isyeri-bag', label: 'İş Yeri Bağları', kind: 'grid', key: 'is_yeri_baglari', slots: 3,
            fields: [
              { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
              { key: 'aktif', label: 'Aktif', type: 'checkbox' },
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
              { key: 'temin_sekli', label: 'Temin şekli', type: 'lookup', lookup: 'kategoriler-temin', valueKey: 'kategori_kodu', labelKey: 'kategori_adi' },
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
              { key: 'dil_kodu', label: 'Dil kodu' },
              { key: 'dil_adi', label: 'Dil adı' },
              { key: 'stok_adi', label: 'Stok adı' },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
          },
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
      {
        id: 'stok-hareketleri',
        title: 'Stok Hareketleri',
        endpoint: '/stok-hareketleri',
        crud: false,
        filters: [
          { key: 'hareket_no', label: 'Hareket no' },
          { key: 'hareket_tipi', label: 'Tip' },
          { key: 'depo_kodu', label: 'Depo' },
        ],
        columns: [
          { key: 'hareket_no', label: 'Hareket', mono: true },
          { key: 'hareket_tipi', label: 'Tip' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'belge_tipi', label: 'Belge tipi' },
          { key: 'belge_id', label: 'Belge id' },
          { key: 'hareket_tarihi', label: 'Tarih' },
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
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'cari_turu', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true },
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
              { key: 'cari_kodu', label: 'Cari kodu', code: true, required: true },
              { key: 'cari_adi', label: 'Cari adı', name: true, required: true },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'cari_turu', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true },
              { key: 'vergi_no', label: 'VKN / TCKN' },
              { key: 'fatura_adres1', label: 'Adres 1' },
            ],
            detailFields: [
              { key: 'cari_adi_2', label: 'Cari adı 2' },
              { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
              { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
              { key: 'vergi_dairesi', label: 'Vergi dairesi' },
              { key: 'pasaport_no', label: 'Pasaport no' },
              { key: 'ulke', label: 'Ülke', type: 'lookup', lookup: 'ulkeler', valueKey: 'ulke_kodu', labelKey: 'ulke_adi' },
              { key: 'ad', label: 'Ad' },
              { key: 'soyad', label: 'Soyad' },
              { key: 'fatura_adres2', label: 'Adres 2' },
              { key: 'fatura_adres3', label: 'Adres 3' },
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
              { key: 'dil_kodu', label: 'Dil kodu' },
              { key: 'dil_adi', label: 'Dil adı' },
              { key: 'cari_adi', label: 'Cari adı' },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
            ],
          },
          { id: 'kategori', label: 'Kategoriler', kind: 'stub', note: 'Cari kategori modeli henüz yok.' },
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
        ],
        masterFields: [
          { key: 'agac_kodu', label: 'Kod', code: true, required: true },
          { key: 'agac_adi', label: 'Ad', name: true, required: true },
          { key: 'mamul_stok_id', label: 'Kök stok (Mamul)', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'miktar', label: 'Miktar', type: 'number' },
        ],
        detailFields: [],
        detailKey: null,
        formTabs: [
          {
            id: 'baslik', label: 'Ağaç Başlık', kind: 'fields',
            fields: [
              { key: 'agac_kodu', label: 'Kod', code: true, required: true },
              { key: 'agac_adi', label: 'Ad', name: true, required: true },
              { key: 'mamul_stok_id', label: 'Kök stok (Mamul)', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
              { key: 'miktar', label: 'Miktar', type: 'number' },
            ],
          },
          {
            id: 'agac-tree', label: 'Ürün Ağacı', kind: 'bom-tree', key: 'satirlar',
            fields: [
              { key: 'bilesen_stok_id', label: 'Bileşen stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
              { key: 'miktar', label: 'Miktar', type: 'number', required: true },
              { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
            ],
          },
        ],
      },
      {
        id: 'bom-seviye-listesi',
        title: 'Ürün Ağacı Seviye Listesi',
        endpoint: '/bom/seviye-listesi',
        crud: false,
        codeField: 'liste_kodu',
        nameField: 'aciklama',
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
        ],
        masterFields: [
          { key: 'rota_kodu', label: 'Kod', code: true, required: true },
          { key: 'rota_adi', label: 'Ad', name: true, required: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
        ],
        detailFields: [],
        detailKey: null,
        formTabs: [
          {
            id: 'baslik', label: 'Rota Başlık', kind: 'fields',
            fields: [
              { key: 'rota_kodu', label: 'Kod', code: true, required: true },
              { key: 'rota_adi', label: 'Ad', name: true, required: true },
              { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
            ],
          },
          {
            id: 'op-flow', label: 'Operasyon Akışı', kind: 'rota-flow', key: 'operasyonlar',
            fields: [
              { key: 'sira_no', label: 'Sıra', type: 'number', required: true },
              { key: 'operasyon_kodu', label: 'Operasyon kodu', required: true },
              { key: 'operasyon_adi', label: 'Operasyon adı', required: true },
              { key: 'is_merkezi_id', label: 'İş merkezi', type: 'lookup', lookup: 'is-merkezleri', valueKey: 'id', labelKey: 'merkez_adi', codeKey: 'merkez_kodu' },
              { key: 'sure_dk', label: 'Süre (dk)', type: 'number' },
              { key: 'cikti_stok_id', label: 'Çıktı stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
              { key: 'sonraki_sira_no', label: 'Sonraki sıra', type: 'number' },
            ],
            componentFields: [
              { key: 'stok_id', label: 'Bileşen stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
              { key: 'miktar', label: 'Miktar', type: 'number' },
              { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
            ],
          },
        ],
      },
      {
        id: 'uretim-emirleri',
        title: 'Üretim Emirleri',
        endpoint: '/uretim-emirleri',
        crud: true,
        numeratorSeri: 'URETIM_EMRI',
        codeField: 'emir_no',
        nameField: 'stok_kodu',
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
        masterFields: [
          { key: 'emir_no', label: 'Emir no', code: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'urun_agaci_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu', required: true },
          { key: 'rota_id', label: 'Rota', type: 'lookup', lookup: 'rotalar', valueKey: 'id', labelKey: 'rota_adi', codeKey: 'rota_kodu', required: true },
          { key: 'siparis_id', label: 'Satış siparişi', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', codeKey: 'siparis_no' },
          { key: 'planlanan_miktar', label: 'Planlanan miktar', type: 'number', required: true },
          { key: 'hammadde_depo_id', label: 'Hammadde depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'mamul_depo_id', label: 'Mamul depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'OnayBekliyor', 'Acik', 'Uretimde', 'Kapali', 'Iptal'] },
        ],
        detailFields: [
          { key: 'sira_no', label: 'Sıra', type: 'number' },
          { key: 'operasyon_kodu', label: 'Operasyon kodu' },
          { key: 'operasyon_adi', label: 'Operasyon adı' },
          { key: 'durum', label: 'Durum' },
        ],
        detailKey: 'operasyonlar',
        detailSlots: 4,
      },
      {
        id: 'uretim-girisleri',
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
    screens: [
      {
        id: 'satin-alma-teklif-istekleri',
        title: 'Satınalma Teklif İstekleri',
        endpoint: '/satin-alma-teklif-istekleri',
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
        title: 'Satınalma Teklifleri',
        endpoint: '/satin-alma-teklifleri',
        crud: true,
        numeratorSeri: 'SATINALMA_TEKLIF',
        codeField: 'teklif_no',
        nameField: 'cari_adi',
        filters: [
          { key: 'teklif_no', label: 'Teklif no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'teklif_no', label: 'Teklif', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'teklif_no', label: 'Teklif no', code: true },
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'gecerlilik_tarihi', label: 'Geçerlilik', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'Iptal', 'Kapali'] },
          { key: 'aciklama', label: 'Açıklama', name: true },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'satin-alma-anlasmalari',
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
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'baslangic_tarihi', label: 'Başlangıç', type: 'date' },
          { key: 'bitis_tarihi', label: 'Bitiş', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kapali', 'Iptal'] },
          { key: 'aciklama', label: 'Açıklama', name: true },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'alis-faturalari',
        title: 'Alış Faturaları',
        endpoint: '/faturalar?fatura_turu=Alis',
        crud: true,
        numeratorSeri: 'ALIS_FATURA',
        codeField: 'fatura_no',
        nameField: 'cari_adi',
        filters: [
          { key: 'fatura_no', label: 'Fatura no' },
          { key: 'cari_adi', label: 'Cari' },
        ],
        columns: [
          { key: 'fatura_no', label: 'Fatura', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'fatura_turu', label: 'Tür' },
          { key: 'toplam_tutar', label: 'Tutar' },
        ],
        masterFields: [
          { key: 'fatura_no', label: 'Fatura no', code: true },
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'fatura_turu', label: 'Fatura türü', type: 'select', options: ['Alis', 'AlisIade'], required: true },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
        defaults: { fatura_turu: 'Alis' },
      },
      {
        id: 'satin-alma-talepleri',
        title: 'Satınalma Talepleri',
        endpoint: '/satin-alma-talepleri',
        crud: true,
        numeratorSeri: 'SATINALMA_TALEP',
        codeField: 'talep_no',
        nameField: 'aciklama',
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
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Acik', 'Onayli', 'SipariseDonustu', 'Iptal', 'Kapali'] },
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
        id: 'satin-alma-siparisleri',
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
          { key: 'cari_adi', label: 'Cari' },
          { key: 'talep_no', label: 'Talep', mono: true },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'siparis_no', label: 'Sipariş no', code: true },
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'KismiTeslim', 'Kapali', 'Iptal'] },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'mal-kabuller',
        title: 'Mal Kabuller',
        endpoint: '/mal-kabuller',
        crud: true,
        numeratorSeri: 'MAL_KABUL',
        codeField: 'kabul_no',
        nameField: 'siparis_no',
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
        masterFields: [
          { key: 'kabul_no', label: 'Kabul no', code: true },
          { key: 'siparis_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'siparis_no', required: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
    ],
  },
  {
    id: 'satis',
    title: 'Satış',
    screens: [
      {
        id: 'satis-siparisleri',
        title: 'Satış Siparişleri',
        endpoint: '/siparisler',
        crud: true,
        numeratorSeri: 'SATIS_SIPARIS',
        codeField: 'siparis_no',
        nameField: 'cari_adi',
        filters: [
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'siparis_turu', label: 'Tür' },
          { key: 'durum', label: 'Durum' },
          { key: 'toplam_tutar', label: 'Tutar' },
        ],
        masterFields: [
          { key: 'siparis_no', label: 'Sipariş no', code: true },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'siparis_turu', label: 'Sipariş türü', type: 'select', options: ['SatisSiparis', 'AlinanSiparis'], required: true },
          { key: 'siparis_tarihi', label: 'Tarih', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kismi', 'Kapali', 'Iptal'] },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
      },
      {
        id: 'satis-faturalari',
        title: 'Satış Faturaları',
        endpoint: '/faturalar',
        crud: true,
        numeratorSeri: 'FATURA',
        codeField: 'fatura_no',
        nameField: 'cari_adi',
        filters: [
          { key: 'fatura_no', label: 'Fatura no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'fatura_turu', label: 'Tür' },
        ],
        columns: [
          { key: 'fatura_no', label: 'Fatura', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'fatura_turu', label: 'Tür' },
          { key: 'toplam_tutar', label: 'Tutar' },
        ],
        masterFields: [
          { key: 'fatura_no', label: 'Fatura no', code: true },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'fatura_turu', label: 'Fatura türü', type: 'select', options: ['Satis', 'Iade'], required: true },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
      },
    ],
  },
  {
    id: 'finans',
    title: 'Finans',
    screens: [
      {
        id: 'hesap-plani',
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
    ],
  },

];


function normalizeScreen(raw, moduleId, moduleTitle) {
  const s = { ...raw, moduleId, moduleTitle };
  s.readOnly = s.id === 'depo-bakiye' || s.id === 'stok-hareketleri' || s.crud === false;
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

  // Tum formlar sol ic menu + master/detay duzeni kullanir
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
      s.formTabs = [
        { id: 'master', label: 'Master', kind: 'fields', fields: s.masterFields },
        {
          id: 'detay',
          label: 'Detay',
          kind: 'grid',
          key: s.detailKey || '_detail',
          slots: s.detailSlots,
          fields: s.detailFields,
        },
      ];
    } else {
      s.formTabs = [
        { id: 'master', label: 'Master', kind: 'fields', fields: s.masterFields },
      ];
    }
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

function screenApiBase(endpoint) {
  if (!endpoint) return endpoint;
  const q = endpoint.indexOf('?');
  return q >= 0 ? endpoint.slice(0, q) : endpoint;
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
  bar.innerHTML = state.openTabs.map((t) => {
    const isForm = t.kind === 'form';
    const kind = isForm ? (MODE_LABELS[t.formMode] || 'Form') : 'Liste';
    return `
    <button type="button" class="tab-item ${isForm ? 'tab-form' : 'tab-list'}${t.key === state.activeTabKey ? ' active' : ''}" data-tab-key="${t.key}" title="${t.title}">
      <span class="tab-kind">${kind}</span>
      <span class="tab-title">${t.title}</span>
      <span class="tab-close" data-tab-close-key="${t.key}" title="Sekmeyi kapat">×</span>
    </button>`;
  }).join('');
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

async function openScreen(id, opts = {}) {
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

    if (!opts.skipTab) addListTab(screen);
    else {
      state.activeTabKey = `list:${screen.id}`;
      renderTabBar();
    }
    showView('screen');
    $('#homeSearchWrap').hidden = true;
    $('#screenTitle').textContent = screen.title;
    const banner = $('#screenBanner');
    if (banner) banner.textContent = `${screen.title} açık · UI build 20261015a`;
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
  'olcu-birimleri': '/olcu-birimleri?aktif=true',
  firmalar: '/firmalar',
  'is-yerleri': '/is-yerleri',
  depolar: '/depolar',
  stoklar: '/stoklar',
  ulkeler: '/ulkeler?aktif=true',
  'is-merkezleri': '/is-merkezleri',
  'uretim-emirleri': '/uretim-emirleri',
  'satin-alma-siparisleri': '/satin-alma-siparisleri',
  'urun-agaclari': '/urun-agaclari?tip=hepsi',
  rotalar: '/rotalar?tip=hepsi',
  'cariler-musteri': '/cariler?tur=Musteri&aktif=true',
  'cariler-tedarikci': '/cariler?tur=Tedarikci&aktif=true',
  'kategoriler-abc': '/kategoriler?tip=ABC&aktif=true',
  'kategoriler-marka': '/kategoriler?tip=Marka&aktif=true',
  'kategoriler-temin': '/kategoriler?tip=TeminSekli&aktif=true',
  'kategoriler-sektor': '/kategoriler?tip=Sektor&aktif=true',
  'kategoriler-bolge': '/kategoriler?tip=Bolge&aktif=true',
  'muhasebe-hesaplari': '/muhasebe-hesaplari',
  siparisler: '/siparisler',
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
  (screen.formTabs || []).forEach((tab) => {
    collect(tab.fields);
    collect(tab.masterFields);
    collect(tab.detailFields);
    collect(tab.componentFields);
    if (tab.kind === 'bom-tree' || tab.kind === 'rota-flow') needed.add('stoklar');
  });
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

function emptyRowFromFields(fields) {
  const row = {};
  (fields || []).forEach((f) => {
    if (f.type === 'checkbox') row[f.key] = false;
    else row[f.key] = '';
  });
  return row;
}

/** Boş placeholder satır üretmez — yalnızca gerçek satırlar */
function normalizeGridRows(tab, rows) {
  const fields = tab.fields || [];
  return (Array.isArray(rows) ? rows : []).map((src) => {
    const row = emptyRowFromFields(fields);
    fields.forEach((f) => {
      if (f.type === 'checkbox') row[f.key] = Boolean(src?.[f.key]);
      else if (src?.[f.key] !== undefined && src?.[f.key] !== null) row[f.key] = src[f.key];
    });
    // nested children for rota etc.
    if (Array.isArray(src?.bilesenler)) row.bilesenler = src.bilesenler.map((b) => ({ ...b }));
    if (Array.isArray(src?.alt_satirlar)) row.alt_satirlar = src.alt_satirlar;
    Object.keys(src || {}).forEach((k) => {
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
  const hit = rows.find((r) => String(r[vk]) === String(value));
  if (!hit) return String(value);
  const ck = field.codeKey;
  const lk = field.labelKey || 'adi';
  return ck ? `${hit[ck] || ''} — ${hit[lk] || ''}` : `${hit[lk] || hit[vk]}`;
}

function stokLookupById(id) {
  const rows = state.lookupCache.stoklar || [];
  return rows.find((r) => String(r.id) === String(id)) || null;
}

function tipBadge(tip) {
  const t = tip || '';
  const cls = /mamul/i.test(t) && !/yarı|yari/i.test(t) ? 'tip-mamul'
    : /yarı|yari/i.test(t) ? 'tip-ym'
      : /ham/i.test(t) ? 'tip-hm' : 'tip-other';
  return `<span class="tip-badge ${cls}">${t || '—'}</span>`;
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
  if (Array.isArray(rec.agac) && rec.agac.length) {
    rec.satirlar = rec.agac.map((n) => ({ ...n }));
  } else if (Array.isArray(rec.satirlar)) {
    const hasNest = rec.satirlar.some((s) => Array.isArray(s.alt_satirlar) && s.alt_satirlar.length);
    const hasUst = rec.satirlar.some((s) => s.ust_satir_id);
    if (!hasNest && hasUst) rec.satirlar = buildBomTreeFromFlat(rec.satirlar);
    else {
      rec.satirlar = rec.satirlar.map((s) => ({
        ...s,
        alt_satirlar: Array.isArray(s.alt_satirlar) ? s.alt_satirlar : [],
      }));
    }
  } else {
    rec.satirlar = [];
  }
  return rec.satirlar;
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

function fieldShell(f, controlHtml) {
  const cls = ['field'];
  if (f.required) cls.push('required');
  if (f.type === 'lookup') cls.push('lookup');
  const req = f.required ? '<span class="req" title="Zorunlu">*</span>' : '';
  return `<div class="${cls.join(' ')}"><label>${f.label}${req}</label>${controlHtml}</div>`;
}

function renderMasterDetailPanel(tab, rec) {
  const mFields = tab.masterFields || [];
  const dFields = tab.detailFields || [];
  return `
    <div class="md-split">
      <section class="md-master" aria-label="Master alanlar">
        <div class="section-label">Master</div>
        <div class="form-tab-fields">
          ${mFields.map((f) => fieldShell(f, fieldControl(f, rec[f.key]))).join('')}
        </div>
      </section>
      <section class="md-detail" aria-label="Detay alanlar">
        <div class="section-label">Detay</div>
        <div class="md-detail-scroll">
          <div class="form-tab-fields">
            ${dFields.length
              ? dFields.map((f) => fieldShell(f, fieldControl(f, rec[f.key]))).join('')
              : '<div class="detail-empty">Bu bölümde ek alan yok.</div>'}
          </div>
        </div>
      </section>
    </div>`;
}

function renderGridToolbar(tabKey, { canEdit }) {
  if (!canEdit) {
    return `<div class="inline-toolbar"><span class="toolbar-hint">İnceleme — satıra tıklayarak bakın</span></div>`;
  }
  return `<div class="inline-toolbar" data-grid-toolbar="${tabKey}">
    <button type="button" class="btn action" data-grid-act="yeni" data-grid-key="${tabKey}">Yeni</button>
    <button type="button" class="btn action ghost" data-grid-act="duzelt" data-grid-key="${tabKey}">Düzelt</button>
    <button type="button" class="btn action danger" data-grid-act="sil" data-grid-key="${tabKey}">Sil</button>
    <span class="toolbar-hint">Önce satır seçin; Yeni boş satır ekler</span>
  </div>`;
}

function renderDynamicGrid(tab, rec) {
  const key = tab.key;
  const rows = normalizeGridRows(tab, Array.isArray(rec[key]) ? rec[key] : []);
  rec[key] = rows;
  const canEdit = state.formMode !== 'incele';
  const selIdx = state.gridSel.key === key ? state.gridSel.idx : null;

  if (!rows.length) {
    return `
      ${renderGridToolbar(key, { canEdit })}
      <div class="detail-empty">Henüz satır yok. ${canEdit ? 'Yeni ile ekleyin.' : ''}</div>`;
  }

  return `
    ${renderGridToolbar(key, { canEdit })}
    <div class="detail-grid detail-grid--dynamic" data-grid-list="${key}">
      ${rows.map((row, idx) => {
        const selected = selIdx === idx;
        const editing = canEdit && selected;
        return `
          <div class="detail-slot ${selected ? 'selected' : ''}" data-grid-row="${key}" data-grid-idx="${idx}">
            <div class="detail-slot-head">
              <button type="button" class="detail-slot-pick" data-grid-pick="${key}" data-grid-idx="${idx}">
                <span class="detail-slot-title">${idx + 1}. satır</span>
                <span class="detail-slot-summary">${gridRowSummary(tab, row)}</span>
              </button>
            </div>
            ${editing || (!canEdit && selected) ? `
              <div class="detail-slot-fields">
                ${(tab.fields || []).map((f) => fieldShell(f, detailFieldControl(f, row[f.key], idx, key))).join('')}
              </div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

function renderBomNode(node, path, depth) {
  const stok = stokLookupById(node.bilesen_stok_id);
  const kod = node.stok_kodu || stok?.stok_kodu || '';
  const adi = node.stok_adi || stok?.stok_adi || '';
  const tip = node.stok_tipi || stok?.stok_tipi || '';
  const kids = node.alt_satirlar || [];
  const forceOpen = state.treeExpanded[path] === true
    || (state.treeSel != null && String(state.treeSel).startsWith(`${path}.`));
  const selected = String(state.treeSel) === path;
  return `
    <div class="bom-node-wrap" style="--depth:${depth}">
      <button type="button" class="bom-node ${selected ? 'selected' : ''}" data-bom-path="${path}">
        <span class="bom-toggle" data-bom-toggle="${path}">${kids.length ? (forceOpen ? '▾' : '▸') : '·'}</span>
        ${tipBadge(tip)}
        <span class="bom-code mono">${kod || '—'}</span>
        <span class="bom-name">${adi || 'Bileşen seçin'}</span>
        <span class="bom-qty">${node.miktar ?? ''} ${node.birim || ''}</span>
        ${kids.length ? `<span class="bom-child-count">${kids.length} alt</span>` : ''}
      </button>
      ${forceOpen && kids.length ? `
        <div class="bom-children">
          ${kids.map((ch, i) => renderBomNode(ch, `${path}.${i}`, depth + 1)).join('')}
        </div>` : ''}
    </div>`;
}

function renderBomTree(tab, rec) {
  const nodes = ensureBomTree(rec);
  const canEdit = state.formMode !== 'incele';
  const mamul = stokLookupById(rec.mamul_stok_id);
  const selected = state.treeSel != null ? getBomNode(nodes, state.treeSel) : null;

  return `
    <div class="bom-layout">
      <div class="bom-tree-pane">
        <div class="inline-toolbar">
          ${canEdit ? `
            <button type="button" class="btn action" data-bom-act="yeni-kok">Yeni (kök altına)</button>
            <button type="button" class="btn action ghost" data-bom-act="yeni-alt">Yeni alt bileşen</button>
            <button type="button" class="btn action danger" data-bom-act="sil">Sil</button>
          ` : '<span class="toolbar-hint">Düğüme tıklayın — alt bileşenler açılır</span>'}
        </div>
        <div class="bom-tree" data-bom-tree>
          <div class="bom-root">
            ${tipBadge(mamul?.stok_tipi || 'Mamul')}
            <span class="bom-code mono">${mamul?.stok_kodu || rec.stok_kodu || '—'}</span>
            <span class="bom-name">${mamul?.stok_adi || rec.stok_adi || rec.agac_adi || 'Mamul seçin (Başlık sekmesi)'}</span>
          </div>
          ${nodes.length
            ? nodes.map((n, i) => renderBomNode(n, String(i), 0)).join('')
            : '<div class="detail-empty">Ağaç boş. Mamul altına bileşen ekleyin (yarı mamul / hammadde).</div>'}
        </div>
      </div>
      <div class="bom-editor-pane">
        <div class="section-label">${selected ? 'Seçili bileşen' : 'Bileşen detayı'}</div>
        ${selected ? `
          <div class="form-tab-fields" data-bom-editor>
            ${(tab.fields || []).map((f) => fieldShell(f, fieldControl(f, selected[f.key], 'data-bom-field'))).join('')}
          </div>
          <p class="toolbar-hint">Tıklanan düğümün alt bileşenleri ağaçta açılır. Yarı mamule alt hammadde eklemek için düğümü seçip «Yeni alt bileşen» kullanın.</p>
        ` : '<div class="detail-empty">Soldan bir bileşen seçin.</div>'}
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
  const selected = sel != null ? ops[sel] : null;

  const bySira = new Map(ops.map((o) => [Number(o.sira_no), o]));

  return `
    <div class="rota-layout">
      <div class="rota-flow-pane">
        <div class="inline-toolbar">
          ${canEdit ? `
            <button type="button" class="btn action" data-flow-act="yeni-op">Yeni operasyon</button>
            <button type="button" class="btn action danger" data-flow-act="sil-op">Sil</button>
          ` : '<span class="toolbar-hint">Operasyona tıklayın — önce/sonra ve bileşenler</span>'}
        </div>
        <div class="rota-flow">
          ${ops.length ? ops.map((op, idx) => {
            const prev = ops.filter((x) => Number(x.sira_no) < Number(op.sira_no)).pop();
            const next = op.sonraki_sira_no != null
              ? bySira.get(Number(op.sonraki_sira_no))
              : ops.find((x) => Number(x.sira_no) > Number(op.sira_no));
            const open = sel === idx;
            return `
              <button type="button" class="rota-op-card ${open ? 'selected' : ''}" data-flow-idx="${idx}">
                <div class="rota-op-seq">Sıra ${op.sira_no || '—'}</div>
                <div class="rota-op-title"><span class="mono">${op.operasyon_kodu || '—'}</span> ${op.operasyon_adi || ''}</div>
                <div class="rota-op-meta">
                  <span>← Önce: ${prev ? `${prev.operasyon_kodu} ${prev.operasyon_adi || ''}` : '— (ilk)'}</span>
                  <span>Sonra: ${next ? `${next.operasyon_kodu || ''} ${next.operasyon_adi || ''}` : '— (son)'} →</span>
                </div>
                <div class="rota-op-comp-count">${(op.bilesenler || []).length} bileşen</div>
              </button>
              ${idx < ops.length - 1 ? '<div class="rota-arrow">↓</div>' : ''}`;
          }).join('') : '<div class="detail-empty">Operasyon yok. Yeni operasyon ekleyin.</div>'}
        </div>
      </div>
      <div class="rota-editor-pane">
        ${selected ? `
          <div class="section-label">Operasyon</div>
          <div class="form-tab-fields" data-flow-editor>
            ${(tab.fields || []).map((f) => fieldShell(f, fieldControl(f, selected[f.key], 'data-flow-field'))).join('')}
          </div>
          <div class="section-label" style="margin-top:1rem">Bu operasyonun bileşenleri</div>
          <div class="inline-toolbar">
            ${canEdit ? `
              <button type="button" class="btn action" data-flow-act="yeni-comp">Yeni bileşen</button>
              <button type="button" class="btn action danger" data-flow-act="sil-comp">Sil bileşen</button>
            ` : ''}
          </div>
          <div class="detail-grid detail-grid--dynamic">
            ${(selected.bilesenler || []).length ? selected.bilesenler.map((b, ci) => {
              const st = stokLookupById(b.stok_id);
              const picked = state.flowCompSel === ci;
              return `
                <div class="detail-slot ${picked ? 'selected' : ''}" data-flow-comp="${ci}">
                  <button type="button" class="detail-slot-pick" data-flow-comp-pick="${ci}">
                    <span class="detail-slot-summary">${st ? `${st.stok_kodu} — ${st.stok_adi}` : (b.stok_id || '—')} · ${b.miktar ?? ''} ${b.birim || ''}</span>
                  </button>
                  ${picked && canEdit ? `
                    <div class="detail-slot-fields">
                      ${(tab.componentFields || []).map((f) => fieldShell(f, fieldControl(f, b[f.key], 'data-flow-comp-field'))).join('')}
                    </div>` : ''}
                </div>`;
            }).join('') : '<div class="detail-empty">Bu operasyonda bileşen yok.</div>'}
          </div>
        ` : '<div class="detail-empty">Soldan bir operasyon seçin — önceki/sonraki adım ve bileşenler burada.</div>'}
      </div>
    </div>`;
}

function renderForm(screen) {
  const readonly = state.formMode === 'incele';
  const rec = state.formRecord || {};
  $('#formModeBadge').textContent = MODE_LABELS[state.formMode] || state.formMode;
  $('#formScreenLabel').textContent = `${screen.title} · ${MODE_LABELS[state.formMode] || ''}`;
  $('#btnFormSave').hidden = readonly;

  const tabsLayout = $('#formTabsLayout');
  const classic = $('#formSplitClassic');
  if (classic) {
    classic.hidden = true;
    classic.style.display = 'none';
  }
  if (tabsLayout) {
    tabsLayout.hidden = false;
    tabsLayout.style.display = 'grid';
  }

  const tabs = screen.formTabs || [];
  if (!state.formActiveTab || !tabs.some((t) => t.id === state.formActiveTab)) {
    state.formActiveTab = tabs[0]?.id || null;
  }

  const nav = $('#formTabNav');
  const body = $('#formTabBody');
  if (!nav || !body) return;

  nav.innerHTML = tabs.map((tab) => `
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
      return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
        ${renderMasterDetailPanel(tab, rec)}
      </div>`;
    }
    if (tab.kind === 'grid') {
      return `<div class="form-tab-panel form-tab-panel--scroll" data-tab-panel="${tab.id}" ${hide}>
        ${renderDynamicGrid(tab, rec)}
      </div>`;
    }
    if (tab.kind === 'bom-tree') {
      return `<div class="form-tab-panel form-tab-panel--scroll" data-tab-panel="${tab.id}" ${hide}>
        ${renderBomTree(tab, rec)}
      </div>`;
    }
    if (tab.kind === 'rota-flow') {
      return `<div class="form-tab-panel form-tab-panel--scroll" data-tab-panel="${tab.id}" ${hide}>
        ${renderRotaFlow(tab, rec)}
      </div>`;
    }
    const masterLike = tab.id === 'master' || tab.id === 'ana' || tab.id === 'kart' || tab.id === 'baslik';
    return `<div class="form-tab-panel ${masterLike ? 'form-tab-panel--fixed' : 'form-tab-panel--scroll'}" data-tab-panel="${tab.id}" ${hide}>
      <div class="form-tab-fields">
        ${(tab.fields || []).map((f) => fieldShell(f, fieldControl(f, rec[f.key]))).join('')}
      </div>
    </div>`;
  }).join('');

  state.formRecord = rec;
}

function readFieldValue(el, field) {
  if (!el) return undefined;
  if (field.type === 'checkbox') return el.checked;
  if (field.type === 'number') return el.value === '' ? null : Number(el.value);
  if (field.type === 'lookup' && (field.valueKey === 'id' || /_id$/.test(field.key))) {
    return el.value === '' ? null : (Number.isNaN(Number(el.value)) ? el.value : Number(el.value));
  }
  return el.value;
}

function collectTabFields(screen) {
  const fields = [];
  (screen.formTabs || []).forEach((tab) => {
    if (tab.kind === 'fields') fields.push(...(tab.fields || []));
    if (tab.kind === 'master-detail') {
      fields.push(...(tab.masterFields || []));
      fields.push(...(tab.detailFields || []));
    }
  });
  return fields;
}

function readMasterFromForm(screen) {
  const out = { ...(state.formRecord || {}) };
  collectTabFields(screen).forEach((f) => {
    const el = document.querySelector(`[data-master="${f.key}"]`);
    if (!el) return;
    out[f.key] = readFieldValue(el, f);
  });
  return out;
}

function syncGridRowFromDom(tab, idx, baseRow = {}) {
  const row = { ...baseRow };
  let any = false;
  (tab.fields || []).forEach((f) => {
    const el = document.querySelector(`[data-detail="${f.key}"][data-didx="${idx}"][data-grid="${tab.key}"]`);
    if (!el) return;
    row[f.key] = readFieldValue(el, f);
    if (f.type === 'checkbox') { if (el.checked) any = true; }
    else if (el.value !== '') any = true;
  });
  return { row, any };
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
      if (k === 'bilesenler' || k === 'alt_satirlar') return false;
      const v = row[k];
      return v !== '' && v != null && v !== false;
    });
    if (hasContent) {
      if (Array.isArray(existing[idx]?.bilesenler)) row.bilesenler = existing[idx].bilesenler;
      rows.push(row);
    }
  }
  return rows;
}

function persistBomEditor(rec, tab) {
  if (state.treeSel == null) return;
  const nodes = ensureBomTree(rec);
  const node = getBomNode(nodes, state.treeSel);
  if (!node) return;
  (tab.fields || []).forEach((f) => {
    const el = document.querySelector(`[data-bom-field="${f.key}"]`);
    if (!el) return;
    node[f.key] = readFieldValue(el, f);
    // enrich display fields from lookup
    if (f.key === 'bilesen_stok_id') {
      const st = stokLookupById(node.bilesen_stok_id);
      if (st) {
        node.stok_kodu = st.stok_kodu;
        node.stok_adi = st.stok_adi;
        node.stok_tipi = st.stok_tipi;
      }
    }
  });
  if (!Array.isArray(node.alt_satirlar)) node.alt_satirlar = [];
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

function readTabbedPayload(screen) {
  const out = readMasterFromForm(screen);
  (screen.formTabs || []).forEach((tab) => {
    if (tab.kind === 'grid') out[tab.key] = readGridFromForm(tab);
    if (tab.kind === 'bom-tree') {
      persistBomEditor(out, tab);
      out.satirlar = ensureBomTree(out);
      out.agac = out.satirlar;
    }
    if (tab.kind === 'rota-flow') {
      persistFlowEditor(out, tab);
      out.operasyonlar = (out.operasyonlar || []).map((op) => ({
        ...op,
        bilesenler: (op.bilesenler || []).filter((b) => b.stok_id && b.miktar != null && b.miktar !== ''),
      }));
    }
  });
  return out;
}

function validateRequired(screen, payload) {
  for (const f of collectTabFields(screen)) {
    if (!f.required) continue;
    if (f.code && state.formMode === 'duzelt') continue;
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
  await ensureLookups(screen);
  showView('form');
  $('#homeSearchWrap').hidden = true;
  $('#screenTitle').textContent = tab.title;
  renderForm(screen);
  renderSidebar();
  renderTabBar();
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

  // Liste sekmesi yerinde kalsın; form yan (yeni) sekme olarak açılsın
  addListTab(screen, { activate: false });

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
      if (f.type === 'checkbox') record[f.key] = true;
      else if (f.type === 'select') record[f.key] = f.options?.[0] || '';
      else if (record[f.key] === undefined) record[f.key] = '';
    });
  };

  function initSpecialTabs(src) {
    (screen.formTabs || []).forEach((tab) => {
      if (tab.kind === 'grid') {
        const raw = Array.isArray(src[tab.key]) ? src[tab.key] : [];
        record[tab.key] = normalizeGridRows(tab, raw.map(({ id, ...rest }) => rest));
      }
      if (tab.kind === 'bom-tree') {
        record.satirlar = Array.isArray(src.agac) && src.agac.length
          ? src.agac
          : (Array.isArray(src.satirlar) ? src.satirlar : []);
        ensureBomTree(record);
      }
      if (tab.kind === 'rota-flow') {
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
    seedFields();
    const seri = resolveNumeratorSeri(screen, record);
    if (seri) {
      try { record[screen.codeField] = await ayirKod(seri); }
      catch (err) { toast(err.message); }
    }
    initSpecialTabs({});
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
    initSpecialTabs(full);
  } else {
    const full = await loadRecord(row.id);
    record = { ...full };
    initSpecialTabs(full);
  }

  if (screen.id === 'numarator-tanimi' && (mode === 'yeni' || mode === 'kopyala')) {
    record.son_numara = 0;
    record.aktif = true;
    if (mode === 'yeni') record.seri_kodu = '';
  }

  state.formRecord = record;
  addFormTab(screen, mode, record);
  showView('form');
  $('#homeSearchWrap').hidden = true;
  $('#screenTitle').textContent = `${screen.title} · ${MODE_LABELS[mode]}`;
  renderForm(screen);
  renderTabBar();
}

async function saveForm() {
  const screen = findScreen(state.screenId);
  if (!screen || state.formMode === 'incele') return;

  const master = readTabbedPayload(screen);
  const reqErr = validateRequired(screen, master);
  if (reqErr) {
    toast(reqErr);
    return;
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
      await api(screenApiBase(screen.endpoint), { method: 'POST', body: JSON.stringify(master) });
    }
    toast('Kaydedildi.');
    // form sekmesini kapat, listeye don
    const formKey = state.activeTabKey;
    state.formMode = null;
    state.formRecord = null;
    state.openTabs = state.openTabs.filter((t) => t.key !== formKey);
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
    await api(`${screenApiBase(screen.endpoint)}/${row.id}`, { method: 'DELETE' });
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
      if (e.detail >= 2) {
        openForm(screen?.readOnly ? 'incele' : 'duzelt').catch((err) => toast(err.message));
      }
      return;
    }

    const tabClose = e.target.closest('[data-tab-close-key]');
    if (tabClose) {
      e.preventDefault();
      e.stopPropagation();
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
    // Form sekmesini kapatma — liste sekmesine geç (yan sekmeler durur)
    persistActiveFormTab();
    const screenId = state.screenId;
    const listKey = screenId ? `list:${screenId}` : null;
    if (listKey && state.openTabs.some((t) => t.key === listKey)) {
      activateTab(listKey).catch((err) => toast(err.message));
    } else if (screenId) {
      openScreen(screenId);
    } else {
      showHome();
    }
  });

  $('#btnFormSave').addEventListener('click', () => {
    saveForm();
  });

  document.addEventListener('click', (e) => {
    const screen = findScreen(state.screenId);

    // --- Detay grid: seç / Yeni / Düzelt / Sil ---
    const gridAct = e.target.closest('[data-grid-act]');
    if (gridAct && screen) {
      e.preventDefault();
      e.stopPropagation();
      const key = gridAct.getAttribute('data-grid-key');
      const act = gridAct.getAttribute('data-grid-act');
      const tab = (screen.formTabs || []).find((t) => t.kind === 'grid' && t.key === key);
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
        rows.push(emptyRowFromFields(tab.fields));
        state.formRecord[key] = rows;
        state.gridSel = { key, idx: rows.length - 1 };
      } else if (act === 'duzelt') {
        if (state.gridSel.key !== key || state.gridSel.idx == null) {
          toast('Düzeltmek için önce bir satır seçin.');
          return;
        }
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
    const gridPick = e.target.closest('[data-grid-pick]');
    if (gridPick && screen) {
      e.preventDefault();
      e.stopPropagation();
      const key = gridPick.getAttribute('data-grid-pick');
      const tab = (screen.formTabs || []).find((t) => t.kind === 'grid' && t.key === key);
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
      const act = bomAct.getAttribute('data-bom-act');
      const tab = (screen.formTabs || []).find((t) => t.kind === 'bom-tree');
      if (!tab) return;
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      const nodes = ensureBomTree(state.formRecord);
      const blank = { ...emptyRowFromFields(tab.fields), alt_satirlar: [] };
      if (act === 'yeni-kok') {
        nodes.push(blank);
        state.treeSel = String(nodes.length - 1);
        state.treeExpanded[state.treeSel] = true;
      } else if (act === 'yeni-alt') {
        if (state.treeSel == null) {
          toast('Alt bileşen için önce üst düğümü (ör. yarı mamul) seçin.');
          return;
        }
        const parent = getBomNode(nodes, state.treeSel);
        if (!parent) return;
        if (!Array.isArray(parent.alt_satirlar)) parent.alt_satirlar = [];
        parent.alt_satirlar.push(blank);
        state.treeExpanded[state.treeSel] = true;
        state.treeSel = `${state.treeSel}.${parent.alt_satirlar.length - 1}`;
      } else if (act === 'sil') {
        if (state.treeSel == null) {
          toast('Silmek için düğüm seçin.');
          return;
        }
        removeBomNode(nodes, state.treeSel);
        state.treeSel = null;
      }
      state.formRecord.satirlar = nodes;
      renderForm(screen);
      return;
    }
    const bomToggle = e.target.closest('[data-bom-toggle]');
    if (bomToggle && screen) {
      e.preventDefault();
      e.stopPropagation();
      const path = bomToggle.getAttribute('data-bom-toggle');
      state.treeExpanded[path] = !state.treeExpanded[path];
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      renderForm(screen);
      return;
    }
    const bomNode = e.target.closest('[data-bom-path]');
    if (bomNode && screen) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      const path = bomNode.getAttribute('data-bom-path');
      state.treeSel = path;
      state.treeExpanded[path] = true;
      renderForm(screen);
      return;
    }

    // --- Rota akışı ---
    const flowAct = e.target.closest('[data-flow-act]');
    if (flowAct && screen) {
      e.preventDefault();
      const act = flowAct.getAttribute('data-flow-act');
      const tab = (screen.formTabs || []).find((t) => t.kind === 'rota-flow');
      if (!tab) return;
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
        const op = ops[state.flowSel];
        if (!op.bilesenler) op.bilesenler = [];
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
      renderForm(screen);
      return;
    }
    const flowIdx = e.target.closest('[data-flow-idx]');
    if (flowIdx && screen && !e.target.closest('[data-flow-act]')) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      state.flowSel = Number(flowIdx.getAttribute('data-flow-idx'));
      state.flowCompSel = null;
      renderForm(screen);
      return;
    }
    const flowCompPick = e.target.closest('[data-flow-comp-pick]');
    if (flowCompPick && screen) {
      e.preventDefault();
      state.formRecord = { ...state.formRecord, ...readTabbedPayload(screen) };
      state.flowCompSel = Number(flowCompPick.getAttribute('data-flow-comp-pick'));
      renderForm(screen);
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

function bootFromHash() {
  renderSidebar();
  bindEvents();
  const id = (location.hash || '').replace(/^#/, '');
  if (id && findScreen(id)) openScreen(id);
  else showHome();
}

bootFromHash();
