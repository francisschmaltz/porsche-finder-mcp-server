import type {
  CachedCar,
  FetchPageResult,
  FetchSource,
  ParsedPorschePage,
  SavedSearch,
  SearchRunOptions,
  SearchRunResult
} from "../types.js";
import type { SearchStore } from "../db.js";
import type { PorschePageFetcher } from "./fetcher.js";
import { TimedCache } from "./cache.js";
import { parsePorscheListings } from "./parser.js";
import { parsePorscheDetails } from "./details.js";
import { buildPorscheSearchUrl } from "./url.js";

type CachedPage = ParsedPorschePage & {
  source: FetchSource;
  fetchedAt: string;
};

export class PorscheSearchService {
  private cache: TimedCache<CachedPage>;

  constructor(
    private fetcher: PorschePageFetcher,
    private store: SearchStore,
    cacheTtlMs: number
  ) {
    this.cache = new TimedCache<CachedPage>(cacheTtlMs);
  }

  clearCache(): void {
    this.cache.clear();
  }

  async run(search: SavedSearch, options: SearchRunOptions = {}): Promise<SearchRunResult> {
    const limit = Math.min(options.limit ?? search.defaultLimit, 50);
    const maxPages = Math.min(options.pages ?? search.maxPages, search.maxPages, 5);
    const firstUrl = buildPorscheSearchUrl(search.filters);
    const listings: CachedCar[] = [];
    const sources: FetchSource[] = [];
    let pagesFetched = 0;
    let nextUrl: string | undefined = firstUrl;
    const persistInventory = search.id > 0;
    const activeCarIds: number[] = [];
    const now = new Date().toISOString();

    while (nextUrl && pagesFetched < maxPages && listings.length < limit) {
      const page = await this.fetchAndParse(nextUrl, Boolean(options.refresh));
      pagesFetched += 1;
      sources.push(page.source);

      for (const listing of page.listings) {
        if (listings.length >= limit) {
          break;
        }

        if (!persistInventory) {
          listings.push({
            id: 0,
            identityKey: `preview:${listing.link}`,
            title: listing.title,
            color: listing.color,
            mileage: listing.mileage,
            price: listing.price,
            location: listing.location,
            link: listing.link,
            firstSeenAt: now,
            lastSeenAt: now,
            status: "active"
          });
          continue;
        }

        const upserted = this.store.upsertListingForSearch(search.id, listing, now);
        let car = upserted.car;
        if (!car.details && car.link) {
          car = await this.fetchAndCacheDetails(car).catch((error: unknown) => ({
            ...car,
            detailError: error instanceof Error ? error.message : "Detail fetch failed."
          }));
        }

        activeCarIds.push(car.id);
        listings.push(car);
      }

      nextUrl = page.nextPageUrl;

      if (!nextUrl && pagesFetched < maxPages) {
        nextUrl = buildPorscheSearchUrl(search.filters, pagesFetched + 1);
      }
    }

    return {
      search,
      listings: listings.slice(0, limit),
      removedListings: persistInventory ? this.store.completeSearchRun(search.id, activeCarIds, now) : [],
      pagesFetched,
      sources,
      fetchedAt: now,
      url: firstUrl
    };
  }

  async getCarAddedFeatures(locator: {
    carId?: number;
    vin?: string;
    stockNumber?: string;
    detailUrl?: string;
    refresh?: boolean;
  }): Promise<CachedCar[]> {
    const matches = this.store.findCachedCars(locator);
    if (matches.length !== 1) {
      return matches;
    }

    const car = matches[0];
    if (!car.details || locator.refresh) {
      return [await this.fetchAndCacheDetails(car)];
    }

    return [car];
  }

  listInventoryChanges(limit?: number): string {
    return this.store.listInventoryChanges(limit);
  }

  private async fetchAndParse(url: string, refresh: boolean): Promise<CachedPage> {
    const cached = refresh ? undefined : this.cache.get(url);
    if (cached) {
      return cached;
    }

    const fetched: FetchPageResult = await this.fetcher.fetchPage(url, { refresh });
    const parsed = parsePorscheListings({
      html: fetched.html,
      visibleText: fetched.visibleText,
      baseUrl: fetched.url
    });
    const page: CachedPage = {
      ...parsed,
      source: fetched.source,
      fetchedAt: new Date().toISOString()
    };

    this.cache.set(url, page);
    return page;
  }

  private async fetchAndCacheDetails(car: CachedCar): Promise<CachedCar> {
    if (!car.link) {
      throw new Error("Car has no detail URL to inspect.");
    }

    const fetched = await this.fetcher.fetchPage(car.link, { refresh: false });
    const details = parsePorscheDetails({
      html: fetched.html,
      visibleText: fetched.visibleText,
      detailUrl: fetched.url,
      fetchedAt: new Date().toISOString()
    });

    return this.store.saveCarDetails(car.id, details);
  }
}
