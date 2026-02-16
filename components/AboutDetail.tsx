import React from 'react';
import { AboutData } from '../types';
import { ResumeSection } from './resume/ResumeSection';
import { TimelineItem } from './resume/TimelineItem';
import { SkillList } from './resume/SkillList';
import { ResumeExport } from './resume/ResumeExport';

interface AboutDetailProps {
  data: AboutData;
}

const linkStyles: Record<string, string> = {
  email: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
  github: 'bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800',
  linkedin: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/50',
  blog: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
  tistory: 'bg-orange-50 text-orange-700 dark:bg-orange-900/10 dark:text-orange-300/70 border-orange-100/50 dark:border-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30',
};

function renderHighlightedText(text: string) {
  const parts = text.split(/(<highlight>.*?<\/highlight>|<b>.*?<\/b>)/g);
  return parts.map((part, i) => {
    if (part.startsWith('<highlight>')) {
      const content = part.replace(/<\/?highlight>/g, '');
      return <span key={i} className="text-indigo-600 dark:text-indigo-400 font-semibold">{content}</span>;
    }
    if (part.startsWith('<b>')) {
      const content = part.replace(/<\/?b>/g, '');
      return <strong key={i}>{content}</strong>;
    }
    return part;
  });
}

export const AboutDetail: React.FC<AboutDetailProps> = ({ data }) => {
  return (
    <article className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {data.tags?.map(tag => (
            <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
          {data.title}
        </h1>

        <div className="border-b border-slate-200 dark:border-slate-800 pb-8" />
      </header>

      <div className="prose prose-lg prose-slate dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:tracking-tight
        prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
        prose-code:text-gray-900 dark:prose-code:text-white prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-slate-900 dark:prose-pre:bg-slate-900 prose-pre:text-white dark:prose-pre:text-white [&_pre_code]:text-white dark:[&_pre_code]:text-white prose-pre:border prose-pre:border-slate-800
        prose-img:rounded-xl prose-img:shadow-lg">

        <ResumeExport />

        {/* Profile & Introduction */}
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-12 not-prose">
          <div className="w-48 h-48 shrink-0 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg relative">
            <img
              src={data.profileImage}
              alt="Profile"
              className="w-full h-full object-cover object-[center_80%] scale-110"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              사용자 경험을 고민하는 프론트엔드 엔지니어
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-[length:var(--font-size-resume)] leading-[var(--line-height-resume)]">
              {data.introduction}
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
              {data.links.map(link => {
                const isExternal = link.url.startsWith('http') || link.url.startsWith('mailto:');
                return (
                  <a
                    key={link.label}
                    href={link.url}
                    {...(isExternal && link.type !== 'email' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors border ${linkStyles[link.type] || linkStyles.github}`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Experience */}
        <ResumeSection title="Experience">
          {data.experience.map(exp => (
            <TimelineItem
              key={`${exp.company}-${exp.period}`}
              company={exp.company}
              role={exp.role}
              period={exp.period}
              description={exp.description}
              techStack={exp.techStack}
            >
              {exp.details && exp.details.length > 0 && (
                <ul className="list-disc pl-5 space-y-4">
                  {exp.details.map(detail => (
                    <li key={detail.title}>
                      <strong>{detail.title}</strong>
                      <ul className="list-[circle] pl-5 mt-1 space-y-1.5">
                        {detail.items.map((item, idx) => (
                          <li key={idx}>{renderHighlightedText(item)}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </TimelineItem>
          ))}
        </ResumeSection>

        {/* Skills */}
        <ResumeSection title="Skills">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.skills.map(skill => (
              <SkillList key={skill.category} category={skill.category} items={skill.items} />
            ))}
          </div>
        </ResumeSection>

        {/* Education */}
        <ResumeSection title="Education">
          <div className="space-y-4">
            {data.education.map(edu => (
              <div key={edu.school}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{edu.school}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-[length:var(--font-size-resume)] leading-[var(--line-height-resume)]">{edu.major}</p>
                <p className="text-sm text-slate-500 dark:text-slate-500">{edu.period}</p>
              </div>
            ))}
          </div>
        </ResumeSection>

        {/* Activities */}
        <ResumeSection title="Activities & Others">
          <div className="space-y-6">
            {data.activities.map(activity => (
              <div key={activity.title}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{activity.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{activity.period}</p>
                <p className="text-slate-600 dark:text-slate-300 text-[length:var(--font-size-resume)] leading-[var(--line-height-resume)]">
                  {activity.description}
                </p>
              </div>
            ))}
          </div>
        </ResumeSection>
      </div>
    </article>
  );
};
