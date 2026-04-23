"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RegenerateDraftButtonProps = {
  draftId: string;
  disabled?: boolean;
  openCommentCount: number;
};

export function RegenerateDraftButton({
  draftId,
  disabled = false,
  openCommentCount,
}: RegenerateDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/admin/drafts/${draftId}/regenerate`, {
      method: "POST",
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to queue regeneration.");
      return;
    }

    setMessage("Regeneration queued.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void handleRegenerate()}
        disabled={disabled || isPending}
        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-white"
      >
        {isPending ? "Queueing..." : "Regenerate"}
      </button>
      <p className="text-xs text-slate-400">
        Open comments: {openCommentCount}
      </p>
      {message ? <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
    </div>
  );
}
