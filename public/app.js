const OPERATORS = [
  { id: 'esit', label: 'Eşit' },
  { id: 'esit_degil', label: 'Eşit değil' },
  { id: 'arasinda', label: 'Arasında' },
];

const MODULES = [
  {
    id: 'ana-veri',
    title: 'Ana Veri',
    screens: [
      {
        id: 'firmalar',
        title: 'Firmalar',
        endpoint: '/firmalar',
        filters: [
          { key: 'firma_kodu', label: 'Firma kodu' },
          { key: 'firma_adi', label: 'Firma adı' },
        ],
        columns: [
          { key: 'firma_kodu', label: 'Kod', mono: true },
          { key: 'firma_adi', label: 'Ad' },
        ],
      },
      {
        id: 'is-yerleri',
        title: 'İş Yerleri',
        endpoint: '/is-yerleri',
        filters: [
          { key: 'firma_adi', label: 'Firma' },
          { key: 'is_yeri_kodu', label: 'İş yeri kodu' },
          { key: 'is_yeri_adi', label: 'İş yeri adı' },
        ],
        columns: [
          { key: 'firma_adi', label: 'Firma' },
          { key: 'is_yeri_kodu', label: 'Kod', mono: true },
          { key: 'is_yeri_adi', label: 'Ad' },
          { key: 'adres', label: 'Adres' },
        ],
      },
      {
        id: 'depolar',
        title: 'Depolar',
        endpoint: '/depolar',
        filters: [
          { key: 'firma_kodu', label: 'Firma' },
          { key: 'is_yeri_kodu', label: 'İş yeri' },
          { key: 'depo_kodu', label: 'Depo kodu' },
          { key: 'depo_adi', label: 'Depo adı' },
        ],
        columns: [
          { key: 'firma_kodu', label: 'Firma', mono: true },
          { key: 'is_yeri_kodu', label: 'İş yeri', mono: true },
          { key: 'depo_kodu', label: 'Kod', mono: true },
          { key: 'depo_adi', label: 'Ad' },
          { key: 'varsayilan', label: 'Varsayılan' },
        ],
      },
    ],
  },
  {
    id: 'stok',
    title: 'Stok',
    screens: [
      {
        id: 'stok-karti',
        title: 'Stok Kartı',
        endpoint: '/stoklar',
        filters: [
          { key: 'firma_kodu', label: 'Firma' },
          { key: 'is_yeri_kodu', label: 'İş yeri' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'stok_adi', label: 'Stok adı' },
        ],
        columns: [
          { key: 'firma_kodu', label: 'Firma', mono: true },
          { key: 'is_yeri_kodu', label: 'İş yeri', mono: true },
          { key: 'stok_kodu', label: 'Stok kodu', mono: true },
          { key: 'stok_adi', label: 'Stok adı' },
          { key: 'stok_tipi', label: 'Tip' },
          { key: 'tedarik_tipi', label: 'Tedarik' },
          { key: 'birim', label: 'Birim' },
          { key: 'satis_fiyati', label: 'Fiyat' },
        ],
      },
      {
        id: 'depo-bakiye',
        title: 'Depo Bakiye',
        endpoint: '/stok-bakiyeleri',
        filters: [
          { key: 'depo_kodu', label: 'Depo kodu' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'stok_adi', label: 'Stok adı' },
          { key: 'stok_tipi', label: 'Stok tipi' },
        ],
        columns: [
          { key: 'depo_kodu', label: 'Depo', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'stok_adi', label: 'Ad' },
          { key: 'stok_tipi', label: 'Tip' },
          { key: 'bakiye', label: 'Bakiye', mono: true },
        ],
      },
    ],
  },
  {
    id: 'cari',
    title: 'Cari',
    screens: [
      {
        id: 'cari-kartlari',
        title: 'Cari Kartları',
        endpoint: '/cariler',
        filters: [
          { key: 'is_yeri_kodu', label: 'İş yeri' },
          { key: 'cari_kodu', label: 'Cari kodu' },
          { key: 'cari_adi', label: 'Cari adı' },
          { key: 'cari_turu', label: 'Tür' },
        ],
        columns: [
          { key: 'cari_kodu', label: 'Kod', mono: true },
          { key: 'cari_adi', label: 'Ad' },
          { key: 'cari_turu', label: 'Tür' },
          { key: 'is_yeri_kodu', label: 'İş yeri', mono: true },
          { key: 'telefon', label: 'Telefon' },
          { key: 'il', label: 'İl' },
        ],
      },
    ],
  },
  {
    id: 'uretim',
    title: 'Üretim',
    screens: [
      {
        id: 'urun-agaci',
        title: 'Ürün Ağacı',
        endpoint: '/urun-agaclari',
        filters: [
          { key: 'agac_kodu', label: 'Ağaç kodu' },
          { key: 'agac_adi', label: 'Ağaç adı' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'stok_adi', label: 'Stok adı' },
        ],
        columns: [
          { key: 'agac_kodu', label: 'Kod', mono: true },
          { key: 'agac_adi', label: 'Ad' },
          { key: 'stok_kodu', label: 'Kök stok', mono: true },
          { key: 'stok_adi', label: 'Kök adı' },
          { key: 'stok_tipi', label: 'Tip' },
        ],
      },
      {
        id: 'is-merkezleri',
        title: 'İş Merkezleri',
        endpoint: '/is-merkezleri',
        filters: [
          { key: 'merkez_kodu', label: 'Merkez kodu' },
          { key: 'merkez_adi', label: 'Merkez adı' },
          { key: 'is_yeri_adi', label: 'İş yeri' },
        ],
        columns: [
          { key: 'merkez_kodu', label: 'Kod', mono: true },
          { key: 'merkez_adi', label: 'Ad' },
          { key: 'is_yeri_adi', label: 'İş yeri' },
        ],
      },
      {
        id: 'rotalar',
        title: 'Rotalar',
        endpoint: '/rotalar',
        filters: [
          { key: 'rota_kodu', label: 'Rota kodu' },
          { key: 'rota_adi', label: 'Rota adı' },
          { key: 'stok_kodu', label: 'Stok kodu' },
        ],
        columns: [
          { key: 'rota_kodu', label: 'Kod', mono: true },
          { key: 'rota_adi', label: 'Ad' },
          { key: 'stok_kodu', label: 'Stok', mono: true },
        ],
      },
      {
        id: 'uretim-emirleri',
        title: 'Üretim Emirleri',
        endpoint: '/uretim-emirleri',
        filters: [
          { key: 'emir_no', label: 'Emir no' },
          { key: 'stok_kodu', label: 'Stok kodu' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'emir_no', label: 'Emir', mono: true },
          { key: 'stok_kodu', label: 'Stok', mono: true },
          { key: 'planlanan_miktar', label: 'Plan' },
          { key: 'uretilen_miktar', label: 'Üretilen' },
          { key: 'durum', label: 'Durum' },
        ],
      },
    ],
  },
  {
    id: 'satinalma',
    title: 'Satınalma',
    screens: [
      {
        id: 'satin-alma-talepleri',
        title: 'Satınalma Talepleri',
        endpoint: '/satin-alma-talepleri',
        filters: [
          { key: 'talep_no', label: 'Talep no' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'talep_no', label: 'Talep', mono: true },
          { key: 'durum', label: 'Durum' },
          { key: 'aciklama', label: 'Açıklama' },
        ],
      },
      {
        id: 'satin-alma-siparisleri',
        title: 'Satınalma Siparişleri',
        endpoint: '/satin-alma-siparisleri',
        filters: [
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'durum', label: 'Durum' },
        ],
        columns: [
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'cari_adi', label: 'Cari' },
          { key: 'talep_no', label: 'Talep', mono: true },
          { key: 'durum', label: 'Durum' },
        ],
      },
      {
        id: 'mal-kabuller',
        title: 'Mal Kabuller',
        endpoint: '/mal-kabuller',
        filters: [
          { key: 'kabul_no', label: 'Kabul no' },
          { key: 'siparis_no', label: 'Sipariş no' },
          { key: 'depo_kodu', label: 'Depo' },
        ],
        columns: [
          { key: 'kabul_no', label: 'Kabul', mono: true },
          { key: 'siparis_no', label: 'Sipariş', mono: true },
          { key: 'depo_kodu', label: 'Depo', mono: true },
        ],
      },
    ],
  },
];

const ALL_SCREENS = MODULES.flatMap((m) =>
  m.screens.map((s) => ({ ...s, moduleId: m.id, moduleTitle: m.title }))
);

const state = {
  screenId: null,
  rows: [],
  filtered: [],
  filterState: {},
};

const $ = (sel) => document.querySelector(sel);

async function api(path) {
  const res = await fetch(path);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { /* ignore */ }
  if (!res.ok) {
    const msg = (data && (data.hata || data.detay)) || text || res.statusText;
    throw new Error(`${path} → ${res.status}: ${msg}`);
  }
  return data;
}

function norm(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'evet' : 'hayir';
  return String(v).trim().toLocaleLowerCase('tr');
}

function compareValues(cell, op, a, b) {
  const cellN = norm(cell);
  const aN = norm(a);
  const bN = norm(b);

  if (op === 'esit') {
    if (!aN) return true;
    return cellN === aN;
  }
  if (op === 'esit_degil') {
    if (!aN) return true;
    return cellN !== aN;
  }
  if (op === 'arasinda') {
    if (!aN && !bN) return true;
    if (aN && cellN < aN) return false;
    if (bN && cellN > bN) return false;
    return true;
  }
  return true;
}

function applyFilters(rows, screen) {
  const active = screen.filters
    .map((f) => ({ def: f, st: state.filterState[f.key] || { op: 'esit', a: '', b: '' } }))
    .filter(({ st }) => {
      if (st.op === 'arasinda') return Boolean(norm(st.a) || norm(st.b));
      return Boolean(norm(st.a));
    });

  if (!active.length) return rows.slice();

  return rows.filter((row) =>
    active.every(({ def, st }) => compareValues(row[def.key], st.op, st.a, st.b))
  );
}

function findScreen(id) {
  return ALL_SCREENS.find((s) => s.id === id) || null;
}

function renderSidebar() {
  const nav = $('#sidebarNav');
  nav.innerHTML = MODULES.map((mod) => `
    <div class="mod-group">
      <div class="mod-title">${mod.title}</div>
      ${mod.screens.map((s) => `
        <button type="button" class="mod-item${state.screenId === s.id ? ' active' : ''}" data-screen="${s.id}">
          ${s.title}
        </button>
      `).join('')}
    </div>
  `).join('');
}

function renderHomeHints() {
  const box = $('#homeHints');
  const picks = ALL_SCREENS.slice(0, 8);
  box.innerHTML = picks.map((s) => `
    <button type="button" class="home-chip" data-screen="${s.id}">
      <strong>${s.title}</strong>
      <span class="mod">${s.moduleTitle}</span>
    </button>
  `).join('');
}

function showHome() {
  state.screenId = null;
  state.rows = [];
  state.filtered = [];
  state.filterState = {};

  if (location.hash && location.hash !== '#') {
    history.pushState({ screenId: null }, '', location.pathname);
  }

  $('#viewHome').hidden = false;
  $('#viewScreen').hidden = true;
  $('#homeSearchWrap').hidden = false;
  $('#screenTitle').textContent = 'Ana Sayfa';
  $('#screenSearch').value = '';
  $('#searchResults').hidden = true;
  $('#searchResults').innerHTML = '';
  renderSidebar();
  $('#sidebar').classList.remove('open');
}

function readFilterState(screen) {
  const next = {};
  screen.filters.forEach((f) => {
    const opEl = document.querySelector(`[data-filter-op="${f.key}"]`);
    const aEl = document.querySelector(`[data-filter-a="${f.key}"]`);
    const bEl = document.querySelector(`[data-filter-b="${f.key}"]`);
    next[f.key] = {
      op: opEl ? opEl.value : 'esit',
      a: aEl ? aEl.value : '',
      b: bEl ? bEl.value : '',
    };
  });
  state.filterState = next;
}

function syncBetweenInputs(screen) {
  screen.filters.forEach((f) => {
    const opEl = document.querySelector(`[data-filter-op="${f.key}"]`);
    const wrap = document.querySelector(`[data-filter-values="${f.key}"]`);
    if (!opEl || !wrap) return;
    const arasinda = opEl.value === 'arasinda';
    wrap.classList.toggle('split', arasinda);
    const b = wrap.querySelector(`[data-filter-b="${f.key}"]`);
    if (b) b.hidden = !arasinda;
  });
}

function renderFilterPane(screen) {
  const grid = $('#filterGrid');
  grid.innerHTML = screen.filters.map((f) => {
    const st = state.filterState[f.key] || { op: 'esit', a: '', b: '' };
    return `
      <div class="filter-field">
        <label>${f.label}</label>
        <select data-filter-op="${f.key}">
          ${OPERATORS.map((o) => `
            <option value="${o.id}" ${st.op === o.id ? 'selected' : ''}>${o.label}</option>
          `).join('')}
        </select>
        <div class="filter-values${st.op === 'arasinda' ? ' split' : ''}" data-filter-values="${f.key}">
          <input type="text" data-filter-a="${f.key}" value="${st.a || ''}" placeholder="Değer" />
          <input type="text" data-filter-b="${f.key}" value="${st.b || ''}" placeholder="Bitiş" ${st.op === 'arasinda' ? '' : 'hidden'} />
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-filter-op]').forEach((el) => {
    el.addEventListener('change', () => syncBetweenInputs(screen));
  });
}

function cellHtml(col, row) {
  let val = row[col.key];
  if (typeof val === 'boolean') val = val ? 'Evet' : 'Hayır';
  if (val === null || val === undefined || val === '') val = '—';
  return col.mono ? `<span class="mono">${val}</span>` : String(val);
}

function renderList(screen) {
  const head = $('#dataHead');
  const body = $('#dataBody');
  head.innerHTML = `<tr>${screen.columns.map((c) => `<th>${c.label}</th>`).join('')}</tr>`;

  if (!state.filtered.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="${screen.columns.length}">Kayıt yok. Filtreyi gevşetin veya veri girin.</td></tr>`;
  } else {
    body.innerHTML = state.filtered.map((row) => `
      <tr>${screen.columns.map((c) => `<td>${cellHtml(c, row)}</td>`).join('')}</tr>
    `).join('');
  }

  $('#listMeta').textContent = `${state.filtered.length} / ${state.rows.length} kayıt`;
}

async function openScreen(id) {
  const screen = findScreen(id);
  if (!screen) return;

  state.screenId = id;
  state.filterState = {};
  screen.filters.forEach((f) => {
    state.filterState[f.key] = { op: 'esit', a: '', b: '' };
  });

  if (location.hash !== `#${id}`) {
    history.pushState({ screenId: id }, '', `#${id}`);
  }

  $('#viewHome').hidden = true;
  $('#viewScreen').hidden = false;
  $('#homeSearchWrap').hidden = true;
  $('#screenTitle').textContent = screen.title;
  $('#searchResults').hidden = true;
  renderSidebar();
  renderFilterPane(screen);
  $('#listMeta').textContent = 'Yükleniyor…';
  $('#dataBody').innerHTML = `<tr class="empty-row"><td colspan="${screen.columns.length}">Yükleniyor…</td></tr>`;
  $('#sidebar').classList.remove('open');

  try {
    const data = await api(screen.endpoint);
    // Ekran değiştiyse eski yanıtı yazma
    if (state.screenId !== id) return;
    state.rows = Array.isArray(data) ? data : [];
    state.filtered = applyFilters(state.rows, screen);
    renderList(screen);
  } catch (err) {
    if (state.screenId !== id) return;
    state.rows = [];
    state.filtered = [];
    $('#dataBody').innerHTML = `<tr class="empty-row"><td colspan="${screen.columns.length}">${err.message}</td></tr>`;
    $('#listMeta').textContent = 'Hata';
  }
}

function runSearch(q) {
  const box = $('#searchResults');
  const query = q.trim().toLocaleLowerCase('tr');
  if (query.length < 3) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  const hits = ALL_SCREENS.filter((s) =>
    s.title.toLocaleLowerCase('tr').includes(query) ||
    s.moduleTitle.toLocaleLowerCase('tr').includes(query)
  ).slice(0, 12);

  if (!hits.length) {
    box.hidden = false;
    box.innerHTML = '<div class="search-empty">Eşleşen ekran yok.</div>';
    return;
  }

  box.hidden = false;
  box.innerHTML = hits.map((s) => `
    <button type="button" class="search-hit" data-screen="${s.id}">
      <strong>${s.title}</strong>
      <span>${s.moduleTitle}</span>
    </button>
  `).join('');

  box.querySelectorAll('[data-screen]').forEach((btn) => {
    btn.addEventListener('click', () => openScreen(btn.dataset.screen));
  });
}

function bindEvents() {
  document.addEventListener('click', (e) => {
    const screenBtn = e.target.closest('[data-screen]');
    if (screenBtn) {
      e.preventDefault();
      openScreen(screenBtn.dataset.screen);
      return;
    }
    const wrap = $('#homeSearchWrap');
    if (wrap && !wrap.contains(e.target)) {
      $('#searchResults').hidden = true;
    }
  });

  $('#btnHome').addEventListener('click', showHome);
  $('#btnMenu').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });

  $('#btnApplyFilter').addEventListener('click', () => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    readFilterState(screen);
    state.filtered = applyFilters(state.rows, screen);
    renderList(screen);
  });

  $('#btnClearFilter').addEventListener('click', () => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    state.filterState = {};
    screen.filters.forEach((f) => {
      state.filterState[f.key] = { op: 'esit', a: '', b: '' };
    });
    renderFilterPane(screen);
    state.filtered = state.rows.slice();
    renderList(screen);
  });

  const search = $('#screenSearch');
  search.addEventListener('input', () => runSearch(search.value));
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('#searchResults').hidden = true;
    }
  });

  window.addEventListener('popstate', () => {
    const id = (location.hash || '').replace(/^#/, '');
    if (id && findScreen(id)) openScreen(id);
    else showHome();
  });
}

function bootFromHash() {
  const id = (location.hash || '').replace(/^#/, '');
  renderSidebar();
  renderHomeHints();
  bindEvents();
  if (id && findScreen(id)) openScreen(id);
  else showHome();
}

bootFromHash();
