"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, resolveApiBaseUrl } from "@/lib/api";
import { getSharekhanToken } from "@/lib/auth";
import TradeShareCard, { CARD_THEMES, type CardThemeId, type TradeCardData } from "@/components/TradeShareCard";

type Details = {
  stock: string;
  tradingSymbol: string;
  scripCode: string;
  side: string;
  quantity: string;
  price: string;
  exchange: string;
  segment: string;
  expiry: string;
  strike: string;
  optionType: string;
  lotSize: string;
  orderType: string;
  productType: string;
  validity: string;
  triggerPrice: string;
  notes: string;
  buyRange: string;
  target: string;
  target1: string;
  target2: string;
  target3: string;
  stopLoss: string;
  timeFrame: string;
  headline: string;
};
type Instrument = { token: string; symbol: string; name?: string; exchange: string; instrumentType?: string; expiry?: string; strike?: string; lotSize?: string };
type Expiry = { expiry: string; contracts: number };
type LinkRecord = {
  code: string;
  shortUrl: string;
  kind: string;
  payload?: string;
  details: Partial<Details> & {
    card?: Partial<Pick<Details, "buyRange" | "target" | "target1" | "target2" | "target3" | "stopLoss" | "timeFrame" | "headline">>;
  };
  active: boolean;
  preserved?: boolean;
  clicks: number;
};

/** Verified live F&O one-tap demos — compact sample chips in UI. */
const PRESERVED_DEMOS: Array<{
  code: string;
  segment: "FUT" | "OPT";
  label: string;
  tradingSymbol: string;
  payload: string;
}> = [
  {
    code: "2345fbe7fe74f8223b",
    segment: "OPT",
    label: "Option sample",
    tradingSymbol: "RELIANCE26NOV1400CE",
    payload: "131$12$126008$1$$1",
  },
  {
    code: "Gyi-0b3PW3pLYCSC",
    segment: "OPT",
    label: "2 leg sample",
    tradingSymbol: "INDIGO26NOV4900CE",
    payload: "181$NF-127904-BUY-0-150_NF-103787-SELL-0-150$2826052",
  },
  {
    code: "tCHsZSQE5SH0jdw7",
    segment: "OPT",
    label: "Bracket sample",
    tradingSymbol: "INDIGO26NOV4900CE",
    payload: "131$12$127904$1$0$1$0$0$130$78$0$2826052",
  },
  {
    code: "1bb9d47de34f074fb2",
    segment: "FUT",
    label: "Future sample",
    tradingSymbol: "RELIANCE26NOVFUT",
    payload: "131$12$61697$1$$1",
  },
];
type PreviewModel = {
  tradingSymbol: string;
  stock: string;
  side: string;
  exchange: string;
  segment: string;
  headline: string;
  buyRange: string;
  target: string;
  target1: string;
  target2: string;
  target3: string;
  stopLoss: string;
  timeFrame: string;
  notes: string;
  code?: string;
};

const blank: Details = {
  stock: "",
  tradingSymbol: "",
  scripCode: "",
  side: "BUY",
  quantity: "1",
  price: "0",
  exchange: "NSE",
  segment: "EQ",
  expiry: "",
  strike: "",
  optionType: "",
  lotSize: "",
  orderType: "NORMAL",
  productType: "INVESTMENT",
  validity: "GFD",
  triggerPrice: "",
  notes: "",
  buyRange: "",
  target: "",
  target1: "",
  target2: "",
  target3: "",
  stopLoss: "",
  timeFrame: "",
  headline: "",
};

type Leg2Details = {
  tradingSymbol: string;
  scripCode: string;
  stock: string;
  side: string;
  quantity: string;
  price: string;
  exchange: string;
  segment: string;
  expiry: string;
  strike: string;
  optionType: string;
  buyRange: string;
};

const blankLeg2: Leg2Details = {
  tradingSymbol: "",
  scripCode: "",
  stock: "",
  side: "SELL",
  quantity: "1",
  price: "0",
  exchange: "NFO",
  segment: "OPT",
  expiry: "",
  strike: "",
  optionType: "CE",
  buyRange: "",
};

const equityExchanges = ["NSE", "BSE"];
const derivativeExchanges = ["NFO", "BFO", "MCX", "CDS"];

const orderTypes = [
  { value: "NORMAL", label: "Market" },
  { value: "LIMIT", label: "Limit" },
  { value: "STOPLOSS", label: "Stop loss limit" },
  { value: "STOPLOSS_MARKET", label: "Stop loss market" },
  { value: "BRACKET", label: "Bracket (target + SL)" },
];
const productTypes = [
  { value: "INVESTMENT", label: "Delivery (Investment)" },
  { value: "BIGTRADE", label: "Intraday (BigTrade)" },
  { value: "BIGTRADEPLUS", label: "BigTrade+ (bracket)" },
];
const segments = [
  { value: "EQ", label: "Equity" },
  { value: "FUT", label: "Futures" },
  { value: "OPT", label: "Options" },
];

function segmentLabel(segment?: string) {
  if (segment === "FUT") return "Futures";
  if (segment === "OPT") return "Options";
  return "Equity";
}

function orderTypeShort(value?: string) {
  if (value === "LIMIT") return "LMT";
  if (value === "STOPLOSS") return "SL";
  if (value === "STOPLOSS_MARKET") return "SL-M";
  if (value === "BRACKET") return "BRACKET";
  return "MKT";
}

function productShort(value?: string) {
  if (value === "BIGTRADEPLUS") return "BigTrade+";
  if (value === "BIGTRADE") return "Intraday";
  if (value === "INVESTMENT") return "Delivery";
  return value || "";
}

function secondLeg(details: object | null | undefined): Partial<Leg2Details> | undefined {
  const source = details as { leg2?: Partial<Leg2Details>; legs?: Partial<Leg2Details>[] } | null | undefined;
  const direct = source?.leg2;
  if (direct && (direct.tradingSymbol || direct.scripCode)) return direct;
  const fromLegs = source?.legs?.[1];
  if (fromLegs && (fromLegs.tradingSymbol || fromLegs.scripCode)) return fromLegs;
  return undefined;
}

function toCardData(link: LinkRecord): TradeCardData {
  const d = link.details || {};
  const card = d.card || {};
  const extra = d as typeof d & { approxMargin?: string };
  const leg = secondLeg(d);
  return {
    code: link.code,
    shortUrl: link.shortUrl,
    tradingSymbol: String(d.tradingSymbol || ""),
    stock: String(d.stock || ""),
    side: String(d.side || "BUY"),
    exchange: String(d.exchange || ""),
    segment: String(d.segment || "EQ"),
    expiry: String(d.expiry || ""),
    strike: String(d.strike || ""),
    optionType: String(d.optionType || ""),
    quantity: d.quantity as string | number | undefined,
    price: d.price as string | number | undefined,
    productType: String(d.productType || ""),
    notes: String(d.notes || ""),
    buyRange: String(card.buyRange || d.buyRange || ""),
    target: String(card.target || d.target || ""),
    target1: String(card.target1 || d.target1 || String(card.target || d.target || "").split("/")[0] || "").trim(),
    target2: String(card.target2 || d.target2 || String(card.target || d.target || "").split("/")[1] || "").trim(),
    target3: String(card.target3 || d.target3 || String(card.target || d.target || "").split("/")[2] || "").trim(),
    stopLoss: String(card.stopLoss || d.stopLoss || ""),
    timeFrame: String(card.timeFrame || d.timeFrame || ""),
    headline: String(card.headline || d.headline || ""),
    leg2: leg
      ? {
          tradingSymbol: String(leg.tradingSymbol || ""),
          side: String(leg.side || "SELL"),
          quantity: leg.quantity as string | number | undefined,
          price: leg.price as string | number | undefined,
          buyRange: String(leg.buyRange || ""),
          stock: String(leg.stock || ""),
          exchange: String(leg.exchange || ""),
          segment: String(leg.segment || ""),
          expiry: String(leg.expiry || ""),
          strike: String(leg.strike || ""),
          optionType: String(leg.optionType || ""),
        }
      : undefined,
    approxMargin: String(extra.approxMargin || ""),
  };
}

function previewFromCard(card: TradeCardData): PreviewModel {
  const side = String(card.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
  const product = String(card.productType || "").includes("BIGTRADE") ? "Equity Intraday" : "Equity Delivery";
  return {
    tradingSymbol: card.tradingSymbol || "SYMBOL",
    stock: card.stock || card.tradingSymbol || "Company name",
    side,
    exchange: card.exchange || "NSE",
    segment: card.segment || "EQ",
    headline: card.headline || `${product} ${side === "SELL" ? "Sell" : "Buy"}`,
    buyRange: card.buyRange || "—",
    target: card.target || "—",
    target1: card.target1 || String(card.target || "").split("/")[0]?.trim() || "—",
    target2: card.target2 || String(card.target || "").split("/")[1]?.trim() || "—",
    target3: card.target3 || String(card.target || "").split("/")[2]?.trim() || "—",
    stopLoss: card.stopLoss || "—",
    timeFrame: card.timeFrame || (product.includes("Intraday") ? "INTRADAY" : "DELIVERY"),
    notes: card.notes || "Follow the plan and manage risk.",
    code: card.code,
  };
}

function OrderPreview({ model, theme }: { model: PreviewModel; theme: CardThemeId }) {
  const side = model.side === "SELL" ? "SELL" : "BUY";
  const qr = model.code
    ? `${resolveApiBaseUrl()}/api/v1/order-intents/${encodeURIComponent(model.code)}/qr.png`
    : "";
  return (
    <article className={`sk-idea sk-idea-${theme}`}>
      <div className="sk-idea-top">
        <span className="sk-idea-brand">Emotionless Traders</span>
        <span className="sk-idea-kicker">TRADE IDEA</span>
      </div>
      <h3>{model.tradingSymbol || "SYMBOL"}</h3>
      <p className="sk-idea-name">{model.stock || "Company name"}</p>
      <div className="sk-idea-meta">
        <span className={`sk-chip sk-chip-${side.toLowerCase()}`}>{side}</span>
        <span>
          {model.exchange || "NSE"} · {segmentLabel(model.segment)}
        </span>
      </div>
      <div className="sk-idea-headline">{model.headline}</div>
      <div className="sk-idea-stats sk-idea-stats-5">
        <div>
          <span>{side === "SELL" ? "Sell Range" : "Buy Range"}</span>
          <strong>{model.buyRange || "—"}</strong>
        </div>
        <div className="is-target">
          <span>Target 1</span>
          <strong>{model.target1 || "—"}</strong>
        </div>
        <div className="is-target">
          <span>Target 2</span>
          <strong>{model.target2 || "—"}</strong>
        </div>
        <div className="is-target">
          <span>Target 3</span>
          <strong>{model.target3 || "—"}</strong>
        </div>
        <div className="is-stop">
          <span>Stop Loss</span>
          <strong>{model.stopLoss || "—"}</strong>
        </div>
      </div>
      <div className="sk-idea-bottom">
        <div>
          <span>Time Frame</span>
          <strong>{model.timeFrame || "—"}</strong>
          <span className="sk-idea-notes-label">Notes</span>
          <p>{model.notes || "Follow the plan and manage risk."}</p>
        </div>
        <div className="sk-idea-qr">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Order QR code" />
          ) : (
            <div className="sk-qr-empty">QR</div>
          )}
          <small>Scan to open in Sharekhan</small>
        </div>
      </div>
      <footer>
        <span>Trade Responsibly · Not a recommendation</span>
        <strong>Emotionless Traders</strong>
      </footer>
    </article>
  );
}

function asText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export default function SharekhanLinksPage() {
  const previewRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [details, setDetails] = useState<Details>(blank);
  const [multiLeg, setMultiLeg] = useState(false);
  const [leg2, setLeg2] = useState<Leg2Details>(blankLeg2);
  const [strategyName, setStrategyName] = useState("");
  const [approxMargin, setApproxMargin] = useState("");
  const [reuseFrom, setReuseFrom] = useState("");
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Instrument[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [leg2Query, setLeg2Query] = useState("");
  const [leg2Suggestions, setLeg2Suggestions] = useState<Instrument[]>([]);
  const [leg2Searching, setLeg2Searching] = useState(false);
  const [leg2SearchError, setLeg2SearchError] = useState("");
  const [showLeg2Suggestions, setShowLeg2Suggestions] = useState(false);
  const [expiries, setExpiries] = useState<Expiry[]>([]);
  const [loadingExpiries, setLoadingExpiries] = useState(false);
  const [expiryError, setExpiryError] = useState("");
  const [shareCard, setShareCard] = useState<TradeCardData | null>(null);
  const [pinned, setPinned] = useState<PreviewModel | null>(null);
  const [cardTheme, setCardTheme] = useState<CardThemeId>("classic");
  const [tableQuery, setTableQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [formTab, setFormTab] = useState<"instrument" | "order" | "card">("instrument");

  useEffect(() => {
    const term = leg2Query.trim();
    if (!multiLeg || term.length < 2 || (leg2.scripCode && term === leg2.tradingSymbol)) {
      setLeg2Suggestions([]);
      setLeg2Searching(false);
      setLeg2SearchError("");
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLeg2Searching(true);
      setLeg2SearchError("");
      try {
        const token = getSharekhanToken();
        if (!token) throw new Error("Sharekhan session missing. Sign in again.");
        const params = new URLSearchParams({ q: term, exchange: leg2.exchange || details.exchange, segment: "OPT", expiry: leg2.expiry || details.expiry, limit: "15" });
        const response = await apiGet(`/api/v1/sharekhan/instruments/search?${params}`, token) as { instruments?: Instrument[]; hint?: string };
        if (cancelled) return;
        const rows = Array.isArray(response.instruments) ? response.instruments : [];
        setLeg2Suggestions(rows);
        if (!rows.length) setLeg2SearchError(response.hint || "No matching option contracts. Check exchange and expiry.");
      } catch (err) {
        if (!cancelled) { setLeg2Suggestions([]); setLeg2SearchError(err instanceof Error ? err.message : "Instrument search failed."); }
      } finally { if (!cancelled) setLeg2Searching(false); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [leg2Query, leg2.exchange, leg2.expiry, leg2.scripCode, leg2.tradingSymbol, details.exchange, details.expiry, multiLeg]);

  function selectLeg2Instrument(item: Instrument) {
    setLeg2((prev) => ({ ...prev, tradingSymbol: item.symbol, scripCode: item.token, stock: item.name || item.symbol, exchange: item.exchange, segment: "OPT", expiry: item.expiry || prev.expiry, strike: item.strike || "", optionType: /PE$/i.test(item.symbol) ? "PE" : "CE" }));
    setLeg2Query(item.symbol);
    setLeg2Suggestions([]);
    setLeg2SearchError("");
    setShowLeg2Suggestions(false);
  }

  const refresh = useCallback(async () => {
    const response = await apiGet("/api/v1/sharekhan/links", getSharekhanToken()) as { links: LinkRecord[] };
    setLinks(response.links);
  }, []);
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);
  useEffect(() => {
    const term = query.trim();
    // After a result is picked we keep symbol in the box — don't re-search that selection.
    const alreadySelected =
      Boolean(details.scripCode) &&
      (term === details.tradingSymbol ||
        term.startsWith(`${details.tradingSymbol} ·`) ||
        term.includes(" · "));
    if (alreadySelected) {
      setSuggestions([]);
      setSearching(false);
      setSearchError("");
      return;
    }
    if (term.length < 2 && (details.segment === "EQ" || !details.expiry)) {
      setSuggestions([]);
      setSearching(false);
      setSearchError("");
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const token = getSharekhanToken();
        if (!token) throw new Error("Sharekhan session missing. Sign in again.");
        const params = new URLSearchParams({
          q: term,
          exchange: details.exchange,
          segment: details.segment,
          expiry: details.expiry,
          limit: "15",
        });
        const response = await apiGet(`/api/v1/sharekhan/instruments/search?${params}`, token) as {
          instruments?: Instrument[];
          hint?: string;
        };
        if (cancelled) return;
        const rows = Array.isArray(response.instruments) ? response.instruments : [];
        setSuggestions(rows);
        if (!rows.length) {
          setSearchError(
            response.hint ||
              (details.segment === "EQ"
                ? `No equity match on ${details.exchange}. Try NSE/BSE symbol like RELIANCE.`
                : `No ${details.segment === "OPT" ? "option" : "futures"} match on ${details.exchange}${details.expiry ? ` for expiry ${details.expiry}` : ". Select expiry first"}.`)
          );
        }
      } catch (err) {
        if (cancelled) return;
        setSuggestions([]);
        setSearchError(err instanceof Error ? err.message : "Instrument search failed.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query, details.exchange, details.segment, details.expiry, details.scripCode, details.tradingSymbol]);
  useEffect(() => {
    if (details.segment === "EQ") { setExpiries([]); return; }
    let cancelled = false;
    const underlying = (query || leg2Query).trim();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ exchange: details.exchange, segment: details.segment });
      if (underlying.length >= 2) params.set("q", underlying);
      setLoadingExpiries(true);
      setExpiryError("");
      apiGet(`/api/v1/sharekhan/instruments/expiries?${params}`, getSharekhanToken())
      .then((response) => {
        if (cancelled) return;
        const rows = (response as { expiries?: Expiry[] }).expiries || [];
        setExpiries(rows);
        if (rows.length) {
          const known = new Set(rows.map((item) => item.expiry));
          setDetails((current) => (current.expiry && !known.has(current.expiry) ? { ...current, expiry: "" } : current));
          setLeg2((current) => (current.expiry && !known.has(current.expiry) ? { ...current, expiry: "" } : current));
        }
        if (!rows.length) setExpiryError("No contract expiries are available for this exchange. Check the instrument master and try again.");
      })
      .catch((err) => {
        if (cancelled) return;
        setExpiries([]);
        setExpiryError(err instanceof Error ? err.message : "Could not load contract expiries. Please retry.");
      })
      .finally(() => { if (!cancelled) setLoadingExpiries(false); });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [details.exchange, details.segment, query, leg2Query]);

  function update(key: keyof Details, value: string) {
    setPinned(null);
    setDetails((current) => ({ ...current, [key]: value }));
  }
  function updateLeg2(key: keyof Leg2Details, value: string) {
    setPinned(null);
    setLeg2((current) => ({ ...current, [key]: value }));
  }
  function selectInstrument(item: Instrument) {
    const type = String(item.instrumentType || "").toUpperCase();
    const nextSegment = /OPT|CE|PE|OI|OS/.test(type)
      ? "OPT"
      : /FUT|FS|FI/.test(type)
        ? "FUT"
        : equityExchanges.includes(String(item.exchange || "").toUpperCase())
          ? "EQ"
          : details.segment;
    setPinned(null);
    setSearchError("");
    setShowSuggestions(false);
    setSuggestions([]);
    setDetails((current) => ({
      ...current,
      segment: nextSegment,
      tradingSymbol: item.symbol,
      scripCode: item.token,
      stock: item.name || item.symbol,
      exchange: item.exchange,
      expiry: item.expiry || current.expiry,
      strike: item.strike || "",
      lotSize: item.lotSize || "",
      optionType: /CE$/i.test(item.symbol) ? "CE" : /PE$/i.test(item.symbol) ? "PE" : current.optionType,
    }));
    // Keep only the symbol in the search box so we don't re-query "RELIANCE · NSE · ..."
    setQuery(item.symbol);
    setFormTab(multiLeg ? "instrument" : "order");
  }
  function setSegment(segment: string) {
    if (segment !== "OPT") setMultiLeg(false);
    const exchange = segment === "EQ" ? "NSE" : "NFO";
    setPinned(null);
    setQuery("");
    setSuggestions([]);
    setSearchError("");
    setDetails((current) => ({
      ...current,
      segment,
      exchange,
      tradingSymbol: "",
      scripCode: "",
      stock: "",
      expiry: "",
      strike: "",
      optionType: "",
      lotSize: "",
    }));
  }
  function setExchange(exchange: string) {
    const nextSegment = equityExchanges.includes(exchange)
      ? "EQ"
      : details.segment === "EQ"
        ? "FUT"
        : details.segment;
    setPinned(null);
    setQuery("");
    setSuggestions([]);
    setSearchError("");
    setDetails((current) => ({
      ...current,
      exchange,
      segment: nextSegment,
      tradingSymbol: "",
      scripCode: "",
      stock: "",
      expiry: "",
      strike: "",
      optionType: "",
      lotSize: "",
    }));
  }
  function resetForm() {
    setDetails(blank);
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError("");
    setPinned(null);
    setShareCard(null);
    setReuseFrom("");
    setFormTab("instrument");
    setError("");
    setMessage("");
    setMultiLeg(false);
    setLeg2(blankLeg2);
    setLeg2Query("");
    setLeg2Suggestions([]);
    setShowLeg2Suggestions(false);
    setLeg2SearchError("");
    setStrategyName("");
    setApproxMargin("");
  }
  function pinCard(card: TradeCardData) {
    setShareCard(card);
    setPinned(previewFromCard(card));
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function reuseFromLink(link: LinkRecord) {
    const d = link.details || {};
    const card = d.card || {};
    const segment = asText(d.segment, "EQ").toUpperCase() || "EQ";
    const exchangeRaw = asText(d.exchange, segment === "EQ" ? "NSE" : "NFO").toUpperCase();
    const exchange =
      segment === "EQ"
        ? equityExchanges.includes(exchangeRaw)
          ? exchangeRaw
          : "NSE"
        : derivativeExchanges.includes(exchangeRaw)
          ? exchangeRaw
          : "NFO";
    const targetCombined = asText(card.target || d.target);
    const target1 = asText(card.target1 || d.target1 || targetCombined.split("/")[0]).trim();
    const target2 = asText(card.target2 || d.target2 || targetCombined.split("/")[1]).trim();
    const target3 = asText(card.target3 || d.target3 || targetCombined.split("/")[2]).trim();
    const symbol = asText(d.tradingSymbol || d.stock || link.code).toUpperCase();
    const storedLegs = (d as { legs?: Partial<Leg2Details>[] }).legs;
    const firstStored = storedLegs?.[0];
    const secondStored = secondLeg(d);
    let orderTypeReuse = asText(d.orderType, "NORMAL").toUpperCase() || "NORMAL";
    let productReuse = asText(d.productType, "INVESTMENT").toUpperCase() || "INVESTMENT";
    if (!orderTypes.some((item) => item.value === orderTypeReuse)) orderTypeReuse = "NORMAL";
    if (!productTypes.some((item) => item.value === productReuse)) productReuse = "INVESTMENT";
    setPinned(null);
    setShareCard(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError("");
    setError("");
    setDetails({
      ...blank,
      stock: asText(d.stock),
      tradingSymbol: symbol,
      scripCode: asText(d.scripCode),
      side: asText(d.side, "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
      quantity: asText(d.quantity, "1"),
      price: asText(d.price, "0"),
      exchange,
      segment,
      expiry: asText(d.expiry || firstStored?.expiry),
      strike: asText(d.strike || firstStored?.strike),
      optionType: asText(d.optionType || firstStored?.optionType),
      lotSize: asText(d.lotSize),
      orderType: orderTypeReuse,
      productType: productReuse,
      validity: asText(d.validity, "GFD").toUpperCase() || "GFD",
      triggerPrice: asText(d.triggerPrice),
      notes: asText(d.notes),
      buyRange: asText(card.buyRange || d.buyRange || firstStored?.buyRange || (Number(d.price) > 0 ? d.price : "")),
      target: targetCombined,
      target1,
      target2,
      target3,
      stopLoss: asText(card.stopLoss || d.stopLoss),
      timeFrame: asText(card.timeFrame || d.timeFrame),
      headline: asText(card.headline || d.headline),
    });
    setQuery(symbol);
    const hasTwo = Boolean(secondStored && (secondStored.tradingSymbol || secondStored.scripCode));
    setMultiLeg(hasTwo);
    setStrategyName(asText((d as { strategyName?: string }).strategyName || (hasTwo ? card.headline : "")));
    setApproxMargin(asText((d as { approxMargin?: string }).approxMargin));
    if (hasTwo && secondStored) {
      setLeg2({
        tradingSymbol: asText(secondStored.tradingSymbol),
        scripCode: asText(secondStored.scripCode),
        stock: asText(secondStored.stock),
        side: asText(secondStored.side, "SELL").toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: asText(secondStored.quantity, asText(d.quantity, "1")),
        price: asText(secondStored.price, "0"),
        exchange: asText(secondStored.exchange, exchange),
        segment: "OPT",
        expiry: asText(secondStored.expiry || d.expiry || firstStored?.expiry),
        strike: asText(secondStored.strike),
        optionType: asText(secondStored.optionType),
        buyRange: asText(secondStored.buyRange || (Number(secondStored.price) > 0 ? secondStored.price : "")),
      });
      setLeg2Query(asText(secondStored.tradingSymbol));
    } else {
      setLeg2(blankLeg2);
      setLeg2Query("");
    }
    setReuseFrom(symbol);
    setFormTab("order");
    setMessage(
      `Loaded ${symbol} from recent links. Edit anything you need, then Generate to create a new link.`
    );
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const livePreview: PreviewModel = {
    tradingSymbol: details.tradingSymbol || "SYMBOL",
    stock: details.stock || "Company name",
    side: details.side || "BUY",
    exchange: details.exchange || "NSE",
    segment: details.segment || "EQ",
    headline:
      details.headline ||
      (details.orderType === "BRACKET"
        ? `${details.segment === "EQ" ? "Equity" : "Derivative"} Idea ${details.side === "SELL" ? "Sell" : "Buy"}`
        : `${details.productType === "INVESTMENT" ? "Equity Delivery" : "Equity Intraday"} ${details.side === "SELL" ? "Sell" : "Buy"}`),
    buyRange: details.buyRange || (Number(details.price) > 0 ? details.price : "—"),
    target: [details.target1, details.target2, details.target3].filter(Boolean).join(" / ") || details.target || "—",
    target1: details.target1 || "—",
    target2: details.target2 || "—",
    target3: details.target3 || "—",
    stopLoss: details.stopLoss || "—",
    timeFrame: details.timeFrame || (details.productType === "INVESTMENT" ? "DELIVERY" : "INTRADAY"),
    notes: details.notes || "Follow the plan and manage risk.",
  };
  const shown = pinned || livePreview;

  async function createOrderLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!details.tradingSymbol.trim() || !details.scripCode.trim()) {
      setFormTab("instrument");
      setError("Select an instrument — trading symbol and Sharekhan scrip code required.");
      return;
    }
    if (!details.quantity || Number(details.quantity) < 1) {
      setFormTab("order");
      setError("Enter a valid quantity.");
      return;
    }
    if (details.orderType !== "NORMAL" && details.orderType !== "BRACKET" && !(Number(details.price) > 0)) {
      setFormTab("order");
      setError("Enter a positive limit price for this order type.");
      return;
    }
    if (details.orderType === "BRACKET") {
      const entry = Number(details.price);
      const target = Number(details.target1);
      const stop = Number(details.stopLoss);
      if (!(target > 0) || !(stop > 0)) {
        setFormTab("order");
        setError("Bracket order needs a book-profit (target) and a stop loss.");
        return;
      }
      if (target === stop) {
        setFormTab("order");
        setError("Book profit and stop loss cannot be the same price.");
        return;
      }
      if (entry > 0 && details.side === "BUY" && !(target > entry && stop < entry)) {
        setFormTab("order");
        setError("Buy bracket: target must be above the entry, and stop loss below it.");
        return;
      }
      if (entry > 0 && details.side === "SELL" && !(stop > entry && target < entry)) {
        setFormTab("order");
        setError("Sell bracket: stop loss must be above the entry, and target below it.");
        return;
      }
      if (multiLeg) {
        setFormTab("order");
        setError("Bracket orders are single-leg. Turn off the second leg first.");
        return;
      }
    }
    if (details.orderType.startsWith("STOPLOSS") && !(Number(details.triggerPrice) > 0)) {
      setFormTab("order");
      setError("Enter a positive trigger price for stop-loss orders.");
      return;
    }
    if (multiLeg) {
      if (!leg2.tradingSymbol.trim() || !leg2.scripCode.trim()) {
        setFormTab("instrument");
        setError("2-leg order: select the Leg 2 contract.");
        return;
      }
      if (!leg2.quantity || Number(leg2.quantity) < 1) {
        setFormTab("order");
        setError("2-leg order: enter a valid Leg 2 quantity.");
        return;
      }
    }
    setBusy(true);
    try {
      const target1 = details.target1 || details.target;
      const target2 = details.target2;
      const target3 = details.target3;
      const submitDetails = {
        ...details,
        buyRange: details.buyRange || (Number(details.price) > 0 ? details.price : ""),
        target1,
        target2,
        target3,
        target: [target1, target2, target3].filter(Boolean).join(" / "),
        stopLoss: details.stopLoss,
        timeFrame: details.timeFrame || (details.productType === "INVESTMENT" ? "DELIVERY" : "INTRADAY"),
        strategyName: multiLeg ? strategyName : "",
        approxMargin: multiLeg ? approxMargin : "",
        ...(multiLeg
          ? {
              leg2: {
                ...leg2,
                buyRange: leg2.buyRange || (Number(leg2.price) > 0 ? leg2.price : ""),
                exchange: leg2.exchange || details.exchange,
                segment: leg2.segment || details.segment,
              },
            }
          : {}),
        card: {
          buyRange: details.buyRange || (Number(details.price) > 0 ? details.price : ""),
          target1,
          target2,
          target3,
          target: [target1, target2, target3].filter(Boolean).join(" / "),
          stopLoss: details.stopLoss,
          timeFrame: details.timeFrame || (details.productType === "INVESTMENT" ? "DELIVERY" : "INTRADAY"),
          headline: details.headline || (multiLeg ? strategyName : ""),
        },
      };
      const result = await apiPost("/api/v1/sharekhan/order-intents", { details: submitDetails }, getSharekhanToken()) as { link: LinkRecord };
      const card: TradeCardData = {
        ...toCardData(result.link),
        tradingSymbol: details.tradingSymbol,
        stock: details.stock,
        side: details.side,
        exchange: details.exchange,
        segment: details.segment,
        expiry: details.expiry,
        strike: details.strike,
        optionType: details.optionType,
        quantity: details.quantity,
        price: details.price,
        productType: details.productType,
        notes: details.notes,
        buyRange: String(submitDetails.card.buyRange || ""),
        target: String(submitDetails.card.target || ""),
        target1: String(submitDetails.card.target1 || ""),
        target2: String(submitDetails.card.target2 || ""),
        target3: String(submitDetails.card.target3 || ""),
        stopLoss: String(submitDetails.card.stopLoss || ""),
        timeFrame: String(submitDetails.card.timeFrame || ""),
        headline: String(submitDetails.card.headline || ""),
        leg2: multiLeg ? {
          ...leg2,
          buyRange: leg2.buyRange || (Number(leg2.price) > 0 ? leg2.price : ""),
        } : undefined,
        approxMargin: multiLeg ? approxMargin : "",
      };
      pinCard(card);
      setReuseFrom("");
      await refresh();
      setMessage("Order link and share card are ready. Download or share the image with the QR.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create link");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(code: string) {
    if (isPreservedLink(code, links.find((row) => row.code === code))) {
      setError("Preserved demo links stay active so users can learn the flow.");
      return;
    }
    try {
      await apiPost(`/api/v1/sharekhan/links/${code}/deactivate`, {}, getSharekhanToken());
      await refresh();
      setMessage("Link deactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate link");
    }
  }

  async function removeLink(code: string, label: string) {
    if (isPreservedLink(code, links.find((row) => row.code === code))) {
      setError("Preserved demo links cannot be deleted.");
      return;
    }
    const ok = window.confirm(`Permanently delete "${label}"?\nThis cannot be undone. The order URL will stop working.`);
    if (!ok) return;
    try {
      await apiPost(`/api/v1/sharekhan/links/${encodeURIComponent(code)}/delete`, {}, getSharekhanToken());
      if (shareCard?.code === code) {
        setShareCard(null);
        setPinned(null);
      }
      await refresh();
      setMessage("Link permanently deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete link");
    }
  }

  function isPreservedLink(code: string, link?: LinkRecord) {
    return Boolean(link?.preserved) || PRESERVED_DEMOS.some((demo) => demo.code === code);
  }

  const demoCards = PRESERVED_DEMOS.map((demo) => {
    const live = links.find((row) => row.code === demo.code);
    return {
      ...demo,
      shortUrl: live?.shortUrl || `https://www.emotionlesstraders.com/order/${demo.code}`,
      active: live ? Boolean(live.active) : true,
      payload: live?.payload || demo.payload,
      link: live,
    };
  });

  function showToast(text: string) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Copied");
    } catch {
      setError("Could not copy the link.");
    }
  }

  async function loadSample(demo: (typeof demoCards)[number]) {
    try {
      if (demo.link) {
        reuseFromLink(demo.link);
        showToast(`${demo.label} loaded`);
        return;
      }
      const response = (await apiGet(`/api/v1/order-intents/${encodeURIComponent(demo.code)}`)) as {
        details?: LinkRecord["details"];
      };
      reuseFromLink({
        code: demo.code,
        shortUrl: demo.shortUrl,
        kind: "order-intent",
        details: response.details || {
          tradingSymbol: demo.tradingSymbol,
          segment: demo.segment,
          exchange: "NFO",
          side: "BUY",
          quantity: "1",
          price: "0",
        },
        active: true,
        preserved: true,
        clicks: 0,
      });
      showToast(`${demo.label} loaded`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sample into form");
    }
  }

  const visibleLinks = links.filter((link) => {
    if (isPreservedLink(link.code, link)) return false;
    const text = `${link.details.tradingSymbol || ""} ${link.details.stock || ""}`.toLowerCase();
    if (tableQuery.trim() && !text.includes(tableQuery.trim().toLowerCase())) return false;
    if (statusFilter === "active" && !link.active) return false;
    if (statusFilter === "inactive" && link.active) return false;
    const segment = String(link.details.segment || "EQ");
    if (segmentFilter !== "all" && segment !== segmentFilter) return false;
    return true;
  });

  const searchOpen = showSuggestions && (query.trim().length >= 2 || (details.segment !== "EQ" && Boolean(details.expiry)));

  const previewCard: TradeCardData = {
    code: shareCard?.code || "",
    shortUrl: shareCard?.shortUrl || "",
    tradingSymbol: details.tradingSymbol || shown.tradingSymbol,
    stock: details.stock || shown.stock,
    side: details.side || shown.side,
    exchange: details.exchange || shown.exchange,
    segment: details.segment || shown.segment,
    expiry: details.expiry,
    strike: details.strike,
    optionType: details.optionType,
    quantity: details.quantity,
    price: details.price,
    productType: details.productType,
    buyRange: details.buyRange || (Number(details.price) > 0 ? details.price : ""),
    target: shown.target === "—" ? "" : shown.target,
    target1: shown.target1 === "—" ? "" : shown.target1,
    target2: shown.target2 === "—" ? "" : shown.target2,
    target3: shown.target3 === "—" ? "" : shown.target3,
    stopLoss: shown.stopLoss === "—" ? "" : shown.stopLoss,
    timeFrame: details.timeFrame || (shown.timeFrame === "—" ? "" : shown.timeFrame),
    headline: details.headline || (multiLeg ? strategyName : shown.headline),
    notes: details.notes || (shown.notes === "Follow the plan and manage risk." ? "" : shown.notes),
    ...(multiLeg
      ? {
          leg2: {
            tradingSymbol: leg2.tradingSymbol,
            side: leg2.side,
            quantity: leg2.quantity,
            price: leg2.price,
            buyRange: leg2.buyRange || (Number(leg2.price) > 0 ? leg2.price : ""),
            stock: leg2.stock || details.stock,
            exchange: leg2.exchange || details.exchange,
            segment: "OPT",
            expiry: leg2.expiry || details.expiry,
            strike: leg2.strike,
            optionType: leg2.optionType,
          },
          approxMargin,
        }
      : {}),
  };

  return (
    <div className="sk-page">
      {toast ? (
        <div className="sk-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
      {error ? <p className="sk-banner sk-banner-error" role="alert">{error}</p> : null}
      {message ? <p className="sk-banner" role="status">{message}</p> : null}

      <div className="sk-samples" aria-label="Working F and O samples">
        {demoCards.map((demo) => (
          <div key={demo.code} className="sk-sample">
            <button type="button" className="sk-sample-load" onClick={() => loadSample(demo)}>
              {demo.label}
            </button>
            <button
              type="button"
              onClick={() => copyLink(demo.shortUrl)}
              aria-label={`Copy ${demo.label} link`}
            >
              Copy
            </button>
          </div>
        ))}
      </div>

      <div className="sk-workspace">
        <form
          className="sk-panel sk-create-panel"
          ref={formRef}
          onSubmit={createOrderLink}
          onInvalid={(event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const pane = target.closest("[data-sk-tab]") as HTMLElement | null;
            const tab = pane?.dataset.skTab;
            if (tab === "instrument" || tab === "order" || tab === "card") setFormTab(tab);
          }}
        >
          <div className="sk-panel-intro">
            <span className="sk-panel-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 0 0 7.07.07l2.12-2.12a5 5 0 0 0-7.07-7.07L10.5 5.5" />
                <path d="M14 11a5 5 0 0 0-7.07-.07L4.8 13.05a5 5 0 0 0 7.07 7.07L13.5 18.5" />
              </svg>
            </span>
            <div>
              <h2>{reuseFrom ? `Edit / reuse · ${reuseFrom}` : "Create an order link"}</h2>
            </div>
          </div>

          <div className="sk-tabs" role="tablist" aria-label="Create order link steps">
            {(
              [
                { id: "instrument" as const, label: "1 · Instrument", ready: Boolean(details.tradingSymbol && details.scripCode && (!multiLeg || (leg2.tradingSymbol && leg2.scripCode))) },
                { id: "order" as const, label: "2 · Order", ready: Boolean(details.quantity) },
                { id: "card" as const, label: "3 · Share card", ready: Boolean(details.headline || details.buyRange || details.target1) },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={formTab === tab.id}
                className={`sk-tab${formTab === tab.id ? " active" : ""}${tab.ready ? " ready" : ""}`}
                onClick={() => setFormTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section
            className={`sk-block sk-tab-pane${formTab === "instrument" ? " active" : ""}`}
            data-sk-tab="instrument"
            role="tabpanel"
            hidden={formTab !== "instrument"}
          >
            <div className="sk-field">
              <span className="sk-label">Instrument segment</span>
              <div className="sk-pills" role="group" aria-label="Instrument segment">
                {segments.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={details.segment === item.value ? "active" : ""}
                    aria-pressed={details.segment === item.value}
                    onClick={() => setSegment(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sk-block" style={{ marginBottom: 14 }}>
              <div className="sk-block-head-row">
                <strong>2-leg option / spread</strong>
                <label className="sk-switch">
                  <span className="sk-switch-label">Enable 2 legs</span>
                  <input aria-label="Enable 2 legs" type="checkbox" checked={multiLeg} onChange={(event) => {
                    const on = event.target.checked;
                    setMultiLeg(on);
                    if (on) {
                      const nextExchange = ["NFO", "BFO", "MCX", "CDS"].includes(details.exchange) ? details.exchange : "NFO";
                      setDetails((prev) => ({
                        ...prev,
                        segment: "OPT",
                        exchange: nextExchange,
                        orderType: prev.orderType === "BRACKET" || prev.orderType.startsWith("STOPLOSS") ? "NORMAL" : prev.orderType,
                        productType: prev.productType === "INVESTMENT" || prev.productType === "BIGTRADEPLUS" ? "BIGTRADE" : prev.productType,
                      }));
                      setLeg2((prev) => ({
                        ...prev,
                        exchange: nextExchange,
                        segment: "OPT",
                        expiry: details.expiry || prev.expiry,
                        quantity: details.quantity || prev.quantity,
                        side: prev.side || "SELL",
                      }));
                      setFormTab("instrument");
                    }
                  }} />
                  <span className="sk-switch-track" aria-hidden="true" />
                </label>
              </div>
              {multiLeg ? (
                <>
                  <div className="sk-grid-2" style={{ marginTop: 10 }}>
                    <label className="sk-field">
                      <span className="sk-label">Strategy name</span>
                      <input className="sk-input" value={strategyName} onChange={(event) => setStrategyName(event.target.value)} placeholder="BULL CALL SPREAD INDIGO (2 Leg)" />
                    </label>
                    <label className="sk-field">
                      <span className="sk-label">Approx margin</span>
                      <input className="sk-input" value={approxMargin} onChange={(event) => setApproxMargin(event.target.value)} placeholder="70000" />
                    </label>
                  </div>
                  <div className="sk-field">
                    <span className="sk-label">Exchange</span>
                    <div className="sk-pills" role="group" aria-label="Derivative exchange">
                      {derivativeExchanges.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={details.exchange === item ? "active" : ""}
                          aria-pressed={details.exchange === item}
                          onClick={() => {
                            setExchange(item);
                            setLeg2Query("");
                            setLeg2((prev) => ({ ...prev, exchange: item, tradingSymbol: "", scripCode: "", strike: "", optionType: "" }));
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="sk-field">
                    <span className="sk-label">Contract expiry</span>
                    <select
                      className="sk-input"
                      value={details.expiry}
                      onChange={(event) => {
                        const expiry = event.target.value;
                        setPinned(null);
                        setQuery("");
                        setLeg2Query("");
                        setDetails((current) => ({
                          ...current,
                          expiry,
                          tradingSymbol: "",
                          scripCode: "",
                          strike: "",
                          optionType: "",
                          lotSize: "",
                        }));
                        setLeg2((prev) => ({ ...prev, expiry, tradingSymbol: "", scripCode: "", strike: "", optionType: "" }));
                      }}
                    >
                      <option value="">{loadingExpiries ? "Loading expiries…" : "Select expiry"}</option>
                      {expiries.map((item) => (
                        <option key={item.expiry} value={item.expiry}>
                          {item.expiry} ({item.contracts} contracts)
                        </option>
                      ))}
                    </select>
                    {expiryError ? <span className="sk-field-error" role="alert">{expiryError}</span> : null}
                  </label>
                  <div className="sk-leg-pair">
                    <article className="sk-leg-card is-buy">
                      <div className="sk-leg-card-head">
                        <strong>Leg 1</strong>
                        <span>Contract</span>
                      </div>
                      <div className="sk-field sk-search">
                        <label className="sk-label" htmlFor="leg1-contract-search">Option contract *</label>
                        <input id="leg1-contract-search" className="sk-input" value={query} onFocus={() => setShowSuggestions(true)} onBlur={() => setShowSuggestions(false)} onChange={(event) => { setQuery(event.target.value); setShowSuggestions(true); setDetails((current) => ({ ...current, tradingSymbol: event.target.value.toUpperCase(), scripCode: "", stock: "" })); }} placeholder="Search e.g. INDIGO 4900 CE" autoComplete="off" />
                        {searchOpen ? <div role="listbox" className="sk-results">{searching ? <div className="sk-result-empty">Searching options…</div> : suggestions.length ? suggestions.map((item) => <button key={`leg1-${item.exchange}-${item.token}`} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectInstrument(item)}><strong>{item.symbol}</strong><small>{item.expiry ? `Expiry ${item.expiry} · ` : ""}{item.strike ? `Strike ${item.strike} · ` : ""}{item.instrumentType} · Scrip {item.token}</small></button>) : <div className="sk-result-empty">{searchError || "No matching option contracts."}</div>}</div> : null}
                      </div>
                      <div className="sk-grid-2">
                        <label className="sk-field">
                          <span className="sk-label">Symbol</span>
                          <input className="sk-input" value={details.tradingSymbol} onChange={(event) => update("tradingSymbol", event.target.value.toUpperCase())} placeholder="INDIGO26NOV4900CE" />
                        </label>
                        <label className="sk-field">
                          <span className="sk-label">Scrip code *</span>
                          <input className="sk-input" value={details.scripCode} onChange={(event) => update("scripCode", event.target.value)} placeholder="127904" />
                        </label>
                      </div>
                      <div className="sk-grid-2">
                        <label className="sk-field">
                          <span className="sk-label">Strike</span>
                          <input className="sk-input" value={details.strike} onChange={(event) => update("strike", event.target.value)} />
                        </label>
                        <label className="sk-field">
                          <span className="sk-label">Option type</span>
                          <select className="sk-input" value={details.optionType} onChange={(event) => update("optionType", event.target.value)}>
                            <option value="">CE / PE</option>
                            <option value="CE">Call (CE)</option>
                            <option value="PE">Put (PE)</option>
                          </select>
                        </label>
                      </div>
                    </article>
                    <article className="sk-leg-card is-sell">
                      <div className="sk-leg-card-head">
                        <strong>Leg 2</strong>
                        <span>Contract</span>
                      </div>
                      <div className="sk-field sk-search">
                        <label className="sk-label" htmlFor="leg2-contract-search">Option contract *</label>
                        <input id="leg2-contract-search" className="sk-input" value={leg2Query} onFocus={() => setShowLeg2Suggestions(true)} onBlur={() => setShowLeg2Suggestions(false)} onChange={(event) => { const value = event.target.value; setLeg2Query(value); setShowLeg2Suggestions(true); setLeg2((prev) => ({ ...prev, tradingSymbol: value.toUpperCase(), scripCode: "" })); }} placeholder="Search e.g. INDIGO 5200 CE" autoComplete="off" />
                        {showLeg2Suggestions && (leg2Query.trim().length >= 2 || leg2Searching) ? <div role="listbox" className="sk-results">{leg2Searching ? <div className="sk-result-empty">Searching options…</div> : leg2Suggestions.length ? leg2Suggestions.map((item) => <button key={`leg2-${item.exchange}-${item.token}`} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectLeg2Instrument(item)}><strong>{item.symbol}</strong><small>{item.expiry ? `Expiry ${item.expiry} · ` : ""}{item.strike ? `Strike ${item.strike} · ` : ""}{item.instrumentType} · Scrip {item.token}</small></button>) : <div className="sk-result-empty">{leg2SearchError || "No matching option contracts."}</div>}</div> : null}
                        {leg2SearchError && !showLeg2Suggestions ? <span className="sk-field-error">{leg2SearchError}</span> : null}
                      </div>
                      <div className="sk-grid-2">
                        <label className="sk-field">
                          <span className="sk-label">Symbol</span>
                          <input className="sk-input" value={leg2.tradingSymbol} onChange={(event) => { updateLeg2("tradingSymbol", event.target.value.toUpperCase()); setLeg2Query(event.target.value.toUpperCase()); }} placeholder="INDIGO26NOV5200CE" />
                        </label>
                        <label className="sk-field">
                          <span className="sk-label">Scrip code *</span>
                          <input className="sk-input" value={leg2.scripCode} onChange={(event) => updateLeg2("scripCode", event.target.value)} placeholder="103787" />
                        </label>
                      </div>
                      <div className="sk-grid-2">
                        <label className="sk-field">
                          <span className="sk-label">Strike</span>
                          <input className="sk-input" value={leg2.strike} onChange={(event) => updateLeg2("strike", event.target.value)} />
                        </label>
                        <label className="sk-field">
                          <span className="sk-label">Option type</span>
                          <select className="sk-input" value={leg2.optionType} onChange={(event) => updateLeg2("optionType", event.target.value)}>
                            <option value="">CE / PE</option>
                            <option value="CE">Call (CE)</option>
                            <option value="PE">Put (PE)</option>
                          </select>
                        </label>
                      </div>
                    </article>
                  </div>
                  <p className="sk-hint">Next step me har leg ka Buy/Sell, quantity, price aur range alag se bhara jata hai.</p>
                </>
              ) : null}
            </div>
            {!multiLeg ? (
            <>
            {details.segment !== "EQ" ? (
              <label className="sk-field">
                <span className="sk-label">Contract expiry</span>
                <select
                  className="sk-input"
                  value={details.expiry}
                  onChange={(event) => {
                    setPinned(null);
                    setQuery("");
                    setDetails((current) => ({
                      ...current,
                      expiry: event.target.value,
                      tradingSymbol: "",
                      scripCode: "",
                      strike: "",
                      optionType: "",
                      lotSize: "",
                    }));
                  }}
                >
                  <option value="">{loadingExpiries ? "Loading expiries…" : "Select expiry"}</option>
                  {expiries.map((item) => (
                    <option key={item.expiry} value={item.expiry}>
                      {item.expiry} ({item.contracts} contracts)
                    </option>
                  ))}
                </select>
                {expiryError ? <span className="sk-field-error" role="alert">{expiryError}</span> : null}
              </label>
            ) : null}
            <label className="sk-field sk-search">
              <span className="sk-label">
                Search {details.segment === "OPT" ? "underlying or option contract" : details.segment === "FUT" ? "underlying or futures contract" : "share or symbol"}
              </span>
              <span className="sk-search-box">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="6" />
                  <path d="M16 16l4 4" />
                </svg>
                <input
                  className="sk-input"
                  value={query}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setShowSuggestions(false)}
                  onChange={(event) => {
                    setPinned(null);
                    setQuery(event.target.value);
                    setShowSuggestions(true);
                    setDetails((current) => ({ ...current, tradingSymbol: event.target.value.toUpperCase(), scripCode: "", stock: "" }));
                  }}
                  placeholder={details.segment === "EQ" ? "RELIANCE or company name" : "NIFTY, BANKNIFTY, RELIANCE"}
                  autoComplete="off"
                />
              </span>
              {searchOpen ? (
                <div role="listbox" className="sk-results">
                  {searching ? (
                    <div className="sk-result-empty">Searching instruments…</div>
                  ) : suggestions.length ? (
                    suggestions.map((item) => (
                      <button
                        type="button"
                        role="option"
                        key={`${item.exchange}-${item.token}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectInstrument(item)}
                      >
                        <strong>{item.symbol}</strong>
                        <span> · {item.exchange}</span>
                        <small>
                          {item.expiry ? `Expiry ${item.expiry} · ` : ""}
                          {item.strike ? `Strike ${item.strike} · ` : ""}
                          {item.lotSize ? `Lot ${item.lotSize} · ` : ""}
                          {item.instrumentType} · Scrip {item.token}
                        </small>
                      </button>
                    ))
                  ) : (
                    <div className="sk-result-empty">{searchError || "No matching contracts found. Check the exchange and instrument master."}</div>
                  )}
                </div>
              ) : null}
              {searchError && !searchOpen ? <span className="sk-field-error" role="alert">{searchError}</span> : null}
            </label>
            <div className="sk-grid-3">
              <label className="sk-field">
                <span className="sk-label">Trading symbol *</span>
                <input className="sk-input" required value={details.tradingSymbol} onChange={(event) => { update("tradingSymbol", event.target.value.toUpperCase()); if (query) setQuery(""); }} placeholder="RELIANCE" />
              </label>
              <label className="sk-field">
                <span className="sk-label">Sharekhan scrip code *</span>
                <input className="sk-input" required value={details.scripCode} onChange={(event) => update("scripCode", event.target.value)} placeholder="Select a search result" />
              </label>
              <label className="sk-field">
                <span className="sk-label">Stock name</span>
                <input className="sk-input" value={details.stock} onChange={(event) => update("stock", event.target.value)} placeholder="Reliance Industries" />
              </label>
            </div>
            {details.segment === "OPT" ? (
              <div className="sk-grid-3">
                <label className="sk-field">
                  <span className="sk-label">Strike price</span>
                  <input className="sk-input" value={details.strike} onChange={(event) => update("strike", event.target.value)} />
                </label>
                <label className="sk-field">
                  <span className="sk-label">Option type</span>
                  <select className="sk-input" value={details.optionType} onChange={(event) => update("optionType", event.target.value)}>
                    <option value="">Select CE / PE</option>
                    <option value="CE">Call (CE)</option>
                    <option value="PE">Put (PE)</option>
                  </select>
                </label>
                <label className="sk-field">
                  <span className="sk-label">Lot size</span>
                  <input className="sk-input" value={details.lotSize} readOnly />
                </label>
              </div>
            ) : null}
            {details.segment === "FUT" ? (
              <label className="sk-field">
                <span className="sk-label">Lot size</span>
                <input className="sk-input" value={details.lotSize} readOnly />
              </label>
            ) : null}
            <div className="sk-field">
              <span className="sk-label">Exchange</span>
              <div className="sk-pills" role="group" aria-label="Exchange">
                {(details.segment === "EQ" ? equityExchanges : derivativeExchanges).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={details.exchange === item ? "active" : ""}
                    aria-pressed={details.exchange === item}
                    onClick={() => setExchange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <span className="sk-hint">
                {details.segment === "EQ"
                  ? "Equity cash: NSE / BSE only. For MCX or CDS switch to Futures or Options."
                  : "Derivatives: NFO / BFO / MCX / CDS. Pick expiry, then search the contract."}
              </span>
            </div>
            </>
            ) : null}
            <div className="sk-tab-nav">
              <span className="sk-hint">
                {details.tradingSymbol && details.scripCode
                  ? `${details.tradingSymbol} · scrip ${details.scripCode}${multiLeg ? ` | Leg 2: ${leg2.tradingSymbol || "select contract"}${leg2.scripCode ? ` · scrip ${leg2.scripCode}` : ""}` : ""}`
                  : "Search and select an instrument first."}
              </span>
              <button
                className="sk-btn sk-btn-primary"
                type="button"
                disabled={!details.tradingSymbol || !details.scripCode || (multiLeg && (!leg2.tradingSymbol || !leg2.scripCode))}
                onClick={() => setFormTab("order")}
              >
                Next · Order
              </button>
            </div>
          </section>

          <section
            className={`sk-block sk-tab-pane${formTab === "order" ? " active" : ""}`}
            data-sk-tab="order"
            role="tabpanel"
            hidden={formTab !== "order"}
          >
            {multiLeg ? (
              <>
                <p className="sk-hint">Har leg ka side, quantity, app price aur card range alag hai. Upar wala ek range dono par nahi lagta.</p>
                <div className="sk-leg-pair">
                  <article className={`sk-leg-card ${details.side === "SELL" ? "is-sell" : "is-buy"}`}>
                    <div className="sk-leg-card-head">
                      <strong>Leg 1 order</strong>
                      <span>{details.tradingSymbol || "Select contract"}</span>
                    </div>
                    <div className="sk-field">
                      <span className="sk-label">Buy / Sell *</span>
                      <div className="sk-pills sk-pills-side" role="group" aria-label="Leg 1 side">
                        <button type="button" className={details.side === "BUY" ? "active buy" : ""} aria-pressed={details.side === "BUY"} onClick={() => update("side", "BUY")}>BUY</button>
                        <button type="button" className={details.side === "SELL" ? "active sell" : ""} aria-pressed={details.side === "SELL"} onClick={() => update("side", "SELL")}>SELL</button>
                      </div>
                    </div>
                    <label className="sk-field">
                      <span className="sk-label">Quantity *</span>
                      <input className="sk-input" type="number" min="1" step="1" value={details.quantity} onChange={(event) => update("quantity", event.target.value)} />
                    </label>
                    <label className="sk-field">
                      <span className="sk-label">App price (0 = market) *</span>
                      <input className="sk-input" type="number" min="0" step="any" value={details.price} onChange={(event) => update("price", event.target.value)} />
                    </label>
                    <label className="sk-field">
                      <span className="sk-label">{details.side === "SELL" ? "Sell range" : "Buy range"} *</span>
                      <input className="sk-input" value={details.buyRange} onChange={(event) => update("buyRange", event.target.value)} placeholder="113" />
                    </label>
                  </article>
                  <article className={`sk-leg-card ${leg2.side === "SELL" ? "is-sell" : "is-buy"}`}>
                    <div className="sk-leg-card-head">
                      <strong>Leg 2 order</strong>
                      <span>{leg2.tradingSymbol || "Select contract"}</span>
                    </div>
                    <div className="sk-field">
                      <span className="sk-label">Buy / Sell *</span>
                      <div className="sk-pills sk-pills-side" role="group" aria-label="Leg 2 side">
                        <button type="button" className={leg2.side === "BUY" ? "active buy" : ""} aria-pressed={leg2.side === "BUY"} onClick={() => updateLeg2("side", "BUY")}>BUY</button>
                        <button type="button" className={leg2.side === "SELL" ? "active sell" : ""} aria-pressed={leg2.side === "SELL"} onClick={() => updateLeg2("side", "SELL")}>SELL</button>
                      </div>
                    </div>
                    <label className="sk-field">
                      <span className="sk-label">Quantity *</span>
                      <input className="sk-input" type="number" min="1" step="1" value={leg2.quantity} onChange={(event) => updateLeg2("quantity", event.target.value)} />
                    </label>
                    <label className="sk-field">
                      <span className="sk-label">App price (0 = market) *</span>
                      <input className="sk-input" type="number" min="0" step="any" value={leg2.price} onChange={(event) => updateLeg2("price", event.target.value)} />
                    </label>
                    <label className="sk-field">
                      <span className="sk-label">{leg2.side === "SELL" ? "Sell range" : "Buy range"} *</span>
                      <input className="sk-input" value={leg2.buyRange} onChange={(event) => updateLeg2("buyRange", event.target.value)} placeholder="34.10" />
                    </label>
                  </article>
                </div>
              </>
            ) : null}
            {!multiLeg ? (
            <>
            <div className="sk-grid-order">
              <div className="sk-field">
                <span className="sk-label">Buy / Sell *</span>
                <div className="sk-pills sk-pills-side" role="group" aria-label="Buy or sell">
                  <button type="button" className={details.side === "BUY" ? "active buy" : ""} aria-pressed={details.side === "BUY"} onClick={() => update("side", "BUY")}>BUY</button>
                  <button type="button" className={details.side === "SELL" ? "active sell" : ""} aria-pressed={details.side === "SELL"} onClick={() => update("side", "SELL")}>SELL</button>
                </div>
              </div>
              <label className="sk-field">
                <span className="sk-label">Quantity *{details.lotSize ? ` (lot ${details.lotSize})` : ""}</span>
                <input className="sk-input" required type="number" min={details.lotSize || "1"} step={details.segment === "EQ" ? "1" : details.lotSize || "1"} value={details.quantity} onChange={(event) => update("quantity", event.target.value)} />
              </label>
              <label className="sk-field">
                <span className="sk-label">{details.orderType === "BRACKET" ? "Entry price (0 = market)" : details.orderType === "NORMAL" ? "Price" : "Limit price"} *</span>
                <input
                  className="sk-input"
                  required
                  type="number"
                  min={details.orderType === "LIMIT" || details.orderType.startsWith("STOPLOSS") ? "0.01" : "0"}
                  step="any"
                  value={details.price}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDetails((prev) => ({
                      ...prev,
                      price: value,
                      // Limit / order price drives the share-card buy/sell range.
                      buyRange: Number(value) > 0 ? value : prev.buyRange,
                    }));
                  }}
                />
              </label>
              <label className="sk-field">
                <span className="sk-label">Order type</span>
                <select
                  className="sk-input"
                  value={details.orderType}
                  onChange={(event) => {
                    const next = event.target.value;
                    setDetails((prev) => ({
                      ...prev,
                      orderType: next,
                      productType: next === "BRACKET" && prev.productType === "INVESTMENT" ? "BIGTRADEPLUS" : prev.productType,
                      timeFrame: next === "BRACKET" && !prev.timeFrame ? "1-2DAYS" : prev.timeFrame,
                    }));
                  }}
                >
                  {orderTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
            {details.orderType.startsWith("STOPLOSS") ? (
              <label className="sk-field">
                <span className="sk-label">Trigger price *</span>
                <input className="sk-input" required type="number" min="0.01" step="any" value={details.triggerPrice} onChange={(event) => update("triggerPrice", event.target.value)} />
              </label>
            ) : null}
            {details.orderType === "BRACKET" ? (
              <div className="sk-grid-2">
                <label className="sk-field">
                  <span className="sk-label">Book profit (target) *</span>
                  <input className="sk-input" required type="number" min="0.01" step="any" value={details.target1} onChange={(event) => update("target1", event.target.value)} placeholder="38" />
                </label>
                <label className="sk-field">
                  <span className="sk-label">Stop loss *</span>
                  <input className="sk-input" required type="number" min="0.01" step="any" value={details.stopLoss} onChange={(event) => update("stopLoss", event.target.value)} placeholder="18" />
                </label>
                <p className="sk-hint">
                  Deeplink follows Sharekhan research one-tap (same shape as gi9 links): entry, book profit, and stop loss open in the app. A second target stays on the share card only.
                </p>
              </div>
            ) : null}
            <div className="sk-grid-2">
              <label className="sk-field">
                <span className="sk-label">Product / Action (Sharekhan)</span>
                <select
                  className="sk-input"
                  value={details.productType}
                  onChange={(event) => {
                    const next = event.target.value;
                    setDetails((prev) => ({
                      ...prev,
                      productType: next,
                      orderType: next === "BIGTRADEPLUS" ? "BRACKET" : prev.orderType,
                    }));
                  }}
                >
                  {productTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <div className="sk-field">
                <span className="sk-label">Validity</span>
                <div className="sk-pills" role="group" aria-label="Validity">
                  <button
                    type="button"
                    className={details.validity === "GFD" ? "active" : ""}
                    aria-pressed={details.validity === "GFD"}
                    onClick={() => update("validity", "GFD")}
                  >
                    Day (GFD)
                  </button>
                  <button
                    type="button"
                    className={details.validity === "IOC" ? "active" : ""}
                    aria-pressed={details.validity === "IOC"}
                    onClick={() => update("validity", "IOC")}
                  >
                    IOC
                  </button>
                </div>
                <span className="sk-hint">
                  One-tap opens as Day (GFD). IOC chahiye to app me confirm se pehle manually select karo.
                </span>
              </div>
            </div>
            </>
            ) : null}
            {multiLeg ? (
              <div className="sk-grid-2">
                <label className="sk-field">
                  <span className="sk-label">Product / Action (Sharekhan)</span>
                  <select className="sk-input" value={details.productType === "BIGTRADEPLUS" ? "BIGTRADE" : details.productType} onChange={(event) => update("productType", event.target.value)}>
                    <option value="BIGTRADE">Intraday (BigTrade)</option>
                    <option value="INVESTMENT">Delivery (Investment)</option>
                  </select>
                </label>
                <div className="sk-field">
                  <span className="sk-label">Validity</span>
                  <div className="sk-pills" role="group" aria-label="Validity">
                    <button type="button" className={details.validity === "GFD" ? "active" : ""} aria-pressed={details.validity === "GFD"} onClick={() => update("validity", "GFD")}>Day (GFD)</button>
                    <button type="button" className={details.validity === "IOC" ? "active" : ""} aria-pressed={details.validity === "IOC"} onClick={() => update("validity", "IOC")}>IOC</button>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="sk-tab-nav">
              <button className="sk-btn sk-btn-ghost" type="button" onClick={() => setFormTab("instrument")}>
                Back
              </button>
              <button className="sk-btn sk-btn-primary" type="button" onClick={() => setFormTab("card")}>
                Next · Share card
              </button>
            </div>
          </section>

          <section
            className={`sk-block sk-tab-pane${formTab === "card" ? " active" : ""}`}
            data-sk-tab="card"
            role="tabpanel"
            hidden={formTab !== "card"}
          >
            <div className="sk-grid-card">
              <label className="sk-field">
                <span className="sk-label">Card headline</span>
                <input className="sk-input" value={details.headline} onChange={(event) => update("headline", event.target.value)} placeholder={multiLeg ? strategyName || "BULL CALL SPREAD INDIGO (2 Leg)" : "Equity Intraday Buy"} />
              </label>
              {multiLeg ? (
                <div className="sk-leg-pair">
                  <div className={`sk-leg-card ${details.side === "SELL" ? "is-sell" : "is-buy"}`}>
                    <div className="sk-leg-card-head"><strong>Leg 1 on card</strong><span>{details.side}</span></div>
                    <p className="sk-hint">{details.tradingSymbol || "Contract"} · {details.strike} {details.optionType}</p>
                    <p className="sk-hint">{details.side === "SELL" ? "Sell" : "Buy"} range {details.buyRange || "—"} · Qty {details.quantity}</p>
                  </div>
                  <div className={`sk-leg-card ${leg2.side === "SELL" ? "is-sell" : "is-buy"}`}>
                    <div className="sk-leg-card-head"><strong>Leg 2 on card</strong><span>{leg2.side}</span></div>
                    <p className="sk-hint">{leg2.tradingSymbol || "Contract"} · {leg2.strike} {leg2.optionType}</p>
                    <p className="sk-hint">{leg2.side === "SELL" ? "Sell" : "Buy"} range {leg2.buyRange || "—"} · Qty {leg2.quantity}</p>
                  </div>
                </div>
              ) : (
                <>
              <label className="sk-field">
                <span className="sk-label">{details.side === "SELL" ? "Sell range" : "Buy range"}</span>
                <input
                  className="sk-input"
                  value={details.buyRange || (Number(details.price) > 0 ? details.price : "")}
                  onChange={(event) => update("buyRange", event.target.value)}
                  placeholder={Number(details.price) > 0 ? details.price : "1063"}
                />
              </label>
              <label className="sk-field">
                <span className="sk-label">First target</span>
                <input className="sk-input" value={details.target1} onChange={(event) => update("target1", event.target.value)} placeholder="1075" />
              </label>
              <label className="sk-field">
                <span className="sk-label">Second target</span>
                <input className="sk-input" value={details.target2} onChange={(event) => update("target2", event.target.value)} placeholder="1085" />
              </label>
              <label className="sk-field">
                <span className="sk-label">Third target</span>
                <input className="sk-input" value={details.target3} onChange={(event) => update("target3", event.target.value)} placeholder="1095" />
              </label>
              <label className="sk-field">
                <span className="sk-label">Stop loss (SL)</span>
                <input className="sk-input" value={details.stopLoss} onChange={(event) => update("stopLoss", event.target.value)} placeholder="1050" />
              </label>
                </>
              )}
              <label className="sk-field">
                <span className="sk-label">Time frame</span>
                <input className="sk-input" value={details.timeFrame} onChange={(event) => update("timeFrame", event.target.value)} placeholder="INTRADAY" />
              </label>
            </div>
            <label className="sk-field">
              <span className="sk-label">Notes (optional)</span>
              <input className="sk-input" value={details.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Add a short note for the recipient" />
            </label>
            <div className="sk-tab-nav">
              <button className="sk-btn sk-btn-ghost" type="button" onClick={() => setFormTab("order")}>
                Back
              </button>
              <span className="sk-hint">Generate below when ready.</span>
            </div>
          </section>

          <div className="sk-form-actions">
            <button className="sk-btn sk-btn-ghost" type="button" onClick={resetForm}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.2-5.5" /><path d="M4 4v5h5" /></svg>
              Reset
            </button>
            <button className="sk-btn sk-btn-primary" type="submit" disabled={busy}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07.07l2.12-2.12a5 5 0 0 0-7.07-7.07L10.5 5.5" /><path d="M14 11a5 5 0 0 0-7.07-.07L4.8 13.05a5 5 0 0 0 7.07 7.07L13.5 18.5" /></svg>
              {busy ? "Creating..." : reuseFrom ? "Generate new link" : "Generate link + share card"}
            </button>
          </div>
        </form>

        <div className="sk-rail">
          <section className="sk-panel sk-preview-panel" ref={previewRef}>
            <div className="sk-panel-intro">
              <span className="sk-panel-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" /></svg>
              </span>
              <div>
                <h2>Share card preview</h2>
              </div>
            </div>
            <div className="sk-card-themes" role="radiogroup" aria-label="Share card style">
              {CARD_THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={cardTheme === item.id}
                  className={`sk-card-theme sk-card-theme-${item.id}${cardTheme === item.id ? " active" : ""}`}
                  onClick={() => setCardTheme(item.id)}
                >
                  <span className="sk-card-theme-swatch" aria-hidden="true" />
                  <strong>{item.label}</strong>
                  <small>{item.blurb}</small>
                </button>
              ))}
            </div>
            <TradeShareCard
              data={multiLeg ? previewCard : shareCard || previewCard}
              theme={cardTheme}
              variant="preview"
            />
          </section>

        </div>
      </div>

      <section className="sk-panel sk-table-panel">
        <div className="sk-table-head">
          <div className="sk-panel-intro">
            <span className="sk-panel-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 7h12M8 12h12M8 17h12" /><path d="M4 7h.01M4 12h.01M4 17h.01" /></svg>
            </span>
            <div>
              <h2>Recent links</h2>
            </div>
          </div>
          <div className="sk-filters">
            <label className="sk-search-box sk-filter-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>
              <input className="sk-input" value={tableQuery} onChange={(event) => setTableQuery(event.target.value)} placeholder="Search by symbol or stock name..." />
            </label>
            <select className="sk-input sk-filter-select" aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="sk-input sk-filter-select" aria-label="Filter by segment" value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)}>
              <option value="all">All segments</option>
              <option value="EQ">Equity</option>
              <option value="FUT">Futures</option>
              <option value="OPT">Options</option>
            </select>
          </div>
        </div>
        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Segment</th>
                <th>Side</th>
                <th>Order details</th>
                <th>Status</th>
                <th>Opens</th>
                <th>Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLinks.length ? visibleLinks.map((link) => {
                const symbol = String(link.details.tradingSymbol || link.details.stock || link.code);
                const segment = String(link.details.segment || "EQ");
                const side = String(link.details.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
                const product = productShort(link.details.productType);
                const canEdit = link.kind === "order-intent";
                const preserved = isPreservedLink(link.code, link);
                return (
                  <tr
                    key={link.code}
                    className={canEdit ? `sk-row-clickable${preserved ? " sk-row-preserved" : ""}` : preserved ? "sk-row-preserved" : undefined}
                    onClick={canEdit ? () => reuseFromLink(link) : undefined}
                    title={preserved ? "Preserved demo link" : canEdit ? "Click to edit / reuse in the form" : undefined}
                  >
                    <td data-label="Instrument">
                      <div className="sk-instrument">
                        <span className={`sk-mark${segment === "EQ" ? "" : " alt"}`}>{symbol.slice(0, 1)}</span>
                        <div>
                          <strong>{symbol}{preserved ? " · Demo" : ""}</strong>
                          <small>{link.details.stock || (link.kind === "order-intent" ? "Order details" : "One-tap link")}</small>
                        </div>
                      </div>
                    </td>
                    <td data-label="Segment">{segmentLabel(segment)}</td>
                    <td data-label="Side"><span className={`sk-chip sk-chip-${side.toLowerCase()}`}>{side}</span></td>
                    <td data-label="Order details">
                      {link.kind === "order-intent"
                        ? `Qty ${link.details.quantity || "—"} · ${orderTypeShort(link.details.orderType)}${product ? ` · ${product}` : ""} · ${String(link.details.validity || "GFD").toUpperCase()}`
                        : "One-tap"}
                    </td>
                    <td data-label="Status">
                      <span className={`sk-status${link.active ? " on" : ""}`}>
                        {preserved ? (link.active ? "Preserved" : "Preserved · Off") : link.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td data-label="Opens">{link.clicks}</td>
                    <td data-label="Link">
                      <a
                        className="sk-url"
                        href={link.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {link.shortUrl}
                      </a>
                    </td>
                    <td data-label="Actions">
                      <div className="sk-row-actions" onClick={(event) => event.stopPropagation()}>
                        {canEdit ? (
                          <button className="sk-btn sk-btn-tiny" type="button" onClick={() => reuseFromLink(link)}>Edit</button>
                        ) : null}
                        <button className="sk-btn sk-btn-tiny" type="button" onClick={() => copyLink(link.shortUrl)}>Copy</button>
                        {canEdit ? (
                          <button className="sk-btn sk-btn-tiny" type="button" onClick={() => pinCard(toCardData(link))}>Share image</button>
                        ) : null}
                        {!preserved && link.active ? (
                          <button className="sk-btn sk-btn-tiny" type="button" onClick={() => deactivate(link.code)}>Deactivate</button>
                        ) : null}
                        {!preserved ? (
                          <button className="sk-btn sk-btn-tiny sk-btn-danger" type="button" aria-label={`Delete ${symbol}`} onClick={() => removeLink(link.code, symbol)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14" /><path d="M9 7V5h6v2" /><path d="M8 7l1 12h6l1-12" /></svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td className="sk-empty" colSpan={8}>
                    {links.length ? "No links match these filters." : "No links yet. Generate one above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
