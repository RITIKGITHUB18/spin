import { api } from './client';
import type { Machine } from '../../types';

export async function fetchMachines() {
  const { data } = await api.get<{ machines: Machine[] }>('/machines');
  return data.machines;
}
