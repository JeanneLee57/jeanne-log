"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const EMPTY_CONTENT = `# New Draft

Write here.
`;

export function CreateDraftForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState<"draft" | "publish" | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = Boolean(slug.trim() && title.trim() && content.trim());

  async function submitDraft(publish: boolean) {
    setMessage(null);
    setError(null);
    setIsSubmitting(publish ? "publish" : "draft");

    try {
      const response = await fetch("/api/admin/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: slug.trim(),
          title: title.trim(),
          summary: summary.trim(),
          mdxSource: content,
          publish,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Failed to create draft.");
        return;
      }

      setMessage(publish ? "Draft created and published." : "Draft saved.");
      startTransition(() => {
        router.push(`/studio/drafts/${payload.articleId}`);
        router.refresh();
      });
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="mb-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          New Draft
        </h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          AI 적재 없이 새 글을 직접 만들고, 임시 저장하거나 바로 발행할 수 있습니다.
        </p>
      </header>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Slug
          </span>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="my-new-post"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Title
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Summary
          </span>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            MDX Source
          </span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={14}
            className="min-h-[280px] rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submitDraft(false)}
          disabled={isPending || isSubmitting !== null || !isValid}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
        >
          {isPending || isSubmitting === "draft" ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={() => void submitDraft(true)}
          disabled={isPending || isSubmitting !== null || !isValid}
          className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending || isSubmitting === "publish" ? "Publishing..." : "Publish Now"}
        </button>
      </div>

      {message ? <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
    </section>
  );
}
