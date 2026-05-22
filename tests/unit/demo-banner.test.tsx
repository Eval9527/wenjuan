import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DemoModeBanner } from '@/components/demo/DemoModeBanner';

describe('DemoModeBanner', () => {
  afterEach(() => {
    delete process.env.WENJUAN_DEMO_MODE;
  });

  it('stays hidden outside public demo mode', () => {
    render(<DemoModeBanner />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('explains demo limits when public demo mode is enabled', () => {
    process.env.WENJUAN_DEMO_MODE = 'true';

    render(<DemoModeBanner />);

    expect(screen.getByRole('status')).toHaveTextContent('公开演示模式');
    expect(screen.getByText(/AI 和提交频率有限制/)).toBeInTheDocument();
    expect(screen.getByText(/数据会定期清理/)).toBeInTheDocument();
  });
});
