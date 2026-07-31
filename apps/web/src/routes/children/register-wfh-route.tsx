import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../../app";

// ── Route definition ──────────────────────────────────────────────────────────
// Shell only — will be fleshed out in Phase 6 with <WeekSelector> + <WeekBoard>

export const registerWfhRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterWfhPage,
});

function RegisterWfhPage() {
  return (
    <div className="w-full flex flex-col gap-8 py-2">
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Register WFH</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage your weekly work-from-home schedule.
        </p>
      </div>

      {/* Placeholder — Phase 6 will replace this with WeekSelector + WeekBoard */}
      <div className="rounded-lg border border-dashed border-border bg-card flex items-center justify-center h-64 text-muted-foreground text-sm">
        Weekly board coming in Phase 6…
      </div>
    </div>
  );
}
