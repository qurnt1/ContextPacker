import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { copyToClipboard, generatePlainOutput, countTokens, initEncoding } = vi.hoisted(() => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
  generatePlainOutput: vi.fn(() => 'generated context'),
  countTokens: vi.fn(() => 3),
  initEncoding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/clipboard', () => ({ copyToClipboard }));
vi.mock('../utils/outputFormatter', () => ({ generatePlainOutput }));
vi.mock('../utils/tokenCounter', () => ({ countTokens, initEncoding }));

import ExportMenu from '../components/ExportMenu';

const selectedFiles = [{
  path: 'src/index.js',
  size: 10,
  tokens: 2,
  minifiedTokens: 2,
  content: 'export default 1;',
  minifiedContent: 'export default 1;',
}];

describe('ExportMenu behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    copyToClipboard.mockClear();
    generatePlainOutput.mockClear();
    countTokens.mockClear();
  });

  it('generates output only when an export action is clicked', async () => {
    render(
      <ExportMenu
        projectName="demo"
        selectedFiles={selectedFiles}
        tree={{ name: 'demo', children: [] }}
        selectedPaths={new Set(['src/index.js'])}
        minifyEnabled={false}
        contentTokens={2}
        tokenLimit={128}
        disabled={false}
      />
    );

    expect(generatePlainOutput).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle(/exporter/i));
    fireEvent.click(screen.getByRole('menuitem', { name: /copier le contexte/i }));

    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('generated context'));
    expect(generatePlainOutput).toHaveBeenCalledTimes(1);
    expect(countTokens).toHaveBeenCalledWith('generated context');
  });

  it('asks for confirmation when the final export exceeds the token limit', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <ExportMenu
        projectName="demo"
        selectedFiles={selectedFiles}
        tree={{ name: 'demo', children: [] }}
        selectedPaths={new Set(['src/index.js'])}
        minifyEnabled={false}
        contentTokens={2}
        tokenLimit={2}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByTitle(/exporter/i));
    fireEvent.click(screen.getByRole('menuitem', { name: /copier le contexte/i }));

    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(copyToClipboard).not.toHaveBeenCalled();
  });

  it('opens an AI destination only after the context is copied', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ closed: false });
    const nativeSetTimeout = globalThis.setTimeout;
    let completeHandoff;
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay, ...args) => {
      if (delay === 900) {
        completeHandoff = () => callback(...args);
        return 0;
      }
      return nativeSetTimeout(callback, delay, ...args);
    });
    let resolveCopy;
    copyToClipboard.mockImplementationOnce(() => new Promise((resolve) => {
      resolveCopy = resolve;
    }));
    render(
      <ExportMenu
        projectName="demo"
        selectedFiles={selectedFiles}
        tree={{ name: 'demo', children: [] }}
        selectedPaths={new Set(['src/index.js'])}
        minifyEnabled={false}
        contentTokens={2}
        tokenLimit={128}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByTitle(/exporter/i));
    const chatgpt = screen.getByRole('menuitem', { name: /ChatGPT/i });
    expect(chatgpt).toBeEnabled();

    fireEvent.click(chatgpt);
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('generated context'));
    expect(open).not.toHaveBeenCalled();

    await act(async () => {
      resolveCopy(true);
    });

    expect(screen.getByText(/Contexte copié/i)).toBeInTheDocument();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 900);
    expect(open).not.toHaveBeenCalled();

    await act(async () => {
      completeHandoff();
    });

    await waitFor(() => expect(open).toHaveBeenCalledWith('https://chatgpt.com/', '_blank', 'noopener,noreferrer'));
  });

  it('does not open an AI destination when copying fails', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ closed: false });
    copyToClipboard.mockResolvedValueOnce(false);

    render(
      <ExportMenu
        projectName="demo"
        selectedFiles={selectedFiles}
        tree={{ name: 'demo', children: [] }}
        selectedPaths={new Set(['src/index.js'])}
        minifyEnabled={false}
        contentTokens={2}
        tokenLimit={128}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByTitle(/exporter/i));
    fireEvent.click(screen.getByRole('menuitem', { name: /ChatGPT/i }));

    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('generated context'));
    expect(open).not.toHaveBeenCalled();
  });
});
