'use client';

import type { ChoiceOption, SurveyBlock } from '@/features/survey-schema/schema';
import { useEditorStore } from './editor-store-context';

function Field({
  children,
  label
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="ui-field">
      <span className="ui-field-label">{label}</span>
      {children}
    </label>
  );
}

function getBlockTypeLabel(type: SurveyBlock['type']) {
  switch (type) {
    case 'title':
      return '标题';
    case 'input':
      return '填写框';
    case 'singleChoice':
      return '单选题';
    case 'multiChoice':
      return '多选题';
    default:
      return type;
  }
}

export function InspectorPanel({ readOnly = false }: { readOnly?: boolean }) {
  const selectedBlock = useEditorStore((state) =>
    state.survey.blocks.find((block) => block.id === state.selectedBlockId) ?? null
  );
  const updateBlock = useEditorStore((state) => state.updateBlock);

  function patchSelectedBlock(patch: Partial<SurveyBlock>) {
    if (!selectedBlock || readOnly) {
      return;
    }

    updateBlock(selectedBlock.id, patch);
  }

  function updateChoiceOption(optionIndex: number, text: string) {
    if (!selectedBlock || !('options' in selectedBlock)) {
      return;
    }

    patchSelectedBlock({
      options: selectedBlock.options.map((option, currentIndex) =>
        currentIndex === optionIndex ? { ...option, text } : option
      )
    });
  }

  function addChoiceOption() {
    if (!selectedBlock || !('options' in selectedBlock) || readOnly) {
      return;
    }

    const nextOption: ChoiceOption = {
      id: `option-${crypto.randomUUID()}`,
      text: `选项 ${selectedBlock.options.length + 1}`
    };

    patchSelectedBlock({
      options: [...selectedBlock.options, nextOption]
    });
  }

  if (!selectedBlock) {
    return (
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="ui-section-title text-[18px]">属性面板</h3>
          <p className="mt-2 mb-0 text-sm leading-6 text-[#667085]">选中一个题目后，在这里修改标题、描述、选项和必填等属性。</p>
        </div>
        <div className="ui-panel-soft p-4 text-sm leading-6 text-[#667085]">当前未选中题目。你可以先点击中间画布里的任意题目，再回来编辑属性。</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="ui-section-title text-[18px]">属性面板</h3>
          <span className="ui-chip">{getBlockTypeLabel(selectedBlock.type)}</span>
          {readOnly ? <span className="ui-chip ui-chip-warning">只读</span> : null}
        </div>
        <p className="m-0 text-sm leading-6 text-[#667085]">当前面板只保留最核心的可用属性，先把最小可用题型打磨顺手。</p>
      </div>

      <div className="flex flex-col gap-4">
        <Field label="题目标题">
          <input
            aria-label="题目标题"
            className="ui-input"
            disabled={readOnly}
            onChange={(event) => patchSelectedBlock({ label: event.target.value })}
            type="text"
            value={selectedBlock.label}
          />
        </Field>

        <Field label="题目描述">
          <textarea
            aria-label="题目描述"
            className="ui-textarea"
            disabled={readOnly}
            onChange={(event) => patchSelectedBlock({ description: event.target.value || undefined })}
            rows={3}
            value={selectedBlock.description ?? ''}
          />
        </Field>

        <label className="flex items-center gap-3 rounded-2xl border border-[#d7dee8] bg-[#f8fafc] px-4 py-3 text-sm font-medium text-[#101828]">
          <input
            aria-label="必填"
            checked={selectedBlock.required ?? false}
            disabled={readOnly}
            onChange={(event) => patchSelectedBlock({ required: event.target.checked || undefined })}
            type="checkbox"
          />
          <span>设为必填</span>
        </label>

        {selectedBlock.type === 'title' ? (
          <Field label="标题层级">
            <select
              aria-label="标题层级"
              className="ui-select"
              disabled={readOnly}
              onChange={(event) =>
                patchSelectedBlock({
                  level: Number(event.target.value) === 2 ? 2 : 1
                })
              }
              value={selectedBlock.level}
            >
              <option value={1}>主标题</option>
              <option value={2}>小标题</option>
            </select>
          </Field>
        ) : null}

        {selectedBlock.type === 'input' ? (
          <Field label="占位提示">
            <input
              aria-label="占位提示"
              className="ui-input"
              disabled={readOnly}
              onChange={(event) => patchSelectedBlock({ placeholder: event.target.value || undefined })}
              type="text"
              value={selectedBlock.placeholder ?? ''}
            />
          </Field>
        ) : null}

        {selectedBlock.type === 'singleChoice' || selectedBlock.type === 'multiChoice' ? (
          <section className="ui-panel-soft p-4">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-[15px] leading-6 text-[#101828]">选项</strong>
              <button className="ui-btn ui-btn-secondary" disabled={readOnly} onClick={addChoiceOption} type="button">
                添加选项
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {selectedBlock.options.map((option, optionIndex) => (
                <Field key={option.id} label={`选项文案 ${optionIndex + 1}`}>
                  <input
                    aria-label={`选项文案 ${optionIndex + 1}`}
                    className="ui-input"
                    disabled={readOnly}
                    onChange={(event) => updateChoiceOption(optionIndex, event.target.value)}
                    type="text"
                    value={option.text}
                  />
                </Field>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
