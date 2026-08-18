import { getPool } from '../config/db';

export interface Program {
  label: string;
  minutes: number;
  desc: string;
}

export interface MachineRow {
  id: string;
  name: string;
  kind: 'wash' | 'dry';
  model: string;
  programs: Program[];
  active: boolean;
}

export async function listActiveMachines(): Promise<MachineRow[]> {
  const { rows } = await getPool().query<MachineRow>(
    'select * from machines where active = true order by kind, name'
  );
  return rows;
}

export async function findActiveMachine(id: string): Promise<MachineRow | null> {
  const { rows } = await getPool().query<MachineRow>(
    'select * from machines where id = $1 and active = true',
    [id]
  );
  return rows[0] ?? null;
}

export async function findMachine(id: string): Promise<MachineRow | null> {
  const { rows } = await getPool().query<MachineRow>('select * from machines where id = $1', [id]);
  return rows[0] ?? null;
}
