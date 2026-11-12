/**
 * In-memory TTL cache to reduce database queries against Neon Serverless Postgres.
 * By caching high-frequency, low-churn read data (plans, celebrations, service notices, settings),
 * we drastically minimize compute endpoint wakeups and lower compute-hours billing.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<any>>();

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const fresh = await fetcher();
  store.set(key, {
    value: fresh,
    expiresAt: now + ttlSeconds * 1000,
  });

  return fresh;
}

export function invalidateCache(prefixOrKey?: string): void {
  if (!prefixOrKey) {
    store.clear();
    return;
  }

  for (const key of store.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      store.delete(key);
    }
  }
}
