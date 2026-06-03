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

export type FeatureMatch = {
  key: string;
  label: string;
  matchedLines: string[];
};

export type CarDetailData = {
  detailUrl: string;
  vin?: string;
  stockNumber?: string;
  equipmentHighlights: string[];
  includedOptions: string[];
  featureMatches: FeatureMatch[];
  fetchedAt: string;
};

export type PriceChange = {
  previousPrice: string;
  currentPrice: string;
  delta: string;
  direction: "increase" | "decrease";
};

export type CachedCar = {
  id: number;
  identityKey: string;
  vin?: string;
  stockNumber?: string;
  title: string;
  color: ColorPair;
  mileage: string;
  price: string;
  priceCents?: number;
  location: string;
  link: string;
  firstSeenAt: string;
  lastSeenAt: string;
  status: "active" | "sold" | "unavailable";
  details?: CarDetailData;
  priceChange?: PriceChange;
  detailError?: string;
};

export type RemovedSearchCar = {
  car: CachedCar;
  removedAt: string;
  lastSeenAt: string;
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
  listings: CachedCar[];
  removedListings: RemovedSearchCar[];
  pagesFetched: number;
  sources: FetchSource[];
  fetchedAt: string;
  url: string;
};
