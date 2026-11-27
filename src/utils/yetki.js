/**
 * Basit kullanıcı/grup yetki yardımcıları.
 * İsteklerde X-Kullanici-Kodu header veya body.user_code ile kullanıcı seçilir
 * (JWT henüz yok — A1 infra notu).
 */

async function parametreAl(clientOrPool, kod, varsayilan = null) {
    const r = await clientOrPool.query(
        `SELECT value FROM system_parameters WHERE parametre_code=$1 AND is_active=TRUE`,
        [kod]
    );
    const v = r.rows[0]?.value;
    if (v === undefined || v === null || v === '') return varsayilan;
    return v;
}

function isTamYetkili(kullanici) {
    if (!kullanici) return false;
    if (kullanici.group_code === 'ADMIN') return true;
    if (String(kullanici.role || '').toLowerCase() === 'yonetici') return true;
    return false;
}

async function kullaniciGetir(clientOrPool, kullaniciKodu) {
    if (!kullaniciKodu) return null;
    const r = await clientOrPool.query(
        `SELECT k.*, g.satinalma_onay, g.purchase_requisition_ref, g.kalite_control, g.group_name,
                g.module_permissions, g.warehouse_yetkileri
         FROM users k
         LEFT JOIN user_groups g ON g.group_code = k.group_code AND g.is_active = TRUE
         WHERE k.user_code = $1 OR k.username = $1`,
        [kullaniciKodu]
    );
    return r.rows[0] || null;
}

function reqKullaniciKodu(req) {
    return (
        req.get?.('x-kullanici-kodu') ||
        req.headers?.['x-kullanici-kodu'] ||
        req.body?.user_code ||
        req.query?.user_code ||
        null
    );
}

async function assertYetki(clientOrPool, kullaniciKodu, alan, message) {
    const kullanici = await kullaniciGetir(clientOrPool, kullaniciKodu);
    if (!kullanici) {
        const err = new Error(message || `Yetkili kullanıcı gerekli (${alan}). X-Kullanici-Kodu gönderin.`);
        err.status = 401;
        throw err;
    }
    if (kullanici.is_active === false) {
        const err = new Error('Kullanıcı is_inactive.');
        err.status = 403;
        throw err;
    }
    if (isTamYetkili(kullanici)) return kullanici;

    if (alan === 'satinalma_onay') {
        const onayGrup = await parametreAl(clientOrPool, 'SATINALMA_ONAY_GRUP', 'SATINALMA');
        const ok = Boolean(kullanici.satinalma_onay) || kullanici.group_code === onayGrup;
        if (!ok) {
            const err = new Error('Satınalma onay yetkisi yok (SATINALMA grubu gerekli).');
            err.status = 403;
            throw err;
        }
    } else if (alan === 'purchase_requisition_ref') {
        // Grupta purchase_requisition_ref false ise engelle; kolon yoksa veya true ise izin ver
        if (kullanici.purchase_requisition_ref === false) {
            const err = new Error('Satınalma talep oluşturma yetkisi yok.');
            err.status = 403;
            throw err;
        }
    } else if (alan === 'kalite_control') {
        if (!kullanici.kalite_control) {
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
