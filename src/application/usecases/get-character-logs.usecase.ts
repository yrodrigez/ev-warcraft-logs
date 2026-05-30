import { CharacterLogs } from "../../domain/entities/character-logs.entity.js";
import { WarcraftLogsGateway } from "../../domain/gateways/warcraft-logs.gateway.js";
import { CharacterLogsRepository } from "../../domain/repositories/character-logs.repository.js";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface GetCharacterLogsInput {
  realmSlug: string;
  characterName: string;
  force: boolean;
}

export type GetCharacterLogsResult =
  | {
      found: true;
      source: "cache" | "fresh";
      logs: unknown;
      updatedAt: Date;
    }
  | {
      found: false;
    };

export class GetCharacterLogsUseCase {
  public constructor(
    private readonly characterLogsRepository: CharacterLogsRepository,
    private readonly warcraftLogsGateway: WarcraftLogsGateway,
  ) {}

  public async execute(input: GetCharacterLogsInput): Promise<GetCharacterLogsResult> {
    const realmSlug = this.normalizeKey(input.realmSlug);
    const characterName = this.normalizeKey(input.characterName);
    const cachedLogs = await this.characterLogsRepository.findByCharacter(realmSlug, characterName);

    if (cachedLogs && cachedLogs.isFresh(CACHE_MAX_AGE_MS) && !input.force) {
      return {
        found: true,
        source: "cache",
        logs: cachedLogs.logs,
        updatedAt: cachedLogs.updatedAt,
      };
    }

    const fetchedLogs = await this.warcraftLogsGateway.fetchCharacterLogs({
      realmSlug,
      characterName: input.characterName.trim(),
    });

    if (fetchedLogs.hasBestPerformanceAverage && fetchedLogs.characterId !== null) {
      const savedLogs = await this.characterLogsRepository.save(
        new CharacterLogs(fetchedLogs.characterId, realmSlug, characterName, fetchedLogs.logs, new Date()),
      );

      return {
        found: true,
        source: "fresh",
        logs: savedLogs.logs,
        updatedAt: savedLogs.updatedAt,
      };
    }

    if (cachedLogs) {
      return {
        found: true,
        source: "cache",
        logs: cachedLogs.logs,
        updatedAt: cachedLogs.updatedAt,
      };
    }

    return { found: false };
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase();
  }
}
