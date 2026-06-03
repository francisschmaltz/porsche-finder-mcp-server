import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { auth, FakeFetcher, testConfig } from "./helpers.js";

const mcpHeaders = {
  ...auth,
  Accept: "application/json, text/event-stream"
};

describe("MCP endpoint", () => {
  it("lists enabled dynamic tools and calls a saved search tool", async () => {
    const handle = createApp(testConfig(), { fetcher: new FakeFetcher() });

    try {
      await request(handle.app)
        .post("/api/searches")
        .set(auth)
        .send({
          name: "Carrera coupes",
          categories: ["911-carrera-coupe"],
          modelGenerations: ["992"],
          defaultLimit: 1,
          maxPages: 1
        })
        .expect(201);

      const init = await request(handle.app)
        .post("/mcp/v1")
        .set(mcpHeaders)
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: {
              name: "vitest",
              version: "0.0.0"
            }
          }
        })
        .expect(200);

      const sessionId = init.header["mcp-session-id"];
      expect(sessionId).toBeTruthy();

      await request(handle.app)
        .post("/mcp/v1")
        .set(mcpHeaders)
        .set("mcp-session-id", sessionId)
        .send({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {}
        })
        .expect(202);

      const listed = await request(handle.app)
        .post("/mcp/v1")
        .set(mcpHeaders)
        .set("mcp-session-id", sessionId)
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {}
        })
        .expect(200);

      const toolNames = listed.body.result.tools.map((tool: { name: string }) => tool.name);
      expect(toolNames).toContain("list_porsche_search_tools");
      expect(toolNames).toContain("porsche_911_carrera_coupes");

      const called = await request(handle.app)
        .post("/mcp/v1")
        .set(mcpHeaders)
        .set("mcp-session-id", sessionId)
        .send({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "porsche_911_carrera_coupes",
            arguments: {
              limit: 1,
              pages: 1,
              refresh: true
            }
          }
        })
        .expect(200);

      expect(called.body.result.content[0].text).toContain("2022 Porsche 911 Carrera 4S Coupe");
      expect(called.body.result.content[0].text).toContain("Link: https://finder.porsche.com");
    } finally {
      await handle.close();
    }
  });
});
