'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Moon, Sun, Terminal } from 'lucide-react';
import { GITHUB_CONFIG } from '../config';
import { PageView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentPage?: PageView;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isDark, setIsDark] = React.useState(false);

  // Initialize theme based on system preference or local storage could be added here
  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const repoUrl = `https://github.com/${GITHUB_CONFIG.OWNER}`;



  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-1.5 rounded-md group-hover:scale-105 transition-transform">
              <Terminal size={20} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">jeanne-log</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/about"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              About
            </Link>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <Github size={16} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Jeanne Lee</p>
        </div>
      </footer>
    </div>
  );
};