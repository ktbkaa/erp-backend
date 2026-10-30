# Yerel PostgreSQL + pgAdmin

## Önemli ayrım

| Ortam | `localhost:5432` ne demek? |
|-------|----------------------------|
| **Cloud Agent VM** | Agent’ın kendi Postgres’i (senin PC’n değil) |
| **Senin bilgisayarın** | pgAdmin / DBeaver ile bağlandığın Postgres |

Cloud Agent, laptop’taki `127.0.0.1:5432` adresine **doğrudan bağlanamaz**.  
Sen de Agent VM içindeki Postgres’e `localhost` yazarak **erişemezsin** — o adres senin PC’nde senin servisin olur.

## Hızlı çözüm (PC’de pgAdmin)

1. Bilgisayarında **PostgreSQL** + **pgAdmin 4** kurulu olsun; servis çalışıyor olmalı.
2. Proje klasöründe:

```powershell
Copy-Item .env.example .env
# .env → DB_PASSWORD = kendi Postgres şifren
npm install
npm run migrate
```

3. Agent’ın ürettiği dump’ı indirip yükle (şema + veri):

```powershell
# Örnek: indirilen dosya
$env:PGPASSWORD="sifren"
psql -h localhost -U postgres -d postgres -f erp-local-postgres-dump.sql
```

veya pgAdmin → Query Tool → SQL dosyasını aç / Execute.

4. Kontrol:

```sql
SELECT current_database(), current_user;
SELECT COUNT(*) FROM items;
SELECT company_code, company_name FROM companies;
```

Tablo adı **`items`** (tekil `item` değil), firmalar **`companies`**.

## pgAdmin bağlantı ayarları (senin PC)

| Alan | Değer |
|------|--------|
| Host | `localhost` veya `127.0.0.1` |
| Port | `5432` |
| Maintenance DB | `postgres` |
| Username | `postgres` (veya kendi kullanıcın) |
| Password | Kurulumda verdiğin şifre |

### Sık hatalar

| Belirti | Ne yap |
|---------|--------|
| `ECONNREFUSED` / bağlantı reddedildi | Windows Services → `postgresql-x64-16` Started mi? |
| `password authentication failed` | `.env` ve pgAdmin’de aynı şifre |
| `database does not exist` | Maintenance DB = `postgres` |
| Agent’taki veriyi göremiyorum | Dump’ı import etmedin veya yanlış DB’ye baktın |
| Eski tablo adları (`stoklar`, `cariler`) | `npm run migrate` (042+ İngilizce şema) |

## Agent’ın senin DB’ne yazması (isteğe bağlı)

1. Postgres’i tünelle aç (Cloudflare Tunnel / ngrok TCP).
2. Cursor secret: `DB_MIRROR_URL=postgresql://USER:PASS@TUNEL_HOST:PORT/postgres`
3. Agent’ta: `npm run db:mirror-sync`

## Tek ortak bulut DB (alternatif)

Neon / Render Postgres → hem Agent hem pgAdmin aynı `DATABASE_URL`.  
O zaman “iki localhost” karmaşası olmaz.
