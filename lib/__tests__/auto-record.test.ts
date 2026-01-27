import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type AutoRecordInput, recordToolUse } from "../auto-record";

describe("auto-record", () => {
  let tmpDir: string;
  let sessionPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "memoria-test-"));
    sessionPath = path.join(tmpDir, "session.json");
    // 初期セッションファイル作成
    fs.writeFileSync(
      sessionPath,
      JSON.stringify({
        id: "test-session",
        interactions: [],
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("recordToolUse", () => {
    it("Edit ツールの使用を記録する", () => {
      const input: AutoRecordInput = {
        sessionPath,
        toolName: "Edit",
        toolInput: {
          file_path: "/path/to/file.ts",
          old_string: "foo",
          new_string: "bar",
        },
        toolResult: {},
        timestamp: "2026-01-27T10:00:00Z",
      };
      recordToolUse(input);

      const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
      expect(session.interactions).toHaveLength(1);
      expect(session.interactions[0].filesModified).toContain(
        "/path/to/file.ts",
      );
    });

    it("Write ツールの使用を記録する", () => {
      const input: AutoRecordInput = {
        sessionPath,
        toolName: "Write",
        toolInput: { file_path: "/path/to/new-file.ts", content: "hello" },
        toolResult: {},
        timestamp: "2026-01-27T10:00:00Z",
      };
      recordToolUse(input);

      const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
      expect(session.interactions).toHaveLength(1);
      expect(session.interactions[0].filesModified).toContain(
        "/path/to/new-file.ts",
      );
    });

    it("Bash エラーを problem として記録する", () => {
      const input: AutoRecordInput = {
        sessionPath,
        toolName: "Bash",
        toolInput: { command: "npm test" },
        toolResult: { exitCode: 1, stderr: "Test failed" },
        timestamp: "2026-01-27T10:00:00Z",
      };
      recordToolUse(input);

      const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
      expect(session.interactions).toHaveLength(1);
      expect(session.interactions[0].problem).toContain("Test failed");
    });

    it("正常な Bash は記録しない", () => {
      const input: AutoRecordInput = {
        sessionPath,
        toolName: "Bash",
        toolInput: { command: "ls" },
        toolResult: { exitCode: 0, stdout: "file1 file2" },
        timestamp: "2026-01-27T10:00:00Z",
      };
      recordToolUse(input);

      const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
      expect(session.interactions).toHaveLength(0);
    });

    it("既存の interactions に追加する", () => {
      // 既存データがあるセッション
      fs.writeFileSync(
        sessionPath,
        JSON.stringify({
          id: "test-session",
          interactions: [{ id: "existing", topic: "Existing interaction" }],
        }),
      );

      const input: AutoRecordInput = {
        sessionPath,
        toolName: "Edit",
        toolInput: { file_path: "/path/to/file.ts" },
        toolResult: {},
        timestamp: "2026-01-27T10:00:00Z",
      };
      recordToolUse(input);

      const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
      expect(session.interactions).toHaveLength(2);
      expect(session.interactions[0].id).toBe("existing");
    });
  });
});
