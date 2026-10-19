-- Kullanıcının yetkili olduğu firmalar (çoklu seçim)

CREATE TABLE IF NOT EXISTS kullanici_firma_yetkileri (
    kisi_id INT NOT NULL REFERENCES kisiler(id) ON DELETE CASCADE,
    firma_id INT NOT NULL REFERENCES firmalar(id) ON DELETE CASCADE,
    PRIMARY KEY (kisi_id, firma_id)
);

CREATE INDEX IF NOT EXISTS idx_kullanici_firma_yetki_firma
  ON kullanici_firma_yetkileri (firma_id);

COMMENT ON TABLE kullanici_firma_yetkileri IS
  'Kullanıcının erişebileceği firmalar; boşsa kısıt yok (eski davranış / ADMIN).';
