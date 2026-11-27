/**
 * e-Belge sağlayıcı adaptör sözleşmesi (tüm adaptörler aynı imzayı uygular).
 *
 *   code: 'MOCK' | 'REST' | 'GIB_PORTAL'
 *   mode: 'mock' | 'test' | 'live'
 *
 *   send({ documentType:'INVOICE'|'DESPATCHADVICE', profileId, uuid, gibNumber, xml, envelopeXml?,
 *          senderAlias?, receiverAlias?, sender:{id,name}, receiver:{id,name} })
 *     → { status:'Gonderildi'|'Tamamlandi'|'ManuelBekliyor', providerRef?, statusCode?, statusMessage?, raw? }
 *
 *   queryStatus({ documentType, uuid, providerRef, profileId })
 *     → { status:'Gonderildi'|'Tamamlandi'|'Kabul'|'Red'|'Hata'|'ManuelBekliyor', statusCode?, statusMessage?, final:boolean, raw? }
 *
 *   cancel({ documentType, uuid, providerRef, profileId, reason })
 *     → { ok:true, statusCode?, statusMessage?, raw? }
 *
 *   checkUser({ taxId, documentKind:'EFATURA'|'EIRSALIYE' })
 *     → { registered:boolean|null, aliases:[{ alias, title?, registeredAt? }], raw? }
 *
 * Hata: AdapterError fırlatılır; `retryable` geçici (ağ, zaman aşımı, 5xx, 429) hataları işaretler.
 */

const REQUIRED_METHODS = Object.freeze(['send', 'queryStatus', 'cancel', 'checkUser']);
const SEND_STATUSES = Object.freeze(['Gonderildi', 'Tamamlandi', 'ManuelBekliyor']);
const QUERY_STATUSES = Object.freeze(['Gonderildi', 'Tamamlandi', 'Kabul', 'Red', 'Hata', 'ManuelBekliyor']);

class AdapterError extends Error {
  constructor(message, { code = 'EBELGE_SAGLAYICI_HATA', retryable = false, httpStatus = null, raw = null } = {}) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.retryable = Boolean(retryable);
    this.httpStatus = httpStatus;
    this.raw = raw;
  }
}

function assertAdapter(a) {
  if (!a || typeof a !== 'object') throw new TypeError('Adaptör nesne olmalıdır.');
  for (const m of REQUIRED_METHODS) {
    if (typeof a[m] !== 'function') throw new TypeError(`Adaptör ${a.code || '?'}: ${m}() eksik.`);
  }
  if (!['mock', 'test', 'live'].includes(a.mode)) throw new TypeError(`Adaptör ${a.code}: geçersiz mode ${a.mode}`);
  return a;
}

module.exports = { AdapterError, assertAdapter, REQUIRED_METHODS, SEND_STATUSES, QUERY_STATUSES };
