import { describe, expect, it } from "vitest";
import {
  fixtureDetailHtml,
  fixtureDetailVisibleText,
  fixtureUnavailableDetailHtml,
  fixtureUnavailableDetailVisibleText
} from "./fixtures.js";
import { parsePorscheDetails, parsePorscheStatus } from "../src/porsche/details.js";

describe("parsePorscheDetails", () => {
  it("extracts identity, added options, highlights, and target feature matches", () => {
    const details = parsePorscheDetails({
      html: fixtureDetailHtml,
      visibleText: fixtureDetailVisibleText,
      detailUrl: "https://finder.porsche.com/us/en-US/details/porsche-911-carrera-4s-coupe-used-123",
      fetchedAt: "2026-06-03T12:00:00.000Z"
    });

    expect(details.vin).toBe("WP0AB2A99NS123456");
    expect(details.stockNumber).toBe("NS123456");
    expect(details.status).toBe("active");
    expect(details.price).toBe("$129,900");
    expect(details.equipmentHighlights[0]).toContain("BOSE Surround Sound System");
    expect(details.includedOptions).toContain("GT Sport Steering Wheel");
    expect(details.includedOptions).toContain("Front Axle Lift System");
    expect(details.includedOptions).not.toContain("Cruise Control");
    expect(details.includedOptions).not.toContain("Standard Sound Package");

    const featureKeys = details.featureMatches.map((match) => match.key);
    expect(featureKeys).toEqual(
      expect.arrayContaining([
        "highEndSpeakers",
        "gtSteeringWheel",
        "sportSeats",
        "sportDesignKit",
        "frontAxleLift",
        "surroundView",
        "leatherPackage",
        "ventilatedSeats",
        "sunRoof"
      ])
    );
  });

  it("detects unavailable detail pages without requiring a price", () => {
    const status = parsePorscheStatus({
      html: fixtureUnavailableDetailHtml,
      visibleText: fixtureUnavailableDetailVisibleText,
      detailUrl: "https://finder.porsche.com/us/en-US/details/porsche-911-carrera-4s-coupe-used-123",
      checkedAt: "2026-06-03T12:00:00.000Z"
    });

    expect(status.status).toBe("unavailable");
    expect(status.price).toBeUndefined();
  });

  it("does not mark unavailable from generic availability copy", () => {
    const status = parsePorscheStatus({
      html: "<p>This vehicle is no longer available</p>",
      visibleText: "This vehicle is no longer available",
      detailUrl: "https://finder.porsche.com/us/en-US/details/porsche-911-carrera-4s-coupe-used-123",
      checkedAt: "2026-06-03T12:00:00.000Z"
    });

    expect(status.status).toBe("active");
  });
});
