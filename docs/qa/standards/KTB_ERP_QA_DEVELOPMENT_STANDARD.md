# KTB ERP — Kalıcı Geliştirme & QA Standardı

Bu dosya bundan sonraki tüm geliştirmelerde **zorunlu referans**tır.
Amaç: “ekran açıldı” ≠ “test edildi”; ticari hazırlık yalnızca kanıtla iddia edilir.

## 1. Ölçüm ayrımı (asla karıştırma)

| Ölçüm | Anlamı | Başarı sayılmaz |
|---|---|---|
| Ekran kapsamı | Menüdeki ekranın GET/list açılması | Tek başına CRUD OK demek |
| Fonksiyon kapsamı | Kaydet/düzelt/sil/onay/filtre/convert | Sadece form render |
| Kod kapsamı | Unit/API/integration testleri | Manuel tık |
| İş süreci kapsamı | Modüller arası gerçek belge zinciri | Tek ekranda kayıt |

## 2. Her özellik PR’ında minimum bar

1. İlgili ekran envanterde (`npm run qa:inventory`)
2. İlgili API smoke yeşil (`npm run qa:smoke`) veya yeni endpoint smoke’a ekli
3. Veri bütünlüğü: FK/orphan/şirket sızıntısı yok (`npm run qa:db`)
4. En az bir **iş kuralı** doğrulaması (pozitif + negatif)
5. Çoklu şirket: `X-Firma-Id` ile başka firmaya sızma yok
6. TEST_* / sektör etiketi ile izole demo verisi
7. Kanıt: API sonucu veya UI screenshot `docs/qa/evidence/`
8. Bug varsa `docs/qa/08-bug-tracker.md` güncelle (P0–P3)
9. P0/P1 açıkken “ticari hazır” deme

## 3. İş süreci zinciri (sektör demoları)

Her sektör firması için en az:

`Tanım → CRM/teklif → Satış siparişi → (MRP) → SA talep/sipariş → Mal kabul → (KK) → Üretim → Sevk/irsaliye → Fatura → Muhasebe`

- MAN yolu ve MRP yolu ayrı etiketlerle (`TEST-<SEKTOR>-MAN` / `TEST-<SEKTOR>-MRP`)
- Fatura muhasebesi için `npm run qa:finance-seed` (boş `gl_accounts` kabul edilmez)
- Org yoksa `scripts/qa/ensure-*-org.js` ile EN şema kullan

## 4. Veri & güvenlik kuralları

- Üretim DB’ye dokunma; gerçek e-fatura/banka/e-posta gönderme
- TR tablo adları kullanma (`firmalar` yasak → `companies`)
- Silme öncesi ilişki kontrolü; toplu silmede yalnızca test şirketi
- Frontend gizleme ≠ backend yetki; API’de de enforce
- Yeni firma seed’inde ADMIN/owner `user_company_permissions` ver

## 5. Öncelik sırası (eksik kapatırken)

1. Seed/migrate EN uyumu + finance seed  
2. Kritik iş zinciri (MRP/stok/fatura-GL)  
3. Yetki / çoklu şirket matrisi  
4. Negatif senaryolar  
5. Derin CRUD kapsamı  
6. Performans yükü  
7. UX turu / PDF

## 6. Komutlar

```bash
npm run qa:finance-seed
npm run qa:gida-org          # örnek org
npm run qa:inventory && npm run qa:smoke && npm run qa:db
npm run qa:roles             # yetki matrisi
npm test
npm run demo:gida-dongu      # süt
npm run demo:dokum-dongu     # döküm
npm run qa:dashboard && npm run qa:pdf
```

## 7. Sektör firmaları

| Kod | Sektör | Demo |
|---|---|---|
| GIDA | Süt ürünleri | `demo:gida-dongu` |
| DOKUM | Döküm sanayi | `demo:dokum-dongu` |
| ELEK / KILIF / MOBIL | Mevcut sektörel | ilgili demo:* |

## 8. Hafıza / süreklilik

- İlerleme: `docs/qa/MASTER_TEST_PLAN.md`
- Bug: `docs/qa/08-bug-tracker.md`
- Final: `docs/qa/10-final-assessment.md`
- Bu standart güncellenmeden yeni “tamamlandı” iddiası yok
