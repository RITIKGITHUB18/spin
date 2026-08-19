import { LottiePlayer } from './LottiePlayer';

export function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-cream-50 px-7.5 py-12 text-center animate-fade-up">
      <LottiePlayer src="/Lottie/cat-crying.json" className="h-48 w-48" />
      <div>
        <div className="font-serif font-semibold text-2xl text-cream-900">{title}</div>
        <div className="mt-1.5 max-w-[260px] text-[14.5px] leading-relaxed text-cream-500">{message}</div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5.5 py-3.5 text-[14.5px] font-semibold tracking-[1px] text-white"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
