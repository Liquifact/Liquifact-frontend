import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { reportErrorMock } = vi.hoisted(() => ({
  reportErrorMock: vi.fn(),
}));

vi.mock('@/lib/observability/reportError', () => ({
  reportError: reportErrorMock,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

import RootError from '@/app/error';
import MarketplaceError from '@/app/marketplace/error';
import InvoiceDetailError from '@/app/marketplace/[id]/error';
import SubmitError from '@/app/submit/error';

const boundaries = [
  ['root', RootError],
  ['marketplace', MarketplaceError],
  ['marketplace-detail', InvoiceDetailError],
  ['submit', SubmitError],
];

describe('route error boundaries', () => {
  beforeEach(() => {
    reportErrorMock.mockReset();
  });

  it.each(boundaries)('reports %s context once for the same error and retries', async (_name, Boundary) => {
    const error = Object.assign(new Error('render failed'), { digest: 'digest-123' });
    const reset = vi.fn();
    const view = render(<Boundary error={error} reset={reset} />);

    await waitFor(() => expect(reportErrorMock).toHaveBeenCalledTimes(1));
    expect(reportErrorMock).toHaveBeenCalledWith(error, { boundary: _name });

    view.rerender(<Boundary error={error} reset={reset} />);
    expect(reportErrorMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
