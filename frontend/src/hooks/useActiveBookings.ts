import { useQuery } from '@tanstack/react-query';
import { fetchActiveBookings } from '../services/api/booking';

/**
 * No interval — see useMachines. The countdown ring runs off the local clock in
 * useNow(), so timers stay smooth with no network traffic at all; only a
 * neighbour's action needs a refetch, and focus or a pull covers that.
 */
export function useActiveBookings() {
  return useQuery({
    queryKey: ['bookings', 'active'],
    queryFn: fetchActiveBookings,
    staleTime: 30000,
  });
}
