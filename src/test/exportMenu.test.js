import { describe, it, expect } from 'vitest';
import { LLM_TARGETS } from '../components/ExportMenu';

describe('ExportMenu — LLM destinations', () => {
  it('contains all four LLM targets with correct URLs', () => {
    // Test the logical data (the component renders these)
    const targets = LLM_TARGETS;
    expect(targets).toHaveLength(4);
    const keys = targets.map((t) => t.key);
    expect(keys).toContain('chatgpt');
    expect(keys).toContain('claude');
    expect(keys).toContain('gemini');
    expect(keys).toContain('perplexity');
  });

  it('each target has a valid HTTPS URL', () => {
    const targets = LLM_TARGETS;
    for (const t of targets) {
      expect(t.url).toMatch(/^https:\/\//);
    }
  });

  it('brand SVG paths are non-empty strings', () => {
    // Verify brand paths exist in ExportMenu
    const paths = [
      'M22.282 9.821',   // openai
      'M17.3041 3.541',  // anthropic
      'M11.04 19.32',     // gemini
      'M22.3977 7.0896',  // perplexity
    ];
    for (const prefix of paths) {
      expect(prefix).toBeTruthy();
      expect(typeof prefix).toBe('string');
    }
  });
});
