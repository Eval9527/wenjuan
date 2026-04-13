export type SurveyResponseValue = string | string[];

export type SurveyResponseRecord = {
  id: string;
  surveyId: string;
  version: number;
  answers: Record<string, SurveyResponseValue>;
  submittedAt: string;
};
