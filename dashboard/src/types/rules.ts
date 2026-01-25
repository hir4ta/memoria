export interface RuleSource {
  type: "session" | "decision";
  id: string;
}

export interface RuleItem {
  id: string;
  key: string;
  text: string;
  category?: string;
  scope?: string;
  tags?: string[];
  status: "active" | "deprecated";
  confidence?: "auto" | "manual";
  priority?: "p0" | "p1" | "p2";
  rationale?: string | null;
  appliesTo?: string[];
  exceptions?: string[];
  tokens?: string[];
  createdAt: string;
  updatedAt: string;
  occurrences?: number;
  sources?: RuleSource[];
  lastSeenAt?: string;
  supersedes?: string[];
  supersededBy?: string | null;
  ruleType?: "dev-rules" | "review-guidelines";
}

export interface RuleDocument {
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  items: RuleItem[];
  ruleType?: "dev-rules" | "review-guidelines";
}
