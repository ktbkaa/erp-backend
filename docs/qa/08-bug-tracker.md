# Bug Tracker

| ID | Sev | Modül | Başlık | Durum | Kök neden / Düzeltme |
|---|---|---|---|---|---|
| BUG-001 | P2 | Sistem / SQL | `GET /sql-console` 404 | **fixed** | Sadece `/meta` vardı; `GET /` eklendi (`routes/sql_console.js`) |
| BUG-002 | P2 | QA tooling | API smoke login alan adları yanlış | **fixed** | `username/password` kullanacak şekilde `api-smoke.mjs` düzeltildi |
| BUG-003 | P1 | Demo | `demo:4-firma` TR tablo adları (`firmalar`) | **open** | EN rename sonrası güncellenmemiş. Workaround: `scripts/qa/ensure-gida-org.js` |
| BUG-004 | P1 | Finans | Satış faturası muhasebeleştir: `Hesap kodu bulunamadı: 120.01.001` | **fixed** | `gl_accounts` boştu; `ensure-finance-seed.js` + FA00009→MB00001 |
| BUG-005 | P2 | MRP | TEST-SUT-MRP: stok sıfırlama yetersiz bakiye + net öneri yok | **open** | Temizlik sonrası stok durumu / ufuk parametreleri; MAN yolu başarılı |
| BUG-006 | P2 | Sevk | MRP yolu irsaliye onayı yetersiz depo bakiyesi | **open** | BUG-005 zinciri |
| BUG-007 | P3 | Onay | Smoke’ta `onaylarim` 401 (token’sız) | **fixed** | Login düzeltmesi sonrası geçiyor |

## Özet
- P0 açık: 0
- P1 açık: 1 (demo-4-firma TR tablo adları)
- P2 açık: 2 (MRP/irsaliye zinciri)
- Düzeltilen: 4
