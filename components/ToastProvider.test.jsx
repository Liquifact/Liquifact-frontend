import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ToastProvider, useToast } from './ToastProvider';

function ToastButtons() {
  const toast = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast.success('Saved invoice')}>
        Success toast
      </button>
      <button type="button" onClick={() => toast.error('Upload failed')}>
        Error toast
      </button>
      <button type="button" onClick={() => toast.info('Sync is running')}>
        Info toast
      </button>
      <button
        type="button"
        onClick={() => toast.info('Custom message', 'Custom title')}
      >
        Custom toast
      </button>
    </div>
  );
}

function UnwrappedToastConsumer() {
  useToast();
  return null;
}

function renderToastProvider() {
  return render(
    <ToastProvider>
      <ToastButtons />
    </ToastProvider>,
  );
}

function getToastCard(message) {
  const messageNode = screen.getByText(message);
  const contentColumn = messageNode.closest('div');
  const cardContent = contentColumn?.parentElement;
  const card = cardContent?.parentElement;

  if (!card) {
    throw new Error(`Unable to find toast card for ${message}`);
  }

  return card;
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('enqueues success, error, and info toasts with default titles and variant styles', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderToastProvider();

    await user.click(screen.getByRole('button', { name: /success toast/i }));
    await user.click(screen.getByRole('button', { name: /error toast/i }));
    await user.click(screen.getByRole('button', { name: /info toast/i }));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Saved invoice')).toBeInTheDocument();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByText('Sync is running')).toBeInTheDocument();

    expect(getToastCard('Saved invoice')).toHaveClass('border-emerald-500/30');
    expect(getToastCard('Upload failed')).toHaveClass('border-red-500/30');
    expect(getToastCard('Sync is running')).toHaveClass('border-cyan-500/20');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('uses custom titles when supplied', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderToastProvider();

    await user.click(screen.getByRole('button', { name: /custom toast/i }));

    expect(screen.getByText('Custom title')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });

  it('auto-dismisses toasts after the timer expires', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderToastProvider();

    await user.click(screen.getByRole('button', { name: /success toast/i }));
    expect(screen.getByText('Saved invoice')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Saved invoice')).not.toBeInTheDocument();
  });

  it('pauses auto-dismiss on mouse enter and resumes it on mouse leave', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderToastProvider();

    await user.click(screen.getByRole('button', { name: /info toast/i }));
    const toastCard = getToastCard('Sync is running');

    await user.hover(toastCard);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Sync is running')).toBeInTheDocument();

    await user.unhover(toastCard);

    act(() => {
      jest.advanceTimersByTime(4999);
    });
    expect(screen.getByText('Sync is running')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Sync is running')).not.toBeInTheDocument();
  });

  it('removes a toast with the close button', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderToastProvider();

    await user.click(screen.getByRole('button', { name: /error toast/i }));
    expect(screen.getByText('Upload failed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dismiss notification/i }));

    expect(screen.queryByText('Upload failed')).not.toBeInTheDocument();
  });

  it('clears active timers when unmounted mid-dismissal', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = renderToastProvider();

    await user.click(screen.getByRole('button', { name: /success toast/i }));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('throws when useToast is rendered outside ToastProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<UnwrappedToastConsumer />)).toThrow(
      'useToast must be used within a ToastProvider',
    );
  });

  it('has no accessibility violations for a rendered toast', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { container } = renderToastProvider();

    await user.click(screen.getByRole('button', { name: /success toast/i }));

    jest.useRealTimers();

    expect(await axe(container)).toHaveNoViolations();
  });
});
