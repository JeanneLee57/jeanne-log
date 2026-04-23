import { z } from "zod";

export const createCommentSchema = z.object({
  articleVersionId: z.string().uuid(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  selectedText: z.string().min(1),
  body: z.string().min(1),
});

export const updateCommentSchema = z
  .object({
    body: z.string().min(1).optional(),
    status: z.enum(["open", "resolved", "dismissed"]).optional(),
  })
  .refine((value) => value.body !== undefined || value.status !== undefined, {
    message: "At least one field must be provided.",
  });

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
