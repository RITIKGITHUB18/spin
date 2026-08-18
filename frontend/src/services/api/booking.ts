import { api } from './client';
import type { Booking } from '../../types';

export async function startBooking(machineId: string, cycleLabel: string, cycleMinutes: number) {
  const { data } = await api.post<{ booking: Booking }>('/booking', { machineId, cycleLabel, cycleMinutes });
  return data.booking;
}

export async function fetchActiveBookings() {
  const { data } = await api.get<{ bookings: Booking[] }>('/booking/active');
  return data.bookings;
}

export async function fetchBookingHistory() {
  const { data } = await api.get<{ bookings: Booking[] }>('/booking/user');
  return data.bookings;
}

export async function extendBooking(id: string, minutes: number) {
  const { data } = await api.post<{ booking: Booking }>(`/booking/${id}/extend`, { minutes });
  return data.booking;
}

export async function markDone(id: string) {
  const { data } = await api.post<{ booking: Booking }>(`/booking/${id}/mark-done`);
  return data.booking;
}

export async function cancelBooking(id: string) {
  await api.post(`/booking/${id}/cancel`);
}

export async function resumeBooking(id: string) {
  const { data } = await api.post<{ booking: Booking }>(`/booking/${id}/resume`);
  return data.booking;
}

export async function notifyCollect(id: string) {
  await api.post(`/booking/${id}/notify-collect`);
}

export async function collectBooking(id: string) {
  const { data } = await api.post<{ booking: Booking }>(`/booking/${id}/collect`);
  return data.booking;
}

export async function releaseBooking(id: string) {
  await api.post(`/booking/${id}/release`);
}
