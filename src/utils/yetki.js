/**
 * Basit kullanıcı/grup yetki yardımcıları.
 * İsteklerde X-Kullanici-Kodu header veya body.user_code ile kullanıcı seçilir
 * (JWT henüz yok — A1 infra notu).
 */

async function parametreAl(clientOrPool, kod, varsayilan = null) {
    const r = await clientOrPool.query(
        `SELECT value FROM system_parameters WHERE parameter_code=$1 AND is_active=TRUE`,
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

async function getUser(clientOrPool, kullaniciKodu) {
    if (!kullaniciKodu) return null;
    const r = await clientOrPool.query(
        `SELECT k.*, g.can_approve_purchase, g.purchase_requisition_ref, g.can_quality_control, g.group_name,
                g.module_permissions, g.warehouse_permissions
         FROM users k
         LEFT JOIN user_groups g ON g.group_code = k.group_code AND g.is_active = TRUE
         WHERE k.user_code = $1 OR k.username = $1`,
        [kullaniciKodu]
    );
    return r.rows[0] || null;
}

function reqUserCode(req) {
    return (
        req.get?.('x-kullanici-kodu') ||
        req.headers?.['x-kullanici-kodu'] ||
        req.body?.user_code ||
        req.query?.user_code ||
        null
    );
}

async function assertPermission(clientOrPool, kullaniciKodu, alan, message) {
    const kullanici = await getUser(clientOrPool, kullaniciKodu);
    if (!kullanici) {
        const err = new Error(message || `Yetkili kullanıcı gerekli (${alan}). X-Kullanici-Kodu gönderin.`);
        err.status = 401;
        throw err;
    }
    if (kullanici.is_active === false) {
        const err = new Error('Kullanıcı pasif.');
        err.status = 403;
        throw err;
    }
    if (isTamYetkili(kullanici)) return kullanici;

    if (alan === 'can_approve_purchase') {
        const onayGrup = await parametreAl(clientOrPool, 'SATINALMA_ONAY_GRUP', 'SATINALMA');
        const ok = Boolean(kullanici.can_approve_purchase) || kullanici.group_code === onayGrup;
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
    } else if (alan === 'can_quality_control') {
        if (!kullanici.can_quality_control) {
            const err = new Error('Kalite kontrol yetkisi yok (KALITE grubu gerekli).');
            err.status = 403;
            throw err;
        }
    }
    return kullanici;
}

module.exports = {
    parametreAl,
    getUser,
    reqUserCode,
    assertPermission,
    isTamYetkili,
};
