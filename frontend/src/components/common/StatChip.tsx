export function StatStrip({ free, busy, done }: { free: number; busy: number; done: number }) {
  const items: { value: number; label: string; color: string }[] = [
    { value: free, label: 'free', color: 'text-success-ic' },
    { value: busy, label: 'in use', color: 'text-warn-ic' },
    { value: done, label: 'done', color: 'text-danger-ic' },
  ];
  return (
    <div className="flex rounded-[20px] bg-white p-4 shadow-md">
      {items.map((it, i) => (
        <div key={it.label} className="flex flex-1 items-center">
          {i > 0 && <div className="mr-0 h-8 w-px bg-cream-150" />}
          <div className="flex flex-1 flex-col items-center gap-0.5">
            <span className={`font-serif text-[28px] leading-none ${it.color}`}>{it.value}</span>
            <span className="text-[11.5px] font-semibold text-cream-500">{it.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
