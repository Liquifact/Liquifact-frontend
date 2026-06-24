import { render } from '@testing-library/react';
import { ToastProvider } from '../ToastProvider';
import { WalletProvider } from '../WalletContext';
import WalletStatus from '../WalletStatus';
import { axe } from 'jest-axe';

test('WalletStatus has no accessibility violations', async () => {
  const { container } = render(
    <ToastProvider>
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>
    </ToastProvider>,
  );
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
