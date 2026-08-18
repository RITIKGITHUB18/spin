import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// The incoming page slides in from the right and covers the outgoing one, which
// holds its position underneath until the transition finishes. Both pages are
// mounted at once and absolutely positioned so they overlap, and the wrapper is
// opaque so the page underneath never shows through.
//
// Only ever wrap page content — never a subtree containing position:fixed
// elements. The transform here becomes their containing block and would pin
// them to the page instead of the viewport.
const SLIDE = {
  initial: { x: '100%', zIndex: 2 },
  animate: { x: 0, zIndex: 2 },
  // The outgoing page drifts a little left (a depth cue under the incoming
  // one). This has to be a real movement: an exit variant with nothing to
  // animate settles in ~0ms, so the page would unmount instantly and leave a
  // blank gap instead of staying put until the new page has covered it.
  exit: { x: '-12%', zIndex: 1 },
};

const FADE = {
  initial: { opacity: 0, zIndex: 2 },
  animate: { opacity: 1, zIndex: 2 },
  exit: { opacity: 0, zIndex: 1 },
};

// Sits just off the left edge at rest, so it is only visible mid-slide.
const SHADOW = { boxShadow: '-14px 0 30px rgba(0, 0, 0, 0.10)' };

export function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute inset-0 bg-cream-50"
      style={SHADOW}
      variants={reduceMotion ? FADE : SLIDE}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: reduceMotion ? 0.15 : 0.34,
        ease: [0.22, 1, 0.36, 1],
        // Restack instantly; a tweened z-index would let the outgoing page
        // sit on top for part of the transition.
        zIndex: { duration: 0 },
      }}
    >
      {children}
    </motion.div>
  );
}
