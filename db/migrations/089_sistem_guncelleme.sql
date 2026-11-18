-- Sistem Güncelleme: canlıya alındıktan sonra paket seçimi / inceleme / uygulama kaydı

CREATE TABLE IF NOT EXISTS system_update_packages (
  id              SERIAL PRIMARY KEY,
  package_code    TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL DEFAULT '',
  reason          TEXT NOT NULL DEFAULT '',
  impacts         JSONB NOT NULL DEFAULT '[]'::jsonb,
  module_code     TEXT NOT NULL DEFAULT 'sistem',
  severity        TEXT NOT NULL DEFAULT 'orta',
  recommended     BOOLEAN NOT NULL DEFAULT TRUE,
  preview_before  TEXT NOT NULL DEFAULT '',
  preview_after   TEXT NOT NULL DEFAULT '',
  code_snippets   JSONB NOT NULL DEFAULT '[]'::jsonb,
  sql_script      TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending',
  sort_order      INT NOT NULL DEFAULT 100,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at      TIMESTAMPTZ,
  applied_by      TEXT,
  CONSTRAINT system_update_packages_status_chk
    CHECK (status IN ('pending', 'applied', 'skipped')),
  CONSTRAINT system_update_packages_severity_chk
    CHECK (severity IN ('dusuk', 'orta', 'yuksek', 'kritik'))
);

CREATE TABLE IF NOT EXISTS system_update_apply_log (
  id           SERIAL PRIMARY KEY,
  package_id   INT NOT NULL REFERENCES system_update_packages(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  user_code    TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_update_packages_status
  ON system_update_packages (status, sort_order, id);

INSERT INTO system_update_packages (
  package_code, title, summary, reason, impacts, module_code, severity, recommended,
  preview_before, preview_after, code_snippets, sql_script, sort_order
) VALUES
(
  'UI-RESPONSIVE-001',
  'Responsive yerleşim düzeltmesi',
  'Ekran yüksekliği kısaltılınca banner ve aksiyon çubuğunun üst üste binmesi giderildi; kısa/dar viewport kuralları eklendi.',
  'Kullanıcılar pencereyi küçülttüğünde araç çubuğu ve filtre alanları çakışıyordu; canlı kullanımda tıklama ve okuma bozuluyordu.',
  '["Liste ekranları","Aksiyon çubuğu","Filtre paneli","Form üst bar"]'::jsonb,
  'ui', 'yuksek', TRUE,
  $html$<div class="sup-mock"><div class="sup-mock-bar">Banner + Aksiyon (çakışık)</div><div class="sup-mock-bad">Üst üste binen satırlar</div><div class="sup-mock-list">Liste</div></div>$html$,
  $html$<div class="sup-mock"><div class="sup-mock-bar ok">Banner</div><div class="sup-mock-bar ok">Aksiyon</div><div class="sup-mock-list ok">Kaydırılabilir liste</div></div>$html$,
  $json$[
    {
      "file": "public/styles.css",
      "language": "css",
      "label": "Sticky çakışması",
      "before": ".screen-banner, .action-bar {\n  position: sticky;\n  top: 0;\n}",
      "after": ".screen-banner, .action-bar {\n  position: relative;\n  z-index: 4;\n}",
      "changed": ["position: relative", "z-index: 4"]
    }
  ]$json$::jsonb,
  '',
  10
),
(
  'MFG-ROTA-BOM-001',
  'Rota: ürün ağacı otodoldurma + numaratör',
  'Rota oluştururken stok seçimine göre ürün ağacı ve malzemeler otomatik dolar; iş istasyonu/merkezi numaratörleri bağlanır.',
  'Rota girişinde ağaç elle seçilmek zorundaydı; malzemeler operasyonlara düşmüyordu. İş istasyonu kodu elle yazılıyordu.',
  '["Rotalar","Ürün Ağacı","İş İstasyonları","İş Merkezleri"]'::jsonb,
  'uretim', 'yuksek', TRUE,
  $html$<div class="sup-mock"><div class="sup-mock-field">Stok: MAMUL-01</div><div class="sup-mock-field empty">Ürün ağacı: (boş)</div><div class="sup-mock-field empty">Malzemeler: yok</div></div>$html$,
  $html$<div class="sup-mock"><div class="sup-mock-field">Stok: MAMUL-01</div><div class="sup-mock-field ok">Ürün ağacı: BOM-01</div><div class="sup-mock-field ok">Malzemeler: operasyona aktarıldı</div></div>$html$,
  $json$[
    {
      "file": "public/app.js",
      "language": "javascript",
      "label": "Numaratör + otodoldurma",
      "before": "numeratorSeri: null,\n// stok seçilince ağaç boş kalır",
      "after": "numeratorSeri: 'IS_ISTASYONU',\nautoFillRoutingFromBom(screen)",
      "changed": ["IS_ISTASYONU", "autoFillRoutingFromBom"]
    }
  ]$json$::jsonb,
  '',
  20
),
(
  'UI-VIEW-STEEL-CARDS-001',
  'Görünüm 3 Metalik + Görünüm 4 Kartlar',
  'İki yeni görünüm skin’i: sade metalik ve canlı kart/kutu düzeni. Ayarlar → Tema ve Görünüm’den seçilir.',
  'Farklı kullanım tercihlerine (hafif klasik / mobil kart) cevap vermek için görünüm katmanı genişletildi.',
  '["Ayarlar","Tema ve Görünüm","Tüm ekranlar (görsel)"]'::jsonb,
  'ui', 'orta', TRUE,
  $html$<div class="sup-mock"><div class="sup-mock-bar">Görünüm 1 / 2</div><div class="sup-mock-list">Klasik veya modern</div></div>$html$,
  $html$<div class="sup-mock"><div class="sup-mock-bar ok">+ Metalik / Kartlar</div><div class="sup-mock-list ok">4 görünüm seçeneği</div></div>$html$,
  $json$[
    {
      "file": "public/styles-steel.css",
      "language": "css",
      "label": "Metalik skin",
      "before": "(yok)",
      "after": "html[data-view=\"steel\"] { --steel-face: ... }",
      "changed": ["data-view=\"steel\""]
    },
    {
      "file": "public/styles-cards.css",
      "language": "css",
      "label": "Kartlar skin",
      "before": "(yok)",
      "after": "html[data-view=\"cards\"] { --radius: 0.95rem; }",
      "changed": ["data-view=\"cards\""]
    }
  ]$json$::jsonb,
  '',
  30
),
(
  'SYS-EXPORT-PDF-001',
  'Liste dışa aktarma (Excel / Word / PDF) araç çubuğu',
  'Liste ekranlarında Excel/Word/PDF araç çubuğunda varsayılan açılır; PDF butonu listExport ile gizlenmez.',
  'Dışarı alma yalnızca sağ tıkta vardı; PDF araç çubuğunda yanlışlıkla gizleniyordu.',
  '["Tüm liste ekranları","MRP Hareket Raporu","Cari Ekstre PDF"]'::jsonb,
  'sistem', 'orta', TRUE,
  $html$<div class="sup-mock"><div class="sup-mock-bar">Yeni İncele Düzelt</div><div class="sup-mock-bad">Excel/Word/PDF yok veya PDF gizli</div></div>$html$,
  $html$<div class="sup-mock"><div class="sup-mock-bar ok">… Excel Word PDF</div><div class="sup-mock-list ok">Araç çubuğundan dışa aktarma</div></div>$html$,
  $json$[
    {
      "file": "public/app.js",
      "language": "javascript",
      "label": "listExportActions varsayılan",
      "before": "pdfBtn.hidden = !screen.reportPdfAction;",
      "after": "pdfBtn.hidden = !(screen.reportPdfAction || screen.listExportActions);",
      "changed": ["listExportActions"]
    }
  ]$json$::jsonb,
  '',
  40
)
ON CONFLICT (package_code) DO NOTHING;
