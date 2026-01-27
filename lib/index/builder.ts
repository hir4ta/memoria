import * as fs from "node:fs";
import * as path from "node:path";
import type {
  DecisionIndex,
  DecisionIndexItem,
  SessionIndex,
  SessionIndexItem,
} from "../schemas/index.js";
import { safeReadJson } from "../utils.js";

/**
 * List JSON files in dated directory structure (YYYY/MM/*.json)
 */
function listDatedJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  const years = fs.readdirSync(dir, { withFileTypes: true });

  for (const year of years) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;

    const yearPath = path.join(dir, year.name);
    const months = fs.readdirSync(yearPath, { withFileTypes: true });

    for (const month of months) {
      if (!month.isDirectory() || !/^\d{2}$/.test(month.name)) continue;

      const monthPath = path.join(yearPath, month.name);
      const jsonFiles = fs.readdirSync(monthPath, { withFileTypes: true });

      for (const file of jsonFiles) {
        if (file.isFile() && file.name.endsWith(".json")) {
          files.push(path.join(monthPath, file.name));
        }
      }
    }
  }

  return files;
}

/**
 * Build session index from session files
 */
export function buildSessionIndex(memoriaDir: string): SessionIndex {
  const sessionsDir = path.join(memoriaDir, "sessions");
  const files = listDatedJsonFiles(sessionsDir);

  const items: SessionIndexItem[] = [];

  for (const filePath of files) {
    try {
      const session = safeReadJson<Record<string, unknown>>(filePath, {});

      if (!session.id || !session.createdAt) continue;

      const relativePath = path.relative(sessionsDir, filePath);
      const interactions = (session.interactions as unknown[]) || [];
      const context = (session.context as Record<string, unknown>) || {};
      const user = context.user as { name?: string } | undefined;
      const summary = (session.summary as Record<string, unknown>) || {};

      items.push({
        id: session.id as string,
        title:
          (summary.title as string) || (session.title as string) || "Untitled",
        goal: (summary.goal as string) || (session.goal as string) || undefined,
        createdAt: session.createdAt as string,
        tags: (session.tags as string[]) || [],
        sessionType:
          (session.sessionType as SessionIndexItem["sessionType"]) || null,
        branch: (context.branch as string) || null,
        user: user?.name,
        interactionCount: interactions.length,
        filePath: relativePath,
      });
    } catch {
      // Skip invalid files
    }
  }

  // Sort by createdAt descending
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };
}

/**
 * Build decision index from decision files
 */
export function buildDecisionIndex(memoriaDir: string): DecisionIndex {
  const decisionsDir = path.join(memoriaDir, "decisions");
  const files = listDatedJsonFiles(decisionsDir);

  const items: DecisionIndexItem[] = [];

  for (const filePath of files) {
    try {
      const decision = safeReadJson<Record<string, unknown>>(filePath, {});

      if (!decision.id || !decision.createdAt) continue;

      const relativePath = path.relative(decisionsDir, filePath);
      const user = decision.user as { name?: string } | undefined;

      items.push({
        id: decision.id as string,
        title: (decision.title as string) || "Untitled",
        createdAt: decision.createdAt as string,
        updatedAt: decision.updatedAt as string | undefined,
        tags: (decision.tags as string[]) || [],
        status: (decision.status as DecisionIndexItem["status"]) || "active",
        user: user?.name,
        filePath: relativePath,
      });
    } catch {
      // Skip invalid files
    }
  }

  // Sort by createdAt descending
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };
}

/**
 * Build all indexes
 */
export function buildAllIndexes(memoriaDir: string): {
  sessions: SessionIndex;
  decisions: DecisionIndex;
} {
  return {
    sessions: buildSessionIndex(memoriaDir),
    decisions: buildDecisionIndex(memoriaDir),
  };
}
