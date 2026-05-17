import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiChangePreview } from '@/components/editor/AiChangePreview';

vi.stubGlobal('crypto', {
  randomUUID: () => 'preview-test-id'
});

describe('AiChangePreview', () => {
  it('renders detailed operation cards and the suggested survey snapshot', () => {
    render(
      <AiChangePreview
        changeSet={{
          id: 'change-1',
          basedOnVersion: 2,
          userIntent: '把问卷改成活动报名表并补一个手机号题',
          summary: '修改标题并新增一个填写题',
          operations: [
            {
              type: 'updateBlock',
              blockId: 'title-1',
              changes: {
                label: '活动报名表'
              }
            },
            {
              type: 'addBlock',
              block: {
                id: 'input-1',
                type: 'input',
                label: '手机号',
                placeholder: '请输入手机号'
              }
            }
          ],
          nextDocument: {
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
                label: '手机号',
                placeholder: '请输入手机号'
              }
            ],
            settings: { submitLabel: '提交' },
            meta: {
              version: 3,
              createdAt: '2026-04-13T00:00:00.000Z',
              updatedAt: '2026-04-13T00:00:00.000Z'
            }
          }
        }}
        currentDocument={{
          id: 'demo',
          title: '活动问卷',
          blocks: [
            {
              id: 'title-1',
              type: 'title',
              label: '原始标题',
              level: 1
            }
          ],
          settings: { submitLabel: '提交' },
          meta: {
            version: 2,
            createdAt: '2026-04-13T00:00:00.000Z',
            updatedAt: '2026-04-13T00:00:00.000Z'
          }
        }}
        onApply={() => undefined}
        onDiscard={() => undefined}
      />
    );

    expect(screen.getByText('变更明细')).toBeInTheDocument();
    expect(screen.getAllByText('修改').length).toBeGreaterThan(0);
    expect(screen.getAllByText('新增').length).toBeGreaterThan(0);
    expect(screen.getByText('题目标题：原始标题 → 活动报名表')).toBeInTheDocument();
    expect(screen.getByText('填写框 · 手机号')).toBeInTheDocument();
    expect(screen.queryByText('updateBlock · title-1')).not.toBeInTheDocument();
    expect(screen.queryByText('addBlock · input')).not.toBeInTheDocument();
    expect(screen.queryByText(/removeBlock ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/block-[0-9a-f-]{8,}/)).not.toBeInTheDocument();
    expect(screen.getByText('建议后的问卷')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '活动报名表' })).toBeInTheDocument();
    expect(screen.getByTestId('ai-preview-frame')).toHaveClass('editor-preview-frame', 'ai-change-preview__frame--full-width');
    expect(screen.getByPlaceholderText('请输入手机号')).toHaveAttribute('readonly');

    const operationCards = screen.getAllByTestId('ai-change-operation');
    expect(operationCards[0]).toHaveAttribute('data-change-tone', 'update');
    expect(operationCards[1]).toHaveAttribute('data-change-tone', 'add');

    const previewCards = screen.getAllByTestId('ai-preview-block-card');
    expect(previewCards[0]).toHaveAttribute('data-block-id', 'title-1');
    expect(previewCards[0]).toHaveAttribute('data-change-tone', 'update');
    expect(within(previewCards[0]).getByText('修改')).toBeInTheDocument();
    expect(previewCards[1]).toHaveAttribute('data-block-id', 'input-1');
    expect(previewCards[1]).toHaveAttribute('data-change-tone', 'add');
    expect(within(previewCards[1]).getByText('新增')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '应用修改' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '放弃修改' })).toBeInTheDocument();
  });
});
