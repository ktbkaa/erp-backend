# ADGIDA + EGEPACK Uçtan Uca Denetim Raporu

Oluşturma: 20.11.2026 12:36:05 (Europe/Istanbul) · Süre: 2890 ms · Adım: 255

## 1. Kronolojik İşlem Günlüğü

| # | Zaman | Adım | Ekran | Detay | Belge |
|---|-------|------|-------|-------|-------|
| 1 | 20.11.2026 12:36:01 | START | sistem | ADGIDA + EGEPACK simülasyon başladı |  |
| 2 | 20.11.2026 12:36:01 | AUTH | auth/login | owner JWT alındı |  |
| 3 | 20.11.2026 12:36:01 | SYS | health | API ayakta |  |
| 4 | 20.11.2026 12:36:01 | PURGE | keep-only-companies | Yalnız ADGIDA + EGEPACK bırakıldı |  |
| 5 | 20.11.2026 12:36:02 | PURGE | purge-firma-veri | ADGIDA işlem verisi temizlendi |  |
| 6 | 20.11.2026 12:36:02 | PURGE | purge-firma-veri | EGEPACK işlem verisi temizlendi |  |
| 7 | 20.11.2026 12:36:02 | MDM | olcu-birimleri | AD/KG/LT/MT/RL/PK/KL hazır |  |
| 8 | 20.11.2026 12:36:02 | ORG | companies | Firma güncellendi: ADGIDA |  |
| 9 | 20.11.2026 12:36:02 | ORG | companies | Firma güncellendi: EGEPACK |  |
| 10 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-YIK |  |
| 11 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-PAS |  |
| 12 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-DOL |  |
| 13 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-BOY |  |
| 14 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-KUR |  |
| 15 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-PKT |  |
| 16 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-EXT |  |
| 17 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-BSK |  |
| 18 | 20.11.2026 12:36:02 | ORG | is-istasyonlari | İş merkezi: IST-KSM |  |
| 19 | 20.11.2026 12:36:03 | ORG | kullanicilar | Personel + owner/ADMIN firma yetkileri verildi |  |
| 20 | 20.11.2026 12:36:03 | FINANS | finans-kasa | Kasa: ADGIDA-KASA |  |
| 21 | 20.11.2026 12:36:03 | FINANS | finans-banka-hesaplari | Banka: ADGIDA-GAR |  |
| 22 | 20.11.2026 12:36:03 | FINANS | finans-kasa | Kasa: EGEPACK-KASA |  |
| 23 | 20.11.2026 12:36:03 | FINANS | finans-banka-hesaplari | Banka: EGEPACK-GAR |  |
| 24 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-PETRO (Tedarikci) | CAR-PETRO |
| 25 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-MUREKKEP (Tedarikci) | CAR-MUREKKEP |
| 26 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-ANADOLU (Musteri) | CAR-ANADOLU |
| 27 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-PERAKENDE (Musteri) | CAR-PERAKENDE |
| 28 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: AMB-HM-01 (Hammadde/KG) | AMB-HM-01 |
| 29 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: AMB-HM-02 (Hammadde/KG) | AMB-HM-02 |
| 30 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: AMB-HM-03 (Hammadde/MT) | AMB-HM-03 |
| 31 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: AMB-YM-01 (YariMamul/RL) | AMB-YM-01 |
| 32 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: AMB-MM-01 (Mamul/AD) | AMB-MM-01 |
| 33 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: AMB-MM-02 (Mamul/KG) | AMB-MM-02 |
| 34 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: AMB-MM-03 (Mamul/AD) | AMB-MM-03 |
| 35 | 20.11.2026 12:36:03 | STOK | stok-hareketleri | Açılış girişi: EGEPACK hammadde açılış | STG-01-00064 |
| 36 | 20.11.2026 12:36:03 | URETIM | urun-agaci | BOM: BOM-AMB-YM01 | BOM-AMB-YM01 |
| 37 | 20.11.2026 12:36:03 | URETIM | urun-agaci | BOM: BOM-AMB-MM01 | BOM-AMB-MM01 |
| 38 | 20.11.2026 12:36:03 | URETIM | urun-agaci | BOM: BOM-AMB-MM02 | BOM-AMB-MM02 |
| 39 | 20.11.2026 12:36:03 | URETIM | rotalar | Rota: ROTA-YM-FILM | ROTA-YM-FILM |
| 40 | 20.11.2026 12:36:03 | URETIM | rotalar | Rota: ROTA-DOYPACK | ROTA-DOYPACK |
| 41 | 20.11.2026 12:36:03 | URETIM | rotalar | Rota: ROTA-SHRINK | ROTA-SHRINK |
| 42 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-TARIM (Tedarikci) | CAR-TARIM |
| 43 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-CAM (Tedarikci) | CAR-CAM |
| 44 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-EGEPACK (Tedarikci) | CAR-EGEPACK |
| 45 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-MARKET (Musteri) | CAR-MARKET |
| 46 | 20.11.2026 12:36:03 | MDM | cari-kartlari | Cari: CAR-GURME (Musteri) | CAR-GURME |
| 47 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-HM-01 (Hammadde/KG) | GIDA-HM-01 |
| 48 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-HM-02 (Hammadde/KG) | GIDA-HM-02 |
| 49 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-HM-03 (Hammadde/KG) | GIDA-HM-03 |
| 50 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-HM-04 (Hammadde/KG) | GIDA-HM-04 |
| 51 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-HM-05 (Hammadde/KG) | GIDA-HM-05 |
| 52 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-AMB-01 (Hammadde/AD) | GIDA-AMB-01 |
| 53 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-AMB-02 (Hammadde/AD) | GIDA-AMB-02 |
| 54 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-AMB-03 (Hammadde/KG) | GIDA-AMB-03 |
| 55 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-AMB-04 (Hammadde/AD) | GIDA-AMB-04 |
| 56 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-YM-01 (YariMamul/LT) | GIDA-YM-01 |
| 57 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-YM-02 (YariMamul/KG) | GIDA-YM-02 |
| 58 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-MM-01 (Mamul/AD) | GIDA-MM-01 |
| 59 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-MM-02 (Mamul/PK) | GIDA-MM-02 |
| 60 | 20.11.2026 12:36:03 | MDM | stok-karti | Stok: GIDA-MM-03 (Mamul/PK) | GIDA-MM-03 |
| 61 | 20.11.2026 12:36:03 | STOK | stok-hareketleri | Açılış girişi: ADGIDA Bursa hammadde açılış | STG-01-00065 |
| 62 | 20.11.2026 12:36:03 | STOK | stok-hareketleri | Açılış girişi: ADGIDA Malatya hammadde açılış | STG-01-00066 |
| 63 | 20.11.2026 12:36:03 | URETIM | urun-agaci | BOM: BOM-GIDA-YM01 | BOM-GIDA-YM01 |
| 64 | 20.11.2026 12:36:03 | URETIM | urun-agaci | BOM: BOM-GIDA-MM01 | BOM-GIDA-MM01 |
| 65 | 20.11.2026 12:36:03 | URETIM | urun-agaci | BOM: BOM-GIDA-YM02 | BOM-GIDA-YM02 |
| 66 | 20.11.2026 12:36:03 | URETIM | urun-agaci | BOM: BOM-GIDA-MM02 | BOM-GIDA-MM02 |
| 67 | 20.11.2026 12:36:03 | URETIM | urun-agaci | BOM: BOM-GIDA-MM03 | BOM-GIDA-MM03 |
| 68 | 20.11.2026 12:36:03 | URETIM | rotalar | Rota: ROTA-GIDA-YM-ELMA | ROTA-GIDA-YM-ELMA |
| 69 | 20.11.2026 12:36:03 | URETIM | rotalar | Rota: ROTA-GIDA-ELMA | ROTA-GIDA-ELMA |
| 70 | 20.11.2026 12:36:03 | URETIM | rotalar | Rota: ROTA-GIDA-YM-KAY | ROTA-GIDA-YM-KAY |
| 71 | 20.11.2026 12:36:03 | URETIM | rotalar | Rota: ROTA-GIDA-KAY | ROTA-GIDA-KAY |
| 72 | 20.11.2026 12:36:03 | URETIM | rotalar | Rota: ROTA-GIDA-KAR | ROTA-GIDA-KAR |
| 73 | 20.11.2026 12:36:03 | FAZ-A | uretim-emirleri | EGEPACK yarı mamul + mamul üretimi başlıyor |  |
| 74 | 20.11.2026 12:36:03 | URETIM | uretim-emirleri | İş emri: E00245 | E00245 |
| 75 | 20.11.2026 12:36:03 | URETIM | kk-emirleri-ckk | CKK onay QE00221 |  |
| 76 | 20.11.2026 12:36:03 | URETIM | uretim-girisi | YM film 200 RL OK (2 op) | E00245 |
| 77 | 20.11.2026 12:36:03 | URETIM | uretim-emirleri | İş emri: E00246 | E00246 |
| 78 | 20.11.2026 12:36:03 | URETIM | kk-emirleri-ckk | CKK onay QE00222 |  |
| 79 | 20.11.2026 12:36:03 | URETIM | uretim-girisi | Doy-pack 10000 AD OK (1 op) | E00246 |
| 80 | 20.11.2026 12:36:03 | URETIM | uretim-emirleri | İş emri: E00247 | E00247 |
| 81 | 20.11.2026 12:36:03 | URETIM | kk-emirleri-ckk | CKK onay QE00223 |  |
| 82 | 20.11.2026 12:36:03 | URETIM | uretim-girisi | Shrink 500 KG OK (1 op) | E00247 |
| 83 | 20.11.2026 12:36:03 | FAZ-B | satin-alma-siparisleri | ADGIDA → EGEPACK ambalaj siparişi |  |
| 84 | 20.11.2026 12:36:03 | FAZ-B | satin-alma-siparisleri | SA sipariş P00123 | P00123 |
| 85 | 20.11.2026 12:36:03 | FAZ-B | sales_orders | Satış sipariş B00159 | B00159 |
| 86 | 20.11.2026 12:36:03 | FAZ-B | sevk-emirleri | Sevk emri B00159 |  |
| 87 | 20.11.2026 12:36:03 | FAZ-B | delivery_notes | Satış irsaliye 111 |  |
| 88 | 20.11.2026 12:36:03 | FAZ-B | delivery_notes | İrsaliye onaylandı |  |
| 89 | 20.11.2026 12:36:03 | FAZ-B | satis-faturalari | Satış fatura FA00072 | FA00072 |
| 90 | 20.11.2026 12:36:03 | FAZ-B | satis-faturalari | Fatura muhasebeleştirildi |  |
| 91 | 20.11.2026 12:36:03 | FAZ-B | tahsilat-odemeler | ADGIDA ödeme havale 27300 + kasa 11700 |  |
| 92 | 20.11.2026 12:36:03 | FAZ-B | tahsilat-odemeler | EGEPACK tahsilat havale 27300 + kasa 11700 |  |
| 93 | 20.11.2026 12:36:03 | STOK | stok-hareketleri | Açılış girişi: ADGIDA EgePack ambalaj mal kabul (FAB1 shrink) | STG-01-00067 |
| 94 | 20.11.2026 12:36:03 | STOK | stok-hareketleri | Açılış girişi: ADGIDA EgePack ambalaj mal kabul (FAB2 doypack) | STG-01-00068 |
| 95 | 20.11.2026 12:36:03 | FAZ-B | mal-kabuller | Ambalajlar ADGIDA depolarına alındı (B2B stok girişi) |  |
| 96 | 20.11.2026 12:36:03 | FAZ-B | transfer-emirleri | Transfer TE00049 | TE00049 |
| 97 | 20.11.2026 12:36:03 | FAZ-C | uretim-emirleri | ADGIDA çok seviyeli üretim |  |
| 98 | 20.11.2026 12:36:03 | URETIM | uretim-emirleri | İş emri: E00248 | E00248 |
| 99 | 20.11.2026 12:36:03 | URETIM | kk-emirleri-ckk | CKK onay QE00224 |  |
| 100 | 20.11.2026 12:36:03 | URETIM | uretim-girisi | YM elma 2000 LT OK (2 op) | E00248 |
| 101 | 20.11.2026 12:36:03 | URETIM | uretim-emirleri | İş emri: E00249 | E00249 |
| 102 | 20.11.2026 12:36:03 | URETIM | kk-emirleri-ckk | CKK onay QE00225 |  |
| 103 | 20.11.2026 12:36:03 | URETIM | uretim-girisi | MM elma suyu 1500 AD OK (3 op) | E00249 |
| 104 | 20.11.2026 12:36:03 | URETIM | uretim-emirleri | İş emri: E00250 | E00250 |
| 105 | 20.11.2026 12:36:03 | URETIM | kk-emirleri-ckk | CKK onay QE00226 |  |
| 106 | 20.11.2026 12:36:03 | URETIM | uretim-girisi | YM kayısı 800 KG OK (2 op) | E00250 |
| 107 | 20.11.2026 12:36:03 | URETIM | uretim-emirleri | İş emri: E00251 | E00251 |
| 108 | 20.11.2026 12:36:03 | URETIM | kk-emirleri-ckk | CKK onay QE00227 |  |
| 109 | 20.11.2026 12:36:03 | URETIM | uretim-girisi | MM kayısı 2000 PK OK (3 op) | E00251 |
| 110 | 20.11.2026 12:36:03 | URETIM | uretim-emirleri | İş emri: E00252 | E00252 |
| 111 | 20.11.2026 12:36:03 | URETIM | kk-emirleri-ckk | CKK onay QE00228 |  |
| 112 | 20.11.2026 12:36:03 | URETIM | uretim-girisi | MM kayısı-fındık 500 PK OK (2 op) | E00252 |
| 113 | 20.11.2026 12:36:03 | FAZ-C | stok-hareketleri | Fire: 50 adet doy-pack poşet (lot n/a) |  |
| 114 | 20.11.2026 12:36:03 | FAZ-C | sales_orders | Market SO B00160 | B00160 |
| 115 | 20.11.2026 12:36:03 | STOK | stok-hareketleri | Açılış girişi: ADGIDA mamul dağıtım deposu takviye | STG-01-00069 |
| 116 | 20.11.2026 12:36:03 | FAZ-C | sevk-emirleri | Market sevk B00160 |  |
| 117 | 20.11.2026 12:36:03 | FAZ-C | delivery_notes | Market irsaliye 112 |  |
| 118 | 20.11.2026 12:36:03 | FAZ-C | satis-faturalari | Market fatura FA00073 | FA00073 |
| 119 | 20.11.2026 12:36:03 | FAZ-C | tahsilat-odemeler | Market tahsilat 67104+44736 |  |
| 120 | 20.11.2026 12:36:03 | FAZ-C | finans-nakit | Banka→Kasa virman 5000 TL |  |
| 121 | 20.11.2026 12:36:03 | FAZ-C | finans-nakit | Genel gider 3500 TL (elektrik/nakliye) |  |
| 122 | 20.11.2026 12:36:03 | FAZ-C | satis-iade-faturalari | İade irsaliye/belge denemesi |  |
| 123 | 20.11.2026 12:36:03 | COVER | sistem | Sistem tanıtım Excel ekran kapsamı başlıyor |  |
| 124 | 20.11.2026 12:36:03 | COVER | country-tanimi | Ülke listesi |  |
| 125 | 20.11.2026 12:36:03 | COVER | sehir-tanimi | Şehir listesi |  |
| 126 | 20.11.2026 12:36:03 | COVER | dil-tanimi | Dil listesi |  |
| 127 | 20.11.2026 12:36:03 | COVER | para-birimi-tanimi | PB listesi |  |
| 128 | 20.11.2026 12:36:03 | COVER | banka-tanimi | Banka listesi |  |
| 129 | 20.11.2026 12:36:03 | COVER | odeme-kosulu-tanimi | Ödeme koşulu |  |
| 130 | 20.11.2026 12:36:03 | COVER | teslimat-kosulu-tanimi | Teslimat koşulu |  |
| 131 | 20.11.2026 12:36:03 | COVER | belge-tipleri | Belge tipleri |  |
| 132 | 20.11.2026 12:36:03 | COVER | hareket-kodlari | Hareket kodları |  |
| 133 | 20.11.2026 12:36:03 | COVER | numarator-tanimi | Numaratörler |  |
| 134 | 20.11.2026 12:36:03 | COVER | doviz-exchange_rate-tanimi | Döviz kurları |  |
| 135 | 20.11.2026 12:36:03 | COVER | depo-bakiye | Depo bakiyeleri |  |
| 136 | 20.11.2026 12:36:03 | COVER | stok-hareket-raporu | Hareket raporu |  |
| 137 | 20.11.2026 12:36:03 | COVER | stok-partileri | Parti listesi |  |
| 138 | 20.11.2026 12:36:03 | COVER | stok-serileri | Seri listesi |  |
| 139 | 20.11.2026 12:36:03 | COVER | stok-depo | Depo-stok bağları |  |
| 140 | 20.11.2026 12:36:03 | COVER | sayim-belgeleri | Sayım SB00042 |  |
| 141 | 20.11.2026 12:36:03 | COVER | stok-rezervasyonlari | Rezervasyon listesi |  |
| 142 | 20.11.2026 12:36:03 | COVER | stok-ikame | İkame listesi |  |
| 143 | 20.11.2026 12:36:03 | COVER | satin-alma-talepleri | Talep L00057 |  |
| 144 | 20.11.2026 12:36:03 | COVER | satin-alma-teklifleri | Teklif QF00008 |  |
| 145 | 20.11.2026 12:36:03 | COVER | satin-alma-anlasmalari | Anlaşma listesi |  |
| 146 | 20.11.2026 12:36:03 | COVER | tedarikci-irsaliyeleri | Alış irsaliye listesi |  |
| 147 | 20.11.2026 12:36:03 | COVER | mal-kabuller | Mal kabul listesi |  |
| 148 | 20.11.2026 12:36:03 | COVER | giris-kontrolleri | Giriş kontrol listesi |  |
| 149 | 20.11.2026 12:36:03 | COVER | alis-iade-faturalari | Alış iade listesi |  |
| 150 | 20.11.2026 12:36:03 | COVER | satis-teklifleri | Teklif ST00047 |  |
| 151 | 20.11.2026 12:36:03 | COVER | kk-kontrol-planlari | POST /kk-kontrol-planlari → 500: duplicate key value violates unique constraint "qc_control_plans_plan_code_key" |  |
| 152 | 20.11.2026 12:36:03 | COVER | kk-emirleri-gkk | GKK listesi |  |
| 153 | 20.11.2026 12:36:03 | COVER | kk-emirleri-ckk | CKK listesi |  |
| 154 | 20.11.2026 12:36:03 | COVER | kk-uygunsuzluklar | NCR listesi |  |
| 155 | 20.11.2026 12:36:03 | COVER | kk-capa | CAPA listesi |  |
| 156 | 20.11.2026 12:36:03 | COVER | kk-ret-nedenleri | Ret nedenleri |  |
| 157 | 20.11.2026 12:36:03 | COVER | mrp-parametre | MRP parametre listesi |  |
| 158 | 20.11.2026 12:36:03 | COVER | mrp-bagimsiz-ihtiyac | BI 55 |  |
| 159 | 20.11.2026 12:36:03 | COVER | mrp-calisma | RUN ok |  |
| 160 | 20.11.2026 12:36:03 | COVER | mrp-sonuclar | MRP sonuçları: GET /mrp/sonuclar → 404: Endpoint bulunamadı. |  |
| 161 | 20.11.2026 12:36:03 | COVER | mrp-hareket-raporu | MRP hareket raporu |  |
| 162 | 20.11.2026 12:36:03 | COVER | fason-parametreleri | Fason parametre |  |
| 163 | 20.11.2026 12:36:03 | COVER | fason-operasyonlari | Fason operasyon |  |
| 164 | 20.11.2026 12:36:03 | COVER | fason-fiyatlari | Fason fiyat |  |
| 165 | 20.11.2026 12:36:03 | COVER | fason-siparisleri | Fason sipariş |  |
| 166 | 20.11.2026 12:36:03 | COVER | fason-sevkiyatlar | Fason sevk |  |
| 167 | 20.11.2026 12:36:03 | COVER | fason-teslimatlar | Fason teslimat |  |
| 168 | 20.11.2026 12:36:03 | COVER | fason-emanet-stok | Emanet stok |  |
| 169 | 20.11.2026 12:36:03 | COVER | fason-tuketimler | Fason tüketim |  |
| 170 | 20.11.2026 12:36:03 | COVER | fason-parametreleri | GKK kapısı parametre güncellendi |  |
| 171 | 20.11.2026 12:36:03 | COVER | uretim-planlari | Üretim planları |  |
| 172 | 20.11.2026 12:36:03 | COVER | uretim-emri-tipleri | İE tipleri |  |
| 173 | 20.11.2026 12:36:03 | COVER | uretim-parametreleri | Üretim parametreleri |  |
| 174 | 20.11.2026 12:36:03 | COVER | bom-patlatma | BOM patlatma: GET /bom/patlat?item_id=649 → 404: Endpoint bulunamadı. |  |
| 175 | 20.11.2026 12:36:03 | COVER | is-merkezi-yuku | İş merkezi yükü |  |
| 176 | 20.11.2026 12:36:03 | COVER | bakim-emirleri | Bakım emirleri |  |
| 177 | 20.11.2026 12:36:03 | COVER | hesap-plani | Hesap planı |  |
| 178 | 20.11.2026 12:36:03 | COVER | muhasebe-belgeleri | Muhasebe belgeleri |  |
| 179 | 20.11.2026 12:36:03 | COVER | mizan | Mizan |  |
| 180 | 20.11.2026 12:36:03 | COVER | finans-yevmiye | Yevmiye |  |
| 181 | 20.11.2026 12:36:03 | COVER | finans-bilanco | Bilanço |  |
| 182 | 20.11.2026 12:36:03 | COVER | finans-gelir-tablosu | Gelir tablosu |  |
| 183 | 20.11.2026 12:36:03 | COVER | cari-ekstre | Cari ekstre |  |
| 184 | 20.11.2026 12:36:03 | COVER | cari-mutabakat | Cari mutabakat |  |
| 185 | 20.11.2026 12:36:03 | COVER | banka-mutabakat | Banka mutabakat |  |
| 186 | 20.11.2026 12:36:03 | COVER | finans-yaslandirma | Yaşlandırma |  |
| 187 | 20.11.2026 12:36:04 | COVER | fiyat-listeleri | Fiyat listeleri |  |
| 188 | 20.11.2026 12:36:04 | COVER | sabit-kiymetler | Sabit kıymetler |  |
| 189 | 20.11.2026 12:36:04 | COVER | e-belge-kuyruk | e-Belge kuyruğu: GET /e-belge/kuyruk → 500: invalid input syntax for type bigint: "kuyruk" |  |
| 190 | 20.11.2026 12:36:04 | COVER | muhasebe-donemleri | Muhasebe dönemleri |  |
| 191 | 20.11.2026 12:36:04 | COVER | finans-ulke-paketleri | Ülke paketleri: GET /finans-country → 404: Endpoint bulunamadı. |  |
| 192 | 20.11.2026 12:36:04 | COVER | onaylarim | Onaylarım: GET /onay-ekranlari/onaylarim → 404: Endpoint bulunamadı. |  |
| 193 | 20.11.2026 12:36:04 | COVER | onay-izleme | Onay izleme |  |
| 194 | 20.11.2026 12:36:04 | COVER | onay-rota-tanim | Onay rota |  |
| 195 | 20.11.2026 12:36:04 | COVER | onay-kural-tanim | Onay kural |  |
| 196 | 20.11.2026 12:36:04 | COVER | onay-role-tanim | Onay rol |  |
| 197 | 20.11.2026 12:36:04 | COVER | onay-yetki-devri | Yetki devri |  |
| 198 | 20.11.2026 12:36:04 | COVER | sistem-parametreleri | Sistem parametreleri |  |
| 199 | 20.11.2026 12:36:04 | COVER | kullanici-gruplari | Kullanıcı grupları |  |
| 200 | 20.11.2026 12:36:04 | COVER | audit-log | Audit log |  |
| 201 | 20.11.2026 12:36:04 | COVER | mesaj-tanimlari | Mesaj tanımları |  |
| 202 | 20.11.2026 12:36:04 | COVER | crm-adaylar | ADGIDA CRM/HR/PRJ genişletme OK |  |
| 203 | 20.11.2026 12:36:04 | COVER | crm-adaylar | ADGIDA extended seed |  |
| 204 | 20.11.2026 12:36:04 | COVER | crm-kontaklar | ADGIDA extended seed |  |
| 205 | 20.11.2026 12:36:04 | COVER | crm-firsatlar | ADGIDA extended seed |  |
| 206 | 20.11.2026 12:36:04 | COVER | crm-faaliyet-planlari | ADGIDA extended seed |  |
| 207 | 20.11.2026 12:36:04 | COVER | crm-faaliyetler | ADGIDA extended seed |  |
| 208 | 20.11.2026 12:36:04 | COVER | crm-gorevler | ADGIDA extended seed |  |
| 209 | 20.11.2026 12:36:04 | COVER | crm-ajanda | ADGIDA extended seed |  |
| 210 | 20.11.2026 12:36:04 | COVER | hr-personel | ADGIDA extended seed |  |
| 211 | 20.11.2026 12:36:04 | COVER | hr-departmanlar | ADGIDA extended seed |  |
| 212 | 20.11.2026 12:36:04 | COVER | hr-pozisyonlar | ADGIDA extended seed |  |
| 213 | 20.11.2026 12:36:04 | COVER | hr-puantaj | ADGIDA extended seed |  |
| 214 | 20.11.2026 12:36:04 | COVER | hr-izin-talepleri | ADGIDA extended seed |  |
| 215 | 20.11.2026 12:36:04 | COVER | hr-bordro-calismalari | ADGIDA extended seed |  |
| 216 | 20.11.2026 12:36:04 | COVER | hr-ise-alim-ilanlar | ADGIDA extended seed |  |
| 217 | 20.11.2026 12:36:04 | COVER | prj-projeler | ADGIDA extended seed |  |
| 218 | 20.11.2026 12:36:04 | COVER | prj-isler | ADGIDA extended seed |  |
| 219 | 20.11.2026 12:36:04 | COVER | prj-sprintler | ADGIDA extended seed |  |
| 220 | 20.11.2026 12:36:04 | COVER | prj-riskler | ADGIDA extended seed |  |
| 221 | 20.11.2026 12:36:04 | COVER | crm-adaylar | EGEPACK CRM/HR/PRJ genişletme OK |  |
| 222 | 20.11.2026 12:36:04 | COVER | crm-adaylar | EGEPACK extended seed |  |
| 223 | 20.11.2026 12:36:04 | COVER | crm-kontaklar | EGEPACK extended seed |  |
| 224 | 20.11.2026 12:36:04 | COVER | crm-firsatlar | EGEPACK extended seed |  |
| 225 | 20.11.2026 12:36:04 | COVER | crm-faaliyet-planlari | EGEPACK extended seed |  |
| 226 | 20.11.2026 12:36:04 | COVER | crm-faaliyetler | EGEPACK extended seed |  |
| 227 | 20.11.2026 12:36:04 | COVER | crm-gorevler | EGEPACK extended seed |  |
| 228 | 20.11.2026 12:36:04 | COVER | crm-ajanda | EGEPACK extended seed |  |
| 229 | 20.11.2026 12:36:04 | COVER | hr-personel | EGEPACK extended seed |  |
| 230 | 20.11.2026 12:36:04 | COVER | hr-departmanlar | EGEPACK extended seed |  |
| 231 | 20.11.2026 12:36:04 | COVER | hr-pozisyonlar | EGEPACK extended seed |  |
| 232 | 20.11.2026 12:36:04 | COVER | hr-puantaj | EGEPACK extended seed |  |
| 233 | 20.11.2026 12:36:04 | COVER | hr-izin-talepleri | EGEPACK extended seed |  |
| 234 | 20.11.2026 12:36:04 | COVER | hr-bordro-calismalari | EGEPACK extended seed |  |
| 235 | 20.11.2026 12:36:04 | COVER | hr-ise-alim-ilanlar | EGEPACK extended seed |  |
| 236 | 20.11.2026 12:36:04 | COVER | prj-projeler | EGEPACK extended seed |  |
| 237 | 20.11.2026 12:36:04 | COVER | prj-isler | EGEPACK extended seed |  |
| 238 | 20.11.2026 12:36:04 | COVER | prj-sprintler | EGEPACK extended seed |  |
| 239 | 20.11.2026 12:36:04 | COVER | prj-riskler | EGEPACK extended seed |  |
| 240 | 20.11.2026 12:36:04 | COVER | kokpit | Liste/GET smoke |  |
| 241 | 20.11.2026 12:36:04 | COVER | fatura-kontrolleri | Liste/GET smoke |  |
| 242 | 20.11.2026 12:36:04 | COVER | finans-nakit-hareketleri | Liste/GET smoke |  |
| 243 | 20.11.2026 12:36:04 | COVER | finans-kasa-hesaplari | Liste/GET smoke |  |
| 244 | 20.11.2026 12:36:04 | COVER | finans-banka-hesaplari | Liste/GET smoke |  |
| 245 | 20.11.2026 12:36:04 | COVER | hizli-uretim-girisi | Liste/GET smoke |  |
| 246 | 20.11.2026 12:36:04 | COVER | is-istasyonlari | Liste/GET smoke |  |
| 247 | 20.11.2026 12:36:04 | COVER | is-merkezleri | Liste/GET smoke |  |
| 248 | 20.11.2026 12:36:04 | COVER | warehouses | Liste/GET smoke |  |
| 249 | 20.11.2026 12:36:04 | COVER | is-yerleri | Liste/GET smoke |  |
| 250 | 20.11.2026 12:36:04 | COVER | companies | Liste/GET smoke |  |
| 251 | 20.11.2026 12:36:04 | COVER | kullanicilar | Liste/GET smoke |  |
| 252 | 20.11.2026 12:36:04 | COVER | kategori-tanimi | Liste/GET smoke |  |
| 253 | 20.11.2026 12:36:04 | COVER | kategori-tip-tanimi | Liste/GET smoke |  |
| 254 | 20.11.2026 12:36:04 | SNAP | rapor | Tablo sayıları |  |
| 255 | 20.11.2026 12:36:05 | END | rapor | Audit Excel yazıldı | /workspace/docs/system/sim-adgida-egepack-audit.xlsx |

## 2. Tablo Özetleri

- **companies**: 2
- **plants**: 7
- **warehouses**: 20
- **items**: 21
- **partners**: 9
- **boms**: 8
- **routings**: 8
- **production_orders**: 8
- **sales_orders**: 2
- **purchase_orders**: 1
- **delivery_notes**: 2
- **invoices**: 2
- **stock_movements**: 56

## 3. Üretim Emirleri

| Firma | Emir | Stok | Plan | Üretilen | Durum |
|-------|------|------|------|----------|-------|
| EGEPACK | E00245 | AMB-YM-01 | 200.000 | 200.000 | Kapali |
| EGEPACK | E00246 | AMB-MM-01 | 10000.000 | 10000.000 | Kapali |
| EGEPACK | E00247 | AMB-MM-02 | 500.000 | 500.000 | Kapali |
| ADGIDA | E00248 | GIDA-YM-01 | 2000.000 | 2000.000 | Kapali |
| ADGIDA | E00249 | GIDA-MM-01 | 1500.000 | 1500.000 | Kapali |
| ADGIDA | E00250 | GIDA-YM-02 | 800.000 | 800.000 | Kapali |
| ADGIDA | E00251 | GIDA-MM-02 | 2000.000 | 2000.000 | Kapali |
| ADGIDA | E00252 | GIDA-MM-03 | 500.000 | 500.000 | Kapali |

## 4. Stok Bakiyeleri (lot toplamı)

| Firma | Stok | Depo | Miktar | Kritik |
|-------|------|------|--------|--------|
| ADGIDA | GIDA-AMB-01 | GIDA-FAB1-HMD | 3500 | 0.0000 |
| ADGIDA | GIDA-AMB-02 | GIDA-FAB2-HMD | 7450 | 0.0000 |
| ADGIDA | GIDA-AMB-03 | GIDA-FAB1-GIR | 50 | 0.0000 |
| ADGIDA | GIDA-AMB-03 | GIDA-FAB1-HMD | 420 | 0.0000 |
| ADGIDA | GIDA-AMB-04 | GIDA-FAB1-HMD | 375.5 | 0.0000 |
| ADGIDA | GIDA-HM-01 | GIDA-FAB1-HMD | 5500 | 2000.0000 |
| ADGIDA | GIDA-HM-02 | GIDA-FAB1-HMD | 500 | 0.0000 |
| ADGIDA | GIDA-HM-03 | GIDA-FAB2-HMD | 2160 | 800.0000 |
| ADGIDA | GIDA-HM-04 | GIDA-FAB2-HMD | 325 | 0.0000 |
| ADGIDA | GIDA-HM-05 | GIDA-FAB1-HMD | 200 | 0.0000 |
| ADGIDA | GIDA-MM-01 | GIDA-FAB1-MAM | 1500 | 0.0000 |
| ADGIDA | GIDA-MM-02 | GIDA-FAB2-MAM | 2000 | 0.0000 |
| ADGIDA | GIDA-MM-03 | GIDA-FAB2-MAM | 500 | 0.0000 |
| ADGIDA | GIDA-YM-01 | GIDA-FAB1-YM | 500 | 0.0000 |
| ADGIDA | GIDA-YM-02 | GIDA-FAB2-YM | 125 | 0.0000 |
| EGEPACK | AMB-HM-01 | AMB-FAB-HMD | 2075 | 500.0000 |
| EGEPACK | AMB-HM-02 | AMB-FAB-HMD | 120 | 50.0000 |
| EGEPACK | AMB-HM-03 | AMB-FAB-HMD | 17600 | 1000.0000 |

## 5. Cari Bakiyeler

| Firma | Cari | Tip | Bakiye |
|-------|------|-----|--------|

## 6. Bütünlük Notları

- Firma kapsamlı purge + yeniden seed (TRUNCATE değil).
- ADGIDA/EGEPACK dışındaki firmalar `keep-only-companies` ile silindi.
- Üretim emirleri API alanları: item_id, product_bom_id, route_id, component/fg warehouse, planned_quantity.
- B2B: SA sipariş + satış sipariş + irsaliye/fatura + tahsilat/ödeme.
- Fire çıkışında lot_id zorunluluğu (BUG-008) uygulandı.

## 7. Ekran Kapsamı (Sistem Tanıtım Excel)

- Dokunulan ekran: **133**
- Excel ekran sayısı: **182**
- Excel eşleşen: **122**
- Excelde olup simde dokunulmayan: **60**

### Dokunulan ekranlar

- `sistem`
- `auth/login`
- `health`
- `keep-only-companies`
- `purge-firma-veri`
- `olcu-birimleri`
- `companies`
- `is-istasyonlari`
- `kullanicilar`
- `finans-kasa`
- `finans-banka-hesaplari`
- `cari-kartlari`
- `stok-karti`
- `stok-hareketleri`
- `urun-agaci`
- `rotalar`
- `uretim-emirleri`
- `kk-emirleri-ckk`
- `uretim-girisi`
- `satin-alma-siparisleri`
- `sales_orders`
- `sevk-emirleri`
- `delivery_notes`
- `satis-faturalari`
- `tahsilat-odemeler`
- `mal-kabuller`
- `transfer-emirleri`
- `finans-nakit`
- `satis-iade-faturalari`
- `country-tanimi`
- `sehir-tanimi`
- `dil-tanimi`
- `para-birimi-tanimi`
- `banka-tanimi`
- `odeme-kosulu-tanimi`
- `teslimat-kosulu-tanimi`
- `belge-tipleri`
- `hareket-kodlari`
- `numarator-tanimi`
- `doviz-exchange_rate-tanimi`
- `depo-bakiye`
- `stok-hareket-raporu`
- `stok-partileri`
- `stok-serileri`
- `stok-depo`
- `sayim-belgeleri`
- `stok-rezervasyonlari`
- `stok-ikame`
- `satin-alma-talepleri`
- `satin-alma-teklifleri`
- `satin-alma-anlasmalari`
- `tedarikci-irsaliyeleri`
- `giris-kontrolleri`
- `alis-iade-faturalari`
- `satis-teklifleri`
- `kk-kontrol-planlari`
- `kk-emirleri-gkk`
- `kk-uygunsuzluklar`
- `kk-capa`
- `kk-ret-nedenleri`
- `mrp-parametre`
- `mrp-bagimsiz-ihtiyac`
- `mrp-calisma`
- `mrp-sonuclar`
- `mrp-hareket-raporu`
- `fason-parametreleri`
- `fason-operasyonlari`
- `fason-fiyatlari`
- `fason-siparisleri`
- `fason-sevkiyatlar`
- `fason-teslimatlar`
- `fason-emanet-stok`
- `fason-tuketimler`
- `uretim-planlari`
- `uretim-emri-tipleri`
- `uretim-parametreleri`
- `bom-patlatma`
- `is-merkezi-yuku`
- `bakim-emirleri`
- `hesap-plani`
- `muhasebe-belgeleri`
- `mizan`
- `finans-yevmiye`
- `finans-bilanco`
- `finans-gelir-tablosu`
- `cari-ekstre`
- `cari-mutabakat`
- `banka-mutabakat`
- `finans-yaslandirma`
- `fiyat-listeleri`
- `sabit-kiymetler`
- `e-belge-kuyruk`
- `muhasebe-donemleri`
- `finans-ulke-paketleri`
- `onaylarim`
- `onay-izleme`
- `onay-rota-tanim`
- `onay-kural-tanim`
- `onay-role-tanim`
- `onay-yetki-devri`
- `sistem-parametreleri`
- `kullanici-gruplari`
- `audit-log`
- `mesaj-tanimlari`
- `crm-adaylar`
- `crm-kontaklar`
- `crm-firsatlar`
- `crm-faaliyet-planlari`
- `crm-faaliyetler`
- `crm-gorevler`
- `crm-ajanda`
- `hr-personel`
- `hr-departmanlar`
- `hr-pozisyonlar`
- `hr-puantaj`
- `hr-izin-talepleri`
- `hr-bordro-calismalari`
- `hr-ise-alim-ilanlar`
- `prj-projeler`
- `prj-isler`
- `prj-sprintler`
- `prj-riskler`
- `kokpit`
- `fatura-kontrolleri`
- `finans-nakit-hareketleri`
- `finans-kasa-hesaplari`
- `hizli-uretim-girisi`
- `is-merkezleri`
- `warehouses`
- `is-yerleri`
- `kategori-tanimi`
- `kategori-tip-tanimi`
- `rapor`

### DB firmaları: yalnızca ADGIDA + EGEPACK
