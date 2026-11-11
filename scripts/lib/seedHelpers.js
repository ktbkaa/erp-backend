/** Ortak seed yardımcıları */
async function sonraki(client, seri, fallback) {
  try {
    const { nextSequenceCode } = require('../../src/utils/kodUretici');
    return await nextSequenceCode(client, seri);
  } catch (_) {
    return fallback;
  }
}

module.exports = { sonraki };
