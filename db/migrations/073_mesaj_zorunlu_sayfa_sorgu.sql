-- Mesaj tanımları (Hata / Bilgi / Uyarı) + zorunlu alan tanımları

CREATE TABLE IF NOT EXISTS message_definitions (
  id SERIAL PRIMARY KEY,
  message_code VARCHAR(32) NOT NULL UNIQUE,
  message_type VARCHAR(16) NOT NULL DEFAULT 'Bilgi'
    CHECK (message_type IN ('Hata', 'Bilgi', 'Uyari')),
  title VARCHAR(120) NOT NULL,
  body TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS required_field_defs (
  id SERIAL PRIMARY KEY,
  screen_id VARCHAR(80) NOT NULL,
  screen_title VARCHAR(160),
  field_key VARCHAR(80) NOT NULL,
  field_label VARCHAR(160),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (screen_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_required_field_defs_screen
  ON required_field_defs (screen_id) WHERE is_active AND is_required;

INSERT INTO message_definitions (message_code, message_type, title, body) VALUES
  ('ERR-NET-001', 'Hata', 'Bağlantı hatası', 'API''ye ulaşılamadı. Sunucu kapalıysa yeniden başlatın.'),
  ('ERR-API-400', 'Hata', 'Geçersiz istek', 'İstek doğrulanamadı. Zorunlu alanları kontrol edin.'),
  ('ERR-API-401', 'Hata', 'Oturum gerekli', 'Oturum süreniz dolmuş veya giriş yapılmamış.'),
  ('ERR-API-403', 'Hata', 'Yetki yok', 'Bu işlem için yetkiniz yok.'),
  ('ERR-API-404', 'Hata', 'Kayıt bulunamadı', 'İstenen kayıt veya ekran bulunamadı.'),
  ('ERR-API-409', 'Hata', 'Çakışma', 'Kayıt çakışması veya mükerrer kod.'),
  ('ERR-API-500', 'Hata', 'Sunucu hatası', 'Beklenmeyen sunucu hatası oluştu.'),
  ('ERR-VAL-001', 'Hata', 'Doğrulama', 'Form veya satır doğrulaması başarısız.'),
  ('INF-SAVE-OK', 'Bilgi', 'Kayıt başarılı', 'Kayıt başarıyla kaydedildi.'),
  ('INF-ROW-OK', 'Bilgi', 'Satır onaylandı', 'Satır onaylandı — belgeyi kaydetmek için üstteki Kaydet''i kullanın.'),
  ('INF-DELETE-OK', 'Bilgi', 'Silindi', 'Kayıt silindi.'),
  ('WRN-UNSAVED', 'Uyari', 'Kaydedilmemiş değişiklik', 'Kaydedilmemiş değişiklikler kaybolabilir.'),
  ('WRN-CONFIRM', 'Uyari', 'Onay gerekli', 'Devam etmeden önce kontrol edin.')
ON CONFLICT (message_code) DO NOTHING;
