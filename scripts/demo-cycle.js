/**
 * Uçtan uca ERP demo döngüsü.
 * Kod sistemi: 1 harf + 5 rakam (H00001, Y00001, U00001, T00001, M00001, D00001...)
 */
require('dotenv').config();
const { Pool } = require('pg');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur, depoBakiyeListesi } = require('../src/services/stokHareketService');
const {
    sonrakiKod,
    stokSeriKodundanTip,
    cariSeriKodundanTur,
} = require('../src/utils/kodUretici');

function requiredEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Eksik .env: ${name}`);
    return v;
}

async function ensureStokIsYeri(client, stokId, isYeriId) {
    if (!isYeriId) return;
    await client.query(
        `INSERT INTO stok_is_yeri (stok_id, is_yeri_id, aktif)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (stok_id, is_yeri_id) DO UPDATE SET aktif = TRUE`,
        [stokId, isYeriId]
    );
}

async function ensureStok(client, row) {
    const mevcut = await client.query('SELECT id, stok_kodu FROM stoklar WHERE stok_adi = $1', [row.stok_adi]);
    if (mevcut.rows[0]) {
        await client.query(
            `UPDATE stoklar SET birim=$2, satis_fiyati=$3, stok_tipi=$4, tedarik_tipi=$5 WHERE id=$1`,
            [mevcut.rows[0].id, row.birim, row.satis_fiyati, row.stok_tipi, row.tedarik_tipi]
        );
        await ensureStokIsYeri(client, mevcut.rows[0].id, row.is_yeri_id);
        return { id: mevcut.rows[0].id, stok_kodu: mevcut.rows[0].stok_kodu };
    }
    const kod = await sonrakiKod(client, stokSeriKodundanTip(row.stok_tipi));
    const ins = await client.query(
        `INSERT INTO stoklar (stok_kodu, stok_adi, birim, satis_fiyati, stok_tipi, tedarik_tipi)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, stok_kodu`,
        [kod, row.stok_adi, row.birim, row.satis_fiyati, row.stok_tipi, row.tedarik_tipi]
    );
    await ensureStokIsYeri(client, ins.rows[0].id, row.is_yeri_id);
    return ins.rows[0];
}

async function ensureCari(client, row) {
    const mevcut = await client.query('SELECT id, cari_kodu FROM cariler WHERE cari_adi = $1', [row.cari_adi]);
    if (mevcut.rows[0]) {
        await client.query(
            `UPDATE cariler SET
                cari_turu=$2, telefon=$3, email=$4, vergi_no=$5, vergi_dairesi=$6,
                yetkili_adi=$7, yetkili_telefon=$8, adres=$9, il=$10, ilce=$11,
                odeme_vadesi_gun=$12, aktif=TRUE, is_yeri_id=$13
             WHERE id=$1`,
            [
                mevcut.rows[0].id, row.cari_turu, row.telefon, row.email, row.vergi_no, row.vergi_dairesi,
                row.yetkili_adi, row.yetkili_telefon, row.adres, row.il, row.ilce,
                row.odeme_vadesi_gun ?? 30, row.is_yeri_id,
            ]
        );
        return { id: mevcut.rows[0].id, cari_kodu: mevcut.rows[0].cari_kodu };
    }
    const kod = await sonrakiKod(client, cariSeriKodundanTur(row.cari_turu));
    const ins = await client.query(
        `INSERT INTO cariler (
            cari_kodu, cari_adi, cari_turu, telefon, email, vergi_no, vergi_dairesi,
            yetkili_adi, yetkili_telefon, adres, il, ilce, ulke, para_birimi,
            odeme_vadesi_gun, aktif, is_yeri_id, notlar
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Türkiye','TRY',$13,TRUE,$14,$15)
         RETURNING id, cari_kodu`,
        [
            kod, row.cari_adi, row.cari_turu, row.telefon, row.email, row.vergi_no, row.vergi_dairesi,
            row.yetkili_adi, row.yetkili_telefon, row.adres, row.il, row.ilce,
            row.odeme_vadesi_gun ?? 30, row.is_yeri_id, row.notlar || null,
        ]
    );
    return ins.rows[0];
}

async function ensureDepo(client, isYeriId, adi, varsayilan = false) {
    const m = await client.query(
        'SELECT id, depo_kodu FROM depolar WHERE is_yeri_id=$1 AND depo_adi=$2',
        [isYeriId, adi]
    );
    if (m.rows[0]) return m.rows[0];

    // Eski kısa kodlar (ANA / YM / MM)
    let eskiKodlar = [];
    if (adi.includes('Ana')) eskiKodlar = ['ANA'];
    else if (adi.includes('Yarı')) eskiKodlar = ['YM'];
    else if (adi.includes('Mamul')) eskiKodlar = ['MM'];
    if (eskiKodlar.length) {
        const eski = await client.query(
            'SELECT id, depo_kodu FROM depolar WHERE is_yeri_id=$1 AND depo_kodu = ANY($2::text[])',
            [isYeriId, eskiKodlar]
        );
        if (eski.rows[0]) {
            await client.query('UPDATE depolar SET depo_adi=$2 WHERE id=$1', [eski.rows[0].id, adi]);
            return eski.rows[0];
        }
    }

    if (varsayilan) {
        await client.query('UPDATE depolar SET varsayilan=FALSE WHERE is_yeri_id=$1', [isYeriId]);
    }
    const kod = await sonrakiKod(client, 'DEPO');
    const ins = await client.query(
        `INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, varsayilan)
         VALUES ($1,$2,$3,$4) RETURNING id, depo_kodu`,
        [isYeriId, kod, adi, varsayilan]
    );
    return ins.rows[0];
}

async function ensureMamulBom(client, mmId, ym1, ym2, hm1, hm2, hm3, hm4) {
    const mevcut = await client.query(`SELECT id FROM urun_agaclari WHERE mamul_stok_id=$1`, [mmId]);
    if (mevcut.rows[0]) {
        await client.query('DELETE FROM urun_agaci_satirlari WHERE urun_agaci_id=$1', [mevcut.rows[0].id]);
        const bomId = mevcut.rows[0].id;

        const ym1Satir = await client.query(
            `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
             VALUES ($1,$2,1,'AD',10) RETURNING id`,
            [bomId, ym1]
        );
        await client.query(
            `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no, ust_satir_id)
             VALUES ($1,$2,1,'AD',10,$3), ($1,$4,1,'AD',20,$3)`,
            [bomId, hm1, ym1Satir.rows[0].id, hm2]
        );

        const ym2Satir = await client.query(
            `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
             VALUES ($1,$2,1,'AD',20) RETURNING id`,
            [bomId, ym2]
        );
        await client.query(
            `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no, ust_satir_id)
             VALUES ($1,$2,1,'AD',10,$3), ($1,$4,1,'AD',20,$3)`,
            [bomId, hm3, ym2Satir.rows[0].id, hm4]
        );
        return bomId;
    }

    const ins = await client.query(
        `INSERT INTO urun_agaclari (mamul_stok_id, agac_kodu, agac_adi, miktar)
         VALUES ($1,'UA-MAMUL','Demo Cihaz Ürün Ağacı',1) RETURNING id`,
        [mmId]
    );
    const bomId = ins.rows[0].id;

    const ym1Satir = await client.query(
        `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
         VALUES ($1,$2,1,'AD',10) RETURNING id`,
        [bomId, ym1]
    );
    await client.query(
        `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no, ust_satir_id)
         VALUES ($1,$2,1,'AD',10,$3), ($1,$4,1,'AD',20,$3)`,
        [bomId, hm1, ym1Satir.rows[0].id, hm2]
    );

    const ym2Satir = await client.query(
        `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
         VALUES ($1,$2,1,'AD',20) RETURNING id`,
        [bomId, ym2]
    );
    await client.query(
        `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no, ust_satir_id)
         VALUES ($1,$2,1,'AD',10,$3), ($1,$4,1,'AD',20,$3)`,
        [bomId, hm3, ym2Satir.rows[0].id, hm4]
    );
    return bomId;
}

async function ensureMamulRota(client, mmId, ym1, ym2, hm1, hm2, hm3, hm4, merkezId) {
    const mevcut = await client.query(
        `SELECT id FROM rotalar WHERE rota_kodu = 'ROT-MAMUL' OR stok_id = $1 ORDER BY id LIMIT 1`,
        [mmId]
    );
    if (mevcut.rows[0]) {
        await client.query(
            `UPDATE rotalar SET stok_id=$2, rota_adi='Demo Cihaz Üretim Rotası' WHERE id=$1`,
            [mevcut.rows[0].id, mmId]
        );
        return mevcut.rows[0].id;
    }

    const ins = await client.query(
        `INSERT INTO rotalar (stok_id, rota_kodu, rota_adi)
         VALUES ($1,'ROT-MAMUL','Demo Cihaz Üretim Rotası') RETURNING id`,
        [mmId]
    );
    const rotaId = ins.rows[0].id;

    const op10 = await client.query(
        `INSERT INTO rota_operasyonlari
            (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id, sure_dk, cikti_stok_id, sonraki_sira_no)
         VALUES ($1,10,'OP10','Yarı Mamul 1 Montaj',$2,20,$3,20) RETURNING id`,
        [rotaId, merkezId, ym1]
    );
    await client.query(
        `INSERT INTO rota_operasyon_bilesenleri (operasyon_id, stok_id, miktar, birim) VALUES
         ($1,$2,1,'AD'), ($1,$3,1,'AD')`,
        [op10.rows[0].id, hm1, hm2]
    );

    const op20 = await client.query(
        `INSERT INTO rota_operasyonlari
            (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id, sure_dk, cikti_stok_id, sonraki_sira_no)
         VALUES ($1,20,'OP20','Yarı Mamul 2 Montaj',$2,20,$3,30) RETURNING id`,
        [rotaId, merkezId, ym2]
    );
    await client.query(
        `INSERT INTO rota_operasyon_bilesenleri (operasyon_id, stok_id, miktar, birim) VALUES
         ($1,$2,1,'AD'), ($1,$3,1,'AD')`,
        [op20.rows[0].id, hm3, hm4]
    );

    const op30 = await client.query(
        `INSERT INTO rota_operasyonlari
            (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id, sure_dk, cikti_stok_id, sonraki_sira_no)
         VALUES ($1,30,'OP30','Mamul Final Montaj',$2,30,$3,NULL) RETURNING id`,
        [rotaId, merkezId, mmId]
    );
    await client.query(
        `INSERT INTO rota_operasyon_bilesenleri (operasyon_id, stok_id, miktar, birim) VALUES
         ($1,$2,1,'AD'), ($1,$3,1,'AD')`,
        [op30.rows[0].id, ym1, ym2]
    );

    return rotaId;
}

async function tamamlaHazirOperasyon(client, emir, op, miktar) {
    const oran = miktar / Number(op.planlanan_miktar);
    const bilesenler = await client.query(
        `SELECT b.*, st.stok_tipi, st.birim AS stok_birimi
         FROM uretim_emri_operasyon_bilesenleri b
         JOIN stoklar st ON st.id = b.stok_id
         WHERE b.operasyon_id=$1 FOR UPDATE`,
        [op.id]
    );

    const depoGrup = new Map();
    for (const b of bilesenler.rows) {
        const depoId = b.stok_tipi === 'YariMamul'
            ? (emir.yari_mamul_depo_id || emir.hammadde_depo_id)
            : emir.hammadde_depo_id;
        if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
        depoGrup.get(depoId).push({
            stok_id: b.stok_id,
            miktar: Number(b.planlanan_miktar) * oran,
            yon: -1,
            birim: b.birim || b.stok_birimi,
        });
        await client.query(
            `UPDATE uretim_emri_operasyon_bilesenleri SET tuketilen_miktar = tuketilen_miktar + $1 WHERE id=$2`,
            [Number(b.planlanan_miktar) * oran, b.id]
        );
    }

    let tuketimHareketId = null;
    for (const [depoId, satirlar] of depoGrup.entries()) {
        const h = await stokHareketOlustur(client, {
            hareketTipi: 'URETIM_TUKETIM',
            isYeriId: emir.is_yeri_id,
            depoId,
            belgeTipi: 'URETIM_EMRI_OP',
            belgeId: op.id,
            aciklama: `${emir.emir_no}/${op.operasyon_kodu} tüketim`,
            satirlar,
        });
        tuketimHareketId = h.hareket.id;
    }

    let mamulHareketId = null;
    if (op.cikti_stok_id) {
        const cikti = await client.query('SELECT birim, stok_tipi FROM stoklar WHERE id=$1', [op.cikti_stok_id]);
        const ciktiDepo = cikti.rows[0].stok_tipi === 'Mamul'
            ? emir.mamul_depo_id
            : (emir.yari_mamul_depo_id || emir.mamul_depo_id);
        const h = await stokHareketOlustur(client, {
            hareketTipi: 'URETIM_GIRIS',
            isYeriId: emir.is_yeri_id,
            depoId: ciktiDepo,
            belgeTipi: 'URETIM_EMRI_OP',
            belgeId: op.id,
            aciklama: `${emir.emir_no}/${op.operasyon_kodu} çıktı`,
            satirlar: [{ stok_id: op.cikti_stok_id, miktar, yon: 1, birim: cikti.rows[0].birim }],
        });
        mamulHareketId = h.hareket.id;
    }

    await client.query(
        `UPDATE uretim_emri_operasyonlari SET uretilen_miktar=uretilen_miktar+$1, durum='Tamamlandi' WHERE id=$2`,
        [miktar, op.id]
    );
    if (op.sonraki_sira_no) {
        await client.query(
            `UPDATE uretim_emri_operasyonlari SET durum='Hazir'
             WHERE emir_id=$1 AND sira_no=$2 AND durum='Bekliyor'`,
            [emir.id, op.sonraki_sira_no]
        );
    }
    if (op.cikti_stok_id === emir.stok_id) {
        await client.query(
            `UPDATE uretim_emirleri SET uretilen_miktar=uretilen_miktar+$1, durum='Uretimde' WHERE id=$2`,
            [miktar, emir.id]
        );
    }

    const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
    await client.query(
        `INSERT INTO uretim_girisleri (giris_no, emir_id, miktar, tuketim_hareket_id, mamul_hareket_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [girisNo, emir.id, miktar, tuketimHareketId, mamulHareketId]
    );
}

async function main() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: requiredEnv('DB_NAME'),
        user: requiredEnv('DB_USER'),
        password: requiredEnv('DB_PASSWORD'),
    });

    console.log('=== ERP Demo Döngüsü (tek ürün ağacı + operasyon sırası) ===');

    // Eski ayrı YM BOM kayıtlarını kaldır (görünüm karışıklığı olmasın)
    await pool.query(`DELETE FROM urun_agaclari WHERE agac_kodu IN ('BOM-YM1','BOM-YM2')`);

    const ozet = await withTransaction(pool, async (client) => {
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

        const anaDepo = await ensureDepo(client, isYeriId, 'Ana Depo (Hammadde)', true);
        const ymDepo = await ensureDepo(client, isYeriId, 'Yarı Mamul Depo', false);
        const mmDepo = await ensureDepo(client, isYeriId, 'Mamul Depo', false);
        const anaDepoId = anaDepo.id;
        const ymDepoId = ymDepo.id;
        const mmDepoId = mmDepo.id;

        const tedarikci = await ensureCari(client, {
            cari_adi: 'Demo Tedarikçi A.Ş.',
            cari_turu: 'Tedarikci',
            telefon: '02121234567',
            email: 'satinalma@demotedarikci.com',
            vergi_no: '1234567890',
            vergi_dairesi: 'Kadıköy',
            yetkili_adi: 'Ayşe Tedarik',
            yetkili_telefon: '05321112233',
            adres: 'Sanayi Cad. No:10',
            il: 'İstanbul',
            ilce: 'Pendik',
            odeme_vadesi_gun: 30,
            is_yeri_id: isYeriId,
            notlar: 'Ana hammadde tedarikçisi',
        });
        const musteri = await ensureCari(client, {
            cari_adi: 'Demo Müşteri Ltd.',
            cari_turu: 'Musteri',
            telefon: '02129876543',
            email: 'siparis@demomusteri.com',
            vergi_no: '0987654321',
            vergi_dairesi: 'Beşiktaş',
            yetkili_adi: 'Mehmet Alıcı',
            yetkili_telefon: '05329876543',
            adres: 'Bağdat Cad. No:5',
            il: 'İstanbul',
            ilce: 'Kadıköy',
            odeme_vadesi_gun: 45,
            is_yeri_id: isYeriId,
            notlar: 'Satış siparişleri bu cariye açılır',
        });
        const cariId = tedarikci.id;

        const stokBag = { birim: 'AD', is_yeri_id: isYeriId };
        const hm1r = await ensureStok(client, { ...stokBag, stok_adi: 'Hammadde 1 - Çelik Sac', satis_fiyati: 0, stok_tipi: 'Hammadde', tedarik_tipi: 'Satinalma' });
        const hm2r = await ensureStok(client, { ...stokBag, stok_adi: 'Hammadde 2 - Vida Seti', satis_fiyati: 0, stok_tipi: 'Hammadde', tedarik_tipi: 'Satinalma' });
        const hm3r = await ensureStok(client, { ...stokBag, stok_adi: 'Hammadde 3 - Plastik Gövde', satis_fiyati: 0, stok_tipi: 'Hammadde', tedarik_tipi: 'Satinalma' });
        const hm4r = await ensureStok(client, { ...stokBag, stok_adi: 'Hammadde 4 - Elektronik Kart', satis_fiyati: 0, stok_tipi: 'Hammadde', tedarik_tipi: 'Satinalma' });
        const ym1r = await ensureStok(client, { ...stokBag, stok_adi: 'Yarı Mamul 1 - Gövde Montajı', satis_fiyati: 0, stok_tipi: 'YariMamul', tedarik_tipi: 'Uretim' });
        const ym2r = await ensureStok(client, { ...stokBag, stok_adi: 'Yarı Mamul 2 - Elektronik Montaj', satis_fiyati: 0, stok_tipi: 'YariMamul', tedarik_tipi: 'Uretim' });
        const mm1r = await ensureStok(client, { ...stokBag, stok_adi: 'Mamul - Demo Cihaz', satis_fiyati: 1500, stok_tipi: 'Mamul', tedarik_tipi: 'Uretim' });
        const hm1 = hm1r.id, hm2 = hm2r.id, hm3 = hm3r.id, hm4 = hm4r.id;
        const ym1 = ym1r.id, ym2 = ym2r.id, mm1 = mm1r.id;

        const bomId = await ensureMamulBom(client, mm1, ym1, ym2, hm1, hm2, hm3, hm4);

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
        const rotaId = await ensureMamulRota(client, mm1, ym1, ym2, hm1, hm2, hm3, hm4, merkezId);

        // Satınalma talebi + sipariş + mal kabul
        const talepNo = await sonrakiBelgeNo(client, 'SATINALMA_TALEP');
        const talep = await client.query(
            `INSERT INTO satin_alma_talepleri (talep_no, is_yeri_id, aciklama, durum)
             VALUES ($1,$2,'Demo 4 hammadde talebi','Acik') RETURNING id`,
            [talepNo, isYeriId]
        );
        const talepId = talep.rows[0].id;
        for (const sid of [hm1, hm2, hm3, hm4]) {
            await client.query(
                `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim) VALUES ($1,$2,10,'AD')`,
                [talepId, sid]
            );
        }

        const sasNo = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
        const sas = await client.query(
            `INSERT INTO satin_alma_siparisleri
                (siparis_no, cari_id, is_yeri_id, talep_id, durum, toplam_tutar)
             VALUES ($1,$2,$3,$4,'Onayli',1000) RETURNING id`,
            [sasNo, cariId, isYeriId, talepId]
        );
        const sasId = sas.rows[0].id;
        const talepSatir = await client.query(
            'SELECT * FROM satin_alma_talep_satirlari WHERE talep_id=$1',
            [talepId]
        );
        for (const ts of talepSatir.rows) {
            await client.query(
                `INSERT INTO satin_alma_siparis_satirlari
                    (siparis_id, talep_satir_id, stok_id, miktar, birim_fiyat, birim)
                 VALUES ($1,$2,$3,10,25,'AD')`,
                [sasId, ts.id, ts.stok_id]
            );
        }
        await client.query(`UPDATE satin_alma_talepleri SET durum='SipariseDonustu' WHERE id=$1`, [talepId]);

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

        // Tek iş emri + operasyonlar
        const miktar = 5;
        const emirNo = await sonrakiBelgeNo(client, 'URETIM_EMRI');
        const emirIns = await client.query(
            `INSERT INTO uretim_emirleri
                (emir_no, stok_id, urun_agaci_id, rota_id, is_yeri_id,
                 hammadde_depo_id, yari_mamul_depo_id, mamul_depo_id,
                 planlanan_miktar, durum)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Acik') RETURNING *`,
            [emirNo, mm1, bomId, rotaId, isYeriId, anaDepoId, ymDepoId, mmDepoId, miktar]
        );
        const emir = emirIns.rows[0];

        const rotaOps = await client.query(
            'SELECT * FROM rota_operasyonlari WHERE rota_id=$1 ORDER BY sira_no',
            [rotaId]
        );
        let ilk = true;
        for (const op of rotaOps.rows) {
            const opIns = await client.query(
                `INSERT INTO uretim_emri_operasyonlari
                    (emir_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id,
                     cikti_stok_id, sonraki_sira_no, planlanan_miktar, durum)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
                [
                    emir.id, op.sira_no, op.operasyon_kodu, op.operasyon_adi, op.is_merkezi_id,
                    op.cikti_stok_id, op.sonraki_sira_no, miktar, ilk ? 'Hazir' : 'Bekliyor',
                ]
            );
            ilk = false;
            const bilesenler = await client.query(
                'SELECT * FROM rota_operasyon_bilesenleri WHERE operasyon_id=$1',
                [op.id]
            );
            for (const b of bilesenler.rows) {
                await client.query(
                    `INSERT INTO uretim_emri_operasyon_bilesenleri
                        (operasyon_id, stok_id, planlanan_miktar, birim)
                     VALUES ($1,$2,$3,$4)`,
                    [opIns.rows[0].id, b.stok_id, Number(b.miktar) * miktar, b.birim]
                );
            }
        }

        // Operasyonları sırayla tamamla
        const adimKodlari = [];
        for (;;) {
            const hazir = await client.query(
                `SELECT * FROM uretim_emri_operasyonlari
                 WHERE emir_id=$1 AND durum='Hazir' ORDER BY sira_no LIMIT 1 FOR UPDATE`,
                [emir.id]
            );
            if (!hazir.rows[0]) break;
            const guncelEmir = (await client.query('SELECT * FROM uretim_emirleri WHERE id=$1', [emir.id])).rows[0];
            await tamamlaHazirOperasyon(client, guncelEmir, hazir.rows[0], miktar);
            adimKodlari.push(hazir.rows[0].operasyon_kodu);
        }
        await client.query(`UPDATE uretim_emirleri SET durum='Kapali' WHERE id=$1`, [emir.id]);

        return {
            talepNo, sasNo, mkNo, emirNo, adimKodlari, bomId, rotaId,
            kodlar: {
                tedarikci: tedarikci.cari_kodu,
                musteri: musteri.cari_kodu,
                stoklar: [hm1r, hm2r, hm3r, hm4r, ym1r, ym2r, mm1r].map((s) => s.stok_kodu),
                depolar: [anaDepo.depo_kodu, ymDepo.depo_kodu, mmDepo.depo_kodu],
            },
        };
    });

    const bakiyeler = await depoBakiyeListesi(pool);
    console.log('\n--- Kod sistemi ---');
    console.log('Tedarikçi:', ozet.kodlar.tedarikci, '| Müşteri:', ozet.kodlar.musteri);
    console.log('Stoklar  :', ozet.kodlar.stoklar.join(', '));
    console.log('Depolar  :', ozet.kodlar.depolar.join(', '));
    console.log('\n--- Döngü özeti ---');
    console.log('Ürün ağacı      : tek mamul ağacı (UA-MAMUL)');
    console.log('Rota            :', ozet.adimKodlari.join(' → '));
    console.log('Satınalma talebi:', ozet.talepNo);
    console.log('Satınalma sipariş:', ozet.sasNo, '(tedarikçiye)');
    console.log('Mal kabul       :', ozet.mkNo);
    console.log('İş emri         :', ozet.emirNo);
    console.log('\n--- Depo bakiyeleri ---');
    for (const b of bakiyeler) {
        console.log(`${b.depo_kodu} | ${b.stok_kodu} | ${b.stok_adi} | bakiye=${b.bakiye}`);
    }
    console.log('\n=== Demo tamam ===');
    console.log('UI: http://localhost:3000/');

    await pool.end();
}

main().catch((err) => {
    console.error('Demo döngüsü hatası:', err.message);
    console.error(err.stack);
    process.exit(1);
});
