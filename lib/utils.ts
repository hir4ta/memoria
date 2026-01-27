import * as fs from "node:fs";
import * as path from "node:path";

/**
 * 安全にJSONファイルを読み込む
 * ファイルが存在しない、またはパースエラーの場合はフォールバック値を返す
 */
export function safeReadJson<T>(filePath: string, fallback: T): T {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

/**
 * 安全にJSONファイルを書き込む
 * 親ディレクトリが存在しない場合は自動作成
 */
export function safeWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * ディレクトリが存在しなければ作成する
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 現在のタイムスタンプをISO8601形式で取得
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * JSONファイルを再帰的に検索
 */
export function findJsonFiles(dir: string): string[] {
  const results: string[] = [];
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
