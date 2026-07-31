import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { adminDb } from "../lib/firebase-admin.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getColorByOrder } from "../lib/color.util.js";
import {
  getISOWeekDetails,
  getTodayGMT7,
  isWeekendGMT7,
  isPastOrTodayGMT7,
  isValidDDMMYYYY,
  toDDMMYYYYFormat,
} from "../lib/date.util.js";

export const scheduleRouter = Router();

// Require auth for all schedule routes
scheduleRouter.use(verifyToken);

// ── Zod schemas ──────────────────────────────────────────────────────────────

const CreateScheduleSchema = z.object({
  wfhDate: z.string().min(1, "wfhDate is required"),
});

// ── GET /api/v1/schedules ────────────────────────────────────────────────────

scheduleRouter.get("/", async (req: Request, res: Response) => {
  try {
    let year: number;
    let weekNumber: number;

    if (req.query.year && req.query.weekNumber) {
      year = Number(req.query.year);
      weekNumber = Number(req.query.weekNumber);
    } else {
      const currentWeek = getISOWeekDetails(getTodayGMT7());
      year = currentWeek.year;
      weekNumber = currentWeek.weekNumber;
    }

    if (isNaN(year) || isNaN(weekNumber)) {
      res.status(400).json({ error: "Invalid year or weekNumber parameter." });
      return;
    }

    const snapshot = await adminDb
      .collection("schedules")
      .where("year", "==", year)
      .where("weekNumber", "==", weekNumber)
      .get();

    // Collect all unique user IDs to fetch latest display names
    const userIds = Array.from(new Set(snapshot.docs.map((doc) => doc.data().uid as string)));
    const userProfiles: Record<string, string | null> = {};

    if (userIds.length > 0) {
      const userDocs = await Promise.all(
        userIds.map((uid) => adminDb.collection("users").doc(uid).get()),
      );
      userDocs.forEach((doc) => {
        if (doc.exists) {
          userProfiles[doc.id] = (doc.data()?.displayName as string) ?? null;
        }
      });
    }

    // Sort all week docs by createdAt ascending
    const allDocs = snapshot.docs.slice().sort((a, b) => {
      const aTime = new Date(a.data().createdAt ?? 0).getTime();
      const bTime = new Date(b.data().createdAt ?? 0).getTime();
      return aTime - bTime;
    });

    // Assign consistent user order (1..N) for each unique user in this week
    const userOrderMap = new Map<string, number>();
    for (const doc of allDocs) {
      const docUid = doc.data().uid as string;
      if (!userOrderMap.has(docUid)) {
        userOrderMap.set(docUid, userOrderMap.size + 1);
      }
    }

    const schedules = allDocs.map((doc) => {
      const data = doc.data();
      const formattedDate = toDDMMYYYYFormat(data.wfhDate);
      const order = userOrderMap.get(data.uid) ?? 1;

      return {
        id: doc.id,
        uid: data.uid,
        userEmail: data.userEmail,
        displayName: userProfiles[data.uid] ?? data.displayName ?? null,
        wfhDate: formattedDate,
        year: data.year,
        weekNumber: data.weekNumber,
        registrationOrder: order,
        color: getColorByOrder(order),
        createdAt: data.createdAt,
      };
    });

    res.json({ year, weekNumber, schedules });
  } catch (err) {
    console.error("[get-schedules]", err);
    res.status(500).json({ error: "Failed to fetch schedules." });
  }
});

// ── POST /api/v1/schedules ───────────────────────────────────────────────────

scheduleRouter.post("/", async (req: Request, res: Response) => {
  const parsed = CreateScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  let { wfhDate } = parsed.data;

  // Convert YYYY-MM-DD to DD-MM-YYYY if needed, or validate DD-MM-YYYY
  try {
    wfhDate = toDDMMYYYYFormat(wfhDate);
  } catch {
    res.status(400).json({ error: "Invalid date format. Expected DD-MM-YYYY." });
    return;
  }

  if (!isValidDDMMYYYY(wfhDate)) {
    res.status(400).json({ error: "Invalid calendar date." });
    return;
  }

  // Reject weekend
  if (isWeekendGMT7(wfhDate)) {
    res.status(400).json({ error: "WFH registration is not allowed on weekends." });
    return;
  }

  const { year, weekNumber } = getISOWeekDetails(wfhDate);
  const uid = req.user!.uid;
  const email = req.user!.email;

  try {
    const newDocRef = adminDb.collection("schedules").doc();

    const result = await adminDb.runTransaction(async (transaction) => {
      // Query existing schedules for this week
      const query = adminDb
        .collection("schedules")
        .where("year", "==", year)
        .where("weekNumber", "==", weekNumber);

      const snapshot = await transaction.get(query);

      // Check duplicate registration for this user on this specific date
      const existingUserDateSchedule = snapshot.docs.find(
        (doc) => doc.data().uid === uid && doc.data().wfhDate === wfhDate,
      );
      if (existingUserDateSchedule) {
        throw new Error("DUPLICATE_DATE_REGISTRATION");
      }

      // Fetch user profile for latest displayName
      const userDocRef = adminDb.collection("users").doc(uid);
      const userDoc = await transaction.get(userDocRef);
      const displayName = userDoc.exists ? (userDoc.data()?.displayName ?? null) : null;

      // Sort existing docs by createdAt ascending to determine consistent per-user order for this week
      const existingDocs = snapshot.docs.slice().sort((a, b) => {
        const aTime = new Date(a.data().createdAt ?? 0).getTime();
        const bTime = new Date(b.data().createdAt ?? 0).getTime();
        return aTime - bTime;
      });

      const userOrderMap = new Map<string, number>();
      for (const doc of existingDocs) {
        const docUid = doc.data().uid as string;
        if (!userOrderMap.has(docUid)) {
          userOrderMap.set(docUid, userOrderMap.size + 1);
        }
      }

      const registrationOrder = userOrderMap.get(uid) ?? (userOrderMap.size + 1);

      const scheduleData = {
        uid,
        userEmail: email,
        displayName,
        wfhDate,
        year,
        weekNumber,
        registrationOrder,
        createdAt: new Date().toISOString(),
      };

      transaction.set(newDocRef, scheduleData);

      return {
        id: newDocRef.id,
        ...scheduleData,
        color: getColorByOrder(registrationOrder),
      };
    });

    res.status(201).json({
      message: "WFH registered successfully.",
      schedule: result,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "DUPLICATE_DATE_REGISTRATION") {
      res.status(409).json({ error: "You have already registered for WFH on this date." });
      return;
    }
    console.error("[create-schedule]", err);
    res.status(500).json({ error: "Failed to register WFH." });
  }
});

// ── DELETE /api/v1/schedules/:id ─────────────────────────────────────────────

scheduleRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const uid = req.user!.uid;

  try {
    const docRef = adminDb.collection("schedules").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: "Schedule entry not found." });
      return;
    }

    const data = doc.data()!;

    if (data.uid !== uid) {
      res.status(403).json({ error: "You can only cancel your own WFH registrations." });
      return;
    }

    // Check if the WFH date is in the past or today
    const formattedDate = toDDMMYYYYFormat(data.wfhDate);
    if (isPastOrTodayGMT7(formattedDate)) {
      res.status(400).json({ error: "Cannot cancel past or same-day WFH registrations." });
      return;
    }

    await docRef.delete();

    res.json({ message: "WFH registration cancelled successfully." });
  } catch (err) {
    console.error("[delete-schedule]", err);
    res.status(500).json({ error: "Failed to cancel WFH registration." });
  }
});
