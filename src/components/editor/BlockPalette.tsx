'use client';

import type { SurveyBlockType } from '@/features/survey-schema/schema';
import { useEditorStore } from './editor-store-context';

const groups: Array<{
  title: string;
  description: string;
  items: Array<{ label: string; hint: string; type: SurveyBlockType }>;
}> = [
  {
    title: '文本显示',
    description: '用于封面、说明与结构层级。',
    items: [{ label: '标题', hint: '问卷标题 / 分组标题', type: 'title' }]
  },
  {
    title: '用户输入',
    description: '先完成最基本的信息收集。',
    items: [{ label: '填写框', hint: '单行文本输入', type: 'input' }]
  },
  {
    title: '用户选择',
    description: '用选项题快速完成判断与收集。',
    items: [
      { label: '单选', hint: '单项选择', type: 'singleChoice' },
      { label: '多选', hint: '多项选择', type: 'multiChoice' }
    ]
  }
];

export function BlockPalette({ readOnly = false }: { readOnly?: boolean }) {
  const addBlock = useEditorStore((state) => state.addBlock);

  return (
    <aside className="border-r border-[#d7dee8] bg-white px-4 py-5 md:px-5">
      <div className="flex h-full flex-col gap-4">
        <div className="space-y-2">
          <h2 className="ui-section-title">添加题目</h2>
          <p className="m-0 text-sm leading-6 text-[#667085]">左侧保持题型分组，中间画布尽量接近最终问卷外观。</p>
          {readOnly ? <p className="m-0 text-sm font-medium text-[#b54708]">当前问卷已锁定，不能继续新增或改动题目。</p> : null}
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-auto pr-1">
          {groups.map((group) => (
            <section className="ui-panel-soft p-4" key={group.title}>
              <div className="space-y-1">
                <h3 className="m-0 text-[15px] font-[700] leading-6 text-[#101828]">{group.title}</h3>
                <p className="m-0 text-xs leading-5 text-[#667085]">{group.description}</p>
              </div>
              <div className="mt-3 grid gap-2">
                {group.items.map((item) => (
                  <button
                    aria-label={item.label}
                    className="rounded-2xl border border-[#d7dee8] bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#c4cfdd] disabled:opacity-50"
                    disabled={readOnly}
                    key={item.type}
                    onClick={() => addBlock({ type: item.type })}
                    type="button"
                  >
                    <span className="block text-[15px] font-[700] leading-6 text-[#101828]">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#667085]">{item.hint}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}
