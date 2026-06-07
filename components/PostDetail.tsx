import React from 'react';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { BlogPost } from '../types';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

interface PostDetailProps {
  post: BlogPost;
}

type TableOfContentsItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function createUniqueSlug(text: string, counts: Map<string, number>) {
  const base = slugifyHeading(text) || 'section';
  const count = counts.get(base) ?? 0;
  counts.set(base, count + 1);

  return count === 0 ? base : `${base}-${count + 1}`;
}

function getTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(getTextFromChildren).join('');
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return getTextFromChildren(children.props.children);
  }

  return '';
}

function extractTableOfContents(source: string): TableOfContentsItem[] {
  const counts = new Map<string, number>();

  return source
    .split('\n')
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const text = match[2].replace(/\s+#+$/, '').trim();

      return {
        id: createUniqueSlug(text, counts),
        text,
        level: match[1].length as 2 | 3,
      };
    });
}

function createHeadingComponents() {
  const counts = new Map<string, number>();

  return {
    h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => {
      const id = createUniqueSlug(getTextFromChildren(children), counts);

      return (
        <h2 id={id} {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => {
      const id = createUniqueSlug(getTextFromChildren(children), counts);

      return (
        <h3 id={id} {...props}>
          {children}
        </h3>
      );
    },
  };
}

export const PostDetail: React.FC<PostDetailProps> = ({ post }) => {
  const tableOfContents = extractTableOfContents(post.content);
  const mdxComponents = createHeadingComponents();

  return (
    <article className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 rounded-md text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-offset-slate-950"
      >
        <ArrowLeft size={16} />
        Back to list
      </Link>

      <header className="mb-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags?.map(tag => (
            <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
          {post.title}
        </h1>

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                {post.author.charAt(0)}
              </div>
              <span className="font-medium text-slate-800 dark:text-slate-200">{post.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={15} />
              {post.date}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={15} />
              {post.readTime}
            </div>
          </div>
        </div>
      </header>

      {tableOfContents.length > 1 ? (
        <nav className="mb-10 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/40" aria-label="글 목차">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">목차</p>
          <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {tableOfContents.map((item) => (
              <li key={item.id} className={item.level === 3 ? 'pl-4' : undefined}>
                <a className="inline-flex rounded-md hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400" href={`#${item.id}`}>
                  {item.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="article-prose prose prose-lg prose-slate dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:tracking-tight
        prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-code:text-gray-900 dark:prose-code:text-white prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-slate-900 dark:prose-pre:bg-slate-900 prose-pre:text-white dark:prose-pre:text-white [&_pre_code]:text-white dark:[&_pre_code]:text-white prose-pre:border prose-pre:border-slate-800
        prose-img:rounded-xl prose-img:shadow-lg">
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>
    </article>
  );
};
