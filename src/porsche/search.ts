import type {
  CachedCar,
  FetchPageResult,
  FetchSource,
  ParsedPorschePage,
  SavedSearch,
  SearchRunOptions,
  SearchRunResult
} from "../types.js";
import type { CarLocator, SearchStore } from "../db.js";
import type { PorschePageFetcher } from "./fetcher.js";
import { TimedCache } from "./cache.js";
import { parsePorscheListings } from "./parser.js";
import { parsePorscheDetails, parsePorscheStatus } from "./details.js";
import { buildPorscheSearchUrl } from "./url.js";

type CachedPage = ParsedPorschePage & {
  source: FetchSource;
  fetchedAt: string;
};

type SearchPage = CachedPage & {
  cacheHit: boolean;
};

type CarFetchResult = {
  car: CachedCar;
  source: FetchSource;
};

export class PorscheSearchService {
  private cache: TimedCache<CachedPage>;

  constructor(
    private fetcher: PorschePageFetcher,
    private store: SearchStore,
    cacheTtlMs: number,
    private carStatusCacheTtlMs: number
  ) {
    this.cache = new TimedCache<CachedPage>(cacheTtlMs);
  }

  clearCache(): void {
    this.cache.clear();
  }

  async run(search: SavedSearch, options: SearchRunOptions = {}): Promise<SearchRunResult> {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const runType = options.runType ?? (search.id > 0 ? "saved_search" : "preview");
    const limit = Math.min(options.limit ?? search.defaultLimit, 50);
    const maxPages = Math.min(options.pages ?? search.maxPages, search.maxPages, 5);
    const firstUrl = buildPorscheSearchUrl(search.filters);
    const listings: CachedCar[] = [];
    const sources: FetchSource[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;
    let httpPulls = 0;
    let playwrightPulls = 0;
    let pagesFetched = 0;
    let nextUrl: string | undefined = firstUrl;
    const persistInventory = search.id > 0;
    const activeCarIds: number[] = [];
    const now = new Date().toISOString();
    const countPull = (source: FetchSource) => {
      if (source === "http") {
        httpPulls += 1;
      } else {
        playwrightPulls += 1;
      }
    };

    try {
      while (nextUrl && pagesFetched < maxPages && listings.length < limit) {
        const page = await this.fetchAndParse(nextUrl, Boolean(options.refresh));
        pagesFetched += 1;
        sources.push(page.source);
        if (page.cacheHit) {
          cacheHits += 1;
        } else {
          cacheMisses += 1;
          countPull(page.source);
        }

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
              status: "active",
              isFavorite: false
            });
            continue;
          }

          const upserted = this.store.upsertListingForSearch(search.id, listing, now);
          let car = upserted.car;
          let fetchedDetails = false;
          if (!car.details && car.link) {
            try {
              const fetched = await this.fetchAndCacheDetailsWithSource(car);
              countPull(fetched.source);
              car = fetched.car;
            } catch (error) {
              car = {
                ...car,
                detailError: error instanceof Error ? error.message : "Detail fetch failed."
              };
            }
            fetchedDetails = Boolean(car.details);
          }

          if (car.details && !fetchedDetails && this.shouldRefreshStatus(car, Boolean(options.refresh), now)) {
            try {
              const fetched = await this.fetchAndCacheStatusWithSource(car, search.id);
              countPull(fetched.source);
              car = fetched.car;
            } catch (error) {
              car = {
                ...car,
                detailError: error instanceof Error ? error.message : "Status refresh failed."
              };
            }
          }

          activeCarIds.push(car.id);
          if (isVisibleInNormalList(car, now)) {
            listings.push(car);
          }
        }

        nextUrl = page.nextPageUrl;

        if (!nextUrl && pagesFetched < maxPages) {
          nextUrl = buildPorscheSearchUrl(search.filters, pagesFetched + 1);
        }
      }

      const removedListings = persistInventory
        ? this.store.completeSearchRun(search.id, activeCarIds, now).filter((removed) => isVisibleInNormalList(removed.car, now))
        : [];
      const result = {
        search,
        listings: listings.slice(0, limit),
        removedListings,
        pagesFetched,
        sources,
        cacheHits,
        cacheMisses,
        httpPulls,
        playwrightPulls,
        fetchedAt: now,
        url: firstUrl
      };

      this.store.recordSearchRun({
        runType,
        searchId: search.id > 0 ? search.id : undefined,
        searchName: search.name,
        searchSlug: search.slug,
        startedAt,
        finishedAt: new Date().toISOString(),
        success: true,
        durationMs: Date.now() - startedMs,
        pagesFetched,
        listingsCount: result.listings.length,
        removedCount: removedListings.length,
        sources,
        cacheHits,
        cacheMisses,
        httpPulls,
        playwrightPulls
      });

      return result;
    } catch (error) {
      this.store.recordSearchRun({
        runType,
        searchId: search.id > 0 ? search.id : undefined,
        searchName: search.name,
        searchSlug: search.slug,
        startedAt,
        finishedAt: new Date().toISOString(),
        success: false,
        durationMs: Date.now() - startedMs,
        pagesFetched,
        listingsCount: listings.length,
        removedCount: 0,
        sources,
        cacheHits,
        cacheMisses,
        httpPulls,
        playwrightPulls,
        error: error instanceof Error ? error.message : "Search run failed."
      });
      throw error;
    }
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

  async favoriteCar(locator: CarLocator): Promise<CachedCar[]> {
    const matches = this.store.findCachedCars(locator);
    if (matches.length !== 1) {
      return matches;
    }

    return [this.store.setFavorite(matches[0].id, true, new Date().toISOString())];
  }

  async unfavoriteCar(locator: CarLocator): Promise<CachedCar[]> {
    const matches = this.store.findCachedCars(locator);
    if (matches.length !== 1) {
      return matches;
    }

    return [this.store.setFavorite(matches[0].id, false, new Date().toISOString())];
  }

  listFavorites(): CachedCar[] {
    return this.store.listFavorites();
  }

  listInventoryChanges(limit?: number): string {
    return this.store.listInventoryChanges(limit);
  }

  private async fetchAndParse(url: string, refresh: boolean): Promise<SearchPage> {
    const cached = refresh ? undefined : this.cache.get(url);
    if (cached) {
      return { ...cached, cacheHit: true };
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
    return { ...page, cacheHit: false };
  }

  private async fetchAndCacheDetails(car: CachedCar): Promise<CachedCar> {
    return (await this.fetchAndCacheDetailsWithSource(car)).car;
  }

  private async fetchAndCacheDetailsWithSource(car: CachedCar): Promise<CarFetchResult> {
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

    return {
      car: this.store.saveCarDetails(car.id, details),
      source: fetched.source
    };
  }

  private async fetchAndCacheStatus(car: CachedCar, searchId: number | null): Promise<CachedCar> {
    return (await this.fetchAndCacheStatusWithSource(car, searchId)).car;
  }

  private async fetchAndCacheStatusWithSource(car: CachedCar, searchId: number | null): Promise<CarFetchResult> {
    if (!car.link) {
      throw new Error("Car has no detail URL to inspect.");
    }

    const checkedAt = new Date().toISOString();
    const fetched = await this.fetcher.fetchPage(car.link, { refresh: false });
    const status = parsePorscheStatus({
      html: fetched.html,
      visibleText: fetched.visibleText,
      detailUrl: fetched.url,
      checkedAt
    });

    return {
      car: this.store.updateCarStatus(car.id, status, searchId),
      source: fetched.source
    };
  }

  private shouldRefreshStatus(car: CachedCar, force: boolean, now: string): boolean {
    if (force || !car.statusCheckedAt) {
      return true;
    }

    const checkedAt = Date.parse(car.statusCheckedAt);
    const nowMs = Date.parse(now);
    return !Number.isFinite(checkedAt) || !Number.isFinite(nowMs) || nowMs - checkedAt >= this.carStatusCacheTtlMs;
  }
}

function isVisibleInNormalList(car: CachedCar, now: string): boolean {
  if (car.status !== "unavailable" || car.isFavorite || !car.unavailableAt) {
    return true;
  }

  const unavailableAt = Date.parse(car.unavailableAt);
  const nowMs = Date.parse(now);
  if (!Number.isFinite(unavailableAt) || !Number.isFinite(nowMs)) {
    return true;
  }

  return nowMs - unavailableAt < 7 * 24 * 60 * 60 * 1000;
}
