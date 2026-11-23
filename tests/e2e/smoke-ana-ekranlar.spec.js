/**
 * Ana ekran smoke: satış siparişi, sevk, iş emri, projeler.
 * Credentials via ERP_E2E_USER / ERP_E2E_PASS (or DEMO_USER / DEMO_PASS). No secrets in repo.
 */
const { test, expect } = require('@playwright/test');

const USER = process.env.ERP_E2E_USER || process.env.DEMO_USER || '';
const PASS = process.env.ERP_E2E_PASS || process.env.DEMO_PASS || '';

async function ensureLogin(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const v = document.querySelector('#viewLogin');
    if (v) {
      v.hidden = false;
      v.style.display = '';
    }
  });
  await page.waitForSelector('#loginUser', { state: 'visible', timeout: 15000 });
  await page.fill('#loginUser', USER);
  await page.fill('#loginPass', PASS);
  await page.click('#loginSubmit');
  await page.waitForTimeout(2000);
  const chip = (await page.locator('#userChipName').textContent()) || '';
  expect(chip.trim().length).toBeGreaterThan(1);
  expect(chip).not.toMatch(/Oturum yok/i);
}

async function openFormSolo(page, screenId) {
  await page.goto(`/?view=form&screen=${encodeURIComponent(screenId)}&mode=yeni`);
  await page.waitForTimeout(1800);
  await expect(page.locator('#formScreenLabel')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#viewForm')).toBeVisible();
}

test.describe('Ana ekran smoke', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!USER || !PASS, 'E2E credentials not set');
    await ensureLogin(page);
  });

  test('satış siparişi formu açılır', async ({ page }) => {
    await openFormSolo(page, 'satis-siparisleri');
    await expect(page.locator('#formModeBadge')).toContainText(/Yeni|New/i);
    await expect(page.locator('#formScreenLabel')).toContainText(/Sipariş|Satış/i);
    // Kalemler sekmesi / master alan
    const hasFields = await page.locator('input, select, textarea').count();
    expect(hasFields).toBeGreaterThan(3);
  });

  test('sevk emri formu açılır', async ({ page }) => {
    await openFormSolo(page, 'sevk-emirleri');
    await expect(page.locator('#formScreenLabel')).toContainText(/Sevk/i);
    await expect(page.locator('#formModeBadge')).toContainText(/Yeni|New/i);
  });

  test('iş emri formu ve sekmeler', async ({ page }) => {
    await openFormSolo(page, 'uretim-emirleri');
    await expect(page.locator('#formScreenLabel')).toContainText(/İş Emri|Üretim|Uretim/i);
    const tabs = await page.locator('[data-form-tab]').allTextContents();
    expect(tabs.join(' ')).toMatch(/Bilgi|Malzeme|Rota|Genel/i);
  });

  test('projeler formu Genel / Ekip / İşler', async ({ page }) => {
    await openFormSolo(page, 'prj-projeler');
    await expect(page.locator('#formScreenLabel')).toContainText(/Proje/i);
    await expect(page.locator('[data-form-tab="genel"]')).toBeVisible();
    await expect(page.locator('[data-form-tab="ekip"]')).toBeVisible();
    await expect(page.locator('[data-form-tab="isler"]')).toBeVisible();

    await page.click('[data-form-tab="ekip"]');
    await expect(page.locator('[data-grid-act="yeni"][data-grid-key="members"]')).toBeVisible();
    await page.click('[data-form-tab="isler"]');
    await expect(page.locator('[data-grid-act="yeni"][data-grid-key="work_items"]')).toBeVisible();
  });
});
