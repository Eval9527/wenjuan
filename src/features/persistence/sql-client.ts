import pg, { type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';

const { Pool } = pg;

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  end?: () => Promise<void>;
};

let pool: Queryable | null = null;
let poolUrl: string | null = null;
let testPool: Queryable | null = null;
let schemaReady: Promise<void> | null = null;
const MAX_TRANSIENT_QUERY_ATTEMPTS = 2;

function normalizeDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('sslmode');
  const shouldUseSsl = sslMode === 'require' || databaseUrl.includes('supabase.com');

  if (sslMode === 'require') {
    url.searchParams.delete('sslmode');
  }

  const normalizedUrl = url.toString();

  return {
    connectionString: normalizedUrl.endsWith('?') ? normalizedUrl.slice(0, -1) : normalizedUrl,
    shouldUseSsl
  };
}

export function buildPgPoolConfig(databaseUrl: string): PoolConfig {
  const normalized = normalizeDatabaseUrl(databaseUrl);

  return {
    connectionString: normalized.connectionString,
    max: 5,
    ssl: normalized.shouldUseSsl ? { rejectUnauthorized: false } : undefined
  };
}

function createPool(databaseUrl: string) {
  return new Pool(buildPgPoolConfig(databaseUrl));
}

function getPool() {
  if (testPool) {
    return testPool;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for Wenjuan SQL storage');
  }

  if (!pool || poolUrl !== databaseUrl) {
    void pool?.end?.();
    pool = createPool(databaseUrl);
    poolUrl = databaseUrl;
    schemaReady = null;
  }

  return pool;
}

export async function sql<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  for (let attempt = 1; attempt <= MAX_TRANSIENT_QUERY_ATTEMPTS; attempt += 1) {
    try {
      return await getPool().query<T>(text, params);
    } catch (error) {
      if (attempt >= MAX_TRANSIENT_QUERY_ATTEMPTS || !isTransientConnectionError(error)) {
        throw error;
      }

      if (!testPool && pool) {
        const stalePool = pool;
        pool = null;
        poolUrl = null;
        schemaReady = null;
        await stalePool.end?.().catch(() => undefined);
      }
    }
  }

  throw new Error('SQL query failed');
}

export async function ensureSqlSchema() {
  schemaReady ??= (async () => {
    await sql(`
      create table if not exists wenjuan_surveys (
        survey_id text primary key,
        title text not null,
        current_version integer not null,
        draft_document jsonb not null,
        updated_at timestamptz not null,
        published_version integer null,
        published_document jsonb null,
        published_at timestamptz null,
        created_at timestamptz not null default now()
      )
    `);

    await sql(`
      create table if not exists wenjuan_responses (
        response_id text primary key,
        survey_id text not null references wenjuan_surveys(survey_id) on delete cascade,
        version integer not null,
        answers jsonb not null,
        submitted_at timestamptz not null
      )
    `);

    await sql(`
      create table if not exists wenjuan_demo_usage_events (
        id bigserial primary key,
        event_type text not null,
        visitor_id text null,
        ip_hash text null,
        survey_id text null,
        created_at timestamptz not null
      )
    `);

    await sql(`
      create table if not exists wenjuan_demo_maintenance (
        key text primary key,
        value text not null,
        updated_at timestamptz not null
      )
    `);
  })();

  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}

function isTransientConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /connection terminated unexpectedly|connection terminated|server closed the connection unexpectedly|connection reset|econnreset|terminating connection/i.test(error.message);
}

export function setSqlPoolForTests(nextPool: Queryable) {
  testPool = nextPool;
  schemaReady = null;
}

export async function resetSqlClientForTests() {
  schemaReady = null;

  if (testPool) {
    await testPool.end?.();
    testPool = null;
  }

  if (pool) {
    await pool.end?.();
    pool = null;
    poolUrl = null;
  }
}
