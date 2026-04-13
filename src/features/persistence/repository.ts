import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SurveyDocument } from '@/features/survey-schema/schema';

export type SurveyDraftRecord = {
  surveyId: string;
  version: number;
  document: SurveyDocument;
  savedAt: string;
};

export type SurveyListItem = {
  surveyId: string;
  title: string;
  currentVersion: number;
  updatedAt: string;
};

type StoredSurveyFile = {
  surveyId: string;
  title: string;
  currentVersion: number;
  updatedAt: string;
  drafts: SurveyDraftRecord[];
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
    drafts
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
      updatedAt: survey.updatedAt
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
