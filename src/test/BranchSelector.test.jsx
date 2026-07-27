import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BranchSelector from '../components/BranchSelector';

const branches = [
  { name: 'main', isDefault: true, protected: false, updatedAt: '2025-01-01T00:00:00Z' },
  { name: 'feature/v4', isDefault: false, protected: false, updatedAt: '2024-12-01T00:00:00Z' },
];

function renderSelector(overrides = {}) {
  return render(
    <BranchSelector
      branches={branches}
      defaultBranch="main"
      selectedBranch=""
      onChange={vi.fn()}
      loading={false}
      error=""
      {...overrides}
    />
  );
}

describe('BranchSelector', () => {
  it('selects a branch with ArrowDown and Enter', () => {
    const onChange = vi.fn();
    renderSelector({ onChange });

    fireEvent.click(screen.getByRole('button', { name: /branche/i }));
    const search = screen.getByPlaceholderText(/filtrer les branches/i);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('main');
  });

  it('selects the highlighted branch after filtering', () => {
    const onChange = vi.fn();
    renderSelector({ onChange });

    fireEvent.click(screen.getByRole('button', { name: /branche/i }));
    const search = screen.getByPlaceholderText(/filtrer les branches/i);
    fireEvent.change(search, { target: { value: 'feature' } });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('feature/v4');
  });
});
