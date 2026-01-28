import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  title?: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  trigger?: React.ReactNode;
  variant?: "ghost" | "outline" | "destructive";
  size?: "sm" | "default" | "lg" | "icon";
  children?: React.ReactNode;
}

export function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  trigger,
  variant = "ghost",
  size = "sm",
  children,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // Error handling should be done by the caller
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button
            variant={variant}
            size={size}
            className="text-muted-foreground hover:text-destructive"
          >
            {children || "×"}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ?? t("deleteDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t("deleteDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? t("deleting") : t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
