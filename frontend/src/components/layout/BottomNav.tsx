import { memo, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

/**
 * 3D renders rather than stroke icons, with a separate cut per state. They
 * arrived as opaque-white PNGs, so the white ground was flood-filled to
 * transparency — dropped in as supplied they would have been white squares on
 * this black bar.
 */
function NavIcon({ name, active }: { name: 'home' | 'machine' | 'profile'; active: boolean }) {
  return (
    <img
      src={`/img/nav/${name}-${active ? 'active' : 'inactive'}.png`}
      alt=""
      width={26}
      height={26}
      // The art is light grey and cannot carry a colour change, so the states
      // are told apart by brightness instead: full strength when active,
      // dimmed when not.
      className={`block h-[26px] w-[26px] object-contain ${active ? 'opacity-100' : 'opacity-45'}`}
    />
  );
}

const TABS = [
  { to: '/app', label: 'Home', icon: 'home', end: true },
  { to: '/app/mine', label: 'My machine', icon: 'machine', end: false },
  { to: '/app/profile', label: 'Profile', icon: 'profile', end: false },
] as const;

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
      {TABS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={{ pathname: to, search }}
            end={end}
            className="flex flex-1 items-center justify-center"
          >
          {({ isActive }) => (
            <span
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 ${
                // No pill behind the active tab. The icons are light grey, so
                // the old light #f0f0f0 pill hid the active one entirely; a
                // dark pill worked but crowded three 3D renders into small
                // boxes. Brightness carries the state instead — full-strength
                // icon and a white label against a dimmed 45% icon and
                // cream-400, which still clears AA at ~7:1 on black.
                // The padding stays: it is the tap target, not decoration.
                isActive ? 'text-white' : 'text-cream-400'
              }`}
            >
              <span className="relative">
                <NavIcon name={icon} active={isActive} />
                {label === 'My machine' && mineDot && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-cream-900 bg-white" />
                )}
              </span>
              {/* 0.7px, not the 1px used on CTAs: that is 0.065em at their 15.5px, and
                  the same ratio at 10.5px is 0.7px. Copying the absolute value
                  would space these labels half again as wide as the buttons.
                  nowrap because "My machine" is the long one and a wrap here
                  would push the bar taller. */}
              <span className="whitespace-nowrap text-[10.5px] font-bold tracking-[0.7px]">{label}</span>
            </span>
          )}
          </NavLink>
        ))}
      </div>
    </div>
  );
});
