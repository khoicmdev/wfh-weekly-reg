// ── Types shared across WFH components ───────────────────────────────────────

export type ViewMode = "weekly" | "biweekly" | "monthly";

export interface ScheduleEntry {
  id: string;
  uid: string;
  userEmail: string;
  displayName: string | null;
  wfhDate: string; // "DD-MM-YYYY"
  year: number;
  weekNumber: number;
  registrationOrder: number;
  color: { name: string; hex: string };
  createdAt: string;
}

export interface WeekScheduleResponse {
  year: number;
  weekNumber: number;
  schedules: ScheduleEntry[];
}

export interface WeekInfo {
  year: number;
  weekNumber: number;
  /** Monday of the week as Date (UTC midnight) */
  monday: Date;
}

// ── Date helpers (frontend, no timezone conversion needed — server handles GMT+7) ──

/** Get the ISO week number and year for a given Date */
export function getISOWeekInfo(date: Date): { year: number; weekNumber: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), weekNumber };
}

/** Get Monday Date of the ISO week for a given year + weekNumber */
export function getMondayOfISOWeek(year: number, weekNumber: number): Date {
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Mon=1 ... Sun=7
  // Monday of week 1
  const monday1 = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
  // Monday of target week
  return new Date(monday1.getTime() + (weekNumber - 1) * 7 * 86400000);
}

/** Offset a WeekInfo by N weeks */
export function offsetWeek(weekInfo: WeekInfo, deltaWeeks: number): WeekInfo {
  const targetMonday = new Date(weekInfo.monday.getTime() + deltaWeeks * 7 * 86400000);
  const { year, weekNumber } = getISOWeekInfo(targetMonday);
  return { year, weekNumber, monday: getMondayOfISOWeek(year, weekNumber) };
}

/** Get all ISO weeks spanning from the 1st of the month to the last day of the month */
export function getWeeksForMonth(year: number, month: number): WeekInfo[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastOfMonth = new Date(Date.UTC(year, month, 0)); // Last day of month

  const startInfo = getISOWeekInfo(firstOfMonth);
  const endInfo = getISOWeekInfo(lastOfMonth);

  const startMonday = getMondayOfISOWeek(startInfo.year, startInfo.weekNumber);
  const endMonday = getMondayOfISOWeek(endInfo.year, endInfo.weekNumber);

  const weeks: WeekInfo[] = [];
  let currMonday = startMonday;

  while (currMonday <= endMonday) {
    const { year: wYear, weekNumber: wNum } = getISOWeekInfo(currMonday);
    weeks.push({
      year: wYear,
      weekNumber: wNum,
      monday: currMonday,
    });
    currMonday = new Date(currMonday.getTime() + 7 * 86400000);
  }

  return weeks;
}

/** Format a Date as "DD-MM-YYYY" */
export function formatDDMMYYYY(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

/** Get today's local Date (no time) */
export function getTodayLocal(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Compute WeekInfo for today */
export function getCurrentWeekInfo(): WeekInfo {
  const today = getTodayLocal();
  const { year, weekNumber } = getISOWeekInfo(today);
  return { year, weekNumber, monday: getMondayOfISOWeek(year, weekNumber) };
}

/** Format a Date as "D MMM" e.g. "4 Aug" */
export function formatDayMonth(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Format a Date as "Mon" "Tue" etc. */
export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

/** Check if a "DD-MM-YYYY" date string is strictly in the future (after today) */
export function isFutureDDMMYYYY(ddmmyyyy: string): boolean {
  const [dd, mm, yyyy] = ddmmyyyy.split("-").map(Number);
  const target = new Date(Date.UTC(yyyy, mm - 1, dd));
  return target > getTodayLocal();
}

/** Single week label e.g. "Week 32 · Aug 3 – Aug 9, 2026" */
export function formatWeekLabel(weekInfo: WeekInfo): string {
  const mon = weekInfo.monday;
  const sun = new Date(mon.getTime() + 6 * 86400000);
  const startLabel = formatDayMonth(mon);
  const endLabel = formatDayMonth(sun);
  return `Week ${weekInfo.weekNumber} · ${startLabel} – ${endLabel}, ${sun.getUTCFullYear()}`;
}

/** Biweekly label e.g. "Week 32 – 33 · Aug 3 – Aug 16, 2026" */
export function formatBiweeklyLabel(w1: WeekInfo, w2: WeekInfo): string {
  const mon = w1.monday;
  const sun = new Date(w2.monday.getTime() + 6 * 86400000);
  const startLabel = formatDayMonth(mon);
  const endLabel = formatDayMonth(sun);
  return `Week ${w1.weekNumber} – ${w2.weekNumber} · ${startLabel} – ${endLabel}, ${sun.getUTCFullYear()}`;
}

/** Month label e.g. "August 2026" */
export function formatMonthLabel(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
