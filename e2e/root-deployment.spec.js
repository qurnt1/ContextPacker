import { test, expect } from '@playwright/test';

test('loads the production build at the hosting root', async ({ page }) => {
  const failedRequests = [];
  const failedResponses = [];

  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ContextPacker', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ouvrir un dossier local/i })).toBeVisible();

  expect(failedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
});
