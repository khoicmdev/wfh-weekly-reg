import { useState } from "react";
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../../app";
import { BoardHeader } from "../../components/wfh/board-header";
import { WeekBoard } from "../../components/wfh/week-board";
import {
  getCurrentWeekInfo,
  getTodayLocal,
  getWeeksForMonth,
  offsetWeek,
  formatWeekLabel,
  formatBiweeklyLabel,
  formatMonthLabel,
  type ViewMode,
  type WeekInfo,
} from "../../components/wfh/week-utils";

import { useAuth } from "../../lib/auth.store";

export const registerWfhRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterWfhPage,
});

function RegisterWfhPage() {
  const auth = useAuth();
  const initialPreference: ViewMode = auth?.user.registerPreference ?? "monthly";
  const [viewMode, setViewMode] = useState<ViewMode>(initialPreference);

  // State for monthly view
  const today = getTodayLocal();
  const [monthState, setMonthState] = useState<{ year: number; month: number }>({
    year: today.getUTCFullYear(),
    month: today.getUTCMonth() + 1,
  });

  // State for weekly / biweekly views
  const [anchorWeek, setAnchorWeek] = useState<WeekInfo>(getCurrentWeekInfo);

  // Handle view mode change
  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    const now = getTodayLocal();
    setMonthState({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
    setAnchorWeek(getCurrentWeekInfo());
  }

  // Derive weeks array, label, and navigation actions based on viewMode
  let weeks: WeekInfo[] = [];
  let label = "";
  let showToday = false;
  let onPrev = () => {};
  let onNext = () => {};
  let onToday = () => {};

  const currentTodayWeek = getCurrentWeekInfo();

  if (viewMode === "monthly") {
    weeks = getWeeksForMonth(monthState.year, monthState.month);
    label = formatMonthLabel(monthState.year, monthState.month);

    const isCurrentMonth =
      today.getUTCFullYear() === monthState.year && today.getUTCMonth() + 1 === monthState.month;
    showToday = !isCurrentMonth;

    onPrev = () => {
      setMonthState((prev) => {
        if (prev.month === 1) return { year: prev.year - 1, month: 12 };
        return { year: prev.year, month: prev.month - 1 };
      });
    };

    onNext = () => {
      setMonthState((prev) => {
        if (prev.month === 12) return { year: prev.year + 1, month: 1 };
        return { year: prev.year, month: prev.month + 1 };
      });
    };

    onToday = () => {
      const now = getTodayLocal();
      setMonthState({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
    };
  } else if (viewMode === "biweekly") {
    const w1 = anchorWeek;
    const w2 = offsetWeek(anchorWeek, 1);
    weeks = [w1, w2];
    label = formatBiweeklyLabel(w1, w2);

    const containsToday = weeks.some(
      (w) => w.year === currentTodayWeek.year && w.weekNumber === currentTodayWeek.weekNumber
    );
    showToday = !containsToday;

    onPrev = () => setAnchorWeek((prev) => offsetWeek(prev, -2));
    onNext = () => setAnchorWeek((prev) => offsetWeek(prev, 2));
    onToday = () => setAnchorWeek(getCurrentWeekInfo());
  } else {
    // weekly
    weeks = [anchorWeek];
    label = formatWeekLabel(anchorWeek);

    const isTodayWeek =
      anchorWeek.year === currentTodayWeek.year &&
      anchorWeek.weekNumber === currentTodayWeek.weekNumber;
    showToday = !isTodayWeek;

    onPrev = () => setAnchorWeek((prev) => offsetWeek(prev, -1));
    onNext = () => setAnchorWeek((prev) => offsetWeek(prev, 1));
    onToday = () => setAnchorWeek(getCurrentWeekInfo());
  }

  return (
    <div className="w-full flex flex-col gap-6 py-2">
      {/* Page header title + subtitle */}
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Register WFH</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your work-from-home schedule.
        </p>
      </div>

      {/* Board controls bar (View as + Navigator) under title */}
      <BoardHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        label={label}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        showToday={showToday}
      />

      {/* Stacked week board rows */}
      <div className="flex flex-col gap-6">
        {weeks.map((w) => (
          <WeekBoard
            key={`${w.year}-${w.weekNumber}`}
            weekInfo={w}
            activeMonth={viewMode === "monthly" ? monthState : undefined}
          />
        ))}
      </div>
    </div>
  );
}
