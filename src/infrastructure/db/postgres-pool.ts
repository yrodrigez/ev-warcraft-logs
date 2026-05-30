import pg from "pg";

export class PostgresPool {
  public readonly pool: pg.Pool;

  public constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
