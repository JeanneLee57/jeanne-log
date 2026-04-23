import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articleVersions, reviewComments } from "@/db/schema";
import { hasDatabaseUrl } from "@/lib/env";
import { CreateCommentInput, UpdateCommentInput } from "@/lib/validators/comments";
import { DraftComment } from "@/types";

function mapComment(comment: typeof reviewComments.$inferSelect): DraftComment {
  return {
    id: comment.id,
    articleVersionId: comment.articleVersionId,
    startLine: comment.startLine,
    endLine: comment.endLine,
    selectedText: comment.selectedText,
    body: comment.body,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export async function createComment(input: CreateCommentInput): Promise<DraftComment> {
  if (!hasDatabaseUrl()) {
    throw new Error("Database is not configured.");
  }

  if (input.endLine < input.startLine) {
    throw new Error("endLine must be greater than or equal to startLine.");
  }

  const db = getDb();
  const versionRows = await db
    .select({
      id: articleVersions.id,
      lineIndex: articleVersions.lineIndex,
    })
    .from(articleVersions)
    .where(eq(articleVersions.id, input.articleVersionId))
    .limit(1);

  if (versionRows.length === 0) {
    throw new Error("Article version not found.");
  }

  const maxLineNumber = versionRows[0].lineIndex.length;
  if (input.startLine > maxLineNumber || input.endLine > maxLineNumber) {
    throw new Error("Comment range exceeds available lines.");
  }

  const inserted = await db
    .insert(reviewComments)
    .values({
      articleVersionId: input.articleVersionId,
      startLine: input.startLine,
      endLine: input.endLine,
      selectedText: input.selectedText,
      body: input.body,
    })
    .returning();

  return mapComment(inserted[0]);
}

export async function updateComment(
  id: string,
  input: UpdateCommentInput
): Promise<DraftComment | null> {
  if (!hasDatabaseUrl()) {
    throw new Error("Database is not configured.");
  }

  const db = getDb();
  const updated = await db
    .update(reviewComments)
    .set({
      ...(input.body ? { body: input.body } : {}),
      ...(input.status ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(reviewComments.id, id))
    .returning();

  if (updated.length === 0) {
    return null;
  }

  return mapComment(updated[0]);
}

export async function deleteComment(id: string): Promise<boolean> {
  if (!hasDatabaseUrl()) {
    throw new Error("Database is not configured.");
  }

  const db = getDb();
  const deleted = await db.delete(reviewComments).where(eq(reviewComments.id, id)).returning({
    id: reviewComments.id,
  });

  return deleted.length > 0;
}

export async function getCommentsByVersionId(articleVersionId: string): Promise<DraftComment[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const db = getDb();
  const comments = await db
    .select()
    .from(reviewComments)
    .where(eq(reviewComments.articleVersionId, articleVersionId))
    .orderBy(reviewComments.startLine, reviewComments.createdAt);

  return comments.map(mapComment);
}
