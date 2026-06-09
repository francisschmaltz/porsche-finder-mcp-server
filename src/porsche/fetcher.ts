import { existsSync, mkdirSync } from "node:fs";
import { chromium, webkit, type Page } from "playwright";
import type { AppConfig } from "../config.js";
import type { FetchPageResult } from "../types.js";
import { htmlToVisibleText } from "./parser.js";

const CHROMIUM_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const WEBKIT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

export interface PorschePageFetcher {
  fetchPage(url: string, options?: { refresh?: boolean }): Promise<FetchPageResult>;
}

export class PorscheFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PorscheFetchError";
  }
}

export class PorscheNotFoundError extends Error {
  constructor(
    message: string,
    readonly source: FetchPageResult["source"]
  ) {
    super(message);
    this.name = "PorscheNotFoundError";
  }
}

export class HybridPorscheFetcher implements PorschePageFetcher {
  constructor(
    private config: Pick<
      AppConfig,
      | "playwrightBrowser"
      | "playwrightProfileDir"
      | "playwrightExecutablePath"
      | "playwrightHeadless"
      | "playwrightChallengeTimeoutMs"
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
        "user-agent": userAgentFor(this.config.playwrightBrowser)
      },
      signal: AbortSignal.timeout(30_000)
    });
    const html = await response.text();

    if (response.status === 404 || response.status === 410) {
      throw new PorscheNotFoundError(`Porsche detail page does not exist (${response.status}).`, "http");
    }

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
    const executablePath = resolveBrowserExecutable(this.config.playwrightBrowser, this.config.playwrightExecutablePath);
    const browserType = this.config.playwrightBrowser === "webkit" ? webkit : chromium;

    const context = await browserType
      .launchPersistentContext(this.config.playwrightProfileDir, {
        executablePath,
        headless: this.config.playwrightHeadless,
        userAgent: userAgentFor(this.config.playwrightBrowser),
        viewport: { width: 1440, height: 1000 }
      })
      .catch((error: unknown) => {
        throw new PorscheFetchError(buildBrowserLaunchError(this.config.playwrightBrowser, error));
      });

    try {
      const page = await context.newPage();
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const status = response?.status();
      if (status === 404 || status === 410) {
        throw new PorscheNotFoundError(`Porsche detail page does not exist (${status}).`, "playwright");
      }
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

function userAgentFor(browser: AppConfig["playwrightBrowser"]): string {
  return browser === "webkit" ? WEBKIT_USER_AGENT : CHROMIUM_USER_AGENT;
}

function resolveBrowserExecutable(browser: AppConfig["playwrightBrowser"], explicitPath?: string): string | undefined {
  if (browser === "webkit") {
    return undefined;
  }

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

function buildBrowserLaunchError(browser: AppConfig["playwrightBrowser"], error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  const browserAdvice =
    browser === "webkit"
      ? "Playwright WebKit is Safari-like, not your installed Safari. Install it with `npx playwright install webkit`, or switch back to Chromium."
      : "Use local Chrome by setting PLAYWRIGHT_EXECUTABLE_PATH, or install Playwright's browser with `npx playwright install chromium`.";

  return [
    "Porsche Finder blocked the direct HTTP request, and the browser fallback could not start.",
    browserAdvice,
    `Launch error: ${detail.split("\n")[0]}`
  ].join(" ");
}
