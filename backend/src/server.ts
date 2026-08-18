import dotenv from "dotenv";

// Load .env.<NODE_ENV> first, then .env as a fallback. dotenv never overwrites
// a variable that is already set, so precedence runs: real environment
// variables injected by the host > .env.production > .env. That lets one image
// run in either environment without swapping files.
dotenv.config({ path: `.env.${process.env.NODE_ENV || "development"}` });
dotenv.config();

import { createApp } from "./app";
import { connectDB } from "./config/db";

async function main(): Promise<void> {
  await connectDB();
  const app = createApp();
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, "0.0.0.0", () =>
    console.log(`[server] Spin API listening on ${port}`),
  );
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
