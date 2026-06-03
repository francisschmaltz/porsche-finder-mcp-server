import { existsSync, mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright";
import type { AppConfig } from "../config.js";
import type { FetchPageResult } from "../types.js";
import { htmlToVisibleText } from "./parser.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export interface PorschePageFetcher {
  fetchPage(url: string, options?: { refresh?: boolean }): Promise<FetchPageResult>;
}

export class PorscheFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PorscheFetchError";
  }
}

export class HybridPorscheFetcher implements PorschePageFetcher {
  constructor(
    private config: Pick<
      AppConfig,
      "playwrightProfileDir" | "playwrightExecutablePath" | "playwrightHeadless" | "playwrightChallengeTimeoutMs"
    >
  ) {}

  async fetchPage(url: string): Promise<FetchPageResult> {
    try {
      return await this.fetchWithHttp(url);
    } catch (error) {
      if (!isChallengeError(error)) {
        throw error;
      }

      return this.fetchWithPlaywright(url);
    }
  }

  private async fetchWithHttp(url: string): Promise<FetchPageResult> {
    const response = await fetch(url, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": USER_AGENT
      },
      signal: AbortSignal.timeout(30_000)
    });
    const html = await response.text();

    if (!response.ok || looksBlocked(html, response.status)) {
      throw new PorscheFetchError(`HTTP fetch blocked or failed with ${response.status}.`);
    }

    return {
      url,
      html,
      visibleText: htmlToVisibleText(html),
      source: "http"
    };
  }

  private async fetchWithPlaywright(url: string): Promise<FetchPageResult> {
    mkdirSync(this.config.playwrightProfileDir, { recursive: true });
    const executablePath = resolveBrowserExecutable(this.config.playwrightExecutablePath);

    const context = await chromium
      .launchPersistentContext(this.config.playwrightProfileDir, {
        executablePath,
        headless: this.config.playwrightHeadless,
        userAgent: USER_AGENT,
        viewport: { width: 1440, height: 1000 }
      })
      .catch((error: unknown) => {
        throw new PorscheFetchError(buildBrowserLaunchError(error));
      });

    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await this.waitThroughBrowserCheckpoint(page);

      const visibleText = await page.locator("body").innerText({ timeout: 15_000 });
      const html = await page.content();

      if (looksBlocked(visibleText, 200)) {
        throw new PorscheFetchError("Playwright still sees Porsche/Vercel browser verification.");
      }

      return {
        url,
        html,
        visibleText,
        source: "playwright"
      };
    } finally {
      await context.close();
    }
  }

  private async waitThroughBrowserCheckpoint(page: Page): Promise<void> {
    const bodyText = await page.locator("body").innerText({ timeout: 15_000 }).catch(() => "");
    if (!looksBlocked(bodyText, 200)) {
      return;
    }

    await page
      .waitForFunction(
        () => {
          const text = document.body?.innerText ?? "";
          return !/Vercel Security Checkpoint|verifying your browser|Enable JavaScript to continue/i.test(text);
        },
        undefined,
        { timeout: this.config.playwrightChallengeTimeoutMs }
      )
      .catch(() => {
        throw new PorscheFetchError(
          "Porsche Finder is still showing browser verification. Complete it in the Playwright browser profile and retry."
        );
      });
  }
}

function looksBlocked(body: string, status: number): boolean {
  return (
    status === 429 ||
    /Vercel Security Checkpoint|verifying your browser|Enable JavaScript to continue|x-vercel-challenge-token/i.test(body)
  );
}

function isChallengeError(error: unknown): boolean {
  return error instanceof PorscheFetchError && /blocked|failed/i.test(error.message);
}

function resolveBrowserExecutable(explicitPath?: string): string | undefined {
  if (explicitPath) {
    return explicitPath;
  }

  const localCandidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ];

  return localCandidates.find((candidate) => existsSync(candidate));
}

function buildBrowserLaunchError(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return [
    "Porsche Finder blocked the direct HTTP request, and the browser fallback could not start.",
    "Use local Chrome by setting PLAYWRIGHT_EXECUTABLE_PATH, or install Playwright's browser with `npx playwright install chromium`.",
    `Launch error: ${detail.split("\n")[0]}`
  ].join(" ");
}
