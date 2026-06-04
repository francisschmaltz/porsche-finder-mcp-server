import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "../src/config.js";
import type { FetchPageResult } from "../src/types.js";
import type { PorschePageFetcher } from "../src/porsche/fetcher.js";
import { fixtureDetailHtml, fixtureDetailVisibleText, fixtureHtml, fixtureVisibleText } from "./fixtures.js";

export function testConfig(databasePath?: string): AppConfig {
  const dir = mkdtempSync(join(tmpdir(), "porsche-finder-mcp-"));
  return {
    port: 0,
    host: "127.0.0.1",
    authToken: "test-token",
    databasePath: databasePath ?? join(dir, "test.sqlite"),
    cacheTtlMs: 900_000,
    carStatusCacheTtlMs: 86_400_000,
    playwrightBrowser: "webkit",
    playwrightProfileDir: join(dir, "profile"),
    playwrightHeadless: true,
    playwrightChallengeTimeoutMs: 1_000
  };
}

export class FakeFetcher implements PorschePageFetcher {
  calls: string[] = [];

  async fetchPage(url: string): Promise<FetchPageResult> {
    this.calls.push(url);
    if (url.includes("/details/")) {
      return {
        url,
        html: fixtureDetailHtml,
        visibleText: fixtureDetailVisibleText,
        source: "http"
      };
    }

    return {
      url,
      html: fixtureHtml,
      visibleText: fixtureVisibleText,
      source: "http"
    };
  }
}

export const auth = {
  Authorization: "Bearer test-token"
};
