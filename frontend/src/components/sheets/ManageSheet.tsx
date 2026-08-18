import type { Machine } from '../../types';
import { MachineIcon } from '../machines/MachineIcon';
import { useBookingActions } from '../../hooks/useBookingActions';
import { useNow } from '../../hooks/useCountdown';
import { useUiStore } from '../../store/uiStore';
import { PendingLabel, Spinner } from '../common/Spinner';
import { fmtAgo, fmtRemain } from '../../utils/time';

const PILL_CLASS: Record<Machine['status'], string> = {
  available: 'bg-success-ic',
  inuse: 'bg-warn-ic',
  done: 'bg-danger-ic',
};
const LABEL: Record<Machine['status'], string> = { available: 'Free', inuse: 'In use', done: 'Done' };

export function ManageSheet({ machine }: { machine: Machine }) {
  // The 1s ticker lives here rather than in AppShell: it is the only consumer,
  // and hoisting it re-rendered the entire shell — nav, drawer, toast and the
  // whole routed page — once a second whether or not this sheet was open.
  const now = useNow();
  const closeSheet = useUiStore((s) => s.closeSheet);
  const { extend, markDone, notifyCollect, collect, release, cancel, resume } = useBookingActions();
  const bookingId = machine.bookingId!;
  const running = machine.status === 'inuse';
  const done = machine.status === 'done';
  const notActuallyDone = done && machine.isMine && !!machine.endTime && new Date(machine.endTime).getTime() > now;

  let alertClass = 'bg-info-bg text-info-tx';
  let note = '';
  if (running) {
    alertClass = machine.isMine ? 'bg-info-bg text-info-tx' : 'bg-warn-bg text-warn-ic';
    note = machine.isMine
      ? "This is your wash. We'll notify you the moment it's done."
      : "In use by a neighbour. If it has stopped, mark it done — they'll get a private alert. Their identity stays hidden.";
  } else if (done) {
    alertClass = notActuallyDone ? 'bg-warn-bg text-warn-ic' : 'bg-success-bg text-success-ic';
    note = notActuallyDone
      ? "A neighbour marked this done, but your timer still shows time left. Resume it if your wash isn't actually finished."
      : machine.isMine
        ? 'Your laundry is ready. Collect it, then release the machine.'
        : "Cycle's done but the clothes are still inside. Nudge the owner to come collect — or if you've emptied it yourself, release the machine.";
  }

  return (
    <div>
      <div className="mb-4.5 flex items-center gap-3.5">
        <div className="flex h-13 w-13 flex-none items-center justify-center rounded-2xl bg-white text-cream-700">
          <MachineIcon name={machine.kind} />
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-cream-900">{machine.name}</div>
          <div className="text-[13px] text-cream-500">
            {running
              ? `Started ${fmtAgo(machine.startTime!)} · ${fmtRemain(new Date(machine.endTime!).getTime() - now)} left`
              : `Finished ${fmtAgo(machine.endTime!)}`}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold text-white ${PILL_CLASS[machine.status]}`}>
          {LABEL[machine.status]}
        </span>
      </div>

      <div className={`mb-4 flex items-start gap-2 rounded-2xl px-3.5 py-3 text-[12.5px] leading-relaxed ${alertClass}`}>
        <svg width="16" height="16" className="mt-0.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
        <div>{note}</div>
      </div>

      {running && machine.isMine && (
        <div className="mb-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-cream-500">Add time (machine malfunction)</span>
          <div className="mt-2 flex gap-2">
            {[5, 10, 15].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => extend.mutate({ id: bookingId, minutes: m })}
                disabled={extend.isPending}
                className="flex-1 rounded-[13px] border-[1.5px] border-cream-200 bg-white py-2.5 text-[13px] font-bold text-cream-800 disabled:opacity-60"
              >
                <PendingLabel pending={extend.isPending} size={14}>+{m} min</PendingLabel>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {notActuallyDone && (
          <button
            type="button"
            onClick={() => resume.mutate(bookingId, { onSuccess: closeSheet })}
            disabled={resume.isPending}
            className="w-full rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 py-4 text-[15.5px] font-bold text-white shadow-lg disabled:opacity-60"
          >
            <PendingLabel pending={resume.isPending}>Not done yet — resume timer</PendingLabel>
          </button>
        )}
        {running && machine.isMine && (
          <button
            type="button"
            onClick={() => cancel.mutate(bookingId, { onSuccess: closeSheet })}
            disabled={cancel.isPending}
            className="w-full rounded-2xl border-[1.5px] border-cream-200 bg-white py-4 text-[15px] font-bold text-cream-800 disabled:opacity-60"
          >
            <PendingLabel pending={cancel.isPending}>Cancel wash &amp; release machine</PendingLabel>
          </button>
        )}
        {running && !machine.isMine && (
          <button
            type="button"
            onClick={() => markDone.mutate(bookingId, { onSuccess: closeSheet })}
            disabled={markDone.isPending}
            className="w-full rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 py-4 text-[15.5px] font-bold text-white shadow-lg disabled:opacity-60"
          >
            <PendingLabel pending={markDone.isPending}>Mark as done</PendingLabel>
          </button>
        )}
        {done && !machine.isMine && (
          <>
            <button
              type="button"
              onClick={() => notifyCollect.mutate(bookingId, { onSuccess: closeSheet })}
              disabled={notifyCollect.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-cream-200 bg-white py-4 text-[15px] font-bold text-cream-800 disabled:opacity-60"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              Notify owner to collect their clothes
              {notifyCollect.isPending && <Spinner size={16} />}
            </button>
            <button
              type="button"
              onClick={() => release.mutate(bookingId, { onSuccess: closeSheet })}
              disabled={release.isPending}
              className="w-full rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 py-4 text-[15.5px] font-bold text-white shadow-lg disabled:opacity-60"
            >
              <PendingLabel pending={release.isPending}>I emptied it — release machine</PendingLabel>
            </button>
          </>
        )}
        {done && machine.isMine && (
          <button
            type="button"
            onClick={() => collect.mutate(bookingId, { onSuccess: closeSheet })}
            disabled={collect.isPending}
            className="w-full rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 py-4 text-[15.5px] font-bold text-white shadow-lg disabled:opacity-60"
          >
            <PendingLabel pending={collect.isPending}>Confirm pickup &amp; release</PendingLabel>
          </button>
        )}
      </div>
      <button type="button" onClick={closeSheet} className="mt-2 w-full py-3.5 text-center text-[13.5px] text-cream-500">
        Close
      </button>
    </div>
  );
}
