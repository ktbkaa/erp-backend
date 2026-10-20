/**
 * Merkezi onay motoru (v1).
 * Belge ekranlarındaki tek tuş /onayla ile sonradan bağlanabilir.
 */
const { sonrakiKod } = require('../utils/kodUretici');
const { isTamYetkili } = require('../utils/yetki');

async function kayitGetir(client, id) {
  const baslik = await client.query(
    `
    SELECT k.*,
           d.durum_adi,
           r.rota_kodu, r.rota_adi,
           ku.kullanim_kodu, ku.kullanim_adi,
           CONCAT(COALESCE(b.ad,''), ' ', COALESCE(b.soyad,'')) AS baslatan_adi,
           b.kullanici_kodu AS baslatan_kodu
    FROM onay_kayitlari k
    LEFT JOIN onay_durumlari d ON d.durum_kodu = k.durum_kodu
    LEFT JOIN onay_rotalari r ON r.id = k.rota_id
    LEFT JOIN onay_modul_kullanimlari ku ON ku.id = k.kullanim_id
    LEFT JOIN kisiler b ON b.id = k.baslatan_kisi_id
    WHERE k.id = $1
    `,
    [id],
  );
  if (!baslik.rows[0]) return null;
  const adimlar = await client.query(
    `
    SELECT a.*,
           rol.rol_kodu, rol.rol_adi,
           d.durum_adi,
           CONCAT(COALESCE(o.ad,''), ' ', COALESCE(o.soyad,'')) AS onaylayan_adi,
           o.kullanici_kodu AS onaylayan_kodu
    FROM onay_kayit_adimlari a
    JOIN onay_rolleri rol ON rol.id = a.rol_id
    LEFT JOIN onay_durumlari d ON d.durum_kodu = a.durum_kodu
    LEFT JOIN kisiler o ON o.id = a.onaylayan_kisi_id
    WHERE a.kayit_id = $1
    ORDER BY a.sira_no
    `,
    [id],
  );
  return { ...baslik.rows[0], adimlar: adimlar.rows };
}

/** Kullanıcının (veya devraldığı) rol id listesi */
async function kullaniciRolIdleri(client, kisiId) {
  if (!kisiId) return [];
  const kisi = await client.query(
    `SELECT id, grup_kodu FROM kisiler WHERE id = $1`,
    [kisiId],
  );
  if (!kisi.rows[0]) return [];
  const grup = kisi.rows[0].grup_kodu;

  const dogrudan = await client.query(
    `
    SELECT DISTINCT u.rol_id
    FROM onay_rol_uyeleri u
    WHERE u.aktif = TRUE
      AND (u.kisi_id = $1 OR (u.grup_kodu IS NOT NULL AND u.grup_kodu = $2))
    `,
    [kisiId, grup],
  );
  const roller = new Set(dogrudan.rows.map((r) => Number(r.rol_id)));

  // Yetki devri: başkası bana devretti
  const devir = await client.query(
    `
    SELECT DISTINCT COALESCE(d.rol_id, u.rol_id) AS rol_id
    FROM onay_yetki_devirleri d
    LEFT JOIN onay_rol_uyeleri u
      ON u.kisi_id = d.veren_kisi_id AND u.aktif = TRUE AND d.rol_id IS NULL
    WHERE d.alan_kisi_id = $1
      AND d.aktif = TRUE
      AND d.baslangic_tarihi <= CURRENT_DATE
      AND (d.bitis_tarihi IS NULL OR d.bitis_tarihi >= CURRENT_DATE)
    `,
    [kisiId],
  );
  for (const r of devir.rows) {
    if (r.rol_id) roller.add(Number(r.rol_id));
  }
  return [...roller];
}

function adimTutarUygun(adim, tutar) {
  if (adim.min_tutar == null) return true;
  return Number(tutar || 0) >= Number(adim.min_tutar);
}

/**
 * Onay sürecini başlatır (rota kopyası → kayıt adımları).
 */
async function baslatOnay(client, {
  ekran_id,
  modul_kodu,
  belge_id = null,
  belge_no = null,
  belge_ozet = null,
  tutar = 0,
  para_birimi = 'TRY',
  firma_id = null,
  baslatan_kisi_id = null,
  rota_id = null,
  kullanim_id = null,
  aciklama = null,
}) {
  if (!ekran_id && !rota_id) {
    const err = new Error('ekran_id veya rota_id gerekli.');
    err.status = 400;
    throw err;
  }

  let kullanim = null;
  if (kullanim_id) {
    const r = await client.query(
      `SELECT * FROM onay_modul_kullanimlari WHERE id = $1 AND aktif = TRUE`,
      [kullanim_id],
    );
    kullanim = r.rows[0];
  } else if (ekran_id) {
    const params = [ekran_id];
    let sql = `
      SELECT * FROM onay_modul_kullanimlari
      WHERE ekran_id = $1 AND aktif = TRUE
    `;
    if (firma_id) {
      params.push(firma_id);
      sql += ` AND (firma_id IS NULL OR firma_id = $${params.length})`;
    }
    sql += ` ORDER BY firma_id NULLS LAST LIMIT 1`;
    const r = await client.query(sql, params);
    kullanim = r.rows[0];
  }

  const rotaId = rota_id || kullanim?.rota_id;
  if (!rotaId) {
    const err = new Error('Bu ekran için aktif onay rotası / modül kullanımı yok.');
    err.status = 400;
    throw err;
  }

  if (kullanim && Number(tutar || 0) < Number(kullanim.min_tutar || 0)) {
    return {
      atlandi: true,
      neden: 'min_tutar_alti',
      min_tutar: kullanim.min_tutar,
      tutar,
    };
  }

  // Aynı belge için açık kayıt varsa yenileme
  if (belge_id && ekran_id) {
    const open = await client.query(
      `
      SELECT id FROM onay_kayitlari
      WHERE ekran_id = $1 AND belge_id = $2 AND durum_kodu = 'BEKLIYOR'
      LIMIT 1
      `,
      [ekran_id || kullanim?.ekran_id, belge_id],
    );
    if (open.rows[0]) {
      return kayitGetir(client, open.rows[0].id);
    }
  }

  const sablonAdimlar = await client.query(
    `
    SELECT * FROM onay_rota_adimlari
    WHERE rota_id = $1
    ORDER BY sira_no
    `,
    [rotaId],
  );
  if (!sablonAdimlar.rows.length) {
    const err = new Error('Rotada adım tanımı yok.');
    err.status = 400;
    throw err;
  }

  const uygulanacak = sablonAdimlar.rows.filter((a) => adimTutarUygun(a, tutar));
  if (!uygulanacak.length) {
    return { atlandi: true, neden: 'adim_tutar_filtresi', tutar };
  }

  let onayNo;
  try {
    onayNo = await sonrakiKod(client, 'ONAY_KAYIT');
  } catch (_) {
    const n = await client.query(`SELECT COUNT(*)::int + 1 AS n FROM onay_kayitlari`);
    onayNo = `OK${String(n.rows[0].n).padStart(5, '0')}`;
  }

  const kayit = await client.query(
    `
    INSERT INTO onay_kayitlari (
      onay_no, kullanim_id, rota_id, firma_id, modul_kodu, ekran_id,
      belge_id, belge_no, belge_ozet, tutar, para_birimi, durum_kodu,
      aktif_adim_sira, baslatan_kisi_id, aciklama
    ) VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,$10,$11,'BEKLIYOR',
      $12,$13,$14
    ) RETURNING id
    `,
    [
      onayNo,
      kullanim?.id || null,
      rotaId,
      firma_id || kullanim?.firma_id || null,
      modul_kodu || kullanim?.modul_kodu || 'Genel',
      ekran_id || kullanim?.ekran_id,
      belge_id,
      belge_no,
      belge_ozet,
      tutar || 0,
      para_birimi || 'TRY',
      uygulanacak[0].sira_no,
      baslatan_kisi_id,
      aciklama,
    ],
  );
  const kayitId = kayit.rows[0].id;

  for (const a of uygulanacak) {
    await client.query(
      `
      INSERT INTO onay_kayit_adimlari (
        kayit_id, sira_no, adim_adi, rol_id, durum_kodu, zorunlu
      ) VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        kayitId,
        a.sira_no,
        a.adim_adi,
        a.rol_id,
        a.sira_no === uygulanacak[0].sira_no ? 'BEKLIYOR' : 'TASLAK',
        a.zorunlu,
      ],
    );
  }

  return kayitGetir(client, kayitId);
}

async function assertAdimYetkisi(client, adim, kullanici) {
  if (!kullanici) {
    const err = new Error('Onay için kullanıcı gerekli (X-Kullanici-Kodu / JWT).');
    err.status = 401;
    throw err;
  }
  if (isTamYetkili(kullanici)) return true;
  const roller = await kullaniciRolIdleri(client, kullanici.id);
  if (!roller.includes(Number(adim.rol_id))) {
    const err = new Error(`Bu adım için onay rolünüz yok (${adim.rol_adi || adim.rol_id}).`);
    err.status = 403;
    throw err;
  }
  return true;
}

async function onaylaAdim(client, kayitId, kullanici, { notlar = null } = {}) {
  const kayit = await kayitGetir(client, kayitId);
  if (!kayit) {
    const err = new Error('Onay kaydı bulunamadı.');
    err.status = 404;
    throw err;
  }
  if (kayit.durum_kodu !== 'BEKLIYOR') {
    const err = new Error(`Kayıt onaylanamaz. Durum: ${kayit.durum_kodu}`);
    err.status = 409;
    throw err;
  }

  const aktif = kayit.adimlar.find(
    (a) => a.sira_no === kayit.aktif_adim_sira && a.durum_kodu === 'BEKLIYOR',
  );
  if (!aktif) {
    const err = new Error('Aktif onay adımı yok.');
    err.status = 409;
    throw err;
  }

  await assertAdimYetkisi(client, aktif, kullanici);

  await client.query(
    `
    UPDATE onay_kayit_adimlari SET
      durum_kodu = 'ONAYLANDI',
      onaylayan_kisi_id = $2,
      islem_tarihi = CURRENT_TIMESTAMP,
      notlar = COALESCE($3, notlar)
    WHERE id = $1
    `,
    [aktif.id, kullanici.id, notlar],
  );

  const sonraki = kayit.adimlar.find((a) => a.sira_no > aktif.sira_no);
  if (sonraki) {
    await client.query(
      `UPDATE onay_kayit_adimlari SET durum_kodu = 'BEKLIYOR' WHERE id = $1`,
      [sonraki.id],
    );
    await client.query(
      `UPDATE onay_kayitlari SET aktif_adim_sira = $2 WHERE id = $1`,
      [kayitId, sonraki.sira_no],
    );
  } else {
    await client.query(
      `
      UPDATE onay_kayitlari SET
        durum_kodu = 'ONAYLANDI',
        aktif_adim_sira = NULL,
        kapanis_tarihi = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [kayitId],
    );
  }

  return kayitGetir(client, kayitId);
}

async function reddetAdim(client, kayitId, kullanici, { notlar = null } = {}) {
  const kayit = await kayitGetir(client, kayitId);
  if (!kayit) {
    const err = new Error('Onay kaydı bulunamadı.');
    err.status = 404;
    throw err;
  }
  if (kayit.durum_kodu !== 'BEKLIYOR') {
    const err = new Error(`Kayıt reddedilemez. Durum: ${kayit.durum_kodu}`);
    err.status = 409;
    throw err;
  }
  const aktif = kayit.adimlar.find(
    (a) => a.sira_no === kayit.aktif_adim_sira && a.durum_kodu === 'BEKLIYOR',
  );
  if (!aktif) {
    const err = new Error('Aktif onay adımı yok.');
    err.status = 409;
    throw err;
  }
  await assertAdimYetkisi(client, aktif, kullanici);

  await client.query(
    `
    UPDATE onay_kayit_adimlari SET
      durum_kodu = 'REDDEDILDI',
      onaylayan_kisi_id = $2,
      islem_tarihi = CURRENT_TIMESTAMP,
      notlar = COALESCE($3, notlar)
    WHERE id = $1
    `,
    [aktif.id, kullanici.id, notlar],
  );
  await client.query(
    `
    UPDATE onay_kayitlari SET
      durum_kodu = 'REDDEDILDI',
      aktif_adim_sira = NULL,
      kapanis_tarihi = CURRENT_TIMESTAMP,
      aciklama = COALESCE($2, aciklama)
    WHERE id = $1
    `,
    [kayitId, notlar],
  );
  return kayitGetir(client, kayitId);
}

async function iptalKayit(client, kayitId, kullanici, { notlar = null } = {}) {
  const kayit = await kayitGetir(client, kayitId);
  if (!kayit) {
    const err = new Error('Onay kaydı bulunamadı.');
    err.status = 404;
    throw err;
  }
  if (!['BEKLIYOR', 'TASLAK'].includes(kayit.durum_kodu)) {
    const err = new Error(`Kayıt iptal edilemez. Durum: ${kayit.durum_kodu}`);
    err.status = 409;
    throw err;
  }
  if (!isTamYetkili(kullanici) && Number(kayit.baslatan_kisi_id) !== Number(kullanici?.id)) {
    const err = new Error('Yalnız başlatan veya yönetici iptal edebilir.');
    err.status = 403;
    throw err;
  }
  await client.query(
    `
    UPDATE onay_kayitlari SET
      durum_kodu = 'IPTAL',
      aktif_adim_sira = NULL,
      kapanis_tarihi = CURRENT_TIMESTAMP,
      aciklama = COALESCE($2, aciklama)
    WHERE id = $1
    `,
    [kayitId, notlar],
  );
  await client.query(
    `
    UPDATE onay_kayit_adimlari SET durum_kodu = 'IPTAL'
    WHERE kayit_id = $1 AND durum_kodu IN ('BEKLIYOR', 'TASLAK')
    `,
    [kayitId],
  );
  return kayitGetir(client, kayitId);
}

/** Kullanıcının bekleyen onayları (rol + devir) */
async function benimBekleyenler(client, kisiId, { firmaId = null } = {}) {
  const roller = await kullaniciRolIdleri(client, kisiId);
  if (!roller.length) {
    // Tam yetkili değilse ve rol yoksa boş; admin için tüm bekleyenler ayrıca route'ta
    return [];
  }
  const params = [roller];
  let sql = `
    SELECT k.id
    FROM onay_kayitlari k
    JOIN onay_kayit_adimlari a
      ON a.kayit_id = k.id
     AND a.sira_no = k.aktif_adim_sira
     AND a.durum_kodu = 'BEKLIYOR'
    WHERE k.durum_kodu = 'BEKLIYOR'
      AND a.rol_id = ANY($1::int[])
  `;
  if (firmaId) {
    params.push(firmaId);
    sql += ` AND (k.firma_id IS NULL OR k.firma_id = $${params.length})`;
  }
  sql += ` ORDER BY k.id DESC`;
  const liste = await client.query(sql, params);
  const out = [];
  for (const r of liste.rows) out.push(await kayitGetir(client, r.id));
  return out;
}

module.exports = {
  kayitGetir,
  kullaniciRolIdleri,
  baslatOnay,
  onaylaAdim,
  reddetAdim,
  iptalKayit,
  benimBekleyenler,
};
