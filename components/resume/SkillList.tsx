import React from 'react';

interface SkillListProps {
  category: string;
  skills: string[];
}

export const SkillList: React.FC<SkillListProps> = ({ category, skills }) => {
  return (
    <div className="mb-6 last:mb-0 break-inside-avoid-page">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 print:text-slate-800">
        {category}
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills?.map((skill) => (
          <span 
            key={skill}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium border border-indigo-100 dark:border-indigo-900/50 print:bg-indigo-50 print:text-indigo-700 print:border-indigo-100"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
};
