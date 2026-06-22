import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletStatus, { WALLET_STATES } from './WalletStatus';
import { ToastProvider } from './ToastProvider';

const connectedWallet = {
  address: 'GTEST...WALLET',
  network: 'public',
  balance: '42.00 XLM',
};

function renderWalletStatus(props) {
  return render(
    <ToastProvider>
      <WalletStatus {...props} />
    </ToastProvider>,
  );
}

function statusDot() {
  return document.querySelector('[aria-hidden="true"].rounded-full');
}

function walletStatusAnnouncement() {
  const status = screen
    .getAllByRole('status')
    .find((element) => element.textContent.includes('Wallet status:'));

  if (!status) {
    throw new Error('Wallet status announcement not found');
  }

  return status;
}

function expectVisibleText(text) {
  expect(screen.getAllByText(text)[0]).toBeVisible();
}

async function clickAndSettle(user, name) {
  await user.click(screen.getByRole('button', { name }));

  act(() => {
    jest.advanceTimersByTime(1500);
  });
}

describe('WalletStatus state machine', () => {
  let randomSpy;
  let openSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    randomSpy = jest.spyOn(Math, 'random');
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders the disconnected state with primary connect affordance', () => {
    renderWalletStatus();

    expect(screen.getByRole('button', { name: /connect wallet/i })).toHaveTextContent(
      'Connect Wallet',
    );
    expectVisibleText('Connect your Stellar wallet to access the platform');
    expect(statusDot()).toHaveClass('bg-slate-600');
    expect(walletStatusAnnouncement()).toHaveTextContent(
      'Wallet status: disconnected',
    );
  });

  it('shows connecting state immediately and disables the button', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    randomSpy.mockReturnValue(0);

    renderWalletStatus();

    await user.click(screen.getByRole('button', { name: /connect wallet/i }));

    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
    expectVisibleText('Please approve the connection in your wallet');
    expect(statusDot()).toHaveClass('bg-yellow-500', 'animate-pulse');
    expect(walletStatusAnnouncement()).toHaveTextContent(
      'Wallet status: connecting',
    );
  });

  it('connects successfully, renders wallet data, and shows a success toast', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    randomSpy.mockReturnValue(0);

    renderWalletStatus();

    await clickAndSettle(user, /connect wallet/i);

    expect(screen.getByRole('button', { name: /disconnect/i })).toHaveTextContent(
      'Disconnect',
    );
    expect(screen.getByText('GABC...XYZ123')).toBeInTheDocument();
    expect(screen.getByText('1,234.56 XLM')).toBeInTheDocument();
    expect(statusDot()).toHaveClass('bg-green-500');
    expect(walletStatusAnnouncement()).toHaveTextContent(
      'Wallet status: connected',
    );
    expect(screen.getByText('Wallet connected')).toBeInTheDocument();
    expect(screen.getByText('Wallet connected successfully.')).toBeInTheDocument();
  });

  it('disconnects from an existing connected state', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderWalletStatus({
      initialState: WALLET_STATES.CONNECTED,
      initialWalletData: connectedWallet,
    });

    await user.click(screen.getByRole('button', { name: /disconnect/i }));

    expect(screen.getByRole('button', { name: /connect wallet/i })).toHaveTextContent(
      'Connect Wallet',
    );
    expect(screen.queryByText('GTEST...WALLET')).not.toBeInTheDocument();
    expect(walletStatusAnnouncement()).toHaveTextContent(
      'Wallet status: disconnected',
    );
  });

  it('renders connection errors and shows the failure toast', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    randomSpy.mockReturnValue(0.5);

    renderWalletStatus();

    await clickAndSettle(user, /connect wallet/i);

    expect(
      screen.getByRole('button', { name: /retry connection/i }),
    ).toHaveTextContent('Retry Connection');
    expectVisibleText('Failed to connect to wallet. Please try again.');
    expect(statusDot()).toHaveClass('bg-red-500');
    expect(walletStatusAnnouncement()).toHaveTextContent(
      'Wallet status: error',
    );
    expect(walletStatusAnnouncement()).toHaveTextContent(
      'Error: Failed to connect to wallet. Please try again.',
    );
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('renders wrong-network guidance and can retry connection', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    randomSpy.mockReturnValue(0.9);

    renderWalletStatus();

    await clickAndSettle(user, /connect wallet/i);

    expect(screen.getByRole('button', { name: /switch network/i })).toHaveTextContent(
      'Switch Network',
    );
    expectVisibleText('Please switch to the Stellar public network');
    expect(statusDot()).toHaveClass('bg-red-500');
    expect(screen.getByText('Wrong network')).toBeInTheDocument();

    randomSpy.mockReturnValue(0);
    await clickAndSettle(user, /switch network/i);

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('opens the Stellar wallets page from the no-wallet branch', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderWalletStatus({ initialState: WALLET_STATES.NO_WALLET });

    expect(screen.getByRole('button', { name: /install wallet/i })).toHaveTextContent(
      'Install Wallet',
    );
    expectVisibleText('No Stellar wallet detected. Install one to continue');

    await user.click(screen.getByRole('button', { name: /install wallet/i }));

    expect(openSpy).toHaveBeenCalledWith('https://www.stellar.org/wallets', '_blank');
  });

  it('keeps the button disabled while a connection is pending', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    randomSpy.mockReturnValue(0);

    renderWalletStatus();

    await user.click(screen.getByRole('button', { name: /connect wallet/i }));

    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
    expect(walletStatusAnnouncement()).toHaveTextContent('Wallet status: connecting');

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    expect(screen.getAllByText('Wallet connected')).toHaveLength(1);
  });
});
