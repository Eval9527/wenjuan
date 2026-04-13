'use client';

import type { ChoiceOption, SurveyBlock } from '@/features/survey-schema/schema';
import { useEditorStore } from './editor-store-context';

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function InspectorPanel() {
  const selectedBlock = useEditorStore((state) =>
    state.survey.blocks.find((block) => block.id === state.selectedBlockId) ?? null
  );
  const updateBlock = useEditorStore((state) => state.updateBlock);

  function patchSelectedBlock(patch: Partial<SurveyBlock>) {
    if (!selectedBlock) {
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
    if (!selectedBlock || !('options' in selectedBlock)) {
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
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Inspector</h3>
        <p style={{ margin: 0, color: '#667085' }}>选中一个题目后，可在这里查看并编辑属性。</p>
      </section>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Inspector</h3>
      <Field label="题目标题">
        <input
          aria-label="题目标题"
          onChange={(event) => patchSelectedBlock({ label: event.target.value })}
          type="text"
          value={selectedBlock.label}
        />
      </Field>
      <Field label="题目描述">
        <textarea
          aria-label="题目描述"
          onChange={(event) => patchSelectedBlock({ description: event.target.value || undefined })}
          rows={3}
          value={selectedBlock.description ?? ''}
        />
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          aria-label="必填"
          checked={selectedBlock.required ?? false}
          onChange={(event) => patchSelectedBlock({ required: event.target.checked || undefined })}
          type="checkbox"
        />
        <span>设为必填</span>
      </label>
      {selectedBlock.type === 'title' ? (
        <Field label="标题层级">
          <select
            aria-label="标题层级"
            onChange={(event) =>
              patchSelectedBlock({
                level: Number(event.target.value) === 2 ? 2 : 1
              })
            }
            value={selectedBlock.level}
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
          </select>
        </Field>
      ) : null}
      {selectedBlock.type === 'input' ? (
        <Field label="占位提示">
          <input
            aria-label="占位提示"
            onChange={(event) => patchSelectedBlock({ placeholder: event.target.value || undefined })}
            type="text"
            value={selectedBlock.placeholder ?? ''}
          />
        </Field>
      ) : null}
      {selectedBlock.type === 'singleChoice' || selectedBlock.type === 'multiChoice' ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <strong>选项</strong>
            <button onClick={addChoiceOption} type="button">
              添加选项
            </button>
          </div>
          {selectedBlock.options.map((option, optionIndex) => (
            <Field key={option.id} label={`选项文案 ${optionIndex + 1}`}>
              <input
                aria-label={`选项文案 ${optionIndex + 1}`}
                onChange={(event) => updateChoiceOption(optionIndex, event.target.value)}
                type="text"
                value={option.text}
              />
            </Field>
          ))}
        </section>
      ) : null}
      <div>类型：{selectedBlock.type}</div>
    </section>
  );
}
