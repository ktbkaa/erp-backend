const { sonrakiBelgeNo } = require('../utils/belgeNo');
const { stokNegatifIzinliMi, onerilenDepolar } = require('../utils/belgeOmurga');
const { parametreAl } = require('../utils/yetki');
const { partiCozumle } = require('./partiService');

const STATULER = ['Kullanilabilir', 'Kalitede', 'Bloke'];

/**
 * Merkezi stok hareket oluşturucu.
 * miktar pozitif; yon +1 giriş / -1 çıkış.
 * stok_statu: Kullanilabilir | Kalitede | Bloke (çıkışta yalnızca Kullanilabilir)
 * parti_id / parti_no / otomatikParti desteklenir.
 */
async function stokHareketOlustur(client, {
    hareketTipi,
    isYeriId = null,
    depoId,
    hedefDepoId = null,
    belgeTipi = null,
    belgeId = null,
    aciklama = null,
    hareketKoduId = null,
    satirlar,
    bagliHareketId = null,
    depoZorunluAtla = false,
    firmaId = null,
    cariId = null,
    kullaniciKodu = null,
    referansNo = null,
}) {
    if (!depoId) throw new Error('Stok hareketi için depo_id zorunludur.');
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
        throw new Error('Stok hareketi için en az bir satır gerekli.');
    }

    let hareketKodu = null;
    if (hareketKoduId) {
        const hk = await client.query(`SELECT * FROM hareket_kodlari WHERE id=$1`, [hareketKoduId]);
        hareketKodu = hk.rows[0] || null;
        if (!hareketKodu) throw new Error(`Hareket kodu bulunamadı: id=${hareketKoduId}`);
    }

    const paramNegatif = await stokNegatifIzinliMi(client);
    const eksiIzin = Boolean(hareketKodu?.eksi_bakiye_izin) || paramNegatif;
    const depoZorunlu = !depoZorunluAtla
        && String(await parametreAl(client, 'STOK_DEPO_ZORUNLU', 'Evet')).toLowerCase() === 'evet';

    const hareketNo = await sonrakiBelgeNo(client, 'STOK_HAREKET');

    const cols = ['hareket_no', 'hareket_tipi', 'is_yeri_id', 'depo_id', 'belge_tipi', 'belge_id', 'aciklama', 'hareket_kodu_id'];
    const vals = [hareketNo, hareketTipi, isYeriId, depoId, belgeTipi, belgeId, aciklama, hareketKoduId || null];
    // hedef_depo_id / bagli_hareket_id 015'te
    // firma_id: açık parametre veya stok satırından türet
    let resolvedFirmaId = firmaId || null;
    if (!resolvedFirmaId && satirlar[0]?.stok_id) {
        const fr = await client.query(`SELECT firma_id FROM stoklar WHERE id=$1`, [satirlar[0].stok_id]);
        resolvedFirmaId = fr.rows[0]?.firma_id || null;
    }

    const hareketRes = await client.query(
        `
        INSERT INTO stok_hareketleri
            (hareket_no, hareket_tipi, is_yeri_id, depo_id, belge_tipi, belge_id, aciklama, hareket_kodu_id,
             hedef_depo_id, bagli_hareket_id, firma_id, cari_id, kullanici_kodu, referans_no)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *;
        `,
        [
            ...vals, hedefDepoId || null, bagliHareketId || null,
            resolvedFirmaId, cariId || null, kullaniciKodu || null, referansNo || null,
        ]
    );
    const hareket = hareketRes.rows[0];

    const eklenen = [];
    for (const s of satirlar) {
        if (!s.stok_id || !s.miktar || !s.yon) {
            throw new Error('Hareket satırında stok_id, miktar ve yon zorunludur.');
        }
        if (Number(s.miktar) <= 0) throw new Error('Hareket miktarı 0 dan büyük olmalı.');
        if (![1, -1].includes(Number(s.yon))) throw new Error('yon sadece 1 veya -1 olabilir.');

        const statu = s.stok_statu || (Number(s.yon) === 1 ? 'Kullanilabilir' : 'Kullanilabilir');
        if (!STATULER.includes(statu)) {
            throw new Error(`Geçersiz stok_statu: ${statu}`);
        }

        if (depoZorunlu) {
            await assertStokDepoIzin(client, s.stok_id, depoId);
            if (hedefDepoId) await assertStokDepoIzin(client, s.stok_id, hedefDepoId);
        }

        let partiId = s.parti_id || null;
        if (Number(s.yon) === 1) {
            const coz = await partiCozumle(client, {
                stokId: s.stok_id,
                partiId: s.parti_id,
                partiNo: s.parti_no,
                otomatik: s.otomatik_parti !== false,
                kaynakTipi: belgeTipi,
                kaynakId: belgeId,
            });
            partiId = coz.partiId;
        } else if (partiId) {
            const p = await client.query(
                `SELECT id FROM stok_partileri WHERE id=$1 AND stok_id=$2`,
                [partiId, s.stok_id]
            );
            if (!p.rows[0]) throw new Error(`Çıkış partisi stok ile uyuşmuyor: ${partiId}`);
        }

        // Çıkış: yalnızca Kullanilabilir (veya açıkça verilen statü bakiyesi)
        const cikisStatu = s.stok_statu || 'Kullanilabilir';
        if (Number(s.yon) === -1) {
            if (cikisStatu !== 'Kullanilabilir' && !s.statu_cikis_izin) {
                const err = new Error(
                    `Kalitede/Bloke stok çıkışa kapalı. stok_id=${s.stok_id}, statu=${cikisStatu}`
                );
                err.code = 'STATU_CIKIS_ENGEL';
                throw err;
            }
            if (!eksiIzin) {
                const bakiye = await depoStokBakiye(client, depoId, s.stok_id, {
                    stokStatu: cikisStatu,
                    partiId,
                });
                if (bakiye + 1e-9 < Number(s.miktar)) {
                    const oneriler = await onerilenDepolar(client, s.stok_id, Number(s.miktar), depoId);
                    const err = new Error(
                        `Yetersiz kullanılabilir stok. Depo=${depoId}, stok_id=${s.stok_id}, statu=${cikisStatu}, bakiye=${bakiye}, istenen=${s.miktar}.`
                    );
                    err.code = 'YETERSIZ_STOK';
                    err.detay = { depo_id: depoId, stok_id: s.stok_id, bakiye, istenen: Number(s.miktar), stok_statu: cikisStatu, onerilen_depolar: oneriler };
                    throw err;
                }
            }
        }

        const satirRes = await client.query(
            `
            INSERT INTO stok_hareket_satirlari
                (hareket_id, stok_id, miktar, yon, birim, parti_id, stok_statu, raf_kodu, konum_kodu)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *;
            `,
            [
                hareket.id, s.stok_id, s.miktar, s.yon, s.birim || null, partiId,
                Number(s.yon) === -1 ? cikisStatu : statu,
                s.raf_kodu || null, s.konum_kodu || null,
            ]
        );
        eklenen.push(satirRes.rows[0]);

        // Ortalama maliyet (INV-011) — girişte birim_maliyet verilirse
        if (Number(s.yon) === 1 && s.birim_maliyet != null) {
            try {
                const { maliyetGuncelleGiris } = require('./maliyetService');
                await maliyetGuncelleGiris(client, {
                    stokId: s.stok_id,
                    miktar: s.miktar,
                    birimMaliyet: s.birim_maliyet,
                    hareketId: hareket.id,
                });
            } catch (_) { /* maliyet tablosu yoksa sessiz */ }
        }
    }

    return { hareket, satirlar: eklenen };
}

async function assertStokDepoIzin(client, stokId, depoId) {
    const r = await client.query(
        `SELECT 1 FROM stok_depo WHERE stok_id=$1 AND depo_id=$2 AND aktif=TRUE`,
        [stokId, depoId]
    );
    if (!r.rows[0]) {
        // Tanım hiç yoksa: malzeme için hiç stok_depo yoksa da engelle
        const err = new Error(
            `Malzeme-depo tanımı yok veya pasif. stok_id=${stokId}, depo_id=${depoId}`
        );
        err.code = 'STOK_DEPO_YOK';
        err.status = 400;
        throw err;
    }
}

async function depoStokBakiye(clientOrPool, depoId, stokId, { stokStatu = null, partiId = null } = {}) {
    const params = [depoId, stokId];
    let extra = '';
    if (stokStatu) {
        params.push(stokStatu);
        extra += ` AND COALESCE(s.stok_statu,'Kullanilabilir') = $${params.length}`;
    }
    if (partiId) {
        params.push(partiId);
        extra += ` AND s.parti_id = $${params.length}`;
    }
    const res = await clientOrPool.query(
        `
        SELECT COALESCE(SUM(s.miktar * s.yon), 0)::numeric AS bakiye
        FROM stok_hareket_satirlari s
        JOIN stok_hareketleri h ON h.id = s.hareket_id
        WHERE h.depo_id = $1 AND s.stok_id = $2
        ${extra}
        `,
        params
    );
    return Number(res.rows[0].bakiye);
}

async function depoBakiyeListesi(pool, depoIdOrOpts = null) {
    const opts = (depoIdOrOpts && typeof depoIdOrOpts === 'object')
        ? depoIdOrOpts
        : { depoId: depoIdOrOpts };
    const {
        depoId = null, stokStatu = null, stokId = null, firmaId = null,
        depoKodu = null, stokKodu = null, stokAdi = null, stokTipi = null,
        partiNo = null, yalnizcaStokta = true,
    } = opts;
    const params = [];
    const where = [];
    if (depoId) {
        params.push(depoId);
        where.push(`h.depo_id = $${params.length}`);
    }
    if (depoKodu) {
        params.push(`%${depoKodu}%`);
        where.push(`d.depo_kodu ILIKE $${params.length}`);
    }
    if (stokId) {
        params.push(stokId);
        where.push(`s.stok_id = $${params.length}`);
    }
    if (stokKodu) {
        params.push(`%${stokKodu}%`);
        where.push(`st.stok_kodu ILIKE $${params.length}`);
    }
    if (stokAdi) {
        params.push(`%${stokAdi}%`);
        where.push(`st.stok_adi ILIKE $${params.length}`);
    }
    if (stokTipi) {
        params.push(stokTipi);
        where.push(`st.stok_tipi = $${params.length}`);
    }
    if (stokStatu) {
        params.push(stokStatu);
        where.push(`COALESCE(s.stok_statu,'Kullanilabilir') = $${params.length}`);
    }
    if (partiNo) {
        params.push(`%${partiNo}%`);
        where.push(`p.parti_no ILIKE $${params.length}`);
    }
    if (firmaId) {
        params.push(firmaId);
        where.push(`(st.firma_id = $${params.length} OR h.firma_id = $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const havingSql = yalnizcaStokta
        ? 'HAVING COALESCE(SUM(s.miktar * s.yon), 0) <> 0'
        : '';

    const res = await pool.query(
        `
        SELECT
            h.depo_id,
            d.depo_kodu,
            d.depo_adi,
            d.depo_rolu,
            s.stok_id,
            st.stok_kodu,
            st.stok_adi,
            st.stok_tipi,
            st.emniyet_stok,
            COALESCE(s.stok_statu, 'Kullanilabilir') AS stok_statu,
            s.parti_id,
            p.parti_no,
            COALESCE(SUM(s.miktar * s.yon), 0)::numeric AS bakiye
        FROM stok_hareket_satirlari s
        JOIN stok_hareketleri h ON h.id = s.hareket_id
        JOIN depolar d ON d.id = h.depo_id
        JOIN stoklar st ON st.id = s.stok_id
        LEFT JOIN stok_partileri p ON p.id = s.parti_id
        ${whereSql}
        GROUP BY h.depo_id, d.depo_kodu, d.depo_adi, d.depo_rolu,
                 s.stok_id, st.stok_kodu, st.stok_adi, st.stok_tipi, st.emniyet_stok,
                 COALESCE(s.stok_statu, 'Kullanilabilir'), s.parti_id, p.parti_no
        ${havingSql}
        ORDER BY d.depo_kodu, st.stok_kodu, stok_statu, p.parti_no NULLS FIRST
        `,
        params
    );
    // Liste seçimi için benzersiz satır anahtarı (id yoksa tüm satırlar selected olurdu)
    return res.rows.map((r) => ({
        ...r,
        id: [
            r.depo_id,
            r.stok_id,
            r.stok_statu || 'Kullanilabilir',
            r.parti_id || 0,
        ].join(':'),
    }));
}

/**
 * Statü transferi: aynı depoda Kalitede→Kullanilabilir veya Bloke vb.
 * Çıkış (eski statü -1) + giriş (yeni statü +1) aynı harekette.
 */
async function stokStatuTransfer(client, {
    depoId,
    isYeriId = null,
    stokId,
    miktar,
    birim = null,
    partiId = null,
    kaynakStatu,
    hedefStatu,
    belgeTipi = null,
    belgeId = null,
    aciklama = null,
}) {
    if (!STATULER.includes(kaynakStatu) || !STATULER.includes(hedefStatu)) {
        throw new Error('Geçersiz statü transferi.');
    }
    return stokHareketOlustur(client, {
        hareketTipi: 'DUZELTME',
        isYeriId,
        depoId,
        belgeTipi,
        belgeId,
        aciklama: aciklama || `Statü ${kaynakStatu} → ${hedefStatu}`,
        depoZorunluAtla: true,
        satirlar: [
            {
                stok_id: stokId,
                miktar,
                yon: -1,
                birim,
                parti_id: partiId,
                stok_statu: kaynakStatu,
                statu_cikis_izin: true,
            },
            {
                stok_id: stokId,
                miktar,
                yon: 1,
                birim,
                parti_id: partiId,
                stok_statu: hedefStatu,
                otomatik_parti: false,
            },
        ],
    });
}

/**
 * Depo transferi: kaynak depodan -1, hedef depoya +1 (aynı statü).
 */
async function depoTransfer(client, {
    kaynakDepoId,
    hedefDepoId,
    isYeriId = null,
    stokId,
    miktar,
    birim = null,
    partiId = null,
    stokStatu = 'Kullanilabilir',
    belgeTipi = null,
    belgeId = null,
    aciklama = null,
    statuCikisIzin = false,
    depoZorunluAtla = false,
}) {
    // Çıkış
    const cikis = await stokHareketOlustur(client, {
        hareketTipi: 'TRANSFER',
        isYeriId,
        depoId: kaynakDepoId,
        hedefDepoId,
        belgeTipi,
        belgeId,
        aciklama: aciklama || `Transfer → depo ${hedefDepoId}`,
        depoZorunluAtla,
        satirlar: [{
            stok_id: stokId,
            miktar,
            yon: -1,
            birim,
            parti_id: partiId,
            stok_statu: stokStatu,
            statu_cikis_izin: statuCikisIzin,
        }],
    });
    const giris = await stokHareketOlustur(client, {
        hareketTipi: 'TRANSFER',
        isYeriId,
        depoId: hedefDepoId,
        belgeTipi,
        belgeId,
        aciklama: aciklama || `Transfer ← depo ${kaynakDepoId}`,
        bagliHareketId: cikis.hareket.id,
        depoZorunluAtla,
        satirlar: [{
            stok_id: stokId,
            miktar,
            yon: 1,
            birim,
            parti_id: partiId,
            stok_statu: stokStatu,
            otomatik_parti: false,
        }],
    });
    return { cikis, giris };
}

module.exports = {
    stokHareketOlustur,
    depoStokBakiye,
    depoBakiyeListesi,
    stokStatuTransfer,
    depoTransfer,
    assertStokDepoIzin,
    STATULER,
};
