import { H3, handleCors, type CorsOptions } from "h3";

const allowedOrigins = [
  "https://staging.everlastingvendetta.com",
  "http://localhost:3000",
  "https://www.everlastingvendetta.com",
];


const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["x-character-logs-source", "x-character-logs-updated-at"],
  preflight: {
    statusCode: 204,
  },
};

export class CorsMiddleware {
  public register(app: H3): void {
    app.use((event) => {
      const response = handleCors(event, corsOptions);

      if (response !== false) {
        return response;
      }
    });
  }
}