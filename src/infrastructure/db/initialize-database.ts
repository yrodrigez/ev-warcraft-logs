import { PostgresPool } from "./postgres-pool.js";

export async function initializeDatabase(postgresPool: PostgresPool): Promise<void> {
  await postgresPool.pool.query(`
    CREATE TABLE IF NOT EXISTS "character-logs" (
      id BIGINT PRIMARY KEY,
      realm_slug TEXT NOT NULL,
      character_name TEXT NOT NULL,
      logs JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (realm_slug, character_name)
    );
  `);
}
