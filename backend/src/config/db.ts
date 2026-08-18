import { Pool, PoolClient } from 'pg';

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) throw new Error('Database not connected — call connectDB() first');
  return pool;
}

export async function connectDB(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy it from Supabase → Project Settings → Database → Connection string (use the pooled "Transaction" URI).'
    );
  }

  pool = new Pool({
    connectionString,
    // Supabase terminates TLS with its own CA; the pooler still requires SSL.
    ssl: { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX) || 10,
  });

  // Fail fast on a bad URL rather than at the first request. This is also the
  // check that was missing before: the old setup reported a healthy server
  // while its database had gone away.
  const client = await pool.connect();
  try {
    await client.query('select 1');
  } finally {
    client.release();
  }
  console.log('[db] Connected to Supabase Postgres');
}

export async function disconnectDB(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/** True when the pool can currently reach Postgres — used by /health. */
export async function isDbReachable(): Promise<boolean> {
  try {
    await getPool().query('select 1');
    return true;
  } catch {
    return false;
  }
}

/** Runs `fn` inside a transaction, rolling back on any throw. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
