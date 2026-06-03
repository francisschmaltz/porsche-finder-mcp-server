import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

const config = loadConfig();
const handle = createApp(config);

const server = handle.app.listen(config.port, config.host, () => {
  console.log(`Porsche Finder MCP listening on http://${config.host}:${config.port}`);
  console.log(`Admin UI: http://${config.host}:${config.port}/admin?token=${encodeURIComponent(config.authToken)}`);
  console.log(`MCP endpoint: http://${config.host}:${config.port}/mcp/v1`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Shutting down.`);
  server.close(async () => {
    await handle.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
