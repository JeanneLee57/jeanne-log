import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { articleVersions, articles, regenerationJobs, reviewComments } from "@/db/schema";
import { hasDatabaseUrl } from "@/lib/env";
import {
  buildLineIndex,
  calculateReadTime,
  createPlainTextSnapshot,
} from "@/lib/content/posts";
import {
  CompleteRegenerationJobInput,
  FailRegenerationJobInput,
} from "@/lib/validators/internal-jobs";

const JOB_STALE_AFTER_MS = 15 * 60 * 1000;

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

export async function claimNextRegenerationJob(workerId: string) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database is not configured.");
  }

  if (!workerId) {
    throw new Error("workerId is required.");
  }

  const db = getDb();
  const staleBefore = new Date(Date.now() - JOB_STALE_AFTER_MS);

  return db.transaction(async (tx) => {
    const queuedJobs = await tx
      .select()
      .from(regenerationJobs)
      .where(
        and(eq(regenerationJobs.jobType, "regenerate"), eq(regenerationJobs.status, "queued"))
      )
      .orderBy(asc(regenerationJobs.createdAt))
      .limit(1);

    const staleRunningJobs = await tx
      .select()
      .from(regenerationJobs)
      .where(
        and(eq(regenerationJobs.jobType, "regenerate"), eq(regenerationJobs.status, "running"))
      )
      .orderBy(asc(regenerationJobs.createdAt))
      .limit(20);

    const claimableJob =
      queuedJobs[0] ??
      staleRunningJobs.find((job) => job.lockedAt && job.lockedAt <= staleBefore);

    if (!claimableJob) {
      return null;
    }

    const updated = await tx
      .update(regenerationJobs)
      .set({
        status: "running",
        lockedAt: new Date(),
        workerId,
        updatedAt: new Date(),
        attemptCount: claimableJob.status === "running" ? claimableJob.attemptCount + 1 : claimableJob.attemptCount,
      })
      .where(
        and(
          eq(regenerationJobs.id, claimableJob.id),
          claimableJob.status === "queued"
            ? eq(regenerationJobs.status, "queued")
            : eq(regenerationJobs.status, "running")
        )
      )
      .returning();

    if (updated.length === 0) {
      return null;
    }

    return updated[0];
  });
}

export async function completeRegenerationJob(
  jobId: string,
  workerId: string,
  input: CompleteRegenerationJobInput
) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database is not configured.");
  }

  const db = getDb();
  const now = new Date();
  const plainTextSnapshot = createPlainTextSnapshot(input.mdxSource);
  const lineIndex = buildLineIndex(input.mdxSource);
  const readTime = calculateReadTime(plainTextSnapshot);

  return db.transaction(async (tx) => {
    const jobRows = await tx
      .select()
      .from(regenerationJobs)
      .where(eq(regenerationJobs.id, jobId))
      .limit(1);

    if (jobRows.length === 0) {
      throw new Error("Regeneration job not found.");
    }

    const job = jobRows[0];

    if (job.status !== "running") {
      throw new Error("Regeneration job is not running.");
    }

    if (job.workerId && job.workerId !== workerId) {
      throw new Error("Regeneration job is locked by another worker.");
    }

    const articleRows = await tx
      .select()
      .from(articles)
      .where(eq(articles.id, job.articleId))
      .limit(1);

    if (articleRows.length === 0) {
      throw new Error("Draft not found.");
    }

    const article = articleRows[0];
    const latestVersion = await tx
      .select({
        versionNumber: articleVersions.versionNumber,
      })
      .from(articleVersions)
      .where(eq(articleVersions.articleId, article.id))
      .orderBy(desc(articleVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = (latestVersion[0]?.versionNumber ?? 0) + 1;

    const insertedVersion = await tx
      .insert(articleVersions)
      .values({
        articleId: article.id,
        versionNumber: nextVersionNumber,
        sourceType: "regenerated",
        sourceLabel: `regeneration-job:${job.id}`,
        mdxSource: input.mdxSource,
        plainTextSnapshot,
        lineIndex,
        generationPromptSnapshot: input.generationPromptSnapshot,
        generationContext: {
          ...input.generationContext,
          author: input.author ?? "Jeanne",
          tags: input.tags ?? [],
          readTime,
          regenerationJobId: job.id,
          baseVersionId: job.baseVersionId,
        },
        modelName: input.modelName,
      })
      .returning({
        id: articleVersions.id,
      });

    await tx
      .update(articles)
      .set({
        title: input.title,
        summary: input.summary,
        currentVersionId: insertedVersion[0].id,
        status: "draft",
        updatedAt: now,
      })
      .where(eq(articles.id, article.id));

    const completedJob = await tx
      .update(regenerationJobs)
      .set({
        status: "completed",
        resultVersionId: insertedVersion[0].id,
        updatedAt: now,
        lockedAt: now,
        workerId,
        errorMessage: null,
      })
      .where(eq(regenerationJobs.id, job.id))
      .returning();

    return completedJob[0];
  });
}

export async function failRegenerationJob(
  jobId: string,
  workerId: string,
  input: FailRegenerationJobInput
) {
  if (!hasDatabaseUrl()) {
    throw new Error("Database is not configured.");
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const jobRows = await tx
      .select()
      .from(regenerationJobs)
      .where(eq(regenerationJobs.id, jobId))
      .limit(1);

    if (jobRows.length === 0) {
      throw new Error("Regeneration job not found.");
    }

    const job = jobRows[0];

    if (job.status !== "running") {
      throw new Error("Regeneration job is not running.");
    }

    if (job.workerId && job.workerId !== workerId) {
      throw new Error("Regeneration job is locked by another worker.");
    }

    const failedJob = await tx
      .update(regenerationJobs)
      .set({
        status: "failed",
        errorMessage: input.errorMessage,
        updatedAt: new Date(),
        lockedAt: new Date(),
        workerId,
      })
      .where(eq(regenerationJobs.id, jobId))
      .returning();

    await tx
      .update(articles)
      .set({
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(articles.id, job.articleId));

    return failedJob[0];
  });
}
