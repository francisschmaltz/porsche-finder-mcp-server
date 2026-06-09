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
  status: CarAvailabilityStatus;
  price?: string;
  equipmentHighlights: string[];
  includedOptions: string[];
  featureMatches: FeatureMatch[];
  fetchedAt: string;
};

export type CarAvailabilityStatus = "active" | "unavailable";

export type CarStatusData = {
  detailUrl: string;
  status: CarAvailabilityStatus;
  price?: string;
  checkedAt: string;
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
  status: CarAvailabilityStatus;
  isFavorite: boolean;
  favoritedAt?: string;
  unavailableAt?: string;
  statusCheckedAt?: string;
  detailNotFoundCount?: number;
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
  runType?: SearchRunType;
};

export type SearchRunResult = {
  search: SavedSearch;
  listings: CachedCar[];
  removedListings: RemovedSearchCar[];
  pagesFetched: number;
  sources: FetchSource[];
  cacheHits: number;
  cacheMisses: number;
  httpPulls: number;
  playwrightPulls: number;
  fetchedAt: string;
  url: string;
};

export type SearchRunType = "saved_search" | "preview";

export type SearchRunHistory = {
  id: number;
  runType: SearchRunType;
  searchId?: number;
  searchName: string;
  searchSlug: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  durationMs: number;
  pagesFetched: number;
  listingsCount: number;
  removedCount: number;
  sources: FetchSource[];
  cacheHits: number;
  cacheMisses: number;
  httpPulls: number;
  playwrightPulls: number;
  error?: string;
};

export type OverviewStats = {
  savedSearches: number;
  enabledSearches: number;
  cachedCars: number;
  favoriteCars: number;
  unavailableCars: number;
  unavailableFavorites: number;
  totalRuns: number;
  failedRuns: number;
  cacheHits: number;
  cacheMisses: number;
  httpPulls: number;
  playwrightPulls: number;
  lastRunAt?: string;
};

export type OverviewData = {
  stats: OverviewStats;
  recentRuns: SearchRunHistory[];
  favoritesPreview: CachedCar[];
};
