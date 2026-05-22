import { StrictMode } from 'react';
import { createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorShell } from '@/components/editor/EditorShell';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockScrollIntoView() {
  const scrollIntoView = vi.fn();
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView
  });

  return scrollIntoView;
}


function createAiPreviewPayload() {
  return {
    id: 'change-pending',
    basedOnVersion: 1,
    userIntent: '生成一个活动报名问卷',
    summary: '新增 1 个题目',
    operations: [
      {
        type: 'addBlock',
        block: {
          id: 'b-ai',
          type: 'input',
          label: '姓名',
          placeholder: '请输入姓名'
        }
      }
    ],
    nextDocument: {
      id: 'demo',
      title: '活动报名问卷',
      blocks: [
        {
          id: 'b-ai',
          type: 'input',
          label: '姓名',
          placeholder: '请输入姓名'
        }
      ],
      settings: { submitLabel: '提交' },
      meta: {
        version: 2,
        createdAt: '2026-04-13T00:00:00.000Z',
        updatedAt: '2026-04-13T00:00:00.000Z'
      }
    }
  };
}

function createEditorSurveyWithOneBlock() {
  return {
    id: 'demo',
    title: '活动报名问卷',
    blocks: [
      {
        id: 'input-1',
        type: 'input' as const,
        label: '姓名',
        placeholder: '请输入姓名'
      }
    ],
    settings: { submitLabel: '提交' },
    meta: {
      version: 1,
      createdAt: '2026-04-13T00:00:00.000Z',
      updatedAt: '2026-04-13T00:00:00.000Z'
    }
  };
}

function createDataTransfer() {
  const store = new Map<string, string>();

  return {
    dropEffect: 'none',
    effectAllowed: 'uninitialized',
    getData: vi.fn((type: string) => store.get(type) ?? ''),
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    })
  };
}

describe('EditorShell', () => {
  it('renders palette, preview controls, and side panel tabs', () => {
    render(<EditorShell surveyId="demo" />);

    expect(screen.getByText('添加题目')).toBeInTheDocument();
    expect(screen.getByText('文本显示')).toBeInTheDocument();
    expect(screen.getByText('用户输入')).toBeInTheDocument();
    expect(screen.getByText('用户选择')).toBeInTheDocument();
    expect(screen.getByText('画布尺寸')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '桌面预览' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移动预览' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI 助手' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '全局属性' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '组件属性' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '属性面板' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('全局问卷标题')).toBeInTheDocument();
    expect(screen.queryByText(/Survey ID/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '打开填写页' })).not.toBeInTheDocument();
  });

  it('keeps the empty component properties panel from forcing an internal scrollbar', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('tab', { name: '组件属性' }));

    const emptyState = screen.getByTestId('inspector-empty-state');
    expect(emptyState).toHaveTextContent('请先在左侧或中间画布选中一个组件');
    expect(emptyState).not.toHaveClass('h-full');
    expect(emptyState).not.toHaveClass('mt-10');
  });

  it('does not show response count in the editor top bar', () => {
    render(<EditorShell surveyId="demo" responseCount={0} />);

    expect(screen.getByText('编辑中')).toBeInTheDocument();
    expect(screen.queryByText('已收集 0 份答卷')).not.toBeInTheDocument();
  });

  it('adds title and paragraph blocks and toggles preview mode', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    expect(screen.getByRole('heading', { name: '新标题' })).toHaveAttribute('data-align', 'center');

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

  it('scrolls a newly added canvas block into view', async () => {
    const scrollIntoView = mockScrollIntoView();

    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '填写框' }));

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });

    const scrolledElement = scrollIntoView.mock.contexts.at(-1) as HTMLElement;
    expect(within(scrolledElement).getByLabelText('填写题')).toBeInTheDocument();
  });

  it('scrolls the matching outline row into view when selecting a canvas block while outline is open', async () => {
    const scrollIntoView = mockScrollIntoView();

    render(
      <EditorShell
        surveyId="demo"
        initialSurvey={{
          id: 'demo',
          title: '长问卷',
          blocks: [
            { id: 'title-1', type: 'title', label: '长问卷', level: 1 },
            { id: 'input-1', type: 'input', label: '姓名', placeholder: '请输入姓名' },
            { id: 'input-2', type: 'input', label: '手机号', placeholder: '请输入手机号' },
            {
              id: 'single-1',
              type: 'singleChoice',
              label: '参与场次',
              options: [
                { id: 's1', text: '上午' },
                { id: 's2', text: '下午' }
              ]
            }
          ],
          settings: { submitLabel: '提交' },
          meta: {
            version: 1,
            createdAt: '2026-04-13T00:00:00.000Z',
            updatedAt: '2026-04-13T00:00:00.000Z'
          }
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '大纲视图' }));
    scrollIntoView.mockClear();

    fireEvent.click(screen.getByLabelText('手机号'));

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });

    const scrolledOutline = scrollIntoView.mock.contexts.find((element) =>
      element instanceof HTMLElement &&
      element.dataset.testid === 'outline-block-row' &&
      element.textContent?.includes('手机号')
    );

    expect(scrolledOutline).toBeTruthy();
  });

  it('adds a block by dragging a palette item onto the canvas', () => {
    render(<EditorShell surveyId="demo" />);

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: '单选' }), { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith('application/x-wenjuan-block-type', 'singleChoice');

    fireEvent.dragOver(screen.getByTestId('preview-frame'), { dataTransfer });
    fireEvent.drop(screen.getByTestId('preview-frame'), { dataTransfer });

    expect(screen.getByRole('group', { name: '单选题' })).toBeInTheDocument();
  });

  it('inserts a dragged palette block at the dropped canvas position', () => {
    render(
      <EditorShell
        surveyId="demo"
        initialSurvey={{
          id: 'demo',
          title: '插入测试',
          blocks: [
            { id: 'title-1', type: 'title', label: '标题一', level: 1 },
            { id: 'input-1', type: 'input', label: '姓名', placeholder: '请输入姓名' }
          ],
          settings: { submitLabel: '提交' },
          meta: {
            version: 1,
            createdAt: '2026-04-13T00:00:00.000Z',
            updatedAt: '2026-04-13T00:00:00.000Z'
          }
        }}
      />
    );

    const initialCards = screen.getAllByTestId('canvas-block-card');
    vi.spyOn(initialCards[0], 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 140,
      height: 40,
      left: 0,
      right: 760,
      width: 760,
      x: 0,
      y: 100,
      toJSON: () => ({})
    } as DOMRect);
    vi.spyOn(initialCards[1], 'getBoundingClientRect').mockReturnValue({
      top: 200,
      bottom: 240,
      height: 40,
      left: 0,
      right: 760,
      width: 760,
      x: 0,
      y: 200,
      toJSON: () => ({})
    } as DOMRect);

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: '单选' }), { dataTransfer });
    const previewFrame = screen.getByTestId('preview-frame');
    const dragOverEvent = createEvent.dragOver(previewFrame, { dataTransfer });
    Object.defineProperty(dragOverEvent, 'clientY', { value: 170 });
    fireEvent(previewFrame, dragOverEvent);

    const canvasList = screen.getByTestId('editor-canvas-list');
    const listChildren = Array.from(canvasList.children);
    expect(screen.getByTestId('canvas-drop-indicator')).toBeInTheDocument();
    expect(listChildren[1]).toHaveAttribute('data-testid', 'canvas-drop-indicator');
    expect(screen.getByText('释放后插入到这里')).toBeInTheDocument();

    const dropEvent = createEvent.drop(previewFrame, { dataTransfer });
    Object.defineProperty(dropEvent, 'clientY', { value: 170 });
    fireEvent(previewFrame, dropEvent);

    const cards = screen.getAllByTestId('canvas-block-card');
    expect(within(cards[0]).getByRole('heading', { name: '标题一' })).toBeInTheDocument();
    expect(within(cards[1]).getByRole('group', { name: '单选题' })).toBeInTheDocument();
    expect(within(cards[2]).getByLabelText('姓名')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-drop-indicator')).not.toBeInTheDocument();
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

    expect(screen.getByText('当前问卷已发布，编辑已锁定')).toBeInTheDocument();
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

  it('edits global survey title from the ai assistant panel without changing the h1 block', () => {
    render(<EditorShell surveyId="demo" />);

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    fireEvent.click(screen.getByRole('tab', { name: 'AI 助手' }));

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

  it('delegates the top-left back action to the workspace navigation handler', () => {
    const onBack = vi.fn();

    render(<EditorShell surveyId="demo" onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: '返回上一页' }));

    expect(onBack).toHaveBeenCalledTimes(1);
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

    const toast = screen.getByRole('status');
    expect(toast).toHaveClass('editor-toast');
    expect(toast).toHaveTextContent('分享链接已复制');
  });


  it('locks the editor surface while ai generation is pending and shows compact reassurance under the generate button', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => undefined) as Promise<Response>);

    render(<EditorShell surveyId="demo" initialSurvey={createEditorSurveyWithOneBlock()} />);

    fireEvent.change(screen.getByLabelText('AI prompt'), {
      target: { value: '生成一个活动报名问卷' }
    });
    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

    expect(await screen.findByRole('button', { name: '生成中' })).toBeDisabled();
    expect(screen.queryByText('AI 正在生成修改建议')).not.toBeInTheDocument();
    expect(screen.getByText('这一步不会直接修改问卷，生成后会先给你预览。')).toBeInTheDocument();
    expect(screen.getByText('AI 正在生成问卷，请稍等，生成完成后就能继续添加组件。')).toBeInTheDocument();
    expect(screen.queryByText('问卷已锁定，无法添加组件。')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '标题' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '拖拽排序 姓名' })).toBeDisabled();
    expect(screen.getByLabelText('问卷标题')).toBeDisabled();
    expect(screen.getByRole('button', { name: '发布问卷' })).toBeDisabled();
    const hint = screen.getByText('这一步不会直接修改问卷，生成后会先给你预览。').closest('[role="status"]');
    expect(hint).toHaveClass('ai-generation-hint');
    expect(within(hint as HTMLElement).getByRole('button', { name: '中断生成' })).toHaveClass('w-full');
  });

  it('can interrupt an in-flight ai generation request without applying changes', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => new Promise<Response>((resolve, reject) => {
      const signal = (init as RequestInit | undefined)?.signal;
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      void resolve;
    }));

    render(<EditorShell surveyId="demo" initialSurvey={createEditorSurveyWithOneBlock()} />);

    fireEvent.change(screen.getByLabelText('AI prompt'), {
      target: { value: '生成一个活动报名问卷' }
    });
    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

    fireEvent.click(await screen.findByRole('button', { name: '中断生成' }));

    expect(await screen.findByText('已中断生成，当前问卷没有变化。')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('问卷标题')).not.toBeDisabled();
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

    expect(screen.queryByRole('button', { name: '直接生成建议' })).not.toBeInTheDocument();
    expect(screen.getByText('点一个示例填入指令，再用下方按钮生成修改建议。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '活动报名' }));
    expect(screen.getByLabelText('AI prompt')).toHaveValue('生成一个活动报名问卷，包含标题、姓名填写、单选参与场次');

    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

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

  it('shows the AI model selector only when multiple models are configured and posts the chosen model', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (input === '/api/ai/models') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            mode: 'configured',
            defaultSelection: 'auto',
            showSelector: true,
            models: [
              { id: 'local:main', alias: '主模型', providerAlias: '本地服务', primary: true },
              { id: 'local:backup', alias: '备用模型', providerAlias: '本地服务', primary: false }
            ]
          })
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: async () => createAiPreviewPayload()
      } as Response);
    });

    render(<EditorShell surveyId="demo" />);

    const selector = await screen.findByLabelText('AI 模型');
    expect(selector).toHaveValue('auto');
    expect(screen.getByRole('option', { name: 'auto 模式' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '主模型 · 本地服务' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '备用模型 · 本地服务' })).toBeInTheDocument();

    fireEvent.change(selector, { target: { value: 'local:backup' } });
    fireEvent.change(screen.getByLabelText('AI prompt'), {
      target: { value: '生成一个活动报名问卷' }
    });
    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

    await screen.findByLabelText('姓名');
    const postCall = fetchMock.mock.calls.find((call) => call[0] === '/api/ai/changes');
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
      prompt: '生成一个活动报名问卷',
      modelSelection: 'local:backup'
    });
  });

  it('hides the AI model selector when only one model is configured', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: 'configured',
        defaultSelection: 'legacy:mimo-v2.5',
        showSelector: false,
        models: [
          { id: 'legacy:mimo-v2.5', alias: 'Mimo v2.5', providerAlias: '本地服务', primary: true }
        ]
      })
    } as Response);

    render(<EditorShell surveyId="demo" />);

    await waitFor(() => {
      expect(screen.queryByLabelText('AI 模型')).not.toBeInTheDocument();
    });
  });

  it('shows builtin generator notices returned by the AI changes endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (input === '/api/ai/models') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            mode: 'builtin-only',
            defaultSelection: 'auto',
            showSelector: false,
            models: []
          })
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          ...createAiPreviewPayload(),
          source: 'builtin',
          notice: '当前未配置 AI 模型，这是内置生成器生成的。'
        })
      } as Response);
    });

    render(<EditorShell surveyId="demo" initialSurvey={createEditorSurveyWithOneBlock()} />);

    fireEvent.change(screen.getByLabelText('AI prompt'), {
      target: { value: '生成一个活动报名问卷' }
    });
    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

    expect(await screen.findByText('当前未配置 AI 模型，这是内置生成器生成的。')).toBeInTheDocument();
    expect(await screen.findByText('新增 1 个题目')).toBeInTheDocument();
  });

  it('applies ai generation directly when the current survey is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => createAiPreviewPayload()
    } as Response);

    render(<EditorShell surveyId="demo" />);

    fireEvent.change(screen.getByLabelText('AI prompt'), {
      target: { value: '生成一个活动报名问卷' }
    });
    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

    expect(await screen.findByLabelText('姓名')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '应用修改' })).not.toBeInTheDocument();
  });

  it('auto applies ai generation from a homepage prompt when the current survey is empty', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'change-home-prompt',
        basedOnVersion: 1,
        userIntent: '生成一份打工人睡眠质量的问卷调查',
        summary: '生成睡眠质量问卷',
        operations: [
          {
            type: 'addBlock',
            block: {
              id: 'sleep-title',
              type: 'title',
              label: '打工人睡眠质量调查',
              level: 1
            }
          }
        ],
        nextDocument: {
          id: 'demo',
          title: '打工人睡眠质量调查',
          blocks: [
            {
              id: 'sleep-title',
              type: 'title',
              label: '打工人睡眠质量调查',
              level: 1
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

    window.history.pushState({}, '', '/editor/demo?aiPrompt=%E6%89%93%E5%B7%A5%E4%BA%BA');

    render(
      <StrictMode>
        <EditorShell surveyId="demo" initialAiPrompt="生成一份打工人睡眠质量的问卷调查" />
      </StrictMode>
    );

    expect(screen.getByLabelText('AI prompt')).toHaveValue('生成一份打工人睡眠质量的问卷调查');
    expect(await screen.findByRole('heading', { name: '打工人睡眠质量调查' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('生成睡眠质量问卷')).not.toBeInTheDocument();
    expect(screen.queryByText('已中断生成，当前问卷没有变化。')).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/changes',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('打工人睡眠质量')
      })
    );
    expect(fetchMock.mock.calls.filter((call) => call[0] === '/api/ai/changes')).toHaveLength(1);
  });

  it('removes the quick template id from the editor url after the template is loaded', async () => {
    window.history.pushState({}, '', '/editor/demo?template=worker-sleep');

    render(<EditorShell surveyId="demo" initialTemplateKey="worker-sleep" />);

    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
  });

  it('shows the local ai server error from the changes endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: '本地 AI 调用失败：本地 AI 没有返回 JSON 对象' })
    } as Response);

    render(<EditorShell surveyId="demo" />);

    fireEvent.change(screen.getByLabelText('AI prompt'), {
      target: { value: '生成一个满意度问卷' }
    });
    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

    expect(await screen.findByText('AI 暂时没能生成修改建议，请稍后重试或换个说法。')).toBeInTheDocument();
    expect(screen.queryByText(/本地 AI/)).not.toBeInTheDocument();
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

    render(<EditorShell surveyId="demo" initialSurvey={createEditorSurveyWithOneBlock()} />);

    fireEvent.change(screen.getByLabelText('AI prompt'), {
      target: { value: '生成一个满意度问卷' }
    });
    fireEvent.click(screen.getByRole('button', { name: '生成修改建议' }));

    expect(await screen.findByText('新增 2 个题目')).toBeInTheDocument();
    expect(screen.getByText('标题 · 满意度调查')).toBeInTheDocument();
    expect(screen.getByText('单选 · 你对产品满意吗？')).toBeInTheDocument();
    expect(screen.queryByText('addBlock · title')).not.toBeInTheDocument();
    expect(screen.queryByText('addBlock · singleChoice')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter((call) => call[0] === '/api/ai/changes')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '应用修改' }));

    expect(screen.getByRole('heading', { name: '满意度调查' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '你对产品满意吗？' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI 助手' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '组件属性' })).toHaveAttribute('aria-selected', 'false');
  });
});
