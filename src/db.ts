import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { SavedSearch, SavedSearchInput, SearchFilters } from "./types.js";
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
