const $ = (sel) => document.querySelector(sel);

async function api(path) {
  const res = await fetch(path);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { /* ham metin */ }
  if (!res.ok) {
    const msg = (data && (data.hata || data.detay)) || text || res.statusText;
    throw new Error(`${path} → ${res.status}: ${msg}`);
  }
  return data;
}

async function safeApi(path) {
  try {
    const data = await api(path);
    return { ok: true, data: Array.isArray(data) ? data : (data || []), error: null };
  } catch (err) {
    console.error(err);
    return { ok: false, data: [], error: err.message };
  }
}

function table(el, headers, rows, emptyHint) {
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<tr><td colspan="${headers.length}">${emptyHint || "Kayıt yok. Terminalde <code>npm run demo:cycle</code> çalıştır, sonra Yenile."}</td></tr>`;
    return;
  }
  el.innerHTML = `
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}
    </tbody>
  `;
}

function blockList(el, itemsHtml, emptyHint) {
  if (!el) return;
  el.innerHTML = itemsHtml.length
    ? itemsHtml.join('')
    : `<div class="block">${emptyHint || 'Kayıt yok. <code>npm run demo:cycle</code> çalıştır.'}</div>`;
}

function renderTreeNodes(nodes, depth = 0) {
  return (nodes || []).map((n) => `
    <div class="tree-node" style="margin-left:${depth * 1.2}rem">
      <div class="tree-line">
        <span class="mono">${n.stok_kodu}</span>
        <span>${n.stok_adi}</span>
        <span class="badge">${n.stok_tipi}</span>
        <span class="mono">x ${n.miktar}</span>
      </div>
      ${renderTreeNodes(n.alt_satirlar, depth + 1)}
    </div>
  `).join('');
}

function setStatus(html, isError) {
  const box = $('#statusBox');
  if (!box) return;
  box.className = isError ? 'status error' : 'status ok';
  box.innerHTML = html;
  box.hidden = false;
}

async function loadAll() {
  setStatus('Veriler yükleniyor…', false);

  const health = await safeApi('/health');
  if (!health.ok || !health.data || health.data.durum !== 'ok') {
    setStatus(
      `<strong>Sunucu/DB bağlantısı yok.</strong><br>
       1) Terminalde <code>npm start</code> çalışıyor mu?<br>
       2) <a href="/health" target="_blank">/health</a> açılınca <code>durum: ok</code> görmelisin.<br>
       Hata: ${health.error || JSON.stringify(health.data)}`,
      true
    );
  }

  const endpoints = [
    ['cariler', '/cariler'],
    ['stoklar', '/stoklar'],
    ['bom', '/urun-agaclari'],
    ['merkezler', '/is-merkezleri'],
    ['rotalar', '/rotalar'],
    ['talepler', '/satin-alma-talepleri'],
    ['sas', '/satin-alma-siparisleri'],
    ['mk', '/mal-kabuller'],
    ['emirler', '/uretim-emirleri'],
    ['bakiyeler', '/stok-bakiyeleri'],
    ['depolar', '/depolar'],
  ];

  const results = {};
  const errors = [];
  await Promise.all(endpoints.map(async ([key, path]) => {
    const r = await safeApi(path);
    results[key] = r.data;
    if (!r.ok) errors.push(r.error);
  }));

  const {
    cariler, stoklar, bom, merkezler, rotalar,
    talepler, sas, mk, emirler, bakiyeler, depolar,
  } = results;

  const total =
    (cariler?.length || 0) + (stoklar?.length || 0) + (bom?.length || 0) +
    (talepler?.length || 0) + (emirler?.length || 0);

  if (errors.length) {
    setStatus(
      `<strong>Bazı API’ler hata verdi (ekranlar bu yüzden boş kalabilir).</strong>
       <ul>${errors.map((e) => `<li><code>${e}</code></li>`).join('')}</ul>
       Çoğu zaman çözüm: terminalde sırayla<br>
       <code>npm run migrate</code> → <code>npm run demo:cycle</code> → sunucuyu durdurup <code>npm start</code><br>
       Sonra bu sayfada <strong>Ctrl+F5</strong> (sert yenile).`,
      true
    );
  } else if (total === 0) {
    setStatus(
      `<strong>Veritabanında demo veri yok — ekranlar bu yüzden boş.</strong><br>
       Terminalde (sunucu kapalıyken veya ayrı terminalde):<br>
       <code>npm run migrate</code><br>
       <code>npm run demo:cycle</code><br>
       Sonra <code>npm start</code> ve bu sayfada <strong>Yenile</strong>.`,
      true
    );
  } else {
    setStatus(
      `Bağlantı tamam. Kayıtlar yüklendi (stok: ${stoklar.length}, cari: ${cariler.length}, iş emri: ${emirler.length}).`,
      false
    );
  }

  $('#ozetCards').innerHTML = [
    ['Cari', cariler.length],
    ['Stok', stoklar.length],
    ['Ürün Ağacı', bom.length],
    ['Talep', talepler.length],
    ['SAS', sas.length],
    ['İş Emri', emirler.length],
  ].map(([l, n]) => `<div class="card"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');

  table($('#tblCariler'), ['Kod', 'Ad', 'Tür', 'Yetkili', 'Telefon', 'Vergi No', 'İl', 'Vade'],
    cariler.map((c) => [
      `<span class="mono">${c.cari_kodu}</span>`,
      c.cari_adi,
      `<span class="badge">${c.cari_turu}</span>`,
      c.yetkili_adi || '-',
      c.telefon || '-',
      c.vergi_no || '-',
      c.il || '-',
      c.odeme_vadesi_gun ?? '-',
    ]));

  table($('#tblStoklar'), ['Kod', 'Ad', 'Tip', 'Tedarik', 'Birim', 'Fiyat'],
    stoklar.map((s) => [
      `<span class="mono">${s.stok_kodu}</span>`,
      s.stok_adi,
      s.stok_tipi || '-',
      s.tedarik_tipi || '-',
      s.birim || '-',
      s.satis_fiyati ?? '-',
    ]));

  blockList($('#bomList'), bom.map((a) => `
    <div class="block">
      <header>
        <span>${a.agac_kodu} · ${a.agac_adi}</span>
        <span class="badge">Kök: ${a.stok_kodu}</span>
      </header>
      <div class="tree-root">
        <div class="tree-line root">
          <strong class="mono">${a.stok_kodu}</strong>
          <span>${a.stok_adi}</span>
          <span class="badge">${a.stok_tipi}</span>
        </div>
        ${renderTreeNodes(a.agac || [])}
      </div>
    </div>`));

  table($('#tblMerkez'), ['Kod', 'Ad', 'İş Yeri'],
    merkezler.map((m) => [`<span class="mono">${m.merkez_kodu}</span>`, m.merkez_adi, m.is_yeri_adi]));

  blockList($('#rotaList'), rotalar.map((r) => `
    <div class="block">
      <header>
        <span>${r.rota_kodu} · ${r.rota_adi}</span>
        <span class="badge">${r.stok_kodu}</span>
      </header>
      ${(r.operasyonlar || []).map((o) => `
        <div class="op">
          <div class="op-head">
            <strong class="mono">${o.operasyon_kodu}</strong>
            <span>${o.operasyon_adi}</span>
            <span class="badge">çıktı: ${o.cikti_stok_kodu || '-'}</span>
          </div>
          <div class="muted">Kullanılan:
            ${(o.bilesenler || []).map((b) => `${b.stok_kodu} x${b.miktar}`).join(', ') || '-'}
          </div>
          <div class="muted">Sonraki:
            ${o.sonraki_operasyon
              ? `${o.sonraki_operasyon.operasyon_kodu} — ${o.sonraki_operasyon.operasyon_adi}`
              : 'Yok (son adım)'}
          </div>
        </div>`).join('')}
    </div>`));

  blockList($('#talepList'), talepler.map((t) => `
    <div class="block">
      <header><span class="mono">${t.talep_no}</span><span class="badge">${t.durum}</span></header>
      <ul>${(t.satirlar || []).map((s) => `<li>${s.stok_kodu}: ${s.miktar} ${s.birim || ''}</li>`).join('')}</ul>
    </div>`));

  blockList($('#sasList'), sas.map((s) => `
    <div class="block">
      <header><span class="mono">${s.siparis_no}</span><span class="badge">${s.durum}</span></header>
      <div>${s.cari_adi || ''} · Talep: ${s.talep_no || '-'}</div>
      <ul>${(s.satirlar || []).map((x) => `<li>${x.stok_kodu}: ${x.miktar} (giren ${x.giren_miktar})</li>`).join('')}</ul>
    </div>`));

  blockList($('#mkList'), mk.map((m) => `
    <div class="block">
      <header><span class="mono">${m.kabul_no}</span><span class="badge">${m.depo_kodu}</span></header>
      <div>Sipariş: ${m.siparis_no}</div>
      <ul>${(m.satirlar || []).map((s) => `<li>${s.stok_kodu}: +${s.miktar}</li>`).join('')}</ul>
    </div>`));

  blockList($('#ueList'), emirler.map((e) => `
    <div class="block">
      <header>
        <span class="mono">${e.emir_no}</span>
        <span class="badge">${e.durum}</span>
      </header>
      <div>${e.stok_kodu} · plan ${e.planlanan_miktar} / üretilen ${e.uretilen_miktar}</div>
      <div class="muted">Depolar: HM ${e.hammadde_depo_kodu || '-'} · YM ${e.yari_mamul_depo_kodu || '-'} · MM ${e.mamul_depo_kodu || '-'}</div>
      <h4>Operasyon sırası</h4>
      ${(e.operasyonlar || []).map((o) => `
        <div class="op ${o.durum === 'Hazir' ? 'op-active' : ''}">
          <div class="op-head">
            <strong class="mono">${o.sira_no}. ${o.operasyon_kodu}</strong>
            <span>${o.operasyon_adi}</span>
            <span class="badge">${o.durum}</span>
          </div>
          <div>Üretim miktarı: <span class="mono">${o.uretilen_miktar} / ${o.planlanan_miktar}</span></div>
          <div>Çıktı ürün: <span class="mono">${o.cikti_stok_kodu || '-'}</span></div>
          <div>Kullanılan:
            ${(o.bilesenler || []).map((b) => `${b.stok_kodu} (${b.planlanan_miktar})`).join(', ') || '-'}
          </div>
          <div>Sonraki operasyon:
            ${o.sonraki_operasyon
              ? `${o.sonraki_operasyon.operasyon_kodu} — ${o.sonraki_operasyon.operasyon_adi}`
              : 'Yok'}
          </div>
        </div>`).join('') || '<div class="muted">Operasyon yok</div>'}
    </div>`));

  table($('#tblBakiye'), ['Depo', 'Stok', 'Ad', 'Tip', 'Bakiye'],
    bakiyeler.map((b) => [
      `<span class="mono">${b.depo_kodu}</span>`,
      `<span class="mono">${b.stok_kodu}</span>`,
      b.stok_adi,
      b.stok_tipi,
      `<strong>${b.bakiye}</strong>`,
    ]));

  table($('#tblDepo'), ['Kod', 'Ad', 'İş Yeri', 'Varsayılan', 'Aktif'],
    depolar.map((d) => [
      `<span class="mono">${d.depo_kodu}</span>`,
      d.depo_adi,
      d.is_yeri_adi,
      d.varsayilan ? 'Evet' : 'Hayır',
      d.aktif ? 'Evet' : 'Hayır',
    ]));
}

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    $(`#${btn.dataset.tab}`).classList.add('active');
  });
});

$('#btnRefresh').addEventListener('click', () => {
  loadAll();
});

loadAll();
