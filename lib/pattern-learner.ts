import * as path from "node:path";
import { findJsonFiles, safeReadJson, safeWriteJson } from "./utils.js";

export interface Commit {
  hash: string;
  message: string;
  files: string[];
}

export interface LearnedPattern {
  type: "error-solution" | "co-change" | "rule-candidate";
  source: "git-commit" | "review" | "co-occurrence";
  confidence: number;
  data: Record<string, unknown>;
}

/**
 * fix: コミットからエラー解決パターンを抽出
 */
export function parseFixCommit(commit: Commit): LearnedPattern | null {
  const message = commit.message.trim();
  if (!message.toLowerCase().startsWith("fix:")) {
    return null;
  }

  const errorPattern = message.replace(/^fix:\s*/i, "").trim();

  return {
    type: "error-solution",
    source: "git-commit",
    confidence: 0.6,
    data: {
      errorPattern,
      relatedFiles: commit.files,
      commitHash: commit.hash,
    },
  };
}

/**
 * ファイルの共起パターンを検出
 * threshold: 共起率の閾値（0.0-1.0）
 */
export function detectCoChanges(
  commits: { files: string[] }[],
  threshold = 0.7,
): { files: string[]; rate: number }[] {
  const pairCounts: Map<string, number> = new Map();
  const fileCounts: Map<string, number> = new Map();

  for (const commit of commits) {
    const files = [...new Set(commit.files)].sort();
    for (const file of files) {
      fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
    }
    // ペアのカウント
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const key = `${files[i]}|${files[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const results: { files: string[]; rate: number }[] = [];
  for (const [key, count] of pairCounts) {
    const [fileA, fileB] = key.split("|");
    const maxCount = Math.max(
      fileCounts.get(fileA) || 0,
      fileCounts.get(fileB) || 0,
    );
    if (maxCount === 0) continue;
    const rate = count / maxCount;
    if (rate >= threshold) {
      results.push({ files: [fileA, fileB], rate });
    }
  }

  return results;
}

/**
 * レビュー指摘を集計し、頻出するものをルール候補化
 */
export function aggregateReviewFindings(
  reviews: { findings: { title: string; ruleId: string | null }[] }[],
  minOccurrences = 3,
): { text: string; count: number }[] {
  const counts: Map<string, number> = new Map();

  for (const review of reviews) {
    for (const finding of review.findings) {
      // 既存ルールがある指摘は除外
      if (finding.ruleId) continue;

      const normalized = finding.title.toLowerCase().trim();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= minOccurrences)
    .map(([text, count]) => ({ text, count }));
}

/**
 * パターン学習を実行してファイルに保存
 */
export async function learnPatterns(
  memoriaDir: string,
  options: {
    analyzeCommits?: boolean;
    analyzeReviews?: boolean;
    analyzeCoChanges?: boolean;
  } = {},
): Promise<LearnedPattern[]> {
  const patterns: LearnedPattern[] = [];
  const {
    analyzeCommits = true,
    analyzeReviews = true,
    analyzeCoChanges = true,
  } = options;

  // レビュー分析
  if (analyzeReviews) {
    const reviewsDir = path.join(memoriaDir, "reviews");
    const reviewFiles = findJsonFiles(reviewsDir);
    const reviews = reviewFiles.map((f) =>
      safeReadJson<{ findings: { title: string; ruleId: string | null }[] }>(
        f,
        { findings: [] },
      ),
    );

    const ruleCandidates = aggregateReviewFindings(reviews, 3);
    for (const candidate of ruleCandidates) {
      patterns.push({
        type: "rule-candidate",
        source: "review",
        confidence: Math.min(candidate.count / 10, 1),
        data: {
          text: candidate.text,
          occurrences: candidate.count,
        },
      });
    }
  }

  return patterns;
}

// CLI エントリポイント
const isMain =
  process.argv[1]?.endsWith("pattern-learner.js") ||
  process.argv[1]?.endsWith("pattern-learner.ts");

if (isMain && process.argv.length > 2) {
  const args = process.argv.slice(2);
  const memoriaDir = process.cwd() + "/.memoria";

  learnPatterns(memoriaDir, {
    analyzeCommits: args.includes("--analyze-commits"),
    analyzeReviews: args.includes("--analyze-reviews"),
    analyzeCoChanges: args.includes("--analyze-co-changes"),
  })
    .then((patterns) => {
      console.log(JSON.stringify({ success: true, patterns }));
    })
    .catch((error) => {
      console.error(JSON.stringify({ success: false, error: String(error) }));
    });
}
