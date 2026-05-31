import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '项目功能展示',
  description: '介绍 Wenjuan 的 AI-first 低代码问卷工作流：生成、预览、编辑、发布、填写与分析。',
  alternates: { canonical: '/showcase' }
};

const productFlow = [
  {
    code: '01',
    title: '描述需求',
    text: '用一句中文说明调研目标、对象和场景，也可以从模板或空白问卷开始。',
    output: 'Prompt'
  },
  {
    code: '02',
    title: '生成 changeset',
    text: 'AI 先产出可审查的结构变更，包含新增、修改和删除，不直接覆盖问卷。',
    output: 'Review'
  },
  {
    code: '03',
    title: '预览并应用',
    text: '用户确认变更内容后再应用到草稿，关键修改始终保留人工判断。',
    output: 'Draft'
  },
  {
    code: '04',
    title: '低代码编辑',
    text: '通过题型、画布和属性配置继续打磨问卷，支持拖拽排序与即时预览。',
    output: 'Canvas'
  },
  {
    code: '05',
    title: '发布与分析',
    text: '发布页读取稳定快照，答卷独立入库，并在数据页形成回收闭环。',
    output: 'Insight'
  }
];

const highlights = [
  {
    title: '低代码拖拽画布',
    text: '题型添加、排序和属性配置都在可视化界面完成，让非技术用户也能维护问卷。'
  },
  {
    title: 'AI 生成初稿',
    text: '自然语言需求会被转换为问卷标题、说明、题目和选项，减少从零起草的成本。'
  },
  {
    title: 'changeset 人审机制',
    text: 'AI 修改先进入预览层，用户看清变化后再应用，避免黑箱式静默改动。'
  },
  {
    title: '发布快照隔离',
    text: '填写页使用已发布版本，草稿继续修改也不会影响已经投放出去的问卷。'
  },
  {
    title: '中文表单体验',
    text: '按钮、标签、提示和问卷结构面向中文业务场景设计，保留清晰的操作语义。'
  },
  {
    title: '答卷分析闭环',
    text: '选择题统计比例，文本题展示最近反馈，帮助快速判断问卷是否达成目标。'
  }
];

const implementationNotes = [
  {
    label: 'AI 修改链路',
    title: 'prompt -> changeset -> preview -> apply',
    text: 'AI 只负责提出可审查的结构变更，真正写入草稿前必须经过用户确认。'
  },
  {
    label: '发布数据模型',
    title: 'draft -> published snapshot -> responses',
    text: '编辑态和发布态分离，填写页只读取快照，答卷和分析围绕发布版本沉淀。'
  },
  {
    label: '持久化边界',
    title: 'Postgres-compatible DATABASE_URL',
    text: '仓库层只依赖通用 Postgres 连接字符串，适合 Neon、Supabase 等个人 demo 部署。'
  }
];

export default function ShowcasePage() {
  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#101828]">
      <section className="border-b border-[#d7dee8] bg-[#f8fafc]">
        <div className="mx-auto grid w-full max-w-[1160px] gap-10 px-4 py-10 md:px-8 md:py-14 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div className="flex flex-col gap-7">
            <span className="ui-kicker">产品功能展示</span>
            <div className="flex flex-col gap-4">
              <h1 className="m-0 text-[36px] font-[800] leading-[1.12] text-[#101828] md:text-[52px]">
                AI-first 低代码问卷编辑器
              </h1>
              <p className="m-0 max-w-[620px] text-[16px] leading-7 text-[#475467] md:text-[17px]">
                Wenjuan 的展示页应该回答一个问题：从一句需求到可发布、可填写、可分析的问卷，中间每一步如何保持高效又可控。
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
            <div className="grid gap-3 sm:grid-cols-3">
              {['AI 生成初稿', '人审后应用', '发布快照稳定'].map((item) => (
                <div className="border-l-2 border-[#2563eb] bg-white px-4 py-3 text-[14px] font-[700] text-[#1e293b]" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <section aria-label="Wenjuan 产品流程地图" className="rounded-lg border border-[#d7dee8] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04)] md:p-6">
            <div className="mb-5 flex flex-col gap-2 border-b border-[#e2e8f0] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="m-0 text-[13px] font-[700] text-[#2563eb]">核心路径</p>
                <h2 className="m-0 mt-1 text-[22px] font-[800] leading-snug text-[#101828]">
                  从需求到数据的工作流
                </h2>
              </div>
              <p className="m-0 text-[13px] leading-5 text-[#667085]">
                不模拟编辑器，只呈现产品真正的运行逻辑。
              </p>
            </div>

            <ol className="m-0 flex list-none flex-col gap-0 p-0">
              {productFlow.map((step, index) => (
                <li className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-b border-[#eef2f6] py-4 last:border-b-0 md:grid-cols-[56px_minmax(0,1fr)_96px]" key={step.title}>
                  <div className="relative flex justify-center">
                    {index < productFlow.length - 1 && (
                      <span aria-hidden="true" className="absolute left-1/2 top-10 h-[calc(100%+16px)] w-px -translate-x-1/2 bg-[#d7dee8]" />
                    )}
                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#bfdbfe] bg-[#eff6ff] text-[13px] font-[800] text-[#1d4ed8]">
                      {step.code}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="m-0 text-[17px] font-[800] leading-snug text-[#101828]">{step.title}</h3>
                    <p className="m-0 mt-2 text-[14px] leading-6 text-[#667085]">{step.text}</p>
                  </div>
                  <div className="col-start-2 flex items-start md:col-start-auto md:justify-end">
                    <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-[12px] font-[700] text-[#475467] ring-1 ring-[#d7dee8]">
                      {step.output}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1160px] px-4 py-10 md:px-8 md:py-12">
        <div className="mb-6 flex max-w-[760px] flex-col gap-3">
          <span className="ui-kicker">核心亮点</span>
          <h2 className="m-0 text-[28px] font-[800] leading-tight text-[#101828] md:text-[34px]">
            面向真实问卷工作的能力组合
          </h2>
          <p className="m-0 text-[15px] leading-7 text-[#667085]">
            这不是单点 AI demo，而是一条围绕问卷创建、审核、投放和复盘的低代码流程。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {highlights.map((feature, index) => (
            <article className="rounded-lg border border-[#d7dee8] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04)]" key={feature.title}>
              <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f8fafc] text-[13px] font-[800] text-[#2563eb] ring-1 ring-[#d7dee8]">
                {index + 1}
              </span>
              <h3 className="m-0 text-[18px] font-[800] leading-snug text-[#101828]">{feature.title}</h3>
              <p className="m-0 mt-3 text-[14px] leading-6 text-[#667085]">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d7dee8] bg-[#eef2f6]">
        <div className="mx-auto grid w-full max-w-[1160px] gap-8 px-4 py-10 md:px-8 md:py-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="flex flex-col gap-3">
            <span className="ui-kicker">实现逻辑</span>
            <h2 className="m-0 text-[28px] font-[800] leading-tight text-[#101828] md:text-[34px]">
              为什么它适合作为可公开体验的产品 demo
            </h2>
            <p className="m-0 text-[15px] leading-7 text-[#475467]">
              展示页把关键边界讲清楚：AI 不越权，发布不漂移，数据不绑死某一家服务。
            </p>
          </div>

          <div className="grid gap-4">
            {implementationNotes.map((item) => (
              <article className="grid gap-4 rounded-lg border border-[#d7dee8] bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04)] md:grid-cols-[164px_minmax(0,1fr)]" key={item.label}>
                <div className="flex items-start">
                  <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[12px] font-[800] text-[#1d4ed8]">
                    {item.label}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="m-0 break-words text-[18px] font-[800] leading-snug text-[#101828]">{item.title}</h3>
                  <p className="m-0 mt-2 text-[14px] leading-6 text-[#667085]">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1160px] flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8 md:py-12">
        <div>
          <h2 className="m-0 text-[24px] font-[800] leading-tight text-[#101828]">想看完整链路？</h2>
          <p className="m-0 mt-2 text-[15px] leading-6 text-[#667085]">
            回到首页输入一个调研需求，即可体验从生成到发布的实际工作流。
          </p>
        </div>
        <Link className="ui-btn ui-btn-primary shrink-0" href="/">
          立即体验
        </Link>
      </section>
    </main>
  );
}
