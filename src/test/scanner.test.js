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
    values: async function* values() {
      yield* entries;
    },
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

    expect(result.files.map((file) => file.path)).toEqual(['src/App.jsx', 'index.js']);
    expect(progress[0]).toEqual([0, 2]);
    expect(progress.at(-1)).toEqual([2, 2]);
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
});
