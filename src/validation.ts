import { z } from "zod/v4";
import {
  VALID_CATEGORIES,
  VALID_EQUIPMENT,
  VALID_MODEL_GENERATIONS
} from "./options.js";
import { slugify } from "./slug.js";

function knownValues(name: string, allowed: Set<string>) {
  return z
    .array(z.string())
    .default([])
    .superRefine((values, ctx) => {
      for (const value of values) {
        if (!allowed.has(value)) {
          ctx.addIssue({
            code: "custom",
            message: `Unknown ${name}: ${value}`
          });
        }
      }
    });
}

export const savedSearchInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? slugify(value) : undefined)),
  description: z.string().trim().max(500).optional().default(""),
  enabled: z.boolean().optional().default(true),
  categories: knownValues("category", VALID_CATEGORIES),
  modelGenerations: knownValues("model generation", VALID_MODEL_GENERATIONS),
  equipment: knownValues("equipment", VALID_EQUIPMENT),
  maximumMileage: z.number().int().min(0).max(500_000).optional().default(30_000),
  defaultLimit: z.number().int().min(1).max(50).optional().default(10),
  maxPages: z.number().int().min(1).max(5).optional().default(1)
});

export const previewInputSchema = savedSearchInputSchema.extend({
  name: z
    .string()
    .trim()
    .max(80)
    .optional()
    .default("")
    .transform((value) => (value.length >= 2 ? value : "Preview Search")),
  limit: z.number().int().min(1).max(50).optional(),
  pages: z.number().int().min(1).max(5).optional(),
  refresh: z.boolean().optional()
});

export const mcpSearchInputSchema = {
  limit: z.number().int().min(1).max(50).optional().describe("Maximum cars to return."),
  pages: z.number().int().min(1).max(5).optional().describe("Maximum Porsche Finder pages to fetch."),
  refresh: z.boolean().optional().describe("Bypass the short in-memory cache.")
};

export const inventoryChangesInputSchema = {
  limit: z.number().int().min(1).max(100).optional().describe("Maximum changes to return.")
};

const carLocatorShape = {
  carId: z.number().int().positive().optional().describe("Cached car ID."),
  vin: z.string().trim().min(3).optional().describe("Vehicle VIN."),
  stockNumber: z.string().trim().min(2).optional().describe("Dealer stock number."),
  detailUrl: z.string().trim().url().optional().describe("Porsche Finder detail URL.")
};

export const carLocatorInputSchema = carLocatorShape;

export const carLocatorSchema = z.object(carLocatorShape).refine(
  (value) => {
    return [value.carId, value.vin, value.stockNumber, value.detailUrl].filter((item) => item !== undefined).length === 1;
  },
  {
    message: "Provide exactly one of carId, vin, stockNumber, or detailUrl."
  }
);

export const carAddedFeaturesInputSchema = {
  ...carLocatorShape,
  refresh: z.boolean().optional().describe("Force a one-time detail page refresh.")
};

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});
