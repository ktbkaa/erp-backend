# ERP Backend / Çekirdek Projesi

Gerçek işletme süreçlerini uçtan uca taşıyacak, başlangıçta sade ama büyümeye uygun bir ERP çekirdeği.

Bu repo şu an **öğrenme prototipi + planlama dokümanları** aşamasındadır. Hedef: çalışan stok motoru ve belge zincirli ERP.

## Bu aşamada ne yaptık?

Kod yazmadan önce kaynak dokümanlar analiz edildi:

| Dosya | İçerik |
|-------|--------|
| `docs/01_DOCUMENT_ANALYSIS.md` | Canias + Gemini doküman analizi |
| `docs/02_SCOPE_ANALYSIS.md` | İstek vs doküman kapsam tablosu |
| `docs/03_PROCESS_MAP.md` | Süreç haritaları |
| `docs/04_DATA_MODEL.md` | Entity taslağı |
| `docs/05_TECHNOLOGY.md` | Teknoloji kararları |
| `ERP_RULES.md` | İş kuralları |
| `ARCHITECTURE.md` | Mimari |
| `DATABASE.md` | Veritabanı ilkeleri |
| `PROJECT_RULES.md` | Proje / AI çalışma kuralları |

## Mevcut prototip (Gemini geçmişinden)

- Node.js + Express API
- PostgreSQL
- Route’lar: firmalar, iş yerleri, stoklar, cariler, faturalar, kişiler, siparişler

Henüz yok: depo, stok hareket motoru, üretim, satın alma/satış belge zinciri, frontend, güvenli env yapılandırması.

## Önerilen teknoloji

- Backend: Node.js + Express
- DB: PostgreSQL
- Frontend (sonraki aşama): React + Vite
- Auth (sonraki aşama): JWT + bcrypt
- Detay: `docs/05_TECHNOLOGY.md`

## PostgreSQL MCP (Cursor + VS Code)

Yerel PostgreSQL’e AI erişimi için config dosyaları eklendi:

- `.cursor/mcp.json` — Cursor
- `.vscode/mcp.json` — VS Code
- `.mcp.json` — taşınabilir format

Kurulum adımları: `docs/MCP_SETUP.md`

## Sonraki adım

1. Yerel MCP’yi bağla (`docs/MCP_SETUP.md`)
2. Canlı şema envanterini al
3. Onayla **geliştirme ortamını standartlaştır** (env, Pool, migration) → v0.1

## Güvenlik uyarısı

`db.js` içinde veritabanı şifresi düz metin bulunuyor. Bu bilgi Git geçmişinde olabilir; bir sonraki teknik adımda `.env` yapılandırmasına taşınmalı ve gerekirse şifre değiştirilmelidir.

## Nasıl katkı / devam?

1. `PROJECT_RULES.md` ve `ERP_RULES.md` oku
2. Büyük mimari değişiklik öncesi onay al
3. Modül bitmeden senaryo testi yap
)
