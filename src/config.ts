import "dotenv/config";

export type PlaywrightBrowserName = "chromium" | "webkit";

export type AppConfig = {
  port: number;
  host: string;
  authToken: string;
  databasePath: string;
  cacheTtlMs: number;
  carStatusCacheTtlMs: number;
  playwrightBrowser: PlaywrightBrowserName;
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

function readPlaywrightBrowser(): PlaywrightBrowserName {
  const raw = (process.env.PLAYWRIGHT_BROWSER ?? "webkit").toLowerCase();
  if (raw === "chromium" || raw === "webkit") {
    return raw;
  }

  throw new Error("PLAYWRIGHT_BROWSER must be chromium or webkit.");
}

export function loadConfig(): AppConfig {
  return {
    port: readNumber("PORT", 3333),
    host: process.env.HOST ?? "127.0.0.1",
    authToken: process.env.AUTH_TOKEN ?? "change-me",
    databasePath: process.env.DATABASE_PATH ?? "./data/porsche-finder.sqlite",
    cacheTtlMs: readNumber("CACHE_TTL_SECONDS", 900) * 1000,
    carStatusCacheTtlMs: readNumber("CAR_STATUS_CACHE_TTL_SECONDS", 86_400) * 1000,
    playwrightBrowser: readPlaywrightBrowser(),
    playwrightProfileDir: process.env.PLAYWRIGHT_PROFILE_DIR ?? "./data/playwright-profile",
    playwrightExecutablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    playwrightHeadless: readBoolean("PLAYWRIGHT_HEADLESS", false),
    playwrightChallengeTimeoutMs: readNumber("PLAYWRIGHT_CHALLENGE_TIMEOUT_MS", 120) * 1000
  };
}
