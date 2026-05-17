'use client';

import type { ChoiceOption, SurveyBlock, TitleBlock } from '@/features/survey-schema/schema';
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
      <section className="flex flex-col gap-4 items-center justify-center h-full text-center mt-10 text-[#94a3b8] text-sm">
        <div>请先在左侧或中间画布选中一个组件</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#e2e8f0]">
        <h3 className="text-[16px] font-bold text-[#0f172a] m-0">组件属性</h3>
        <span className="ui-chip bg-[#f1f5f9] text-[#475467]">{getBlockTypeLabel(selectedBlock.type)}</span>
        {readOnly ? <span className="ui-chip ui-chip-warning">只读</span> : null}
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

        {selectedBlock.type !== 'title' ? (
          <>
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
          </>
        ) : null}

        {selectedBlock.type === 'title' ? (
          <>
            <Field label="标题层级">
              <select
                aria-label="标题层级"
                className="ui-select"
                disabled={readOnly}
                onChange={(event) => {
                  const val = event.target.value;
                  patchSelectedBlock({
                    level: val === 'p' ? 'p' : (Number(val) as TitleBlock['level'])
                  } as Partial<SurveyBlock>);
                }}
                value={String(selectedBlock.level)}
              >
                <option value={1}>主标题 (H1)</option>
                <option value={2}>大标题 (H2)</option>
                <option value={3}>小标题 (H3)</option>
                <option value="p">正文段落</option>
              </select>
            </Field>
            <Field label="对齐方式">
              <select
                aria-label="对齐方式"
                className="ui-select"
                disabled={readOnly}
                onChange={(event) =>
                  patchSelectedBlock({
                    align: event.target.value as TitleBlock['align']
                  } as Partial<SurveyBlock>)
                }
                value={selectedBlock.align || 'left'}
              >
                <option value="left">居左</option>
                <option value="center">居中</option>
                <option value="right">居右</option>
              </select>
            </Field>
          </>
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
