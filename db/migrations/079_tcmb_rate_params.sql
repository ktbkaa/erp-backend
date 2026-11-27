-- TCMB daily exchange-rate fetch — system parameters (existing values are kept)
INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description)
VALUES
  (
    'TCMB_KUR_URL',
    'TCMB kur XML adresi',
    'https://www.tcmb.gov.tr/kurlar/today.xml',
    'FIN',
    'Ücretsiz günlük kur XML. Kur kaynağı TCMB seçilince / TCMB''den Çek bu adresi kullanır. Arşiv: …/kurlar/YYYYMM/DDMMYYYY.xml'
  ),
  (
    'TCMB_KUR_AUTO',
    'TCMB kur otomatik çek',
    'true',
    'FIN',
    'true ise sunucu saatlik kontrolle günde bir kez TCMB today.xml ile tanımlı para birimlerinin kurlarını yazar'
  ),
  (
    'TCMB_KUR_HEDEF_PB',
    'TCMB kur hedef PB',
    'TRY',
    'FIN',
    'TCMB bülteni TRY karşılığıdır; senkron hedef para birimi (varsayılan TRY)'
  )
ON CONFLICT (parameter_code) DO NOTHING;
