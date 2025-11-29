import React from 'react';
import Link from 'next/link';
import { BlogPost } from '../types';
import { Clock, ArrowRight } from 'lucide-react';

interface PostListProps {
  posts: BlogPost[];
}

export const PostList: React.FC<PostListProps> = ({ posts }) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400 mb-4">아직 작성된 글이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {posts.map((post) => (
        <Link 
          key={post.slug} 
          href={`/posts/${post.slug}`}
          className="group block"
        >
          <article className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>{post.date}</span>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400">{post.tags[0]}</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
              {post.title}
            </h2>
            
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
              {post.summary}
            </p>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {post.readTime}
                </span>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                Read more <ArrowRight size={14} />
              </span>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
};