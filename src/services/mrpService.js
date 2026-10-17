const { depoBakiyeListesi } = require('./stokHareketService');

/**
 * MRP motoru (klasik + Canias/Odoo sadeleştirilmiş):
 * 1) Bağımsız ihtiyaç (manuel BI + açık satış siparişi kalanı)
 * 2) BOM patlatma → bağımlı ihtiyaç
 * 3) Brüt → net (eldeki + açık SA + açık UE − emniyet − ROP)
 * 4) Öneri: Satınalma / Üretim emri / Yeterli
 */

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

/** pg Date / string → YYYY-MM-DD */
function toDateStr(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return null;
}

function addDays(dateStr, days) {
    const base = toDateStr(dateStr) || toDateStr(new Date());
    const d = new Date(`${base}T12:00:00`);
    d.setDate(d.getDate() + Number(days || 0));
    return toDateStr(d);
}

async function loadStokMap(pool, { stokId = null } = {}) {
    const params = [];
    let where = 'WHERE s.aktif IS DISTINCT FROM FALSE';
    if (stokId) {
        params.push(stokId);
        where += ` AND s.id = $${params.length}`;
    }
    const r = await pool.query(
        `SELECT s.id, s.stok_kodu, s.stok_adi, s.stok_tipi, s.tedarik_tipi, s.birim,
                COALESCE(s.emniyet_stok, 0)::numeric AS emniyet_stok,
                COALESCE(s.yeniden_siparis_seviyesi, 0)::numeric AS yeniden_siparis_seviyesi,
                s.sabit_siparis_miktari,
                COALESCE(s.temin_suresi_gun, 0)::int AS temin_suresi_gun
         FROM stoklar s ${where}
         ORDER BY s.stok_kodu`,
        params
    );
    const map = new Map();
    r.rows.forEach((row) => map.set(String(row.id), row));
    return map;
}

async function loadBomChildren(pool) {
    const r = await pool.query(
        `SELECT ua.mamul_stok_id, ua.miktar AS baz_miktar,
                us.bilesen_stok_id, us.miktar AS bilesen_miktar, us.birim
         FROM urun_agaclari ua
         JOIN urun_agaci_satirlari us ON us.urun_agaci_id = ua.id
         WHERE ua.aktif IS DISTINCT FROM FALSE
           AND (us.ust_satir_id IS NULL)
         ORDER BY ua.mamul_stok_id, us.sira_no`
    );
    const byParent = new Map();
    for (const row of r.rows) {
        const k = String(row.mamul_stok_id);
        if (!byParent.has(k)) byParent.set(k, []);
        byParent.get(k).push(row);
    }
    return byParent;
}

async function loadSupplyMaps(pool, { isYeriId = null, stokId = null } = {}) {
    const bakiyeler = await depoBakiyeListesi(pool, { stokStatu: 'Kullanilabilir', stokId });
    const kullanilabilir = new Map();
    for (const b of bakiyeler) {
        const k = String(b.stok_id);
        kullanilabilir.set(k, (kullanilabilir.get(k) || 0) + num(b.bakiye));
    }

    const sas = await pool.query(
        `SELECT ss.stok_id,
                SUM(GREATEST(ss.miktar - COALESCE(ss.giren_miktar,0), 0))::numeric AS acik_siparis
         FROM satin_alma_siparis_satirlari ss
         JOIN satin_alma_siparisleri s ON s.id = ss.siparis_id
         WHERE s.durum NOT IN ('Iptal', 'Kapali')
         GROUP BY ss.stok_id`
    );
    const acikSiparis = new Map(sas.rows.map((r) => [String(r.stok_id), num(r.acik_siparis)]));

    let ueSql = `
        SELECT stok_id,
               SUM(GREATEST(planlanan_miktar - COALESCE(uretilen_miktar,0), 0))::numeric AS plan_uretim
        FROM uretim_emirleri
        WHERE durum NOT IN ('Kapali', 'Iptal', 'Tamamlandi')`;
    const ueParams = [];
    if (isYeriId) {
        ueParams.push(isYeriId);
        ueSql += ` AND is_yeri_id = $${ueParams.length}`;
    }
    ueSql += ' GROUP BY stok_id';
    const ueArz = await pool.query(ueSql, ueParams).catch(() => ({ rows: [] }));
    const planUretim = new Map(ueArz.rows.map((r) => [String(r.stok_id), num(r.plan_uretim)]));

    return { kullanilabilir, acikSiparis, planUretim };
}

/**
 * Bağımsız ihtiyaç: manuel BI + açık satış siparişi kalan miktar
 */
async function loadIndependentDemand(pool, { isYeriId = null, firmaId = null } = {}) {
    const demand = new Map(); // stokId -> { qty, date, sources: [] }

    const bump = (stokId, qty, date, source) => {
        const k = String(stokId);
        if (!demand.has(k)) demand.set(k, { qty: 0, date: date || null, sources: [] });
        const d = demand.get(k);
        d.qty += num(qty);
        if (date && (!d.date || date < d.date)) d.date = date;
        d.sources.push(source);
    };

    // Manuel / tahmin BI
    const biParams = [];
    let biSql = `
        SELECT stok_id, miktar, ihtiyac_tarihi, kaynak, ihtiyac_no
        FROM mrp_bagimsiz_ihtiyaclar
        WHERE aktif IS DISTINCT FROM FALSE`;
    if (isYeriId) {
        biParams.push(isYeriId);
        biSql += ` AND (is_yeri_id IS NULL OR is_yeri_id = $${biParams.length})`;
    }
    if (firmaId) {
        biParams.push(firmaId);
        biSql += ` AND (firma_id IS NULL OR firma_id = $${biParams.length})`;
    }
    try {
        const bi = await pool.query(biSql, biParams);
        bi.rows.forEach((r) => {
            bump(r.stok_id, r.miktar, toDateStr(r.ihtiyac_tarihi), `BI:${r.ihtiyac_no}`);
        });
    } catch (_) {
        // tablo yoksa (migrate öncesi) atla
    }

    // Açık satış siparişi kalanı
    const soParams = [];
    let soSql = `
        SELECT sd.stok_id,
               SUM(GREATEST(
                 COALESCE(sd.bekleyen_miktar, sd.miktar - COALESCE(sd.sevk_edilen_miktar,0) - COALESCE(sd.teslim_edilen_miktar,0)),
                 0
               ))::numeric AS kalan,
               MIN(COALESCE(sd.teslim_tarihi, s.teslim_tarihi, s.siparis_tarihi)) AS ihtiyac_tarihi
        FROM siparis_detaylari sd
        JOIN siparisler s ON s.id = sd.siparis_id
        WHERE s.durum NOT IN ('Iptal', 'Kapali')
          AND sd.stok_id IS NOT NULL`;
    if (isYeriId) {
        soParams.push(isYeriId);
        soSql += ` AND (s.is_yeri_id IS NULL OR s.is_yeri_id = $${soParams.length})`;
    }
    if (firmaId) {
        soParams.push(firmaId);
        soSql += ` AND (s.firma_id IS NULL OR s.firma_id = $${soParams.length})`;
    }
    soSql += ' GROUP BY sd.stok_id';
    const so = await pool.query(soSql, soParams).catch(() => ({ rows: [] }));
    so.rows.forEach((r) => {
        if (num(r.kalan) > 0) {
            bump(r.stok_id, r.kalan, toDateStr(r.ihtiyac_tarihi), 'SatışSipariş');
        }
    });

    return demand;
}

function lotSize(net, stok) {
    const sabit = num(stok.sabit_siparis_miktari);
    if (sabit > 0) return Math.ceil(net / sabit) * sabit;
    return net;
}

function isUretim(stok) {
    const t = String(stok?.tedarik_tipi || '').toLowerCase();
    return t.includes('uret');
}

/**
 * BOM patlatmalı MRP hesaplaması (bellekte).
 * @returns {Promise<object[]>} sonuç satırları
 */
async function mrpHesapla(pool, {
    isYeriId = null,
    firmaId = null,
    stokId = null,
} = {}) {
    const stokMap = await loadStokMap(pool, { stokId: null });
    const bomByParent = await loadBomChildren(pool);
    const { kullanilabilir, acikSiparis, planUretim } = await loadSupplyMaps(pool, { isYeriId, stokId });
    const independent = await loadIndependentDemand(pool, { isYeriId, firmaId });

    // brüt = bağımsız + bağımlı
    const bagimsiz = new Map();
    const bagimli = new Map();
    const parentOf = new Map(); // child -> one parent (gösterim)
    const needDate = new Map();

    independent.forEach((d, k) => {
        bagimsiz.set(k, (bagimsiz.get(k) || 0) + d.qty);
        if (d.date) needDate.set(k, d.date);
    });

    // Açık üretim emri bileşenleri → bağımlı ihtiyaç (çift patlatma yok)
    try {
        let bSql = `
            SELECT ub.stok_id,
                   SUM(GREATEST(ub.planlanan_miktar - COALESCE(ub.tuketilen_miktar,0), 0))::numeric AS ihtiyac
            FROM uretim_emri_bilesenleri ub
            JOIN uretim_emirleri ue ON ue.id = ub.emir_id
            WHERE ue.durum NOT IN ('Kapali', 'Iptal', 'Tamamlandi')`;
        const bParams = [];
        if (isYeriId) {
            bParams.push(isYeriId);
            bSql += ` AND ue.is_yeri_id = $${bParams.length}`;
        }
        bSql += ' GROUP BY ub.stok_id';
        const br = await pool.query(bSql, bParams);
        br.rows.forEach((r) => {
            const cid = String(r.stok_id);
            bagimli.set(cid, (bagimli.get(cid) || 0) + num(r.ihtiyac));
        });
    } catch (_) { /* ignore */ }

    // Patlatma: üretim tipi bağımsız ihtiyaçlar → bileşen bağımlı ihtiyaç
    const queue = [];
    independent.forEach((d, k) => {
        const st = stokMap.get(k);
        if (st && isUretim(st) && d.qty > 0) queue.push({ stokId: k, qty: d.qty, date: d.date, depth: 0 });
    });

    const visitedExplosion = new Set();
    while (queue.length) {
        const job = queue.shift();
        const key = `${job.stokId}:${job.qty}:${job.depth}`;
        if (visitedExplosion.has(key) || job.depth > 12) continue;
        visitedExplosion.add(key);

        const children = bomByParent.get(String(job.stokId)) || [];
        const parent = stokMap.get(String(job.stokId));
        for (const ch of children) {
            const baz = num(ch.baz_miktar) || 1;
            const need = (num(ch.bilesen_miktar) / baz) * num(job.qty);
            if (need <= 0) continue;
            const cid = String(ch.bilesen_stok_id);
            bagimli.set(cid, (bagimli.get(cid) || 0) + need);
            if (!parentOf.has(cid)) parentOf.set(cid, Number(job.stokId));
            const lead = num(parent?.temin_suresi_gun);
            const childDate = job.date ? addDays(job.date, -lead) : null;
            if (childDate && (!needDate.has(cid) || childDate < needDate.get(cid))) {
                needDate.set(cid, childDate);
            }
            const childSt = stokMap.get(cid);
            if (childSt && isUretim(childSt)) {
                // Alt mamul için de patlat (brüt bağımlı üzerinden)
                queue.push({ stokId: cid, qty: need, date: childDate, depth: job.depth + 1 });
            }
        }
    }

    // Tüm ilgili stoklar
    const ids = new Set([
        ...bagimsiz.keys(),
        ...bagimli.keys(),
        ...[...stokMap.keys()].filter((id) => {
            const s = stokMap.get(id);
            return num(s.emniyet_stok) > 0 || num(s.yeniden_siparis_seviyesi) > 0
                || (kullanilabilir.get(id) || 0) !== 0;
        }),
    ]);
    if (stokId) {
        ids.clear();
        ids.add(String(stokId));
    }

    const results = [];
    for (const id of ids) {
        const s = stokMap.get(id);
        if (!s) continue;
        const bi = bagimsiz.get(id) || 0;
        const bd = bagimli.get(id) || 0;
        const emniyet = num(s.emniyet_stok);
        const rop = num(s.yeniden_siparis_seviyesi);
        const eldeki = kullanilabilir.get(id) || 0;
        const siparis = acikSiparis.get(id) || 0;
        const uretim = planUretim.get(id) || 0;
        const brut = bi + bd;
        // ROP: eldeki + arz < ROP ise farkı nete ekle
        const ropGap = rop > 0 ? Math.max(0, rop - (eldeki + siparis + uretim)) : 0;
        const netRaw = Math.max(0, brut + emniyet + ropGap - eldeki - siparis - uretim);
        const onerilen = lotSize(netRaw, s);
        let oneri = 'Yeterli';
        if (onerilen > 0) oneri = isUretim(s) ? 'Üretim emri' : 'Satınalma';

        const ihtiyacTarihi = needDate.get(id) || null;
        const planlananBaslangic = ihtiyacTarihi
            ? addDays(ihtiyacTarihi, -num(s.temin_suresi_gun))
            : addDays(null, -num(s.temin_suresi_gun));

        results.push({
            id: s.id,
            stok_id: s.id,
            stok_kodu: s.stok_kodu,
            stok_adi: s.stok_adi,
            stok_tipi: s.stok_tipi,
            tedarik_tipi: s.tedarik_tipi,
            birim: s.birim,
            seviye: parentOf.has(id) ? 1 : 0,
            kaynak_stok_id: parentOf.get(id) || null,
            bagimsiz_ihtiyac: bi,
            bagimli_ihtiyac: bd,
            brut_ihtiyac: brut,
            emniyet_stok: emniyet,
            yeniden_siparis: rop,
            kullanilabilir_stok: eldeki,
            acik_satinalma: siparis,
            planlanan_uretim: uretim,
            acik_uretim_ihtiyaci: bd, // geriye uyum (eski kolon)
            net_ihtiyac: netRaw,
            onerilen_miktar: onerilen,
            oneri,
            ihtiyac_tarihi: ihtiyacTarihi,
            planlanan_baslangic: planlananBaslangic,
            temin_suresi_gun: num(s.temin_suresi_gun),
        });
    }

    results.sort((a, b) => {
        if (b.net_ihtiyac !== a.net_ihtiyac) return b.net_ihtiyac - a.net_ihtiyac;
        return String(a.stok_kodu).localeCompare(String(b.stok_kodu), 'tr');
    });

    return results.filter((r) =>
        stokId
        || r.net_ihtiyac > 0
        || r.brut_ihtiyac > 0
        || r.emniyet_stok > 0
        || r.yeniden_siparis > 0
        || r.kullanilabilir_stok !== 0
        || r.acik_satinalma > 0
        || r.planlanan_uretim > 0);
}

/**
 * MRP çalıştır ve sonuçları kaydet.
 */
async function mrpCalistir(client, {
    firmaId = null,
    isYeriId = null,
    aciklama = null,
    olusturan = null,
    parametre = {},
} = {}) {
    const { sonrakiKod } = require('../utils/kodUretici');
    const no = await sonrakiKod(client, 'MRP_CALISMA');
    const ins = await client.query(
        `INSERT INTO mrp_calismalari
            (calisma_no, firma_id, is_yeri_id, durum, parametre_json, aciklama, olusturan)
         VALUES ($1,$2,$3,'Calisiyor',$4::jsonb,$5,$6)
         RETURNING *`,
        [no, firmaId, isYeriId, JSON.stringify(parametre || {}), aciklama, olusturan]
    );
    const calisma = ins.rows[0];

    const liste = await mrpHesapla(client, { firmaId, isYeriId });
    let netPozitif = 0;
    for (const r of liste) {
        if (r.net_ihtiyac > 0) netPozitif += 1;
        await client.query(
            `INSERT INTO mrp_sonuclar (
                calisma_id, stok_id, seviye, kaynak_stok_id,
                brut_ihtiyac, bagimsiz_ihtiyac, bagimli_ihtiyac,
                emniyet_stok, yeniden_siparis, kullanilabilir_stok,
                acik_satinalma, planlanan_uretim, net_ihtiyac, onerilen_miktar,
                oneri, ihtiyac_tarihi, planlanan_baslangic, birim
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
             )`,
            [
                calisma.id, r.stok_id, r.seviye, r.kaynak_stok_id,
                r.brut_ihtiyac, r.bagimsiz_ihtiyac, r.bagimli_ihtiyac,
                r.emniyet_stok, r.yeniden_siparis, r.kullanilabilir_stok,
                r.acik_satinalma, r.planlanan_uretim, r.net_ihtiyac, r.onerilen_miktar,
                r.oneri, r.ihtiyac_tarihi, r.planlanan_baslangic, r.birim,
            ]
        );
    }

    const upd = await client.query(
        `UPDATE mrp_calismalari SET
            durum = 'Tamamlandi',
            bitis_ts = CURRENT_TIMESTAMP,
            satir_sayisi = $2,
            net_pozitif = $3
         WHERE id = $1 RETURNING *`,
        [calisma.id, liste.length, netPozitif]
    );
    return { calisma: upd.rows[0], sonuclar: liste };
}

module.exports = {
    mrpHesapla,
    mrpCalistir,
    loadIndependentDemand,
};
