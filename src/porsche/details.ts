import type { CarDetailData, CarStatusData } from "../types.js";
import { htmlToVisibleText } from "./parser.js";
import { detectFeatureMatches } from "./features.js";

const SECTION_HEADINGS = new Set([
  "Packages",
  "Exterior",
  "Transmission / Chassis",
  "Wheels",
  "Interior",
  "Interior Leather",
  "Interior Aluminum",
  "Audio / Communication",
  "Lights",
  "Comfort Assistance",
  "Engine",
  "Engine features",
  "Performance and Transmission",
  "Chassis",
  "Safety and Security",
  "Audio",
  "Communication",
  "Comfort",
  "Assistance Systems"
]);

const SECTION_STOP_PATTERN =
  /^(Standard Equipment|Important Resources|Build Sheet|Window Sticker|Technical Data|Contact Dealership|Explore Payment|Save)$/i;

export function parsePorscheDetails(input: {
  html: string;
  visibleText?: string;
  detailUrl: string;
  fetchedAt?: string;
}): CarDetailData {
  const lines = splitVisibleLines(input.visibleText ?? htmlToVisibleText(input.html));
  const equipmentHighlights = collectSection(lines, "Equipment Highlights", ["Included Options", "Standard Equipment"]);
  const includedOptions = collectIncludedOptions(lines);
  const addedFeatureLines = unique([...equipmentHighlights, ...includedOptions]);
  const fetchedAt = input.fetchedAt ?? new Date().toISOString();
  const status = parsePorscheStatus({
    html: input.html,
    visibleText: lines.join("\n"),
    detailUrl: input.detailUrl,
    checkedAt: fetchedAt
  });

  return {
    detailUrl: input.detailUrl,
    vin: findLabeledValue(lines, "VIN"),
    stockNumber: findLabeledValue(lines, "Stock Number"),
    status: status.status,
    price: status.price,
    equipmentHighlights,
    includedOptions,
    featureMatches: detectFeatureMatches(addedFeatureLines),
    fetchedAt
  };
}

export function parsePorscheStatus(input: {
  html: string;
  visibleText?: string;
  detailUrl: string;
  checkedAt?: string;
}): CarStatusData {
  const lines = splitVisibleLines(input.visibleText ?? htmlToVisibleText(input.html));

  return {
    detailUrl: input.detailUrl,
    status: isUnavailable(lines) ? "unavailable" : "active",
    price: findPrice(lines),
    checkedAt: input.checkedAt ?? new Date().toISOString()
  };
}

export function splitVisibleLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)
    .filter((line, index, lines) => index === 0 || line !== lines[index - 1]);
}

function findLabeledValue(lines: string[], label: string): string | undefined {
  const exactPattern = new RegExp(`^${escapeRegExp(label)}:?$`, "i");
  const inlinePattern = new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, "i");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const inline = line.match(inlinePattern);
    if (inline?.[1]) {
      return inline[1].trim();
    }

    if (exactPattern.test(line)) {
      return lines[index + 1]?.trim();
    }
  }

  return undefined;
}

function collectSection(lines: string[], startLabel: string, stopLabels: string[]): string[] {
  const startIndex = lines.findIndex((line) => line.toLowerCase() === startLabel.toLowerCase());
  if (startIndex === -1) {
    return [];
  }

  const stopSet = new Set(stopLabels.map((label) => label.toLowerCase()));
  const collected: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const normalized = line.toLowerCase();

    if (stopSet.has(normalized) || SECTION_STOP_PATTERN.test(line)) {
      break;
    }

    if (isUsefulOptionLine(line)) {
      collected.push(line);
    }
  }

  return unique(collected);
}

function collectIncludedOptions(lines: string[]): string[] {
  const startIndex = lines.findIndex((line) => line.toLowerCase() === "included options");
  if (startIndex === -1) {
    return [];
  }

  const collected: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^Standard Equipment$/i.test(line) || SECTION_STOP_PATTERN.test(line)) {
      break;
    }

    if (isUsefulOptionLine(line)) {
      collected.push(line);
    }
  }

  return unique(collected);
}

function isUsefulOptionLine(line: string): boolean {
  if (SECTION_HEADINGS.has(line)) {
    return false;
  }

  return !/^(Includes \d+ upgrade|This list might show equipment|Note:|The following list shows|Open Gallery|\d+ Images)$/i.test(line);
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isUnavailable(lines: string[]): boolean {
  return lines.some((line) => {
    return /^(sold|unavailable|not available|no longer available)$/i.test(line) ||
      /vehicle (?:is )?(?:sold|unavailable|not available|no longer available)/i.test(line) ||
      /this (?:vehicle|car) (?:is )?(?:sold|unavailable|not available|no longer available)/i.test(line);
  });
}

function findPrice(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(/\$[\d,]+(?:\.\d{2})?/);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
