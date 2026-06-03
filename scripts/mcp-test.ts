import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type RawMcpResponse = {
  status: number;
  sessionId?: string;
  body: string;
  json?: unknown;
};

type McpTool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: unknown;
};

type TesterState = {
  endpoint: string;
  token: string;
  sessionId?: string;
  tools: McpTool[];
  nextRequestId: number;
};

const rl = createInterface({ input, output });
const state: TesterState = {
  endpoint: process.env.MCP_URL ?? "http://127.0.0.1:3333/mcp/v1",
  token: process.env.AUTH_TOKEN ?? "",
  tools: [],
  nextRequestId: 1
};

try {
  console.log("Porsche Finder MCP terminal tester");
  console.log("Raw MCP HTTP responses are printed after each command.");

  let done = false;
  while (!done) {
    printMenu();
    const choice = await ask("Choose", "4");

    try {
      switch (choice) {
        case "1":
          await enterToken();
          break;
        case "2":
          await setEndpoint();
          break;
        case "3":
          await connect();
          break;
        case "4":
          await listTools();
          break;
        case "5":
          await callToolByNumber();
          break;
        case "6":
          await callToolByName();
          break;
        case "7":
          showConfig();
          break;
        case "8":
        case "q":
        case "quit":
          done = true;
          break;
        default:
          console.log("Unknown option. Pick a number, not a manifesto.");
      }
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} finally {
  rl.close();
}

function printMenu(): void {
  console.log("\n=== MCP Tester ===");
  console.log(`Endpoint: ${state.endpoint}`);
  console.log(`Token: ${state.token ? "<set>" : "<missing>"}`);
  console.log(`Session: ${state.sessionId ?? "<not connected>"}`);
  console.log("");
  console.log("1. Enter token");
  console.log("2. Set endpoint");
  console.log("3. Connect / reconnect");
  console.log("4. List tools");
  console.log("5. Call tool by number");
  console.log("6. Call tool by name");
  console.log("7. Show config");
  console.log("8. Quit");
}

async function enterToken(): Promise<void> {
  state.token = await ask("Bearer token", state.token);
  state.sessionId = undefined;
  state.tools = [];
  console.log("Token saved for this terminal session.");
}

async function setEndpoint(): Promise<void> {
  state.endpoint = await ask("MCP endpoint", state.endpoint);
  state.sessionId = undefined;
  state.tools = [];
  console.log("Endpoint saved for this terminal session.");
}

async function connect(): Promise<void> {
  requireToken();
  state.sessionId = undefined;
  state.tools = [];

  const initialize = await postMcp(undefined, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: {
        name: "porsche-finder-terminal-test",
        version: "0.1.0"
      }
    }
  });
  printResponse("initialize", initialize);

  if (!initialize.sessionId) {
    throw new Error("Server did not return an mcp-session-id header.");
  }

  state.sessionId = initialize.sessionId;

  const initialized = await postMcp(state.sessionId, {
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {}
  });
  printResponse("notifications/initialized", initialized);
}

async function listTools(): Promise<void> {
  await ensureConnected();

  const response = await postMcp(state.sessionId, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/list",
    params: {}
  });
  printResponse("tools/list", response);

  state.tools = extractTools(response);
  printTools(state.tools);
}

async function callToolByNumber(): Promise<void> {
  await ensureConnected();
  if (state.tools.length === 0) {
    await listTools();
  }

  if (state.tools.length === 0) {
    console.log("No tools are available.");
    return;
  }

  printTools(state.tools);
  const rawIndex = await ask("Tool number", "1");
  const index = Number(rawIndex) - 1;
  const tool = state.tools[index];

  if (!tool) {
    throw new Error(`No tool at number ${rawIndex}.`);
  }

  await callTool(tool.name);
}

async function callToolByName(): Promise<void> {
  await ensureConnected();
  const toolName = await ask("Tool name", "list_porsche_search_tools");
  await callTool(toolName);
}

async function callTool(toolName: string): Promise<void> {
  const defaultArgs = toolName === "list_porsche_search_tools" ? "{}" : "{\"limit\":5,\"pages\":1,\"refresh\":true}";
  const argsText = await ask("Tool arguments JSON", defaultArgs);
  const toolArguments = parseToolArguments(argsText);

  const response = await postMcp(state.sessionId, {
    jsonrpc: "2.0",
    id: nextId(),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: toolArguments
    }
  });
  printResponse(`tools/call ${toolName}`, response);
  printToolText(response);
}

function showConfig(): void {
  console.log("\n--- config ---");
  console.log(`Endpoint: ${state.endpoint}`);
  console.log(`Token set: ${state.token ? "yes" : "no"}`);
  console.log(`Session: ${state.sessionId ?? "<not connected>"}`);
  console.log(`Tools loaded: ${state.tools.length}`);
}

async function ensureConnected(): Promise<void> {
  if (!state.sessionId) {
    await connect();
  }
}

async function ask(label: string, fallback: string): Promise<string> {
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = await rl.question(`${label}${suffix}: `);
  return answer.trim() || fallback;
}

async function postMcp(sessionId: string | undefined, payload: unknown): Promise<RawMcpResponse> {
  requireToken();

  const headers: Record<string, string> = {
    "Accept": "application/json, text/event-stream",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${state.token}`
  };

  if (sessionId) {
    headers["mcp-session-id"] = sessionId;
  }

  const response = await fetch(state.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const body = await response.text();

  return {
    status: response.status,
    sessionId: response.headers.get("mcp-session-id") ?? undefined,
    body,
    json: parseJson(body)
  };
}

function printResponse(label: string, response: RawMcpResponse): void {
  console.log(`\n--- ${label} ---`);
  console.log(`HTTP ${response.status}`);
  if (response.sessionId) {
    console.log(`mcp-session-id: ${response.sessionId}`);
  }
  console.log(response.body || "<empty body>");
}

function printTools(tools: McpTool[]): void {
  console.log("\n--- tools ---");
  if (tools.length === 0) {
    console.log("No tools returned.");
    return;
  }

  tools.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.name}`);
    if (tool.title) {
      console.log(`   title: ${tool.title}`);
    }
    if (tool.description) {
      console.log(`   desc: ${tool.description}`);
    }
  });
}

function printToolText(response: RawMcpResponse): void {
  const maybeJson = response.json as
    | {
        result?: {
          content?: Array<{
            type?: string;
            text?: string;
          }>;
        };
      }
    | undefined;

  const text = maybeJson?.result?.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    return;
  }

  console.log("\n--- extracted tool text ---");
  console.log(text);
}

function extractTools(response: RawMcpResponse): McpTool[] {
  const maybeJson = response.json as
    | {
        result?: {
          tools?: McpTool[];
        };
      }
    | undefined;

  return Array.isArray(maybeJson?.result?.tools) ? maybeJson.result.tools : [];
}

function parseToolArguments(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value || "{}") as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function parseJson(body: string): unknown {
  if (!body) {
    return undefined;
  }

  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function requireToken(): void {
  if (!state.token) {
    throw new Error("Bearer token is required. Choose option 1 first.");
  }
}

function nextId(): number {
  const id = state.nextRequestId;
  state.nextRequestId += 1;
  return id;
}
