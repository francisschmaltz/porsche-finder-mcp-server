import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { FetchPageResult } from "../src/types.js";
import type { PorschePageFetcher } from "../src/porsche/fetcher.js";
import { auth, FakeFetcher, testConfig } from "./helpers.js";

describe("admin API", () => {
  it("creates, lists, previews, updates, and deletes saved searches", async () => {
    const handle = createApp(testConfig(), { fetcher: new FakeFetcher() });

    try {
      const created = await request(handle.app)
        .post("/api/searches")
        .set(auth)
        .send({
          name: "Carrera S coupes",
          description: "CPO Carrera S coupes near sanity.",
          categories: ["911-carrera-s-coupe"],
          modelGenerations: ["992"],
          equipment: ["sport-chrono-package"],
          defaultLimit: 5,
          maxPages: 1
        })
        .expect(201);

      expect(created.body.search.toolName).toBe("porsche_911_carrera_s_coupes");
      expect(created.body.search.url).toContain("category=911-carrera-s-coupe");
      expect(created.body.search.url).toContain("maximum-mileage=30000");
      expect(created.body.search.filters.maximumMileage).toBe(30_000);

      const listed = await request(handle.app).get("/api/searches").set(auth).expect(200);
      expect(listed.body.searches).toHaveLength(1);
      const id = created.body.search.id;

      const run = await request(handle.app).post(`/api/searches/${id}/run`).set(auth).send({}).expect(200);
      expect(run.body.listings[0].title).toBe("2022 Porsche 911 Carrera 4S Coupe");
      expect(run.body.listings[0].isFavorite).toBe(false);

      const favorited = await request(handle.app)
        .post("/api/cars/favorite")
        .set(auth)
        .send({ carId: run.body.listings[0].id })
        .expect(200);
      expect(favorited.body.car.isFavorite).toBe(true);

      const favorites = await request(handle.app).get("/api/cars/favorites").set(auth).expect(200);
      expect(favorites.body.favorites).toHaveLength(1);
      const overviewWithFavorite = await request(handle.app).get("/api/overview").set(auth).expect(200);
      expect(overviewWithFavorite.body.stats.favoriteCars).toBe(1);
      expect(overviewWithFavorite.body.favoritesPreview).toHaveLength(1);

      const unfavorited = await request(handle.app)
        .post("/api/cars/unfavorite")
        .set(auth)
        .send({ vin: "WP0AB2A99NS123456" })
        .expect(200);
      expect(unfavorited.body.car.isFavorite).toBe(false);

      const preview = await request(handle.app)
        .post("/api/searches/preview")
        .set(auth)
        .send({
          name: "",
          categories: ["911-carrera-coupe"],
          defaultLimit: 1,
          maxPages: 1
        })
        .expect(200);
      expect(preview.body.text).toContain("Preview Search");
      expect(preview.body.text).toContain("2022 Porsche 911 Carrera 4S Coupe");

      const updated = await request(handle.app)
        .put(`/api/searches/${id}`)
        .set(auth)
        .send({
          name: "Carrera S coupes",
          slug: "carrera_s",
          description: "Updated",
          enabled: false,
          categories: ["911-carrera-s-coupe"],
          maximumMileage: 45_000,
          defaultLimit: 3,
          maxPages: 1
        })
        .expect(200);
      expect(updated.body.search.enabled).toBe(false);
      expect(updated.body.search.toolName).toBe("porsche_911_carrera_s");
      expect(updated.body.search.url).toContain("maximum-mileage=45000");

      await request(handle.app).delete(`/api/searches/${id}`).set(auth).expect(204);
      const empty = await request(handle.app).get("/api/searches").set(auth).expect(200);
      expect(empty.body.searches).toEqual([]);
    } finally {
      await handle.close();
    }
  });

  it("records overview run history, cache metrics, pulls, and favorites", async () => {
    const handle = createApp(testConfig(), { fetcher: new FakeFetcher() });

    try {
      const created = await request(handle.app)
        .post("/api/searches")
        .set(auth)
        .send({
          name: "Carrera coupes",
          categories: ["911-carrera-coupe"],
          defaultLimit: 1,
          maxPages: 1
        })
        .expect(201);
      const id = created.body.search.id;

      const firstRun = await request(handle.app).post(`/api/searches/${id}/run`).set(auth).send({}).expect(200);
      await request(handle.app).post(`/api/searches/${id}/run`).set(auth).send({}).expect(200);
      await request(handle.app)
        .post("/api/searches/preview")
        .set(auth)
        .send({
          name: "Preview",
          categories: ["911-carrera-coupe"],
          defaultLimit: 1,
          maxPages: 1,
          refresh: true
        })
        .expect(200);
      await request(handle.app)
        .post("/api/cars/favorite")
        .set(auth)
        .send({ carId: firstRun.body.listings[0].id })
        .expect(200);

      const overview = await request(handle.app).get("/api/overview").set(auth).expect(200);
      expect(overview.body.stats).toMatchObject({
        savedSearches: 1,
        enabledSearches: 1,
        cachedCars: 1,
        favoriteCars: 1,
        totalRuns: 3,
        failedRuns: 0,
        cacheHits: 1,
        cacheMisses: 2,
        httpPulls: 3,
        playwrightPulls: 0
      });
      expect(overview.body.stats.lastRunAt).toBeTruthy();
      expect(overview.body.recentRuns).toHaveLength(3);
      expect(overview.body.recentRuns[0].runType).toBe("preview");
      expect(overview.body.recentRuns.map((run: { runType: string }) => run.runType)).toContain("saved_search");
      expect(overview.body.favoritesPreview[0].vin).toBe("WP0AB2A99NS123456");
    } finally {
      await handle.close();
    }
  });

  it("records failed runs in overview", async () => {
    const handle = createApp(testConfig(), { fetcher: new FailingFetcher() });

    try {
      const created = await request(handle.app)
        .post("/api/searches")
        .set(auth)
        .send({
          name: "Broken search",
          categories: ["911-carrera-coupe"],
          defaultLimit: 1,
          maxPages: 1
        })
        .expect(201);

      await request(handle.app).post(`/api/searches/${created.body.search.id}/run`).set(auth).send({}).expect(400);

      const overview = await request(handle.app).get("/api/overview").set(auth).expect(200);
      expect(overview.body.stats.totalRuns).toBe(1);
      expect(overview.body.stats.failedRuns).toBe(1);
      expect(overview.body.recentRuns[0]).toMatchObject({
        success: false,
        searchName: "Broken search",
        error: "Porsche fetch failed."
      });
    } finally {
      await handle.close();
    }
  });

  it("rejects missing auth", async () => {
    const handle = createApp(testConfig(), { fetcher: new FakeFetcher() });

    try {
      await request(handle.app).get("/api/searches").expect(401);
      await request(handle.app).get("/api/overview").expect(401);
    } finally {
      await handle.close();
    }
  });
});

class FailingFetcher implements PorschePageFetcher {
  async fetchPage(_url: string): Promise<FetchPageResult> {
    throw new Error("Porsche fetch failed.");
  }
}
