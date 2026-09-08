import { describe, expect, it } from 'vitest';
import { createRefreshSummary } from '../utils/refreshDiff';

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

  it('does not report a diff when only modification metadata changes', () => {
    const summary = createRefreshSummary(
      [file('same.js', 'const same = true;\n', 1_000)],
      [file('same.js', 'const same = true;\n', 2_000)]
    );

    expect(summary).toMatchObject({ totalChanged: 0, latestModifiedAt: 2_000, changes: [] });
  });
});
