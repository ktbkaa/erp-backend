const OPERATORS = [
  { id: 'esit', label: 'Eşit' },
  { id: 'esit_degil', label: 'Eşit değil' },
  { id: 'arasinda', label: 'Arasında' },
];

const MODULES = [
  {
    id: 'sistem',
    title: 'Sistem',
    screens: [
      {
        id: 'numarator-tanimi',
        title: 'Numaratör Tanımı',
        endpoint: '/kod-serileri',
        crud: true,
        codeField: 'seri_kodu',
        nameField: 'aciklama',
        numeratorSeri: null,
        filters: [
          { key: 'seri_kodu', label: 'Seri kodu' },
          { key: 'ekran_adi', label: 'Ekran adı' },
          { key: 'onek', label: 'Önek' },
        ],
        columns: [
          { key: 'seri_kodu', label: 'Seri', mono: true },
          { key: 'onek', label: 'Önek', mono: true },
          { key: 'aciklama', label: 'Açıklama' },
          { key: 'ekran_adi', label: 'Ekran' },
          { key: 'son_numara', label: 'Son no' },
          { key: 'aktif', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'seri_kodu', label: 'Seri kodu', code: true, editableOnNew: true },
          { key: 'onek', label: 'Önek' },
          { key: 'aciklama', label: 'Açıklama', name: true },
          { key: 'ekran_kodu', label: 'Ekran kodu' },
          { key: 'ekran_adi', label: 'Ekran adı' },
          { key: 'son_numara', label: 'Son numara', type: 'number' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
      },
    ],
  },
  {
    id: 'ana-veri',
    title: 'Ana Veri',
    screens: [
      {
        id: 'firmalar',
        title: 'Firmalar',
        endpoint: '/firmalar',
        crud: true,
        codeField: 'firma_kodu',
        nameField: 'firma_adi',
        numeratorSeri: 'FIRMA',
        filters: [
          { key: 'firma_kodu', label: 'Firma kodu' },
          { key: 'firma_adi', label: 'Firma adı' },
        ],
        columns: [
          { key: 'firma_kodu', label: 'Kod', mono: true },
          { key: 'firma_adi', label: 'Ad' },
        ],
        masterFields: [
          { key: 'firma_kodu', label: 'Firma kodu', code: true },
          { key: 'firma_adi', label: 'Firma adı', name: true },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'is-yerleri',
        title: 'İş Yerleri',
        endpoint: '/is-yerleri',
        crud: true,
        codeField: 'is_yeri_kodu',
        nameField: 'is_yeri_adi',
        numeratorSeri: 'ISYERI',
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
        masterFields: [
          { key: 'is_yeri_kodu', label: 'İş yeri kodu', code: true },
          { key: 'is_yeri_adi', label: 'İş yeri adı', name: true },
          { key: 'firma_id', label: 'Firma ID', type: 'number' },
          { key: 'adres', label: 'Adres' },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'depolar',
        title: 'Depolar',
        endpoint: '/depolar',
        crud: true,
        codeField: 'depo_kodu',
        nameField: 'depo_adi',
        numeratorSeri: 'DEPO',
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
        masterFields: [
          { key: 'depo_kodu', label: 'Depo kodu', code: true },
          { key: 'depo_adi', label: 'Depo adı', name: true },
          { key: 'is_yeri_id', label: 'İş yeri ID', type: 'number' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
          { key: 'varsayilan', label: 'Varsayılan', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
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
        crud: true,
        codeField: 'stok_kodu',
        nameField: 'stok_adi',
        numeratorSeri: 'HAMMADDE',
        numeratorFromField: { field: 'stok_tipi', map: {
          Hammadde: 'HAMMADDE',
          YariMamul: 'YARIMAMUL',
          Mamul: 'MAMUL',
          Ticari: 'TICARI',
          Hizmet: 'TICARI',
        } },
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
        masterFields: [
          { key: 'stok_kodu', label: 'Stok kodu', code: true },
          { key: 'stok_adi', label: 'Stok adı', name: true },
          { key: 'stok_tipi', label: 'Stok tipi', type: 'select', options: ['Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'] },
          { key: 'tedarik_tipi', label: 'Tedarik tipi', type: 'select', options: ['Satinalma', 'Uretim'] },
          { key: 'birim', label: 'Birim' },
          { key: 'satis_fiyati', label: 'Satış fiyatı', type: 'number' },
        ],
        detailFields: [
          { key: 'boyut', label: 'Boyut' },
          { key: 'agirlik', label: 'Ağırlık', type: 'number' },
        ],
        detailKey: 'stok_detaylari',
      },
      {
        id: 'depo-bakiye',
        title: 'Depo Bakiye',
        endpoint: '/stok-bakiyeleri',
        crud: false,
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
        crud: true,
        codeField: 'cari_kodu',
        nameField: 'cari_adi',
        numeratorSeri: 'MUSTERI',
        numeratorFromField: { field: 'cari_turu', map: {
          Musteri: 'MUSTERI',
          Tedarikci: 'TEDARIKCI',
          HerIkisi: 'CARI_HERIKISI',
        } },
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
        masterFields: [
          { key: 'cari_kodu', label: 'Cari kodu', code: true },
          { key: 'cari_adi', label: 'Cari adı', name: true },
          { key: 'cari_turu', label: 'Tür', type: 'select', options: ['Musteri', 'Tedarikci', 'HerIkisi'] },
          { key: 'is_yeri_id', label: 'İş yeri ID', type: 'number' },
          { key: 'telefon', label: 'Telefon' },
          { key: 'email', label: 'E-posta' },
          { key: 'vergi_no', label: 'Vergi no' },
          { key: 'vergi_dairesi', label: 'Vergi dairesi' },
          { key: 'yetkili_adi', label: 'Yetkili' },
          { key: 'yetkili_telefon', label: 'Yetkili tel' },
          { key: 'il', label: 'İl' },
          { key: 'ilce', label: 'İlçe' },
          { key: 'adres', label: 'Adres' },
          { key: 'odeme_vadesi_gun', label: 'Vade (gün)', type: 'number' },
          { key: 'aktif', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [
          { key: 'adres', label: 'Adres' },
          { key: 'fatura_adresi', label: 'Fatura adresi' },
          { key: 'yetkili_adi', label: 'Yetkili' },
          { key: 'yetkili_telefon', label: 'Yetkili tel' },
        ],
        detailKey: 'cari_detaylari',
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
        crud: false,
        numeratorSeri: 'URUN_AGACI',
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
        crud: false,
        numeratorSeri: 'IS_MERKEZI',
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
        crud: false,
        numeratorSeri: 'ROTA',
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
        crud: false,
        numeratorSeri: 'URETIM_EMRI',
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
        crud: false,
        numeratorSeri: 'SATINALMA_TALEP',
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
        crud: false,
        numeratorSeri: 'SATINALMA_SIPARIS',
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
        crud: false,
        numeratorSeri: 'MAL_KABUL',
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

const MODE_LABELS = {
  yeni: 'Yeni',
  incele: 'İncele',
  duzelt: 'Düzelt',
  kopyala: 'Kopyala',
};

const state = {
  screenId: null,
  rows: [],
  filtered: [],
  filterState: {},
  selectedId: null,
  formMode: null,
  formRecord: null,
  detailRows: [],
};

const $ = (sel) => document.querySelector(sel);

function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2800);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { /* ignore */ }
  if (!res.ok) {
    const msg = (data && (data.hata || data.detay)) || text || res.statusText;
    throw new Error(msg);
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
  if (op === 'esit') return !aN || cellN === aN;
  if (op === 'esit_degil') return !aN || cellN !== aN;
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
    .filter(({ st }) => (st.op === 'arasinda' ? Boolean(norm(st.a) || norm(st.b)) : Boolean(norm(st.a))));
  if (!active.length) return rows.slice();
  return rows.filter((row) =>
    active.every(({ def, st }) => compareValues(row[def.key], st.op, st.a, st.b))
  );
}

function findScreen(id) {
  return ALL_SCREENS.find((s) => s.id === id) || null;
}

function selectedRow() {
  return state.filtered.find((r) => String(r.id) === String(state.selectedId)) || null;
}

function resolveNumeratorSeri(screen, record = {}) {
  if (screen.numeratorFromField) {
    const val = record[screen.numeratorFromField.field];
    return screen.numeratorFromField.map[val] || screen.numeratorSeri;
  }
  return screen.numeratorSeri;
}

async function ayirKod(seriKodu) {
  if (!seriKodu) throw new Error('Bu ekran için numaratör bağlı değil.');
  const data = await api(`/kod-serileri/${encodeURIComponent(seriKodu)}/ayir`, { method: 'POST' });
  return data.kod;
}

function showView(name) {
  const home = $('#viewHome');
  const screen = $('#viewScreen');
  const form = $('#viewForm');
  home.classList.toggle('is-visible', name === 'home');
  screen.classList.toggle('is-visible', name === 'screen');
  form.classList.toggle('is-visible', name === 'form');
  home.hidden = name !== 'home';
  screen.hidden = name !== 'screen';
  form.hidden = name !== 'form';
}

function renderSidebar() {
  const nav = $('#sidebarNav');
  if (!nav) return;
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

function showHome() {
  state.screenId = null;
  state.rows = [];
  state.filtered = [];
  state.selectedId = null;
  state.formMode = null;
  if (location.hash && location.hash !== '#') {
    history.pushState({ screenId: null }, '', location.pathname);
  }
  showView('home');
  $('#homeSearchWrap').hidden = false;
  $('#screenTitle').textContent = 'Ana Sayfa';
  $('#screenSearch').value = '';
  $('#searchResults').hidden = true;
  renderSidebar();
}

function readFilterState(screen) {
  const next = {};
  screen.filters.forEach((f) => {
    next[f.key] = {
      op: document.querySelector(`[data-filter-op="${f.key}"]`)?.value || 'esit',
      a: document.querySelector(`[data-filter-a="${f.key}"]`)?.value || '',
      b: document.querySelector(`[data-filter-b="${f.key}"]`)?.value || '',
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
          ${OPERATORS.map((o) => `<option value="${o.id}" ${st.op === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}
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
    body.innerHTML = `<tr class="empty-row"><td colspan="${screen.columns.length}">Kayıt yok.</td></tr>`;
  } else {
    body.innerHTML = state.filtered.map((row) => `
      <tr data-id="${row.id}" class="${String(row.id) === String(state.selectedId) ? 'selected' : ''}">
        ${screen.columns.map((c) => `<td>${cellHtml(c, row)}</td>`).join('')}
      </tr>
    `).join('');
  }
  $('#listMeta').textContent = `${state.filtered.length} / ${state.rows.length} kayıt`;
  updateActionButtons(screen);
}

function updateActionButtons(screen) {
  const hasSel = Boolean(state.selectedId);
  const crud = Boolean(screen.crud);
  document.querySelectorAll('#actionBar [data-action]').forEach((btn) => {
    const act = btn.dataset.action;
    if (!crud) {
      btn.disabled = act !== 'incele' || !hasSel;
      return;
    }
    if (act === 'yeni') btn.disabled = false;
    else btn.disabled = !hasSel;
  });
}

async function openScreen(id) {
  try {
    const screen = findScreen(id);
    if (!screen) {
      toast(`Ekran bulunamadı: ${id || '?'}`);
      return;
    }

    state.screenId = id;
    state.selectedId = null;
    state.formMode = null;
    state.filterState = {};
    (screen.filters || []).forEach((f) => {
      state.filterState[f.key] = { op: 'esit', a: '', b: '' };
    });

    if (location.hash !== `#${id}`) {
      history.pushState({ screenId: id }, '', `#${id}`);
    }

    showView('screen');
    $('#homeSearchWrap').hidden = true;
    $('#screenTitle').textContent = screen.title;
    $('#searchResults').hidden = true;
    $('#listMeta').textContent = 'Yükleniyor…';
    $('#dataBody').innerHTML = `<tr class="empty-row"><td colspan="${(screen.columns || []).length}">Yükleniyor…</td></tr>`;

    // Tıklama bitmeden menüyü yeniden çizme (bazı tarayıcılarda click iptal olabiliyor)
    requestAnimationFrame(() => renderSidebar());
    renderFilterPane(screen);

    if (window.matchMedia('(max-width: 900px)').matches) {
      $('#sidebar').classList.remove('open');
    }

    const data = await api(screen.endpoint);
    if (state.screenId !== id) return;
    let rows = Array.isArray(data) ? data : [];
    if (screen.id === 'numarator-tanimi') {
      rows = rows.map((r) => ({ ...r, id: r.seri_kodu }));
    }
    state.rows = rows;
    state.filtered = applyFilters(state.rows, screen);
    renderList(screen);
  } catch (err) {
    console.error(err);
    toast(err.message || 'Ekran açılamadı');
    const screen = findScreen(id);
    if (!screen || state.screenId !== id) return;
    state.rows = [];
    state.filtered = [];
    showView('screen');
    $('#dataBody').innerHTML = `<tr class="empty-row"><td colspan="${(screen.columns || []).length}">${err.message}</td></tr>`;
    $('#listMeta').textContent = 'Hata';
    updateActionButtons(screen);
  }
}

function fieldControl(field, value) {
  const codeLocked = field.code && !(field.editableOnNew && state.formMode === 'yeni');
  const forceDisabled = state.formMode === 'incele' || codeLocked;
  const dis = forceDisabled ? 'disabled' : '';
  const v = value ?? '';
  if (field.type === 'checkbox') {
    return `<input type="checkbox" data-master="${field.key}" ${v ? 'checked' : ''} ${dis} />`;
  }
  if (field.type === 'select') {
    return `<select data-master="${field.key}" ${dis}>
      ${(field.options || []).map((o) => `<option value="${o}" ${String(v) === String(o) ? 'selected' : ''}>${o}</option>`).join('')}
    </select>`;
  }
  if (field.type === 'number') {
    return `<input type="number" data-master="${field.key}" value="${v}" ${dis} />`;
  }
  return `<input type="text" data-master="${field.key}" value="${String(v).replace(/"/g, '&quot;')}" ${dis} />`;
}

function renderForm(screen) {
  const readonly = state.formMode === 'incele';
  const rec = state.formRecord || {};
  $('#formModeBadge').textContent = MODE_LABELS[state.formMode] || state.formMode;
  $('#formScreenLabel').textContent = screen.title;
  $('#btnFormSave').hidden = readonly;
  $('#btnAddDetail').hidden = readonly || !screen.detailFields?.length;

  $('#masterGrid').innerHTML = (screen.masterFields || []).map((f) => `
    <div class="field">
      <label>${f.label}</label>
      ${fieldControl(f, rec[f.key])}
    </div>
  `).join('');

  const dFields = screen.detailFields || [];
  if (!dFields.length) {
    $('#detailHead').innerHTML = '';
    $('#detailBody').innerHTML = `<tr class="empty-row"><td>Bu ekranda detay satırı yok.</td></tr>`;
  } else {
    $('#detailHead').innerHTML = `<tr>${dFields.map((f) => `<th>${f.label}</th>`).join('')}<th></th></tr>`;
    if (!state.detailRows.length) {
      $('#detailBody').innerHTML = `<tr class="empty-row"><td colspan="${dFields.length + 1}">Detay satırı yok. Satır ekle ile ekleyin.</td></tr>`;
    } else {
      $('#detailBody').innerHTML = state.detailRows.map((row, idx) => `
        <tr data-didx="${idx}">
          ${dFields.map((f) => `
            <td><input data-detail="${f.key}" data-didx="${idx}" value="${row[f.key] ?? ''}" ${readonly ? 'disabled' : ''} /></td>
          `).join('')}
          <td>${readonly ? '' : `<button type="button" class="btn ghost small" data-del-detail="${idx}">Sil</button>`}</td>
        </tr>
      `).join('');
    }
  }
}

function readMasterFromForm(screen) {
  const out = { ...(state.formRecord || {}) };
  (screen.masterFields || []).forEach((f) => {
    const el = document.querySelector(`[data-master="${f.key}"]`);
    if (!el) return;
    if (f.type === 'checkbox') out[f.key] = el.checked;
    else if (f.type === 'number') out[f.key] = el.value === '' ? null : Number(el.value);
    else out[f.key] = el.value;
  });
  return out;
}

function readDetailsFromForm(screen) {
  if (!screen.detailFields?.length) return [];
  return state.detailRows.map((_, idx) => {
    const row = {};
    screen.detailFields.forEach((f) => {
      const el = document.querySelector(`[data-detail="${f.key}"][data-didx="${idx}"]`);
      row[f.key] = el ? el.value : '';
    });
    return row;
  });
}

async function openForm(mode) {
  const screen = findScreen(state.screenId);
  if (!screen) return;
  if (!screen.crud && mode !== 'incele') {
    toast('Bu ekranda henüz kart formu yok.');
    return;
  }
  if (!screen.crud && mode === 'incele') {
    toast('Bu ekran şimdilik yalnızca listelenir.');
    return;
  }

  const needsRow = mode === 'incele' || mode === 'duzelt' || mode === 'kopyala';
  const row = selectedRow();
  if (needsRow && !row) {
    toast('Önce listeden bir satır seçin.');
    return;
  }

  state.formMode = mode;
  let record = {};

  if (mode === 'yeni') {
    record = {};
    (screen.masterFields || []).forEach((f) => {
      if (f.type === 'checkbox') record[f.key] = true;
      else if (f.type === 'select') record[f.key] = f.options?.[0] || '';
      else record[f.key] = '';
    });
    const seri = resolveNumeratorSeri(screen, record);
    if (seri) {
      record[screen.codeField] = await ayirKod(seri);
    }
    state.detailRows = [];
  } else if (mode === 'kopyala') {
    const full = await api(`${screen.endpoint}/${row.id}`);
    record = { ...full };
    delete record.id;
    record[screen.nameField] = '';
    const seri = resolveNumeratorSeri(screen, record);
    record[screen.codeField] = await ayirKod(seri);
    state.detailRows = Array.isArray(full[screen.detailKey])
      ? full[screen.detailKey].map(({ id, ...rest }) => ({ ...rest }))
      : [];
  } else {
    const full = await api(`${screen.endpoint}/${row.id}`);
    record = { ...full };
    state.detailRows = Array.isArray(full[screen.detailKey])
      ? full[screen.detailKey].map((d) => ({ ...d }))
      : [];
  }

  // Numaratör tanımı: yeni/kopyala için ayrı POST yapısı
  if (screen.id === 'numarator-tanimi' && (mode === 'yeni' || mode === 'kopyala')) {
    record.son_numara = 0;
    record.aktif = true;
    if (mode === 'yeni') record.seri_kodu = '';
  }

  state.formRecord = record;
  showView('form');
  $('#homeSearchWrap').hidden = true;
  $('#screenTitle').textContent = `${screen.title} · ${MODE_LABELS[mode]}`;
  renderForm(screen);
}

async function saveForm() {
  const screen = findScreen(state.screenId);
  if (!screen || state.formMode === 'incele') return;

  const master = readMasterFromForm(screen);
  const details = readDetailsFromForm(screen);
  if (screen.detailKey) master[screen.detailKey] = details;

  if (screen.nameField && !master[screen.nameField]) {
    toast(`${screen.nameField} zorunlu.`);
    return;
  }

  try {
    if (screen.id === 'numarator-tanimi') {
      if (state.formMode === 'duzelt') {
        await api(`/kod-serileri/${encodeURIComponent(master.seri_kodu)}`, {
          method: 'PUT',
          body: JSON.stringify(master),
        });
      } else {
        await api('/kod-serileri', { method: 'POST', body: JSON.stringify(master) });
      }
    } else if (state.formMode === 'duzelt') {
      await api(`${screen.endpoint}/${master.id}`, { method: 'PUT', body: JSON.stringify(master) });
    } else {
      await api(screen.endpoint, { method: 'POST', body: JSON.stringify(master) });
    }
    toast('Kaydedildi.');
    await openScreen(screen.id);
  } catch (err) {
    toast(err.message);
  }
}

async function deleteSelected() {
  const screen = findScreen(state.screenId);
  const row = selectedRow();
  if (!screen?.crud || !row) {
    toast('Silmek için satır seçin.');
    return;
  }
  if (screen.id === 'numarator-tanimi') {
    toast('Numaratör silinmez; pasife alın.');
    return;
  }
  if (!confirm(`${row[screen.codeField] || row.id} silinsin mi?`)) return;
  try {
    await api(`${screen.endpoint}/${row.id}`, { method: 'DELETE' });
    toast('Silindi.');
    state.selectedId = null;
    await openScreen(screen.id);
  } catch (err) {
    toast(err.message);
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
}

function bindEvents() {
  const nav = $('#sidebarNav');
  if (nav && !nav.dataset.bound) {
    nav.dataset.bound = '1';
    nav.addEventListener('click', (e) => {
      const screenBtn = e.target.closest('[data-screen]');
      if (!screenBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = screenBtn.getAttribute('data-screen');
      openScreen(id);
    });
  }

  document.addEventListener('click', (e) => {
    const screenBtn = e.target.closest('[data-screen]');
    if (screenBtn) {
      // sidebar kendi handler'ında; arama sonuçları burada
      if (screenBtn.closest('#sidebarNav')) return;
      e.preventDefault();
      openScreen(screenBtn.getAttribute('data-screen'));
      return;
    }

    const actionBtn = e.target.closest('#actionBar [data-action]');
    if (actionBtn && !actionBtn.disabled) {
      const act = actionBtn.dataset.action;
      if (act === 'sil') deleteSelected();
      else openForm(act).catch((err) => toast(err.message));
      return;
    }

    const row = e.target.closest('#dataBody tr[data-id]');
    if (row) {
      state.selectedId = row.dataset.id;
      const screen = findScreen(state.screenId);
      if (screen) renderList(screen);
      return;
    }

    const delDetail = e.target.closest('[data-del-detail]');
    if (delDetail) {
      const idx = Number(delDetail.dataset.delDetail);
      state.detailRows = readDetailsFromForm(findScreen(state.screenId));
      state.detailRows.splice(idx, 1);
      renderForm(findScreen(state.screenId));
      return;
    }

    const wrap = $('#homeSearchWrap');
    if (wrap && !wrap.contains(e.target)) $('#searchResults').hidden = true;
  });

  $('#btnHome').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showHome();
  });

  $('#btnMenu').addEventListener('click', () => {
    const shell = $('#appShell');
    const sidebar = $('#sidebar');
    if (window.matchMedia('(max-width: 900px)').matches) {
      sidebar.classList.toggle('open');
    } else {
      shell.classList.toggle('sidebar-collapsed');
    }
  });

  $('#btnApplyFilter').addEventListener('click', () => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    readFilterState(screen);
    state.filtered = applyFilters(state.rows, screen);
    state.selectedId = null;
    renderList(screen);
  });

  $('#btnClearFilter').addEventListener('click', () => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    state.filterState = {};
    screen.filters.forEach((f) => { state.filterState[f.key] = { op: 'esit', a: '', b: '' }; });
    renderFilterPane(screen);
    state.filtered = state.rows.slice();
    state.selectedId = null;
    renderList(screen);
  });

  $('#btnFormCancel').addEventListener('click', () => {
    const id = state.screenId;
    openScreen(id);
  });

  $('#btnFormSave').addEventListener('click', () => {
    saveForm();
  });

  $('#btnAddDetail').addEventListener('click', () => {
    const screen = findScreen(state.screenId);
    if (!screen?.detailFields?.length) return;
    state.detailRows = readDetailsFromForm(screen);
    const blank = {};
    screen.detailFields.forEach((f) => { blank[f.key] = ''; });
    state.detailRows.push(blank);
    state.formRecord = readMasterFromForm(screen);
    renderForm(screen);
  });

  const search = $('#screenSearch');
  search.addEventListener('input', () => runSearch(search.value));
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#searchResults').hidden = true;
  });

  window.addEventListener('popstate', () => {
    const id = (location.hash || '').replace(/^#/, '');
    if (id && findScreen(id)) openScreen(id);
    else showHome();
  });
}

function bootFromHash() {
  renderSidebar();
  bindEvents();
  const id = (location.hash || '').replace(/^#/, '');
  if (id && findScreen(id)) openScreen(id);
  else showHome();
}

bootFromHash();
