const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { cariTedarikciMi } = require('../src/utils/kodUretici');

async function siparisGetir(id) {
    const s = await pool.query(`
        SELECT sas.*, c.cari_kodu, c.cari_adi, t.talep_no
        FROM satin_alma_siparisleri sas
        JOIN cariler c ON c.id = sas.cari_id
        LEFT JOIN satin_alma_talepleri t ON t.id = sas.talep_id
        WHERE sas.id = $1
    `, [id]);
    if (!s.rows[0]) return null;
    const satirlar = await pool.query(`
        SELECT ss.*, st.stok_kodu, st.stok_adi,
               (ss.miktar - ss.giren_miktar) AS kalan_miktar
        FROM satin_alma_siparis_satirlari ss
        JOIN stoklar st ON st.id = ss.stok_id
        WHERE ss.siparis_id = $1 ORDER BY ss.id
    `, [id]);
    return { ...s.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM satin_alma_siparisleri ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await siparisGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const siparis = await siparisGetir(req.params.id);
        if (!siparis) return res.status(404).json({ hata: 'Satınalma siparişi bulunamadı.' });
        res.json(siparis);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Talepten satınalma siparişi oluştur */
router.post('/talep-donustur', async (req, res) => {
    try {
        const { talep_id, cari_id, birim_fiyatlar } = req.body;
        if (!talep_id || !cari_id) {
            return res.status(400).json({ hata: 'talep_id ve cari_id zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const talep = await client.query('SELECT * FROM satin_alma_talepleri WHERE id = $1 FOR UPDATE', [talep_id]);
            if (!talep.rows[0]) throw new Error('Talep bulunamadı.');
            if (talep.rows[0].durum !== 'Acik') throw new Error(`Talep dönüştürülemez. Durum: ${talep.rows[0].durum}`);

            const satirlar = await client.query(
                'SELECT * FROM satin_alma_talep_satirlari WHERE talep_id = $1 ORDER BY id',
                [talep_id]
            );
            if (satirlar.rows.length === 0) throw new Error('Talep satırı yok.');

            const cari = await client.query(
                'SELECT id, cari_kodu, cari_adi, cari_turu, aktif FROM cariler WHERE id = $1',
                [cari_id]
            );
            if (!cari.rows[0]) throw new Error('Cari bulunamadı.');
            if (cari.rows[0].aktif === false) throw new Error('Cari pasif; satınalma yapılamaz.');
            if (!cariTedarikciMi(cari.rows[0].cari_turu)) {
                throw new Error(
                    `Satınalma siparişi yalnızca tedarikçiye açılır. Seçilen cari (${cari.rows[0].cari_kodu}) türü: ${cari.rows[0].cari_turu}`
                );
            }

            const no = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
            let toplam = 0;
            const fiyatMap = birim_fiyatlar || {};

            const siparis = await client.query(
                `INSERT INTO satin_alma_siparisleri
                    (siparis_no, cari_id, is_yeri_id, talep_id, durum, toplam_tutar)
                 VALUES ($1,$2,$3,$4,'Onayli',0) RETURNING id`,
                [no, cari_id, talep.rows[0].is_yeri_id, talep_id]
            );
            const siparisId = siparis.rows[0].id;

            for (const sat of satirlar.rows) {
                const fiyat = Number(fiyatMap[sat.stok_id] ?? fiyatMap[String(sat.stok_id)] ?? 10);
                toplam += Number(sat.miktar) * fiyat;
                await client.query(
                    `INSERT INTO satin_alma_siparis_satirlari
                        (siparis_id, talep_satir_id, stok_id, miktar, birim_fiyat, birim)
                     VALUES ($1,$2,$3,$4,$5,$6)`,
                    [siparisId, sat.id, sat.stok_id, sat.miktar, fiyat, sat.birim]
                );
            }

            await client.query(
                'UPDATE satin_alma_siparisleri SET toplam_tutar = $1 WHERE id = $2',
                [toplam, siparisId]
            );
            await client.query(
                `UPDATE satin_alma_talepleri SET durum = 'SipariseDonustu' WHERE id = $1`,
                [talep_id]
            );

            return siparisId;
        });

        res.status(201).json(await siparisGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { durum } = req.body;
        const upd = await pool.query(
            `UPDATE satin_alma_siparisleri SET durum = COALESCE($2, durum) WHERE id=$1 RETURNING id`,
            [req.params.id, durum || null]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
        res.json(await siparisGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM satin_alma_siparisleri WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
