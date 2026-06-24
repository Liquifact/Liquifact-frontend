import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../ToastProvider';
import WalletStatus, {
  WALLET_INSTALL_URL,
  WALLET_STATES,
  openTrustedExternalUrl,
} from '../WalletStatus';

afterEach(() => {
  jest.restoreAllMocks();
});

test('opens the wallet install page with reverse-tabnabbing protections', async () => {
  const openedWindow = { opener: { unsafe: true } };
  const openSpy = jest.spyOn(window, 'open').mockReturnValue(openedWindow);
  const user = userEvent.setup();

  render(
    <ToastProvider>
      <WalletStatus initialWalletState={WALLET_STATES.NO_WALLET} />
    </ToastProvider>,
  );

  await user.click(screen.getByRole('button', { name: 'Install Wallet' }));

  expect(openSpy).toHaveBeenCalledWith(WALLET_INSTALL_URL, '_blank', 'noopener,noreferrer');
  expect(openedWindow.opener).toBeNull();
});

test('rejects non-https wallet install URLs before opening a new tab', () => {
  const openWindow = jest.fn();

  expect(openTrustedExternalUrl('javascript:alert(1)', openWindow)).toBe(false);
  expect(openTrustedExternalUrl('http://example.com/wallets', openWindow)).toBe(false);
  expect(openTrustedExternalUrl('not a url', openWindow)).toBe(false);
  expect(openWindow).not.toHaveBeenCalled();
});
