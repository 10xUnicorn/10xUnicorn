import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, loginUser, dismissToasts } from '../fixtures/helpers';

test.describe('Signals Tab Navigation', () => {
  test('can navigate to Signals tab after login', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Login
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for Today page
    await expect(page.getByText('Determination Level')).toBeVisible({ timeout: 15000 });
    
    // Navigate to Signals
    await page.getByRole('tab', { name: 'Signals' }).click();
    
    // Should see signals page elements
    await expect(page.getByText('Total Points')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('My Signals')).toBeVisible();
    await expect(page.getByTestId('add-signal-btn')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/signals-page-nav.jpeg', quality: 20 });
  });

  test('signals page shows points header stats', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page.getByText('Determination Level')).toBeVisible({ timeout: 15000 });
    
    await page.getByRole('tab', { name: 'Signals' }).click();
    await expect(page.getByText('Total Points')).toBeVisible({ timeout: 10000 });
    
    // Check stats
    await expect(page.getByText('This Week')).toBeVisible();
    await expect(page.getByText('Streak')).toBeVisible();
    await expect(page.getByText('Rank')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/signals-stats.jpeg', quality: 20 });
  });

  test('can open and close add signal modal', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page.getByText('Determination Level')).toBeVisible({ timeout: 15000 });
    
    await page.getByRole('tab', { name: 'Signals' }).click();
    await expect(page.getByText('My Signals')).toBeVisible({ timeout: 10000 });
    
    // Open modal
    await page.getByTestId('add-signal-btn').click();
    await expect(page.getByText('New Signal')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('signal-name-input')).toBeVisible();
    await expect(page.getByTestId('save-signal-btn')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/add-signal-modal.jpeg', quality: 20 });
  });
});
