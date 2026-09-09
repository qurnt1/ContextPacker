import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LinearTokenProgress, { ScanProgress } from '../components/LinearTokenProgress';

describe('LinearTokenProgress', () => {
  it('uses the configured warning percentage instead of a hard-coded threshold', () => {
    const { getByRole } = render(
      <LinearTokenProgress current={50} limit={100} warningPercent={40} />
    );

    expect(getByRole('progressbar').firstElementChild).toHaveStyle({ backgroundColor: 'var(--cp-warning)' });
  });

  it('keeps the normal color below the configured warning percentage', () => {
    const { getByRole } = render(
      <LinearTokenProgress current={30} limit={100} warningPercent={40} />
    );

    expect(getByRole('progressbar').firstElementChild).toHaveStyle({ backgroundColor: 'var(--cp-accent)' });
  });

  it('shows finalisation as completed when the scan reaches the total', () => {
    const { getByText } = render(
      <ScanProgress count={2} total={2} currentFile="index.js" />
    );

    expect(getByText('Finalisation').parentElement).toHaveClass('scan-step-done');
  });
});
