# Araçlar

| Klasör | Açıklama |
|--------|----------|
| [erp-local-panel](./erp-local-panel/) | Windows yerel senkron paneli (ayrı Node uygulaması). Kurulum: `KUR.bat` — detay [AC.md](./erp-local-panel/AC.md) |
| [demo-db](./demo-db/) | `DEMO-VERITABANI-YUKLE.bat`: demo dump'ı (`ktb_erp_demo*.sql.gz`) yeni `ktb_erp` veritabanına yükler, `.env` yedeklenip `DB_NAME` değişir. Mevcut veritabanı silinmez. Altta `npm run db:restore-demo` (`scripts/db-restore-demo.js`). Dump dosyası şifre özetleri içerir; depoya konmaz. |
