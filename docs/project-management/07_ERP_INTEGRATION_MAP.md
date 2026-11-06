# ERP Entegrasyon Haritası (Taslak)

**Durum:** Aşama 1 — mevcut kancalar + hedef akışlar. Detay API sözleşmeleri Aşama 2/6.

---

## 1. Özet

| Modül | Bugünkü kanca | PRJ yönü | Veri | Öncelik |
|-------|---------------|----------|------|---------|
| CRM | Fırsat, faaliyet, görev, ajanda | Fırsat → proje; faaliyet bağlama | `crm_opportunities.id` → `projects.crm_opportunity_id` | P1 |
| Satış | Teklif/sipariş `project_code` | Lookup + beklenen gelir | `sales_quotations`, `sales_orders` | P0 |
| Satınalma | Talep/PO `project_code` | Talep/PO ↔ proje/görev; teslimat uyarısı | `purchase_*` | P0 |
| Stok | Rezervasyon, hareket | Proje rezervasyonu; çıkış → maliyet | `item_reservations`, stock movements | P1 |
| Üretim | İş emri | WO ↔ proje; ilerleme | production orders | P1 |
| Kalite | KK, NCR, CAPA | NCR → iş kaydı | qc tables | P2 |
| İK | Personel, izin, takvim | Üye, kapasite, worklog maliyeti | `hr_*` | P1 |
| Finans | YE `project_code`, mizan | Bütçe/maliyet/mizan | JE lines | P0 |
| Onay | Rota motoru | Bütçe/kapanış/CR | `approval_records` | P0 |
| Bakım | (sınırlı/yok) | Yatırım/devreye alma — ürün olgunluğuna bağlı | TBD | P3 |

---

## 2. Kritik iş kuralları

### 2.1 Çift maliyet sayımı yasağı
Aynı ekonomik olay (ör. satınalma) hem PO hem fatura hem stok çıkışında “gerçekleşen maliyet” olarak **üç kez** yazılmaz.  
`project_cost_entries` tek kaynak satırı + `source_*` drill-down. Politika matrisi Aşama 2’de kilitlenir.

### 2.2 `project_code` geçiş
1. PRJ master canlıya alınır.  
2. Belge formlarında serbest metin → proje lookup.  
3. Eski serbest kodlar migration/eşleme aracı ile eşleştirilir (DEMO_/manuel).  
4. Raporlar kod veya id ile birleşir.

### 2.3 Onay
PRJ ekranları `routes/onay_ekranlari.js` kataloğuna eklenir; `baslatOnay({ screen_id, document_id, amount })`.

### 2.4 Bildirim
`epostaKuyrugaAl` + `source_type = 'prj_…'`; testte SMTP kapalı.

---

## 3. Uçtan uca senaryo bağları (brief §10)

| Adım | Kaynak modül | PRJ etkisi |
|------|--------------|------------|
| 1–2 CRM fırsat | CRM | Aday proje |
| 3–4 Teklif kabul | Satış | Proje create + gelir planı |
| 5–11 Plan | PRJ | Ekip, faz, WBS, Gantt |
| 12–16 Bütçe/PUR/stok | PRJ+PUR+INV | Bütçe + maliyet + rezervasyon |
| 17–18 Üretim/KK | MFG+QLT | İlerleme / NCR |
| 19–21 Worklog/risk | PRJ+İK | Maliyet + uyarı |
| 22–26 Kabul/kapanış | PRJ+FIN | Kârlılık + arşiv |

---

## 4. Bilinçli olarak bağlanmayanlar

- `crm_tasks` tablosunu PM iş kaydı olarak genişletmek (ayrı domain).  
- Canias BAST20 konfigüratör = PRJ (ayrı kesit; gerekirse sonra köprü).
