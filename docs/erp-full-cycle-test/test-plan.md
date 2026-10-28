# GIDA / TEST-SUT — Canias Tam Döngü Test Planı

**Firma:** Anadolu Süt ve Süt Ürünleri A.Ş. (`GIDA`, id=4)  
**Tesis:** GIDA-MRK  
**Etiket:** `CANIAS-TAM-DONGU-TEST` / `TEST-SUT-*`  
**Yedek:** `backups/gida-tam-dongu/pre-clean.dump` (2026-10-28)

## Temizlik kararı

- Yalnızca `company_id = GIDA` kapsamı temizlenir; ELEK/TEKS/META dokunulmaz.
- Org iskeleti korunur: company, plant, warehouses (ANA/HMD/MAM/KK/SVK/GIR/CKK/YM), work_center.
- Eski demo kartlar + belgeler silinir; ardından TEST-SUT ana veri ve süreç belgeleri yeniden oluşturulur.
- Muhasebe fişi geçmişi GIDA’da zaten yoktu (0 journal).

## Senaryo ürünleri

| Kod | Ad | Tip | Birim |
|-----|-----|-----|-------|
| TEST-SUT-H01 | Çiğ Süt | Hammadde | LT |
| TEST-SUT-H02 | Süt Kültürü | Hammadde | KG |
| TEST-SUT-A01 | 1 L Süt Şişesi | Hammadde | AD |
| TEST-SUT-A02 | Süt Kapağı | Hammadde | AD |
| TEST-SUT-Y01 | Pastörize Süt | YariMamul | LT |
| TEST-SUT-M01 | Tam Yağlı Süt 1 L | Mamul | AD |
| TEST-SUT-M02 | Yoğurt 1 KG | Mamul | KG |

BOM (M01): 1.02 LT çiğ süt + 1 şişe + 1 kapak → 1 AD mamul.  
Rota: Kabul-Analiz → Pastörizasyon (YM çıktı) → Dolum → Soğuk Depolama (mamul).

## Çalıştırma

```bash
npm run db:backup   # ek yedek
npm start           # API
npm run demo:gida-dongu
```

## Adım eşleme

Bkz. `screen-mapping.md`.
