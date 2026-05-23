'use client';

import { useState } from 'react';
import type { SurveyTemplateKey } from '@/features/survey-schema/templates';

export function HomeTemplateLinks({
  templates
}: {
  templates: Array<{ key: SurveyTemplateKey; title: string }>;
}) {
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  return (
    <>
      {templates.map((template) => {
        const href = `/new?template=${template.key}`;
        const loading = loadingHref === href;

        return (
          <a
            aria-busy={loading}
            className="home-template-pill"
            href={href}
            key={template.key}
            onClick={() => setLoadingHref(href)}
          >
            {loading ? <span aria-hidden="true" className="home-loading-dot" /> : null}
            {loading ? '正在创建...' : template.title}
          </a>
        );
      })}
    </>
  );
}
