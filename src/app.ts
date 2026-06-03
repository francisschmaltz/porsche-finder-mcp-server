import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Express, Request, Response } from "express";
import { ZodError } from "zod/v4";
import type { AppConfig } from "./config.js";
import { CATEGORY_OPTIONS, EQUIPMENT_OPTIONS, MODEL_GENERATION_OPTIONS } from "./options.js";
import { SearchStore } from "./db.js";
import { PorscheMcpSessionManager } from "./mcp.js";
import { isAuthorized, requireBearerAuth } from "./auth.js";
import { renderAdminPage } from "./adminPage.js";
import { HybridPorscheFetcher, type PorschePageFetcher } from "./porsche/fetcher.js";
import { PorscheSearchService } from "./porsche/search.js";
import { formatSearchRun } from "./porsche/format.js";
import { buildPorscheSearchUrl, buildSearchSummary } from "./porsche/url.js";
import { toToolName } from "./slug.js";
import { idParamSchema, previewInputSchema, savedSearchInputSchema } from "./validation.js";
import type { SavedSearch } from "./types.js";

export type AppHandle = {
  app: Express;
  store: SearchStore;
  searchService: PorscheSearchService;
  mcpSessions: PorscheMcpSessionManager;
  close(): Promise<void>;
};

export type CreateAppOptions = {
  fetcher?: PorschePageFetcher;
};

export function createApp(config: AppConfig, options: CreateAppOptions = {}): AppHandle {
  const app = createMcpExpressApp({ host: config.host });
  const store = new SearchStore(config.databasePath);
  const fetcher = options.fetcher ?? new HybridPorscheFetcher(config);
  const searchService = new PorscheSearchService(fetcher, config.cacheTtlMs);
  const mcpSessions = new PorscheMcpSessionManager(store, searchService);
  const requireAuth = requireBearerAuth(config.authToken);

  app.get("/", (_req, res) => {
    res.redirect("/admin");
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/admin", (req, res) => {
    const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
    if (!isAuthorized(req, config.authToken) && queryToken !== config.authToken) {
      res
        .status(401)
        .type("text/plain")
        .send("Missing bearer token. Open /admin?token=<AUTH_TOKEN> from a browser.");
      return;
    }

    res.type("html").send(renderAdminPage());
  });

  app.post("/mcp/v1", requireAuth, asyncRoute((req, res) => mcpSessions.handlePost(req, res)));
  app.get("/mcp/v1", requireAuth, (req, res) => mcpSessions.handleGet(req, res));
  app.delete("/mcp/v1", requireAuth, asyncRoute((req, res) => mcpSessions.handleDelete(req, res)));

  app.get("/api/options", requireAuth, (_req, res) => {
    res.json({
      categories: CATEGORY_OPTIONS,
      modelGenerations: MODEL_GENERATION_OPTIONS,
      equipment: EQUIPMENT_OPTIONS
    });
  });

  app.get("/api/searches", requireAuth, (_req, res) => {
    res.json({ searches: store.list().map(presentSearch) });
  });

  app.post(
    "/api/searches",
    requireAuth,
    asyncRoute(async (req, res) => {
      const input = savedSearchInputSchema.parse(req.body);
      const search = store.create(input);
      await mcpSessions.closeAll();
      res.status(201).json({ search: presentSearch(search) });
    })
  );

  app.put(
    "/api/searches/:id",
    requireAuth,
    asyncRoute(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const input = savedSearchInputSchema.parse(req.body);
      const search = store.update(id, input);

      if (!search) {
        res.status(404).json({ error: "Saved search not found." });
        return;
      }

      await mcpSessions.closeAll();
      res.json({ search: presentSearch(search) });
    })
  );

  app.delete(
    "/api/searches/:id",
    requireAuth,
    asyncRoute(async (req, res) => {
      const { id } = idParamSchema.parse(req.params);
      const deleted = store.delete(id);
      if (!deleted) {
        res.status(404).json({ error: "Saved search not found." });
        return;
      }

      await mcpSessions.closeAll();
      res.status(204).end();
    })
  );

  app.post(
    "/api/searches/preview",
    requireAuth,
    asyncRoute(async (req, res) => {
      const input = previewInputSchema.parse(req.body);
      const ephemeral: SavedSearch = {
        id: 0,
        name: input.name,
        slug: input.slug || "preview",
        description: input.description,
        enabled: input.enabled,
        filters: {
          categories: input.categories,
          modelGenerations: input.modelGenerations,
          equipment: input.equipment,
          maximumMileage: input.maximumMileage
        },
        defaultLimit: input.defaultLimit,
        maxPages: input.maxPages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const result = await searchService.run(ephemeral, {
        limit: input.limit,
        pages: input.pages,
        refresh: input.refresh
      });

      res.json({
        text: formatSearchRun(result),
        listings: result.listings,
        url: result.url
      });
    })
  );

  app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ")
      });
      return;
    }

    const status = error instanceof Error && /Slug already exists/.test(error.message) ? 409 : 400;
    res.status(status).json({
      error: error instanceof Error ? error.message : "Request failed."
    });
  });

  return {
    app,
    store,
    searchService,
    mcpSessions,
    async close() {
      await mcpSessions.closeAll();
      store.close();
    }
  };
}

function presentSearch(search: SavedSearch) {
  return {
    ...search,
    toolName: toToolName(search.slug),
    url: buildPorscheSearchUrl(search.filters),
    summary: buildSearchSummary(search)
  };
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: (error?: unknown) => void) => {
    handler(req, res).catch(next);
  };
}
