import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LinearTokenProgress from '../components/LinearTokenProgress';

describe('LinearTokenProgress', () => {
  it('uses the configured warning percentage instead of a hard-coded threshold', () => {
    const { getByRole } = render(
      <LinearTokenProgress current={50} limit={100} warningPercent={40} />
    );

    expect(getByRole('progressbar').firstElementChild).toHaveStyle({ background: 'var(--cp-warning, #f59e0b)' });
  });

  it('keeps the normal color below the configured warning percentage', () => {
    const { getByRole } = render(
      <LinearTokenProgress current={30} limit={100} warningPercent={40} />
    );

    expect(getByRole('progressbar').firstElementChild).toHaveStyle({ background: 'var(--cp-accent, #22c55e)' });
  });
});
