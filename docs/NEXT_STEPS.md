# Sonraki Adımlar (Kod yazmadan önce sıra)

Master prompt Aşama 6–8 sırası:

## Şimdi (Aşama 6) — Geliştirme ortamı

Kullanıcının bilgisayarında / bu bulut ortamında sırayla:

1. **Node.js LTS** kurulu mu kontrol
2. **PostgreSQL** kurulu/çalışıyor mu kontrol
3. **Git** (zaten var)
4. **VS Code** (kullanıcı tarafı)
5. **pgAdmin veya DBeaver**
6. **API test aracı** (Thunder Client / Postman)
7. `.env` ile veritabanı bilgilerini ayırma
8. (Öneri) Docker Compose ile PostgreSQL standardizasyonu

**İlk kurulacak / doğrulanacak program:** Node.js (backend çalıştırma) + PostgreSQL (veri).

Kullanıcı ortamında hangisinin eksik olduğu kontrol edilmeden toplu kurulum dayatılmaz.

## Sonra (Aşama 7) — Proje iskeleti

- `backend/` / `frontend/` ayrımı
- migration klasörü
- `.env.example`
- temel dokümanların API iskeleti

## Sonra (Aşama 8) — İlk çalışan sürüm

- DB bağlantısı env üzerinden
- Kullanıcı girişi (basit)
- Firma / iş yeri / depo tanımları

## Bilinçli olarak bekleyenler

- Canias’taki MRP, kapasite, OEE, e-fatura, tam muhasebe
- Gelişmiş yetki matrisi
)
