import {
  FetchCharacterLogsInput,
  FetchCharacterLogsResult,
  WarcraftLogsGateway,
} from "../../domain/gateways/warcraft-logs.gateway.js";
import { RealmProductResolver } from "./realm-product.resolver.js";
import { WarcraftLogsRateLimiter } from "./warcraft-logs-rate-limiter.js";
import { WarcraftLogsTokenProvider } from "./warcraft-logs-token.provider.js";

const GET_CHARACTER_PARSES_QUERY = `
query GetCharacterParses(
    $name: String!
    $serverSlug: String!
    $serverRegion: String!
) {
    characterData {
        character(
            name: $name
            serverSlug: $serverSlug
            serverRegion: $serverRegion
        ) {
            id
            name
            server {
                name
                slug
                region {
                    name
                    compactName
                }
            }
            hpsRankings: zoneRankings(metric: hps)
            dpsRankings: zoneRankings(metric: dps)
        }
    }
}
`;

const HEALER_SPEC_PATTERN = /(^|\W)(restoration|holy|heal)(\W|$)/;

export class WarcraftLogsHttpGateway implements WarcraftLogsGateway {
  public constructor(
    private readonly tokenProvider: WarcraftLogsTokenProvider,
    private readonly rateLimiter: WarcraftLogsRateLimiter,
    private readonly realmProductResolver: RealmProductResolver,
    private readonly serverRegion: string,
  ) {}

  public async fetchCharacterLogs(input: FetchCharacterLogsInput): Promise<FetchCharacterLogsResult> {
    const product = this.realmProductResolver.resolve(input.realmSlug);
    const token = await this.tokenProvider.getToken();
    const url = `https://${product}.warcraftlogs.com/api/v2/client`;

    console.log(`Fetching character logs for ${input.characterName} on realm ${input.realmSlug} from Warcraft Logs API...`);

    const logs = await this.rateLimiter.run(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: GET_CHARACTER_PARSES_QUERY,
          variables: {
            name: decodeURIComponent(input.characterName),
            serverSlug: decodeURIComponent(input.realmSlug),
            serverRegion: this.serverRegion,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Warcraft Logs GraphQL request failed with status ${response.status}`);
      }

      const data = await response.json() as { data: unknown };

      return data.data;
    });

    const character = this.getCharacter(logs);
    const hpsRankings = this.getObject(character?.hpsRankings);
    const dpsRankings = this.getObject(character?.dpsRankings);
    const selectedRankings = this.selectRankings(hpsRankings, dpsRankings);
    const normalizedLogs = this.normalizeLogs(logs, selectedRankings);

    return {
      characterId: typeof character?.id === "number" ? character.id : null,
      logs: normalizedLogs,
      hasBestPerformanceAverage: selectedRankings?.bestPerformanceAverage !== undefined,
    };
  }

  private selectRankings(
    hpsRankings: Record<string, unknown> | null,
    dpsRankings: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (this.hasHealingSpec(hpsRankings) || this.hasHealingSpec(dpsRankings)) {
      return hpsRankings;
    }

    return dpsRankings;
  }

  private normalizeLogs(logs: unknown, selectedRankings: Record<string, unknown> | null): unknown {
    const data = this.getObject(logs);
    const characterData = this.getObject(data?.characterData);
    const character = this.getObject(characterData?.character);

    if (!data || !characterData || !character) {
      return logs;
    }

    const { hpsRankings: _hpsRankings, dpsRankings: _dpsRankings, ...characterWithoutMetricRankings } = character;

    return {
      ...data,
      characterData: {
        ...characterData,
        character: {
          ...characterWithoutMetricRankings,
          zoneRankings: selectedRankings,
        },
      },
    };
  }

  private hasHealingSpec(rankings: Record<string, unknown> | null): boolean {
    if (!rankings) {
      return false;
    }

    return this.getRankingEntries(rankings).some((entry) => {
      const spec = this.getSpec(entry);
      return spec !== null && HEALER_SPEC_PATTERN.test(spec.toLowerCase());
    });
  }

  private getRankingEntries(rankings: Record<string, unknown>): Record<string, unknown>[] {
    const entries: Record<string, unknown>[] = [];
    const rankingEntries = this.getArray(rankings.rankings);
    const allStarEntries = this.getArray(rankings.allStars);

    for (const entry of [...rankingEntries, ...allStarEntries]) {
      const rankingEntry = this.getObject(entry);

      if (rankingEntry) {
        entries.push(rankingEntry);
      }
    }

    return entries;
  }

  private getSpec(entry: Record<string, unknown>): string | null {
    if (typeof entry.spec === "string") {
      return entry.spec;
    }

    if (typeof entry.bestSpec === "string") {
      return entry.bestSpec;
    }

    return null;
  }

  private getCharacter(logs: unknown): Record<string, unknown> | null {
    const data = this.getObject(logs);
    const characterData = this.getObject(data?.characterData);
    return this.getObject(characterData?.character);
  }

  private getObject(value: unknown): Record<string, unknown> | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private getArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }
}
