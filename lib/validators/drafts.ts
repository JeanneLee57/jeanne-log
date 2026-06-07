import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens only.");

export const updateDraftSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  mdxSource: z.string().min(1),
});

export const createDraftSchema = updateDraftSchema.extend({
  slug: slugSchema,
  publish: z.boolean().optional().default(false),
});

export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
export type CreateDraftInput = z.infer<typeof createDraftSchema>;
