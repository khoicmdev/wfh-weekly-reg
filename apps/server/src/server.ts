import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import cors from "cors";
import express, { type Request, type Response } from "express";
import { authRouter } from "./routes/auth.routes.js";
import { scheduleRouter } from "./routes/schedule.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";

export const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/api/status", (_req: Request, res: Response) => {
  res.json({ status: `Server is running: ${new Date().toISOString()}` });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/schedules", scheduleRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// ── Local dev server (not used in Cloud Functions) ────────────────────────────

if (
  process.env.NODE_ENV !== "production" &&
  !process.env.FUNCTION_TARGET &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTIONS_EMULATOR
) {
  const PORT = Number(process.env.PORT ?? 3001);
  app.listen(PORT, () => {
    console.log(
      `\nExpressJS started at ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}\n`,
    );
    console.log(`  -> Local: http://localhost:${PORT}\n`);
  });
}
