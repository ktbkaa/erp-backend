const $ = (sel) => document.querySelector(sel);

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

function table(el, headers, rows) {
  if (!rows.length) {
    el.innerHTML = `<tr><td colspan="${headers.length}">Kayıt yok. <code>npm run demo:cycle</code> çalıştır.</td></tr>`;
    return;
  }
  el.innerHTML = `
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}
    </tbody>
  `;
}

function blockList(el, itemsHtml) {
  el.innerHTML = itemsHtml.length
    ? itemsHtml.join('')
    : `<div class="block">Kayıt yok. <code>npm run demo:cycle</code> çalıştır.</div>`;
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

async function loadAll() {
  const [
    stoklar, bom, merkezler, rotalar,
    talepler, sas, mk, emirler, bakiyeler, depolar,
  ] = await Promise.all([
    api('/stoklar'),
    api('/urun-agaclari'),
    api('/is-merkezleri'),
    api('/rotalar'),
    api('/satin-alma-talepleri'),
    api('/satin-alma-siparisleri'),
    api('/mal-kabuller'),
    api('/uretim-emirleri'),
    api('/stok-bakiyeleri'),
    api('/depolar'),
  ]);

  $('#ozetCards').innerHTML = [
    ['Stok', stoklar.length],
    ['Ürün Ağacı', bom.length],
    ['Rota', rotalar.length],
    ['Talep', talepler.length],
    ['SAS', sas.length],
    ['İş Emri', emirler.length],
  ].map(([l, n]) => `<div class="card"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');

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
  loadAll().catch((e) => alert(e.message));
});

loadAll().catch((e) => {
  $('#ozetCards').innerHTML = `<div class="block">API hatası: ${e.message}. Sunucu çalışıyor mu?</div>`;
});
