/**
 * GİB portal (manuel) adaptörü: GİB e-Fatura/e-Arşiv/e-İrsaliye portalının ERP'ye açık bir API'si yoktur.
 * Sistem imzasız UBL XML'i arşivler; yetkili kullanıcı portala yükleyip imzalar (e-imza/mali mühür),
 * sonucu POST /e-belge/:id/manuel-durum ile kaydeder. Bu adaptör hiçbir zaman kendiliğinden
 * "Gonderildi" yazmaz.
 */
const { AdapterError } = require('./contract');

function createGibPortalAdapter({ mode }) {
  return {
    code: 'GIB_PORTAL',
    mode,
    async send() {
      return {
        status: 'ManuelBekliyor',
        statusCode: 'PORTAL',
        statusMessage: 'UBL XML GİB portalına manuel yüklenmeli; yükleme sonrası ETTN/durum "manuel durum" ile kaydedilmeli.',
      };
    },
    async queryStatus() {
      return { status: 'ManuelBekliyor', statusCode: 'PORTAL', statusMessage: 'Portal durumu manuel girilir.', final: false };
    },
    async cancel() {
      throw new AdapterError('Portal belgeleri GİB portalında iptal/itiraz edilir; sonucu manuel durum olarak kaydedin.', {
        code: 'EBELGE_IPTAL_DESTEK_YOK',
      });
    },
    async checkUser() {
      return { registered: null, aliases: [] };
    },
  };
}

module.exports = { createGibPortalAdapter };
