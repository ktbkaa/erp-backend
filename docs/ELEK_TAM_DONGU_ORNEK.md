# ELEK Tam Döngü Örnekleri

Firma: **Kompanzasyon Röle Elektronik A.Ş.** (`ELEK`)

Canias “Tam Döngü Süreç Akışı”na göre üç ayrılabilir paket. Eski ELEK örnek verisi script başında temizlenir.

| Etiket | Anlamı | Nasıl ayırt edilir |
|--------|--------|--------------------|
| `ELEK-BASE` | Ana veri (stok, cari, fiyat, BOM, rota) | Stok/cari `description` / notlar |
| `ELEK-MAN` | **MRP’siz** uçtan uca süreç | `project_code = ELEK-MAN` |
| `ELEK-MRP` | **MRP’li** uçtan uca süreç | `project_code = ELEK-MRP` |

## Çalıştırma

```bash
npm run migrate
npm start   # ayrı terminal
npm run demo:elek-dongu
```

Özet JSON: `docs/elek-tam-dongu-ozet.json`

## ELEK-BASE

1. Malzeme (BAST03): PCB, kondansatör, bobin, gövde, mamul KR-200  
2. BOM (BOMT01) + rota (ROUT01) + iş merkezi  
3. Cari müşteri/tedarikçi (BAST02) + satış fiyat listesi (SALT02)

## ELEK-MAN (MRP yok)

1. Satış teklifi → satış siparişi  
2. Manuel SA talep → SA sipariş (+onay kaydı) → mal kabul (+GKK) → alış fatura / muhasebe  
3. Doğrudan iş emri (sipariş bağlı) → operasyon tamamlama (malzeme çıkış + mamul giriş)  
4. Sevk emri → irsaliye (e-belge Gonderildi) → satış fatura / muhasebe  

## ELEK-MRP (MRP var)

1. Düşük açılış stok + satış siparişi + bağımsız ihtiyaç  
2. MRP çalıştır → SA talep + üretim önerisi  
3. Talep → SA sipariş (+onay) → mal kabul (+GKK) → alış fatura / muhasebe  
4. İş emri (MRP/rota) → operasyonlar  
5. Sevk → irsaliye → satış fatura / muhasebe  

## UI kontrol

1. Üst bardan firma = **ELEK**  
2. Listelerde `project_code` / açıklamada `ELEK-MAN` veya `ELEK-MRP` ara  
3. Diğer firmalar (TEKS/META/GIDA) bu scriptte dokunulmaz  

```sql
-- Örnek filtre
SELECT * FROM sales_orders
WHERE company_id = (SELECT id FROM companies WHERE company_code='ELEK')
  AND project_code IN ('ELEK-MAN','ELEK-MRP');
```
