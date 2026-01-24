"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addPatternAction } from "@/app/actions/patterns";

interface PatternFormDialogProps {
  userName: string;
  onSuccess?: () => void;
  children: React.ReactNode;
}

export function PatternFormDialog({
  userName,
  onSuccess,
  children,
}: PatternFormDialogProps) {
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<"good" | "bad">("good");
  const [description, setDescription] = useState("");
  const [example, setExample] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setType("good");
    setDescription("");
    setExample("");
    setSuggestion("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await addPatternAction(
        { name: userName },
        {
          type,
          description,
          example: example || undefined,
          suggestion: suggestion || undefined,
          source: "manual",
        }
      );

      if (!result.success) {
        setError(result.error || "Failed to add pattern");
        return;
      }

      setOpen(false);
      resetForm();
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Pattern</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "good" | "bad")}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="good">Good Pattern</option>
              <option value="bad">Bad Pattern</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the pattern"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Example</label>
            <Textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Provide a code example (optional)"
              rows={3}
            />
          </div>
          {type === "bad" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Suggestion</label>
              <Textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="How to improve this pattern (optional)"
                rows={2}
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Pattern"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
