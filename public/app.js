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

      {
        id: 'hareket-kodlari',
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
      { id: 'gozlem', title: 'Gözlem', screenIds: ['audit-log'] },
    ],
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
        title: 'Audit Log',
        endpoint: '/audit-log',
        crud: false,
        readOnly: true,
        filters: [
          { key: 'tablo_adi', label: 'Tablo' },
          { key: 'kullanici_kodu', label: 'Kullanıcı' },
          { key: 'islem', label: 'İşlem' },
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
        id: 'eposta-gonderimleri',
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
    sections: [
      { id: 'kartlar', title: 'Kartlar', screenIds: ['stok-karti'] },
      { id: 'bakiye-hareket', title: 'Bakiye & Hareket', screenIds: ['depo-bakiye', 'stok-hareketleri', 'stok-partileri', 'stok-rezervasyonlari', 'stok-serileri', 'stok-ikame'] },
      { id: 'planlama', title: 'Planlama', screenIds: ['mrp-hesap'] },
    ],
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
              { key: 'stok_tipi', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'], required: true, lead: true },
              { key: 'stok_kodu', label: 'Stok kodu', code: true, required: true },
              { key: 'stok_adi', label: 'Stok adı', name: true, required: true },
              { key: 'stok_adi_2', label: 'Stok adı 2' },
              { key: 'uzun_stok_kodu', label: 'Uzun stok kodu' },
              { key: 'tedarik_tipi', label: 'Tedarik tipi', type: 'select', options: ['Satinalma', 'Uretim'] },
              { key: 'stok_takip_birimi', label: 'Stok takip birimi', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              { key: 'aciklama', label: 'Açıklama' },
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
              { key: 'parti_politika', label: 'Parti politikası', type: 'select', options: ['Takipsiz', 'IstegeBagli', 'Zorunlu'] },
              { key: 'kalite_kontrol_gerekli', label: 'Kalite kontrol gerekli', type: 'checkbox' },
              { key: 'varsayilan_giris_depo_id', label: 'Varsayılan giriş depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
              { key: 'varsayilan_cikis_depo_id', label: 'Varsayılan çıkış depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
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
          {
            id: 'mrp',
            label: 'MRP',
            kind: 'fields',
            fields: [
              { key: 'emniyet_stok', label: 'Emniyet stok (MRP)', type: 'number' },
              { key: 'maksimum_stok', label: 'Maksimum stok', type: 'number' },
            ],
          },
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
          { key: 'stok_statu', label: 'Stok statü' },
          { key: 'parti_no', label: 'Parti no' },
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
          { key: 'kullanilabilir', label: 'Kullanılabilir', mono: true },
          { key: 'emniyet_stok', label: 'Emniyet' },
        ],
      },
      {
        id: 'stok-hareketleri',
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
        id: 'stok-partileri',
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
        id: 'mrp-hesap',
        title: 'MRP Hesap',
        endpoint: '/mrp',
        crud: false,
        readOnly: true,
        mrpTalepAction: true,
        filters: [
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'oneri', label: 'Öneri' },
        ],
        columns: [
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'emniyet_stok', label: 'Emniyet' },
          { key: 'kullanilabilir_stok', label: 'Kullanılabilir' },
          { key: 'acik_uretim_ihtiyaci', label: 'UE ihtiyaç' },
          { key: 'acik_satinalma', label: 'Açık SA' },
          { key: 'net_ihtiyac', label: 'Net ihtiyaç' },
          { key: 'oneri', label: 'Öneri' },
        ],
      },
      {
        id: 'stok-rezervasyonlari',
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
              { key: 'cari_turu', label: 'Müşteri tipi', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'], required: true, lead: true },
              { key: 'cari_kodu', label: 'Cari kodu', code: true, required: true },
              { key: 'cari_adi', label: 'Cari adı', name: true, required: true },
              { key: 'aciklama', label: 'Açıklama' },
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
      {
        id: 'cari-ekstre',
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
      { id: 'urun-agaci', title: 'Ürün Ağacı', screenIds: ['urun-agaci', 'bom-seviye-listesi', 'bom-malzeme-degisikligi'] },
      { id: 'is-emri', title: 'İş Emri', screenIds: ['uretim-emirleri', 'siparis-is-emri', 'toplu-is-emri', 'uretim-girisleri'] },
      { id: 'depo', title: 'Depo', screenIds: ['stok-depo'] },
      { id: 'tanimlar', title: 'Tanımlar', screenIds: ['sinif-tanimi', 'is-merkezleri', 'rotalar', 'uretim-emri-tipleri'] },
    ],
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
          { key: 'gecerlilik_bitis', label: 'Geç. bitiş' },
        ],
        masterFields: [
          { key: 'agac_kodu', label: 'Kod', code: true, required: true },
          { key: 'agac_adi', label: 'Ad', name: true, required: true },
          { key: 'mamul_stok_id', label: 'Kök stok (Mamul)', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
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
            id: 'baslik', label: 'Ağaç Başlık', kind: 'fields',
            fields: [
              { key: 'agac_kodu', label: 'Kod', code: true, required: true },
              { key: 'agac_adi', label: 'Ad', name: true, required: true },
              { key: 'mamul_stok_id', label: 'Kök stok (Mamul)', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
              { key: 'miktar', label: 'Miktar', type: 'number' },
              { key: 'gecerlilik_baslangic', label: 'Geçerlilik baş.', type: 'date' },
              { key: 'gecerlilik_bitis', label: 'Geçerlilik bitiş', type: 'date' },
              { key: 'min_miktar', label: 'Min miktar', type: 'number' },
              { key: 'max_miktar', label: 'Max miktar', type: 'number' },
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
          { key: 'varsayilan', label: 'Varsayılan' },
          { key: 'sablon', label: 'Şablon' },
        ],
        masterFields: [
          { key: 'rota_kodu', label: 'Kod', code: true, required: true },
          { key: 'rota_adi', label: 'Ad', name: true, required: true },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
          { key: 'sablon', label: 'Şablon', type: 'checkbox' },
          { key: 'gecerlilik_baslangic', label: 'Geçerlilik baş.', type: 'date' },
          { key: 'gecerlilik_bitis', label: 'Geçerlilik bitiş', type: 'date' },
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
              { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
              { key: 'sablon', label: 'Şablon', type: 'checkbox' },
              { key: 'gecerlilik_baslangic', label: 'Geçerlilik baş.', type: 'date' },
              { key: 'gecerlilik_bitis', label: 'Geçerlilik bitiş', type: 'date' },
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
        id: 'uretim-emri-tipleri',
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
        id: 'uretim-emirleri',
        title: 'Üretim Emirleri',
        endpoint: '/uretim-emirleri',
        crud: true,
        numeratorSeri: 'URETIM_EMRI',
        codeField: 'emir_no',
        nameField: 'stok_kodu',
        approveAction: { label: 'Onayla', path: '/uretim-emirleri/{id}/onayla' },
        filters: [
          { key: 'emir_no', label: 'Emir no' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'emir_tipi_kodu', label: 'Tip' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'emir_tipi_kodu', label: 'Tip', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'planlanan_miktar', label: 'Plan' },
          { key: 'uretilen_miktar', label: 'Üretilen' },
          { key: 'planli_kesin', label: 'P/K' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'emir_no', label: 'Emir no', code: true },
          { key: 'emir_tipi_id', label: 'Emir tipi', type: 'lookup', lookup: 'uretim-emri-tipleri', valueKey: 'id', labelKey: 'tip_adi', codeKey: 'tip_kodu' },
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu', required: true },
          { key: 'urun_agaci_id', label: 'Ürün ağacı', type: 'lookup', lookup: 'urun-agaclari', valueKey: 'id', labelKey: 'agac_adi', codeKey: 'agac_kodu', required: true },
          { key: 'rota_id', label: 'Rota', type: 'lookup', lookup: 'rotalar', valueKey: 'id', labelKey: 'rota_adi', codeKey: 'rota_kodu', required: true },
          { key: 'siparis_id', label: 'Satış siparişi', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', codeKey: 'siparis_no' },
          { key: 'planlanan_miktar', label: 'Planlanan miktar', type: 'number', required: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'hammadde_depo_id', label: 'Hammadde depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'yari_mamul_depo_id', label: 'Yarı mamul depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'mamul_depo_id', label: 'Mamul depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'planli_kesin', label: 'Planlı/Kesin', type: 'select', options: ['Kesin', 'Planli'] },
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
        id: 'siparis-is-emri',
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
      { id: 'teklif', title: 'Teklif', screenIds: ['satin-alma-teklif-istekleri', 'satin-alma-teklifleri', 'satin-alma-anlasmalari'] },
      { id: 'siparis', title: 'Sipariş', screenIds: ['satin-alma-talepleri', 'satin-alma-siparisleri'] },
      { id: 'mal-kabul', title: 'Mal Kabul', screenIds: ['mal-kabuller'] },
      { id: 'faturalar', title: 'Faturalar', screenIds: ['alis-faturalari'] },
    ],
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
        convertAction: {
          label: 'Siparişe Dönüştür',
          path: '/satin-alma-teklifleri/{id}/siparise-donustur',
        },
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
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'SipariseDonustu', 'Iptal', 'Kapali'] },
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
          { key: 'mal_kabul_id', label: 'Mal kabul', type: 'lookup', lookup: 'mal-kabuller', valueKey: 'id', labelKey: 'kabul_no' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'AcikHesap'] },
          { key: 'odeme_durumu', label: 'Ödeme durumu', type: 'select', options: ['Odenmedi', 'Kismi', 'Odendi', 'Iptal'] },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'not_public', label: 'Not' },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
        defaults: { fatura_turu: 'Alis', para_birimi: 'TRY', kur: 1 },
      },
      {
        id: 'satin-alma-talepleri',
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
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'tedarikci_cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu' },
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
          { key: 'cari_id', label: 'Tedarikçi', type: 'lookup', lookup: 'cariler-tedarikci', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'siparis_tarihi', label: 'Sipariş tarihi', type: 'date' },
          { key: 'teslim_tarihi', label: 'Teslim tarihi', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'KismiTeslim', 'Kapali', 'Iptal'] },
          { key: 'para_birimi', label: 'Para birimi' },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'AcikHesap'] },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'not_public', label: 'Tedarikçi notu' },
          { key: 'not_internal', label: 'Dahili not' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'iskonto_oran', label: 'İskonto %', type: 'number' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'teslim_tarihi', label: 'Teslim', type: 'date' },
          { key: 'giren_miktar', label: 'Giren', type: 'number' },
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
        convertAction: {
          label: 'Alış Faturası Oluştur',
          path: '/mal-kabuller/{id}/fatura-olustur',
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
          { key: 'siparis_id', label: 'Satınalma siparişi', type: 'lookup', lookup: 'satin-alma-siparisleri', valueKey: 'id', labelKey: 'siparis_no', required: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'kabul_tarihi', label: 'Kabul tarihi', type: 'date' },
          { key: 'irsaliye_no_tedarikci', label: 'Tedarikçi irsaliye no' },
          { key: 'irsaliye_tarihi', label: 'İrsaliye tarihi', type: 'date' },
          { key: 'fatura_no_tedarikci', label: 'Tedarikçi fatura no' },
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
          { key: 'durum', label: 'Durum' },
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
        defaults: { musteri_tipi: 'Musteri', para_birimi: 'TRY', ulke: 'Türkiye' },
      },
      {
        id: 'crm-faaliyet-planlari',
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
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'firsat_id', label: 'Fırsat', type: 'lookup', lookup: 'crm-firsatlar', valueKey: 'id', labelKey: 'firsat_adi', codeKey: 'firsat_kodu' },
          { key: 'aday_id', label: 'Aday', type: 'lookup', lookup: 'crm-adaylar', valueKey: 'id', labelKey: 'aday_adi', codeKey: 'aday_kodu' },
          { key: 'teklif_tarihi', label: 'Teklif tarihi', type: 'date' },
          { key: 'gecerlilik_tarihi', label: 'Geçerlilik', type: 'date' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'SipariseDonustu', 'Red', 'Iptal', 'Kapali'] },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-teklif', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'iskonto_oran', label: 'İskonto %', type: 'number' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'satis-siparisleri',
        title: 'Satış Siparişleri',
        endpoint: '/siparisler',
        crud: true,
        numeratorSeri: 'SATIS_SIPARIS',
        codeField: 'siparis_no',
        nameField: 'cari_adi',
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
        masterFields: [
          { key: 'siparis_no', label: 'Sipariş no', code: true },
          { key: 'musteri_siparis_no', label: 'Müşteri sipariş no' },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'siparis_turu', label: 'Sipariş türü', type: 'select', options: ['SatisSiparis', 'AlinanSiparis'], required: true },
          { key: 'siparis_tarihi', label: 'Sipariş tarihi', type: 'date' },
          { key: 'teslim_tarihi', label: 'Teslim tarihi', type: 'date' },
          { key: 'gecerlilik_tarihi', label: 'Geçerlilik', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'Kismi', 'Kapali', 'Iptal'] },
          { key: 'para_birimi', label: 'Para birimi' },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'iskonto_oran', label: 'İskonto %', type: 'number' },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'KrediKarti', 'AcikHesap'] },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'fiyat_liste_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'liste_adi', codeKey: 'liste_kodu' },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'sevk_adresi', label: 'Sevk adresi' },
          { key: 'sevk_il', label: 'Sevk il' },
          { key: 'sevk_ilce', label: 'Sevk ilçe' },
          { key: 'sevk_ulke', label: 'Sevk ülke' },
          { key: 'sevk_posta_kodu', label: 'Posta kodu' },
          { key: 'not_public', label: 'Müşteri notu' },
          { key: 'not_internal', label: 'Dahili not' },
          { key: 'siparis_kaynak', label: 'Kaynak', type: 'select', options: ['Manuel', 'Teklif', 'Web', 'EDI', 'CRM'] },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-siparis', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Satır açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'iskonto_oran', label: 'İskonto %', type: 'number' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number' },
          { key: 'teslim_tarihi', label: 'Teslim', type: 'date' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'sevk_edilen_miktar', label: 'Sevk edilen', type: 'number' },
          { key: 'fatura_edilen_miktar', label: 'Faturalanan', type: 'number' },
          { key: 'rezerve_miktar', label: 'Rezerve', type: 'number' },
          { key: 'bekleyen_miktar', label: 'Bekleyen', type: 'number' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
      },
      {
        id: 'sevk-emirleri',
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
          { key: 'siparis_id', label: 'Satış siparişi', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no', required: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'sevk_tarihi', label: 'Sevk tarihi', type: 'date' },
          { key: 'planlanan_sevk_tarihi', label: 'Planlanan sevk', type: 'date' },
          { key: 'oncelik', label: 'Öncelik', type: 'select', options: ['Dusuk', 'Normal', 'Yuksek', 'Acil'] },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'IrsaliyeDonustu', 'Iptal', 'Kapali'] },
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
          { key: 'not_internal', label: 'Dahili not' },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-sevk', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'parti_id', label: 'Parti', type: 'lookup', lookup: 'stok-partileri', valueKey: 'id', labelKey: 'parti_no' },
          { key: 'seri_no', label: 'Seri no' },
          { key: 'raf_kodu', label: 'Raf' },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
      },
      {
        id: 'irsaliyeler',
        title: 'İrsaliyeler',
        endpoint: '/irsaliyeler',
        crud: true,
        numeratorSeri: 'IRSALIYE',
        codeField: 'irsaliye_no',
        nameField: 'cari_adi',
        convertAction: {
          label: 'Fatura Oluştur',
          path: '/irsaliyeler/{id}/fatura-olustur',
          nested: { screenId: 'satis-faturalari', link: 'irsaliye-fatura' },
        },
        approveAction: { label: 'Onayla (Stok Çıkış)', path: '/irsaliyeler/{id}/onayla', dialog: 'onay-depo' },
        filters: [
          { key: 'irsaliye_no', label: 'İrsaliye no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'irsaliye_no', label: 'İrsaliye', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'irsaliye_tarihi', label: 'İrs. tar.' },
          { key: 'sevk_tarihi', label: 'Sevk tar.' },
          { key: 'arac_plaka', label: 'Plaka' },
          { key: 'tasiyici_unvan', label: 'Taşıyıcı' },
          { key: 'ara_toplam', label: 'Ara top.' },
          { key: 'genel_toplam', label: 'Genel' },
          { key: 'kaynak_belge_tipi', label: 'Kaynak' },
          { key: 'iade_mi', label: 'İade' },
          { key: 'durum', label: 'Durum' },
        ],
        masterFields: [
          { key: 'irsaliye_no', label: 'İrsaliye no', code: true },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
          { key: 'siparis_id', label: 'Sipariş', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no' },
          { key: 'sevk_emri_id', label: 'Sevk emri', type: 'lookup', lookup: 'sevk-emirleri', valueKey: 'id', labelKey: 'sevk_no' },
          { key: 'kaynak_belge_tipi', label: 'Kaynak belge tipi' },
          { key: 'kaynak_belge_id', label: 'Kaynak belge id', type: 'number' },
          { key: 'senaryo', label: 'Senaryo', type: 'select', options: ['TEMELIRSALIYE'] },
          { key: 'irsaliye_tipi', label: 'İrsaliye tipi', type: 'select', options: ['SEVK'] },
          { key: 'irsaliye_tarihi', label: 'İrsaliye tarihi', type: 'date' },
          { key: 'sevk_tarihi', label: 'Sevk tarihi', type: 'date' },
          { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'FaturayaDonustu', 'Iptal', 'Kapali'] },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Stok', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'iskonto_oran', label: 'İskonto %', type: 'number' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number' },
          { key: 'parti_no', label: 'Parti' },
          { key: 'seri_no', label: 'Seri' },
          { key: 'raf_kodu', label: 'Raf' },
          { key: 'stok_statu', label: 'Statü', type: 'select', options: ['Kullanilabilir', 'Kalitede', 'Bloke'] },
        ],
        detailKey: 'satirlar',
        detailSlots: 5,
        detailAsFields: false,
        // Tek ekran: başlık+sevk üstte, kalemler altta
        formTabs: [
          {
            id: 'kart',
            label: 'İrsaliye',
            kind: 'master-grid',
            masterFields: [
              { key: 'irsaliye_no', label: 'İrsaliye no', code: true },
              { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
              { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu', required: true },
              { key: 'siparis_id', label: 'Sipariş', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no' },
              { key: 'sevk_emri_id', label: 'Sevk emri', type: 'lookup', lookup: 'sevk-emirleri', valueKey: 'id', labelKey: 'sevk_no' },
              { key: 'kaynak_belge_tipi', label: 'Kaynak belge tipi' },
              { key: 'kaynak_belge_id', label: 'Kaynak belge id', type: 'number' },
              { key: 'senaryo', label: 'Senaryo', type: 'select', options: ['TEMELIRSALIYE'] },
              { key: 'irsaliye_tipi', label: 'Tip', type: 'select', options: ['SEVK'] },
              { key: 'irsaliye_tarihi', label: 'İrsaliye tarihi', type: 'date' },
              { key: 'sevk_tarihi', label: 'Sevk tarihi', type: 'date' },
              { key: 'durum', label: 'Durum', type: 'select', options: ['Taslak', 'Onayli', 'FaturayaDonustu', 'Iptal', 'Kapali'] },
              { key: 'ettn', label: 'ETTN' },
              { key: 'sevk_adresi', label: 'Sevk adresi' },
              { key: 'sevk_il', label: 'İl' },
              { key: 'sevk_ilce', label: 'İlçe' },
              { key: 'sevk_ulke', label: 'Ülke' },
              { key: 'sevk_posta_kodu', label: 'Posta kodu' },
              { key: 'arac_plaka', label: 'Araç plaka' },
              { key: 'dorse_plaka', label: 'Dorse plaka' },
              { key: 'sofor_adi', label: 'Şoför adı' },
              { key: 'sofor_soyadi', label: 'Şoför soyadı' },
              { key: 'sofor_tckn', label: 'Şoför TCKN' },
              { key: 'tasiyici_unvan', label: 'Taşıyıcı ünvan' },
              { key: 'tasiyici_vkn', label: 'Taşıyıcı VKN' },
              { key: 'aciklama', label: 'Açıklama' },
              { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-irsaliye', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu' },
            ],
            grid: {
              key: 'satirlar',
              slots: 5,
              fields: [
                { key: 'stok_id', label: 'Malzeme', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
                { key: 'miktar', label: 'Miktar', type: 'number' },
                { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
              ],
            },
          },
        ],
      },
      {
        id: 'satis-faturalari',
        title: 'Satış Faturaları',
        endpoint: '/faturalar?fatura_turu=Satis',
        crud: true,
        numeratorSeri: 'FATURA',
        codeField: 'fatura_no',
        nameField: 'cari_adi',
        convertAction: { label: 'Muhasebeleştir', path: '/faturalar/{id}/muhasebelestir' },
        filters: [
          { key: 'fatura_no', label: 'Fatura no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'fatura_turu', label: 'Tür' },
        ],
        columns: [
          { key: 'fatura_no', label: 'Fatura', mono: true },
          { key: 'musteri_fatura_no', label: 'Müş. ref', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'fatura_tarihi', label: 'Tarih' },
          { key: 'vade_tarihi', label: 'Vade' },
          { key: 'senaryo', label: 'Senaryo' },
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
          { key: 'fatura_no', label: 'Fatura no', code: true },
          { key: 'musteri_fatura_no', label: 'Müşteri fatura ref' },
          { key: 'cari_id', label: 'Müşteri', type: 'lookup', lookup: 'cariler-musteri', valueKey: 'id', labelKey: 'cari_adi', codeKey: 'cari_kodu', required: true },
          { key: 'fatura_turu', label: 'Fatura türü', type: 'select', options: ['Satis', 'Iade'], required: true },
          { key: 'senaryo', label: 'Senaryo', type: 'select', options: ['TICARIFATURA', 'TEMELFATURA'] },
          { key: 'fatura_tipi', label: 'Fatura tipi', type: 'select', options: ['SATIS', 'IADE'] },
          { key: 'fatura_tarihi', label: 'Fatura tarihi', type: 'date' },
          { key: 'vade_tarihi', label: 'Vade tarihi', type: 'date' },
          { key: 'irsaliye_id', label: 'İrsaliye', type: 'lookup', lookup: 'irsaliyeler', valueKey: 'id', labelKey: 'irsaliye_no' },
          { key: 'siparis_id', label: 'Sipariş', type: 'lookup', lookup: 'siparisler', valueKey: 'id', labelKey: 'siparis_no' },
          { key: 'para_birimi', label: 'PB' },
          { key: 'kur', label: 'Kur', type: 'number' },
          { key: 'odeme_kosulu', label: 'Ödeme koşulu' },
          { key: 'odeme_sekli', label: 'Ödeme şekli', type: 'select', options: ['Nakit', 'Havale', 'Cek', 'KrediKarti', 'AcikHesap'] },
          { key: 'odeme_durumu', label: 'Ödeme durumu', type: 'select', options: ['Odenmedi', 'Kismi', 'Odendi', 'Iptal'] },
          { key: 'odeme_vadesi_gun', label: 'Vade (gün)', type: 'number' },
          { key: 'proje_kodu', label: 'Proje kodu' },
          { key: 'firma_id', label: 'Firma', type: 'lookup', lookup: 'firmalar', valueKey: 'id', labelKey: 'firma_adi', codeKey: 'firma_kodu' },
          { key: 'is_yeri_id', label: 'İş yeri', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'is_yeri_adi', codeKey: 'is_yeri_kodu' },
          { key: 'fiyat_liste_id', label: 'Fiyat listesi', type: 'lookup', lookup: 'fiyat-listeleri', valueKey: 'id', labelKey: 'liste_adi', codeKey: 'liste_kodu' },
          { key: 'sevk_adresi', label: 'Sevk adresi' },
          { key: 'not_public', label: 'Müşteri notu' },
          { key: 'not_internal', label: 'Dahili not' },
          { key: 'ettn', label: 'ETTN' },
          { key: 'hareket_kodu_id', label: 'Hareket kodu', type: 'lookup', lookup: 'hareket-kodlari-fatura', valueKey: 'id', labelKey: 'hareket_adi', codeKey: 'hareket_kodu' },
        ],
        detailFields: [
          { key: 'stok_id', label: 'Ürün', type: 'lookup', lookup: 'stoklar', valueKey: 'id', labelKey: 'stok_adi', codeKey: 'stok_kodu' },
          { key: 'satir_aciklama', label: 'Açıklama' },
          { key: 'miktar', label: 'Miktar', type: 'number' },
          { key: 'birim', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'birim_kodu', labelKey: 'birim_adi' },
          { key: 'birim_fiyat', label: 'Birim fiyat', type: 'number' },
          { key: 'iskonto_oran', label: 'İskonto %', type: 'number' },
          { key: 'kdv_oran', label: 'KDV %', type: 'number' },
          { key: 'maliyet_birim', label: 'Maliyet', type: 'number' },
          { key: 'depo_id', label: 'Depo', type: 'lookup', lookup: 'depolar', valueKey: 'id', labelKey: 'depo_adi', codeKey: 'depo_kodu' },
          { key: 'seri_no', label: 'Seri no' },
        ],
        detailKey: 'kalemler',
        detailSlots: 5,
        defaults: { fatura_turu: 'Satis', senaryo: 'TICARIFATURA', fatura_tipi: 'SATIS', para_birimi: 'TRY' },
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
      {
        id: 'hesap-belirleme-kurallari',
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
          { key: 'fiyat_fark', label: 'Fiyat fark' },
          { key: 'miktar_fark', label: 'Miktar fark' },
          { key: 'sonuc', label: 'Sonuç' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
      },
      {
        id: 'kokpit',
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
  const screens = (mod.screens || []).filter((s) => s && s.id);
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
  session: null,
  firmalar: [],
  activeFirmaId: null,
};

/** Bağlı ekran ön doldurma haritası */
function buildLinkedPrefill(link, sourceRec, extra = {}) {
  if (link === 'teklif-siparis') {
    return {
      cari_id: sourceRec.cari_id,
      siparis_turu: 'SatisSiparis',
      durum: 'Onayli',
      para_birimi: sourceRec.para_birimi || 'TRY',
      teklif_id: sourceRec.id,
      kaynak_belge_tipi: 'SATIS_TEKLIF',
      kaynak_belge_id: sourceRec.id,
      aciklama: `Teklif ${sourceRec.teklif_no || sourceRec.id}`,
      kalemler: (sourceRec.satirlar || sourceRec.kalemler || []).map((s, i) => ({
        sira_no: s.sira_no || i + 1,
        stok_id: s.stok_id,
        miktar: s.miktar,
        birim_fiyat: s.birim_fiyat,
        stok_birimi: s.birim,
        iskonto_oran: s.iskonto_oran,
        kdv_oran: s.kdv_oran,
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
      sevk_ulke: sourceRec.sevk_ulke || 'Türkiye',
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
    if (f.type === 'checkbox') record[f.key] = true;
    else if (f.type === 'select') record[f.key] = f.options?.[0] || '';
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
  $('#homeSearchWrap').hidden = true;
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
  if (_cvtResolve) {
    const r = _cvtResolve;
    _cvtResolve = null;
    r(value);
  }
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
  } else {
    return {};
  }

  overlay.hidden = false;

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
    okBtn.onclick = () => {
      if (dialog === 'firsat-kapat') {
        const sonuc = $('#cvtFirsatSonuc')?.value || 'Kazanildi';
        closeConvertDialog({
          sonuc,
          kapanis_nedeni: $('#cvtFirsatNeden')?.value || null,
        });
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

function compareValues(cell, op, a, b) {
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
    .map((f) => ({ def: f, st: state.filterState[f.key] || { op: 'icerir', a: '', b: '' } }))
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

function modulYetkiliMi(modId) {
  const mods = state.session?.modul_yetkileri;
  if (!mods || !mods.length || mods.includes('*')) return true;
  return mods.includes(modId);
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
        const screensHtml = sec.screens.map((s) => `
          <button type="button" class="mod-item${state.screenId === s.id ? ' active' : ''}" data-screen="${s.id}">
            ${escapeHtml(s.title)}
          </button>`).join('');
        return `<div class="mod-section mod-section--flat">${screensHtml}</div>`;
      }
      if (state.sidebarSectionOpen[secKey] === undefined) {
        state.sidebarSectionOpen[secKey] = true;
      }
      const isOpen = Boolean(state.sidebarSectionOpen[secKey]);
      const screensHtml = sec.screens.map((s) => `
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
  $('#homeSearchWrap').hidden = false;
  const title = $('#screenTitle');
  if (title) {
    title.hidden = true;
    title.textContent = '';
  }
  $('#screenSearch').value = '';
  $('#searchResults').hidden = true;
  renderSidebar();
  renderTabBar();
}

function renderFirmaPicker() {
  const nameEl = $('#firmaPickerName');
  const menu = $('#firmaPickerMenu');
  if (!nameEl || !menu) return;
  const aktif = state.firmalar.find((f) => Number(f.id) === Number(state.activeFirmaId));
  nameEl.textContent = aktif ? aktif.firma_adi : (state.firmalar[0]?.firma_adi || 'Firma seçin');
  menu.innerHTML = state.firmalar.map((f) => `
    <li role="option">
      <button type="button" class="firma-picker-item ${Number(f.id) === Number(state.activeFirmaId) ? 'active' : ''}"
        data-firma-id="${f.id}">
        <span class="firma-kod">${f.firma_kodu || ''}</span>
        <span class="firma-adi">${f.firma_adi || ''}</span>
      </button>
    </li>`).join('');
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
  toast(`Aktif firma: ${state.firmalar.find((f) => Number(f.id) === id)?.firma_adi || id}`);
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
  renderFirmaPicker();
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
    const st = state.filterState[f.key] || { op: 'icerir', a: '', b: '' };
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

/** Tüm listelerde ilk sütun: satır ID (ekran kolonlarında yoksa eklenir). */
function listColumns(screen) {
  const cols = (screen.columns || []).filter((c) => c.key !== 'id');
  return [{ key: 'id', label: 'ID', mono: true }, ...cols];
}

function cellHtml(col, row, index = 0) {
  let val = col.key === 'id' ? rowKey(row, index) : row[col.key];
  if (typeof val === 'boolean') val = val ? 'Evet' : 'Hayır';
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

function updateActionButtons(screen) {
  const hasSel = Boolean(state.selectedId);
  document.querySelectorAll('#actionBar [data-action]').forEach((btn) => {
    const act = btn.dataset.action;
    if (screen.readOnly) {
      btn.disabled = act !== 'incele' || !hasSel;
      return;
    }
    if (act === 'yeni') btn.disabled = false;
    else if (act === 'export-csv') btn.disabled = false;
    else if (act === 'mrp-talep') {
      btn.hidden = !screen.mrpTalepAction;
      btn.disabled = false;
    } else btn.disabled = !hasSel;
  });
  const mrpBtn = $('#btnMrpTalep');
  if (mrpBtn) mrpBtn.hidden = !screen.mrpTalepAction;
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
    state.listCategory = screen.listCategories?.[0]?.id || null;
    state.filterState = {};
    (screen.filters || []).forEach((f) => {
      state.filterState[f.key] = { op: 'icerir', a: '', b: '' };
    });
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
    $('#homeSearchWrap').hidden = true;
    {
      const title = $('#screenTitle');
      if (title) { title.hidden = false; title.textContent = screen.title; }
    }
    const banner = $('#screenBanner');
    if (banner) banner.textContent = `${screen.title} açık · UI build 20261016j`;
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

    const data = await api(screen.endpoint);
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
  stoklar: '/stoklar',
  ulkeler: '/ulkeler?aktif=true',
  'is-merkezleri': '/is-merkezleri',
  'uretim-emirleri': '/uretim-emirleri',
  'uretim-emri-tipleri': '/uretim-emri-tipleri?aktif=true',
  'stok-depo': '/stok-depo?aktif=true',
  'crm-adaylar': '/crm-adaylar?aktif=true',
  'crm-firsatlar': '/crm-firsatlar?durum=Acik',
  'crm-firsat-asamalari': '/crm-firsat-asamalari?aktif=true',
  'crm-faaliyet-tipleri': '/crm-faaliyet-tipleri?aktif=true',
  'crm-kontaklar': '/crm-kontaklar?aktif=true',
  kisiler: '/kisiler',
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
  'sevk-emirleri': '/sevk-emirleri',
  irsaliyeler: '/irsaliyeler',
  'hareket-kodlari': '/hareket-kodlari?aktif=true',
  'hareket-kodlari-teklif': '/hareket-kodlari?belge_tipi=SatisTeklif&aktif=true',
  'hareket-kodlari-siparis': '/hareket-kodlari?belge_tipi=SatisSiparis&aktif=true',
  'hareket-kodlari-sevk': '/hareket-kodlari?belge_tipi=SevkEmri&aktif=true',
  'hareket-kodlari-irsaliye': '/hareket-kodlari?belge_tipi=SatisIrsaliye&aktif=true',
  'hareket-kodlari-fatura': '/hareket-kodlari?belge_tipi=SatisFatura&aktif=true',
  'hareket-kodlari-stok': '/hareket-kodlari?aktif=true&grup=inv',
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
    collect(tab.grid?.fields);
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
  const req = field.required ? 'aria-required="true"' : '';
  const v = value ?? '';
  const name = `${attrName}="${field.key}" ${extraAttrs}`.trim();
  if (field.type === 'checkbox') {
    return `<input type="checkbox" ${name} ${v ? 'checked' : ''} ${dis} ${req} />`;
  }
  if (field.type === 'select') {
    return `<select ${name} ${dis} ${req}>
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
    return `<select class="lookup-select" ${name} ${dis} ${req}>${opts.join('')}</select>`;
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

/** Başlıkta tutulacak alan sayısı — fazlası “Ek bilgiler”e iner (UX: master sabit/sade). */
const MASTER_PRIMARY_MAX = 8;

function masterFieldScore(f) {
  let s = 0;
  if (f.lead) s += 1000; // numaratör sürücü / önce seçilecek alan
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

/** Kalabalık master listesini birincil + ek alanlara böler; lead alanlar başta. */
function partitionMasterFields(fields, maxPrimary = MASTER_PRIMARY_MAX) {
  const list = Array.isArray(fields) ? fields : [];
  if (list.length <= maxPrimary) {
    const leads = list.filter((f) => f.lead);
    const rest = list.filter((f) => !f.lead);
    return { primary: leads.length ? [...leads, ...rest] : list, extras: [] };
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
  };
}

function renderFieldGrid(fields, rec, attrName = 'data-master') {
  return (fields || [])
    .map((f) => fieldShell(f, fieldControl(f, rec[f.key], attrName)))
    .join('');
}

function fieldShell(f, controlHtml) {
  const cls = ['field'];
  if (f.required) cls.push('required');
  if (f.type === 'lookup') cls.push('lookup');
  if (f.code) cls.push('field--code');
  if (f.name) cls.push('field--name');
  // Asterisk yok — zorunluluk .required sınıfı + input aria-required ile
  return `<div class="${cls.join(' ')}"><label>${f.label}</label>${controlHtml}</div>`;
}

function renderMasterDetailPanel(tab, rec) {
  const { primary, extras } = partitionMasterFields(tab.masterFields || []);
  const dFields = [...extras, ...(tab.detailFields || [])];
  return `
    <div class="md-split">
      <section class="md-master" aria-label="Başlık alanları">
        <div class="section-label">Başlık</div>
        <div class="form-tab-fields form-tab-fields--master">
          ${renderFieldGrid(primary, rec)}
        </div>
      </section>
      <section class="md-detail" aria-label="Ek alanlar">
        <div class="section-label">Ek bilgiler</div>
        <div class="md-detail-scroll">
          <div class="form-tab-fields form-tab-fields--detail">
            ${dFields.length
              ? renderFieldGrid(dFields, rec)
              : '<div class="detail-empty">Bu bölümde ek alan yok.</div>'}
          </div>
        </div>
      </section>
    </div>`;
}

/** Master alanlar üstte + kalem grid altta — tek ekran */
function renderMasterGridPanel(tab, rec) {
  const { primary, extras } = partitionMasterFields(tab.masterFields || []);
  const gridTab = {
    kind: 'grid',
    key: tab.grid?.key || tab.key || '_detail',
    slots: tab.grid?.slots,
    fields: tab.grid?.fields || tab.detailFields || [],
  };
  return `
    <div class="md-split md-split--grid">
      <section class="md-master" aria-label="Başlık alanları">
        <div class="section-label">Başlık</div>
        <div class="form-tab-fields form-tab-fields--master">
          ${renderFieldGrid(primary, rec)}
        </div>
      </section>
      ${extras.length ? `
      <section class="md-extras" aria-label="Ek başlık alanları">
        <div class="section-label">Ek bilgiler</div>
        <div class="md-extras-scroll">
          <div class="form-tab-fields form-tab-fields--detail">
            ${renderFieldGrid(extras, rec)}
          </div>
        </div>
      </section>` : ''}
      <section class="md-detail" aria-label="Kalemler">
        <div class="section-label">Kalemler</div>
        <div class="md-detail-scroll">
          ${renderDynamicGrid(gridTab, rec)}
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
      show = Boolean(screen.convertAction);
    }
    if (screen.id === 'irsaliyeler' && rec.durum === 'FaturayaDonustu') {
      show = false;
    }
    if (screen.id === 'uretim-emirleri') {
      show = Boolean(screen.approveAction && ['Taslak', 'OnayBekliyor'].includes(rec.durum));
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
      } else if ((screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk')
        && screen.approveAction && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.durum)) {
        // Onay birincil convert'de; reddet ikincil
        secShow = true;
        secLabel = 'Reddet';
        secBtn.dataset.secKind = 'kk-red';
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
    if (screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk') {
      show = Boolean(screen.approveAction && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.durum));
    }
    conv.hidden = !show;
    if (show) {
      const preferApprove = (screen.approveAction && (
        (screen.id === 'irsaliyeler' && rec.durum === 'Taslak')
        || (screen.id === 'uretim-emirleri' && ['Taslak', 'OnayBekliyor'].includes(rec.durum))
        || (screen.id === 'crm-gorevler' && ['Acik', 'Devam'].includes(rec.durum))
        || (screen.id === 'satin-alma-talepleri' && rec.durum === 'Acik')
        || ((screen.id === 'kk-emirleri-gkk' || screen.id === 'kk-emirleri-ckk')
            && ['Acik', 'Kaydedildi', 'Kismi'].includes(rec.durum))
      ));
      const label = preferApprove
        ? screen.approveAction.label
        : (screen.convertAction?.label || act.label);
      conv.textContent = label;
      conv.dataset.convertKind = preferApprove ? 'approve' : 'convert';
    }
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
      return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
        ${renderMasterDetailPanel(tab, rec)}
      </div>`;
    }
    if (tab.kind === 'master-grid') {
      return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
        ${renderMasterGridPanel(tab, rec)}
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
    const { primary, extras } = partitionMasterFields(tab.fields || []);
    if (masterLike && extras.length) {
      return `<div class="form-tab-panel form-tab-panel--md" data-tab-panel="${tab.id}" ${hide}>
        <div class="md-split">
          <section class="md-master" aria-label="Başlık alanları">
            <div class="section-label">Başlık</div>
            <div class="form-tab-fields form-tab-fields--master">${renderFieldGrid(primary, rec)}</div>
          </section>
          <section class="md-detail" aria-label="Ek alanlar">
            <div class="section-label">Ek bilgiler</div>
            <div class="md-detail-scroll">
              <div class="form-tab-fields form-tab-fields--detail">${renderFieldGrid(extras, rec)}</div>
            </div>
          </section>
        </div>
      </div>`;
    }
    return `<div class="form-tab-panel ${masterLike ? 'form-tab-panel--fixed' : 'form-tab-panel--scroll'}" data-tab-panel="${tab.id}" ${hide}>
      <div class="form-tab-fields ${masterLike ? 'form-tab-fields--master' : 'form-tab-fields--detail'}">
        ${renderFieldGrid(tab.fields || [], rec)}
      </div>
    </div>`;
  }).join('');

  state.formRecord = rec;
  bindNumeratorFieldListener(screen);
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
    if (tab.kind === 'master-grid') {
      const g = {
        kind: 'grid',
        key: tab.grid?.key || tab.key || '_detail',
        fields: tab.grid?.fields || tab.detailFields || [],
      };
      out[g.key] = readGridFromForm(g);
    }
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
  ensureSidebarPath(screen);
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

  // Sipariş adayından iş emri: satır seçip Düzelt → Yeni + ön doldurma
  let adayPrefill = null;
  if (screen.createEndpoint && (screen.id === 'siparis-is-emri' || screen.id === 'toplu-is-emri')
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

  // Liste sekmesi yerinde kalsın; form yan (yeni) sekme olarak açılsın
  addListTab(screen, { activate: false });
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

  state.formRecord = record;
  addFormTab(screen, mode, record);
  showView('form');
  $('#homeSearchWrap').hidden = true;
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
      state.nestedLink = null;
      const formKey = state.activeTabKey;
      state.formMode = null;
      state.formRecord = null;
      state.openTabs = state.openTabs.filter((t) => t.key !== formKey);
      if (sonuc?.siparis_id) await openScreen('satis-siparisleri');
      else if (sonuc?.sevk_no || (sonuc?.id && screen.id === 'sevk-emirleri')) await openScreen('sevk-emirleri');
      else if (sonuc?.irsaliye_no || sonuc?.ettn) await openScreen('irsaliyeler');
      else if (sonuc?.fatura?.id) await openScreen('satis-faturalari');
      else if (sonuc?.teklif_id || sonuc?.teklif_no) await openScreen('satis-teklifleri');
      else await openScreen(screen.id);
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
      if (screen.id === 'siparis-is-emri' || screen.id === 'toplu-is-emri') {
        await openScreen('uretim-emirleri');
      } else {
        await openScreen(screen.id);
      }
      return;
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
    screen.filters.forEach((f) => { state.filterState[f.key] = { op: 'icerir', a: '', b: '' }; });
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
    const sel = selectedRow();
    const body = sel?.stok_id
      ? { stok_idler: [sel.stok_id] }
      : {};
    const sonuc = await api('/mrp/talep-olustur', { method: 'POST', body: JSON.stringify(body) });
    toast(`SA talep oluştu: ${sonuc.talep_no || sonuc.id}`);
    openScreen('satin-alma-talepleri');
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
        } else if (kind === 'secondary' && screen.secondaryAction?.openScreen) {
          openScreen(screen.secondaryAction.openScreen);
        }
      } catch (err) {
        toast(err.message || 'İşlem başarısız');
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
        toast(act.label + ' tamam.');
        if (sonuc?.stok_uyari?.length) {
          toast('Uyarı: bazı kalemlerde depo bakiyesi yetersiz olabilir.');
        }
        if (kind === 'approve') {
          state.formRecord = sonuc;
          renderForm(screen);
        } else if (sonuc?.siparis_id) openScreen('satis-siparisleri');
        else if (sonuc?.sevk_no) openScreen('sevk-emirleri');
        else if (sonuc?.irsaliye_no || sonuc?.ettn) openScreen('irsaliyeler');
        else if (sonuc?.fatura?.id) openScreen('satis-faturalari');
        else if (sonuc?.teklif_id || sonuc?.teklif_no) openScreen('satis-teklifleri');
        else if (sonuc?.cari?.id || sonuc?.aday) openScreen('cari-kartlari');
        else if (sonuc?.faaliyet?.id || (screen.id === 'crm-faaliyet-planlari' && sonuc?.ok)) openScreen('crm-faaliyetler');
        else if (sonuc?.siparis_no && screen.id === 'satin-alma-teklifleri') openScreen('satin-alma-siparisleri');
        else if (sonuc?.fatura_turu === 'Alis' || (sonuc?.mal_kabul_id && sonuc?.fatura_no)) openScreen('alis-faturalari');
        else openScreen(screen.id);
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

async function restoreSession() {
  try {
    const kod = localStorage.getItem('ktb_kullanici_kodu');
    if (!kod) return;
    const token = localStorage.getItem('ktb_access_token');
    if (token) {
      try {
        state.session = await api('/auth/me');
        return;
      } catch (_) { /* token süresi dolmuş — login dene */ }
    }
    const ses = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ kullanici_kodu: kod }),
    });
    state.session = ses;
    if (ses.access_token) localStorage.setItem('ktb_access_token', ses.access_token);
    if (ses.refresh_token) localStorage.setItem('ktb_refresh_token', ses.refresh_token);
  } catch (_) {
    /* parola zorunluysa sessiz geç */
  }
}

function bootFromHash() {
  restoreSession()
    .then(() => loadFirmalar())
    .catch(() => loadFirmalar())
    .finally(() => {
      renderSidebar();
      bindEvents();
      const id = (location.hash || '').replace(/^#/, '');
      if (id && findScreen(id)) openScreen(id);
      else showHome();
    });
}

bootFromHash();
