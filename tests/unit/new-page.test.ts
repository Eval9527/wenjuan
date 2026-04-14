import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLatestSurveyDraft } from '@/features/persistence/repository';

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  redirect: redirectMock
}));

describe('NewSurveyPage', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'wenjuan-new-page-'));
    process.env.WENJUAN_DATA_DIR = dataDir;
    redirectMock.mockReset();
  });

  afterEach(async () => {
    delete process.env.WENJUAN_DATA_DIR;
    vi.restoreAllMocks();
    await rm(dataDir, { force: true, recursive: true });
  });

  it('creates a template survey and redirects to editor', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('fixed-id');
    const { default: NewSurveyPage } = await import('@/app/new/page');

    await NewSurveyPage({
      searchParams: Promise.resolve({
        template: 'event-signup'
      })
    });

    expect(redirectMock).toHaveBeenCalledWith('/editor/wj-fixedid');

    const saved = await getLatestSurveyDraft('wj-fixedid');
    expect(saved?.document.title).toBe('活动报名表');
    expect(saved?.document.blocks).toHaveLength(3);
    expect(saved?.document.blocks[0]).toMatchObject({
      type: 'title',
      label: '活动报名表'
    });
    expect(saved?.document.blocks[1]).toMatchObject({
      type: 'input',
      label: '姓名'
    });
    expect(saved?.document.blocks[2]).toMatchObject({
      type: 'singleChoice',
      label: '参与场次'
    });
  });
});
