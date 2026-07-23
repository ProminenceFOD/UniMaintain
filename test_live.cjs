const { chromium } = require('playwright');
const path = require('path');

const artifactDir = '/Users/user/.gemini/antigravity-ide/brain/6fd1ce6e-e0c6-4eb9-bb5a-74e5e12e5a17';

async function runTest() {
  console.log('Launching browser to test https://uni-maintain.vercel.app/?demo=staff ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // Navigate directly into Staff Dashboard using demo query parameter
    await page.goto('https://uni-maintain.vercel.app/?demo=staff', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 1: Staff Dashboard
    await page.screenshot({ path: path.join(artifactDir, 'step1_staff_dashboard.png') });
    console.log('Saved step1_staff_dashboard.png');

    // Click on the resolved request row (MR-2026-014) or click its Acknowledge button
    const resolvedRow = page.locator('tr', { hasText: 'Resolved' }).first();
    if (await resolvedRow.isVisible()) {
      console.log('Found resolved request row! Opening details...');
      const ackOrView = resolvedRow.locator('button').first();
      await ackOrView.click();
    } else {
      console.log('Clicking first request row...');
      await page.click('tbody tr button');
    }
    await page.waitForTimeout(1200);

    // Step 2: Request Details Modal
    await page.screenshot({ path: path.join(artifactDir, 'step2_request_details.png') });
    console.log('Saved step2_request_details.png');

    // Click Acknowledge & Close button inside modal
    const closeBtn = page.locator('button', { hasText: 'Acknowledge & Close' }).first();
    if (await closeBtn.isVisible()) {
      console.log('SUCCESS: Found "Acknowledge & Close" button! Clicking it...');
      await closeBtn.click();
      await page.waitForTimeout(1200);

      // Step 3: Feedback Modal
      await page.screenshot({ path: path.join(artifactDir, 'step3_feedback_modal.png') });
      console.log('Saved step3_feedback_modal.png');

      // Click 5th star
      const stars = page.locator('button.hover\\:scale-110');
      if (await stars.count() > 0) {
        await stars.nth(4).click();
        console.log('Selected 5-star rating');
      }

      // Type feedback
      await page.fill('textarea[placeholder*="feedback"]', 'Excellent maintenance service! Prompt and thorough resolution.');

      // Click Submit feedback
      console.log('Clicking "Submit feedback" button...');
      await page.click('button:has-text("Submit feedback")');
      await page.waitForTimeout(1500);

      // Step 4: After Feedback Submitted & Closed
      await page.screenshot({ path: path.join(artifactDir, 'step4_closed_status.png') });
      console.log('Saved step4_closed_status.png');
    } else {
      console.log('Acknowledge & Close button search finished.');
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    console.log('Browser test complete!');
  }
}

runTest();
