# Haftalık yerel senkron (hatırlatıcı)

Her **Pazar** (veya haftada bir gün) aşağıdaki komutları **kendi bilgisayarında**, proje klasöründe çalıştır.  
Amaç: kod + şema + DB yedeği senin makinede dursun.

## Önkoşul

- Proje klasörü açık (ör. `...\erp-backend-cursor-erp-db-en-naming-4f63`)
- `.env` içinde `DB_PASSWORD` = kendi PostgreSQL şifren
- PowerShell bu klasörde

## Komutlar (sırayla kopyala-yapıştır)

```powershell
# 1) Klasöre gir (kendi yolunu yaz)
cd "C:\Users\ktbkt\OneDrive\Masaüstü\ERP PROJESİ\erp-backend-cursor-erp-db-en-naming-4f63"

# 2) Son kodu al (Git kullanıyorsan)
git fetch origin
git pull

# 3) Bağımlılık (nadiren değişir)
npm install

# 4) Eksik migration'ları uygula (tabloları silmez)
npm run migrate

# 5) Veritabanı yedeği → backups\ klasörüne
npm run db:backup
```

## Kontrol

pgAdmin → `public` → Tables → `items` görünmeli.

```sql
SELECT COUNT(*) FROM items;
```

`backups\` altında `erp-....dump` ve `erp-....sql` dosyaları oluşmalı.

## Notlar

- `backups/` GitHub’a **gönderilmez** (gitignore) — sadece senin diskinde kalır.
- Cloud Agent’ın DB’si ayrıdır; senin Postgres asıl kopyandır.
- Agent yeni migration push ettiyse `git pull` + `npm run migrate` şart.
