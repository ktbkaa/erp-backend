# İş Akışı Tasarımı (Aşama 2 taslak)

İki katman: **(A) Proje/iş durumu WF (Jira tarzı)** · **(B) Operasyon teyidi/onay (Canias PRJT06/12)**.

---

## A. Yapılandırılabilir durum WF

- Tanım: `prj_workflows` → tür + şablon bağları.
- Geçiş: rol, zorunlu alan, validasyon, otomasyon, bildirim.
- Onay bekleyen durum → mevcut `onayService` opsiyonel tetik.
- Kanban sütunu = status veya status grubu; DnD = aynı geçiş API.

Varsayılan görev şablonu (brief): Taslak→Açık→…→Tamamlandı + Beklemede/Bloke/İptal/Red/Yeniden Aç.

Canias’ta görülen proje durumu örneği: `10-Başlatıldı` (numerik kod + etiket) — KTB’de `status_code` + `label`.

---

## B. Operasyon teyidi (Canias)

| Adım | Davranış | Kanıt |
|------|----------|-------|
| Plan | Aktivite/operasyon planlanır | PRJT05 |
| Hazır | Kaynak atanır; durum Hazırlandı | PRJT12 |
| Teyit | PRJT06: başlangıç/bitiş, miktar, birim, personel/malzeme/maliyet sekmeleri | V11 |
| Onay diyaloğu | Öngörülen süre uyarısı; Evet / Hepsine Evet / Hayır | V14 |
| Faturalama adayı | Onaylı kayıtlar listelenir; Kabul/Red/Bekliyor | V16 |

KTB eşlemesi: `work_confirmations` + isteğe bağlı worklog üretimi; “Hepsine Evet” = toplu onay.

---

## C. Alt iş kuralı

“Alt bitmeden üst Done olamaz” → WF geçiş guard (yapılandırılabilir).  
Roll-up % → alt ağırlıklı ortalama.

---

## D. Satış/satınalma yan süreçleri

- SALT01: sipariş/kalem → proje create (durum Başlatıldı).
- V10: satınalma belgesi proje bileşenine bağlanır (WF değil, belge bağ).
- V15: fiyat kaydı info mesajı + satış fiyatı persist.
