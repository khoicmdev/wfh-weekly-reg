import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Sun, Moon } from "lucide-react";
import { Switch } from "@repo/ui";
import { useAuth } from "../lib/auth.store";
import { useTheme, setTheme } from "../lib/theme.store";
import { UserSettingsDialog, getInitials } from "./user/user-settings-dialog";

export function SideBar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const auth = useAuth();
  const theme = useTheme();
  const displayName = auth?.user.displayName ?? null;
  const email = auth?.user.email ?? "";
  const initials = getInitials(displayName, email);

  return (
    <>
      <aside className="w-[240px] border-r border-border bg-card min-h-screen p-5 flex flex-col gap-6 transition-colors">
        {/* Brand Header */}
        <div className="px-2 flex items-center gap-2.5">
          <img src="/tlg_ico.png" alt="TLG Logo" className="h-7 w-auto object-contain shrink-0" />
          <h1 className="text-lg font-bold text-blue-900 dark:text-blue-400 tracking-tight italic">
            TLG Legal
          </h1>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          <Link
            to="/"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-semibold"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/register"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-semibold"
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Register WFH</span>
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User section + Theme Switcher + version footer */}
        <div className="flex flex-col gap-3">
          {/* Theme Switcher */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/60 border border-border">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {theme === "dark" ? (
                <Moon className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Toggle theme"
            />
          </div>

          <button
            id="sidebar-user-section"
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left w-full group"
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

          {/* App Version */}
          <div className="px-3">
            <p className="text-xs font-mono text-muted-foreground">
              v2.0.0-stable
            </p>
          </div>
        </div>
      </aside>

      <UserSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}
