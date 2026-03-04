import { test, expect } from '@playwright/test';

test.describe('Iteration 9 - Auth & Password Reset Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('login page loads and has all elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Check login form elements
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('login-password-input')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();
    await expect(page.getByTestId('forgot-password-btn')).toBeVisible();
    await expect(page.getByTestId('google-login-btn')).toBeVisible();
    await expect(page.getByTestId('login-go-register')).toBeVisible();
  });

  test('forgot password screen navigates correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Click forgot password
    await page.getByTestId('forgot-password-btn').click();
    await page.waitForLoadState('domcontentloaded');
    
    // Check forgot password elements
    await expect(page.getByTestId('reset-email-input')).toBeVisible();
    await expect(page.getByTestId('send-reset-btn')).toBeVisible();
    await expect(page.getByTestId('back-btn')).toBeVisible();
  });

  test('forgot password flow works - request reset code', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Navigate to forgot password
    await page.getByTestId('forgot-password-btn').click();
    await page.waitForLoadState('domcontentloaded');
    
    // Enter email and send reset code
    await page.getByTestId('reset-email-input').fill('test_today@example.com');
    await page.getByTestId('send-reset-btn').click();
    
    // Wait for transition to token step
    await page.waitForTimeout(2000);
    
    // Check if we moved to token entry step (token input should be visible)
    await expect(page.getByTestId('reset-token-input')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('new-password-input')).toBeVisible();
    await expect(page.getByTestId('confirm-password-input')).toBeVisible();
    await expect(page.getByTestId('reset-password-btn')).toBeVisible();
  });

  test('login with valid credentials redirects to today screen', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.getByTestId('login-email-input').fill('test_today@example.com');
    await page.getByTestId('login-password-input').fill('test123');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for navigation
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Should be on Today screen - check for determination slider
    await expect(page.getByTestId('determination-slider')).toBeVisible({ timeout: 10000 });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Try to login with wrong password
    await page.getByTestId('login-email-input').fill('test_today@example.com');
    await page.getByTestId('login-password-input').fill('wrongpassword');
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for error
    await page.waitForTimeout(2000);
    
    // Error should be displayed
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 5000 });
  });

  test('google login button is clickable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Check Google login button is visible and enabled
    const googleBtn = page.getByTestId('google-login-btn');
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();
  });
});
