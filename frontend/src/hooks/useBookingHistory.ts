import { useQuery } from '@tanstack/react-query';
import { fetchBookingHistory } from '../services/api/booking';

/**
 * Every cycle this resident has run, newest first (server caps at 20).
 *
 * Keyed under ['bookings'] so useBookingActions' invalidateAll() reaches it.
 * It used to sit on its own ['booking-history'] key, which that invalidation
 * never matched — so collecting a wash left the Profile history showing the
 * old state until a reload.
 */
export function useBookingHistory() {
  return useQuery({
    queryKey: ['bookings', 'history'],
    queryFn: fetchBookingHistory,
    staleTime: 60 * 1000,
  });
}
