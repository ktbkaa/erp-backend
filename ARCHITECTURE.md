# Mimari

## Hedef

Küçük ama gerçek çalışan bir ERP çekirdeği: doğru iş mantığı, tutarlı veri modeli, belge zincirleri, büyümeye açık monolith.

## Stil

**Modular monolith**
- Tek backend süreci
- Modüllere ayrılmış klasörler (`stock`, `sales`, `purchasing`, `production`, …)
- Tek PostgreSQL veritabanı
- REST API
- Ayrı frontend uygulaması

Mikroservis yok (bilinçli).

## Mantıksal katmanlar

```text
Frontend (React)
    ↓ HTTP/JSON
API Routes
    ↓
Application / Domain services  (iş kuralları, belge zinciri)
    ↓
Data access (SQL / repository)
    ↓
PostgreSQL
```

## Kritik alt sistem: Stok motoru

Tüm miktar değiştiren süreçler stok servisine başvurur. UI veya rastgele SQL ile `stok_miktari++` yapılmaz.

## Mevcut durum (v0.1 öncesi prototip)

Bugünkü repo düz Express route dosyaları içerir (`routes/*.js`). Bu bir öğrenme iskeletidir.

Hedef klasör yapısı (sonraki iskelet aşamasında):

```text
backend/
  src/
    modules/
    db/
    middleware/
  migrations/
frontend/
docs/
```

Geçiş, çalışan API’yi bozmadan adım adım yapılacaktır.

## Sürüm hedefi

| Sürüm | Hedef |
|-------|-------|
| v0.1 | Altyapı (env, migration, doküman, güvenlik düzeltmesi) |
| v0.2 | Firma / İş yeri / Depo |
| v0.3 | Kullanıcı + giriş |
| v0.4 | Stok + stok hareketi |
| v0.5 | Cari |
| v0.6 | Üretim |
| v0.7 | Satın alma |
| v0.8 | Satış + sevk |
| v0.9 | İrsaliye |
| v1.0 | Fatura + uçtan uca mutlu yol |
)
