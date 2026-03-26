export type MarketMayaFetchResult = {
  ok?: boolean;
  status?: number;
  contentType?: string;
  headers?: {
    cfRay?: string;
    server?: string;
  };
  payload?: unknown;
};

export type MarketMayaResponse = {
  ok?: boolean;
  dryRun?: boolean;
  status?: number;
  error?: string;
  telegram?: {
    attempted?: boolean;
    recipients?: number;
    successCount?: number;
    failureCount?: number;
    skipped?: boolean;
    reason?: string;
    error?: string;
  };
  request?: {
    baseUrl?: string;
    path?: string;
    tokenConfigured?: boolean;
    params?: Record<string, unknown>;
  };
  result?: MarketMayaFetchResult;
};

export type MarketMayaResponseView = {
  tone: "ok" | "warn" | "error";
  status: string;
  message: string;
  details: Array<{ label: string; value: string }>;
  raw: string;
};

const MARKET_EXCHANGE_OPTIONS: Record<string, string[]> = {
  EQ: ["NSE", "BSE"],
  FUT: ["NFO", "BFO", "CDS", "MCX"],
  OPT: ["NFO", "BFO", "CDS", "MCX"],
};

const MARKET_EXPIRY_OPTIONS: Record<string, string[]> = {
  EQ: [],
  FUT: ["MONTHLY"],
  OPT: ["WEEKLY", "MONTHLY"],
};

const DEFAULT_SEGMENT = "EQ";
const DEFAULT_EQ_EXCHANGE = "NSE";
const DEFAULT_DERIVATIVE_EXCHANGE = "NFO";

function redactSensitiveText(text: string) {
  return text
    .replace(/([?&]token=)([^&\s"'<]+)/gi, "$1[REDACTED]")
    .replace(/(["'\s])token([=:]\s*)([^\s"'&<>]{8,})/gi, "$1token$2[REDACTED]");
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function toSafeSnippet(text: string, max = 240) {
  const normalized = normalizeWhitespace(redactSensitiveText(text));
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
}

function extractPayloadMessage(payload: unknown) {
  if (!payload) return "";
  if (typeof payload === "string") {
    return toSafeSnippet(payload);
  }
  if (typeof payload !== "object") {
    return toSafeSnippet(String(payload));
  }

  const record = payload as Record<string, unknown>;
  const candidates = ["message", "error", "description", "detail", "msg", "status_message"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return toSafeSnippet(value);
    }
  }

  try {
    return toSafeSnippet(JSON.stringify(payload));
  } catch {
    return "";
  }
}

function looksLikeCloudflare(response?: MarketMayaResponse | null) {
  const server = String(response?.result?.headers?.server || "").trim().toLowerCase();
  const cfRay = String(response?.result?.headers?.cfRay || "").trim();
  const payload = String(response?.result?.payload || "").toLowerCase();
  const error = String(response?.error || "").toLowerCase();
  return (
    server === "cloudflare" ||
    Boolean(cfRay) ||
    payload.includes("cloudflare") ||
    payload.includes("cf-ray") ||
    error.includes("cloudflare")
  );
}

export function prettyMarketMaya(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatMarketMayaResponse(response: MarketMayaResponse | null) {
  if (!response) return null;

  const details: Array<{ label: string; value: string }> = [];
  const apiStatus = response.result?.status || response.status;
  const contentType = String(response.result?.contentType || "").trim();
  const server = String(response.result?.headers?.server || "").trim();
  const cfRay = String(response.result?.headers?.cfRay || "").trim();
  const telegram = response.telegram;
  const payloadMessage = extractPayloadMessage(response.result?.payload);
  const errorMessage = toSafeSnippet(String(response.error || "").trim());
  const raw = prettyMarketMaya(response);
  const cloudflare = looksLikeCloudflare(response);

  if (response.dryRun) {
    const request = response.request;
    if (request?.path) details.push({ label: "Endpoint", value: request.path });
    if (request?.baseUrl) details.push({ label: "Base URL", value: request.baseUrl });
    details.push({
      label: "Token",
      value: request?.tokenConfigured ? "Configured" : "Missing",
    });

    return {
      tone: response.ok === false ? "error" : "warn",
      status: response.ok === false ? "Preview error" : "Preview ready",
      message:
        errorMessage ||
        "Preview generated. Execute was OFF, so no live order was sent to Market Maya.",
      details,
      raw,
    } satisfies MarketMayaResponseView;
  }

  if (apiStatus) details.push({ label: "HTTP status", value: String(apiStatus) });
  if (contentType) details.push({ label: "Content type", value: contentType });
  if (server) details.push({ label: "Server", value: server });
  if (cfRay) details.push({ label: "CF-RAY", value: cfRay });
  if (telegram) {
    let telegramValue = "Not attempted";
    if (telegram.skipped) {
      telegramValue = telegram.reason || "Skipped";
    } else if (telegram.attempted) {
      telegramValue = `${telegram.successCount || 0}/${telegram.recipients || 0} sent`;
    }
    details.push({ label: "Telegram", value: telegramValue });
    if (telegram.error) {
      details.push({ label: "Telegram error", value: telegram.error });
    }
  }

  if (response.ok) {
    const successMessage =
      payloadMessage || "Market Maya accepted the request and returned a live API response.";
    return {
      tone: "ok",
      status: "API response received",
      message: successMessage,
      details,
      raw,
    } satisfies MarketMayaResponseView;
  }

  const message =
    errorMessage ||
    payloadMessage ||
    "Market Maya request failed before a confirmed success response was received.";

  return {
    tone: "error",
    status: cloudflare ? "Request failed via Cloudflare" : "Request failed",
    message: cloudflare
      ? `${message} No confirmed success response was received from the upstream API.`
      : message,
    details,
    raw,
  } satisfies MarketMayaResponseView;
}

export function getExchangeOptions(segment: string) {
  return MARKET_EXCHANGE_OPTIONS[segment] || MARKET_EXCHANGE_OPTIONS[DEFAULT_SEGMENT];
}

export function getExpiryOptions(segment: string) {
  return MARKET_EXPIRY_OPTIONS[segment] || [];
}

export function pickExchangeForSegment(exchange: string, segment: string) {
  const options = getExchangeOptions(segment);
  if (options.includes(exchange)) return exchange;
  return segment === "EQ" ? DEFAULT_EQ_EXCHANGE : DEFAULT_DERIVATIVE_EXCHANGE;
}
