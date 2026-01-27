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
function safeReadJsonWithSchema(filePath, schema, fallback) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    }
    console.warn(`Validation failed for ${filePath}: ${result.error.message}`);
    return fallback;
  } catch {
    return fallback;
  }
}
function safeWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
function nowISO() {
  return (/* @__PURE__ */ new Date()).toISOString();
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
export {
  ensureDir,
  findJsonFiles,
  nowISO,
  safeReadJson,
  safeReadJsonWithSchema,
  safeWriteJson
};
