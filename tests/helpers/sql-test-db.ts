import { afterEach, beforeEach } from 'vitest';
import { newDb } from 'pg-mem';
import { resetDemoUsageStoreForTests } from '@/features/demo-mode/quota';
import { resetSqlClientForTests, setSqlPoolForTests } from '@/features/persistence/sql-client';

export function useSqlTestDatabase() {
  beforeEach(() => {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const pg = db.adapters.createPg();
    setSqlPoolForTests(new pg.Pool());
    resetDemoUsageStoreForTests();
  });

  afterEach(async () => {
    resetDemoUsageStoreForTests();
    await resetSqlClientForTests();
  });
}
