import React from 'react';

interface ExperienceDetailCardProps {
  title: string;
  items: string[];
  link?: string;
  printUrl?: string;
}

function renderContent(content: string): React.ReactNode {
  return (
    <span className="text-slate-800 dark:text-slate-300">
      {content.split(/(\*\*[^*]+\*\*|\d+\.?\d*%|\d+\.?\d*배|\d+\.?\d*\s*ms|\d+\+?\s*PR|\d+개월|\([^)]+\)|[A-Z]{2,}|Hash Map|Promise\.all(?:Settled)?|Template Literal Types|Fail Fast|ROUTES_CONFIG|FSD|shared\/entities\/features\/widgets|model 세그먼트)/).map((part, i) => {
        // 볼드 패턴 (**텍스트**)
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          const text = part.replace(/\*\*/g, '');
          return (
            <span key={i} className="font-bold text-slate-900 dark:text-white">
              {text}
            </span>
          );
        }
        // 메트릭 패턴 - 볼드 처리
        if (/(\d+\.?\d*%|\d+\.?\d*배|\d+\.?\d*\s*ms|\d+\+?\s*PR|\d+개월)/.test(part)) {
          return (
            <span key={i} className="font-semibold text-slate-900 dark:text-white">
              {part}
            </span>
          );
        }
        // 기술 키워드 패턴 - 인라인 코드 (색상 제거)
        if (/(\([^)]+\)|[A-Z]{2,}|Hash Map|Promise\.all(?:Settled)?|Template Literal Types|Fail Fast|ROUTES_CONFIG|FSD|shared\/entities\/features\/widgets|model 세그먼트)/.test(part)) {
          return (
            <code key={i} className="text-sm font-mono text-slate-800 dark:text-slate-300">
              {part}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export const ExperienceDetailCard: React.FC<ExperienceDetailCardProps> = ({ title, items, link, printUrl }) => {
  return (
    <div className="mb-6 break-inside-avoid-page">
      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-3 leading-tight flex items-start">
        <span className="mr-2 text-indigo-600 dark:text-indigo-400">•</span>
        <span>{title}</span>
      </h4>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="text-[length:var(--font-size-resume)] leading-[var(--line-height-resume)]">
            {renderContent(item)}
          </div>
        ))}

        {link && (
          <div className="pb-2">
            <a
              href={link}
              data-print-url={printUrl ?? (link.startsWith('/') ? `https://jeannelee.me${link}` : link)}
              {...(!link.startsWith('/') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="print-link-url inline-flex items-center text-[length:var(--font-size-resume)] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              관련 글 →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
