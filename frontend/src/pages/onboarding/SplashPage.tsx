import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { LottiePlayer } from '../../components/common/LottiePlayer';

gsap.registerPlugin(useGSAP);

// Bubbles start just below the fold and drift up past the top, like a wash
// cycle. `left` is a percentage so the layout holds on any width.
const BUBBLES = [
  { size: 200, left: '2%', duration: 15, delay: 0, drift: 20, filled: false },
  { size: 62, left: '74%', duration: 10, delay: 2.4, drift: -16, filled: true },
  { size: 140, left: '52%', duration: 18, delay: 5.2, drift: 24, filled: false },
  { size: 34, left: '24%', duration: 9, delay: 7.8, drift: -12, filled: true },
];

export function SplashPage() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const bubbles = gsap.utils.toArray<HTMLElement>('[data-bubble]');
      const pageHeight = () => sceneRef.current?.offsetHeight ?? window.innerHeight;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        bubbles.forEach((el) => {
          const size = Number(el.dataset.size);
          const duration = Number(el.dataset.duration);
          const delay = Number(el.dataset.delay);
          const drift = Number(el.dataset.drift);

          gsap
            .timeline({ repeat: -1, delay })
            // Linear rise so the loop seam is invisible.
            .to(el, { y: -(pageHeight() + size * 2), duration, ease: 'none' }, 0)
            .fromTo(el, { opacity: 0 }, { opacity: 1, duration: duration * 0.18, ease: 'none' }, 0)
            .to(el, { opacity: 0, duration: duration * 0.22, ease: 'none' }, duration * 0.78)
            .to(el, { x: drift, duration: duration / 2, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 0);
        });
      });

      // Reduced motion: hold them still, scattered up the page, so the
      // composition still reads without anything moving.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        bubbles.forEach((el, i) => {
          gsap.set(el, { y: -pageHeight() * (0.3 + i * 0.16), opacity: 1 });
        });
      });

      return () => mm.revert();
    },
    { scope: sceneRef }
  );

  return (
    <div
      ref={sceneRef}
      className="relative flex min-h-svh flex-col justify-between overflow-hidden bg-cream-50 px-7.5 pb-10 pt-16 text-cream-900"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {BUBBLES.map((b) => (
          <span
            key={b.left + b.size}
            data-bubble
            data-size={b.size}
            data-duration={b.duration}
            data-delay={b.delay}
            data-drift={b.drift}
            style={{
              width: b.size,
              height: b.size,
              left: b.left,
              bottom: -b.size,
              opacity: 0,
              willChange: 'transform, opacity',
            }}
            className={`absolute rounded-full ${b.filled ? 'bg-cream-100' : 'border border-cream-150'}`}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        {/* The artboard is 600x800 with wide built-in margins, so it letterboxes
            in a square tile. Scaling up fills the tile; overflow-hidden clips
            the empty artboard edges, not the machine itself. */}
        <div className="flex h-58 w-58 items-center justify-center overflow-hidden rounded-[32px] border border-cream-150 bg-cream-100">
          <LottiePlayer src="/Lottie/washing-machine.json" className="h-full w-full scale-[1.5]" />
        </div>
        <div>
          <div className="font-serif text-[52px] italic leading-[0.95]">spin</div>
          <div className="mt-2.5 max-w-[260px] text-[17px] leading-snug text-cream-500">
            your building's laundry room, finally drama-free.
          </div>
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-3.5">
        <Link
          to="/phone"
          className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-b from-brand-500 to-brand-600 py-4.5 text-[16.5px] font-bold text-white shadow-lg"
        >
          Get started
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </Link>
        <div className="flex items-center justify-center gap-1.5 text-[12.5px] text-cream-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 11h12v9H6z" />
            <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
          </svg>
          secure phone-number login
        </div>
      </div>
    </div>
  );
}
