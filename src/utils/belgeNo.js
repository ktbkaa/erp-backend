/**
 * Belge numarası üretici — artık ortak kod sistemini kullanır.
 * Örnek: L00001 (satınalma talebi), P00001 (satınalma siparişi)
 */
const { nextSequenceCode, nextStockMovementNo } = require('./kodUretici');

async function nextDocumentNo(client, belgeTipi) {
    // Eski çağrılar aynı anahtarlarla çalışmaya devam eder
    return nextSequenceCode(client, belgeTipi);
}

module.exports = { nextDocumentNo, nextStockMovementNo };
