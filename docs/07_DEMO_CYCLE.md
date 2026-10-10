# Demo Döngüsü — Satınalma + Üretim

## Senaryo

```text
HM-001 + HM-002  →  YM-001  →  Yarı Mamul Depo
HM-003 + HM-004  →  YM-002  →  Yarı Mamul Depo
YM-001 + YM-002  →  MM-001  →  Mamul Depo
```

Satınalma ile 4 hammadde **Ana Depo**’ya girer.

> Not: Mamul, hammadde deposuna değil **Mamul Depo (MM)**’ye alınır.  
> Bu, ERP stok ayrımı için doğrudur.

## Çalıştırma

```powershell
git pull origin cursor/erp-infra-a1-4f63
npm run migrate
npm run demo:cycle
npm start
```

Tarayıcı: `http://localhost:3000/`

## Beklenen bakiyeler (özet)

| Depo | Stok | Bakiye |
|------|------|--------|
| ANA | HM-001..004 | her biri 5 (10 alım − 5 tüketim) |
| YM | YM-001, YM-002 | 0 (üretilip mamule tüketildi) veya senaryoya göre |
| MM | MM-001 | 5 |

Demo: her HM’den 10 alınır, YM’ler için 5’er tüketilir → ANA’da 5 kalan;  
YM’ler 5’er üretilip mamule 5’er tüketilir → YM depo 0; Mamul Depo’da MM-001 = 5.

## API

- `GET/POST /urun-agaclari`
- `GET/POST /is-merkezleri`
- `GET/POST /rotalar`
- `GET/POST /satin-alma-talepleri`
- `POST /satin-alma-siparisleri/talep-donustur`
- `GET/POST /mal-kabuller`
- `GET/POST /uretim-emirleri`
- `POST /uretim-emirleri/:id/uretim-giris`
- `GET /stok-bakiyeleri`
