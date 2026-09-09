import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { useStore } from '../store';

afterEach(cleanup);

const emptyTree = { name: 'demo', path: '', type: 'directory', children: [] };

beforeEach(() => {
  useStore.setState({
    projectLoaded: false,
    projectName: '',
    files: [],
    tree: null,
    sourceMeta: null,
    selectedPaths: new Set(),
    isScanning: false,
    onboardingDone: true,
  });
});

describe('ContextPacker app entry points', () => {
  it('renders the local-only welcome screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'ContextPacker', exact: true })).toBeVisible();
    expect(screen.getByText(/L.ouverture de dossiers n.est pas disponible/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Projet/i })).not.toBeInTheDocument();
  });

  it('opens the onboarding guide from the welcome screen', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('welcome-guide-button'));
    await waitFor(() => expect(screen.getByTestId('onboarding-dialog')).toBeVisible());
    expect(screen.getByText(/Bienvenue dans ContextPacker/i)).toBeVisible();
  });

  it('opens keyboard help from the project header', async () => {
    useStore.setState({
      projectLoaded: true,
      projectName: 'demo',
      files: [{ path: 'index.js', size: 1, tokens: 1, minifiedTokens: 1, lines: 1 }],
      tree: emptyTree,
      sourceMeta: { type: 'local', projectId: 'test-project' },
      selectedPaths: new Set(),
    });
    render(<App />);
    fireEvent.click(screen.getByTestId('shortcut-help-button'));
    await waitFor(() => expect(screen.getByTestId('shortcut-dialog')).toBeVisible());
  });

  it('resizes the sidebar with the keyboard separator', () => {
    useStore.setState({
      projectLoaded: true,
      projectName: 'demo',
      files: [{ path: 'index.js', size: 1, tokens: 1, minifiedTokens: 1, lines: 1 }],
      tree: emptyTree,
      sourceMeta: { type: 'local', projectId: 'test-project' },
      selectedPaths: new Set(),
      sidebarWidth: 340,
    });
    render(<App />);
    const separator = screen.getByRole('separator');
    expect(separator).toHaveClass('w-0');
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(useStore.getState().sidebarWidth).toBe(356);
    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    expect(useStore.getState().sidebarWidth).toBe(340);
  });
});
