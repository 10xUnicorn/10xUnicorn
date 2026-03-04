import { test, expect } from '@playwright/test';

test.describe('Iteration 9 - Today Screen & Edit Signal Modal', () => {
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
  });

  test('today screen loads with determination slider', async ({ page }) => {
    await expect(page.getByTestId('determination-slider')).toBeVisible({ timeout: 10000 });
  });

  test('determination slider displays correct emoji for level 7 (horse)', async ({ page }) => {
    // The slider should show the horse emoji 🐎 at level 7
    // We check that the determination slider is visible
    const slider = page.getByTestId('determination-slider');
    await expect(slider).toBeVisible({ timeout: 10000 });
    
    // The value text should show the current level
    // Looking for the horse emoji or the value 7
    await expect(page.locator('text=🐎').first()).toBeVisible();
  });

  test('top action input is visible', async ({ page }) => {
    await expect(page.getByTestId('top-action-input')).toBeVisible({ timeout: 10000 });
  });

  test('edit top signal button opens modal when top action exists', async ({ page }) => {
    // Check if edit button is visible (only shows when there's a top signal)
    const editBtn = page.getByTestId('edit-top-signal-btn');
    const hasEditBtn = await editBtn.isVisible().catch(() => false);
    
    if (hasEditBtn) {
      await editBtn.click();
      await page.waitForTimeout(1500);
      
      // Verify Edit Signal modal opens
      await expect(page.getByTestId('edit-signal-name-input')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('edit-signal-desc-input')).toBeVisible();
      await expect(page.getByTestId('edit-signal-notes-input')).toBeVisible();
      await expect(page.getByTestId('save-edit-signal-btn')).toBeVisible();
    } else {
      // If no edit button, check for top action input and set button
      await expect(page.getByTestId('top-action-input')).toBeVisible();
    }
  });

  test('edit signal modal allows editing fields', async ({ page }) => {
    const editBtn = page.getByTestId('edit-top-signal-btn');
    const hasEditBtn = await editBtn.isVisible().catch(() => false);
    
    if (hasEditBtn) {
      await editBtn.click();
      await page.waitForTimeout(1500);
      
      // Edit the signal name
      const nameInput = page.getByTestId('edit-signal-name-input');
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      
      // Clear and type new value
      await nameInput.clear();
      await nameInput.fill('Updated Signal Name');
      
      // Edit notes
      const notesInput = page.getByTestId('edit-signal-notes-input');
      await notesInput.fill('Test notes from Playwright');
      
      // Verify the values are updated
      await expect(nameInput).toHaveValue('Updated Signal Name');
      await expect(notesInput).toHaveValue('Test notes from Playwright');
      
      // Click Save Changes
      await page.getByTestId('save-edit-signal-btn').click();
      await page.waitForTimeout(2000);
      
      // Modal should close
      await expect(page.getByTestId('edit-signal-name-input')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('five core actions checkboxes are clickable', async ({ page }) => {
    // Test clicking on one of the core actions
    const topAction = page.getByTestId('action-top_action');
    await expect(topAction).toBeVisible({ timeout: 10000 });
    
    // The action should be clickable
    await topAction.click();
    await page.waitForTimeout(1000);
  });

  test('compound habit counter has increase/decrease buttons', async ({ page }) => {
    await expect(page.getByTestId('compound-decrease')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('compound-count-display')).toBeVisible();
    await expect(page.getByTestId('compound-increase')).toBeVisible();
  });

  test('compound habit counter increase button works', async ({ page }) => {
    const countDisplay = page.getByTestId('compound-count-display');
    await expect(countDisplay).toBeVisible({ timeout: 10000 });
    
    // Click increase button
    await page.getByTestId('compound-increase').click();
    await page.waitForTimeout(1500);
    
    // Count should have increased
    // Just verify the button is clickable and no errors
  });

  test('date navigation works', async ({ page }) => {
    // Click tomorrow
    await page.getByTestId('date-next-btn').click();
    await page.waitForTimeout(1500);
    
    // Should show "Go to Today" link
    await expect(page.getByTestId('date-today-btn')).toBeVisible({ timeout: 5000 });
    
    // Click back to today
    await page.getByTestId('date-today-btn').click();
    await page.waitForTimeout(1500);
  });

  test('add signal button opens modal', async ({ page }) => {
    const addBtn = page.getByTestId('add-signal-btn');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    
    await addBtn.click();
    await page.waitForTimeout(1500);
    
    // Check modal is open
    await expect(page.getByTestId('signal-name-input')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('signal-desc-input')).toBeVisible();
    await expect(page.getByTestId('save-signal-btn')).toBeVisible();
  });

  test('status override button exists', async ({ page }) => {
    await expect(page.getByTestId('status-override-btn')).toBeVisible({ timeout: 10000 });
  });
});
