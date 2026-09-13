import { describe, expect, it } from 'vitest';
import { createRefreshSummary } from '../utils/refreshDiff';
import { buildTreeFromFiles } from '../utils/treeUtils';

function file(path, content, lastModified, extra = {}) {
  return {
    path,
    content,
    lastModified,
    selectable: true,
    blocked: false,
    ...extra,
  };
}

describe('createRefreshSummary', () => {
  it('reports line additions and removals for added, removed, and modified files', () => {
    const previous = [
      file('modified.js', 'before\nkeep\n', 1_000),
      file('removed.js', 'remove me\n', 1_100),
      file('unchanged.js', 'same\n', 1_200),
    ];
    const current = [
      file('modified.js', 'after\nkeep\nnew line\n', 2_000),
      file('added.js', 'one\ntwo\nthree\n', 2_500),
      file('unchanged.js', 'same\n', 2_600),
    ];

    const summary = createRefreshSummary(previous, current);

    expect(summary).toMatchObject({
      totalChanged: 3,
      addedFileCount: 1,
      modifiedFileCount: 1,
      removedFileCount: 1,
      totalAddedLines: 5,
      totalRemovedLines: 2,
      latestModifiedAt: 2_600,
    });
    expect(summary.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'added.js', kind: 'added', addedLines: 3, removedLines: 0 }),
      expect.objectContaining({ path: 'modified.js', kind: 'modified', addedLines: 2, removedLines: 1 }),
      expect.objectContaining({ path: 'removed.js', kind: 'removed', addedLines: 0, removedLines: 1 }),
    ]));
  });

  it('returns every sorted change and ignores excluded files', () => {
    const previous = [
      file('.git/config', 'do not include\n', 1, { selectable: false, blocked: true }),
      ...Array.from({ length: 6 }, (_, index) => file(`old-${index}.js`, 'old\n', index + 2)),
    ];
    const current = [
      file('.git/config', 'still excluded\n', 20, { selectable: false, blocked: true }),
      ...Array.from({ length: 6 }, (_, index) => file(`old-${index}.js`, `${'line\n'.repeat(index + 1)}`, index + 30)),
    ];

    const summary = createRefreshSummary(previous, current);

    expect(summary.totalChanged).toBe(6);
    expect(summary.changes).toHaveLength(6);
    expect(summary.changes.map((change) => change.path)).not.toContain('.git/config');
    expect(summary.changes[0]).toMatchObject({ path: 'old-5.js', changedLines: 7 });
    expect(summary.changes.at(-1)).toMatchObject({ path: 'old-0.js', changedLines: 2 });
  });

  it('builds a copyable diff with the complete current tree', () => {
    const previous = [
      file('src/modified.js', 'before\n', 1),
      file('src/removed.js', 'removed\n', 2),
    ];
    const current = [
      file('src/modified.js', 'after\n', 3),
      file('src/added.js', 'added\n', 4),
      file('docs/guide.md', 'unchanged\n', 5),
      file('.env.local', 'SECRET=hidden\n', 6),
    ];
    const currentTree = buildTreeFromFiles('demo', current);

    const summary = createRefreshSummary(previous, current, currentTree);
    const [treeSection, patchSection] = summary.diffText.split('[DIFF DES FICHIERS]');

    expect(treeSection).toContain('[ARBORESCENCE COMPLÈTE]');
    expect(treeSection).toContain('demo/');
    expect(treeSection).toContain('guide.md');
    expect(treeSection).not.toContain('.env.local');
    expect(patchSection).toContain('--- a/src/modified.js');
    expect(patchSection).toContain('+++ b/src/modified.js');
    expect(patchSection).toContain('--- /dev/null');
    expect(patchSection).toContain('+++ b/src/added.js');
    expect(patchSection).toContain('--- a/src/removed.js');
    expect(patchSection).toContain('+++ /dev/null');
    expect(summary.diffText).not.toContain('SECRET=hidden');
  });

  it('groups complete directory changes and keeps root files visible', () => {
    const previous = [
      file('website/src/App.jsx', 'old\n', 1),
      file('website/package.json', 'old\n', 2),
      file('tests/test_core.py', 'old\n', 3),
      file('tests/test_ui.py', 'old\n', 4),
      file('package-lock.json', 'old\n', 5),
    ];

    const summary = createRefreshSummary(previous, []);

    expect(summary.changeGroups.map(({ type, path, kind, fileCount }) => ({ type, path, kind, fileCount }))).toEqual([
      { type: 'file', path: 'package-lock.json', kind: 'removed', fileCount: 1 },
      { type: 'directory', path: 'tests', kind: 'removed', fileCount: 2 },
      { type: 'directory', path: 'website', kind: 'removed', fileCount: 2 },
    ]);
    expect(summary.changeGroups.find((group) => group.path === 'tests').changes.map((change) => change.path)).toEqual([
      'tests/test_core.py',
      'tests/test_ui.py',
    ]);
  });

  it('does not collapse a directory when one of its files survives', () => {
    const summary = createRefreshSummary(
      [file('src/removed.js', 'old\n', 1), file('src/kept.js', 'same\n', 2)],
      [file('src/kept.js', 'same\n', 3)]
    );

    expect(summary.changeGroups.every((group) => group.type === 'file')).toBe(true);
    expect(summary.changeGroups.map((group) => group.path)).toEqual(['src/removed.js']);
  });

  it('does not report a diff when only modification metadata changes', () => {
    const summary = createRefreshSummary(
      [file('same.js', 'const same = true;\n', 1_000)],
      [file('same.js', 'const same = true;\n', 2_000)]
    );

    expect(summary).toMatchObject({ totalChanged: 0, latestModifiedAt: 2_000, changes: [] });
  });
});
