# KTB ERP — Sistem Kılavuzu ve Sınama Paketi

Bu klasör, sistemin baştan sona sınanması sonrası üretilen tanıtım / kullanım kılavuzu ve raporları tutar.

## Çıktılar

| Dosya | Açıklama |
|-------|----------|
| `KTB_ERP_Sistem_Kilavuz_Sinama.pdf` | Birleşik PDF (tanıtım + ekran kılavuzu + sınama) |
| `KTB_ERP_Sistem_Kilavuz_Sinama.html` | Aynı içeriğin HTML hali |
| `01_SISTEM_TANITIM.md` | Sistemin kendisini anlatan özet |
| `02_EKRAN_KULLANIM_KILAVUZU.md` | Ekran / ortak kullanım kılavuzu |
| `03_SINAMA_RAPORU.md` | Sınama bulguları ve gap matrisi |
| `evidence/` | Audit JSON, loglar, envanter |
| `shots/` | Ekran görüntüleri |

## Yeniden üretim

```bash
node scripts/sinama-full-audit.js
node scripts/capture-kilavuz-shots.js
node scripts/build-sistem-kilavuz-pdf.js
npm run qa:smoke
```

Demo giriş: `kagantalha.b` · `http://localhost:3000`
