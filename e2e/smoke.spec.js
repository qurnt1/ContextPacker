import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('contextpacker-settings', JSON.stringify({ state: { onboardingDone: true }, version: 3 }));
  });
});

test('renders the local-only ContextPacker welcome screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ContextPacker', exact: true })).toBeVisible();
  const logo = page.getByRole('img', { name: 'ContextPacker' });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', /contextpacker-logo\.png/);
  const sourceLink = page.getByRole('link', { name: /Gratuit et open source/i });
  await expect(sourceLink).toHaveAttribute('href', 'https://github.com/qurnt1/ContextPacker');
  await expect(sourceLink).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('button', { name: /Ouvrir un dossier local/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Tout le nécessaire pour préparer votre contexte IA/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Traitement local', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Projet/i })).toHaveCount(0);
});

test('opens the local directory picker from the welcome action', async ({ page }) => {
  await page.addInitScript(() => {
    window.__directoryPickerCalls = 0;
    window.showDirectoryPicker = async () => {
      window.__directoryPickerCalls += 1;
      const error = new DOMException('cancelled', 'AbortError');
      throw error;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Ouvrir un dossier local/i }).click();
  await expect.poll(() => page.evaluate(() => window.__directoryPickerCalls)).toBe(1);
});

test('keeps the welcome presentation below the initial viewport', async ({ page }) => {
  await page.addInitScript(() => {
    const recentProjects = Array.from({ length: 6 }, (_, index) => ({
      id: `project-${index}`,
      key: `local:project-${index}`,
      type: 'local',
      name: `demo-${index}`,
      fileCount: index + 1,
      totalTokens: 100,
      openedAt: new Date(Date.now() - index * 1000).toISOString(),
    }));
    localStorage.setItem('contextpacker-settings', JSON.stringify({
      state: { recentProjects, favoriteProjects: [], onboardingDone: true },
      version: 3,
    }));
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Dossiers récents', exact: true })).toBeVisible();
  await expect(page.locator('[aria-labelledby="recent-projects-title"] > div > div')).toHaveCount(4);
  const featuresBox = await page.getByRole('heading', { name: /Tout le nécessaire pour préparer votre contexte IA/i }).boundingBox();
  expect(featuresBox?.y).toBeGreaterThanOrEqual(await page.evaluate(() => innerHeight));

  const cue = page.getByRole('button', { name: 'Voir la pr\u00e9sentation' });
  const cueBox = await cue.boundingBox();
  const footerBox = await page.locator('.welcome-launch > .flex.flex-wrap').boundingBox();
  expect(cueBox?.y ?? 0).toBeGreaterThanOrEqual((footerBox?.y ?? 0) + (footerBox?.height ?? 0));

  await cue.click();
  await page.waitForFunction(() => document.querySelector('.welcome-shell')?.scrollTop > 0);
  await expect(page.getByRole('heading', { name: /Tout le n\u00e9cessaire pour pr\u00e9parer votre contexte IA/i })).toBeInViewport();
  await expect(cue).toHaveCount(0);
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
