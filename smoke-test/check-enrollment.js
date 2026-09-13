// Quick check: what subjects does student1 have in the learning hub?
// And can we find the subject that teacher1 manages?
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

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

  // Login as student1
  await login(page, 'student1@test.com', 'TestStudent@123');
  await page.goto(`${BASE_URL}/student/learning-hub`);
  await page.waitForLoadState('networkidle');

  // Get all subject links
  const links = await page.locator('a[href*="/student/learning-hub/"]').evaluateAll(
    els => els.map(e => ({ href: e.getAttribute('href'), text: e.textContent?.trim() }))
  );
  console.log('Student1 subjects:', JSON.stringify(links, null, 2));

  // Try clicking each subject to find the one with "FINAL UPLOAD TEST CHAPTER"
  let foundSubject = null;
  for (const link of links.slice(0, 5)) { // Check first 5
    await page.goto(`${BASE_URL}${link.href}`);
    await page.waitForLoadState('networkidle');
    const content = await page.locator('body').textContent().catch(() => '');
    if (content.includes('FINAL UPLOAD TEST CHAPTER') || content.includes('FINAL 5MB PDF TEST')) {
      foundSubject = link;
      console.log('FOUND matching subject:', link);
      console.log('Page content snippet:', content.substring(0, 500));
      
      // Screenshot
      await page.screenshot({ path: path.join(__dirname, 'student-subject.png') });
      
      // Look for download links
      const dlLinks = await page.locator('a[href*="supabase"], a:has-text("Download"), a:has-text("View")').evaluateAll(
        els => els.map(e => ({ href: e.getAttribute('href'), text: e.textContent?.trim().substring(0, 50) }))
      );
      console.log('Download links:', JSON.stringify(dlLinks, null, 2));
      break;
    }
  }
  
  if (!foundSubject) {
    console.log('Chapter not found in any of student1 subjects -- student1 is not enrolled in teacher1 subject');
    
    // Check which subject teacher1 manages
    console.log('\nChecking teacher1 subject...');
    await page.context().clearCookies();
    await login(page, 'teacher1@test.com', 'TestTeacher@123');
    await page.goto(`${BASE_URL}/teacher/notes`);
    await page.waitForLoadState('networkidle');
    const teacherLinks = await page.locator('a[href*="/teacher/notes/"]').evaluateAll(
      els => els.map(e => ({ href: e.getAttribute('href'), text: e.textContent?.trim() }))
    );
    console.log('Teacher1 subjects:', JSON.stringify(teacherLinks, null, 2));
    
    // Get the subjectId from teacher1's first subject
    const teacherSubjectId = teacherLinks[0]?.href?.split('/').pop();
    console.log('Teacher1 subjectId:', teacherSubjectId);
    
    // Check DB to see what students are enrolled in this subject
    await page.context().clearCookies();
  }

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
