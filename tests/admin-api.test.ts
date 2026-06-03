import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
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

      const id = created.body.search.id;
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

  it("rejects missing auth", async () => {
    const handle = createApp(testConfig(), { fetcher: new FakeFetcher() });

    try {
      await request(handle.app).get("/api/searches").expect(401);
    } finally {
      await handle.close();
    }
  });
});
