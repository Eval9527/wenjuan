# Wenjuan｜AI-first Survey Editor

> 中文说明在前，English section follows.

Wenjuan 是一个基于 **Next.js 15 / React 19 / TypeScript / Tailwind CSS v4** 的 AI-first 问卷编辑器 demo。它展示从自然语言生成问卷，到可视化编辑、发布填写、收集答卷、查看数据分析的完整闭环。

## 在线演示

- 工作台：`/`
- 问卷中心：`/surveys`
- 项目功能展示页：`/showcase`

如果你部署到 Vercel，可以把仓库的 GitHub Description 设置为：

```text
AI-first survey editor demo built with Next.js, Postgres, and typed multi-model AI configuration.
```

## 功能亮点

- **AI 生成问卷**：从首页输入需求，进入编辑器后由 AI 助手生成问卷内容。
- **安全的 AI 变更流**：核心路径保持 `prompt -> changeset -> preview -> apply`，避免静默覆盖问卷。
- **可视化编辑器**：题型面板、问卷画布、AI 助手、组件属性面板协同工作。
- **自动保存 + 手动保存**：编辑时自动保存，同时提供显式保存按钮和 toast 反馈。
- **发布填写页**：发布页读取 published snapshot，草稿修改不会影响已发布问卷。
- **答卷数据分析**：按题目展示答卷内容、选择比例和最近提交记录。
- **Demo 防刷**：visitor 签名、IP hash、AI/提交 quota 和数据清理逻辑集中在 demo mode 模块。
- **SQL-only 持久化**：通过通用 Postgres-compatible `DATABASE_URL` 连接数据库，适合 Vercel + Supabase。

## 技术栈

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Zustand + Immer
- PostgreSQL / Supabase-compatible database
- Vitest + Testing Library

## 本地开发

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`.env.local` 只放本地或部署环境的私密配置，不要提交到 git。

关键环境变量：

```env
DATABASE_URL=<your-postgres-connection-string>
WENJUAN_DEMO_MODE=true
WENJUAN_DEMO_VISITOR_SECRET=replace-with-long-random-secret
WENJUAN_DEMO_IP_HASH_SECRET=replace-with-another-long-random-secret
```

如果启用线上 AI，需要按 `src/features/ai-assistant/model-catalog.ts` 中的模型清单配置对应的环境变量。

## 部署建议

推荐：**Vercel + Supabase Postgres**。

1. 在 Supabase 创建 Postgres 数据库。
2. 在 Vercel 项目环境变量中配置 `DATABASE_URL` 和 demo secrets。
3. 设置 `NEXT_PUBLIC_SITE_URL` 为线上站点地址，便于生成 canonical / Open Graph metadata。
4. 触发 Vercel 部署。

项目会在首次访问数据库时确保所需 SQL schema 存在。

## 验证命令

```bash
pnpm test
pnpm build
git diff --check
```

---

# Wenjuan｜AI-first Survey Editor

Wenjuan is an AI-first survey editor demo built with **Next.js 15, React 19, TypeScript, and Tailwind CSS v4**. It demonstrates a complete workflow from natural-language survey generation to visual editing, publishing, collecting responses, and analyzing results.

## Demo Routes

- Workspace: `/`
- Survey center: `/surveys`
- Visual project showcase: `/showcase`

Suggested GitHub repository description:

```text
AI-first survey editor demo built with Next.js, Postgres, and typed multi-model AI configuration.
```

## Highlights

- **AI survey generation**: Start from a homepage prompt and continue generation inside the editor.
- **Safe AI change flow**: AI changes follow `prompt -> changeset -> preview -> apply` instead of silently mutating data.
- **Visual editor**: Block palette, survey canvas, AI assistant, and inspector panel work together.
- **Autosave + manual save**: Drafts autosave, while users also get an explicit save button and toast feedback.
- **Published snapshot delivery**: Public fill pages read the published snapshot, not the latest draft.
- **Response analytics**: Question-level statistics, choice percentages, and recent submissions.
- **Demo protections**: Signed visitor cookie, IP hashing, quotas, and cleanup logic for public demos.
- **SQL-only persistence**: Uses a generic Postgres-compatible `DATABASE_URL`, suitable for Vercel + Supabase.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Zustand + Immer
- PostgreSQL / Supabase-compatible database
- Vitest + Testing Library

## Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Keep private values in `.env.local` or deployment environment variables. Do not commit local secrets.

Core environment variables:

```env
DATABASE_URL=<your-postgres-connection-string>
WENJUAN_DEMO_MODE=true
WENJUAN_DEMO_VISITOR_SECRET=replace-with-long-random-secret
WENJUAN_DEMO_IP_HASH_SECRET=replace-with-another-long-random-secret
```

To enable production AI providers, configure the environment variables referenced by `src/features/ai-assistant/model-catalog.ts`.

## Deployment

Recommended setup: **Vercel + Supabase Postgres**.

1. Create a Supabase Postgres database.
2. Add `DATABASE_URL` and demo secrets to Vercel environment variables.
3. Set `NEXT_PUBLIC_SITE_URL` to your public site URL for canonical and Open Graph metadata.
4. Deploy on Vercel.

The app ensures the required SQL schema on first database access.

## Verification

```bash
pnpm test
pnpm build
git diff --check
```
