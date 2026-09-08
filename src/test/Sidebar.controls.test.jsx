import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';

afterEach(cleanup);

const file = {
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
};
const tree = { name: 'demo', path: '', type: 'directory', children: [file] };

beforeEach(() => {
  useStore.setState({
    projectName: 'demo',
    tree,
    files: [{ ...file, content: 'const demo = true;', minifiedContent: 'const demo=true;' }],
    selectedPaths: new Set(),
    minifyEnabled: false,
    gitignoreEnabled: true,
    includeFullTreeInExport: false,
    sidebarCollapsed: false,
    isScanning: false,
  });
});

describe('Sidebar controls', () => {
  it('exposes compact formatting and filter states', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /Formatage compact/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /D.sactiver \.gitignore/i })).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('checkbox', { name: /Arborescence compl.te/i })).not.toBeChecked();
  });

  it('toggles compact formatting', () => {
    render(<Sidebar />);
    const toggle = screen.getByRole('button', { name: /Formatage compact/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(useStore.getState().minifyEnabled).toBe(true);
  });

  it('disables the gitignore action while scanning', () => {
    useStore.setState({ isScanning: true });
    render(<Sidebar />);
    const toggle = screen.getByRole('button', { name: /Actualisation du projet en cours/i });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-busy', 'true');
  });

  it('keeps technical exclusions unavailable in the tree', () => {
    const excluded = { ...file, name: '.git', path: '.git', selectable: false, blocked: true };
    useStore.setState({ tree: { ...tree, children: [excluded] }, files: [excluded] });
    render(<Sidebar />);
    const excludedButton = screen.getByRole('button', { name: /exclu et non s.lectionnable/i });
    expect(excludedButton).toBeDisabled();
  });
});
