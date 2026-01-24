"use server";

import { revalidatePath } from "next/cache";
import { updateSession, deleteSession } from "@/lib/memoria/sessions";
import { validateId } from "@/lib/memoria/paths";

// Whitelist of fields that can be updated
const ALLOWED_SESSION_UPDATE_FIELDS = ["tags", "summary", "status"] as const;

type AllowedSessionUpdate = {
  tags?: string[];
  summary?: string;
  status?: "completed" | "in_progress";
};

export async function updateSessionAction(
  id: string,
  data: AllowedSessionUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate ID
    if (!validateId(id)) {
      return { success: false, error: "Invalid session ID" };
    }

    // Filter to allowed fields only
    const safeData: AllowedSessionUpdate = {};
    for (const key of ALLOWED_SESSION_UPDATE_FIELDS) {
      if (key in data) {
        (safeData as Record<string, unknown>)[key] = data[key];
      }
    }

    const result = await updateSession(id, safeData);
    if (!result) {
      return { success: false, error: "Session not found" };
    }
    revalidatePath("/");
    revalidatePath(`/sessions/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[memoria] updateSessionAction error:", error);
    return { success: false, error: "Failed to update session" };
  }
}

export async function deleteSessionAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate ID
    if (!validateId(id)) {
      return { success: false, error: "Invalid session ID" };
    }

    const result = await deleteSession(id);
    if (!result) {
      return { success: false, error: "Session not found" };
    }
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("[memoria] deleteSessionAction error:", error);
    return { success: false, error: "Failed to delete session" };
  }
}
