import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { SearchStore } from "./db.js";
import type { PorscheSearchService } from "./porsche/search.js";
import { formatAddedFeatures, formatSearchRun } from "./porsche/format.js";
import { buildPorscheSearchUrl, buildSearchSummary } from "./porsche/url.js";
import { carAddedFeaturesInputSchema, inventoryChangesInputSchema, mcpSearchInputSchema } from "./validation.js";
import { toToolName } from "./slug.js";

type McpSession = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

export class PorscheMcpSessionManager {
  private sessions = new Map<string, McpSession>();

  constructor(
    private store: SearchStore,
    private searchService: PorscheSearchService
  ) {}

  async handlePost(req: Request, res: Response): Promise<void> {
    const sessionId = readSessionId(req);

    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Unknown MCP session."
          },
          id: null
        });
        return;
      }

      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: initialize required before tool calls."
        },
        id: null
      });
      return;
    }

    const server = createPorscheMcpServer(this.store, this.searchService);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (newSessionId) => {
        this.sessions.set(newSessionId, { server, transport });
      }
    });

    transport.onclose = () => {
      const initializedSessionId = transport.sessionId;
      if (initializedSessionId) {
        this.sessions.delete(initializedSessionId);
      }
    };

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      await server.close().catch(() => undefined);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal MCP server error."
          },
          id: null
        });
      }
    }
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    const sessionId = readSessionId(req);
    if (!sessionId) {
      res.status(400).json({ error: "Missing mcp-session-id header." });
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Unknown MCP session." });
      return;
    }

    await this.closeSession(sessionId, session);
    res.status(204).end();
  }

  handleGet(_req: Request, res: Response): void {
    res.status(405).set("Allow", "POST, DELETE").json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "GET streams are not used by this server. Use POST for JSON responses."
      },
      id: null
    });
  }

  async closeAll(): Promise<void> {
    const sessions = [...this.sessions.entries()];
    await Promise.all(sessions.map(([sessionId, session]) => this.closeSession(sessionId, session)));
  }

  private async closeSession(sessionId: string, session: McpSession): Promise<void> {
    this.sessions.delete(sessionId);
    await session.transport.close().catch(() => undefined);
    await session.server.close().catch(() => undefined);
  }
}

export function createPorscheMcpServer(store: SearchStore, searchService: PorscheSearchService): McpServer {
  const server = new McpServer(
    {
      name: "porsche-finder-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {},
        logging: {}
      }
    }
  );

  server.registerTool(
    "list_porsche_search_tools",
    {
      title: "List Porsche 911 search tools",
      description: "List enabled saved Porsche Finder 911 searches and their MCP tool names."
    },
    async () => {
      const searches = store.listEnabled();
      const text =
        searches.length === 0
          ? "No enabled Porsche search tools exist yet. Create one in the admin UI."
          : searches
              .map((search) => {
                return [
                  `${toToolName(search.slug)}: ${search.name}`,
                  `Description: ${search.description || buildSearchSummary(search)}`,
                  `Filters: ${buildSearchSummary(search)}`,
                  `URL: ${buildPorscheSearchUrl(search.filters)}`
                ].join("\n");
              })
              .join("\n\n");

      return {
        content: [{ type: "text", text }]
      };
    }
  );

  server.registerTool(
    "list_porsche_inventory_changes",
    {
      title: "List Porsche inventory changes",
      description: "Show recent Porsche Finder cached price changes and search-specific removals.",
      inputSchema: inventoryChangesInputSchema
    },
    async ({ limit }) => {
      return {
        content: [{ type: "text", text: searchService.listInventoryChanges(limit) }]
      };
    }
  );

  server.registerTool(
    "get_porsche_car_added_features",
    {
      title: "Get Porsche car added features",
      description: "Show cached added/non-standard features for one Porsche Finder car by cache ID, VIN, stock number, or detail URL.",
      inputSchema: carAddedFeaturesInputSchema
    },
    async ({ carId, vin, stockNumber, detailUrl, refresh }) => {
      if (!carId && !vin && !stockNumber && !detailUrl) {
        return {
          isError: true,
          content: [{ type: "text", text: "Provide one of carId, vin, stockNumber, or detailUrl." }]
        };
      }

      try {
        const matches = await searchService.getCarAddedFeatures({ carId, vin, stockNumber, detailUrl, refresh });
        if (matches.length === 0) {
          return {
            content: [{ type: "text", text: "No cached Porsche car matched that identifier." }]
          };
        }

        if (matches.length > 1) {
          return {
            content: [
              {
                type: "text",
                text: [
                  "Multiple cached cars matched. Use carId to choose one.",
                  ...matches.map((car) => {
                    return `${car.id}: ${car.title} ${car.vin ? `VIN ${car.vin}` : ""} ${
                      car.stockNumber ? `stock ${car.stockNumber}` : ""
                    } ${car.link}`;
                  })
                ].join("\n")
              }
            ]
          };
        }

        return {
          content: [{ type: "text", text: formatAddedFeatures(matches[0]) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: error instanceof Error ? error.message : "Added-feature lookup failed." }]
        };
      }
    }
  );

  for (const search of store.listEnabled()) {
    server.registerTool(
      toToolName(search.slug),
      {
        title: search.name,
        description: search.description || buildSearchSummary(search),
        inputSchema: mcpSearchInputSchema
      },
      async ({ limit, pages, refresh }) => {
        try {
          const result = await searchService.run(search, { limit, pages, refresh });
          return {
            content: [{ type: "text", text: formatSearchRun(result) }]
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: error instanceof Error ? error.message : "Porsche Finder search failed."
              }
            ]
          };
        }
      }
    );
  }

  return server;
}

function readSessionId(req: Request): string | undefined {
  const value = req.header("mcp-session-id");
  return value || undefined;
}
