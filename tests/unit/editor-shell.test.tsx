import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorShell } from '@/components/editor/EditorShell';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EditorShell', () => {
  it('renders palette, preview controls, and side panel tabs', () => {
    render(<EditorShell surveyId="demo" />);

    expect(screen.getByText('题型')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '桌面预览' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移动预览' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI 助手' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '属性面板' })).toBeInTheDocument();
  });

  it('adds a title block and toggles preview mode', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    expect(screen.getByRole('heading', { name: '新标题' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '移动预览' }));
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

  it('renders drag handles for sortable canvas cards', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('button', { name: '填写框' }));

    expect(screen.getByRole('button', { name: '拖拽排序 新标题' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '拖拽排序 填写题' })).toBeInTheDocument();
  });

  it('edits the selected block label from inspector', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('tab', { name: '属性面板' }));

    const input = screen.getByLabelText('题目标题');
    fireEvent.change(input, { target: { value: '活动报名' } });

    expect(screen.getByLabelText('题目标题')).toHaveValue('活动报名');
    expect(screen.getByRole('heading', { name: '活动报名' })).toBeInTheDocument();
  });

  it('syncs survey title between top bar and primary title block', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));

    const surveyTitleInput = screen.getByLabelText('问卷标题');
    fireEvent.change(surveyTitleInput, { target: { value: '活动报名表' } });

    expect(screen.getByDisplayValue('活动报名表')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '活动报名表' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '属性面板' }));
    fireEvent.change(screen.getByLabelText('题目标题'), { target: { value: '线下活动报名表' } });

    expect(screen.getByLabelText('问卷标题')).toHaveValue('线下活动报名表');
    expect(screen.getByRole('heading', { name: '线下活动报名表' })).toBeInTheDocument();
  });

  it('edits input placeholder from inspector', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '填写框' }));
    fireEvent.click(screen.getByRole('tab', { name: '属性面板' }));

    const input = screen.getByLabelText('占位提示');
    fireEvent.change(input, { target: { value: '请输入手机号' } });

    expect(screen.getByDisplayValue('请输入手机号')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入手机号')).toBeInTheDocument();
  });

  it('edits choice option text from inspector', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '单选' }));
    fireEvent.click(screen.getByRole('tab', { name: '属性面板' }));

    const optionInput = screen.getByLabelText('选项文案 1');
    fireEvent.change(optionInput, { target: { value: '非常满意' } });

    expect(screen.getByLabelText('选项文案 1')).toHaveValue('非常满意');
    expect(screen.getByRole('radio', { name: '非常满意' })).toBeInTheDocument();
  });

  it('shows published share tools and recent responses', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    });

    render(
      <EditorShell
        surveyId="demo"
        publishState={{
          status: 'published',
          message: '已发布 v2',
          publishedVersion: 2
        }}
        recentResponses={[
          {
            id: 'resp-1',
            surveyId: 'demo',
            version: 2,
            submittedAt: '2026-04-13T12:00:00.000Z',
            answers: {
              'input-1': '张三',
              'choice-1': ['产品体验', '客服响应']
            }
          }
        ]}
        responseCount={1}
      />
    );

    expect(screen.getByText('发布与答卷')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制填写链接' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '刷新答卷' })).toBeInTheDocument();
    expect(screen.getByText(/张三/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '复制填写链接' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/f\/demo$/));
    });

    expect(screen.getByText('链接已复制')).toBeInTheDocument();
  });

  it('opens response detail view with question labels', () => {
    render(
      <EditorShell
        surveyId="demo"
        initialSurvey={{
          id: 'demo',
          title: '活动报名表',
          blocks: [
            {
              id: 'title-1',
              type: 'title',
              label: '活动报名表',
              level: 1
            },
            {
              id: 'input-1',
              type: 'input',
              label: '姓名',
              placeholder: '请输入姓名'
            },
            {
              id: 'multi-1',
              type: 'multiChoice',
              label: '关注方向',
              options: [
                { id: 'o1', text: '产品体验' },
                { id: 'o2', text: '客服响应' }
              ]
            }
          ],
          settings: { submitLabel: '提交' },
          meta: {
            version: 2,
            createdAt: '2026-04-13T00:00:00.000Z',
            updatedAt: '2026-04-13T00:00:00.000Z'
          }
        }}
        publishState={{
          status: 'published',
          message: '已发布 v2',
          publishedVersion: 2
        }}
        recentResponses={[
          {
            id: 'resp-1',
            surveyId: 'demo',
            version: 2,
            submittedAt: '2026-04-13T12:00:00.000Z',
            answers: {
              'input-1': '张三',
              'multi-1': ['产品体验', '客服响应']
            }
          }
        ]}
        responseCount={1}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '查看详情 resp-1' }));

    const detailSection = screen.getByText('答卷详情').closest('section');

    expect(detailSection).not.toBeNull();
    expect(within(detailSection as HTMLElement).getByText('姓名')).toBeInTheDocument();
    expect(within(detailSection as HTMLElement).getByText('张三')).toBeInTheDocument();
    expect(within(detailSection as HTMLElement).getByText('关注方向')).toBeInTheDocument();
    expect(within(detailSection as HTMLElement).getByText('产品体验、客服响应')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: '应用修改' }));

    expect(screen.getByRole('heading', { name: '满意度调查' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '你对产品满意吗？' })).toBeInTheDocument();
  });
});
