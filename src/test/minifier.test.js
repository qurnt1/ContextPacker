import { describe, expect, it } from 'vitest';
import { compactSource, minifyCode } from '../utils/minifier';

describe('compactSource', () => {
  it('compacts valid JSON and reports a smaller result', () => {
    const source = `{
  "project": "ContextPacker",
  "files": [
    "src/App.jsx",
    "src/store.js"
  ],
  "enabled": true
}`;

    const result = compactSource(source, '.JSON');

    expect(result).toEqual({
      content: '{"project":"ContextPacker","files":["src/App.jsx","src/store.js"],"enabled":true}',
      changed: true,
      format: 'json',
      supported: true,
      reason: null,
    });
    expect(result.content.length).toBeLessThan(source.length);
    expect(JSON.parse(result.content)).toEqual(JSON.parse(source));
  });

  it('preserves whitespace inside JSON strings', () => {
    const source = '{\n  "message": "  keep   these spaces  ",\n  "path": "src/My File.js"\n}\n';

    expect(compactSource(source, 'json').content)
      .toBe('{"message":"  keep   these spaces  ","path":"src/My File.js"}');
  });

  it('removes a BOM from valid JSON output', () => {
    const source = '\uFEFF{\n  "key": "value"\n}\n';
    const result = compactSource(source, 'json');

    expect(result.content).toBe('{"key":"value"}');
    expect(result.changed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('falls back exactly for unsupported formats', () => {
    const source = 'const message = "  keep spaces  ";\n';
    const result = compactSource(source, 'javascript');

    expect(result).toEqual({
      content: source,
      changed: false,
      format: 'javascript',
      supported: false,
      reason: 'unsupported-format',
    });
    expect(minifyCode(source, 'javascript')).toBe(source);
  });

  it('compacts JSX and keeps text inside strings intact', () => {
    const source = `function Card() {
  return <section className="card">  Keep this  </section>;
}`;

    const result = compactSource(source, 'tsx');

    expect(result.supported).toBe(true);
    expect(result.content).toBe('function Card(){\nreturn<section className="card">  Keep this  </section>;\n}');
  });

  it('falls back exactly for invalid JSON', () => {
    const source = '{\n  "key": value\n}\n';
    const result = compactSource(source, 'json');

    expect(result).toEqual({
      content: source,
      changed: false,
      format: 'json',
      supported: true,
      reason: 'invalid-json',
    });
  });
});
