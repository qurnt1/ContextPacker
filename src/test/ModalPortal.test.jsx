import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ModalPortal from '../components/ModalPortal';

function Harness({ onClose }) {
  const restoreFocusRef = useRef(null);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <button ref={restoreFocusRef}>Trigger</button>
      <ModalPortal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setIsOpen(false);
        }}
        restoreFocusRef={restoreFocusRef}
      >
        {isOpen ? (
          <div role="dialog" aria-label="Test modal">
            <button>First</button>
            <button>Last</button>
          </div>
        ) : null}
      </ModalPortal>
    </>
  );
}

describe('ModalPortal', () => {
  it('focuses, traps Tab, closes on Escape and restores focus', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    await waitFor(() => expect(first).toHaveFocus());

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Trigger' })).toHaveFocus());
  });
});
