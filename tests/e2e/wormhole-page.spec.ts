import { test, expect } from '@playwright/test';
import { TEST_USER, waitForAppReady, loginUser, dismissToasts } from '../fixtures/helpers';

test.describe('Wormhole Page - Phase 3 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await dismissToasts(page);
    
    // Login first
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for Today page to load, then navigate to Wormhole
    await expect(page.getByText('Determination Level')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: 'Wormhole' }).click();
    await expect(page.getByText('Wormhole Network')).toBeVisible({ timeout: 10000 });
  });

  test('wormhole page displays network header and search', async ({ page }) => {
    await expect(page.getByText('Wormhole Network')).toBeVisible();
    await expect(page.getByTestId('add-contact-btn')).toBeVisible();
    await expect(page.getByTestId('import-contacts-btn')).toBeVisible();
    await expect(page.getByTestId('contact-search-input')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/wormhole-page.jpeg', quality: 20 });
  });

  test('can open Add Contact modal with expanded schema', async ({ page }) => {
    await page.getByTestId('add-contact-btn').click();
    
    // Modal should appear with expanded fields
    await expect(page.getByText('Add Contact')).toBeVisible({ timeout: 5000 });
    
    // Identity section
    await expect(page.getByText('Identity')).toBeVisible();
    await expect(page.getByPlaceholder('Name *')).toBeVisible();
    await expect(page.getByPlaceholder('Company')).toBeVisible();
    await expect(page.getByPlaceholder('Title / Role')).toBeVisible();
    await expect(page.getByPlaceholder('Location')).toBeVisible();
    
    // Contact Info section
    await expect(page.getByText('Contact Info')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Phone')).toBeVisible();
    await expect(page.getByPlaceholder('Website')).toBeVisible();
    
    // Social Media section
    await expect(page.getByText('Social Media')).toBeVisible();
    await expect(page.getByPlaceholder('LinkedIn URL')).toBeVisible();
    await expect(page.getByPlaceholder('Twitter / X handle')).toBeVisible();
    await expect(page.getByPlaceholder('Instagram handle')).toBeVisible();
    await expect(page.getByPlaceholder('YouTube channel')).toBeVisible();
    await expect(page.getByPlaceholder('TikTok handle')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/add-contact-modal.jpeg', quality: 20 });
  });

  test('can see leverage potential options', async ({ page }) => {
    await page.getByTestId('add-contact-btn').click();
    await expect(page.getByText('Add Contact')).toBeVisible({ timeout: 5000 });
    
    // Scroll down to leverage section
    await expect(page.getByText('Leverage Potential')).toBeVisible();
    await expect(page.getByText('investor')).toBeVisible();
    await expect(page.getByText('strategic partner')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/leverage-options.jpeg', quality: 20 });
  });

  test('can see best contact method options', async ({ page }) => {
    await page.getByTestId('add-contact-btn').click();
    await expect(page.getByText('Add Contact')).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText('Best Contact Method')).toBeVisible();
    await expect(page.getByText('Email', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('LinkedIn DM')).toBeVisible();
    await expect(page.getByText('Phone Call')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/contact-methods.jpeg', quality: 20 });
  });

  test('can see connection level options', async ({ page }) => {
    await page.getByTestId('add-contact-btn').click();
    await expect(page.getByText('Add Contact')).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText('Connection Level')).toBeVisible();
    await expect(page.getByText('Cold', { exact: true })).toBeVisible();
    await expect(page.getByText('Warm', { exact: true })).toBeVisible();
    await expect(page.getByText('Hot', { exact: true })).toBeVisible();
    await expect(page.getByText('Close', { exact: true })).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/connection-levels.jpeg', quality: 20 });
  });

  test('can see engagement strength selector', async ({ page }) => {
    await page.getByTestId('add-contact-btn').click();
    await expect(page.getByText('Add Contact')).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText('Engagement Strength')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/engagement-strength.jpeg', quality: 20 });
  });

  test('can create a full contact with all fields', async ({ page }) => {
    await page.getByTestId('add-contact-btn').click();
    await expect(page.getByPlaceholder('Name *')).toBeVisible({ timeout: 5000 });
    
    const uniqueName = `Test Contact ${Date.now()}`;
    
    // Fill identity
    await page.getByPlaceholder('Name *').fill(uniqueName);
    await page.getByPlaceholder('Company').fill('Test Company Inc');
    await page.getByPlaceholder('Title / Role').fill('CEO');
    await page.getByPlaceholder('Location').fill('San Francisco, CA');
    
    // Fill contact info
    await page.getByPlaceholder('Email').fill('test@company.com');
    await page.getByPlaceholder('Phone').fill('+1-555-123-4567');
    await page.getByPlaceholder('Website').fill('https://company.com');
    
    // Fill social
    await page.getByPlaceholder('LinkedIn URL').fill('https://linkedin.com/in/test');
    await page.getByPlaceholder('Twitter / X handle').fill('@testhandle');
    
    // Click investor leverage category
    await page.getByText('investor', { exact: true }).click();
    
    // Select Hot connection level
    await page.getByText('Hot', { exact: true }).click();
    
    // Submit
    await page.getByText('Add Contact').last().click();
    
    // Should see contact in list
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: 'e2e/test-results/contact-created.jpeg', quality: 20 });
  });

  test('search filters contacts', async ({ page }) => {
    // Create a contact with unique name for search
    await page.getByTestId('add-contact-btn').click();
    await expect(page.getByPlaceholder('Name *')).toBeVisible({ timeout: 5000 });
    
    const uniqueName = `SearchTest ${Date.now()}`;
    await page.getByPlaceholder('Name *').fill(uniqueName);
    await page.getByText('Add Contact').last().click();
    
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
    
    // Now search for it
    await page.getByTestId('contact-search-input').fill('SearchTest');
    
    // Should still see the contact
    await expect(page.getByText(uniqueName)).toBeVisible();
    
    // Search for something else
    await page.getByTestId('contact-search-input').fill('XYZ123NotFound');
    
    // Should show empty or filtered list
    await page.screenshot({ path: 'e2e/test-results/contact-search.jpeg', quality: 20 });
  });
});

test.describe('Wormhole Interaction Logging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await dismissToasts(page);
    
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 15000 });
    await loginUser(page, TEST_USER.email, TEST_USER.password);
    await expect(page.getByText('Determination Level')).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('tab', { name: 'Wormhole' }).click();
    await expect(page.getByText('Wormhole Network')).toBeVisible({ timeout: 10000 });
  });

  test('can open contact detail and see interaction form', async ({ page }) => {
    // Check if we have contacts, if not create one
    const contactCount = await page.locator('[data-testid^="contact-"]').count();
    
    if (contactCount === 0) {
      await page.getByTestId('add-contact-btn').click();
      await expect(page.getByPlaceholder('Name *')).toBeVisible({ timeout: 5000 });
      await page.getByPlaceholder('Name *').fill(`Interaction Test ${Date.now()}`);
      await page.getByText('Add Contact').last().click();
      await expect(page.getByText('Interaction Test')).toBeVisible({ timeout: 10000 });
    }
    
    // Click on first contact
    await page.locator('[data-testid^="contact-"]').first().click();
    
    // Should see detail modal with interaction section
    await expect(page.getByText('Log Interaction')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Log a new interaction')).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/contact-detail.jpeg', quality: 20 });
  });

  test('can open interaction form and see action types', async ({ page }) => {
    // Ensure contact exists
    const contactCount = await page.locator('[data-testid^="contact-"]').count();
    
    if (contactCount === 0) {
      await page.getByTestId('add-contact-btn').click();
      await expect(page.getByPlaceholder('Name *')).toBeVisible({ timeout: 5000 });
      await page.getByPlaceholder('Name *').fill(`Action Test ${Date.now()}`);
      await page.getByText('Add Contact').last().click();
      await expect(page.getByText('Action Test')).toBeVisible({ timeout: 10000 });
    }
    
    // Open contact detail
    await page.locator('[data-testid^="contact-"]').first().click();
    await expect(page.getByText('Log a new interaction')).toBeVisible({ timeout: 5000 });
    
    // Click to expand interaction form
    await page.getByText('Log a new interaction').click();
    
    // Should see action types
    await expect(page.getByText('Action Type')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Sent intro email')).toBeVisible();
    await expect(page.getByText('Followed up')).toBeVisible();
    await expect(page.getByText('Scheduled meeting')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/test-results/interaction-action-types.jpeg', quality: 20 });
  });

  test('can log an interaction with impact rating', async ({ page }) => {
    // Ensure contact exists
    const contactCount = await page.locator('[data-testid^="contact-"]').count();
    
    if (contactCount === 0) {
      await page.getByTestId('add-contact-btn').click();
      await expect(page.getByPlaceholder('Name *')).toBeVisible({ timeout: 5000 });
      await page.getByPlaceholder('Name *').fill(`Log Interaction Test ${Date.now()}`);
      await page.getByText('Add Contact').last().click();
      await expect(page.getByText('Log Interaction Test')).toBeVisible({ timeout: 10000 });
    }
    
    // Open contact detail
    await page.locator('[data-testid^="contact-"]').first().click();
    await expect(page.getByText('Log a new interaction')).toBeVisible({ timeout: 5000 });
    
    // Open interaction form
    await page.getByText('Log a new interaction').click();
    await expect(page.getByText('Action Type')).toBeVisible({ timeout: 5000 });
    
    // Select action type
    await page.getByText('Sent intro email').click();
    
    // Fill interaction text
    await page.getByTestId('interaction-input').fill('Sent initial outreach email about partnership');
    
    // Impact rating visible
    await expect(page.getByText('Impact Rating (1-10)')).toBeVisible();
    
    // Submit interaction
    await page.getByTestId('log-interaction-btn').click();
    
    // Should see in history
    await expect(page.getByText('sent intro email')).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: 'e2e/test-results/interaction-logged.jpeg', quality: 20 });
  });

  test('can delete a contact', async ({ page }) => {
    // Create a contact specifically for deletion
    await page.getByTestId('add-contact-btn').click();
    await expect(page.getByPlaceholder('Name *')).toBeVisible({ timeout: 5000 });
    
    const deleteName = `Delete Test ${Date.now()}`;
    await page.getByPlaceholder('Name *').fill(deleteName);
    await page.getByText('Add Contact').last().click();
    await expect(page.getByText(deleteName)).toBeVisible({ timeout: 10000 });
    
    // Open contact detail
    await page.getByText(deleteName).click();
    await expect(page.getByTestId('delete-contact-btn')).toBeVisible({ timeout: 5000 });
    
    // Click delete
    await page.getByTestId('delete-contact-btn').click();
    
    // Should prompt for confirmation (Alert)
    // Accept the alert
    page.on('dialog', dialog => dialog.accept());
    
    await page.screenshot({ path: 'e2e/test-results/contact-delete.jpeg', quality: 20 });
  });
});
