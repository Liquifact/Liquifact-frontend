import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

const VALID_SORT_KEYS = ['date', 'amount', 'status'];
const VALID_DIRECTIONS = ['asc', 'desc'];

/**
 * @typedef {object} WalletFilters
 * @property {string} [searchTerm]
 * @property {{key: string, direction: 'asc' | 'desc'}} sort
 */

/**
 * Custom hook to synchronize wallet filter and sort state with URL query parameters.
 * It reads the initial state from the URL, and updates the URL as the state changes.
 *
 * @returns {[WalletFilters, (newFilters: Partial<WalletFilters>) => void]}
 */
export function useWalletUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState(() => {
    const sortKey = searchParams.get('sort');
    const direction = searchParams.get('direction');

    return {
      searchTerm: searchParams.get('q') || '',
      sort: {
        key: VALID_SORT_KEYS.includes(sortKey) ? sortKey : 'date',
        direction: VALID_DIRECTIONS.includes(direction) ? direction : 'desc',
      },
    };
  });

  const [debouncedFilters] = useDebounce(filters, 300);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedFilters.searchTerm) {
      params.set('q', debouncedFilters.searchTerm);
    } else {
      params.delete('q');
    }

    if (debouncedFilters.sort.key) {
      params.set('sort', debouncedFilters.sort.key);
      params.set('direction', debouncedFilters.sort.direction);
    } else {
      params.delete('sort');
      params.delete('direction');
    }

    // use replace to avoid adding to history
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedFilters, pathname, router, searchParams]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
  }, []);

  return [filters, updateFilters];
}