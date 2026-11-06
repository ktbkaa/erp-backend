import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';

mkdirSync('/opt/cursor/artifacts/screenshots', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,900'],
  defaultViewport: { width: 1400, height: 900 },
});

const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE', m.text());
});

await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle0', timeout: 60000 });

// Clear storage and reload for clean soft session
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => {
  const nav = document.querySelector('#sidebarNav');
  const chip = document.querySelector('#userChipName');
  const login = document.querySelector('#viewLogin');
  const shell = document.querySelector('#appShell');
  return (nav && nav.querySelector('.mod-group')) || (login && !login.hidden);
}, { timeout: 15000 }).catch(() => {});

const state = await page.evaluate(() => {
  const nav = document.querySelector('#sidebarNav');
  const chip = document.querySelector('#userChipName')?.textContent?.trim();
  const title = document.querySelector('#userChipTitle')?.textContent?.trim();
  const loginHidden = document.querySelector('#viewLogin')?.hidden;
  const shellHidden = document.querySelector('#appShell')?.hidden;
  const modCount = nav ? nav.querySelectorAll('.mod-group').length : 0;
  const scripts = [...document.scripts].map(s => s.src).filter(Boolean);
  const soft2 = scripts.some(s => s.includes('20261102soft3'));
  const loggedOut = localStorage.getItem('ktb_logged_out');
  const cihaz = localStorage.getItem('ktb_cihaz_oturum');
  const kod = localStorage.getItem('ktb_kullanici_kodu');
  return { chip, title, loginHidden, shellHidden, modCount, soft2, loggedOut, cihaz, kod, bodyClass: document.body.className };
});

await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/soft2-auto-menu.png', fullPage: false });
console.log('CLEAN_BOOT', JSON.stringify(state, null, 2));

// Forced logout path
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('ktb_logged_out', '1');
});
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForTimeout?.(800);
await new Promise(r => setTimeout(r, 800));
const forced = await page.evaluate(() => ({
  chip: document.querySelector('#userChipName')?.textContent?.trim(),
  loginHidden: document.querySelector('#viewLogin')?.hidden,
  shellHidden: document.querySelector('#appShell')?.hidden,
  modCount: document.querySelectorAll('#sidebarNav .mod-group').length,
  bodyClass: document.body.className,
}));
await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/soft2-forced-login.png', fullPage: false });
console.log('FORCED_LOGIN', JSON.stringify(forced, null, 2));

await browser.close();
