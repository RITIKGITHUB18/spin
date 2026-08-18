import { api } from './api/client';

/**
 * Web Push subscription, browser side.
 *
 * Only the VAPID *public* key lives here — it is designed to ship in the
 * bundle. The private key stays on the server and is what actually signs the
 * pushes.
 */

const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const pushConfigured = Boolean(publicKey);

/**
 * VAPID keys are base64url; PushManager wants raw bytes. Returns an ArrayBuffer
 * rather than a Uint8Array — TS types applicationServerKey as BufferSource, and
 * a Uint8Array is not assignable once SharedArrayBuffer is in the lib.
 */
function urlBase64ToBytes(base64: string): ArrayBuffer {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

export class PushDeniedError extends Error {
  constructor() {
    super('Notifications are blocked. Enable them for this site in your browser settings.');
  }
}

/**
 * Asks permission, subscribes this device and registers it with the API.
 * Throws so the caller can leave the toggle off rather than claim success.
 */
export async function enablePush(): Promise<void> {
  if (!pushSupported) throw new Error('This browser does not support notifications.');
  if (!pushConfigured) throw new Error('Notifications are not configured on this build.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new PushDeniedError();

  // `ready` resolves only once a worker is actually controlling the page —
  // subscribing against a still-installing registration fails intermittently.
  const registration = await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // Required by Chrome: no silent pushes, every one must show a notification.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(publicKey!),
    }));

  await api.post('/auth/push/subscribe', { subscription: subscription.toJSON() });
}

/** Unsubscribes this device and forgets it server-side. Never throws. */
export async function disablePush(): Promise<void> {
  if (!pushSupported) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const { endpoint } = subscription.toJSON();
    await subscription.unsubscribe();
    if (endpoint) await api.post('/auth/push/unsubscribe', { endpoint });
  } catch {
    // Turning notifications off should never surface an error; the server-side
    // opt-out has already happened by the time this runs.
  }
}
