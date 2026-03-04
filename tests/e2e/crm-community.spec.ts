import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, loginUser } from '../fixtures/helpers';

test.describe('CRM Features - Signals, Deals and Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for Today page to load first
    await expect(page.getByTestId('determination-slider')).toBeVisible({ timeout: 15000 });
    
    // Navigate to CRM tab via bottom nav (use role for better selection)
    await page.getByRole('tab', { name: /CRM/i }).click();
    
    // Wait for CRM page to load
    await expect(page.getByText('CRM').first()).toBeVisible({ timeout: 15000 });
  });

  test('CRM page has signals, deals and contacts tabs', async ({ page }) => {
    // Check for all three tab buttons
    await expect(page.getByTestId('crm-tab-signals')).toBeVisible();
    await expect(page.getByTestId('crm-tab-deals')).toBeVisible();
    await expect(page.getByTestId('crm-tab-contacts')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/crm-page.jpeg', quality: 20 });
  });

  test('signals tab is default and shows signals list', async ({ page }) => {
    // Signals tab should be active by default
    await expect(page.getByTestId('crm-tab-signals')).toBeVisible();
    
    // Should see signals count
    await expect(page.getByText('Signals').first()).toBeVisible();
    
    await page.screenshot({ path: 'test-results/signals-tab.jpeg', quality: 20 });
  });

  test('can switch between signals, deals and contacts tabs', async ({ page }) => {
    // Start on signals tab (default)
    await expect(page.getByTestId('crm-tab-signals')).toBeVisible();
    
    // Click contacts tab
    await page.getByTestId('crm-tab-contacts').click();
    await expect(page.getByTestId('contact-search-input')).toBeVisible();
    
    // Click deals tab
    await page.getByTestId('crm-tab-deals').click();
    await expect(page.getByText('Pipeline')).toBeVisible();
    
    // Click signals tab
    await page.getByTestId('crm-tab-signals').click();
    await expect(page.getByText('Signals').first()).toBeVisible();
    
    await page.screenshot({ path: 'test-results/crm-tabs.jpeg', quality: 20 });
  });

  test('contacts tab shows label filter options', async ({ page }) => {
    // Click contacts tab
    await page.getByTestId('crm-tab-contacts').click();
    await page.waitForLoadState('domcontentloaded');
    
    // Check for label filter chips (use first to handle multiple matches)
    await expect(page.getByText('Prospect').first()).toBeVisible();
    await expect(page.getByText('Client').first()).toBeVisible();
    await expect(page.getByText('Wormhole').first()).toBeVisible();
    
    await page.screenshot({ path: 'test-results/contact-labels.jpeg', quality: 20 });
  });

  test('deals tab shows stage filters', async ({ page }) => {
    // Click deals tab to switch from default signals tab
    await page.getByTestId('crm-tab-deals').click();
    
    // Check for stage filter chips
    await expect(page.getByText('Lead').first()).toBeVisible();
    await expect(page.getByText('Qualified').first()).toBeVisible();
    
    await page.screenshot({ path: 'test-results/deal-stages.jpeg', quality: 20 });
  });

  test('can open add signal modal from signals tab', async ({ page }) => {
    // On signals tab (default), click add button
    await page.getByTestId('add-crm-btn').click();
    
    // Should see New Signal modal with signal type options
    await expect(page.getByText('New Signal')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Signal Name')).toBeVisible();
    await expect(page.getByText('Signal Type')).toBeVisible();
    
    // Verify signal type options are present
    await expect(page.getByText('10x Action Item')).toBeVisible();
    await expect(page.getByText('Revenue Generating Activity')).toBeVisible();
    await expect(page.getByText('Wormhole Activity')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/add-signal-modal.jpeg', quality: 20 });
  });

  test('can open add deal modal from deals tab', async ({ page }) => {
    // Switch to deals tab first
    await page.getByTestId('crm-tab-deals').click();
    
    // Click add button
    await page.getByTestId('add-crm-btn').click();
    
    // Should see modal with deal form
    await expect(page.getByText('New Deal')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Deal Name')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/add-deal-modal.jpeg', quality: 20 });
  });
});

test.describe('Community Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for Today page to load first
    await expect(page.getByTestId('determination-slider')).toBeVisible({ timeout: 15000 });
    
    // Navigate to Community tab via bottom nav
    await page.getByRole('tab', { name: /Community/i }).click();
    
    // Wait for Community page to load
    await expect(page.getByText('Community').first()).toBeVisible({ timeout: 15000 });
  });

  test('community page has profile icon button', async ({ page }) => {
    // Check for profile icon button in header
    await expect(page.getByTestId('profile-icon-btn')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/community-page.jpeg', quality: 20 });
  });

  test('community page has three tabs: leaderboard, feed, directory', async ({ page }) => {
    await expect(page.getByTestId('tab-leaderboard')).toBeVisible();
    await expect(page.getByTestId('tab-feed')).toBeVisible();
    await expect(page.getByTestId('tab-directory')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/community-tabs.jpeg', quality: 20 });
  });

  test('can view leaderboard', async ({ page }) => {
    // Click leaderboard tab
    await page.getByTestId('tab-leaderboard').click();
    
    // Should see leaderboard header
    await expect(page.getByText('Top Performers')).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: 'test-results/leaderboard.jpeg', quality: 20 });
  });

  test('can view activity feed', async ({ page }) => {
    // Click feed tab
    await page.getByTestId('tab-feed').click();
    
    // Should see feed header
    await expect(page.getByText('Activity Feed')).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: 'test-results/activity-feed.jpeg', quality: 20 });
  });

  test('can view member directory', async ({ page }) => {
    // Click directory tab
    await page.getByTestId('tab-directory').click();
    
    // Should see search input for members
    await expect(page.getByTestId('member-search-input')).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: 'test-results/member-directory.jpeg', quality: 20 });
  });

  test('profile icon navigates to profile page', async ({ page }) => {
    // Click profile icon
    await page.getByTestId('profile-icon-btn').click();
    
    // Should navigate to profile page - "Profile" text is visible (screenshot confirms navigation worked)
    await expect(page.getByText('Profile', { exact: true }).first()).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: 'test-results/profile-from-community.jpeg', quality: 20 });
  });
});
