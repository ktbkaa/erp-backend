const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { hareketKoduBul, BELGE_TIPI } = require('../src/utils/belgeOmurga');

async function hareketGetir(id) {
    const h = await pool.query(
        `
        SELECT h.*, d.depo_kodu, d.depo_adi,
               hd.depo_kodu AS hedef_depo_kodu, hd.depo_adi AS hedef_depo_adi,
               hk.hareket_kodu, hk.hareket_adi, hk.yon AS hareket_yon
        FROM stok_hareketleri h
        LEFT JOIN depolar d ON h.depo_id = d.id
        LEFT JOIN depolar hd ON h.hedef_depo_id = hd.id
        LEFT JOIN hareket_kodlari hk ON hk.id = h.hareket_kodu_id
        WHERE h.id = $1
        `,
        [id]
    );
    if (!h.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT s.*, st.stok_kodu, st.stok_adi, st.birim AS stok_birim
        FROM stok_hareket_satirlari s
        JOIN stoklar st ON s.stok_id = st.id
        WHERE s.hareket_id = $1
        ORDER BY s.id
        `,
        [id]
    );
    return { ...h.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

function mapHareketTipi(hareketKodu) {
    const belge = hareketKodu?.belge_tipi || '';
    const yon = hareketKodu?.yon || '';
    if (belge === 'Transfer' || yon === 'Transfer') return 'TRANSFER';
    if (belge === 'Sayim') return 'SAYIM';
    if (belge === 'StokGiris' || (yon === 'Giris' && belge === 'Duzeltme')) return 'STOK_GIRIS';
    if (belge === 'StokCikis' || belge === 'Fire') return 'STOK_CIKIS';
    if (yon === 'Giris') return 'STOK_GIRIS';
    if (yon === 'Cikis') return 'STOK_CIKIS';
    return 'DUZELTME';
}

function satirYon(hareketTipi, hareketKodu) {
    if (hareketTipi === 'TRANSFER' || hareketTipi === 'STOK_CIKIS' || hareketTipi === 'SATIS_CIKIS') return -1;
    if (hareketKodu?.yon === 'Cikis') return -1;
    return 1;
}

router.get('/', async (req, res) => {
    try {
        const { tip, depo_id } = req.query;
        const where = [];
        const params = [];
        if (tip) {
            params.push(tip);
            where.push(`h.hareket_tipi = $${params.length}`);
        }
        if (depo_id) {
            params.push(Number(depo_id));
            where.push(`h.depo_id = $${params.length}`);
        }
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`h.firma_id = $${params.length}`);
        }
        const sql = `
            SELECT h.id
            FROM stok_hareketleri h
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY h.id DESC
            LIMIT 500
        `;
        const liste = await pool.query(sql, params);
        const hareketler = [];
        for (const r of liste.rows) hareketler.push(await hareketGetir(r.id));
        res.json(hareketler);
    } catch (err) {
        console.error('Stok hareket listeleme hatası:', err);
        res.status(500).json({
            hata: 'Stok hareketleri çekilirken bir pürüz çıktı.',
            detay: err.message,
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const hareket = await hareketGetir(req.params.id);
        if (!hareket) return res.status(404).json({ hata: 'Stok hareketi bulunamadı.' });
        res.json(hareket);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Manuel stok hareketi oluştur.
 * Body: hareket_kodu_id, depo_id, hedef_depo_id? (transfer), aciklama?, satirlar[{stok_id,miktar,birim}]
 */
router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const satirlar = body.satirlar || body.kalemler;
        if (!body.depo_id) return res.status(400).json({ hata: 'depo_id zorunlu.' });
        if (!Array.isArray(satirlar) || !satirlar.length) {
            return res.status(400).json({ hata: 'satirlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const hk = await hareketKoduBul(
                client,
                body.belge_tipi_kod || BELGE_TIPI.STOK_HAREKET,
                body.hareket_kodu_id || null
            );
            // hareketKoduBul STOK_HAREKET için map yok — doğrudan id ile bul
            let hareketKodu = hk;
            if (!hareketKodu && body.hareket_kodu_id) {
                const r = await client.query(`SELECT * FROM hareket_kodlari WHERE id=$1`, [body.hareket_kodu_id]);
                hareketKodu = r.rows[0] || null;
            }
            if (!hareketKodu && body.hareket_kodu_id) {
                throw new Error('Hareket kodu bulunamadı.');
            }
            if (!hareketKodu) {
                // varsayılan: stok giriş
                const d = await client.query(
                    `SELECT * FROM hareket_kodlari WHERE belge_tipi='StokGiris' AND aktif ORDER BY id LIMIT 1`
                );
                hareketKodu = d.rows[0];
            }
            if (!hareketKodu) throw new Error('Hareket kodu seçin (STG/STC/TRF/SAY…).');

            const tip = mapHareketTipi(hareketKodu);
            if (tip === 'TRANSFER' && !body.hedef_depo_id) {
                throw new Error('Transfer için hedef_depo_id zorunlu.');
            }
            if (tip === 'TRANSFER' && Number(body.hedef_depo_id) === Number(body.depo_id)) {
                throw new Error('Kaynak ve hedef depo aynı olamaz.');
            }

            const yonCikis = -1;
            const yonGiris = 1;
            const satirHazir = satirlar.map((s) => {
                if (!s.stok_id || !s.miktar) throw new Error('Satırda stok_id ve miktar zorunlu.');
                return {
                    stok_id: s.stok_id,
                    miktar: Number(s.miktar),
                    birim: s.birim || null,
                    raf_kodu: s.raf_kodu || body.raf_kodu || null,
                    konum_kodu: s.konum_kodu || body.konum_kodu || null,
                    parti_id: s.parti_id || null,
                };
            });

            if (tip === 'TRANSFER') {
                const cikis = await stokHareketOlustur(client, {
                    hareketTipi: 'TRANSFER',
                    depoId: body.depo_id,
                    belgeTipi: 'TRANSFER',
                    aciklama: body.aciklama || `Transfer → depo ${body.hedef_depo_id}`,
                    hareketKoduId: hareketKodu.id,
                    satirlar: satirHazir.map((s) => ({ ...s, yon: yonCikis })),
                });
                await client.query(
                    `UPDATE stok_hareketleri SET hedef_depo_id=$2 WHERE id=$1`,
                    [cikis.hareket.id, body.hedef_depo_id]
                );
                const giris = await stokHareketOlustur(client, {
                    hareketTipi: 'TRANSFER',
                    depoId: body.hedef_depo_id,
                    belgeTipi: 'TRANSFER',
                    belgeId: cikis.hareket.id,
                    aciklama: body.aciklama || `Transfer ← depo ${body.depo_id}`,
                    hareketKoduId: hareketKodu.id,
                    satirlar: satirHazir.map((s) => ({ ...s, yon: yonGiris })),
                });
                await client.query(
                    `UPDATE stok_hareketleri SET bagli_hareket_id=$2, hedef_depo_id=$3 WHERE id=$1`,
                    [cikis.hareket.id, giris.hareket.id, body.hedef_depo_id]
                );
                await client.query(
                    `UPDATE stok_hareketleri SET bagli_hareket_id=$2 WHERE id=$1`,
                    [giris.hareket.id, cikis.hareket.id]
                );
                return cikis.hareket.id;
            }

            const yon = satirYon(tip, hareketKodu);
            const hareket = await stokHareketOlustur(client, {
                hareketTipi: tip,
                depoId: body.depo_id,
                belgeTipi: tip,
                aciklama: body.aciklama || `${hareketKodu.hareket_adi}`,
                hareketKoduId: hareketKodu.id,
                satirlar: satirHazir.map((s) => ({ ...s, yon })),
            });
            return hareket.hareket.id;
        });

        res.status(201).json(await hareketGetir(id));
    } catch (err) {
        const status = err.code === 'YETERSIZ_STOK' ? 400 : 400;
        res.status(status).json({
            hata: err.message,
            kod: err.code || undefined,
            detay: err.detay || undefined,
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        // Manuel hareketler silinebilir; belgeye bağlı (irsaliye/mal kabul) olanlar değil
        const h = await pool.query(
            `SELECT id, belge_tipi, belge_id, bagli_hareket_id, hareket_tipi
             FROM stok_hareketleri WHERE id=$1`,
            [req.params.id]
        );
        if (!h.rows[0]) return res.status(404).json({ hata: 'Stok hareketi bulunamadı.' });
        const row = h.rows[0];
        if (row.belge_tipi && ['IRSALIYE', 'MAL_KABUL', 'URETIM_GIRIS'].includes(row.belge_tipi) && row.belge_id) {
            return res.status(400).json({ hata: 'Belgeye bağlı stok hareketi buradan silinemez.' });
        }
        await withTransaction(pool, async (client) => {
            if (row.bagli_hareket_id) {
                await client.query(`DELETE FROM stok_hareketleri WHERE id=$1`, [row.bagli_hareket_id]);
            }
            await client.query(`DELETE FROM stok_hareketleri WHERE id=$1`, [row.id]);
        });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
