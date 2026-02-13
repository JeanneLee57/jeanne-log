import React from 'react';

interface TimelineItemProps {
  company: string;
  role: string;
  period: string;
  description?: string;
  techStack?: string[];
  children?: React.ReactNode;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ 
  company, 
  role, 
  period, 
  description, 
  techStack, 
  children 
}) => {
  return (
    <div className="relative pl-10 pb-12 last:pb-4 group not-prose break-inside-avoid-page">
      {/* Vertical Line - starts from the center of the dot */}
      <div className="absolute left-[7px] top-[14px] bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 group-last:hidden print:bg-slate-200" />
      
      {/* Dot - centered vertically with the 28px(leading-7) height of the title */}
      <div className="absolute left-0 top-[6px] w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 bg-indigo-500 shadow-sm z-10 print:border-white print:bg-indigo-500" />
      
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-7">
          {company}
        </h3>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap sm:ml-4">
          {period}
        </span>
      </div>
      
      <div className="text-indigo-600 dark:text-indigo-400 font-semibold mb-3 leading-6">
        {role}
      </div>
      
      {description && (
        <div className="text-slate-500 dark:text-slate-400 mb-4 text-[length:var(--font-size-resume)] leading-[var(--line-height-resume)] italic">
          {description}
        </div>
      )}
      
      {children && (
        <div className="text-slate-700 dark:text-slate-300 text-[length:var(--font-size-resume)] leading-[var(--line-height-resume)] space-y-3">
          {children}
        </div>
      )}

      {techStack && techStack.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {techStack.map((tech) => (
            <span 
              key={tech} 
              className="px-2.5 py-1 text-[12px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wider"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
