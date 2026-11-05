# Veritabanı Bütünlük Denetimi

Tarih: 2026-11-05T11:16:15.450Z

Tablolar: 181 · FK: 483

| Sev | Kod | Başlık | Detay |
|---|---|---|---|
| ok | `ORPHAN_SO_LINES` | Satış sipariş satırı yetim | 0 |
| ok | `ORPHAN_PO_LINES` | SA sipariş satırı yetim | 0 |
| ok | `ORPHAN_INV_LINES` | Fatura satırı yetim | 0 |
| ok | `ORPHAN_SM_LINES` | Stok hareket satırı yetim | 0 |
| ok | `ORPHAN_WO_COMP` | ÜE bileşen yetim | 0 |
| ok | `BAD_ITEM_FK_SO` | SO satırında geçersiz stok | 0 |
| ok | `BAD_ITEM_FK_PO` | PO satırında geçersiz stok | 0 |
| ok | `BAD_PARTNER_SO` | SO geçersiz cari | 0 |
| ok | `BAD_WH_SM` | Stok hareket geçersiz depo | 0 |
| ok | `NEG_STOCK` | Negatif kullanılabilir stok bakiyesi | 0 depo-stok çifti |
| info | `JE_SKIP` | Muhasebe denge sorgu | column "journal_entry_id" does not exist |
| ok | `DUP_COMPANY` | Mükerrer firma kodu | 0 kod |
| ok | `DUP_ITEM` | Mükerrer stok kodu | 0 grup |
| ok | `SOFTDEL_ACTIVE_SO` | Soft-delete ama aktif status SO | 0 |
| ok | `CROSS_COMPANY_STOCK` | Hareket-stok firma uyumsuzluğu | 0 satır |
| ok | `MRP_MSG_TABLE` | mrp_run_messages tablosu | 19 mesaj |

## Özet

- OK: 15
- P0: 0
- P1: 0
- P2: 0
- Info: 1
