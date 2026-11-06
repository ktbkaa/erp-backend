const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $('toast');
  el.hidden = false;
  el.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 4200);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.hata || data.message || res.statusText);
  return data;
}

function flag(ok, yes = 'Tamam', no = 'Eksik') {
  return `<span class="${ok ? 'ok' : 'bad'}">${ok ? yes : no}</span>`;
}

async function refreshStatus() {
  const s = await api('/api/status');
  $('busyPill').hidden = !s.busy;
  const rows = [
    ['ERP klasörü', s.erpRoot || '—'],
    ['Klasör', flag(s.erpOk)],
    ['Git', flag(s.gitOk, 'Var', 'Yok')],
    ['migrate script', flag(s.migrateScript)],
    ['pg_dump', s.pgDumpOk ? `<span class="ok">${s.pgDump}</span>` : '<span class="bad">Bulunamadı — pgAdmin Backup kullan</span>'],
    ['DB', `${s.db?.database}@${s.db?.host}:${s.db?.port} (${s.db?.passwordSet ? 'şifre var' : 'şifre yok'})`],
    ['Zamanlayıcı', s.schedule?.enabled ? `Açık · ${s.schedule.cron} (${s.schedule.timezone || 'Europe/Istanbul'})` : 'Kapalı'],
    ['Yedek klasörü', s.backupDir || '—'],
  ];
  $('statusList').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  return s;
}

async function refreshConfig() {
  const c = await api('/api/config');
  $('erpRoot').value = c.erpRoot || '';
  $('pgDumpPath').value = c.pgDumpPath || '';
  $('scheduleEnabled').checked = Boolean(c.schedule?.enabled);
}

async function refreshLogs() {
  const { logs } = await api('/api/logs');
  $('logBox').textContent = (logs || []).map((l) => {
    const t = (l.ts || '').replace('T', ' ').replace('Z', '');
    return `${t}  ${l.level || 'info'}  ${l.message || ''}`;
  }).join('\n') || 'Henüz log yok.';
}

function setBusy(on) {
  ['btnSync', 'btnMigrate', 'btnBackup', 'btnSave'].forEach((id) => {
    $(id).disabled = on;
  });
  $('busyPill').hidden = !on;
}

async function runAction(label, path) {
  setBusy(true);
  try {
    toast(`${label} başladı…`);
    const r = await api(path, { method: 'POST', body: '{}' });
    toast(r.ok === false ? (r.error || 'Hata') : `${label} tamam`);
  } catch (err) {
    toast(err.message || String(err));
  } finally {
    setBusy(false);
    await refreshStatus();
    await refreshLogs();
  }
}

$('btnSync').addEventListener('click', () => runAction('Tam senkron', '/api/sync'));
$('btnMigrate').addEventListener('click', () => runAction('Migrate', '/api/migrate'));
$('btnBackup').addEventListener('click', () => runAction('Yedek', '/api/backup'));
$('btnRefresh').addEventListener('click', async () => {
  await refreshStatus();
  await refreshLogs();
  toast('Yenilendi');
});
$('btnSave').addEventListener('click', async () => {
  setBusy(true);
  try {
    await api('/api/config', {
      method: 'POST',
      body: JSON.stringify({
        erpRoot: $('erpRoot').value.trim(),
        pgDumpPath: $('pgDumpPath').value.trim(),
        schedule: { enabled: $('scheduleEnabled').checked },
      }),
    });
    toast('Ayarlar kaydedildi');
    await refreshStatus();
  } catch (err) {
    toast(err.message || String(err));
  } finally {
    setBusy(false);
  }
});

(async () => {
  try {
    await refreshConfig();
    await refreshStatus();
    await refreshLogs();
  } catch (err) {
    toast(err.message || String(err));
  }
  setInterval(() => {
    refreshLogs().catch(() => {});
    refreshStatus().catch(() => {});
  }, 8000);
})();
