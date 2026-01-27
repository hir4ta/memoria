// lib/session-continuity.ts
import * as fs2 from "node:fs";
import * as path2 from "node:path";

// lib/utils.ts
import * as fs from "node:fs";
import * as path from "node:path";
function safeReadJson(filePath, fallback) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}
function findJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (item.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

// lib/session-continuity.ts
function extractPendingTasks(markdown) {
  const lines = markdown.split("\n");
  const pending = [];
  for (const line of lines) {
    const match = line.match(/^[-*]\s*\[\s*\]\s*(.+)$/);
    if (match) {
      pending.push(match[1].trim());
    }
  }
  return pending;
}
function generateSessionSummary(session) {
  const parts = [];
  if (session.title) {
    parts.push(`**Session:** ${session.title}`);
  }
  if (session.goal) {
    parts.push(`**Goal:** ${session.goal}`);
  }
  if (session.interactions?.length) {
    const recentInteractions = session.interactions.slice(-5);
    const decisions = recentInteractions.filter((i) => i.topic && i.choice);
    if (decisions.length > 0) {
      parts.push("\n**Key decisions:**");
      for (const interaction of decisions) {
        parts.push(`- ${interaction.topic}: ${interaction.choice}`);
      }
    }
    const allFiles = session.interactions.flatMap((i) => i.filesModified || []);
    const uniqueFiles = [...new Set(allFiles)];
    if (uniqueFiles.length > 0) {
      parts.push(
        `
**Files modified:** ${uniqueFiles.slice(0, 10).join(", ")}`
      );
    }
  }
  return parts.join("\n");
}
async function buildContinueContext(memoriaDir, tasksPath) {
  const sessionsDir = path2.join(memoriaDir, "sessions");
  const sessionFiles = findJsonFiles(sessionsDir).sort().reverse();
  const previousSession = sessionFiles.length > 0 ? safeReadJson(sessionFiles[0], null) : null;
  let pendingTasks = [];
  const defaultTasksPath = tasksPath || "docs/plans/tasks.md";
  if (fs2.existsSync(defaultTasksPath)) {
    const tasksContent = fs2.readFileSync(defaultTasksPath, "utf-8");
    pendingTasks = extractPendingTasks(tasksContent);
  }
  const summary = previousSession ? generateSessionSummary(previousSession) : "No previous session found";
  return {
    previousSession,
    pendingTasks,
    summary
  };
}
var isMain = process.argv[1]?.endsWith("session-continuity.js") || process.argv[1]?.endsWith("session-continuity.ts");
if (isMain && process.argv.length > 2) {
  const memoriaDir = `${process.cwd()}/.memoria`;
  buildContinueContext(memoriaDir).then((context) => {
    console.log(JSON.stringify({ success: true, context }));
  }).catch((error) => {
    console.error(JSON.stringify({ success: false, error: String(error) }));
  });
}
export {
  buildContinueContext,
  extractPendingTasks,
  generateSessionSummary
};
