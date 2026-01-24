"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteDecisionAction } from "@/app/actions/decisions";

interface DeleteDecisionButtonProps {
  id: string;
}

export function DeleteDecisionButton({ id }: DeleteDecisionButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this decision?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteDecisionAction(id);
      if (result.success) {
        router.push("/decisions");
        router.refresh();
      } else {
        alert(result.error || "Failed to delete decision");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </Button>
  );
}
