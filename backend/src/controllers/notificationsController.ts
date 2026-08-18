import { Request, Response } from 'express';
import {
  listNotifications as listRows,
  markAllRead as markAllReadRows,
  serializeNotification,
} from '../repositories/notifications';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const { notifications, unread } = await listRows(req.user!.id);
  res.json({ notifications: notifications.map(serializeNotification), unread });
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  await markAllReadRows(req.user!.id);
  res.json({ ok: true });
}
