import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  _id: string;
  phone: string;
  fullName: string;
  flat: string;
  buildingName: string;
  role: 'resident' | 'admin';
  pushOptIn: boolean;
}

interface AuthState {
  /**
   * The current Supabase access token, mirrored here so guards can read it
   * synchronously. supabase-js remains the owner of the session — this is never
   * written by hand, only by the bridge in services/supabase.ts.
   */
  token: string | null;
  user: AuthUser | null;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'spin-auth',
      // Only the profile is cached; the token comes back from supabase-js on
      // boot, so persisting a stale copy would just risk using an expired one.
      partialize: (s) => ({ user: s.user }),
    }
  )
);
