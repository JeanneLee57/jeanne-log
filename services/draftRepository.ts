import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articleVersions, articles, reviewComments } from "@/db/schema";
import { hasDatabaseUrl } from "@/lib/env";
import { DraftDetail, DraftSummary } from "@/types";

export async function getDraftSummaries(): Promise<DraftSummary[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({
      article: articles,
      version: articleVersions,
      openCommentCount: sql<number>`count(${reviewComments.id})`,
    })
    .from(articles)
    .leftJoin(articleVersions, eq(articles.currentVersionId, articleVersions.id))
    .leftJoin(
      reviewComments,
      sql`${reviewComments.articleVersionId} = ${articleVersions.id} and ${reviewComments.status} = 'open'`
    )
    .groupBy(articles.id, articleVersions.id)
    .orderBy(desc(articles.updatedAt));

  return rows.map(({ article, version, openCommentCount }) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    status: article.status,
    versionNumber: version?.versionNumber ?? null,
    openCommentCount: Number(openCommentCount) || 0,
    updatedAt: article.updatedAt.toISOString(),
  })) satisfies DraftSummary[];
}

export async function getDraftDetailById(id: string): Promise<DraftDetail | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const db = getDb();
  const rows = await db
    .select({
      article: articles,
      version: articleVersions,
    })
    .from(articles)
    .leftJoin(articleVersions, eq(articles.currentVersionId, articleVersions.id))
    .where(eq(articles.id, id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const { article, version } = rows[0];

  const versions = await db
    .select()
    .from(articleVersions)
    .where(eq(articleVersions.articleId, article.id))
    .orderBy(desc(articleVersions.versionNumber));

  const comments = version?.id
    ? await db
        .select()
        .from(reviewComments)
        .where(eq(reviewComments.articleVersionId, version.id))
        .orderBy(reviewComments.startLine, reviewComments.createdAt)
    : [];

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    status: article.status,
    updatedAt: article.updatedAt.toISOString(),
    currentVersionId: version?.id ?? null,
    currentVersionNumber: version?.versionNumber ?? null,
    content: version?.mdxSource ?? "",
    lineIndex: version?.lineIndex ?? [],
    versions: versions.map((item) => ({
      id: item.id,
      versionNumber: item.versionNumber,
      sourceType: item.sourceType,
      sourceLabel: item.sourceLabel,
      modelName: item.modelName,
      createdAt: item.createdAt.toISOString(),
    })),
    comments: comments.map((comment) => ({
      id: comment.id,
      articleVersionId: comment.articleVersionId,
      startLine: comment.startLine,
      endLine: comment.endLine,
      selectedText: comment.selectedText,
      body: comment.body,
      status: comment.status,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    })),
  } satisfies DraftDetail;
}
