# Yetki Matrisi — PRJ

**Durum:** Aşama 2 taslak (G3 kilidi)  
**Kaynak:** Brief §6 · mevcut `user_screen_permissions` / `module_permissions` · Canias PRJT05/06/12 (proje + onay)  
**İlke:** Şirket kapsamı (`company_id` + `X-Firma-Id`) her zaman; proje üyeliği ikinci katman; **bütçe/maliyet yetkisi ayrı flag**.

---

## 1. Katmanlar

| Katman | Mekanizma | Not |
|--------|-----------|-----|
| Modül | `module_permissions` → `proje` | Modülü hiç görmeme |
| Ekran | `user_screen_permissions` (ekran kodları `PRJ-*`) | Liste/form/tanım |
| Proje rolü | `prj_project_members.role_code` | Kayıt bazlı |
| Finans | `can_view_budget` / `can_edit_budget` / `can_view_costs` | Proje görmek ≠ bütçe görmek |
| Onay | `onayService` + `onay_ekranlari` | Kapanış, bütçe revizyonu, kritik durum |

---

## 2. Proje rolleri (seed)

| Kod | Ad | Açıklama |
|-----|-----|----------|
| `PM` | Proje Yöneticisi | Plan, atama, kapanış talebi |
| `SPONSOR` | Proje Sponsoru | İzleme + yüksek onay |
| `LEAD` | Takım Lideri | Alt ekip atama / durum |
| `MEMBER` | Proje Üyesi | Kendi işleri + yorum/worklog |
| `OWNER` | Görev Sorumlusu | Atandığı işlerde durum/worklog |
| `WATCHER` | İzleyici | Salt okunur (finans hariç) |
| `FIN` | Proje Finans Sorumlusu | Bütçe/maliyet; iş düzenleme sınırlı |
| `APPROVER` | Onaylayıcı | WF onay + operasyon confirmation |
| `ADMIN` | Sistem / PRJ Admin | Tanımlar, WF, otomasyon, tüm şirket projeleri |

---

## 3. İşlem × rol matrisi

**G** = görüntüle · **Y** = yaz/oluştur · **D** = düzenle · **S** = sil/arşiv · **O** = onay · **—** = yok  
`*` = yalnızca atandığı kayıtlar · `F` = finans flag gerekir

| İşlem | PM | SPONSOR | LEAD | MEMBER | OWNER | WATCHER | FIN | APPROVER | ADMIN |
|-------|----|---------|------|--------|-------|---------|-----|----------|-------|
| Proje liste / kart (finans alanları hariç) | G | G | G | G | G | G | G | G | G/D |
| Proje oluştur | Y | — | — | — | — | — | — | — | Y |
| Proje düzenle (meta) | D | — | — | — | — | — | — | — | D |
| Proje arşiv / kapat talep | Y | O | — | — | — | — | — | O | Y/O |
| Ekip yönetimi | D | G | D* | G | G | G | G | G | D |
| İş oluştur / düzenle | Y/D | G | Y/D | Y* | D* | G | G | G | Y/D |
| İş atama | Y | — | Y | — | — | — | — | — | Y |
| Durum geçişi (WF) | Y | — | Y* | Y* | Y* | — | — | O† | Y |
| Operasyon onayı (PRJT06/12) | O | — | O* | — | — | — | — | O | O |
| Worklog gir | Y | — | Y | Y | Y | — | — | — | Y |
| Worklog onay | O | — | O | — | — | — | O | O | O |
| Bütçe görüntüle | F | F | — | — | — | — | G | — | G |
| Bütçe düzenle / revizyon | F | O | — | — | — | — | D | O | D |
| Maliyet drill-down | F | F | — | — | — | — | G | — | G |
| Dosya yükle | Y | G | Y | Y | Y | G | G | G | Y |
| Yorum | Y | Y | Y | Y | Y | Y‡ | Y | Y | Y |
| Board/Sprint plan | Y | G | Y | G | G | G | G | G | Y |
| WF / otomasyon tanım | — | — | — | — | — | — | — | — | Y |
| Başka şirket projesi | — | — | — | — | — | — | — | — | —§ |

† Onay durumuna geçişte APPROVER zorunlu olabilir (WF tanımı).  
‡ WATCHER yorum: şablon ayarı (varsayılan kapalı).  
§ ADMIN bile yalnızca yetkili `company_id` (KTB multi-tenant kuralı).

---

## 4. Ekran kodları (öneri)

| Kod | Ekran | Varsayılan yetki |
|-----|-------|------------------|
| `PRJ-LIST` | Proje listesi | module+G |
| `PRJ-CARD` | Proje kartı / workspace | proje üyesi |
| `PRJ-WORK` | İş listesi / kart | proje üyesi |
| `PRJ-BOARD` | Kanban/Scrum | proje üyesi |
| `PRJ-GANTT` | Zaman çizelgesi | proje üyesi |
| `PRJ-BUDGET` | Bütçe | FIN flag |
| `PRJ-COST` | Maliyetler | FIN flag |
| `PRJ-RISK` | Riskler | proje üyesi |
| `PRJ-RPT` | Raporlar | rol bazlı |
| `PRJ-DEF-*` | Tanımlar (tür, WF, etiket…) | ADMIN |
| `PRJ-AUTO` | Otomasyon kuralları | ADMIN |

Frontend gizler; **backend her yazmada** rol + şirket + finans flag doğrular.

---

## 5. Audit

| Olay | Log |
|------|-----|
| Proje/iş CRUD, durum geçişi | mevcut audit middleware |
| Bütçe satır değişimi | alan seviyesi: eski→yeni tutar/kur |
| Yetki/rol değişimi üyelikte | audit + opsiyonel bildirim |
| Onay kararları | `onayService` geçmişi |

---

## 6. Açık kararlar

| Konu | Öneri | Durum |
|------|--------|--------|
| SPONSOR varsayılan finans görür mü? | Hayır — ayrı F flag | Kilit önerisi |
| MEMBER alt görev oluşturabilir mi? | Evet, kendi üst işinde | Kilit önerisi |
| FIN iş durumunu değiştirebilir mi? | Hayır (salt finans) | Kilit önerisi |
