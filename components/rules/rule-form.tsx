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
import { addRuleAction, updateRuleAction } from "@/app/actions/rules";

interface RuleFormProps {
  rule?: {
    id: string;
    category: string;
    rule: string;
    example: string;
    addedBy: string;
  };
  onSuccess?: () => void;
}

export function RuleFormDialog({
  rule,
  onSuccess,
  children,
}: RuleFormProps & { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEditing = rule !== undefined;

  const [category, setCategory] = useState(rule?.category || "");
  const [ruleText, setRuleText] = useState(rule?.rule || "");
  const [example, setExample] = useState(rule?.example || "");
  const [addedBy, setAddedBy] = useState(rule?.addedBy || "Developer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    if (!isEditing) {
      setCategory("");
      setRuleText("");
      setExample("");
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const ruleData = {
        category,
        rule: ruleText,
        example,
        addedBy,
      };

      const result = isEditing
        ? await updateRuleAction(rule!.id, ruleData)
        : await addRuleAction(ruleData);

      if (!result.success) {
        setError(result.error || "Failed to save rule");
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
          <DialogTitle>{isEditing ? "Edit Rule" : "Add Rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Category *</label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Naming, Error Handling, Testing"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Rule *</label>
            <Textarea
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              placeholder="Describe the coding rule"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Example *</label>
            <Textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Provide a code example"
              rows={3}
              required
            />
          </div>
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
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
