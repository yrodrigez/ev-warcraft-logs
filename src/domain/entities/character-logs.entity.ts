export class CharacterLogs {
  public constructor(
    public readonly id: number,
    public readonly realmSlug: string,
    public readonly characterName: string,
    public readonly logs: unknown,
    public readonly updatedAt: Date,
  ) {}

  public isFresh(maxAgeMs: number, now = new Date()): boolean {
    return now.getTime() - this.updatedAt.getTime() <= maxAgeMs;
  }
}
