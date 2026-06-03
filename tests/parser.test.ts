import { describe, expect, it } from "vitest";
import { fixtureHtml, fixtureVisibleText } from "./fixtures.js";
import { formatLocationLine, parsePorscheListings, splitColor } from "../src/porsche/parser.js";

describe("parsePorscheListings", () => {
  it("extracts required listing fields", () => {
    const parsed = parsePorscheListings({
      html: fixtureHtml,
      visibleText: fixtureVisibleText,
      baseUrl: "https://finder.porsche.com/us/en-US/search/911"
    });

    expect(parsed.listings).toHaveLength(2);
    expect(parsed.listings[0]).toMatchObject({
      title: "2022 Porsche 911 Carrera 4S Coupe",
      mileage: "1,079 mi",
      price: "$129,900",
      location: "Porsche San Antonio: San Antonio, TX, 78230",
      link: "https://finder.porsche.com/us/en-US/details/porsche-911-carrera-4s-coupe-used-123"
    });
    expect(parsed.listings[0].color).toMatchObject({
      exterior: "Agate Grey Metallic",
      interior: "Red"
    });
    expect(parsed.nextPageUrl).toBe("https://finder.porsche.com/us/en-US/search/911?page=2");
  });
});

describe("formatLocationLine", () => {
  it.each([
    ["Porsche JacksonvilleJacksonville, FL, 32225", "Porsche Jacksonville: Jacksonville, FL, 32225"],
    ["Porsche San Antonio San Antonio, TX, 78230", "Porsche San Antonio: San Antonio, TX, 78230"],
    ["Porsche Marin, Mill Valley, CA, 94941", "Porsche Marin: Mill Valley, CA, 94941"],
    ["Porsche Marin, Mill Valley", "Porsche Marin: Mill Valley"]
  ])("formats %s", (raw, expected) => {
    expect(formatLocationLine(raw)).toBe(expected);
  });
});

describe("splitColor", () => {
  it.each([
    ["White Black", "White", "Black"],
    ["Agate Grey Metallic Red", "Agate Grey Metallic", "Red"],
    ["GT Silver Metallic Chalk", "GT Silver Metallic", "Chalk"],
    ["Jet Black Metallic Mojave Beige", "Jet Black Metallic", "Mojave Beige"],
    ["Black / Bordeaux Red", "Black", "Bordeaux Red"]
  ])("splits %s", (raw, exterior, interior) => {
    expect(splitColor(raw)).toMatchObject({ exterior, interior });
  });
});
