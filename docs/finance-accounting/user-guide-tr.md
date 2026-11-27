# Finans / Muhasebe kullanım kılavuzu (muhasebe uzmanı olmayanlar için)

Son güncelleme: 2026-10-23 (Europe/Istanbul).

Bu kılavuz, LioX benzeri ticari ERP ekranlarıyla **Finans** menüsünü adım adım kullanmanızı sağlar. Terimler için ayrıca `accounting-glossary-tr.md` dosyasına bakın.

---

## 0. Temel fikir (30 saniye)

Her para hareketi **en az iki hesaba** yazılır: bir tarafa **borç**, diğerine **alacak**. Toplamlar eşit değilse sistem fişi **kesinleştirmez**. Kesinleşmiş fiş silinmez / satır satır değiştirilmez; hata varsa **ters kayıt** açılır.

Varsayılan ülke **Türkiye (TDHP)**. Firma kartındaki muhasebe ülkesi kalıcıdır; tek bir fişteki “işlem / vergi ülkesi” alanları ana ülkeyi değiştirmez.

---

## 1. Hesap planı

1. Menü: **Finans → Tanımlar → Hesap Planı**
2. Filtrede ülke (`TR` / `AZ` / `DE` / `NL`) seçebilirsiniz.
3. Hesap tipleri:
   - **Ana**: sınıf başlığı (ör. 100 Kasa) — fiş yazılmaz
   - **Üst**: ara grup — fiş yazılmaz
   - **Doğrudan**: yaprak hesap — fiş yalnızca buna yazılır
4. Yeni hesap: kod, ad, tip, ülke, sınıf, normal bakiye (Borç/Alacak).
5. Cari / banka / kasa ile eşleşecek hesaplarda **Mutabakat** alanını doldurun.

Türkiye seed örneği: `100.01.001` Merkez Kasa, `120.01.001` Alıcılar, `320.01.001` Satıcılar, `600.01.001` Satışlar, `191` / `391` KDV.

---

## 2. Muhasebe belgesi (manuel fiş)

1. **Finans → Belgeler → Muhasebe Belgeleri → Yeni**
2. Tarih, fiş tipi (Mahsup / Tahsilat / Tediye / Açılış / Kapanış), muhasebe ülkesi.
3. Kalemler: her satırda **hesap + (borç veya alacak)**. Aynı satırda ikisi birden dolu olamaz.
4. **Kaydet** → durum `Taslak`.
5. Borç toplamı = alacak toplamı ise **Kesinleştir**.
6. Hata fark ederseniz: **Ters Kayıt** (yeni fiş, orijinal kilitlenir).

Örnek: Kasadan 1.000 TL cari alacak tahsilatı  
- Borç `100.01.001` 1000  
- Alacak `120.01.001` 1000  

---

## 3. Satış faturası → muhasebe

1. Satış faturasını onaylayın (mevcut Fatura ekranı).
2. Faturada **Muhasebeleştir** (veya sistemdeki dönüşüm aksiyonu) çalıştırın.
3. Motor:
   - Alıcı hesabına borç (ödenecek tutar)
   - Satış hesabına alacak (mal/hizmet)
   - Hesaplanan KDV hesabına alacak (varsa)
4. Aynı fatura ikinci kez işlenirse sistem **mükerrer fiş** hatası verir.
5. Cari bakiyeyi **Cari Ekstre / Tahsilat-Ödemeler** ile kontrol edin; mizan ile karşılaştırın.

Hesap eşlemesi: **Finans → Hesap Belirleme Kuralları** (`Satis` / `Alis`).

---

## 4. Alış faturası → ödeme

1. Alış faturası onay → muhasebeleştir:
   - Stok/gider borç, indirilecek KDV borç, satıcı alacak
2. Ödeme: **Tahsilat-Ödemeler** veya **Nakit Hareketleri** (Çıkış) + banka/kasa hesabı.
3. `Muhasebeleştir` işaretliyse banka/kasa ↔ satıcı fişi oluşur.

---

## 5. Banka ve kasa

1. **Finans → Banka / Kasa → Banka Hesapları** — IBAN, PB, bağlı muhasebe hesabı (`102…`).
2. **Kasa Hesapları** — bağlı hesap (`100…`).
3. **Nakit Hareketleri** — Giriş / Çıkış / Virman; isteğe bağlı otomatik fiş.
4. Banka ekstresi içe aktarma ve otomatik mutabakat bu dalgada **henüz yok** (plan: Faz 3).

---

## 6. Vergi kodları

1. **Finans → Vergi Kodları**
2. Ülke + kod (ör. TR `KDV20`) + tarihli oran.
3. Oran değişince yeni satır eklenir; eski fişler eski oranı korur.
4. Beyanname **gönderimi** yoktur; raporlar hazırlık verisi üretir.

---

## 7. Dönem yönetimi

1. **Finans → Muhasebe Dönemleri**
2. Açık dönemde fiş kesinleşir.
3. **Dönemi Kapat** → o tarih aralığına yeni kesin fiş engellenir.
4. **Yeniden Aç** → audit ile izlenir; yalnızca yetkili kullanıcı.

Dönem kapanmadan önce: mizan dengesi, açık taslak fişler, banka/cari mutabakatını kontrol edin.

---

## 8. Raporlar

| Rapor | Menü | Ne gösterir |
|-------|------|-------------|
| Mizan | Finans → Raporlar | Hesap borç/alacak/bakiye |
| Yevmiye | Yevmiye Defteri | Tarih sırası fiş satırları |
| Bilanço (özet) | Bilanço | Sınıf 1–5 özeti |
| Gelir tablosu | Gelir Tablosu | Sınıf 6 hareketleri |
| Kokpit | Kokpit | Özet göstergeler |

Filtrelerde tarih ve (uygunsa) ülke kullanın. Raporlar **Onaylı** fişlerden üretilir.

---

## 9. Ülke seçimi nasıl çalışır?

| Kavram | Anlam |
|--------|--------|
| Firma muhasebe ülkesi | Kalıcı; hesap planı / PB varsayılanı |
| Fiş `ulke_kodu` | Kaydın muhasebe paketi |
| `islem_ulke_kodu` / `vergi_ulke_kodu` | Uluslararası işlem bağlamı; ana ülkeyi değiştirmez |

Kesinleşmiş fişin ülkesi sonradan değiştirilmez. Geçersiz hesap/vergi kodu sessizce kullanılmaz.

---

## 10. Sık hatalar ve çözüm

| Mesaj | Ne yapmalısınız |
|-------|-----------------|
| Fiş dengeli değil | Borç ve alacak toplamlarını eşitleyin |
| Yalnızca Doğrudan hesaplara… | Ana/Üst yerine yaprak hesap seçin |
| Kapalı dönem | Dönemi yeniden açın veya tarihi açık döneme alın |
| Mükerrer / zaten muhasebeleştirilmiş | Mevcut fişi açın; gerekirse ters kayıt |
| Hesap belirleme kuralı yok | Satış/Alış kuralı tanımlayın |

---

## 11. Yapılmayanlar (bilinçli)

- GİB e-Defter / e-Beyanname canlı gönderim
- AZ e-qaimə, DE Meldesystem, NL ICP canlı gönderim
- Banka ekstresi otomatik mutabakat
- Tam sabit kıymet amortisman motoru ve bütçe/gerçekleşen derin UI

Bunlar entegrasyon/sertifika veya sonraki faz işidir; ekranda “gönderildi” simülasyonu yapılmaz.
