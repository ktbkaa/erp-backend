/**
 * Merkezi onay motoru (v2 tanım modeli ile).
 */
const { sonrakiKod } = require('../utils/kodUretici');
const { isTamYetkili } = require('../utils/yetki');

async function kayitGetir(client, id) {
  const baslik = await client.query(
    `
    SELECT k.*,
           d.status_name,
           r.route_code, r.route_name,
           ku.rule_code, ku.rule_name,
           CONCAT(COALESCE(b.first_name,''), ' ', COALESCE(b.last_name,'')) AS baslatan_adi,
           b.user_code AS baslatan_kodu
    FROM approval_records k
    LEFT JOIN approval_statuses d ON d.status_code = k.status_code
    LEFT JOIN approval_routes r ON r.id = k.route_id
    LEFT JOIN approval_rules ku ON ku.id = k.rule_id
    LEFT JOIN users b ON b.id = k.baslatan_kisi_id
    WHERE k.id = $1
    `,
    [id],
  );
  if (!baslik.rows[0]) return null;
  const adimlar = await client.query(
    `
    SELECT a.*,
           COALESCE(a.role_name, role.role_name) AS role_name,
           role.role_code,
           d.status_name,
           CONCAT(COALESCE(o.first_name,''), ' ', COALESCE(o.last_name,'')) AS onaylayan_adi,
           o.user_code AS onaylayan_kodu
    FROM approval_record_steps a
    LEFT JOIN approval_roles role ON role.id = a.role_id
    LEFT JOIN approval_statuses d ON d.status_code = a.status_code
    LEFT JOIN users o ON o.id = a.approved_by_kisi_id
    WHERE a.record_id = $1
    ORDER BY a.line_no
    `,
    [id],
  );
  return { ...baslik.rows[0], adimlar: adimlar.rows };
}

/** Kullanıcının onay role adları (+ yetki devri) */
async function kullaniciRolAdlari(client, kisiId, { firmaId = null, isYeriId = null } = {}) {
  if (!kisiId) return [];
  const params = [kisiId];
  let sql = `
    SELECT DISTINCT r.role_name
    FROM approval_roles r
    WHERE r.is_active = TRUE AND r.kisi_id = $1
  `;
  if (firmaId) {
    params.push(firmaId);
    sql += ` AND (r.company_id IS NULL OR r.company_id = $${params.length})`;
  }
  if (isYeriId) {
    params.push(isYeriId);
    sql += ` AND (r.plant_id IS NULL OR r.plant_id = $${params.length})`;
  }
  const dogrudan = await client.query(sql, params);
  const roller = new Set(dogrudan.rows.map((r) => r.role_name).filter(Boolean));

  const devir = await client.query(
    `
    SELECT DISTINCT COALESCE(role.role_name, d_rol.role_name) AS role_name
    FROM approval_delegations d
    LEFT JOIN approval_roles role ON role.id = d.role_id
    LEFT JOIN approval_roles d_rol ON d_rol.kisi_id = d.veren_kisi_id AND d_rol.is_active = TRUE
    WHERE d.field_kisi_id = $1
      AND d.is_active = TRUE
      AND d.start_date <= CURRENT_DATE
      AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
    `,
    [kisiId],
  );
  for (const r of devir.rows) {
    if (r.role_name) roller.add(r.role_name);
  }
  return [...roller];
}

/** Geriye uyumluluk */
async function kullaniciRolIdleri(client, kisiId) {
  if (!kisiId) return [];
  const r = await client.query(
    `SELECT id FROM approval_roles WHERE is_active = TRUE AND kisi_id = $1`,
    [kisiId],
  );
  return r.rows.map((x) => Number(x.id));
}

function adimTutarUygun(adim, amount) {
  if (adim.min_amount == null) return true;
  return Number(amount || 0) >= Number(adim.min_amount);
}

function kuralTutarUygun(kural, amount) {
  const t = Number(amount || 0);
  if (kural.term_min_amount != null && t < Number(kural.term_min_amount)) return false;
  if (kural.term_max_amount != null && t > Number(kural.term_max_amount)) return false;
  return true;
}

/**
 * Onay sürecini başlatır.
 */
async function baslatOnay(client, {
  screen_id,
  module_code,
  document_id = null,
  document_no = null,
  document_ozet = null,
  amount = 0,
  currency_code = 'TRY',
  company_id = null,
  plant_id = null,
  baslatan_kisi_id = null,
  route_id = null,
  rule_id = null,
  kullanim_id = null,
  description = null,
  movement_code = null,
  direction = null,
}) {
  if (!screen_id && !route_id && !rule_id) {
    const err = new Error('screen_id, rule_id veya route_id gerekli.');
    err.status = 400;
    throw err;
  }

  let kural = null;
  if (rule_id) {
    const r = await client.query(`SELECT * FROM approval_rules WHERE id=$1 AND is_active=TRUE`, [rule_id]);
    kural = r.rows[0];
  } else if (screen_id) {
    const params = [screen_id];
    let sql = `SELECT * FROM approval_rules WHERE screen_id=$1 AND is_active=TRUE`;
    if (company_id) {
      params.push(company_id);
      sql += ` AND (company_id IS NULL OR company_id=$${params.length})`;
    }
    if (plant_id) {
      params.push(plant_id);
      sql += ` AND (plant_id IS NULL OR plant_id=$${params.length})`;
    }
    sql += ` ORDER BY line_no, company_id NULLS LAST LIMIT 5`;
    const r = await client.query(sql, params);
    // İlk eşleşen kural (koşul süzgeci)
    for (const candidate of r.rows) {
      if (!kuralTutarUygun(candidate, amount)) continue;
      if (direction && candidate.term_direction && candidate.term_direction !== 'Hepsi') {
        const y = String(direction).toLowerCase().startsWith('a') ? 'Alis' : 'Satis';
        if (candidate.term_direction !== y) continue;
      }
      if (movement_code) {
        const hk = await client.query(
          `SELECT 1 FROM approval_rule_movements WHERE rule_id=$1 LIMIT 1`,
          [candidate.id],
        );
        if (hk.rows[0]) {
          const hit = await client.query(
            `SELECT 1 FROM approval_rule_movements WHERE rule_id=$1 AND movement_code=$2`,
            [candidate.id, movement_code],
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
    const r = await client.query(`SELECT * FROM approval_module_usages WHERE id=$1`, [kullanim_id]);
    if (r.rows[0]) {
      kural = { id: null, screen_id: r.rows[0].screen_id, modul_proxy: r.rows[0] };
    }
  }

  let rotaId = route_id;
  if (!rotaId && kural?.id) {
    const rr = await client.query(
      `
      SELECT id FROM approval_routes
      WHERE is_active=TRUE AND (rule_id=$1 OR screen_id=$2)
      ORDER BY rule_id NULLS LAST, versiyon DESC
      LIMIT 1
      `,
      [kural.id, kural.screen_id || screen_id],
    );
    rotaId = rr.rows[0]?.id;
  }
  if (!rotaId && screen_id) {
    const rr = await client.query(
      `SELECT id FROM approval_routes WHERE is_active=TRUE AND screen_id=$1 ORDER BY versiyon DESC LIMIT 1`,
      [screen_id],
    );
    rotaId = rr.rows[0]?.id;
  }
  // Eski bağ: module kullanımı → rota
  if (!rotaId && kural?.modul_proxy?.route_id) rotaId = kural.modul_proxy.route_id;

  if (!rotaId) {
    const err = new Error('Bu ekran için is_active onay rotası bulunamadı.');
    err.status = 400;
    throw err;
  }

  if (kural?.otomatik_onay) {
    return { atlandi: true, neden: 'otomatik_onay', rule_id: kural.id };
  }

  if (document_id && (screen_id || kural?.screen_id)) {
    const open = await client.query(
      `
      SELECT id FROM approval_records
      WHERE screen_id = $1 AND document_id = $2 AND status_code = 'BEKLIYOR'
      LIMIT 1
      `,
      [screen_id || kural.screen_id, document_id],
    );
    if (open.rows[0]) return kayitGetir(client, open.rows[0].id);
  }

  const sablonAdimlar = await client.query(
    `SELECT * FROM approval_route_steps WHERE route_id=$1 ORDER BY line_no`,
    [rotaId],
  );
  if (!sablonAdimlar.rows.length) {
    const err = new Error('Rotada adım tanımı yok.');
    err.status = 400;
    throw err;
  }

  const uygulanacak = sablonAdimlar.rows.filter((a) => adimTutarUygun(a, amount));
  if (!uygulanacak.length) {
    return { atlandi: true, neden: 'adim_tutar_filtresi', amount };
  }

  let onayNo;
  try {
    onayNo = await sonrakiKod(client, 'ONAY_KAYIT');
  } catch (_) {
    const n = await client.query(`SELECT COUNT(*)::int + 1 AS n FROM approval_records`);
    onayNo = `NK${String(n.rows[0].n).padStart(5, '0')}`;
  }

  const kayit = await client.query(
    `
    INSERT INTO approval_records (
      onay_no, rule_id, route_id, company_id, module_code, screen_id,
      document_id, document_no, document_ozet, amount, currency_code, status_code,
      active_step_no, baslatan_kisi_id, description
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
      company_id || kural?.company_id || null,
      module_code || 'Genel',
      screen_id || kural?.screen_id,
      document_id,
      document_no,
      document_ozet,
      amount || 0,
      currency_code || 'TRY',
      uygulanacak[0].line_no,
      baslatan_kisi_id,
      description,
    ],
  );
  const kayitId = kayit.rows[0].id;

  for (const a of uygulanacak) {
    await client.query(
      `
      INSERT INTO approval_record_steps (
        record_id, line_no, step_name, role_id, role_name, status_code, zorunlu
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        kayitId,
        a.line_no,
        a.step_name,
        a.role_id || null,
        a.role_name || a.step_name,
        a.line_no === uygulanacak[0].line_no ? 'BEKLIYOR' : 'TASLAK',
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
    firmaId: kayit?.company_id,
  });
  const hedef = adim.role_name || adim.role_code;
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
  if (kayit.status_code !== 'BEKLIYOR') {
    const err = new Error(`Kayıt onaylanamaz. Durum: ${kayit.status_code}`);
    err.status = 409;
    throw err;
  }

  const is_active = kayit.adimlar.find(
    (a) => a.line_no === kayit.active_step_no && a.status_code === 'BEKLIYOR',
  );
  if (!is_active) {
    const err = new Error('Aktif onay adımı yok.');
    err.status = 409;
    throw err;
  }

  await assertAdimYetkisi(client, is_active, kullanici, kayit);

  await client.query(
    `
    UPDATE approval_record_steps SET
      status_code = 'ONAYLANDI',
      approved_by_kisi_id = $2,
      action_date = CURRENT_TIMESTAMP,
      notlar = COALESCE($3, notlar)
    WHERE id = $1
    `,
    [is_active.id, kullanici.id, notlar],
  );

  const sonraki = kayit.adimlar.find((a) => a.line_no > is_active.line_no);
  if (sonraki) {
    await client.query(
      `UPDATE approval_record_steps SET status_code = 'BEKLIYOR' WHERE id = $1`,
      [sonraki.id],
    );
    await client.query(
      `UPDATE approval_records SET active_step_no = $2 WHERE id = $1`,
      [kayitId, sonraki.line_no],
    );
  } else {
    await client.query(
      `
      UPDATE approval_records SET
        status_code = 'ONAYLANDI',
        active_step_no = NULL,
        closed_at = CURRENT_TIMESTAMP
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
  if (kayit.status_code !== 'BEKLIYOR') {
    const err = new Error(`Kayıt reddedilemez. Durum: ${kayit.status_code}`);
    err.status = 409;
    throw err;
  }
  const is_active = kayit.adimlar.find(
    (a) => a.line_no === kayit.active_step_no && a.status_code === 'BEKLIYOR',
  );
  if (!is_active) {
    const err = new Error('Aktif onay adımı yok.');
    err.status = 409;
    throw err;
  }
  await assertAdimYetkisi(client, is_active, kullanici, kayit);

  await client.query(
    `
    UPDATE approval_record_steps SET
      status_code = 'REDDEDILDI',
      approved_by_kisi_id = $2,
      action_date = CURRENT_TIMESTAMP,
      notlar = COALESCE($3, notlar)
    WHERE id = $1
    `,
    [is_active.id, kullanici.id, notlar],
  );
  await client.query(
    `
    UPDATE approval_records SET
      status_code = 'REDDEDILDI',
      active_step_no = NULL,
      closed_at = CURRENT_TIMESTAMP,
      description = COALESCE($2, description)
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
  if (!['BEKLIYOR', 'TASLAK'].includes(kayit.status_code)) {
    const err = new Error(`Kayıt iptal edilemez. Durum: ${kayit.status_code}`);
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
    UPDATE approval_records SET
      status_code = 'IPTAL',
      active_step_no = NULL,
      closed_at = CURRENT_TIMESTAMP,
      description = COALESCE($2, description)
    WHERE id = $1
    `,
    [kayitId, notlar],
  );
  await client.query(
    `
    UPDATE approval_record_steps SET status_code = 'IPTAL'
    WHERE record_id = $1 AND status_code IN ('BEKLIYOR', 'TASLAK')
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
    FROM approval_records k
    JOIN approval_record_steps a
      ON a.record_id = k.id
     AND a.line_no = k.active_step_no
     AND a.status_code = 'BEKLIYOR'
    WHERE k.status_code = 'BEKLIYOR'
      AND a.role_name = ANY($1::text[])
  `;
  if (firmaId) {
    params.push(firmaId);
    sql += ` AND (k.company_id IS NULL OR k.company_id = $${params.length})`;
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
