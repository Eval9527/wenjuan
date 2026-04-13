import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SurveyRenderer } from '@/features/renderer/SurveyRenderer';

describe('SurveyRenderer', () => {
  it('renders title and choice blocks in editor preview mode', () => {
    render(
      <SurveyRenderer
        mode="editor-preview"
        document={{
          id: 'demo',
          title: 'Demo',
          blocks: [
            { id: 'b1', type: 'title', label: '欢迎语', level: 1 },
            {
              id: 'b2',
              type: 'singleChoice',
              label: '满意度',
              options: [{ id: 'o1', text: '满意' }]
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

    expect(screen.getByText('欢迎语')).toBeInTheDocument();
    expect(screen.getByText('满意度')).toBeInTheDocument();
    expect(screen.getByLabelText('满意')).toBeInTheDocument();
  });
});
