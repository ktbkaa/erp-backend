# Bug Tracker

| ID | Sev | Modül | Başlık | Durum | Kök neden / Düzeltme |
|---|---|---|---|---|---|
| BUG-001 | P2 | Sistem / SQL | `GET /sql-console` 404 | **fixed** | `routes/sql_console.js` GET `/` |
| BUG-002 | P2 | QA tooling | API smoke login alan adları | **fixed** | `username/password` |
| BUG-003 | P1 | Demo | `demo:4-firma` TR tablo adları | **fixed** | EN şema rewrite (`companies`/`plants`/…) + DOKUM |
| BUG-004 | P1 | Finans | Boş `gl_accounts` → muhasebe 400 | **fixed** | `ensure-finance-seed.js` + `qa:all` |
| BUG-005 | P2 | MRP | Net satınalma önerisi yok (stok wipe) | **fixed** | Lot-aware wipe + büyük BI; DOKUM MRP→talep OK |
| BUG-006 | P2 | Sevk | MRP irsaliye yetersiz bakiye | **mitigated** | Mamul güvence girişi; CKK→mamul kök neden açık |
| BUG-007 | P3 | Onay | Smoke `onaylarim` 401 | **fixed** | Login |
| BUG-008 | P2 | Stok | Lot’lu giriş + lotsuz çıkış → negatif net bakiye | **open** | `stokWipe` lot-aware; audit NEG_STOCK izlenmeli |
| BUG-009 | P2 | Üretim/KK | CKK sonrası mamul kullanılabilir eksik/negatif | **open** | Demo güvence; transfer/CKK stok statü akışı incelenmeli |
| BUG-010 | P2 | Güvenlik | Token’sız bazı GET’ler soft-auth ile 200 | **accepted** | Yerel soft oturum tasarımı; geçersiz JWT 401 |

## Özet
- P0 açık: 0  
- P1 açık: 0  
- P2 açık: 2 (BUG-008, BUG-009) + BUG-006 mitigated  
- Düzeltilen: 7  
