import { z } from "zod";
import { SessionContextSchema } from "./common.js";

// Proposal schema (legacy, kept for backwards compatibility)
export const ProposalSchema = z.object({
  option: z.string(),
  description: z.string(),
});

export type Proposal = z.infer<typeof ProposalSchema>;

// Action schema (legacy, kept for backwards compatibility)
export const ActionSchema = z.object({
  type: z.enum(["create", "edit", "delete"]),
  path: z.string(),
  summary: z.string(),
});

export type Action = z.infer<typeof ActionSchema>;

// Session type enum
export const SessionTypeSchema = z.enum([
  "decision",
  "implementation",
  "research",
  "exploration",
  "discussion",
  "debug",
  "review",
]);

export type SessionType = z.infer<typeof SessionTypeSchema>;

// Interaction schema (new format: auto-saved from transcript)
export const InteractionSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  user: z.string(), // User message
  thinking: z.string().optional(), // Claude thinking
  assistant: z.string().optional(), // Claude response
});

export type Interaction = z.infer<typeof InteractionSchema>;

// File change schema
export const FileChangeSchema = z.object({
  path: z.string(),
  action: z.enum(["create", "edit", "delete", "rename"]),
});

export type FileChange = z.infer<typeof FileChangeSchema>;

// Tool usage schema
export const ToolUsageSchema = z.object({
  name: z.string(),
  count: z.number(),
});

export type ToolUsage = z.infer<typeof ToolUsageSchema>;

// Metrics schema
export const MetricsSchema = z.object({
  userMessages: z.number().optional(),
  assistantResponses: z.number().optional(),
  thinkingBlocks: z.number().optional(),
  toolUsage: z.array(ToolUsageSchema).optional(),
});

export type Metrics = z.infer<typeof MetricsSchema>;

// PreCompact backup schema
export const PreCompactBackupSchema = z.object({
  timestamp: z.string(),
  interactions: z.array(InteractionSchema),
});

export type PreCompactBackup = z.infer<typeof PreCompactBackupSchema>;

// YAML-specific schemas (for /memoria:save structured data)
export const SessionYamlSummarySchema = z.object({
  title: z.string(),
  goal: z.string().optional(),
  outcome: z.enum(["success", "partial", "blocked", "abandoned"]).optional(),
  description: z.string().optional(),
  session_type: SessionTypeSchema.optional(),
});

export type SessionYamlSummary = z.infer<typeof SessionYamlSummarySchema>;

export const SessionYamlPlanSchema = z.object({
  goals: z.array(z.string()).optional(),
  tasks: z.array(z.string()).optional(),
  remaining: z.array(z.string()).optional(),
});

export type SessionYamlPlan = z.infer<typeof SessionYamlPlanSchema>;

export const SessionYamlDiscussionSchema = z.object({
  topic: z.string(),
  timestamp: z.string().optional(),
  options: z.array(z.string()).optional(),
  decision: z.string(),
  reasoning: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
});

export type SessionYamlDiscussion = z.infer<typeof SessionYamlDiscussionSchema>;

export const SessionYamlCodeExampleSchema = z.object({
  file: z.string(),
  description: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});

export type SessionYamlCodeExample = z.infer<
  typeof SessionYamlCodeExampleSchema
>;

export const SessionYamlErrorSchema = z.object({
  error: z.string(),
  context: z.string().optional(),
  cause: z.string().optional(),
  solution: z.string().optional(),
  files: z.array(z.string()).optional(),
});

export type SessionYamlError = z.infer<typeof SessionYamlErrorSchema>;

export const SessionYamlHandoffSchema = z.object({
  stopped_reason: z.string().optional(),
  notes: z.array(z.string()).optional(),
  next_steps: z.array(z.string()).optional(),
});

export type SessionYamlHandoff = z.infer<typeof SessionYamlHandoffSchema>;

export const SessionYamlReferenceSchema = z.object({
  type: z.string().optional(),
  url: z.string().optional(),
  path: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export type SessionYamlReference = z.infer<typeof SessionYamlReferenceSchema>;

export const SessionYamlSchema = z.object({
  version: z.number(),
  session_id: z.string(),
  summary: SessionYamlSummarySchema.optional(),
  plan: SessionYamlPlanSchema.optional(),
  discussions: z.array(SessionYamlDiscussionSchema).optional(),
  code_examples: z.array(SessionYamlCodeExampleSchema).optional(),
  errors: z.array(SessionYamlErrorSchema).optional(),
  handoff: SessionYamlHandoffSchema.optional(),
  references: z.array(SessionYamlReferenceSchema).optional(),
});

export type SessionYaml = z.infer<typeof SessionYamlSchema>;

// Comment schema
export const CommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  user: z.string(),
  createdAt: z.string(),
});

export type Comment = z.infer<typeof CommentSchema>;

// Session status enum
export const SessionStatusSchema = z.enum([
  "in_progress",
  "complete",
  "abandoned",
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// Session schema (JSON file structure)
export const SessionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  createdAt: z.string(),
  endedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  context: SessionContextSchema,
  // Search index fields (set by /memoria:save)
  title: z.string(),
  tags: z.array(z.string()),
  // Auto-saved data (SessionEnd hook)
  interactions: z.array(InteractionSchema),
  files: z.array(FileChangeSchema).optional(),
  metrics: MetricsSchema.optional(),
  // Session chain tracking
  resumedFrom: z.string().optional(),
  // PreCompact backups
  preCompactBackups: z.array(PreCompactBackupSchema).optional(),
  // Status
  status: SessionStatusSchema.nullable().optional(),
  // Legacy fields (kept for backwards compatibility)
  goal: z.string().optional(),
  sessionType: SessionTypeSchema.nullable().optional(),
  relatedSessions: z.array(z.string()).optional(),
  comments: z.array(CommentSchema).optional(),
});

export type Session = z.infer<typeof SessionSchema>;
