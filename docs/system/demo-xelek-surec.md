# XELEK — Elektronik Firma Uçtan Uca Süreç

**Oluşturma:** 23.11.2026 12:48:12 (Europe/Istanbul)  
**Firma:** X Elektronik Sanayi A.Ş. (`XELEK`)  
**Proje:** X Firması  
**Etiket:** `XELEK-SUREC`

## Kullanıcılar
| Kod | Rol |
|-----|-----|
| xelek.satis | Satışçı |
| xelek.smudur | Satış müdürü (sipariş onayı) |
| xelek.sa | Satınalma sorumlusu |
| xelek.samudur | Satınalma müdürü |
Şifre: `Demo123!`

## Süreç adımları
1. **Firma kurulumu** — XELEK #11 / XELEK-MR / 8 depo
2. **Proje** — X-FIRMASI — X Firması
3. **CRM** — Aday AD00013 → faaliyet → fırsat FS00013 kazanıldı → cari
4. **X mamul master** — U00011 + HM(H00029,H00030,H00031) + YM(Y00010)
5. **Satış siparişi onayı** — B00018: OnayBekliyor→Onayli (sevk engeli doğrulandı), teklif Kapalı
6. **MRP** — çalışma #12 — 46 satır, satınalma önerisi: 24
7. **SA teklif→sipariş** — PO #23 (müdür onaylı tekliften)
8. **GKK ilk tur** — bir HM stoğa, bir HM red
9. **Yeniden sipariş + GKK** — PO2 #24 / MK2 #21 — red HM stoğa girdi
10. **Üretim + ÇKK** — UE #9 → mamul depo 10 adet
11. **Kısmi + kalan sevk/fatura** — ½=5 irs 7/fat 11; kalan=5 irs 8/fat 12
12. **Müşteri iade** — 1 adet ← irsaliye #8 / iade #9
13. **Yeniden üretim + sevk** — UE #10 / SO B00019 / irs 10 / fat 14

## Davranış düzeltmeleri
- Teklif→sipariş: onay modülü varsa sipariş **OnayBekliyor**; müdür onaylayınca **Onayli**
- OnayBekliyor sipariş **sevk edilemez**
- Dönüşen teklif durumu **Kapali**
- İrsaliye iadesi: Onayli / Kapali (faturalanmış) kabul

## Çalıştırma
```bash
npm start
node scripts/demo-xelek-surec.js
```

## Özet JSON
`docs/system/demo-xelek-surec.json`
