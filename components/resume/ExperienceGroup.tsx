'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ExperienceDetailCard } from './ExperienceDetailCard';

interface ExperienceItem {
  title: string;
  items: string[];
  link?: string;
  printUrl?: string;
}

interface ExperienceGroupProps {
  project: string;
  duration?: string;
  projectDetail?: string;
  details: ExperienceItem[];
  defaultOpen?: boolean;
}

export const ExperienceGroup: React.FC<ExperienceGroupProps> = ({
  project,
  duration,
  projectDetail,
  details,
  defaultOpen = true
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors text-left"
      >
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {project}
          </h3>
          {duration && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{duration}</p>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 bg-white dark:bg-slate-900/20">
          {projectDetail && (
            <p className="text-sm text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3">{projectDetail}</p>
          )}
          {details.map(detail => (
            <ExperienceDetailCard
              key={detail.title}
              title={detail.title}
              items={detail.items}
              link={detail.link}
              printUrl={detail.printUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
};
