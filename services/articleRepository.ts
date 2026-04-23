import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articleVersions, articles } from "@/db/schema";
import { hasDatabaseUrl } from "@/lib/env";
import { calculateReadTime } from "@/lib/content/posts";
import { BlogPost } from "@/types";

function mapPublishedArticleToBlogPost(row: {
  article: typeof articles.$inferSelect;
  version: typeof articleVersions.$inferSelect;
}): BlogPost {
  const { article, version } = row;
  const author =
    typeof version.generationContext?.author === "string"
      ? version.generationContext.author
      : "Jeanne";

  return {
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    content: version.mdxSource,
    author,
    date: article.publishedAt
      ? article.publishedAt.toISOString().split("T")[0]
      : article.updatedAt.toISOString().split("T")[0],
    tags:
      typeof version.generationContext?.tags === "object" &&
      Array.isArray(version.generationContext.tags)
        ? version.generationContext.tags.filter(
            (tag): tag is string => typeof tag === "string"
          )
        : ["General"],
    readTime: calculateReadTime(version.plainTextSnapshot || version.mdxSource),
  };
}

export async function getPublishedPostsFromDatabase(): Promise<BlogPost[]> {
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
    .innerJoin(articleVersions, eq(articles.publishedVersionId, articleVersions.id))
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt), desc(articles.updatedAt));

  return rows.map(mapPublishedArticleToBlogPost);
}

export async function getPublishedPostBySlugFromDatabase(
  slug: string
): Promise<BlogPost | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const db = getDb();
  const row = await db
    .select({
      article: articles,
      version: articleVersions,
    })
    .from(articles)
    .innerJoin(articleVersions, eq(articles.publishedVersionId, articleVersions.id))
    .where(and(eq(articles.status, "published"), eq(articles.slug, slug)))
    .limit(1);

  if (row.length === 0) {
    return null;
  }

  return mapPublishedArticleToBlogPost(row[0]);
}
