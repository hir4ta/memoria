import { z } from "zod";

// Tag schema
export const TagSchema = z.object({
  id: z.string(),
  label: z.string(),
  aliases: z.array(z.string()),
  category: z.string(),
  color: z.string(),
});

export type Tag = z.infer<typeof TagSchema>;

// Tags file schema
export const TagsFileSchema = z.object({
  version: z.number(),
  tags: z.array(TagSchema),
});

export type TagsFile = z.infer<typeof TagsFileSchema>;
