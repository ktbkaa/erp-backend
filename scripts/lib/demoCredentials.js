/**
 * Demo / QA script’leri için tek kimlik kaynağı. Script’lere parola dağıtılmaz:
 * DEMO_PASS (demo kullanıcıları), QA_USER / QA_PASS ve QA_ADMIN_PASS env’den okunur.
 * Yerel varsayılanlar yalnız canlı dışı ortamda kullanılır; canlıda env verilmezse
 * demo kullanıcılarına bilinen parola yazan seed’ler hata verir.
 */
const { isProduction } = require('../../src/utils/securityConfig');

const LOCAL_DEFAULTS = { demo: 'Demo123!', qaAdmin: 'admin' };

function fromEnvOrLocal(envName, localKey, what) {
  if (process.env[envName]) return process.env[envName];
  if (isProduction()) throw new Error(`${what} için ${envName} canlıda zorunlu (yerel varsayılan kullanılmaz).`);
  return LOCAL_DEFAULTS[localKey];
}

function demoPassword() {
  return fromEnvOrLocal('DEMO_PASS', 'demo', 'Demo parolası');
}

function qaAdminPassword() {
  return fromEnvOrLocal('QA_ADMIN_PASS', 'qaAdmin', 'QA ADMIN parolası');
}

/** QA login adayları: önce QA_USER/QA_PASS, sonra yerel demo hesapları. */
function qaLoginCandidates() {
  const out = [];
  if (process.env.QA_USER) {
    out.push({ username: process.env.QA_USER, password: process.env.QA_PASS || '' });
  }
  if (!isProduction() || process.env.DEMO_PASS) {
    out.push({ username: 'kagantalha.b', password: demoPassword() });
    out.push({ username: 'owner', password: demoPassword() });
  }
  if (!isProduction() || process.env.QA_ADMIN_PASS) {
    out.push({ username: 'ADMIN', password: qaAdminPassword() });
    out.push({ username: 'admin', password: qaAdminPassword() });
    out.push({ user_code: 'ADMIN', password: qaAdminPassword() });
  }
  return out;
}

module.exports = { demoPassword, qaAdminPassword, qaLoginCandidates };
