export interface Program {
  label: string;
  minutes: number;
  desc: string;
}

export type MachineStatus = 'available' | 'inuse' | 'done';

export interface Machine {
  id: string;
  name: string;
  kind: 'wash' | 'dry';
  model: string;
  programs: Program[];
  status: MachineStatus;
  isMine: boolean;
  startTime: string | null;
  endTime: string | null;
  cycleMinutes: number | null;
  bookingId: string | null;
}

export interface Booking {
  id: string;
  machine: { id: string; name: string; kind: 'wash' | 'dry'; model: string };
  cycleLabel: string;
  cycleMinutes: number;
  startTime: string;
  endTime: string;
  status: MachineStatus;
  state: 'active' | 'done' | 'released';
}

export interface Notification {
  _id: string;
  type: 'booking_done' | 'collect_reminder';
  title: string;
  body: string;
  machine: string;
  read: boolean;
  createdAt: string;
}
