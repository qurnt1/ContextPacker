import { test, expect } from '@playwright/test';

const commitSha = 'a'.repeat(40);
const featureCommitSha = 'c'.repeat(40);
const treeSha = 'b'.repeat(40);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cp-store-settings', JSON.stringify({ state: { onboardingDone: true }, version: 1 }));
  });
  await page.route('https://api.github.com/**', async (route) => {
    const url = new URL(route.request().url());
    const path = decodeURIComponent(url.pathname);
    let body;

    if (/^\/repos\/acme\/demo$/.test(path)) {
      body = { private: false, default_branch: 'main' };
    } else if (path.endsWith('/branches')) {
      body = [
        { name: 'main', protected: false, commit: { sha: commitSha } },
        { name: 'feature/ui', protected: false, commit: { sha: featureCommitSha } },
      ];
    } else if (path.includes('/git/ref/heads/')) {
      body = { object: { sha: path.endsWith('/feature/ui') ? featureCommitSha : commitSha } };
    } else if (path.includes('/git/commits/')) {
      body = { tree: { sha: treeSha } };
    } else if (path.includes('/git/trees/')) {
      body = {
        tree: [
          { path: 'README.md', type: 'blob', size: 32 },
          { path: 'src/App.jsx', type: 'blob', size: 48 },
        ],
        truncated: false,
      };
    } else {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not mocked' }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route('https://raw.githubusercontent.com/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const content = path.endsWith('/README.md') ? '# demo\n' : 'export default function App() { return null; }\n';
    await route.fulfill({ status: 200, contentType: 'text/plain', body: content });
  });
});

async function openGithubProject(page, branch = '') {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ContextPacker', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Projet GitHub' }).click();
  await page.getByPlaceholder('https://github.com/owner/repo').fill('acme/demo');

  if (branch) {
    const branchButton = page.getByRole('button', { name: /Sélectionner une branche/ });
    await expect(branchButton).toContainText('main');
    await branchButton.click();
    await page.getByRole('option', { name: new RegExp(branch) }).click();
    await expect(branchButton).toContainText(branch);
  }

  await expect(page.getByRole('button', { name: 'Charger le projet GitHub' })).toBeEnabled();
  const refRequest = branch
    ? page.waitForRequest((request) => decodeURIComponent(new URL(request.url()).pathname).endsWith(`/git/ref/heads/${branch}`))
    : null;
  await page.getByRole('button', { name: 'Charger le projet GitHub' }).click();
  if (refRequest) await refRequest;
  await expect(page.getByRole('button', { name: /ContextPacker/ }).first()).toBeVisible();
  await expect(page.getByText('README.md')).toBeVisible();
  await expect(page.getByText('src')).toBeVisible();
}

test('opens a mocked GitHub project and keeps the workbench usable', async ({ page }) => {
  await openGithubProject(page);
  await expect(page.getByText('Formatage compact')).toBeVisible();

  await expect(page.locator('[data-file-type="readme"]').first()).toBeVisible();
  await expect(page.locator('[data-file-type="readme"]').first()).toHaveAttribute('viewBox', '0 0 16 16');
  await expect(page.locator('[data-file-type="react"]').first()).toBeVisible();
  await expect(page.locator('[data-file-type="react"]').first()).toHaveAttribute('viewBox', '0 0 32 32');

  await page.getByRole('button', { name: /Sélectionner README.md/ }).click();
  await expect(page.getByText('Prévisualisation')).toBeVisible();

  await page.getByTestId('shortcut-help-button').click();
  await expect(page.getByTestId('shortcut-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('shortcut-dialog')).toBeHidden();
});

test('covers branch selection, compact mode, responsive layout, exports, and return home', async ({ page }) => {
  await openGithubProject(page, 'feature/ui');

  const compactToggle = page.getByRole('button', { name: /Formatage compact/ });
  await compactToggle.click();
  await expect(compactToggle).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: /Sélectionner README\.md/ }).click();
  await page.getByRole('button', { name: /Sélectionner App\.jsx/ }).click();
  await expect(page.getByText('Prévisualisation')).toBeVisible();

  const collapseButton = page.getByRole('button', { name: /Masquer le panneau latéral/ });
  await collapseButton.click();
  await expect(page.getByRole('button', { name: /Afficher le panneau latéral/ })).toBeVisible();
  await page.getByRole('button', { name: /Afficher le panneau latéral/ }).click();
  await expect(page.getByRole('button', { name: /Masquer le panneau latéral/ })).toBeVisible();

  for (const width of [1366, 1920]) {
    await page.setViewportSize({ width, height: 768 });
    const progress = page.getByRole('progressbar', { name: 'Utilisation des tokens' });
    const box = await progress.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs((box.x + box.width / 2) - width / 2)).toBeLessThan(120);
  }

  const exportButton = page.getByRole('button', { name: 'Exporter' });
  await exportButton.click();
  const menu = page.getByRole('menu');
  const [txtDownload] = await Promise.all([
    page.waitForEvent('download'),
    menu.getByRole('menuitem', { name: /Télécharger \.txt/ }).click(),
  ]);
  expect(txtDownload.suggestedFilename()).toMatch(/\.txt$/);

  await exportButton.click();
  const [markdownDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menu').getByRole('menuitem', { name: /Télécharger \.md/ }).click(),
  ]);
  expect(markdownDownload.suggestedFilename()).toMatch(/\.md$/);

  await page.getByRole('button', { name: /ContextPacker/ }).first().click();
  await expect(page.getByRole('heading', { name: 'ContextPacker', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accueil' })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'ContextPacker', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('keeps the welcome modal keyboard accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('welcome-guide-button').click();
  const dialog = page.getByTestId('onboarding-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Fermer/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
