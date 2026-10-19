# Aşama 5 — Teknoloji Kararı

Mevcut repo zaten **Node.js + Express + PostgreSQL** kullanıyor. Öğrenme yatırımı ve Gemini geçmişi korunarak bu çizgi sürdürülür; proje ortasında stack değiştirilmez.

| Bileşen | Seçim | Neden |
|---------|-------|-------|
| Frontend | React + Vite | Öğrenmesi yaygın, ERP form/listeleri için hızlı, portföy değeri yüksek |
| Backend | Node.js + Express | Zaten var; API hızı iyi; tek dil (JS/TS) ile full-stack öğrenme kolay |
| Dil | Önce JS, kısa vadede TypeScript’e geçiş opsiyonu | Kullanıcı yeni başlıyor; önce çalışan yapı, sonra tip güvenliği |
| Database | PostgreSQL | İlişkisel ERP için doğru; FK/constraint/transaction güçlü; zaten kullanılıyor |
| ORM / SQL | Başlangıç: `pg` + SQL migration dosyaları; sonra Prisma veya Knex değerlendirilir | ERP’de SQL görünürlüğü önemli; hemen ağır ORM dayatılmaz |
| Auth | JWT + şifre hash (bcrypt) | API için basit ve yaygın; oturum tablosu sonra eklenebilir |
| API | REST JSON | Anlaşılır, Thunder Client / Postman ile kolay test |
| Validation | Zod veya express-validator | Input güvenliği |
| Dev tools | VS Code, Node.js, pgAdmin / DBeaver, Thunder Client | Kullanıcının mevcut alışkanlıklarıyla uyumlu |
| Container | Docker Compose (PostgreSQL (+ ileride app)) | Kurulum tekrarlanabilirliği |
| Version control | Git + GitHub | Zaten bağlı (`ktbkaa/erp-backend`) |
| Tests | Önce senaryo/manual + temel API testleri; sonra Vitest/Jest | Süreç doğruluğu önce |
| Docs | README, ARCHITECTURE, ERP_RULES, DATABASE, API, PROJECT_RULES | AI/insan tutarlılığı |

## Bilinçli olarak şimdilik seçilmeyenler

- Mikroservisler
- GraphQL
- Kafka / karmaşık event bus
- Kubernetes
- Canias benzeri low-code platform kopyası

## Güvenlik düzeltmesi (öncelikli, kodlamadan önce plan)

`db.js` içinde veritabanı şifresi düz metin duruyor. İlk teknik işlerden biri:
- `.env` + `dotenv`
- `.gitignore` içine `.env`
- README’de örnek `.env.example`
)
