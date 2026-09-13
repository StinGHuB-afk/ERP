// Direct navigation test for student2 to teacher1's subject
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const STUDENT2_EMAIL = 'student2@test.com';
const STUDENT2_PASS = 'TestStudent@123';
const SUBJECT_ID = '4519d862-a17b-4ad7-ab04-cbfdc9d8f2a6';

async function login(page, email, pass) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Track all responses
  const responses = [];
  page.on('response', resp => {
    responses.push({ url: resp.url(), status: resp.status() });
    if (resp.url().includes('supabase')) {
      console.log('Supabase response:', resp.status(), resp.url().split('?')[0]);
    }
  });

  await login(page, STUDENT2_EMAIL, STUDENT2_PASS);
  console.log('Logged in, URL:', page.url());

  // Navigate directly to subject URL
  console.log('\nNavigating directly to subject...');
  await page.goto(`${BASE_URL}/student/learning-hub/${SUBJECT_ID}`);
  await page.waitForLoadState('networkidle');
  
  const finalUrl = page.url();
  console.log('Final URL after navigation:', finalUrl);
  
  // Get page content
  const title = await page.title();
  const bodyText = await page.locator('body').textContent().catch(() => '');
  console.log('Page title:', title);
  console.log('Body includes "Mathematics":', bodyText.includes('Mathematics'));
  console.log('Body includes "FINAL UPLOAD TEST":', bodyText.includes('FINAL UPLOAD TEST'));
  console.log('Body includes "test-large":', bodyText.includes('test-large'));
  console.log('Body includes "Not Found":', bodyText.includes('Not Found'));
  console.log('Body includes "404":', bodyText.includes('404'));
  
  // Take a screenshot
  await page.screenshot({ path: path.join(__dirname, 'student2-direct-nav.png'), fullPage: true });
  console.log('Screenshot saved to smoke-test/student2-direct-nav.png');
  
  // Check for download links
  const allLinks = await page.locator('a').evaluateAll(
    els => els.map(e => ({ href: e.getAttribute('href'), text: e.textContent?.trim().substring(0,40) }))
  );
  const downloadLinks = allLinks.filter(l => l.href && (l.href.includes('supabase') || l.href.includes('download') || l.href.includes('token')));
  console.log('\nDownload-related links:', JSON.stringify(downloadLinks, null, 2));
  
  // Log first 1000 chars of body
  console.log('\nBody preview (first 500 chars):', bodyText.substring(0, 500));

  await browser.close();
})();
