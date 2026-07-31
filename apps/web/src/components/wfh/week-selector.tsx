import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@repo/ui";
import type { WeekInfo } from "./week-utils";
import {
  formatWeekLabel,
  getMondayOfISOWeek,
  getISOWeekInfo,
  getCurrentWeekInfo,
} from "./week-utils";

interface WeekSelectorProps {
  weekInfo: WeekInfo;
  onWeekChange: (weekInfo: WeekInfo) => void;
}

function offsetWeek(weekInfo: WeekInfo, delta: number): WeekInfo {
  const targetMonday = new Date(weekInfo.monday.getTime() + delta * 7 * 86400000);
  const { year, weekNumber } = getISOWeekInfo(targetMonday);
  return { year, weekNumber, monday: getMondayOfISOWeek(year, weekNumber) };
}

export function WeekSelector({ weekInfo, onWeekChange }: WeekSelectorProps) {
  const currentWeek = getCurrentWeekInfo();
  const isCurrentWeek =
    weekInfo.year === currentWeek.year && weekInfo.weekNumber === currentWeek.weekNumber;

  return (
    <div className="flex items-center gap-2">
      {/* Prev */}
      <Button
        id="week-selector-prev"
        variant="outline"
        size="icon-sm"
        onClick={() => onWeekChange(offsetWeek(weekInfo, -1))}
        aria-label="Previous week"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Label */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground select-none min-w-[230px] text-center">
          {formatWeekLabel(weekInfo)}
        </span>

        {/* "Today" jump shortcut */}
        {!isCurrentWeek && (
          <Button
            id="week-selector-today"
            variant="ghost"
            size="xs"
            onClick={() => onWeekChange(getCurrentWeekInfo())}
            className="text-primary"
          >
            Today
          </Button>
        )}
      </div>

      {/* Next */}
      <Button
        id="week-selector-next"
        variant="outline"
        size="icon-sm"
        onClick={() => onWeekChange(offsetWeek(weekInfo, 1))}
        aria-label="Next week"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
