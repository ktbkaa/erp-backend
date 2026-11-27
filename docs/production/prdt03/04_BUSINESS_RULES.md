# PRDT03 — İş Kuralları

## Temel ayrım

| Kavram | Anlamı | KTB karşılığı |
|--------|--------|----------------|
| İş emri onayı | Emri üretime açma / onaylama | `status=Acik`, `is_approved=true` |
| Üretim başlatma | Fiili üretime alma | `POST /baslat` → `is_started` |
| Üretim gerçekleşmesi | Miktar + stok | operasyon tamamla / üretim girişi |

**Onay ≠ stok hareketi ≠ üretim gerçekleşmesi.**

## Onaylanabilirlik (zorunlu)

Mevcut endpoint davranışı + sıkılaştırma:

1. Emir mevcut olmalı.
2. `status ∈ {Taslak, OnayBekliyor}`.
3. `is_deleted` olmamalı.
4. Zaten `is_approved=true` ise reddet (çift onay yok).
5. `status=Iptal` reddet.
6. `planned_quantity > 0`.
7. `item_id` dolu; stok kaydı var.
8. En az bir operasyon satırı (`production_order_operations`) — aksi halde uyarı/engel (plan→emir yolu boş bırakabiliyor).
9. Firma scope: aktif firma ile `company_id` uyumu (çok firmalı ortam).

## Bilinçli olarak zorunlu tutulmayanlar

Mevcut KTB kurallarında onay anında yok; **eklenmez**:

- Stok yeterliliği (PRDT02 “yarı mamul stoğu kontrolü” ayrı Canias konusu; KTB onayda yok)
- MRP planı engeli
- Genel onay motoru (`approval_records`) zorunluluğu

## Uyarı (engel değil) — bilgilendirme

- `product_bom_id` / `route_id` boşsa `warnings[]` döner; operasyon yoksa **engel**.
- İş merkezi boş operasyonlar → `warnings[]`.

## Onay başarısı

- `status='Acik'`, `is_open='Acik'`, `is_approved=true`
- `approved_at=now()`, `approved_by_user_code` (istek kullanıcısı)
- Transaction içinde tek UPDATE
- Audit: kolonlar yeterli; ayrı history tablosu bu dalda zorunlu değil

## Toplu onay politikası

- Her id bağımsız doğrulanır.
- Bir kaydın hatası diğerlerini durdurmaz.
- Yanıt: `{ basarili: [...], hatali: [{id, hata}] }`
- Kısmi başarı HTTP 200 (veya 207); tamamen başarısızsa 400

## Başlat sıkılaştırması (öneri / uygulanacak)

`POST /baslat` yalnızca `status IN ('Acik','Uretimde')` ve tercihen `is_approved=true` kabul etsin.  
`OnayBekliyor` ile başlatma kapatılır (onay atlanmasın).

## Onay geri alma

Mevcut sistemde yok. Bu dalda **tam geri alma eklenmez**.  
Önerilen gelecekteki kural (dokümante, kod opsiyonel):

- Yalnızca `is_approved` + `status=Acik` + `!is_started` + `produced_quantity=0`
- Aksi halde engel

## Yetki

- UI: ekran `kolay-is-emri-onayi` için incele + onay aksiyonu
- API: auth zorunlu; firma scope; (mevcut pattern ile) screenPermission UI tarafında
