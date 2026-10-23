const { sonrakiBelgeNo } = require('../utils/belgeNo');
const { parametreAl } = require('../utils/yetki');
const { depoTransfer } = require('./stokHareketService');

async function depoBulKodVeyaRol(client, { kodParam, role }) {
    const kod = await parametreAl(client, kodParam, null);
    if (kod) {
        const r = await client.query(
            `SELECT * FROM warehouses WHERE warehouse_code=$1 AND is_active=TRUE LIMIT 1`,
            [kod]
        );
        if (r.rows[0]) return r.rows[0];
    }
    if (role) {
        const r = await client.query(
            `SELECT * FROM warehouses WHERE warehouse_rolu=$1 AND is_active=TRUE ORDER BY id LIMIT 1`,
            [role]
        );
        if (r.rows[0]) return r.rows[0];
    }
    return null;
}

async function stokPlanBul(client, stokId, direction) {
    const r = await client.query(
        `
        SELECT sp.*, p.plan_code, p.plan_name
        FROM qc_item_plans sp
        JOIN qc_control_plans p ON p.id = sp.plan_id
        WHERE sp.item_id=$1 AND sp.direction=$2 AND sp.is_active=TRUE
        LIMIT 1
        `,
        [stokId, direction]
    );
    if (r.rows[0]) return r.rows[0];
    // Varsayılan plan
    const defKod = direction === 'GKK' ? 'STD-GKK' : 'STD-CKK';
    const p = await client.query(`SELECT * FROM qc_control_plans WHERE plan_code=$1`, [defKod]);
    return p.rows[0] ? { plan_id: p.rows[0].id, ...p.rows[0] } : null;
}

/**
 * Stok girişinden sonra KK gerekliyse emir oluştur.
 * Çağıran, stoku zaten Kalitede + GKK/CKK deposuna almış olmalı.
 */
async function kkEmriOlustur(client, {
    direction,
    stokId,
    partiId = null,
    depoId,
    hedefDepoId = null,
    quantity,
    kaynakTipi,
    kaynakId,
    stokHareketId = null,
    description = null,
}) {
    const plan = await stokPlanBul(client, stokId, direction);
    const emirNo = await sonrakiBelgeNo(client, 'KK_EMIR');
    const r = await client.query(
        `
        INSERT INTO qc_orders
            (order_no, direction, item_id, lot_id, warehouse_id, target_warehouse_id, plan_id,
             quantity, status, source_type, source_id, stock_movement_id, description)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Acik',$9,$10,$11,$12)
        RETURNING *
        `,
        [
            emirNo, direction, stokId, partiId, depoId, hedefDepoId, plan?.plan_id || plan?.id || null,
            quantity, kaynakTipi, kaynakId, stokHareketId, description,
        ]
    );
    return r.rows[0];
}

async function emirGetir(pool, id) {
    const e = await pool.query(
        `
        SELECT e.*, s.item_code, s.item_name, d.warehouse_code, d.warehouse_name,
               hd.warehouse_code AS hedef_depo_kodu, p.lot_no, pl.plan_code, pl.plan_name
        FROM qc_orders e
        JOIN items s ON s.id = e.item_id
        JOIN warehouses d ON d.id = e.warehouse_id
        LEFT JOIN warehouses hd ON hd.id = e.target_warehouse_id
        LEFT JOIN item_lots p ON p.id = e.lot_id
        LEFT JOIN qc_control_plans pl ON pl.id = e.plan_id
        WHERE e.id=$1
        `,
        [id]
    );
    if (!e.rows[0]) return null;
    const [olcumler, gecmis, uygunsuz] = await Promise.all([
        pool.query(
            `
            SELECT o.*, k.kriter_code, k.kriter_name, k.olcum_type, k.min_value, k.max_value, k.zorunlu
            FROM qc_measurements o
            JOIN qc_criteria k ON k.id = o.kriter_id
            WHERE o.order_id=$1 ORDER BY k.line_no
            `,
            [id]
        ),
        pool.query(`SELECT * FROM qc_approval_history WHERE order_id=$1 ORDER BY id`, [id]),
        pool.query(
            `
            SELECT u.*, r.neden_code, r.neden_name
            FROM qc_nonconformances u
            LEFT JOIN qc_rejection_reasons r ON r.id = u.ret_neden_id
            WHERE u.order_id=$1 ORDER BY u.id
            `,
            [id]
        ),
    ]);
    let kriterler = [];
    if (e.rows[0].plan_id) {
        const kr = await pool.query(
            `SELECT * FROM qc_criteria WHERE plan_id=$1 ORDER BY line_no`,
            [e.rows[0].plan_id]
        );
        kriterler = kr.rows;
    }
    return {
        ...e.rows[0],
        olcumler: olcumler.rows,
        gecmis: gecmis.rows,
        uygunsuzluklar: uygunsuz.rows,
        kriterler,
    };
}

async function emirKaydet(client, emirId, { olcumler = [], uygunMiktar, uygunsuzMiktar, numuneMiktar, description, kullanici }) {
    const emir = await client.query(`SELECT * FROM qc_orders WHERE id=$1 FOR UPDATE`, [emirId]);
    if (!emir.rows[0]) throw Object.assign(new Error('KK emri bulunamadı.'), { status: 404 });
    if (['Onayli', 'Red', 'Iptal'].includes(emir.rows[0].status)) {
        throw Object.assign(new Error(`Emir is_locked: ${emir.rows[0].status}`), { status: 400 });
    }

    for (const o of olcumler) {
        if (!o.kriter_id) continue;
        await client.query(
            `
            INSERT INTO qc_measurements (order_id, kriter_id, olcum_value, accepted, description)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (order_id, kriter_id) DO UPDATE SET
                olcum_value = EXCLUDED.olcum_value,
                accepted = EXCLUDED.accepted,
                description = EXCLUDED.description
            `,
            [emirId, o.kriter_id, o.olcum_value ?? null, o.accepted ?? null, o.description ?? null]
        );
    }

    const u = uygunMiktar != null ? Number(uygunMiktar) : Number(emir.rows[0].quantity);
    const x = uygunsuzMiktar != null ? Number(uygunsuzMiktar) : 0;
    await client.query(
        `
        UPDATE qc_orders SET
            accepted_quantity=$2,
            rejected_quantity=$3,
            numune_quantity=COALESCE($4, numune_quantity),
            description=COALESCE($5, description),
            status='Kaydedildi'
        WHERE id=$1
        `,
        [emirId, u, x, numuneMiktar ?? null, description ?? null]
    );

    await client.query(
        `
        INSERT INTO qc_approval_history (order_id, action, user_id, user_code, accepted_quantity, rejected_quantity, description)
        VALUES ($1,'Kaydet',$2,$3,$4,$5,$6)
        `,
        [emirId, kullanici?.id || null, kullanici?.user_code || null, u, x, description || null]
    );
}

/**
 * Onay: accepted miktarı hedef depoya Kullanilabilir transfer; uygunsuz Bloke kalır / bloke depoya.
 * Mükerrer onay engeli: status Onayli/Red/Kismi ve transfer_movement_id doluysa reddet.
 */
async function emirOnayla(client, emirId, {
    onay = true,
    uygunMiktar = null,
    uygunsuzMiktar = null,
    hedefDepoId = null,
    blokeDepoId = null,
    retNedenId = null,
    description = null,
    kullanici = null,
}) {
    const emirRes = await client.query(`SELECT * FROM qc_orders WHERE id=$1 FOR UPDATE`, [emirId]);
    const emir = emirRes.rows[0];
    if (!emir) throw Object.assign(new Error('KK emri bulunamadı.'), { status: 404 });
    if (emir.transfer_movement_id) {
        throw Object.assign(new Error('Bu emir zaten transfer edilmiş (mükerrer onay engellendi).'), { status: 409 });
    }
    if (['Onayli', 'Red', 'Iptal'].includes(emir.status) && emir.status !== 'Kaydedildi') {
        // Kaydedildi veya Acik/Kismi'den onaylanabilir; Onayli/Red tekrar olmaz
        if (['Onayli', 'Red'].includes(emir.status)) {
            throw Object.assign(new Error(`Emir zaten ${emir.status}.`), { status: 409 });
        }
    }

    const toplam = Number(emir.quantity);
    let accepted = uygunMiktar != null ? Number(uygunMiktar) : Number(emir.accepted_quantity) || (onay ? toplam : 0);
    let uygunsuz = uygunsuzMiktar != null ? Number(uygunsuzMiktar) : Number(emir.rejected_quantity) || (onay ? 0 : toplam);
    if (accepted < 0 || uygunsuz < 0) throw new Error('Miktarlar negatif olamaz.');
    if (accepted + uygunsuz - toplam > 1e-6) {
        throw new Error(`Uygun+uygunsuz (${accepted + uygunsuz}) emir miktarını (${toplam}) aşamaz.`);
    }

    let hedef = hedefDepoId || emir.target_warehouse_id;
    if (!hedef && onay && accepted > 0) {
        const role = emir.direction === 'GKK' ? 'Hammadde' : 'Mamul';
        const kodP = emir.direction === 'GKK' ? 'HAMMADDE_DEPO_KODU' : 'MAMUL_DEPO_KODU';
        const d = await depoBulKodVeyaRol(client, { kodParam: kodP, role });
        if (!d) throw new Error(`Hedef depo bulunamadı (${kodP} / ${role}).`);
        hedef = d.id;
    }

    let transferId = null;
    if (accepted > 0 && onay !== false) {
        const tr = await depoTransfer(client, {
            kaynakDepoId: emir.warehouse_id,
            hedefDepoId: hedef,
            stokId: emir.item_id,
            quantity: accepted,
            partiId: emir.lot_id,
            stokStatu: 'Kalitede',
            belgeTipi: 'KK_EMIR',
            belgeId: emirId,
            description: `KK onay transfer ${emir.order_no}`,
            statuCikisIzin: true,
            depoZorunluAtla: true,
        });
        // Hedefte Kullanilabilir yapmak: Kalitede giriş oldu — statü düzelt
        // depoTransfer aynı statüyü korur; hedefe Kullanilabilir için ikinci adım:
        await client.query(
            `
            UPDATE stock_movement_lines SET stock_status='Kullanilabilir'
            WHERE movement_id=$1 AND direction=1
            `,
            [tr.giris.hareket.id]
        );
        transferId = tr.giris.hareket.id;
    }

    if (uygunsuz > 0) {
        const { stokStatuTransfer } = require('./stokHareketService');
        await stokStatuTransfer(client, {
            depoId: emir.warehouse_id,
            stokId: emir.item_id,
            quantity: uygunsuz,
            partiId: emir.lot_id,
            kaynakStatu: 'Kalitede',
            hedefStatu: 'Bloke',
            belgeTipi: 'KK_EMIR',
            belgeId: emirId,
            description: `KK uygunsuz ${emir.order_no}`,
        });

        if (retNedenId || description) {
            await client.query(
                `
                INSERT INTO qc_nonconformances (order_id, ret_neden_id, quantity, description)
                VALUES ($1,$2,$3,$4)
                `,
                [emirId, retNedenId || null, uygunsuz, description || null]
            );
        }
    }

    let status = 'Onayli';
    let action = 'Onay';
    if (!onay || (accepted <= 0 && uygunsuz > 0)) {
        status = 'Red';
        action = 'Red';
    } else if (accepted > 0 && uygunsuz > 0) {
        status = 'Kismi';
        action = 'Kismi';
    }

    await client.query(
        `
        UPDATE qc_orders SET
            accepted_quantity=$2,
            rejected_quantity=$3,
            target_warehouse_id=COALESCE($4, target_warehouse_id),
            status=$5,
            transfer_movement_id=COALESCE($6, transfer_movement_id),
            approved_by_id=$7,
            onay_date=CURRENT_TIMESTAMP,
            description=COALESCE($8, description)
        WHERE id=$1
        `,
        [emirId, accepted, uygunsuz, hedef, status, transferId, kullanici?.id || null, description || null]
    );

    await client.query(
        `
        INSERT INTO qc_approval_history (order_id, action, user_id, user_code, accepted_quantity, rejected_quantity, description)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [emirId, action, kullanici?.id || null, kullanici?.user_code || null, accepted, uygunsuz, description || null]
    );

    return emirId;
}

/**
 * Mal kabul / üretim girişi için KK akışı yardımcıları.
 */
async function gkkDepoCozumle(client) {
    return depoBulKodVeyaRol(client, { kodParam: 'GKK_DEPO_KODU', role: 'GKK' });
}
async function ckkDepoCozumle(client) {
    return depoBulKodVeyaRol(client, { kodParam: 'CKK_DEPO_KODU', role: 'CKK' });
}

module.exports = {
    kkEmriOlustur,
    emirGetir,
    emirKaydet,
    emirOnayla,
    gkkDepoCozumle,
    ckkDepoCozumle,
    depoBulKodVeyaRol,
    stokPlanBul,
};
