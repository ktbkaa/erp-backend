# Veritabanı Tasarımı (Taslak — DDL yok)

**Durum:** Aşama 1 varlık taslağı. **Migration / CREATE TABLE yazılmadı** (G1+G3 sonrası 056+).  
**Kural:** Mevcut `project_code` VARCHAR alanları silinmez; master ile hizalanır.

---

## 1. Mevcut şema ile ilişki

| Mevcut | Kullanım |
|--------|----------|
| Belgelerde `project_code` | Geçici etiket; ileride `projects.project_code` lookup |
| `hr_employees`, izin, takvim | Kaynak / worklog maliyeti |
| `approval_*` | Proje/bütçe/CR onayları |
| `audit_logs` | Otomatik |
| `email_dispatches` | Bildirim kuyruğu |
| `crm_opportunities` | Kaynak fırsat FK (opsiyonel) |
| YE satır `project_code` | Proje maliyet/mizan |

Son migration (bu dal): `055_*.sql` → PRJ: `056_prj_core.sql` (plan).

---

## 2. Önerilen varlık grupları (isimler kesin değil)

### Çekirdek
- `projects` — company_id, project_code (UK), name, type_id, category_id, status_id, priority_id, customer_partner_id, manager_user_id, sponsor_user_id, dates, currency, budget/cost/revenue totals (denormalize veya view), % complete, template_id, approach (classic/scrum/kanban), crm_opportunity_id, archive flags, audit columns  
- `project_types`, `project_categories`, `project_statuses`, `project_priorities`  
- `project_members` — project_id, user_id/employee_id, role_id  
- `project_roles`  
- `project_phases`, `project_milestones`  
- `project_templates` (+ template child snapshots)

### İş
- `work_item_types` (config + field schema ref)  
- `work_items` — project_id, type_id, parent_id, number, title, description, status_id, priority_id, assignee, reporter, dates, estimates, story_points, %  
- `work_item_statuses`, `work_item_priorities`, `work_item_labels`, `work_item_label_links`  
- `work_item_relations` — from_id, to_id, relation_type (UK + cycle check app-side)  
- `work_item_comments`, `work_item_attachments` (storage_key), `work_item_history`, `work_item_watchers`

### WF / Agile
- `prj_workflows`, `prj_workflow_statuses`, `prj_workflow_transitions` (guards JSON)  
- `prj_boards`, `prj_board_columns` (WIP)  
- `prj_sprints`, `prj_sprint_items`, `prj_sprint_scope_log`  
- `work_logs`

### Finans / risk / otomasyon
- `project_budgets`, `project_budget_lines`  
- `project_cost_entries` — source_module, source_table, source_id, amount (tek kaynak politikası)  
- `project_revenues`  
- `project_risks`  
- `prj_automations`, `prj_automation_logs`

### Kaynak
- `prj_teams`, `prj_team_members`, `resource_allocations`

---

## 3. Tasarım kararları (taslak)

1. Tablo adları İngilizce (`042` rename politikası).  
2. Soft archive: `is_active` / `archived_at`; hard delete yasak finans bağlıysa.  
3. `project_cost_entries` fatura ile PO’yu aynı anda “gerçekleşen” saymaz — kaynak öncelik matrisi Aşama 2’de.  
4. FK’ler `ON DELETE RESTRICT` veya SET NULL; CASCADE yalnızca saf çocuk meta için.  
5. İndeksler: (company_id, project_code), (project_id, status_id), (assignee, status), work_log (user, date).

---

## 4. Açık sorular (video / Aşama 2)

- Canias PRJ’de maliyet toplama tabloları nasıl?  
- WBS ayrı tablo mu yoksa `work_items` + phase_id yeterli mi?  
- Portföy/program ayrı entity mi yoksa project.type mi?
