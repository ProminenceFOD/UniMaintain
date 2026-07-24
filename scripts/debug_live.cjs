const { chromium } = require('playwright');

async function debugLive() {
  console.log('=== DEBUGGING LIVE VERCEL APP ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen to console logs and page errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER UNCAUGHT EXCEPTION:', err));
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });

  try {
    console.log('\n--- Navigating to https://uni-maintain.vercel.app/ ---');
    await page.goto('https://uni-maintain.vercel.app/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\nPage title:', await page.title());
    console.log('Current URL:', page.url());

    // Check localStorage items
    const localStorageData = await page.evaluate(() => JSON.stringify(localStorage));
    console.log('\nLocalStorage contents:', localStorageData.slice(0, 300));

    // Check visible text or login buttons
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\nPage body snippet:\n', bodyText.slice(0, 500));

    // Try logging in as Staff Janet Folakemi or clicking Quick Login / Demo button
    console.log('\n--- Testing Staff Login ---');
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"i]').first();
    if (await emailInput.isVisible()) {
      console.log('Found email input. Filling j.folakemi@university.edu...');
      await emailInput.fill('j.folakemi@university.edu');
      const pwInput = page.locator('input[type="password"]').first();
      if (await pwInput.isVisible()) {
        await pwInput.fill('password123');
      }
      const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
      if (await submitBtn.isVisible()) {
        console.log('Clicking sign in...');
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    } else {
      // Check quick demo buttons
      console.log('Checking quick login buttons...');
      const staffBtn = page.locator('button:has-text("Staff"), button:has-text("Janet")').first();
      if (await staffBtn.isVisible()) {
        console.log('Clicking Staff quick login...');
        await staffBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    console.log('\n--- After Login Check ---');
    const afterLoginText = await page.evaluate(() => document.body.innerText);
    console.log('After login body snippet:\n', afterLoginText.slice(0, 500));

    // Check visible requests
    const tableRows = await page.locator('tr').count();
    console.log('Table rows count:', tableRows);

    // Print text of table rows
    const rowsText = await page.locator('tr').allInnerTexts();
    console.log('\nTable Rows:\n', rowsText.slice(0, 10));

  } catch (err) {
    console.error('Debug script error:', err);
  } finally {
    await browser.close();
    console.log('=== Debug finished ===');
  }
}

debugLive();
