# Metal Marvel Figür Sanayi — ERP simülasyonu

Orta-büyük ölçekli (≈120 beyaz / 400 mavi yaka) döküm + CNC süperkahraman figür firması.  
3 haftalık süreç etiketi: `MMARVEL-W1` / `MMARVEL-W2` / `MMARVEL-W3`.

## Çalıştırma

```bash
npm run demo:marvel          # firma + İK + master + 3 haftalık süreç
npm run demo:marvel-shots    # ~70 ekran görüntüsü (liste + form)
npm run demo:marvel-pdf      # UTF-8 ayrıntılı PDF rapor
```

## Çıktılar

| Dosya | Açıklama |
|-------|----------|
| `evidence/marvel-sim-ozet.json` | Simülasyon özeti (belge id/no, kullanıcılar, hatalar) |
| `evidence/shot-ids.json` | Ekran görüntüsü için kayıt id’leri |
| `screenshots/` | Liste + form PNG’leri (~71 adet) |
| `metal-marvel-sim-rapor.pdf` | Ayrıntılı UTF-8 süreç raporu (kim / ne / belge no + ekran) |
| `metal-marvel-sim-rapor.html` | Aynı içerik HTML |

## Rapor içeriği

1. Amaç + gap değerlendirmesi  
2. Org / lisans / sicil  
3. Master (stok, BOM, rota, cari)  
4. W1 — CRM → satış (master depo) → SA (direkt + talep/teklif) → mal kabul  
5. W2 — döküm/CNC üretim, proje, kalibrasyon, onay  
6. W3 — sevk, İK (ilan/aday/bordro), NCR, MRP  
7. Belge matrisi + tekrarlama komutları  

## Demo kullanıcılar

Şifre: `Demo123!`

`marvel.satis`, `marvel.sa`, `marvel.planlama`, `marvel.uretim.dokum`, `marvel.uretim.cnc`,  
`marvel.kalite`, `marvel.kalibrasyon`, `marvel.depo`, `marvel.ik`, `marvel.finans`,  
`marvel.proje`, `marvel.arge`

Firma kodu: **MARVEL**
