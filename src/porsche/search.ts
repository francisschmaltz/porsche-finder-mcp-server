import type {
  FetchPageResult,
  FetchSource,
  ParsedPorschePage,
  SavedSearch,
  SearchRunOptions,
  SearchRunResult
} from "../types.js";
import type { PorschePageFetcher } from "./fetcher.js";
import { TimedCache } from "./cache.js";
import { parsePorscheListings } from "./parser.js";
import { buildPorscheSearchUrl } from "./url.js";

type CachedPage = ParsedPorschePage & {
  source: FetchSource;
  fetchedAt: string;
};

export class PorscheSearchService {
  private cache: TimedCache<CachedPage>;

  constructor(
    private fetcher: PorschePageFetcher,
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
    const listings = [];
    const sources: FetchSource[] = [];
    let pagesFetched = 0;
    let nextUrl: string | undefined = firstUrl;

    while (nextUrl && pagesFetched < maxPages && listings.length < limit) {
      const page = await this.fetchAndParse(nextUrl, Boolean(options.refresh));
      pagesFetched += 1;
      sources.push(page.source);
      listings.push(...page.listings);
      nextUrl = page.nextPageUrl;

      if (!nextUrl && pagesFetched < maxPages) {
        nextUrl = buildPorscheSearchUrl(search.filters, pagesFetched + 1);
      }
    }

    return {
      search,
      listings: listings.slice(0, limit),
      pagesFetched,
      sources,
      fetchedAt: new Date().toISOString(),
      url: firstUrl
    };
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
}
