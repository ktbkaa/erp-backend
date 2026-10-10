# Proje Kuralları

Bu dosya, projede çalışan tüm geliştiriciler ve AI asistanları için bağlayıcıdır.

## Kaynak hiyerarşisi

1. Kullanıcının açık talebi
2. `ERP_RULES.md`
3. `docs/` altındaki analiz dokümanları ve Canias/Gemini kaynakları
4. Genel ERP pratikleri
5. Teknik gereklilikler

## Çalışma sırası

MVP → Çalışan ERP çekirdeği → Genişletilebilir ERP → Gelişmiş ERP

Önerilen modül sırası:
1. Altyapı / güvenlik (env, migration)
2. Firma / İş yeri / Depo
3. Kullanıcı (basit auth)
4. Stok + stok hareket motoru
5. Cari
6. Üretim (BOM, rota, iş emri, giriş)
7. Satın alma
8. Satış / sevk / irsaliye / fatura

## Kod disiplini

- ERP sadece CRUD olmamalı; süreç ve belge ilişkisi korunmalı.
- Minimum gerekli değişiklik; gereksiz rewrite yok.
- Migration olmadan şema değişikliği yapılmaz.
- Secret’lar Git’e girmez.
- Her özellik senaryo testi olmadan “bitti” sayılmaz.

## AI tutarlılığı

Yeni bir AI oturumu önce şunları okur:
- `README.md`
- `ARCHITECTURE.md`
- `ERP_RULES.md`
- `DATABASE.md`
- `PROJECT_RULES.md`
- `docs/01_DOCUMENT_ANALYSIS.md` … `05_TECHNOLOGY.md`

Mevcut mimariyi değiştirmeden önce değişiklik önerisini açıklar ve kritik kararlarda onay ister.
)
