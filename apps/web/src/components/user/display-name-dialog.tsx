import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from "@repo/ui";
import { apiClient } from "../../lib/api-client";
import { getStoredAuth, setStoredAuth, useAuth } from "../../lib/auth.store";

export function DisplayNameDialog() {
  const auth = useAuth();
  // Only show when authenticated and displayName is null
  const open = auth !== null && auth.user.displayName === null;

  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Display name must be at least 2 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient<{ message: string; displayName: string }>(
        "/api/v1/auth/me",
        { method: "PATCH", body: { displayName: trimmed } }
      );

      // Persist updated display name into stored auth so sidebar and dialog reflect it immediately
      const current = getStoredAuth();
      if (current) {
        setStoredAuth({
          ...current,
          user: { ...current.user, displayName: trimmed },
        });
      }

      toast.success(`Welcome, ${trimmed}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save name.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      // onOpenChange intentionally omitted — dialog cannot be dismissed
    >
      <DialogContent
        showCloseButton={false}
        // Prevent closing via Escape key or outside click
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>👋 Welcome! What should we call you?</DialogTitle>
          <DialogDescription>
            Set your display name. This is how you'll appear on the WFH board.
            You can change it later in settings.
          </DialogDescription>
        </DialogHeader>

        <form id="display-name-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="onboarding-display-name">Display name</Label>
            <Input
              id="onboarding-display-name"
              type="text"
              placeholder="e.g. Khoi Cao"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
              minLength={2}
              maxLength={50}
              required
            />
          </div>

          <Button
            id="onboarding-display-name-submit"
            type="submit"
            className="w-full"
            disabled={isLoading || name.trim().length < 2}
          >
            {isLoading ? "Saving…" : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
