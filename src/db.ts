import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type {
  CachedCar,
  CarDetailData,
  CarListing,
  PriceChange,
  RemovedSearchCar,
  SavedSearch,
  SavedSearchInput,
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
  status: "active" | "sold" | "unavailable";
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

type SearchCarRow = {
  search_id: number;
  car_id: number;
  active: 0 | 1;
  first_seen_at: string;
  last_seen_at: string;
  removed_at: string | null;
  last_seen_price_cents: number | null;
};

export type InventoryUpsertResult = {
  car: CachedCar;
  priceChanged: boolean;
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
            status
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
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
              status = 'active'
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

    return this.getCachedCarById(targetId)!;
  }

  getCachedCarById(id: number): CachedCar | undefined {
    const row = this.getCarRowById(id);
    return row ? this.mapCarRow(row) : undefined;
  }

  findCachedCars(locator: { carId?: number; vin?: string; stockNumber?: string; detailUrl?: string }): CachedCar[] {
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

    return [`Recent price history`, priceText, ``, `Recent search removals`, removedText].join("\n");
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
        status text not null default 'active'
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
    `);

    const columns = this.db.prepare("pragma table_info(search_tools)").all() as Array<{ name: string }>;
    const columnNames = new Set(columns.map((column) => column.name));
    if (!columnNames.has("maximum_mileage")) {
      this.db.exec("alter table search_tools add column maximum_mileage integer not null default 30000");
    }
  }

  private prepareSlug(name: string, explicitSlug?: string): string {
    const base = slugify(explicitSlug || name);
    assertValidSlug(base);
    this.assertSlugAvailable(base);
    return base;
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
    equipmentHighlights: JSON.parse(row.equipment_highlights_json) as string[],
    includedOptions: JSON.parse(row.included_options_json) as string[],
    featureMatches: JSON.parse(row.feature_matches_json) as CarDetailData["featureMatches"],
    fetchedAt: row.fetched_at
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
