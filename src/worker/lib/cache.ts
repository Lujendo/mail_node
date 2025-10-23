// Caching utilities for KV
import type { KVNamespace } from '@cloudflare/workers-types';

/**
 * Cache email list in KV
 */
export async function cacheEmailList(
  kv: KVNamespace,
  userId: number,
  folderId: number,
  emails: any[],
  ttl: number = 300 // 5 minutes
): Promise<void> {
  const key = `emails:${userId}:${folderId}`;
  await kv.put(key, JSON.stringify(emails), {
    expirationTtl: ttl,
  });
}

/**
 * Get cached email list from KV
 */
export async function getCachedEmailList(
  kv: KVNamespace,
  userId: number,
  folderId: number
): Promise<any[] | null> {
  const key = `emails:${userId}:${folderId}`;
  const cached = await kv.get(key);
  if (!cached) {
    return null;
  }
  return JSON.parse(cached);
}

/**
 * Invalidate email list cache
 */
export async function invalidateEmailListCache(
  kv: KVNamespace,
  userId: number,
  folderId?: number
): Promise<void> {
  if (folderId) {
    const key = `emails:${userId}:${folderId}`;
    await kv.delete(key);
  } else {
    // Invalidate all email lists for user
    // Note: KV doesn't support prefix deletion, so we'd need to track keys
    // For now, we'll just delete specific folders
    const folderTypes = ['inbox', 'sent', 'drafts', 'trash', 'spam'];
    for (const type of folderTypes) {
      await kv.delete(`emails:${userId}:${type}`);
    }
  }
}

/**
 * Cache folder list in KV
 */
export async function cacheFolderList(
  kv: KVNamespace,
  userId: number,
  folders: any[],
  ttl: number = 600 // 10 minutes
): Promise<void> {
  const key = `folders:${userId}`;
  await kv.put(key, JSON.stringify(folders), {
    expirationTtl: ttl,
  });
}

/**
 * Get cached folder list from KV
 */
export async function getCachedFolderList(
  kv: KVNamespace,
  userId: number
): Promise<any[] | null> {
  const key = `folders:${userId}`;
  const cached = await kv.get(key);
  if (!cached) {
    return null;
  }
  return JSON.parse(cached);
}

/**
 * Invalidate folder list cache
 */
export async function invalidateFolderListCache(
  kv: KVNamespace,
  userId: number
): Promise<void> {
  const key = `folders:${userId}`;
  await kv.delete(key);
}

/**
 * Cache user data in KV
 */
export async function cacheUserData(
  kv: KVNamespace,
  userId: number,
  userData: any,
  ttl: number = 3600 // 1 hour
): Promise<void> {
  const key = `user:${userId}`;
  await kv.put(key, JSON.stringify(userData), {
    expirationTtl: ttl,
  });
}

/**
 * Get cached user data from KV
 */
export async function getCachedUserData(
  kv: KVNamespace,
  userId: number
): Promise<any | null> {
  const key = `user:${userId}`;
  const cached = await kv.get(key);
  if (!cached) {
    return null;
  }
  return JSON.parse(cached);
}

/**
 * Cache search results
 */
export async function cacheSearchResults(
  kv: KVNamespace,
  userId: number,
  query: string,
  results: any[],
  ttl: number = 300 // 5 minutes
): Promise<void> {
  const key = `search:${userId}:${query}`;
  await kv.put(key, JSON.stringify(results), {
    expirationTtl: ttl,
  });
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(
  kv: KVNamespace,
  userId: number,
  query: string
): Promise<any[] | null> {
  const key = `search:${userId}:${query}`;
  const cached = await kv.get(key);
  if (!cached) {
    return null;
  }
  return JSON.parse(cached);
}

/**
 * Cache contact list
 */
export async function cacheContactList(
  kv: KVNamespace,
  userId: number,
  contacts: any[],
  ttl: number = 600 // 10 minutes
): Promise<void> {
  const key = `contacts:${userId}`;
  await kv.put(key, JSON.stringify(contacts), {
    expirationTtl: ttl,
  });
}

/**
 * Get cached contact list
 */
export async function getCachedContactList(
  kv: KVNamespace,
  userId: number
): Promise<any[] | null> {
  const key = `contacts:${userId}`;
  const cached = await kv.get(key);
  if (!cached) {
    return null;
  }
  return JSON.parse(cached);
}

/**
 * Invalidate contact list cache
 */
export async function invalidateContactListCache(
  kv: KVNamespace,
  userId: number
): Promise<void> {
  const key = `contacts:${userId}`;
  await kv.delete(key);
}

/**
 * Rate limiting using KV
 */
export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  limit: number = 100,
  window: number = 60 // 1 minute
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`;
  const current = await kv.get(key);
  
  if (!current) {
    await kv.put(key, '1', { expirationTtl: window });
    return { allowed: true, remaining: limit - 1 };
  }

  const count = parseInt(current);
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(key, (count + 1).toString(), { expirationTtl: window });
  return { allowed: true, remaining: limit - count - 1 };
}

