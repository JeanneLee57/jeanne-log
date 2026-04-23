import { desc, eq } from "drizzle-orm";
import { Database } from "@/db/client";
import { articleVersions, articles } from "@/db/schema";
import {
  buildLineIndex,
  calculateReadTime,
  createPlainTextSnapshot,
} from "@/lib/content/posts";

type CreateDraftInput = {
  slug: string;
  title: string;
  summary: string;
  mdxSource: string;
  sourceType: "weekly" | "project" | "manual" | "regenerated";
  sourceLabel?: string;
  modelName?: string;
  author?: string;
  tags?: string[];
  generationPromptSnapshot?: string;
  generationContext?: Record<string, unknown>;
};

export async function createOrUpdateDraft(
  db: Database,
  input: CreateDraftInput
) {
  const now = new Date();
  const plainTextSnapshot = createPlainTextSnapshot(input.mdxSource);
  const lineIndex = buildLineIndex(input.mdxSource);
  const readTime = calculateReadTime(plainTextSnapshot);

  return db.transaction(async (tx) => {
    const existingArticle = await tx
      .select()
      .from(articles)
      .where(eq(articles.slug, input.slug))
      .limit(1);

    if (existingArticle[0]?.status === "published") {
      throw new Error(`Cannot overwrite published article with slug: ${input.slug}`);
    }

    let articleId = existingArticle[0]?.id;

    if (!articleId) {
      const inserted = await tx
        .insert(articles)
        .values({
          slug: input.slug,
          status: "draft",
          title: input.title,
          summary: input.summary,
          updatedAt: now,
        })
        .returning({
          id: articles.id,
        });

      articleId = inserted[0].id;
    } else {
      await tx
        .update(articles)
        .set({
          title: input.title,
          summary: input.summary,
          status: input.sourceType === "regenerated" ? "regenerating" : "draft",
          updatedAt: now,
        })
        .where(eq(articles.id, articleId));
    }

    const latestVersion = await tx
      .select({
        versionNumber: articleVersions.versionNumber,
      })
      .from(articleVersions)
      .where(eq(articleVersions.articleId, articleId))
      .orderBy(desc(articleVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = (latestVersion[0]?.versionNumber ?? 0) + 1;

    const insertedVersion = await tx
      .insert(articleVersions)
      .values({
        articleId,
        versionNumber: nextVersionNumber,
        sourceType: input.sourceType,
        sourceLabel: input.sourceLabel,
        mdxSource: input.mdxSource,
        plainTextSnapshot,
        lineIndex,
        generationPromptSnapshot: input.generationPromptSnapshot,
        generationContext: {
          ...input.generationContext,
          author: input.author ?? "Jeanne",
          tags: input.tags ?? [],
          readTime,
        },
        modelName: input.modelName,
      })
      .returning({
        versionId: articleVersions.id,
      });

    await tx
      .update(articles)
      .set({
        currentVersionId: insertedVersion[0].versionId,
        updatedAt: now,
        status: "draft",
      })
      .where(eq(articles.id, articleId));

    return {
      articleId,
      versionId: insertedVersion[0].versionId,
      versionNumber: nextVersionNumber,
    };
  });
}
