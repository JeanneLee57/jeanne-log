import React from 'react';

interface ResumeSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const ResumeSection: React.FC<ResumeSectionProps> = ({ title, children, className = '' }) => {
  return (
    <section className={`mb-12 ${className}`}>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
};
