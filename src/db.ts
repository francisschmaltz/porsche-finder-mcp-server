import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type {
  CarAvailabilityStatus,
  CachedCar,
  CarDetailData,
  CarListing,
  CarStatusData,
  FetchSource,
  OverviewData,
  PriceChange,
  RemovedSearchCar,
  SavedSearch,
  SavedSearchInput,
  SearchRunHistory,
  SearchRunType,
  SearchFilters
} from "./types.js";
import { assertValidSlug, slugify } from "./slug.js";

type SearchRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  enabled: 0 | 1;
  categories_json: string;
  model_generations_json: string;
  equipment_json: string;
  maximum_mileage: number;
  default_limit: number;
  max_pages: number;
  created_at: string;
  updated_at: string;
};

type CarRow = {
  id: number;
  identity_key: string;
  vin: string | null;
  stock_number: string | null;
  title: string;
  exterior_color: string;
  interior_color: string;
  color_raw: string;
  mileage: string;
  price: string;
  price_cents: number | null;
  location: string;
  detail_url: string;
  first_seen_at: string;
  last_seen_at: string;
  status: CarAvailabilityStatus;
  is_favorite: 0 | 1;
  favorited_at: string | null;
  unavailable_at: string | null;
  status_checked_at: string | null;
  detail_not_found_count: number;
};

type DetailRow = {
  car_id: number;
  detail_url: string;
  vin: string | null;
  stock_number: string | null;
  equipment_highlights_json: string;
  included_options_json: string;
  feature_matches_json: string;
  fetched_at: string;
};

type PriceHistoryRow = {
  id: number;
  car_id: number;
  search_id: number | null;
  price: string;
  price_cents: number;
  seen_at: string;
};

type StatusHistoryRow = {
  id: number;
  car_id: number;
  previous_status: CarAvailabilityStatus | null;
  current_status: CarAvailabilityStatus;
  checked_at: string;
};

type SearchCarRow = {
  search_id: number;
  car_id: number;
  active: 0 | 1;
  first_seen_at: string;
  last_seen_at: string;
  removed_at: string | null;
  last_seen_price_cents: number | null;
};

type SearchRunRow = {
  id: number;
  run_type: SearchRunType;
  search_id: number | null;
  search_name: string;
  search_slug: string;
  started_at: string;
  finished_at: string;
  success: 0 | 1;
  duration_ms: number;
  pages_fetched: number;
  listings_count: number;
  removed_count: number;
  sources_json: string;
  cache_hits: number;
  cache_misses: number;
  http_pulls: number;
  playwright_pulls: number;
  error: string | null;
};

export type InventoryUpsertResult = {
  car: CachedCar;
  priceChanged: boolean;
};

export type CarLocator = {
  carId?: number;
  vin?: string;
  stockNumber?: string;
  detailUrl?: string;
};

export type SearchRunRecordInput = {
  runType: SearchRunType;
  searchId?: number;
  searchName: string;
  searchSlug: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  durationMs: number;
  pagesFetched: number;
  listingsCount: number;
  removedCount: number;
  sources: FetchSource[];
  cacheHits: number;
  cacheMisses: number;
  httpPulls: number;
  playwrightPulls: number;
  error?: string;
};

export class SearchStore {
  private db: Database.Database;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  list(): SavedSearch[] {
    const rows = this.db
      .prepare("select * from search_tools order by updated_at desc, id desc")
      .all() as SearchRow[];
    return rows.map(mapRow);
  }

  listEnabled(): SavedSearch[] {
    const rows = this.db
      .prepare("select * from search_tools where enabled = 1 order by name asc")
      .all() as SearchRow[];
    return rows.map(mapRow);
  }

  getById(id: number): SavedSearch | undefined {
    const row = this.db.prepare("select * from search_tools where id = ?").get(id) as SearchRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  getBySlug(slug: string): SavedSearch | undefined {
    const row = this.db.prepare("select * from search_tools where slug = ?").get(slug) as SearchRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  create(input: SavedSearchInput): SavedSearch {
    const slug = this.prepareSlug(input.name, input.slug);
    const now = new Date().toISOString();
    const filters = normalizeFilters(input);

    const result = this.db
      .prepare(
        `insert into search_tools (
          name,
          slug,
          description,
          enabled,
          categories_json,
          model_generations_json,
          equipment_json,
          maximum_mileage,
          default_limit,
          max_pages,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.name.trim(),
        slug,
        input.description ?? "",
        input.enabled === false ? 0 : 1,
        JSON.stringify(filters.categories),
        JSON.stringify(filters.modelGenerations),
        JSON.stringify(filters.equipment),
        filters.maximumMileage,
        input.defaultLimit ?? 10,
        input.maxPages ?? 1,
        now,
        now
      );

    return this.getById(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: SavedSearchInput): SavedSearch | undefined {
    const existing = this.getById(id);
    if (!existing) {
      return undefined;
    }

    const proposedSlug = input.slug ? slugify(input.slug) : existing.slug;
    assertValidSlug(proposedSlug);
    this.assertSlugAvailable(proposedSlug, id);

    const filters = normalizeFilters(input);
    const now = new Date().toISOString();

    this.db
      .prepare(
        `update search_tools
          set name = ?,
              slug = ?,
              description = ?,
              enabled = ?,
              categories_json = ?,
              model_generations_json = ?,
              equipment_json = ?,
              maximum_mileage = ?,
              default_limit = ?,
              max_pages = ?,
              updated_at = ?
        where id = ?`
      )
      .run(
        input.name.trim(),
        proposedSlug,
        input.description ?? "",
        input.enabled === false ? 0 : 1,
        JSON.stringify(filters.categories),
        JSON.stringify(filters.modelGenerations),
        JSON.stringify(filters.equipment),
        filters.maximumMileage,
        input.defaultLimit ?? 10,
        input.maxPages ?? 1,
        now,
        id
      );

    return this.getById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare("delete from search_tools where id = ?").run(id);
    return result.changes > 0;
  }

  upsertListingForSearch(searchId: number, listing: CarListing, seenAt: string): InventoryUpsertResult {
    const priceCents = parsePriceCents(listing.price);
    const existing = this.findCarByIdentity({
      detailUrl: listing.link
    });
    let priceChanged = false;

    if (!existing) {
      const result = this.db
        .prepare(
          `insert into cars (
            identity_key,
            title,
            exterior_color,
            interior_color,
            color_raw,
            mileage,
            price,
            price_cents,
            location,
            detail_url,
            first_seen_at,
            last_seen_at,
            status,
            unavailable_at,
            status_checked_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', null, null)`
        )
        .run(
          buildIdentityKey({ detailUrl: listing.link }),
          listing.title,
          listing.color.exterior,
          listing.color.interior,
          listing.color.raw,
          listing.mileage,
          listing.price,
          priceCents,
          listing.location,
          listing.link,
          seenAt,
          seenAt
        );
      const carId = Number(result.lastInsertRowid);
      if (priceCents !== undefined) {
        this.insertPriceHistory(carId, searchId, listing.price, priceCents, seenAt);
      }
      this.markCarActiveForSearch(searchId, carId, priceCents, seenAt);
      return { car: this.getCachedCarById(carId)!, priceChanged: false };
    }

    if (priceCents !== undefined && existing.price_cents !== priceCents) {
      priceChanged = true;
      this.insertPriceHistory(existing.id, searchId, listing.price, priceCents, seenAt);
    }
    if (existing.status !== "active") {
      this.insertStatusHistory(existing.id, existing.status, "active", seenAt);
    }

    this.db
      .prepare(
        `update cars
          set title = ?,
              exterior_color = ?,
              interior_color = ?,
              color_raw = ?,
              mileage = ?,
              price = ?,
              price_cents = ?,
              location = ?,
              detail_url = ?,
              last_seen_at = ?,
              status = 'active',
              unavailable_at = null
        where id = ?`
      )
      .run(
        listing.title,
        listing.color.exterior,
        listing.color.interior,
        listing.color.raw,
        listing.mileage,
        listing.price,
        priceCents,
        listing.location,
        listing.link,
        seenAt,
        existing.id
      );
    this.markCarActiveForSearch(searchId, existing.id, priceCents, seenAt);
    return { car: this.getCachedCarById(existing.id)!, priceChanged };
  }

  saveCarDetails(carId: number, details: CarDetailData): CachedCar {
    const existing = this.getCarRowById(carId);
    if (!existing) {
      throw new Error(`Car not found: ${carId}`);
    }

    const identityMatch = this.findCarByIdentity({
      vin: details.vin,
      stockNumber: details.stockNumber,
      detailUrl: details.detailUrl
    });
    const targetId = identityMatch && identityMatch.id !== carId ? this.mergeCars(carId, identityMatch.id) : carId;
    const identityKey = buildIdentityKey({
      vin: details.vin,
      stockNumber: details.stockNumber,
      detailUrl: details.detailUrl
    });

    this.db
      .prepare(
        `update cars
          set identity_key = ?,
              vin = coalesce(?, vin),
              stock_number = coalesce(?, stock_number),
              detail_url = ?
        where id = ?`
      )
      .run(identityKey, details.vin ?? null, details.stockNumber ?? null, details.detailUrl, targetId);

    this.db
      .prepare(
        `insert into car_details (
          car_id,
          detail_url,
          vin,
          stock_number,
          equipment_highlights_json,
          included_options_json,
          feature_matches_json,
          fetched_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(car_id) do update set
          detail_url = excluded.detail_url,
          vin = excluded.vin,
          stock_number = excluded.stock_number,
          equipment_highlights_json = excluded.equipment_highlights_json,
          included_options_json = excluded.included_options_json,
          feature_matches_json = excluded.feature_matches_json,
          fetched_at = excluded.fetched_at`
      )
      .run(
        targetId,
        details.detailUrl,
        details.vin ?? null,
        details.stockNumber ?? null,
        JSON.stringify(details.equipmentHighlights),
        JSON.stringify(details.includedOptions),
        JSON.stringify(details.featureMatches),
        details.fetchedAt
      );

    return this.updateCarStatus(targetId, {
      detailUrl: details.detailUrl,
      status: details.status,
      price: details.price,
      checkedAt: details.fetchedAt
    });
  }

  updateCarStatus(carId: number, status: CarStatusData, searchId: number | null = null): CachedCar {
    const existing = this.getCarRowById(carId);
    if (!existing) {
      throw new Error(`Car not found: ${carId}`);
    }

    const shouldApplyStatusPrice = searchId === null;
    const price = shouldApplyStatusPrice ? status.price : undefined;
    const priceCents = price ? parsePriceCents(price) : undefined;
    if (price && priceCents !== undefined && existing.price_cents !== priceCents) {
      this.insertPriceHistory(carId, searchId, price, priceCents, status.checkedAt);
    }

    if (existing.status !== status.status) {
      this.insertStatusHistory(carId, existing.status, status.status, status.checkedAt);
    }

    this.db
      .prepare(
        `update cars
          set status = ?,
              price = coalesce(?, price),
              price_cents = coalesce(?, price_cents),
              detail_url = ?,
              unavailable_at = case when ? = 'unavailable' then coalesce(unavailable_at, ?) else null end,
              status_checked_at = ?,
              detail_not_found_count = 0
        where id = ?`
      )
      .run(
        status.status,
        price ?? null,
        priceCents ?? null,
        normalizeUrl(status.detailUrl),
        status.status,
        status.checkedAt,
        status.checkedAt,
        carId
      );

    return this.getCachedCarById(carId)!;
  }

  recordDetailPageNotFound(carId: number, detailUrl: string, checkedAt: string): CachedCar {
    const existing = this.getCarRowById(carId);
    if (!existing) {
      throw new Error(`Car not found: ${carId}`);
    }

    const count = existing.detail_not_found_count + 1;
    const nextStatus: CarAvailabilityStatus = count >= 2 ? "unavailable" : existing.status;
    if (existing.status !== nextStatus) {
      this.insertStatusHistory(carId, existing.status, nextStatus, checkedAt);
    }

    this.db
      .prepare(
        `update cars
          set detail_url = ?,
              detail_not_found_count = ?,
              status_checked_at = ?,
              status = ?,
              unavailable_at = case when ? = 'unavailable' then coalesce(unavailable_at, ?) else unavailable_at end
        where id = ?`
      )
      .run(normalizeUrl(detailUrl), count, checkedAt, nextStatus, nextStatus, checkedAt, carId);

    return this.getCachedCarById(carId)!;
  }

  getCachedCarById(id: number): CachedCar | undefined {
    const row = this.getCarRowById(id);
    return row ? this.mapCarRow(row) : undefined;
  }

  findCachedCars(locator: CarLocator): CachedCar[] {
    if (locator.carId) {
      const car = this.getCachedCarById(locator.carId);
      return car ? [car] : [];
    }

    const clauses: string[] = [];
    const values: unknown[] = [];
    if (locator.vin) {
      clauses.push("lower(vin) = lower(?)");
      values.push(locator.vin.trim());
    }
    if (locator.stockNumber) {
      clauses.push("lower(stock_number) = lower(?)");
      values.push(locator.stockNumber.trim());
    }
    if (locator.detailUrl) {
      clauses.push("detail_url = ?");
      values.push(normalizeUrl(locator.detailUrl));
    }

    if (clauses.length === 0) {
      return [];
    }

    const rows = this.db
      .prepare(`select * from cars where ${clauses.join(" or ")} order by last_seen_at desc`)
      .all(...values) as CarRow[];
    return rows.map((row) => this.mapCarRow(row));
  }

  setFavorite(carId: number, favorite: boolean, changedAt: string): CachedCar {
    const existing = this.getCarRowById(carId);
    if (!existing) {
      throw new Error(`Car not found: ${carId}`);
    }

    this.db
      .prepare(
        `update cars
          set is_favorite = ?,
              favorited_at = ?
        where id = ?`
      )
      .run(favorite ? 1 : 0, favorite ? changedAt : null, carId);

    return this.getCachedCarById(carId)!;
  }

  listFavorites(): CachedCar[] {
    const rows = this.db
      .prepare("select * from cars where is_favorite = 1 order by favorited_at desc, last_seen_at desc")
      .all() as CarRow[];
    return rows.map((row) => this.mapCarRow(row));
  }

  getCachedCarDetails(carId: number): CarDetailData | undefined {
    const row = this.db.prepare("select * from car_details where car_id = ?").get(carId) as DetailRow | undefined;
    return row ? mapDetailRow(row) : undefined;
  }

  completeSearchRun(searchId: number, activeCarIds: number[], removedAt: string): RemovedSearchCar[] {
    if (activeCarIds.length === 0) {
      this.db
        .prepare(
          `update saved_search_cars
            set active = 0,
                removed_at = ?
          where search_id = ?
            and active = 1`
        )
        .run(removedAt, searchId);
    } else {
      const placeholders = activeCarIds.map(() => "?").join(",");
      this.db
        .prepare(
          `update saved_search_cars
            set active = 0,
                removed_at = ?
          where search_id = ?
            and active = 1
            and car_id not in (${placeholders})`
        )
        .run(removedAt, searchId, ...activeCarIds);
    }

    const removedRows = this.db
      .prepare(
        `select * from saved_search_cars
          where search_id = ?
            and active = 0
            and removed_at = ?
          order by removed_at desc`
      )
      .all(searchId, removedAt) as SearchCarRow[];

    return removedRows.flatMap((row) => {
      const car = this.getCachedCarById(row.car_id);
      return car
        ? [
            {
              car,
              removedAt: row.removed_at ?? removedAt,
              lastSeenAt: row.last_seen_at
            }
          ]
        : [];
    });
  }

  listInventoryChanges(limit = 20): string {
    const priceRows = this.db
      .prepare(
        `select ph.*, c.title, c.vin, c.stock_number, c.detail_url
          from car_price_history ph
          join cars c on c.id = ph.car_id
          order by ph.seen_at desc
          limit ?`
      )
      .all(limit) as Array<PriceHistoryRow & { title: string; vin: string | null; stock_number: string | null; detail_url: string }>;

    const removedRows = this.db
      .prepare(
        `select ssc.*, st.name as search_name, c.title, c.vin, c.stock_number, c.detail_url
          from saved_search_cars ssc
          join search_tools st on st.id = ssc.search_id
          join cars c on c.id = ssc.car_id
          where ssc.active = 0
          order by ssc.removed_at desc
          limit ?`
      )
      .all(limit) as Array<
      SearchCarRow & { search_name: string; title: string; vin: string | null; stock_number: string | null; detail_url: string }
    >;

    const statusRows = this.db
      .prepare(
        `select sh.*, c.title, c.vin, c.stock_number, c.detail_url
          from car_status_history sh
          join cars c on c.id = sh.car_id
          order by sh.checked_at desc, sh.id desc
          limit ?`
      )
      .all(limit) as Array<
      StatusHistoryRow & { title: string; vin: string | null; stock_number: string | null; detail_url: string }
    >;

    const priceText =
      priceRows.length === 0
        ? "No price history yet."
        : priceRows
            .map((row) => {
              const previous = this.getPreviousPrice(row.car_id, row.id);
              const delta =
                previous && previous.price_cents !== row.price_cents
                  ? ` (${formatDelta(row.price_cents - previous.price_cents)})`
                  : "";
              return `${row.seen_at}: ${row.title} ${row.price}${delta} ${identityLabel(row)}`;
            })
            .join("\n");

    const removedText =
      removedRows.length === 0
        ? "No search-specific removals yet."
        : removedRows
            .map((row) => {
              return `${row.removed_at}: ${row.title} removed from "${row.search_name}" ${identityLabel(row)}`;
            })
            .join("\n");

    const statusText =
      statusRows.length === 0
        ? "No availability changes yet."
        : statusRows
            .map((row) => {
              const previous = row.previous_status ?? "unknown";
              return `${row.checked_at}: ${row.title} ${previous} -> ${row.current_status} ${identityLabel(row)}`;
            })
            .join("\n");

    return [
      `Recent price history`,
      priceText,
      ``,
      `Recent availability changes`,
      statusText,
      ``,
      `Recent search removals`,
      removedText
    ].join("\n");
  }

  recordSearchRun(input: SearchRunRecordInput): SearchRunHistory {
    const result = this.db
      .prepare(
        `insert into search_runs (
          run_type,
          search_id,
          search_name,
          search_slug,
          started_at,
          finished_at,
          success,
          duration_ms,
          pages_fetched,
          listings_count,
          removed_count,
          sources_json,
          cache_hits,
          cache_misses,
          http_pulls,
          playwright_pulls,
          error
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.runType,
        input.searchId ?? null,
        input.searchName,
        input.searchSlug,
        input.startedAt,
        input.finishedAt,
        input.success ? 1 : 0,
        input.durationMs,
        input.pagesFetched,
        input.listingsCount,
        input.removedCount,
        JSON.stringify(input.sources),
        input.cacheHits,
        input.cacheMisses,
        input.httpPulls,
        input.playwrightPulls,
        input.error ?? null
      );

    return this.getSearchRunById(Number(result.lastInsertRowid))!;
  }

  listRecentRuns(limit = 8): SearchRunHistory[] {
    const rows = this.db
      .prepare("select * from search_runs order by finished_at desc, id desc limit ?")
      .all(limit) as SearchRunRow[];
    return rows.map(mapRunRow);
  }

  getOverview(favoritesPreviewLimit = 3, recentRunLimit = 8): OverviewData {
    const statsRow = this.db
      .prepare(
        `select
          (select count(*) from search_tools) as saved_searches,
          (select count(*) from search_tools where enabled = 1) as enabled_searches,
          (select count(*) from cars) as cached_cars,
          (select count(*) from cars where is_favorite = 1) as favorite_cars,
          (select count(*) from cars where status = 'unavailable') as unavailable_cars,
          (select count(*) from cars where status = 'unavailable' and is_favorite = 1) as unavailable_favorites,
          (select count(*) from search_runs) as total_runs,
          (select count(*) from search_runs where success = 0) as failed_runs,
          coalesce((select sum(cache_hits) from search_runs), 0) as cache_hits,
          coalesce((select sum(cache_misses) from search_runs), 0) as cache_misses,
          coalesce((select sum(http_pulls) from search_runs), 0) as http_pulls,
          coalesce((select sum(playwright_pulls) from search_runs), 0) as playwright_pulls,
          (select finished_at from search_runs order by finished_at desc, id desc limit 1) as last_run_at`
      )
      .get() as {
      saved_searches: number;
      enabled_searches: number;
      cached_cars: number;
      favorite_cars: number;
      unavailable_cars: number;
      unavailable_favorites: number;
      total_runs: number;
      failed_runs: number;
      cache_hits: number;
      cache_misses: number;
      http_pulls: number;
      playwright_pulls: number;
      last_run_at: string | null;
    };

    return {
      stats: {
        savedSearches: statsRow.saved_searches,
        enabledSearches: statsRow.enabled_searches,
        cachedCars: statsRow.cached_cars,
        favoriteCars: statsRow.favorite_cars,
        unavailableCars: statsRow.unavailable_cars,
        unavailableFavorites: statsRow.unavailable_favorites,
        totalRuns: statsRow.total_runs,
        failedRuns: statsRow.failed_runs,
        cacheHits: statsRow.cache_hits,
        cacheMisses: statsRow.cache_misses,
        httpPulls: statsRow.http_pulls,
        playwrightPulls: statsRow.playwright_pulls,
        lastRunAt: statsRow.last_run_at ?? undefined
      },
      recentRuns: this.listRecentRuns(recentRunLimit),
      favoritesPreview: this.listFavorites().slice(0, favoritesPreviewLimit)
    };
  }

  private migrate(): void {
    this.db.exec(`
      create table if not exists search_tools (
        id integer primary key autoincrement,
        name text not null,
        slug text not null unique,
        description text not null default '',
        enabled integer not null default 1,
        categories_json text not null default '[]',
        model_generations_json text not null default '[]',
        equipment_json text not null default '[]',
        maximum_mileage integer not null default 30000,
        default_limit integer not null default 10,
        max_pages integer not null default 1,
        created_at text not null,
        updated_at text not null
      );

      create index if not exists idx_search_tools_enabled
        on search_tools(enabled);

      create table if not exists cars (
        id integer primary key autoincrement,
        identity_key text not null unique,
        vin text,
        stock_number text,
        title text not null,
        exterior_color text not null,
        interior_color text not null,
        color_raw text not null,
        mileage text not null,
        price text not null,
        price_cents integer,
        location text not null,
        detail_url text not null,
        first_seen_at text not null,
        last_seen_at text not null,
        status text not null default 'active',
        is_favorite integer not null default 0,
        favorited_at text,
        unavailable_at text,
        status_checked_at text,
        detail_not_found_count integer not null default 0
      );

      create unique index if not exists idx_cars_vin
        on cars(vin)
        where vin is not null;

      create index if not exists idx_cars_stock_number
        on cars(stock_number);

      create index if not exists idx_cars_detail_url
        on cars(detail_url);

      create table if not exists car_price_history (
        id integer primary key autoincrement,
        car_id integer not null references cars(id) on delete cascade,
        search_id integer references search_tools(id) on delete set null,
        price text not null,
        price_cents integer not null,
        seen_at text not null
      );

      create index if not exists idx_car_price_history_car
        on car_price_history(car_id, seen_at);

      create table if not exists car_status_history (
        id integer primary key autoincrement,
        car_id integer not null references cars(id) on delete cascade,
        previous_status text,
        current_status text not null,
        checked_at text not null
      );

      create index if not exists idx_car_status_history_car
        on car_status_history(car_id, checked_at);

      create table if not exists car_details (
        car_id integer primary key references cars(id) on delete cascade,
        detail_url text not null,
        vin text,
        stock_number text,
        equipment_highlights_json text not null default '[]',
        included_options_json text not null default '[]',
        feature_matches_json text not null default '[]',
        fetched_at text not null
      );

      create table if not exists saved_search_cars (
        search_id integer not null references search_tools(id) on delete cascade,
        car_id integer not null references cars(id) on delete cascade,
        active integer not null default 1,
        first_seen_at text not null,
        last_seen_at text not null,
        removed_at text,
        last_seen_price_cents integer,
        primary key(search_id, car_id)
      );

      create index if not exists idx_saved_search_cars_active
        on saved_search_cars(search_id, active);

      create table if not exists search_runs (
        id integer primary key autoincrement,
        run_type text not null,
        search_id integer,
        search_name text not null,
        search_slug text not null,
        started_at text not null,
        finished_at text not null,
        success integer not null,
        duration_ms integer not null,
        pages_fetched integer not null default 0,
        listings_count integer not null default 0,
        removed_count integer not null default 0,
        sources_json text not null default '[]',
        cache_hits integer not null default 0,
        cache_misses integer not null default 0,
        http_pulls integer not null default 0,
        playwright_pulls integer not null default 0,
        error text
      );

      create index if not exists idx_search_runs_finished
        on search_runs(finished_at);
    `);

    const searchColumns = this.db.prepare("pragma table_info(search_tools)").all() as Array<{ name: string }>;
    const searchColumnNames = new Set(searchColumns.map((column) => column.name));
    if (!searchColumnNames.has("maximum_mileage")) {
      this.db.exec("alter table search_tools add column maximum_mileage integer not null default 30000");
    }

    const carColumns = this.db.prepare("pragma table_info(cars)").all() as Array<{ name: string }>;
    const carColumnNames = new Set(carColumns.map((column) => column.name));
    if (!carColumnNames.has("is_favorite")) {
      this.db.exec("alter table cars add column is_favorite integer not null default 0");
    }
    if (!carColumnNames.has("favorited_at")) {
      this.db.exec("alter table cars add column favorited_at text");
    }
    if (!carColumnNames.has("unavailable_at")) {
      this.db.exec("alter table cars add column unavailable_at text");
    }
    if (!carColumnNames.has("status_checked_at")) {
      this.db.exec("alter table cars add column status_checked_at text");
    }
    if (!carColumnNames.has("detail_not_found_count")) {
      this.db.exec("alter table cars add column detail_not_found_count integer not null default 0");
    }

    this.db.exec(`
      create index if not exists idx_cars_favorite
        on cars(is_favorite, favorited_at);
    `);
  }

  private prepareSlug(name: string, explicitSlug?: string): string {
    const base = slugify(explicitSlug || name);
    assertValidSlug(base);
    this.assertSlugAvailable(base);
    return base;
  }

  private getSearchRunById(id: number): SearchRunHistory | undefined {
    const row = this.db.prepare("select * from search_runs where id = ?").get(id) as SearchRunRow | undefined;
    return row ? mapRunRow(row) : undefined;
  }

  private assertSlugAvailable(slug: string, currentId?: number): void {
    const existing = this.getBySlug(slug);
    if (existing && existing.id !== currentId) {
      throw new Error(`Slug already exists: ${slug}`);
    }
  }

  private findCarByIdentity(input: { vin?: string; stockNumber?: string; detailUrl?: string }): CarRow | undefined {
    const vin = input.vin?.trim();
    if (vin) {
      const row = this.db.prepare("select * from cars where lower(vin) = lower(?)").get(vin) as CarRow | undefined;
      if (row) {
        return row;
      }
    }

    const stockNumber = input.stockNumber?.trim();
    if (stockNumber) {
      const row = this.db
        .prepare("select * from cars where lower(stock_number) = lower(?)")
        .get(stockNumber) as CarRow | undefined;
      if (row) {
        return row;
      }
    }

    const detailUrl = input.detailUrl ? normalizeUrl(input.detailUrl) : undefined;
    if (detailUrl) {
      return this.db.prepare("select * from cars where detail_url = ?").get(detailUrl) as CarRow | undefined;
    }

    return undefined;
  }

  private getCarRowById(id: number): CarRow | undefined {
    return this.db.prepare("select * from cars where id = ?").get(id) as CarRow | undefined;
  }

  private mapCarRow(row: CarRow): CachedCar {
    return {
      id: row.id,
      identityKey: row.identity_key,
      vin: row.vin ?? undefined,
      stockNumber: row.stock_number ?? undefined,
      title: row.title,
      color: {
        exterior: row.exterior_color,
        interior: row.interior_color,
        raw: row.color_raw
      },
      mileage: row.mileage,
      price: row.price,
      priceCents: row.price_cents ?? undefined,
      location: row.location,
      link: row.detail_url,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      status: row.status,
      isFavorite: row.is_favorite === 1,
      favoritedAt: row.favorited_at ?? undefined,
      unavailableAt: row.unavailable_at ?? undefined,
      statusCheckedAt: row.status_checked_at ?? undefined,
      detailNotFoundCount: row.detail_not_found_count,
      details: this.getCachedCarDetails(row.id),
      priceChange: this.getLatestPriceChange(row.id)
    };
  }

  private markCarActiveForSearch(searchId: number, carId: number, priceCents: number | undefined, seenAt: string): void {
    this.db
      .prepare(
        `insert into saved_search_cars (
          search_id,
          car_id,
          active,
          first_seen_at,
          last_seen_at,
          removed_at,
          last_seen_price_cents
        ) values (?, ?, 1, ?, ?, null, ?)
        on conflict(search_id, car_id) do update set
          active = 1,
          last_seen_at = excluded.last_seen_at,
          removed_at = null,
          last_seen_price_cents = excluded.last_seen_price_cents`
      )
      .run(searchId, carId, seenAt, seenAt, priceCents ?? null);
  }

  private insertPriceHistory(carId: number, searchId: number | null, price: string, priceCents: number, seenAt: string): void {
    this.db
      .prepare(
        `insert into car_price_history (
          car_id,
          search_id,
          price,
          price_cents,
          seen_at
        ) values (?, ?, ?, ?, ?)`
      )
      .run(carId, searchId, price, priceCents, seenAt);
  }

  private insertStatusHistory(
    carId: number,
    previousStatus: CarAvailabilityStatus | null,
    currentStatus: CarAvailabilityStatus,
    checkedAt: string
  ): void {
    this.db
      .prepare(
        `insert into car_status_history (
          car_id,
          previous_status,
          current_status,
          checked_at
        ) values (?, ?, ?, ?)`
      )
      .run(carId, previousStatus, currentStatus, checkedAt);
  }

  private getLatestPriceChange(carId: number): PriceChange | undefined {
    const rows = this.db
      .prepare("select * from car_price_history where car_id = ? order by seen_at desc, id desc limit 2")
      .all(carId) as PriceHistoryRow[];
    if (rows.length < 2 || rows[0].price_cents === rows[1].price_cents) {
      return undefined;
    }

    const delta = rows[0].price_cents - rows[1].price_cents;
    return {
      previousPrice: rows[1].price,
      currentPrice: rows[0].price,
      delta: formatDelta(delta),
      direction: delta > 0 ? "increase" : "decrease"
    };
  }

  private getPreviousPrice(carId: number, beforeHistoryId: number): PriceHistoryRow | undefined {
    return this.db
      .prepare("select * from car_price_history where car_id = ? and id < ? order by id desc limit 1")
      .get(carId, beforeHistoryId) as PriceHistoryRow | undefined;
  }

  private mergeCars(sourceId: number, targetId: number): number {
    this.db
      .prepare(
        `insert or ignore into saved_search_cars (
          search_id,
          car_id,
          active,
          first_seen_at,
          last_seen_at,
          removed_at,
          last_seen_price_cents
        )
        select search_id, ?, active, first_seen_at, last_seen_at, removed_at, last_seen_price_cents
        from saved_search_cars
        where car_id = ?`
      )
      .run(targetId, sourceId);
    this.db.prepare("update car_price_history set car_id = ? where car_id = ?").run(targetId, sourceId);
    this.db.prepare("update car_status_history set car_id = ? where car_id = ?").run(targetId, sourceId);
    this.db
      .prepare(
        `update cars
          set is_favorite = max(is_favorite, (select is_favorite from cars where id = ?)),
              favorited_at = coalesce(favorited_at, (select favorited_at from cars where id = ?)),
              unavailable_at = coalesce(unavailable_at, (select unavailable_at from cars where id = ?)),
              status_checked_at = coalesce(status_checked_at, (select status_checked_at from cars where id = ?)),
              detail_not_found_count = max(detail_not_found_count, (select detail_not_found_count from cars where id = ?))
        where id = ?`
      )
      .run(sourceId, sourceId, sourceId, sourceId, sourceId, targetId);
    this.db.prepare("delete from saved_search_cars where car_id = ?").run(sourceId);
    this.db.prepare("delete from car_details where car_id = ?").run(sourceId);
    this.db.prepare("delete from cars where id = ?").run(sourceId);
    return targetId;
  }
}

function normalizeFilters(input: SavedSearchInput): SearchFilters {
  return {
    categories: input.categories ?? [],
    modelGenerations: input.modelGenerations ?? [],
    equipment: input.equipment ?? [],
    maximumMileage: input.maximumMileage ?? 30_000
  };
}

function mapRow(row: SearchRow): SavedSearch {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    enabled: row.enabled === 1,
    filters: {
      categories: JSON.parse(row.categories_json) as string[],
      modelGenerations: JSON.parse(row.model_generations_json) as string[],
      equipment: JSON.parse(row.equipment_json) as string[],
      maximumMileage: row.maximum_mileage
    },
    defaultLimit: row.default_limit,
    maxPages: row.max_pages,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDetailRow(row: DetailRow): CarDetailData {
  return {
    detailUrl: row.detail_url,
    vin: row.vin ?? undefined,
    stockNumber: row.stock_number ?? undefined,
    status: "active",
    equipmentHighlights: JSON.parse(row.equipment_highlights_json) as string[],
    includedOptions: JSON.parse(row.included_options_json) as string[],
    featureMatches: JSON.parse(row.feature_matches_json) as CarDetailData["featureMatches"],
    fetchedAt: row.fetched_at
  };
}

function mapRunRow(row: SearchRunRow): SearchRunHistory {
  return {
    id: row.id,
    runType: row.run_type,
    searchId: row.search_id ?? undefined,
    searchName: row.search_name,
    searchSlug: row.search_slug,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    success: row.success === 1,
    durationMs: row.duration_ms,
    pagesFetched: row.pages_fetched,
    listingsCount: row.listings_count,
    removedCount: row.removed_count,
    sources: JSON.parse(row.sources_json) as FetchSource[],
    cacheHits: row.cache_hits,
    cacheMisses: row.cache_misses,
    httpPulls: row.http_pulls,
    playwrightPulls: row.playwright_pulls,
    error: row.error ?? undefined
  };
}

function parsePriceCents(price: string): number | undefined {
  const cleaned = price.replace(/[^\d.]/g, "");
  if (!cleaned) {
    return undefined;
  }

  const dollars = Number(cleaned);
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : undefined;
}

function formatDelta(deltaCents: number): string {
  const sign = deltaCents > 0 ? "+" : "-";
  return `${sign}${formatMoney(Math.abs(deltaCents))}`;
}

function formatMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function buildIdentityKey(input: { vin?: string; stockNumber?: string; detailUrl?: string }): string {
  const vin = input.vin?.trim();
  if (vin) {
    return `vin:${vin.toUpperCase()}`;
  }

  const stockNumber = input.stockNumber?.trim();
  if (stockNumber) {
    return `stock:${stockNumber.toUpperCase()}`;
  }

  return `url:${normalizeUrl(input.detailUrl ?? "")}`;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function identityLabel(row: { vin: string | null; stock_number: string | null; detail_url: string }): string {
  if (row.vin) {
    return `(VIN ${row.vin})`;
  }
  if (row.stock_number) {
    return `(stock ${row.stock_number})`;
  }
  return `(${row.detail_url})`;
}
