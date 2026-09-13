const http = require('http');

// Quick preflight: try to log in via the application's login form
// and check that we land on /admin or /teacher rather than /login
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'admin1@test.com');
  await page.fill('input[type="password"]', 'TestAdmin@123');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  
  const url = page.url();
  const title = await page.title();
  console.log('After login URL:', url);
  console.log('Page title:', title);
  
  if (url.includes('/admin')) {
    console.log('LOGIN_OK: Admin login successful');
  } else {
    console.log('LOGIN_FAIL: Still on login page. DB may still be pointing to production.');
    // Print all form field names to help debug
    const inputs = await page.locator('input').evaluateAll(el => el.map(i => ({ name: i.name, type: i.type, id: i.id })));
    console.log('Form inputs:', JSON.stringify(inputs));
  }
  
  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
