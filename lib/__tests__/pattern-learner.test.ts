import { describe, expect, it } from "vitest";
import {
  aggregateReviewFindings,
  detectCoChanges,
  parseFixCommit,
} from "../pattern-learner";

describe("pattern-learner", () => {
  describe("parseFixCommit", () => {
    it("fix: コミットからエラーパターンを抽出する", () => {
      const commit = {
        hash: "abc123",
        message: "fix: JWT signature error when using HS256",
        files: ["src/auth/jwt.ts"],
      };
      const result = parseFixCommit(commit);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("error-solution");
      expect(result?.data.errorPattern).toContain("JWT");
    });

    it("fix: 以外のコミットは null を返す", () => {
      const commit = {
        hash: "def456",
        message: "feat: add user profile",
        files: [],
      };
      const result = parseFixCommit(commit);
      expect(result).toBeNull();
    });

    it("Fix: (大文字) も認識する", () => {
      const commit = {
        hash: "ghi789",
        message: "Fix: resolve memory leak",
        files: ["src/memory.ts"],
      };
      const result = parseFixCommit(commit);
      expect(result).not.toBeNull();
    });
  });

  describe("detectCoChanges", () => {
    it("70%以上の共起率でパターン検出", () => {
      const commits = [
        { files: ["a.ts", "b.ts"] },
        { files: ["a.ts", "b.ts"] },
        { files: ["a.ts", "b.ts"] },
        { files: ["a.ts"] },
        { files: ["c.ts"] },
      ];
      const result = detectCoChanges(commits, 0.7);
      const abPair = result.find(
        (r) => r.files.includes("a.ts") && r.files.includes("b.ts"),
      );
      expect(abPair).toBeDefined();
      expect(abPair?.rate).toBeGreaterThanOrEqual(0.7);
    });

    it("閾値未満の共起は検出しない", () => {
      const commits = [
        { files: ["a.ts", "b.ts"] },
        { files: ["a.ts"] },
        { files: ["a.ts"] },
        { files: ["a.ts"] },
      ];
      const result = detectCoChanges(commits, 0.7);
      expect(result).toHaveLength(0);
    });
  });

  describe("aggregateReviewFindings", () => {
    it("同じ指摘3回以上でルール候補化", () => {
      const reviews = [
        { findings: [{ title: "Missing error handling", ruleId: null }] },
        { findings: [{ title: "Missing error handling", ruleId: null }] },
        { findings: [{ title: "Missing error handling", ruleId: null }] },
      ];
      const result = aggregateReviewFindings(reviews, 3);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain("error handling");
    });

    it("既存ルールがある指摘は除外する", () => {
      const reviews = [
        { findings: [{ title: "Has rule", ruleId: "rule-123" }] },
        { findings: [{ title: "Has rule", ruleId: "rule-123" }] },
        { findings: [{ title: "Has rule", ruleId: "rule-123" }] },
      ];
      const result = aggregateReviewFindings(reviews, 3);
      expect(result).toHaveLength(0);
    });

    it("閾値未満の指摘は除外する", () => {
      const reviews = [
        { findings: [{ title: "Rare issue", ruleId: null }] },
        { findings: [{ title: "Rare issue", ruleId: null }] },
      ];
      const result = aggregateReviewFindings(reviews, 3);
      expect(result).toHaveLength(0);
    });
  });
});
