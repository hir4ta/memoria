import { z } from "zod";

// Rule item schema
export const RuleItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  rule: z.string(),
  severity: z.enum(["error", "warning", "info"]).optional(),
  enabled: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type RuleItem = z.infer<typeof RuleItemSchema>;

// Rule document schema
export const RuleDocumentSchema = z.object({
  version: z.number().optional(),
  updatedAt: z.string().optional(),
  rules: z.array(RuleItemSchema),
});

export type RuleDocument = z.infer<typeof RuleDocumentSchema>;
