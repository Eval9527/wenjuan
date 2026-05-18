'use client';

import { useEffect, useMemo, useState } from 'react';
import { surveyTemplateCatalog, type SurveyTemplateKey } from '@/features/survey-schema/templates';

const PLACEHOLDER_ROTATION_MS = 3200;
const HOME_PLACEHOLDER_ORDER: SurveyTemplateKey[] = [
  'worker-sleep',
  'event-signup',
  'satisfaction',
  'lead-collection'
];

export function HomeQuickGenerateForm() {
  const templates = useMemo(
    () =>
      HOME_PLACEHOLDER_ORDER.map((templateKey) =>
        surveyTemplateCatalog.find((template) => template.key === templateKey)
      ).filter((template): template is (typeof surveyTemplateCatalog)[number] => Boolean(template)),
    []
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTemplate = templates[activeIndex % templates.length] ?? surveyTemplateCatalog[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % templates.length);
    }, PLACEHOLDER_ROTATION_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [templates.length]);

  return (
    <form action="/new" method="get" className="flex items-center gap-3 rounded-xl border border-[#d7dee8] bg-white p-2 shadow-sm transition-shadow focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-[#2563eb]/10 hover:shadow-md">
      <div className="pl-4 text-[#2563eb]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
      </div>
      <input
        aria-label="问卷生成需求"
        className="flex-1 bg-transparent px-2 py-3 text-[16px] text-[#101828] outline-none placeholder:text-[#94a3b8]"
        name="prompt"
        placeholder={activeTemplate.homePlaceholder}
        type="text"
      />
      <input name="template" type="hidden" value={activeTemplate.key} />
      <button type="submit" className="ui-btn ui-btn-primary shrink-0 px-6">
        生成问卷
      </button>
    </form>
  );
}
