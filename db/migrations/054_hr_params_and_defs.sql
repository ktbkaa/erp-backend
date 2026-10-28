-- İK parametre: işten çıkış nedenleri

CREATE TABLE IF NOT EXISTS hr_termination_reasons (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  country_code VARCHAR(10) NOT NULL DEFAULT 'TR',
  reason_code VARCHAR(40) NOT NULL,
  reason_name VARCHAR(200) NOT NULL,
  severance_default BOOLEAN NOT NULL DEFAULT FALSE,
  notice_default BOOLEAN NOT NULL DEFAULT FALSE,
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_term_reasons_code
  ON hr_termination_reasons (COALESCE(company_id, 0), country_code, reason_code);

INSERT INTO hr_termination_reasons (company_id, country_code, reason_code, reason_name, severance_default, notice_default, description)
SELECT NULL, 'TR', v.code, v.name, v.sev, v.notice, v.descr
FROM (VALUES
  ('Istifa', 'İstifa', FALSE, TRUE, 'İşçi feshi — kıdem genelde yok; ihbar uygulanabilir'),
  ('IsverenFeshi', 'İşveren feshi', TRUE, TRUE, 'İşveren feshi — kıdem/ihbar koşullu'),
  ('Anlasmali', 'Anlaşmalı fesih', TRUE, FALSE, 'Karşılıklı anlaşma'),
  ('Emeklilik', 'Emeklilik', TRUE, FALSE, 'Emeklilik nedeniyle ayrılış'),
  ('Diger', 'Diğer', FALSE, FALSE, 'Diğer nedenler — uzman kontrolü')
) AS v(code, name, sev, notice, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM hr_termination_reasons t
  WHERE t.company_id IS NULL AND t.country_code='TR' AND t.reason_code=v.code
);

INSERT INTO number_series (series_code, onek, description, son_numara, screen_code, screen_name, is_active)
VALUES
  ('HR_TERM_REASON', 'HN', 'İK Çıkış Nedeni', 0, 'hr-cikis-nedenleri', 'Çıkış Nedenleri', TRUE)
ON CONFLICT (series_code) DO NOTHING;
