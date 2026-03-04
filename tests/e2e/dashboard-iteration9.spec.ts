import { test, expect } from '@playwright/test';

test.describe('Iteration 9 - Dashboard & Edit Goal Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Login first
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email-input').fill('test_today@example.com');
    await page.getByTestId('login-password-input').fill('test123');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    
    // Navigate to Dashboard
    await page.click('text=Dashboard');
    await page.waitForTimeout(2000);
  });

  test('dashboard loads with goal card', async ({ page }) => {
    await expect(page.getByTestId('edit-goal-btn')).toBeVisible({ timeout: 10000 });
  });

  test('edit goal button opens modal', async ({ page }) => {
    await page.getByTestId('edit-goal-btn').click();
    await page.waitForTimeout(1500);
    
    // Verify modal opens with all fields
    await expect(page.getByTestId('goal-title-input')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('goal-desc-input')).toBeVisible();
    await expect(page.getByTestId('goal-deadline-input')).toBeVisible();
    await expect(page.getByTestId('goal-target-input')).toBeVisible();
    await expect(page.getByTestId('save-goal-btn')).toBeVisible();
  });

  test('edit goal modal allows editing all fields', async ({ page }) => {
    await page.getByTestId('edit-goal-btn').click();
    await page.waitForTimeout(1500);
    
    // Edit title
    const titleInput = page.getByTestId('goal-title-input');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.clear();
    await titleInput.fill('Test Goal Title');
    
    // Edit description
    const descInput = page.getByTestId('goal-desc-input');
    await descInput.clear();
    await descInput.fill('Test goal description');
    
    // Edit deadline
    const deadlineInput = page.getByTestId('goal-deadline-input');
    await deadlineInput.clear();
    await deadlineInput.fill('12/31/26');
    
    // Edit target number
    const targetInput = page.getByTestId('goal-target-input');
    await targetInput.clear();
    await targetInput.fill('500');
    
    // Verify values
    await expect(titleInput).toHaveValue('Test Goal Title');
    await expect(descInput).toHaveValue('Test goal description');
    await expect(deadlineInput).toHaveValue('12/31/26');
    await expect(targetInput).toHaveValue('500');
  });

  test('edit goal modal can be saved', async ({ page }) => {
    await page.getByTestId('edit-goal-btn').click();
    await page.waitForTimeout(1500);
    
    // Make a change
    const titleInput = page.getByTestId('goal-title-input');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    
    // Save the changes
    await page.getByTestId('save-goal-btn').click();
    await page.waitForTimeout(2000);
    
    // Modal should close
    await expect(page.getByTestId('goal-title-input')).not.toBeVisible({ timeout: 5000 });
  });

  test('dashboard displays stats cards', async ({ page }) => {
    // Check for stats like streak display
    await expect(page.locator('text=CURRENT STREAK')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=BEST STREAK')).toBeVisible();
    await expect(page.locator('text=UNICORN DAYS')).toBeVisible();
    await expect(page.locator('text=PRIORITY WINS')).toBeVisible();
  });

  test('dashboard shows last 7 days section', async ({ page }) => {
    await expect(page.locator('text=LAST 7 DAYS')).toBeVisible({ timeout: 10000 });
  });

  test('dashboard shows determination trend', async ({ page }) => {
    await expect(page.locator('text=DETERMINATION TREND')).toBeVisible({ timeout: 10000 });
  });
});
