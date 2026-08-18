import { PoolClient } from 'pg';
import { getPool } from '../config/db';
import type { MachineRow } from './machines';

export type BookingState = 'active' | 'done' | 'released';

export interface BookingRow {
  id: string;
  machine_id: string;
  user_id: string;
  cycle_label: string;
  cycle_minutes: number;
  start_time: Date;
  end_time: Date;
  state: BookingState;
  done_at: Date | null;
  released_at: Date | null;
  released_by: string | null;
}

/** A booking joined with the columns of its machine that clients need. */
export interface BookingWithMachine extends BookingRow {
  machine_name: string;
  machine_kind: 'wash' | 'dry';
  machine_model: string;
}

const WITH_MACHINE = `
  select b.*,
         m.name  as machine_name,
         m.kind  as machine_kind,
         m.model as machine_model
    from bookings b
    join machines m on m.id = b.machine_id
`;

/** The one booking keeping a machine occupied, if any. */
export async function findOpenBookingForMachine(machineId: string): Promise<BookingRow | null> {
  const { rows } = await getPool().query<BookingRow>(
    `select * from bookings where machine_id = $1 and state <> 'released' limit 1`,
    [machineId]
  );
  return rows[0] ?? null;
}

/** Open bookings for every machine, keyed by machine id — avoids N+1 on the list. */
export async function findOpenBookingsByMachine(): Promise<Map<string, BookingRow>> {
  const { rows } = await getPool().query<BookingRow>(
    `select * from bookings where state <> 'released'`
  );
  return new Map(rows.map((r) => [r.machine_id, r]));
}

export async function findBookingWithMachine(id: string): Promise<BookingWithMachine | null> {
  const { rows } = await getPool().query<BookingWithMachine>(`${WITH_MACHINE} where b.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listOpenBookingsForUser(userId: string): Promise<BookingWithMachine[]> {
  const { rows } = await getPool().query<BookingWithMachine>(
    `${WITH_MACHINE} where b.user_id = $1 and b.state <> 'released' order by b.created_at desc`,
    [userId]
  );
  return rows;
}

export async function listBookingHistory(
  userId: string,
  limit: number,
  offset: number
): Promise<BookingWithMachine[]> {
  const { rows } = await getPool().query<BookingWithMachine>(
    `${WITH_MACHINE} where b.user_id = $1 order by b.created_at desc limit $2 offset $3`,
    [userId, limit, offset]
  );
  return rows;
}

/**
 * Thrown when `bookings_one_open_per_machine` rejects a concurrent claim.
 * 23505 is Postgres' unique_violation.
 */
export function isMachineBusyConflict(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505';
}

export async function insertBooking(
  client: PoolClient,
  input: {
    machineId: string;
    userId: string;
    cycleLabel: string;
    cycleMinutes: number;
    startTime: Date;
    endTime: Date;
  }
): Promise<BookingRow> {
  const { rows } = await client.query<BookingRow>(
    `insert into bookings (machine_id, user_id, cycle_label, cycle_minutes, start_time, end_time, state)
     values ($1, $2, $3, $4, $5, $6, 'active')
     returning *`,
    [input.machineId, input.userId, input.cycleLabel, input.cycleMinutes, input.startTime, input.endTime]
  );
  return rows[0];
}

export async function extend(id: string, minutes: number): Promise<BookingRow | null> {
  const { rows } = await getPool().query<BookingRow>(
    `update bookings
        set end_time = end_time + make_interval(mins => $2),
            cycle_minutes = cycle_minutes + $2
      where id = $1 and state = 'active'
      returning *`,
    [id, minutes]
  );
  return rows[0] ?? null;
}

export async function setState(
  id: string,
  state: BookingState,
  extra: { doneAt?: Date | null; releasedAt?: Date | null; releasedBy?: string | null } = {}
): Promise<BookingRow | null> {
  const { rows } = await getPool().query<BookingRow>(
    `update bookings
        set state = $2,
            done_at = coalesce($3, done_at),
            released_at = coalesce($4, released_at),
            released_by = coalesce($5, released_by)
      where id = $1
      returning *`,
    [id, state, extra.doneAt ?? null, extra.releasedAt ?? null, extra.releasedBy ?? null]
  );
  return rows[0] ?? null;
}

export function machineOf(b: BookingWithMachine): Pick<MachineRow, 'id' | 'name' | 'kind' | 'model'> {
  return { id: b.machine_id, name: b.machine_name, kind: b.machine_kind, model: b.machine_model };
}
