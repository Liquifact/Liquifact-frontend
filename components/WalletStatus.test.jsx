import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from './ToastProvider';
import WalletStatus, { WALLET_STATES } from './WalletStatus';

function renderWalletStatus(props = {}) {
  return render(
    <ToastProvider>
      <WalletStatus {...props} />
    </ToastProvider>,
  );
}

function getStatusDot(container) {
  return container.querySelector('.w-2.h-2.rounded-full');
}

function mockConnectionScenario(randomValue) {
  jest.spyOn(Math, 'random').mockReturnValue(randomValue);
}

function finishConnectionTimer() {
  act(() => {
    jest.advanceTimersByTime(1500);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('WalletStatus', () => {
  it('renders the disconnected state by default', () => {
    const { container } = renderWalletStatus();

    const button = screen.getByRole('button', { name: /connect wallet/i });

    expect(button).toBeEnabled();
    expect(button).toHaveClass('bg-cyan-500/20');
    expect(screen.getAllByText(/connect your stellar wallet/i)).toHaveLength(2);
    expect(screen.getByText(/wallet status: disconnected/i)).toBeInTheDocument();
    expect(getStatusDot(container)).toHaveClass('bg-slate-600');
  });

  it('shows connecting feedback before a successful wallet connection', () => {
    mockConnectionScenario(0);
    const { container } = renderWalletStatus();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));

    const button = screen.getByRole('button', { name: /connecting/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('bg-cyan-500/30');
    expect(button).toHaveClass('cursor-wait');
    expect(screen.getAllByText(/please approve the connection/i)).toHaveLength(2);
    expect(screen.getByText(/wallet status: connecting/i)).toBeInTheDocument();
    expect(getStatusDot(container)).toHaveClass('bg-yellow-500');
    expect(getStatusDot(container)).toHaveClass('animate-pulse');
  });

  it('renders connected wallet data and success toast after the success branch', () => {
    mockConnectionScenario(0);
    const { container } = renderWalletStatus();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    finishConnectionTimer();

    const button = screen.getByRole('button', { name: /disconnect/i });
    expect(button).toBeEnabled();
    expect(button).toHaveClass('border-slate-600');
    expect(screen.getByText('GABC...XYZ123')).toBeInTheDocument();
    expect(screen.getByText('1,234.56 XLM')).toBeInTheDocument();
    expect(screen.getByText(/wallet status: connected/i)).toBeInTheDocument();
    expect(screen.getByText(/connected as GABC...XYZ123/i)).toBeInTheDocument();
    expect(screen.getByText('Wallet connected')).toBeInTheDocument();
    expect(screen.getByText('Wallet connected successfully.')).toBeInTheDocument();
    expect(getStatusDot(container)).toHaveClass('bg-green-500');
  });

  it('disconnects after a successful connection and clears wallet data', () => {
    mockConnectionScenario(0);
    renderWalletStatus();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    finishConnectionTimer();
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));

    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeEnabled();
    expect(screen.getAllByText(/connect your stellar wallet/i)).toHaveLength(2);
    expect(screen.queryByText('GABC...XYZ123')).not.toBeInTheDocument();
    expect(screen.queryByText('1,234.56 XLM')).not.toBeInTheDocument();
    expect(screen.getByText(/wallet status: disconnected/i)).toBeInTheDocument();
  });

  it('renders the retry state and error toast after the error branch', () => {
    mockConnectionScenario(0.4);
    const { container } = renderWalletStatus();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    finishConnectionTimer();

    const button = screen.getByRole('button', { name: /retry connection/i });
    expect(button).toBeEnabled();
    expect(button).toHaveClass('bg-cyan-500/20');
    expect(screen.getAllByText('Failed to connect to wallet. Please try again.')).toHaveLength(3);
    expect(screen.getByText(/wallet status: error/i)).toBeInTheDocument();
    expect(screen.getByText(/error: failed to connect to wallet/i)).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(getStatusDot(container)).toHaveClass('bg-red-500');
  });

  it('renders the wrong-network state and toast after the wrong-network branch', () => {
    mockConnectionScenario(0.8);
    const { container } = renderWalletStatus();

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    finishConnectionTimer();

    const button = screen.getByRole('button', { name: /switch network/i });
    expect(button).toBeEnabled();
    expect(button).toHaveClass('bg-amber-500/20');
    expect(screen.getAllByText(/please switch to the stellar public network/i)).toHaveLength(2);
    expect(screen.getByText(/wallet status: wrong_network/i)).toBeInTheDocument();
    expect(screen.getByText(/error: wallet is connected to testnet/i)).toBeInTheDocument();
    expect(screen.getByText('Wrong network')).toBeInTheDocument();
    expect(getStatusDot(container)).toHaveClass('bg-red-500');
  });

  it('opens the Stellar wallets page from the no-wallet state', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    const { container } = renderWalletStatus({ initialState: WALLET_STATES.NO_WALLET });

    const button = screen.getByRole('button', { name: /install wallet/i });
    expect(button).toBeEnabled();
    expect(button).toHaveClass('bg-violet-500/20');
    expect(screen.getAllByText(/no stellar wallet detected/i)).toHaveLength(2);
    expect(screen.getByText(/wallet status: no_wallet/i)).toBeInTheDocument();
    expect(getStatusDot(container)).toHaveClass('bg-slate-600');

    fireEvent.click(button);

    expect(open).toHaveBeenCalledWith('https://www.stellar.org/wallets', '_blank');
  });
});
