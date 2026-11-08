# ERP Yerel Panel

Windows’ta çalışan basit yerel senkron paneli. Ayrı proje; ERP backend’den bağımsız.

**Ne yapar**

1. `git fetch` + `git pull --ff-only`
2. `npm install`
3. `npm run migrate`
4. Yedek: `pg_dump` (varsa) veya **Node SQL** alternatifi (pg_dump zorunlu değil)

**Ne zaman**

- Panelden butonla (anında)
- Pazar 17:00 (Windows Görev Zamanlayıcı — panel kapalı olsa da)
- Panel açıksa ek olarak dahili zamanlayıcı (Europe/Istanbul)

## Sizin işiniz

Sadece zip’i açıp `KUR.bat` çalıştırın. Detay: [AC.md](./AC.md)

```text
KUR.bat
```

veya:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
```

ERP yolu biliniyorsa:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -ErpRoot "C:\yol\erp-backend"
```

Panel: **http://127.0.0.1:3920/**

## Geliştirici notları

```bash
npm install
npm start          # http://127.0.0.1:3920
npm run status
npm run sync
npm run migrate
npm run backup
```

| Dosya | Rol |
|-------|-----|
| `src/server.js` | Yerel HTTP API + UI |
| `src/jobs/sync.js` | Senkron adımları |
| `src/cli.js` | Görev Zamanlayıcı / terminal |
| `src/scheduler.js` | Panel açıkken cron |
| `config.json` | Kurulum sonrası ayarlar (gitignore) |
| `.env` | ERP_ROOT, PORT, PG_DUMP_PATH |

DB bilgisi ERP projesindeki `.env` dosyasından okunur.

## Güvenlik

Panel yalnızca `127.0.0.1` üzerinde dinler. İnternete açmayın.

## Kaldırma

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-windows.ps1
```

Klasörü sonra elle silebilirsiniz.
