import type { SearchRunResult } from "../types.js";
import { buildSearchSummary } from "./url.js";

export function formatSearchRun(result: SearchRunResult): string {
  const header = [
    `${result.search.name}`,
    buildSearchSummary(result.search),
    `Fetched ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"} from ${[...new Set(result.sources)].join(", ")}.`,
    `Search URL: ${result.url}`
  ].join("\n");

  if (result.listings.length === 0) {
    return `${header}\n\nNo matching cars found.`;
  }

  const cars = result.listings.map((listing, index) => {
    return [
      `${index + 1}. ${listing.title}`,
      `   Color: ${listing.color.exterior} / ${listing.color.interior}`,
      `   Mileage: ${listing.mileage}`,
      `   Price: ${listing.price}`,
      `   Location: ${listing.location}`,
      `   Link: ${listing.link || "Unknown"}`
    ].join("\n");
  });

  return `${header}\n\n${cars.join("\n\n")}`;
}
