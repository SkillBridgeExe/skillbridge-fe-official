import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AdminModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
};

export default function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  confirmLabel = "Save",
  onConfirm,
  cancelLabel = "Cancel",
}: AdminModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div>{children}</div>
        {footer ? (
          footer
        ) : onConfirm ? (
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button type="button" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

