import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../components/Header';
import { useStore } from '../store';

describe('Header refresh summary', () => {
  beforeEach(() => {
    useStore.setState({
      isScanning: false,
      handleOpenLocal: vi.fn(),
      handleRefresh: vi.fn().mockResolvedValue({
        ok: true,
        refreshSummary: {
          totalChanged: 6,
          addedFileCount: 2,
          modifiedFileCount: 3,
          removedFileCount: 1,
          totalAddedLines: 17,
          totalRemovedLines: 6,
          latestModifiedAt: 1_725_000_000_000,
          changes: [
            { path: 'src/app.js', kind: 'modified', addedLines: 4, removedLines: 2, changedLines: 6 },
            { path: 'src/new.js', kind: 'added', addedLines: 3, removedLines: 0, changedLines: 3 },
            { path: 'src/config.js', kind: 'modified', addedLines: 3, removedLines: 1, changedLines: 4 },
            { path: 'src/removed.js', kind: 'removed', addedLines: 0, removedLines: 3, changedLines: 3 },
            { path: 'src/hooks/useContext.js', kind: 'modified', addedLines: 5, removedLines: 0, changedLines: 5 },
            { path: 'src/last-change.js', kind: 'added', addedLines: 2, removedLines: 0, changedLines: 2 },
          ],
        },
      }),
    });
  });

  afterEach(() => {
    useStore.setState(useStore.getInitialState(), true);
  });

  it('shows every line diff in a scrollable list after a local refresh', async () => {
    render(<Header onShowHelp={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Actualiser/i }));
    });

    const dialog = await screen.findByRole('dialog', { name: /Actualisation terminée/i });
    expect(dialog).toHaveTextContent('Dernier fichier modifié');
    expect(dialog).toHaveTextContent('src/app.js');
    expect(dialog).toHaveTextContent('src/last-change.js');
    expect(dialog).toHaveTextContent('+4');
    expect(dialog).toHaveTextContent('−2');
    expect(dialog).toHaveTextContent('Diff total');
    expect(dialog).toHaveTextContent('+17 lignes');
    expect(dialog).toHaveTextContent('−6 lignes');
    const changesSection = screen.getByRole('region', { name: 'Toutes les différences' });
    expect(changesSection.querySelector('[tabindex="0"]')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    await waitFor(() => expect(useStore.getState().handleRefresh).toHaveBeenCalledOnce());
  });

  it('collapses complete deleted folders and expands their file details', async () => {
    useStore.setState({
      handleRefresh: vi.fn().mockResolvedValue({
        ok: true,
        refreshSummary: {
          totalChanged: 3,
          addedFileCount: 0,
          modifiedFileCount: 0,
          removedFileCount: 3,
          totalAddedLines: 0,
          totalRemovedLines: 6,
          changes: [
            { path: 'website/src/app.js', kind: 'removed', addedLines: 0, removedLines: 2, changedLines: 2 },
            { path: 'website/src/styles.css', kind: 'removed', addedLines: 0, removedLines: 3, changedLines: 3 },
            { path: 'README.md', kind: 'removed', addedLines: 0, removedLines: 1, changedLines: 1 },
          ],
          changeGroups: [
            {
              type: 'directory',
              path: 'website',
              kind: 'removed',
              fileCount: 2,
              addedLines: 0,
              removedLines: 5,
              changedLines: 5,
              changes: [
                { path: 'website/src/app.js', kind: 'removed', addedLines: 0, removedLines: 2, changedLines: 2 },
                { path: 'website/src/styles.css', kind: 'removed', addedLines: 0, removedLines: 3, changedLines: 3 },
              ],
            },
            {
              type: 'file',
              path: 'README.md',
              kind: 'removed',
              fileCount: 1,
              addedLines: 0,
              removedLines: 1,
              changedLines: 1,
              changes: [{ path: 'README.md', kind: 'removed', addedLines: 0, removedLines: 1, changedLines: 1 }],
            },
          ],
        },
      }),
    });
    render(<Header onShowHelp={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Actualiser/i }));
    });

    const folderButton = screen.getByRole('button', { name: 'Déplier le dossier website' });
    expect(folderButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('website/src/app.js')).not.toBeInTheDocument();

    fireEvent.click(folderButton);
    expect(folderButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('website/src/app.js')).toBeInTheDocument();
  });

  it('filters the changes by status and path', async () => {
    useStore.setState({
      handleRefresh: vi.fn().mockResolvedValue({
        ok: true,
        refreshSummary: {
          totalChanged: 3,
          addedFileCount: 1,
          modifiedFileCount: 1,
          removedFileCount: 1,
          totalAddedLines: 2,
          totalRemovedLines: 1,
          changes: [
            { path: 'src/new.js', kind: 'added', addedLines: 2, removedLines: 0, changedLines: 2 },
            { path: 'src/app.js', kind: 'modified', addedLines: 1, removedLines: 1, changedLines: 2 },
            { path: 'src/old.js', kind: 'removed', addedLines: 0, removedLines: 1, changedLines: 1 },
          ],
        },
      }),
    });
    render(<Header onShowHelp={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Actualiser/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Supprimés 1' }));
    expect(screen.getByText('src/old.js')).toBeInTheDocument();
    expect(screen.queryByText('src/new.js')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher dans les différences' }), { target: { value: 'app.js' } });
    expect(screen.getByText('Aucune différence pour ce filtre.')).toBeInTheDocument();
  });

  it('shows an error when opening a local folder fails', async () => {
    useStore.setState({
      handleOpenLocal: vi.fn().mockResolvedValue({
        ok: false,
        aborted: false,
        error: new Error('Sélecteur de dossier indisponible.'),
      }),
    });
    render(<Header onShowHelp={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Ouvrir local/i }));
    });

    await waitFor(() => expect(screen.getByText('Sélecteur de dossier indisponible.')).toBeVisible());
  });
});
