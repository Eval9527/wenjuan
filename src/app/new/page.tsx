import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DatabaseUnavailableNotice } from '@/components/system/DatabaseUnavailableNotice';
import { isDatabaseUnavailableError } from '@/features/persistence/errors';
import { saveSurveyDraft } from '@/features/persistence/repository';
import { createSurveyFromTemplate } from '@/features/survey-schema/templates';


export const metadata: Metadata = {
  title: '新建问卷',
  description: '从空白问卷、内置模板或 AI 指令开始创建一份新问卷。',
  robots: { index: false, follow: false }
};

function createSurveyId() {
  return `wj-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

function getRetryHref({ prompt, template }: { prompt: string; template?: string }) {
  const params = new URLSearchParams();

  if (prompt) {
    params.set('prompt', prompt);
  }

  if (template) {
    params.set('template', template);
  }

  const queryString = params.toString();
  return queryString ? `/new?${queryString}` : '/new';
}

export default async function NewSurveyPage({
  searchParams
}: {
  searchParams?: Promise<{ template?: string; prompt?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? undefined;
  const surveyId = createSurveyId();
  const prompt = typeof resolvedSearchParams?.prompt === 'string' ? resolvedSearchParams.prompt.trim() : '';
  const template = typeof resolvedSearchParams?.template === 'string' ? resolvedSearchParams.template.trim() : undefined;
  const document = createSurveyFromTemplate({
    id: surveyId,
    template: prompt ? undefined : template
  });

  try {
    await saveSurveyDraft({
      surveyId,
      version: document.meta.version,
      document
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseUnavailableNotice retryHref={getRetryHref({ prompt, template })} />;
    }

    throw error;
  }

  if (prompt) {
    return redirect(`/editor/${surveyId}?aiPrompt=${encodeURIComponent(prompt)}`);
  }

  if (template) {
    return redirect(`/editor/${surveyId}?template=${encodeURIComponent(template)}`);
  }

  return redirect(`/editor/${surveyId}`);
}
