# KTB ERP — Proje Yönetimi (PRJ) Modülü · Ana Plan

**Durum:** Aşama 1–8 + gap turu **tamamlandı** (doğrulama 8 Kasım 2026)  
**Dal:** `cursor/erp-prj-modul-analiz-4f63`  
**PR:** #80  
**Modül kodu:** `PRJ` (screen-naming-standard’da rezerve)  
**Skor:** ~74/100 → `14_FINAL_ASSESSMENT.md`

---

## 1. Amaç

KTB ERP içinde Jira tarzı iş/süreç yönetimi + Canias tarzı ERP süreç bağları + kurumsal planlama/maliyet/kaynak yeteneklerini birleştiren **ticari kullanıma uygun** Proje Yönetimi modülü.

---

## 2. Çalışma kapıları

| Kapı | Koşul | Durum |
|------|--------|--------|
| G0 | Mevcut KTB ERP mimarisi incelendi | **Tamam** |
| G1 | Canias PRJ 19 video analizi | **Tamam (kanıt sınırlı)** |
| G2 | Jira → KTB gereksinim | **Tamam** |
| G3 | Fonksiyonel tasarım paketi | **Kilitli** |
| G4 | Migration / MODULES / route | **Tamam** (`056`–`058`, MODULES `proje`) |

---

## 3. Aşama planı ve sonuç

| Aşama | İçerik | Durum |
|------|--------|--------|
| 1 Analiz | Mimari + Canias + Jira | Tamam |
| 2 Tasarım | Ekran / WF / DB / entegrasyon / yetki | Tamam |
| 3 Temel | Proje / iş CRUD | Tamam |
| 4 İş yönetimi | WF, board, backlog, sprint | Tamam |
| 5 Planlama/finans | Gantt DnD, kaynak, bütçe | Tamam |
| 6 Entegrasyon | CRM…KK bağları | Tamam |
| 7 Rapor/otomasyon | Dashboard, kapanış, onay/e-posta | Tamam |
| 8 Test | 14/14 otomatik | Tamam |

Anlatım: `15_STAGES_WALKTHROUGH.md`  
Kullanım: `13_USER_GUIDE.md` + PDF + UTF-8 txt.

---

## 4. Doküman paketi

| Dosya | Durum |
|-------|--------|
| `00` … `09` | Analiz + tasarım |
| `10` … `12` | Test plan / sonuç / bilinen sorunlar |
| `13` + PDF/UTF-8 | Kullanım kılavuzu |
| `14` | Nihai skor |
| `15` | Aşama anlatımı |

---

## 5. Sonraki adım (ürün)

Board kart DnD, workspace sekmeleri, HR kapasite, ekran yetki seed, muhasebe motor derin bağ — `12_KNOWN_ISSUES.md`.
