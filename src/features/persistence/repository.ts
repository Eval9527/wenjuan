import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SurveyResponseRecord, SurveyResponseValue } from '@/features/persistence/contracts';
import type { ChoiceOption, SurveyBlock, SurveyDocument } from '@/features/survey-schema/schema';

export type SurveyDraftRecord = {
  surveyId: string;
  version: number;
  document: SurveyDocument;
  savedAt: string;
};

export type PublishedSurveyRecord = {
  surveyId: string;
  version: number;
  document: SurveyDocument;
  publishedAt: string;
};

export type SurveyListItem = {
  surveyId: string;
  title: string;
  currentVersion: number;
  updatedAt: string;
  publishedVersion: number | null;
  publishedAt: string | null;
  responseCount: number;
};

type StoredSurveyFile = {
  surveyId: string;
  title: string;
  currentVersion: number;
  updatedAt: string;
  drafts: SurveyDraftRecord[];
  published: PublishedSurveyRecord | null;
  responses: SurveyResponseRecord[];
};

function getDataRoot() {
  return process.env.WENJUAN_DATA_DIR ?? path.join(process.cwd(), '.data');
}

function getSurveyDir() {
  return path.join(getDataRoot(), 'surveys');
}

function getSurveyFilePath(surveyId: string) {
  return path.join(getSurveyDir(), `${surveyId}.json`);
}

async function ensureSurveyDir() {
  await mkdir(getSurveyDir(), { recursive: true });
}

async function readSurveyFile(surveyId: string): Promise<StoredSurveyFile | null> {
  try {
    const content = await readFile(getSurveyFilePath(surveyId), 'utf8');
    return JSON.parse(content) as StoredSurveyFile;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeSurveyFile(file: StoredSurveyFile) {
  await ensureSurveyDir();
  await writeFile(getSurveyFilePath(file.surveyId), JSON.stringify(file, null, 2), 'utf8');
}

function createShortSurveyId() {
  return `wj-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

function cloneOption(option: ChoiceOption): ChoiceOption {
  return {
    ...option,
    id: `option-${randomUUID()}`
  };
}

function cloneBlock(block: SurveyBlock): SurveyBlock {
  const cloned = {
    ...block,
    id: `block-${randomUUID()}`
  };

  if (cloned.type === 'singleChoice' || cloned.type === 'multiChoice') {
    return {
      ...cloned,
      options: cloned.options.map(cloneOption)
    };
  }

  return cloned;
}

export async function saveSurveyDraft(input: {
  surveyId: string;
  version: number;
  document: SurveyDocument;
}) {
  const savedAt = new Date().toISOString();
  const existing = await readSurveyFile(input.surveyId);
  const nextDraft: SurveyDraftRecord = {
    surveyId: input.surveyId,
    version: input.version,
    document: input.document,
    savedAt
  };

  const drafts = existing?.drafts.filter((draft) => draft.version !== input.version) ?? [];
  drafts.push(nextDraft);
  drafts.sort((left, right) => left.version - right.version);

  await writeSurveyFile({
    surveyId: input.surveyId,
    title: input.document.title,
    currentVersion: Math.max(existing?.currentVersion ?? 0, input.version),
    updatedAt: savedAt,
    drafts,
    published: existing?.published ?? null,
    responses: existing?.responses ?? []
  });

  return nextDraft;
}

export async function getLatestSurveyDraft(surveyId: string) {
  const existing = await readSurveyFile(surveyId);

  if (!existing?.drafts.length) {
    return null;
  }

  return [...existing.drafts].sort((left, right) => right.version - left.version)[0] ?? null;
}

export async function getPublishedSurvey(surveyId: string) {
  const existing = await readSurveyFile(surveyId);
  return existing?.published ?? null;
}

export async function publishSurveyDraft(surveyId: string) {
  const existing = await readSurveyFile(surveyId);
  const latestDraft = existing?.drafts.length
    ? [...existing.drafts].sort((left, right) => right.version - left.version)[0]
    : null;

  if (!existing || !latestDraft) {
    throw new Error('Survey draft not found');
  }

  const publishedAt = new Date().toISOString();
  const published: PublishedSurveyRecord = {
    surveyId,
    version: latestDraft.version,
    document: latestDraft.document,
    publishedAt
  };

  await writeSurveyFile({
    ...existing,
    title: latestDraft.document.title,
    currentVersion: Math.max(existing.currentVersion, latestDraft.version),
    updatedAt: existing.updatedAt,
    published,
    responses: existing.responses ?? []
  });

  return published;
}

export async function duplicateSurvey(surveyId: string) {
  const existing = await readSurveyFile(surveyId);
  const source = existing?.published?.document ??
    (existing?.drafts.length ? [...existing.drafts].sort((left, right) => right.version - left.version)[0]?.document : null);

  if (!existing || !source) {
    throw new Error('Survey draft not found');
  }

  const now = new Date().toISOString();
  const nextSurveyId = createShortSurveyId();
  const document: SurveyDocument = {
    ...source,
    id: nextSurveyId,
    title: `${source.title} 副本`,
    blocks: source.blocks.map(cloneBlock),
    meta: {
      version: 1,
      createdAt: now,
      updatedAt: now
    }
  };

  return saveSurveyDraft({
    surveyId: nextSurveyId,
    version: document.meta.version,
    document
  });
}

export async function submitSurveyResponse(
  surveyId: string,
  answers: Record<string, SurveyResponseValue>
) {
  const existing = await readSurveyFile(surveyId);

  if (!existing?.published) {
    throw new Error('Published survey not found');
  }

  const response: SurveyResponseRecord = {
    id: `resp-${randomUUID()}`,
    surveyId,
    version: existing.published.version,
    answers,
    submittedAt: new Date().toISOString()
  };

  const responses = [...(existing.responses ?? []), response];

  await writeSurveyFile({
    ...existing,
    responses
  });

  return response;
}

export async function listSurveyResponses(surveyId: string) {
  const existing = await readSurveyFile(surveyId);
  return [...(existing?.responses ?? [])].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

export async function listSurveyDrafts(): Promise<SurveyListItem[]> {
  await ensureSurveyDir();

  const entries = await readdir(getSurveyDir(), { withFileTypes: true });
  const surveys = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        const surveyId = entry.name.replace(/\.json$/, '');
        return readSurveyFile(surveyId);
      })
  );

  return surveys
    .filter((survey): survey is StoredSurveyFile => Boolean(survey))
    .map((survey) => ({
      surveyId: survey.surveyId,
      title: survey.title,
      currentVersion: survey.currentVersion,
      updatedAt: survey.updatedAt,
      publishedVersion: survey.published?.version ?? null,
      publishedAt: survey.published?.publishedAt ?? null,
      responseCount: survey.responses?.length ?? 0
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
