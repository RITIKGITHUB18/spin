import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * iOS-style scroll wheel: a column that snaps to a highlighted centre row, with
 * neighbours dimming and shrinking away toward faded edges.
 *
 * Snapping is CSS `scroll-snap`, not a JS drag handler. The native scroller
 * keeps platform momentum and rubber-banding, stays interruptible mid-fling,
 * and works with a trackpad, a wheel and touch without three code paths. It
 * also cannot fight the sheet: BottomSheet drags only from its handle
 * (`dragListener={false}`), so vertical scrolling inside the content is free.
 *
 * Generic over the option value so the same wheel drives hours, minutes, or an
 * AM/PM column.
 */

export interface WheelOption<T> {
  value: T;
  label: string;
}

/** Row height in px. Also the snap interval, so index = scrollTop / this. */
const ITEM_H = 38;
/** Rows visible at once. Odd, so exactly one sits centred. */
const VISIBLE = 5;
/** Fallback debounce for browsers without `scrollend`. */
const SETTLE_MS = 90;

export function WheelPicker<T extends string | number>({
  options,
  value,
  onChange,
  label,
  suffix,
  width = 54,
}: {
  options: WheelOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name; not rendered. */
  label: string;
  /** Static unit shown beside the centre row, e.g. "h" or "min". */
  suffix?: string;
  /** Column width. Fixed so digits line up and columns cannot crowd. */
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  // Which row the user has scrolled to, tracked live so neighbours can dim
  // during the fling rather than only after it settles.
  const [activeIndex, setActiveIndex] = useState(index);
  // Set while we scroll the list ourselves, so the resulting scroll events are
  // not read back as a user choice — that feedback loop fights the user mid-drag.
  const selfScroll = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToIndex = useCallback((i: number, smooth: boolean) => {
    const el = ref.current;
    if (!el) return;
    selfScroll.current = true;
    el.scrollTo({ top: i * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
    // Released on a timer rather than a scroll listener: a scrollTo that lands
    // exactly where we already are emits no scroll event at all, which would
    // leave the flag stuck on and deafen the wheel to real input.
    window.setTimeout(() => { selfScroll.current = false; }, smooth ? 320 : 60);
  }, []);

  // Follow the value when it changes from outside (picking a programme resets
  // the duration). Skipped while the user is mid-scroll on this wheel.
  useEffect(() => {
    if (index !== activeIndex && !selfScroll.current) {
      setActiveIndex(index);
      scrollToIndex(index, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Initial position, without animating in.
  useEffect(() => {
    scrollToIndex(index, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_H)));
    setActiveIndex(i);
    const picked = options[i];
    if (picked && picked.value !== value) onChange(picked.value);
  }, [options, value, onChange]);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Live highlight, so the centre row lights up as it passes under the band.
    const i = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_H)));
    setActiveIndex(i);
    if (selfScroll.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(commit, SETTLE_MS);
  }, [commit, options.length]);

  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(options.length - 1, index + delta));
    if (next === index) return;
    setActiveIndex(next);
    scrollToIndex(next, true);
    onChange(options[next].value);
  }

  const pad = ((VISIBLE - 1) / 2) * ITEM_H;

  return (
    <div className="flex items-center gap-1.5" style={{ height: VISIBLE * ITEM_H }}>
      <div
        ref={ref}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`${label}-${activeIndex}`}
        className="scrollbar-none h-full snap-y snap-mandatory overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        style={{
          width,
          // Fades the ends instead of drawing a hard cut, so rows leave the
          // wheel rather than vanishing at a border.
          maskImage:
            'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
          scrollSnapType: 'y mandatory',
        }}
      >
        <div style={{ height: pad }} aria-hidden />
        {options.map((o, i) => {
          const d = Math.abs(i - activeIndex);
          const selected = i === activeIndex;
          return (
            <div
              key={String(o.value)}
              id={`${label}-${i}`}
              role="option"
              aria-selected={selected}
              className="flex snap-center items-center justify-center transition-[opacity,transform] duration-150"
              style={{
                height: ITEM_H,
                scrollSnapAlign: 'center',
                // Depth by distance: the further from the centre band, the
                // dimmer and smaller, which is what reads as a wheel rather
                // than a list.
                opacity: d === 0 ? 1 : d === 1 ? 0.45 : d === 2 ? 0.22 : 0.12,
                transform: `scale(${d === 0 ? 1 : d === 1 ? 0.88 : 0.78})`,
              }}
            >
              <span
                className={`font-mono tabular-nums ${
                  selected
                    ? 'text-[22px] font-bold text-cream-900'
                    : 'text-[19px] font-semibold text-cream-700'
                }`}
              >
                {o.label}
              </span>
            </div>
          );
        })}
        <div style={{ height: pad }} aria-hidden />
      </div>

      {/* Unit sits beside the column as a flex sibling, not absolutely placed
          over it: positioned absolutely it landed on top of the next column and
          was invisible. Outside the scroller it also escapes the fade mask, so
          it stays legible while rows dim past it. */}
      {suffix && (
        <span className="pointer-events-none text-[12px] font-bold text-cream-500" aria-hidden>
          {suffix}
        </span>
      )}
    </div>
  );
}

/**
 * The centre band, drawn once behind a row of wheels so the highlight is
 * continuous across columns instead of each wheel painting its own.
 */
export function WheelBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-[14px] bg-cream-100"
        style={{ height: ITEM_H }}
        aria-hidden
      />
      <div className="relative flex items-center justify-center gap-5">{children}</div>
    </div>
  );
}
