import { describe, expect, it } from 'vitest';
import { generateMarkdownOutput } from '../utils/markdownFormatter';
import { generatePlainOutput } from '../utils/outputFormatter';
import { compactSource } from '../utils/minifier';
import { getLanguageFromPath } from '../utils/languageMap';
import { isSelectableFile } from '../utils/filePolicy';
import { createExportResult } from '../utils/exportUtils';
import { sanitizeFilename } from '../utils/helpers';

const tree = {
  name: 'demo',
  path: '',
  type: 'directory',
  children: [
    { name: 'selected.js', path: 'selected.js', type: 'file', selectable: true, blocked: false },
    { name: 'other.json', path: 'other.json', type: 'file', selectable: true, blocked: false },
    { name: '.git', path: '.git', type: 'directory', selectable: false, blocked: true },
  ],
};

const selectedFiles = [{
  name: 'selected.js',
  path: 'selected.js',
  extension: '.js',
  size: 10,
  lines: 1,
  tokens: 2,
  minifiedTokens: 2,
  content: 'const selected = true;',
  minifiedContent: 'const selected=true;',
}];

describe('ContextPacker export rules', () => {
  it('keeps filtered structure separate from selected content', () => {
    const filtered = generatePlainOutput('demo', selectedFiles, 2, false, tree, new Set(['selected.js']));
    const complete = generatePlainOutput('demo', selectedFiles, 2, false, tree, new Set(['selected.js']), true);
    expect(filtered).toContain('selected.js');
    expect(filtered).not.toContain('other.json');
    expect(complete).toContain('other.json');
    expect(complete).not.toContain('.git');
  });

  it('applies the same tree choice to Markdown', () => {
    const output = generateMarkdownOutput('demo', selectedFiles, 2, false, tree, new Set(['selected.js']), true);
    expect(output).toContain('other.json');
    expect(output).not.toContain('.git');
    expect(output).toContain('const selected = true;');
  });

  it('uses a compact envelope without dropping tree semantics', () => {
    const regular = generatePlainOutput('demo', selectedFiles, 2, false, tree, new Set(['selected.js']));
    const compact = generatePlainOutput('demo', selectedFiles, 2, true, tree, new Set(['selected.js']));
    expect(compact).toContain('[ContextPacker]');
    expect(compact).toContain('selected.js');
    expect(compact).not.toContain('other.json');
    expect(compact).not.toContain('\n\n[F]');
    expect(compact.length).toBeLessThan(regular.length);
  });

  it('keeps the compact Markdown boundary valid', () => {
    const output = generateMarkdownOutput('demo', selectedFiles, 2, true, tree, new Set(['selected.js']), true);
    expect(output).toContain('# ContextPacker: demo');
    expect(output).toContain('other.json');
    expect(output).not.toContain('.git');
    expect(output).toContain('const selected=true;');
  });

  it('uses one admissibility rule for technical exclusions', () => {
    expect(isSelectableFile({ selectable: true, blocked: false })).toBe(true);
    expect(isSelectableFile({ selectable: false, blocked: true })).toBe(false);
    expect(isSelectableFile({ selectable: true, blocked: true })).toBe(false);
  });

  it('counts an export result once and sanitizes download names', async () => {
    const result = await createExportResult('hello');
    expect(result).toMatchObject({ output: 'hello' });
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(sanitizeFilename('demo:source?.txt')).toBe('demo-source-.txt');
  });
});

describe('format and language support', () => {
  it('preserves JSON values while removing structural whitespace', () => {
    const result = compactSource('{\n  "message": "  keep   spaces  ",\n  "id": 9007199254740993\n}', 'json');
    expect(result.content).toBe('{"message":"  keep   spaces  ","id":9007199254740993}');
    expect(JSON.parse(result.content)).toEqual(JSON.parse('{"message":"  keep   spaces  ","id":9007199254740993}'));
  });

  it('compacts JavaScript without touching strings or regex literals', () => {
    const source = 'const message = "  keep spaces  ";\nconst match = /a b/; // comment\n';
    const result = compactSource(source, '.js');
    expect(result.content).toBe('const message="  keep spaces  ";\nconst match=/a b/;');
    expect(result.content.length).toBeLessThan(source.length);
  });

  it('falls back for invalid JSON and unsupported formats', () => {
    const invalid = '{\n  "key": value\n}\n';
    expect(compactSource(invalid, 'json').content).toBe(invalid);
    expect(compactSource('line  \n\nnext\n', 'markdown').supported).toBe(false);
  });

  it('maps JSONC and tabular files', () => {
    expect(getLanguageFromPath('data.jsonc')).toBe('json');
    expect(getLanguageFromPath('data.csv')).toBe('plaintext');
    expect(getLanguageFromPath('data.tsv')).toBe('plaintext');
  });
});
