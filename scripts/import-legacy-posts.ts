import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { articleVersions, articles } from "../db/schema";
import {
  buildLineIndex,
  calculateReadTime,
  createPlainTextSnapshot,
  parsePostFile,
} from "../lib/content/posts";

const articleDirectory = path.join(process.cwd(), "contents", "article");
const dryRun = process.argv.includes("--dry-run");

function toPublishedDate(dateValue: string) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

async function upsertLegacyPost(fileName: string) {
  const slug = fileName.replace(/\.mdx?$/, "");
  const filePath = path.join(articleDirectory, fileName);
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { metadata, body } = parsePostFile(fileContents);
  const publishedAt = toPublishedDate(metadata.date);
  const summary = metadata.summary || body.slice(0, 150).trim();
  const plainTextSnapshot = createPlainTextSnapshot(body);
  const lineIndex = buildLineIndex(body);

  if (dryRun) {
    return {
      slug,
      created: false,
      updated: false,
      dryRun: true,
    };
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const existingArticle = await tx
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);

    let articleId = existingArticle[0]?.id;
    let created = false;
    let updated = false;

    if (!articleId) {
      const insertedArticle = await tx
        .insert(articles)
        .values({
          slug,
          status: "published",
          title: metadata.title || slug,
          summary,
          publishedAt,
          createdAt: publishedAt,
          updatedAt: new Date(),
        })
        .returning({ id: articles.id });

      articleId = insertedArticle[0].id;
      created = true;
    } else {
      await tx
        .update(articles)
        .set({
          status: "published",
          title: metadata.title || slug,
          summary,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(articles.id, articleId));

      updated = true;
    }

    const existingVersion = await tx
      .select()
      .from(articleVersions)
      .where(and(eq(articleVersions.articleId, articleId), eq(articleVersions.sourceLabel, fileName)))
      .limit(1);

    let versionId = existingVersion[0]?.id;

    if (!versionId) {
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
          sourceLabel: fileName,
          mdxSource: body,
          plainTextSnapshot,
          lineIndex,
          generationContext: {
            author: metadata.author,
            tags: metadata.tags,
            importedFromFile: fileName,
            legacyReadTime: metadata.readTime || calculateReadTime(body),
          },
        })
        .returning({ id: articleVersions.id });

      versionId = insertedVersion[0].id;
      created = true;
    } else {
      await tx
        .update(articleVersions)
        .set({
          mdxSource: body,
          plainTextSnapshot,
          lineIndex,
          generationContext: {
            author: metadata.author,
            tags: metadata.tags,
            importedFromFile: fileName,
            legacyReadTime: metadata.readTime || calculateReadTime(body),
          },
        })
        .where(eq(articleVersions.id, versionId));

      updated = true;
    }

    await tx
      .update(articles)
      .set({
        currentVersionId: versionId,
        publishedVersionId: versionId,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, articleId));

    return {
      slug,
      created,
      updated,
      dryRun: false,
    };
  });
}

async function main() {
  if (!fs.existsSync(articleDirectory)) {
    throw new Error(`Legacy article directory not found: ${articleDirectory}`);
  }

  const files = fs
    .readdirSync(articleDirectory)
    .filter((fileName) => fileName.endsWith(".md") || fileName.endsWith(".mdx"))
    .sort();

  if (files.length === 0) {
    console.log("No legacy article files found.");
    return;
  }

  const results = [];

  for (const fileName of files) {
    const result = await upsertLegacyPost(fileName);
    results.push(result);
    console.log(
      `[legacy-import] ${result.dryRun ? "DRY RUN" : "SYNC"} ${result.slug} created=${result.created} updated=${result.updated}`
    );
  }

  console.log(`[legacy-import] Processed ${results.length} files.`);
}

main().catch((error) => {
  console.error("[legacy-import] Failed:", error);
  process.exit(1);
});
