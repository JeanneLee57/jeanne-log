import { desc, eq } from "drizzle-orm";
import { Database } from "@/db/client";
import { articleVersions, articles, publicationEvents } from "@/db/schema";
import {
  buildLineIndex,
  calculateReadTime,
  createPlainTextSnapshot,
} from "@/lib/content/posts";
import { CreateDraftInput as StudioCreateDraftInput, UpdateDraftInput } from "@/lib/validators/drafts";

type InternalCreateDraftInput = {
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
  input: InternalCreateDraftInput
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

export async function createManualDraftVersion(
  db: Database,
  articleId: string,
  input: UpdateDraftInput
) {
  const now = new Date();
  const plainTextSnapshot = createPlainTextSnapshot(input.mdxSource);
  const lineIndex = buildLineIndex(input.mdxSource);

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

    const currentVersionRows = await tx
      .select()
      .from(articleVersions)
      .where(eq(articleVersions.id, article.currentVersionId))
      .limit(1);

    if (currentVersionRows.length === 0) {
      throw new Error("Current draft version not found.");
    }

    const currentVersion = currentVersionRows[0];
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
        sourceType: "manual",
        sourceLabel: "studio-editor",
        mdxSource: input.mdxSource,
        plainTextSnapshot,
        lineIndex,
        generationPromptSnapshot: currentVersion.generationPromptSnapshot,
        generationContext: {
          ...currentVersion.generationContext,
          readTime: calculateReadTime(plainTextSnapshot),
          editor: "studio",
        },
        modelName: currentVersion.modelName,
      })
      .returning({
        versionId: articleVersions.id,
      });

    await tx
      .update(articles)
      .set({
        title: input.title,
        summary: input.summary,
        currentVersionId: insertedVersion[0].versionId,
        updatedAt: now,
        status: article.status === "published" ? "published" : "draft",
      })
      .where(eq(articles.id, articleId));

    return {
      articleId,
      versionId: insertedVersion[0].versionId,
      versionNumber: nextVersionNumber,
    };
  });
}

export async function createStudioDraft(
  db: Database,
  input: Omit<StudioCreateDraftInput, "publish">
) {
  const now = new Date();
  const plainTextSnapshot = createPlainTextSnapshot(input.mdxSource);
  const lineIndex = buildLineIndex(input.mdxSource);

  return db.transaction(async (tx) => {
    const existingArticle = await tx
      .select({
        id: articles.id,
      })
      .from(articles)
      .where(eq(articles.slug, input.slug))
      .limit(1);

    if (existingArticle.length > 0) {
      throw new Error(`Draft slug already exists: ${input.slug}`);
    }

    const insertedArticle = await tx
      .insert(articles)
      .values({
        slug: input.slug,
        status: "draft",
        title: input.title,
        summary: input.summary,
        updatedAt: now,
      })
      .returning({
        articleId: articles.id,
      });

    const articleId = insertedArticle[0].articleId;

    const insertedVersion = await tx
      .insert(articleVersions)
      .values({
        articleId,
        versionNumber: 1,
        sourceType: "manual",
        sourceLabel: "studio-editor",
        mdxSource: input.mdxSource,
        plainTextSnapshot,
        lineIndex,
        generationContext: {
          editor: "studio",
          readTime: calculateReadTime(plainTextSnapshot),
        },
      })
      .returning({
        versionId: articleVersions.id,
      });

    await tx
      .update(articles)
      .set({
        currentVersionId: insertedVersion[0].versionId,
        updatedAt: now,
      })
      .where(eq(articles.id, articleId));

    return {
      articleId,
      versionId: insertedVersion[0].versionId,
      versionNumber: 1,
    };
  });
}

export async function publishDraft(
  db: Database,
  articleId: string,
  actor = "studio"
) {
  const now = new Date();

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

    const currentVersionRows = await tx
      .select({
        id: articleVersions.id,
      })
      .from(articleVersions)
      .where(eq(articleVersions.id, article.currentVersionId))
      .limit(1);

    if (currentVersionRows.length === 0) {
      throw new Error("Current draft version not found.");
    }

    await tx
      .update(articles)
      .set({
        status: "published",
        publishedVersionId: article.currentVersionId,
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(articles.id, articleId));

    await tx.insert(publicationEvents).values({
      articleId,
      fromVersionId: article.publishedVersionId,
      toVersionId: article.currentVersionId,
      eventType: "published",
      actor,
      createdAt: now,
    });

    return {
      articleId,
      publishedVersionId: article.currentVersionId,
      publishedAt: now,
      slug: article.slug,
    };
  });
}
