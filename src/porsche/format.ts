import type { CachedCar, SearchRunResult } from "../types.js";
import { formatFeatureSummary } from "./features.js";
import { buildSearchSummary } from "./url.js";

export function formatSearchRun(result: SearchRunResult): string {
  const header = [
    `${result.search.name}`,
    buildSearchSummary(result.search),
    `Fetched ${result.pagesFetched} page${result.pagesFetched === 1 ? "" : "s"} from ${[...new Set(result.sources)].join(", ")}.`,
    `Search URL: ${result.url}`
  ].join("\n");

  if (result.listings.length === 0) {
    return `${header}\n\nNo matching cars found.${formatRemovedSection(result)}`;
  }

  const cars = result.listings.map((listing, index) => formatCachedCar(listing, index + 1));

  return `${header}\n\n${cars.join("\n\n")}${formatRemovedSection(result)}`;
}

export function formatCachedCar(car: CachedCar, index?: number): string {
  const heading = index ? `${index}. ${car.title}` : car.title;
  const detailLines = [
    heading,
    `   Cache ID: ${car.id || "preview"}`,
    car.vin ? `   VIN: ${car.vin}` : undefined,
    car.stockNumber ? `   Stock: ${car.stockNumber}` : undefined,
    `   Favorite: ${car.isFavorite ? "yes" : "no"}`,
    `   Status: ${car.status}`,
    car.unavailableAt ? `   Unavailable since: ${car.unavailableAt}` : undefined,
    `   Color: ${car.color.exterior} / ${car.color.interior}`,
    `   Mileage: ${car.mileage}`,
    `   Price: ${car.price}`,
    car.priceChange ? `   Price change: ${car.priceChange.delta} (${car.priceChange.direction})` : undefined,
    `   Location: ${car.location}`,
    `   Link: ${car.link || "Unknown"}`,
    car.details ? `   Features: ${formatFeatureSummary(car.details.featureMatches)}` : undefined,
    car.detailError ? `   Detail cache: ${car.detailError}` : undefined
  ].filter(Boolean) as string[];

  if (car.details?.featureMatches.length) {
    detailLines.push("   Matched feature lines:");
    for (const match of car.details.featureMatches) {
      detailLines.push(`      ${match.label}: ${match.matchedLines.join("; ")}`);
    }
  }

  if (car.details?.includedOptions.length) {
    detailLines.push("   Included Options:");
    for (const option of car.details.includedOptions.slice(0, 12)) {
      detailLines.push(`      - ${option}`);
    }
    if (car.details.includedOptions.length > 12) {
      detailLines.push(`      - ...${car.details.includedOptions.length - 12} more`);
    }
  }

  return detailLines.join("\n");
}

export function formatFavorites(cars: CachedCar[]): string {
  if (cars.length === 0) {
    return "No favorite cars yet.";
  }

  return ["Favorite cars", ...cars.map((car, index) => formatCachedCar(car, index + 1))].join("\n\n");
}

export function formatAddedFeatures(car: CachedCar): string {
  if (!car.details) {
    return `${car.title}\n\nNo cached details found for this car.`;
  }

  const lines = [
    car.title,
    `Cache ID: ${car.id}`,
    car.vin ? `VIN: ${car.vin}` : undefined,
    car.stockNumber ? `Stock: ${car.stockNumber}` : undefined,
    `Link: ${car.link}`,
    "",
    `Feature summary: ${formatFeatureSummary(car.details.featureMatches)}`,
    "",
    "Equipment Highlights:",
    ...(car.details.equipmentHighlights.length ? car.details.equipmentHighlights.map((line) => `- ${line}`) : ["- None cached"]),
    "",
    "Included Options:",
    ...(car.details.includedOptions.length ? car.details.includedOptions.map((line) => `- ${line}`) : ["- None cached"]),
    "",
    "Matched target features:",
    ...formatMatchedFeatureLines(car)
  ].filter((line) => line !== undefined) as string[];

  return lines.join("\n");
}

function formatRemovedSection(result: SearchRunResult): string {
  if (result.removedListings.length === 0) {
    return "";
  }

  const lines = result.removedListings.map((removed, index) => {
    return [
      `${index + 1}. ${removed.car.title}`,
      `   Removed: ${removed.removedAt}`,
      `   Last seen in this search: ${removed.lastSeenAt}`,
      `   Price: ${removed.car.price}`,
      `   Link: ${removed.car.link}`
    ].join("\n");
  });

  return `\n\nRemoved from this search since last run:\n${lines.join("\n\n")}`;
}

function formatMatchedFeatureLines(car: CachedCar): string[] {
  if (!car.details?.featureMatches.length) {
    return ["- None detected"];
  }

  return car.details.featureMatches.map((match) => `- ${match.label}: ${match.matchedLines.join("; ")}`);
}
