import { describe, expect, it } from 'vitest';
import { createIgnoreFilter } from '../utils/gitignoreParser';
import { isSensitivePath } from '../utils/securityPolicy';

describe('security policy', () => {
  it('blocks sensitive paths at any directory depth', () => {
    [
      '.env',
      'config/.env.local',
      '.aws/credentials',
      'services/api/.ssh/id_ed25519',
      'secrets/credentials.json',
      'keys/server.pem',
      'keys/client.PFX',
    ].forEach((path) => expect(isSensitivePath(path)).toBe(true));
  });

  it('does not classify ordinary source files from their contents', () => {
    expect(isSensitivePath('src/config.js')).toBe(false);
    expect(isSensitivePath('src/credentials.ts')).toBe(false);
    expect(isSensitivePath('src/apiKey.js')).toBe(false);
  });

  it('keeps mandatory secret exclusions active without project gitignore rules', () => {
    const filter = createIgnoreFilter('', { enabled: false });

    expect(filter.ignores('.env.production')).toBe(true);
    expect(filter.ignores('.ssh/id_rsa')).toBe(true);
    expect(filter.ignores('credentials.json')).toBe(true);
    expect(filter.ignores('src/main.js')).toBe(false);
  });
});
