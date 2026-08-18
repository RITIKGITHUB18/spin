import { useQuery } from '@tanstack/react-query';
import { fetchMachines } from '../services/api/machines';

/**
 * `staleTime` matters as much as the interval here. Without it the data is
 * stale the instant it lands, so every new observer refetches on mount — and
 * the pages mount and unmount on each tab switch, so moving between Home, My
 * machines and Profile fired a fresh request every time.
 *
 * Booking actions invalidate ['machines'] directly, so a change you make is
 * reflected immediately regardless of the interval; the poll only exists to
 * pick up what *other* residents do.
 */
export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: fetchMachines,
    refetchInterval: 15000,
    staleTime: 10000,
  });
}
