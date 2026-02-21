'use client';

import React from 'react';
import { Download } from 'lucide-react';

export const ResumeExport: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex justify-end mb-8 no-print">
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
      >
        <Download size={16} />
        PDF로 저장하기
      </button>
      
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          footer, nav, aside {
            display: none !important;
          }
          article {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .prose {
            max-width: none !important;
          }
          /* Show URLs after links */
          .print-link::after {
            content: ": " attr(data-print-url);
            font-size: 0.8em;
            color: #475569;
            font-weight: normal;
          }
          .print-link-url::after {
            content: " " attr(data-print-url);
            font-size: 0.8em;
            color: #475569;
            font-weight: normal;
          }
          /* Ensure colors are printed */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};
