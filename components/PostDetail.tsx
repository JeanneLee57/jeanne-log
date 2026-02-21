import React from 'react';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { BlogPost } from '../types';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

interface PostDetailProps {
  post: BlogPost;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post }) => {
  return (
    <article className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link 
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
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

      <div className="prose prose-lg prose-slate dark:prose-invert max-w-none 
        prose-headings:font-bold prose-headings:tracking-tight 
        prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-code:text-gray-900 dark:prose-code:text-white prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-slate-900 dark:prose-pre:bg-slate-900 prose-pre:text-white dark:prose-pre:text-white [&_pre_code]:text-white dark:[&_pre_code]:text-white prose-pre:border prose-pre:border-slate-800
        prose-img:rounded-xl prose-img:shadow-lg">
        <MDXRemote source={post.content} />
      </div>
    </article>
  );
};