import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorWorkspace } from '@/components/editor/EditorWorkspace';

describe('EditorWorkspace', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the persisted survey before rendering the editor shell', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (url === '/api/surveys/demo' && !init) {
        return new Response(
          JSON.stringify({
            surveyId: 'demo',
            version: 2,
            responseCount: 2,
            savedAt: '2026-04-13T00:00:00.000Z',
            document: {
              id: 'demo',
              title: '已保存问卷',
              blocks: [
                {
                  id: 'title-1',
                  type: 'title',
                  label: '已保存标题',
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
          }),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    render(<EditorWorkspace surveyId="demo" />);

    expect(screen.getByText('正在加载问卷...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '已保存标题' })).toBeInTheDocument();
    expect(screen.getByText(/草稿已加载/)).toBeInTheDocument();
    expect(screen.getByText('已收集 2 份答卷')).toBeInTheDocument();
  });

  it('autosaves document changes after local edits', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (url === '/api/surveys/demo' && !init) {
        return new Response(
          JSON.stringify({
            surveyId: 'demo',
            version: 1,
            savedAt: '2026-04-13T00:00:00.000Z',
            document: {
              id: 'demo',
              title: '未命名问卷',
              blocks: [],
              settings: { submitLabel: '提交' },
              meta: {
                version: 1,
                createdAt: '2026-04-13T00:00:00.000Z',
                updatedAt: '2026-04-13T00:00:00.000Z'
              }
            }
          }),
          { status: 200 }
        );
      }

      if (url === '/api/surveys/demo' && init?.method === 'PUT') {
        return new Response(
          JSON.stringify({
            surveyId: 'demo',
            version: 2,
            savedAt: '2026-04-13T00:05:00.000Z'
          }),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    render(<EditorWorkspace surveyId="demo" />);

    await screen.findByText('添加题目');

    fireEvent.click(screen.getByRole('button', { name: '标题' }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2600));
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            input === '/api/surveys/demo' &&
            init &&
            typeof init === 'object' &&
            'method' in init &&
            init.method === 'PUT'
        )
      ).toBe(true);
    });

    expect(screen.getByText(/已保存 v2/)).toBeInTheDocument();
  });

  it('publishes the latest draft from the editor workspace', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (url === '/api/surveys/demo' && !init) {
        return new Response(
          JSON.stringify({
            surveyId: 'demo',
            version: 2,
            savedAt: '2026-04-13T00:00:00.000Z',
            document: {
              id: 'demo',
              title: '活动报名表',
              blocks: [
                {
                  id: 'title-1',
                  type: 'title',
                  label: '活动报名表',
                  level: 1
                }
              ],
              settings: { submitLabel: '提交' },
              meta: {
                version: 2,
                createdAt: '2026-04-13T00:00:00.000Z',
                updatedAt: '2026-04-13T00:00:00.000Z'
              }
            },
            published: null
          }),
          { status: 200 }
        );
      }

      if (url === '/api/surveys/demo' && init?.method === 'PUT') {
        return new Response(
          JSON.stringify({
            surveyId: 'demo',
            version: 2,
            savedAt: '2026-04-13T00:09:00.000Z'
          }),
          { status: 200 }
        );
      }

      if (url === '/api/surveys/demo/publish' && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            surveyId: 'demo',
            version: 2,
            publishedAt: '2026-04-13T00:10:00.000Z',
            document: {
              id: 'demo',
              title: '活动报名表',
              blocks: [
                {
                  id: 'title-1',
                  type: 'title',
                  label: '活动报名表',
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
          }),
          { status: 200 }
        );
      }

      if (url === '/api/surveys/demo/responses' && !init) {
        return new Response(
          JSON.stringify({
            responseCount: 0,
            responses: []
          }),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    render(<EditorWorkspace surveyId="demo" />);

    await screen.findByRole('heading', { name: '活动报名表' });

    fireEvent.click(screen.getByRole('button', { name: '发布问卷' }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            input === '/api/surveys/demo' &&
            init &&
            typeof init === 'object' &&
            'method' in init &&
            init.method === 'PUT'
        )
      ).toBe(true);
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            input === '/api/surveys/demo/publish' &&
            init &&
            typeof init === 'object' &&
            'method' in init &&
            init.method === 'POST'
        )
      ).toBe(true);
    });

    expect(screen.getByText('已发布 v2')).toBeInTheDocument();
  });

  it('loads the published snapshot as readonly without showing response inbox data', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (url === '/api/surveys/demo' && !init) {
        return new Response(
          JSON.stringify({
            surveyId: 'demo',
            version: 2,
            responseCount: 1,
            savedAt: '2026-04-13T00:00:00.000Z',
            document: {
              id: 'demo',
              title: '活动报名表草稿',
              blocks: [
                {
                  id: 'title-1',
                  type: 'title',
                  label: '活动报名表草稿',
                  level: 1
                }
              ],
              settings: { submitLabel: '提交' },
              meta: {
                version: 2,
                createdAt: '2026-04-13T00:00:00.000Z',
                updatedAt: '2026-04-13T00:00:00.000Z'
              }
            },
            published: {
              version: 2,
              publishedAt: '2026-04-13T00:10:00.000Z',
              document: {
                id: 'demo',
                title: '活动报名表已发布',
                blocks: [
                  {
                    id: 'title-pub',
                    type: 'title',
                    label: '活动报名表已发布',
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
            }
          }),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    render(<EditorWorkspace surveyId="demo" />);

    expect(await screen.findByRole('heading', { name: '活动报名表已发布' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '活动报名表草稿' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('问卷标题')).toBeDisabled();
    expect(screen.queryByText('发布与答卷')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '刷新答卷' })).not.toBeInTheDocument();
  });
});
