"use server";

import { revalidatePath } from "next/cache";
import { addRule, updateRule, removeRule } from "@/lib/memoria/rules";
import { validateId } from "@/lib/memoria/paths";

type RuleInput = {
  category: string;
  rule: string;
  example: string;
  addedBy: string;
};

export async function addRuleAction(
  ruleItem: RuleInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required fields
    if (!ruleItem.category || !ruleItem.rule || !ruleItem.example || !ruleItem.addedBy) {
      return { success: false, error: "Missing required fields" };
    }

    await addRule({
      category: ruleItem.category,
      rule: ruleItem.rule,
      example: ruleItem.example,
      addedBy: ruleItem.addedBy,
    });
    revalidatePath("/rules");
    return { success: true };
  } catch (error) {
    console.error("[memoria] addRuleAction error:", error);
    return { success: false, error: "Failed to add rule" };
  }
}

export async function updateRuleAction(
  ruleId: string,
  ruleItem: RuleInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate rule ID
    if (!ruleId || !validateId(ruleId)) {
      return { success: false, error: "Invalid rule ID" };
    }

    // Validate required fields
    if (!ruleItem.category || !ruleItem.rule || !ruleItem.example || !ruleItem.addedBy) {
      return { success: false, error: "Missing required fields" };
    }

    const result = await updateRule(ruleId, {
      category: ruleItem.category,
      rule: ruleItem.rule,
      example: ruleItem.example,
      addedBy: ruleItem.addedBy,
    });
    if (!result) {
      return { success: false, error: "Rule not found" };
    }
    revalidatePath("/rules");
    return { success: true };
  } catch (error) {
    console.error("[memoria] updateRuleAction error:", error);
    return { success: false, error: "Failed to update rule" };
  }
}

export async function removeRuleAction(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate rule ID
    if (!ruleId || !validateId(ruleId)) {
      return { success: false, error: "Invalid rule ID" };
    }

    const result = await removeRule(ruleId);
    if (!result) {
      return { success: false, error: "Rule not found" };
    }
    revalidatePath("/rules");
    return { success: true };
  } catch (error) {
    console.error("[memoria] removeRuleAction error:", error);
    return { success: false, error: "Failed to remove rule" };
  }
}
