'use client';

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[760px] place-items-center px-4 py-12">
      <section className="ui-panel w-full p-6 text-center md:p-8">
        <span className="ui-kicker mb-4">服务状态</span>
        <h1 className="m-0 text-[26px] font-[700] tracking-tight text-[#101828]">页面暂时无法加载</h1>
        <p className="mx-auto mb-0 mt-3 max-w-[520px] text-sm leading-6 text-[#667085]">
          服务端刚才遇到异常。你可以先重试加载；如果仍然失败，请稍后再回来。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button className="ui-btn ui-btn-primary" type="button" onClick={reset}>
            重试加载
          </button>
          <a className="ui-btn ui-btn-secondary" href="/">
            返回工作台
          </a>
        </div>
      </section>
    </main>
  );
}
