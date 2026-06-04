/**
 * Resolves the public base URL used when embedding links inside QR codes.
 *
 * Priority order:
 *   1. import.meta.env.VITE_PUBLIC_BASE_URL  (operator-set; LAN IP in dev, real
 *      domain in prod)
 *   2. window.location.origin                (only if it's NOT localhost --
 *      already a LAN IP or real domain)
 *   3. window.location.origin                (localhost) -- returned with
 *      isLocalhost=true so callers can show a warning ("phone won't reach this")
 *
 * Phase 12 / audit/12-qr-and-soft-delete.md.
 */
export interface PublicUrlResolution {
  url: string;
  source: "env" | "origin" | "localhost-fallback";
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

export function publicBaseUrl(): PublicUrlResolution {
  // 1. Env var wins. Trim + strip trailing slash so callers can safely
  //    template-string in `${url}/path`.
  const envVar = (import.meta as any)?.env?.VITE_PUBLIC_BASE_URL as
    | string
    | undefined;
  if (envVar && envVar.trim() !== "") {
    const url = stripTrailingSlash(envVar.trim());
    let envIsLocalhost = false;
    try {
      envIsLocalhost = isLocalHostname(new URL(url).hostname);
    } catch {
      // malformed env value -- treat as "not localhost" so we don't false-warn,
      // the URL will fail at the consumer anyway with a visible error.
      envIsLocalhost = false;
    }
    return { url, source: "env", isLocalhost: envIsLocalhost };
  }

  // 2 & 3. Fall back to window.location.origin if we're in a browser.
  if (typeof window === "undefined" || !window.location) {
    return {
      url: "",
      source: "localhost-fallback",
      isLocalhost: true,
    };
  }
  const origin = stripTrailingSlash(window.location.origin);
  const isLocalhost = isLocalHostname(window.location.hostname);
  return {
    url: origin,
    source: isLocalhost ? "localhost-fallback" : "origin",
    isLocalhost,
  };
}
