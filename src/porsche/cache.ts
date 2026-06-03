export class TimedCache<T> {
  private values = new Map<string, { value: T; expiresAt: number }>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const cached = this.values.get(key);
    if (!cached) {
      return undefined;
    }

    if (Date.now() > cached.expiresAt) {
      this.values.delete(key);
      return undefined;
    }

    return cached.value;
  }

  set(key: string, value: T): void {
    this.values.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  clear(): void {
    this.values.clear();
  }
}
