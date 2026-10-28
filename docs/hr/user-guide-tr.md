# İnsan Kaynakları — Kullanıcı Kılavuzu (TR)

Menü: **İnsan Kaynakları**

## 1. Özlük

### Tanımlar / Parametreler (önce buradan)
Menü **İnsan Kaynakları → Tanımlar / Parametreler**:
- Departmanlar, Pozisyonlar
- Çalışma takvimleri, Vardiyalar, Resmî tatiller
- **İzin türleri** (kod, ücretli/ücretsiz, hak ediş yöntemi, belge zorunluluğu)
- **Bordro parametreleri** (oranlar + GV dilimleri)
- **Çıkış nedenleri** (kıdem/ihbar varsayılanları)

### Departman / Pozisyon
1. **Departmanlar** → Yeni → ad, isteğe bağlı üst departman ve maliyet merkezi.
2. **Pozisyonlar** → departmana bağlayın.

### Personel kartı
1. **Personel Kartları** → Yeni.
2. Ad, soyad, işe giriş zorunlu; sicil numaratörden gelir (`HE#####`).
3. Departman, pozisyon, yönetici, takvim, vardiya seçin.
4. Kaydet. Org değişiklikleri istihdam geçmişine yazılır.
5. Kendini yönetici yapma ve döngü engellenir.

## 2. Zaman ve izin

### Çalışma takvimi / vardiya
- Model A örneği: 6 gün, günlük net 8 saat, ara 60 dk.
- Model B örneği: 5 gün, günlük net 9,5 saat.
- Yeni sürüm eski takvimi pasife alır; geçmiş puantaj bozulmaz.

### İzin
1. **İzin Talepleri** → personel, izin türü, tarih aralığı.
2. **Gönder** → durum `Gonderildi`.
3. **Onayla** → bakiye düşer (yıllık türde); mükerrer düşüm engelli.
4. Çakışan onaylı/bekleyen talepler reddedilir (409).
5. Bakiyeler ekranından kalan günleri izleyin.

### Puantaj
- PDKS ham kayıt: API `POST /hr-puantaj/ham`.
- İşleme: `POST /hr-puantaj/isle` → günlük plan/gerçek/FM.
- Manuel düzeltme gerekçeli; ham kayıt silinmez.

## 3. Ücret ve bordro

1. **Ücret Tanımları** → personel + brüt + geçerlilik.
2. **Bordro Dönemleri** → yıl/ay açın.
3. **Bordro Çalışmaları** → dönem seç → kaydet → **Hesapla** → **Onayla** → **Kesinleştir**.
4. Avans: talep → onay → ödeme → bordroda mahsup (ödeme onaysız sayılmaz).

Simülasyon: `POST /hr-bordro/hesapla-sim` `{ "gross": 50000 }`.

## 4. İşe alım ve çıkış

1. İş ilanı → aday → **İşe Al → Personel** (e-posta mükerrer engeli).
2. Onboarding görevleri otomatik açılır; **Tamamla**.
3. Zimmet teslim / iade.
4. İşten çıkış: neden + tarihler → ön kıdem/ihbar/izin hesabı → zimmetler kapalıysa onay → personel pasif. Geçmiş kayıtlar kalır.

## 5. Yetki ve gizlilik

- Maaş ve T.C. alanlarını gereksiz paylaşmayın.
- Kan grubu / medeni hâl zorunlu değildir.
- Hassas belgeler yalnızca yetkili İK rollerine.

## 6. Sık sorunlar

| Belirti | Çözüm |
|---------|--------|
| Kod serisi yok | Migration 053 / `HR_*` serileri |
| Bordro param yok | `hr-bordro-parametreleri` TR-2025 |
| İzin bakiyesi yetersiz | Hak ediş `POST /hr-izin/bakiyeler/accrue` |
| Çıkış onaylanmıyor | Açık zimmetleri iade edin |
