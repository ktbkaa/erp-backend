# Ekran Envanteri (Aşama 2 taslak — Canias 19 video + Jira + KTB)

**Kaynak:** `01_CANIAS…`, `02_JIRA…`, `03_FR…`  
**Modül id (öneri):** `proje` · **techId öneki:** `PRJ-`  
**Kod yok** — yalnızca envanter.

---

## 1. Menü yapısı (öneri)

| Bölüm | Ekran (TR) | legacy id | techId | Canias izi | Öncelik |
|-------|------------|-----------|--------|------------|---------|
| Projeler | Proje Listesi | `prj-projeler` | PRJ-PRJ-SCR-001 | PRJT01/05 | P0 |
| Projeler | Proje Çalışma Alanı | `prj-calisma-alani` | PRJ-PRJ-SCR-002 | PRJT05+PRJT30 | P0 |
| İşler | İş / Aktivite Listesi | `prj-isler` | PRJ-WI-SCR-001 | Operasyonlar | P0 |
| İşler | İş Kartı | `prj-is-karti` | PRJ-WI-SCR-002 | PRJT05 op | P0 |
| Plan | Gantt / Zaman Çizelgesi | `prj-gantt` | PRJ-PLN-SCR-001 | Gantt-Plan | P1 |
| Kaynak | Kaynak Atama | `prj-kaynak-atama` | PRJ-RES-SCR-001 | PRJT17/18 | P1 |
| Onay | Operasyon / İş Onaylarım | `prj-onaylarim` | PRJ-CNF-SCR-001 | PRJT06/12 | P0 |
| Finans | Proje Bütçe | `prj-butce` | PRJ-FIN-SCR-001 | Ekip-Bütçe | P0 |
| Finans | Proje Maliyet | `prj-maliyet` | PRJ-FIN-SCR-002 | V07 Maliyetler | P0 |
| Finans | Proje Fiyatlama | `prj-fiyatlama` | PRJ-FIN-SCR-003 | PRJT14/15 | P1 |
| Agile | Board / Backlog / Sprint | `prj-board` vb. | PRJ-AGL-SCR-* | *Jira* (Canias’ta yok) | P1 |
| Risk | Risk / CR | `prj-riskler` | PRJ-RSK-SCR-001 | Brief | P1 |
| Tanımlar | Tür/Durum/Öncelik/WF/Şablon… | `prj-tanim-*` | PRJ-DEF-SCR-* | IASPRJ* | P0 |
| Rapor | Proje Özeti / Analiz | `prj-ozet` | PRJ-RPT-SCR-001 | PRJT30/09/10 | P0 |

---

## 2. Proje çalışma alanı sekmeleri (PRJT05 + PRJT30)

| Sekme | İş ihtiyacı | Canias karşılığı |
|-------|-------------|------------------|
| Genel Bakış | Dashboard widget’lar | PRJT30 |
| Genel | Master alanlar | Genel |
| WBS / Fazlar | Kırılım | WBS |
| Görevler / Operasyonlar | İş listesi | Operasyonlar |
| Board / Backlog / Sprint | Agile (opsiyonel) | — (Jira) |
| Gantt | Çizelge | Gantt-Plan |
| Ekip | Üyeler/roller | Ekip |
| Kaynak | Atama | PRJT17/18 |
| Bütçe | Plan kalemleri | Ekip-Bütçe |
| Maliyetler | Plan vs fiili | İstatistik-Maliyet / V07 |
| Satınalma | PUR bağ | V10 |
| Malzemeler / Stok | İhtiyaç | Stoklar sekmesi |
| Fiyatlama / Gelir | Satış fiyat / fon | PRJT14/15, V08–09 |
| Riskler | Risk/CR | Brief |
| Dokümanlar | Ekler | Dokümanlar |
| Onaylar | Teyit kuyruğu | PRJT06/12 |
| Log / Aktivite | Geçmiş | Log |
| Ayarlar | WF/şablon | — |

Şablona göre sekme gizleme: `PRJ-FR-024`.

---

## 3. Proje kartı alanları (V01 Gözlemlendi → KTB)

Firma, Proje kodu/no, Ad, Açıklama, Müşteri, PY, Sorumlu bölüm, Durum, Tip, Öncelik, Kategori, Plan/fiili başlangıç-bitiş, Para birimi, KDV/masraf merkezi (bütçe bloğu), tesis/depo bayrakları, satış belge bağları, notlar.

---

## 4. Tanım ekranları

Brief §8 listesi + Canias parametre izi (IASPRJ000…): Proje tür/kategori/durum/öncelik; İş tür/durum/öncelik; WF + geçiş; Şablon; Rol; İlişki tipi; Maliyet kategorisi; Bütçe kalemi; Story point; Otomasyon (Jira).

---

## 5. Mevcut KTB ekranlarına dokunuş

| Mevcut ekran | Değişiklik |
|--------------|------------|
| Satış sipariş/teklif | `project_code` → proje lookup (SALT01) |
| Satınalma talep/PO | Proje + bileşen/görev lookup (V10) |
| Stok rezervasyon/hareket | Proje bağ (opsiyonel) |
| `onay_ekranlari` | PRJ ekranları ekle |
| MODULES | Yeni `proje` modülü |
