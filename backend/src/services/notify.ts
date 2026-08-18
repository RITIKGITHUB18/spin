import { createNotification, NotificationRow } from '../repositories/notifications';
import { sendPushToUser } from './push';

/**
 * The single way to notify a resident.
 *
 * Writes the in-app row (what the drawer and banner read) and pushes to their
 * devices. Both live here so a future notification cannot accidentally do one
 * without the other — which is exactly how the push half would rot.
 *
 * The push is fire-and-forget: delivery is best-effort and must not fail, or
 * slow, the booking action that triggered it.
 */
export async function notifyUser(input: {
  userId: string;
  type: NotificationRow['type'];
  title: string;
  body: string;
  machineId: string | null;
}): Promise<void> {
  await createNotification({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    machineId: input.machineId,
  });

  void sendPushToUser(input.userId, { title: input.title, body: input.body }).catch((err) => {
    console.error('[notify] push failed', { reason: err instanceof Error ? err.message : 'unknown' });
  });
}
