/**
 * Belge numarası üretici — artık ortak kod sistemini kullanır.
 * Örnek: L00001 (satınalma talebi), P00001 (satınalma siparişi)
 */
const { sonrakiKod } = require('./kodUretici');

async function sonrakiBelgeNo(client, belgeTipi) {
    // Eski çağrılar aynı anahtarlarla çalışmaya devam eder
    return sonrakiKod(client, belgeTipi);
}

module.exports = { sonrakiBelgeNo };
