# Veritabanı Tasarımı (Aşama 2 taslak)

**DDL yazılmadı.** Sonraki migration adayı: `056_prj_core.sql` (+ rollback).  
**Kaynak:** Canias 19 video UI + mevcut KTB şema.

---

## 1. İlkeler

- İngilizce tablo adları; `company_id`; soft archive; finans bağlı kayıtlarda `ON DELETE RESTRICT`.
- Mevcut `project_code` VARCHAR korunur → `projects.project_code` ile hizalanır.
- Canias “Operasyon/Aktivite” ≈ `work_items` (+ tür); malzeme/kaynak çocuk tablolar.
- Maliyet: `project_cost_entries` tek kaynak; PO+fatura çift sayılmaz.

---

## 2. Çekirdek tablolar

| Tablo | Amaç | Canias izi |
|-------|------|------------|
| `projects` | Proje master | PRJT05 Genel |
| `project_types/categories/statuses/priorities` | Tanımlar | Tip/Kategori/Durum |
| `project_members` + `project_roles` | Ekip | Ekip sekmesi / rol |
| `project_phases` | WBS faz | WBS |
| `project_milestones` | Kilometre taşı | Milestone |
| `project_templates` | Şablon | Brief §9 |
| `work_item_types/statuses/priorities` | Yapılandırılabilir türler | Operasyon tipleri + Jira |
| `work_items` | İş/aktivite/operasyon | Operasyonlar |
| `work_item_relations` | Bağımlılık | Gantt connectors / bağımlılık göster |
| `work_item_materials` | Aktivite malzemesi | V04/V06 |
| `work_item_resources` | Kaynak atama | PRJT17/18 |
| `work_confirmations` | Operasyon teyidi/onay | PRJT06 |
| `work_logs` | Zaman (Jira worklog uyumu) | Teyit süreleri |
| `project_budgets` / `project_budget_lines` | Bütçe | Bütçe sekmesi |
| `project_cost_entries` | Gerçekleşen maliyet satırı | V07 |
| `project_revenues` / funds | Gelir/fon | V08–09 |
| `project_price_lines` | Proje satış fiyatı | PRJT14 |
| `project_purchase_links` | PUR belge bağ | V10 |
| `project_sales_links` | SAL belge/kalem bağ | SALT01 |
| `prj_workflows` + transitions | WF | Jira + durum kodları |
| `prj_boards` / `sprints` | Agile | Jira (Canias’ta yok) |
| `project_risks` | Risk | Brief |
| `work_item_comments/attachments/history` | Sosyal/audit | Doküman/Log |
| `prj_automations` / logs | Otomasyon | Jira |

---

## 3. Kritik alanlar (`projects`)

`company_id`, `project_code` UK, `name`, `description`, `type_id`, `category_id`, `status_id`, `priority_id`, `partner_id` (müşteri), `manager_user_id`, `department_code`, `plan_start/end`, `actual_start/end`, `currency_code`, `percent_complete`, `crm_opportunity_id`, `approach` (classic|scrum|kanban), `portfolio_code`, `is_archived`, audit kolonları.

---

## 4. Maliyet politikası (çift sayım)

Öncelik sırası (taslak): Fatura (kesin) > Stok çıkış değeri > Onaylı worklog×tarif > PO (taahhüt, gerçekleşen değil).  
`project_cost_entries.source_module/table/id` zorunlu; drill-down.

---

## 5. Açık sorular

- EPS ayrı tablo mu yoksa `portfolio_code` yeterli mi?
- Canias “Ağ Yapısı / Network” = ayrı entity mi yoksa phase+work_item mi?
- Fon = revenue subtype mi ayrı tablo mu?
