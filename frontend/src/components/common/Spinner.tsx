/**
 * The app's only loading indicator: a ring of tapered bars with a fading tail,
 * ticking round one segment at a time.
 *
 * Drawn in `currentColor` rather than a fixed tone so the same component works
 * on a dark CTA and on a white page — the caller's text colour carries it. The
 * fade comes from per-bar opacity, which composites correctly over any
 * background (a gradient stroke would not).
 */

const SEGMENTS = 20;
const STEP = 360 / SEGMENTS;

/** Bars are pre-computed: the geometry never changes, only the wrapper spins. */
const BARS = Array.from({ length: SEGMENTS }, (_, i) => ({
  angle: i * STEP,
  // Leading bar is solid and the tail thins out fast, which is what reads as
  // direction. Clamped so the faintest bar still hints at the full ring.
  opacity: Math.max(0.09, 1 - (i / SEGMENTS) * 1.05),
}));

interface SpinnerProps {
  /** Rendered size in px. Geometry is a 24px viewBox, so it scales cleanly. */
  size?: number;
  className?: string;
  /**
   * Announce to screen readers. Omit inside a button that already says what is
   * happening, or the state gets read out twice.
   */
  label?: string;
}

export function Spinner({ size = 18, className = '', label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={`inline-flex flex-none items-center justify-center ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spinner"
      >
        {BARS.map((bar) => (
          // Bars run from r=10.5 to r=5.7, leaving a hole a little over half
          // the radius. Shorter bars fill the middle in and it reads as a gear
          // rather than a ring.
          <rect
            key={bar.angle}
            x="11.25"
            y="1.5"
            width="1.5"
            height="4.8"
            rx="0.75"
            fill="currentColor"
            opacity={bar.opacity}
            transform={`rotate(${bar.angle} 12 12)`}
          />
        ))}
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

/**
 * Button label that grows a spinner while its action is in flight.
 *
 * Wraps the label in its own inline-flex row so it works in buttons that centre
 * text normally, without having to make every one of them a flex container.
 */
export function PendingLabel({
  pending,
  size = 17,
  children,
}: {
  pending: boolean;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      {children}
      {pending && <Spinner size={size} />}
    </span>
  );
}

/** Centred spinner for a section that has nothing to show yet. */
export function LoadingBlock({ label, className = '' }: { label: string; className?: string }) {
  return (
    // role lives on the wrapper: the label is already visible below the
    // spinner, so giving the spinner its own would announce it twice.
    <div role="status" className={`flex flex-col items-center justify-center gap-2.5 py-8 ${className}`}>
      <Spinner size={26} className="text-cream-400" />
      <span className="text-sm text-cream-400">{label}</span>
    </div>
  );
}
