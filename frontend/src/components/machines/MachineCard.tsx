import type { Machine } from '../../types';
import { MachineIcon } from './MachineIcon';
import { fmtAgo, fmtRemain } from '../../utils/time';
import { useUiStore } from '../../store/uiStore';

// Every card sits on white; the border weight carries the state instead of a
// fill, so the page reads as one uninterrupted white surface.
const CARD_CLASS: Record<Machine['status'], string> = {
  available: 'bg-white border border-cream-150',
  inuse: 'bg-white border border-cream-200',
  done: 'bg-white border border-cream-300',
};
// Tinted to match the status pill, so the card carries its state twice — once
// at the icon and once at the pill — and stays scannable down a long list.
const ICON_WRAP_CLASS: Record<Machine['status'], string> = {
  available: 'bg-success-bg text-success-ic',
  inuse: 'bg-warn-bg text-warn-ic',
  done: 'bg-danger-bg text-danger-ic',
};
const PILL_CLASS: Record<Machine['status'], string> = {
  available: 'bg-success-ic',
  inuse: 'bg-warn-ic',
  done: 'bg-danger-ic',
};
const LABEL: Record<Machine['status'], string> = { available: 'Free', inuse: 'In use', done: 'Done' };

export function MachineCard({ machine, now }: { machine: Machine; now: number }) {
  const openSheet = useUiStore((s) => s.openSheet);

  let sub: string;
  let right: string;
  let rightMono = false;
  let pillIcon: 'check' | 'clock' | 'bell';

  if (machine.status === 'available') {
    sub = `${machine.model} · ready`;
    right = 'Tap to start';
    pillIcon = 'check';
  } else if (machine.status === 'inuse') {
    sub = `Started ${fmtAgo(machine.startTime!)}`;
    right = `${fmtRemain(new Date(machine.endTime!).getTime() - now)} left`;
    rightMono = true;
    pillIcon = 'clock';
  } else {
    sub = `Finished ${fmtAgo(machine.endTime!)}`;
    right = 'Needs pickup';
    pillIcon = 'bell';
  }

  return (
    <button
      type="button"
      onClick={() => openSheet(machine.status === 'available' ? 'book' : 'manage', machine.id)}
      className={`flex w-full items-center gap-3.5 rounded-[20px] p-4 text-left active:scale-[0.985] transition-transform ${CARD_CLASS[machine.status]}`}
    >
      {/* Inset rather than filling the tile: at 54px the machine needs air
          around it or it reads as a smudge. alt is empty because the machine's
          name sits right beside it — announcing "washing machine" here would
          just repeat it. */}
      <div className={`flex h-[54px] w-[54px] flex-none items-center justify-center overflow-hidden rounded-2xl ${ICON_WRAP_CLASS[machine.status]}`}>
        <img src="/img/washer.png" alt="" className="h-[86%] w-auto object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[16px] font-bold text-cream-900">{machine.name}</span>
          {machine.isMine && (
            <span className="rounded-full bg-brand-lt px-2 py-0.5 text-[10px] font-bold text-brand-tx">YOU</span>
          )}
        </div>
        <div className="mt-0.5 text-[12.5px] text-cream-500">{sub}</div>
      </div>
      <div className="flex flex-none flex-col items-end gap-1.5">
        {/* The glyph is deliberately small with a heavy stroke: at 12px and the
            default hairline it read as a different weight to the label beside
            it, so the two looked stuck together rather than designed. 600
            rather than 700 for the same reason — Bold at 11px is a slab. */}
        <span className={`inline-flex items-center gap-1.25 rounded-full border border-white/25 px-2.25 py-0.75 text-[11px] font-semibold text-white ${PILL_CLASS[machine.status]}`}>
          {pillIcon === 'check' && <MachineIcon name="check" size={10} strokeWidth={2.6} />}
          {pillIcon === 'bell' && <MachineIcon name="bell" size={10} strokeWidth={2.2} />}
          {pillIcon === 'clock' && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
              <path d="M12 8v4l2.5 1.5" />
            </svg>
          )}
          {LABEL[machine.status]}
        </span>
        <span className={`text-[13px] font-semibold text-cream-700 ${rightMono ? 'font-mono' : ''}`}>{right}</span>
      </div>
    </button>
  );
}
