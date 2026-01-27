import * as fs from "node:fs";
import * as path from "node:path";
import { findJsonFiles, safeReadJson } from "./utils.js";

/**
 * Markdownから未完了タスク（[ ]）を抽出
 */
export function extractPendingTasks(markdown: string): string[] {
  const lines = markdown.split("\n");
  const pending: string[] = [];

  for (const line of lines) {
    // - [ ] または * [ ] パターンにマッチ
    const match = line.match(/^[-*]\s*\[\s*\]\s*(.+)$/);
    if (match) {
      pending.push(match[1].trim());
    }
  }

  return pending;
}

export interface Session {
  title?: string;
  goal?: string;
  interactions?: {
    topic?: string;
    choice?: string;
    filesModified?: string[];
  }[];
}

/**
 * セッションからサマリーを生成
 */
export function generateSessionSummary(session: Session): string {
  const parts: string[] = [];

  if (session.title) {
    parts.push(`**Session:** ${session.title}`);
  }
  if (session.goal) {
    parts.push(`**Goal:** ${session.goal}`);
  }

  if (session.interactions?.length) {
    // 最後の5件のみ
    const recentInteractions = session.interactions.slice(-5);

    const decisions = recentInteractions.filter((i) => i.topic && i.choice);
    if (decisions.length > 0) {
      parts.push("\n**Key decisions:**");
      for (const interaction of decisions) {
        parts.push(`- ${interaction.topic}: ${interaction.choice}`);
      }
    }

    // 変更されたファイル
    const allFiles = session.interactions.flatMap((i) => i.filesModified || []);
    const uniqueFiles = [...new Set(allFiles)];
    if (uniqueFiles.length > 0) {
      parts.push(
        `\n**Files modified:** ${uniqueFiles.slice(0, 10).join(", ")}`,
      );
    }
  }

  return parts.join("\n");
}

/**
 * resume --continue 用のコンテキストを構築
 */
export interface ContinueContext {
  previousSession: Session | null;
  pendingTasks: string[];
  summary: string;
}

export async function buildContinueContext(
  memoriaDir: string,
  tasksPath?: string,
): Promise<ContinueContext> {
  // 最新のセッションを取得
  const sessionsDir = path.join(memoriaDir, "sessions");
  const sessionFiles = findJsonFiles(sessionsDir).sort().reverse();
  const previousSession =
    sessionFiles.length > 0
      ? safeReadJson<Session>(sessionFiles[0], null)
      : null;

  // 未完了タスクを取得
  let pendingTasks: string[] = [];
  const defaultTasksPath = tasksPath || "docs/plans/tasks.md";
  if (fs.existsSync(defaultTasksPath)) {
    const tasksContent = fs.readFileSync(defaultTasksPath, "utf-8");
    pendingTasks = extractPendingTasks(tasksContent);
  }

  // サマリー生成
  const summary = previousSession
    ? generateSessionSummary(previousSession)
    : "No previous session found";

  return {
    previousSession,
    pendingTasks,
    summary,
  };
}

// CLI エントリポイント
const isMain =
  process.argv[1]?.endsWith("session-continuity.js") ||
  process.argv[1]?.endsWith("session-continuity.ts");

if (isMain && process.argv.length > 2) {
  const memoriaDir = process.cwd() + "/.memoria";

  buildContinueContext(memoriaDir)
    .then((context) => {
      console.log(JSON.stringify({ success: true, context }));
    })
    .catch((error) => {
      console.error(JSON.stringify({ success: false, error: String(error) }));
    });
}
