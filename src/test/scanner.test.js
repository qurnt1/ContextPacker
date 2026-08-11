import { describe, expect, it, vi } from 'vitest';
import { scanDirectory } from '../utils/scanner';

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

describe('scanDirectory progress', () => {
  it('reports the total candidate files before processing them', async () => {
    const root = directoryEntry('demo', [
      fileEntry('index.js', 'export default 1;'),
      fileEntry('image.png', 'not scanned'),
      fileEntry('empty.js', '', 0),
      directoryEntry('src', [fileEntry('App.jsx', 'export default function App() {}')]),
    ]);
    const progress = [];

    const result = await scanDirectory(root, (count, total) => {
      progress.push([count, total]);
    });

    expect(result.files.map((file) => file.path)).toEqual(['src/App.jsx', 'empty.js', 'index.js']);
    expect(progress[0]).toEqual([0, 3]);
    expect(progress.at(-1)).toEqual([3, 3]);
  });

  it('counts a candidate that is rejected as binary after reading', async () => {
    const root = directoryEntry('demo', [
      fileEntry('valid.js', 'const value = 1;'),
      fileEntry('binary.js', '\u0000binary content'),
    ]);
    const progress = [];

    const result = await scanDirectory(root, (count, total) => {
      progress.push([count, total]);
    });

    expect(result.files).toHaveLength(1);
    expect(progress[0]).toEqual([0, 2]);
    expect(progress.at(-1)).toEqual([2, 2]);
  });

  it('shows sensitive entries without reading them and does not traverse virtualenvs', async () => {
    const env = fileEntry('.env', 'SECRET=do-not-read');
    const example = fileEntry('.env.example', 'PUBLIC=value');
    const virtualenv = directoryEntry('.venv', [fileEntry('bin/python', 'do-not-read')]);
    const root = directoryEntry('demo', [env, example, virtualenv]);

    const result = await scanDirectory(root);

    expect(result.files.map((file) => file.path)).toEqual(['.env.example']);
    expect(env.getFile).not.toHaveBeenCalled();
    expect(virtualenv.values).not.toHaveBeenCalled();
    expect(result.tree.children.find((node) => node.name === '.env')).toMatchObject({
      blocked: true,
      selectable: false,
      blockedReason: 'sensitive',
      traversed: false,
    });
    expect(result.tree.children.find((node) => node.name === '.venv')).toMatchObject({
      type: 'directory',
      blocked: true,
      selectable: false,
      traversed: false,
    });
  });

  it('keeps JSON and CSV text files, including empty files and accents', async () => {
    const root = directoryEntry('demo', [
      fileEntry('data.json', '{}'),
      fileEntry('table.csv', 'nom;ville\r\nÉlodie;Poitiers\r\n'),
      fileEntry('empty.json', ''),
    ]);

    const result = await scanDirectory(root);

    expect(result.files.map((file) => file.path)).toEqual(['data.json', 'empty.json', 'table.csv']);
    expect(result.files.find((file) => file.path === 'table.csv')).toMatchObject({ lines: 3, content: 'nom;ville\r\nÉlodie;Poitiers\r\n' });
  });

  it('attaches redacted potential-secret metadata while preserving content', async () => {
    const root = directoryEntry('demo', [
      fileEntry('config.js', 'const apiKey = "long-real-looking-value";'),
    ]);

    const result = await scanDirectory(root);
    expect(result.files[0]).toMatchObject({
      path: 'config.js',
      content: 'const apiKey = "long-real-looking-value";',
      potentialSecrets: [{ kind: 'credential-assignment', line: 1 }],
    });
    expect(result.files[0].potentialSecrets[0]).not.toHaveProperty('value');
  });

  it('rejects a local scan above the global file cap before reading content', async () => {
    const entries = Array.from({ length: 1201 }, (_, index) => fileEntry(`file-${index}.js`, 'const value = 1;'));
    const root = directoryEntry('demo', entries);

    await expect(scanDirectory(root)).rejects.toThrow('Limite actuelle : 1200');
    expect(entries[0].getFile).toHaveBeenCalledTimes(1);
  });
});
