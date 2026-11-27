-- İş yeri başına bir varsayılan (Ana) depo işaretlenebilsin.
ALTER TABLE depolar
    ADD COLUMN IF NOT EXISTS varsayilan BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_depolar_is_yeri ON depolar(is_yeri_id);
