import { H3, HTTPError, getQuery, getRouterParam } from "h3";
import { GetCharacterLogsUseCase } from "../../application/usecases/get-character-logs.usecase.js";
import { UnsupportedRealmError } from "../../infrastructure/warcraft-logs/realm-product.resolver.js";

export class LogsRoute {
  public constructor(private readonly getCharacterLogsUseCase: GetCharacterLogsUseCase) {}

  public register(app: H3): void {
    app.get(
      "/api/:realmSlug/:characterName/logs",
      async (event) => {
        const realmSlug = getRouterParam(event, "realmSlug")?.trim();
        const characterName = getRouterParam(event, "characterName")?.trim();

        if (!realmSlug || !characterName) {
          throw new HTTPError("realmSlug and characterName are required", { status: 400 });
        }

        const query = getQuery(event);
        const force = query.force === "true" || query.force === "1";

        try {
          const result = await this.getCharacterLogsUseCase.execute({ realmSlug, characterName, force });

          if (!result.found) {
            throw new HTTPError("Character logs not found", { status: 404 });
          }

          event.res.headers.set("x-character-logs-source", result.source);
          event.res.headers.set("x-character-logs-updated-at", result.updatedAt.toISOString());

          return result.logs;
        } catch (error) {
          if (error instanceof UnsupportedRealmError) {
            throw new HTTPError(error.message, { status: 400 });
          }

          throw error;
        }
      },
    );
  }
}
