/**
 * Resolves the public base URL used when embedding links inside QR codes.
 *
 * Priority order:
 *   1. `import.meta.env.VITE_PUBLIC_BASE_URL`  (operator-set; LAN IP in dev,
 *      real domain in prod)
 *   2. `window.location.origin`                (only if it's NOT localhost --
 *      already a LAN IP or real domain)
 *   3. Cached value from `GET /api/public/server-info`  (Phase 13.1: backend
 *      auto-detects its primary LAN IP; populated by `refreshPublicBaseUrl()`)
 *   4. `window.location.origin` (localhost) -- returned with isLocalhost=true
 *      so callers can show a warning ("phone won't reach this")
 *
 * Phases 12 + 13.1 / audit/12-qr-and-soft-delete.md + audit/13-whatsapp-and-autofill.md.
 */
export interface PublicUrlResolution {
  url: string;
  source: "env" | "origin" | "server-info" | "localhost-fallback";
  isLocalhost: boolean;
}

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "::1",
]);

function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

// Module-level cache for the server-detected LAN URL. Populated by
// refreshPublicBaseUrl() and reused on subsequent publicBaseUrl() calls.
let serverDetectedUrl: string | null = null;
let serverDetectionAttempted = false;

/**
 * Synchronous resolver. Cheap, called on every QR render. Uses whatever
 * `serverDetectedUrl` happens to be cached. Pair with `refreshPublicBaseUrl()`
 * once at app startup to populate the cache from the backend.
 */
export function publicBaseUrl(): PublicUrlResolution {
  // 1. Env var wins.
  const envVar = (import.meta as any)?.env?.VITE_PUBLIC_BASE_URL as
    | string
    | undefined;
  if (envVar && envVar.trim() !== "") {
    const url = stripTrailingSlash(envVar.trim());
    let envIsLocalhost = false;
    try {
      envIsLocalhost = isLocalHostname(new URL(url).hostname);
    } catch {
      envIsLocalhost = false;
    }
    return { url, source: "env", isLocalhost: envIsLocalhost };
  }

  // 2. If we're already on a non-localhost origin (LAN IP or real domain), use it.
  if (typeof window !== "undefined" && window.location) {
    const origin = stripTrailingSlash(window.location.origin);
    const isLocalhost = isLocalHostname(window.location.hostname);
    if (!isLocalhost) {
      return { url: origin, source: "origin", isLocalhost: false };
    }

    // 3. We're on localhost. If the backend told us its LAN IP at startup, use it.
    if (serverDetectedUrl) {
      return {
        url: serverDetectedUrl,
        source: "server-info",
        isLocalhost: false,
      };
    }

    // 4. Localhost fallback — warn the caller.
    return {
      url: origin,
      source: "localhost-fallback",
      isLocalhost: true,
    };
  }

  return {
    url: "",
    source: "localhost-fallback",
    isLocalhost: true,
  };
}

/**
 * Phase 13.1: query the backend's `/api/public/server-info` endpoint and
 * cache the recommended public base URL. Safe to call multiple times; only
 * the first call hits the network. Returns the resolved URL or null.
 *
 * Call once at app startup (e.g. in the dashboard's useEffect) so subsequent
 * synchronous calls to `publicBaseUrl()` can return the cached value.
 */
export async function refreshPublicBaseUrl(
  apiBaseUrl: string = "/api"
): Promise<string | null> {
  if (serverDetectionAttempted) return serverDetectedUrl;
  serverDetectionAttempted = true;
  try {
    const res = await fetch(`${stripTrailingSlash(apiBaseUrl)}/public/server-info`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const url: string | undefined = body?.publicBaseUrl;
    if (!url || typeof url !== "string" || url.trim() === "") return null;
    serverDetectedUrl = stripTrailingSlash(url.trim());
    return serverDetectedUrl;
  } catch {
    // Network error → silently fall back to localhost behavior + warning.
    return null;
  }
}

/** Test/dev helper to reset the cache. */
export function __resetPublicBaseUrlCacheForTests() {
  serverDetectedUrl = null;
  serverDetectionAttempted = false;
}
