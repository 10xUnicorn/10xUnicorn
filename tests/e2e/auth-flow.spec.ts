import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, loginUser } from '../fixtures/helpers';

test.describe('Core Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test('homepage loads with login form', async ({ page }) => {
    // Wait for the login page to be visible
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('login-password-input')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();
    await page.screenshot({ path: 'test-results/login-page.jpeg', quality: 20 });
  });

  test('can switch to register form', async ({ page }) => {
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('login-go-register').click();
    
    // Should show register form
    await expect(page.getByTestId('register-email-input')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('register-password-input')).toBeVisible();
    await expect(page.getByTestId('register-confirm-input')).toBeVisible();
    await expect(page.getByTestId('register-submit-btn')).toBeVisible();
    await page.screenshot({ path: 'test-results/register-page.jpeg', quality: 20 });
  });

  test('login with valid credentials navigates to today page', async ({ page }) => {
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    
    // Fill in login form
    await page.getByTestId('login-email-input').fill(TEST_USER.email);
    await page.getByTestId('login-password-input').fill(TEST_USER.password);
    
    await page.screenshot({ path: 'test-results/login-filled.jpeg', quality: 20 });
    
    // Click login
    await page.getByTestId('login-submit-btn').click();
    
    // Wait for navigation - check for Today page elements or loading indicator
    // The expected behavior is to navigate to the Today page after successful login
    try {
      // Wait up to 10 seconds for the Today page to appear
      await expect(page.getByTestId('determination-slider')).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'test-results/after-login-success.jpeg', quality: 20 });
    } catch (e) {
      // If navigation didn't happen, capture what we see
      await page.screenshot({ path: 'test-results/after-login-failed.jpeg', quality: 20 });
      
      // Check if we're still on login page
      const stillOnLogin = await page.getByTestId('login-submit-btn').isVisible().catch(() => false);
      
      if (stillOnLogin) {
        // Check for error message
        const errorVisible = await page.getByTestId('login-error').isVisible().catch(() => false);
        if (errorVisible) {
          const errorText = await page.getByTestId('login-error').textContent();
          throw new Error(`Login failed with error: ${errorText}`);
        }
        throw new Error('CRITICAL: Login button clicked but navigation did not occur. User is stuck on login page.');
      }
      throw e;
    }
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    
    // Fill in login form with wrong password
    await page.getByTestId('login-email-input').fill(TEST_USER.email);
    await page.getByTestId('login-password-input').fill('wrongpassword123');
    
    // Click login
    await page.getByTestId('login-submit-btn').click();
    
    // Should show error message
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/login-error.jpeg', quality: 20 });
  });
});
