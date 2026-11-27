# Jira Özellik Analizi → KTB PRJ Gereksinimleri

**Amaç:** Jira’yı görsel kopyalamadan veri organizasyonu ve işletim mantığını KTB ERP gereksinimlerine çevirmek.  
**Durum:** Aşama 1 tamamlandı (ürün bilgisi + KTB uyum kararları).

---

## 1. Genel yaklaşım

| Jira gücü | KTB uyarlaması |
|-----------|----------------|
| Her iş ayrı kayıt (issue) | `work_items` (+ tür tanımı) |
| Proje = konteyner + ayar | `projects` + şablon/WF/board ayarları |
| Yapılandırılabilir WF | Tanım tabloları + geçiş kuralları; mevcut **onay motoru** ile birleşik onay adımları |
| Board / backlog / sprint | Agile opsiyonel; klasik Gantt projelerinde kapalı olabilir |
| Worklog | `work_logs`; İK kapasitesi ile çapraz kontrol |
| Permission scheme | Proje rolleri + ekran ACL + finans ayrı yetki |
| Automation | Koşul–tetik–eylem + log; e-posta kuyruğu |

Jira Cloud UI (yeni navigation, Atlassian Intelligence vb.) **kapsam dışı**.

---

## 2. A — Proje / çalışma alanı

| Jira kavramı | KTB gereksinimi | Öncelik |
|--------------|-----------------|---------|
| Project + key | `project_code` unique (firma içinde) + numaratör | P0 |
| Project lead | `manager_user_id` / HR personel | P0 |
| Members / roles | `project_members` + rol kataloğu | P0 |
| Categories | Tanım ekranı | P1 |
| Templates | Şablon → proje kopyası (faz/iş/WF) | P0 |
| Schemes (WF, screen, perm) | Proje tipi / şablon bağları | P1 |
| Archive | `is_archived` + salt okunur | P1 |
| Copy project | Yapısal kopya; maliyet/worklog kopyalanmaz | P2 |

**Karar:** Portföy → Program → Proje hiyerarşisi opsiyonel üst katman; küçük firmalar doğrudan Proje kullanır.

---

## 3. B — Work items

| Jira | KTB |
|------|-----|
| Issue types (Epic, Story, Task, Sub-task, Bug…) | Yönetilebilir `work_item_types` (+ alan şeması JSON/tablo) |
| Issue key | Firma+proje veya global seri (`PRJ-ISS-…` / belge no) |
| Summary, description | Zorunlu başlık; açıklama zengin metin (HTML veya markdown — UI standardına göre) |
| Assignee / reporter | `users` / `hr_employees` |
| Priority, status, labels | Tanım + M:N etiket |
| Parent / sub-tasks | `parent_id` + tür kuralları |
| Estimates / time spent | Saat + opsiyonel story point |
| % done | Alt iş ağırlıklı roll-up (kural ile) |
| Attachments / comments / history | Ek, yorum, history tabloları; audit ile uyum |

**Tür örnekleri (seed, kilitli değil):** Epic, Story, Task, Sub-task, Bug, Improvement, Change Request, Risk, Issue, Milestone, Approval, Decision.

---

## 4. C — Hiyerarşi

```
Portföy → Program → Proje → Faz → Epic/Paket → Görev → Alt görev
```

- Seviyeler şablonla aç/kapa.
- Üst tamamlanma: alt ağırlıklı % (ERP önerisi: varsayılan eşit ağırlık; alan ile override).
- “Alt bitmeden üst Done olamaz” → WF geçiş kuralı.

---

## 5. D — İlişkiler

| Tip | Takvim etkisi |
|-----|----------------|
| blocks / is blocked by | B başlaması A Done’a bağlı olabilir |
| depends on / is required by | Aynı |
| relates to | Etki yok |
| duplicates / is duplicated by | Etki yok; uyarı |
| parent-child | Hiyerarşi (ayrı tabloda da tutulabilir) |

**Döngü engeli:** DFS/topo kontrol (P0).  
Kritik yol: Aşama 5 (P1).

---

## 6. E — Workflow

- Durumlar proje/tür şemasına bağlı (global varsayılan + override).
- Geçiş: rol, zorunlu alan, validasyon, otomasyon, bildirim.
- Onay bekleyen durumlar → mevcut `approval_*` kayıtları ile bağlanabilir (çift WF yazılmaz; “Approval” tipi geçiş onay başlatır).
- Geçmiş: her status change satırı.

Örnek varsayılan (şablon): Taslak → Açık → Analiz → Yapılacak → Devam → İnceleme → Test → Onay Bekliyor → Tamamlandı (+ Beklemede, Bloke, İptal, Red, Yeniden Açıldı).

---

## 7. F — Scrum

Backlog, sprint (hedef/tarih/kapasite), planlama, story point/saat, complete/cancel, kalan işleri sonraki sprint veya backlog’a taşıma, scope change log, burndown/velocity (rapor Aşama 7).

---

## 8. G — Kanban

Sütun = WF status (veya status grubu). Drag-drop **yalnızca yetkili geçişi** çağırır (API). WIP limit, sayaç, filtreler, geciken/bloke vurgusu.

---

## 9. H — Backlog / öncelik

Merkezi backlog (proje veya board kapsamı). Öncelik: Critical…Lowest — sıralama + planlama skoruna etki (yalnızca renk değil).

---

## 10. I — Worklog

Kullanıcı, tarih, süre veya başlangıç–bitiş, açıklama, görev, proje, onay durumu.  
Çakışma: uyarı veya engel (parametre).  
Tahmini vs gerçekleşen.  
Düzeltmede eski değer history’de.

İK: izin/vardiya günlerinde uyarı (Aşama 5–6).

---

## 11. J — Raporlar (hedef set)

Proje durum, görev durum, gecikenler, iş yükü, ekip, sprint/burndown/velocity, tahmini/gerçek, bütçe/maliyet/kârlılık, risk, kaynak, milestone, karşılaştırma — filtre: firma, proje, tarih, ekip, kullanıcı, durum.

---

## 12. Jira’dan bilinçli olarak alınmayanlar

- Atlassian Marketplace / 3rd party zorunluluğu  
- JQL motorunun birebir kopyası (KTB filtre DSL’si + SQL)  
- Confluence wiki  
- Jira Service Management portalı (ayrı ürün)  
- Advanced Roadmaps lisans özellikleri (gerekirse sade portföy görünümü)

---

## 13. KTB’ye özel ekler (Jira’da zayıf / yok)

- Proje bütçe kalemleri + ERP maliyet toplama (çift sayım yasağı)  
- CRM fırsat → proje, PUR/SAL/WO/INV belge bağları  
- Canias benzeri proje boyutlu mizan  
- Çoklu şirket + depo/firma yetkisi  
- Onay modülü entegrasyonu  

Bunlar Jira’dan değil ERP ihtiyacından gelir (`03_…`, `07_…`).
