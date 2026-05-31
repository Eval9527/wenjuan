import {
  DATABASE_UNAVAILABLE_MESSAGE,
  DATABASE_UNAVAILABLE_TITLE
} from '@/features/persistence/errors';

export function DatabaseUnavailableNotice({
  retryHref = '/',
  title = DATABASE_UNAVAILABLE_TITLE,
  message = DATABASE_UNAVAILABLE_MESSAGE,
  helper = '如果你是部署者，请检查 DATABASE_URL、数据库项目状态和部署环境变量。',
  showHomeAction = true,
  showShowcaseAction = true
}: {
  retryHref?: string;
  title?: string;
  message?: string;
  helper?: string;
  showHomeAction?: boolean;
  showShowcaseAction?: boolean;
}) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[760px] place-items-center px-4 py-12">
      <section className="ui-panel w-full p-6 text-center md:p-8">
        <span className="ui-kicker mb-4">服务状态</span>
        <h1 className="m-0 text-[26px] font-[700] tracking-tight text-[#101828]">
          {title}
        </h1>
        <p className="mx-auto mb-0 mt-3 max-w-[520px] text-sm leading-6 text-[#667085]">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a className="ui-btn ui-btn-primary" href={retryHref}>
            刷新重试
          </a>
          {showHomeAction ? (
            <a className="ui-btn ui-btn-secondary" href="/">
              返回工作台
            </a>
          ) : null}
          {showShowcaseAction ? (
            <a className="ui-btn ui-btn-secondary" href="/showcase">
              查看功能展示
            </a>
          ) : null}
        </div>
        {helper ? (
          <p className="mx-auto mb-0 mt-5 max-w-[520px] text-xs leading-5 text-[#94a3b8]">
            {helper}
          </p>
        ) : null}
      </section>
    </main>
  );
}
