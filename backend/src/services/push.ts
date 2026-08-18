import webpush from 'web-push';
import { env } from '../config/env';
import { findProfile } from '../repositories/profiles';
import { deleteSubscription, listSubscriptions } from '../repositories/pushSubscriptions';

/**
 * Web Push delivery.
 *
 * Deliberately best-effort: a push that fails must never fail the request that
 * triggered it. Marking a cycle done is the important thing; telling the phone
 * about it is not worth a 500.
 */

let configured: boolean | undefined;

function ready(): boolean {
  if (configured === undefined) {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env();
    configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    if (configured) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
    } else {
      console.warn('[push] VAPID keys not set — in-app notifications only.');
    }
  }
  return configured;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path opened when the notification is clicked. */
  url?: string;
}

/**
 * Sends to every device a user has registered, honouring their preference.
 *
 * `push_opt_in` is checked here rather than at subscribe time so switching it
 * off silences delivery immediately, even for devices that are still
 * subscribed.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ready()) return;

  const profile = await findProfile(userId);
  if (!profile?.push_opt_in) return;

  const subs = await listSubscriptions(userId);
  if (subs.length === 0) return;

  const body = JSON.stringify({ ...payload, url: payload.url ?? '/app' });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 mean the browser threw the subscription away (uninstalled,
        // permission revoked, profile cleared). Keeping it would retry forever.
        if (status === 404 || status === 410) {
          await deleteSubscription(sub.endpoint).catch(() => undefined);
          return;
        }
        // A missing status means it never reached the network — usually a
        // malformed subscription key failing encryption locally.
        console.error('[push] send failed', {
          status: status ?? 'no-response',
          reason: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
        });
      }
    })
  );
}
