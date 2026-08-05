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

  it('counts an export result once and sanitizes download names', () => {
    const result = createExportResult('hello');
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
      expect(minifyCode(source, extension)).toBe(source);
    }
  });
});
