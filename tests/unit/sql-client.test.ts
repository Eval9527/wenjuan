import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPgPoolConfig, ensureSqlSchema, resetSqlClientForTests, setSqlPoolForTests } from '@/features/persistence/sql-client';

describe('sql client pool config', () => {
  afterEach(async () => {
    await resetSqlClientForTests();
    vi.restoreAllMocks();
  });

  it('strips sslmode=require from pg connection strings and passes SSL explicitly', () => {
    const config = buildPgPoolConfig('postgresql://user:pass@example.supabase.com:6543/postgres?sslmode=require');

    expect(config.connectionString).toBe('postgresql://user:pass@example.supabase.com:6543/postgres');
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('does not enable SSL for plain local postgres urls', () => {
    const config = buildPgPoolConfig('postgresql://user:pass@localhost:5432/postgres');

    expect(config.connectionString).toBe('postgresql://user:pass@localhost:5432/postgres');
    expect(config.ssl).toBeUndefined();
  });

  it('retries transient terminated connections while preparing the schema', async () => {
    const query = vi.fn()
      .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))
      .mockResolvedValue({ rows: [], rowCount: 0 });

    setSqlPoolForTests({
      query
    });

    await expect(ensureSqlSchema()).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(5);
    expect(query.mock.calls[0][0]).toContain('create table if not exists wenjuan_surveys');
    expect(query.mock.calls[1][0]).toContain('create table if not exists wenjuan_surveys');
  });

  it('allows schema preparation to retry after a failed attempt', async () => {
    const query = vi.fn()
      .mockRejectedValueOnce(new Error('syntax error'))
      .mockResolvedValue({ rows: [], rowCount: 0 });

    setSqlPoolForTests({
      query
    });

    await expect(ensureSqlSchema()).rejects.toThrow('syntax error');
    await expect(ensureSqlSchema()).resolves.toBeUndefined();
  });
});
