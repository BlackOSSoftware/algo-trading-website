const LOCAL_API_FALLBACK = "http://localhost:4500";
const PRODUCTION_API_FALLBACK = "https://api.emotionlesstraders.com";

function isLoopbackHost(hostname: string) {
  const host = hostname.trim().toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isPrivateApiHost(hostname: string) {
  const host = hostname.trim().toLowerCase();
  if (!host) return true;
  if (isLoopbackHost(host) || host === "0.0.0.0" || host.endsWith(".local")) {
    return true;
  }
  if (host.startsWith("10.") || host.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function resolveApiBaseUrl() {
  const configured = stripTrailingSlash(
    (process.env.NEXT_PUBLIC_API_URL || LOCAL_API_FALLBACK).trim()
  );
  const productionApi = stripTrailingSlash(
    (process.env.NEXT_PUBLIC_PRODUCTION_API_URL || PRODUCTION_API_FALLBACK).trim()
  );

  if (typeof window === "undefined") {
    return configured;
  }

  const browserHost = window.location.hostname;
  const browserIsLocal = isLoopbackHost(browserHost);

  try {
    const url = new URL(configured);

    // Live site must never keep a localhost/private API from local .env / bad Vercel env.
    if (!browserIsLocal && isPrivateApiHost(url.hostname)) {
      return productionApi;
    }

    // Sharekhan callback runs on 127.0.0.1 — keep API host aligned to avoid flaky fetch/CORS.
    if (browserHost === "127.0.0.1" && isLoopbackHost(url.hostname)) {
      url.hostname = "127.0.0.1";
      return stripTrailingSlash(url.toString());
    }
    if (browserHost === "localhost" && url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
      return stripTrailingSlash(url.toString());
    }
  } catch {
    if (!browserIsLocal && /localhost|127\.0\.0\.1/i.test(configured)) {
      return productionApi;
    }
  }

  return configured;
}

export function resolveWebhookBaseUrl() {
  const configured = stripTrailingSlash(
    (process.env.NEXT_PUBLIC_WEBHOOK_URL || resolveApiBaseUrl()).trim()
  );
  const productionApi = stripTrailingSlash(
    (process.env.NEXT_PUBLIC_PRODUCTION_API_URL || PRODUCTION_API_FALLBACK).trim()
  );

  if (typeof window === "undefined") {
    return configured;
  }

  const browserIsLocal = isLoopbackHost(window.location.hostname);
  try {
    const url = new URL(configured);
    if (!browserIsLocal && isPrivateApiHost(url.hostname)) {
      return productionApi;
    }
  } catch {
    if (!browserIsLocal && /localhost|127\.0\.0\.1/i.test(configured)) {
      return productionApi;
    }
  }

  return configured;
}

export const API_BASE_URL = resolveApiBaseUrl();

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (data as { error?: string }).error || "Request failed";
    throw new Error(message);
  }

  return data;
}

export async function apiPost(
  path: string,
  body: unknown,
  token?: string | null
) {
  return request(path, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function apiGet(path: string, token?: string | null) {
  return request(path, {
    method: "GET",
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
