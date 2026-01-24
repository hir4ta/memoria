"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createDecisionAction, updateDecisionAction } from "@/app/actions/decisions";
import type { Decision, Alternative } from "@/lib/memoria/types";

interface DecisionFormProps {
  decision?: Decision;
  userName: string;
}

export function DecisionForm({ decision, userName }: DecisionFormProps) {
  const router = useRouter();
  const isEditing = !!decision;

  const [title, setTitle] = useState(decision?.title || "");
  const [decisionText, setDecisionText] = useState(decision?.decision || "");
  const [reasoning, setReasoning] = useState(decision?.reasoning || "");
  const [alternatives, setAlternatives] = useState<Alternative[]>(
    decision?.alternatives || []
  );
  const [tags, setTags] = useState<string[]>(decision?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"active" | "superseded" | "deprecated">(
    decision?.status || "active"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addAlternative = () => {
    setAlternatives([...alternatives, { option: "", rejected: "" }]);
  };

  const updateAlternative = (
    index: number,
    field: "option" | "rejected",
    value: string
  ) => {
    const updated = [...alternatives];
    updated[index] = { ...updated[index], [field]: value };
    setAlternatives(updated);
  };

  const removeAlternative = (index: number) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && decision) {
        const result = await updateDecisionAction(decision.id, {
          title,
          decision: decisionText,
          reasoning,
          alternatives: alternatives.filter((a) => a.option && a.rejected),
          tags,
          status,
        });
        if (!result.success) {
          setError(result.error || "Failed to update decision");
          return;
        }
        router.push(`/decisions/${decision.id}`);
      } else {
        const result = await createDecisionAction({
          user: { name: userName },
          title,
          decision: decisionText,
          reasoning,
          alternatives: alternatives.filter((a) => a.option && a.rejected),
          tags,
          status,
          relatedSessions: [],
        });
        if (!result.success) {
          setError(result.error || "Failed to create decision");
          return;
        }
        router.push("/decisions");
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Use TypeScript for the project"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Decision *</label>
            <Textarea
              value={decisionText}
              onChange={(e) => setDecisionText(e.target.value)}
              placeholder="What was decided?"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Reasoning *</label>
            <Textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why was this decision made?"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "active" | "superseded" | "deprecated")
              }
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="superseded">Superseded</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alternatives Considered</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alternatives.map((alt, i) => (
            <div key={i} className="border rounded p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Alternative {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAlternative(i)}
                >
                  Remove
                </Button>
              </div>
              <Input
                value={alt.option}
                onChange={(e) => updateAlternative(i, "option", e.target.value)}
                placeholder="Option name"
              />
              <Input
                value={alt.rejected}
                onChange={(e) => updateAlternative(i, "rejected", e.target.value)}
                placeholder="Reason for rejection"
              />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addAlternative}>
            + Add Alternative
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
