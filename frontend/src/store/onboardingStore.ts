import { create } from 'zustand';

interface OnboardingState {
  phone: string;
  /** Opaque id from our API identifying the OTP attempt — not MSG91's reqId. */
  requestId: string | null;
  setPhone: (phone: string) => void;
  setRequestId: (requestId: string | null) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  phone: '',
  requestId: null,
  setPhone: (phone) => set({ phone }),
  setRequestId: (requestId) => set({ requestId }),
}));
