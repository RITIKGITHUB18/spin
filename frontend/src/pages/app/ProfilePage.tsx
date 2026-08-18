import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { setPushOptIn } from '../../services/api/auth';
import { disablePush, enablePush } from '../../services/push';
import { useBookingHistory } from '../../hooks/useBookingHistory';
import { MachineIcon } from '../../components/machines/MachineIcon';
import { Spinner, LoadingBlock } from '../../components/common/Spinner';
import { initialsOf, maskPhone } from '../../utils/initials';
import { fmtAgo, fmtDate, fmtRunWindow } from '../../utils/time';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const { data: history, isLoading: historyLoading } = useBookingHistory();
  const [pushError, setPushError] = useState<string | null>(null);

  // The toggle reflects the stored preference rather than local state, so it
  // survives a reload. While the request is in flight it shows the value being
  // written, then settles on whatever the server confirms — a failure leaves it
  // where it actually is instead of lying about having saved.
  const pushMutation = useMutation({
    mutationFn: async (next: boolean) => {
      // Subscribe first when switching on: if the user blocks the permission
      // prompt the preference must stay off, or the toggle would claim push is
      // enabled while the browser silently drops every message.
      if (next) await enablePush();
      const updated = await setPushOptIn(next);
      // Order matters the other way round too — the server has already stopped
      // sending before we tear the local subscription down.
      if (!next) await disablePush();
      return updated;
    },
    onSuccess: (updated) => {
      setUser(updated);
      setPushError(null);
    },
    onError: (err) => setPushError(err instanceof Error ? err.message : 'Could not update notifications'),
  });
  const pushOn = pushMutation.isPending ? pushMutation.variables : (user?.pushOptIn ?? false);

  if (!user) return null;

  return (
    <div className="scrollbar-none h-svh overflow-y-auto pb-24">
      <div className="px-5.5 pb-2 pt-13.5">
        <div className="font-serif text-[28px] text-cream-900">Profile</div>
      </div>

      <div className="flex items-center gap-4 px-5.5 py-2.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 font-serif text-2xl text-white">
          {initialsOf(user.fullName)}
        </div>
        <div>
          <div className="text-[19px] font-bold text-cream-900">{user.fullName}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="rounded-full bg-brand-lt px-2.5 py-0.5 text-[11px] font-bold text-brand-tx">Flat {user.flat}</span>
            <span className="text-xs text-cream-500">{user.buildingName}</span>
          </div>
        </div>
      </div>

      <div className="px-5.5 pt-4.5">
        <div className="flex items-start gap-2.5 rounded-2xl bg-info-bg px-4 py-3.5 text-info-tx">
          <svg width="18" height="18" className="mt-0.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s7-3.5 7-9V6l-7-3-7 3v6c0 5.5 7 9 7 9z" />
          </svg>
          <div className="leading-snug">
            <div className="text-[13.5px] font-bold">You're invisible to neighbours</div>
            <div className="mt-0.5 text-[12.5px] opacity-85">They only ever see a machine's status — never your name, number, or flat.</div>
          </div>
        </div>
      </div>

      <div className="px-5.5 pt-4.5">
        <div className="overflow-hidden rounded-2xl border border-cream-150 bg-white">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="flex items-center gap-2.5 text-[13.5px] text-cream-600">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 2.5h10a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1z" />
                <path d="M11 18.5h2" />
              </svg>
              Phone
            </span>
            <span className="font-mono text-[13px] text-cream-900">{maskPhone(user.phone)}</span>
          </div>
          <div className="h-px bg-cream-100" />
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="flex items-center gap-2.5 text-[13.5px] text-cream-600">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              Push notifications
            </span>
            {/* Enabling push waits on a permission prompt and a round trip, so
                the switch alone can sit mid-flight with no explanation. */}
            <span className="flex items-center gap-2.5">
              {pushMutation.isPending && <Spinner size={15} className="text-cream-400" label="Updating notifications" />}
              <button
                type="button"
                role="switch"
                aria-checked={pushOn}
                aria-label="Push notifications"
                disabled={pushMutation.isPending}
                onClick={() => pushMutation.mutate(!pushOn)}
                className={`flex h-[27px] w-[46px] items-center rounded-full p-[3px] transition-colors disabled:opacity-60 ${pushOn ? 'bg-brand-500 justify-end' : 'bg-cream-300 justify-start'}`}
              >
                <span className="h-[21px] w-[21px] rounded-full bg-white shadow" />
              </button>
            </span>
          </div>
          {pushError && (
            <div className="border-t border-cream-100 px-4 py-2.5 text-[12px] text-error-tx">
              {pushError}
            </div>
          )}
        </div>
      </div>

      <div className="px-5.5 pb-2 pt-6">
        <span className="font-serif text-xl text-cream-900">Wash history</span>
      </div>

      <div className="flex flex-col gap-2.5 px-5.5">
        {historyLoading && <LoadingBlock label="Loading history" />}

        {!historyLoading && history?.length === 0 && (
          <div className="rounded-2xl border border-cream-150 bg-white px-4 py-6 text-center">
            <div className="text-[13.5px] font-bold text-cream-900">No washes yet</div>
            <div className="mt-1 text-xs text-cream-500">Your finished cycles will show up here.</div>
          </div>
        )}

        {history?.map((b) => (
          <div key={b.id} className="rounded-2xl border border-cream-150 bg-white px-4 py-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cream-100 text-cream-800">
                <MachineIcon name={b.machine.kind} size={20} />
              </div>
              <div className="min-w-0 flex-1 leading-snug">
                <div className="truncate text-[14px] font-bold text-cream-900">{b.machine.name}</div>
                <div className="truncate text-xs text-cream-500">
                  {b.cycleLabel} · {b.cycleMinutes} min
                </div>
              </div>
              <div className="flex-none text-right">
                <div className="text-[12.5px] font-semibold text-cream-700">
                  {/* `released` is the terminal state — anything else is still open. */}
                  {b.state === 'released' ? 'Collected' : b.state === 'done' ? 'Needs pickup' : 'Running'}
                </div>
                <div className="mt-0.5 text-[11px] text-cream-400">{fmtAgo(b.startTime)}</div>
              </div>
            </div>

            {/* On its own row rather than beside the status: sharing the line
                meant the longest status label squeezed the timestamp until it
                truncated mid-range. Indented to line up with the text column. */}
            <div className="mt-2 pl-[3.375rem] font-mono text-[11.5px] text-cream-600">
              {fmtDate(b.startTime)} · {fmtRunWindow(b.startTime, b.endTime)}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5.5 pb-6 pt-6">
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger-bd bg-danger-bg py-3.5 text-sm font-bold text-danger-ic"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Log out
        </button>
        <div className="mt-3.5 text-center font-mono text-[11px] text-cream-400">spin v1.0 · {user.buildingName}</div>
      </div>
    </div>
  );
}
