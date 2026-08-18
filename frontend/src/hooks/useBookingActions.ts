import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as bookingApi from '../services/api/booking';
import { useUiStore } from '../store/uiStore';
import { apiErrorMessage } from '../services/api/client';

export function useBookingActions() {
  const qc = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['machines'] });
    qc.invalidateQueries({ queryKey: ['bookings'] });
  }

  const start = useMutation({
    mutationFn: ({ machineId, cycleLabel, cycleMinutes }: { machineId: string; cycleLabel: string; cycleMinutes: number }) =>
      bookingApi.startBooking(machineId, cycleLabel, cycleMinutes),
    onSuccess: () => {
      invalidateAll();
      showToast('Cycle started', "We'll alert you when it's done.");
    },
    onError: (err) => showToast('Could not start cycle', apiErrorMessage(err)),
  });

  const extend = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) => bookingApi.extendBooking(id, minutes),
    onSuccess: (_data, vars) => {
      invalidateAll();
      showToast(`+${vars.minutes} min added`, "Neighbours can see it's still running.");
    },
    onError: (err) => showToast('Could not add time', apiErrorMessage(err)),
  });

  const markDone = useMutation({
    mutationFn: (id: string) => bookingApi.markDone(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Owner notified', 'They got a private alert that their wash is done.');
    },
    onError: (err) => showToast('Could not mark done', apiErrorMessage(err)),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => bookingApi.cancelBooking(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Wash cancelled', 'Machine is free for others.');
    },
    onError: (err) => showToast('Could not cancel', apiErrorMessage(err)),
  });

  const resume = useMutation({
    mutationFn: (id: string) => bookingApi.resumeBooking(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Timer resumed', "We'll alert you when it's actually done.");
    },
    onError: (err) => showToast('Could not resume', apiErrorMessage(err)),
  });

  const notifyCollect = useMutation({
    mutationFn: (id: string) => bookingApi.notifyCollect(id),
    onSuccess: () => showToast('Owner nudged', 'We asked them to collect their laundry — privately.'),
    onError: (err) => showToast('Could not notify owner', apiErrorMessage(err)),
  });

  const collect = useMutation({
    mutationFn: (id: string) => bookingApi.collectBooking(id),
    onSuccess: (booking) => {
      invalidateAll();
      showToast('Machine released', `${booking.machine.name} is now free for others.`);
    },
    onError: (err) => showToast('Could not release machine', apiErrorMessage(err)),
  });

  const release = useMutation({
    mutationFn: (id: string) => bookingApi.releaseBooking(id),
    onSuccess: () => {
      invalidateAll();
      showToast('Machine released', 'Marked free for others.');
    },
    onError: (err) => showToast('Could not release machine', apiErrorMessage(err)),
  });

  return { start, extend, markDone, notifyCollect, collect, release, cancel, resume };
}
