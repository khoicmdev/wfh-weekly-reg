import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList } from "lucide-react";
import { getStoredAuth } from "../lib/auth.store";
import { UserSettingsDialog, getInitials } from "./user/user-settings-dialog";

export function SideBar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Re-read auth on every render so it stays fresh after display name onboarding
  const auth = getStoredAuth();
  const displayName = auth?.user.displayName ?? null;
  const email = auth?.user.email ?? "";
  const initials = getInitials(displayName, email);

  function handleUpdated(_newName: string) {
    // The dialog already wrote to localStorage; a re-render triggered by
    // setSettingsOpen(false) inside the dialog will pick it up automatically.
  }

  return (
    <>
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
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/register"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-secondary hover:text-foreground hover:bg-slate-100/70 transition-colors [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-semibold"
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Register WFH</span>
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User section */}
        <button
          id="sidebar-user-section"
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100/70 transition-colors text-left w-full group"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shrink-0">
            {initials}
          </div>
          {/* Name + email */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate leading-tight">
              {displayName ?? "Set your name"}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {email}
            </p>
          </div>
        </button>
      </aside>

      <UserSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onUpdated={handleUpdated}
      />
    </>
  );
}
