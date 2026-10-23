/**
 * Çift taraflı muhasebe motoru — ülke bağımsız çekirdek.
 * Kurallar: denge, dönem kilidi, kesin fiş değişmez, ters kayıt, kaynak idempotency.
 */

const { sonrakiBelgeNo } = require('../utils/belgeNo');

const EPS = 0.005;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function assertLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw Object.assign(new Error('Muhasebe fişinde en az iki kalem olmalı (borç ve alacak).'), {
      status: 400,
      kod: 'FIS_KALEM_EKSIK',
    });
  }
  let borc = 0;
  let alacak = 0;
  for (const k of lines) {
    if (!k.hesap_id && !k.hesap_kodu) {
      throw Object.assign(new Error('Her kalemde hesap seçilmeli.'), { status: 400, kod: 'HESAP_ZORUNLU' });
    }
    const b = round2(k.borc);
    const a = round2(k.alacak);
    if (b < 0 || a < 0 || (b > 0 && a > 0) || (b === 0 && a === 0)) {
      throw Object.assign(
        new Error('Her kalemde yalnızca borç veya yalnızca alacak tutarı > 0 olmalı.'),
        { status: 400, kod: 'KALEM_BORC_ALACAK' }
      );
    }
    borc += b;
    alacak += a;
  }
  borc = round2(borc);
  alacak = round2(alacak);
  if (Math.abs(borc - alacak) >= EPS) {
    throw Object.assign(
      new Error(
        `Fiş dengeli değil: toplam borç ${borc} ≠ toplam alacak ${alacak}. `
        + 'Çift taraflı muhasebede iki taraf eşit olmalıdır.'
      ),
      { status: 400, kod: 'FIS_DENGESIZ', borc, alacak }
    );
  }
  return { borc, alacak };
}

async function hesapIdCoz(client, { hesap_id, hesap_kodu, ulke_kodu }) {
  if (hesap_id) {
    const r = await client.query(
      `SELECT id, hesap_kodu, hesap_tipi, aktif FROM muhasebe_hesaplari WHERE id=$1`,
      [hesap_id]
    );
    if (!r.rows[0]) throw Object.assign(new Error('Hesap bulunamadı.'), { status: 400 });
    if (r.rows[0].aktif === false) {
      throw Object.assign(new Error(`Pasif hesap kullanılamaz: ${r.rows[0].hesap_kodu}`), {
        status: 400,
        kod: 'HESAP_PASIF',
      });
    }
    if (r.rows[0].hesap_tipi !== 'Dogrudan') {
      throw Object.assign(
        new Error(`Yalnızca Doğrudan (yaprak) hesaplara fiş yazılır: ${r.rows[0].hesap_kodu} (${r.rows[0].hesap_tipi}).`),
        { status: 400, kod: 'HESAP_TIPI' }
      );
    }
    return r.rows[0].id;
  }
  const r = await client.query(
    `SELECT id, hesap_tipi, aktif FROM muhasebe_hesaplari
     WHERE hesap_kodu=$1 AND ($2::text IS NULL OR ulke_kodu=$2 OR ulke_kodu IS NULL)
     ORDER BY CASE WHEN ulke_kodu=$2 THEN 0 ELSE 1 END
     LIMIT 1`,
    [hesap_kodu, ulke_kodu || null]
  );
  if (!r.rows[0]) {
    throw Object.assign(new Error(`Hesap kodu bulunamadı: ${hesap_kodu}`), { status: 400 });
  }
  if (r.rows[0].aktif === false) {
    throw Object.assign(new Error(`Pasif hesap: ${hesap_kodu}`), { status: 400, kod: 'HESAP_PASIF' });
  }
  if (r.rows[0].hesap_tipi !== 'Dogrudan') {
    throw Object.assign(new Error(`Doğrudan olmayan hesap: ${hesap_kodu}`), { status: 400, kod: 'HESAP_TIPI' });
  }
  return r.rows[0].id;
}

async function donemBul(client, { firmaId, belgeTarihi }) {
  const t = belgeTarihi || new Date().toISOString().slice(0, 10);
  const r = await client.query(
    `
    SELECT d.* FROM muhasebe_donemleri d
    WHERE d.baslangic_tarihi <= $1::date AND d.bitis_tarihi >= $1::date
      AND (d.firma_id IS NULL OR d.firma_id = $2)
    ORDER BY d.firma_id NULLS LAST
    LIMIT 1
    `,
    [t, firmaId || null]
  );
  return r.rows[0] || null;
}

async function donemAcikMi(client, opts) {
  const d = await donemBul(client, opts);
  if (!d) {
    throw Object.assign(
      new Error('Belge tarihi için açık muhasebe dönemi tanımlı değil. Önce mali yıl/dönem oluşturun.'),
      { status: 400, kod: 'DONEM_YOK' }
    );
  }
  if (d.durum === 'Kapali') {
    throw Object.assign(
      new Error(
        `Kapalı döneme (${d.baslangic_tarihi} – ${d.bitis_tarihi}) kayıt yapılamaz. `
        + 'Dönemi yetkili kullanıcı yeniden açabilir veya tarihi açık bir döneme taşıyın.'
      ),
      { status: 400, kod: 'DONEM_KAPALI', donem_id: d.id }
    );
  }
  return d;
}

async function kaynakFisVarMi(client, { firmaId, kaynakBelgeTipi, kaynakBelgeId }) {
  if (!kaynakBelgeTipi || kaynakBelgeId == null) return null;
  const r = await client.query(
    `
    SELECT id, belge_no, durum FROM muhasebe_belgeleri
    WHERE kaynak_belge_tipi=$1 AND kaynak_belge_id=$2
      AND durum='Onayli' AND ters_belge_id IS NULL
      AND ($3::int IS NULL OR firma_id=$3 OR firma_id IS NULL)
    ORDER BY id DESC LIMIT 1
    `,
    [kaynakBelgeTipi, kaynakBelgeId, firmaId || null]
  );
  return r.rows[0] || null;
}

/**
 * Taslak veya doğrudan Onayli fiş oluştur.
 */
async function fisOlustur(client, {
  firmaId = null,
  ulkeKodu = 'TR',
  islemUlkeKodu = null,
  vergiUlkeKodu = null,
  fisTipi = 'Mahsup',
  belgeTarihi = null,
  aciklama = null,
  paraBirimi = 'TRY',
  kur = 1,
  lines,
  kaynakBelgeTipi = null,
  kaynakBelgeId = null,
  olusturanKullanici = null,
  kesinlestir = false,
  durum = 'Taslak',
} = {}) {
  const mevcut = await kaynakFisVarMi(client, { firmaId, kaynakBelgeTipi, kaynakBelgeId });
  if (mevcut && (kesinlestir || durum === 'Onayli')) {
    throw Object.assign(
      new Error(`Bu kaynak belge zaten muhasebeleştirilmiş (fiş ${mevcut.belge_no}). Mükerrer fiş oluşturulmaz.`),
      { status: 409, kod: 'MUKERRER_FIS', muhasebe_belge_id: mevcut.id }
    );
  }

  const { borc, alacak } = assertLines(lines);
  const tarih = belgeTarihi || new Date().toISOString().slice(0, 10);
  let donem = null;
  if (kesinlestir || durum === 'Onayli') {
    donem = await donemAcikMi(client, { firmaId, belgeTarihi: tarih });
  } else {
    donem = await donemBul(client, { firmaId, belgeTarihi: tarih });
  }

  const no = await sonrakiBelgeNo(client, 'MUHASEBE_BELGE').catch(async () => {
    const n = await client.query(`SELECT COUNT(*)::int + 1 AS n FROM muhasebe_belgeleri`);
    return `MB${String(n.rows[0].n).padStart(5, '0')}`;
  });

  const hedefDurum = kesinlestir ? 'Onayli' : (durum || 'Taslak');
  let yevmiyeNo = null;
  if (hedefDurum === 'Onayli') {
    const y = await client.query(
      `SELECT COALESCE(MAX(yevmiye_no),0)+1 AS n FROM muhasebe_belgeleri
       WHERE COALESCE(firma_id,0)=COALESCE($1,0) AND EXTRACT(YEAR FROM belge_tarihi)=EXTRACT(YEAR FROM $2::date)`,
      [firmaId, tarih]
    );
    yevmiyeNo = y.rows[0].n;
  }

  const baslik = await client.query(
    `
    INSERT INTO muhasebe_belgeleri
      (belge_no, belge_tarihi, aciklama, durum, fis_tipi, firma_id, ulke_kodu,
       islem_ulke_kodu, vergi_ulke_kodu, para_birimi, kur, donem_id,
       kaynak_belge_tipi, kaynak_belge_id, olusturan_kullanici,
       onaylayan_kullanici, kesinlestirme_tarihi, yevmiye_no, kilitli)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
       $16, $17, $18, $19)
    RETURNING id
    `,
    [
      no, tarih, aciklama, hedefDurum, fisTipi, firmaId, ulkeKodu,
      islemUlkeKodu || ulkeKodu, vergiUlkeKodu || ulkeKodu, paraBirimi, kur,
      donem?.id || null, kaynakBelgeTipi, kaynakBelgeId, olusturanKullanici,
      hedefDurum === 'Onayli' ? olusturanKullanici : null,
      hedefDurum === 'Onayli' ? new Date() : null,
      yevmiyeNo,
      hedefDurum === 'Onayli',
    ]
  );
  const belgeId = baslik.rows[0].id;

  let sira = 1;
  for (const k of lines) {
    const hid = await hesapIdCoz(client, {
      hesap_id: k.hesap_id,
      hesap_kodu: k.hesap_kodu,
      ulke_kodu: ulkeKodu,
    });
    await client.query(
      `
      INSERT INTO muhasebe_belge_kalemleri
        (belge_id, hesap_id, borc, alacak, aciklama, sira_no, cari_id,
         para_birimi, kur, borc_yb, alacak_yb, vergi_kodu, maliyet_merkezi, proje_kodu)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `,
      [
        belgeId, hid, round2(k.borc), round2(k.alacak), k.aciklama || null, sira++,
        k.cari_id || null, k.para_birimi || paraBirimi, k.kur != null ? k.kur : kur,
        round2(k.borc_yb || k.borc), round2(k.alacak_yb || k.alacak),
        k.vergi_kodu || null, k.maliyet_merkezi || null, k.proje_kodu || null,
      ]
    );
  }

  return { id: belgeId, belge_no: no, toplam_borc: borc, toplam_alacak: alacak, durum: hedefDurum };
}

async function fisKesinlestir(client, belgeId, { kullaniciKodu = null, firmaId = null } = {}) {
  const b = await client.query(
    `SELECT * FROM muhasebe_belgeleri WHERE id=$1 FOR UPDATE`,
    [belgeId]
  );
  if (!b.rows[0]) throw Object.assign(new Error('Fiş bulunamadı.'), { status: 404 });
  const bel = b.rows[0];
  if (bel.durum === 'Onayli') {
    throw Object.assign(new Error('Fiş zaten kesinleşmiş.'), { status: 400, kod: 'ZATEN_KESIN' });
  }
  if (bel.durum === 'Iptal') {
    throw Object.assign(new Error('İptal fiş kesinleştirilemez.'), { status: 400 });
  }
  const kalemler = await client.query(
    `SELECT * FROM muhasebe_belge_kalemleri WHERE belge_id=$1 ORDER BY id`,
    [belgeId]
  );
  assertLines(kalemler.rows.map((k) => ({
    hesap_id: k.hesap_id,
    borc: k.borc,
    alacak: k.alacak,
  })));
  for (const k of kalemler.rows) {
    await hesapIdCoz(client, { hesap_id: k.hesap_id, ulke_kodu: bel.ulke_kodu });
  }
  const donem = await donemAcikMi(client, {
    firmaId: firmaId || bel.firma_id,
    belgeTarihi: bel.belge_tarihi,
  });
  if (bel.kaynak_belge_tipi && bel.kaynak_belge_id) {
    const muk = await kaynakFisVarMi(client, {
      firmaId: bel.firma_id,
      kaynakBelgeTipi: bel.kaynak_belge_tipi,
      kaynakBelgeId: bel.kaynak_belge_id,
    });
    if (muk && Number(muk.id) !== Number(belgeId)) {
      throw Object.assign(new Error(`Kaynak belge başka fişte muhasebeleşmiş: ${muk.belge_no}`), {
        status: 409,
        kod: 'MUKERRER_FIS',
      });
    }
  }
  const y = await client.query(
    `SELECT COALESCE(MAX(yevmiye_no),0)+1 AS n FROM muhasebe_belgeleri
     WHERE COALESCE(firma_id,0)=COALESCE($1,0)
       AND EXTRACT(YEAR FROM belge_tarihi)=EXTRACT(YEAR FROM $2::date)
       AND durum='Onayli'`,
    [bel.firma_id, bel.belge_tarihi]
  );
  await client.query(
    `
    UPDATE muhasebe_belgeleri SET
      durum='Onayli', kilitli=TRUE, donem_id=$2,
      onaylayan_kullanici=COALESCE($3, onaylayan_kullanici),
      kesinlestirme_tarihi=NOW(), yevmiye_no=$4
    WHERE id=$1
    `,
    [belgeId, donem.id, kullaniciKodu, y.rows[0].n]
  );
  return { id: Number(belgeId), yevmiye_no: y.rows[0].n };
}

/**
 * Kesinleşmiş fişin tersi — orijinal kilitli kalır.
 */
async function fisTersKayit(client, belgeId, { kullaniciKodu = null, aciklama = null } = {}) {
  const b = await client.query(`SELECT * FROM muhasebe_belgeleri WHERE id=$1 FOR UPDATE`, [belgeId]);
  if (!b.rows[0]) throw Object.assign(new Error('Fiş bulunamadı.'), { status: 404 });
  const bel = b.rows[0];
  if (bel.durum !== 'Onayli') {
    throw Object.assign(new Error('Yalnızca kesinleşmiş (Onaylı) fişe ters kayıt uygulanır.'), {
      status: 400,
      kod: 'TERS_YALNIZ_ONAYLI',
    });
  }
  if (bel.ters_belge_id) {
    throw Object.assign(new Error('Bu fiş için ters kayıt zaten oluşturulmuş.'), {
      status: 400,
      kod: 'TERS_VAR',
      ters_belge_id: bel.ters_belge_id,
    });
  }
  const kalemler = await client.query(
    `SELECT * FROM muhasebe_belge_kalemleri WHERE belge_id=$1 ORDER BY sira_no, id`,
    [belgeId]
  );
  const lines = kalemler.rows.map((k) => ({
    hesap_id: k.hesap_id,
    borc: k.alacak,
    alacak: k.borc,
    aciklama: k.aciklama,
    cari_id: k.cari_id,
    para_birimi: k.para_birimi,
    kur: k.kur,
    vergi_kodu: k.vergi_kodu,
  }));
  const ters = await fisOlustur(client, {
    firmaId: bel.firma_id,
    ulkeKodu: bel.ulke_kodu || 'TR',
    islemUlkeKodu: bel.islem_ulke_kodu,
    vergiUlkeKodu: bel.vergi_ulke_kodu,
    fisTipi: 'Ters',
    belgeTarihi: bel.belge_tarihi,
    aciklama: aciklama || `Ters kayıt ← ${bel.belge_no}`,
    paraBirimi: bel.para_birimi || 'TRY',
    kur: bel.kur || 1,
    lines,
    olusturanKullanici: kullaniciKodu,
    kesinlestir: true,
  });
  await client.query(
    `UPDATE muhasebe_belgeleri SET ters_belge_id=$2, orijinal_belge_id=COALESCE(orijinal_belge_id, id) WHERE id=$1`,
    [belgeId, ters.id]
  );
  await client.query(
    `UPDATE muhasebe_belgeleri SET orijinal_belge_id=$2 WHERE id=$1`,
    [ters.id, belgeId]
  );
  return ters;
}

async function donemKapat(client, donemId, { kullaniciKodu = null } = {}) {
  const r = await client.query(
    `UPDATE muhasebe_donemleri SET durum='Kapali', kapatan_kullanici=$2, kapanis_tarihi=NOW()
     WHERE id=$1 AND durum IN ('Acik','YenidenAcik') RETURNING *`,
    [donemId, kullaniciKodu]
  );
  if (!r.rows[0]) throw Object.assign(new Error('Dönem kapatılamadı (zaten kapalı veya yok).'), { status: 400 });
  return r.rows[0];
}

async function donemYenidenAc(client, donemId, { kullaniciKodu = null } = {}) {
  const r = await client.query(
    `UPDATE muhasebe_donemleri SET durum='YenidenAcik', kapatan_kullanici=$2
     WHERE id=$1 AND durum='Kapali' RETURNING *`,
    [donemId, kullaniciKodu]
  );
  if (!r.rows[0]) throw Object.assign(new Error('Dönem yeniden açılamadı.'), { status: 400 });
  return r.rows[0];
}

module.exports = {
  assertLines,
  hesapIdCoz,
  donemBul,
  donemAcikMi,
  kaynakFisVarMi,
  fisOlustur,
  fisKesinlestir,
  fisTersKayit,
  donemKapat,
  donemYenidenAc,
  round2,
};
