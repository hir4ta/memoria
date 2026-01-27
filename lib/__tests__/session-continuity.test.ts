import { describe, expect, it } from "vitest";
import {
  extractPendingTasks,
  generateSessionSummary,
} from "../session-continuity";

describe("session-continuity", () => {
  describe("extractPendingTasks", () => {
    it("tasks.md から未完了タスクを抽出する", () => {
      const markdown = `
# Tasks
- [x] Completed task
- [ ] Pending task 1
- [ ] Pending task 2
- [x] Another completed
`;
      const result = extractPendingTasks(markdown);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe("Pending task 1");
      expect(result[1]).toBe("Pending task 2");
    });

    it("アスタリスクのリストも認識する", () => {
      const markdown = `
* [x] Done
* [ ] Not done
`;
      const result = extractPendingTasks(markdown);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("Not done");
    });

    it("空のマークダウンは空配列を返す", () => {
      const result = extractPendingTasks("");
      expect(result).toEqual([]);
    });

    it("全て完了の場合は空配列を返す", () => {
      const markdown = `
- [x] Task 1
- [x] Task 2
`;
      const result = extractPendingTasks(markdown);
      expect(result).toEqual([]);
    });
  });

  describe("generateSessionSummary", () => {
    it("タイトルとゴールを含むサマリーを生成する", () => {
      const session = {
        title: "Test Session",
        goal: "Implement feature X",
        interactions: [],
      };
      const summary = generateSessionSummary(session);
      expect(summary).toContain("Test Session");
      expect(summary).toContain("feature X");
    });

    it("interactions の決定を含める", () => {
      const session = {
        title: "Design Session",
        goal: "Design auth system",
        interactions: [
          { topic: "Auth method", choice: "JWT" },
          { topic: "Storage", choice: "Redis" },
        ],
      };
      const summary = generateSessionSummary(session);
      expect(summary).toContain("JWT");
      expect(summary).toContain("Redis");
    });

    it("変更したファイルを含める", () => {
      const session = {
        title: "Implementation",
        interactions: [
          {
            topic: "Create auth",
            filesModified: ["src/auth.ts", "src/utils.ts"],
          },
        ],
      };
      const summary = generateSessionSummary(session);
      expect(summary).toContain("auth.ts");
    });

    it("最大5件のinteractionsのみ含める", () => {
      const session = {
        title: "Long Session",
        interactions: Array.from({ length: 10 }, (_, i) => ({
          topic: `Topic ${i}`,
          choice: `Choice ${i}`,
        })),
      };
      const summary = generateSessionSummary(session);
      // 最後の5件のみ含まれる
      expect(summary).toContain("Choice 9");
      expect(summary).toContain("Choice 5");
      expect(summary).not.toContain("Choice 0");
    });
  });
});
