import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '../utils/clipboard';

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // jsdom does not have execCommand, polyfill it
    if (!document.execCommand) {
      document.execCommand = vi.fn();
    }
  });

  it('returns true on successful clipboard API copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText, write: vi.fn() },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('hello');
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when clipboard API fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText, write: vi.fn() },
      writable: true,
      configurable: true,
    });

    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await copyToClipboard('fallback test');
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('falls back to execCommand when clipboard API is absent', async () => {
    const orig = navigator.clipboard;
    delete navigator.clipboard;

    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await copyToClipboard('no-clipboard-api');
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');

    navigator.clipboard = orig;
  });

  it('returns false for empty text', async () => {
    const result = await copyToClipboard('');
    expect(result).toBe(false);
  });

  it('returns false when all methods fail', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(false);

    const result = await copyToClipboard('will-fail');
    expect(result).toBe(false);
  });
});
