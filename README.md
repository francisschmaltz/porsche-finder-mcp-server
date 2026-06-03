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

The fetcher tries HTTP first, then uses a persistent Playwright profile if Porsche Finder blocks direct requests. WebKit is the default because it avoids a Google browser while staying close to Safari.

For WebKit setup:

```bash
npx playwright install webkit
```

Use these browser settings:

```env
PLAYWRIGHT_BROWSER=webkit
PLAYWRIGHT_PROFILE_DIR=./data/playwright-profile
PLAYWRIGHT_EXECUTABLE_PATH=
PLAYWRIGHT_HEADLESS=false
```

`webkit` is Safari-like, not your installed Safari. Do not point `PLAYWRIGHT_EXECUTABLE_PATH` at `/Applications/Safari.app`; Playwright does not drive Safari.app that way. In WebKit mode this server ignores `PLAYWRIGHT_EXECUTABLE_PATH`.

If you ever want to use installed Chrome instead, set:

```env
PLAYWRIGHT_BROWSER=chromium
PLAYWRIGHT_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

This project does not bypass bot checks; if Porsche asks for browser verification, complete it in the Playwright browser profile and retry.
