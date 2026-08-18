import { getPool } from '../config/db';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: 'booking_done' | 'collect_reminder';
  title: string;
  body: string;
  machine_id: string | null;
  read: boolean;
  created_at: Date;
}

export function serializeNotification(n: NotificationRow) {
  return {
    _id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    machine: n.machine_id,
    read: n.read,
    createdAt: n.created_at,
  };
}

export async function createNotification(input: {
  userId: string;
  type: NotificationRow['type'];
  title: string;
  body: string;
  machineId: string | null;
}): Promise<void> {
  await getPool().query(
    `insert into notifications (user_id, type, title, body, machine_id)
     values ($1, $2, $3, $4, $5)`,
    [input.userId, input.type, input.title, input.body, input.machineId]
  );
}

export async function listNotifications(
  userId: string
): Promise<{ notifications: NotificationRow[]; unread: number }> {
  const pool = getPool();
  const [list, count] = await Promise.all([
    pool.query<NotificationRow>(
      'select * from notifications where user_id = $1 order by created_at desc limit 50',
      [userId]
    ),
    pool.query<{ unread: string }>(
      'select count(*)::text as unread from notifications where user_id = $1 and read = false',
      [userId]
    ),
  ]);
  return { notifications: list.rows, unread: Number(count.rows[0].unread) };
}

export async function markAllRead(userId: string): Promise<void> {
  await getPool().query('update notifications set read = true where user_id = $1 and read = false', [
    userId,
  ]);
}
