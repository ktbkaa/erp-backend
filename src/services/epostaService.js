const { parametreAl } = require('../utils/yetki');

/**
 * E-posta kuyruğu. SMTP yapılandırılmadıysa kayıt Bekliyor kalır veya
 * SMTP_HOST boşken deneme Basarisiz + açıklayıcı hata yazar; retry desteklenir.
 */
async function epostaKuyrugaAl(client, {
    kaynakTipi,
    kaynakId,
    alici,
    konu,
    govde,
}) {
    if (!alici) throw new Error('E-posta alıcısı zorunlu.');
    const r = await client.query(
        `
        INSERT INTO email_dispatches (source_type, source_id, alici, konu, govde, status)
        VALUES ($1,$2,$3,$4,$5,'Bekliyor')
        RETURNING *
        `,
        [kaynakTipi, kaynakId, alici, konu, govde || null]
    );
    return r.rows[0];
}

async function smtpAyarlari(clientOrPool) {
    const host = await parametreAl(clientOrPool, 'SMTP_HOST', '');
    const port = Number(await parametreAl(clientOrPool, 'SMTP_PORT', '587')) || 587;
    const user = await parametreAl(clientOrPool, 'SMTP_USER', '');
    const pass = await parametreAl(clientOrPool, 'SMTP_PASS', '');
    const from = await parametreAl(clientOrPool, 'SMTP_FROM', user || 'noreply@localhost');
    const secure = String(await parametreAl(clientOrPool, 'SMTP_SECURE', 'Hayir')).toLowerCase() === 'evet';
    return { host, port, user, pass, from, secure };
}

async function gonderBir(clientOrPool, kayitId) {
    const kayitRes = await clientOrPool.query(
        `SELECT * FROM email_dispatches WHERE id=$1 FOR UPDATE`,
        [kayitId]
    );
    const kayit = kayitRes.rows[0];
    if (!kayit) throw new Error('E-posta kaydı bulunamadı.');
    if (kayit.status === 'Gonderildi') return kayit;

    const smtp = await smtpAyarlari(clientOrPool);
    const deneme = Number(kayit.deneme_sayisi || 0) + 1;

    if (!smtp.host) {
        await clientOrPool.query(
            `
            UPDATE email_dispatches SET
                status='Basarisiz',
                deneme_sayisi=$2,
                son_hata=$3,
                gonderim_date=CURRENT_TIMESTAMP
            WHERE id=$1
            `,
            [
                kayitId,
                deneme,
                'SMTP_HOST tanımlı değil. Sistem Parametreleri: SMTP_HOST/PORT/USER/PASS/FROM ayarlayın.',
            ]
        );
        const r = await clientOrPool.query(`SELECT * FROM email_dispatches WHERE id=$1`, [kayitId]);
        return r.rows[0];
    }

    try {
        // Ağır bağımlılık yok: net.Socket ile basit SMTP değil — yapılandırma varsa
        // nodemailer opsiyonel; yoksa net üzerinden minimal doğrulama mesajı.
        let nodemailer;
        try {
            nodemailer = require('nodemailer');
        } catch (_) {
            nodemailer = null;
        }

        if (!nodemailer) {
            throw new Error(
                'nodemailer yüklü değil. `npm i nodemailer` ve SMTP_* parametrelerini ayarlayın. Kayıt kuyrukta tutuluyor.'
            );
        }

        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
        });
        await transporter.sendMail({
            from: smtp.from,
            to: kayit.alici,
            subject: kayit.konu,
            text: kayit.govde || '',
        });

        await clientOrPool.query(
            `
            UPDATE email_dispatches SET
                status='Gonderildi',
                deneme_sayisi=$2,
                son_hata=NULL,
                gonderim_date=CURRENT_TIMESTAMP
            WHERE id=$1
            `,
            [kayitId, deneme]
        );
    } catch (err) {
        await clientOrPool.query(
            `
            UPDATE email_dispatches SET
                status='Basarisiz',
                deneme_sayisi=$2,
                son_hata=$3,
                gonderim_date=CURRENT_TIMESTAMP
            WHERE id=$1
            `,
            [kayitId, deneme, String(err.message || err).slice(0, 2000)]
        );
    }

    const r = await clientOrPool.query(`SELECT * FROM email_dispatches WHERE id=$1`, [kayitId]);
    return r.rows[0];
}

async function yenidenDene(clientOrPool, kayitId) {
    await clientOrPool.query(
        `UPDATE email_dispatches SET status='Bekliyor', son_hata=NULL WHERE id=$1 AND status='Basarisiz'`,
        [kayitId]
    );
    return gonderBir(clientOrPool, kayitId);
}

module.exports = {
    epostaKuyrugaAl,
    gonderBir,
    yenidenDene,
    smtpAyarlari,
};
