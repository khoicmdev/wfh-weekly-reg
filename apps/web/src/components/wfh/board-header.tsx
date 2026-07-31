import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@repo/ui";
import type { ViewMode } from "./week-utils";

interface BoardHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  showToday: boolean;
}

export function BoardHeader({
  viewMode,
  onViewModeChange,
  label,
  onPrev,
  onNext,
  onToday,
  showToday,
}: BoardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 w-full">
      {/* 1. View mode selector (First / Left) */}
      <div className="flex items-center gap-2">
        <label htmlFor="view-mode-select" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          View as:
        </label>
        <select
          id="view-mode-select"
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value as ViewMode)}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        >
          <option value="monthly">Monthly (4 weeks)</option>
          <option value="biweekly">Biweekly (2 weeks)</option>
          <option value="weekly">Weekly (1 week)</option>
        </select>
      </div>

      {/* 2. Navigator controls (Second / Right) */}
      <div className="flex items-center gap-3">
        {/* Prev button */}
        <Button
          id="board-header-prev"
          variant="outline"
          size="icon-sm"
          onClick={onPrev}
          aria-label="Previous period"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Period label & Today shortcut */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground select-none min-w-[200px] text-center">
            {label}
          </span>

          {showToday && (
            <Button
              id="board-header-today"
              variant="ghost"
              size="xs"
              onClick={onToday}
              className="text-primary font-medium"
            >
              Today
            </Button>
          )}
        </div>

        {/* Next button */}
        <Button
          id="board-header-next"
          variant="outline"
          size="icon-sm"
          onClick={onNext}
          aria-label="Next period"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
