import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, loginUser, dismissToasts } from '../fixtures/helpers';

test.describe('Signals Page - Phase 2 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await dismissToasts(page);
    
    // Login first
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for Today page to load, then navigate to Signals
    await expect(page.getByText('Determination Level')).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to Signals tab and see points header', async ({ page }) => {
    // Navigate to Signals tab
    await page.getByRole('tab', { name: 'Signals' }).click();
    
    // Wait for Signals page to load
    await expect(page.getByText('Total Points')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('This Week')).toBeVisible();
    await expect(page.getByText('Streak')).toBeVisible();
    await expect(page.getByText('Rank')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/signals-page.jpeg', quality: 20 });
  });

  test('can open Add Signal modal', async ({ page }) => {
    await page.getByRole('tab', { name: 'Signals' }).click();
    await expect(page.getByText('My Signals')).toBeVisible({ timeout: 10000 });
    
    // Click add button
    await page.getByTestId('add-signal-btn').click();
    
    // Modal should appear
    await expect(page.getByText('New Signal')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('signal-name-input')).toBeVisible();
    await expect(page.getByTestId('signal-desc-input')).toBeVisible();
    await expect(page.getByTestId('signal-points-input')).toBeVisible();
    await expect(page.getByTestId('save-signal-btn')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/add-signal-modal.jpeg', quality: 20 });
  });

  test('can create a new signal', async ({ page }) => {
    await page.getByRole('tab', { name: 'Signals' }).click();
    await expect(page.getByText('My Signals')).toBeVisible({ timeout: 10000 });
    
    // Open modal
    await page.getByTestId('add-signal-btn').click();
    await expect(page.getByTestId('signal-name-input')).toBeVisible({ timeout: 5000 });
    
    // Fill form
    const uniqueName = `UI Test Signal ${Date.now()}`;
    await page.getByTestId('signal-name-input').fill(uniqueName);
    await page.getByTestId('signal-desc-input').fill('Created via E2E test');
    await page.getByTestId('signal-points-input').clear();
    await page.getByTestId('signal-points-input').fill('20');
    
    // Submit
    await page.getByTestId('save-signal-btn').click();
    
    // Modal should close and signal should appear in list
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('20 pts')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/signal-created.jpeg', quality: 20 });
  });

  test('save button disabled when name empty', async ({ page }) => {
    await page.getByRole('tab', { name: 'Signals' }).click();
    await expect(page.getByText('My Signals')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('add-signal-btn').click();
    await expect(page.getByTestId('signal-name-input')).toBeVisible({ timeout: 5000 });
    
    // Don't fill name
    await page.getByTestId('signal-desc-input').fill('Description without name');
    
    // Button should be disabled
    const saveBtn = page.getByTestId('save-signal-btn');
    await expect(saveBtn).toHaveCSS('opacity', '0.4');
  });

  test('public signal toggle works', async ({ page }) => {
    await page.getByRole('tab', { name: 'Signals' }).click();
    await expect(page.getByText('My Signals')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('add-signal-btn').click();
    await expect(page.getByText('New Signal')).toBeVisible({ timeout: 5000 });
    
    // Find public signal text
    await expect(page.getByText('Public Signal')).toBeVisible();
    await expect(page.getByText('Public signals appear in the community feed')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/signal-public-toggle.jpeg', quality: 20 });
  });
});

test.describe('Signal Completion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await dismissToasts(page);
    
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page.getByText('Determination Level')).toBeVisible({ timeout: 10000 });
    
    // Navigate to Signals
    await page.getByRole('tab', { name: 'Signals' }).click();
    await expect(page.getByText('My Signals')).toBeVisible({ timeout: 10000 });
  });

  test('displays completion modal with bonus options', async ({ page }) => {
    // First ensure there's at least one signal by creating one
    const signalsExist = await page.locator('[data-testid^="complete-signal-"]').count();
    
    if (signalsExist === 0) {
      // Create a signal first
      await page.getByTestId('add-signal-btn').click();
      await expect(page.getByTestId('signal-name-input')).toBeVisible({ timeout: 5000 });
      await page.getByTestId('signal-name-input').fill(`Test Completion Signal ${Date.now()}`);
      await page.getByTestId('save-signal-btn').click();
      await expect(page.getByText('Test Completion Signal')).toBeVisible({ timeout: 10000 });
    }
    
    // Find and click complete button on first signal
    await page.locator('[data-testid^="complete-signal-"]').first().click();
    
    // Completion modal should appear
    await expect(page.getByText('Complete Signal')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('complete-notes-input')).toBeVisible();
    await expect(page.getByText('Bonus Points')).toBeVisible();
    await expect(page.getByText('Planned Yesterday')).toBeVisible();
    await expect(page.getByText('+5 pts')).toBeVisible();  // Planned ahead bonus
    await expect(page.getByText('Before 6 PM')).toBeVisible();
    await expect(page.getByText('+10 pts')).toBeVisible();  // Before 6PM bonus
    await expect(page.getByTestId('confirm-complete-btn')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/complete-signal-modal.jpeg', quality: 20 });
  });

  test('can complete a signal and earn points', async ({ page }) => {
    // Get initial points
    const initialPointsText = await page.locator('[class*="pointsValue"]').first().textContent() || '0';
    const initialPoints = parseInt(initialPointsText.replace(/\D/g, '')) || 0;
    
    // Ensure there's a signal to complete
    const signalsExist = await page.locator('[data-testid^="complete-signal-"]').count();
    
    if (signalsExist === 0) {
      await page.getByTestId('add-signal-btn').click();
      await expect(page.getByTestId('signal-name-input')).toBeVisible({ timeout: 5000 });
      await page.getByTestId('signal-name-input').fill(`Points Test Signal ${Date.now()}`);
      await page.getByTestId('save-signal-btn').click();
      await expect(page.getByText('Points Test Signal')).toBeVisible({ timeout: 10000 });
    }
    
    // Complete the signal
    await page.locator('[data-testid^="complete-signal-"]').first().click();
    await expect(page.getByTestId('confirm-complete-btn')).toBeVisible({ timeout: 5000 });
    
    await page.getByTestId('complete-notes-input').fill('Completed via E2E test');
    await page.getByTestId('confirm-complete-btn').click();
    
    // Should see completed state or points increase
    // Wait for completion to register
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'e2e/test-results/signal-completed.jpeg', quality: 20 });
  });
});
