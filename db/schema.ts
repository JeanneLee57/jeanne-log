import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "in_review",
  "regenerating",
  "published",
  "archived",
]);

export const articleSourceTypeEnum = pgEnum("article_source_type", [
  "weekly",
  "project",
  "manual",
  "regenerated",
]);

export const reviewCommentStatusEnum = pgEnum("review_comment_status", [
  "open",
  "resolved",
  "dismissed",
]);

export const regenerationJobStatusEnum = pgEnum("regeneration_job_status", [
  "queued",
  "running",
  "failed",
  "completed",
]);

export const regenerationJobTypeEnum = pgEnum("regeneration_job_type", [
  "initial_draft",
  "regenerate",
]);

export const publicationEventTypeEnum = pgEnum("publication_event_type", [
  "published",
  "unpublished",
  "archived",
]);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    githubUserId: varchar("github_user_id", { length: 64 }).notNull(),
    email: varchar("email", { length: 255 }),
    role: varchar("role", { length: 32 }).notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    githubUserIdIdx: uniqueIndex("admin_users_github_user_id_idx").on(table.githubUserId),
    emailIdx: uniqueIndex("admin_users_email_idx").on(table.email),
  })
);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull(),
    status: articleStatusEnum("status").notNull().default("draft"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    currentVersionId: uuid("current_version_id"),
    publishedVersionId: uuid("published_version_id"),
    createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => ({
    slugIdx: uniqueIndex("articles_slug_idx").on(table.slug),
    statusUpdatedAtIdx: index("articles_status_updated_at_idx").on(table.status, table.updatedAt),
    publishedAtIdx: index("articles_published_at_idx").on(table.publishedAt),
  })
);

export const articleVersions = pgTable(
  "article_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    sourceType: articleSourceTypeEnum("source_type").notNull().default("manual"),
    sourceLabel: varchar("source_label", { length: 255 }),
    mdxSource: text("mdx_source").notNull(),
    plainTextSnapshot: text("plain_text_snapshot").notNull(),
    lineIndex: jsonb("line_index").$type<LineIndexEntry[]>().notNull().default([]),
    generationPromptSnapshot: text("generation_prompt_snapshot"),
    generationContext: jsonb("generation_context").$type<Record<string, unknown>>(),
    modelName: varchar("model_name", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleVersionIdx: uniqueIndex("article_versions_article_version_idx").on(
      table.articleId,
      table.versionNumber
    ),
    articleCreatedAtIdx: index("article_versions_article_created_at_idx").on(
      table.articleId,
      table.createdAt
    ),
  })
);

export const reviewComments = pgTable(
  "review_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleVersionId: uuid("article_version_id")
      .notNull()
      .references(() => articleVersions.id, { onDelete: "cascade" }),
    startLine: integer("start_line").notNull(),
    endLine: integer("end_line").notNull(),
    selectedText: text("selected_text").notNull(),
    body: text("body").notNull(),
    status: reviewCommentStatusEnum("status").notNull().default("open"),
    createdBy: uuid("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleVersionRangeIdx: index("review_comments_article_version_range_idx").on(
      table.articleVersionId,
      table.startLine,
      table.endLine
    ),
    statusIdx: index("review_comments_status_idx").on(table.status),
  })
);

export const regenerationJobs = pgTable(
  "regeneration_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    baseVersionId: uuid("base_version_id").references(() => articleVersions.id, {
      onDelete: "set null",
    }),
    status: regenerationJobStatusEnum("status").notNull().default("queued"),
    jobType: regenerationJobTypeEnum("job_type").notNull().default("regenerate"),
    inputPayload: jsonb("input_payload").$type<Record<string, unknown>>().notNull().default({}),
    resultVersionId: uuid("result_version_id").references(() => articleVersions.id, {
      onDelete: "set null",
    }),
    errorMessage: text("error_message"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    workerId: varchar("worker_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusCreatedAtIdx: index("regeneration_jobs_status_created_at_idx").on(
      table.status,
      table.createdAt
    ),
    articleStatusIdx: index("regeneration_jobs_article_status_idx").on(table.articleId, table.status),
  })
);

export const publicationEvents = pgTable(
  "publication_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    fromVersionId: uuid("from_version_id").references(() => articleVersions.id, {
      onDelete: "set null",
    }),
    toVersionId: uuid("to_version_id").references(() => articleVersions.id, {
      onDelete: "set null",
    }),
    eventType: publicationEventTypeEnum("event_type").notNull(),
    actor: varchar("actor", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    articleCreatedAtIdx: index("publication_events_article_created_at_idx").on(
      table.articleId,
      table.createdAt
    ),
  })
);

export type LineIndexEntry = {
  lineNumber: number;
  startOffset: number;
  endOffset: number;
  content: string;
};

export type InsertArticle = typeof articles.$inferInsert;
export type SelectArticle = typeof articles.$inferSelect;
export type InsertArticleVersion = typeof articleVersions.$inferInsert;
export type SelectArticleVersion = typeof articleVersions.$inferSelect;
export type InsertReviewComment = typeof reviewComments.$inferInsert;
export type SelectReviewComment = typeof reviewComments.$inferSelect;
export type InsertRegenerationJob = typeof regenerationJobs.$inferInsert;
export type SelectRegenerationJob = typeof regenerationJobs.$inferSelect;
