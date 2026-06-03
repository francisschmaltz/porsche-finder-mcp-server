import type { SavedSearch, SearchFilters } from "../types.js";
import {
  CATEGORY_OPTIONS,
  EQUIPMENT_OPTIONS,
  MODEL_GENERATION_OPTIONS
} from "../options.js";

export const PORSCHE_SEARCH_BASE_URL = "https://finder.porsche.com/us/en-US/search/911";

export const FIXED_SEARCH_PARAMS = {
  model: "911",
  condition: "porsche_approved",
  position: "94611,37.82475,-122.23235,-1",
  order: "price_asc"
} as const;

export function buildPorscheSearchUrl(filters: SearchFilters, page = 1): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(FIXED_SEARCH_PARAMS)) {
    parts.push(formatQueryParam(key, value, key === "position"));
  }

  for (const category of filters.categories) {
    parts.push(formatQueryParam("category", category));
  }

  for (const generation of filters.modelGenerations) {
    parts.push(formatQueryParam("model-generation", generation));
  }

  for (const equipment of filters.equipment) {
    parts.push(formatQueryParam("equipment", equipment));
  }

  parts.push(formatQueryParam("maximum-mileage", String(filters.maximumMileage)));

  if (page > 1) {
    parts.push(formatQueryParam("page", String(page)));
  }

  return `${PORSCHE_SEARCH_BASE_URL}?${parts.join("&")}`;
}

export function buildSearchSummary(search: SavedSearch): string {
  const parts = [
    labelsFor(search.filters.categories, CATEGORY_OPTIONS),
    labelsFor(search.filters.modelGenerations, MODEL_GENERATION_OPTIONS),
    labelsFor(search.filters.equipment, EQUIPMENT_OPTIONS),
    `max ${search.filters.maximumMileage.toLocaleString("en-US")} mi`
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("; ") : "All CPO 911 listings nationwide, sorted by lowest price.";
}

function labelsFor(values: string[], options: { value: string; label: string }[]): string {
  if (values.length === 0) {
    return "";
  }

  const labels = values.map((value) => options.find((item) => item.value === value)?.label ?? value);
  return labels.join(", ");
}

function formatQueryParam(key: string, value: string, rawValue = false): string {
  const formattedValue = rawValue ? value : encodeURIComponent(value);
  return `${encodeURIComponent(key)}=${formattedValue}`;
}
