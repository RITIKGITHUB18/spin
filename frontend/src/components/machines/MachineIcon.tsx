const PATHS: Record<'wash' | 'dry' | 'drum' | 'check' | 'bell', string[]> = {
  wash: ['M5 3h14v18H5z', 'M8 6.3h.01', 'M11 6.3h.01', 'M7 14a5 5 0 1 0 10 0 5 5 0 1 0-10 0', 'M10.5 14a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0'],
  dry: ['M5 3h14v18H5z', 'M8 6.3h.01', 'M11 6.3h.01', 'M7 14a5 5 0 1 0 10 0 5 5 0 1 0-10 0', 'M9.5 14h5', 'M10.5 16.5h3'],
  drum: ['M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0', 'M12 3v3.2', 'M9.3 11a1 1 0 1 0 2 0 1 1 0 1 0-2 0', 'M12.5 13.6a1 1 0 1 0 2 0 1 1 0 1 0-2 0'],
  check: ['M5 12l4 4 10-10'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
};

export function MachineIcon({
  name,
  size = 26,
  spin = false,
  className,
}: {
  name: keyof typeof PATHS;
  size?: number;
  spin?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={size >= 24 ? 1.5 : 1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`block ${spin ? 'animate-drum-spin' : ''} ${className ?? ''}`}
    >
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
