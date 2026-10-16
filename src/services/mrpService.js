const { depoBakiyeListesi } = require('./stokHareketService');

/**
 * Basit MRP: net ihtiyaç = emniyet_stok + açık üretim talebi bileşenleri
 *              - kullanılabilir stok - açık satınalma sipariş kalanı
 * Emniyet stok alanı karttan okunur ve hesaba dahil edilir.
 */
async function mrpHesapla(pool, { isYeriId = null, stokId = null } = {}) {
    const bakiyeler = await depoBakiyeListesi(pool, { stokStatu: 'Kullanilabilir', stokId });
    const kullanilabilir = new Map();
    for (const b of bakiyeler) {
        const k = String(b.stok_id);
        kullanilabilir.set(k, (kullanilabilir.get(k) || 0) + Number(b.bakiye));
    }

    const params = [];
    let stokWhere = 'WHERE s.aktif IS DISTINCT FROM FALSE';
    if (stokId) {
        params.push(stokId);
        stokWhere += ` AND s.id = $${params.length}`;
    }

    const stoklar = await pool.query(
        `
        SELECT s.id, s.stok_kodu, s.stok_adi, s.stok_tipi, s.tedarik_tipi,
               COALESCE(s.emniyet_stok, 0)::numeric AS emniyet_stok,
               s.maksimum_stok, s.birim
        FROM stoklar s
        ${stokWhere}
        ORDER BY s.stok_kodu
        `,
        params
    );

    // Açık satınalma kalan
    const sas = await pool.query(
        `
        SELECT ss.stok_id,
               SUM(GREATEST(ss.miktar - COALESCE(ss.giren_miktar,0), 0))::numeric AS acik_siparis
        FROM satin_alma_siparis_satirlari ss
        JOIN satin_alma_siparisleri s ON s.id = ss.siparis_id
        WHERE s.durum NOT IN ('Iptal', 'Kapali')
        GROUP BY ss.stok_id
        `
    );
    const acikSiparis = new Map(sas.rows.map((r) => [String(r.stok_id), Number(r.acik_siparis)]));

    // Açık üretim emri bileşen ihtiyacı
    let bilesenSql = `
        SELECT ub.bilesen_stok_id AS stok_id,
               SUM(ub.miktar * (ue.planlanan_miktar - COALESCE(ue.uretilen_miktar,0)))::numeric AS ihtiyac
        FROM uretim_emri_bilesenleri ub
        JOIN uretim_emirleri ue ON ue.id = ub.uretim_emri_id
        WHERE ue.durum NOT IN ('Kapali', 'Iptal', 'Tamamlandi')
    `;
    const bParams = [];
    if (isYeriId) {
        bParams.push(isYeriId);
        bilesenSql += ` AND ue.is_yeri_id = $${bParams.length}`;
    }
    bilesenSql += ` GROUP BY ub.bilesen_stok_id`;
    let bilesenIhtiyac = new Map();
    try {
        const br = await pool.query(bilesenSql, bParams);
        bilesenIhtiyac = new Map(br.rows.map((r) => [String(r.stok_id), Number(r.ihtiyac)]));
    } catch (_) {
        // tablo yoksa boş
    }

    // Açık üretim mamul planı (arz)
    const ueArz = await pool.query(
        `
        SELECT stok_id,
               SUM(GREATEST(planlanan_miktar - COALESCE(uretilen_miktar,0), 0))::numeric AS plan_uretim
        FROM uretim_emirleri
        WHERE durum NOT IN ('Kapali', 'Iptal', 'Tamamlandi')
        GROUP BY stok_id
        `
    ).catch(() => ({ rows: [] }));
    const planUretim = new Map(ueArz.rows.map((r) => [String(r.stok_id), Number(r.plan_uretim)]));

    return stoklar.rows.map((s) => {
        const id = String(s.id);
        const eldekı = kullanilabilir.get(id) || 0;
        const emniyet = Number(s.emniyet_stok) || 0;
        const ihtiyac = bilesenIhtiyac.get(id) || 0;
        const siparis = acikSiparis.get(id) || 0;
        const uretim = planUretim.get(id) || 0;
        const brut = ihtiyac + emniyet;
        const net = Math.max(0, brut - eldekı - siparis - uretim);
        return {
            stok_id: s.id,
            stok_kodu: s.stok_kodu,
            stok_adi: s.stok_adi,
            stok_tipi: s.stok_tipi,
            tedarik_tipi: s.tedarik_tipi,
            birim: s.birim,
            emniyet_stok: emniyet,
            kullanilabilir_stok: eldekı,
            acik_uretim_ihtiyaci: ihtiyac,
            acik_satinalma: siparis,
            planlanan_uretim: uretim,
            brut_ihtiyac: brut,
            net_ihtiyac: net,
            oneri: net > 0
                ? (String(s.tedarik_tipi || '').toLowerCase().includes('uret') ? 'Üretim emri' : 'Satınalma')
                : 'Yeterli',
        };
    }).filter((r) => stokId || r.emniyet_stok > 0 || r.acik_uretim_ihtiyaci > 0 || r.net_ihtiyac > 0 || r.kullanilabilir_stok !== 0);
}

module.exports = { mrpHesapla };
