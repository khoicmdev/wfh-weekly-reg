import { Link } from "@tanstack/react-router";
import { Users, ClipboardList } from "lucide-react";

export function SideBar() {
  return (
    <aside className="w-[240px] border-r border-border bg-white min-h-screen p-5 flex flex-col gap-6">
      {/* Brand Header */}
      <div className="px-2">
        <h1 className="text-lg font-bold text-foreground tracking-tight">
          TLG Legal
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-0.5">
          v1.0.0-stable
        </p>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-1.5">
        <Link
          to="/"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-secondary hover:text-foreground hover:bg-slate-100/70 transition-colors [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-semibold"
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-secondary hover:text-foreground hover:bg-slate-100/70 transition-colors [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-semibold"
        >
          <ClipboardList className="w-4 h-4 shrink-0" />
          <span>Register WFH</span>
        </Link>
      </nav>

      {/* User icon + display name at the bottom of the sidebar */}
    </aside>
  );
}
