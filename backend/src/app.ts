import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import otpRoutes from "./routes/otp";
import { corsOrigins } from "./config/env";
import machinesRoutes from "./routes/machines";
import bookingRoutes from "./routes/booking";
import notificationsRoutes from "./routes/notifications";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { isDbReachable } from "./config/db";

export function createApp(): Express {
  const app = express();

  // Exactly one proxy in front (nginx on the same host), so trust one hop. The
  // rate limiter reads the client IP from X-Forwarded-For; without this it
  // refuses to trust the header and buckets every request under nginx's own
  // address, so one noisy client would rate-limit the whole building. `1`
  // rather than `true`: trusting every hop lets a client spoof the header.
  app.set('trust proxy', 1);

  app.use(helmet());
  // Explicit allow-list rather than `*`: these routes mint sessions. The list
  // comes from CORS_ORIGINS so the deployed domains and the local dev ports can
  // differ per environment without a code change.
  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

  // Reports the database too. The previous version answered {ok:true} purely
  // from the process being alive, so it stayed green while Postgres was
  // unreachable and every data route was failing.
  app.get("/health", async (_req, res) => {
    const db = await isDbReachable();
    res.status(db ? 200 : 503).json({ ok: db, db: db ? "up" : "down" });
  });

  app.use("/auth/otp", otpRoutes);
  app.use("/auth", authRoutes);
  app.use("/machines", machinesRoutes);
  app.use("/booking", bookingRoutes);
  app.use("/notifications", notificationsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
