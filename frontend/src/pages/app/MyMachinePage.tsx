import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from "react";
import { useActiveBookings } from "../../hooks/useActiveBookings";
import { useBookingActions } from "../../hooks/useBookingActions";
import { useNow } from "../../hooks/useCountdown";
import { CountdownRing } from "../../components/machines/CountdownRing";
import { PullToRefresh } from '../../components/common/PullToRefresh';
import { MachineIcon } from "../../components/machines/MachineIcon";
import { LottiePlayer } from "../../components/common/LottiePlayer";
import { PendingLabel } from "../../components/common/Spinner";
import { fmtAgo, fmtRemain } from "../../utils/time";
import { Link } from "react-router-dom";
import type { Booking } from "../../types";

const DOT_CLASS: Record<Booking["status"], string> = {
  available: "bg-success-ic",
  inuse: "bg-warn-ic",
  done: "bg-danger-ic",
};

export function MyMachinePage() {
  const { data: bookings } = useActiveBookings();
  const { extend, collect, cancel, resume } = useBookingActions();
  const now = useNow();
  const queryClient = useQueryClient();

  const refresh = useCallback(
    () => queryClient.refetchQueries({ queryKey: ['bookings'] }),
    [queryClient]
  );

  const running = bookings?.filter((b) => b.status === "inuse") ?? [];
  const doneList = bookings?.filter((b) => b.status === "done") ?? [];
  const mine = [...running, ...doneList];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (mine.length === 0) return;
    if (!selectedId || !mine.some((b) => b.id === selectedId))
      setSelectedId(mine[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);
  const selected = mine.find((b) => b.id === selectedId);

  const countLabel = [
    running.length ? `${running.length} running` : null,
    doneList.length ? `${doneList.length} ready to collect` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PullToRefresh onRefresh={refresh} className="scrollbar-none h-full overflow-y-auto pb-24">
      <div className="px-5.5 pb-2 pt-13.5">
        <div className="font-serif text-[28px] text-cream-900">My machines</div>
        {countLabel && (
          <div className="mt-0.5 text-[13px] text-cream-500">{countLabel}</div>
        )}
      </div>

      {mine.length > 0 && selected ? (
        <>
          {mine.length > 1 && (
            <div className="scrollbar-none flex gap-2 overflow-x-auto px-5.5 pb-1 pt-2.5">
              {mine.map((b) => {
                const active = b.id === selectedId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={`flex flex-none items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold transition-colors ${
                      active
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-cream-200 bg-white text-cream-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-none rounded-full ${active ? "bg-white" : DOT_CLASS[b.status]}`}
                    />
                    {b.machine.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-4 px-5.5 pb-5.5 pt-2.5">
            {(() => {
              const b = selected;
              const isRunning = b.status === "inuse";
              const notActuallyDone =
                !isRunning && new Date(b.endTime).getTime() > now;
              const pct = isRunning
                ? Math.max(
                    2,
                    Math.min(
                      100,
                      ((now - new Date(b.startTime).getTime()) /
                        (new Date(b.endTime).getTime() -
                          new Date(b.startTime).getTime())) *
                        100,
                    ),
                  )
                : 100;
              return (
                <div className="flex flex-col items-center gap-1.5 rounded-3xl bg-white px-5 py-6.5 text-center shadow-md">
                  {isRunning && (
                    <LottiePlayer
                      src="/Lottie/cat-waiting.json"
                      className="h-28 w-28"
                    />
                  )}
                  <CountdownRing pct={pct}>
                    <MachineIcon
                      name={isRunning ? "drum" : "check"}
                      size={isRunning ? 26 : 30}
                      spin={isRunning}
                      className="text-brand-500"
                    />
                    <div className="mt-0.5 font-mono text-[30px] font-bold tracking-tight text-cream-900">
                      {isRunning
                        ? fmtRemain(new Date(b.endTime).getTime() - now)
                        : "Done"}
                    </div>
                    <div className="text-xs text-cream-500">
                      {isRunning ? "remaining" : "ready to collect"}
                    </div>
                  </CountdownRing>
                  <div className="text-[19px] font-bold text-cream-900">
                    {b.machine.name}
                  </div>
                  <div className="text-[13px] text-cream-500">
                    {b.cycleMinutes} min cycle · started {fmtAgo(b.startTime)}
                  </div>

                  {isRunning && (
                    <div className="mt-4 w-full">
                      <div className="mb-2 flex items-center gap-1.5 text-left text-xs text-cream-500">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
                          <path d="M12 8v4" />
                          <path d="M8 12h8" />
                        </svg>
                        Machine acting up? Add time so it doesn't get marked
                        free.
                      </div>
                      <div className="flex gap-2">
                        {[5, 10, 15].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              extend.mutate({ id: b.id, minutes: m })
                            }
                            disabled={extend.isPending}
                            className="flex-1 rounded-[13px] border-[1.5px] border-cream-200 py-2.5 text-[13px] font-bold text-cream-800 disabled:opacity-60"
                          >
                            <PendingLabel pending={extend.isPending} size={14}>
                              +{m} min
                            </PendingLabel>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => cancel.mutate(b.id)}
                        disabled={cancel.isPending}
                        className="mt-2.5 w-full rounded-[13px] border-[1.5px] border-cream-200 py-2.5 text-[13px] font-bold text-cream-800 disabled:opacity-60"
                      >
                        <PendingLabel pending={cancel.isPending} size={15}>
                          Cancel wash &amp; release machine
                        </PendingLabel>
                      </button>
                    </div>
                  )}

                  {!isRunning && (
                    <div className="mt-4 flex w-full flex-col gap-3">
                      {notActuallyDone ? (
                        <div className="flex items-start gap-2 rounded-2xl bg-warn-bg px-3.5 py-3 text-left text-[12.5px] text-warn-ic">
                          <svg
                            width="16"
                            height="16"
                            className="mt-0.5 flex-none"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
                            <path d="M12 11v5" />
                            <path d="M12 8h.01" />
                          </svg>
                          A neighbour marked this done, but your timer still
                          shows time left.
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-2xl bg-success-bg px-3.5 py-3 text-left text-[12.5px] text-success-ic">
                          <svg
                            width="16"
                            height="16"
                            className="mt-0.5 flex-none"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
                            <path d="M8 12l2.5 2.5L16 9" />
                          </svg>
                          Your laundry is ready — please collect it.
                        </div>
                      )}
                      {notActuallyDone && (
                        <button
                          type="button"
                          onClick={() => resume.mutate(b.id)}
                          disabled={resume.isPending}
                          className="w-full rounded-2xl bg-linear-to-b from-brand-500 to-brand-600 py-4 text-[15.5px] font-bold text-white shadow-lg disabled:opacity-60"
                        >
                          <PendingLabel pending={resume.isPending}>
                            Not done yet — resume timer
                          </PendingLabel>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => collect.mutate(b.id)}
                        disabled={collect.isPending}
                        className={
                          notActuallyDone
                            ? "w-full rounded-2xl border-[1.5px] border-cream-200 bg-white py-4 text-[15px] font-bold text-cream-800 disabled:opacity-60"
                            : "w-full rounded-2xl bg-linear-to-b from-brand-500 to-brand-600 py-4 text-[15.5px] font-bold text-white shadow-lg disabled:opacity-60"
                        }
                      >
                        <PendingLabel pending={collect.isPending}>
                          Confirm pickup &amp; release
                        </PendingLabel>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 px-7.5 py-12 text-center">
          <div className="flex h-22 w-22 items-center justify-center rounded-[26px] bg-brand-lt text-brand-tx">
            <MachineIcon name="drum" size={42} />
          </div>
          <div>
            <div className="text-lg font-bold text-cream-900">
              No wash on the go
            </div>
            <div className="mt-1 max-w-[230px] text-[13.5px] text-cream-500">
              Grab a free machine from the dashboard to get started.
            </div>
          </div>
          <Link
            to="/app"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5.5 py-3.5 text-[14.5px] font-bold text-white"
          >
            Find a machine
          </Link>
        </div>
      )}
    </PullToRefresh>
  );
}
