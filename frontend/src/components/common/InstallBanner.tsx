import { usePwaInstall } from '../../hooks/usePwaInstall';

export function InstallBanner() {
  const { installed, canPrompt, needsManualSteps, promptInstall } = usePwaInstall();

  // Hidden only once actually installed. The dismiss control is gone, so the
  // stored `installDismissed` flag is no longer consulted either — honouring a
  // flag nothing can clear would have hidden the banner forever for anyone who
  // had already dismissed it before this change.
  //
  // It deliberately still shows when `beforeinstallprompt` has not fired.
  // Chrome withholds that event until the PWA passes its installability checks
  // (active service worker, engagement heuristics), so gating the whole banner
  // on it meant the prompt was invisible exactly when a new visitor was most
  // likely to install. Without the event we show the manual route instead of
  // a button that would do nothing.
  if (installed) return null;

  const hint = needsManualSteps
    ? 'Tap Share, then “Add to Home Screen”.'
    : 'Open your browser menu and choose “Install app”.';

  return (
    <div className="px-5.5 pt-6">
      <div className="flex items-center gap-3.5 rounded-2xl border border-brand-lt bg-brand-lt px-4 py-3.5">
        {/* Decorative: the heading beside it already says what this is, so alt
            is empty rather than repeating it to a screen reader. Intrinsic size
            is given so the row does not reflow once the image decodes. */}
        <img
          src="/img/add-to-home.png"
          alt=""
          width={23}
          height={46}
          className="h-11.5 w-auto flex-none"
        />
        <div className="flex-1 leading-snug">
          <div className="text-[13.5px] font-bold text-brand-tx">Add spin to your home screen</div>
          <div className="text-xs text-brand-tx/80">
            {canPrompt ? 'Get alerts the second your wash is done.' : hint}
          </div>
        </div>
        {canPrompt && (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="flex-none whitespace-nowrap rounded-full bg-brand-500 px-3.5 py-1.5 text-[13px] font-bold text-white"
          >
            Add to Home
          </button>
        )}
      </div>
    </div>
  );
}
