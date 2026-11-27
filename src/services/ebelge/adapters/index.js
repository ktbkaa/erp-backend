const { assertAdapter, AdapterError } = require('./contract');
const { createMockAdapter } = require('./mockAdapter');
const { createRestAdapter } = require('./restIntegratorAdapter');
const { createGibPortalAdapter } = require('./gibPortalAdapter');

let mockSingleton = null;
let override = null;

/** Testler için: resolveConfig sonucu ne olursa olsun bu adaptörü kullan. */
function setAdapterOverride(adapter) {
  override = adapter ? assertAdapter(adapter) : null;
}

/** resolveConfig() sonucuna göre adaptör üretir. liveBlocked ise adaptör verilmez. */
function createAdapter(cfg) {
  if (override) return override;
  if (cfg.liveBlocked) {
    throw new AdapterError(
      `GIB_CANLI=Evet fakat canlı gönderim için eksik yapılandırma var: ${cfg.missingLive.join(', ')}. Gönderim yapılmadı.`,
      { code: 'EBELGE_CANLI_KIMLIK_EKSIK' }
    );
  }
  if (cfg.provider === 'REST' && (cfg.mode === 'live' || cfg.mode === 'test')) {
    return assertAdapter(createRestAdapter({
      mode: cfg.mode,
      baseUrl: cfg.rest.baseUrl,
      auth: cfg.rest.auth,
      credentials: cfg.rest.credentials,
      endpoints: cfg.rest.endpoints,
      timeoutMs: cfg.rest.timeoutMs,
    }));
  }
  if (cfg.provider === 'GIB_PORTAL') return assertAdapter(createGibPortalAdapter({ mode: cfg.mode }));
  if (!mockSingleton) mockSingleton = createMockAdapter();
  return mockSingleton;
}

module.exports = { createAdapter, setAdapterOverride };
