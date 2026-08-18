import { Suspense, lazy, useEffect, useState } from 'react';
import type { ComponentType, CSSProperties } from 'react';

/**
 * The player is loaded on demand rather than imported at the top level.
 *
 * lottie-web is the single largest dependency here (~185kB of the bundle), and
 * nothing on first paint needs it — every caller already tolerates an empty box
 * while the animation JSON is fetched, so the library can arrive on the same
 * schedule instead of blocking the initial parse.
 *
 * Vite's CJS/ESM interop for lottie-react's build sometimes yields the module
 * namespace object (with a `.default`) instead of the component itself.
 */
const Lottie = lazy(async () => {
  const mod: unknown = await import('lottie-react');
  // Vite's CJS interop can nest the component one or two levels deep, so unwrap
  // `.default` until a callable turns up rather than assuming a fixed depth —
  // handing React a namespace object fails with "Element type is invalid".
  let candidate: unknown = mod;
  for (let i = 0; i < 3 && typeof candidate !== 'function'; i += 1) {
    const next = (candidate as { default?: unknown } | null)?.default;
    if (next === undefined) break;
    candidate = next;
  }
  if (typeof candidate !== 'function') throw new Error('lottie-react: no component export found');
  return { default: candidate as ComponentType<Record<string, unknown>> };
});

const cache = new Map<string, unknown>();

export function LottiePlayer({
  src,
  loop = true,
  className,
  style,
}: {
  src: string;
  loop?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [data, setData] = useState<unknown>(cache.get(src) ?? null);

  useEffect(() => {
    if (cache.has(src)) {
      setData(cache.get(src));
      return;
    }
    let cancelled = false;
    fetch(src)
      .then((res) => res.json())
      .then((json) => {
        cache.set(src, json);
        if (!cancelled) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  const placeholder = <div className={className} style={style} />;
  if (!data) return placeholder;

  return (
    <Suspense fallback={placeholder}>
      <Lottie animationData={data} loop={loop} className={className} style={style} />
    </Suspense>
  );
}
