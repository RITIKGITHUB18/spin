import { api } from './client';
import type { Notification } from '../../types';

export async function fetchNotifications() {
  const { data } = await api.get<{ notifications: Notification[]; unread: number }>('/notifications');
  return data;
}

export async function markNotificationsRead() {
  await api.post('/notifications/read');
}
