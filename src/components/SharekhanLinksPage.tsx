"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, resolveApiBaseUrl } from "@/lib/api";
import { getSharekhanToken } from "@/lib/auth";
import TradeShareCard, { type TradeCardData } from "@/components/TradeShareCard";

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
  tradingSymbol: string;
  payload: string;
}> = [
  {
    code: "1bb9d47de34f074fb2",
    segment: "FUT",
    tradingSymbol: "RELIANCE26NOVFUT",
    payload: "131$12$61697$1$$1",
  },
  {
    code: "2345fbe7fe74f8223b",
    segment: "OPT",
    tradingSymbol: "RELIANCE26NOV1400CE",
    payload: "131$12$126008$1$$1",
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

const equityExchanges = ["NSE", "BSE"];
const derivativeExchanges = ["NFO", "BFO", "MCX", "CDS"];

const orderTypes = [
  { value: "NORMAL", label: "Market" },
  { value: "LIMIT", label: "Limit" },
  { value: "STOPLOSS", label: "Stop loss limit" },
  { value: "STOPLOSS_MARKET", label: "Stop loss market" },
];
const productTypes = [
  { value: "INVESTMENT", label: "Delivery (Investment)" },
  { value: "BIGTRADE", label: "Intraday (BigTrade)" },
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
  return "MKT";
}

function productShort(value?: string) {
  if (value === "BIGTRADE") return "Intraday";
  if (value === "INVESTMENT") return "Delivery";
  return value || "";
}

function toCardData(link: LinkRecord): TradeCardData {
  const d = link.details || {};
  const card = d.card || {};
  return {
    code: link.code,
    shortUrl: link.shortUrl,
    tradingSymbol: String(d.tradingSymbol || ""),
    stock: String(d.stock || ""),
    side: String(d.side || "BUY"),
    exchange: String(d.exchange || ""),
    segment: String(d.segment || "EQ"),
    quantity: d.quantity as string | number | undefined,
    price: d.price as string | number | undefined,
    productType: String(d.productType || ""),
    notes: String(d.notes || ""),
    buyRange: String(card.buyRange || d.buyRange || d.price || ""),
    target: String(card.target || d.target || ""),
    target1: String(card.target1 || d.target1 || String(card.target || d.target || "").split("/")[0] || "").trim(),
    target2: String(card.target2 || d.target2 || String(card.target || d.target || "").split("/")[1] || "").trim(),
    target3: String(card.target3 || d.target3 || String(card.target || d.target || "").split("/")[2] || "").trim(),
    stopLoss: String(card.stopLoss || d.stopLoss || ""),
    timeFrame: String(card.timeFrame || d.timeFrame || ""),
    headline: String(card.headline || d.headline || ""),
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

function OrderPreview({ model }: { model: PreviewModel }) {
  const side = model.side === "SELL" ? "SELL" : "BUY";
  const qr = model.code
    ? `${resolveApiBaseUrl()}/api/v1/order-intents/${encodeURIComponent(model.code)}/qr.png`
    : "";
  return (
    <article className="sk-idea">
      <div className="sk-idea-top">
        <span className="sk-idea-brand">Sharekhan</span>
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
          <span>Buy Range</span>
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
        <strong>Sharekhan</strong>
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
  const [expiries, setExpiries] = useState<Expiry[]>([]);
  const [loadingExpiries, setLoadingExpiries] = useState(false);
  const [expiryError, setExpiryError] = useState("");
  const [shareCard, setShareCard] = useState<TradeCardData | null>(null);
  const [pinned, setPinned] = useState<PreviewModel | null>(null);
  const [tableQuery, setTableQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [formTab, setFormTab] = useState<"instrument" | "order" | "card">("instrument");

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
    const params = new URLSearchParams({ exchange: details.exchange, segment: details.segment });
    setLoadingExpiries(true);
    setExpiryError("");
    apiGet(`/api/v1/sharekhan/instruments/expiries?${params}`, getSharekhanToken())
      .then((response) => {
        if (cancelled) return;
        const rows = (response as { expiries?: Expiry[] }).expiries || [];
        setExpiries(rows);
        if (!rows.length) setExpiryError("No contract expiries are available for this exchange. Check the instrument master and try again.");
      })
      .catch((err) => {
        if (cancelled) return;
        setExpiries([]);
        setExpiryError(err instanceof Error ? err.message : "Could not load contract expiries. Please retry.");
      })
      .finally(() => { if (!cancelled) setLoadingExpiries(false); });
    return () => { cancelled = true; };
  }, [details.exchange, details.segment]);

  function update(key: keyof Details, value: string) {
    setPinned(null);
    setDetails((current) => ({ ...current, [key]: value }));
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
    setFormTab("order");
  }
  function setSegment(segment: string) {
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
    let orderTypeReuse = asText(d.orderType, "NORMAL").toUpperCase() || "NORMAL";
    let productReuse = asText(d.productType, "INVESTMENT").toUpperCase() || "INVESTMENT";
    // Legacy bracket / BigTrade+ links → normal one-tap form (bracket removed from system)
    if (orderTypeReuse === "BRACKET" || productReuse === "BIGTRADEPLUS") {
      orderTypeReuse = Number(d.price) > 0 ? "LIMIT" : "NORMAL";
      productReuse = "BIGTRADE";
    }
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
      expiry: asText(d.expiry),
      strike: asText(d.strike),
      optionType: asText(d.optionType),
      lotSize: asText(d.lotSize),
      orderType: orderTypeReuse,
      productType: productReuse,
      validity: asText(d.validity, "GFD").toUpperCase() || "GFD",
      triggerPrice: asText(d.triggerPrice),
      notes: asText(d.notes),
      buyRange: asText(card.buyRange || d.buyRange || (Number(d.price) > 0 ? d.price : "")),
      target: targetCombined,
      target1,
      target2,
      target3,
      stopLoss: asText(card.stopLoss || d.stopLoss),
      timeFrame: asText(card.timeFrame || d.timeFrame),
      headline: asText(card.headline || d.headline),
    });
    setQuery(symbol);
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
      `${details.productType === "INVESTMENT" ? "Equity Delivery" : "Equity Intraday"} ${details.side === "SELL" ? "Sell" : "Buy"}`,
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
    if (details.orderType !== "NORMAL" && !(Number(details.price) > 0)) {
      setFormTab("order");
      setError("Enter a positive limit price for this order type.");
      return;
    }
    if (details.orderType.startsWith("STOPLOSS") && !(Number(details.triggerPrice) > 0)) {
      setFormTab("order");
      setError("Enter a positive trigger price for stop-loss orders.");
      return;
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
        card: {
          buyRange: details.buyRange || (Number(details.price) > 0 ? details.price : ""),
          target1,
          target2,
          target3,
          target: [target1, target2, target3].filter(Boolean).join(" / "),
          stopLoss: details.stopLoss,
          timeFrame: details.timeFrame || (details.productType === "INVESTMENT" ? "DELIVERY" : "INTRADAY"),
          headline: details.headline,
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
        productType: details.productType,
        notes: details.notes,
        buyRange: String(submitDetails.card.buyRange || details.price || ""),
        target: String(submitDetails.card.target || ""),
        target1: String(submitDetails.card.target1 || ""),
        target2: String(submitDetails.card.target2 || ""),
        target3: String(submitDetails.card.target3 || ""),
        stopLoss: String(submitDetails.card.stopLoss || ""),
        timeFrame: String(submitDetails.card.timeFrame || ""),
        headline: String(submitDetails.card.headline || ""),
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
        showToast(`${demo.segment === "FUT" ? "Future" : "Option"} sample loaded`);
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
      showToast(`${demo.segment === "FUT" ? "Future" : "Option"} sample loaded`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sample into form");
    }
  }

  const visibleLinks = links.filter((link) => {
    const text = `${link.details.tradingSymbol || ""} ${link.details.stock || ""}`.toLowerCase();
    if (tableQuery.trim() && !text.includes(tableQuery.trim().toLowerCase())) return false;
    if (statusFilter === "active" && !link.active) return false;
    if (statusFilter === "inactive" && link.active) return false;
    const segment = String(link.details.segment || "EQ");
    if (segmentFilter !== "all" && segment !== segmentFilter) return false;
    return true;
  });

  const searchOpen = showSuggestions && (query.trim().length >= 2 || (details.segment !== "EQ" && Boolean(details.expiry)));

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
              {demo.segment === "FUT" ? "Future sample" : "Option sample"}
            </button>
            <button
              type="button"
              onClick={() => copyLink(demo.shortUrl)}
              aria-label={`Copy ${demo.segment === "FUT" ? "future" : "option"} sample link`}
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
              <p>
                {reuseFrom
                  ? "Details loaded from a recent link. Change what you need and generate a new link."
                  : "Use the tabs below — less scrolling, same fields."}
              </p>
            </div>
          </div>

          <div className="sk-tabs" role="tablist" aria-label="Create order link steps">
            {(
              [
                { id: "instrument" as const, label: "1 · Instrument", ready: Boolean(details.tradingSymbol && details.scripCode) },
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
            <div className="sk-tab-nav">
              <span className="sk-hint">
                {details.tradingSymbol && details.scripCode
                  ? `${details.tradingSymbol} · scrip ${details.scripCode}`
                  : "Search and select an instrument first."}
              </span>
              <button
                className="sk-btn sk-btn-primary"
                type="button"
                disabled={!details.tradingSymbol || !details.scripCode}
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
                <span className="sk-label">{details.orderType === "NORMAL" ? "Price" : "Limit price"} *</span>
                <input className="sk-input" required type="number" min={details.orderType === "NORMAL" ? "0" : "0.01"} step="any" value={details.price} onChange={(event) => update("price", event.target.value)} />
              </label>
              <label className="sk-field">
                <span className="sk-label">Order type</span>
                <select
                  className="sk-input"
                  value={details.orderType}
                  onChange={(event) => update("orderType", event.target.value)}
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
            <div className="sk-grid-2">
              <label className="sk-field">
                <span className="sk-label">Product / Action (Sharekhan)</span>
                <select
                  className="sk-input"
                  value={details.productType}
                  onChange={(event) => update("productType", event.target.value)}
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
                <input className="sk-input" value={details.headline} onChange={(event) => update("headline", event.target.value)} placeholder="Equity Intraday Buy" />
              </label>
              <label className="sk-field">
                <span className="sk-label">Buy range</span>
                <input className="sk-input" value={details.buyRange} onChange={(event) => update("buyRange", event.target.value)} placeholder={Number(details.price) > 0 ? details.price : "1063"} />
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
                <p>{pinned ? `Saved card for ${shown.tradingSymbol}. Edit the form to return to the live draft.` : "This is how your WhatsApp share image will look."}</p>
              </div>
            </div>
            <OrderPreview model={shown} />
            {pinned && shareCard ? (
              <TradeShareCard data={shareCard} variant="toolbar" />
            ) : (
              <div className="sk-toolbar">
                <div className="sk-share-actions">
                  <button className="sk-btn sk-btn-ghost" type="button" disabled>Download PNG</button>
                  <button className="sk-btn sk-btn-ghost" type="button" disabled>Copy image</button>
                  <button className="sk-btn sk-btn-ghost" type="button" disabled>Share</button>
                </div>
                <p className="sk-hint">Generate a link to download the QR card.</p>
              </div>
            )}
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
              <p>Click a row or Edit to load it into the form, then generate a new link.</p>
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
                    <td>
                      <div className="sk-instrument">
                        <span className={`sk-mark${segment === "EQ" ? "" : " alt"}`}>{symbol.slice(0, 1)}</span>
                        <div>
                          <strong>{symbol}{preserved ? " · Demo" : ""}</strong>
                          <small>{link.details.stock || (link.kind === "order-intent" ? "Order details" : "One-tap link")}</small>
                        </div>
                      </div>
                    </td>
                    <td>{segmentLabel(segment)}</td>
                    <td><span className={`sk-chip sk-chip-${side.toLowerCase()}`}>{side}</span></td>
                    <td>
                      {link.kind === "order-intent"
                        ? `Qty ${link.details.quantity || "—"} · ${orderTypeShort(link.details.orderType)}${product ? ` · ${product}` : ""} · ${String(link.details.validity || "GFD").toUpperCase()}`
                        : "One-tap"}
                    </td>
                    <td>
                      <span className={`sk-status${link.active ? " on" : ""}`}>
                        {preserved ? (link.active ? "Preserved" : "Preserved · Off") : link.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{link.clicks}</td>
                    <td>
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
                    <td>
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
                        ) : (
                          <span className="sk-preserved-tag">Locked</span>
                        )}
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
