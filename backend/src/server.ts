import dotenv from "dotenv";
import fs from "node:fs";
import crypto from "node:crypto";

// Load .env.<NODE_ENV> first, then .env as a fallback. dotenv never overwrites
// a variable that is already set, so precedence runs: real environment
// variables injected by the host > .env.production > .env.
//
// NODE_ENV must come from the actual environment. Setting it only inside
// .env.production cannot work — that file is selected *by* NODE_ENV, so it is
// never read unless the value is already set. Deliberately not auto-detected:
// a dev machine also has .env.production on disk, and silently booting it in
// production mode would point local work at production CORS and data.
const mode = process.env.NODE_ENV || "development";
const modeFile = `.env.${mode}`;
const loadedFrom: string[] = [];
if (fs.existsSync(modeFile)) {
  dotenv.config({ path: modeFile });
  loadedFrom.push(modeFile);
}
if (fs.existsSync(".env")) {
  dotenv.config();
  loadedFrom.push(".env");
}

// Fingerprint, never the value: enough to confirm the right credential is live
// and to compare against another environment, useless to anyone who sees a log.
const fingerprint = (v?: string): string =>
  v ? `${v.length}ch/${crypto.createHash("sha256").update(v).digest("hex").slice(0, 8)}` : "(unset)";

// MSG91 configuration, reported without ever printing a credential. The
// fingerprint is what lets local and production be compared: same key => same
// 12 chars, and a mismatch is immediately visible.
console.log("[boot] MSG91 configured", {
  baseUrl: process.env.MSG91_BASE_URL || "https://control.msg91.com/api/v5/widget (default)",
  widgetConfigured: Boolean(process.env.MSG91_WIDGET_ID && process.env.MSG91_TOKEN_AUTH),
  authKeyFingerprint: process.env.MSG91_AUTH_KEY
    ? crypto.createHash("sha256").update(process.env.MSG91_AUTH_KEY).digest("hex").slice(0, 12)
    : "(UNSET)",
});

console.log("[boot] env", {
  NODE_ENV: mode,
  loadedFrom: loadedFrom.length ? loadedFrom : ["(none - using process env only)"],
  MSG91_AUTH_KEY: fingerprint(process.env.MSG91_AUTH_KEY),
  AUTH_PASSWORD_SECRET: fingerprint(process.env.AUTH_PASSWORD_SECRET),
  CORS_ORIGINS: process.env.CORS_ORIGINS,
});

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
