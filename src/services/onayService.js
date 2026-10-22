/**
 * Merkezi onay motoru (v2 tanım modeli ile).
 */
const { sonrakiKod } = require('../utils/kodUretici');
const { isTamYetkili } = require('../utils/yetki');

async function kayitGetir(client, id) {
  const baslik = await client.query(
    `
    SELECT k.*,
           d.durum_adi,
           r.rota_kodu, r.rota_adi,
           ku.kural_kodu, ku.kural_adi,
           CONCAT(COALESCE(b.ad,''), ' ', COALESCE(b.soyad,'')) AS baslatan_adi,
           b.kullanici_kodu AS baslatan_kodu
    FROM onay_kayitlari k
    LEFT JOIN onay_durumlari d ON d.durum_kodu = k.durum_kodu
    LEFT JOIN onay_rotalari r ON r.id = k.rota_id
    LEFT JOIN onay_kurallari ku ON ku.id = k.kural_id
    LEFT JOIN kisiler b ON b.id = k.baslatan_kisi_id
    WHERE k.id = $1
    `,
    [id],
  );
  if (!baslik.rows[0]) return null;
  const adimlar = await client.query(
    `
    SELECT a.*,
           COALESCE(a.rol_adi, rol.rol_adi) AS rol_adi,
           rol.rol_kodu,
           d.durum_adi,
           CONCAT(COALESCE(o.ad,''), ' ', COALESCE(o.soyad,'')) AS onaylayan_adi,
           o.kullanici_kodu AS onaylayan_kodu
    FROM onay_kayit_adimlari a
    LEFT JOIN onay_rolleri rol ON rol.id = a.rol_id
    LEFT JOIN onay_durumlari d ON d.durum_kodu = a.durum_kodu
    LEFT JOIN kisiler o ON o.id = a.onaylayan_kisi_id
    WHERE a.kayit_id = $1
    ORDER BY a.sira_no
    `,
    [id],
  );
  return { ...baslik.rows[0], adimlar: adimlar.rows };
}

/** Kullanıcının onay rol adları (+ yetki devri) */
async function kullaniciRolAdlari(client, kisiId, { firmaId = null, isYeriId = null } = {}) {
  if (!kisiId) return [];
  const params = [kisiId];
  let sql = `
    SELECT DISTINCT r.rol_adi
    FROM onay_rolleri r
    WHERE r.aktif = TRUE AND r.kisi_id = $1
  `;
  if (firmaId) {
    params.push(firmaId);
    sql += ` AND (r.firma_id IS NULL OR r.firma_id = $${params.length})`;
  }
  if (isYeriId) {
    params.push(isYeriId);
    sql += ` AND (r.is_yeri_id IS NULL OR r.is_yeri_id = $${params.length})`;
  }
  const dogrudan = await client.query(sql, params);
  const roller = new Set(dogrudan.rows.map((r) => r.rol_adi).filter(Boolean));

  const devir = await client.query(
    `
    SELECT DISTINCT COALESCE(rol.rol_adi, d_rol.rol_adi) AS rol_adi
    FROM onay_yetki_devirleri d
    LEFT JOIN onay_rolleri rol ON rol.id = d.rol_id
    LEFT JOIN onay_rolleri d_rol ON d_rol.kisi_id = d.veren_kisi_id AND d_rol.aktif = TRUE
    WHERE d.alan_kisi_id = $1
      AND d.aktif = TRUE
      AND d.baslangic_tarihi <= CURRENT_DATE
      AND (d.bitis_tarihi IS NULL OR d.bitis_tarihi >= CURRENT_DATE)
    `,
    [kisiId],
  );
  for (const r of devir.rows) {
    if (r.rol_adi) roller.add(r.rol_adi);
  }
  return [...roller];
}

/** Geriye uyumluluk */
async function kullaniciRolIdleri(client, kisiId) {
  if (!kisiId) return [];
  const r = await client.query(
    `SELECT id FROM onay_rolleri WHERE aktif = TRUE AND kisi_id = $1`,
    [kisiId],
  );
  return r.rows.map((x) => Number(x.id));
}

function adimTutarUygun(adim, tutar) {
  if (adim.min_tutar == null) return true;
  return Number(tutar || 0) >= Number(adim.min_tutar);
}

function kuralTutarUygun(kural, tutar) {
  const t = Number(tutar || 0);
  if (kural.kosul_min_tutar != null && t < Number(kural.kosul_min_tutar)) return false;
  if (kural.kosul_max_tutar != null && t > Number(kural.kosul_max_tutar)) return false;
  return true;
}

/**
 * Onay sürecini başlatır.
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
  is_yeri_id = null,
  baslatan_kisi_id = null,
  rota_id = null,
  kural_id = null,
  kullanim_id = null,
  aciklama = null,
  hareket_kodu = null,
  yon = null,
}) {
  if (!ekran_id && !rota_id && !kural_id) {
    const err = new Error('ekran_id, kural_id veya rota_id gerekli.');
    err.status = 400;
    throw err;
  }

  let kural = null;
  if (kural_id) {
    const r = await client.query(`SELECT * FROM onay_kurallari WHERE id=$1 AND aktif=TRUE`, [kural_id]);
    kural = r.rows[0];
  } else if (ekran_id) {
    const params = [ekran_id];
    let sql = `SELECT * FROM onay_kurallari WHERE ekran_id=$1 AND aktif=TRUE`;
    if (firma_id) {
      params.push(firma_id);
      sql += ` AND (firma_id IS NULL OR firma_id=$${params.length})`;
    }
    if (is_yeri_id) {
      params.push(is_yeri_id);
      sql += ` AND (is_yeri_id IS NULL OR is_yeri_id=$${params.length})`;
    }
    sql += ` ORDER BY sira_no, firma_id NULLS LAST LIMIT 5`;
    const r = await client.query(sql, params);
    // İlk eşleşen kural (koşul süzgeci)
    for (const candidate of r.rows) {
      if (!kuralTutarUygun(candidate, tutar)) continue;
      if (yon && candidate.kosul_yon && candidate.kosul_yon !== 'Hepsi') {
        const y = String(yon).toLowerCase().startsWith('a') ? 'Alis' : 'Satis';
        if (candidate.kosul_yon !== y) continue;
      }
      if (hareket_kodu) {
        const hk = await client.query(
          `SELECT 1 FROM onay_kural_hareketleri WHERE kural_id=$1 LIMIT 1`,
          [candidate.id],
        );
        if (hk.rows[0]) {
          const hit = await client.query(
            `SELECT 1 FROM onay_kural_hareketleri WHERE kural_id=$1 AND hareket_kodu=$2`,
            [candidate.id, hareket_kodu],
          );
          if (!hit.rows[0]) continue;
        }
      }
      kural = candidate;
      break;
    }
  }

  // Geriye uyum: eski modül kullanımı
  if (!kural && kullanim_id) {
    const r = await client.query(`SELECT * FROM onay_modul_kullanimlari WHERE id=$1`, [kullanim_id]);
    if (r.rows[0]) {
      kural = { id: null, ekran_id: r.rows[0].ekran_id, modul_proxy: r.rows[0] };
    }
  }

  let rotaId = rota_id;
  if (!rotaId && kural?.id) {
    const rr = await client.query(
      `
      SELECT id FROM onay_rotalari
      WHERE aktif=TRUE AND (kural_id=$1 OR ekran_id=$2)
      ORDER BY kural_id NULLS LAST, versiyon DESC
      LIMIT 1
      `,
      [kural.id, kural.ekran_id || ekran_id],
    );
    rotaId = rr.rows[0]?.id;
  }
  if (!rotaId && ekran_id) {
    const rr = await client.query(
      `SELECT id FROM onay_rotalari WHERE aktif=TRUE AND ekran_id=$1 ORDER BY versiyon DESC LIMIT 1`,
      [ekran_id],
    );
    rotaId = rr.rows[0]?.id;
  }
  // Eski bağ: modul kullanımı → rota
  if (!rotaId && kural?.modul_proxy?.rota_id) rotaId = kural.modul_proxy.rota_id;

  if (!rotaId) {
    const err = new Error('Bu ekran için aktif onay rotası bulunamadı.');
    err.status = 400;
    throw err;
  }

  if (kural?.otomatik_onay) {
    return { atlandi: true, neden: 'otomatik_onay', kural_id: kural.id };
  }

  if (belge_id && (ekran_id || kural?.ekran_id)) {
    const open = await client.query(
      `
      SELECT id FROM onay_kayitlari
      WHERE ekran_id = $1 AND belge_id = $2 AND durum_kodu = 'BEKLIYOR'
      LIMIT 1
      `,
      [ekran_id || kural.ekran_id, belge_id],
    );
    if (open.rows[0]) return kayitGetir(client, open.rows[0].id);
  }

  const sablonAdimlar = await client.query(
    `SELECT * FROM onay_rota_adimlari WHERE rota_id=$1 ORDER BY sira_no`,
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
    onayNo = `NK${String(n.rows[0].n).padStart(5, '0')}`;
  }

  const kayit = await client.query(
    `
    INSERT INTO onay_kayitlari (
      onay_no, kural_id, rota_id, firma_id, modul_kodu, ekran_id,
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
      kural?.id || null,
      rotaId,
      firma_id || kural?.firma_id || null,
      modul_kodu || 'Genel',
      ekran_id || kural?.ekran_id,
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
        kayit_id, sira_no, adim_adi, rol_id, rol_adi, durum_kodu, zorunlu
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        kayitId,
        a.sira_no,
        a.adim_adi,
        a.rol_id || null,
        a.rol_adi || a.adim_adi,
        a.sira_no === uygulanacak[0].sira_no ? 'BEKLIYOR' : 'TASLAK',
        a.zorunlu,
      ],
    );
  }

  return kayitGetir(client, kayitId);
}

async function assertAdimYetkisi(client, adim, kullanici, kayit) {
  if (!kullanici) {
    const err = new Error('Onay için kullanıcı gerekli (X-Kullanici-Kodu / JWT).');
    err.status = 401;
    throw err;
  }
  if (isTamYetkili(kullanici)) return true;
  const roller = await kullaniciRolAdlari(client, kullanici.id, {
    firmaId: kayit?.firma_id,
  });
  const hedef = adim.rol_adi || adim.rol_kodu;
  if (!hedef || !roller.includes(hedef)) {
    const err = new Error(`Bu adım için onay rolünüz yok (${hedef || '?'}).`);
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

  await assertAdimYetkisi(client, aktif, kullanici, kayit);

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
  await assertAdimYetkisi(client, aktif, kullanici, kayit);

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

async function benimBekleyenler(client, kisiId, { firmaId = null } = {}) {
  const roller = await kullaniciRolAdlari(client, kisiId, { firmaId });
  if (!roller.length) return [];
  const params = [roller];
  let sql = `
    SELECT k.id
    FROM onay_kayitlari k
    JOIN onay_kayit_adimlari a
      ON a.kayit_id = k.id
     AND a.sira_no = k.aktif_adim_sira
     AND a.durum_kodu = 'BEKLIYOR'
    WHERE k.durum_kodu = 'BEKLIYOR'
      AND a.rol_adi = ANY($1::text[])
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
  kullaniciRolAdlari,
  baslatOnay,
  onaylaAdim,
  reddetAdim,
  iptalKayit,
  benimBekleyenler,
};
