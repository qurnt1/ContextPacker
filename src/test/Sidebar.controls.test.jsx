import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';

afterEach(cleanup);

const tree = {
  name: 'demo',
  path: '',
  type: 'directory',
  children: [
    {
      name: 'index.js',
      path: 'index.js',
      type: 'file',
      extension: '.js',
      size: 1,
      lines: 1,
      tokens: 1,
      minifiedTokens: 1,
      selectable: true,
      blocked: false,
    },
  ],
};

beforeEach(() => {
  useStore.setState({
    projectName: 'demo',
    tree,
    files: [{ ...tree.children[0], content: 'const demo = true;', minifiedContent: 'const demo = true;' }],
    selectedPaths: new Set(),
    minifyEnabled: false,
    gitignoreEnabled: true,
    includeFullTreeInExport: false,
    sidebarCollapsed: false,
    isScanning: false,
  });
});

describe('Sidebar controls', () => {
  it('starts with full-tree export enabled on a fresh store state and still allows manual toggling', () => {
    useStore.setState(useStore.getInitialState(), true);
    render(<Sidebar />);

    const checkbox = screen.getByRole('checkbox', { name: /Arborescence complète/i });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('uses clear labels and exposes toggle states', () => {
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: /Formatage compact/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('checkbox', { name: /Arborescence complète/i })).not.toBeChecked();
  });

  it('uses the shared active style for the full-tree export toggle', () => {
    render(<Sidebar />);

    const checkbox = screen.getByRole('checkbox', { name: /Arborescence complète/i });
    const control = checkbox.closest('label');

    expect(control).toHaveClass('bg-cyber-surface-2');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(control).toHaveClass('bg-cyber-accent/10');
  });

  it('keeps potential secrets disabled until explicit confirmation', () => {
    const secretFile = {
      name: 'config.js',
      path: 'config.js',
      type: 'file',
      extension: '.js',
      size: 1,
      lines: 1,
      tokens: 1,
      minifiedTokens: 1,
      selectable: true,
      blocked: false,
      potentialSecrets: [{ kind: 'credential-assignment', line: 1 }],
    };
    useStore.setState({
      tree: { ...tree, children: [secretFile] },
      files: [{ ...secretFile, content: 'const apiKey = "value";', minifiedContent: 'const apiKey = "value";' }],
      selectedPaths: new Set(),
      potentialSecretsAllowed: false,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Sidebar />);

    const secretCheckbox = screen.getByRole('button', { name: /secret potentiel, confirmation requise/i });
    expect(secretCheckbox).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Autoriser après confirmation/i }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Sélectionner config\.js/i })).toBeEnabled();
    confirmSpy.mockRestore();
  });
});
