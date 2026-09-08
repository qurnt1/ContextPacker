import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contextpacker-settings', JSON.stringify({ state: { onboardingDone: true }, version: 3 }));
  });
});

test('renders the local-only ContextPacker welcome screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ContextPacker', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ouvrir un dossier local/i })).toBeVisible();
  await expect(page.getByText(/Traitement local/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Projet/i })).toHaveCount(0);
});

test('opens and closes the onboarding guide', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome-guide-button').click();
  const dialog = page.getByTestId('onboarding-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Bienvenue dans ContextPacker/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
