import { Request, Response } from 'express';
import { withTransaction } from '../config/db';
import {
  BookingRow,
  BookingWithMachine,
  extend,
  findBookingWithMachine,
  insertBooking,
  isMachineBusyConflict,
  listBookingHistory,
  listOpenBookingsForUser,
  machineOf,
  setState,
} from '../repositories/bookings';
import { findActiveMachine } from '../repositories/machines';
import { notifyUser } from '../services/notify';
import { deriveStatus } from '../services/machineStatus';
import { AppError } from '../utils/AppError';

type MachineSummary = { id: string; name: string; kind: 'wash' | 'dry'; model: string };

function serializeBooking(booking: BookingRow, machine: MachineSummary, now: number) {
  return {
    id: booking.id,
    machine,
    cycleLabel: booking.cycle_label,
    cycleMinutes: booking.cycle_minutes,
    startTime: booking.start_time,
    endTime: booking.end_time,
    status: deriveStatus(booking, now),
    state: booking.state,
  };
}

const serializeJoined = (b: BookingWithMachine, now: number) => serializeBooking(b, machineOf(b), now);

async function loadBooking(id: string): Promise<BookingWithMachine> {
  const booking = await findBookingWithMachine(id);
  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  return booking;
}

export async function startBooking(req: Request, res: Response): Promise<void> {
  const { machineId, cycleLabel, cycleMinutes } = req.body as {
    machineId: string;
    cycleLabel: string;
    cycleMinutes: number;
  };

  const machine = await findActiveMachine(machineId);
  if (!machine) throw new AppError(404, 'NOT_FOUND', 'Machine not found');

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + cycleMinutes * 60000);

  // No read-then-check here: `bookings_one_open_per_machine` is what guarantees
  // exclusivity. Two residents tapping the same free machine at once means one
  // insert wins and the other trips the unique index — which is reported as the
  // same 409 the old check produced, but without the race between them.
  let booking: BookingRow;
  try {
    booking = await withTransaction((client) =>
      insertBooking(client, {
        machineId: machine.id,
        userId: req.user!.id,
        cycleLabel,
        cycleMinutes,
        startTime,
        endTime,
      })
    );
  } catch (err) {
    if (isMachineBusyConflict(err)) {
      throw new AppError(409, 'MACHINE_BUSY', 'This machine is already in use');
    }
    throw err;
  }

  res.status(201).json({ booking: serializeBooking(booking, machine, Date.now()) });
}

export async function activeBookings(req: Request, res: Response): Promise<void> {
  const now = Date.now();
  const bookings = await listOpenBookingsForUser(req.user!.id);
  res.json({ bookings: bookings.map((b) => serializeJoined(b, now)) });
}

export async function bookingHistory(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.skip) || 0;
  const bookings = await listBookingHistory(req.user!.id, limit, offset);
  const now = Date.now();
  res.json({ bookings: bookings.map((b) => serializeJoined(b, now)) });
}

export async function extendBooking(req: Request, res: Response): Promise<void> {
  const { minutes } = req.body as { minutes: number };
  const booking = await loadBooking(req.params.id);

  if (booking.user_id !== req.user!.id) {
    throw new AppError(403, 'FORBIDDEN', 'Only the owner can extend this cycle');
  }
  if (booking.state !== 'active') {
    throw new AppError(409, 'INVALID_STATE', 'This cycle is no longer running');
  }

  const updated = await extend(booking.id, minutes);
  if (!updated) throw new AppError(409, 'INVALID_STATE', 'This cycle is no longer running');

  res.json({ booking: serializeBooking(updated, machineOf(booking), Date.now()) });
}

export async function markDone(req: Request, res: Response): Promise<void> {
  const booking = await loadBooking(req.params.id);
  if (booking.state !== 'active') throw new AppError(409, 'INVALID_STATE', 'This cycle is already done');

  const updated = await setState(booking.id, 'done', { doneAt: new Date() });
  if (!updated) throw new AppError(404, 'NOT_FOUND', 'Booking not found');

  if (booking.user_id !== req.user!.id) {
    await notifyUser({
      userId: booking.user_id,
      type: 'booking_done',
      title: `${booking.machine_name} is done`,
      body: 'Your laundry has finished — please collect it.',
      machineId: booking.machine_id,
    });
  }

  res.json({ booking: serializeBooking(updated, machineOf(booking), Date.now()) });
}

export async function cancelBooking(req: Request, res: Response): Promise<void> {
  const booking = await loadBooking(req.params.id);

  if (booking.user_id !== req.user!.id) {
    throw new AppError(403, 'FORBIDDEN', 'Only the owner can cancel this cycle');
  }
  if (booking.state !== 'active') throw new AppError(409, 'INVALID_STATE', 'This cycle is not running');

  await setState(booking.id, 'released', { releasedAt: new Date(), releasedBy: req.user!.id });
  res.json({ ok: true });
}

export async function resumeBooking(req: Request, res: Response): Promise<void> {
  const booking = await loadBooking(req.params.id);

  if (booking.user_id !== req.user!.id) {
    throw new AppError(403, 'FORBIDDEN', 'Only the owner can resume this cycle');
  }
  if (booking.state !== 'done') throw new AppError(409, 'INVALID_STATE', 'This cycle is not marked done');
  if (new Date(booking.end_time).getTime() <= Date.now()) {
    throw new AppError(409, 'CYCLE_FINISHED', 'This cycle has actually finished — collect it instead');
  }

  const updated = await setState(booking.id, 'active');
  if (!updated) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  res.json({ booking: serializeBooking(updated, machineOf(booking), Date.now()) });
}

export async function notifyCollect(req: Request, res: Response): Promise<void> {
  const booking = await loadBooking(req.params.id);

  if (booking.state === 'released') throw new AppError(409, 'INVALID_STATE', 'This machine is already free');
  if (booking.user_id === req.user!.id) throw new AppError(400, 'INVALID_ACTION', "You can't nudge yourself");

  await notifyUser({
      userId: booking.user_id,
    type: 'collect_reminder',
    title: `${booking.machine_name} — please collect`,
    body: 'A neighbour is waiting. Grab your laundry when you can.',
    machineId: booking.machine_id,
  });

  res.json({ ok: true });
}

export async function collectBooking(req: Request, res: Response): Promise<void> {
  const booking = await loadBooking(req.params.id);

  if (booking.user_id !== req.user!.id) {
    throw new AppError(403, 'FORBIDDEN', 'Only the owner can confirm pickup');
  }
  if (deriveStatus(booking, Date.now()) !== 'done') {
    throw new AppError(409, 'INVALID_STATE', 'This cycle is not finished yet');
  }

  const updated = await setState(booking.id, 'released', {
    releasedAt: new Date(),
    releasedBy: req.user!.id,
  });
  if (!updated) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  res.json({ booking: serializeBooking(updated, machineOf(booking), Date.now()) });
}

export async function releaseBooking(req: Request, res: Response): Promise<void> {
  const booking = await loadBooking(req.params.id);

  if (booking.user_id === req.user!.id) {
    throw new AppError(400, 'INVALID_ACTION', 'Use collect to release your own machine');
  }
  if (deriveStatus(booking, Date.now()) !== 'done') {
    throw new AppError(409, 'INVALID_STATE', 'This cycle is not finished yet');
  }

  await setState(booking.id, 'released', { releasedAt: new Date(), releasedBy: req.user!.id });
  res.json({ ok: true });
}
