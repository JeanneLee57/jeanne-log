import React from 'react';
import Link from 'next/link';
import { BlogPost } from '../types';
import { Clock, ArrowLeft, ArrowRight } from 'lucide-react';

interface PostListProps {
  posts: BlogPost[];
  currentPage?: number;
  totalPages?: number;
  totalPosts?: number;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export const PostList: React.FC<PostListProps> = ({
  posts,
  currentPage = 1,
  totalPages = 1,
  totalPosts = posts.length,
}) => {
  if (totalPosts === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400 mb-4">아직 작성된 글이 없습니다.</p>
      </div>
    );
  }

  const visiblePages = getVisiblePages(currentPage, totalPages);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <section className="space-y-10" aria-labelledby="post-list-title">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
          Latest writing
        </p>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h1 id="post-list-title" className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            글 목록
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            총 {totalPosts}개 · {currentPage}/{totalPages} 페이지
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">이 페이지에는 표시할 글이 없습니다.</p>
          <Link href="/" className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            첫 페이지로 돌아가기
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/posts/${post.slug}`}
              className="group block rounded-2xl outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
            >
              <article className="flex flex-col gap-3 rounded-2xl border border-transparent p-4 -mx-4 transition-colors group-hover:border-slate-200 group-hover:bg-slate-50/70 dark:group-hover:border-slate-800 dark:group-hover:bg-slate-900/40 sm:p-5 sm:-mx-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>{post.date}</span>
                  {post.tags[0] ? (
                    <>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{post.tags[0]}</span>
                    </>
                  ) : null}
                </div>

                <h2 className="text-2xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-50 dark:group-hover:text-indigo-400 sm:text-3xl">
                  {post.title}
                </h2>

                <p className="line-clamp-3 leading-relaxed text-slate-600 dark:text-slate-300">
                  {post.summary}
                </p>

                <div className="mt-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={14} aria-hidden="true" />
                      {post.readTime}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-slate-900 opacity-100 transition-all dark:text-white sm:opacity-0 sm:-translate-x-2 sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
                    Read more <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex flex-col gap-4 border-t border-slate-200 pt-8 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between" aria-label="글 목록 페이지네이션">
          <PaginationLink page={currentPage - 1} disabled={!hasPreviousPage} label="이전" direction="previous" />

          <div className="flex flex-wrap justify-center gap-2" aria-label="페이지 번호">
            {visiblePages[0] > 1 ? (
              <>
                <PageNumber page={1} currentPage={currentPage} />
                {visiblePages[0] > 2 ? <span className="px-2 py-2 text-sm text-slate-400">…</span> : null}
              </>
            ) : null}

            {visiblePages.map((page) => (
              <PageNumber key={page} page={page} currentPage={currentPage} />
            ))}

            {visiblePages[visiblePages.length - 1] < totalPages ? (
              <>
                {visiblePages[visiblePages.length - 1] < totalPages - 1 ? <span className="px-2 py-2 text-sm text-slate-400">…</span> : null}
                <PageNumber page={totalPages} currentPage={currentPage} />
              </>
            ) : null}
          </div>

          <PaginationLink page={currentPage + 1} disabled={!hasNextPage} label="다음" direction="next" />
        </nav>
      ) : null}
    </section>
  );
};

function PageNumber({ page, currentPage }: { page: number; currentPage: number }) {
  const isCurrent = page === currentPage;

  return (
    <Link
      href={page === 1 ? '/' : `/?page=${page}`}
      aria-current={isCurrent ? 'page' : undefined}
      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
        isCurrent
          ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      {page}
    </Link>
  );
}

function PaginationLink({
  page,
  disabled,
  label,
  direction,
}: {
  page: number;
  disabled: boolean;
  label: string;
  direction: 'previous' | 'next';
}) {
  const content = (
    <>
      {direction === 'previous' ? <ArrowLeft size={16} aria-hidden="true" /> : null}
      {label}
      {direction === 'next' ? <ArrowRight size={16} aria-hidden="true" /> : null}
    </>
  );

  if (disabled) {
    return (
      <span className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-300 dark:border-slate-800 dark:text-slate-700" aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={page === 1 ? '/' : `/?page=${page}`}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white dark:focus-visible:ring-offset-slate-950"
    >
      {content}
    </Link>
  );
}
