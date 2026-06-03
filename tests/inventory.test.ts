import { describe, expect, it } from "vitest";
import { SearchStore } from "../src/db.js";
import { PorscheSearchService } from "../src/porsche/search.js";
import type { AppConfig } from "../src/config.js";
import type { FetchPageResult } from "../src/types.js";
import type { PorschePageFetcher } from "../src/porsche/fetcher.js";
import { fixtureDetailHtml, fixtureDetailVisibleText } from "./fixtures.js";
import { testConfig } from "./helpers.js";

const detailUrl = "https://finder.porsche.com/us/en-US/details/porsche-911-carrera-4s-coupe-used-123";

class InventoryFakeFetcher implements PorschePageFetcher {
  searchAHtml = listingPage("$129,900");
  searchBHtml = listingPage("$129,900");
  detailCalls = 0;

  async fetchPage(url: string): Promise<FetchPageResult> {
    if (url.includes("/details/")) {
      this.detailCalls += 1;
      return {
        url,
        html: fixtureDetailHtml,
        visibleText: fixtureDetailVisibleText,
        source: "http"
      };
    }

    if (url.includes("category=911-carrera-s-coupe")) {
      return {
        url,
        html: this.searchAHtml,
        visibleText: visibleTextFromHtml(this.searchAHtml),
        source: "http"
      };
    }

    return {
      url,
      html: this.searchBHtml,
      visibleText: visibleTextFromHtml(this.searchBHtml),
      source: "http"
    };
  }
}

describe("inventory cache", () => {
  it("tracks details, price changes, and search-scoped removals", async () => {
    const config: AppConfig = testConfig();
    const store = new SearchStore(config.databasePath);
    const fetcher = new InventoryFakeFetcher();
    const service = new PorscheSearchService(fetcher, store, config.cacheTtlMs);

    try {
      const searchA = store.create({
        name: "Search A",
        categories: ["911-carrera-s-coupe"],
        maximumMileage: 30_000,
        defaultLimit: 10,
        maxPages: 1
      });
      const searchB = store.create({
        name: "Search B",
        categories: ["911-carrera-coupe"],
        maximumMileage: 30_000,
        defaultLimit: 10,
        maxPages: 1
      });

      const firstA = await service.run(searchA, { refresh: true });
      expect(firstA.listings[0].vin).toBe("WP0AB2A99NS123456");
      expect(firstA.listings[0].stockNumber).toBe("NS123456");
      expect(firstA.listings[0].details?.includedOptions).toContain("GT Sport Steering Wheel");
      expect(fetcher.detailCalls).toBe(1);

      await service.run(searchB, { refresh: true });
      expect(fetcher.detailCalls).toBe(1);

      fetcher.searchAHtml = listingPage("$124,900");
      const priceDrop = await service.run(searchA, { refresh: true });
      expect(priceDrop.listings[0].priceChange).toMatchObject({
        delta: "-$5,000",
        direction: "decrease"
      });
      expect(fetcher.detailCalls).toBe(1);

      fetcher.searchAHtml = emptyPage();
      const removedA = await service.run(searchA, { refresh: true });
      expect(removedA.listings).toHaveLength(0);
      expect(removedA.removedListings).toHaveLength(1);
      expect(removedA.removedListings[0].car.vin).toBe("WP0AB2A99NS123456");

      const stillActiveB = await service.run(searchB, { refresh: true });
      expect(stillActiveB.listings).toHaveLength(1);
      expect(stillActiveB.removedListings).toHaveLength(0);
    } finally {
      store.close();
    }
  });
});

function listingPage(price: string): string {
  return `<!doctype html>
<html>
  <body>
    <article>
      <h2>2022 Porsche 911 Carrera 4S Coupe</h2>
      <p>Certified Pre-Owned</p>
      <p>Agate Grey Metallic Red</p>
      <p>Gasoline 1,079 mi Automatic 443 hp</p>
      <p>${price}</p>
      <p>Porsche San Antonio San Antonio, TX, 78230</p>
      <a href="${detailUrl}">Show details</a>
    </article>
  </body>
</html>`;
}

function emptyPage(): string {
  return "<!doctype html><html><body><p>No results found.</p></body></html>";
}

function visibleTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
