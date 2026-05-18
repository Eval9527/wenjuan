import type { SurveyResponseRecord, SurveyResponseValue } from '@/features/persistence/contracts';
import type { MultiChoiceBlock, SingleChoiceBlock, SurveyDocument } from '@/features/survey-schema/schema';

type OptionStat = {
  label: string;
  count: number;
  percentage: number;
};

type InputQuestionAnalytics = {
  blockId: string;
  type: 'input';
  label: string;
  answerCount: number;
  emptyCount: number;
  answers: string[];
};

type ChoiceQuestionAnalytics = {
  blockId: string;
  type: 'singleChoice' | 'multiChoice';
  label: string;
  answeredCount: number;
  emptyCount: number;
  options: OptionStat[];
  unknownOptions: OptionStat[];
};

export type QuestionAnalytics = InputQuestionAnalytics | ChoiceQuestionAnalytics;

export type SurveyResponseAnalytics = {
  responseCount: number;
  questions: QuestionAnalytics[];
};

function percentage(count: number, total: number) {
  if (total <= 0 || count <= 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function normalizeAnswerValues(value: SurveyResponseValue | undefined) {
  const rawValues = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const values = rawValues
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(values)];
}

function summarizeInput(blockId: string, label: string, responses: SurveyResponseRecord[]): InputQuestionAnalytics {
  const answers = responses
    .map((response) => response.answers[blockId])
    .map((value) => (typeof value === 'string' ? value.trim() : Array.isArray(value) ? value.join('、').trim() : ''))
    .filter(Boolean);

  return {
    blockId,
    type: 'input',
    label,
    answerCount: answers.length,
    emptyCount: Math.max(0, responses.length - answers.length),
    answers
  };
}

function summarizeChoice(
  block: SingleChoiceBlock | MultiChoiceBlock,
  responses: SurveyResponseRecord[]
): ChoiceQuestionAnalytics {
  const optionLabels = block.options.map((option) => option.text);
  const optionLabelSet = new Set(optionLabels);
  const counts = new Map(optionLabels.map((label) => [label, 0]));
  const unknownCounts = new Map<string, number>();
  let answeredCount = 0;

  for (const response of responses) {
    const values = normalizeAnswerValues(response.answers[block.id]);

    if (!values.length) {
      continue;
    }

    answeredCount += 1;

    for (const value of values) {
      if (optionLabelSet.has(value)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
        continue;
      }

      unknownCounts.set(value, (unknownCounts.get(value) ?? 0) + 1);
    }
  }

  return {
    blockId: block.id,
    type: block.type,
    label: block.label,
    answeredCount,
    emptyCount: Math.max(0, responses.length - answeredCount),
    options: optionLabels.map((label) => {
      const count = counts.get(label) ?? 0;
      return {
        label,
        count,
        percentage: percentage(count, responses.length)
      };
    }),
    unknownOptions: [...unknownCounts.entries()].map(([label, count]) => ({
      label,
      count,
      percentage: percentage(count, responses.length)
    }))
  };
}

export function buildSurveyResponseAnalytics(
  document: SurveyDocument,
  responses: SurveyResponseRecord[]
): SurveyResponseAnalytics {
  return {
    responseCount: responses.length,
    questions: document.blocks.flatMap((block): QuestionAnalytics[] => {
      switch (block.type) {
        case 'input':
          return [summarizeInput(block.id, block.label, responses)];
        case 'singleChoice':
        case 'multiChoice':
          return [summarizeChoice(block, responses)];
        case 'title':
        case 'paragraph':
          return [];
        default:
          return [];
      }
    })
  };
}
