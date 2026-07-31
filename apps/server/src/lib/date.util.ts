/**
 * Utility functions for GMT+7 date operations with DD-MM-YYYY format support.
 */

// Helper to convert DD-MM-YYYY to YYYY-MM-DD for internal comparison
export function toISOFormat(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("-");
    return `${y}-${m}-${d}`;
  }
  throw new Error(`Invalid date format: ${dateStr}. Expected DD-MM-YYYY.`);
}

// Helper to convert YYYY-MM-DD to DD-MM-YYYY
export function toDDMMYYYYFormat(dateStr: string): string {
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  }
  throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
}

export function isValidDDMMYYYY(dateStr: string): boolean {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return false;
  const [dStr, mStr, yStr] = dateStr.split("-");
  const day = Number(dStr);
  const month = Number(mStr);
  const year = Number(yStr);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 2000 || year > 2100) return false;

  const testDate = new Date(Date.UTC(year, month - 1, day));
  return (
    testDate.getUTCFullYear() === year &&
    testDate.getUTCMonth() === month - 1 &&
    testDate.getUTCDate() === day
  );
}

/**
 * Returns current Date in GMT+7 (+7 hours offset).
 */
export function getNowGMT7(): Date {
  const now = new Date();
  // GMT+7 is UTC + 7 hours
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

/**
 * Returns current date string in DD-MM-YYYY in GMT+7.
 */
export function getTodayGMT7(): string {
  const gmt7Now = getNowGMT7();
  const y = gmt7Now.getUTCFullYear();
  const m = String(gmt7Now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(gmt7Now.getUTCDate()).padStart(2, "0");
  return `${d}-${m}-${y}`;
}

/**
 * Calculate ISO 8601 week number and ISO week year for a date.
 * Accepts DD-MM-YYYY or YYYY-MM-DD format.
 */
export function getISOWeekDetails(dateStr: string): { year: number; weekNumber: number } {
  const isoStr = toISOFormat(dateStr);
  const [y, m, d] = isoStr.split("-").map(Number);
  
  // Create UTC date object
  const date = new Date(Date.UTC(y, m - 1, d));
  
  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, ..., Sunday=7)
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  
  // Get first day of year
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  
  // Calculate full weeks from yearStart to nearest Thursday
  const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return { year: date.getUTCFullYear(), weekNumber };
}

/**
 * Checks if a given date string (DD-MM-YYYY or YYYY-MM-DD) falls on a weekend (Saturday or Sunday).
 */
export function isWeekendGMT7(dateStr: string): boolean {
  const isoStr = toISOFormat(dateStr);
  const [y, m, d] = isoStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // 0 is Sunday, 6 is Saturday
  return day === 0 || day === 6;
}

/**
 * Checks if a given date string (DD-MM-YYYY or YYYY-MM-DD) is today or in the past in GMT+7.
 */
export function isPastOrTodayGMT7(dateStr: string): boolean {
  const targetISO = toISOFormat(dateStr);
  const todayISO = toISOFormat(getTodayGMT7());
  return targetISO <= todayISO;
}

/**
 * Returns current month info in GMT+7.
 */
export function getCurrentMonthAndYearGMT7(): {
  monthStr: string; // MM-YYYY
  year: number;
  month: number;
  todayStr: string; // DD-MM-YYYY
} {
  const gmt7Now = getNowGMT7();
  const year = gmt7Now.getUTCFullYear();
  const month = gmt7Now.getUTCMonth() + 1;
  const monthStr = `${String(month).padStart(2, "0")}-${year}`;
  const todayStr = getTodayGMT7();

  return { monthStr, year, month, todayStr };
}
