/** Ortak seed yardımcıları */
async function sonraki(client, seri, fallback) {
  try {
    const { sonrakiKod } = require('../../src/utils/kodUretici');
    return await sonrakiKod(client, seri);
  } catch (_) {
    return fallback;
  }
}

module.exports = { sonraki };
