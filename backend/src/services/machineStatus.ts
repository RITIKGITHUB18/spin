import type { BookingRow } from '../repositories/bookings';

export type MachineStatus = 'available' | 'inuse' | 'done';

/**
 * A machine's live status is a pure function of its open booking and the
 * current time — never a stored/mutated field. This keeps every client (and
 * every request) in agreement without racing a ticker.
 */
export function deriveStatus(
  booking: Pick<BookingRow, 'state' | 'end_time'> | null,
  now: number
): MachineStatus {
  if (!booking) return 'available';
  if (booking.state === 'released') return 'available';
  if (booking.state === 'done') return 'done';
  // state === 'active'
  return new Date(booking.end_time).getTime() > now ? 'inuse' : 'done';
}
