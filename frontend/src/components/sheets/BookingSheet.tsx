import { useEffect, useState } from 'react';
import type { Machine } from '../../types';
import { MachineIcon } from '../machines/MachineIcon';
import { useBookingActions } from '../../hooks/useBookingActions';
import { useUiStore } from '../../store/uiStore';
import { Spinner } from '../common/Spinner';

export function BookingSheet({ machine }: { machine: Machine }) {
  const closeSheet = useUiStore((s) => s.closeSheet);
  const { start } = useBookingActions();
  const defaultProgram = machine.programs[1] ?? machine.programs[0];
  const [selected, setSelected] = useState(defaultProgram);
  const [minutes, setMinutes] = useState(defaultProgram?.minutes ?? 45);

  useEffect(() => {
    setSelected(defaultProgram);
    setMinutes(defaultProgram?.minutes ?? 45);
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
        <span className="rounded-full bg-success-ic px-2.5 py-1.5 text-[11px] font-bold text-white">Free</span>
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

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-cream-150 bg-cream-50 px-3.5 py-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-cream-500">Duration</div>
          <div className="mt-0.5 text-xs text-cream-400">fine-tune the timer</div>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => setMinutes((m) => Math.max(15, m - 5))}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-[11px] border border-cream-200 bg-white text-lg text-cream-700"
          >
            −
          </button>
          <span className="min-w-16 text-center font-mono text-lg font-bold text-cream-900">{minutes} min</span>
          <button
            type="button"
            onClick={() => setMinutes((m) => Math.min(120, m + 5))}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-[11px] border border-cream-200 bg-white text-lg text-cream-700"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={start.isPending}
        className="mt-4.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-brand-500 to-brand-600 py-4 text-[15.5px] font-bold text-white shadow-lg disabled:opacity-60"
      >
        {start.isPending ? (
          <>
            Starting
            <Spinner size={18} />
          </>
        ) : (
          `Start washing · ${minutes} min`
        )}
      </button>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-cream-400">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 11h12v9H6z" />
          <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
        </svg>
        Linked to you privately — others just see "in use".
      </div>
    </div>
  );
}
