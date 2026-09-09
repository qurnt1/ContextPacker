import { describe, expect, it, vi } from 'vitest';
import { scanDirectory } from '../utils/scanner';

function fileEntry(name, content, size = content.length, lastModified = 0) {
  return {
    kind: 'file',
    name,
    getFile: vi.fn().mockResolvedValue({ size, lastModified, text: vi.fn().mockResolvedValue(content) }),
  };
}

function directoryEntry(name, entries) {
  return {
    kind: 'directory',
    name,
    values: vi.fn(async function* values() { yield* entries; }),
  };
}

describe('scanDirectory', () => {
  it('reports the total candidate files before processing them', async () => {
    const root = directoryEntry('demo', [
      fileEntry('index.js', 'export default 1;'),
      fileEntry('image.png', 'not scanned'),
      fileEntry('empty.js', '', 0),
      directoryEntry('src', [fileEntry('App.jsx', 'export default function App() {}')]),
    ]);
    const progress = [];
    const result = await scanDirectory(root, (count, total) => progress.push([count, total]));
    expect(result.files.map((file) => file.path)).toEqual(['src/App.jsx', 'empty.js', 'index.js']);
    expect(progress[0]).toEqual([0, 3]);
    expect(progress.at(-1)).toEqual([3, 3]);
  });

  it('keeps text that resembles a credential as ordinary source', async () => {
    const root = directoryEntry('demo', [fileEntry('config.js', 'const apiKey = "example";')]);
    const result = await scanDirectory(root);
    expect(result.files[0]).toMatchObject({ path: 'config.js', selectable: true, blocked: false });
    expect(Object.keys(result.files[0])).not.toContain('securityMetadata');
  });

  it('always ignores implementation directories and binary extensions', async () => {
    const git = directoryEntry('.git', [fileEntry('config', 'do not read')]);
    const venv = directoryEntry('venv', [fileEntry('python', 'do not read')]);
    const cache = directoryEntry('.pytest_cache', [fileEntry('state', 'do not read')]);
    const aws = directoryEntry('.aws', [fileEntry('credentials', 'do not read')]);
    const ssh = directoryEntry('.ssh', [fileEntry('id_ed25519', 'do not read')]);
    const envFile = fileEntry('.env.local', 'do not read');
    const credentialsFile = fileEntry('credentials.json', 'do not read');
    const privateKey = fileEntry('server.pem', 'do not read');
    const root = directoryEntry('demo', [
      git,
      venv,
      cache,
      aws,
      ssh,
      envFile,
      credentialsFile,
      privateKey,
      fileEntry('image.png', 'not scanned'),
      fileEntry('main.js', 'const ok = true;'),
    ]);
    const result = await scanDirectory(root, undefined, { applyGitignore: false });
    expect(result.files.map((file) => file.path)).toEqual(['main.js']);
    expect(git.values).not.toHaveBeenCalled();
    expect(venv.values).not.toHaveBeenCalled();
    expect(cache.values).not.toHaveBeenCalled();
    expect(aws.values).not.toHaveBeenCalled();
    expect(ssh.values).not.toHaveBeenCalled();
    expect(envFile.getFile).not.toHaveBeenCalled();
    expect(credentialsFile.getFile).not.toHaveBeenCalled();
    expect(privateKey.getFile).not.toHaveBeenCalled();
  });

  it('keeps JSON and CSV text files, including empty files and timestamps', async () => {
    const lastModified = 1_725_000_000_000;
    const root = directoryEntry('demo', [
      fileEntry('data.json', '{}', 2, lastModified),
      fileEntry('table.csv', 'nom;ville\r\nElodie;Poitiers\r\n'),
      fileEntry('empty.json', '', 0),
    ]);
    const result = await scanDirectory(root);
    expect(result.files.map((file) => file.path)).toEqual(['data.json', 'empty.json', 'table.csv']);
    expect(result.files.find((file) => file.path === 'data.json')).toMatchObject({ lastModified });
  });

  it('rejects a scan above the global file cap before reading content', async () => {
    const entries = Array.from({ length: 1201 }, (_, index) => fileEntry(`file-${index}.js`, 'const value = 1;'));
    await expect(scanDirectory(directoryEntry('demo', entries))).rejects.toThrow('Limite actuelle : 1200');
    expect(entries[0].getFile).toHaveBeenCalledTimes(1);
  });
});
