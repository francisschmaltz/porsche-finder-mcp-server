import type { FeatureMatch } from "../types.js";

type FeatureDefinition = {
  key: string;
  label: string;
  patterns: RegExp[];
};

const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: "highEndSpeakers",
    label: "High-end speakers",
    patterns: [/\bBOSE\b/i, /Burmester/i]
  },
  {
    key: "gtSteeringWheel",
    label: "GT steering wheel",
    patterns: [/\bGT\s+Sport\s+Steering\s+Wheel\b/i, /\bGT\b.*\bSteering\s+Wheel\b/i]
  },
  {
    key: "sportSeats",
    label: "Sport seats",
    patterns: [/\bSport\s+Seats?\b/i, /\bSports\s+Seats?\b/i, /\bAdaptive\s+Sport\s+Seats?\b/i, /\bPower\s+Sport\s+Seats?\b/i]
  },
  {
    key: "comfortSeats",
    label: "Comfort seats",
    patterns: [/\bComfort\s+Seats?\b/i]
  },
  {
    key: "aeroKit",
    label: "AeroKit",
    patterns: [/\bAeroKit\b/i, /\bAerokit\b/i]
  },
  {
    key: "sportDesignKit",
    label: "SportDesign kit",
    patterns: [/\bSportDesign\b/i, /\bSport\s+Design\b/i]
  },
  {
    key: "frontAxleLift",
    label: "Front axle lift",
    patterns: [/\bFront\s+Axle\s+Lift\b/i]
  },
  {
    key: "surroundView",
    label: "Surround view",
    patterns: [/\bSurround\s+View\b/i]
  },
  {
    key: "leatherPackage",
    label: "Leather package",
    patterns: [/\bLeather\s+Interior\b/i, /\bExtended\s+Leather\b/i, /\bInterior\s+Trim\s+in\s+Leather\b/i, /\bFull\s+Leather\b/i]
  },
  {
    key: "ventilatedSeats",
    label: "Ventilated seats",
    patterns: [/\bSeat\s+Ventilation\b/i, /\bVentilated\s+Seats?\b/i]
  },
  {
    key: "sunRoof",
    label: "Sunroof",
    patterns: [/\bSunroof\b/i, /\bSlide\/Tilt\s+Sunroof\b/i, /\bSlide\s+\/\s+Tilt\s+Sunroof\b/i]
  }
];

export function detectFeatureMatches(lines: string[]): FeatureMatch[] {
  return FEATURE_DEFINITIONS.flatMap((definition) => {
    const matchedLines = unique(
      lines.filter((line) => definition.patterns.some((pattern) => pattern.test(line)))
    );

    if (matchedLines.length === 0) {
      return [];
    }

    return [
      {
        key: definition.key,
        label: definition.label,
        matchedLines
      }
    ];
  });
}

export function formatFeatureSummary(matches: FeatureMatch[]): string {
  if (matches.length === 0) {
    return "No target added features detected.";
  }

  return matches.map((match) => `${match.label}: yes`).join("; ");
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
