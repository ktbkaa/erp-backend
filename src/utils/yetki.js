/**
 * Basit kullanıcı/grup yetki yardımcıları.
 * İsteklerde X-Kullanici-Kodu header veya body.kullanici_kodu ile kullanıcı seçilir
 * (JWT henüz yok — A1 infra notu).
 */

async function parametreAl(clientOrPool, kod, varsayilan = null) {
    const r = await clientOrPool.query(
        `SELECT deger FROM sistem_parametreleri WHERE parametre_kodu=$1 AND aktif=TRUE`,
        [kod]
    );
    const v = r.rows[0]?.deger;
    if (v === undefined || v === null || v === '') return varsayilan;
    return v;
}

function isTamYetkili(kullanici) {
    if (!kullanici) return false;
    if (kullanici.grup_kodu === 'ADMIN') return true;
    if (String(kullanici.rol || '').toLowerCase() === 'yonetici') return true;
    return false;
}

async function kullaniciGetir(clientOrPool, kullaniciKodu) {
    if (!kullaniciKodu) return null;
    const r = await clientOrPool.query(
        `SELECT k.*, g.satinalma_onay, g.satinalma_talep, g.kalite_kontrol, g.grup_adi,
                g.modul_yetkileri, g.depo_yetkileri
         FROM kisiler k
         LEFT JOIN kullanici_gruplari g ON g.grup_kodu = k.grup_kodu AND g.aktif = TRUE
         WHERE k.kullanici_kodu = $1 OR k.kullanici_adi = $1`,
        [kullaniciKodu]
    );
    return r.rows[0] || null;
}

function reqKullaniciKodu(req) {
    return (
        req.get?.('x-kullanici-kodu') ||
        req.headers?.['x-kullanici-kodu'] ||
        req.body?.kullanici_kodu ||
        req.query?.kullanici_kodu ||
        null
    );
}

async function assertYetki(clientOrPool, kullaniciKodu, alan, mesaj) {
    const kullanici = await kullaniciGetir(clientOrPool, kullaniciKodu);
    if (!kullanici) {
        const err = new Error(mesaj || `Yetkili kullanıcı gerekli (${alan}). X-Kullanici-Kodu gönderin.`);
        err.status = 401;
        throw err;
    }
    if (kullanici.aktif === false) {
        const err = new Error('Kullanıcı pasif.');
        err.status = 403;
        throw err;
    }
    if (isTamYetkili(kullanici)) return kullanici;

    if (alan === 'satinalma_onay') {
        const onayGrup = await parametreAl(clientOrPool, 'SATINALMA_ONAY_GRUP', 'SATINALMA');
        const ok = Boolean(kullanici.satinalma_onay) || kullanici.grup_kodu === onayGrup;
        if (!ok) {
            const err = new Error('Satınalma onay yetkisi yok (SATINALMA grubu gerekli).');
            err.status = 403;
            throw err;
        }
    } else if (alan === 'satinalma_talep') {
        // Grupta satinalma_talep false ise engelle; kolon yoksa veya true ise izin ver
        if (kullanici.satinalma_talep === false) {
            const err = new Error('Satınalma talep oluşturma yetkisi yok.');
            err.status = 403;
            throw err;
        }
    } else if (alan === 'kalite_kontrol') {
        if (!kullanici.kalite_kontrol) {
            const err = new Error('Kalite kontrol yetkisi yok (KALITE grubu gerekli).');
            err.status = 403;
            throw err;
        }
    }
    return kullanici;
}

module.exports = {
    parametreAl,
    kullaniciGetir,
    reqKullaniciKodu,
    assertYetki,
    isTamYetkili,
};
