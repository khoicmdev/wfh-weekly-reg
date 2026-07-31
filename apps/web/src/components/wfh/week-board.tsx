import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton, Button } from "@repo/ui";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth.store";
import { ColorBadge } from "./color-badge";
import { RegisterDialog } from "./register-dialog";
import { CancelDialog } from "./cancel-dialog";
import type { ScheduleEntry, WeekInfo, WeekScheduleResponse } from "./week-utils";
import {
  getMondayOfISOWeek,
  formatDDMMYYYY,
  formatWeekday,
  formatDayMonth,
  isFutureDDMMYYYY,
} from "./week-utils";

interface WeekBoardProps {
  weekInfo: WeekInfo;
  /** Optional active month constraint (for Monthly view mode) */
  activeMonth?: { year: number; month: number };
}

// ── Day column ────────────────────────────────────────────────────────────────

interface DayColumnProps {
  date: Date;
  isWeekend: boolean;
  isOutsideMonth: boolean;
  entries: ScheduleEntry[];
  currentUid?: string;
  weekQueryKey: readonly unknown[];
}

function DayColumn({
  date,
  isWeekend,
  isOutsideMonth,
  entries,
  currentUid,
  weekQueryKey,
}: DayColumnProps) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const ddmmyyyy = formatDDMMYYYY(date);
  const isFuture = isFutureDDMMYYYY(ddmmyyyy);
  // Today
  const todayDate = new Date();
  const todayUTC = new Date(Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()));
  const isToday = date.getTime() === todayUTC.getTime();

  const currentUserEntry = currentUid ? entries.find((e) => e.uid === currentUid) ?? null : null;
  const canRegister = !isWeekend && !isOutsideMonth && currentUserEntry === null && isFuture;
  const canCancel = currentUserEntry !== null && isFutureDDMMYYYY(currentUserEntry.wfhDate);

  // A column is disabled if it's a weekend, outside the active month, or has no available actions
  const isDisabled = isWeekend || isOutsideMonth || (!canRegister && !canCancel);

  return (
    <>
      <div
        className={`flex flex-col min-h-[220px] rounded-xl border transition-colors ${
          isDisabled ? "cursor-not-allowed" : ""
        } ${
          isOutsideMonth
            ? "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-40 select-none"
            : isWeekend
            ? "bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60"
            : isToday
            ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
            : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-700"
        }`}
      >
        {/* Header */}
        <div
          className={`px-3 pt-3 pb-2 border-b ${
            isOutsideMonth
              ? "border-slate-200 dark:border-slate-800"
              : isWeekend
              ? "border-slate-200 dark:border-slate-800"
              : isToday
              ? "border-blue-200 dark:border-blue-800"
              : "border-border"
          }`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-wide ${
              isToday && !isOutsideMonth ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {formatWeekday(date)}
          </p>
          <p className={`text-sm font-bold mt-0.5 ${isToday && !isOutsideMonth ? "text-primary" : "text-foreground"}`}>
            {formatDayMonth(date)}
          </p>
        </div>

        {/* Chips */}
        <div className="flex flex-col gap-1.5 px-2 py-2 flex-1">
          {isOutsideMonth ? (
            <p className="text-xs text-muted-foreground italic mt-1 px-1">N/A</p>
          ) : isWeekend ? (
            <p className="text-xs text-muted-foreground italic mt-1 px-1">N/A</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground italic mt-1 px-1">No WFH</p>
          ) : (
            entries.map((entry) => (
              <ColorBadge
                key={entry.id}
                displayName={entry.displayName}
                registrationOrder={entry.registrationOrder}
                colorHex={entry.color.hex}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {!isWeekend && !isOutsideMonth && (
          <div className="px-2 pb-2">
            {canCancel ? (
              <button
                type="button"
                id={`cancel-wfh-${ddmmyyyy}`}
                onClick={() => setCancelOpen(true)}
                className="text-xs text-destructive hover:underline underline-offset-2 font-medium"
              >
                Cancel WFH
              </button>
            ) : canRegister ? (
              <Button
                id={`register-wfh-${ddmmyyyy}`}
                size="xs"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setRegisterOpen(true)}
              >
                Register
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {!isWeekend && !isOutsideMonth && (
        <>
          <RegisterDialog
            open={registerOpen}
            onOpenChange={setRegisterOpen}
            wfhDate={ddmmyyyy}
            dateObj={date}
            weekQueryKey={weekQueryKey}
          />
          {canCancel && currentUserEntry && (
            <CancelDialog
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              scheduleId={currentUserEntry.id}
              dateObj={date}
              weekQueryKey={weekQueryKey}
            />
          )}
        </>
      )}
    </>
  );
}

// ── Week Board ────────────────────────────────────────────────────────────────

export function WeekBoard({ weekInfo, activeMonth }: WeekBoardProps) {
  const auth = useAuth();
  const currentUid = auth?.user.uid;

  const weekQueryKey = ["schedules", weekInfo.year, weekInfo.weekNumber] as const;

  const { data, isLoading, isError } = useQuery<WeekScheduleResponse>({
    queryKey: weekQueryKey,
    queryFn: () =>
      apiClient<WeekScheduleResponse>(
        `/api/v1/schedules?year=${weekInfo.year}&weekNumber=${weekInfo.weekNumber}`
      ),
  });

  const schedules = data?.schedules ?? [];

  // Build a map: ISO date string → entries for that day
  const entriesByDate: Record<string, ScheduleEntry[]> = {};
  for (const entry of schedules) {
    const [dd, mm, yyyy] = entry.wfhDate.split("-");
    const isoKey = `${yyyy}-${mm}-${dd}`;
    if (!entriesByDate[isoKey]) entriesByDate[isoKey] = [];
    entriesByDate[isoKey].push(entry);
  }

  // Build the 7 days (Mon–Sun)
  const monday = getMondayOfISOWeek(weekInfo.year, weekInfo.weekNumber);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday.getTime() + i * 86400000);
    const [y, m, d] = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ];
    const isoKey = `${y}-${m}-${d}`;
    const dayOfWeek = date.getUTCDay(); // 0=Sun, 6=Sat
    return {
      date,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      entries: entriesByDate[isoKey] ?? [],
    };
  });

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Failed to load week schedule. Please try again.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {isLoading
        ? Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-xl" />
          ))
        : days.map(({ date, isWeekend, entries }, i) => {
            const isOutsideMonth = activeMonth
              ? date.getUTCFullYear() !== activeMonth.year ||
                date.getUTCMonth() + 1 !== activeMonth.month
              : false;

            return (
              <DayColumn
                key={i}
                date={date}
                isWeekend={isWeekend}
                isOutsideMonth={isOutsideMonth}
                entries={entries}
                currentUid={currentUid}
                weekQueryKey={weekQueryKey}
              />
            );
          })}
    </div>
  );
}
