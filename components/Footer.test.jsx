import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';
import { copy } from '../app/copy/en';

describe('Footer', () => {
  it('renders configured links with real destinations', () => {
    render(<Footer />);

    copy.footer.links.forEach((link) => {
      const anchor = screen.getByRole('link', { name: link.label });

      expect(anchor).toHaveAttribute('href', link.href);
      expect(anchor).not.toHaveAttribute('href', '#');
    });
  });

  it('opens external footer links safely', () => {
    render(<Footer />);

    copy.footer.links.forEach((link) => {
      const anchor = screen.getByRole('link', { name: link.label });

      expect(anchor).toHaveAttribute('target', '_blank');
      expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
