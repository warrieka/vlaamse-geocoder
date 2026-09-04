import React, { useMemo } from 'react';
import { marked } from 'marked';
import readmeRaw from '../../../README.nl.md?raw';

export const AdvisorPanel: React.FC = () => {
  const html = useMemo(() => {
    try {
      return marked.parse(readmeRaw, { async: false }) as string;
    } catch (err) {
      console.warn('Advisor markdown renderen mislukt:', err);
      return null;
    }
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      {html ? (
        <div
          className="advisor-prose max-w-4xl mx-auto px-6 sm:px-8 py-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="px-6 py-8 text-sm whitespace-pre-wrap text-slate-700 font-sans">
          {readmeRaw}
        </pre>
      )}
    </div>
  );
};
