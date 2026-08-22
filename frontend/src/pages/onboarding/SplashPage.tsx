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

        // Wordmark types itself, holds, erases, repeats. autoAlpha rather than
        // opacity so each letter is also visibility:hidden between passes and
        // cannot be picked up by a screen reader mid-erase — the real word is
        // in the sr-only span alongside.
        const chars = gsap.utils.toArray<HTMLElement>('[data-char]');
        const carets = gsap.utils.toArray<HTMLElement>('[data-caret]');
        // `visibility` handles which caret is current; the blink below owns
        // `opacity`. Splitting the two properties keeps the two tweens from
        // fighting over the same value.
        const caretAt = (n: number) =>
          carets.forEach((c, i) => gsap.set(c, { visibility: i === n ? 'visible' : 'hidden' }));

        gsap.set(chars, { autoAlpha: 0 });
        caretAt(0);

        const TYPE = 0.14;
        const ERASE = 0.08;
        const HOLD = 1.8;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9 });

        // Letters snap in one at a time — a real duration would cross-fade
        // them, which reads as a fade-in rather than typing. The caret advances
        // on the same beat.
        chars.forEach((c, i) => {
          tl.set(c, { autoAlpha: 1 }, i * TYPE).call(caretAt, [i + 1], i * TYPE);
        });

        const typed = chars.length * TYPE;
        chars.forEach((_, j) => {
          const i = chars.length - 1 - j; // erase from the end
          const at = typed + HOLD + j * ERASE;
          tl.set(chars[i], { autoAlpha: 0 }, at).call(caretAt, [i], at);
        });
        tl.to({}, { duration: 0.01 }, typed + HOLD + chars.length * ERASE);

        // Blinks continuously, including through the hold, so the word never
        // looks finished-and-abandoned. steps(1) snaps rather than fades.
        gsap.to(carets, {
          opacity: 0,
          duration: 0.53,
          repeat: -1,
          yoyo: true,
          ease: 'steps(1)',
        });
      });

      // Reduced motion: hold them still, scattered up the page, so the
      // composition still reads without anything moving.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        bubbles.forEach((el, i) => {
          gsap.set(el, { y: -pageHeight() * (0.3 + i * 0.16), opacity: 1 });
        });
        // The wordmark reads as a wordmark, not a half-typed one.
        gsap.set('[data-char]', { autoAlpha: 1 });
        gsap.set('[data-caret]', { visibility: 'hidden' });
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
          {/* Split per character so the typing reveal can stagger. The letters
              stay in the DOM the whole time and are only made transparent, so
              the word always occupies its full width and the centred layout
              never jumps as it types. */}
          <div className="font-serif text-[52px] font-bold italic leading-[0.95]">
            <span className="sr-only">spin</span>
            <span aria-hidden="true" className="relative">
              {/* One caret per typing position, each absolutely placed at the
                  right edge of its letter (and one at the very start for the
                  empty state). Absolute so switching between them cannot shift
                  the line, and per-letter so the caret needs no measurement —
                  it lands exactly where the glyph ends whatever the font
                  metrics turn out to be. */}
              <span
                data-caret="0"
                className="absolute left-0 top-[0.12em] h-[0.72em] w-[0.055em] bg-cream-900"
              />
              {'spin'.split('').map((char, i) => (
                <span key={i} data-char className="relative inline-block">
                  {char}
                  <span
                    data-caret={i + 1}
                    className="absolute left-full top-[0.12em] ml-[0.03em] h-[0.72em] w-[0.055em] bg-cream-900"
                  />
                </span>
              ))}
            </span>
          </div>
          <div className="mt-2.5 max-w-[260px] text-[17px] leading-snug text-cream-500">
            your building's laundry room, finally drama-free.
          </div>
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-3.5">
        <Link
          to="/phone"
          className="flex w-full items-center justify-center gap-2 rounded-[18px] cta-surface py-4.5 text-[16.5px] font-semibold tracking-[1px] text-white"
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
