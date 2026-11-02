const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { hareketKoduBul, BELGE_TIPI } = require('../src/utils/belgeOmurga');
const { hareketKodundanKkEmirleri } = require('../src/services/kaliteService');

async function hareketGetir(id) {
    const h = await pool.query(
        `
        SELECT h.*, d.warehouse_code, d.warehouse_name,
               hd.warehouse_code AS hedef_depo_kodu, hd.warehouse_name AS hedef_depo_adi,
               hk.movement_code, hk.movement_name, hk.direction AS hareket_yon
        FROM stock_movements h
        LEFT JOIN warehouses d ON h.warehouse_id = d.id
        LEFT JOIN warehouses hd ON h.target_warehouse_id = hd.id
        LEFT JOIN movement_codes hk ON hk.id = h.movement_code_id
        WHERE h.id = $1
        `,
        [id]
    );
    if (!h.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT s.*, st.item_code, st.item_name, st.uom_code AS stok_birim
        FROM stock_movement_lines s
        JOIN items st ON s.item_id = st.id
        WHERE s.movement_id = $1
        ORDER BY s.id
        `,
        [id]
    );
    return { ...h.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

function mapHareketTipi(hareketKodu) {
    const belge = hareketKodu?.document_type || '';
    const direction = hareketKodu?.direction || '';
    if (belge === 'Transfer' || direction === 'Transfer') return 'TRANSFER';
    if (belge === 'Sayim') return 'SAYIM';
    if (belge === 'StokGiris' || (direction === 'Giris' && belge === 'Duzeltme')) return 'STOK_GIRIS';
    if (belge === 'StokCikis' || belge === 'Fire') return 'STOK_CIKIS';
    if (direction === 'Giris') return 'STOK_GIRIS';
    if (direction === 'Cikis') return 'STOK_CIKIS';
    return 'DUZELTME';
}

function satirYon(hareketTipi, hareketKodu) {
    if (hareketTipi === 'TRANSFER' || hareketTipi === 'STOK_CIKIS' || hareketTipi === 'SATIS_CIKIS') return -1;
    if (hareketKodu?.direction === 'Cikis') return -1;
    return 1;
}

async function withSavepoint(client, name, fn) {
    const sp = String(name || 'sp').replace(/[^a-zA-Z0-9_]/g, '_');
    await client.query(`SAVEPOINT ${sp}`);
    try {
        const out = await fn();
        await client.query(`RELEASE SAVEPOINT ${sp}`);
        return out;
    } catch (_) {
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        await client.query(`RELEASE SAVEPOINT ${sp}`).catch(() => {});
        return null;
    }
}

/**
 * Barkod okutma izi + parti/seri arka plan kayıtları (ekranda görünmez; rapor için).
 */
async function kaydetBarkodOkumalar(client, {
    hareket,
    satirlar,
    kaynakSatirlar,
    depoId,
    movementType,
    kullanici,
    firmaId,
}) {
    if (!hareket?.id || !Array.isArray(satirlar) || !Array.isArray(kaynakSatirlar)) return;
    for (let i = 0; i < kaynakSatirlar.length; i += 1) {
        const src = kaynakSatirlar[i];
        const line = satirlar[i];
        if (!src || !line) continue;
        const okumalar = Array.isArray(src.barkod_okumalar) && src.barkod_okumalar.length
            ? src.barkod_okumalar
            : (src.barkod ? [{ barkod: src.barkod, quantity: 1 }] : []);
        for (const o of okumalar) {
            const barkod = String(o?.barkod || '').trim();
            if (!barkod) continue;
            const qty = Number(o.quantity);
            await withSavepoint(client, 'barkod_scan', async () => {
                await client.query(
                    `
                    INSERT INTO item_barcode_scans (
                        company_id, movement_id, movement_line_id, barkod, item_id,
                        warehouse_id, quantity, movement_type, result, message, okuyan_user
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Ok',NULL,$9)
                    `,
                    [
                        firmaId || hareket.company_id || null,
                        hareket.id,
                        line.id,
                        barkod,
                        line.item_id,
                        depoId || hareket.warehouse_id || null,
                        Number.isFinite(qty) && qty > 0 ? qty : 1,
                        movementType || hareket.movement_type || null,
                        kullanici || null,
                    ]
                );
            });

            await withSavepoint(client, 'barkod_seri_parti', async () => {
                const st = await client.query(
                    `SELECT series_politika, lot_politika FROM items WHERE id=$1`,
                    [line.item_id]
                );
                const pol = st.rows[0] || {};
                if (/zorunlu|istege/i.test(String(pol.series_politika || ''))) {
                    const mevcut = await client.query(
                        `SELECT id FROM item_serials WHERE item_id=$1 AND serial_no=$2`,
                        [line.item_id, barkod]
                    );
                    let sid = mevcut.rows[0]?.id || null;
                    if (!sid) {
                        const ins = await client.query(
                            `
                            INSERT INTO item_serials (serial_no, item_id, lot_id, warehouse_id, status, son_movement_id)
                            VALUES ($1,$2,$3,$4,'Depoda',$5) RETURNING id
                            `,
                            [barkod, line.item_id, line.lot_id || null, depoId || null, hareket.id]
                        );
                        sid = ins.rows[0]?.id || null;
                    } else {
                        await client.query(
                            `UPDATE item_serials SET warehouse_id=COALESCE($2, warehouse_id),
                                lot_id=COALESCE($3, lot_id), son_movement_id=$4, status='Depoda'
                             WHERE id=$1`,
                            [sid, depoId || null, line.lot_id || null, hareket.id]
                        );
                    }
                    if (sid && !line.series_id) {
                        await client.query(
                            `UPDATE stock_movement_lines SET series_id=$2, serial_no=COALESCE(serial_no,$3) WHERE id=$1`,
                            [line.id, sid, barkod]
                        );
                    }
                }
                if (/zorunlu|istege/i.test(String(pol.lot_politika || '')) && !line.lot_id) {
                    const lot = await client.query(
                        `SELECT id FROM item_lots WHERE item_id=$1 AND lot_no=$2`,
                        [line.item_id, barkod]
                    );
                    let lid = lot.rows[0]?.id || null;
                    if (!lid) {
                        const ins = await client.query(
                            `
                            INSERT INTO item_lots (item_id, lot_no, source_type, source_id)
                            VALUES ($1,$2,'STOK_HAREKET',$3) RETURNING id
                            `,
                            [line.item_id, barkod, hareket.id]
                        );
                        lid = ins.rows[0]?.id || null;
                    }
                    if (lid) {
                        await client.query(
                            `UPDATE stock_movement_lines SET lot_id=$2 WHERE id=$1`,
                            [line.id, lid]
                        );
                    }
                }
            });
        }
    }
}

router.get('/', async (req, res) => {
    try {
        const { type, warehouse_id } = req.query;
        const where = [];
        const params = [];
        if (type) {
            params.push(type);
            where.push(`h.movement_type = $${params.length}`);
        }
        if (warehouse_id) {
            params.push(Number(warehouse_id));
            where.push(`h.warehouse_id = $${params.length}`);
        }
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`h.company_id = $${params.length}`);
        }
        const sql = `
            SELECT h.id
            FROM stock_movements h
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
 * Body: movement_code_id, warehouse_id, target_warehouse_id? (transfer), description?, satirlar[{item_id,quantity,uom_code}]
 */
router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const satirlar = body.satirlar || body.kalemler;
        if (!body.warehouse_id) return res.status(400).json({ hata: 'warehouse_id zorunlu.' });
        if (!Array.isArray(satirlar) || !satirlar.length) {
            return res.status(400).json({ hata: 'satirlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const hk = await hareketKoduBul(
                client,
                body.belge_tipi_kod || BELGE_TIPI.STOK_HAREKET,
                body.movement_code_id || null
            );
            // hareketKoduBul STOK_HAREKET için map yok — doğrudan id ile bul
            let hareketKodu = hk;
            if (!hareketKodu && body.movement_code_id) {
                const r = await client.query(`SELECT * FROM movement_codes WHERE id=$1`, [body.movement_code_id]);
                hareketKodu = r.rows[0] || null;
            }
            if (!hareketKodu && body.movement_code_id) {
                throw new Error('Hareket kodu bulunamadı.');
            }
            if (!hareketKodu) {
                // varsayılan: stok giriş
                const d = await client.query(
                    `SELECT * FROM movement_codes WHERE document_type='StokGiris' AND is_active ORDER BY id LIMIT 1`
                );
                hareketKodu = d.rows[0];
            }
            if (!hareketKodu) throw new Error('Hareket kodu seçin (STG/STC/TRF/SAY…).');

            const type = mapHareketTipi(hareketKodu);
            if (type === 'TRANSFER' && !body.target_warehouse_id) {
                throw new Error('Transfer için hedef depo zorunlu.');
            }
            if (type === 'TRANSFER' && Number(body.target_warehouse_id) === Number(body.warehouse_id)) {
                throw new Error('Kaynak ve hedef depo aynı olamaz.');
            }

            const yonCikis = -1;
            const yonGiris = 1;
            const satirHazir = [];
            for (let i = 0; i < satirlar.length; i += 1) {
                const s = satirlar[i] || {};
                const itemId = Number(s.item_id);
                const qty = Number(s.quantity);
                const empty = (!Number.isFinite(itemId) || !itemId)
                    && (s.quantity == null || s.quantity === '' || !Number.isFinite(qty) || qty === 0)
                    && !String(s.barkod || '').trim()
                    && !String(s.raf_code || '').trim()
                    && !String(s.konum_code || '').trim();
                if (empty) continue;
                if (!Number.isFinite(itemId) || !itemId) {
                    throw new Error(`Satır ${i + 1}: stok seçimi zorunlu.`);
                }
                if (!Number.isFinite(qty) || qty <= 0) {
                    throw new Error(`Satır ${i + 1}: miktar 0'dan büyük olmalı.`);
                }
                satirHazir.push({
                    item_id: itemId,
                    quantity: qty,
                    uom_code: s.uom_code || null,
                    raf_code: s.raf_code || body.raf_code || null,
                    konum_code: s.konum_code || body.konum_code || null,
                    lot_id: s.lot_id || null,
                    lot_no: s.lot_no || null,
                    serial_no: s.serial_no || null,
                    barkod_okumalar: Array.isArray(s.barkod_okumalar) ? s.barkod_okumalar : null,
                    barkod: s.barkod || null,
                });
            }
            if (!satirHazir.length) {
                throw new Error('En az bir satırda stok ve miktar girin.');
            }

            const hareketNoOpt = String(body.movement_no || '').trim() || null;

            if (type === 'TRANSFER') {
                const cikis = await stokHareketOlustur(client, {
                    hareketTipi: 'TRANSFER',
                    depoId: body.warehouse_id,
                    belgeTipi: 'TRANSFER',
                    description: body.description || `Transfer → depo ${body.target_warehouse_id}`,
                    hareketKoduId: hareketKodu.id,
                    hareketNo: hareketNoOpt,
                    satirlar: satirHazir.map((s) => ({ ...s, direction: yonCikis })),
                });
                await client.query(
                    `UPDATE stock_movements SET target_warehouse_id=$2 WHERE id=$1`,
                    [cikis.hareket.id, body.target_warehouse_id]
                );
                const giris = await stokHareketOlustur(client, {
                    hareketTipi: 'TRANSFER',
                    depoId: body.target_warehouse_id,
                    belgeTipi: 'TRANSFER',
                    belgeId: cikis.hareket.id,
                    description: body.description || `Transfer ← depo ${body.warehouse_id}`,
                    hareketKoduId: hareketKodu.id,
                    satirlar: satirHazir.map((s) => ({ ...s, direction: yonGiris })),
                });
                await client.query(
                    `UPDATE stock_movements SET bagli_movement_id=$2, target_warehouse_id=$3 WHERE id=$1`,
                    [cikis.hareket.id, giris.hareket.id, body.target_warehouse_id]
                );
                await client.query(
                    `UPDATE stock_movements SET bagli_movement_id=$2 WHERE id=$1`,
                    [giris.hareket.id, cikis.hareket.id]
                );
                await kaydetBarkodOkumalar(client, {
                    hareket: cikis.hareket,
                    satirlar: cikis.satirlar || [],
                    kaynakSatirlar: satirHazir,
                    depoId: body.warehouse_id,
                    movementType: type,
                    kullanici: body.user_code || req.user?.username || req.user?.user_code || null,
                    firmaId: cikis.hareket.company_id || null,
                });
                return cikis.hareket.id;
            }

            const direction = satirYon(type, hareketKodu);
            const hareket = await stokHareketOlustur(client, {
                hareketTipi: type,
                depoId: body.warehouse_id,
                belgeTipi: type,
                description: body.description || `${hareketKodu.movement_name}`,
                hareketKoduId: hareketKodu.id,
                hareketNo: hareketNoOpt,
                satirlar: satirHazir.map((s) => ({ ...s, direction })),
            });
            await kaydetBarkodOkumalar(client, {
                hareket: hareket.hareket,
                satirlar: hareket.satirlar || [],
                kaynakSatirlar: satirHazir,
                depoId: body.warehouse_id,
                movementType: type,
                kullanici: body.user_code || req.user?.username || req.user?.user_code || null,
                firmaId: hareket.hareket.company_id || null,
            });
            // Hareket kodu bayrakları: giriş/çıkış kalite emri
            if (hareketKodu.gkk_emri_olussun || hareketKodu.ckk_emri_olussun) {
                await hareketKodundanKkEmirleri(client, {
                    hareketKodu,
                    hareket: hareket.hareket,
                    satirlar: hareket.satirlar || [],
                    plantId: hareket.hareket.plant_id || body.plant_id || null,
                });
            }
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
            `SELECT id, document_type, document_id, bagli_movement_id, movement_type
             FROM stock_movements WHERE id=$1`,
            [req.params.id]
        );
        if (!h.rows[0]) return res.status(404).json({ hata: 'Stok hareketi bulunamadı.' });
        const row = h.rows[0];
        if (row.document_type && ['IRSALIYE', 'MAL_KABUL', 'URETIM_GIRIS'].includes(row.document_type) && row.document_id) {
            return res.status(400).json({ hata: 'Belgeye bağlı stok hareketi buradan silinemez.' });
        }
        await withTransaction(pool, async (client) => {
            if (row.bagli_movement_id) {
                await client.query(`DELETE FROM stock_movements WHERE id=$1`, [row.bagli_movement_id]);
            }
            await client.query(`DELETE FROM stock_movements WHERE id=$1`, [row.id]);
        });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
