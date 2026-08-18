import { useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari reports an installed app here rather than via display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * State lives at module scope, not in the component.
 *
 * `beforeinstallprompt` fires once per page load and cannot be replayed. Held
 * in component state it was lost the moment the banner unmounted — navigating
 * Home -> Profile -> Home destroyed the captured event and the listener with
 * it, so the install button disappeared for the rest of the session and the
 * copy quietly fell back to the manual "use your browser menu" hint.
 *
 * Registering at module scope also means the listener is live from app boot
 * rather than from first render, so an early event cannot slip through the gap.
 */
interface InstallState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
}

let state: InstallState = { deferred: null, installed: false };
const listeners = new Set<() => void>();

function update(patch: Partial<InstallState>): void {
  state = { ...state, ...patch };
  listeners.forEach((notify) => notify());
}

if (typeof window !== 'undefined') {
  state = { deferred: null, installed: isStandalone() };

  window.addEventListener('beforeinstallprompt', (e) => {
    // Without this Chrome shows its own mini-infobar instead of letting the
    // banner drive the install.
    e.preventDefault();
    update({ deferred: e as BeforeInstallPromptEvent });
  });

  window.addEventListener('appinstalled', () => {
    update({ deferred: null, installed: true });
  });
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

// Returns the same reference until `update` replaces it — a fresh object every
// call would loop useSyncExternalStore forever.
function getSnapshot(): InstallState {
  return state;
}

/**
 * Wraps the `beforeinstallprompt` flow. The event must be captured before it is
 * used and can only be consumed once, so it is held rather than re-requested at
 * click time.
 */
export function usePwaInstall() {
  const { deferred, installed } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const promptInstall = useCallback(async () => {
    // Read through `state` rather than closing over `deferred`, so the callback
    // never depends on a value captured at an earlier render.
    const pending = state.deferred;
    if (!pending) return false;
    await pending.prompt();
    const { outcome } = await pending.userChoice;
    update({ deferred: null }); // single use — the event cannot be replayed
    return outcome === 'accepted';
  }, []);

  return {
    installed,
    canPrompt: deferred !== null,
    // iOS never fires beforeinstallprompt; it needs Share > Add to Home Screen.
    needsManualSteps: isIos() && !installed,
    promptInstall,
  };
}
