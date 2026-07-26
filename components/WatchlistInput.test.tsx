import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WatchlistInput from './WatchlistInput';

describe('WatchlistInput', () => {
  it('renders the form correctly', () => {
    render(<WatchlistInput onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/Watchlist Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Yield/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Watchlist/i })).toBeInTheDocument();
  });

  it('validates empty name on blur', async () => {
    render(<WatchlistInput onSubmit={jest.fn()} />);
    const nameInput = screen.getByLabelText(/Watchlist Name/i);
    
    fireEvent.blur(nameInput);
    
    expect(await screen.findByText('Watchlist name is required.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Watchlist/i })).toBeDisabled();
  });

  it('validates name exceeding length limits', async () => {
    render(<WatchlistInput onSubmit={jest.fn()} />);
    const nameInput = screen.getByLabelText(/Watchlist Name/i);
    
    fireEvent.change(nameInput, { target: { value: 'A'.repeat(51) } });
    fireEvent.blur(nameInput);
    
    expect(await screen.findByText('Watchlist name cannot exceed 50 characters.')).toBeInTheDocument();
  });

  it('validates format errors in name', async () => {
    render(<WatchlistInput onSubmit={jest.fn()} />);
    const nameInput = screen.getByLabelText(/Watchlist Name/i);
    
    fireEvent.change(nameInput, { target: { value: 'Invalid!@#' } });
    fireEvent.blur(nameInput);
    
    expect(await screen.findByText('Watchlist name contains invalid characters.')).toBeInTheDocument();
  });

  it('validates out of range target yield', async () => {
    render(<WatchlistInput onSubmit={jest.fn()} />);
    const yieldInput = screen.getByLabelText(/Target Yield/i);
    
    fireEvent.change(yieldInput, { target: { value: '150' } });
    fireEvent.blur(yieldInput);
    
    expect(await screen.findByText('Target yield must be between 0 and 100.')).toBeInTheDocument();
  });

  it('validates non-numeric target yield', async () => {
    render(<WatchlistInput onSubmit={jest.fn()} />);
    const yieldInput = screen.getByLabelText(/Target Yield/i);
    
    // Testing non-numeric inputs might be handled by the browser for type="number",
    // but in case of manual override or string manipulation:
    fireEvent.change(yieldInput, { target: { value: 'abc' } });
    fireEvent.blur(yieldInput);
    
    expect(await screen.findByText('Target yield must be a valid number.')).toBeInTheDocument();
  });

  it('submits successfully with valid data', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValueOnce({});
    render(<WatchlistInput onSubmit={mockOnSubmit} />);
    
    const nameInput = screen.getByLabelText(/Watchlist Name/i);
    const yieldInput = screen.getByLabelText(/Target Yield/i);
    const submitBtn = screen.getByRole('button', { name: /Create Watchlist/i });
    
    fireEvent.change(nameInput, { target: { value: 'My Valid Watchlist' } });
    fireEvent.change(yieldInput, { target: { value: '8.5' } });
    
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'My Valid Watchlist',
        targetYield: 8.5
      });
    });
    
    // Checks that inputs are cleared
    expect(nameInput.value).toBe('');
    expect(yieldInput.value).toBe('');
  });

  it('blocks submission while invalid', async () => {
    const mockOnSubmit = jest.fn();
    render(<WatchlistInput onSubmit={mockOnSubmit} />);
    
    const submitBtn = screen.getByRole('button', { name: /Create Watchlist/i });
    fireEvent.click(submitBtn); // submitting empty
    
    expect(await screen.findByText('Watchlist name is required.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(submitBtn).toBeDisabled();
  });
});
