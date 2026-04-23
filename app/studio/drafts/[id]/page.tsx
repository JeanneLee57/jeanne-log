import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftEditor } from "@/components/studio/DraftEditor";
import { RegenerateDraftButton } from "@/components/studio/RegenerateDraftButton";
import { getDraftDetailById } from "@/services/draftRepository";

const statusStyles: Record<string, string> = {
  draft: "bg-amber-100 text-amber-900",
  in_review: "bg-blue-100 text-blue-900",
  regenerating: "bg-violet-100 text-violet-900",
  published: "bg-emerald-100 text-emerald-900",
  archived: "bg-slate-200 text-slate-700",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  regenerating: "Regenerating",
  published: "Published",
  archived: "Archived",
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DraftDetailPage({ params }: Props) {
  const { id } = await params;
  const draft = await getDraftDetailById(id);

  if (!draft) {
    notFound();
  }

  const openCommentCount = draft.comments.filter((comment) => comment.status === "open").length;

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <Link
            href="/studio/drafts"
            className="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Back to Drafts
          </Link>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[draft.status]}`}
              >
                {statusLabels[draft.status]}
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                {draft.slug}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {draft.title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {draft.summary || "요약이 아직 없습니다."}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <RegenerateDraftButton
            draftId={draft.id}
            openCommentCount={openCommentCount}
            disabled={!draft.currentVersionId || draft.status === "regenerating"}
          />

          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-900/80">
            <div>
              <dt className="text-slate-400">Current Version</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                {draft.currentVersionNumber ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Open Comments</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{openCommentCount}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Versions</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{draft.versions.length}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Updated</dt>
              <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                {new Date(draft.updatedAt).toLocaleString("ko-KR")}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {draft.status === "regenerating" ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900/60 dark:bg-violet-500/10 dark:text-violet-200">
          A regeneration job is currently queued or running for this draft.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <div className="grid gap-6">
          <DraftEditor
            key={draft.currentVersionId ?? "empty-version"}
            draftId={draft.id}
            initialTitle={draft.title}
            initialSummary={draft.summary}
            initialContent={draft.content}
          />

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Current Source
              </h2>
            </header>

            {draft.lineIndex.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
                아직 버전 콘텐츠가 없습니다.
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-auto">
                <ol className="divide-y divide-slate-100 dark:divide-slate-900">
                  {draft.lineIndex.map((line) => {
                    const commentsForLine = draft.comments.filter(
                      (comment) =>
                        comment.status === "open" &&
                        line.lineNumber >= comment.startLine &&
                        line.lineNumber <= comment.endLine
                    );

                    return (
                      <li
                        key={`${line.lineNumber}-${line.startOffset}`}
                        className={`grid grid-cols-[72px_minmax(0,1fr)] gap-4 px-5 py-2 font-mono text-sm ${
                          commentsForLine.length > 0
                            ? "bg-amber-50/80 dark:bg-amber-500/10"
                            : "bg-transparent"
                        }`}
                      >
                        <span className="select-none text-right text-xs leading-6 text-slate-400">
                          {line.lineNumber}
                        </span>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words leading-6 text-slate-700 dark:text-slate-200">
                          {line.content || " "}
                        </pre>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Versions
              </h2>
              <span className="text-xs text-slate-400">Latest first</span>
            </header>

            <div className="space-y-3">
              {draft.versions.map((version) => (
                <article
                  key={version.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    version.id === draft.currentVersionId
                      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                      : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">v{version.versionNumber}</strong>
                    <span className="text-xs uppercase tracking-[0.15em] opacity-70">
                      {version.sourceType}
                    </span>
                  </div>
                  <p className="mt-2 text-xs opacity-80">
                    {version.sourceLabel || version.modelName || "Source metadata unavailable"}
                  </p>
                  <p className="mt-2 text-xs opacity-60">
                    {new Date(version.createdAt).toLocaleString("ko-KR")}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Comments
              </h2>
              <span className="text-xs text-slate-400">{draft.comments.length} items</span>
            </header>

            {draft.comments.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                아직 코멘트가 없습니다. 다음 단계에서 인라인 코멘트 작성과 수정/삭제 기능이 추가됩니다.
              </p>
            ) : (
              <div className="space-y-3">
                {draft.comments.map((comment) => (
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
                    <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {comment.body}
                    </p>
                    <pre className="mt-3 overflow-x-auto rounded-xl bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      {comment.selectedText}
                    </pre>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
