import { randomUUID } from 'node:crypto';
import { ensureSqlSchema, sql } from '@/features/persistence/sql-client';
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

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function saveSurveyDraft(input: {
  surveyId: string;
  version: number;
  document: SurveyDocument;
}): Promise<SurveyDraftRecord> {
  await ensureSqlSchema();

  const savedAt = new Date().toISOString();
  await sql(
    `
      insert into wenjuan_surveys (survey_id, title, current_version, draft_document, updated_at, created_at)
      values ($1, $2, $3, $4::jsonb, $5::timestamptz, $5::timestamptz)
      on conflict (survey_id) do update set
        title = excluded.title,
        current_version = greatest(wenjuan_surveys.current_version, excluded.current_version),
        draft_document = excluded.draft_document,
        updated_at = excluded.updated_at
    `,
    [input.surveyId, input.document.title, input.version, JSON.stringify(input.document), savedAt]
  );

  return {
    surveyId: input.surveyId,
    version: input.version,
    document: input.document,
    savedAt
  };
}

export async function getLatestSurveyDraft(surveyId: string): Promise<SurveyDraftRecord | null> {
  await ensureSqlSchema();

  const result = await sql<{
    survey_id: string;
    current_version: number;
    draft_document: SurveyDocument;
    updated_at: Date | string;
  }>(
    `
      select survey_id, current_version, draft_document, updated_at
      from wenjuan_surveys
      where survey_id = $1
      limit 1
    `,
    [surveyId]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    surveyId: row.survey_id,
    version: row.current_version,
    document: row.draft_document,
    savedAt: toIsoString(row.updated_at)
  };
}

export async function getPublishedSurvey(surveyId: string): Promise<PublishedSurveyRecord | null> {
  await ensureSqlSchema();

  const result = await sql<{
    survey_id: string;
    published_version: number | null;
    published_document: SurveyDocument | null;
    published_at: Date | string | null;
  }>(
    `
      select survey_id, published_version, published_document, published_at
      from wenjuan_surveys
      where survey_id = $1
      limit 1
    `,
    [surveyId]
  );
  const row = result.rows[0];

  if (!row?.published_version || !row.published_document || !row.published_at) {
    return null;
  }

  return {
    surveyId: row.survey_id,
    version: row.published_version,
    document: row.published_document,
    publishedAt: toIsoString(row.published_at)
  };
}

export async function publishSurveyDraft(surveyId: string): Promise<PublishedSurveyRecord> {
  await ensureSqlSchema();

  const latestDraft = await getLatestSurveyDraft(surveyId);
  if (!latestDraft) {
    throw new Error('Survey draft not found');
  }

  const publishedAt = new Date().toISOString();
  await sql(
    `
      update wenjuan_surveys
      set title = $2,
          current_version = greatest(current_version, $3),
          published_version = $3,
          published_document = $4::jsonb,
          published_at = $5::timestamptz
      where survey_id = $1
    `,
    [surveyId, latestDraft.document.title, latestDraft.version, JSON.stringify(latestDraft.document), publishedAt]
  );

  return {
    surveyId,
    version: latestDraft.version,
    document: latestDraft.document,
    publishedAt
  };
}

export async function duplicateSurvey(surveyId: string): Promise<SurveyDraftRecord> {
  await ensureSqlSchema();

  const result = await sql<{
    draft_document: SurveyDocument;
    published_document: SurveyDocument | null;
  }>(
    `
      select draft_document, published_document
      from wenjuan_surveys
      where survey_id = $1
      limit 1
    `,
    [surveyId]
  );
  const row = result.rows[0];
  const source = row?.published_document ?? row?.draft_document ?? null;

  if (!source) {
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
): Promise<SurveyResponseRecord> {
  await ensureSqlSchema();

  const published = await getPublishedSurvey(surveyId);
  if (!published) {
    throw new Error('Published survey not found');
  }

  const response: SurveyResponseRecord = {
    id: `resp-${randomUUID()}`,
    surveyId,
    version: published.version,
    answers,
    submittedAt: new Date().toISOString()
  };

  await sql(
    `
      insert into wenjuan_responses (response_id, survey_id, version, answers, submitted_at)
      values ($1, $2, $3, $4::jsonb, $5::timestamptz)
    `,
    [response.id, response.surveyId, response.version, JSON.stringify(response.answers), response.submittedAt]
  );

  return response;
}

export async function listSurveyResponses(surveyId: string): Promise<SurveyResponseRecord[]> {
  await ensureSqlSchema();

  const result = await sql<{
    response_id: string;
    survey_id: string;
    version: number;
    answers: Record<string, SurveyResponseValue>;
    submitted_at: Date | string;
  }>(
    `
      select response_id, survey_id, version, answers, submitted_at
      from wenjuan_responses
      where survey_id = $1
      order by submitted_at desc
    `,
    [surveyId]
  );

  return result.rows.map((row) => ({
    id: row.response_id,
    surveyId: row.survey_id,
    version: row.version,
    answers: row.answers,
    submittedAt: toIsoString(row.submitted_at)
  }));
}

export async function listSurveyDrafts(): Promise<SurveyListItem[]> {
  await ensureSqlSchema();

  const result = await sql<{
    survey_id: string;
    title: string;
    current_version: number;
    updated_at: Date | string;
    published_version: number | null;
    published_at: Date | string | null;
    response_count: string | number;
  }>(`
    select
      surveys.survey_id,
      surveys.title,
      surveys.current_version,
      surveys.updated_at,
      surveys.published_version,
      surveys.published_at,
      count(responses.response_id) as response_count
    from wenjuan_surveys surveys
    left join wenjuan_responses responses on responses.survey_id = surveys.survey_id
    group by surveys.survey_id, surveys.title, surveys.current_version, surveys.updated_at, surveys.published_version, surveys.published_at
    order by surveys.updated_at desc
  `);

  return result.rows.map((row) => ({
    surveyId: row.survey_id,
    title: row.title,
    currentVersion: row.current_version,
    updatedAt: toIsoString(row.updated_at),
    publishedVersion: row.published_version,
    publishedAt: row.published_at ? toIsoString(row.published_at) : null,
    responseCount: Number(row.response_count)
  }));
}
