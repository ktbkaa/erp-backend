const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $('toast');
  el.hidden = false;
  el.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 5200);
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
  let pgDumpCell;
  if (s.pgDumpOk) {
    pgDumpCell = `<span class="ok">${s.pgDump}</span>`;
  } else if (s.nodeBackupOk) {
    pgDumpCell = '<span class="warn">Yok — Node SQL yedek kullanılır</span>';
  } else {
    pgDumpCell = '<span class="bad">Bulunamadı — Ayarlar’dan yol verin veya npm install</span>';
  }
  const pathNote = s.pathSwitched
    ? ` <span class="warn">(otomatik düzeltildi${s.pathSwitchFrom ? `: eski ${s.pathSwitchFrom}` : ''})</span>`
    : '';
  const rows = [
    ['ERP klasörü', `${s.erpRoot || '—'}${pathNote}`],
    ['Dal', s.branch ? `<span class="ok">${s.branch}</span>` : '—'],
    ['Klasör', flag(s.erpOk)],
    ['Git', flag(s.gitOk, 'Var', 'Yok')],
    ['migrate script', flag(s.migrateScript)],
    ['heal script', flag(s.healScript)],
    ['pg_dump', pgDumpCell],
    ['Node yedek', flag(s.nodeBackupOk, 'Hazır', 'pg yok')],
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
  ['btnSync', 'btnMigrate', 'btnBackup', 'btnSave', 'btnFindPg'].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = on;
  });
  $('busyPill').hidden = !on;
}

async function runAction(label, path) {
  setBusy(true);
  try {
    toast(`${label} başladı…`);
    const r = await api(path, { method: 'POST', body: '{}' });
    const backup = r.steps?.backup || r;
    const where = r.erpRoot ? ` · ${r.erpRoot}` : '';
    const br = r.branch ? ` · ${r.branch}` : '';
    if (backup?.method === 'node-sql') {
      toast(`${label} tamam (Node SQL yedek)${br}`);
    } else if (backup?.method === 'pg_dump') {
      toast(`${label} tamam (pg_dump)${br}`);
    } else {
      toast(r.ok === false ? (r.error || 'Hata') : `${label} tamam${br}${r.steps?.heal ? ' · heal OK' : ''}`);
    }
    if (r.erpRoot) {
      const rootEl = $('erpRoot');
      if (rootEl && rootEl.value.trim() !== r.erpRoot) rootEl.value = r.erpRoot;
    }
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
$('btnFindPg').addEventListener('click', async () => {
  setBusy(true);
  try {
    const r = await api('/api/find-pgdump', { method: 'POST', body: '{}' });
    if (r.pgDump) {
      $('pgDumpPath').value = r.pgDump;
      await api('/api/config', {
        method: 'POST',
        body: JSON.stringify({
          erpRoot: $('erpRoot').value.trim(),
          pgDumpPath: r.pgDump,
          schedule: { enabled: $('scheduleEnabled').checked },
        }),
      });
      toast(`pg_dump bulundu: ${r.pgDump}`);
    } else {
      toast('pg_dump bulunamadı — Node SQL yedek kullanılacak (sorun değil)');
    }
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
