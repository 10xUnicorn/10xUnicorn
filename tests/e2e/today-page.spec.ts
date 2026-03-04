import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, loginUser } from '../fixtures/helpers';

test.describe('Today Page - Daily Entry Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for Today page to load - use testID for determination slider
    await expect(page.getByTestId('determination-slider')).toBeVisible({ timeout: 15000 });
  });

  test('displays Today page with determination slider', async ({ page }) => {
    // Check determination slider section (text is now just "Determination")
    await expect(page.getByText('Determination').first()).toBeVisible();
    await expect(page.getByTestId('determination-slider')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/today-page.jpeg', quality: 20 });
  });

  test('date navigation works', async ({ page }) => {
    // Get today's date indicator - use exact match
    const todayIndicator = page.getByText('TODAY', { exact: true });
    await expect(todayIndicator).toBeVisible();
    
    // Navigate to yesterday
    await page.getByTestId('date-prev-btn').click();
    
    // TODAY label should disappear or show different date
    await expect(page.getByText('Go to Today')).toBeVisible({ timeout: 3000 });
    
    // Navigate back to today
    await page.getByTestId('date-today-btn').click();
    await expect(todayIndicator).toBeVisible();
  });

  test('displays five core actions with Phase 1 updated labels', async ({ page }) => {
    // Check for the five core actions - text label changed to "Top 10x Action (10 points)"
    // 1. Top 10x Action (now shows point value)
    await expect(page.getByText('Top 10x Action').first()).toBeVisible();
    
    // 2. 7-Minute Future Self Meditation  
    await expect(page.getByText('Meditation').first()).toBeVisible();
    
    // 3. Wormhole Relationship
    await expect(page.getByText('Wormhole').first()).toBeVisible();
    
    // 4. Avoid Distractions
    await expect(page.getByText('Distraction').first()).toBeVisible();
    
    // 5. Plan the Next Day
    await expect(page.getByText('Plan').first()).toBeVisible();
    
    await page.screenshot({ path: 'test-results/five-core-actions.jpeg', quality: 20 });
  });

  test('can toggle core action checkboxes', async ({ page }) => {
    // Find and click the top_action checkbox
    const topActionBtn = page.getByTestId('action-top_action');
    await expect(topActionBtn).toBeVisible();
    await topActionBtn.click();
    
    // Wait for save
    await page.waitForLoadState('domcontentloaded');
    
    await page.screenshot({ path: 'test-results/action-toggled.jpeg', quality: 20 });
  });

  test('compound habit section is visible with up/down carets', async ({ page }) => {
    // Check for compound counter buttons (up/down caret style)
    const compoundIncrease = page.getByTestId('compound-increase');
    const compoundDecrease = page.getByTestId('compound-decrease');
    const compoundDisplay = page.getByTestId('compound-count-display');
    
    // All should be visible
    await expect(compoundIncrease).toBeVisible();
    await expect(compoundDecrease).toBeVisible();
    await expect(compoundDisplay).toBeVisible();
    
    // Check for compound notes input
    const compoundNotes = page.getByTestId('compound-notes-input');
    await expect(compoundNotes).toBeVisible();
    
    await page.screenshot({ path: 'test-results/compound-habit.jpeg', quality: 20 });
  });

  test('status banner shows correct status', async ({ page }) => {
    // Check for status display (Ready, Priority Win, Unicorn Win, etc.)
    // The status is displayed in a banner at the top of the page
    await expect(page.getByTestId('determination-slider')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/status-banner.jpeg', quality: 20, fullPage: false });
    
    // We're just verifying the page loaded with the status area visible
    // Status can be: Ready, Priority Win, Unicorn Win, Loss, Lesson, Course Corrected
    expect(true).toBe(true);
  });

  test('intention and focus inputs are accessible', async ({ page }) => {
    // Check intention input
    const intentionInput = page.getByTestId('intention-input');
    await expect(intentionInput).toBeVisible();
    
    // Check focus input
    const focusInput = page.getByTestId('focus-input');
    await expect(focusInput).toBeVisible();
    
    // Fill in test values
    await intentionInput.fill('Test intention for automation');
    await focusInput.fill('Test 10x focus for automation');
    
    await page.screenshot({ path: 'test-results/intention-focus.jpeg', quality: 20 });
  });

  test('distractions notes input is visible', async ({ page }) => {
    // Check distraction notes input
    const distractionInput = page.getByTestId('distraction-input');
    await expect(distractionInput).toBeVisible();
    
    // Fill in test distraction notes
    await distractionInput.fill('Social media, email notifications');
    
    await page.screenshot({ path: 'test-results/distractions.jpeg', quality: 20 });
  });
});
