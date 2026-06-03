export type SearchFilters = {
  categories: string[];
  modelGenerations: string[];
  equipment: string[];
  maximumMileage: number;
};

export type SavedSearch = {
  id: number;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  filters: SearchFilters;
  defaultLimit: number;
  maxPages: number;
  createdAt: string;
  updatedAt: string;
};

export type SavedSearchInput = {
  name: string;
  slug?: string;
  description?: string;
  enabled?: boolean;
  categories?: string[];
  modelGenerations?: string[];
  equipment?: string[];
  maximumMileage?: number;
  defaultLimit?: number;
  maxPages?: number;
};

export type ColorPair = {
  exterior: string;
  interior: string;
  raw: string;
};

export type CarListing = {
  title: string;
  color: ColorPair;
  mileage: string;
  price: string;
  location: string;
  link: string;
};

export type ParsedPorschePage = {
  listings: CarListing[];
  nextPageUrl?: string;
};

export type FetchSource = "http" | "playwright";

export type FetchPageResult = {
  url: string;
  html: string;
  visibleText?: string;
  source: FetchSource;
};

export type SearchRunOptions = {
  limit?: number;
  pages?: number;
  refresh?: boolean;
};

export type SearchRunResult = {
  search: SavedSearch;
  listings: CarListing[];
  pagesFetched: number;
  sources: FetchSource[];
  fetchedAt: string;
  url: string;
};
