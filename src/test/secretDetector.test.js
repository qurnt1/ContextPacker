import { describe, expect, it, vi } from 'vitest';
import { scanDirectory } from '../utils/scanner';
import { detectPotentialSecrets } from '../utils/secretDetector';

function fileEntry(name, content, size = content.length) {
  return {
    kind: 'file',
    name,
    getFile: vi.fn().mockResolvedValue({
      size,
      text: vi.fn().mockResolvedValue(content),
    }),
  };
}

function directoryEntry(name, entries) {
  return {
    kind: 'directory',
    name,
    values: vi.fn(async function* values() {
      yield* entries;
    }),
  };
}

describe('detectPotentialSecrets', () => {
  it('reports provider tokens without exposing their values', () => {
    const findings = detectPotentialSecrets([
      'OPENAI_API_KEY = "sk-proj-123456789012345678901234"',
      'AWS_ACCESS_KEY_ID = "AKIA1234567890ABCDEF"',
    ].join('\n'));

    expect(findings).toEqual([
      { kind: 'openai-token', line: 1 },
      { kind: 'aws-access-key', line: 2 },
    ]);
    expect(JSON.stringify(findings)).not.toContain('123456789012345678901234');
  });

  it('reports private keys and credential assignments', () => {
    expect(detectPotentialSecrets([
      'database_url: "postgres://user:long-password-value@host/db"',
      '-----BEGIN PRIVATE KEY-----',
    ].join('\n'))).toEqual([
      { kind: 'credential-assignment', line: 1 },
      { kind: 'private-key', line: 2 },
    ]);
  });

  it('ignores comments, environment references, and examples', () => {
    expect(detectPotentialSecrets([
      '# OPENAI_API_KEY=sk-proj-123456789012345678901234',
      'apiKey: process.env.OPENAI_API_KEY',
      'api_key: "your-api-key"',
      'token: "example-token"',
      'const SECRET = `prefix-${ENV_SECRET}`;',
    ].join('\n'))).toEqual([]);
  });

  it('adds redacted findings to local file and tree metadata without reading blocked files', async () => {
    const blockedEnv = fileEntry('.env', 'API_KEY=do-not-read');
    const config = fileEntry('config.js', 'const apiKey = "credential-value-123";');
    const root = directoryEntry('demo', [blockedEnv, config]);

    const result = await scanDirectory(root);
    const file = result.files.find((entry) => entry.path === 'config.js');
    const treeNode = result.tree.children.find((entry) => entry.path === 'config.js');
    const blockedNode = result.tree.children.find((entry) => entry.path === '.env');

    expect(blockedEnv.getFile).not.toHaveBeenCalled();
    expect(blockedNode.potentialSecrets).toEqual([]);
    expect(file.potentialSecrets).toEqual([{ kind: 'credential-assignment', line: 1 }]);
    expect(treeNode.potentialSecrets).toEqual(file.potentialSecrets);
    expect(JSON.stringify({
      fileMetadata: file.potentialSecrets,
      treeMetadata: treeNode.potentialSecrets,
    })).not.toContain('credential-value-123');
  });
});
