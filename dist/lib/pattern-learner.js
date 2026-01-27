// lib/pattern-learner.ts
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

// lib/pattern-learner.ts
function parseFixCommit(commit) {
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
      commitHash: commit.hash
    }
  };
}
function detectCoChanges(commits, threshold = 0.7) {
  const pairCounts = /* @__PURE__ */ new Map();
  const fileCounts = /* @__PURE__ */ new Map();
  for (const commit of commits) {
    const files = [...new Set(commit.files)].sort();
    for (const file of files) {
      fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
    }
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const key = `${files[i]}|${files[j]}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }
  const results = [];
  for (const [key, count] of pairCounts) {
    const [fileA, fileB] = key.split("|");
    const maxCount = Math.max(
      fileCounts.get(fileA) || 0,
      fileCounts.get(fileB) || 0
    );
    if (maxCount === 0) continue;
    const rate = count / maxCount;
    if (rate >= threshold) {
      results.push({ files: [fileA, fileB], rate });
    }
  }
  return results;
}
function aggregateReviewFindings(reviews, minOccurrences = 3) {
  const counts = /* @__PURE__ */ new Map();
  for (const review of reviews) {
    for (const finding of review.findings) {
      if (finding.ruleId) continue;
      const normalized = finding.title.toLowerCase().trim();
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }
  return Array.from(counts.entries()).filter(([, count]) => count >= minOccurrences).map(([text, count]) => ({ text, count }));
}
async function learnPatterns(memoriaDir, options = {}) {
  const patterns = [];
  const { analyzeReviews = true } = options;
  if (analyzeReviews) {
    const reviewsDir = path2.join(memoriaDir, "reviews");
    const reviewFiles = findJsonFiles(reviewsDir);
    const reviews = reviewFiles.map(
      (f) => safeReadJson(
        f,
        { findings: [] }
      )
    );
    const ruleCandidates = aggregateReviewFindings(reviews, 3);
    for (const candidate of ruleCandidates) {
      patterns.push({
        type: "rule-candidate",
        source: "review",
        confidence: Math.min(candidate.count / 10, 1),
        data: {
          text: candidate.text,
          occurrences: candidate.count
        }
      });
    }
  }
  return patterns;
}
var isMain = process.argv[1]?.endsWith("pattern-learner.js") || process.argv[1]?.endsWith("pattern-learner.ts");
if (isMain && process.argv.length > 2) {
  const args = process.argv.slice(2);
  const memoriaDir = `${process.cwd()}/.memoria`;
  learnPatterns(memoriaDir, {
    analyzeCommits: args.includes("--analyze-commits"),
    analyzeReviews: args.includes("--analyze-reviews"),
    analyzeCoChanges: args.includes("--analyze-co-changes")
  }).then((patterns) => {
    console.log(JSON.stringify({ success: true, patterns }));
  }).catch((error) => {
    console.error(JSON.stringify({ success: false, error: String(error) }));
  });
}
export {
  aggregateReviewFindings,
  detectCoChanges,
  learnPatterns,
  parseFixCommit
};
