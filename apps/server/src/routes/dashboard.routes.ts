import { Router, type Request, type Response } from "express";
import { adminDb } from "../lib/firebase-admin.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  getNowGMT7,
  getTodayGMT7,
  toDDMMYYYYFormat,
  toISOFormat,
} from "../lib/date.util.js";

export const dashboardRouter = Router();

// Require auth for dashboard routes
dashboardRouter.use(verifyToken);

// ── GET /api/v1/dashboard/stats ──────────────────────────────────────────────

dashboardRouter.get("/stats", async (req: Request, res: Response) => {
  const uid = req.user!.uid;

  try {
    const snapshot = await adminDb
      .collection("schedules")
      .where("uid", "==", uid)
      .get();

    const gmt7Now = getNowGMT7();
    const currentYear = gmt7Now.getUTCFullYear();
    const currentMonth = gmt7Now.getUTCMonth() + 1; // 1-indexed
    const todayISO = toISOFormat(getTodayGMT7());

    let nextWfhDate: string | null = null;
    let minFutureISO: string | null = null;
    let wfhDaysCountThisMonth = 0;
    let wfhDaysCountThisYear = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const rawDate = data.wfhDate as string;

      try {
        const isoDate = toISOFormat(rawDate); // YYYY-MM-DD
        const [yStr, mStr] = isoDate.split("-");
        const y = Number(yStr);
        const m = Number(mStr);

        // Check if date is in the future
        if (isoDate > todayISO) {
          if (!minFutureISO || isoDate < minFutureISO) {
            minFutureISO = isoDate;
          }
        }

        // Count this year
        if (y === currentYear) {
          wfhDaysCountThisYear++;
          // Count this month
          if (m === currentMonth) {
            wfhDaysCountThisMonth++;
          }
        }
      } catch {
        // Ignore unparseable date strings
      }
    });

    if (minFutureISO) {
      nextWfhDate = toDDMMYYYYFormat(minFutureISO);
    }

    res.json({
      nextWfhDate,
      wfhDaysCountThisMonth,
      wfhDaysCountThisYear,
    });
  } catch (err) {
    console.error("[dashboard-stats]", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats." });
  }
});
