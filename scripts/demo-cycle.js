/**
 * Uçtan uca ERP demo döngüsü.
 * Kullanım: npm run demo:cycle
 *
 * Akış:
 * Stoklar (4 HM + 2 YM + 1 Mamul)
 * → Ürün ağaçları + rota + iş merkezi
 * → Satınalma talebi (4 hammadde)
 * → Satınalma siparişi
 * → Mal kabul → Ana Depo
 * → YM1 / YM2 üretimi → Yarı Mamul Depo
 * → Mamul üretimi → Mamul Depo
 *
 * Not: Mamul, hammadde deposuna değil Mamul Depo'ya alınır (ERP doğruluğu).
 */
require('dotenv').config();
const { Pool } = require('pg');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur, depoBakiyeListesi } = require('../src/services/stokHareketService');

function requiredEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Eksik .env: ${name}`);
    return v;
}

async function upsertStok(client, row) {
    const mevcut = await client.query('SELECT id FROM stoklar WHERE stok_kodu = $1', [row.stok_kodu]);
    if (mevcut.rows[0]) {
        await client.query(
            `UPDATE stoklar SET stok_adi=$2, birim=$3, satis_fiyati=$4, stok_tipi=$5, tedarik_tipi=$6 WHERE id=$1`,
            [mevcut.rows[0].id, row.stok_adi, row.birim, row.satis_fiyati, row.stok_tipi, row.tedarik_tipi]
        );
        return mevcut.rows[0].id;
    }
    const ins = await client.query(
        `INSERT INTO stoklar (stok_kodu, stok_adi, birim, satis_fiyati, stok_tipi, tedarik_tipi)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [row.stok_kodu, row.stok_adi, row.birim, row.satis_fiyati, row.stok_tipi, row.tedarik_tipi]
    );
    return ins.rows[0].id;
}

async function ensureDepo(client, isYeriId, kod, adi, varsayilan = false) {
    const m = await client.query(
        'SELECT id FROM depolar WHERE is_yeri_id=$1 AND depo_kodu=$2',
        [isYeriId, kod]
    );
    if (m.rows[0]) return m.rows[0].id;
    if (varsayilan) {
        await client.query('UPDATE depolar SET varsayilan=FALSE WHERE is_yeri_id=$1', [isYeriId]);
    }
    const ins = await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, varsayilan)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [isYeriId, kod, adi, varsayilan]
    );
    return ins.rows[0].id;
}

async function ensureBom(client, mamulId, kod, adi, bilesenler) {
    const m = await client.query('SELECT id FROM urun_agaclari WHERE agac_kodu=$1', [kod]);
    if (m.rows[0]) return m.rows[0].id;
    const ins = await client.query(
        `INSERT INTO urun_agaclari (mamul_stok_id, agac_kodu, agac_adi, miktar)
         VALUES ($1,$2,$3,1) RETURNING id`,
        [mamulId, kod, adi]
    );
    const id = ins.rows[0].id;
    let sira = 10;
    for (const b of bilesenler) {
        await client.query(
            `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
             VALUES ($1,$2,$3,'AD',$4)`,
            [id, b.stok_id, b.miktar, sira]
        );
        sira += 10;
    }
    return id;
}

async function ensureRota(client, stokId, kod, adi, merkezId) {
    const m = await client.query('SELECT id FROM rotalar WHERE rota_kodu=$1', [kod]);
    if (m.rows[0]) return m.rows[0].id;
    const ins = await client.query(
        `INSERT INTO rotalar (stok_id, rota_kodu, rota_adi) VALUES ($1,$2,$3) RETURNING id`,
        [stokId, kod, adi]
    );
    const id = ins.rows[0].id;
    await client.query(
        `INSERT INTO rota_operasyonlari
            (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id, sure_dk)
         VALUES ($1,10,'OP10','Üretim Operasyonu',$2,30)`,
        [id, merkezId]
    );
    return id;
}

async function uretimYap(client, {
    stokId, bomId, rotaId, isYeriId, hammaddeDepoId, mamulDepoId, miktar,
}) {
    const no = await sonrakiBelgeNo(client, 'URETIM_EMRI');
    const emir = await client.query(
        `INSERT INTO uretim_emirleri
            (emir_no, stok_id, urun_agaci_id, rota_id, is_yeri_id,
             hammadde_depo_id, mamul_depo_id, planlanan_miktar, durum)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Acik') RETURNING *`,
        [no, stokId, bomId, rotaId, isYeriId, hammaddeDepoId, mamulDepoId, miktar]
    );
    const emirId = emir.rows[0].id;
    const bilesenler = await client.query(
        'SELECT * FROM urun_agaci_satirlari WHERE urun_agaci_id=$1',
        [bomId]
    );
    for (const b of bilesenler.rows) {
        await client.query(
            `INSERT INTO uretim_emri_bilesenleri (emir_id, stok_id, planlanan_miktar, birim)
             VALUES ($1,$2,$3,$4)`,
            [emirId, b.bilesen_stok_id, Number(b.miktar) * miktar, b.birim]
        );
    }

    const emirBilesen = await client.query(
        'SELECT * FROM uretim_emri_bilesenleri WHERE emir_id=$1',
        [emirId]
    );
    const tuketimSatirlari = emirBilesen.rows.map((b) => ({
        stok_id: b.stok_id,
        miktar: Number(b.planlanan_miktar),
        yon: -1,
        birim: b.birim,
    }));

    const tuketim = await stokHareketOlustur(client, {
        hareketTipi: 'URETIM_TUKETIM',
        isYeriId,
        depoId: hammaddeDepoId,
        belgeTipi: 'URETIM_GIRIS',
        aciklama: `${no} tüketim`,
        satirlar: tuketimSatirlari,
    });

    const mamul = await client.query('SELECT birim FROM stoklar WHERE id=$1', [stokId]);
    const girisH = await stokHareketOlustur(client, {
        hareketTipi: 'URETIM_GIRIS',
        isYeriId,
        depoId: mamulDepoId,
        belgeTipi: 'URETIM_GIRIS',
        aciklama: `${no} mamul giriş`,
        satirlar: [{ stok_id: stokId, miktar, yon: 1, birim: mamul.rows[0].birim }],
    });

    const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
    const giris = await client.query(
        `INSERT INTO uretim_girisleri
            (giris_no, emir_id, miktar, tuketim_hareket_id, mamul_hareket_id)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [girisNo, emirId, miktar, tuketim.hareket.id, girisH.hareket.id]
    );

    for (const b of emirBilesen.rows) {
        await client.query(
            `UPDATE uretim_emri_bilesenleri SET tuketilen_miktar = planlanan_miktar WHERE id=$1`,
            [b.id]
        );
    }
    await client.query(
        `UPDATE uretim_emirleri SET uretilen_miktar=$1, durum='Kapali' WHERE id=$2`,
        [miktar, emirId]
    );
    await client.query(
        'UPDATE stok_hareketleri SET belge_id=$1 WHERE id IN ($2,$3)',
        [giris.rows[0].id, tuketim.hareket.id, girisH.hareket.id]
    );

    return emir.rows[0].emir_no;
}

async function main() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: requiredEnv('DB_NAME'),
        user: requiredEnv('DB_USER'),
        password: requiredEnv('DB_PASSWORD'),
    });

    console.log('=== ERP Demo Döngüsü başlıyor ===');

    const ozet = await withTransaction(pool, async (client) => {
        // Firma / iş yeri
        let firma = await client.query('SELECT id FROM firmalar ORDER BY id LIMIT 1');
        if (!firma.rows[0]) {
            firma = await client.query(
                `INSERT INTO firmalar (firma_kodu, firma_adi) VALUES ('FRM00001','İlk ERP Firmam A.Ş.') RETURNING id`
            );
        }
        const firmaId = firma.rows[0].id;

        let isYeri = await client.query(
            'SELECT id FROM is_yerleri WHERE firma_id=$1 ORDER BY id LIMIT 1',
            [firmaId]
        );
        if (!isYeri.rows[0]) {
            isYeri = await client.query(
                `INSERT INTO is_yerleri (firma_id, is_yeri_kodu, is_yeri_adi, adres)
                 VALUES ($1,'IY-001','Merkez Fabrika','Merkez') RETURNING id`,
                [firmaId]
            );
        }
        const isYeriId = isYeri.rows[0].id;

        // Depolar
        const anaDepoId = await ensureDepo(client, isYeriId, 'ANA', 'Ana Depo (Hammadde)', true);
        const ymDepoId = await ensureDepo(client, isYeriId, 'YM', 'Yarı Mamul Depo', false);
        const mmDepoId = await ensureDepo(client, isYeriId, 'MM', 'Mamul Depo', false);

        // Tedarikçi
        let cari = await client.query(`SELECT id FROM cariler WHERE cari_kodu='TDR-001'`);
        if (!cari.rows[0]) {
            cari = await client.query(
                `INSERT INTO cariler (cari_kodu, cari_adi, cari_turu, telefon)
                 VALUES ('TDR-001','Demo Tedarikçi A.Ş.','Tedarikci','05550000000') RETURNING id`
            );
        }
        const cariId = cari.rows[0].id;

        // Stoklar
        const hm1 = await upsertStok(client, { stok_kodu: 'HM-001', stok_adi: 'Hammadde 1 - Çelik Sac', birim: 'AD', satis_fiyati: 0, stok_tipi: 'Hammadde', tedarik_tipi: 'Satinalma' });
        const hm2 = await upsertStok(client, { stok_kodu: 'HM-002', stok_adi: 'Hammadde 2 - Vida Seti', birim: 'AD', satis_fiyati: 0, stok_tipi: 'Hammadde', tedarik_tipi: 'Satinalma' });
        const hm3 = await upsertStok(client, { stok_kodu: 'HM-003', stok_adi: 'Hammadde 3 - Plastik Gövde', birim: 'AD', satis_fiyati: 0, stok_tipi: 'Hammadde', tedarik_tipi: 'Satinalma' });
        const hm4 = await upsertStok(client, { stok_kodu: 'HM-004', stok_adi: 'Hammadde 4 - Elektronik Kart', birim: 'AD', satis_fiyati: 0, stok_tipi: 'Hammadde', tedarik_tipi: 'Satinalma' });
        const ym1 = await upsertStok(client, { stok_kodu: 'YM-001', stok_adi: 'Yarı Mamul 1 - Gövde Montajı', birim: 'AD', satis_fiyati: 0, stok_tipi: 'YariMamul', tedarik_tipi: 'Uretim' });
        const ym2 = await upsertStok(client, { stok_kodu: 'YM-002', stok_adi: 'Yarı Mamul 2 - Elektronik Montaj', birim: 'AD', satis_fiyati: 0, stok_tipi: 'YariMamul', tedarik_tipi: 'Uretim' });
        const mm1 = await upsertStok(client, { stok_kodu: 'MM-001', stok_adi: 'Mamul - Demo Cihaz', birim: 'AD', satis_fiyati: 1500, stok_tipi: 'Mamul', tedarik_tipi: 'Uretim' });

        // BOM
        const bomYm1 = await ensureBom(client, ym1, 'BOM-YM1', 'YM1 Ağacı', [
            { stok_id: hm1, miktar: 1 }, { stok_id: hm2, miktar: 1 },
        ]);
        const bomYm2 = await ensureBom(client, ym2, 'BOM-YM2', 'YM2 Ağacı', [
            { stok_id: hm3, miktar: 1 }, { stok_id: hm4, miktar: 1 },
        ]);
        const bomMm1 = await ensureBom(client, mm1, 'BOM-MM1', 'Mamul Ağacı', [
            { stok_id: ym1, miktar: 1 }, { stok_id: ym2, miktar: 1 },
        ]);

        // İş merkezi + rota
        let merkez = await client.query(
            'SELECT id FROM is_merkezleri WHERE is_yeri_id=$1 AND merkez_kodu=$2',
            [isYeriId, 'IM-01']
        );
        if (!merkez.rows[0]) {
            merkez = await client.query(
                `INSERT INTO is_merkezleri (is_yeri_id, merkez_kodu, merkez_adi)
                 VALUES ($1,'IM-01','Montaj Hattı 1') RETURNING id`,
                [isYeriId]
            );
        }
        const merkezId = merkez.rows[0].id;
        const rotaYm1 = await ensureRota(client, ym1, 'ROT-YM1', 'YM1 Rotası', merkezId);
        const rotaYm2 = await ensureRota(client, ym2, 'ROT-YM2', 'YM2 Rotası', merkezId);
        const rotaMm1 = await ensureRota(client, mm1, 'ROT-MM1', 'Mamul Rotası', merkezId);

        // Satınalma talebi (10'ar adet 4 hammadde)
        const talepNo = await sonrakiBelgeNo(client, 'SATINALMA_TALEP');
        const talep = await client.query(
            `INSERT INTO satin_alma_talepleri (talep_no, is_yeri_id, aciklama, durum)
             VALUES ($1,$2,'Demo 4 hammadde talebi','Acik') RETURNING id`,
            [talepNo, isYeriId]
        );
        const talepId = talep.rows[0].id;
        for (const sid of [hm1, hm2, hm3, hm4]) {
            await client.query(
                `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim)
                 VALUES ($1,$2,10,'AD')`,
                [talepId, sid]
            );
        }

        // Talepten sipariş
        const sasNo = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
        const sas = await client.query(
            `INSERT INTO satin_alma_siparisleri
                (siparis_no, cari_id, is_yeri_id, talep_id, durum, toplam_tutar)
             VALUES ($1,$2,$3,$4,'Onayli',0) RETURNING id`,
            [sasNo, cariId, isYeriId, talepId]
        );
        const sasId = sas.rows[0].id;
        const talepSatir = await client.query(
            'SELECT * FROM satin_alma_talep_satirlari WHERE talep_id=$1',
            [talepId]
        );
        let toplam = 0;
        for (const ts of talepSatir.rows) {
            const fiyat = 25;
            toplam += 10 * fiyat;
            await client.query(
                `INSERT INTO satin_alma_siparis_satirlari
                    (siparis_id, talep_satir_id, stok_id, miktar, birim_fiyat, birim)
                 VALUES ($1,$2,$3,10,$4,'AD')`,
                [sasId, ts.id, ts.stok_id, fiyat]
            );
        }
        await client.query('UPDATE satin_alma_siparisleri SET toplam_tutar=$1 WHERE id=$2', [toplam, sasId]);
        await client.query(`UPDATE satin_alma_talepleri SET durum='SipariseDonustu' WHERE id=$1`, [talepId]);

        // Mal kabul → Ana Depo
        const sasSatir = await client.query(
            'SELECT * FROM satin_alma_siparis_satirlari WHERE siparis_id=$1',
            [sasId]
        );
        const hareket = await stokHareketOlustur(client, {
            hareketTipi: 'SATINALMA_GIRIS',
            isYeriId,
            depoId: anaDepoId,
            belgeTipi: 'MAL_KABUL',
            aciklama: `Demo mal kabul ${sasNo}`,
            satirlar: sasSatir.rows.map((s) => ({
                stok_id: s.stok_id,
                miktar: Number(s.miktar),
                yon: 1,
                birim: s.birim,
            })),
        });
        const mkNo = await sonrakiBelgeNo(client, 'MAL_KABUL');
        const mk = await client.query(
            `INSERT INTO mal_kabuller (kabul_no, siparis_id, depo_id, stok_hareket_id)
             VALUES ($1,$2,$3,$4) RETURNING id`,
            [mkNo, sasId, anaDepoId, hareket.hareket.id]
        );
        for (const s of sasSatir.rows) {
            await client.query(
                `INSERT INTO mal_kabul_satirlari (kabul_id, siparis_satir_id, stok_id, miktar)
                 VALUES ($1,$2,$3,$4)`,
                [mk.rows[0].id, s.id, s.stok_id, s.miktar]
            );
            await client.query(
                `UPDATE satin_alma_siparis_satirlari SET giren_miktar = miktar WHERE id=$1`,
                [s.id]
            );
        }
        await client.query(`UPDATE satin_alma_siparisleri SET durum='Kapali' WHERE id=$1`, [sasId]);
        await client.query('UPDATE stok_hareketleri SET belge_id=$1 WHERE id=$2', [mk.rows[0].id, hareket.hareket.id]);

        // Üretim: YM1, YM2 (hammadde Ana'dan), sonra Mamul (YM deposundan)
        const ueYm1 = await uretimYap(client, {
            stokId: ym1, bomId: bomYm1, rotaId: rotaYm1, isYeriId,
            hammaddeDepoId: anaDepoId, mamulDepoId: ymDepoId, miktar: 5,
        });
        const ueYm2 = await uretimYap(client, {
            stokId: ym2, bomId: bomYm2, rotaId: rotaYm2, isYeriId,
            hammaddeDepoId: anaDepoId, mamulDepoId: ymDepoId, miktar: 5,
        });
        const ueMm1 = await uretimYap(client, {
            stokId: mm1, bomId: bomMm1, rotaId: rotaMm1, isYeriId,
            hammaddeDepoId: ymDepoId, mamulDepoId: mmDepoId, miktar: 5,
        });

        return {
            talepNo, sasNo, mkNo, ueYm1, ueYm2, ueMm1,
            depolar: { anaDepoId, ymDepoId, mmDepoId },
        };
    });

    const bakiyeler = await depoBakiyeListesi(pool);
    console.log('\n--- Döngü özeti ---');
    console.log('Satınalma talebi :', ozet.talepNo);
    console.log('Satınalma sipariş:', ozet.sasNo);
    console.log('Mal kabul       :', ozet.mkNo);
    console.log('Üretim YM1      :', ozet.ueYm1, '→ Yarı Mamul Depo');
    console.log('Üretim YM2      :', ozet.ueYm2, '→ Yarı Mamul Depo');
    console.log('Üretim Mamul    :', ozet.ueMm1, '→ Mamul Depo');
    console.log('\n--- Depo bakiyeleri ---');
    for (const b of bakiyeler) {
        console.log(`${b.depo_kodu} | ${b.stok_kodu} | ${b.stok_adi} | bakiye=${b.bakiye}`);
    }
    console.log('\n=== Demo döngüsü tamam ===');
    console.log('Kontrol UI: http://localhost:3000/');

    await pool.end();
}

main().catch((err) => {
    console.error('Demo döngüsü hatası:', err.message);
    process.exit(1);
});
