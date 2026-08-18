import { useQuery } from '@tanstack/react-query';
import { fetchMachines } from '../services/api/machines';

/**
 * No interval. Machine status only changes when a person acts on a machine, so
 * a timer spent most of its requests confirming nothing had happened.
 *
 * It stays current through three cheaper signals: booking actions invalidate
 * ['machines'] directly, React Query refetches on window focus once the data is
 * stale, and the user can pull to refresh. `staleTime` is what stops a tab
 * switch refiring the request — every new observer refetches on mount while the
 * data is considered stale.
 */
export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: fetchMachines,
    staleTime: 30000,
  });
}
