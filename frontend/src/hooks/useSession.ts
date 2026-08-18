import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSession } from '../services/api/auth';
import { useAuthStore } from '../store/authStore';

/**
 * Resolves the signed-in account's profile.
 *
 * A verified phone and a completed profile are two different things: MSG91 and
 * Supabase can both be satisfied while `profiles` is still empty. Without this
 * the app let such users straight in, where they saw a nameless header and a
 * blank Profile page.
 *
 * Keeps the auth store in sync so screens can read the profile synchronously.
 */
export function useSession() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  const query = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const profile = query.data?.user ?? null;
  useEffect(() => {
    if (profile) setUser(profile);
  }, [profile, setUser]);

  return {
    ...query,
    profile,
    /** True only once we know: avoids bouncing to /name while still loading. */
    needsProfile: query.isSuccess && !query.data.user,
  };
}
