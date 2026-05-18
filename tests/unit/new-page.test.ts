import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLatestSurveyDraft } from '@/features/persistence/repository';
import { createSurveyFromTemplate, surveyTemplateCatalog } from '@/features/survey-schema/templates';

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

    expect(redirectMock).toHaveBeenCalledWith('/editor/wj-fixedid?template=event-signup');

    const saved = await getLatestSurveyDraft('wj-fixedid');
    expect(saved?.document.title).toBe('活动报名表');
    expect(saved?.document.blocks).toHaveLength(3);
    expect(saved?.document.blocks[0]).toMatchObject({
      type: 'title',
      label: '活动报名表',
      align: 'center'
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

  it('centers title blocks for all built-in templates', () => {
    for (const template of surveyTemplateCatalog) {
      const survey = createSurveyFromTemplate({
        id: `demo-${template.key}`,
        template: template.key
      });
      const titleBlock = survey.blocks.find((block) => block.type === 'title');

      expect(titleBlock, template.key).toMatchObject({
        type: 'title',
        align: 'center'
      });
    }
  });

  it('passes a homepage prompt into the editor ai assistant', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('prompt-id');
    const { default: NewSurveyPage } = await import('@/app/new/page');

    await NewSurveyPage({
      searchParams: Promise.resolve({
        prompt: '  生成一份员工体验问卷  '
      })
    });

    expect(redirectMock).toHaveBeenCalledWith('/editor/wj-promptid?aiPrompt=%E7%94%9F%E6%88%90%E4%B8%80%E4%BB%BD%E5%91%98%E5%B7%A5%E4%BD%93%E9%AA%8C%E9%97%AE%E5%8D%B7');

    const saved = await getLatestSurveyDraft('wj-promptid');
    expect(saved?.document.blocks).toHaveLength(0);
  });

  it('uses the sleep quality prompt when homepage generation is submitted empty', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('blank-id');
    const { default: NewSurveyPage } = await import('@/app/new/page');

    await NewSurveyPage({
      searchParams: Promise.resolve({
        prompt: '',
        template: 'worker-sleep'
      })
    });

    const redirectedTo = redirectMock.mock.calls.at(-1)?.[0] as string;
    expect(redirectedTo).toBe('/editor/wj-blankid?template=worker-sleep');

    const saved = await getLatestSurveyDraft('wj-blankid');
    expect(saved?.document.title).toBe('打工人睡眠质量调查');
    expect(saved?.document.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'singleChoice', label: '你最近一周的整体睡眠质量如何？' }),
        expect.objectContaining({ type: 'multiChoice', label: '哪些因素最影响你的睡眠？' })
      ])
    );
  });
});
