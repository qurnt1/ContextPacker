import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { copyToClipboard, generatePlainOutput, countTokens } = vi.hoisted(() => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
  generatePlainOutput: vi.fn(() => 'generated context'),
  countTokens: vi.fn(() => 3),
}));

vi.mock('../utils/clipboard', () => ({ copyToClipboard }));
vi.mock('../utils/outputFormatter', () => ({ generatePlainOutput }));
vi.mock('../utils/tokenCounter', () => ({ countTokens }));

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

  it('copies the context before navigating to an AI destination', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ closed: false });
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
    expect(open).toHaveBeenCalledWith('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('generated context'));
  });

  it('reports a copy failure after attempting the AI handoff', async () => {
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
    expect(open).toHaveBeenCalledWith('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
  });
});
