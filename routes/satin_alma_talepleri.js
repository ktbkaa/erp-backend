const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { assertYetki, reqKullaniciKodu } = require('../src/utils/yetki');
const { epostaKuyrugaAl, gonderBir } = require('../src/services/epostaService');

async function talepGetir(id) {
    const t = await pool.query('SELECT * FROM satin_alma_talepleri WHERE id = $1', [id]);
    if (!t.rows[0]) return null;
    const satirlar = await pool.query(`
        SELECT ts.*, s.stok_kodu, s.stok_adi, s.birim AS stok_birimi
        FROM satin_alma_talep_satirlari ts
        JOIN stoklar s ON s.id = ts.stok_id
        WHERE ts.talep_id = $1 ORDER BY ts.id
    `, [id]);
    return { ...t.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM satin_alma_talepleri ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await talepGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const talep = await talepGetir(req.params.id);
        if (!talep) return res.status(404).json({ hata: 'Talep bulunamadı.' });
        res.json(talep);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { is_yeri_id, aciklama, satirlar, tedarikci_cari_id } = req.body;
        if (!Array.isArray(satirlar) || satirlar.length === 0) {
            return res.status(400).json({ hata: 'satirlar zorunlu.' });
        }
        const kod = reqKullaniciKodu(req);
        let olusturan = null;
        if (kod) {
            olusturan = await assertYetki(pool, kod, 'satinalma_talep');
        }

        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'SATINALMA_TALEP');
            const baslik = await client.query(
                `INSERT INTO satin_alma_talepleri (talep_no, is_yeri_id, aciklama, olusturan_id, tedarikci_cari_id)
                 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [no, is_yeri_id || null, aciklama || null, olusturan?.id || null, tedarikci_cari_id || null]
            );
            const talepId = baslik.rows[0].id;
            for (const s of satirlar) {
                const stok = await client.query('SELECT id, birim FROM stoklar WHERE id = $1', [s.stok_id]);
                if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
                await client.query(
                    `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim)
                     VALUES ($1,$2,$3,$4)`,
                    [talepId, s.stok_id, s.miktar, s.birim || stok.rows[0].birim]
                );
            }
            return talepId;
        });

        res.status(201).json(await talepGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { aciklama, durum, is_yeri_id, satirlar } = req.body;
        const allowed = ['Acik', 'Onayli', 'SipariseDonustu', 'Iptal', 'Kapali'];
        if (durum && !allowed.includes(durum)) {
            return res.status(400).json({ hata: `Geçersiz durum. İzin verilen: ${allowed.join(', ')}` });
        }

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                'SELECT id FROM satin_alma_talepleri WHERE id=$1 FOR UPDATE',
                [req.params.id]
            );
            if (!mevcut.rows[0]) {
                const err = new Error('Talep bulunamadı.');
                err.status = 404;
                throw err;
            }
            await client.query(
                `
                UPDATE satin_alma_talepleri SET
                    aciklama = COALESCE($2, aciklama),
                    durum = COALESCE($3, durum),
                    is_yeri_id = COALESCE($4, is_yeri_id)
                WHERE id = $1
                `,
                [req.params.id, aciklama ?? null, durum || null, is_yeri_id || null]
            );
            if (Array.isArray(satirlar)) {
                await client.query('DELETE FROM satin_alma_talep_satirlari WHERE talep_id=$1', [req.params.id]);
                for (const s of satirlar) {
                    if (!s.stok_id || s.miktar == null) continue;
                    const stok = await client.query('SELECT id, birim FROM stoklar WHERE id=$1', [s.stok_id]);
                    if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
                    await client.query(
                        `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim)
                         VALUES ($1,$2,$3,$4)`,
                        [req.params.id, s.stok_id, s.miktar, s.birim || stok.rows[0].birim]
                    );
                }
            }
            return Number(req.params.id);
        });

        res.json(await talepGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** Onay — yalnızca Satınalma yetki grubu; isteğe bağlı tedarikçi e-postası */
router.post('/:id/onayla', async (req, res) => {
    try {
        const onaylayan = await assertYetki(pool, reqKullaniciKodu(req), 'satinalma_onay');
        const epostaGonder = req.body.eposta !== false;

        const sonuc = await withTransaction(pool, async (client) => {
            const upd = await client.query(
                `
                UPDATE satin_alma_talepleri SET
                    durum='Onayli',
                    onaylayan_id=$2,
                    onay_tarihi=CURRENT_TIMESTAMP,
                    tedarikci_cari_id=COALESCE($3, tedarikci_cari_id)
                WHERE id=$1 AND durum='Acik'
                RETURNING *
                `,
                [req.params.id, onaylayan.id, req.body.tedarikci_cari_id || null]
            );
            if (!upd.rows[0]) {
                const err = new Error('Talep onaylanamadı (bulunamadı veya durum Acik değil).');
                err.status = 400;
                throw err;
            }
            const talep = upd.rows[0];
            let eposta = null;
            if (epostaGonder) {
                let alici = req.body.alici_eposta || null;
                let cariAd = '';
                if (talep.tedarikci_cari_id) {
                    const c = await client.query(
                        'SELECT cari_adi, email FROM cariler WHERE id=$1',
                        [talep.tedarikci_cari_id]
                    );
                    alici = alici || c.rows[0]?.email || null;
                    cariAd = c.rows[0]?.cari_adi || '';
                }
                if (alici) {
                    const satirlar = await client.query(
                        `
                        SELECT s.stok_kodu, s.stok_adi, ts.miktar, ts.birim
                        FROM satin_alma_talep_satirlari ts
                        JOIN stoklar s ON s.id = ts.stok_id
                        WHERE ts.talep_id=$1
                        `,
                        [talep.id]
                    );
                    const govde = [
                        `Satınalma talebi onaylandı: ${talep.talep_no}`,
                        cariAd ? `Tedarikçi: ${cariAd}` : '',
                        '',
                        ...satirlar.rows.map(
                            (s) => `- ${s.stok_kodu} ${s.stok_adi}: ${s.miktar} ${s.birim || ''}`
                        ),
                        '',
                        talep.aciklama || '',
                    ].filter(Boolean).join('\n');
                    eposta = await epostaKuyrugaAl(client, {
                        kaynakTipi: 'SATINALMA_TALEP',
                        kaynakId: talep.id,
                        alici,
                        konu: `Satınalma talebi ${talep.talep_no}`,
                        govde,
                    });
                    eposta = await gonderBir(client, eposta.id);
                }
            }
            return { talepId: talep.id, eposta };
        });

        const talep = await talepGetir(sonuc.talepId);
        res.json({ ...talep, eposta: sonuc.eposta });
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM satin_alma_talepleri WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Talep bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
