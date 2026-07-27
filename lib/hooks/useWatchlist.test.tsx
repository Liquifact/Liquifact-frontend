import { renderHook, act } from '@testing-library/react';
import { useWatchlist } from './useWatchlist';

// Mock the localStorage hook to avoid hitting the actual localStorage in tests.
jest.mock('./useLocalStorage', () => ({
  useLocalStorage: jest.fn(),
}));

import { useLocalStorage } from './useLocalStorage';

describe('useWatchlist', () => {
  let mockSetWatchlists;

  beforeEach(() => {
    mockSetWatchlists = jest.fn();
    (useLocalStorage).mockReturnValue([[], mockSetWatchlists]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with an empty array if storage is empty', () => {
    const { result } = renderHook(() => useWatchlist());
    expect(result.current.watchlists).toEqual([]);
  });

  it('should add a new watchlist', () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => {
      result.current.addWatchlist('High Yield');
    });

    expect(mockSetWatchlists).toHaveBeenCalled();
    const updateFn = mockSetWatchlists.mock.calls[0][0];
    const nextState = updateFn([]);

    expect(nextState).toHaveLength(1);
    expect(nextState[0].name).toBe('High Yield');
    expect(nextState[0].invoiceIds).toEqual([]);
    expect(typeof nextState[0].id).toBe('string');
  });

  it('should not add a duplicate watchlist name', () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => {
      result.current.addWatchlist('duplicate');
    });
    const updateFn = mockSetWatchlists.mock.calls[0][0];
    const nextState = updateFn([{ id: '1', name: 'Duplicate', invoiceIds: [] }]);

    // Should return the exact previous state array without modification
    expect(nextState).toHaveLength(1);
    expect(nextState[0].id).toBe('1');
  });

  it('should remove a watchlist by id', () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => {
      result.current.removeWatchlist('1');
    });

    const updateFn = mockSetWatchlists.mock.calls[0][0];
    const prevState = [
      { id: '1', name: 'To Remove', invoiceIds: [] },
      { id: '2', name: 'Keep', invoiceIds: [] }
    ];
    const nextState = updateFn(prevState);

    expect(nextState).toHaveLength(1);
    expect(nextState[0].id).toBe('2');
  });

  it('should toggle an invoice id in a watchlist', () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => {
      result.current.toggleInvoice('1', 'inv_123');
    });

    const updateFn1 = mockSetWatchlists.mock.calls[0][0];
    const prevState1 = [{ id: '1', name: 'Test', invoiceIds: [] }];
    const nextState1 = updateFn1(prevState1);

    // Added
    expect(nextState1[0].invoiceIds).toContain('inv_123');

    // Toggle again
    const updateFn2 = mockSetWatchlists.mock.calls[0][0];
    const nextState2 = updateFn2(nextState1);

    // Removed
    expect(nextState2[0].invoiceIds).not.toContain('inv_123');
  });

  it('should prune stale invoice ids', () => {
    const { result } = renderHook(() => useWatchlist());

    act(() => {
      result.current.pruneStaleInvoices(['inv_active']);
    });

    const updateFn = mockSetWatchlists.mock.calls[0][0];
    const prevState = [
      { id: '1', name: 'Test', invoiceIds: ['inv_active', 'inv_stale'] }
    ];
    const nextState = updateFn(prevState);

    expect(nextState[0].invoiceIds).toEqual(['inv_active']);
  });
});
