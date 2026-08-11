import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../components/Dashboard';
import { useStore } from '../store';

vi.mock('../components/ExportMenu', () => ({
  default: () => <button type="button">Exporter</button>,
}));

afterEach(cleanup);

describe('Dashboard threshold and layout', () => {
  beforeEach(() => {
    useStore.setState({
      tokenLimit: 100,
      warningPercent: 40,
      customThreshold: 0,
      projectName: 'demo',
      files: [{ path: 'index.js', size: 1, lines: 1, tokens: 50, minifiedTokens: 50 }],
      selectedPaths: new Set(['index.js']),
      minifyEnabled: false,
      tree: { name: 'demo', path: '', type: 'directory', children: [] },
      includeFullTreeInExport: false,
    });
  });

  it('shows the warning state at the configured percentage', () => {
    render(<Dashboard />);

    expect(screen.getByText('50%')).toHaveClass('text-amber-400');
    expect(screen.queryByText('OVERFLOW')).not.toBeInTheDocument();
  });

  it('uses a three-column grid so the progress group is centered independently', () => {
    const { container } = render(<Dashboard />);
    expect(container.firstElementChild).toHaveClass('grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]');
    expect(container.firstElementChild.querySelector('.max-w-lg')).toHaveClass('justify-self-center');
  });
});
