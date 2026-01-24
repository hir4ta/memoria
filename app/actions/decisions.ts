"use server";

import { revalidatePath } from "next/cache";
import {
  createDecision,
  updateDecision,
  deleteDecision,
} from "@/lib/memoria/decisions";
import { validateId } from "@/lib/memoria/paths";
import type { Decision, Alternative, User } from "@/lib/memoria/types";

// Whitelist of fields that can be updated
const ALLOWED_DECISION_UPDATE_FIELDS = [
  "title",
  "decision",
  "reasoning",
  "alternatives",
  "tags",
  "status",
  "relatedSessions",
] as const;

// Valid status values
const VALID_DECISION_STATUSES = ["active", "superseded", "deprecated"] as const;

type AllowedDecisionUpdate = {
  title?: string;
  decision?: string;
  reasoning?: string;
  alternatives?: Alternative[];
  tags?: string[];
  status?: "active" | "superseded" | "deprecated";
  relatedSessions?: string[];
};

type CreateDecisionInput = {
  user: User;
  title: string;
  decision: string;
  reasoning: string;
  alternatives?: Alternative[];
  tags?: string[];
  status?: "active" | "superseded" | "deprecated";
  relatedSessions?: string[];
};

export async function createDecisionAction(
  data: CreateDecisionInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Validate required fields
    if (!data.title || !data.decision || !data.reasoning || !data.user?.name) {
      return { success: false, error: "Missing required fields" };
    }

    // Validate status enum if provided
    if (data.status !== undefined) {
      if (!VALID_DECISION_STATUSES.includes(data.status)) {
        return { success: false, error: "Invalid status value" };
      }
    }

    const result = await createDecision({
      user: data.user,
      title: data.title,
      decision: data.decision,
      reasoning: data.reasoning,
      alternatives: data.alternatives || [],
      tags: data.tags || [],
      status: data.status || "active",
      relatedSessions: data.relatedSessions || [],
    });
    if (!result) {
      return { success: false, error: "Failed to create decision" };
    }
    revalidatePath("/decisions");
    return { success: true, id: result.id };
  } catch (error) {
    console.error("[memoria] createDecisionAction error:", error);
    return { success: false, error: "Failed to create decision" };
  }
}

export async function updateDecisionAction(
  id: string,
  data: AllowedDecisionUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate ID
    if (!validateId(id)) {
      return { success: false, error: "Invalid decision ID" };
    }

    // Validate status enum if provided
    if (data.status !== undefined) {
      if (!VALID_DECISION_STATUSES.includes(data.status)) {
        return { success: false, error: "Invalid status value" };
      }
    }

    // Filter to allowed fields only
    const safeData: AllowedDecisionUpdate = {};
    for (const key of ALLOWED_DECISION_UPDATE_FIELDS) {
      if (key in data) {
        (safeData as Record<string, unknown>)[key] = data[key];
      }
    }

    const result = await updateDecision(id, safeData);
    if (!result) {
      return { success: false, error: "Decision not found" };
    }
    revalidatePath("/decisions");
    revalidatePath(`/decisions/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[memoria] updateDecisionAction error:", error);
    return { success: false, error: "Failed to update decision" };
  }
}

export async function deleteDecisionAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate ID
    if (!validateId(id)) {
      return { success: false, error: "Invalid decision ID" };
    }

    const result = await deleteDecision(id);
    if (!result) {
      return { success: false, error: "Decision not found" };
    }
    revalidatePath("/decisions");
    return { success: true };
  } catch (error) {
    console.error("[memoria] deleteDecisionAction error:", error);
    return { success: false, error: "Failed to delete decision" };
  }
}
