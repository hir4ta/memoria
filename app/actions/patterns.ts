"use server";

import { revalidatePath } from "next/cache";
import { addPattern, removePattern } from "@/lib/memoria/patterns";
import type { User } from "@/lib/memoria/types";

type AddPatternInput = {
  type: "good" | "bad";
  description: string;
  example?: string;
  suggestion?: string;
  source: "session" | "review" | "manual";
  sourceId?: string;
};

export async function addPatternAction(
  user: User,
  patternItem: AddPatternInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required fields
    if (!user?.name || !patternItem.type || !patternItem.description) {
      return { success: false, error: "Missing required fields" };
    }

    // Validate type
    if (!["good", "bad"].includes(patternItem.type)) {
      return { success: false, error: "Invalid pattern type" };
    }

    // Validate source
    if (!["session", "review", "manual"].includes(patternItem.source)) {
      return { success: false, error: "Invalid pattern source" };
    }

    const result = await addPattern(user, {
      type: patternItem.type,
      description: patternItem.description,
      example: patternItem.example,
      suggestion: patternItem.suggestion,
      source: patternItem.source,
      sourceId: patternItem.sourceId,
    });
    if (!result) {
      return { success: false, error: "Failed to add pattern" };
    }
    revalidatePath("/patterns");
    revalidatePath(`/patterns/${encodeURIComponent(user.name)}`);
    return { success: true };
  } catch (error) {
    console.error("[memoria] addPatternAction error:", error);
    return { success: false, error: "Failed to add pattern" };
  }
}

export async function removePatternAction(
  userName: string,
  patternId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!userName || !patternId) {
      return { success: false, error: "Missing required fields" };
    }

    const result = await removePattern(userName, patternId);
    if (!result) {
      return { success: false, error: "Pattern not found" };
    }
    revalidatePath("/patterns");
    revalidatePath(`/patterns/${encodeURIComponent(userName)}`);
    return { success: true };
  } catch (error) {
    console.error("[memoria] removePatternAction error:", error);
    return { success: false, error: "Failed to remove pattern" };
  }
}
