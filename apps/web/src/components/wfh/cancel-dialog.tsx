import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { formatDayMonth } from "./week-utils";

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  /** The Date object for display */
  dateObj: Date;
  weekQueryKey: readonly unknown[];
}

export function CancelDialog({
  open,
  onOpenChange,
  scheduleId,
  dateObj,
  weekQueryKey,
}: CancelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const dayLabel = dateObj.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await apiClient(`/api/v1/schedules/${scheduleId}`, { method: "DELETE" });

      toast.success(`WFH cancelled for ${formatDayMonth(dateObj)}.`);
      await queryClient.invalidateQueries({ queryKey: weekQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel WFH.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel WFH</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your WFH registration for{" "}
            <strong>{dayLabel}</strong>? This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            id="cancel-dialog-back"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Keep it
          </Button>
          <Button
            id="cancel-dialog-confirm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Cancelling…" : "Cancel WFH"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
