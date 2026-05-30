import { CharacterLogs } from "../entities/character-logs.entity.js";

export interface CharacterLogsRepository {
  findByCharacter(realmSlug: string, characterName: string): Promise<CharacterLogs | null>;
  save(characterLogs: CharacterLogs): Promise<CharacterLogs>;
}
