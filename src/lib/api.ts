function resolveApiBaseUrl() {
  const configured = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500").trim();
  if (typeof window === "undefined") return configured;

  try {
    const url = new URL(configured);
    // Sharekhan callback runs on 127.0.0.1 — keep API host aligned to avoid flaky fetch/CORS.
    if (window.location.hostname === "127.0.0.1" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      url.hostname = "127.0.0.1";
      return url.toString().replace(/\/$/, "");
    }
    if (window.location.hostname === "localhost" && url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    // fall through
  }
  return configured.replace(/\/$/, "");
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
