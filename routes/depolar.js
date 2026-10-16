const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

// Tüm depoları listele (firma + iş yeri bilgisiyle)
router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query(`
            SELECT d.*, i.is_yeri_kodu, i.is_yeri_adi, f.firma_kodu, f.firma_adi
            FROM depolar d
            JOIN is_yerleri i ON d.is_yeri_id = i.id
            JOIN firmalar f ON i.firma_id = f.id
            ORDER BY d.is_yeri_id ASC, d.varsayilan DESC, d.id ASC
        `);
        res.json(sonuc.rows);
    } catch (err) {
        console.error('Depo listeleme hatası:', err);
        res.status(500).json({ hata: 'Depolar çekilirken bir pürüz çıktı.', detay: err.message });
    }
});

// Tek depo
router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(
            `
            SELECT d.*, i.is_yeri_kodu, i.is_yeri_adi, f.firma_kodu, f.firma_adi
            FROM depolar d
            JOIN is_yerleri i ON d.is_yeri_id = i.id
            JOIN firmalar f ON i.firma_id = f.id
            WHERE d.id = $1
            `,
            [req.params.id]
        );
        if (sonuc.rows.length === 0) {
            return res.status(404).json({ hata: 'Depo bulunamadı.' });
        }
        res.json(sonuc.rows[0]);
    } catch (err) {
        console.error('Depo getirme hatası:', err);
        res.status(500).json({ hata: 'Depo getirilirken bir pürüz çıktı.', detay: err.message });
    }
});

// Yeni depo
router.post('/', async (req, res) => {
    try {
        const { is_yeri_id, depo_kodu, depo_adi, aktif, varsayilan, raf_kodu, konum_kodu, depo_rolu } = req.body;

        if (!is_yeri_id || !depo_adi) {
            return res.status(400).json({
                hata: 'is_yeri_id ve depo_adi zorunludur. depo_kodu boşsa otomatik üretilir (D00001).',
            });
        }

        const yeniDepo = await withTransaction(pool, async (client) => {
            const isYeri = await client.query(
                'SELECT id FROM is_yerleri WHERE id = $1',
                [is_yeri_id]
            );
            if (isYeri.rows.length === 0) {
                throw Object.assign(
                    new Error(`İş yeri bulunamadı (id=${is_yeri_id}). Önce /is-yerleri ile kontrol et.`),
                    { status: 400 }
                );
            }

            const anaDepoMu = varsayilan === true || varsayilan === 'true';

            // Bu iş yerinde ilk depo ise otomatik varsayılan yap
            const mevcut = await client.query(
                'SELECT COUNT(*)::int AS adet FROM depolar WHERE is_yeri_id = $1',
                [is_yeri_id]
            );
            const ilkDepo = mevcut.rows[0].adet === 0;
            const varsayilanOlacak = anaDepoMu || ilkDepo;

            if (varsayilanOlacak) {
                await client.query(
                    'UPDATE depolar SET varsayilan = FALSE WHERE is_yeri_id = $1',
                    [is_yeri_id]
                );
            }

            const kod = depo_kodu || (await sonrakiKod(client, 'DEPO'));

            const sonuc = await client.query(
                `
                INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, aktif, varsayilan, raf_kodu, konum_kodu, depo_rolu)
                VALUES ($1, $2, $3, COALESCE($4, TRUE), $5, $6, $7, COALESCE($8, 'Normal'))
                RETURNING *;
                `,
                [
                    is_yeri_id, kod, depo_adi, aktif, varsayilanOlacak,
                    raf_kodu || null, konum_kodu || null, depo_rolu || 'Normal',
                ]
            );
            return sonuc.rows[0];
        });

        res.status(201).json(yeniDepo);
    } catch (err) {
        console.error('Depo kayıt hatası:', err);
        const status = err.status || 500;
        res.status(status).json({
            hata: err.message || 'Depo eklenirken bir pürüz çıktı.',
            detay: err.detail || undefined,
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { depo_adi, aktif, varsayilan, is_yeri_id, raf_kodu, konum_kodu, depo_rolu } = req.body;
        if (!depo_adi) return res.status(400).json({ hata: 'depo_adi zorunludur.' });

        const row = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT * FROM depolar WHERE id = $1', [req.params.id]);
            if (!mevcut.rows[0]) throw Object.assign(new Error('Depo bulunamadı.'), { status: 404 });

            const isYeriId = is_yeri_id || mevcut.rows[0].is_yeri_id;
            const anaDepoMu = varsayilan === true || varsayilan === 'true';
            if (anaDepoMu) {
                await client.query('UPDATE depolar SET varsayilan = FALSE WHERE is_yeri_id = $1', [isYeriId]);
            }

            const sonuc = await client.query(
                `
                UPDATE depolar SET
                    is_yeri_id = $2,
                    depo_adi = $3,
                    aktif = COALESCE($4, aktif),
                    varsayilan = COALESCE($5, varsayilan),
                    raf_kodu = COALESCE($6, raf_kodu),
                    konum_kodu = COALESCE($7, konum_kodu),
                    depo_rolu = COALESCE($8, depo_rolu)
                WHERE id = $1
                RETURNING *
                `,
                [
                    req.params.id,
                    isYeriId,
                    depo_adi,
                    typeof aktif === 'boolean' ? aktif : null,
                    typeof varsayilan === 'boolean' ? varsayilan : null,
                    raf_kodu !== undefined ? (raf_kodu || null) : null,
                    konum_kodu !== undefined ? (konum_kodu || null) : null,
                    depo_rolu || null,
                ]
            );
            return sonuc.rows[0];
        });

        const full = await pool.query(
            `
            SELECT d.*, i.is_yeri_kodu, i.is_yeri_adi, f.firma_kodu, f.firma_adi
            FROM depolar d
            JOIN is_yerleri i ON d.is_yeri_id = i.id
            JOIN firmalar f ON i.firma_id = f.id
            WHERE d.id = $1
            `,
            [row.id]
        );
        res.json(full.rows[0]);
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM depolar WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Depo bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
