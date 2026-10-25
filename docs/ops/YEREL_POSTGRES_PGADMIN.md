# Yerel PostgreSQL + pgAdmin (planlanan hedef)

## Durum

| Ortam | Ne tutuyor? |
|-------|-------------|
| **Cloud Agent VM** | Agent’ın çalıştığı Postgres (`localhost` = VM, senin PC değil) |
| **Senin bilgisayarın** | Asıl hedef: pgAdmin ile göreceğin PostgreSQL |

Cloud Agent, laptop’taki `127.0.0.1:5432` adresine **doğrudan bağlanamaz**.  
Çift yazma için Postgres’inin **tünel / public host** ile erişilebilir olması gerekir.

## A) Hemen pgAdmin’de görmek (PC’de sen çalıştırırsın)

1. PostgreSQL + pgAdmin 4 kurulu olsun.
2. Repoyu klonla / çek, proje klasöründe:

```powershell
Copy-Item .env.example .env
# .env içinde DB_PASSWORD = kendi Postgres şifren
npm install
npm run migrate
```

3. (İsteğe bağlı) Cloud’daki demo veriyi yükle:
   - Agent’ın ürettiği `erp-cloud-full.sql` dosyasını indir
   - pgAdmin → Query Tool → dosyayı aç / çalıştır  
   - veya:

```powershell
$env:PGPASSWORD="sifren"
psql -h localhost -U postgres -d postgres -f erp-cloud-full.sql
```

4. pgAdmin’de veritabanını yenile → şema `public` → tablo **`items`** (tekil `item` değil).

```sql
SELECT COUNT(*) FROM items;
SELECT * FROM items LIMIT 20;
```

## B) Agent’ın da senin DB’ne yazması (çift hedef)

1. Bilgisayarında Postgres’i tünelle dışarı aç (ör. [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) veya ngrok TCP).
2. Cursor Cloud Agent secret ekle:

```text
DB_MIRROR_URL=postgresql://postgres:SIFRE@TUNEL_HOST:PORT/postgres
```

3. Agent ortamında:

```bash
npm run db:mirror-sync   # cloud → senin DB tam kopya
npm start                # sonraki yazılar pool.query ile aynaya da gider
```

`db.js` birincil DB’ye yazar; `DB_MIRROR_URL` varsa yazma sorgularını aynaya da iletir.  
Transaction (`pool.connect`) yolları için periyodik `npm run db:mirror-sync` önerilir.

## C) Tek ortak bulut DB (alternatif)

Neon / Render Postgres açıp hem agent hem pgAdmin’i **aynı** `DATABASE_URL` ile bağlamak da mümkündür; o zaman “iki kopya” yerine tek kaynak olur.

## Kontrol listesi

- [ ] Yerel `npm run migrate` sorunsuz
- [ ] pgAdmin’de `items`, `partners`, `users` görünüyor
- [ ] (İsteğe bağlı) `DB_MIRROR_URL` secret + `db:mirror-sync` yeşil
- [ ] Agent logunda `[db-mirror] ayna hazır` satırı
