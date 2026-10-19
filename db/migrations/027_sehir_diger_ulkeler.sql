-- Diğer ülkeler için örnek şehir / ilçe (ülke→şehir kademeli seçim)

INSERT INTO sehirler (sehir_kodu, sehir_adi, ulke_kodu) VALUES
    ('DE-BE', 'Berlin', 'DE'),
    ('DE-MU', 'Münih', 'DE'),
    ('DE-HH', 'Hamburg', 'DE'),
    ('DE-KO', 'Köln', 'DE'),
    ('DE-FF', 'Frankfurt', 'DE'),
    ('US-NY', 'New York', 'US'),
    ('US-LA', 'Los Angeles', 'US'),
    ('US-CH', 'Chicago', 'US'),
    ('CN-BJ', 'Pekin', 'CN'),
    ('CN-SH', 'Şanghay', 'CN'),
    ('IT-RM', 'Roma', 'IT'),
    ('IT-MI', 'Milano', 'IT')
ON CONFLICT (sehir_kodu) DO NOTHING;

INSERT INTO ilceler (ilce_kodu, ilce_adi, sehir_kodu) VALUES
    ('DE-BE-MI', 'Mitte', 'DE-BE'),
    ('DE-BE-KR', 'Kreuzberg', 'DE-BE'),
    ('DE-MU-AL', 'Altstadt', 'DE-MU'),
    ('US-NY-MN', 'Manhattan', 'US-NY'),
    ('US-NY-BK', 'Brooklyn', 'US-NY'),
    ('IT-RM-CN', 'Centro', 'IT-RM'),
    ('IT-MI-CN', 'Centro', 'IT-MI')
ON CONFLICT (ilce_kodu) DO NOTHING;
