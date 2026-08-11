import { describe, expect, it } from 'vitest';
import { generateMarkdownOutput } from '../utils/markdownFormatter';
import { generatePlainOutput } from '../utils/outputFormatter';
import { minifyCode } from '../utils/minifier';
import { getLanguageFromPath } from '../utils/languageMap';
import { getSecurityMetadata } from '../utils/securityPolicy';
import { createExportResult } from '../utils/exportUtils';
import { sanitizeFilename } from '../utils/helpers';

const tree = {
  name: 'demo',
  path: '',
  type: 'directory',
  children: [
    { name: 'selected.js', path: 'selected.js', type: 'file', selectable: true, blocked: false },
    { name: 'other.json', path: 'other.json', type: 'file', selectable: true, blocked: false },
    { name: '.env', path: '.env', type: 'file', selectable: false, blocked: true },
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
  minifiedContent: 'const selected = true;',
}];

describe('exported tree and content safety', () => {
  it('keeps filtered structure separate from selected content', () => {
    const filtered = generatePlainOutput('demo', selectedFiles, 2, false, tree, new Set(['selected.js']));
    const complete = generatePlainOutput('demo', selectedFiles, 2, false, tree, new Set(['selected.js']), true);

    expect(filtered).toContain('selected.js');
    expect(filtered).not.toContain('other.json');
    expect(complete).toContain('other.json');
    expect(complete).toContain('selected.js');
    expect(complete).not.toContain('const other');
    expect(complete).not.toContain('.env');
  });

  it('applies the same structure choice to Markdown', () => {
    const output = generateMarkdownOutput('demo', selectedFiles, 2, false, tree, new Set(['selected.js']), true);
    expect(output).toContain('other.json');
    expect(output).not.toContain('.env');
    expect(output).toContain('const selected = true;');
  });

  it('uses a smaller compact envelope without dropping source or tree semantics', () => {
    const regular = generatePlainOutput('demo', selectedFiles, 2, false, tree, new Set(['selected.js']), false);
    const compact = generatePlainOutput('demo', selectedFiles, 2, true, tree, new Set(['selected.js']), false);
    const compactFullTree = generatePlainOutput('demo', selectedFiles, 2, true, tree, new Set(['selected.js']), true);

    expect(compact).toContain('[CP]');
    expect(compact).toContain('const selected = true;');
    expect(compact).toContain('selected.js');
    expect(compact).not.toContain('other.json');
    expect(compactFullTree).toContain('other.json');
    expect(compactFullTree).not.toContain('const other');
    expect(compact.length).toBeLessThan(regular.length);
  });

  it('keeps the compact tree and content boundary in Markdown exports', () => {
    const output = generateMarkdownOutput('demo', selectedFiles, 2, true, tree, new Set(['selected.js']), true);

    expect(output).toContain('# CP: demo');
    expect(output).toContain('other.json');
    expect(output).not.toContain('.env');
    expect(output).toContain('const selected = true;');
    expect(output).toContain('*1L · 2t*');
  });

  it('does not export potential-secret nodes before confirmation', () => {
    const treeWithPotentialSecret = {
      ...tree,
      children: [
        ...tree.children,
        { name: 'config.js', path: 'config.js', type: 'file', selectable: true, blocked: false, potentialSecrets: [{ kind: 'credential-assignment', line: 1 }] },
      ],
    };
    const output = generatePlainOutput('demo', selectedFiles, 2, false, treeWithPotentialSecret, new Set(['selected.js']), true);
    const allowed = generatePlainOutput('demo', selectedFiles, 2, false, treeWithPotentialSecret, new Set(['selected.js', 'config.js']), true, true);

    expect(output).not.toContain('config.js');
    expect(allowed).toContain('config.js');
  });

  it('counts an export result once and sanitizes download names', async () => {
    const result = await createExportResult('hello');
    expect(result).toMatchObject({ output: 'hello' });
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(sanitizeFilename('demo:secret?.txt')).toBe('demo-secret-.txt');
  });
});

describe('security and language policy', () => {
  it('blocks secrets while allowing documented env examples', () => {
    expect(getSecurityMetadata('.env')).toMatchObject({ blocked: true, selectable: false });
    expect(getSecurityMetadata('.env.local')).toMatchObject({ blocked: true, selectable: false });
    expect(getSecurityMetadata('.env.example')).toMatchObject({ blocked: false, selectable: true });
    expect(getSecurityMetadata('credentials.json')).toMatchObject({ blocked: true, selectable: false });
    expect(getSecurityMetadata('cert.pem')).toMatchObject({ blocked: true, selectable: false });
    expect(getSecurityMetadata('cert.crt')).toMatchObject({ blocked: true, selectable: false });
    expect(getSecurityMetadata('.git', 'directory')).toMatchObject({ blocked: true, traversed: false });
    expect(getSecurityMetadata('.git/config')).toMatchObject({ blocked: true, selectable: false });
    expect(getSecurityMetadata('.aws/credentials')).toMatchObject({ blocked: true, selectable: false });
    expect(getSecurityMetadata('.venv', 'directory')).toMatchObject({ blocked: true, traversed: false });
  });

  it('maps JSONC to JSON and tabular files to readable plaintext', () => {
    expect(getLanguageFromPath('data.jsonc')).toBe('json');
    expect(getLanguageFromPath('data.csv')).toBe('plaintext');
    expect(getLanguageFromPath('data.tsv')).toBe('plaintext');
  });
});

describe('safe minification', () => {
  it('preserves every supported and unsupported format exactly', () => {
    const samples = [
      ['javascript', 'const value = `a\\n\\n b`;\n\n'],
      ['python', 'text = """line 1\\n\\nline 2"""\n'],
      ['yaml', 'key:  value  \n'],
      ['markdown', 'line  \n\nnext\n'],
      ['json', '{\n  "key": "value"\n}\n'],
      ['csv', 'a;b\r\nÉlodie;Poitiers\r\n'],
    ];
    for (const [extension, source] of samples) {
      if (extension === 'json') continue;
      expect(minifyCode(source, extension)).toBe(source);
    }

    expect(minifyCode('{\n  "key": "value"\n}\n', 'json')).toBe('{"key":"value"}');
    expect(minifyCode('{\n  "id": 9007199254740993,\n  "negativeZero": -0\n}\n', 'json'))
      .toBe('{"id":9007199254740993,"negativeZero":-0}');
    const invalidJson = '{\n  "key": value\n}\n';
    expect(minifyCode(invalidJson, '.json')).toBe(invalidJson);
  });
});
