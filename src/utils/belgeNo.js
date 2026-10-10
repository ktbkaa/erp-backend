/**
 * Belge numarası üretici.
 * Örnek çıktı: SAS-2026-0001
 *
 * Aynı anda iki istek gelirse çakışmayı azaltmak için
 * satır kilidi (FOR UPDATE) kullanır.
 */
async function sonrakiBelgeNo(client, belgeTipi) {
    const yil = new Date().getFullYear();

    const sonuc = await client.query(
        `
        SELECT id, onek, yil, son_numara
        FROM belge_numaralari
        WHERE belge_tipi = $1
        FOR UPDATE
        `,
        [belgeTipi]
    );

    if (sonuc.rows.length === 0) {
        throw new Error(`Belge tipi tanımlı değil: ${belgeTipi}`);
    }

    let { id, onek, yil: kayitYil, son_numara } = sonuc.rows[0];

    if (Number(kayitYil) !== yil) {
        son_numara = 0;
        kayitYil = yil;
    }

    const yeniNo = Number(son_numara) + 1;

    await client.query(
        `
        UPDATE belge_numaralari
        SET son_numara = $1, yil = $2
        WHERE id = $3
        `,
        [yeniNo, kayitYil, id]
    );

    const sira = String(yeniNo).padStart(4, '0');
    return `${onek}-${kayitYil}-${sira}`;
}

module.exports = { sonrakiBelgeNo };
