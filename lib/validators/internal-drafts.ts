import { z } from "zod";

export const internalDraftSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1),
  summary: z.string().default(""),
  mdxSource: z.string().min(1),
  sourceType: z.enum(["weekly", "project", "manual", "regenerated"]).default("manual"),
  sourceLabel: z.string().max(255).optional(),
  modelName: z.string().max(128).optional(),
  author: z.string().max(255).optional(),
  tags: z.array(z.string().min(1)).optional(),
  generationPromptSnapshot: z.string().optional(),
  generationContext: z.record(z.string(), z.unknown()).optional(),
});

export type InternalDraftInput = z.infer<typeof internalDraftSchema>;
