import { createServer, Server } from "node:http";
import { H3 } from "h3";
import { toNodeHandler } from "h3/node";
import { LogsRoute } from "./logs.route.js";

export class HttpServer {
  private server: Server | null = null;

  public constructor(private readonly logsRoute: LogsRoute) {}

  public listen(port: number): Promise<void> {
    const app = new H3();
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
