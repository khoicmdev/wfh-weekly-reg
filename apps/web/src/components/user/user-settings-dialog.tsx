import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from "@repo/ui";
import { router } from "../../routes/router-config";
import { apiClient } from "../../lib/api-client";
import { getStoredAuth, setStoredAuth, clearStoredAuth, useAuth } from "../../lib/auth.store";

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after display name is successfully updated */
  onUpdated?: (displayName: string) => void;
}

/** Derive initials from a display name or fall back to email first letter */
export function getInitials(displayName: string | null, email: string): string {
  if (displayName) {
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function UserSettingsDialog({
  open,
  onOpenChange,
  onUpdated,
}: UserSettingsDialogProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const displayName = auth?.user.displayName ?? "";
  const email = auth?.user.email ?? "";

  const [nameInput, setNameInput] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);

  // Keep nameInput in sync when dialog opens (in case auth changed externally)
  function handleOpenChange(next: boolean) {
    if (next) setNameInput(auth?.user.displayName ?? "");
    onOpenChange(next);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      toast.error("Display name must be at least 2 characters.");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient<{ message: string; displayName: string }>(
        "/api/v1/auth/me",
        { method: "PATCH", body: { displayName: trimmed } }
      );

      const current = getStoredAuth();
      if (current) {
        setStoredAuth({
          ...current,
          user: { ...current.user, displayName: trimmed },
        });
      }

      toast.success("Profile updated.");
      onUpdated?.(trimmed);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    onOpenChange(false);
    clearStoredAuth();
    await router.invalidate();
    await navigate({ to: "/login", replace: true });
  }

  const initials = getInitials(auth?.user.displayName ?? null, email);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md gap-5">
        <DialogHeader>
          <DialogTitle>Account settings</DialogTitle>
          <DialogDescription>
            Update your display name or sign out.
          </DialogDescription>
        </DialogHeader>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-base shrink-0"
            aria-label={`Avatar for ${displayName || email}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">
              {displayName || "—"}
            </p>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          </div>
        </div>

        <form id="user-settings-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-display-name">Display name</Label>
            <Input
              id="settings-display-name"
              type="text"
              placeholder="e.g. Khoi Cao"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={isSaving}
              minLength={2}
              maxLength={50}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input
              id="settings-email"
              type="email"
              value={email}
              readOnly
              disabled
              className="opacity-60 cursor-not-allowed"
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between mt-1">
            <Button
              id="settings-logout"
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              Log out
            </Button>
            <Button
              id="settings-save"
              type="submit"
              disabled={isSaving || nameInput.trim().length < 2}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
