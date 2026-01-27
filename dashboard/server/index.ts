import fs from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Get project root from environment variable
const getProjectRoot = () => {
  return process.env.MEMORIA_PROJECT_ROOT || process.cwd();
};

const getMemoriaDir = () => {
  return path.join(getProjectRoot(), ".memoria");
};

const listJsonFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listJsonFiles(fullPath);
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      return [fullPath];
    }
    return [];
  });
};

const listDatedJsonFiles = (dir: string): string[] => {
  const files = listJsonFiles(dir);
  return files.filter((filePath) => {
    const rel = path.relative(dir, filePath);
    const parts = rel.split(path.sep);
    if (parts.length < 3) {
      return false;
    }
    return /^\d{4}$/.test(parts[0]) && /^\d{2}$/.test(parts[1]);
  });
};

const findJsonFileById = (dir: string, id: string): string | null => {
  const target = `${id}.json`;
  const queue = [dir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || !fs.existsSync(current)) {
      continue;
    }
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && entry.name === target) {
        const rel = path.relative(dir, fullPath);
        const parts = rel.split(path.sep);
        if (
          parts.length >= 3 &&
          /^\d{4}$/.test(parts[0]) &&
          /^\d{2}$/.test(parts[1])
        ) {
          return fullPath;
        }
      }
    }
  }
  return null;
};

const rulesDir = () => path.join(getMemoriaDir(), "rules");

const getYearMonthDir = (baseDir: string, isoDate: string): string => {
  const parsed = new Date(isoDate);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return path.join(baseDir, String(year), month);
};

// CORS for development
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:7777"],
  }),
);

// API Routes

// Sessions
app.get("/api/sessions", async (c) => {
  const sessionsDir = path.join(getMemoriaDir(), "sessions");
  try {
    const files = listDatedJsonFiles(sessionsDir);
    if (files.length === 0) {
      return c.json([]);
    }
    const sessions = files.map((filePath) => {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    });
    // Sort by createdAt descending
    sessions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return c.json(sessions);
  } catch {
    return c.json({ error: "Failed to read sessions" }, 500);
  }
});

app.get("/api/sessions/:id", async (c) => {
  const id = c.req.param("id");
  const sessionsDir = path.join(getMemoriaDir(), "sessions");
  try {
    const filePath = findJsonFileById(sessionsDir, id);
    if (!filePath) {
      return c.json({ error: "Session not found" }, 404);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return c.json(JSON.parse(content));
  } catch {
    return c.json({ error: "Failed to read session" }, 500);
  }
});

app.put("/api/sessions/:id", async (c) => {
  const id = c.req.param("id");
  const sessionsDir = path.join(getMemoriaDir(), "sessions");
  try {
    const filePath = findJsonFileById(sessionsDir, id);
    if (!filePath) {
      return c.json({ error: "Session not found" }, 404);
    }
    const body = await c.req.json();
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
    return c.json(body);
  } catch {
    return c.json({ error: "Failed to update session" }, 500);
  }
});

app.delete("/api/sessions/:id", async (c) => {
  const id = c.req.param("id");
  const sessionsDir = path.join(getMemoriaDir(), "sessions");
  try {
    const filePath = findJsonFileById(sessionsDir, id);
    if (!filePath) {
      return c.json({ error: "Session not found" }, 404);
    }
    fs.unlinkSync(filePath);
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to delete session" }, 500);
  }
});

app.post("/api/sessions/:id/comments", async (c) => {
  const id = c.req.param("id");
  const sessionsDir = path.join(getMemoriaDir(), "sessions");
  try {
    const filePath = findJsonFileById(sessionsDir, id);
    if (!filePath) {
      return c.json({ error: "Session not found" }, 404);
    }
    const session = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const body = await c.req.json();
    const comment = {
      id: `comment-${Date.now()}`,
      content: body.content,
      user: body.user,
      createdAt: new Date().toISOString(),
    };
    session.comments = session.comments || [];
    session.comments.push(comment);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    return c.json(comment, 201);
  } catch {
    return c.json({ error: "Failed to add comment" }, 500);
  }
});

// Decisions
app.get("/api/decisions", async (c) => {
  const decisionsDir = path.join(getMemoriaDir(), "decisions");
  try {
    const files = listDatedJsonFiles(decisionsDir);
    if (files.length === 0) {
      return c.json([]);
    }
    const decisions = files.map((filePath) => {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    });
    decisions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return c.json(decisions);
  } catch {
    return c.json({ error: "Failed to read decisions" }, 500);
  }
});

app.get("/api/decisions/:id", async (c) => {
  const id = c.req.param("id");
  const decisionsDir = path.join(getMemoriaDir(), "decisions");
  try {
    const filePath = findJsonFileById(decisionsDir, id);
    if (!filePath) {
      return c.json({ error: "Decision not found" }, 404);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return c.json(JSON.parse(content));
  } catch {
    return c.json({ error: "Failed to read decision" }, 500);
  }
});

app.post("/api/decisions", async (c) => {
  const decisionsDir = path.join(getMemoriaDir(), "decisions");
  try {
    const body = await c.req.json();
    const id = body.id || `decision-${Date.now()}`;
    body.id = id;
    body.createdAt = body.createdAt || new Date().toISOString();
    const targetDir = getYearMonthDir(decisionsDir, body.createdAt);
    fs.mkdirSync(targetDir, { recursive: true });
    const filePath = path.join(targetDir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
    return c.json(body, 201);
  } catch {
    return c.json({ error: "Failed to create decision" }, 500);
  }
});

app.put("/api/decisions/:id", async (c) => {
  const id = c.req.param("id");
  const decisionsDir = path.join(getMemoriaDir(), "decisions");
  try {
    const filePath = findJsonFileById(decisionsDir, id);
    if (!filePath) {
      return c.json({ error: "Decision not found" }, 404);
    }
    const body = await c.req.json();
    body.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
    return c.json(body);
  } catch {
    return c.json({ error: "Failed to update decision" }, 500);
  }
});

app.delete("/api/decisions/:id", async (c) => {
  const id = c.req.param("id");
  const decisionsDir = path.join(getMemoriaDir(), "decisions");
  try {
    const filePath = findJsonFileById(decisionsDir, id);
    if (!filePath) {
      return c.json({ error: "Decision not found" }, 404);
    }
    fs.unlinkSync(filePath);
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Failed to delete decision" }, 500);
  }
});

// Project info
app.get("/api/info", async (c) => {
  const projectRoot = getProjectRoot();
  const memoriaDir = getMemoriaDir();
  return c.json({
    projectRoot,
    memoriaDir,
    exists: fs.existsSync(memoriaDir),
  });
});

// Rules
app.get("/api/rules/:id", async (c) => {
  const id = c.req.param("id");
  const dir = rulesDir();
  try {
    const filePath = path.join(dir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return c.json({ error: "Rules not found" }, 404);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return c.json(JSON.parse(content));
  } catch {
    return c.json({ error: "Failed to read rules" }, 500);
  }
});

app.put("/api/rules/:id", async (c) => {
  const id = c.req.param("id");
  const dir = rulesDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${id}.json`);
    const body = await c.req.json();
    body.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
    return c.json(body);
  } catch {
    return c.json({ error: "Failed to update rules" }, 500);
  }
});

// Timeline API - セッションを時系列でグループ化
app.get("/api/timeline", async (c) => {
  const sessionsDir = path.join(getMemoriaDir(), "sessions");
  try {
    const files = listDatedJsonFiles(sessionsDir);
    if (files.length === 0) {
      return c.json({ timeline: {} });
    }
    const sessions = files.map((filePath) => {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    });

    // 日付でグループ化
    const grouped: Record<string, typeof sessions> = {};
    for (const session of sessions) {
      const date = session.createdAt?.split("T")[0] || "unknown";
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({
        id: session.id,
        title: session.title || "Untitled",
        sessionType: session.sessionType,
        branch: session.context?.branch,
        tags: session.tags || [],
        createdAt: session.createdAt,
      });
    }

    // 日付をソート
    const sortedTimeline: Record<string, typeof sessions> = {};
    for (const date of Object.keys(grouped).sort().reverse()) {
      sortedTimeline[date] = grouped[date].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return c.json({ timeline: sortedTimeline });
  } catch {
    return c.json({ error: "Failed to build timeline" }, 500);
  }
});

// Tag Network API - タグの共起ネットワーク
app.get("/api/tag-network", async (c) => {
  const sessionsDir = path.join(getMemoriaDir(), "sessions");
  try {
    const files = listDatedJsonFiles(sessionsDir);
    const tagCounts: Map<string, number> = new Map();
    const coOccurrences: Map<string, number> = new Map();

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf-8");
      const session = JSON.parse(content);
      const tags: string[] = session.tags || [];

      // タグカウント
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }

      // 共起カウント
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const key = [tags[i], tags[j]].sort().join("|");
          coOccurrences.set(key, (coOccurrences.get(key) || 0) + 1);
        }
      }
    }

    const nodes = Array.from(tagCounts.entries()).map(([id, count]) => ({
      id,
      count,
    }));

    const edges = Array.from(coOccurrences.entries()).map(([key, weight]) => {
      const [source, target] = key.split("|");
      return { source, target, weight };
    });

    return c.json({ nodes, edges });
  } catch {
    return c.json({ error: "Failed to build tag network" }, 500);
  }
});

// Decision Impact API - 決定の影響範囲
app.get("/api/decisions/:id/impact", async (c) => {
  const decisionId = c.req.param("id");
  const sessionsDir = path.join(getMemoriaDir(), "sessions");
  const patternsDir = path.join(getMemoriaDir(), "patterns");

  try {
    const impactedSessions: { id: string; title: string }[] = [];
    const impactedPatterns: { id: string; description: string }[] = [];

    // セッションを検索
    const sessionFiles = listDatedJsonFiles(sessionsDir);
    for (const filePath of sessionFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const session = JSON.parse(content);

      // interactions の reasoning や relatedSessions に決定IDが含まれるかチェック
      const hasReference =
        session.relatedSessions?.includes(decisionId) ||
        session.interactions?.some(
          (i: Record<string, unknown>) =>
            (i.reasoning as string)?.includes(decisionId) ||
            (i.choice as string)?.includes(decisionId),
        );

      if (hasReference) {
        impactedSessions.push({
          id: session.id,
          title: session.title || "Untitled",
        });
      }
    }

    // パターンを検索
    const patternFiles = listJsonFiles(patternsDir);
    for (const filePath of patternFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      const patterns = data.patterns || [];

      for (const pattern of patterns) {
        if (
          pattern.sourceId?.includes(decisionId) ||
          pattern.description?.includes(decisionId)
        ) {
          impactedPatterns.push({
            id: `${path.basename(filePath, ".json")}-${pattern.type}`,
            description: pattern.description || "No description",
          });
        }
      }
    }

    return c.json({
      decisionId,
      impactedSessions,
      impactedPatterns,
    });
  } catch {
    return c.json({ error: "Failed to analyze decision impact" }, 500);
  }
});

// Tags
app.get("/api/tags", async (c) => {
  const tagsPath = path.join(getMemoriaDir(), "tags.json");
  try {
    if (!fs.existsSync(tagsPath)) {
      return c.json({ version: 1, tags: [] });
    }
    const content = fs.readFileSync(tagsPath, "utf-8");
    return c.json(JSON.parse(content));
  } catch {
    return c.json({ error: "Failed to read tags" }, 500);
  }
});

// Serve static files in production
// When bundled, server.js is at dist/server.js and static files at dist/public/
const distPath = path.join(import.meta.dirname, "public");
if (fs.existsSync(distPath)) {
  app.use("/*", serveStatic({ root: distPath }));
  // SPA fallback - serve index.html for all non-API routes
  app.get("*", async (c) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, "utf-8");
      return c.html(content);
    }
    return c.notFound();
  });
}

const port = parseInt(process.env.PORT || "7777", 10);

console.log(`\nmemoria dashboard`);
console.log(`Project: ${getProjectRoot()}`);
console.log(`URL: http://localhost:${port}\n`);

serve({
  fetch: app.fetch,
  port,
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
