import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articleVersions, articles, regenerationJobs, reviewComments } from "@/db/schema";
import { hasDatabaseUrl } from "@/lib/env";

export async function createRegenerationJob(articleId: string) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database is not configured.");
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const articleRows = await tx
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (articleRows.length === 0) {
      throw new Error("Draft not found.");
    }

    const article = articleRows[0];

    if (!article.currentVersionId) {
      throw new Error("Draft has no current version.");
    }

    const existingJobs = await tx
      .select()
      .from(regenerationJobs)
      .where(
        and(
          eq(regenerationJobs.articleId, articleId),
          inArray(regenerationJobs.status, ["queued", "running"])
        )
      )
      .orderBy(desc(regenerationJobs.createdAt))
      .limit(1);

    if (existingJobs.length > 0) {
      throw new Error("A regeneration job is already queued or running for this draft.");
    }

    const versionRows = await tx
      .select()
      .from(articleVersions)
      .where(eq(articleVersions.id, article.currentVersionId))
      .limit(1);

    if (versionRows.length === 0) {
      throw new Error("Current draft version not found.");
    }

    const currentVersion = versionRows[0];
    const openComments = await tx
      .select()
      .from(reviewComments)
      .where(
        and(
          eq(reviewComments.articleVersionId, currentVersion.id),
          eq(reviewComments.status, "open")
        )
      )
      .orderBy(reviewComments.startLine, reviewComments.createdAt);

    const inserted = await tx
      .insert(regenerationJobs)
      .values({
        articleId,
        baseVersionId: currentVersion.id,
        status: "queued",
        jobType: "regenerate",
        inputPayload: {
          article: {
            id: article.id,
            slug: article.slug,
            title: article.title,
            summary: article.summary,
          },
          baseVersion: {
            id: currentVersion.id,
            versionNumber: currentVersion.versionNumber,
            sourceType: currentVersion.sourceType,
            mdxSource: currentVersion.mdxSource,
            generationContext: currentVersion.generationContext,
            modelName: currentVersion.modelName,
          },
          comments: openComments.map((comment) => ({
            id: comment.id,
            startLine: comment.startLine,
            endLine: comment.endLine,
            selectedText: comment.selectedText,
            body: comment.body,
          })),
        },
      })
      .returning({
        id: regenerationJobs.id,
        status: regenerationJobs.status,
      });

    await tx
      .update(articles)
      .set({
        status: "regenerating",
        updatedAt: new Date(),
      })
      .where(eq(articles.id, articleId));

    return inserted[0];
  });
}
