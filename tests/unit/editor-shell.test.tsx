import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorShell } from '@/components/editor/EditorShell';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EditorShell', () => {
  it('renders palette, preview controls, and side panel tabs', () => {
    render(<EditorShell surveyId="demo" />);

    expect(screen.getByText('添加题目')).toBeInTheDocument();
    expect(screen.getByText('文本显示')).toBeInTheDocument();
    expect(screen.getByText('用户输入')).toBeInTheDocument();
    expect(screen.getByText('用户选择')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '桌面预览' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移动预览' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI 助手' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '全局属性' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '组件属性' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '属性面板' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Survey ID/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '打开填写页' })).not.toBeInTheDocument();
  });

  it('adds title and paragraph blocks and toggles preview mode', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    expect(screen.getByRole('heading', { name: '新标题' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '段落' }));
    expect(screen.getAllByText('这是一段说明文字').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '移动预览' }));
    expect(screen.getByTestId('preview-frame')).toHaveAttribute('data-preview-mode', 'mobile');
  });

  it('reorders blocks from canvas controls', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('button', { name: '填写框' }));

    const cards = screen.getAllByTestId('canvas-block-card');
    fireEvent.click(within(cards[1]).getByLabelText('填写题'));
    fireEvent.click(screen.getByRole('button', { name: '上移当前题目' }));

    const reorderedCards = screen.getAllByTestId('canvas-block-card');

    expect(within(reorderedCards[0]).getByLabelText('填写题')).toBeInTheDocument();
    expect(within(reorderedCards[1]).getByRole('heading', { name: '新标题' })).toBeInTheDocument();
  });

  it('renders drag handles for sortable canvas cards', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('button', { name: '填写框' }));

    expect(screen.getByRole('button', { name: '拖拽排序 新标题' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '拖拽排序 填写题' })).toBeInTheDocument();
  });

  it('locks editing when a published survey already has responses', () => {
    render(
      <EditorShell
        surveyId="demo"
        publishState={{
          status: 'published',
          message: '已发布 v2',
          publishedVersion: 2
        }}
        responseCount={1}
      />
    );

    expect(screen.getByText('已收集答卷，当前问卷已锁定')).toBeInTheDocument();
    expect(screen.getByLabelText('问卷标题')).toBeDisabled();
    expect(screen.getByRole('button', { name: '标题' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '发布问卷' })).toBeDisabled();
  });

  it('edits the selected title block label from component inspector', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('tab', { name: '组件属性' }));

    const input = screen.getByLabelText('标题文案');
    fireEvent.change(input, { target: { value: '活动报名' } });

    expect(screen.getByLabelText('标题文案')).toHaveValue('活动报名');
    expect(screen.getByRole('heading', { name: '活动报名' })).toBeInTheDocument();
    expect(screen.getByLabelText('标题层级')).not.toHaveDisplayValue('正文段落');
  });

  it('keeps global survey title independent from title blocks', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));

    const surveyTitleInput = screen.getByLabelText('问卷标题');
    fireEvent.change(surveyTitleInput, { target: { value: '活动报名表' } });

    expect(screen.getByLabelText('问卷标题')).toHaveValue('活动报名表');
    expect(screen.getByRole('heading', { name: '新标题' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '活动报名表' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '组件属性' }));
    fireEvent.change(screen.getByLabelText('标题文案'), { target: { value: '线下活动标题' } });

    expect(screen.getByLabelText('问卷标题')).toHaveValue('活动报名表');
    expect(screen.getByRole('heading', { name: '线下活动标题' })).toBeInTheDocument();
  });

  it('edits global survey title from global properties panel without changing the h1 block', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('tab', { name: '全局属性' }));

    fireEvent.change(screen.getByLabelText('全局问卷标题'), { target: { value: '客户回访问卷' } });

    expect(screen.getByRole('textbox', { name: /^问卷标题$/ })).toHaveValue('客户回访问卷');
    expect(screen.getByLabelText('全局问卷标题')).toHaveValue('客户回访问卷');
    expect(screen.getByRole('heading', { name: '新标题' })).toBeInTheDocument();
  });

  it('edits paragraph content as multiline display text', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '段落' }));
    fireEvent.click(screen.getByRole('tab', { name: '组件属性' }));

    fireEvent.change(screen.getByLabelText('段落内容'), {
      target: { value: '第一段说明\n第二行补充\n\n第二段说明' }
    });

    expect(screen.getByLabelText('段落内容')).toHaveValue('第一段说明\n第二行补充\n\n第二段说明');
    expect(screen.getByText('第一段说明')).toBeInTheDocument();
    expect(screen.getByText('第二段说明')).toBeInTheDocument();
  });

  it('edits input placeholder from inspector', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '填写框' }));
    fireEvent.click(screen.getByRole('tab', { name: '组件属性' }));

    const input = screen.getByLabelText('占位提示');
    fireEvent.change(input, { target: { value: '请输入手机号' } });

    expect(screen.getByDisplayValue('请输入手机号')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入手机号')).toBeInTheDocument();
  });

  it('edits choice option text from inspector', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '单选' }));
    fireEvent.click(screen.getByRole('tab', { name: '组件属性' }));

    const optionInput = screen.getByLabelText('选项文案 1');
    fireEvent.change(optionInput, { target: { value: '非常满意' } });

    expect(screen.getByLabelText('选项文案 1')).toHaveValue('非常满意');
    expect(screen.getByRole('radio', { name: '非常满意' })).toBeInTheDocument();
  });

  it('keeps published editor readonly and hides response data panel', () => {
    render(
      <EditorShell
        surveyId="demo"
        publishState={{
          status: 'published',
          message: '已发布 v2',
          publishedVersion: 2
        }}
        responseCount={1}
      />
    );

    expect(screen.getByText('公开填写中')).toBeInTheDocument();
    expect(screen.getByLabelText('问卷标题')).toBeDisabled();
    expect(screen.queryByText('发布与答卷')).not.toBeInTheDocument();
    expect(screen.queryByText(/最近 .* 答卷/)).not.toBeInTheDocument();
  });

  it('switches to inspector when a canvas block is selected', () => {
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
      />
    );

    expect(screen.getByRole('tab', { name: 'AI 助手' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByLabelText('姓名'));
    expect(screen.getByRole('tab', { name: '组件属性' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('题目标题')).toHaveValue('姓名');
  });

  it('shows top bar share actions when survey is published', async () => {
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
        responseCount={3}
      />
    );

    expect(screen.getByText('公开填写中')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '复制分享链接' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/f\/demo$/));
    });

    expect(screen.getByText('分享链接已复制')).toBeInTheDocument();
  });

  it('supports quick ai prompts for demo flow', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'change-quick',
        basedOnVersion: 1,
        userIntent: '生成一个活动报名问卷，包含标题、姓名填写、单选参与场次',
        summary: '新增 3 个题目',
        operations: [],
        nextDocument: {
          id: 'demo',
          title: '活动报名问卷',
          blocks: [],
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

    fireEvent.click(screen.getByRole('button', { name: '活动报名' }));
    expect(screen.getByLabelText('AI prompt')).toHaveValue('生成一个活动报名问卷，包含标题、姓名填写、单选参与场次');

    fireEvent.click(screen.getByRole('button', { name: '直接生成建议' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ai/changes',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('活动报名问卷')
        })
      );
    });
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
