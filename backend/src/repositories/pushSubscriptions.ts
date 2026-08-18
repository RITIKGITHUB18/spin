import { getPool } from '../config/db';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** The shape the browser's PushSubscription.toJSON() produces. */
export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Endpoints are globally unique per device, so re-subscribing on a device
 * already registered updates it rather than creating a duplicate — and moves it
 * to the current user if someone else signs in on that browser.
 */
export async function saveSubscription(userId: string, sub: BrowserSubscription): Promise<void> {
  await getPool().query(
    `insert into push_subscriptions (user_id, endpoint, p256dh, auth)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update
       set user_id = excluded.user_id,
           p256dh  = excluded.p256dh,
           auth    = excluded.auth`,
    [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth]
  );
}

export async function listSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
  const { rows } = await getPool().query<PushSubscriptionRow>(
    'select * from push_subscriptions where user_id = $1',
    [userId]
  );
  return rows;
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await getPool().query('delete from push_subscriptions where endpoint = $1', [endpoint]);
}

/** Removes every device for a user — used when they switch push off. */
export async function deleteAllForUser(userId: string): Promise<void> {
  await getPool().query('delete from push_subscriptions where user_id = $1', [userId]);
}
