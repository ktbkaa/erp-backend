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
    ['Talep', talepler.length],
    ['SAS', sas.length],
    ['Mal Kabul', mk.length],
    ['İş Emri', emirler.length],
    ['Depo', depolar.length],
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
        <span class="badge">${a.stok_kodu} (${a.stok_tipi})</span>
      </header>
      <table>
        <thead><tr><th>Bileşen</th><th>Ad</th><th>Miktar</th><th>Tip</th></tr></thead>
        <tbody>
          ${(a.satirlar || []).map((s) => `
            <tr>
              <td class="mono">${s.stok_kodu}</td>
              <td>${s.stok_adi}</td>
              <td>${s.miktar}</td>
              <td>${s.stok_tipi}</td>
            </tr>`).join('')}
        </tbody>
      </table>
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
        <div>${o.sira_no}. ${o.operasyon_kodu} — ${o.operasyon_adi}
          <span class="badge">${o.merkez_kodu || '-'}</span>
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
      <div>Tüketim depo: ${e.hammadde_depo_kodu || '-'} → Giriş depo: ${e.mamul_depo_kodu || '-'}</div>
      <div>Ağaç: ${e.agac_kodu || '-'} · Rota: ${e.rota_kodu || '-'}</div>
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
