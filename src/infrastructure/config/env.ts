import "dotenv/config";

class Env {
  public readonly port = this.optionalNumber("PORT", 3000);
  public readonly databaseUrl = this.required("DATABASE_URL");
  public readonly wclClientId = this.required("WCL_CLIENT_ID");
  public readonly wclClientSecret = this.required("WCL_CLIENT_SECRET");
  public readonly wclServerRegion = this.optional("WCL_SERVER_REGION", "EU");

  private required(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
  }

  private optional(name: string, fallback: string): string {
    return process.env[name] || fallback;
  }

  private optionalNumber(name: string, fallback: number): number {
    const value = process.env[name];

    if (!value) {
      return fallback;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new Error(`Environment variable ${name} must be a number`);
    }

    return parsed;
  }
}

export const env = new Env();
