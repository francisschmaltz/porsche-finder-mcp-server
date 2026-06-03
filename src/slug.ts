export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function toToolName(slug: string): string {
  return `porsche_911_${slugify(slug)}`;
}

export function assertValidSlug(slug: string): void {
  if (!/^[a-z0-9][a-z0-9_]{1,47}$/.test(slug)) {
    throw new Error("Slug must be 2-48 chars and contain only lowercase letters, numbers, and underscores.");
  }
}
