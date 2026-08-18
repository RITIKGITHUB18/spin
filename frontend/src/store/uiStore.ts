import { create } from 'zustand';

export type SheetType = 'book' | 'manage' | null;

interface ToastMessage {
  id: number;
  title: string;
  body: string;
}

interface PushMessage {
  title: string;
  body: string;
}

interface UiState {
  sheet: SheetType;
  sheetMachineId: string | null;
  openSheet: (type: Exclude<SheetType, null>, machineId: string) => void;
  closeSheet: () => void;

  notifOpen: boolean;
  openNotif: () => void;
  closeNotif: () => void;

  toast: ToastMessage | null;
  showToast: (title: string, body: string) => void;
  dismissToast: () => void;

  push: PushMessage | null;
  showPush: (title: string, body: string) => void;
  dismissPush: () => void;

  installDismissed: boolean;
  dismissInstall: () => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
  sheet: null,
  sheetMachineId: null,
  openSheet: (type, machineId) => set({ sheet: type, sheetMachineId: machineId }),
  closeSheet: () => set({ sheet: null, sheetMachineId: null }),

  notifOpen: false,
  openNotif: () => set({ notifOpen: true }),
  closeNotif: () => set({ notifOpen: false }),

  toast: null,
  showToast: (title, body) => set({ toast: { id: ++toastId, title, body } }),
  dismissToast: () => set({ toast: null }),

  push: null,
  showPush: (title, body) => set({ push: { title, body } }),
  dismissPush: () => set({ push: null }),

  installDismissed: false,
  dismissInstall: () => set({ installDismissed: true }),
}));
