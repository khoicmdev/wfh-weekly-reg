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

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The date to register in "DD-MM-YYYY" format */
  wfhDate: string;
  /** The Date object for display */
  dateObj: Date;
  weekQueryKey: readonly unknown[];
}

export function RegisterDialog({
  open,
  onOpenChange,
  wfhDate,
  dateObj,
  weekQueryKey,
}: RegisterDialogProps) {
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
      await apiClient("/api/v1/schedules", {
        method: "POST",
        body: { wfhDate },
      });

      toast.success(`WFH registered for ${formatDayMonth(dateObj)}.`);
      await queryClient.invalidateQueries({ queryKey: weekQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register WFH.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Register WFH</DialogTitle>
          <DialogDescription>
            Confirm your work-from-home registration for{" "}
            <strong>{dayLabel}</strong>.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            id="register-dialog-cancel"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            id="register-dialog-confirm"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Registering…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
