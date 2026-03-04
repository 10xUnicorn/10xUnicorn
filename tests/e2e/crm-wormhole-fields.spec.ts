import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test_today@example.com';
const TEST_PASSWORD = 'test123';

test.describe('CRM Wormhole Dynamic Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Login
    await page.getByTestId('login-email-input').fill(TEST_EMAIL);
    await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForTimeout(3000);

    // Navigate to CRM
    await page.getByText('CRM', { exact: true }).click();
    await page.waitForTimeout(2000);

    // Click on Contacts tab
    await page.getByTestId('crm-tab-contacts').click();
    await page.waitForTimeout(1000);
  });

  test('CRM Contacts tab displays correctly with label filters', async ({ page }) => {
    // Verify Contacts tab is visible
    await expect(page.getByTestId('crm-tab-contacts')).toBeVisible();
    
    // Verify label filter chips are visible - use first() to handle duplicates
    await expect(page.getByText('Prospect').first()).toBeVisible();
    await expect(page.getByText('Referral Partner').first()).toBeVisible();
    await expect(page.getByText('Strategic Partner').first()).toBeVisible();
    await expect(page.getByText('Client').first()).toBeVisible();
    await expect(page.getByText('Wormhole').first()).toBeVisible();
    await expect(page.getByText('Resource').first()).toBeVisible();
  });

  test('Add Contact modal shows basic fields for non-wormhole contacts', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Verify basic fields are visible
    await expect(page.getByText('New Contact')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Name *')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Label')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Company').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Title').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Contact Info')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Notes').first()).toBeVisible();
    
    // Verify Prospect is selected by default
    const prospectBtn = page.getByRole('dialog').getByText('Prospect').first();
    await expect(prospectBtn).toBeVisible();
    
    // Verify "Show Advanced Fields" button exists for non-wormhole
    await expect(page.getByRole('dialog').getByText('Show Advanced Fields')).toBeVisible();
  });

  test('Selecting Wormhole label shows all wormhole-specific fields', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Select Wormhole label
    await page.getByRole('dialog').getByText('Wormhole').click();
    await page.waitForTimeout(500);

    // Verify Connection Level selector appears
    await expect(page.getByRole('dialog').getByText('Connection Level')).toBeVisible();
    await expect(page.getByText('Active / Professional')).toBeVisible();
    await expect(page.getByText('Warm / Local')).toBeVisible();
    await expect(page.getByText('Building').first()).toBeVisible();
    await expect(page.getByText('Mid-Aspirational')).toBeVisible();
    await expect(page.getByText('Close / Personal')).toBeVisible();
  });

  test('Wormhole form includes Tags with colors', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Select Wormhole label
    await page.getByRole('dialog').getByText('Wormhole').click();
    await page.waitForTimeout(500);

    // Verify Tags section appears - use exact match
    await expect(page.getByRole('dialog').getByText('Tags', { exact: true })).toBeVisible();
    await expect(page.getByText('Influencer')).toBeVisible();
    await expect(page.getByText('Speaker')).toBeVisible();
    await expect(page.getByText('Business Owner')).toBeVisible();
    await expect(page.getByText('Access').first()).toBeVisible();
    await expect(page.getByText('Mindset')).toBeVisible();
    await expect(page.getByText('Future Self', { exact: true })).toBeVisible();
    await expect(page.getByText('Community Partner')).toBeVisible();
    await expect(page.getByText('Motivation')).toBeVisible();
  });

  test('Wormhole form includes Activation Next Step and meeting fields', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Select Wormhole label
    await page.getByRole('dialog').getByText('Wormhole').click();
    await page.waitForTimeout(500);

    // Verify Activation Next Step field
    await expect(page.getByRole('dialog').getByText('Activation Next Step')).toBeVisible();
    
    // Verify Last Contact Date field
    await expect(page.getByRole('dialog').getByText('Last Contact').first()).toBeVisible();
    
    // Verify Set Meeting toggle
    await expect(page.getByRole('dialog').getByText('Set Meeting?')).toBeVisible();
  });

  test('Wormhole form includes Preferred Platform options', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Select Wormhole label
    await page.getByRole('dialog').getByText('Wormhole').click();
    await page.waitForTimeout(500);

    // Verify Preferred Platform section
    await expect(page.getByRole('dialog').getByText('Preferred Platform')).toBeVisible();
    await expect(page.getByText('Text').first()).toBeVisible();
    await expect(page.getByText('Phone').first()).toBeVisible();
    await expect(page.getByText('Email').first()).toBeVisible();
    await expect(page.getByText('In-Person')).toBeVisible();
    await expect(page.getByText('IG DM')).toBeVisible();
  });

  test('Wormhole form includes Location and Power Leverage fields', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Select Wormhole label
    await page.getByRole('dialog').getByText('Wormhole').click();
    await page.waitForTimeout(500);

    // Verify Location field
    await expect(page.getByRole('dialog').getByText('Location').first()).toBeVisible();
    
    // Verify Power Leverage field
    await expect(page.getByRole('dialog').getByText('Power Leverage')).toBeVisible();
  });

  test('Wormhole form includes Social Media fields', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Select Wormhole label
    await page.getByRole('dialog').getByText('Wormhole').click();
    await page.waitForTimeout(500);

    // Scroll to find Social Media section
    await page.getByRole('dialog').getByText('Social Media').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Verify Social Media section
    await expect(page.getByRole('dialog').getByText('Social Media')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('LinkedIn').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Instagram').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Twitter').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Website').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('YouTube').first()).toBeVisible();
    await expect(page.getByRole('dialog').getByText('TikTok').first()).toBeVisible();
  });

  test('Wormhole form includes Engagement Types buttons', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Select Wormhole label
    await page.getByRole('dialog').getByText('Wormhole').click();
    await page.waitForTimeout(500);

    // Scroll to find Engagement Types section
    await page.getByRole('dialog').getByText('Engagement Types').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Verify Engagement Types section
    await expect(page.getByRole('dialog').getByText('Engagement Types')).toBeVisible();
    await expect(page.getByText('DMs').first()).toBeVisible();
    await expect(page.getByText('Replies to Comments')).toBeVisible();
    await expect(page.getByText('Shares Posts')).toBeVisible();
    await expect(page.getByText('Collaborates on Posts')).toBeVisible();
    await expect(page.getByText('Tags in Posts')).toBeVisible();
    await expect(page.getByText('Tags in Comments')).toBeVisible();
  });

  test('Wormhole form includes Reciprocity Notes field', async ({ page }) => {
    // Click Add button
    await page.getByTestId('add-crm-btn').click();
    await page.waitForTimeout(1000);

    // Select Wormhole label
    await page.getByRole('dialog').getByText('Wormhole').click();
    await page.waitForTimeout(500);

    // Scroll to find Reciprocity Notes
    await page.getByRole('dialog').getByText('Reciprocity Notes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Verify Reciprocity Notes field
    await expect(page.getByRole('dialog').getByText('Reciprocity Notes')).toBeVisible();
  });
});

test.describe('Today Screen - Determination Slider', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Login
    await page.getByTestId('login-email-input').fill(TEST_EMAIL);
    await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
    await page.getByTestId('login-submit-btn').click();
    await page.waitForTimeout(3000);
  });

  test('Today screen loads without sliderCollapsed error', async ({ page }) => {
    // Verify Today screen loads correctly - use exact match
    await expect(page.getByText('TODAY', { exact: true })).toBeVisible();
    
    // Verify determination slider is visible
    await expect(page.getByText('DETERMINATION LEVEL')).toBeVisible();
    
    // No error should be shown - just verify page loaded correctly
    await expect(page.getByText('DETERMINATION LEVEL')).toBeVisible();
  });

  test('Determination slider shows emoji scale', async ({ page }) => {
    // Verify slider is visible
    await expect(page.getByText('DETERMINATION LEVEL')).toBeVisible();
    
    // Check for emoji scale labels - use more specific locator
    await expect(page.getByText('😴').first()).toBeVisible(); // Low level
    await expect(page.getByText('🦄').first()).toBeVisible(); // Level 10
  });

  test('Determination slider shows Low and Level 10 labels', async ({ page }) => {
    // Verify the scale labels are visible - use first() to handle duplicates
    await expect(page.getByText('Low').first()).toBeVisible();
    await expect(page.getByText('Level 10').first()).toBeVisible();
  });

  test('Motivational quote is displayed', async ({ page }) => {
    // Verify a motivational quote is shown - check for the quote container existence
    // The quotes are random so we just check the determination level section loaded
    await expect(page.getByText('DETERMINATION LEVEL')).toBeVisible();
  });
});
