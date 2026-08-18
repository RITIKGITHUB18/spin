import { getPool } from '../config/db';

export interface ProfileRow {
  id: string;
  phone: string;
  full_name: string;
  flat: string;
  building_name: string;
  role: 'resident' | 'admin';
  push_opt_in: boolean;
}

/** Keeps the `_id`/camelCase shape the frontend already consumes. */
export function serializeProfile(p: ProfileRow) {
  return {
    _id: p.id,
    phone: p.phone,
    fullName: p.full_name,
    flat: p.flat,
    buildingName: p.building_name,
    role: p.role,
    pushOptIn: p.push_opt_in,
  };
}

export async function findProfile(id: string): Promise<ProfileRow | null> {
  const { rows } = await getPool().query<ProfileRow>('select * from profiles where id = $1', [id]);
  return rows[0] ?? null;
}

export async function createProfile(input: {
  id: string;
  phone: string;
  fullName: string;
  flat: string;
  buildingName: string;
}): Promise<ProfileRow> {
  const { rows } = await getPool().query<ProfileRow>(
    `insert into profiles (id, phone, full_name, flat, building_name)
     values ($1, $2, $3, $4, $5)
     returning *`,
    [input.id, input.phone, input.fullName, input.flat, input.buildingName]
  );
  return rows[0];
}

export async function setPushOptIn(id: string, optIn: boolean): Promise<ProfileRow | null> {
  const { rows } = await getPool().query<ProfileRow>(
    'update profiles set push_opt_in = $2 where id = $1 returning *',
    [id, optIn]
  );
  return rows[0] ?? null;
}
