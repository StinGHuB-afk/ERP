import { test, expect } from '@playwright/test';

test.describe('Public & Protected Route Smoke Suite', () => {
  test('Login screen renders cleanly without errors', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Login|School/i);
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('Direct navigation to /admin redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  test('Direct navigation to /teacher/notes redirects unauthenticated users', async ({ page }) => {
    await page.goto('/teacher/notes');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  test('Direct navigation to /librarian redirects unauthenticated users', async ({ page }) => {
    await page.goto('/librarian');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  test('Direct navigation to /student redirects unauthenticated users', async ({ page }) => {
    await page.goto('/student');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  test('Direct navigation to /parent redirects unauthenticated users', async ({ page }) => {
    await page.goto('/parent');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  test('Verify report card route handles non-existent codes safely', async ({ page }) => {
    const response = await page.goto('/verify/NON_EXISTENT_CODE_0000');
    expect(response?.status()).toBeLessThan(500);
  });
});
