import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '项目功能展示',
  description: '用一页可视化介绍 Wenjuan 从 AI 生成问卷到编辑、发布、填写与数据分析的完整流程。',
  alternates: { canonical: '/showcase' }
};

const flow = [
  { title: '描述需求', text: '用自然语言写下调研目标，也可以从常见问卷场景快速开始。' },
  { title: '生成结构', text: 'AI 将需求转换为标题、说明、题目与选项，并保留人工确认入口。' },
  { title: '编辑预览', text: '题型面板、问卷画布、属性设置与 AI 助手在同一工作台协同。' },
  { title: '发布填写', text: '发布后获得独立填写页，后续草稿修改不会影响已发布版本。' },
  { title: '分析答卷', text: '按题目查看选择比例、文本反馈与最近提交记录，快速完成回收闭环。' }
];

const features = [
  ['AI 问卷生成', '从一句话生成可编辑问卷结构，把空白页变成可继续打磨的初稿。'],
  ['变更先预览', 'AI 修改以 changeset 形式呈现，用户确认后再应用到问卷。'],
  ['可视化编辑', '中间画布贴近最终问卷，编辑控件外置，减少内容本体干扰。'],
  ['保存有反馈', '自动保存覆盖日常编辑，手动保存按钮用于明确确认当前状态。'],
  ['发布版本稳定', '填写页读取已发布快照，保证已投放问卷的内容稳定可追溯。'],
  ['答卷数据看板', '选择题统计比例，文本题展示最近回答，方便快速复盘。']
];

const canvasBlocks = [
  '您目前的睡眠时长是？',
  '影响休息质量的主要因素',
  '希望公司提供哪些支持？'
];

export default function ShowcasePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1160px] flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <section className="ui-surface overflow-hidden p-0">
        <div className="grid min-h-[560px] gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-between gap-10 p-6 md:p-10">
            <div className="space-y-6">
              <span className="ui-kicker">Project Showcase</span>
              <div className="space-y-4">
                <h1 className="m-0 max-w-3xl text-[36px] font-[850] leading-[1.05] tracking-[-0.04em] text-[#101828] md:text-[56px]">
                  从一句话到可发布问卷
                </h1>
                <p className="m-0 max-w-xl text-[16px] leading-7 text-[#667085] md:text-[17px]">
                  Wenjuan 把 AI 生成、可视化编辑、发布填写和答卷分析放进同一条清晰流程，让问卷创建更快，也更可控。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="ui-btn ui-btn-primary" href="/">
                  打开工作台
                </Link>
                <Link className="ui-btn ui-btn-secondary" href="/surveys">
                  查看问卷中心
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {['生成', '编辑', '发布'].map((label, index) => (
                <div className="rounded-2xl border border-[#d7dee8] bg-[#f8fafc] p-4" key={label}>
                  <span className="text-[13px] font-[700] text-[#2563eb]">0{index + 1}</span>
                  <p className="mb-0 mt-2 text-[15px] font-[700] text-[#101828]">{label}问卷</p>
                </div>
              ))}
            </div>
          </div>

          <div aria-label="Wenjuan 产品界面示意" className="relative overflow-hidden bg-[#eef4ff] p-4 md:p-8">
            <div className="absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-[#bfdbfe] opacity-70 blur-3xl" />
            <div className="absolute bottom-[-100px] left-[-80px] h-64 w-64 rounded-full bg-[#dbeafe] opacity-80 blur-3xl" />

            <div className="relative rounded-[30px] border border-[#c4cfdd] bg-white/90 p-4 shadow-[0_28px_70px_rgba(15,23,42,0.16)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#f8fafc] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
                  <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
                  <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[12px] font-[700] text-[#475467]">AI survey workspace</span>
              </div>

              <div className="grid gap-3 lg:grid-cols-[0.72fr_1.2fr_0.88fr]">
                <aside className="rounded-3xl bg-[#f8fafc] p-3">
                  <p className="m-0 px-2 pb-2 text-[12px] font-[800] text-[#667085]">题型</p>
                  {['单选题', '多选题', '文本题', '评分题'].map((item) => (
                    <div className="mb-2 rounded-2xl border border-[#e2e8f0] bg-white px-3 py-3 text-[13px] font-[700] text-[#334155]" key={item}>
                      {item}
                    </div>
                  ))}
                </aside>

                <section className="rounded-3xl border border-[#d7dee8] bg-white p-4">
                  <div className="mb-4 rounded-2xl bg-[#eff6ff] p-4 text-center">
                    <p className="m-0 text-[17px] font-[800] text-[#101828]">员工睡眠质量调研</p>
                    <p className="mb-0 mt-2 text-[12px] text-[#667085]">了解休息状态，优化团队支持方式</p>
                  </div>
                  <div className="space-y-3">
                    {canvasBlocks.map((block, index) => (
                      <article className="rounded-2xl border border-[#e2e8f0] bg-[#fcfdff] p-3" key={block}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <strong className="text-[13px] text-[#101828]">{index + 1}. {block}</strong>
                          <span className="rounded-full bg-[#eef2ff] px-2 py-1 text-[11px] font-[700] text-[#2563eb]">必填</span>
                        </div>
                        <div className="grid gap-2">
                          <span className="h-8 rounded-xl bg-[#f1f5f9]" />
                          <span className="h-8 rounded-xl bg-[#f1f5f9]" />
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <aside className="space-y-3 rounded-3xl bg-[#0f172a] p-3 text-white">
                  <p className="m-0 px-1 text-[12px] font-[800] text-[#bfdbfe]">AI 助手</p>
                  <div className="rounded-2xl bg-white/10 p-3 text-[13px] leading-6 text-[#dbeafe]">
                    增加一个关于通勤压力的多选题，并把选项保持为中文短句。
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-[#101828]">
                    <p className="m-0 text-[12px] font-[800] text-[#2563eb]">变更预览</p>
                    <p className="mb-0 mt-2 text-[13px] leading-5 text-[#475467]">将新增 1 道多选题，确认后应用到当前草稿。</p>
                  </div>
                  <button className="ui-btn ui-btn-primary w-full justify-center" type="button">应用变更</button>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map(([title, text]) => (
          <article className="ui-panel p-5" key={title}>
            <h2 className="m-0 text-[18px] font-[800] text-[#101828]">{title}</h2>
            <p className="mb-0 mt-3 text-sm leading-6 text-[#667085]">{text}</p>
          </article>
        ))}
      </section>

      <section className="ui-panel p-6 md:p-8">
        <div className="mb-7 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="ui-kicker">Workflow</span>
            <h2 className="mb-0 mt-3 text-[26px] font-[850] tracking-tight text-[#101828]">从创建到分析的 5 步闭环</h2>
          </div>
          <p className="m-0 max-w-md text-sm leading-6 text-[#667085]">每一步都保留清晰反馈和可回退空间，适合真实问卷从草稿走向投放。</p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {flow.map((item, index) => (
            <article className="relative rounded-2xl border border-[#d7dee8] bg-[#f8fafc] p-4" key={item.title}>
              <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-sm font-[850] text-white">
                {index + 1}
              </span>
              <h3 className="m-0 text-[16px] font-[800] text-[#101828]">{item.title}</h3>
              <p className="mb-0 mt-2 text-[13px] leading-5 text-[#667085]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
