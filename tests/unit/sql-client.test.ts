import { describe, expect, it } from 'vitest';
import { buildPgPoolConfig } from '@/features/persistence/sql-client';

describe('sql client pool config', () => {
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
});
