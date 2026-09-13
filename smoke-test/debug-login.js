const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture all console output
  page.on('console', msg => console.log('CONSOLE[' + msg.type() + ']:', msg.text()));
  
  // Watch for redirect
  page.on('response', response => {
    if (response.status() >= 300 && response.status() < 400) {
      console.log('REDIRECT:', response.status(), response.url(), '->', response.headers()['location']);
    }
    if (response.url().includes('/api/') || response.url().includes('/login')) {
      console.log('RESPONSE:', response.status(), response.url());
    }
  });
  
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  console.log('Login page loaded:', page.url());
  
  // Fill form
  await page.fill('input[type="email"]', 'admin1@test.com');
  await page.fill('input[type="password"]', 'TestAdmin@123');
  
  // Screenshot before submit
  await page.screenshot({ path: path.join(__dirname, 'before-login.png') });
  console.log('Screenshot saved: before-login.png');
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000); // Wait for response
  
  // Screenshot after submit
  await page.screenshot({ path: path.join(__dirname, 'after-login.png') });
  
  const url = page.url();
  const bodyText = await page.locator('body').textContent().catch(() => '');
  console.log('After submit URL:', url);
  console.log('Body snippet:', bodyText.substring(0, 200));
  
  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
