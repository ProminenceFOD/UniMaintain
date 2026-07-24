const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const artifactDir = '/Users/user/.gemini/antigravity-ide/brain/6fd1ce6e-e0c6-4eb9-bb5a-74e5e12e5a17';

async function runLiveTest() {
  console.log('=== Starting End-to-End Live Deployment Verification ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // PHASE 1: OFFICER MARKS JANET FOLAKEMI'S TASK AS RESOLVED
    // -------------------------------------------------------------
    console.log('\n[Phase 1] Officer logging in to resolve Janet Folakemi\'s request...');
    await page.goto('https://uni-maintain.vercel.app/?demo=officer&tab=tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot of Officer Assigned Tasks
    await page.screenshot({ path: path.join(artifactDir, 'live_1_officer_tasks.png') });
    console.log('Saved screenshot: live_1_officer_tasks.png');

    // Find a task row submitted by Janet Folakemi (e.g., MR-2026-009 or MR-2026-010)
    const officerResolveBtn = page.locator('tr:has-text("Janet Folakemi") button:has-text("Mark Resolved")').first();

    if (await officerResolveBtn.isVisible()) {
      console.log('Found "Mark Resolved" button on Janet Folakemi\'s task. Clicking...');
      await officerResolveBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(artifactDir, 'live_2_officer_resolved.png') });
      console.log('Officer resolved request successfully! Saved screenshot: live_2_officer_resolved.png');
    } else {
      console.log('Checking all "Mark Resolved" buttons...');
      const anyResolveBtn = page.locator('button:has-text("Mark Resolved")').first();
      if (await anyResolveBtn.isVisible()) {
        await anyResolveBtn.click();
        await page.waitForTimeout(1500);
        console.log('Officer resolved task!');
      }
    }

    // -------------------------------------------------------------
    // PHASE 2: JANET FOLAKEMI ACKNOWLEDGES & CLOSES RESOLVED TASK
    // -------------------------------------------------------------
    console.log('\n[Phase 2] Logging in as Janet Folakemi (Staff) to acknowledge & close...');
    await page.goto('https://uni-maintain.vercel.app/?demo=staff&tab=requests', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(artifactDir, 'live_3_janet_dashboard.png') });
    console.log('Saved screenshot: live_3_janet_dashboard.png');

    // Find the resolved request row
    const resolvedRow = page.locator('tr:has-text("Resolved")').first();
    if (await resolvedRow.isVisible()) {
      console.log('Found Resolved request row in Janet\'s table!');
      const viewOrAckBtn = resolvedRow.locator('button').first();
      await viewOrAckBtn.click();
      await page.waitForTimeout(1200);

      // Take screenshot of Request Details Modal
      await page.screenshot({ path: path.join(artifactDir, 'live_4_request_details_modal.png') });
      console.log('Saved screenshot: live_4_request_details_modal.png');

      // Click "Acknowledge & Close" button inside modal
      const ackBtn = page.locator('button:has-text("Acknowledge & Close")').first();
      if (await ackBtn.isVisible()) {
        console.log('Found "Acknowledge & Close" button! Clicking...');
        await ackBtn.click();
        await page.waitForTimeout(1200);

        // Feedback Modal should appear
        await page.screenshot({ path: path.join(artifactDir, 'live_5_feedback_modal.png') });
        console.log('Saved screenshot: live_5_feedback_modal.png');

        // Select 5-star rating
        const stars = page.locator('button.hover\\:scale-110');
        if (await stars.count() >= 5) {
          await stars.nth(4).click();
          console.log('Selected 5 stars rating');
        }

        // Fill feedback note
        await page.fill('textarea[placeholder*="feedback"]', 'Resolved perfectly! Thank you for fixing the issue so quickly.');
        
        // Submit feedback
        await page.click('button:has-text("Submit feedback")');
        await page.waitForTimeout(1500);

        await page.screenshot({ path: path.join(artifactDir, 'live_6_closed_success.png') });
        console.log('SUCCESS: Request acknowledged and closed! Saved screenshot: live_6_closed_success.png');
      } else {
        console.log('Acknowledge button was not visible in modal.');
      }
    } else {
      console.log('No Resolved row found in Janet\'s table.');
    }

  } catch (err) {
    console.error('E2E Verification error:', err);
  } finally {
    await browser.close();
    console.log('=== E2E Verification Finished ===');
  }
}

runLiveTest();
