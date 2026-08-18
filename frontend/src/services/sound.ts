/**
 * Notification sound, in-app.
 *
 * Scope note: this cannot change what a *system* push notification sounds like.
 * `NotificationOptions.sound` was dropped from the spec and is implemented by no
 * current browser (verified: `'sound' in Notification.prototype === false`), and
 * a service worker has no Audio constructor. When the phone is locked the OS
 * picks the tone. This covers the case we can control — a notification arriving
 * while the app is open.
 */

const SRC = '/sound/notify.mp3';

/**
 * Two sources can announce the same notification — the poll that raises the
 * in-app banner, and a real push forwarded by the service worker. Collapsing
 * plays inside this window stops one event being heard twice.
 *
 * Must stay above the clip's length (2.81s), or a second notification arriving
 * mid-playback rewinds the first and you hear neither one whole.
 */
const MIN_GAP_MS = 3200;

let el: HTMLAudioElement | null = null;
let lastPlayed = 0;
let unlocked = false;

function element(): HTMLAudioElement | null {
  if (typeof Audio !== 'function') return null;
  if (!el) {
    el = new Audio(SRC);
    el.preload = 'auto';
    el.volume = 0.7;
  }
  return el;
}

/**
 * Autoplay policy blocks audio until the page has seen a real user gesture, so
 * the *first* notification of a session would otherwise be silent. Playing it
 * muted on the first tap satisfies the policy and leaves the element unlocked
 * for later, genuine plays.
 */
export function armNotifySound(): () => void {
  if (unlocked) return () => undefined;

  const unlock = () => {
    const audio = element();
    detach();
    if (!audio) return;
    audio.muted = true;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        unlocked = true;
      })
      .catch(() => undefined)
      .finally(() => {
        audio.muted = false;
      });
  };

  const detach = () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return detach;
}

/** Never throws and never rejects: a blocked sound must not break the banner. */
export function playNotifySound(): void {
  const audio = element();
  if (!audio) return;

  const now = performance.now();
  if (now - lastPlayed < MIN_GAP_MS) return;
  lastPlayed = now;

  // Rewind rather than construct a new element — back-to-back notifications
  // would otherwise leak an Audio object each time.
  audio.currentTime = 0;
  audio.play().catch(() => undefined);
}
