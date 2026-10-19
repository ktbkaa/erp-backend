const { sonrakiBelgeNo } = require('../utils/belgeNo');
const { parametreAl } = require('../utils/yetki');
const { depoTransfer } = require('./stokHareketService');

async function depoBulKodVeyaRol(client, { kodParam, rol }) {
    const kod = await parametreAl(client, kodParam, null);
    if (kod) {
        const r = await client.query(
            `SELECT * FROM depolar WHERE depo_kodu=$1 AND aktif=TRUE LIMIT 1`,
            [kod]
        );
        if (r.rows[0]) return r.rows[0];
    }
    if (rol) {
        const r = await client.query(
            `SELECT * FROM depolar WHERE depo_rolu=$1 AND aktif=TRUE ORDER BY id LIMIT 1`,
            [rol]
        );
        if (r.rows[0]) return r.rows[0];
    }
    return null;
}

async function stokPlanBul(client, stokId, yon) {
    const r = await client.query(
        `
        SELECT sp.*, p.plan_kodu, p.plan_adi
        FROM kk_stok_planlari sp
        JOIN kk_kontrol_planlari p ON p.id = sp.plan_id
        WHERE sp.stok_id=$1 AND sp.yon=$2 AND sp.aktif=TRUE
        LIMIT 1
        `,
        [stokId, yon]
    );
    if (r.rows[0]) return r.rows[0];
    // Varsayılan plan
    const defKod = yon === 'GKK' ? 'STD-GKK' : 'STD-CKK';
    const p = await client.query(`SELECT * FROM kk_kontrol_planlari WHERE plan_kodu=$1`, [defKod]);
    return p.rows[0] ? { plan_id: p.rows[0].id, ...p.rows[0] } : null;
}

/**
 * Stok girişinden sonra KK gerekliyse emir oluştur.
 * Çağıran, stoku zaten Kalitede + GKK/CKK deposuna almış olmalı.
 */
async function kkEmriOlustur(client, {
    yon,
    stokId,
    partiId = null,
    depoId,
    hedefDepoId = null,
    miktar,
    kaynakTipi,
    kaynakId,
    stokHareketId = null,
    aciklama = null,
}) {
    const plan = await stokPlanBul(client, stokId, yon);
    const emirNo = await sonrakiBelgeNo(client, 'KK_EMIR');
    const r = await client.query(
        `
        INSERT INTO kk_emirleri
            (emir_no, yon, stok_id, parti_id, depo_id, hedef_depo_id, plan_id,
             miktar, durum, kaynak_tipi, kaynak_id, stok_hareket_id, aciklama)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Acik',$9,$10,$11,$12)
        RETURNING *
        `,
        [
            emirNo, yon, stokId, partiId, depoId, hedefDepoId, plan?.plan_id || plan?.id || null,
            miktar, kaynakTipi, kaynakId, stokHareketId, aciklama,
        ]
    );
    return r.rows[0];
}

async function emirGetir(pool, id) {
    const e = await pool.query(
        `
        SELECT e.*, s.stok_kodu, s.stok_adi, d.depo_kodu, d.depo_adi,
               hd.depo_kodu AS hedef_depo_kodu, p.parti_no, pl.plan_kodu, pl.plan_adi
        FROM kk_emirleri e
        JOIN stoklar s ON s.id = e.stok_id
        JOIN depolar d ON d.id = e.depo_id
        LEFT JOIN depolar hd ON hd.id = e.hedef_depo_id
        LEFT JOIN stok_partileri p ON p.id = e.parti_id
        LEFT JOIN kk_kontrol_planlari pl ON pl.id = e.plan_id
        WHERE e.id=$1
        `,
        [id]
    );
    if (!e.rows[0]) return null;
    const [olcumler, gecmis, uygunsuz] = await Promise.all([
        pool.query(
            `
            SELECT o.*, k.kriter_kodu, k.kriter_adi, k.olcum_tipi, k.min_deger, k.max_deger, k.zorunlu
            FROM kk_olcumler o
            JOIN kk_kriterleri k ON k.id = o.kriter_id
            WHERE o.emir_id=$1 ORDER BY k.sira_no
            `,
            [id]
        ),
        pool.query(`SELECT * FROM kk_onay_gecmisi WHERE emir_id=$1 ORDER BY id`, [id]),
        pool.query(
            `
            SELECT u.*, r.neden_kodu, r.neden_adi
            FROM kk_uygunsuzluklar u
            LEFT JOIN kk_ret_nedenleri r ON r.id = u.ret_neden_id
            WHERE u.emir_id=$1 ORDER BY u.id
            `,
            [id]
        ),
    ]);
    let kriterler = [];
    if (e.rows[0].plan_id) {
        const kr = await pool.query(
            `SELECT * FROM kk_kriterleri WHERE plan_id=$1 ORDER BY sira_no`,
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

async function emirKaydet(client, emirId, { olcumler = [], uygunMiktar, uygunsuzMiktar, numuneMiktar, aciklama, kullanici }) {
    const emir = await client.query(`SELECT * FROM kk_emirleri WHERE id=$1 FOR UPDATE`, [emirId]);
    if (!emir.rows[0]) throw Object.assign(new Error('KK emri bulunamadı.'), { status: 404 });
    if (['Onayli', 'Red', 'Iptal'].includes(emir.rows[0].durum)) {
        throw Object.assign(new Error(`Emir kilitli: ${emir.rows[0].durum}`), { status: 400 });
    }

    for (const o of olcumler) {
        if (!o.kriter_id) continue;
        await client.query(
            `
            INSERT INTO kk_olcumler (emir_id, kriter_id, olcum_deger, uygun, aciklama)
            VALUES ($1,$2,$3,$4,$5)
            ON CONFLICT (emir_id, kriter_id) DO UPDATE SET
                olcum_deger = EXCLUDED.olcum_deger,
                uygun = EXCLUDED.uygun,
                aciklama = EXCLUDED.aciklama
            `,
            [emirId, o.kriter_id, o.olcum_deger ?? null, o.uygun ?? null, o.aciklama ?? null]
        );
    }

    const u = uygunMiktar != null ? Number(uygunMiktar) : Number(emir.rows[0].miktar);
    const x = uygunsuzMiktar != null ? Number(uygunsuzMiktar) : 0;
    await client.query(
        `
        UPDATE kk_emirleri SET
            uygun_miktar=$2,
            uygunsuz_miktar=$3,
            numune_miktar=COALESCE($4, numune_miktar),
            aciklama=COALESCE($5, aciklama),
            durum='Kaydedildi'
        WHERE id=$1
        `,
        [emirId, u, x, numuneMiktar ?? null, aciklama ?? null]
    );

    await client.query(
        `
        INSERT INTO kk_onay_gecmisi (emir_id, islem, kullanici_id, kullanici_kodu, uygun_miktar, uygunsuz_miktar, aciklama)
        VALUES ($1,'Kaydet',$2,$3,$4,$5,$6)
        `,
        [emirId, kullanici?.id || null, kullanici?.kullanici_kodu || null, u, x, aciklama || null]
    );
}

/**
 * Onay: uygun miktarı hedef depoya Kullanilabilir transfer; uygunsuz Bloke kalır / bloke depoya.
 * Mükerrer onay engeli: durum Onayli/Red/Kismi ve transfer_hareket_id doluysa reddet.
 */
async function emirOnayla(client, emirId, {
    onay = true,
    uygunMiktar = null,
    uygunsuzMiktar = null,
    hedefDepoId = null,
    blokeDepoId = null,
    retNedenId = null,
    aciklama = null,
    kullanici = null,
}) {
    const emirRes = await client.query(`SELECT * FROM kk_emirleri WHERE id=$1 FOR UPDATE`, [emirId]);
    const emir = emirRes.rows[0];
    if (!emir) throw Object.assign(new Error('KK emri bulunamadı.'), { status: 404 });
    if (emir.transfer_hareket_id) {
        throw Object.assign(new Error('Bu emir zaten transfer edilmiş (mükerrer onay engellendi).'), { status: 409 });
    }
    if (['Onayli', 'Red', 'Iptal'].includes(emir.durum) && emir.durum !== 'Kaydedildi') {
        // Kaydedildi veya Acik/Kismi'den onaylanabilir; Onayli/Red tekrar olmaz
        if (['Onayli', 'Red'].includes(emir.durum)) {
            throw Object.assign(new Error(`Emir zaten ${emir.durum}.`), { status: 409 });
        }
    }

    const toplam = Number(emir.miktar);
    let uygun = uygunMiktar != null ? Number(uygunMiktar) : Number(emir.uygun_miktar) || (onay ? toplam : 0);
    let uygunsuz = uygunsuzMiktar != null ? Number(uygunsuzMiktar) : Number(emir.uygunsuz_miktar) || (onay ? 0 : toplam);
    if (uygun < 0 || uygunsuz < 0) throw new Error('Miktarlar negatif olamaz.');
    if (uygun + uygunsuz - toplam > 1e-6) {
        throw new Error(`Uygun+uygunsuz (${uygun + uygunsuz}) emir miktarını (${toplam}) aşamaz.`);
    }

    let hedef = hedefDepoId || emir.hedef_depo_id;
    if (!hedef && onay && uygun > 0) {
        const rol = emir.yon === 'GKK' ? 'Hammadde' : 'Mamul';
        const kodP = emir.yon === 'GKK' ? 'HAMMADDE_DEPO_KODU' : 'MAMUL_DEPO_KODU';
        const d = await depoBulKodVeyaRol(client, { kodParam: kodP, rol });
        if (!d) throw new Error(`Hedef depo bulunamadı (${kodP} / ${rol}).`);
        hedef = d.id;
    }

    let transferId = null;
    if (uygun > 0 && onay !== false) {
        const tr = await depoTransfer(client, {
            kaynakDepoId: emir.depo_id,
            hedefDepoId: hedef,
            stokId: emir.stok_id,
            miktar: uygun,
            partiId: emir.parti_id,
            stokStatu: 'Kalitede',
            belgeTipi: 'KK_EMIR',
            belgeId: emirId,
            aciklama: `KK onay transfer ${emir.emir_no}`,
            statuCikisIzin: true,
            depoZorunluAtla: true,
        });
        // Hedefte Kullanilabilir yapmak: Kalitede giriş oldu — statü düzelt
        // depoTransfer aynı statüyü korur; hedefe Kullanilabilir için ikinci adım:
        await client.query(
            `
            UPDATE stok_hareket_satirlari SET stok_statu='Kullanilabilir'
            WHERE hareket_id=$1 AND yon=1
            `,
            [tr.giris.hareket.id]
        );
        transferId = tr.giris.hareket.id;
    }

    if (uygunsuz > 0) {
        const { stokStatuTransfer } = require('./stokHareketService');
        await stokStatuTransfer(client, {
            depoId: emir.depo_id,
            stokId: emir.stok_id,
            miktar: uygunsuz,
            partiId: emir.parti_id,
            kaynakStatu: 'Kalitede',
            hedefStatu: 'Bloke',
            belgeTipi: 'KK_EMIR',
            belgeId: emirId,
            aciklama: `KK uygunsuz ${emir.emir_no}`,
        });

        if (retNedenId || aciklama) {
            await client.query(
                `
                INSERT INTO kk_uygunsuzluklar (emir_id, ret_neden_id, miktar, aciklama)
                VALUES ($1,$2,$3,$4)
                `,
                [emirId, retNedenId || null, uygunsuz, aciklama || null]
            );
        }
    }

    let durum = 'Onayli';
    let islem = 'Onay';
    if (!onay || (uygun <= 0 && uygunsuz > 0)) {
        durum = 'Red';
        islem = 'Red';
    } else if (uygun > 0 && uygunsuz > 0) {
        durum = 'Kismi';
        islem = 'Kismi';
    }

    await client.query(
        `
        UPDATE kk_emirleri SET
            uygun_miktar=$2,
            uygunsuz_miktar=$3,
            hedef_depo_id=COALESCE($4, hedef_depo_id),
            durum=$5,
            transfer_hareket_id=COALESCE($6, transfer_hareket_id),
            onaylayan_id=$7,
            onay_tarihi=CURRENT_TIMESTAMP,
            aciklama=COALESCE($8, aciklama)
        WHERE id=$1
        `,
        [emirId, uygun, uygunsuz, hedef, durum, transferId, kullanici?.id || null, aciklama || null]
    );

    await client.query(
        `
        INSERT INTO kk_onay_gecmisi (emir_id, islem, kullanici_id, kullanici_kodu, uygun_miktar, uygunsuz_miktar, aciklama)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [emirId, islem, kullanici?.id || null, kullanici?.kullanici_kodu || null, uygun, uygunsuz, aciklama || null]
    );

    return emirId;
}

/**
 * Mal kabul / üretim girişi için KK akışı yardımcıları.
 */
async function gkkDepoCozumle(client) {
    return depoBulKodVeyaRol(client, { kodParam: 'GKK_DEPO_KODU', rol: 'GKK' });
}
async function ckkDepoCozumle(client) {
    return depoBulKodVeyaRol(client, { kodParam: 'CKK_DEPO_KODU', rol: 'CKK' });
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
