import * as cheerio from "cheerio";
import type { CarListing, ColorPair, ParsedPorschePage } from "../types.js";
import { PORSCHE_SEARCH_BASE_URL } from "./url.js";

const LISTING_TITLE_PATTERN = /^\d{4}\s+(?:Porsche\s+)?911\b/i;
const MILEAGE_PATTERN = /(\d[\d,]*)\s*mi\b/i;
const PRICE_PATTERN = /\$[\d,]+(?:\.\d{2})?/;
const IGNORE_LOCATION_PATTERN =
  /^(show details|save|compare|contact dealer|new|individualize|calculate monthly payment|retail price|estimated payment|view similar)$/i;

const INTERIOR_COLORS = [
  "Black/Bordeaux Red",
  "Bordeaux Red",
  "Truffle Brown",
  "Graphite Blue",
  "Slate Grey",
  "Agave Green",
  "Mojave Beige",
  "Luxor Beige",
  "Espresso",
  "Classic Cognac",
  "Iceland Green",
  "Chalk",
  "Black",
  "Red",
  "Beige",
  "Brown",
  "Gray",
  "Grey",
  "Blue",
  "White"
].sort((a, b) => b.length - a.length);

export function parsePorscheListings(input: {
  html: string;
  visibleText?: string;
  baseUrl?: string;
}): ParsedPorschePage {
  const baseUrl = input.baseUrl ?? PORSCHE_SEARCH_BASE_URL;
  const $ = cheerio.load(input.html);
  const lines = splitVisibleLines(input.visibleText ?? htmlToVisibleText(input.html));
  const titleIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => LISTING_TITLE_PATTERN.test(line));
  const detailLinks = collectDetailLinks($, baseUrl);

  const listings: CarListing[] = [];

  for (let i = 0; i < titleIndexes.length; i += 1) {
    const start = titleIndexes[i].index;
    const end = titleIndexes[i + 1]?.index ?? lines.length;
    const block = lines.slice(start, end);
    const listing = parseListingBlock(block, detailLinks[i] ?? "", $);

    if (listing) {
      listings.push(listing);
    }
  }

  return {
    listings: dedupeListings(listings),
    nextPageUrl: findNextPageUrl($, baseUrl)
  };
}

export function splitColor(raw: string): ColorPair {
  const normalized = cleanLine(raw);
  const slashMatch = normalized.match(/^(.+?)\s+\/\s+(.+)$/);
  if (slashMatch) {
    return {
      exterior: slashMatch[1].trim(),
      interior: slashMatch[2].trim(),
      raw: normalized
    };
  }

  const lower = normalized.toLowerCase();
  for (const interior of INTERIOR_COLORS) {
    const interiorLower = interior.toLowerCase();
    if (lower.endsWith(` ${interiorLower}`)) {
      return {
        exterior: normalized.slice(0, -interior.length).trim(),
        interior,
        raw: normalized
      };
    }
  }

  return {
    exterior: normalized || "Unknown",
    interior: "Unknown",
    raw: normalized
  };
}

export function htmlToVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  const blocks: string[] = [];
  const blockSelector = "h1,h2,h3,h4,p,li,td,th,dt,dd,button,a,span,div";
  $(blockSelector).each((_, element) => {
    const text = cleanLine($(element).text());
    if (text) {
      blocks.push(text);
    }
  });

  return blocks.join("\n");
}

function parseListingBlock(
  block: string[],
  fallbackLink: string,
  $: cheerio.CheerioAPI
): CarListing | undefined {
  const title = block[0];
  const detailsIndex = block.findIndex((line) => MILEAGE_PATTERN.test(line));
  const priceIndex = block.findIndex((line) => PRICE_PATTERN.test(line));

  if (!title || detailsIndex === -1 || priceIndex === -1) {
    return undefined;
  }

  const mileage = block[detailsIndex].match(MILEAGE_PATTERN)?.[0] ?? "Unknown";
  const price = block[priceIndex].match(PRICE_PATTERN)?.[0] ?? "Unknown";
  const colorRaw = findColorLine(block, detailsIndex);
  const location = findLocationLine(block, priceIndex);
  const link = fallbackLink || findDetailLinkNearTitle($, title) || "";

  return {
    title,
    color: splitColor(colorRaw),
    mileage,
    price,
    location,
    link
  };
}

function findColorLine(block: string[], detailsIndex: number): string {
  const start = Math.max(1, block.findIndex((line) => /certified pre-owned/i.test(line)) + 1);
  const candidates = block.slice(start, detailsIndex);
  return (
    candidates.find((line) => {
      return !/certified pre-owned|gasoline|automatic|manual|all-wheel|rear-wheel|hp\b|kw\b/i.test(line);
    }) ?? "Unknown"
  );
}

function findLocationLine(block: string[], priceIndex: number): string {
  const rawLocation =
    block.slice(priceIndex + 1).find((line) => {
      if (IGNORE_LOCATION_PATTERN.test(line)) {
        return false;
      }

      return /\bPorsche\b/i.test(line) || /,\s*[A-Z]{2}\b/.test(line);
    }) ?? "Unknown";

  return formatLocationLine(rawLocation);
}

export function formatLocationLine(raw: string): string {
  const location = cleanLine(raw);
  if (location === "Unknown" || location.includes(":")) {
    return location;
  }

  if (!/^Porsche\b/i.test(location)) {
    return location;
  }

  const stateZipMatch = location.match(/,\s*[A-Z]{2},\s*\d{5}(?:-\d{4})?$/);
  if (stateZipMatch?.index) {
    const dealerAndCity = location.slice(0, stateZipMatch.index).trim();
    const stateZip = location.slice(stateZipMatch.index).trim();
    const split = splitDealerAndCity(dealerAndCity);

    if (split) {
      return `${split.dealer}: ${split.city}${stateZip}`;
    }
  }

  const commaSplit = splitAtDealerComma(location);
  if (commaSplit) {
    return `${commaSplit.dealer}: ${commaSplit.city}`;
  }

  return location;
}

function splitDealerAndCity(value: string): { dealer: string; city: string } | undefined {
  const commaSplit = splitAtDealerComma(value);
  if (commaSplit) {
    return commaSplit;
  }

  const dealerBody = value.replace(/^Porsche\s+/i, "").trim();
  const gluedSplit = splitRepeatedText(dealerBody);
  if (gluedSplit) {
    return {
      dealer: `Porsche ${gluedSplit.first}`,
      city: gluedSplit.second
    };
  }

  const words = dealerBody.split(/\s+/);
  for (let index = 1; index < words.length; index += 1) {
    const dealerSuffix = words.slice(0, index).join(" ");
    const city = words.slice(index).join(" ");

    if (dealerSuffix.toLowerCase().endsWith(city.toLowerCase())) {
      return {
        dealer: `Porsche ${dealerSuffix}`,
        city
      };
    }
  }

  return undefined;
}

function splitAtDealerComma(value: string): { dealer: string; city: string } | undefined {
  const match = value.match(/^(Porsche\s+[^,]+),\s*(.+)$/i);
  if (!match) {
    return undefined;
  }

  return {
    dealer: match[1].trim(),
    city: match[2].trim()
  };
}

function splitRepeatedText(value: string): { first: string; second: string } | undefined {
  if (value.length % 2 !== 0) {
    return undefined;
  }

  const midpoint = value.length / 2;
  const first = value.slice(0, midpoint).trim();
  const second = value.slice(midpoint).trim();

  if (first && first.toLowerCase() === second.toLowerCase()) {
    return { first, second };
  }

  return undefined;
}

function collectDetailLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links: string[] = [];

  $("a[href]").each((_, element) => {
    const text = cleanLine($(element).text());
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    if (/show details|details/i.test(text) || /\/details|\/d\//i.test(href)) {
      links.push(toAbsoluteUrl(href, baseUrl));
    }
  });

  return [...new Set(links)];
}

function findDetailLinkNearTitle($: cheerio.CheerioAPI, title: string): string | undefined {
  const headings = $("h1,h2,h3,h4").filter((_, element) => cleanLine($(element).text()) === title);
  const heading = headings.first();
  if (!heading.length) {
    return undefined;
  }

  let current = heading.parent();
  for (let depth = 0; depth < 8 && current.length; depth += 1) {
    const text = cleanLine(current.text());
    const href = current
      .find("a[href]")
      .filter((_, element) => /show details|details/i.test(cleanLine($(element).text())))
      .first()
      .attr("href");

    if (href) {
      return toAbsoluteUrl(href, PORSCHE_SEARCH_BASE_URL);
    }

    if (PRICE_PATTERN.test(text) && MILEAGE_PATTERN.test(text)) {
      break;
    }

    current = current.parent();
  }

  return undefined;
}

function findNextPageUrl($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
  const href = $("a[href]")
    .filter((_, element) => /next page|next/i.test(cleanLine($(element).text())))
    .first()
    .attr("href");

  return href ? toAbsoluteUrl(href, baseUrl) : undefined;
}

function splitVisibleLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)
    .filter((line, index, lines) => index === 0 || line !== lines[index - 1]);
}

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(href: string, baseUrl: string): string {
  return new URL(href, baseUrl).toString();
}

function dedupeListings(listings: CarListing[]): CarListing[] {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    const key = `${listing.title}|${listing.price}|${listing.mileage}|${listing.link}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
