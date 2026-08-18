import { useQuery } from '@tanstack/react-query';
import { fetchActiveBookings } from '../services/api/booking';

/**
 * The countdown ring is driven by the local clock in useNow(), not by this
 * query, so a slower poll does not make timers any less smooth — it only
 * changes how quickly someone else's actions show up.
 */
export function useActiveBookings() {
  return useQuery({
    queryKey: ['bookings', 'active'],
    queryFn: fetchActiveBookings,
    refetchInterval: 15000,
    staleTime: 10000,
  });
}
