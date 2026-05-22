import { getDemoModeConfig } from '@/features/demo-mode/config';

export function DemoModeBanner() {
  if (!getDemoModeConfig().enabled) {
    return null;
  }

  return (
    <div
      className="border-b border-[#fed7aa] bg-[#fff7ed] px-4 py-2.5 text-center text-sm text-[#9a3412]"
      role="status"
    >
      <strong className="font-semibold text-[#c2410c]">公开演示模式</strong>
      <span className="mx-2 text-[#f97316]">·</span>
      <span>AI 和提交频率有限制，问卷与答卷数据会定期清理，请不要填写敏感信息。</span>
    </div>
  );
}
