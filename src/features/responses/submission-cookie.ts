const SUBMISSION_COOKIE_PREFIX = 'wenjuan_submitted_';
const SUBMISSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function getSurveySubmissionCookieName(surveyId: string) {
  return `${SUBMISSION_COOKIE_PREFIX}${surveyId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

export function getSurveySubmissionCookieValue() {
  return '1';
}

export function buildSurveySubmissionCookie(surveyId: string) {
  const cookieName = getSurveySubmissionCookieName(surveyId);
  const cookieValue = getSurveySubmissionCookieValue();

  return `${cookieName}=${cookieValue}; Max-Age=${SUBMISSION_COOKIE_MAX_AGE_SECONDS}; Path=/f/${encodeURIComponent(
    surveyId
  )}; SameSite=Lax`;
}
