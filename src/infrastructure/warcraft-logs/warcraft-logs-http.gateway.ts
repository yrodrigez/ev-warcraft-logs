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
            zoneRankings
        }
    }
}
`;

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
    const zoneRankings = this.getObject(character?.zoneRankings);

    return {
      characterId: typeof character?.id === "number" ? character.id : null,
      logs,
      hasBestPerformanceAverage: zoneRankings?.bestPerformanceAverage !== undefined,
    };
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
}
