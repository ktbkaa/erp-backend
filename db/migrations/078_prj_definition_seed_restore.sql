-- Project type / category seeds from 056 can be lost by data purges;
-- restore them idempotently (templates such as TPL_MAKINE reference these codes).
INSERT INTO prj_project_types (type_code, type_name, line_no) VALUES
  ('MUSTERI', 'Müşteri Projesi', 10),
  ('IC', 'İç Proje', 20),
  ('YATIRIM', 'Yatırım Projesi', 30),
  ('URUN', 'Ürün Geliştirme', 40),
  ('YAZILIM', 'Yazılım Projesi', 50),
  ('MAKINE', 'Makine / Tesis Kurulum', 60),
  ('BAKIM', 'Bakım ve Revizyon', 70),
  ('ARGE', 'Ar-Ge Projesi', 80),
  ('ERP', 'ERP Uygulama Projesi', 90)
ON CONFLICT (type_code) DO NOTHING;

INSERT INTO prj_project_categories (category_code, category_name, line_no) VALUES
  ('TICARI', 'Ticari', 10),
  ('OPERASYON', 'Operasyon', 20),
  ('IT', 'BT / Yazılım', 30),
  ('URETIM', 'Üretim', 40)
ON CONFLICT (category_code) DO NOTHING;
