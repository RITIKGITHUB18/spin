import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectDB } from './config/db';

async function main(): Promise<void> {
  await connectDB();
  const app = createApp();
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`[server] Spin API listening on http://localhost:${port}`));
}

main().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
