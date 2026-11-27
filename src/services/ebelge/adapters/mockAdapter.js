/**
 * Yerel mock sağlayıcı: ağ çağrısı yok, süreç içi durum. Sandbox/demo ve sözleşme testleri için.
 * GİB'e hiçbir şey gitmez; sonuçlar kuyrukta is_simulated=true olarak işaretlenir.
 */
const crypto = require('crypto');
const { AdapterError } = require('./contract');

const state = {
  documents: new Map(),
  users: new Map(),
  failures: [],
  finalResponse: 'Kabul',
};

/** Test kancası: sıradaki çağrılarda hata üret, kullanıcı listesi / nihai yanıt ayarla. */
function configure({ failNext, users, finalResponse } = {}) {
  if (failNext) state.failures.push(...[].concat(failNext));
  if (users) {
    for (const [taxId, aliases] of Object.entries(users)) state.users.set(String(taxId), [].concat(aliases));
  }
  if (finalResponse) state.finalResponse = finalResponse;
}

function reset() {
  state.documents.clear();
  state.users.clear();
  state.failures.length = 0;
  state.finalResponse = 'Kabul';
}

function maybeFail(op) {
  const i = state.failures.findIndex((f) => !f.op || f.op === op);
  if (i === -1) return;
  const f = state.failures.splice(i, 1)[0];
  throw new AdapterError(f.message || `Mock ${op} hatası`, {
    code: f.code || (f.retryable ? 'EBELGE_GECICI_HATA' : 'EBELGE_SAGLAYICI_RED'),
    retryable: Boolean(f.retryable),
    httpStatus: f.httpStatus || (f.retryable ? 503 : 422),
  });
}

function createMockAdapter() {
  return {
    code: 'MOCK',
    mode: 'mock',
    async send(p) {
      maybeFail('send');
      if (!p.uuid || !p.xml) throw new AdapterError('uuid ve xml zorunlu', { code: 'EBELGE_ISTEK_GECERSIZ' });
      if (state.documents.has(p.uuid)) {
        throw new AdapterError('Belge daha önce gönderilmiş (1163)', { code: 'GIB_1163' });
      }
      const providerRef = `MOCK-${crypto.randomUUID()}`;
      state.documents.set(p.uuid, { ...p, providerRef, step: 0 });
      return {
        status: 'Gonderildi',
        providerRef,
        statusCode: '1000',
        statusMessage: 'Zarf kuyruğa eklendi (mock)',
        raw: { mock: true, sha256: crypto.createHash('sha256').update(p.xml).digest('hex') },
      };
    },
    async queryStatus(p) {
      maybeFail('queryStatus');
      const d = state.documents.get(p.uuid);
      if (!d) throw new AdapterError('Belge mock sağlayıcıda bulunamadı', { code: 'EBELGE_BULUNAMADI' });
      d.step += 1;
      const commercial = d.profileId === 'TICARIFATURA';
      if (d.cancelled) return { status: 'Red', statusCode: 'IPTAL', statusMessage: 'İptal edildi (mock)', final: true };
      if (d.step === 1 || !commercial) {
        return { status: 'Tamamlandi', statusCode: '1300', statusMessage: 'Başarıyla tamamlandı (mock)', final: !commercial };
      }
      const red = state.finalResponse === 'Red';
      return { status: red ? 'Red' : 'Kabul', statusCode: red ? 'RED' : 'KABUL', statusMessage: `Alıcı ${red ? 'reddetti' : 'kabul etti'} (mock)`, final: true };
    },
    async cancel(p) {
      maybeFail('cancel');
      const d = state.documents.get(p.uuid);
      if (!d) throw new AdapterError('Belge mock sağlayıcıda bulunamadı', { code: 'EBELGE_BULUNAMADI' });
      if (d.profileId !== 'EARSIVFATURA') {
        throw new AdapterError('e-Fatura/e-İrsaliye sağlayıcı üzerinden iptal edilemez; iade faturası veya GİB portal iptal talebi gerekir.', { code: 'EBELGE_IPTAL_DESTEK_YOK' });
      }
      d.cancelled = true;
      return { ok: true, statusCode: 'IPTAL', statusMessage: 'e-Arşiv iptal edildi (mock)' };
    },
    async checkUser(p) {
      maybeFail('checkUser');
      const aliases = state.users.get(String(p.taxId)) || [];
      return { registered: aliases.length > 0, aliases: aliases.map((a) => (typeof a === 'string' ? { alias: a } : a)) };
    },
  };
}

module.exports = { createMockAdapter, configure, reset, _state: state };
