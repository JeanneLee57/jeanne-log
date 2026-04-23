import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articleVersions, articles, reviewComments } from "@/db/schema";
import { hasDatabaseUrl } from "@/lib/env";
import { DraftSummary } from "@/types";

export async function getDraftSummaries(): Promise<DraftSummary[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({
      article: articles,
      version: articleVersions,
    })
    .from(articles)
    .leftJoin(articleVersions, eq(articles.currentVersionId, articleVersions.id))
    .orderBy(desc(articles.updatedAt));

  const draftSummaries = await Promise.all(
    rows.map(async ({ article, version }) => {
      let openCommentCount = 0;

      if (version?.id) {
        const commentRows = await db
          .select({
            id: reviewComments.id,
          })
          .from(reviewComments)
          .where(
            and(
              eq(reviewComments.articleVersionId, version.id),
              eq(reviewComments.status, "open")
            )
          );

        openCommentCount = commentRows.length;
      }

      return {
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        status: article.status,
        versionNumber: version?.versionNumber ?? null,
        openCommentCount,
        updatedAt: article.updatedAt.toISOString(),
      } satisfies DraftSummary;
    })
  );

  return draftSummaries;
}
