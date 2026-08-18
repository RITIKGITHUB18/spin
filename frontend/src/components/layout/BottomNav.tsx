import { memo, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}
function DrumIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
      <path d="M12 3v3.2" />
      <path d="M9.3 11a1 1 0 1 0 2 0 1 1 0 1 0-2 0" />
      <path d="M12.5 13.6a1 1 0 1 0 2 0 1 1 0 1 0-2 0" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
      <path d="M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0" />
    </svg>
  );
}

const TABS = [
  { to: '/app', label: 'Home', icon: HomeIcon, end: true },
  { to: '/app/mine', label: 'My machine', icon: DrumIcon, end: false },
  { to: '/app/profile', label: 'Profile', icon: ProfileIcon, end: false },
];

/**
 * Memoised so the bar itself stays put while navigating. AppShell re-renders on
 * every route change (and on any query refetch), which would otherwise re-render
 * the whole nav. The active highlight still updates: each NavLink subscribes to
 * the router directly, so it re-renders on its own regardless of this memo.
 *
 * `search` is carried through to every tab so the dev sky override (?hr=&wx=)
 * survives navigation — without it, switching tabs silently dropped the query
 * string and the sky reverted to live weather mid-preview. It arrives as a prop
 * rather than from useLocation() so the memo still holds: the string is
 * identical across tab switches, so the bar does not re-render.
 *
 * `mineDot` is a plain boolean, so the memo only breaks when it genuinely flips.
 */
export const BottomNav = memo(function BottomNav({
  mineDot,
  search = '',
}: {
  mineDot: boolean;
  search?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Publishes the bar's height as --nav-h so overlays (the bottom sheet) can sit
  // on top of it rather than over it. Measured rather than hard-coded because
  // the height moves with env(safe-area-inset-bottom) — a fixed number would be
  // wrong on any device with a home indicator.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // Matches the app column (see App.tsx) rather than the viewport, so the
    // arc's points land on the column's edges. `inset-x-0 mx-auto` centres it
    // without a transform — a transform here would make this the containing
    // block for anything fixed inside it.
    // z-[52] puts the bar above the sheet (51) and its scrim (50) so the sheet
    // tucks behind it, and below the toast (60) and push banner (70). Because
    // it now sits above the scrim it stays lit and tappable while a sheet is
    // open — AppShell closes the sheet on navigation so you cannot end up on
    // another tab with a stale sheet still raised.
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-[52] mx-auto w-full max-w-md">
      {/* The arc clips ~13px off the top of the bar, and the routed page sits
          directly behind that gap — so during a slide transition the page's
          leading box-shadow swept across it and the whole bar appeared to move.
          This opaque panel is unclipped and never animates, so the gap now
          shows a static background instead of the page travelling behind it. */}
      <div aria-hidden="true" className="absolute inset-0 bg-cream-50" />

      {/* The arc clips the top ~15%, so pt-5 keeps the icons clear of the cut.
          No border-t: a top border would be clipped away with it. */}
      <div
        className="clip-nav-arc relative flex w-full px-3.5 pt-5"
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #292929 115.79%)',
          // index.html sets viewport-fit=cover, so the bar paints under the home
          // indicator; pad it back so the labels are not sitting beneath it.
          paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))',
        }}
      >
      {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={{ pathname: to, search }}
            end={end}
            className="flex flex-1 items-center justify-center"
          >
          {({ isActive }) => (
            <span
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 ${
                // Inverted for the dark bar: cream-500 only reaches 4.0:1 on
                // black, cream-400 clears AA at ~7:1.
                isActive ? 'bg-brand-lt text-brand-tx' : 'text-cream-400'
              }`}
            >
              <span className="relative">
                <Icon />
                {label === 'My machine' && mineDot && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-cream-900 bg-white" />
                )}
              </span>
              <span className="text-[10.5px] font-bold">{label}</span>
            </span>
          )}
          </NavLink>
        ))}
      </div>
    </div>
  );
});
