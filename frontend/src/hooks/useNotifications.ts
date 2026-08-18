import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '../services/api/notifications';

/**
 * Polled slowly on purpose. A real push wakes the service worker, which posts
 * to any open tab, and AppShell invalidates this query on that message — so
 * genuine notifications still surface immediately. The interval is only a
 * fallback for when push is unavailable or declined.
 */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
    staleTime: 25000,
  });
}
