'use client';

import { useEffect, useState } from 'react';
import { useEditorStore } from './editor-store-context';

export function GlobalPropertiesPanel({ readOnly = false }: { readOnly?: boolean }) {
  const surveyTitle = useEditorStore((state) => state.survey.title);
  const updateSurveyTitle = useEditorStore((state) => state.updateSurveyTitle);
  const [draftTitle, setDraftTitle] = useState(surveyTitle);
  const [isComposingTitle, setIsComposingTitle] = useState(false);

  useEffect(() => {
    if (!isComposingTitle) {
      setDraftTitle(surveyTitle);
    }
  }, [isComposingTitle, surveyTitle]);

  function commitTitle(nextTitle: string) {
    const normalizedTitle = nextTitle.trim();

    if (!readOnly && normalizedTitle && normalizedTitle !== surveyTitle) {
      updateSurveyTitle(normalizedTitle);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#e2e8f0]">
        <h3 className="text-[16px] font-bold text-[#0f172a] m-0">全局属性</h3>
        {readOnly ? <span className="ui-chip ui-chip-warning">只读</span> : null}
      </div>

      <div className="ui-panel-soft p-4 text-sm leading-6 text-[#475467]">
        全局属性作用于整份问卷。这里的问卷标题不会自动同步到画布中的 H1 标题组件。
      </div>

      <label className="ui-field">
        <span className="ui-field-label">问卷标题</span>
        <input
          aria-label="全局问卷标题"
          className="ui-input"
          disabled={readOnly}
          onBlur={(event) => commitTitle(event.target.value)}
          onChange={(event) => {
            setDraftTitle(event.target.value);
            if (!isComposingTitle) {
              commitTitle(event.target.value);
            }
          }}
          onCompositionEnd={(event) => {
            setIsComposingTitle(false);
            setDraftTitle(event.currentTarget.value);
            commitTitle(event.currentTarget.value);
          }}
          onCompositionStart={() => setIsComposingTitle(true)}
          placeholder="输入问卷标题"
          type="text"
          value={draftTitle}
        />
      </label>
    </section>
  );
}
