import * as fs from "node:fs";
import * as path from "node:path";
import type { DecisionIndex, SessionIndex } from "../schemas/index.js";
import { ensureDir, safeReadJson } from "../utils.js";
import { buildDecisionIndex, buildSessionIndex } from "./builder.js";

const INDEXES_DIR = ".indexes";

/**
 * Get index directory path
 */
function getIndexDir(memoriaDir: string): string {
  return path.join(memoriaDir, INDEXES_DIR);
}

/**
 * Get session index file path
 */
function getSessionIndexPath(memoriaDir: string): string {
  return path.join(getIndexDir(memoriaDir), "sessions.json");
}

/**
 * Get decision index file path
 */
function getDecisionIndexPath(memoriaDir: string): string {
  return path.join(getIndexDir(memoriaDir), "decisions.json");
}

/**
 * Read session index
 */
export function readSessionIndex(memoriaDir: string): SessionIndex | null {
  const indexPath = getSessionIndexPath(memoriaDir);
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  return safeReadJson<SessionIndex>(indexPath, {
    version: 1,
    updatedAt: "",
    items: [],
  });
}

/**
 * Read decision index
 */
export function readDecisionIndex(memoriaDir: string): DecisionIndex | null {
  const indexPath = getDecisionIndexPath(memoriaDir);
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  return safeReadJson<DecisionIndex>(indexPath, {
    version: 1,
    updatedAt: "",
    items: [],
  });
}

/**
 * Write session index
 */
export function writeSessionIndex(
  memoriaDir: string,
  index: SessionIndex,
): void {
  const indexDir = getIndexDir(memoriaDir);
  ensureDir(indexDir);
  const indexPath = getSessionIndexPath(memoriaDir);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Write decision index
 */
export function writeDecisionIndex(
  memoriaDir: string,
  index: DecisionIndex,
): void {
  const indexDir = getIndexDir(memoriaDir);
  ensureDir(indexDir);
  const indexPath = getDecisionIndexPath(memoriaDir);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Rebuild session index
 */
export function rebuildSessionIndex(memoriaDir: string): SessionIndex {
  const index = buildSessionIndex(memoriaDir);
  writeSessionIndex(memoriaDir, index);
  return index;
}

/**
 * Rebuild decision index
 */
export function rebuildDecisionIndex(memoriaDir: string): DecisionIndex {
  const index = buildDecisionIndex(memoriaDir);
  writeDecisionIndex(memoriaDir, index);
  return index;
}

/**
 * Rebuild all indexes
 */
export function rebuildAllIndexes(memoriaDir: string): {
  sessions: SessionIndex;
  decisions: DecisionIndex;
} {
  const sessions = rebuildSessionIndex(memoriaDir);
  const decisions = rebuildDecisionIndex(memoriaDir);
  return { sessions, decisions };
}

/**
 * Get or create session index
 * Returns existing index if valid, otherwise rebuilds
 */
export function getOrCreateSessionIndex(memoriaDir: string): SessionIndex {
  const existing = readSessionIndex(memoriaDir);
  if (existing && existing.items.length > 0) {
    return existing;
  }
  return rebuildSessionIndex(memoriaDir);
}

/**
 * Get or create decision index
 * Returns existing index if valid, otherwise rebuilds
 */
export function getOrCreateDecisionIndex(memoriaDir: string): DecisionIndex {
  const existing = readDecisionIndex(memoriaDir);
  if (existing && existing.items.length > 0) {
    return existing;
  }
  return rebuildDecisionIndex(memoriaDir);
}

/**
 * Check if index needs rebuild based on staleness
 * @param maxAgeMs Maximum age in milliseconds (default: 5 minutes)
 */
export function isIndexStale(
  index: SessionIndex | DecisionIndex | null,
  maxAgeMs = 5 * 60 * 1000,
): boolean {
  if (!index || !index.updatedAt) {
    return true;
  }
  const updatedAt = new Date(index.updatedAt).getTime();
  const now = Date.now();
  return now - updatedAt > maxAgeMs;
}
