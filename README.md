# Porsche Finder MCP

TypeScript Express MCP server for saved Porsche Finder 911 searches.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open the admin UI at `http://127.0.0.1:3333/admin?token=change-me`, replacing `change-me` with the bearer token from `.env`.

Open WebUI should be configured as:

- Type: MCP (Streamable HTTP)
- URL: `http://127.0.0.1:3333/mcp/v1`
- Auth: Bearer token

To inspect the exact MCP HTTP responses in an interactive terminal:

```bash
npm run mcp:test
```

Use the numbered menu to enter the token, connect, list tools, and call tools by number.

## Notes

The fetcher tries HTTP first, then uses a persistent Playwright profile if Porsche Finder blocks direct requests. By default, point `PLAYWRIGHT_EXECUTABLE_PATH` at your installed Chrome so you do not need Playwright's downloaded browser. This project does not bypass bot checks; if Porsche asks for browser verification, complete it in that browser profile and retry.
