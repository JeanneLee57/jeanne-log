"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PublishDraftButtonProps = {
  draftId: string;
  slug: string;
  disabled?: boolean;
  showPublicLink?: boolean;
};

export function PublishDraftButton({
  draftId,
  slug,
  disabled = false,
  showPublicLink = false,
}: PublishDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/drafts/${draftId}/publish`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Failed to publish draft.");
        return;
      }

      setMessage("Published.");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void handlePublish()}
        disabled={disabled || isPending || isSubmitting}
        className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending || isSubmitting ? "Publishing..." : "Publish"}
      </button>
      {showPublicLink ? (
        <Link
          href={`/posts/${slug}`}
          target="_blank"
          className="text-xs text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
        >
          View public post
        </Link>
      ) : null}
      {message ? <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
    </div>
  );
}
