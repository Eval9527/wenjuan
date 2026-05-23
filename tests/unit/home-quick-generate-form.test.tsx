import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeQuickGenerateForm } from '@/components/home/HomeQuickGenerateForm';
import { HomeTemplateLinks } from '@/components/home/HomeTemplateLinks';

describe('HomeQuickGenerateForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cycles placeholders and keeps the empty-submit template id in sync', async () => {
    render(<HomeQuickGenerateForm />);

    const promptInput = screen.getByPlaceholderText('例如：打工人睡眠质量的问卷调查...');
    expect(promptInput).toHaveAttribute('name', 'prompt');
    expect(screen.getByDisplayValue('worker-sleep')).toHaveAttribute('name', 'template');

    act(() => {
      vi.advanceTimersByTime(3200);
    });

    expect(screen.getByPlaceholderText('例如：线下沙龙活动报名表...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('event-signup')).toHaveAttribute('name', 'template');

    act(() => {
      vi.advanceTimersByTime(3200);
    });

    expect(screen.getByPlaceholderText('例如：课程体验满意度回访问卷...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('satisfaction')).toHaveAttribute('name', 'template');

    act(() => {
      vi.advanceTimersByTime(3200);
    });

    expect(screen.getByPlaceholderText('例如：企业服务线索收集表...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('lead-collection')).toHaveAttribute('name', 'template');
  });

  it('submits a typed prompt instead of relying on the rotating template', () => {
    render(<HomeQuickGenerateForm />);

    fireEvent.change(screen.getByLabelText('问卷生成需求'), {
      target: { value: '生成一份员工体验问卷' }
    });

    expect(screen.getByLabelText('问卷生成需求')).toHaveValue('生成一份员工体验问卷');
    expect(screen.getByDisplayValue('worker-sleep')).toHaveAttribute('name', 'template');
  });


  it('shows loading feedback after submitting a prompt', () => {
    render(<HomeQuickGenerateForm />);

    const input = screen.getByLabelText('问卷生成需求');
    fireEvent.change(input, { target: { value: '生成一份员工体验问卷' } });
    fireEvent.submit(screen.getByRole('button', { name: '生成问卷' }).closest('form') as HTMLFormElement);

    expect(screen.getByRole('button', { name: '正在创建...' })).toBeDisabled();
    expect(input).toBeDisabled();
  });

  it('shows loading feedback on template links after click', () => {
    render(<HomeTemplateLinks templates={[{ key: 'worker-sleep', title: '睡眠质量模板' }]} />);

    fireEvent.click(screen.getByRole('link', { name: '睡眠质量模板' }));

    expect(screen.getByRole('link', { name: '正在创建...' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('link', { name: '正在创建...' })).toHaveAttribute('href', '/new?template=worker-sleep');
  });
});
