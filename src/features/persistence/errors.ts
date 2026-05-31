export const DATABASE_UNAVAILABLE_CODE = 'DATABASE_UNAVAILABLE';
export const DATABASE_UNAVAILABLE_TITLE = '演示数据库暂时不可用';
export const DATABASE_UNAVAILABLE_MESSAGE =
  '当前无法读取问卷数据，演示数据库可能正在恢复或需要重新初始化。请稍后刷新重试。';

const DATABASE_UNAVAILABLE_PATTERNS = [
  /DATABASE_URL is required/i,
  /database .* does not exist/i,
  /tenant or user not found/i,
  /connection terminated unexpectedly/i,
  /connection terminated/i,
  /server closed the connection unexpectedly/i,
  /connection reset/i,
  /econnreset/i,
  /econnrefused/i,
  /enotfound/i,
  /etimedout/i,
  /timeout/i,
  /password authentication failed/i,
  /remaining connection slots are reserved/i,
  /too many connections/i,
  /terminating connection/i
];

function collectErrorMessages(error: unknown, messages: string[] = []) {
  if (error instanceof Error) {
    messages.push(error.message);

    if ('cause' in error) {
      collectErrorMessages(error.cause, messages);
    }
  } else if (typeof error === 'string') {
    messages.push(error);
  }

  return messages;
}

export function isDatabaseUnavailableError(error: unknown) {
  const message = collectErrorMessages(error).join(' ');
  return DATABASE_UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(message));
}

export function getDatabaseUnavailablePayload() {
  return {
    code: DATABASE_UNAVAILABLE_CODE,
    error: DATABASE_UNAVAILABLE_TITLE,
    message: DATABASE_UNAVAILABLE_MESSAGE
  };
}

export function createDatabaseUnavailableResponse(init: ResponseInit = {}) {
  return Response.json(
    getDatabaseUnavailablePayload(),
    {
      ...init,
      status: init.status ?? 503
    }
  );
}
