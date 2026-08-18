import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '../services/api/notifications';

/**
 * No interval. A real push wakes the service worker, which posts to any open
 * tab, and AppShell invalidates this query on that message — so notifications
 * arrive by push rather than by asking repeatedly whether any exist.
 */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 30000,
  });
}
