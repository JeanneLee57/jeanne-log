import Link from "next/link";
import { getDraftSummaries } from "@/services/draftRepository";

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

export default async function DraftStudioPage() {
  const drafts = await getDraftSummaries();

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          Studio
        </span>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Draft Queue
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            DB에 적재된 초안과 현재 리뷰 상태를 확인하는 화면입니다. 상세 리뷰와 인증은 다음 단계에서
            이어집니다.
          </p>
        </div>
      </header>

      {drafts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No drafts yet</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            아직 DB에 적재된 초안이 없습니다. `db:import:legacy` 또는 내부 draft API로 데이터를 먼저
            넣어야 합니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/studio/drafts/${draft.id}`}
              className="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
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
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {draft.title}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {draft.summary || "요약이 아직 없습니다."}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-900/80">
                  <div>
                    <dt className="text-slate-400">Version</dt>
                    <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {draft.versionNumber ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Open Comments</dt>
                    <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {draft.openCommentCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Updated</dt>
                    <dd className="mt-1 font-semibold text-slate-900 dark:text-white">
                      {new Date(draft.updatedAt).toLocaleDateString("ko-KR")}
                    </dd>
                  </div>
                </dl>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
