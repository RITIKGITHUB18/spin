import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB, getPool } from './config/db';

const WASH = [
  { label: 'Quick 30', minutes: 30, desc: 'Light loads' },
  { label: 'Daily', minutes: 45, desc: 'Everyday' },
  { label: 'Heavy', minutes: 60, desc: 'Bedding' },
  { label: 'Eco cottons', minutes: 90, desc: 'Gentle' },
];
// Kept for when a dryer is added — the 'dry' kind is still supported end to end
// (schema check constraint, Machine type, MachineIcon), just not seeded.
const DRY = [
  { label: 'Air dry', minutes: 30, desc: 'No heat' },
  { label: 'Low heat', minutes: 45, desc: 'Delicates' },
  { label: 'Normal', minutes: 60, desc: 'Full load' },
];
void DRY;

// The real laundry room: three washers, no dryer.
const MACHINES = [
  { name: 'Washer 1', kind: 'wash', model: '7 kg front-load', programs: WASH },
  { name: 'Washer 2', kind: 'wash', model: '8 kg front-load', programs: WASH },
  { name: 'Washer 3', kind: 'wash', model: '6 kg top-load', programs: WASH },
];

async function seed(): Promise<void> {
  await connectDB();
  const pool = getPool();

  // Profiles are not cleared: they are owned by Supabase Auth, and deleting
  // them here would orphan real auth users.
  await pool.query('truncate table bookings, notifications restart identity cascade');
  await pool.query('delete from machines');

  for (const m of MACHINES) {
    await pool.query(
      `insert into machines (name, kind, model, programs) values ($1, $2, $3, $4::jsonb)`,
      [m.name, m.kind, m.model, JSON.stringify(m.programs)]
    );
  }

  console.log(`[seed] Seeded ${MACHINES.length} machines.`);
  console.log('[seed] Residents sign in with phone + OTP through Supabase Auth.');

  await disconnectDB();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
