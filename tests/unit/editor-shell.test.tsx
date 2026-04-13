import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorShell } from '@/components/editor/EditorShell';

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
    expect(screen.getByText('新标题')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(screen.getByTestId('preview-frame')).toHaveAttribute('data-preview-mode', 'mobile');
  });
});
