"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DraftComment } from "@/types";

type CommentManagerProps = {
  articleVersionId: string | null;
  lineCount: number;
  initialComments: DraftComment[];
};

export function CommentManager({
  articleVersionId,
  lineCount,
  initialComments,
}: CommentManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startLine, setStartLine] = useState(1);
  const [endLine, setEndLine] = useState(1);
  const [selectedText, setSelectedText] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshAfterMutation(successMessage: string) {
    setMessage(successMessage);
    setError(null);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreateComment() {
    if (!articleVersionId) {
      setError("Current version is not available.");
      return;
    }

    setMessage(null);
    setError(null);

    const response = await fetch("/api/admin/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        articleVersionId,
        startLine,
        endLine,
        selectedText,
        body,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to create comment.");
      return;
    }

    setSelectedText("");
    setBody("");
    await refreshAfterMutation("Comment created.");
  }

  async function handleResolveComment(commentId: string, nextStatus: DraftComment["status"]) {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/comments/${commentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to update comment.");
      return;
    }

    await refreshAfterMutation(`Comment marked as ${nextStatus}.`);
  }

  async function handleDeleteComment(commentId: string) {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/comments/${commentId}`, {
      method: "DELETE",
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to delete comment.");
      return;
    }

    await refreshAfterMutation("Comment deleted.");
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Comments
        </h2>
        <span className="text-xs text-slate-400">{initialComments.length} items</span>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                Start Line
              </span>
              <input
                type="number"
                min={1}
                max={Math.max(lineCount, 1)}
                value={startLine}
                onChange={(event) => setStartLine(Number(event.target.value))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                End Line
              </span>
              <input
                type="number"
                min={1}
                max={Math.max(lineCount, 1)}
                value={endLine}
                onChange={(event) => setEndLine(Number(event.target.value))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Selected Text Snapshot
            </span>
            <textarea
              rows={4}
              value={selectedText}
              onChange={(event) => setSelectedText(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              Comment
            </span>
            <textarea
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleCreateComment()}
            disabled={isPending || !articleVersionId}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
          >
            {isPending ? "Saving..." : "Add Comment"}
          </button>
        </div>
      </div>

      {message ? <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}

      {initialComments.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">
          아직 코멘트가 없습니다. 라인 범위를 지정해서 수동으로 코멘트를 추가할 수 있습니다.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {initialComments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  L{comment.startLine}
                  {comment.startLine !== comment.endLine ? `-L${comment.endLine}` : ""}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {comment.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{comment.body}</p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                {comment.selectedText}
              </pre>
              <div className="mt-4 flex flex-wrap gap-2">
                {comment.status !== "resolved" ? (
                  <button
                    type="button"
                    onClick={() => void handleResolveComment(comment.id, "resolved")}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-white"
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleResolveComment(comment.id, "open")}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-white"
                  >
                    Reopen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDeleteComment(comment.id)}
                  className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-500 dark:border-rose-900/60 dark:text-rose-300"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
