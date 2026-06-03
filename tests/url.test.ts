import { describe, expect, it } from "vitest";
import { buildPorscheSearchUrl, FIXED_SEARCH_PARAMS } from "../src/porsche/url.js";

describe("buildPorscheSearchUrl", () => {
  it("preserves fixed params and repeated configurable params", () => {
    const href = buildPorscheSearchUrl({
      categories: ["911-carrera-s-coupe", "911-carrera-t"],
      modelGenerations: ["992", "991-2"],
      equipment: ["sport-chrono-package", "bose-sound-system"],
      maximumMileage: 30_000
    });
    const url = new URL(href);

    expect(url.searchParams.get("model")).toBe(FIXED_SEARCH_PARAMS.model);
    expect(url.searchParams.get("condition")).toBe(FIXED_SEARCH_PARAMS.condition);
    expect(url.searchParams.get("position")).toBe(FIXED_SEARCH_PARAMS.position);
    expect(href).toContain("position=94611,37.82475,-122.23235,-1&order=price_asc");
    expect(url.searchParams.get("order")).toBe(FIXED_SEARCH_PARAMS.order);
    expect(url.searchParams.getAll("category")).toEqual(["911-carrera-s-coupe", "911-carrera-t"]);
    expect(url.searchParams.getAll("model-generation")).toEqual(["992", "991-2"]);
    expect(url.searchParams.getAll("equipment")).toEqual(["sport-chrono-package", "bose-sound-system"]);
    expect(url.searchParams.get("maximum-mileage")).toBe("30000");
  });

  it("adds page only when page is greater than one", () => {
    const filters = { categories: [], modelGenerations: [], equipment: [], maximumMileage: 30_000 };
    expect(new URL(buildPorscheSearchUrl(filters)).searchParams.has("page")).toBe(false);
    expect(new URL(buildPorscheSearchUrl(filters, 2)).searchParams.get("page")).toBe("2");
  });
});
