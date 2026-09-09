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
    expect(changesSection.querySelector('[tabindex="0"]')).toHaveClass('max-h-[166px]', 'overflow-y-auto');
    await waitFor(() => expect(useStore.getState().handleRefresh).toHaveBeenCalledOnce());
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
