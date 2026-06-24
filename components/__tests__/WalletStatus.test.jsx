import '@testing-library/jest-dom';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import WalletStatus, { WALLET_STATES } from '../WalletStatus';
import { ToastProvider } from '../ToastProvider';

import { WalletProvider } from '../WalletContext';

// Render with ToastProvider since WalletStatus calls useToast
function renderWalletStatus() {
  return render(
    <ToastProvider>
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>
    </ToastProvider>,
  );
}

// The WalletStatus sr-only status div is the first role="status" in DOM.
// The ToastProvider status container is the second.
function getWalletStatusRegion() {
  return screen.getAllByRole('status')[0];
}

function getToastRegion() {
  return screen.getAllByRole('status')[1];
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('WalletStatus — initial (disconnected) state', () => {
  it('renders "Connect Wallet" button when disconnected', () => {
    renderWalletStatus();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('shows the helper text for disconnected state', () => {
    renderWalletStatus();
    expect(
      screen.getByText('Connect your Stellar wallet to access the platform', { selector: 'span' }),
    ).toBeInTheDocument();
  });

  it('button is enabled when disconnected', () => {
    renderWalletStatus();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeEnabled();
  });

  it('sr-only status region reflects disconnected state', () => {
    renderWalletStatus();
    expect(getWalletStatusRegion()).toHaveTextContent(/disconnected/i);
  });
});

describe('WalletStatus — DISCONNECTED → CONNECTING transition', () => {
  it('transitions to connecting state immediately on click', () => {
    renderWalletStatus();
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    expect(screen.getByRole('button', { name: /connecting/i })).toBeInTheDocument();
  });

  it('disables the button while connecting', () => {
    renderWalletStatus();
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
  });

  it('shows helper text prompting wallet approval while connecting', () => {
    renderWalletStatus();
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    expect(
      screen.getByText('Please approve the connection in your wallet', { selector: 'span' }),
    ).toBeInTheDocument();
  });

  it('sr-only status region reflects connecting state', () => {
    renderWalletStatus();
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    expect(getWalletStatusRegion()).toHaveTextContent(/connecting/i);
  });
});

describe('WalletStatus — CONNECTING → CONNECTED (success path)', () => {
  async function connectSuccessfully() {
    jest.spyOn(Math, 'random').mockReturnValue(0); // index 0 → 'success'
    renderWalletStatus();
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await act(async () => { jest.advanceTimersByTime(1500); });
  }

  afterEach(() => jest.restoreAllMocks());

  it('shows "Disconnect" button after successful connection', async () => {
    await connectSuccessfully();
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('displays the wallet address after successful connection', async () => {
    await connectSuccessfully();
    expect(screen.getByText(/GABC/, { selector: 'span' })).toBeInTheDocument();
  });

  it('displays the wallet balance after successful connection', async () => {
    await connectSuccessfully();
    expect(screen.getByText(/XLM/, { selector: 'span' })).toBeInTheDocument();
  });

  it('fires a success toast with correct title', async () => {
    await connectSuccessfully();
    expect(within(getToastRegion()).getByText('Wallet connected')).toBeInTheDocument();
  });

  it('fires a success toast with correct message', async () => {
    await connectSuccessfully();
    expect(within(getToastRegion()).getByText('Wallet connected successfully.')).toBeInTheDocument();
  });

  it('sr-only status region reflects connected state', async () => {
    await connectSuccessfully();
    expect(getWalletStatusRegion()).toHaveTextContent(/connected/i);
  });
});

describe('WalletStatus — CONNECTING → ERROR (error path)', () => {
  async function connectWithError() {
    jest.spyOn(Math, 'random').mockReturnValue(0.4); // index 1 → 'error'
    renderWalletStatus();
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await act(async () => { jest.advanceTimersByTime(1500); });
  }

  afterEach(() => jest.restoreAllMocks());

  it('shows "Retry Connection" button on error', async () => {
    await connectWithError();
    expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
  });

  it('shows error helper text', async () => {
    await connectWithError();
    expect(
      screen.getByText(/failed to connect to wallet/i, { selector: 'span' }),
    ).toBeInTheDocument();
  });

  it('fires an error toast on connection failure', async () => {
    await connectWithError();
    expect(within(getToastRegion()).getByText(/connection failed/i)).toBeInTheDocument();
  });

  it('retry button triggers another connecting attempt', async () => {
    await connectWithError();
    fireEvent.click(screen.getByRole('button', { name: /retry connection/i }));
    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
  });

  it('sr-only status region reflects error state', async () => {
    await connectWithError();
    expect(getWalletStatusRegion()).toHaveTextContent(/error/i);
  });
});

describe('WalletStatus — CONNECTING → WRONG_NETWORK (wrong network path)', () => {
  async function connectWithWrongNetwork() {
    jest.spyOn(Math, 'random').mockReturnValue(0.7); // index 2 → 'wrong_network'
    renderWalletStatus();
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await act(async () => { jest.advanceTimersByTime(1500); });
  }

  afterEach(() => jest.restoreAllMocks());

  it('shows "Switch Network" button on wrong network', async () => {
    await connectWithWrongNetwork();
    expect(screen.getByRole('button', { name: /switch network/i })).toBeInTheDocument();
  });

  it('shows wrong-network helper text', async () => {
    await connectWithWrongNetwork();
    expect(
      screen.getByText('Please switch to the Stellar public network', { selector: 'span' }),
    ).toBeInTheDocument();
  });

  it('fires an error toast for wrong network', async () => {
    await connectWithWrongNetwork();
    expect(within(getToastRegion()).getByText(/wrong network/i)).toBeInTheDocument();
  });

  it('sr-only status region reflects wrong_network state', async () => {
    await connectWithWrongNetwork();
    expect(getWalletStatusRegion()).toHaveTextContent(/wrong_network/i);
  });
});

describe('WalletStatus — CONNECTED → DISCONNECTED (disconnect path)', () => {
  async function connectAndDisconnect() {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    renderWalletStatus();
    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }));
    await act(async () => { jest.advanceTimersByTime(1500); });
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));
  }

  afterEach(() => jest.restoreAllMocks());

  it('returns to "Connect Wallet" button after disconnect', async () => {
    await connectAndDisconnect();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('hides wallet address after disconnect', async () => {
    await connectAndDisconnect();
    expect(screen.queryByText(/GABC/, { selector: 'span' })).not.toBeInTheDocument();
  });

  it('sr-only status region reflects disconnected state after disconnect', async () => {
    await connectAndDisconnect();
    expect(getWalletStatusRegion()).toHaveTextContent(/disconnected/i);
  });
});

describe('WalletStatus — EXPORTS', () => {
  it('exports WALLET_STATES with all expected state keys', () => {
    expect(WALLET_STATES).toMatchObject({
      DISCONNECTED: 'disconnected',
      CONNECTING: 'connecting',
      CONNECTED: 'connected',
      ERROR: 'error',
      WRONG_NETWORK: 'wrong_network',
      NO_WALLET: 'no_wallet',
    });
  });
});
