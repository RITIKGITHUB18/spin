import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Spinner } from './Spinner';

/**
 * Scroll container with pull-to-refresh.
 *
 * Replaces interval polling: the data here only changes when a person acts on
 * a machine, so refetching on a timer spent requests on nothing happening.
 * A pull is an explicit "show me now", which is both cheaper and clearer.
 *
 * The touch listeners are attached manually rather than through React props
 * because preventDefault() is required to stop the browser's own rubber-band
 * from fighting the gesture, and React attaches touchmove passively — where
 * preventDefault is a no-op that only logs a console error.
 */

/** Distance the finger must travel (after resistance) to arm a refresh. */
const THRESHOLD = 68;
/** Cap so a long drag cannot push the content off-screen. */
const MAX_PULL = 110;
/** Where the indicator parks while the request is in flight. */
const RESTING = 52;
/** Pull is damped so it tracks the finger without matching it 1:1. */
const RESISTANCE = 0.5;

export function PullToRefresh({
  onRefresh,
  className,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  className?: string;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Read inside listeners without re-subscribing them on every state change.
  const refreshingRef = useRef(false);

  const run = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setPull(RESTING);
    try {
      await onRefresh();
    } catch {
      // A failed refresh must still release the indicator; the page keeps
      // whatever data it already had.
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setPull(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only arm at the very top, or a mid-list drag would hijack scrolling.
      if (el.scrollTop > 0 || refreshingRef.current) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0 || el.scrollTop > 0) {
        setPull(0);
        return;
      }
      e.preventDefault();
      setPull(Math.min(MAX_PULL, delta * RESISTANCE));
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      setPull((current) => {
        if (current >= THRESHOLD) void run();
        return current >= THRESHOLD ? RESTING : 0;
      });
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    // passive:false so preventDefault actually suppresses the native bounce.
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [run]);

  const armed = pull >= THRESHOLD;

  return (
    <div className="relative h-svh overflow-hidden">
      <div
        aria-hidden={!refreshing}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{
          transform: `translateY(${Math.max(0, pull - 34)}px)`,
          opacity: Math.min(1, pull / THRESHOLD),
          transition: startY.current === null ? 'transform 220ms ease, opacity 220ms ease' : 'none',
        }}
      >
        <span className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md">
          {/* Before the threshold the ring is a static hint; it only starts
              turning once a release would actually refresh. */}
          <Spinner size={17} className={armed || refreshing ? 'text-cream-700' : 'text-cream-400 [&_svg]:animate-none'} />
        </span>
      </div>

      <div
        ref={scrollRef}
        className={className}
        style={{
          transform: `translateY(${pull}px)`,
          transition: startY.current === null ? 'transform 220ms ease' : 'none',
          // Stops Chrome's own page-level pull-to-refresh competing with ours.
          overscrollBehaviorY: 'contain',
        }}
      >
        {children}
      </div>
    </div>
  );
}
