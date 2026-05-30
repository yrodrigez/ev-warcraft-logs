interface TokenResponse {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const TOKEN_REFRESH_SAFETY_MS = 60_000;

export class WarcraftLogsTokenProvider {
  private cachedToken: CachedToken | null = null;
  private refreshPromise: Promise<string> | null = null;

  public constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  public async getToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt - TOKEN_REFRESH_SAFETY_MS > Date.now()) {
      return this.cachedToken.accessToken;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchToken();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async fetchToken(): Promise<string> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch("https://www.warcraftlogs.com/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });

    if (!response.ok) {
      throw new Error(`Warcraft Logs auth failed with status ${response.status}`);
    }

    const tokenResponse = (await response.json()) as TokenResponse;

    if (!tokenResponse.access_token || typeof tokenResponse.expires_in !== "number") {
      throw new Error("Warcraft Logs auth response did not include a valid token");
    }

    this.cachedToken = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    };

    return this.cachedToken.accessToken;
  }
}
