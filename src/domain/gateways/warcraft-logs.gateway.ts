export interface FetchCharacterLogsInput {
  realmSlug: string;
  characterName: string;
}

export interface FetchCharacterLogsResult {
  characterId: number | null;
  logs: unknown;
  hasBestPerformanceAverage: boolean;
}

export interface WarcraftLogsGateway {
  fetchCharacterLogs(input: FetchCharacterLogsInput): Promise<FetchCharacterLogsResult>;
}
