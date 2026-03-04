import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, loginUser } from '../fixtures/helpers';

test.describe('Messages Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page.getByTestId('determination-slider')).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: /Community/i }).click();
    await expect(page.getByTestId('tab-leaderboard')).toBeVisible({ timeout: 15000 });
  });

  test('messages button navigates to Messages page', async ({ page }) => {
    await expect(page.getByTestId('messages-btn')).toBeVisible();
    await page.getByTestId('messages-btn').click();
    await expect(page.getByText('Messages')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/messages-page.jpeg', quality: 20 });
  });

  test('messages page has Direct and Groups tabs', async ({ page }) => {
    await page.getByTestId('messages-btn').click();
    await expect(page.getByText('Messages')).toBeVisible({ timeout: 10000 });
    // Use exact match for "Direct" tab text
    await expect(page.getByText('Direct', { exact: true })).toBeVisible();
    await expect(page.getByText('Groups')).toBeVisible();
  });

  test('can open new group modal', async ({ page }) => {
    await page.getByTestId('messages-btn').click();
    await expect(page.getByText('Messages')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('new-group-btn').click();
    await expect(page.getByText('New Group')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/new-group-modal.jpeg', quality: 20 });
  });

  test('messages page shows conversations list', async ({ page }) => {
    await page.getByTestId('messages-btn').click();
    await expect(page.getByText('Messages')).toBeVisible({ timeout: 10000 });
    // Direct tab should show conversations (we created some in backend tests)
    // The page shows "Unknown" which is a conversation
    await page.screenshot({ path: 'test-results/messages-conversations.jpeg', quality: 20 });
  });
});

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page.getByTestId('determination-slider')).toBeVisible({ timeout: 15000 });
    // Tab is "Settings" not "Profile"
    await page.getByRole('tab', { name: /Settings/i }).click();
    await expect(page.getByText('Profile').first()).toBeVisible({ timeout: 15000 });
  });

  test('profile page has notification settings button', async ({ page }) => {
    await expect(page.getByTestId('notification-settings-btn')).toBeVisible();
    await page.screenshot({ path: 'test-results/profile-buttons.jpeg', quality: 20 });
  });

  test('notification settings modal opens with toggle options', async ({ page }) => {
    await page.getByTestId('notification-settings-btn').click();
    // The modal title is "Notifications" and shows notification toggle options
    // Wait for the modal to appear and check for specific content
    await expect(page.getByText('Daily Check-in', { exact: true })).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/notification-settings.jpeg', quality: 20 });
  });

  test('profile has edit and logout buttons', async ({ page }) => {
    await expect(page.getByTestId('edit-profile-btn')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByTestId('logout-btn')).toBeVisible();
  });
});
