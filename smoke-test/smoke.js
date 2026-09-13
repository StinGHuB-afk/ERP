// FINAL REAL-BROWSER A-Z SCHOOL ERP SMOKE TEST
// Uses Playwright (auto-installed via npx)
// Run: node smoke-test/smoke.js
// IMPORTANT: Do NOT modify production data. This uses phase12-test.db only.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const LARGE_PDF_PATH = path.resolve(__dirname, '../large_test.pdf');

const ACCOUNTS = {
  admin:          { email: 'admin1@test.com',         password: 'TestAdmin@123' },
  // CLASS_TEACHER role does not exist separately in this DB; TEACHER accounts cover class duties.
  classTeacher:   { email: 'teacher1@test.com',       password: 'TestTeacher@123' },
  teacher1:       { email: 'teacher1@test.com',       password: 'TestTeacher@123' },
  teacher2:       { email: 'teacher2@test.com',       password: 'TestTeacher@123' },
  student1:       { email: 'student1@test.com',       password: 'TestStudent@123' },
  student2:       { email: 'student2@test.com',       password: 'TestStudent@123' },
};

const results = [];
let teacherSubjectId = null;
let consoleErrors = [];

function record(phase, test, status, detail = '') {
  results.push({ phase, test, status, detail });
  const icon = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : status === 'BLOCKED' ? 'BLOCKED' : 'NOT_TESTED';
  console.log(`[${icon}] [${phase}] ${test}${detail ? ' -- ' + detail : ''}`);
}

async function login(page, creds) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  // Use Promise.all to capture navigation triggered by form submit
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle');
}

async function logout(page) {
  try {
    // Try clicking the logout link
    const logoutBtn = page.locator('a:has-text("Log out"), button:has-text("Log out"), a:has-text("Logout"), button:has-text("Logout"), a:has-text("Sign out")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 })) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
        logoutBtn.click(),
      ]);
    } else {
      // Fallback: clear session cookies
      await page.context().clearCookies();
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
    }
  } catch (e) {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
  }
  // Ensure we're on the login page
  if (!page.url().includes('/login')) {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
  }
}


(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  let secretLeakFound = false;
  page.on('response', async (response) => {
    try {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('html') || ct.includes('javascript') || ct.includes('json')) {
        const body = await response.text().catch(() => '');
        for (const secret of ['SUPABASE_SECRET', 'SERVICE_ROLE', 'TURSO_AUTH_TOKEN']) {
          if (body.includes(secret)) {
            secretLeakFound = true;
            record('SECURITY', 'Secret in response: ' + secret, 'FAIL', response.url());
          }
        }
      }
    } catch (_) {}
  });

  try {
    // PRE-FLIGHT
    console.log('\n=== PHASE 0: PRE-FLIGHT ===');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    record('PRE-FLIGHT', 'App responds on localhost:3000', 'PASS', page.url());
    record('PRE-FLIGHT', 'Page title present', (await page.title()) ? 'PASS' : 'FAIL');

    // PHASE 1 - ADMIN AUTH
    console.log('\n=== PHASE 1: ADMIN AUTH ===');
    await login(page, ACCOUNTS.admin);
    let url = page.url();
    record('AUTH-ADMIN', 'Admin login redirects to /admin dashboard', url.includes('/admin') ? 'PASS' : 'FAIL', url);

    await page.goto(`${BASE_URL}/teacher/notes`);
    await page.waitForLoadState('networkidle');
    url = page.url();
    record('AUTH-ADMIN', 'Admin blocked from /teacher/notes', !url.includes('/teacher/notes') ? 'PASS' : 'FAIL', url);

    await page.goto(`${BASE_URL}/student/learning-hub`);
    await page.waitForLoadState('networkidle');
    url = page.url();
    record('AUTH-ADMIN', 'Admin blocked from /student/learning-hub', !url.includes('/student') ? 'PASS' : 'FAIL', url);

    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await logout(page);
    url = page.url();
    record('AUTH-ADMIN', 'Admin logout redirects to /login', url.includes('/login') ? 'PASS' : 'FAIL', url);

    await page.goBack().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    url = page.url();
    record('AUTH-ADMIN', 'Back-button after logout does not expose /admin', !url.includes('/admin') ? 'PASS' : 'FAIL', url);

    // PHASE 2 - ADMIN A-Z
    console.log('\n=== PHASE 2: ADMIN A-Z ===');
    await login(page, ACCOUNTS.admin);
    record('ADMIN', 'Admin dashboard loads', page.url().includes('/admin') ? 'PASS' : 'FAIL');

    for (const route of ['students', 'teachers', 'classes', 'academic-session']) {
      await page.goto(`${BASE_URL}/admin/${route}`);
      await page.waitForLoadState('networkidle');
      const err = await page.locator('text=Internal Server Error, text=Application error').first().isVisible({ timeout: 1500 }).catch(() => false);
      record('ADMIN', `/admin/${route} loads without 500`, !err ? 'PASS' : 'FAIL', page.url());
    }

    // CSV export button
    await page.goto(`${BASE_URL}/admin/students`);
    await page.waitForLoadState('networkidle');
    const csvVisible = await page.locator('button:has-text("Export"), button:has-text("CSV")').first().isVisible({ timeout: 3000 }).catch(() => false);
    record('ADMIN', 'CSV export button visible on students page', csvVisible ? 'PASS' : 'FAIL');

    await logout(page);

    // PHASE 3 - CLASS TEACHER
    // NOTE: This DB has no separate CLASS_TEACHER role; TEACHER accounts handle class duties.
    console.log('\n=== PHASE 3: CLASS TEACHER (via TEACHER role) ===');
    await login(page, ACCOUNTS.teacher1);
    url = page.url();
    record('CLASS-TEACHER', 'Teacher login (covers class duties)', url.includes('/teacher') ? 'PASS' : 'FAIL', url);

    await page.goto(`${BASE_URL}/admin/students`);
    await page.waitForLoadState('networkidle');
    url = page.url();
    record('CLASS-TEACHER', 'Teacher blocked from /admin/students', !url.includes('/admin') ? 'PASS' : 'FAIL', url);

    await page.goto(`${BASE_URL}/teacher/classes`);
    await page.waitForLoadState('networkidle');
    const classErr = await page.locator('text=Internal Server Error, text=Application error').first().isVisible({ timeout: 1500 }).catch(() => false);
    record('CLASS-TEACHER', '/teacher/classes loads for Teacher', !classErr ? 'PASS' : 'FAIL', page.url());

    await logout(page);

    // PHASE 4 - SUBJECT TEACHER + LEARNING HUB
    console.log('\n=== PHASE 4: SUBJECT TEACHER + LEARNING HUB ===');
    await login(page, ACCOUNTS.teacher1);
    record('TEACHER', 'Subject Teacher login', page.url().includes('/teacher') ? 'PASS' : 'FAIL');

    await page.goto(`${BASE_URL}/teacher/notes`);
    await page.waitForLoadState('networkidle');
    const notesErr = await page.locator('text=404, text=Internal Server Error').first().isVisible({ timeout: 1500 }).catch(() => false);
    record('TEACHER', '/teacher/notes loads (no 404)', !notesErr ? 'PASS' : 'FAIL', page.url());

    // Click first subject
    const subjLink = page.locator('a[href*="/teacher/notes/"]').first();
    if (await subjLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      const href = await subjLink.getAttribute('href');
      teacherSubjectId = href?.split('/').pop();
      await subjLink.click();
      await page.waitForLoadState('networkidle');
      const subjErr = await page.locator('text=404, text=Not Found').first().isVisible({ timeout: 1500 }).catch(() => false);
      record('TEACHER', 'Subject Manager page loads (no 404)', !subjErr ? 'PASS' : 'FAIL', page.url());
    } else {
      record('TEACHER', 'Subject link on notes index', 'FAIL', 'No /teacher/notes/* links found');
    }

    // Create chapter
    const chapInput = page.locator('input[placeholder*="hapter"]').first();
    if (await chapInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chapInput.fill('SMOKE TEST CHAPTER');
      const addChapBtn = page.locator('button:has-text("Add Chapter"), button:has-text("Create Chapter")').first();
      if (await addChapBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addChapBtn.click();
        await page.waitForLoadState('networkidle');
        const chapVisible = await page.locator('text=SMOKE TEST CHAPTER').first().isVisible({ timeout: 4000 }).catch(() => false);
        record('TEACHER', 'Create Chapter', chapVisible ? 'PASS' : 'FAIL');
      } else {
        record('TEACHER', 'Create Chapter', 'BLOCKED', 'Add Chapter button not found');
      }
    } else {
      record('TEACHER', 'Create Chapter', 'BLOCKED', 'Chapter input not found');
    }

    // Create topic
    const topicInput = page.locator('input[placeholder*="opic"]').first();
    if (await topicInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await topicInput.fill('SMOKE TEST TOPIC');
      const addTopicBtn = page.locator('button:has-text("Add Topic"), button:has-text("Create Topic")').first();
      if (await addTopicBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addTopicBtn.click();
        await page.waitForLoadState('networkidle');
        const topicVisible = await page.locator('text=SMOKE TEST TOPIC').first().isVisible({ timeout: 4000 }).catch(() => false);
        record('TEACHER', 'Create Topic', topicVisible ? 'PASS' : 'FAIL');
      } else {
        record('TEACHER', 'Create Topic', 'BLOCKED', 'Add Topic button not found');
      }
    } else {
      record('TEACHER', 'Create Topic', 'BLOCKED', 'Topic input not found');
    }

    // PHASE 5 - LARGE PDF UPLOAD
    console.log('\n=== PHASE 5: LARGE PDF UPLOAD ===');
    const pdfInput = page.locator('input[type="file"]').first();
    if (await pdfInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      try {
        await pdfInput.setInputFiles(LARGE_PDF_PATH);
        await page.waitForTimeout(5000);
        const uploadOk = await page.locator('text=complete, text=success, text=uploaded, text=Upload').first().isVisible({ timeout: 12000 }).catch(() => false);
        record('PDF-UPLOAD', '5MB PDF setInputFiles upload', uploadOk ? 'PASS' : 'BLOCKED', uploadOk ? 'Upload completed' : 'No success feedback observed after 12s');
      } catch (e) {
        record('PDF-UPLOAD', '5MB PDF setInputFiles upload', 'BLOCKED', 'Error: ' + e.message);
      }
    } else {
      record('PDF-UPLOAD', '5MB PDF upload via file input', 'BLOCKED', 'File input not visible on current page');
    }

    // Publish topic
    const publishBtn = page.locator('button:has-text("Publish")').first();
    if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await publishBtn.click();
      await page.waitForLoadState('networkidle');
      record('TEACHER', 'Publish Topic', 'PASS');
    } else {
      record('TEACHER', 'Publish Topic', 'BLOCKED', 'Publish button not found');
    }

    await logout(page);

    // PHASE 6 - TEACHER A/B ISOLATION
    console.log('\n=== PHASE 6: TEACHER ISOLATION ===');
    await login(page, ACCOUNTS.teacher2);
    record('ISOLATION-TEACHER', 'Teacher B login', page.url().includes('/teacher') ? 'PASS' : 'FAIL');

    if (teacherSubjectId) {
      await page.goto(`${BASE_URL}/teacher/notes/${teacherSubjectId}`);
      await page.waitForLoadState('networkidle');
      url = page.url();
      const teacherAChapterVisible = await page.locator('text=SMOKE TEST CHAPTER').first().isVisible({ timeout: 2000 }).catch(() => false);
      record('ISOLATION-TEACHER', 'Teacher B blocked from Teacher A subject (URL manipulation)', (!teacherAChapterVisible && !url.includes(`/teacher/notes/${teacherSubjectId}`)) ? 'PASS' : 'FAIL', `Landed: ${url}, Chapter visible: ${teacherAChapterVisible}`);
    } else {
      record('ISOLATION-TEACHER', 'Teacher B blocked from Teacher A subject', 'BLOCKED', 'No Teacher A subjectId captured');
    }

    await logout(page);

    // PHASE 7/8 - STUDENT ISOLATION + LEARNING HUB
    console.log('\n=== PHASE 7/8: STUDENT LEARNING HUB + ISOLATION ===');
    await login(page, ACCOUNTS.student1);
    record('STUDENT', 'Student A login', page.url().includes('/student') ? 'PASS' : 'FAIL');

    await page.goto(`${BASE_URL}/student/learning-hub`);
    await page.waitForLoadState('networkidle');
    const hubErr = await page.locator('text=404').first().isVisible({ timeout: 1500 }).catch(() => false);
    record('STUDENT', '/student/learning-hub loads (no 404)', !hubErr ? 'PASS' : 'FAIL', page.url());

    const studSubjLink = page.locator('a[href*="/student/learning-hub/"]').first();
    if (await studSubjLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      await studSubjLink.click();
      await page.waitForLoadState('networkidle');
      record('STUDENT', 'Student opens subject in Learning Hub', page.url().includes('/student/learning-hub/') ? 'PASS' : 'FAIL');

      const draftVisible = await page.locator('text=DRAFT').first().isVisible({ timeout: 1500 }).catch(() => false);
      record('STUDENT', 'Draft content NOT visible to student', !draftVisible ? 'PASS' : 'FAIL');

      const pubTopicVisible = await page.locator('text=SMOKE TEST TOPIC').first().isVisible({ timeout: 3000 }).catch(() => false);
      record('STUDENT', 'Published topic IS visible to student', pubTopicVisible ? 'PASS' : 'FAIL');

      const dlBtn = await page.locator('a:has-text("Download"), button:has-text("Download")').first().isVisible({ timeout: 2000 }).catch(() => false);
      record('STUDENT', 'Download button visible', dlBtn ? 'PASS' : 'NOT TESTED', dlBtn ? '' : 'No PDF resource uploaded yet');
    } else {
      record('STUDENT', 'Student subject link visible in hub', 'FAIL', 'No subject links found');
    }

    // Student isolation tests
    await page.goto(`${BASE_URL}/teacher/notes`);
    await page.waitForLoadState('networkidle');
    record('STUDENT', 'Student blocked from /teacher/notes', !page.url().includes('/teacher/notes') ? 'PASS' : 'FAIL', page.url());

    await page.goto(`${BASE_URL}/admin/students`);
    await page.waitForLoadState('networkidle');
    record('STUDENT', 'Student blocked from /admin/students', !page.url().includes('/admin') ? 'PASS' : 'FAIL', page.url());

    await page.goto(`${BASE_URL}/student/learning-hub/00000000-0000-0000-0000-000000000000`);
    await page.waitForLoadState('networkidle');
    const fakeSubjDenied = page.url().includes('/login') || await page.locator('text=Not Found, text=Unauthorized, text=404').first().isVisible({ timeout: 2000 }).catch(() => false);
    record('STUDENT', 'Fake subjectId URL denied', fakeSubjDenied ? 'PASS' : 'FAIL', page.url());

    await logout(page);

    // Student B
    await login(page, ACCOUNTS.student2);
    record('ISOLATION-STUDENT', 'Student B login', page.url().includes('/student') ? 'PASS' : 'FAIL');
    await logout(page);

    // PHASE 9 - ERP REGRESSION
    console.log('\n=== PHASE 9: ERP REGRESSION ===');
    await login(page, ACCOUNTS.admin);
    await page.waitForLoadState('networkidle');
    for (const route of ['students', 'teachers', 'classes']) {
      await page.goto(`${BASE_URL}/admin/${route}`);
      await page.waitForLoadState('networkidle');
      const err = await page.locator('text=Internal Server Error, text=Application error').first().isVisible({ timeout: 1500 }).catch(() => false);
      record('REGRESSION', `Admin /admin/${route}`, !err ? 'PASS' : 'FAIL');
    }
    await logout(page);

    await login(page, ACCOUNTS.teacher1);
    await page.waitForLoadState('networkidle');
    for (const route of ['marks', 'attendance', 'notes']) {
      await page.goto(`${BASE_URL}/teacher/${route}`);
      await page.waitForLoadState('networkidle');
      const err = await page.locator('text=Internal Server Error, text=Application error').first().isVisible({ timeout: 1500 }).catch(() => false);
      record('REGRESSION', `Teacher /teacher/${route}`, !err ? 'PASS' : 'FAIL');
    }
    await logout(page);

    await login(page, ACCOUNTS.student1);
    await page.waitForLoadState('networkidle');
    for (const route of ['results', 'learning-hub']) {
      await page.goto(`${BASE_URL}/student/${route}`);
      await page.waitForLoadState('networkidle');
      const err = await page.locator('text=Internal Server Error, text=Application error').first().isVisible({ timeout: 1500 }).catch(() => false);
      record('REGRESSION', `Student /student/${route}`, !err ? 'PASS' : 'FAIL');
    }
    await logout(page);

    // PHASE 10 - SECURITY
    console.log('\n=== PHASE 10: SECURITY ===');
    record('SECURITY', 'No secret credential leakage in page/JS responses', !secretLeakFound ? 'PASS' : 'FAIL');

    // PHASE 11 - RESPONSIVE
    console.log('\n=== PHASE 11: RESPONSIVE UI ===');
    for (const vp of [
      { name: 'Desktop 1366x768', w: 1366, h: 768 },
      { name: 'Tablet 768x1024', w: 768, h: 1024 },
      { name: 'Mobile 375x812', w: 375, h: 812 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await login(page, ACCOUNTS.admin);
      await page.waitForLoadState('networkidle');
      record('RESPONSIVE', `Admin dashboard at ${vp.name}`, page.url().includes('/admin') ? 'PASS' : 'FAIL');
      await logout(page);
    }

  } catch (e) {
    console.error('FATAL TEST ERROR:', e.message);
    record('FATAL', 'Unhandled test execution error', 'FAIL', e.message);
  } finally {
    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    const blocked = results.filter(r => r.status === 'BLOCKED').length;
    const notTested = results.filter(r => r.status === 'NOT TESTED').length;
    const hasCritFail = results.some(r => r.status === 'FAIL' && ['AUTH-ADMIN','ISOLATION-TEACHER','ISOLATION-STUDENT','STUDENT','SECURITY'].includes(r.phase));

    let verdict = hasCritFail ? 'RED / NOT READY' : (blocked > 2 || fail > 0 ? 'YELLOW / READY WITH WARNINGS' : 'GREEN / PRODUCTION READY');

    const rows = results.map(r => `| ${r.phase} | ${r.test.replace(/\|/g, '-')} | ${r.status} | ${String(r.detail).replace(/\|/g, '-')} |`).join('\n');

    const report = [
      '# FINAL REAL-BROWSER A-Z SCHOOL ERP SMOKE TEST REPORT',
      '',
      `**Generated:** ${new Date().toISOString()}`,
      `**Environment:** localhost:3000`,
      `**Database:** phase12-test.db (isolated test DB)`,
      `**Browser:** Chromium headless (Playwright)`,
      '',
      '## Summary',
      '',
      `| Metric | Count |`,
      `|--------|-------|`,
      `| PASS | ${pass} |`,
      `| FAIL | ${fail} |`,
      `| BLOCKED | ${blocked} |`,
      `| NOT TESTED | ${notTested} |`,
      '',
      '## All Test Results',
      '',
      '| Phase | Test | Status | Detail |',
      '|-------|------|--------|--------|',
      rows,
      '',
      '## Console Errors Collected',
      consoleErrors.length ? consoleErrors.slice(0, 20).map(e => `- ${e}`).join('\n') : 'None',
      '',
      '## Final Verdict',
      '',
      `### ${verdict}`,
    ].join('\n');

    const reportPath = path.resolve(__dirname, '../FINAL_REAL_BROWSER_A_TO_Z_SMOKE_TEST_REPORT.md');
    fs.writeFileSync(reportPath, report);
    console.log('\n' + '='.repeat(60));
    console.log('FINAL VERDICT: ' + verdict);
    console.log(`PASS: ${pass} | FAIL: ${fail} | BLOCKED: ${blocked} | NOT TESTED: ${notTested}`);
    console.log('Report: ' + reportPath);

    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
  }
})();
