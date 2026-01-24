import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { getRulesDir, getRulesPath } from "./paths";
import type { Rules, RuleItem } from "./types";

function generateRuleId(existingIds: Set<string> = new Set()): string {
  let id: string;
  let attempts = 0;
  do {
    id = `rule-${randomBytes(6).toString("hex")}`;
    attempts++;
    if (attempts > 100) {
      throw new Error("Failed to generate unique rule ID");
    }
  } while (existingIds.has(id));
  return id;
}

export async function getRules(): Promise<Rules | null> {
  try {
    const filePath = getRulesPath();
    const content = await readFile(filePath, "utf-8");
    const rules = JSON.parse(content) as Rules;

    // Migration: Add IDs to rules that don't have them
    let needsMigration = false;
    const existingIds = new Set<string>();

    // First pass: collect existing IDs
    for (const rule of rules.rules) {
      if (rule.id) {
        existingIds.add(rule.id);
      }
    }

    // Second pass: assign IDs to rules without them
    for (const rule of rules.rules) {
      if (!rule.id) {
        rule.id = generateRuleId(existingIds);
        existingIds.add(rule.id);
        needsMigration = true;
      }
    }

    // Save migrated data
    if (needsMigration) {
      await writeFile(filePath, JSON.stringify(rules, null, 2));
    }

    return rules;
  } catch {
    return null;
  }
}

export async function addRule(
  ruleItem: Omit<RuleItem, "id">
): Promise<Rules> {
  const rulesDir = getRulesDir();
  await mkdir(rulesDir, { recursive: true });

  const existing = await getRules();
  const now = new Date().toISOString();
  const filePath = getRulesPath();

  // Collect existing IDs to avoid collision
  const existingIds = new Set<string>();
  if (existing) {
    for (const rule of existing.rules) {
      if (rule.id) existingIds.add(rule.id);
    }
  }

  const newRule: RuleItem = {
    id: generateRuleId(existingIds),
    ...ruleItem,
  };

  if (existing) {
    const updated: Rules = {
      ...existing,
      rules: [...existing.rules, newRule],
      updatedAt: now,
    };
    await writeFile(filePath, JSON.stringify(updated, null, 2));
    return updated;
  } else {
    const newRules: Rules = {
      id: "coding-standards",
      createdAt: now,
      updatedAt: now,
      rules: [newRule],
    };
    await writeFile(filePath, JSON.stringify(newRules, null, 2));
    return newRules;
  }
}

export async function updateRule(
  ruleId: string,
  ruleItem: Omit<RuleItem, "id">
): Promise<Rules | null> {
  const existing = await getRules();
  if (!existing) {
    return null;
  }

  const ruleIndex = existing.rules.findIndex((r) => r.id === ruleId);
  if (ruleIndex === -1) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedRules = [...existing.rules];
  updatedRules[ruleIndex] = { id: ruleId, ...ruleItem };

  const updated: Rules = {
    ...existing,
    rules: updatedRules,
    updatedAt: now,
  };

  const filePath = getRulesPath();
  await writeFile(filePath, JSON.stringify(updated, null, 2));
  return updated;
}

export async function removeRule(ruleId: string): Promise<Rules | null> {
  const existing = await getRules();
  if (!existing) {
    return null;
  }

  const ruleIndex = existing.rules.findIndex((r) => r.id === ruleId);
  if (ruleIndex === -1) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedRules = existing.rules.filter((r) => r.id !== ruleId);

  const updated: Rules = {
    ...existing,
    rules: updatedRules,
    updatedAt: now,
  };

  const filePath = getRulesPath();
  await writeFile(filePath, JSON.stringify(updated, null, 2));
  return updated;
}
