import { GetCharacterLogsUseCase } from "./application/usecases/get-character-logs.usecase.js";
import { env } from "./infrastructure/config/env.js";
import { initializeDatabase } from "./infrastructure/db/initialize-database.js";
import { PostgresCharacterLogsRepository } from "./infrastructure/db/postgres-character-logs.repository.js";
import { PostgresPool } from "./infrastructure/db/postgres-pool.js";
import { RealmProductResolver } from "./infrastructure/warcraft-logs/realm-product.resolver.js";
import { WarcraftLogsHttpGateway } from "./infrastructure/warcraft-logs/warcraft-logs-http.gateway.js";
import { WarcraftLogsRateLimiter } from "./infrastructure/warcraft-logs/warcraft-logs-rate-limiter.js";
import { WarcraftLogsTokenProvider } from "./infrastructure/warcraft-logs/warcraft-logs-token.provider.js";
import { LogsRoute } from "./interface/http/logs.route.js";
import { HttpServer } from "./interface/http/server.js";

const postgresPool = new PostgresPool(env.databaseUrl);

await initializeDatabase(postgresPool);

const characterLogsRepository = new PostgresCharacterLogsRepository(postgresPool);
const tokenProvider = new WarcraftLogsTokenProvider(env.wclClientId, env.wclClientSecret);
const rateLimiter = new WarcraftLogsRateLimiter();
const realmProductResolver = new RealmProductResolver();
const warcraftLogsGateway = new WarcraftLogsHttpGateway(
  tokenProvider,
  rateLimiter,
  realmProductResolver,
  env.wclServerRegion,
);
const getCharacterLogsUseCase = new GetCharacterLogsUseCase(characterLogsRepository, warcraftLogsGateway);
const logsRoute = new LogsRoute(getCharacterLogsUseCase);
const httpServer = new HttpServer(logsRoute);

await httpServer.listen(env.port);
console.log(`Server listening on port ${env.port}`);

const shutdown = async (): Promise<void> => {
  await httpServer.close();
  await postgresPool.close();
};

process.on("SIGINT", () => {
  shutdown()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
});

process.on("SIGTERM", () => {
  shutdown()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
});
