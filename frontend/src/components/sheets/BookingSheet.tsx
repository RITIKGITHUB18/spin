import { useEffect, useState } from 'react';
import type { Machine } from '../../types';
import { fmtDuration } from '../../utils/time';
import { MachineIcon } from '../machines/MachineIcon';
import { useBookingActions } from '../../hooks/useBookingActions';
import { useUiStore } from '../../store/uiStore';
import { Spinner } from '../common/Spinner';
import { BottomSheet } from './BottomSheet';
import { WheelPicker, WheelBand } from '../common/WheelPicker';
import type { WheelOption } from '../common/WheelPicker';

/**
 * Duration is chosen as hours + minutes on two wheels. The backend accepts
 * 5-180 minutes, so the ceiling here is 2h55 -- the largest value the two
 * columns can express without a partly-disabled hour.
 */
const HOUR_OPTIONS: WheelOption<number>[] = [0, 1, 2].map((h) => ({ value: h, label: String(h) }));
const MINUTE_STEP = 5;
/** At zero hours the minutes cannot start at 00 -- a wash of no length. */
function minuteOptions(hours: number): WheelOption<number>[] {
  const first = hours === 0 ? MINUTE_STEP : 0;
  const out: WheelOption<number>[] = [];
  for (let m = first; m < 60; m += MINUTE_STEP) out.push({ value: m, label: String(m).padStart(2, '0') });
  return out;
}

/** Wheels can express 0-2h55; the backend accepts 5-180. */
function clampDuration(total: number): number {
  const snapped = Math.round(total / MINUTE_STEP) * MINUTE_STEP;
  return Math.max(MINUTE_STEP, Math.min(175, snapped));
}

export function BookingSheet({ machine }: { machine: Machine }) {
  const closeSheet = useUiStore((s) => s.closeSheet);
  const { start } = useBookingActions();
  const defaultProgram = machine.programs[1] ?? machine.programs[0];
  const [selected, setSelected] = useState(defaultProgram);
  const [minutes, setMinutes] = useState(clampDuration(defaultProgram?.minutes ?? 45));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const [durationOpen, setDurationOpen] = useState(false);

  useEffect(() => {
    setSelected(defaultProgram);
    setMinutes(clampDuration(defaultProgram?.minutes ?? 45));
  }, [machine.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    start.mutate(
      { machineId: machine.id, cycleLabel: selected?.label ?? 'Custom', cycleMinutes: minutes },
      { onSuccess: closeSheet }
    );
  }

  return (
    <div>
      <div className="mb-4.5 flex items-center gap-3.5">
        <div className="flex h-13 w-13 flex-none items-center justify-center rounded-2xl bg-brand-lt text-brand-tx">
          <MachineIcon name={machine.kind} />
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-cream-900">{machine.name}</div>
          <div className="text-[13px] text-cream-500">{machine.model}</div>
        </div>
        <span className="rounded-full border border-white/25 bg-success-ic px-2.5 py-1.5 text-[11px] font-semibold text-white">Free</span>
      </div>

      <span className="text-[11px] font-bold uppercase tracking-wide text-cream-500">Programs on this machine</span>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {machine.programs.map((p) => {
          const active = selected?.label === p.label;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setSelected(p);
                setMinutes(p.minutes);
              }}
              className={`flex flex-col items-start gap-0.5 rounded-2xl px-3.5 py-3 text-left ${
                active ? 'border-[1.5px] border-brand-500 bg-brand-lt' : 'border border-cream-200 bg-white'
              }`}
            >
              <span className="text-sm font-bold text-cream-900">{p.label}</span>
              <span className="text-xs text-cream-500">
                {p.desc} · {p.minutes} min
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary row, not the wheels themselves: the picker lives in its own
          sheet so the booking sheet stays short enough to read at a glance. */}
      <button
        type="button"
        onClick={() => setDurationOpen(true)}
        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-cream-150 bg-cream-50 px-3.5 py-3 text-left"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-cream-500">Duration</div>
          <div className="mt-0.5 text-xs text-cream-400">tap to fine-tune the timer</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-lg font-bold text-cream-900">{fmtDuration(minutes)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cream-400">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      </button>

      <button
        type="button"
        onClick={handleStart}
        disabled={start.isPending}
        data-busy={start.isPending || undefined}
        className="mt-4.5 flex w-full items-center justify-center gap-2 rounded-2xl cta-surface py-4 text-[15.5px] font-semibold tracking-[1px] text-white"
      >
        {start.isPending ? (
          <>
            Starting
            <Spinner size={18} />
          </>
        ) : (
          `Start washing · ${fmtDuration(minutes)}`
        )}
      </button>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-cream-400">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 11h12v9H6z" />
          <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
        </svg>
        Linked to you privately — others just see "in use".
      </div>

      {/* Stacked over the booking sheet rather than replacing it, so the
          machine and programme stay visible behind and the choice keeps its
          context. Changes commit as they are made -- dismissing by swipe or
          backdrop is a normal way out of a sheet, and it must not silently
          throw the selection away. */}
      <BottomSheet open={durationOpen} onClose={() => setDurationOpen(false)} layer={1} flush>
        <div className="text-center">
          <div className="text-lg font-bold text-cream-900">Wash duration</div>
          <div className="mt-0.5 text-xs text-cream-400">How long is this cycle?</div>
        </div>
        <div className="mt-3">
          <WheelBand>
            <WheelPicker
              label="Hours"
              options={HOUR_OPTIONS}
              value={hours}
              onChange={(h) => setMinutes(clampDuration(h * 60 + mins))}
              suffix="h"
            />
            <WheelPicker
              label="Minutes"
              options={minuteOptions(hours)}
              value={mins}
              onChange={(m) => setMinutes(clampDuration(hours * 60 + m))}
              suffix="min"
            />
          </WheelBand>
        </div>
        <button
          type="button"
          onClick={() => setDurationOpen(false)}
          className="mt-4 w-full rounded-2xl cta-surface py-4 text-[15.5px] font-semibold tracking-[1px] text-white"
        >
          Done · {fmtDuration(minutes)}
        </button>
      </BottomSheet>
    </div>
  );
}
