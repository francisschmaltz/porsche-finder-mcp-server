import "dotenv/config";

export type AppConfig = {
  port: number;
  host: string;
  authToken: string;
  databasePath: string;
  cacheTtlMs: number;
  playwrightProfileDir: string;
  playwrightExecutablePath?: string;
  playwrightHeadless: boolean;
  playwrightChallengeTimeoutMs: number;
};

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number.`);
  }

  return parsed;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export function loadConfig(): AppConfig {
  return {
    port: readNumber("PORT", 3333),
    host: process.env.HOST ?? "127.0.0.1",
    authToken: process.env.AUTH_TOKEN ?? "change-me",
    databasePath: process.env.DATABASE_PATH ?? "./data/porsche-finder.sqlite",
    cacheTtlMs: readNumber("CACHE_TTL_SECONDS", 300) * 1000,
    playwrightProfileDir: process.env.PLAYWRIGHT_PROFILE_DIR ?? "./data/playwright-profile",
    playwrightExecutablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    playwrightHeadless: readBoolean("PLAYWRIGHT_HEADLESS", false),
    playwrightChallengeTimeoutMs: readNumber("PLAYWRIGHT_CHALLENGE_TIMEOUT_MS", 120) * 1000
  };
}
