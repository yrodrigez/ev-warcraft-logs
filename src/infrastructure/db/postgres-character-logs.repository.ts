import { CharacterLogs } from "../../domain/entities/character-logs.entity.js";
import { CharacterLogsRepository } from "../../domain/repositories/character-logs.repository.js";
import { PostgresPool } from "./postgres-pool.js";

interface CharacterLogsRow {
  id: string;
  realm_slug: string;
  character_name: string;
  logs: unknown;
  updated_at: Date | string;
}

export class PostgresCharacterLogsRepository implements CharacterLogsRepository {
  public constructor(private readonly postgresPool: PostgresPool) {}

  public async findByCharacter(realmSlug: string, characterName: string): Promise<CharacterLogs | null> {
    const result = await this.postgresPool.pool.query<CharacterLogsRow>(
      `
        SELECT id, realm_slug, character_name, logs, updated_at
        FROM "character-logs"
        WHERE realm_slug = $1 AND character_name = $2
      `,
      [realmSlug, characterName],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return this.toEntity(row);
  }

  public async save(characterLogs: CharacterLogs): Promise<CharacterLogs> {
    const result = await this.postgresPool.pool.query<CharacterLogsRow>(
      `
        INSERT INTO "character-logs" (id, realm_slug, character_name, logs, updated_at)
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (realm_slug, character_name)
        DO UPDATE SET
          id = EXCLUDED.id,
          logs = EXCLUDED.logs,
          updated_at = now()
        RETURNING id, realm_slug, character_name, logs, updated_at
      `,
      [characterLogs.id, characterLogs.realmSlug, characterLogs.characterName, characterLogs.logs],
    );

    return this.toEntity(result.rows[0]);
  }

  private toEntity(row: CharacterLogsRow): CharacterLogs {
    return new CharacterLogs(
      Number(row.id),
      row.realm_slug,
      row.character_name,
      row.logs,
      row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    );
  }
}
