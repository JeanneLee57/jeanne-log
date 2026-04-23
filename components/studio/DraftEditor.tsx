"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type DraftEditorProps = {
  draftId: string;
  initialTitle: string;
  initialSummary: string;
  initialContent: string;
};

export function DraftEditor({
  draftId,
  initialTitle,
  initialSummary,
  initialContent,
}: DraftEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    title !== initialTitle || summary !== initialSummary || content !== initialContent;

  async function handleSave() {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/drafts/${draftId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        summary,
        mdxSource: content,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to save draft.");
      return;
    }

    setMessage(`Saved as version ${payload.versionNumber}.`);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Editor
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            AI 결과와 별개로 제목, 요약, 본문을 직접 수정해 새 manual 버전을 만들 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isPending || !isDirty}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
        >
          {isPending ? "Saving..." : "Save Draft"}
        </button>
      </header>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Title
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none ring-0 transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            MDX Source
          </span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={18}
            className="min-h-[420px] rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none ring-0 transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </label>
      </div>

      {message ? (
        <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </section>
  );
}
