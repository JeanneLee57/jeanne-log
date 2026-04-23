import { z } from "zod";

export const completeRegenerationJobSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  mdxSource: z.string().min(1),
  modelName: z.string().max(128).optional(),
  author: z.string().max(255).optional(),
  tags: z.array(z.string().min(1)).optional(),
  generationPromptSnapshot: z.string().optional(),
  generationContext: z.record(z.string(), z.unknown()).optional(),
});

export const failRegenerationJobSchema = z.object({
  errorMessage: z.string().min(1),
});

export type CompleteRegenerationJobInput = z.infer<typeof completeRegenerationJobSchema>;
export type FailRegenerationJobInput = z.infer<typeof failRegenerationJobSchema>;
