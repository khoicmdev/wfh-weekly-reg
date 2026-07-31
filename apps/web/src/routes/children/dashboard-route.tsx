import { createRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CalendarDays, BarChart3 } from "lucide-react";
import { Card, CardContent, Skeleton } from "@repo/ui";
import { rootRoute } from "../../app";
import { apiClient } from "../../lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  nextWfhDate: string | null;       // "DD-MM-YYYY" or null
  wfhDaysCountThisMonth: number;
  wfhDaysCountThisYear: number;
}

// ── Route definition ──────────────────────────────────────────────────────────

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert "DD-MM-YYYY" to a human-readable string like "Mon, 04 Aug 2026" */
function formatDDMMYYYY(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Components ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtext?: string;
  accent?: string; // Tailwind bg colour class for icon wrapper
}

function StatCard({ icon, label, value, subtext, accent = "bg-primary/10" }: StatCardProps) {
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      <CardContent className="p-6 flex items-start gap-4">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl ${accent} flex items-center justify-center shrink-0 mt-0.5`}>
          {icon}
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      <CardContent className="p-6 flex items-start gap-4">
        <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-36" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiClient<DashboardStats>("/api/v1/dashboard/stats"),
  });

  return (
    <div className="w-full flex flex-col gap-8 py-2">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your WFH activity at a glance.
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load stats. Please refresh the page.
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={<Calendar className="w-5 h-5 text-primary" />}
              label="Next WFH"
              value={
                data?.nextWfhDate
                  ? formatDDMMYYYY(data.nextWfhDate)
                  : "Not scheduled"
              }
              subtext={data?.nextWfhDate ? "Your next registered day" : "Register a day to get started"}
              accent="bg-primary/10"
            />

            <StatCard
              icon={<CalendarDays className="w-5 h-5 text-violet-600" />}
              label="This Month"
              value={data?.wfhDaysCountThisMonth ?? 0}
              subtext="WFH days registered this month"
              accent="bg-violet-100"
            />

            <StatCard
              icon={<BarChart3 className="w-5 h-5 text-emerald-600" />}
              label="This Year"
              value={data?.wfhDaysCountThisYear ?? 0}
              subtext="Total WFH days this year"
              accent="bg-emerald-100"
            />
          </>
        )}
      </div>
    </div>
  );
}
