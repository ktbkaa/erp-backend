const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');

async function firsatGetir(id) {
    const f = await pool.query(
        `
        SELECT f.*,
               asama.stage_code, asama.stage_name, asama.is_won, asama.is_lost,
               c.partner_code, c.partner_name,
               a.lead_code, a.lead_name,
               TRIM(CONCAT(COALESCE(o.first_name,''),' ',COALESCE(o.last_name,''))) AS olusturan_adi,
               TRIM(CONCAT(COALESCE(t.first_name,''),' ',COALESCE(t.last_name,''))) AS takip_eden_adi,
               iy.plant_code, iy.plant_name
        FROM crm_opportunities f
        JOIN crm_opportunity_stages asama ON asama.id = f.stage_id
        LEFT JOIN partners c ON c.id = f.partner_id
        LEFT JOIN crm_leads a ON a.id = f.lead_id
        LEFT JOIN users o ON o.id = f.created_by_user_id
        LEFT JOIN users t ON t.id = f.takip_by_id
        LEFT JOIN plants iy ON iy.id = f.plant_id
        WHERE f.id = $1
        `,
        [id]
    );
    if (!f.rows[0]) return null;

    const [satirlar, teklifler, faaliyetler, planlar, gorevler] = await Promise.all([
        pool.query(
            `
            SELECT s.*, st.item_code, st.item_name
            FROM crm_opportunity_lines s
            JOIN items st ON st.id = s.item_id
            WHERE s.firsat_id=$1 ORDER BY s.line_no, s.id
            `,
            [id]
        ),
        pool.query(
            `
            SELECT t.id, t.quotation_no, t.status, t.total_amount, t.quotation_date
            FROM sales_quotations t WHERE t.firsat_id=$1 ORDER BY t.id DESC
            `,
            [id]
        ),
        pool.query(
            `
            SELECT fy.id, fy.faaliyet_code, fy.konu, fy.status, fy.start_date,
                   type.type_name AS faaliyet_tipi_adi
            FROM crm_activities fy
            LEFT JOIN crm_activity_types type ON type.id = fy.faaliyet_type_id
            WHERE fy.firsat_id=$1 ORDER BY fy.start_date DESC LIMIT 50
            `,
            [id]
        ),
        pool.query(
            `
            SELECT p.id, p.plan_code, p.konu, p.status, p.start_date,
                   type.type_name AS faaliyet_tipi_adi
            FROM crm_activity_plans p
            LEFT JOIN crm_activity_types type ON type.id = p.faaliyet_type_id
            WHERE p.firsat_id=$1 ORDER BY p.start_date DESC LIMIT 50
            `,
            [id]
        ),
        pool.query(
            `SELECT id, gorev_code, baslik, status, priority, son_date
             FROM crm_tasks WHERE firsat_id=$1 ORDER BY id DESC LIMIT 50`,
            [id]
        ),
    ]);

    return {
        ...f.rows[0],
        satirlar: satirlar.rows,
        teklifler: teklifler.rows,
        faaliyetler: faaliyetler.rows,
        faaliyet_planlari: planlar.rows,
        gorevler: gorevler.rows,
    };
}

async function satirKaydet(client, firsatId, satirlar) {
    await client.query('DELETE FROM crm_opportunity_lines WHERE firsat_id=$1', [firsatId]);
    if (!Array.isArray(satirlar)) return 0;
    let toplam = 0;
    let sira = 0;
    for (const s of satirlar) {
        if (!s.item_id) continue;
        sira += 1;
        const quantity = Number(s.quantity || 1);
        const birimFiyat = Number(s.unit_price || 0);
        const amount = Number(s.amount != null ? s.amount : quantity * birimFiyat);
        toplam += amount;
        await client.query(
            `
            INSERT INTO crm_opportunity_lines
                (firsat_id, line_no, item_id, quantity, uom_code, unit_price, amount, description)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
                firsatId, s.line_no || sira, s.item_id, quantity, s.uom_code || null,
                birimFiyat, amount, s.description || null,
            ]
        );
    }
    return toplam;
}

router.get('/', async (req, res) => {
    try {
        const { status, partner_id, lead_id } = req.query;
        const params = [];
        const where = [];
        if (status) {
            params.push(status);
            where.push(`f.status = $${params.length}`);
        }
        if (partner_id) {
            params.push(Number(partner_id));
            where.push(`f.partner_id = $${params.length}`);
        }
        if (lead_id) {
            params.push(Number(lead_id));
            where.push(`f.lead_id = $${params.length}`);
        }
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`f.company_id = $${params.length}`);
        }
        const liste = await pool.query(
            `
            SELECT f.id FROM crm_opportunities f
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY f.id DESC
            `,
            params
        );
        const result = [];
        for (const r of liste.rows) result.push(await firsatGetir(r.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await firsatGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Fırsat bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        if (!b.firsat_name) return res.status(400).json({ hata: 'firsat_name zorunlu.' });
        const musteriTipi = b.customer_type || (b.lead_id && !b.partner_id ? 'Aday' : 'Musteri');
        if (musteriTipi === 'Musteri' && !b.partner_id) {
            return res.status(400).json({ hata: 'Müşteri tipi için partner_id zorunlu.' });
        }
        if (musteriTipi === 'Aday' && !b.lead_id) {
            return res.status(400).json({ hata: 'Aday tipi için lead_id zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            let asamaId = b.stage_id;
            if (!asamaId) {
                const def = await client.query(
                    `SELECT id FROM crm_opportunity_stages WHERE stage_code='YENI' AND is_active LIMIT 1`
                );
                asamaId = def.rows[0]?.id;
            }
            if (!asamaId) throw new Error('Fırsat aşaması tanımlı değil.');

            const kod = b.firsat_code || (await sonrakiKod(client, 'CRM_FIRSAT'));
            const ins = await client.query(
                `
                INSERT INTO crm_opportunities
                    (firsat_code, firsat_name, konu, customer_type, partner_id, lead_id, stage_id,
                     created_by_user_id, takip_by_id, beklenen_gelir, currency_code, degerlendirme,
                     target_kapatma_date, country, plant_id, description, status)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,0),COALESCE($11,'TRY'),$12,
                        $13,COALESCE($14,'TR'),$15,$16,'Acik')
                RETURNING id
                `,
                [
                    kod, b.firsat_name, b.konu || null, musteriTipi,
                    musteriTipi === 'Musteri' ? b.partner_id : null,
                    musteriTipi === 'Aday' ? b.lead_id : (b.lead_id || null),
                    asamaId, b.created_by_user_id || b.created_by_id || null, b.takip_by_id || null,
                    b.beklenen_gelir, b.currency_code, b.degerlendirme ?? null,
                    b.target_kapatma_date || null, b.country || null, b.plant_id || null,
                    b.description || null,
                ]
            );
            const firsatId = ins.rows[0].id;
            const toplam = await satirKaydet(client, firsatId, b.satirlar || b.kalemler);
            if (toplam > 0 && (b.beklenen_gelir == null || b.beklenen_gelir === '')) {
                await client.query(
                    `UPDATE crm_opportunities SET beklenen_gelir=$2 WHERE id=$1`,
                    [firsatId, toplam]
                );
            }
            return firsatId;
        });
        res.status(201).json(await firsatGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body;
        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                'SELECT id FROM crm_opportunities WHERE id=$1 FOR UPDATE',
                [req.params.id]
            );
            if (!mevcut.rows[0]) {
                const e = new Error('Fırsat bulunamadı.');
                e.status = 404;
                throw e;
            }
            await client.query(
                `
                UPDATE crm_opportunities SET
                    firsat_name = COALESCE($2, firsat_name),
                    konu = COALESCE($3, konu),
                    customer_type = COALESCE($4, customer_type),
                    partner_id = COALESCE($5, partner_id),
                    lead_id = COALESCE($6, lead_id),
                    stage_id = COALESCE($7, stage_id),
                    created_by_user_id = COALESCE($8, created_by_user_id),
                    takip_by_id = COALESCE($9, takip_by_id),
                    beklenen_gelir = COALESCE($10, beklenen_gelir),
                    currency_code = COALESCE($11, currency_code),
                    degerlendirme = COALESCE($12, degerlendirme),
                    target_kapatma_date = COALESCE($13::date, target_kapatma_date),
                    country = COALESCE($14, country),
                    plant_id = COALESCE($15, plant_id),
                    description = COALESCE($16, description)
                WHERE id=$1
                `,
                [
                    req.params.id, b.firsat_name || null, b.konu ?? null, b.customer_type || null,
                    b.partner_id || null, b.lead_id || null, b.stage_id || null,
                    b.created_by_user_id || b.created_by_id || null, b.takip_by_id || null, b.beklenen_gelir ?? null,
                    b.currency_code || null, b.degerlendirme ?? null, b.target_kapatma_date || null,
                    b.country ?? null, b.plant_id || null, b.description ?? null,
                ]
            );
            if (Array.isArray(b.satirlar) || Array.isArray(b.kalemler)) {
                const toplam = await satirKaydet(client, Number(req.params.id), b.satirlar || b.kalemler);
                if (b.beklenen_gelir == null) {
                    await client.query(
                        `UPDATE crm_opportunities SET beklenen_gelir=$2 WHERE id=$1`,
                        [req.params.id, toplam]
                    );
                }
            }
            return Number(req.params.id);
        });
        res.json(await firsatGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** Fırsat kapat — Kazanıldı / Kaybedildi */
router.post('/:id/kapat', async (req, res) => {
    try {
        const result = req.body.result || req.body.status; // Kazanildi | Kaybedildi
        if (!['Kazanildi', 'Kaybedildi'].includes(result)) {
            return res.status(400).json({ hata: "result 'Kazanildi' veya 'Kaybedildi' olmalı." });
        }
        const id = await withTransaction(pool, async (client) => {
            const asamaKod = result === 'Kazanildi' ? 'KAZANILDI' : 'KAYBEDILDI';
            const asama = await client.query(
                `SELECT id FROM crm_opportunity_stages WHERE stage_code=$1 AND is_active LIMIT 1`,
                [asamaKod]
            );
            if (!asama.rows[0]) throw new Error(`Aşama tanımlı değil: ${asamaKod}`);
            const upd = await client.query(
                `
                UPDATE crm_opportunities SET
                    status=$2,
                    stage_id=$3,
                    kapatma_date=CURRENT_DATE,
                    closed_nedeni=COALESCE($4, closed_nedeni)
                WHERE id=$1 AND status='Acik'
                RETURNING id
                `,
                [req.params.id, result, asama.rows[0].id, req.body.closed_nedeni || null]
            );
            if (!upd.rows[0]) throw new Error('Fırsat kapatılamadı (bulunamadı veya zaten kapalı).');
            return upd.rows[0].id;
        });
        res.json(await firsatGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Fırsat → Satış teklifi
 * Ürün satırlarını teklife taşır; cari yoksa aday bağlı teklif (cari zorunluluğu için dönüşüm gerekir)
 */
router.post('/:id/teklife-donustur', async (req, res) => {
    try {
        const firsat = await firsatGetir(req.params.id);
        if (!firsat) return res.status(404).json({ hata: 'Fırsat bulunamadı.' });
        if (firsat.status !== 'Acik') {
            return res.status(400).json({ hata: `Kapalı fırsattan teklif açılamaz: ${firsat.status}` });
        }

        let cariId = firsat.partner_id || req.body.partner_id || null;
        if (!cariId && firsat.lead_id) {
            return res.status(400).json({
                hata: 'Aday bağlı fırsatta önce adayı cariye dönüştürün veya partner_id gönderin.',
                lead_id: firsat.lead_id,
            });
        }
        if (!cariId) return res.status(400).json({ hata: 'partner_id zorunlu.' });
        if (!firsat.satirlar?.length && !(req.body.satirlar || req.body.kalemler)?.length) {
            return res.status(400).json({ hata: 'Fırsatta ürün satırı yok; teklif için satır gerekli.' });
        }

        const teklifId = await withTransaction(pool, async (client) => {
            const raw = (req.body.satirlar || req.body.kalemler || firsat.satirlar).map((s) => ({
                item_id: s.item_id,
                quantity: s.quantity,
                uom_code: s.uom_code,
                unit_price: s.unit_price,
                discount_rate: s.discount_rate || 0,
                vat_rate: s.vat_rate != null ? s.vat_rate : 20,
            }));
            const satirlar = raw.map((k, i) => {
                const h = satirHesapla(k);
                return { line_no: i + 1, item_id: k.item_id, quantity: k.quantity, uom_code: k.uom_code, unit_price: k.unit_price, ...h };
            });
            const top = belgelerToplam(satirlar);
            const no = await sonrakiBelgeNo(client, 'SATIS_TEKLIF');
            let hk = req.body.movement_code_id || null;
            if (!hk) {
                const d = await client.query(
                    `SELECT id FROM movement_codes WHERE document_type='SatisTeklif' AND is_active ORDER BY id LIMIT 1`
                );
                hk = d.rows[0]?.id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO sales_quotations
                    (quotation_no, partner_id, quotation_date, valid_date, currency_code,
                     status, movement_code_id, description, total_amount,
                     source_document_type, source_document_id, firsat_id, lead_id)
                VALUES ($1,$2,CURRENT_DATE,$3,COALESCE($4,'TRY'),'Taslak',$5,$6,$7,
                        'CRM_FIRSAT',$8,$8,$9)
                RETURNING id
                `,
                [
                    no, cariId, req.body.valid_date || null,
                    firsat.currency_code || 'TRY', hk,
                    req.body.description || `Fırsat ${firsat.firsat_code}`,
                    top.total_amount, firsat.id, firsat.lead_id || null,
                ]
            );
            const tid = baslik.rows[0].id;
            for (const s of satirlar) {
                await client.query(
                    `
                    INSERT INTO sales_quotation_lines
                        (quotation_id, line_no, item_id, quantity, uom_code, unit_price,
                         discount_rate, discount_amount, vat_rate, vat_amount, goods_service_amount)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    `,
                    [
                        tid, s.line_no, s.item_id, s.quantity, s.uom_code, s.unit_price,
                        s.discount_rate, s.discount_amount, s.vat_rate, s.vat_amount, s.goods_service_amount,
                    ]
                );
            }
            // Aşamayı Teklif'e çek (açıksa)
            const teklifAsama = await client.query(
                `SELECT id FROM crm_opportunity_stages WHERE stage_code='TEKLIF' AND is_active LIMIT 1`
            );
            if (teklifAsama.rows[0]) {
                await client.query(
                    `UPDATE crm_opportunities SET stage_id=$2 WHERE id=$1 AND status='Acik'`,
                    [firsat.id, teklifAsama.rows[0].id]
                );
            }
            return tid;
        });

        const teklif = await pool.query(
            `SELECT t.*, c.partner_code, c.partner_name FROM sales_quotations t
             JOIN partners c ON c.id=t.partner_id WHERE t.id=$1`,
            [teklifId]
        );
        res.status(201).json({
            ok: true,
            quotation_id: teklifId,
            quotation_no: teklif.rows[0].quotation_no,
            teklif: teklif.rows[0],
            firsat: await firsatGetir(firsat.id),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_opportunities WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Fırsat bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
