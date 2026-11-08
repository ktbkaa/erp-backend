# ERP Entegrasyon Haritası (Aşama 2 — Canias 19 video güncel)

---

## 1. Canias playlist’ten doğrulanan bağlar

| Kaynak | Hedef | İşlem | Video | Öncelik |
|--------|-------|-------|-------|---------|
| Satış siparişi (SALT01) | Proje | Belgeden proje oluştur / bağla | V02 | P0 |
| Satış kalemi | Proje | Kalemden proje | V03 | P0 |
| Proje aktivitesi | Stok malzeme | Malzeme seç + aktiviteye ekle | V04/V06 | P0 |
| Proje | Satınalma belgesi | Bileşen seçerek PUR bağ | V10 | P0 |
| Proje malzeme | Satış fiyatı | Fiyatlama kaydet | V15 | P1 |
| Onay/teyit | Faturalama adayı | Onaylı işleri finanse et | V16 | P1 |
| Proje | Fon / fatura | Fon ekle + fon fatura | V08–09 | P2 |
| Proje | İş emri | “İşe Emir Verme” butonu | V01 | P1 |
| Operasyon | Kalite planı sekmesi | Kalite bağ (sekme görüldü) | V04 | P2 |
| Kaynak | Tesis / iş merkezi / personel | Çoklu atama | V17–18 | P1 |
| Proje | Doküman | Dosya widget / sekme | V19/V01 | P1 |
| Proje | Muhasebe boyut | Maliyet plan/fiili; FINT62 (eski envanter) | V07 + FIN | P0 |

---

## 2. KTB mevcut kancalar

| Modül | Bugün | PRJ sonrası |
|-------|-------|-------------|
| SAL/PUR/INV/FIN | `project_code` serbest | Lookup → `projects` |
| CRM | Fırsat | `crm_opportunity_id` (brief; playlist’te yok) |
| Onay | `onayService` | PRJ teyit + bütçe aşımı |
| İK | personel/takvim/izin | Kaynak kapasitesi |
| Audit / e-posta | middleware / kuyruk | `source_type=prj_*` |

---

## 3. Çift maliyet

V07 plan/fiili ayrımı korunur. Gerçekleşen: fatura/stok çıkış/onaylı işçilik — PO yalnızca taahhüt (bkz. `05_DATABASE_DESIGN`).

---

## 4. Playlist’te görülmeyen (Jira/brief ile gelecek)

Scrum/Kanban/Sprint, CRM fırsat akışı, bakım/demirbaş — entegrasyon haritasında P1–P3; Canias kanıtı yok diye “Canias’ta var” denmez.
