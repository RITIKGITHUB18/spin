import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';

/**
 * The app's one sheet surface — machine booking, machine management and the
 * notification list all mount through it.
 *
 * Square-cornered with NeoPOP's extruded top lip. Square and unblurred on
 * purpose: the lip is geometry, and a rounded corner would curve away from the
 * skewed strips while a blurred box-shadow would sit under a hard edge and read
 * as two competing depth cues.
 *
 * The behaviour neopop-web's BottomSheet provides — drag to dismiss, a spring
 * back when the drag is too small, and a body-scroll lock while open — built on
 * framer-motion, which is already a dependency. Taking the library itself would
 * have meant styled-components v5 and @react-spring alongside it, and its peer
 * range stops at React 18 while this app runs 19.
 */

/**
 * Ids of every open sheet, deepest first. Sheets can stack -- the duration
 * picker opens over the booking sheet -- and without this every open sheet
 * would answer the same Escape keypress, collapsing the whole stack at once
 * when the user meant to close only the top one.
 */
const openStack: symbol[] = [];

/** Past this, releasing dismisses. Roughly a third of a short sheet. */
const DISMISS_DISTANCE = 96;
/** A fast flick dismisses even if it never travelled far. */
const DISMISS_VELOCITY = 620;

export function BottomSheet({
  open,
  onClose,
  children,
  tall = false,
  layer = 0,
  flush = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * Tall sheets reach up the screen and own their own scroll area — the
   * notification list. Default sheets hug their content and sit above the nav.
   */
  tall?: boolean;
  /**
   * Stacking depth. 0 is a sheet over the page; 1 sits over another sheet.
   * Only affects paint order and scrim weight -- a stacked sheet keeps the same
   * drag, Escape and scroll-lock behaviour as any other.
   */
  layer?: 0 | 1;
  /**
   * The sheet's last child is a full-width CTA that should sit against the
   * bottom edge. Trims the bottom padding and drops the CTA's shadow: the sheet
   * ends only 12px below the button and the nav bar clips whatever is left, so
   * a downward shadow has nowhere to fall and pools in the gap as a smudge
   * rather than reading as depth.
   */
  flush?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    // Without this the page behind scrolls under the sheet on iOS, and the
    // sheet appears to drift while the finger is still on it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Registering on open rather than on mount keeps the stack ordered by when
    // sheets actually appeared, which is the order Escape has to unwind.
    const id = Symbol('sheet');
    openStack.push(id);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Topmost only. Otherwise one Escape closes the picker and the booking
      // sheet underneath it in the same keypress.
      if (openStack[openStack.length - 1] !== id) return;
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      // Restores whatever was set before this sheet opened. When stacked that
      // is the outer sheet's own 'hidden', so closing the inner one does not
      // hand scrolling back to the page while the outer sheet is still up.
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      const at = openStack.lastIndexOf(id);
      if (at !== -1) openStack.splice(at, 1);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Darker than it looks it needs to be: the sheet is square and carries no
            // blurred shadow, so separation from the page has to come from the
            // backdrop. neopop uses black at 0.9; 0.6 reads as dark while still
            // showing the screen behind it.
            className={
              layer === 0
                ? 'fixed inset-0 z-50 bg-cream-900/60'
                // Lighter when stacked: a second 60% scrim over the first lands
                // at ~84% and reads as solid black, losing the sense that the
                // booking sheet is still there underneath.
                : 'fixed inset-0 z-[60] bg-cream-900/35'
            }
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            data-flush={flush || undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            drag={reduceMotion ? false : 'y'}
            // Listener off, drag started from the handle instead: dragging from
            // anywhere fights scrollable content, so a tall sheet's list could
            // never be scrolled — the gesture would drag the sheet instead.
            dragListener={false}
            dragControls={dragControls}
            // Both edges pinned to 0 so releasing springs back to rest; the
            // asymmetric elasticity is what allows downward travel at all while
            // refusing to let the sheet be hauled up past its resting position.
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              // Distance OR speed: a slow deliberate pull and a quick flick are
              // both "dismiss", and requiring distance alone makes flicks feel
              // ignored.
              if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
                onClose();
              }
            }}
            className={[
              'fixed inset-x-0 mx-auto flex max-w-md flex-col bg-white pt-2.5',
              layer === 0 ? 'z-[51]' : 'z-[61]',
              // Tall runs to the screen bottom and covers the nav. Default hugs
              // its content and tucks 12px behind the bar so the lip does not
              // meet it on a visible seam; --nav-h is published by BottomNav and
              // tracks the safe-area inset.
              tall
                // Runs to bottom-0 so the sheet's ground reaches the screen
                // edge, but its CONTENT is inset by the full height of the nav.
                // BottomNav sits at z-[52], deliberately ABOVE this sheet, so
                // without the inset the bar paints over the last rows: they can
                // never be scrolled into view and a swipe down there lands on
                // the bar instead of the list, which reads as the scroll being
                // stuck. --nav-h is measured and already includes the bar's own
                // safe-area padding, so it covers the home indicator too and
                // must not be added to env(safe-area-inset-bottom) again.
                ? 'bottom-0 top-32 pb-[var(--nav-h,0px)]'
                : `bottom-[calc(var(--nav-h,0px)-12px)] px-6 ${flush ? 'pb-3.5' : 'pb-6'}`,
              // NeoPOP's own BottomSheet edge, copied from its ::before/::after:
              // two 4px strips sitting 3.5px above the sheet, each 55% wide and
              // skewed 45deg in opposite directions so they meet in a mitre.
              // That mitre is why it reads as a solid lip rather than a line.
              "before:absolute before:right-0 before:-top-[3.5px] before:z-[1] before:mr-[1.5px] before:h-1 before:w-[55%] before:skew-x-[45deg] before:bg-[#c4c4c4] before:content-['']",
              "after:absolute after:left-0 after:-top-[3.5px] after:z-[1] after:ml-[1.5px] after:h-1 after:w-[55%] after:-skew-x-[45deg] after:bg-[#c4c4c4] after:content-['']",
            ].join(' ')}
          >
            {/* The only drag surface, so `touch-none` belongs here rather than
                on the sheet — there it would stop content scrolling entirely.
                Generous target: it is the affordance as well as the grip. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto mb-4 h-1.5 w-11 flex-none cursor-grab touch-none rounded-full bg-cream-200 active:cursor-grabbing"
            />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
