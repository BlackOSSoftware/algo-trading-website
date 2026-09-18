"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  type MarketMayaResponse,
  formatMarketMayaResponse,
  getExchangeOptions,
  getExpiryOptions,
  pickExchangeForSegment,
} from "@/lib/marketMaya";

const SHAREKHAN_CREDENTIALS_KEY = "wt_sharekhan_credentials";

type TradeIcon = "broadcast" | "broker" | "layers" | "target" | "stop" | "play" | "shield";

type InstrumentHit = {
  token?: string;
  symbol: string;
  name?: string;
  exchange?: string;
  instrumentType?: string;
};

type SharekhanSavedCredentials = {
  apiKey: string;
  secureKey: string;
  customerId: string;
  channelUser: string;
  accessToken: string;
  productType: string;
  connectedAt?: number;
};

function parseRatioMultiplier(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.includes(":") || raw.includes("/")) {
    const divider = raw.includes(":") ? ":" : "/";
    const [left, right] = raw.split(divider).map((item) => item.trim());
    const a = Number(left);
    const b = Number(right);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
    return b / a;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function computeRatioTarget(slValue: string, ratioValue: string) {
  const sl = Number(slValue.trim());
  if (!Number.isFinite(sl) || sl <= 0) return null;
  const multiplier = parseRatioMultiplier(ratioValue);
  if (!multiplier) return null;
  const target = sl * multiplier;
  if (!Number.isFinite(target)) return null;
  return String(Number(target.toFixed(6)));
}

function readSharekhanSavedCredentials(): SharekhanSavedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SHAREKHAN_CREDENTIALS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SharekhanSavedCredentials> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      apiKey: String(parsed.apiKey || ""),
      secureKey: String(parsed.secureKey || ""),
      customerId: String(parsed.customerId || ""),
      channelUser: String(parsed.channelUser || ""),
      accessToken: String(parsed.accessToken || ""),
      productType: String(parsed.productType || ""),
      connectedAt: Number(parsed.connectedAt || 0) || undefined,
    };
  } catch {
    return null;
  }
}

const SHAREKHAN_LOGIN_DRAFT_KEY = "wt_sharekhan_login_draft";

function saveSharekhanSavedCredentials(patch: Partial<SharekhanSavedCredentials>) {
  if (typeof window === "undefined") return;
  const current = readSharekhanSavedCredentials() || {
    apiKey: "",
    secureKey: "",
    customerId: "",
    channelUser: "",
    accessToken: "",
    productType: "",
  };
  try {
    window.localStorage.setItem(
      SHAREKHAN_CREDENTIALS_KEY,
      JSON.stringify({ ...current, ...patch })
    );
  } catch {
    // ignore
  }
}

function getSharekhanRedirectUrl() {
  if (typeof window === "undefined") {
    return "https://www.emotionlesstraders.com/sharekhan/callback";
  }
  return `${window.location.origin.replace(/\/$/, "")}/sharekhan/callback`;
}

function buildInstrumentSearchParams(query: string, exchange: string, segment: string) {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: "15",
  });
  if (segment === "EQ") {
    params.set("instrumentType", "EQ");
    if (exchange) params.set("exchange", exchange);
  } else if (exchange === "MCX") {
    params.set("exchange", "MCX");
  } else {
    params.set("instrumentType", "EQ");
    params.set("exchange", "NSE");
  }
  return params;
}

function formatInstrumentSuggestion(hit: InstrumentHit) {
  const parts = [hit.symbol];
  if (hit.exchange) parts.push(hit.exchange);
  if (hit.instrumentType) parts.push(hit.instrumentType);
  return parts.join(" · ");
}

function renderTradeIcon(name: TradeIcon) {
  switch (name) {
    case "broadcast":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="1.6" fill="currentColor" />
          <path d="M6.6 6.6a4.8 4.8 0 0 0 0 6.8M13.4 6.6a4.8 4.8 0 0 1 0 6.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4.4 4.4a7.9 7.9 0 0 0 0 11.2M15.6 4.4a7.9 7.9 0 0 1 0 11.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "broker":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 15.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5 15.5V8.2L10 4.8l5 3.4v7.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 15.5V11h4v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3.2 16.5 7 10 10.8 3.5 7 10 3.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3.5 10.2 10 14l6.5-3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 13.2 10 17l6.5-3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="1" fill="currentColor" />
        </svg>
      );
    case "stop":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3.2 16.8 16.5H3.2L10 3.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10 8.2v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="13.6" r="0.8" fill="currentColor" />
        </svg>
      );
    case "play":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7.2 5.2 14.5 10 7.2 14.8V5.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2.8 15.5 5v4.2c0 3.5-2.3 5.9-5.5 7-3.2-1.1-5.5-3.5-5.5-7V5L10 2.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M7.8 10.1 9.3 11.6 12.4 8.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

const CALL_TYPE_OPTIONS = [
  "BUY",
  "SELL",
  "BUY EXIT",
  "SELL EXIT",
  "BUY ADD",
  "SELL ADD",
  "PARTIAL BUY EXIT",
  "PARTIAL SELL EXIT",
];

export default function TradePage() {
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [execute, setExecute] = useState(false);
  const [sendMarketMaya, setSendMarketMaya] = useState(true);
  const [sendSharekhan, setSendSharekhan] = useState(false);

  const [exchange, setExchange] = useState("NSE");
  const [segment, setSegment] = useState("EQ");
  const [symbolCode, setSymbolCode] = useState("");
  const [symbol, setSymbol] = useState("");
  const [symbolSuggestions, setSymbolSuggestions] = useState<InstrumentHit[]>([]);
  const [symbolSearching, setSymbolSearching] = useState(false);
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
  const [contract, setContract] = useState("NEAR");
  const [expiry, setExpiry] = useState("WEEKLY");
  const [expiryDate, setExpiryDate] = useState("");
  const [optionType, setOptionType] = useState("CE");
  const [atm, setAtm] = useState("0");
  const [strikePrice, setStrikePrice] = useState("");
  const [callType, setCallType] = useState("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState("");

  const [qtyDistribution, setQtyDistribution] = useState("Fix");
  const [qtyValue, setQtyValue] = useState("1");
  const [targetBy, setTargetBy] = useState("");
  const [target, setTarget] = useState("");
  const [slBy, setSlBy] = useState("");
  const [sl, setSl] = useState("");
  const [trailSl, setTrailSl] = useState(false);
  const [slMove, setSlMove] = useState("");
  const [profitMove, setProfitMove] = useState("");

  const [sharekhanApiKey, setSharekhanApiKey] = useState("");
  const [sharekhanSecureKey, setSharekhanSecureKey] = useState("");
  const [sharekhanAccessToken, setSharekhanAccessToken] = useState("");
  const [sharekhanCustomerId, setSharekhanCustomerId] = useState("");
  const [sharekhanChannelUser, setSharekhanChannelUser] = useState("");
  const [sharekhanProductType, setSharekhanProductType] = useState("INVESTMENT");
  const [showSharekhanApiKey, setShowSharekhanApiKey] = useState(false);
  const [showSharekhanSecureKey, setShowSharekhanSecureKey] = useState(false);
  const [showSharekhanAccessToken, setShowSharekhanAccessToken] = useState(false);
  const [sharekhanLoginLoading, setSharekhanLoginLoading] = useState(false);
  const [sharekhanRedirectUrl] = useState(() => getSharekhanRedirectUrl());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mayaResult, setMayaResult] = useState<MarketMayaResponse | null>(null);
  const [sharekhanResult, setSharekhanResult] = useState<Record<string, unknown> | null>(null);

  const tokenTrimmed = tokenInput.trim();
  const tokenWarning =
    tokenTrimmed && tokenTrimmed.length !== 36
      ? `Token length looks wrong (${tokenTrimmed.length}). Expected 36.`
      : null;

  const symbolCodeTrimmed = symbolCode.trim();
  // Only a numeric scrip/token counts as "symbol code mode".
  const usingSymbolCode = /^\d+$/.test(symbolCodeTrimmed);
  const normalizedSegment = segment.trim().toUpperCase();
  const showDerivativeFields =
    !usingSymbolCode && (normalizedSegment === "FUT" || normalizedSegment === "OPT");
  const showOptionFields = !usingSymbolCode && normalizedSegment === "OPT";
  const isRatioTarget = targetBy === "Ratio";
  const ratioComputed = isRatioTarget ? computeRatioTarget(sl, target) : null;
  const targetPlaceholder = isRatioTarget ? "e.g. 1:2" : "e.g. 50";
  const exchangeOptions = getExchangeOptions(normalizedSegment);
  const expiryOptions = getExpiryOptions(normalizedSegment);
  const mayaResponseView = formatMarketMayaResponse(mayaResult);

  const sharekhanReady = useMemo(
    () =>
      Boolean(
        sharekhanApiKey.trim() &&
          sharekhanAccessToken.trim() &&
          sharekhanCustomerId.trim() &&
          sharekhanChannelUser.trim()
      ),
    [sharekhanApiKey, sharekhanAccessToken, sharekhanCustomerId, sharekhanChannelUser]
  );
  const [sharekhanSession, setSharekhanSession] = useState<
    "unknown" | "checking" | "live" | "expired" | "missing"
  >("unknown");
  const [sharekhanSessionError, setSharekhanSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyCfg = (cfg: Partial<SharekhanSavedCredentials> | null | undefined) => {
      if (!cfg || typeof cfg !== "object") return false;
      let changed = false;
      const apiKey = String(cfg.apiKey || "").trim();
      const secureKey = String(cfg.secureKey || "").trim();
      const customerId = String(cfg.customerId || "").trim();
      const channelUser = String(cfg.channelUser || "").trim();
      const accessToken = String(cfg.accessToken || "").trim();
      const productType = String(cfg.productType || "").trim();
      if (apiKey) {
        setSharekhanApiKey(apiKey);
        changed = true;
      }
      if (secureKey) {
        setSharekhanSecureKey(secureKey);
        changed = true;
      }
      if (customerId) {
        setSharekhanCustomerId(customerId);
        changed = true;
      }
      if (channelUser) {
        setSharekhanChannelUser(channelUser);
        changed = true;
      }
      if (accessToken) {
        setSharekhanAccessToken(accessToken);
        changed = true;
      }
      if (productType) {
        setSharekhanProductType(productType);
        changed = true;
      }
      if (apiKey && accessToken && customerId) {
        setSendSharekhan(true);
      }
      return changed;
    };

    const savedMaya = localStorage.getItem("wt_marketmaya_token");
    if (savedMaya) {
      setTokenInput(savedMaya);
      setShowTokenModal(false);
    }

    applyCfg(readSharekhanSavedCredentials());

    const params = new URLSearchParams(window.location.search);
    if (params.get("sharekhan") === "connected") {
      setSendSharekhan(true);
      setError(null);
      window.history.replaceState({}, "", "/trade");
    }

    const auth = getToken();
    if (!auth) return;

    apiGet("/api/v1/sharekhan/login-prep", auth)
      .then((data) => {
        const cfg = (data as { prep?: Partial<SharekhanSavedCredentials> })?.prep;
        if (!cfg) return;
        applyCfg(cfg);
        saveSharekhanSavedCredentials({
          apiKey: String(cfg.apiKey || "").trim(),
          secureKey: String(cfg.secureKey || "").trim(),
          customerId: String(cfg.customerId || "").trim(),
          channelUser: String(cfg.channelUser || "").trim(),
          accessToken: String(cfg.accessToken || "").trim(),
          productType: String(cfg.productType || "").trim(),
          ...(cfg.accessToken ? { connectedAt: Date.now() } : {}),
        });
      })
      .catch(() => {
        // optional restore
      });

    apiGet("/api/v1/strategies", auth)
      .then((data) => {
        const list = (data as { strategies?: Array<{ marketMaya?: Record<string, unknown> }> })
          ?.strategies;
        if (!Array.isArray(list)) return;
        for (let i = list.length - 1; i >= 0; i -= 1) {
          const mm = list[i]?.marketMaya;
          if (!mm) continue;
          const mapped = {
            apiKey: String(mm.sharekhanApiKey || ""),
            secureKey: String(mm.sharekhanSecureKey || ""),
            customerId: String(mm.sharekhanCustomerId || ""),
            channelUser: String(mm.sharekhanChannelUser || ""),
            accessToken: String(mm.sharekhanAccessToken || ""),
            productType: String(mm.sharekhanProductType || ""),
          };
          if (
            mapped.apiKey ||
            mapped.accessToken ||
            mapped.customerId ||
            mapped.channelUser
          ) {
            applyCfg(mapped);
            saveSharekhanSavedCredentials(mapped);
            if (mapped.apiKey && mapped.accessToken && mapped.customerId) break;
          }
        }
      })
      .catch(() => {
        // optional
      });
  }, []);

  useEffect(() => {
    saveSharekhanSavedCredentials({
      apiKey: sharekhanApiKey.trim(),
      secureKey: sharekhanSecureKey.trim(),
      customerId: sharekhanCustomerId.trim(),
      channelUser: sharekhanChannelUser.trim(),
      accessToken: sharekhanAccessToken.trim(),
      productType: sharekhanProductType.trim(),
      ...(sharekhanAccessToken.trim() ? { connectedAt: Date.now() } : {}),
    });
  }, [
    sharekhanApiKey,
    sharekhanSecureKey,
    sharekhanCustomerId,
    sharekhanChannelUser,
    sharekhanAccessToken,
    sharekhanProductType,
  ]);

  const verifySharekhanSession = useCallback(async () => {
    if (!sharekhanReady) {
      setSharekhanSession("missing");
      setSharekhanSessionError("Sharekhan credentials incomplete.");
      return false;
    }
    const token = getToken();
    if (!token) {
      setSharekhanSession("missing");
      setSharekhanSessionError("Please sign in first.");
      return false;
    }
    setSharekhanSession("checking");
    setSharekhanSessionError(null);
    try {
      const data = (await apiPost(
        "/api/v1/sharekhan/session-status",
        {
          apiKey: sharekhanApiKey.trim(),
          accessToken: sharekhanAccessToken.trim(),
          customerId: sharekhanCustomerId.trim(),
          channelUser: sharekhanChannelUser.trim(),
        },
        token
      )) as {
        connected?: boolean;
        expired?: boolean;
        missing?: boolean;
        error?: string;
      };
      if (data.connected) {
        setSharekhanSession("live");
        setSharekhanSessionError(null);
        return true;
      }
      if (data.expired) {
        setSharekhanSession("expired");
        setSharekhanSessionError(data.error || "Sharekhan access token is expired. Reconnect.");
        return false;
      }
      if (data.missing) {
        setSharekhanSession("missing");
        setSharekhanSessionError(data.error || "Sharekhan credentials missing.");
        return false;
      }
      setSharekhanSession("expired");
      setSharekhanSessionError(data.error || "Sharekhan session is not valid.");
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sharekhan session check failed";
      const expired = /expir|unauthor|invalid.*token|token.*invalid/i.test(msg);
      setSharekhanSession(expired ? "expired" : "missing");
      setSharekhanSessionError(msg);
      return false;
    }
  }, [
    sharekhanReady,
    sharekhanApiKey,
    sharekhanAccessToken,
    sharekhanCustomerId,
    sharekhanChannelUser,
  ]);

  useEffect(() => {
    if (!sendSharekhan) {
      setSharekhanSession("unknown");
      setSharekhanSessionError(null);
      return;
    }
    if (!sharekhanReady) {
      setSharekhanSession("missing");
      setSharekhanSessionError("Sharekhan credentials missing. Login again.");
      return;
    }
    verifySharekhanSession();
  }, [sendSharekhan, sharekhanReady, verifySharekhanSession]);

  useEffect(() => {
    setExchange((current) => pickExchangeForSegment(current, normalizedSegment));
  }, [normalizedSegment]);

  useEffect(() => {
    if (normalizedSegment === "FUT" && expiry !== "MONTHLY") {
      setExpiry("MONTHLY");
    }
  }, [normalizedSegment, expiry]);

  useEffect(() => {
    // Migrate accidental text typed into scrip/token into Symbol search.
    if (symbolCode.trim() && /[A-Za-z]/.test(symbolCode)) {
      setSymbol((current) => current || symbolCode.trim().toUpperCase());
      setSymbolCode("");
      setShowSymbolSuggestions(true);
    }
  }, [symbolCode]);

  useEffect(() => {
    const query = symbol.trim();
    if (usingSymbolCode || query.length < 2) {
      setSymbolSuggestions([]);
      setSymbolSearching(false);
      return;
    }

    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setSymbolSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = buildInstrumentSearchParams(query, exchange, normalizedSegment);
        const data = (await apiGet(
          `/api/v1/mstock/instruments/search?${params.toString()}`,
          token
        )) as { instruments?: InstrumentHit[] };
        if (cancelled) return;
        setSymbolSuggestions(Array.isArray(data?.instruments) ? data.instruments : []);
        setShowSymbolSuggestions(true);
      } catch {
        if (!cancelled) setSymbolSuggestions([]);
      } finally {
        if (!cancelled) setSymbolSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [symbol, exchange, normalizedSegment, usingSymbolCode]);

  const handleSelectSymbol = useCallback((hit: InstrumentHit) => {
    const nextSymbol = String(hit.symbol || "").trim().toUpperCase();
    if (!nextSymbol) return;
    setSymbol(nextSymbol);
    setSymbolCode("");
    if (hit.exchange) setExchange(String(hit.exchange));
    setSymbolSuggestions([]);
    setShowSymbolSuggestions(false);
  }, []);

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setTokenError("Market Maya token is required.");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("wt_marketmaya_token", trimmed);
    }
    setTokenError(null);
    setShowTokenModal(false);
  };

  const fillExample = () => {
    setExecute(false);
    setExchange("NSE");
    setSegment("EQ");
    setSymbolCode("");
    setSymbol("ONGC");
    setCallType("BUY");
    setQtyDistribution("Fix");
    setQtyValue("1");
    setTargetBy("");
    setTarget("");
    setSlBy("");
    setSl("");
    setTrailSl(false);
    setSlMove("");
    setProfitMove("");
    setContract("NEAR");
    setExpiry("MONTHLY");
    setExpiryDate("");
    setOptionType("CE");
    setAtm("0");
    setStrikePrice("");
    setMayaResult(null);
    setSharekhanResult(null);
    setError(null);
  };

  const fillCommodityExample = () => {
    setExecute(false);
    setExchange("MCX");
    setSegment("FUT");
    setSymbolCode("");
    setSymbol("GOLD");
    setCallType("BUY");
    setContract("NEAR");
    setExpiry("MONTHLY");
    setExpiryDate("");
    setQtyDistribution("Fix");
    setQtyValue("1");
    setMayaResult(null);
    setSharekhanResult(null);
    setError(null);
  };

  const fillOptionsExample = () => {
    setExecute(false);
    setExchange("NFO");
    setSegment("OPT");
    setSymbolCode("");
    setSymbol("BANKNIFTY");
    setCallType("BUY");
    setContract("NEAR");
    setExpiry("WEEKLY");
    setExpiryDate("");
    setOptionType("CE");
    setAtm("0");
    setStrikePrice("");
    setQtyDistribution("Fix");
    setQtyValue("1");
    setMayaResult(null);
    setSharekhanResult(null);
    setError(null);
  };

  const validateCommon = () => {
    if (!sendMarketMaya && !sendSharekhan) {
      return "Enable Market Maya and/or Sharekhan before submitting.";
    }
    if (targetBy === "Ratio" && !sl.trim()) {
      return "Stop loss is required when Target by is Ratio.";
    }
    if (!usingSymbolCode && !symbol.trim()) {
      return "Symbol is required (or use Symbol code).";
    }
    if (!usingSymbolCode && (normalizedSegment === "FUT" || normalizedSegment === "OPT")) {
      if (!expiryDate.trim() && (!contract.trim() || !expiry.trim())) {
        return "For FUT/OPT: contract + expiry (or expiry date) is required.";
      }
    }
    if (!usingSymbolCode && normalizedSegment === "OPT") {
      if (!optionType.trim()) return "For OPT: option type is required.";
      if (!strikePrice.trim() && !atm.trim()) return "For OPT: atm or strike price is required.";
    }
    if (sendMarketMaya && !tokenTrimmed) {
      setTokenError("Market Maya token is required.");
      setShowTokenModal(true);
      return "Market Maya token is required.";
    }
    if (sendSharekhan && !sharekhanReady) {
      return "Sharekhan credentials missing. Connect Sharekhan from Strategy first, or fill API Key / Access Token / Customer ID / Login ID.";
    }
    if (sendSharekhan && sharekhanSession === "expired") {
      return "Sharekhan access token is expired. Reconnect Sharekhan, then try again.";
    }
    if (sendSharekhan && sharekhanSession !== "live") {
      return "Sharekhan session not verified yet. Tap Recheck session or reconnect.";
    }
    if (sendSharekhan && !qtyValue.trim()) {
      return "Qty value is required for Sharekhan orders.";
    }
    if (sendSharekhan && orderType === "LIMIT") {
      const price = Number(limitPrice.trim());
      if (!limitPrice.trim() || !Number.isFinite(price) || price <= 0) {
        return "Limit price is required for Sharekhan LIMIT orders.";
      }
    }
    return null;
  };

  const buildMayaPayload = () => {
    const resolvedExchange = pickExchangeForSegment(exchange, normalizedSegment);
    const payload: Record<string, unknown> = {
      token: tokenTrimmed || undefined,
      execute,
      exchange: resolvedExchange,
      call_type: callType,
      qty_distribution: qtyDistribution || undefined,
      qty_value: qtyValue || undefined,
      target_by: targetBy || undefined,
      target: target || undefined,
      sl_by: slBy || undefined,
      sl: sl || undefined,
      ...(trailSl ? { is_trail_sl: true } : {}),
      sl_move: slMove || undefined,
      profit_move: profitMove || undefined,
    };

    if (usingSymbolCode) {
      payload.symbol_code = symbolCode.trim();
    } else {
      payload.segment = normalizedSegment || undefined;
      payload.symbol = symbol.trim() ? symbol.trim() : undefined;
      if (normalizedSegment === "FUT" || normalizedSegment === "OPT") {
        if (expiryDate.trim()) {
          payload.expiry_date = expiryDate.trim();
        } else {
          payload.contract = contract.trim() || undefined;
          payload.expiry = expiry.trim() || undefined;
        }
      }
      if (normalizedSegment === "OPT") {
        payload.option_type = optionType.trim() || undefined;
        if (strikePrice.trim()) payload.strike_price = strikePrice.trim();
        else if (atm.trim()) payload.atm = atm.trim();
      }
    }
    return payload;
  };

  const buildSharekhanPayload = () => {
    const resolvedExchange = pickExchangeForSegment(exchange, normalizedSegment);
    return {
      execute,
      apiKey: sharekhanApiKey.trim(),
      accessToken: sharekhanAccessToken.trim(),
      customerId: sharekhanCustomerId.trim(),
      channelUser: sharekhanChannelUser.trim(),
      productType: sharekhanProductType.trim() || "INVESTMENT",
      exchange: resolvedExchange,
      segment: usingSymbolCode ? "EQ" : normalizedSegment,
      symbol: usingSymbolCode ? symbolCode.trim() : symbol.trim(),
      symbolToken: usingSymbolCode ? symbolCode.trim() : undefined,
      call_type: callType,
      quantity: qtyValue.trim(),
      orderType,
      ...(orderType === "LIMIT" ? { price: limitPrice.trim() } : { price: "0" }),
    };
  };

  const submitTrade = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMayaResult(null);
    setSharekhanResult(null);

    try {
      const validationError = validateCommon();
      if (validationError) {
        setError(validationError);
        return;
      }

      const token = getToken();
      const errors: string[] = [];

      if (sendMarketMaya) {
        const data = await apiPost("/api/v1/marketmaya/trade", buildMayaPayload(), token);
        setMayaResult(data as MarketMayaResponse);
        const maybe = data as { ok?: boolean; error?: string };
        if (maybe && typeof maybe === "object" && maybe.ok === false) {
          errors.push(maybe.error || "Market Maya request failed");
        }
      }

      if (sendSharekhan) {
        const data = await apiPost("/api/v1/sharekhan/trade", buildSharekhanPayload(), token);
        setSharekhanResult(data as Record<string, unknown>);
        const maybe = data as { ok?: boolean; error?: string; dryRun?: boolean };
        if (maybe && typeof maybe === "object" && maybe.ok === false) {
          errors.push(maybe.error || "Sharekhan request failed");
        }
      }

      if (errors.length) setError(errors.join(" · "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    setMayaResult(null);
    try {
      if (!tokenTrimmed) {
        setTokenError("Market Maya token is required.");
        setShowTokenModal(true);
        return;
      }
      const token = getToken();
      const data = await apiPost(
        "/api/v1/marketmaya/getcallhistory",
        { token: tokenTrimmed || undefined },
        token
      );
      setMayaResult(data as MarketMayaResponse);
      const maybe = data as { ok?: boolean; error?: string };
      if (maybe && typeof maybe === "object" && maybe.ok === false) {
        setError(maybe.error || "Market Maya request failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosition = async () => {
    setLoading(true);
    setError(null);
    setMayaResult(null);
    try {
      if (!tokenTrimmed) {
        setTokenError("Market Maya token is required.");
        setShowTokenModal(true);
        return;
      }
      const token = getToken();
      const data = await apiPost(
        "/api/v1/marketmaya/getsymbolposition",
        { token: tokenTrimmed || undefined },
        token
      );
      setMayaResult(data as MarketMayaResponse);
      const maybe = data as { ok?: boolean; error?: string };
      if (maybe && typeof maybe === "object" && maybe.ok === false) {
        setError(maybe.error || "Market Maya request failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const buildSharekhanCredsPayload = () => ({
    apiKey: sharekhanApiKey.trim(),
    accessToken: sharekhanAccessToken.trim(),
    customerId: sharekhanCustomerId.trim(),
    channelUser: sharekhanChannelUser.trim(),
  });

  const fetchSharekhanOrders = async () => {
    setLoading(true);
    setError(null);
    setSharekhanResult(null);
    try {
      if (!sharekhanReady) {
        setError("Sharekhan credentials missing. Connect Sharekhan first.");
        return;
      }
      const token = getToken();
      const data = await apiPost(
        "/api/v1/sharekhan/orders",
        buildSharekhanCredsPayload(),
        token
      );
      setSharekhanResult(data as Record<string, unknown>);
      const maybe = data as { ok?: boolean; error?: string; expired?: boolean };
      if (maybe?.expired) {
        setSharekhanSession("expired");
        setSharekhanSessionError(maybe.error || "Sharekhan access token is expired.");
      }
      if (maybe && typeof maybe === "object" && maybe.ok === false) {
        setError(maybe.error || "Sharekhan orders fetch failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sharekhan orders fetch failed";
      if (/expir|unauthor|invalid.*token|token.*invalid/i.test(msg)) {
        setSharekhanSession("expired");
        setSharekhanSessionError(msg);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharekhanPositions = async () => {
    setLoading(true);
    setError(null);
    setSharekhanResult(null);
    try {
      if (!sharekhanReady) {
        setError("Sharekhan credentials missing. Connect Sharekhan first.");
        return;
      }
      const token = getToken();
      const data = await apiPost(
        "/api/v1/sharekhan/positions",
        buildSharekhanCredsPayload(),
        token
      );
      setSharekhanResult(data as Record<string, unknown>);
      const maybe = data as { ok?: boolean; error?: string; expired?: boolean };
      if (maybe?.expired) {
        setSharekhanSession("expired");
        setSharekhanSessionError(maybe.error || "Sharekhan access token is expired.");
      }
      if (maybe && typeof maybe === "object" && maybe.ok === false) {
        setError(maybe.error || "Sharekhan positions fetch failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sharekhan positions fetch failed";
      if (/expir|unauthor|invalid.*token|token.*invalid/i.test(msg)) {
        setSharekhanSession("expired");
        setSharekhanSessionError(msg);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderSectionHeader = (title: string, icon: TradeIcon, tone: string, hint: string) => (
    <div className="form-section-header">
      <span className={`section-icon form-section--${tone}`} aria-hidden="true">
        {renderTradeIcon(icon)}
      </span>
      <div className="form-section-heading-copy">
        <div className="section-title">{title}</div>
        <p className="form-section-desc">{hint}</p>
      </div>
    </div>
  );

  const renderSwitch = (
    id: string,
    checked: boolean,
    onChange: (next: boolean) => void,
    title: string,
    description: string,
    tone: "maya" | "broker" | "risk",
    icon: TradeIcon
  ) => (
    <div className={`switch-row tone-${tone}${checked ? " is-on" : ""}`}>
      <div className="switch-row-main">
        <span className="switch-mini-icon" aria-hidden="true">
          {renderTradeIcon(icon)}
        </span>
        <div className="switch-row-copy">
          <span className="switch-row-title">{title}</span>
          <span className="switch-row-desc">{description}</span>
        </div>
      </div>
      <label className="info-toggle" htmlFor={id}>
        <span className={`info-switch${checked ? " on" : ""}`}>
          <span className="info-switch-thumb" />
        </span>
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-label={title}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    </div>
  );

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Manual trade</div>
          <div className="helper">Preview by default. Send to Market Maya, Sharekhan, or both.</div>
        </div>
        <div className="cta-row">
          <button className="btn btn-secondary" type="button" onClick={fillExample}>
            Equity
          </button>
          <button className="btn btn-secondary" type="button" onClick={fillCommodityExample}>
            Commodity
          </button>
          <button className="btn btn-secondary" type="button" onClick={fillOptionsExample}>
            Options
          </button>
          {sendMarketMaya ? (
            <button className="btn btn-ghost" type="button" onClick={() => setShowTokenModal(true)}>
              Maya token
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form className="modal-form" onSubmit={submitTrade}>
        <div className="form-section form-section--teal form-reveal">
          {renderSectionHeader(
            "Destinations",
            "broadcast",
            "teal",
            "Choose where this manual order should go."
          )}
          {renderSwitch(
            "trade-maya",
            sendMarketMaya,
            setSendMarketMaya,
            "Market Maya",
            "Send to Market Maya REST custom-trade.",
            "maya",
            "broadcast"
          )}
          {renderSwitch(
            "trade-sharekhan",
            sendSharekhan,
            setSendSharekhan,
            "Sharekhan direct",
            "Place the same symbol/side on your Sharekhan account.",
            "broker",
            "broker"
          )}
          {sendSharekhan ? (
            <div
              className={`alert ${
                sharekhanSession === "live"
                  ? "alert-success"
                  : sharekhanSession === "checking" || sharekhanSession === "unknown"
                    ? "alert"
                    : "alert-error"
              }`}
            >
              {sharekhanSession === "checking"
                ? "Checking Sharekhan session..."
                : sharekhanSession === "live"
                  ? `Sharekhan live${sharekhanChannelUser ? ` · ${sharekhanChannelUser}` : ""}.`
                  : sharekhanSession === "expired"
                    ? `Sharekhan token expired${sharekhanChannelUser ? ` · ${sharekhanChannelUser}` : ""}. Reconnect to continue.`
                    : sharekhanSessionError ||
                      "Sharekhan credentials missing. Login again from Strategy or reconnect here."}
            </div>
          ) : null}
          {sendSharekhan ? (
            <div className="grid-2" style={{ marginTop: "8px" }}>
              <div className="input-group">
                <label className="label" htmlFor="sk-product">
                  Sharekhan product
                </label>
                <select
                  className="select"
                  id="sk-product"
                  value={sharekhanProductType}
                  onChange={(event) => setSharekhanProductType(event.target.value)}
                >
                  <option value="INVESTMENT">INVESTMENT (Delivery)</option>
                  <option value="BIGTRADE">BIGTRADE (Intraday)</option>
                  <option value="BIGTRADEPLUS">BIGTRADEPLUS</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label" htmlFor="sk-login">
                  Login ID
                </label>
                <input
                  className="input"
                  id="sk-login"
                  value={sharekhanChannelUser}
                  onChange={(event) => setSharekhanChannelUser(event.target.value)}
                  placeholder="Sharekhan login / channelUser"
                />
              </div>
            </div>
          ) : null}
          {sendSharekhan ? (
            <div className="cta-row" style={{ marginTop: "10px" }}>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={sharekhanSession === "checking"}
                onClick={() => verifySharekhanSession()}
              >
                {sharekhanSession === "checking" ? "Checking..." : "Recheck session"}
              </button>
              <a className="btn btn-primary" href="/strategy">
                {sharekhanSession === "expired" || sharekhanSession === "missing"
                  ? "Reconnect on Strategy"
                  : "Open Strategy login"}
              </a>
            </div>
          ) : null}
        </div>

        <div className="form-section form-section--slate form-reveal">
          {renderSectionHeader(
            "Instrument",
            "layers",
            "slate",
            "Pick exchange, segment, and symbol for the order."
          )}
          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-exchange">
                Exchange
              </label>
              <select
                className="select"
                id="mm-exchange"
                value={exchange}
                onChange={(event) => setExchange(event.target.value)}
              >
                {exchangeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="label" htmlFor="mm-segment">
                Segment
              </label>
              <select
                className="select"
                id="mm-segment"
                value={segment}
                onChange={(event) => setSegment(event.target.value)}
                disabled={usingSymbolCode}
              >
                <option value="EQ">Equity (EQ)</option>
                <option value="FUT">Futures / Commodity</option>
                <option value="OPT">Options</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-symbol">
                Symbol
              </label>
              <div className="stock-suggest-wrap">
                <input
                  className="input"
                  id="mm-symbol"
                  value={symbol}
                  onChange={(event) => {
                    setSymbol(event.target.value.toUpperCase());
                    setShowSymbolSuggestions(true);
                    // Typing a name should exit numeric token mode.
                    if (symbolCode.trim() && !/^\d+$/.test(symbolCode.trim())) {
                      setSymbolCode("");
                    }
                  }}
                  onFocus={() => {
                    if (symbolSuggestions.length > 0 || symbol.trim().length >= 2) {
                      setShowSymbolSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setShowSymbolSuggestions(false), 150);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && symbolSuggestions[0]) {
                      event.preventDefault();
                      handleSelectSymbol(symbolSuggestions[0]);
                    }
                  }}
                  placeholder="Type ONGC / RELIANCE to search"
                  autoComplete="off"
                />
                {showSymbolSuggestions &&
                (symbolSearching || symbolSuggestions.length > 0) ? (
                  <div className="stock-suggest-menu" role="listbox">
                    {symbolSearching && symbolSuggestions.length === 0 ? (
                      <div className="stock-suggest-empty">Searching...</div>
                    ) : null}
                    {!symbolSearching &&
                    symbol.trim().length >= 2 &&
                    symbolSuggestions.length === 0 ? (
                      <div className="stock-suggest-empty">No instruments found</div>
                    ) : null}
                    {symbolSuggestions.map((hit) => (
                      <button
                        key={`${hit.exchange || "X"}:${hit.token || hit.symbol}`}
                        type="button"
                        className="stock-suggest-item"
                        role="option"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectSymbol(hit)}
                      >
                        <span>
                          <span className="stock-suggest-symbol">
                            {formatInstrumentSuggestion(hit)}
                          </span>
                          {hit.name ? (
                            <span className="stock-suggest-meta">{hit.name}</span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="helper">Type 2+ letters — pick from suggestions.</div>
            </div>
            <div className="input-group">
              <label className="label" htmlFor="mm-symbol-code">
                Scrip / token (optional)
              </label>
              <input
                className="input"
                id="mm-symbol-code"
                value={symbolCode}
                onChange={(event) => {
                  const next = event.target.value.trim();
                  // If user types letters here by mistake, route into Symbol search.
                  if (/[A-Za-z]/.test(next)) {
                    setSymbolCode("");
                    setSymbol(next.toUpperCase());
                    setShowSymbolSuggestions(true);
                    return;
                  }
                  setSymbolCode(next.replace(/[^\d]/g, ""));
                }}
                placeholder="Numeric only, e.g. 2885"
                inputMode="numeric"
              />
              <div className="helper">
                Advanced: Market Maya symbol_code. Leave empty for normal search.
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-call-type">
                Call type
              </label>
              <select
                className="select"
                id="mm-call-type"
                value={callType}
                onChange={(event) => setCallType(event.target.value)}
              >
                {CALL_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              {renderSwitch(
                "mm-execute",
                execute,
                setExecute,
                "Execute live",
                "OFF = preview only. ON = place real order.",
                "risk",
                "play"
              )}
            </div>
          </div>

          {sendSharekhan ? (
            <div className="grid-2">
              <div className="input-group">
                <label className="label" htmlFor="sk-order-type">
                  Sharekhan order type
                </label>
                <select
                  className="select"
                  id="sk-order-type"
                  value={orderType}
                  onChange={(event) =>
                    setOrderType(event.target.value === "LIMIT" ? "LIMIT" : "MARKET")
                  }
                >
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                </select>
              </div>
              {orderType === "LIMIT" ? (
                <div className="input-group">
                  <label className="label" htmlFor="sk-limit-price">
                    Limit price
                  </label>
                  <input
                    className="input"
                    id="sk-limit-price"
                    value={limitPrice}
                    onChange={(event) => setLimitPrice(event.target.value)}
                    placeholder="e.g. 240.50"
                    inputMode="decimal"
                  />
                  <div className="helper">Sharekhan places NORMAL order at this price.</div>
                </div>
              ) : (
                <div className="helper" style={{ alignSelf: "end", paddingBottom: 8 }}>
                  Market = price 0 (immediate).
                </div>
              )}
            </div>
          ) : null}

          {showDerivativeFields ? (
            <>
              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="mm-contract">
                    Contract
                  </label>
                  <select
                    className="select"
                    id="mm-contract"
                    value={contract}
                    onChange={(event) => setContract(event.target.value)}
                  >
                    <option value="NEAR">NEAR</option>
                    <option value="NEXT">NEXT</option>
                    <option value="FAR">FAR</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="mm-expiry">
                    Expiry
                  </label>
                  <select
                    className="select"
                    id="mm-expiry"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                  >
                    {expiryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="label" htmlFor="mm-expiry-date">
                  Expiry date (optional, dd-MM-yyyy)
                </label>
                <input
                  className="input"
                  id="mm-expiry-date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  placeholder="e.g. 25-09-2024"
                />
              </div>
            </>
          ) : null}

          {showOptionFields ? (
            <div className="grid-2">
              <div className="input-group">
                <label className="label" htmlFor="mm-option-type">
                  Option type
                </label>
                <select
                  className="select"
                  id="mm-option-type"
                  value={optionType}
                  onChange={(event) => setOptionType(event.target.value)}
                >
                  <option value="CE">CE</option>
                  <option value="PE">PE</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label" htmlFor="mm-atm">
                  ATM / Strike
                </label>
                <div className="grid-2">
                  <input
                    className="input"
                    id="mm-atm"
                    value={atm}
                    onChange={(event) => setAtm(event.target.value)}
                    placeholder="ATM 0"
                  />
                  <input
                    className="input"
                    id="mm-strike"
                    value={strikePrice}
                    onChange={(event) => setStrikePrice(event.target.value)}
                    placeholder="Strike"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="form-section form-section--risk form-reveal">
          {renderSectionHeader(
            "Qty & risk",
            "shield",
            "risk",
            "Quantity is required for Sharekhan. Target/SL apply mainly to Market Maya."
          )}
          <div className="grid-2">
            <div className="input-group">
              <label className="label" htmlFor="mm-qty-distribution">
                Qty distribution
              </label>
              <select
                className="select"
                id="mm-qty-distribution"
                value={qtyDistribution}
                onChange={(event) => setQtyDistribution(event.target.value)}
              >
                <option value="">Select distribution</option>
                <option value="Fix">Fix</option>
                <option value="Capital(%)">Capital(%)</option>
                <option value="Capital Risk(%)">Capital Risk(%)</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label" htmlFor="mm-qty-value">
                Qty value
              </label>
              <input
                className="input"
                id="mm-qty-value"
                value={qtyValue}
                onChange={(event) => setQtyValue(event.target.value)}
                placeholder="e.g. 1"
              />
            </div>
          </div>

          <div className="risk-highlight risk-highlight-target">
            <div className="risk-highlight-head">
              <span className="section-icon form-section--amber" aria-hidden="true">
                {renderTradeIcon("target")}
              </span>
              <span className="risk-pill risk-pill-target">Target</span>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="label" htmlFor="mm-target-by">
                  Target by
                </label>
                <select
                  className="select"
                  id="mm-target-by"
                  value={targetBy}
                  onChange={(event) => setTargetBy(event.target.value)}
                >
                  <option value="">Select target type</option>
                  <option value="Money">Money</option>
                  <option value="Point">Point</option>
                  <option value="Percentage">Percentage</option>
                  <option value="Price">Price</option>
                  <option value="Ratio">Ratio</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label" htmlFor="mm-target">
                  Target
                </label>
                <input
                  className="input"
                  id="mm-target"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder={targetPlaceholder}
                />
                {isRatioTarget ? (
                  <div className="helper">
                    {!sl.trim()
                      ? "Set SL to use ratio."
                      : ratioComputed
                        ? `Computed target: ${ratioComputed}`
                        : "Enter ratio like 1:2"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="risk-highlight risk-highlight-stop">
            <div className="risk-highlight-head">
              <span className="section-icon form-section--risk" aria-hidden="true">
                {renderTradeIcon("stop")}
              </span>
              <span className="risk-pill risk-pill-stop">Stop loss</span>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="label" htmlFor="mm-sl-by">
                  SL by
                </label>
                <select
                  className="select"
                  id="mm-sl-by"
                  value={slBy}
                  onChange={(event) => setSlBy(event.target.value)}
                >
                  <option value="">Select SL type</option>
                  <option value="Money">Money</option>
                  <option value="Point">Point</option>
                  <option value="Percentage">Percentage</option>
                  <option value="Price">Price</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label" htmlFor="mm-sl">
                  SL
                </label>
                <input
                  className="input"
                  id="mm-sl"
                  value={sl}
                  onChange={(event) => setSl(event.target.value)}
                  placeholder="e.g. 25"
                />
              </div>
            </div>
            {renderSwitch(
              "mm-trail",
              trailSl,
              setTrailSl,
              "Trail SL",
              "Move stop as price moves in profit.",
              "risk",
              "stop"
            )}
            <div className="grid-2">
              <div className="input-group">
                <label className="label" htmlFor="mm-sl-move">
                  SL move
                </label>
                <input
                  className="input"
                  id="mm-sl-move"
                  value={slMove}
                  onChange={(event) => setSlMove(event.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="input-group">
                <label className="label" htmlFor="mm-profit-move">
                  Profit move
                </label>
                <input
                  className="input"
                  id="mm-profit-move"
                  value={profitMove}
                  onChange={(event) => setProfitMove(event.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Submitting..." : execute ? "Execute trade" : "Preview trade"}
          </button>
          {sendMarketMaya ? (
            <>
              <button className="btn btn-ghost" type="button" disabled={loading} onClick={fetchHistory}>
                Maya call history
              </button>
              <button className="btn btn-ghost" type="button" disabled={loading} onClick={fetchPosition}>
                Maya position
              </button>
            </>
          ) : null}
          {sendSharekhan ? (
            <>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={loading}
                onClick={fetchSharekhanOrders}
              >
                Sharekhan orders
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={loading}
                onClick={fetchSharekhanPositions}
              >
                Sharekhan positions
              </button>
            </>
          ) : null}
        </div>
      </form>

      {mayaResult ? (
        <div className="card form-section form-section--teal" style={{ marginTop: "16px" }}>
          <div className="form-section-header">
            <span className="section-icon form-section--teal" aria-hidden="true">
              {renderTradeIcon("broadcast")}
            </span>
            <div className="section-title">Market Maya response</div>
          </div>
          {mayaResponseView ? (
            <>
              <div style={{ marginTop: "12px" }}>
                <span className={`status-chip ${mayaResponseView.tone}`}>{mayaResponseView.status}</span>
              </div>
              <div className="helper" style={{ marginTop: "10px" }}>
                {mayaResponseView.message}
              </div>
              {mayaResponseView.details.length ? (
                <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
                  {mayaResponseView.details.map((item) => (
                    <div
                      className="list-item"
                      key={`${item.label}-${item.value}`}
                      style={{ justifyContent: "space-between", gap: "12px" }}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <details style={{ marginTop: "12px" }}>
                <summary className="helper" style={{ cursor: "pointer" }}>
                  Technical details
                </summary>
                <pre className="mono" style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
                  {mayaResponseView.raw}
                </pre>
              </details>
            </>
          ) : null}
        </div>
      ) : null}

      {sharekhanResult ? (
        <div className="card form-section form-section--broker" style={{ marginTop: "16px" }}>
          <div className="form-section-header">
            <span className="section-icon form-section--broker" aria-hidden="true">
              {renderTradeIcon("broker")}
            </span>
            <div className="section-title">
              {sharekhanResult.type === "orders"
                ? "Sharekhan day orders"
                : sharekhanResult.type === "positions"
                  ? "Sharekhan positions"
                  : "Sharekhan response"}
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <span
              className={`status-chip ${
                sharekhanResult.ok === false ? "danger" : sharekhanResult.dryRun ? "warn" : "success"
              }`}
            >
              {sharekhanResult.dryRun
                ? "Preview"
                : sharekhanResult.ok === false
                  ? "Failed"
                  : sharekhanResult.type === "orders" || sharekhanResult.type === "positions"
                    ? "Loaded"
                    : "Sent"}
            </span>
            {sharekhanResult.orderId ? (
              <span className="helper" style={{ marginLeft: "10px" }}>
                Order ID: {String(sharekhanResult.orderId)}
              </span>
            ) : null}
          </div>
          {sharekhanResult.error ? (
            <div className="helper" style={{ marginTop: "10px" }}>
              {String(sharekhanResult.error)}
            </div>
          ) : null}
          <div className="helper" style={{ marginTop: "8px" }}>
            Call history is Market Maya only. Sharekhan orders/positions come from Sharekhan reports API.
          </div>
          <details style={{ marginTop: "12px" }} open>
            <summary className="helper" style={{ cursor: "pointer" }}>
              Technical details
            </summary>
            <pre className="mono" style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(sharekhanResult, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}

      {showTokenModal ? (
        <div className="modal-overlay" onClick={() => setShowTokenModal(false)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="page-title">Market Maya token</div>
            <div className="helper" style={{ marginTop: "6px" }}>
              Needed only when Market Maya destination is ON.
            </div>
            {tokenError ? (
              <div className="alert alert-error" style={{ marginTop: "12px" }}>
                {tokenError}
              </div>
            ) : null}
            <div className="input-group" style={{ marginTop: "12px" }}>
              <label className="label" htmlFor="mm-token-modal">
                Token
              </label>
              <input
                className="input"
                id="mm-token-modal"
                value={tokenInput}
                onChange={(event) => {
                  setTokenInput(event.target.value);
                  if (tokenError) setTokenError(null);
                }}
                placeholder="Paste Market Maya token"
              />
              {tokenWarning ? <div className="helper">{tokenWarning}</div> : null}
            </div>
            <div className="cta-row" style={{ marginTop: "16px" }}>
              <button className="btn btn-primary" type="button" onClick={handleSaveToken}>
                Save token
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowTokenModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
