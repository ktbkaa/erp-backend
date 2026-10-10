# ERP Backend

Gerçek işletme süreçlerine uygun, adım adım büyüyen ERP çekirdeği.

## Bu sürüm (v0.3 — Satınalma + Üretim döngüsü)

- Ürün ağacı, rota, iş merkezi
- Satınalma talebi → sipariş → mal kabul → Ana Depo
- Üretim emri / girişi → Yarı Mamul Depo → Mamul Depo
- Operasyon konsolu: `http://localhost:3000/`
- Tek komut demo: `npm run demo:cycle`

Detay: `docs/07_DEMO_CYCLE.md`

## Hızlı başlangıç (Windows / VS Code)

### 1) Bağımlılıklar

Terminalde proje klasöründe:

```bash
npm install
```

### 2) Şifre dosyası

1. `.env.example` dosyasını kopyala
2. Adını `.env` yap
3. İçindeki `DB_PASSWORD` değerini kendi PostgreSQL şifrenle değiştir

PowerShell örneği:

```powershell
Copy-Item .env.example .env
```

Sonra `.env` dosyasını açıp şifreyi yaz, kaydet.

### 3) Veritabanı şemasını güncelle

```bash
npm run migrate
```

Bu komut tablolarını **silmez**; eksik tabloları/kolonları ekler.

### 4) Demo döngüsünü bir kez çalıştır

```bash
npm run demo:cycle
```

### 5) Sunucuyu çalıştır

```bash
npm start
```

- Health: `http://localhost:3000/health`
- Konsol: `http://localhost:3000/`

## API özeti

| Yol | Açıklama |
|-----|----------|
| `GET /health` | Sistem + DB kontrol |
| `/firmalar` | Firma |
| `/is-yerleri` | İş yeri |
| `/depolar` | Depo (yeni) |
| `/olcu-birimleri` | Ölçü birimi (yeni) |
| `/stoklar` | Stok kartı |
| `/stok-hareketleri` | Stok hareket listesi (şimdilik salt okunur) |
| `/cariler` | Cari |
| `/siparisler` | Sipariş |
| `/faturalar` | Fatura |
| `/kisiler` | Kişi / kullanıcı proto |

## PostgreSQL MCP

Cursor / VS Code için: `docs/MCP_SETUP.md`

## Dokümanlar

- `ERP_RULES.md` — iş kuralları
- `ARCHITECTURE.md` — mimari
- `DATABASE.md` — veritabanı
- `PROJECT_RULES.md` — çalışma kuralları
- `docs/` — analiz ve kurulum

## Güvenlik notu

Eski `db.js` içinde şifre düz metin vardı. Artık `.env` kullan.  
Eski şifre Git geçmişinde kaldıysa ileride şifreyi değiştirmen önerilir (veriler sahte olsa bile iyi alışkanlık).
