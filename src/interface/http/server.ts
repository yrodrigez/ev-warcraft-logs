import { H3 } from "h3";
import { toNodeHandler } from "h3/node";
import { createServer, Server } from "node:http";
import { LogsRoute } from "./logs.route.js";
import { CorsMiddleware } from "./cors.middleware.js";

export class HttpServer {
  private server: Server | null = null;

  public constructor(
    private readonly logsRoute: LogsRoute,
    private readonly corsMiddleware: CorsMiddleware = new CorsMiddleware(),
  ) { }

  public listen(port: number): Promise<void> {
    const app = new H3();
    this.corsMiddleware.register(app);
    this.logsRoute.register(app);

    this.server = createServer(toNodeHandler(app));

    return new Promise((resolve) => {
      this.server?.listen(port, () => {
        resolve();
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}
