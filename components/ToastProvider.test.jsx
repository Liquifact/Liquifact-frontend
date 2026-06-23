import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ToastProvider, useToast } from './ToastProvider';

function ToastControls() {
  const toast = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast.success('Invoice funded')}>
        Show success
      </button>
      <button type="button" onClick={() => toast.error('Upload failed')}>
        Show error
      </button>
      <button type="button" onClick={() => toast.info('Review the invoice')}>
        Show info
      </button>
      <button type="button" onClick={() => toast.info('Custom body', 'Custom title')}>
        Show custom
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <ToastControls />
    </ToastProvider>,
  );
}

function getToastCard(message) {
  return screen.getByText(message).closest('.pointer-events-auto');
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('ToastProvider', () => {
  it('renders success, error, and info toasts with default titles and variant styles', () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /show success/i }));
    fireEvent.click(screen.getByRole('button', { name: /show error/i }));
    fireEvent.click(screen.getByRole('button', { name: /show info/i }));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Invoice funded')).toBeInTheDocument();
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByText('Review the invoice')).toBeInTheDocument();
    expect(getToastCard('Invoice funded')).toHaveClass('border-emerald-500/30');
    expect(getToastCard('Upload failed')).toHaveClass('border-red-500/30');
    expect(getToastCard('Review the invoice')).toHaveClass('border-cyan-500/20');
  });

  it('keeps custom titles when one is provided', () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /show custom/i }));

    expect(screen.getByText('Custom title')).toBeInTheDocument();
    expect(screen.getByText('Custom body')).toBeInTheDocument();
    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });

  it('exposes a polite status live region for announcements', () => {
    renderWithProvider();

    const region = screen.getByRole('status');

    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('auto-dismisses a toast after the timeout', () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /show info/i }));

    expect(screen.getByText('Review the invoice')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4999);
    });
    expect(screen.getByText('Review the invoice')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Review the invoice')).not.toBeInTheDocument();
  });

  it('pauses auto-dismiss on hover and resumes it after the mouse leaves', () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /show info/i }));
    const toastCard = getToastCard('Review the invoice');

    fireEvent.mouseEnter(toastCard);
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Review the invoice')).toBeInTheDocument();

    fireEvent.mouseLeave(toastCard);
    act(() => {
      jest.advanceTimersByTime(4999);
    });
    expect(screen.getByText('Review the invoice')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Review the invoice')).not.toBeInTheDocument();
  });

  it('removes a toast when the close button is clicked', () => {
    renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /show error/i }));
    fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }));

    expect(screen.queryByText('Upload failed')).not.toBeInTheDocument();
  });

  it('clears pending timers when the provider unmounts', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /show success/i }));
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('throws a helpful error when useToast is called outside the provider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function UnwrappedConsumer() {
      useToast();
      return null;
    }

    expect(() => render(<UnwrappedConsumer />)).toThrow(
      'useToast must be used within a ToastProvider',
    );
    consoleErrorSpy.mockRestore();
  });

  it('renders an accessible toast notification', async () => {
    jest.useRealTimers();
    const { container } = renderWithProvider();

    fireEvent.click(screen.getByRole('button', { name: /show success/i }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
