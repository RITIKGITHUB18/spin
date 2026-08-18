import { Request, Response } from 'express';
import { getPool } from '../config/db';
import { listActiveMachines, MachineRow, Program } from '../repositories/machines';
import { findOpenBookingsByMachine } from '../repositories/bookings';
import { deriveStatus } from '../services/machineStatus';
import { AppError } from '../utils/AppError';

export async function listMachines(req: Request, res: Response): Promise<void> {
  const now = Date.now();
  // Two queries total regardless of machine count — the open-booking map is
  // fetched in one go rather than per machine.
  const [machines, openByMachine] = await Promise.all([
    listActiveMachines(),
    findOpenBookingsByMachine(),
  ]);

  const result = machines.map((m) => {
    const booking = openByMachine.get(m.id) ?? null;
    const status = deriveStatus(booking, now);
    const occupied = status !== 'available' && booking !== null;
    return {
      id: m.id,
      name: m.name,
      kind: m.kind,
      model: m.model,
      programs: m.programs,
      status,
      isMine: booking ? booking.user_id === req.user!.id : false,
      startTime: occupied ? booking!.start_time : null,
      endTime: occupied ? booking!.end_time : null,
      cycleMinutes: occupied ? booking!.cycle_minutes : null,
      bookingId: occupied ? booking!.id : null,
    };
  });

  res.json({ machines: result });
}

export async function createMachine(req: Request, res: Response): Promise<void> {
  const { name, kind, model, programs } = req.body as {
    name: string;
    kind: 'wash' | 'dry';
    model: string;
    programs: Program[];
  };
  const { rows } = await getPool().query<MachineRow>(
    `insert into machines (name, kind, model, programs)
     values ($1, $2, $3, $4::jsonb)
     returning *`,
    [name, kind, model, JSON.stringify(programs ?? [])]
  );
  res.status(201).json({ machine: rows[0] });
}

export async function setMachineActive(req: Request, res: Response): Promise<void> {
  const { active } = req.body as { active: boolean };
  const { rows } = await getPool().query<MachineRow>(
    'update machines set active = $2 where id = $1 returning *',
    [req.params.id, active]
  );
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Machine not found');
  res.json({ machine: rows[0] });
}
