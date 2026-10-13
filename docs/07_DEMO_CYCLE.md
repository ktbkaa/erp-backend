# Demo Döngüsü — Tek ürün ağacı + operasyon sırası

## Ürün ağacı (tek kök)

```text
MM-001 Mamul - Demo Cihaz
├─ YM-001 Yarı Mamul 1
│  ├─ HM-001
│  └─ HM-002
└─ YM-002 Yarı Mamul 2
   ├─ HM-003
   └─ HM-004
```

Üç ayrı ağaç yoktur. Mamulün ağacı tüm hiyerarşiyi taşır.

## Rota / iş emri operasyonları

| Sıra | Kod | İş | Kullanılan | Çıktı | Sonraki |
|------|-----|-----|------------|-------|---------|
| 10 | OP10 | YM1 montaj | HM1, HM2 | YM-001 → YM depo | OP20 |
| 20 | OP20 | YM2 montaj | HM3, HM4 | YM-002 → YM depo | OP30 |
| 30 | OP30 | Mamul montaj | YM1, YM2 | MM-001 → Mamul depo | — |

İş emri açılınca bu operasyonlar kopyalanır. İlki `Hazir`, diğerleri `Bekliyor`.  
Bir operasyon bitince sonraki `Hazir` olur.

## Çalıştırma

```powershell
git pull origin cursor/erp-infra-a1-4f63
npm run migrate
npm run demo:cycle
npm start
```

UI: `http://localhost:3000/`
