/**
 * Belge kilidi (P0 #8) — onaylı / muhasebeleşmiş / sevk edilmiş / kapanmış
 * belgelerin PUT / DELETE kuralları, izinli durum geçişleri ve iptal yan etkileri.
 *
 * Kurallar tek yerde (KURALLAR) tanımlıdır; route'lar yalnız şu üç girişi kullanır:
 *   belgeGuncellemeKontrol  — PUT öncesi (kilitliyse yalnız izinli alan / durum geçişi uygular)
 *   belgeSil                — DELETE (yalnız taslak / işlenmemiş belge)
 *   belgeIptal              — POST /:id/iptal (ters kayıt, rezervasyon çözme, ters stok hareketi …)
 * DB tarafında 150_belge_kilit_tetikleyicileri.sql aynı kuralların çekirdeğini zorlar.
 */
const pool = require('../../db');
const { auditYaz } = require('./auditService');

const KILIT_SQLSTATE = 'BK001';
const EBELGE_GONDERILMIS = ['Kuyrukta', 'Gonderildi'];
const SATIR_ANAHTARLARI = ['satirlar', 'kalemler'];
const GENEL_YOKSAY = new Set(['id', 'created_at', 'updated_at', 'created_by', 'approved_at', 'approved_by']);

class BelgeKilitHatasi extends Error {
    constructor(mesaj, {
        kod = 'BELGE_KILITLI', tablo = null, id = null, durum = null, alternatif = null,
        islem = null, alanlar = null, status = 409,
    } = {}) {
        super(mesaj);
        this.name = 'BelgeKilitHatasi';
        this.status = status;
        this.kod = kod;
        this.tablo = tablo;
        this.belgeId = id;
        this.durum = durum;
        this.alternatif = alternatif;
        this.islem = islem;
        this.alanlar = alanlar;
    }
}

function durumOf(row) {
    const s = row?.status;
    return s == null || s === '' ? 'Taslak' : String(s);
}

async function varMi(client, sql, params) {
    const r = await client.query(sql, params);
    return r.rows.length > 0;
}

/* ------------------------------------------------------------------ */
/* Değer normalizasyonu (UI gövdesi ↔ DB satırı karşılaştırması)       */
/* ------------------------------------------------------------------ */

const kolonTipCache = new Map();

async function kolonTipleri(client, tablo) {
    if (kolonTipCache.has(tablo)) return kolonTipCache.get(tablo);
    const r = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = $1`,
        [tablo]
    );
    const m = new Map(r.rows.map((x) => [x.column_name, x.data_type]));
    kolonTipCache.set(tablo, m);
    return m;
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function localYmd(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** gg/aa/yyyy [ss:dd] → Date (yerel) */
function trTarihParse(s) {
    const m = String(s).trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]),
        Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    return Number.isNaN(d.getTime()) ? null : d;
}

function tarihNorm(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : localYmd(v);
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const tr = trTarihParse(s);
    if (tr) return localYmd(tr);
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s : localYmd(d);
}

function zamanDamgasiNorm(v) {
    if (v == null || v === '') return null;
    let d = v instanceof Date ? v : null;
    if (!d) {
        const s = String(v).trim();
        d = trTarihParse(s) || new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s);
    }
    if (Number.isNaN(d.getTime())) return String(v);
    return Math.floor(d.getTime() / 60000);
}

function normalize(tip, v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    const t = String(tip || '');
    if (/^(numeric|integer|bigint|smallint|double precision|real|decimal)$/.test(t)) {
        const n = Number(v);
        return Number.isFinite(n) ? n : String(v);
    }
    if (t === 'boolean') {
        if (typeof v === 'boolean') return v;
        return ['true', '1', 'evet', 'on', 't'].includes(String(v).trim().toLowerCase());
    }
    if (t === 'date') return tarihNorm(v);
    if (t.startsWith('timestamp')) return zamanDamgasiNorm(v);
    if (t.startsWith('time')) return String(v).slice(0, 5);
    if (t === 'json' || t === 'jsonb') {
        try {
            return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v);
        } catch (_) {
            return String(v);
        }
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v).trim();
}

function esit(a, b) {
    if (a === null || b === null) return a === b;
    if (typeof a === 'number' && typeof b === 'number') {
        return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    }
    return a === b;
}

/** Yazılacak değer: tip dönüşümü (tarih gg/aa/yyyy → ISO vb.) */
function yazimDegeri(tip, v) {
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return null;
    const t = String(tip || '');
    if (t === 'date') return tarihNorm(v);
    if (t.startsWith('timestamp')) {
        if (v instanceof Date) return v;
        const tr = trTarihParse(v);
        return tr || v;
    }
    if (t === 'boolean') return normalize(t, v);
    return v;
}

async function alanDegisiklikleri(client, kural, row, body) {
    const tipler = await kolonTipleri(client, kural.tablo);
    const yoksay = new Set([...(kural.yoksayilanAlanlar || []), ...SATIR_ANAHTARLARI]);
    const out = {};
    for (const [k, v] of Object.entries(body || {})) {
        if (v === undefined || GENEL_YOKSAY.has(k) || yoksay.has(k)) continue;
        if (!tipler.has(k) || !(k in row)) continue;
        const tip = tipler.get(k);
        const a = normalize(tip, row[k]);
        const b = normalize(tip, v);
        if (kural.nullDegisiklikDegil?.includes(k) && b === null) continue;
        if (!esit(a, b)) out[k] = { eski: row[k], yeni: v };
    }
    return out;
}

function satirEslesir(m, g, alanlar) {
    return alanlar.every((alan) => {
        const anahtarlar = Array.isArray(alan) ? alan : [alan];
        const deger = anahtarlar.map((a) => g[a]).find((x) => x != null && x !== '');
        if (deger === undefined) return true;
        const anahtar = anahtarlar.find((a) => g[a] != null && g[a] !== '');
        const mv = m[anahtar] !== undefined ? m[anahtar] : m[anahtarlar[0]];
        const gn = Number(deger);
        const mn = Number(mv);
        if (Number.isFinite(gn) && Number.isFinite(mn)) return Math.abs(gn - mn) <= 1e-6;
        return String(deger).trim() === String(mv ?? '').trim();
    });
}

/** Sıra bağımsız: her gelen satır, kullanılmamış bir mevcut satırla eşleşmeli. */
function satirListesiDegisti(mevcut, gelen, alanlar) {
    const dolu = (gelen || []).filter((s) => s && (s.item_id || s.item_code || s.account_id));
    if (dolu.length !== mevcut.length) return true;
    const kullanildi = new Set();
    for (const g of dolu) {
        const i = mevcut.findIndex((m, idx) => !kullanildi.has(idx) && satirEslesir(m, g, alanlar));
        if (i < 0) return true;
        kullanildi.add(i);
    }
    return false;
}

async function satirlarDegisti(client, kural, id, body) {
    const tanimlar = kural.satirlar || [];
    for (const t of tanimlar) {
        // Route'lar anahtar önceliğinde farklılaşıyor (kalemler || satirlar ya da tersi); gönderilen her liste denetlenir.
        const gelenler = t.anahtarlar.map((k) => body?.[k]).filter((x) => Array.isArray(x));
        if (!gelenler.length) continue;
        const r = await client.query(
            `SELECT * FROM ${t.tablo} WHERE ${t.fk} = $1 ORDER BY ${t.sira || 'id'}`,
            [id]
        );
        for (const gelen of gelenler) {
            const degisti = t.karsilastir
                ? await t.karsilastir(r.rows, gelen)
                : satirListesiDegisti(r.rows, gelen, t.alanlar);
            if (degisti) return t.etiket || 'satirlar';
        }
    }
    return null;
}

/* ------------------------------------------------------------------ */
/* Kurallar                                                            */
/* ------------------------------------------------------------------ */

function gecisHatasi(kural, row, hedef, ek = '') {
    return new BelgeKilitHatasi(
        `${kural.etiket} ${row[kural.noAlan] || row.id}: «${durumOf(row)}» → «${hedef}» geçişine izin verilmez.${ek ? ` ${ek}` : ''}`,
        {
            kod: 'BELGE_DURUM_GECISI', tablo: kural.tablo, id: row.id, durum: durumOf(row),
            alternatif: kural.alternatif(row),
        }
    );
}

function belgeAdi(kural, row) {
    return `${kural.etiket} ${row[kural.noAlan] || `#${row.id}`}`;
}

async function faturaIptalEngeli(client, row) {
    if (EBELGE_GONDERILMIS.includes(row.e_document_status)) {
        return 'e-Belge olarak GİB\'e iletilmiş fatura iptal edilemez; iade faturası düzenleyin.';
    }
    if (await varMi(client,
        `SELECT 1 FROM receipts_payments WHERE invoice_id = $1 AND COALESCE(status, '') <> 'Iptal' LIMIT 1`,
        [row.id])) {
        return 'Faturaya bağlı tahsilat/ödeme kaydı var; önce onu iptal edin.';
    }
    if (await varMi(client,
        `SELECT 1 FROM invoices WHERE source_document_id = $1 AND id <> $1
           AND (invoice_type ILIKE '%iade%' OR source_document_type ILIKE '%IADE%')
           AND COALESCE(status, '') <> 'Iptal' LIMIT 1`,
        [row.id])) {
        return 'Faturaya bağlı iade faturası var; önce iade faturasını iptal edin.';
    }
    return null;
}

/** Muhasebeleşmiş fatura iptali: ters fiş + ters cari hareket */
async function faturaTersKayit(client, row, ctx) {
    const sonuc = { ters_fis_id: null, ters_cari_hareket: [] };
    if (row.gl_document_id) {
        const fis = await client.query(
            `SELECT id, status, reversal_document_id FROM journal_entries WHERE id = $1 FOR UPDATE`,
            [row.gl_document_id]
        );
        const f = fis.rows[0];
        if (f && f.status === 'Onayli' && !f.reversal_document_id) {
            const { fisTersKayit } = require('./muhasebeMotorService');
            const ters = await fisTersKayit(client, f.id, {
                kullaniciKodu: ctx.kullanici,
                description: `Fatura iptali ← ${row.invoice_no}`,
            });
            sonuc.ters_fis_id = ters.id;
        } else if (f && f.status === 'Onayli' && f.reversal_document_id) {
            sonuc.ters_fis_id = f.reversal_document_id;
        } else if (f && f.status === 'Taslak') {
            await client.query(`UPDATE journal_entries SET status = 'Iptal' WHERE id = $1`, [f.id]);
        }
    }
    const cari = await client.query(
        `SELECT * FROM partner_ledger_entries
         WHERE document_id = $1 AND document_type IN ('SATIS_FATURA', 'ALIS_FATURA')
         ORDER BY id`,
        [row.id]
    );
    const ters = await client.query(
        `SELECT 1 FROM partner_ledger_entries
         WHERE document_id = $1 AND document_type IN ('SATIS_FATURA_IPTAL', 'ALIS_FATURA_IPTAL') LIMIT 1`,
        [row.id]
    );
    if (cari.rows.length && !ters.rows.length) {
        const { addPartnerLedgerEntry } = require('./cariHareketService');
        for (const e of cari.rows) {
            const h = await addPartnerLedgerEntry(client, {
                cariId: e.partner_id,
                direction: e.direction === 'Borc' ? 'Alacak' : 'Borc',
                amount: e.amount,
                paraBirimi: e.currency_code || 'TRY',
                exchange_rate: e.exchange_rate || 1,
                belgeTipi: `${e.document_type}_IPTAL`,
                belgeId: row.id,
                description: `İptal ← ${e.description || row.invoice_no}`,
            });
            sonuc.ters_cari_hareket.push(h.id);
        }
    }
    return sonuc;
}

function faturaFinansalKilit(row) {
    if (row.is_posted || row.gl_document_id) {
        return { kod: 'BELGE_MUHASEBELESMIS', neden: 'muhasebeleşmiş' };
    }
    if (EBELGE_GONDERILMIS.includes(row.e_document_status)) {
        return { kod: 'BELGE_EBELGE_GONDERILDI', neden: 'e-Belge olarak gönderilmiş' };
    }
    return null;
}

async function siparisSevkVar(client, id) {
    return varMi(client,
        `SELECT 1 FROM delivery_notes WHERE sales_order_id = $1 AND COALESCE(status, '') <> 'Iptal'
         UNION ALL
         SELECT 1 FROM shipment_orders WHERE sales_order_id = $1 AND COALESCE(status, '') <> 'Iptal'
         UNION ALL
         SELECT 1 FROM invoices WHERE sales_order_id = $1 AND COALESCE(status, '') <> 'Iptal'
         LIMIT 1`,
        [id]);
}

async function satinalmaGirisVar(client, id) {
    return varMi(client,
        `SELECT 1 FROM goods_receipts WHERE purchase_order_id = $1 AND COALESCE(status, '') <> 'Iptal'
         UNION ALL
         SELECT 1 FROM vendor_delivery_notes WHERE purchase_order_id = $1 AND COALESCE(status, '') <> 'Iptal'
         UNION ALL
         SELECT 1 FROM subcontract_orders WHERE purchase_order_id = $1
         LIMIT 1`,
        [id]);
}

async function uretimIslemVar(client, row) {
    if (Number(row.produced_quantity) > 0) return true;
    return varMi(client,
        `SELECT 1 FROM production_order_components WHERE order_id = $1 AND COALESCE(consumed_quantity, 0) > 0
         UNION ALL
         SELECT 1 FROM production_receipts WHERE order_id = $1
         UNION ALL
         SELECT 1 FROM subcontract_shipments WHERE production_order_id = $1
         LIMIT 1`,
        [row.id]);
}

const SIPARIS_SATIR = [['item_id', 'item_code'], 'quantity', 'unit_price'];

/** Basit belgeler (_belgeCrud): taslak durum + izinli geçiş tablosu */
function basitBelgeKurali({ tablo, etiket, noAlan, satirTablo, satirFk, taslak = 'Taslak', gecisler, linePrice = true, yol }) {
    return {
        tablo,
        etiket,
        noAlan,
        satirlar: [{ anahtarlar: ['satirlar'], tablo: satirTablo, fk: satirFk, alanlar: linePrice ? ['item_id', 'quantity', 'unit_price'] : ['item_id', 'quantity'] }],
        serbestAlanlar: ['description'],
        kilit(row) {
            const d = durumOf(row) === 'Taslak' && taslak !== 'Taslak' ? taslak : durumOf(row);
            if (d === taslak) return null;
            return { kod: 'BELGE_KILITLI', neden: `«${d}» durumunda` };
        },
        alternatif(row) {
            return `Durumu iptal edin (PUT ${yol}/${row.id} {"status":"Iptal"}) veya yeni belge açın.`;
        },
        async gecis(client, row, hedef) {
            const izin = gecisler[durumOf(row)] || [];
            if (!izin.includes(hedef)) throw gecisHatasi(this, row, hedef);
            return { status: hedef };
        },
    };
}

const KURALLAR = {
    invoices: {
        tablo: 'invoices',
        etiket: 'Fatura',
        noAlan: 'invoice_no',
        satirlar: [{
            anahtarlar: SATIR_ANAHTARLARI, tablo: 'invoice_lines', fk: 'invoice_id', sira: 'id',
            alanlar: ['item_id', 'quantity', 'unit_price'],
        }],
        serbestAlanlar: ['internal_note'],
        yoksayilanAlanlar: [
            'remaining_amount', 'paid_amount', 'payment_status', 'e_document_status', 'gib_number',
            'uuid_ettn', 'is_posted', 'gl_document_id', 'portal_sent_date', 'is_printed',
        ],
        kilit(row) {
            const f = faturaFinansalKilit(row);
            if (f) return f;
            if (durumOf(row) !== 'Taslak') return { kod: 'BELGE_KILITLI', neden: `«${durumOf(row)}» durumunda` };
            return null;
        },
        alternatif(row) {
            if (EBELGE_GONDERILMIS.includes(row.e_document_status)) {
                return `İade faturası: POST /invoices/${row.id}/iade`;
            }
            return `İptal (ters fiş + ters cari): POST /invoices/${row.id}/iptal · İade faturası: POST /invoices/${row.id}/iade`;
        },
        async gecis(client, row, hedef, ctx) {
            const d = durumOf(row);
            if (hedef === 'Iptal') {
                if (d === 'Iptal') throw gecisHatasi(this, row, hedef, 'Fatura zaten iptal.');
                const engel = await faturaIptalEngeli(client, row);
                if (engel) throw gecisHatasi(this, row, hedef, engel);
                ctx.sonuc = await faturaTersKayit(client, row, ctx);
                return { status: 'Iptal', payment_status: 'Iptal', remaining_amount: 0 };
            }
            if (hedef === 'Taslak') {
                if (faturaFinansalKilit(row)) {
                    throw gecisHatasi(this, row, hedef, 'Muhasebeleşmiş / e-Belge gönderilmiş fatura taslağa alınamaz.');
                }
                if (d !== 'Onayli') throw gecisHatasi(this, row, hedef);
                return { status: 'Taslak' };
            }
            if (hedef === 'Onayli' && d === 'Taslak') return { status: 'Onayli' };
            throw gecisHatasi(this, row, hedef);
        },
    },

    sales_orders: {
        tablo: 'sales_orders',
        etiket: 'Satış siparişi',
        noAlan: 'order_no',
        satirlar: [{
            anahtarlar: SATIR_ANAHTARLARI, tablo: 'sales_order_lines', fk: 'sales_order_id', sira: 'id',
            alanlar: SIPARIS_SATIR,
        }],
        serbestAlanlar: ['internal_note', 'public_note'],
        yoksayilanAlanlar: ['total_amount', 'subtotal', 'grand_total', 'partner_code', 'partner_name'],
        kilit(row) {
            const d = durumOf(row);
            if (d === 'Taslak') return null;
            const neden = { Onayli: 'onaylı', Kismi: 'kısmen sevk edilmiş', Kapali: 'kapalı', Iptal: 'iptal edilmiş' }[d] || `«${d}» durumunda`;
            return { kod: 'BELGE_KILITLI', neden };
        },
        alternatif(row) {
            return `İptal: POST /sales_orders/${row.id}/iptal · Kalanı kapatma: PUT {"status":"Kapali"} · Sevk edilen için iade irsaliyesi.`;
        },
        async gecis(client, row, hedef) {
            const d = durumOf(row);
            const { cancelOrderReservations } = require('./rezervasyonService');
            if (hedef === 'Iptal') {
                if (!['Taslak', 'Onayli'].includes(d)) {
                    throw gecisHatasi(this, row, hedef, 'Sevk edilmiş / kapalı sipariş iptal edilemez; iade akışını kullanın.');
                }
                if (await siparisSevkVar(client, row.id)) {
                    throw gecisHatasi(this, row, hedef, 'Siparişe bağlı sevk emri / irsaliye / fatura var; önce onları iptal edin veya kalanı kapatın (Kapali).');
                }
                if (await varMi(client,
                    `SELECT 1 FROM production_orders WHERE sales_order_id = $1 AND status NOT IN ('Iptal', 'Kapali') LIMIT 1`,
                    [row.id])) {
                    throw gecisHatasi(this, row, hedef, 'Siparişe bağlı açık üretim emri var; önce onu iptal edin.');
                }
                await cancelOrderReservations(client, row.id);
                return { status: 'Iptal' };
            }
            if (hedef === 'Kapali') {
                if (!['Onayli', 'Kismi'].includes(d)) throw gecisHatasi(this, row, hedef);
                await cancelOrderReservations(client, row.id);
                return { status: 'Kapali' };
            }
            if (hedef === 'Taslak') {
                if (d !== 'Onayli' || await siparisSevkVar(client, row.id)) {
                    throw gecisHatasi(this, row, hedef, 'Sevk işlemi başlamış sipariş taslağa alınamaz.');
                }
                return { status: 'Taslak' };
            }
            if (hedef === 'Onayli' && d === 'Taslak') return { status: 'Onayli' };
            throw gecisHatasi(this, row, hedef);
        },
    },

    purchase_orders: {
        tablo: 'purchase_orders',
        etiket: 'Satınalma siparişi',
        noAlan: 'order_no',
        satirlar: [{
            anahtarlar: ['satirlar'], tablo: 'purchase_order_lines', fk: 'purchase_order_id', sira: 'id',
            alanlar: ['item_id', 'quantity', 'unit_price'],
        }],
        serbestAlanlar: ['internal_note', 'public_note'],
        yoksayilanAlanlar: ['total_amount', 'subtotal', 'grand_total', 'net_amount', 'tax_amount'],
        // PUT gövdesindeki boş alanlar COALESCE ile mevcut değeri korur
        nullDegisiklikDegil: '*',
        kilit(row) {
            const d = durumOf(row);
            if (d === 'Taslak') return null;
            const neden = { Onayli: 'onaylı', KismiTeslim: 'kısmen teslim alınmış', Kapali: 'kapalı', Iptal: 'iptal edilmiş' }[d] || `«${d}» durumunda`;
            return { kod: 'BELGE_KILITLI', neden };
        },
        alternatif(row) {
            return `İptal: POST /satin-alma-siparisleri/${row.id}/iptal · Kalanı kapatma: PUT {"status":"Kapali"} · Teslim alınan için mal kabul iadesi.`;
        },
        async gecis(client, row, hedef) {
            const d = durumOf(row);
            if (hedef === 'Iptal') {
                if (!['Taslak', 'Onayli'].includes(d)) throw gecisHatasi(this, row, hedef, 'Teslim alınmış / kapalı sipariş iptal edilemez.');
                if (await satinalmaGirisVar(client, row.id)) {
                    throw gecisHatasi(this, row, hedef, 'Siparişe bağlı mal kabul / tedarikçi irsaliyesi / fason emri var; kalanı kapatın (Kapali).');
                }
                return { status: 'Iptal' };
            }
            if (hedef === 'Kapali') {
                if (!['Onayli', 'KismiTeslim'].includes(d)) throw gecisHatasi(this, row, hedef);
                return { status: 'Kapali' };
            }
            if (hedef === 'Taslak') {
                if (d !== 'Onayli' || await satinalmaGirisVar(client, row.id)) {
                    throw gecisHatasi(this, row, hedef, 'Mal kabulü başlamış sipariş taslağa alınamaz.');
                }
                return { status: 'Taslak', approved_at: null };
            }
            if (hedef === 'Onayli' && d === 'Taslak') return { status: 'Onayli' };
            throw gecisHatasi(this, row, hedef);
        },
    },

    production_orders: {
        tablo: 'production_orders',
        etiket: 'Üretim emri',
        noAlan: 'order_no',
        satirlar: [
            {
                anahtarlar: ['malzemeler', 'bilesenler'], tablo: 'production_order_components', fk: 'order_id',
                sira: 'id', etiket: 'malzemeler',
                alanlar: ['item_id', ['planned_quantity', 'quantity'], 'warehouse_id'],
            },
            {
                anahtarlar: ['operasyonlar'], tablo: 'production_order_operations', fk: 'order_id', sira: 'id',
                etiket: 'operasyonlar',
                karsilastir(mevcut, gelen) {
                    const byId = new Map(mevcut.map((o) => [Number(o.id), o]));
                    return gelen.some((op) => {
                        const m = byId.get(Number(op?.id));
                        if (!m) return false;
                        return ['planned_quantity', 'operation_name', 'work_center_id', 'status'].some((k) => {
                            if (op[k] == null || op[k] === '') return false;
                            const a = Number(op[k]);
                            const b = Number(m[k]);
                            if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) > 1e-6;
                            return String(op[k]) !== String(m[k] ?? '');
                        });
                    });
                },
            },
        ],
        nullDegisiklikDegil: '*',
        yoksayilanAlanlar: ['is_open', 'produced_quantity', 'next_line_no', 'start_date'],
        async kilit(row, client) {
            const d = durumOf(row);
            if (['Kapali', 'Iptal'].includes(d)) {
                return { kod: 'BELGE_KILITLI', neden: d === 'Kapali' ? 'kapalı' : 'iptal edilmiş', serbestAlanlar: [] };
            }
            if (d === 'Uretimde' || row.is_started || await uretimIslemVar(client, row)) {
                return {
                    kod: 'BELGE_KILITLI',
                    neden: 'üretimi başlamış',
                    serbestAlanlar: ['plan_start', 'plan_end', 'end_date', 'description', 'project_code', 'is_printed'],
                };
            }
            if (row.is_approved) {
                return {
                    kod: 'BELGE_KILITLI',
                    neden: 'onaylı',
                    serbestAlanlar: [
                        'plan_start', 'plan_end', 'end_date', 'order_date', 'description', 'project_code',
                        'is_printed', 'is_released', 'component_warehouse_id', 'wip_warehouse_id', 'fg_warehouse_id',
                        'planned_firm',
                    ],
                };
            }
            return null;
        },
        alternatif(row) {
            return `İptal: POST /uretim-emirleri/${row.id}/iptal · Üretimi olan emir için PUT {"status":"Kapali"} · Onayı geri alma: PUT {"status":"OnayBekliyor"}.`;
        },
        async gecis(client, row, hedef) {
            const d = durumOf(row);
            if (hedef === 'Iptal') {
                if (['Kapali', 'Iptal'].includes(d)) throw gecisHatasi(this, row, hedef);
                if (await uretimIslemVar(client, row)) {
                    throw gecisHatasi(this, row, hedef, 'Üretim / tüketim kaydı olan emir iptal edilemez; Kapali yapın.');
                }
                return { status: 'Iptal', is_open: 'Kapali' };
            }
            if (hedef === 'Kapali') {
                if (!['Acik', 'Uretimde', 'OnayBekliyor', 'Taslak'].includes(d)) throw gecisHatasi(this, row, hedef);
                return { status: 'Kapali', is_open: 'Kapali' };
            }
            if (['Taslak', 'OnayBekliyor'].includes(hedef)) {
                if (d !== 'Acik' || row.is_started || await uretimIslemVar(client, row)) {
                    throw gecisHatasi(this, row, hedef, 'Başlamış emrin onayı geri alınamaz.');
                }
                return { status: hedef, is_approved: false };
            }
            if (hedef === 'Acik' && ['Taslak', 'OnayBekliyor'].includes(d)) {
                return { status: 'Acik', is_approved: true, is_open: 'Acik' };
            }
            throw gecisHatasi(this, row, hedef, 'Üretime başlatma için POST /uretim-emirleri/:id/baslat kullanın.');
        },
    },

    goods_receipts: {
        tablo: 'goods_receipts',
        etiket: 'Mal kabul',
        noAlan: 'receipt_no',
        kilit(row) {
            if (row.item_movement_id || durumOf(row) !== 'Taslak') {
                return { kod: 'BELGE_STOK_ISLENMIS', neden: 'stok hareketi üretmiş', serbestAlanlar: [] };
            }
            return null;
        },
        alternatif(row) {
            return `İade: POST /mal-kabuller/${row.id}/iade`;
        },
        async gecis(client, row, hedef) {
            throw gecisHatasi(this, row, hedef);
        },
    },

    delivery_notes: {
        tablo: 'delivery_notes',
        etiket: 'İrsaliye',
        noAlan: 'delivery_note_no',
        satirlar: [{
            anahtarlar: SATIR_ANAHTARLARI, tablo: 'delivery_note_lines', fk: 'delivery_note_id', sira: 'id',
            alanlar: ['item_id', 'quantity'],
        }],
        serbestAlanlar: ['internal_note'],
        yoksayilanAlanlar: ['e_document_status', 'uuid_ettn', 'gib_number', 'invoice_status', 'item_movement_id'],
        nullDegisiklikDegil: '*',
        kilit(row) {
            if (EBELGE_GONDERILMIS.includes(row.e_document_status)) {
                return { kod: 'BELGE_EBELGE_GONDERILDI', neden: 'e-İrsaliye olarak gönderilmiş', serbestAlanlar: [] };
            }
            const d = durumOf(row);
            if (['Onayli', 'FaturayaDonustu', 'Kapali'].includes(d) || row.item_movement_id) {
                return { kod: 'BELGE_KILITLI', neden: d === 'FaturayaDonustu' ? 'faturalanmış' : 'onaylı (stok çıkışı yapılmış)' };
            }
            if (d === 'Iptal') return { kod: 'BELGE_KILITLI', neden: 'iptal edilmiş' };
            return null;
        },
        alternatif(row) {
            return `İade irsaliyesi: POST /delivery_notes/${row.id}/iade`;
        },
        async gecis(client, row, hedef) {
            if (hedef === 'Iptal' && durumOf(row) === 'Taslak' && !row.item_movement_id) return { status: 'Iptal' };
            throw gecisHatasi(this, row, hedef, 'Onaylı irsaliye için iade irsaliyesi kullanın.');
        },
    },

    journal_entries: {
        tablo: 'journal_entries',
        etiket: 'Muhasebe fişi',
        noAlan: 'document_no',
        satirlar: [{
            anahtarlar: SATIR_ANAHTARLARI, tablo: 'journal_entry_lines', fk: 'document_id', sira: 'id',
            alanlar: ['account_id', 'debit', 'credit'],
        }],
        kilit(row) {
            if (row.status === 'Onayli' || row.is_locked || row.is_posted) {
                return { kod: 'KESIN_FIS_KILIT', neden: 'kesinleşmiş', serbestAlanlar: [] };
            }
            return null;
        },
        alternatif(row) {
            return `Ters kayıt: POST /muhasebe-belgeleri/${row.id}/ters-kayit`;
        },
        async gecis(client, row, hedef) {
            if (hedef === 'Iptal' && durumOf(row) === 'Taslak') return { status: 'Iptal' };
            throw gecisHatasi(this, row, hedef, 'Kesin fiş için ters kayıt kullanın.');
        },
    },

    stock_movements: {
        tablo: 'stock_movements',
        etiket: 'Stok hareketi',
        noAlan: 'movement_no',
        durumAlani: null,
        satirlar: [{
            anahtarlar: SATIR_ANAHTARLARI, tablo: 'stock_movement_lines', fk: 'movement_id', sira: 'id',
            alanlar: ['item_id', 'quantity'],
        }],
        serbestAlanlar: ['description', 'ref_no', 'project_code'],
        yoksayilanAlanlar: ['goods_amount', 'tax_amount', 'grand_total', 'cost_total', 'approval_status', 'status'],
        nullDegisiklikDegil: '*',
        kilit(row) {
            if (row.approval_status === 'Iptal') {
                return { kod: 'BELGE_IPTAL_EDILMIS', neden: 'iptal edilmiş (ters hareketi var)', serbestAlanlar: [] };
            }
            if (row.document_type === 'STOK_IPTAL') {
                return { kod: 'BELGE_TERS_KAYIT', neden: 'bir iptalin ters hareketi', serbestAlanlar: [] };
            }
            if (stokHareketBelgeBagli(row)) {
                return { kod: 'BELGE_BAGLI_HAREKET', neden: `kaynak belgeye (${row.document_type}) bağlı`, serbestAlanlar: [] };
            }
            return { kod: 'STOK_HAREKET_KILITLI', neden: 'stok bakiyesine işlenmiş' };
        },
        alternatif(row) {
            if (stokHareketBelgeBagli(row)) return 'Kaynak belgenin iade / iptal akışını kullanın.';
            return `Ters hareket: POST /stok-hareketleri/${row.id}/iptal, ardından doğru hareketi yeniden girin.`;
        },
        async gecis(client, row, hedef, ctx) {
            if (hedef !== 'Iptal') throw gecisHatasi(this, row, hedef);
            const k = this.kilit(row);
            if (k.kod !== 'STOK_HAREKET_KILITLI') {
                throw new BelgeKilitHatasi(`${belgeAdi(this, row)} ${k.neden}; iptal edilemez. ${this.alternatif(row)}`, {
                    kod: k.kod, tablo: this.tablo, id: row.id, alternatif: this.alternatif(row),
                });
            }
            ctx.sonuc = await stokHareketTers(client, row, ctx);
            return { approval_status: 'Iptal' };
        },
    },

    purchase_quotations: basitBelgeKurali({
        tablo: 'purchase_quotations', etiket: 'Satınalma teklifi', noAlan: 'quotation_no',
        satirTablo: 'purchase_quotation_lines', satirFk: 'quotation_id', yol: '/satin-alma-teklifleri',
        gecisler: {
            Taslak: ['Onayli', 'Red', 'Iptal'],
            Onayli: ['Taslak', 'Red', 'Iptal', 'Kapali'],
            Red: ['Kapali'],
            AnlasmayaDonustu: ['Kapali'],
            SipariseDonustu: ['Kapali'],
        },
    }),
    purchase_agreements: basitBelgeKurali({
        tablo: 'purchase_agreements', etiket: 'Satınalma anlaşması', noAlan: 'agreement_no',
        satirTablo: 'purchase_agreement_lines', satirFk: 'agreement_id', yol: '/satin-alma-anlasmalari',
        gecisler: {
            Taslak: ['Onayli', 'Iptal'],
            Onayli: ['Taslak', 'Kapali', 'Iptal'],
        },
    }),
    rfqs: basitBelgeKurali({
        tablo: 'rfqs', etiket: 'Teklif isteği', noAlan: 'rfq_no', taslak: 'Acik',
        satirTablo: 'rfq_lines', satirFk: 'rfq_id', linePrice: false, yol: '/satin-alma-teklif-istekleri',
        gecisler: {
            Acik: ['Onayli', 'Iptal', 'Kapali'],
            Onayli: ['Acik', 'TeklifeDonustu', 'Iptal', 'Kapali'],
            TeklifeDonustu: ['Kapali'],
        },
    }),
};

/** Manuel stok hareketi ekranının ürettiği belge tipleri; diğerleri kaynak belgeye bağlıdır. */
const MANUEL_STOK_BELGE_TIPLERI = new Set(['', 'STOK_GIRIS', 'STOK_CIKIS', 'DUZELTME', 'SAYIM', 'TRANSFER']);

function stokHareketBelgeBagli(row) {
    return !MANUEL_STOK_BELGE_TIPLERI.has(String(row.document_type || ''));
}

const TERS_TIP = {
    STOK_GIRIS: 'STOK_CIKIS',
    STOK_CIKIS: 'STOK_GIRIS',
    IADE_GIRIS: 'IADE_CIKIS',
    IADE_CIKIS: 'IADE_GIRIS',
    SATINALMA_GIRIS: 'STOK_CIKIS',
    SATIS_CIKIS: 'STOK_GIRIS',
};

/** Manuel stok hareketinin (ve transfer çiftinin) ters hareketini üretir. */
async function stokHareketTers(client, row, ctx) {
    const { createStockMovement } = require('./stokHareketService');
    const hareketler = [row];
    if (row.linked_movement_id) {
        const l = await client.query(`SELECT * FROM stock_movements WHERE id = $1 FOR UPDATE`, [row.linked_movement_id]);
        if (l.rows[0]) hareketler.push(l.rows[0]);
    }
    // Önce giriş yönlü hareketi geri al (hedef depoda negatif bakiye oluşmasın)
    const satirlarOf = async (h) => (await client.query(
        `SELECT * FROM stock_movement_lines WHERE movement_id = $1 ORDER BY id`, [h.id]
    )).rows;
    const detay = [];
    for (const h of hareketler) detay.push({ h, satirlar: await satirlarOf(h) });
    detay.sort((a, b) => {
        const net = (x) => x.satirlar.reduce((s, l) => s + Number(l.direction || 1), 0);
        return net(b) - net(a);
    });
    const tersler = [];
    for (const { h, satirlar } of detay) {
        if (!satirlar.length) continue;
        const ters = await createStockMovement(client, {
            hareketTipi: TERS_TIP[h.movement_type] || h.movement_type,
            depoId: h.warehouse_id,
            belgeTipi: 'STOK_IPTAL',
            belgeId: h.id,
            description: `İptal ← ${h.movement_no}${ctx.aciklama ? ` · ${ctx.aciklama}` : ''}`,
            hareketKoduId: h.movement_code_id || null,
            satirlar: satirlar.map((s) => ({
                item_id: s.item_id,
                quantity: Number(s.quantity),
                direction: -Number(s.direction || 1),
                uom_code: s.uom_code || null,
                lot_id: s.lot_id || null,
                lot_no: s.lot_no || null,
                serial_no: s.serial_no || null,
                stock_status: s.stock_status || 'Kullanilabilir',
                bin_code: s.bin_code || null,
                location_code: s.location_code || null,
                uom_cost: s.uom_cost,
                unit_price: s.unit_price,
                currency_code: s.currency_code || undefined,
                exchange_rate: s.exchange_rate || undefined,
            })),
        });
        tersler.push(ters.hareket.id);
        if (h.id !== row.id) {
            await client.query(`UPDATE stock_movements SET approval_status = 'Iptal' WHERE id = $1`, [h.id]);
        }
    }
    return { ters_hareket_idleri: tersler };
}

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

function kullaniciOf(req) {
    return req?.user?.user_code
        || req?.get?.('x-kullanici-kodu')
        || req?.headers?.['x-kullanici-kodu']
        || null;
}

function istekYolu(req) {
    return req ? `${req.method} ${req.originalUrl || req.url || ''}` : null;
}

function anlik(row) {
    if (!row) return null;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
        out[k] = v instanceof Date ? v.toISOString() : v;
    }
    return out;
}

async function belgeAudit(client, { tablo, id, action, eski = null, yeni = null, req = null }) {
    await client.query('SAVEPOINT belge_kilit_audit');
    try {
        await auditYaz(client, {
            tablo,
            kayitId: id,
            action,
            kullaniciKodu: kullaniciOf(req),
            eski,
            yeni,
            request_path: istekYolu(req),
        });
        await client.query('RELEASE SAVEPOINT belge_kilit_audit');
    } catch (_) {
        await client.query('ROLLBACK TO SAVEPOINT belge_kilit_audit').catch(() => {});
    }
}

/* ------------------------------------------------------------------ */
/* Ana giriş noktaları                                                 */
/* ------------------------------------------------------------------ */

function kuralAl(tip) {
    const k = KURALLAR[tip];
    if (!k) throw new Error(`Belge kilit kuralı tanımsız: ${tip}`);
    return k;
}

async function kilitliOku(client, kural, id) {
    const r = await client.query(`SELECT * FROM ${kural.tablo} WHERE id = $1 FOR UPDATE`, [id]);
    return r.rows[0] || null;
}

async function kilitDurumu(client, tip, row) {
    const kural = kuralAl(tip);
    return (await kural.kilit.call(kural, row, client)) || null;
}

function kilitHatasi(kural, row, kilit, islem, ek = {}) {
    const fiil = islem === 'DELETE' ? 'silinemez' : 'düzenlenemez';
    const alanMetni = ek.alanlar?.length ? ` (değişmek istenen: ${ek.alanlar.join(', ')})` : '';
    return new BelgeKilitHatasi(
        `${belgeAdi(kural, row)} ${kilit.neden}; ${fiil}${alanMetni}. ${kural.alternatif(row)}`,
        {
            kod: kilit.kod, tablo: kural.tablo, id: row.id, durum: durumOf(row),
            alternatif: kural.alternatif(row), islem, alanlar: ek.alanlar || null,
        }
    );
}

async function guncellemeUygula(client, kural, id, set) {
    const tipler = await kolonTipleri(client, kural.tablo);
    const cols = Object.keys(set).filter((k) => tipler.has(k));
    if (!cols.length) return;
    const vals = cols.map((k) => yazimDegeri(tipler.get(k), set[k]));
    const sets = cols.map((k, i) => `${k} = $${i + 2}`);
    if (tipler.has('updated_at') && !cols.includes('updated_at')) sets.push('updated_at = CURRENT_TIMESTAMP');
    await client.query(`UPDATE ${kural.tablo} SET ${sets.join(', ')} WHERE id = $1`, [id, ...vals]);
}

/**
 * PUT öncesi kilit kontrolü. Transaction içinde çağrılmalı.
 * - Belge kilitli değilse { row, kilit: null, uygulandi: false } → route normal akışa devam eder.
 * - Kilitliyse ve gövde yalnız izinli alan / durum geçişi içeriyorsa bunları uygular,
 *   { uygulandi: true } döner → route yalnız güncel kaydı döndürmeli.
 * - Aksi halde BelgeKilitHatasi (409) fırlatır.
 */
async function belgeGuncellemeKontrol(client, tip, id, body, { req = null } = {}) {
    const kural = kuralAl(tip);
    const row = await kilitliOku(client, kural, id);
    if (!row) return { row: null, kilit: null, uygulandi: false };
    const kilit = await kilitDurumu(client, tip, row);
    if (!kilit) return { row, kilit: null, uygulandi: false };

    const durumAlani = kural.durumAlani === undefined ? 'status' : kural.durumAlani;
    const degisen = await alanDegisiklikleri(client, {
        ...kural,
        nullDegisiklikDegil: kural.nullDegisiklikDegil === '*' ? Object.keys(body || {}) : kural.nullDegisiklikDegil,
    }, row, body);
    const hedefDurum = durumAlani && degisen[durumAlani] ? String(body[durumAlani]) : null;
    if (durumAlani) delete degisen[durumAlani];

    const serbest = new Set(kilit.serbestAlanlar || kural.serbestAlanlar || []);
    const yasak = Object.keys(degisen).filter((k) => !serbest.has(k));
    const satirDegisimi = await satirlarDegisti(client, kural, row.id, body);
    if (satirDegisimi) yasak.push(satirDegisimi);
    if (yasak.length) throw kilitHatasi(kural, row, kilit, 'PUT', { alanlar: yasak });

    const set = {};
    for (const k of Object.keys(degisen)) set[k] = body[k];
    const ctx = { req, kullanici: kullaniciOf(req), aciklama: body?.iptal_aciklama || null };
    if (hedefDurum) Object.assign(set, await kural.gecis.call(kural, client, row, hedefDurum, ctx));
    if (Object.keys(set).length) {
        await guncellemeUygula(client, kural, row.id, set);
        await belgeAudit(client, {
            tablo: kural.tablo,
            id: row.id,
            action: hedefDurum ? 'BELGE_DURUM_GECISI' : 'BELGE_KILIT_GUNCEL',
            eski: { durum: durumOf(row), alanlar: Object.fromEntries(Object.keys(set).map((k) => [k, anlik(row)[k] ?? null])) },
            yeni: { durum: hedefDurum || durumOf(row), alanlar: set, kilit: kilit.kod, sonuc: ctx.sonuc || null },
            req,
        });
    }
    return { row, kilit, uygulandi: true, sonuc: ctx.sonuc || null };
}

/**
 * DELETE: yalnız kilitsiz (taslak / işlenmemiş) belge silinir; eski kayıt audit'e yazılır.
 * @returns {Promise<object|null>} silinen satır veya null (bulunamadı)
 */
async function belgeSil(client, tip, id, { req = null, sil = null } = {}) {
    const kural = kuralAl(tip);
    const row = await kilitliOku(client, kural, id);
    if (!row) return null;
    const kilit = await kilitDurumu(client, tip, row);
    if (kilit) throw kilitHatasi(kural, row, kilit, 'DELETE');
    if (sil) await sil(client, row);
    else await client.query(`DELETE FROM ${kural.tablo} WHERE id = $1`, [row.id]);
    await belgeAudit(client, {
        tablo: kural.tablo, id: row.id, action: 'BELGE_SIL', eski: anlik(row), yeni: null, req,
    });
    return row;
}

/**
 * POST /:id/iptal — kurala göre iptal (ters fiş / ters cari / rezervasyon çözme / ters stok hareketi).
 */
async function belgeIptal(client, tip, id, { req = null, aciklama = null } = {}) {
    const kural = kuralAl(tip);
    const row = await kilitliOku(client, kural, id);
    if (!row) return null;
    const ctx = { req, kullanici: kullaniciOf(req), aciklama };
    const set = await kural.gecis.call(kural, client, row, 'Iptal', ctx);
    await guncellemeUygula(client, kural, row.id, set);
    await belgeAudit(client, {
        tablo: kural.tablo,
        id: row.id,
        action: 'BELGE_IPTAL',
        eski: { durum: durumOf(row), kayit: anlik(row) },
        yeni: { ...set, aciklama, sonuc: ctx.sonuc || null },
        req,
    });
    return { row, set, sonuc: ctx.sonuc || null };
}

/* ------------------------------------------------------------------ */
/* HTTP yardımcıları                                                   */
/* ------------------------------------------------------------------ */

function kilitHatasiMi(err) {
    return err instanceof BelgeKilitHatasi || err?.code === KILIT_SQLSTATE;
}

function kilitHatasiGovde(err) {
    if (err instanceof BelgeKilitHatasi) {
        return {
            hata: err.message,
            kod: err.kod,
            belge_tipi: err.tablo,
            belge_id: err.belgeId,
            durum: err.durum,
            alternatif: err.alternatif,
            ...(err.alanlar ? { alanlar: err.alanlar } : {}),
        };
    }
    return {
        hata: [err.message, err.hint].filter(Boolean).join(' '),
        kod: 'BELGE_KILITLI_DB',
        detay: err.detail || undefined,
    };
}

/** Reddedilen girişimi (transaction dışında) audit'e yazar. */
function reddiAuditle(req, err) {
    const govde = kilitHatasiGovde(err);
    const tablo = err.tablo || req?.baseUrl?.replace(/^\//, '') || 'api';
    const id = err.belgeId || (req?.params?.id ? Number(req.params.id) : null);
    setImmediate(() => {
        auditYaz(pool, {
            tablo,
            kayitId: Number.isFinite(Number(id)) ? Number(id) : null,
            action: 'BELGE_KILIT_RED',
            kullaniciKodu: kullaniciOf(req),
            eski: null,
            yeni: { islem: req?.method || null, kod: govde.kod, hata: govde.hata },
            request_path: istekYolu(req),
        });
    });
}

/**
 * Route catch bloklarında: kilit hatasıysa 409 yanıtı + red audit yazar, true döner.
 */
function kilitHatasiYanit(res, err, req) {
    if (!kilitHatasiMi(err)) return false;
    reddiAuditle(req || res.req, err);
    res.status(409).json(kilitHatasiGovde(err));
    return true;
}

/** Bilinçli bakım script'leri için (yalnız aktif transaction'da geçerli). */
async function kilitBypassAc(client) {
    await client.query(`SELECT set_config('erp.belge_kilit_bypass', 'on', true)`);
}

module.exports = {
    KURALLAR,
    KILIT_SQLSTATE,
    BelgeKilitHatasi,
    belgeGuncellemeKontrol,
    belgeSil,
    belgeIptal,
    kilitDurumu,
    kilitHatasiMi,
    kilitHatasiGovde,
    kilitHatasiYanit,
    kilitBypassAc,
    _test: { normalize, esit, alanDegisiklikleri, satirListesiDegisti, tarihNorm, zamanDamgasiNorm, durumOf },
};
