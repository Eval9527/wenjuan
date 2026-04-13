import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorShell } from '@/components/editor/EditorShell';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EditorShell', () => {
  it('renders palette, preview controls, and side panel tabs', () => {
    render(<EditorShell surveyId="demo" />);

    expect(screen.getByText('题型')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desktop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mobile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI Assistant' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Inspector' })).toBeInTheDocument();
  });

  it('adds a title block and toggles preview mode', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    expect(screen.getByRole('heading', { name: '新标题' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(screen.getByTestId('preview-frame')).toHaveAttribute('data-preview-mode', 'mobile');
  });

  it('reorders blocks from canvas controls', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('button', { name: '填写框' }));
    fireEvent.click(screen.getByRole('button', { name: '上移 填写题' }));

    const cards = screen.getAllByTestId('canvas-block-card');
    expect(within(cards[0]).getByLabelText('填写题')).toBeInTheDocument();
    expect(within(cards[1]).getByRole('heading', { name: '新标题' })).toBeInTheDocument();
  });

  it('edits the selected block label from inspector', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Inspector' }));

    const input = screen.getByLabelText('题目标题');
    fireEvent.change(input, { target: { value: '活动报名' } });

    expect(screen.getByDisplayValue('活动报名')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '活动报名' })).toBeInTheDocument();
  });

  it('shows ai preview before apply and then updates the canvas', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'change-1',
        basedOnVersion: 1,
        userIntent: '生成一个满意度问卷',
        summary: '新增 2 个题目',
        operations: [
          {
            type: 'addBlock',
            block: {
              id: 'b1',
              type: 'title',
              label: '满意度调查',
              level: 1
            }
          },
          {
            type: 'addBlock',
            block: {
              id: 'b2',
              type: 'singleChoice',
              label: '你对产品满意吗？',
              options: [
                { id: 'o1', text: '满意' },
                { id: 'o2', text: '一般' }
              ]
            }
          }
        ],
        nextDocument: {
          id: 'demo',
          title: '满意度调查',
          blocks: [
            {
              id: 'b1',
              type: 'title',
              label: '满意度调查',
              level: 1
            },
            {
              id: 'b2',
              type: 'singleChoice',
              label: '你对产品满意吗？',
              options: [
                { id: 'o1', text: '满意' },
                { id: 'o2', text: '一般' }
              ]
            }
          ],
          settings: { submitLabel: '提交' },
          meta: {
            version: 2,
            createdAt: '2026-04-13T00:00:00.000Z',
            updatedAt: '2026-04-13T00:00:00.000Z'
          }
        }
      })
    } as Response);

    render(<EditorShell surveyId="demo" />);

    fireEvent.change(screen.getByLabelText('AI prompt'), {
      target: { value: '生成一个满意度问卷' }
    });
    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

    expect(await screen.findByText('新增 2 个题目')).toBeInTheDocument();
    expect(screen.getByText('addBlock · title')).toBeInTheDocument();
    expect(screen.getByText('addBlock · singleChoice')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByRole('heading', { name: '满意度调查' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '你对产品满意吗？' })).toBeInTheDocument();
  });
});
