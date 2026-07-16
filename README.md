# Wenjuan｜AI-first Low-code Survey Editor

语言 / Language： [中文说明](#中文说明) · [English](#english)

![Wenjuan showcase](public/screenshots/showcase.png)

---

## 中文说明

Wenjuan 是一个基于 **Next.js 15 / React 19 / TypeScript / Tailwind CSS v4** 的 AI-first 低代码问卷编辑器 demo。它把拖拽式问卷搭建、可视化属性配置、AI 生成与变更预览、发布填写、答卷分析串成一条完整工作流。

### 在线体验

- Live Demo: <https://wenjuan-alpha.vercel.app>
- 工作台：`/`
- 问卷中心：`/surveys`
- 项目功能展示页：`/showcase`

公开 demo 只用于体验核心流程，请不要填写敏感信息；演示数据可能会定期清理。

### 关于这个项目

Wenjuan 是一个 AI-assisted / vibe coding 方式完成的公开 demo，目标是探索 AI 生成、低代码编辑、可预览 changeset、发布填写和答卷分析如何组成一条完整的问卷创建工作流。

### 功能亮点

- **低代码拖拽搭建**：通过题型面板、问卷画布和属性面板组合问卷，支持拖拽排序与即时预览。
- **AI 生成问卷**：从首页输入需求，进入编辑器后由 AI 助手生成问卷内容。
- **安全的 AI 变更流**：核心路径保持 `prompt -> changeset -> preview -> apply`，避免静默覆盖问卷。
- **可视化编辑器**：编辑画布尽量贴近最终填写效果，题目配置与编辑操作集中在工具栏和属性面板。
- **自动保存 + 手动保存**：编辑时自动保存，同时提供显式保存按钮和 toast 反馈。
- **发布填写页**：发布页读取 published snapshot，草稿修改不会影响已发布问卷。
- **答卷数据分析**：按题目展示答卷内容、选择比例和最近提交记录。
- **SQL-only 持久化**：通过通用 Postgres-compatible `DATABASE_URL` 连接数据库。

### 技术栈

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Zustand + Immer
- PostgreSQL / Supabase-compatible database
- Vitest + Testing Library

### 本地开发

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`.env.local` 只放本地或部署环境的私密配置，不要提交到 git。

本地开发服务可以在没有数据库时启动，但创建、保存、发布、填写和查看数据都需要可用的 Postgres-compatible 数据库。没有可用数据库时，页面会显示友好的服务状态提示，而不是直接暴露服务器异常。

### 数据库配置

关键环境变量是 `DATABASE_URL`：

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require
```

`DB_NAME` 使用数据库服务商分配或你创建的数据库名即可，例如 `postgres`、`neondb` 或 `defaultdb`；Wenjuan 不要求固定数据库名。项目首次访问数据库时会自动创建所需的 `wenjuan_*` 表，不需要手动导入 SQL。

部署在 Vercel 这类 serverless 环境时，优先使用数据库服务商提供的 pooled / pooler 连接串。真实连接串、AI key 和站点地址都只放在 `.env.local` 或部署平台环境变量里。

如果启用线上 AI，在 `.env.local` 或部署平台配置 `WENJUAN_AI_GOOGLE_API_KEY`（Gemini 3.1 Flash-Lite / Gemini 3.5 Flash）和/或 `WENJUAN_AI_BIGMODEL_API_KEY`（GLM-4-Flash-250414）。同时配置时，默认依次尝试 Gemini 3.1 Flash-Lite、Gemini 3.5 Flash 和 GLM；密钥不要提交到 git。

### 免费数据库选择

| 方案 | 适合场景 | 免费限制与注意事项 |
| --- | --- | --- |
| Neon Postgres | 个人 demo、Vercel serverless、小流量公开体验 | Free 计划适合演示与原型；每个项目有月度 compute hours 与存储额度，空闲时 compute 会 scale to zero，冷启动首次访问可能稍慢。 |
| Supabase Postgres | 熟悉 Supabase 控制台，或后续想接 Auth / Storage / Realtime | Free 计划适合轻量项目；有数据库大小、活跃项目数等限制，长期不活跃会暂停；暂停后有恢复窗口，过期后需要从备份迁移到新项目。 |
| 其他 Postgres-compatible 服务 | 已有数据库资源，或希望部署到特定云厂商 | 需要支持 PostgreSQL、JSONB、外键约束，并提供标准 `DATABASE_URL`；切换后请运行 `pnpm test` 和 `pnpm build`。 |

### 部署建议

推荐：**Vercel + Postgres-compatible database**。

1. 准备一个 Postgres-compatible 数据库。
2. 在部署平台配置 `DATABASE_URL`。
3. 设置 `NEXT_PUBLIC_SITE_URL` 为线上站点地址，便于生成 canonical / Open Graph metadata。
4. 如果启用真实 AI provider，配置 `src/features/ai-assistant/model-catalog.ts` 对应的 key。
5. 触发部署。

项目会在首次访问数据库时确保所需 SQL schema 存在。

### 当前限制

- 这是一个公开 demo，不是生产级 SaaS。
- 自行部署时需要准备 Postgres-compatible 数据库。
- 线上 AI provider 需要按模型清单自行配置环境变量。
- 免费数据库可能存在冷启动、暂停、存储或 compute 配额限制。

### 验证命令

```bash
pnpm test
pnpm build
git diff --check
```

### 许可证

MIT License. See [LICENSE](LICENSE).

---

## English

Wenjuan is an AI-first low-code survey editor demo built with **Next.js 15, React 19, TypeScript, and Tailwind CSS v4**. It combines drag-and-drop survey building, visual property editing, AI generation with previewable changesets, publishing, response collection, and analytics.

### Live Demo

- Live Demo: <https://wenjuan-alpha.vercel.app>
- Workspace: `/`
- Survey center: `/surveys`
- Visual project showcase: `/showcase`

The public demo is for trying the core workflow only. Do not enter sensitive information; demo data may be cleaned up periodically.

### About This Project

Wenjuan is an AI-assisted / vibe coding public demo. It explores how AI generation, low-code editing, previewable changesets, publishing, and response analytics can work together in a survey builder.

### Highlights

- **Low-code drag-and-drop editing**: Compose surveys with a block palette, canvas, inspector, drag sorting, and live preview.
- **AI survey generation**: Start from a homepage prompt and continue generation inside the editor.
- **Safe AI change flow**: AI changes follow `prompt -> changeset -> preview -> apply` instead of silently mutating data.
- **Visual editor**: The canvas stays close to the final fill experience, while editing controls live in the toolbar and inspector.
- **Autosave + manual save**: Drafts autosave, while users also get an explicit save button and toast feedback.
- **Published snapshot delivery**: Public fill pages read the published snapshot, not the latest draft.
- **Response analytics**: Question-level statistics, choice percentages, and recent submissions.
- **SQL-only persistence**: Uses a generic Postgres-compatible `DATABASE_URL`.

### Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Zustand + Immer
- PostgreSQL / Supabase-compatible database
- Vitest + Testing Library

### Local Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Keep private values in `.env.local` or deployment environment variables. Do not commit local secrets.

The dev server can start without a database, but creating, saving, publishing, submitting responses, and viewing analytics require a working Postgres-compatible database. If storage is unavailable, Wenjuan shows a friendly service status notice instead of a generic server exception.

### Database Setup

Core environment variable:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require
```

Use the database name assigned by your provider or the one you created, such as `postgres`, `neondb`, or `defaultdb`; Wenjuan does not require a fixed database name. On first database access, the app creates the required `wenjuan_*` tables automatically.

For serverless deployments such as Vercel, prefer the provider's pooled connection string when available. Keep the real connection string, AI keys, and site URL in `.env.local` or deployment environment variables only.

To enable production AI providers, add `WENJUAN_AI_GOOGLE_API_KEY` (Gemini 3.1 Flash-Lite / Gemini 3.5 Flash) and/or `WENJUAN_AI_BIGMODEL_API_KEY` (GLM-4-Flash-250414) to `.env.local` or your deployment environment. With both configured, Wenjuan tries Gemini 3.1 Flash-Lite, Gemini 3.5 Flash, and GLM in that order. Never commit real keys.

### Free Database Options

| Option | Best For | Free Limits and Notes |
| --- | --- | --- |
| Neon Postgres | Personal demos, Vercel serverless, low-traffic public demos | The Free plan fits demos and prototypes; each project has monthly compute-hour and storage allowances, and idle compute can scale to zero, so the first request after inactivity may be slower. |
| Supabase Postgres | Teams already comfortable with Supabase, or projects that may later use Auth / Storage / Realtime | The Free plan fits lightweight projects; it has database size and active-project limits, and inactive projects can pause; paused projects have a restore window, after which backup migration is required. |
| Other Postgres-compatible services | Existing database resources or a preferred cloud provider | Must support PostgreSQL, JSONB, foreign keys, and a standard `DATABASE_URL`; run `pnpm test` and `pnpm build` after switching. |

### Deployment

Recommended setup: **Vercel + Postgres-compatible database**.

1. Prepare a Postgres-compatible database.
2. Add `DATABASE_URL` to your deployment environment variables.
3. Set `NEXT_PUBLIC_SITE_URL` to your public site URL for canonical and Open Graph metadata.
4. If you enable real AI providers, configure the keys referenced by `src/features/ai-assistant/model-catalog.ts`.
5. Deploy.

The app ensures the required SQL schema on first database access.

### Current Limitations

- This is a public demo, not a production SaaS product.
- Self-hosted deployments need a Postgres-compatible database.
- Production AI providers require environment variables from the model catalog.
- Free database plans may have cold starts, pauses, storage limits, or compute limits.

### Verification

```bash
pnpm test
pnpm build
git diff --check
```

### License

MIT License. See [LICENSE](LICENSE).
