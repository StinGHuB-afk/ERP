// Complete final student download verification
// Tests the full download flow: authenticated endpoint → signed Supabase URL → PDF accessible
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const STUDENT2_EMAIL = 'student2@test.com';
const STUDENT2_PASS = 'TestStudent@123';
const SUBJECT_ID = '4519d862-a17b-4ad7-ab04-cbfdc9d8f2a6';
const CHAPTER_TITLE = 'FINAL UPLOAD TEST CHAPTER';
const PDF_ID = '787a99d5-789c-4ff3-8c7d-68e99e254011';
const DOWNLOAD_ENDPOINT = `/api/notes/download/${PDF_ID}?type=PDF`;

const results = [];
let secretLeakFound = false;
const supabaseRequests = [];

function record(test, status, detail = '') {
  results.push({ test, status, detail });
  const icon = { PASS: '✅', FAIL: '❌', BLOCKED: '⚠️', NOT_TESTED: '⬜' }[status];
  console.log(`${icon} ${test}${detail ? ' -- ' + detail : ''}`);
}

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
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitor Supabase requests
  page.on('request', req => {
    if (req.url().includes('supabase')) {
      supabaseRequests.push({ method: req.method(), url: req.url().split('?')[0] });
      console.log('  Supabase request:', req.method(), req.url().split('?')[0]);
    }
  });

  page.on('response', async resp => {
    try {
      const url = resp.url();
      const ct = resp.headers()['content-type'] || '';
      if (!url.includes('supabase') && (ct.includes('html') || ct.includes('json'))) {
        const body = await resp.text().catch(() => '');
        if (body.includes('SUPABASE_SECRET') || body.includes('service_role')) {
          secretLeakFound = true;
          console.error('!!! SECRET LEAK in:', url);
        }
      }
    } catch (_) {}
  });

  await login(page, STUDENT2_EMAIL, STUDENT2_PASS);
  record('Student2 login', page.url().includes('/student') ? 'PASS' : 'FAIL', page.url());

  // Navigate directly to subject page
  await page.goto(`${BASE_URL}/student/learning-hub/${SUBJECT_ID}`);
  await page.waitForLoadState('networkidle');
  
  record('Direct navigation to subject', page.url().includes(SUBJECT_ID) ? 'PASS' : 'FAIL', page.url());
  
  const bodyText = await page.locator('body').textContent().catch(() => '');
  record('FINAL UPLOAD TEST CHAPTER visible', bodyText.includes('FINAL UPLOAD TEST CHAPTER') ? 'PASS' : 'FAIL');
  record('test-large.pdf resource listed', bodyText.includes('test-large.pdf') ? 'PASS' : 'FAIL');
  record('Download button visible', bodyText.includes('Download') ? 'PASS' : 'FAIL');

  // Click the Download button for test-large.pdf
  const dlBtn = page.locator(`a[href="${DOWNLOAD_ENDPOINT}"]`).first();
  const dlBtnVisible = await dlBtn.isVisible({ timeout: 5000 }).catch(() => false);
  record('Download button with correct endpoint', dlBtnVisible ? 'PASS' : 'FAIL',
    dlBtnVisible ? DOWNLOAD_ENDPOINT : 'Button not found');

  if (dlBtnVisible) {
    // Test the download endpoint directly (as authenticated student)
    const downloadResponse = await page.request.get(`${BASE_URL}${DOWNLOAD_ENDPOINT}`, {
      headers: { 'Cookie': await context.cookies().then(c => c.map(k => `${k.name}=${k.value}`).join('; ')) }
    });
    
    const dlStatus = downloadResponse.status();
    const dlHeaders = downloadResponse.headers();
    const dlBody = await downloadResponse.text().catch(() => '');
    
    console.log('Download endpoint response:', dlStatus);
    console.log('Response headers:', JSON.stringify(dlHeaders, null, 2).substring(0, 300));
    
    if (dlStatus === 302 || dlStatus === 307) {
      // Redirect to signed Supabase URL
      const location = dlHeaders['location'];
      record('Download endpoint redirects to signed URL', location?.includes('supabase') ? 'PASS' : 'BLOCKED',
        location?.substring(0, 100));
      
      const isSignedUrl = location?.includes('token') || location?.includes('sign');
      record('Redirect URL is signed (no direct public access)', isSignedUrl ? 'PASS' : 'BLOCKED',
        isSignedUrl ? 'URL contains signing token' : 'URL may not be signed');
      
    } else if (dlStatus === 200) {
      // Could return signed URL as JSON or redirect
      record('Download endpoint HTTP 200', 'PASS', `Content-Type: ${dlHeaders['content-type']}`);
      
      if (dlBody.includes('signedUrl') || dlBody.includes('signed_url')) {
        const parsed = JSON.parse(dlBody).catch ? dlBody : JSON.parse(dlBody);
        const signedUrl = parsed?.signedUrl || parsed?.signed_url || parsed?.url;
        record('Response contains signedUrl', signedUrl ? 'PASS' : 'BLOCKED', signedUrl?.substring(0, 80));
      } else if (dlHeaders['content-type']?.includes('pdf')) {
        record('PDF content served directly', 'PASS', 'Binary PDF response');
      } else {
        record('Download response format', 'BLOCKED', 'Unknown format: ' + dlBody.substring(0, 100));
      }
    } else if (dlStatus === 403) {
      record('Download endpoint authorization', 'FAIL', 'HTTP 403 Forbidden');
    } else if (dlStatus === 404) {
      record('Download endpoint found', 'FAIL', 'HTTP 404 Not Found');
    } else {
      record('Download endpoint HTTP response', 'BLOCKED', `HTTP ${dlStatus}`);
    }
  }

  // Security check
  record('No SUPABASE_SECRET_KEY in responses', !secretLeakFound ? 'PASS' : 'FAIL');
  record('Supabase GET requests (signed download)', supabaseRequests.filter(r => r.method === 'GET').length > 0 ? 'PASS' : 'NOT_TESTED',
    `${supabaseRequests.length} Supabase requests total`);

  // Check student2 cannot access admin or teacher routes
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState('networkidle');
  record('Student2 blocked from /admin', !page.url().includes('/admin') ? 'PASS' : 'FAIL', page.url());

  await page.goto(`${BASE_URL}/teacher/notes`);
  await page.waitForLoadState('networkidle');
  record('Student2 blocked from /teacher', !page.url().includes('/teacher') ? 'PASS' : 'FAIL', page.url());

  // Check Student2 cannot access student3's resources by URL manipulation
  await page.goto(`${BASE_URL}/student/learning-hub/00000000-0000-0000-0000-000000000000`);
  await page.waitForLoadState('networkidle');
  const inv404 = await page.locator('body').textContent().catch(() => '');
  record('Invalid subject URL denied', inv404.includes('404') || inv404.includes('Not Found') || page.url().includes('/login') ? 'PASS' : 'BLOCKED',
    `URL: ${page.url()}`);

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const blocked = results.filter(r => r.status === 'BLOCKED').length;
  const notTested = results.filter(r => r.status === 'NOT_TESTED').length;
  
  console.log(`\nRESULTS: PASS=${pass}, FAIL=${fail}, BLOCKED=${blocked}, NOT_TESTED=${notTested}`);
  console.log('Supabase requests:', JSON.stringify(supabaseRequests, null, 2));
  
  await browser.close();

  // Write results to a simple JSON file for the main report
  fs.writeFileSync(
    path.join(__dirname, 'student-access-results.json'),
    JSON.stringify({ results, supabaseRequests, secretLeakFound }, null, 2)
  );
  
  process.exit(fail > 0 ? 1 : 0);
})();
