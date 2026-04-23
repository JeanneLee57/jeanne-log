import { z } from "zod";

export const updateDraftSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  mdxSource: z.string().min(1),
});

export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
