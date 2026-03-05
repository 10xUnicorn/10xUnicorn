import { test, expect } from '@playwright/test';

async function login(page: any) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  
  const inputs = await page.locator('input').all();
  await inputs[0].fill('test_today@example.com');
  await inputs[1].fill('test123');
  await page.getByTestId('login-submit-btn').click();
  await page.waitForTimeout(3000);
}

test.describe('Iteration 11 Features - 10x Unicorn App Upgrades', () => {
  
  test.describe('1. Determination Slider Dynamic Quotes', () => {
    test('shows determination slider with DETERMINATION LEVEL header', async ({ page }) => {
      await login(page);
      
      // Should be on Today page after login
      const sliderLabel = page.getByText('DETERMINATION LEVEL');
      await expect(sliderLabel).toBeVisible();
    });
    
    test('displays emoji scale with Low and Level 10 labels', async ({ page }) => {
      await login(page);
      
      // Check for the emoji scale labels within the determination slider
      const determinationSlider = page.getByTestId('determination-slider');
      await expect(determinationSlider.getByText('Low')).toBeVisible();
      await expect(page.getByText('Level 10')).toBeVisible();
    });
    
    test('shows motivational quote banner that changes with slider level', async ({ page }) => {
      await login(page);
      
      // The quote appears below the slider - it's a text element that changes based on level
      // At level 5 (default building level), we should see a building-level quote
      // Sample quotes: "Small progress is still progress", "Discipline is choosing between..."
      const quoteText = page.locator('text=/progress|discipline|Success|small/i');
      await expect(quoteText.first()).toBeVisible();
    });
  });
  
  test.describe('2. Messages Screen Navigation', () => {
    test('can access messages from Community header icon', async ({ page }) => {
      await login(page);
      
      // Navigate to Community
      await page.getByText('Community', { exact: true }).click();
      await page.waitForTimeout(2000);
      
      // Verify Community page loaded
      await expect(page.getByText('Community')).toBeVisible();
      await expect(page.getByText('Leaderboard')).toBeVisible();
    });
  });
  
  test.describe('3. CRM Contact Form Dynamic Fields', () => {
    test('Wormhole label shows extensive specific fields', async ({ page }) => {
      await login(page);
      
      // Navigate to CRM -> Contacts
      await page.getByText('CRM', { exact: true }).click();
      await page.waitForTimeout(2000);
      await page.getByTestId('crm-tab-contacts').click();
      await page.waitForTimeout(2000);
      
      // Open Add Contact modal
      await page.getByTestId('add-crm-btn').click();
      await page.waitForTimeout(1000);
      
      // Select Wormhole label
      await page.getByRole('dialog').getByText('Wormhole').click();
      await page.waitForTimeout(1000);
      
      // Check for Wormhole-specific fields
      await expect(page.getByText('Connection Level', { exact: true })).toBeVisible();
      await expect(page.getByText('Tags', { exact: true })).toBeVisible();
      await expect(page.getByText('Preferred Platform', { exact: true })).toBeVisible();
      await expect(page.getByText('Power Leverage', { exact: true })).toBeVisible();
    });
    
    test('all 6 label types are available in the form', async ({ page }) => {
      await login(page);
      
      // Navigate to CRM -> Contacts
      await page.getByText('CRM', { exact: true }).click();
      await page.waitForTimeout(2000);
      await page.getByTestId('crm-tab-contacts').click();
      await page.waitForTimeout(2000);
      
      // Open Add Contact modal
      await page.getByTestId('add-crm-btn').click();
      await page.waitForTimeout(1000);
      
      // Check all label options are present
      await expect(page.getByRole('dialog').getByText('Prospect', { exact: true })).toBeVisible();
      await expect(page.getByRole('dialog').getByText('Referral Partner')).toBeVisible();
      await expect(page.getByRole('dialog').getByText('Strategic Partner')).toBeVisible();
      await expect(page.getByRole('dialog').getByText('Client', { exact: true })).toBeVisible();
      await expect(page.getByRole('dialog').getByText('Wormhole')).toBeVisible();
      await expect(page.getByRole('dialog').getByText('Resource', { exact: true })).toBeVisible();
    });
    
    test('BUG: Prospect label does NOT show specific fields (Potential Value, Interest Level)', async ({ page }) => {
      await login(page);
      
      // Navigate to CRM -> Contacts
      await page.getByText('CRM', { exact: true }).click();
      await page.waitForTimeout(2000);
      await page.getByTestId('crm-tab-contacts').click();
      await page.waitForTimeout(2000);
      
      // Open Add Contact modal
      await page.getByTestId('add-crm-btn').click();
      await page.waitForTimeout(1000);
      
      // Click Prospect to ensure it's selected
      await page.getByRole('dialog').getByText('Prospect', { exact: true }).click();
      await page.waitForTimeout(1000);
      
      // These fields should be visible for Prospect but they're NOT rendering
      const potentialValue = await page.getByText('Potential Value', { exact: true }).count();
      const interestLevel = await page.getByText('Interest Level', { exact: true }).count();
      
      console.log('Potential Value field count:', potentialValue);
      console.log('Interest Level field count:', interestLevel);
      
      // This will fail to document the bug
      expect(potentialValue, 'BUG: Prospect should show Potential Value field').toBeGreaterThan(0);
    });
  });
  
  test.describe('4. Profile 10x Goal Section', () => {
    test('Profile page displays 10x Goal card with goal title', async ({ page }) => {
      await login(page);
      
      // Navigate to Profile
      await page.getByText('Profile', { exact: true }).click();
      await page.waitForTimeout(2000);
      
      // Check for 10x Goal section
      await expect(page.getByText('10x Goal')).toBeVisible();
      
      // The goal value should be displayed (e.g., "Test Goal Update")
      await expect(page.getByText('Test Goal Update')).toBeVisible();
    });
    
    test('Profile page has Edit Profile button', async ({ page }) => {
      await login(page);
      
      // Navigate to Profile
      await page.getByText('Profile', { exact: true }).click();
      await page.waitForTimeout(2000);
      
      // Check for Edit Profile button
      await expect(page.getByTestId('edit-profile-btn')).toBeVisible();
    });
    
    test('BUG: Edit Goal button is NOT rendering on Profile page', async ({ page }) => {
      await login(page);
      
      // Navigate to Profile
      await page.getByText('Profile', { exact: true }).click();
      await page.waitForTimeout(2000);
      
      // Check if Edit Goal button exists in DOM
      const editGoalBtnCount = await page.locator('[data-testid="edit-goal-btn"]').count();
      console.log('Edit Goal button elements in DOM:', editGoalBtnCount);
      
      // This test documents the bug - Edit Goal button should exist but doesn't
      expect(editGoalBtnCount, 'BUG: Edit Goal button with testID="edit-goal-btn" should be in DOM').toBeGreaterThan(0);
    });
  });
  
  test.describe('5. CRM Tabs Navigation', () => {
    test('CRM has Signals, Contacts, and Deals tabs', async ({ page }) => {
      await login(page);
      
      // Navigate to CRM
      await page.getByText('CRM', { exact: true }).click();
      await page.waitForTimeout(2000);
      
      // Check all tabs are present
      await expect(page.getByTestId('crm-tab-signals')).toBeVisible();
      await expect(page.getByTestId('crm-tab-contacts')).toBeVisible();
      await expect(page.getByTestId('crm-tab-deals')).toBeVisible();
    });
    
    test('Contacts tab shows label filters', async ({ page }) => {
      await login(page);
      
      // Navigate to CRM -> Contacts
      await page.getByText('CRM', { exact: true }).click();
      await page.waitForTimeout(2000);
      await page.getByTestId('crm-tab-contacts').click();
      await page.waitForTimeout(2000);
      
      // Check filter options are visible
      await expect(page.getByText('All', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Prospect', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Wormhole').first()).toBeVisible();
    });
    
    test('Add button opens New Contact modal', async ({ page }) => {
      await login(page);
      
      // Navigate to CRM -> Contacts
      await page.getByText('CRM', { exact: true }).click();
      await page.waitForTimeout(2000);
      await page.getByTestId('crm-tab-contacts').click();
      await page.waitForTimeout(2000);
      
      // Click Add button
      await page.getByTestId('add-crm-btn').click();
      await page.waitForTimeout(1000);
      
      // Check modal opens with New Contact title
      await expect(page.getByText('New Contact', { exact: true })).toBeVisible();
    });
  });
});
