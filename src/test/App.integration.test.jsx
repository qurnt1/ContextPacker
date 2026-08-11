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

describe('App modal entry points', () => {
  it('opens the onboarding guide from the welcome screen', async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('welcome-guide-button'));

    await waitFor(() => expect(screen.getByTestId('onboarding-dialog')).toBeVisible());
  });

  it('opens the keyboard shortcuts dialog from the project header', async () => {
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
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(useStore.getState().sidebarWidth).toBe(356);
    fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    expect(useStore.getState().sidebarWidth).toBe(340);
  });
});
