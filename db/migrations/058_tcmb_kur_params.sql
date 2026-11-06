-- TCMB günlük döviz kuru çekimi — sistem parametreleri
INSERT INTO system_parameters (parametre_code, parametre_name, value, module, description)
VALUES
  (
    'TCMB_KUR_URL',
    'TCMB kur XML adresi',
    'https://www.tcmb.gov.tr/kurlar/today.xml',
    'FIN',
    'Ücretsiz günlük kur XML. Kaynak alanı TCMB seçilince / TCMB’den Çek bu adresi kullanır. Arşiv: …/kurlar/YYYYMM/DDMMYYYY.xml'
  ),
  (
    'TCMB_KUR_AUTO',
    'TCMB kur otomatik çek',
    'true',
    'FIN',
    'true ise sunucu günde bir kez (saatlik kontrol) TCMB today.xml ile tanımlı para birimlerinin kurlarını yazar'
  ),
  (
    'TCMB_KUR_HEDEF_PB',
    'TCMB kur hedef PB',
    'TRY',
    'FIN',
    'TCMB bülteni TRY karşılığıdır; senkron hedef para birimi (varsayılan TRY)'
  )
ON CONFLICT (parametre_code) DO UPDATE SET
  parametre_name = EXCLUDED.parametre_name,
  description = EXCLUDED.description,
  module = COALESCE(EXCLUDED.module, system_parameters.module);
