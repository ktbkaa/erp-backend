-- Kullanıcı profil resmi, unvan ve ekran bazlı yetkiler

ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS unvan VARCHAR(120);
ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS profil_resmi TEXT;

CREATE TABLE IF NOT EXISTS kullanici_ekran_yetkileri (
    id SERIAL PRIMARY KEY,
    kisi_id INT NOT NULL REFERENCES kisiler(id) ON DELETE CASCADE,
    ekran_id VARCHAR(80) NOT NULL,
    erisim BOOLEAN NOT NULL DEFAULT TRUE,
    yeni BOOLEAN NOT NULL DEFAULT FALSE,
    incele BOOLEAN NOT NULL DEFAULT TRUE,
    duzelt BOOLEAN NOT NULL DEFAULT FALSE,
    kopyala BOOLEAN NOT NULL DEFAULT FALSE,
    sil BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (kisi_id, ekran_id)
);

CREATE INDEX IF NOT EXISTS idx_kullanici_ekran_yetki_kisi
  ON kullanici_ekran_yetkileri (kisi_id);

COMMENT ON TABLE kullanici_ekran_yetkileri IS
  'Kullanıcı bazlı ekran erişimi ve CRUD aksiyon yetkileri (yeni/incele/duzelt/kopyala/sil).';
