import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("defaults search cache to 15 minutes and car status cache to 24 hours", () => {
    const oldCache = process.env.CACHE_TTL_SECONDS;
    const oldStatusCache = process.env.CAR_STATUS_CACHE_TTL_SECONDS;

    try {
      delete process.env.CACHE_TTL_SECONDS;
      delete process.env.CAR_STATUS_CACHE_TTL_SECONDS;
      const config = loadConfig();

      expect(config.cacheTtlMs).toBe(900_000);
      expect(config.carStatusCacheTtlMs).toBe(86_400_000);
    } finally {
      if (oldCache === undefined) {
        delete process.env.CACHE_TTL_SECONDS;
      } else {
        process.env.CACHE_TTL_SECONDS = oldCache;
      }

      if (oldStatusCache === undefined) {
        delete process.env.CAR_STATUS_CACHE_TTL_SECONDS;
      } else {
        process.env.CAR_STATUS_CACHE_TTL_SECONDS = oldStatusCache;
      }
    }
  });
});
