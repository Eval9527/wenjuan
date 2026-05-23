import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '项目功能展示',
  description: '用一页可视化介绍 Wenjuan 的 AI 生成、编辑、发布、填写与数据分析流程。',
  alternates: { canonical: '/showcase' }
};

const flow = [
  { title: '描述需求', text: '输入调研目标，或选择活动报名、满意度、线索收集、睡眠质量等模板。' },
  { title: 'AI 生成', text: 'AI 先生成 changeset，空问卷可直接应用，复杂变更会先预览。' },
  { title: '可视化编辑', text: '左侧题型、中间画布、右侧 AI/属性面板，支持自动保存和手动保存。' },
  { title: '发布收集', text: '发布后得到填写页，已收集答卷的问卷会进入保护态。' },
  { title: '查看数据', text: '答卷按题目汇总，选择题展示比例，文本题展示最近答复。' }
];

const features = [
  ['AI-first', '从自然语言到问卷结构，不跳过人工确认。'],
  ['SQL-only', '使用通用 Postgres 连接，适合 Vercel + Supabase demo。'],
  ['Demo 防刷', 'visitor 签名、IP hash、AI/提交 quota 与数据清理策略。'],
  ['真实发布语义', '填写页读取 published snapshot，不被草稿改动影响。'],
  ['数据分析', '按题目统计提交数据，适合快速演示闭环。'],
  ['中文体验', '按钮、提示、空状态和问卷场景都面向中文用户。']
];

export default function ShowcasePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <section className="ui-surface overflow-hidden p-6 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="ui-kicker">Project Showcase</span>
              <h1 className="m-0 text-[34px] font-[800] tracking-tight text-[#101828] md:text-[48px]">
                Wenjuan 把问卷创建变成一条 AI 工作流
              </h1>
              <p className="m-0 max-w-2xl text-[16px] leading-7 text-[#667085]">
                从一句话生成问卷，到编辑、发布、填写、分析数据，Wenjuan 用一个轻量 demo 展示完整闭环。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="ui-btn ui-btn-primary" href="/">
                打开在线工作台
              </Link>
              <Link className="ui-btn ui-btn-secondary" href="/surveys">
                查看问卷中心
              </Link>
            </div>
          </div>

          <div aria-label="Wenjuan 界面示意" className="rounded-[28px] border border-[#d7dee8] bg-[#f8fafc] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="rounded-[22px] border border-[#d7dee8] bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-3 w-28 rounded-full bg-[#c7d2fe]" />
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#bfdbfe]" />
                  <span className="h-3 w-3 rounded-full bg-[#93c5fd]" />
                  <span className="h-3 w-3 rounded-full bg-[#2563eb]" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[0.72fr_1.1fr_0.86fr]">
                <div className="space-y-2 rounded-2xl bg-[#f8fafc] p-3">
                  <div className="h-8 rounded-xl bg-white" />
                  <div className="h-8 rounded-xl bg-white" />
                  <div className="h-8 rounded-xl bg-white" />
                </div>
                <div className="space-y-3 rounded-2xl border border-[#d7dee8] bg-white p-4">
                  <div className="mx-auto h-5 w-40 rounded-full bg-[#dbeafe]" />
                  <div className="h-10 rounded-xl bg-[#eff6ff]" />
                  <div className="grid gap-2">
                    <span className="h-7 rounded-lg bg-[#f1f5f9]" />
                    <span className="h-7 rounded-lg bg-[#f1f5f9]" />
                    <span className="h-7 rounded-lg bg-[#f1f5f9]" />
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl bg-[#eff6ff] p-3">
                  <div className="h-9 rounded-xl bg-[#2563eb]" />
                  <div className="h-20 rounded-xl bg-white" />
                  <div className="h-16 rounded-xl bg-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map(([title, text]) => (
          <article className="ui-panel p-5" key={title}>
            <h2 className="m-0 text-[18px] font-[700] text-[#101828]">{title}</h2>
            <p className="mb-0 mt-3 text-sm leading-6 text-[#667085]">{text}</p>
          </article>
        ))}
      </section>

      <section className="ui-panel p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-2">
          <span className="ui-kicker">Workflow</span>
          <h2 className="m-0 text-[26px] font-[800] tracking-tight text-[#101828]">从创建到分析的 5 步闭环</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {flow.map((item, index) => (
            <article className="relative rounded-2xl border border-[#d7dee8] bg-[#f8fafc] p-4" key={item.title}>
              <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-sm font-[800] text-white">
                {index + 1}
              </span>
              <h3 className="m-0 text-[16px] font-[700] text-[#101828]">{item.title}</h3>
              <p className="mb-0 mt-2 text-[13px] leading-5 text-[#667085]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
