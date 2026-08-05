import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Version consistency', () => {
  it('APP_VERSION is defined as a non-empty string', async () => {
    const { APP_VERSION } = await import('../version');
    expect(APP_VERSION).toBeDefined();
    expect(typeof APP_VERSION).toBe('string');
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });

  it('package.json version matches APP_VERSION', async () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
    const { APP_VERSION } = await import('../version');
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('package.json version follows SemVer', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
    expect(pkg.version).toMatch(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
  });

  it('README does not contain hardcoded old version 3.0.0', () => {
    const readme = readFileSync(resolve(__dirname, '../../README.md'), 'utf-8');
    expect(readme).not.toMatch(/\b3\.0\.0\b/);
  });
});
