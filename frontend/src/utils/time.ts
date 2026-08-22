export function fmtRemain(ms: number): string {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function fmtAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} hr${h > 1 ? 's' : ''} ago`;
}

/**
 * Timestamps are rendered in the building's timezone, not the device's, so a
 * resident checking from elsewhere still sees the time the machine actually
 * ran — matching the clock the sky already uses.
 */
const BUILDING_TZ = 'Asia/Kolkata';

/** Sortable Y-M-D in building time, for comparing calendar days. */
function dayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUILDING_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** "Today", "Yesterday", "15 Aug", or "15 Aug 2025" for other years. */
export function fmtDate(iso: string): string {
  const date = new Date(iso);
  const key = dayKey(date);
  if (key === dayKey(new Date())) return 'Today';
  if (key === dayKey(new Date(Date.now() - 86_400_000))) return 'Yesterday';
  // The year is only worth the space once it stops being the obvious one.
  const sameYear = key.slice(0, 4) === dayKey(new Date()).slice(0, 4);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUILDING_TZ,
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}

/** "9:15 pm" in building time. */
export function fmtClock(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUILDING_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(iso))
    .toLowerCase();
}

/**
 * "9:15 – 10:00 pm", or just the start when the cycle has not finished.
 *
 * `endTime` is always present on a booking, but for a running cycle it is only
 * the *projected* finish — showing it as an end time would state something that
 * has not happened yet, so it is omitted until the clock passes it.
 *
 * A shared am/pm is printed once: "1:27 am – 1:57 am" wastes the width these
 * rows do not have, and was truncating.
 */
export function fmtRunWindow(startIso: string, endIso: string | null): string {
  const start = fmtClock(startIso);
  if (!endIso) return start;
  if (new Date(endIso).getTime() > Date.now()) return start;

  const end = fmtClock(endIso);
  const startMeridiem = start.slice(-2);
  const compactStart = end.endsWith(startMeridiem) ? start.slice(0, -3) : start;
  return `${compactStart} – ${end}`;
}

/** Minutes as a wash length: "45 min", "1 h 30 min", "2 h". */
export function fmtDuration(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
