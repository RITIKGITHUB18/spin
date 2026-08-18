import type { ReactNode } from 'react';

export function CountdownRing({ pct, children }: { pct: number; children: ReactNode }) {
  return (
    <div
      className="mb-1.5 flex h-[172px] w-[172px] items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--color-brand-500) ${pct}%, var(--color-cream-150) 0)` }}
    >
      <div className="flex h-[138px] w-[138px] flex-col items-center justify-center gap-0.5 rounded-full bg-white">
        {children}
      </div>
    </div>
  );
}
