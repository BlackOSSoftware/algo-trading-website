"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getSharekhanToken } from "@/lib/auth";

type Details = { stock: string; tradingSymbol: string; scripCode: string; side: string; quantity: string; price: string; exchange: string; segment: string; expiry: string; strike: string; optionType: string; lotSize: string; orderType: string; productType: string; validity: string; triggerPrice: string; notes: string };
type Instrument = { token: string; symbol: string; name?: string; exchange: string; instrumentType?: string; expiry?: string; strike?: string; lotSize?: string };
type Expiry = { expiry: string; contracts: number };
type LinkRecord = { code: string; shortUrl: string; kind: string; details: Partial<Details>; active: boolean; clicks: number };
const blank: Details = { stock: "", tradingSymbol: "", scripCode: "", side: "BUY", quantity: "1", price: "0", exchange: "NSE", segment: "EQ", expiry: "", strike: "", optionType: "", lotSize: "", orderType: "NORMAL", productType: "INVESTMENT", validity: "GFD", triggerPrice: "", notes: "" };
const inputStyle = { width: "100%", marginTop: 6 };
const orderTypes = [{ value: "NORMAL", label: "Market" }, { value: "LIMIT", label: "Limit" }, { value: "STOPLOSS", label: "Stop loss limit" }, { value: "STOPLOSS_MARKET", label: "Stop loss market" }];
const productTypes = [{ value: "INVESTMENT", label: "Delivery (Investment)" }, { value: "BIGTRADE", label: "Intraday (BigTrade)" }, { value: "BIGTRADEPLUS", label: "Intraday Plus" }];

export default function SharekhanLinksPage() {
  const [details, setDetails] = useState<Details>(blank);
  const [existingUrl, setExistingUrl] = useState("");
  const [name, setName] = useState("");
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [created, setCreated] = useState<LinkRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Instrument[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expiries, setExpiries] = useState<Expiry[]>([]);
  const [loadingExpiries, setLoadingExpiries] = useState(false);
  const [bracketEnabled, setBracketEnabled] = useState(false);
  const [bracketTarget, setBracketTarget] = useState("");
  const [bracketStop, setBracketStop] = useState("");
  const [bracketTrail, setBracketTrail] = useState("");
  const refresh = useCallback(async () => {
    const response = await apiGet("/api/v1/sharekhan/links", getSharekhanToken()) as { links: LinkRecord[] };
    setLinks(response.links);
  }, []);
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 && (details.segment === "EQ" || !details.expiry)) { setSuggestions([]); setSearching(false); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: term, exchange: details.exchange, segment: details.segment, expiry: details.expiry, limit: "15" });
        const response = await apiGet(`/api/v1/sharekhan/instruments/search?${params}`, getSharekhanToken()) as { instruments?: Instrument[] };
        if (!cancelled) setSuggestions(Array.isArray(response.instruments) ? response.instruments : []);
      } catch { if (!cancelled) setSuggestions([]); }
      finally { if (!cancelled) setSearching(false); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query, details.exchange, details.segment, details.expiry]);
  useEffect(() => {
    if (details.segment === "EQ") { setExpiries([]); return; }
    let cancelled = false;
    const params = new URLSearchParams({ q: query.trim(), exchange: details.exchange, segment: details.segment });
    setLoadingExpiries(true);
    apiGet(`/api/v1/sharekhan/instruments/expiries?${params}`, getSharekhanToken())
      .then((response) => { if (!cancelled) setExpiries((response as { expiries?: Expiry[] }).expiries || []); })
      .catch(() => { if (!cancelled) setExpiries([]); })
      .finally(() => { if (!cancelled) setLoadingExpiries(false); });
    return () => { cancelled = true; };
  }, [query, details.exchange, details.segment]);
  function update(key: keyof Details, value: string) { setDetails((current) => ({ ...current, [key]: value })); }
  function selectInstrument(item: Instrument) {
    setDetails((current) => ({ ...current, tradingSymbol: item.symbol, scripCode: item.token, stock: item.name || item.symbol, exchange: item.exchange, expiry: item.expiry || "", strike: item.strike || "", lotSize: item.lotSize || "", optionType: /CE$/i.test(item.symbol) ? "CE" : /PE$/i.test(item.symbol) ? "PE" : "" }));
    setQuery(`${item.symbol} · ${item.exchange}${item.name ? ` · ${item.name}` : ""}`);
    setShowSuggestions(false); setSuggestions([]);
  }

  async function createOrderLink(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const submitDetails = { ...details, bracket: { enabled: bracketEnabled, targetPrice: bracketTarget, stopLossPrice: bracketStop, trailingStop: bracketTrail } };
      const result = await apiPost("/api/v1/sharekhan/order-intents", { details: submitDetails }, getSharekhanToken()) as { link: LinkRecord };
      setCreated(result.link); await refresh();
      setMessage("Order link created. The recipient can review the details before placing the order in Sharekhan.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create link"); }
    finally { setBusy(false); }
  }

  async function shortenKnownLink(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiPost("/api/v1/sharekhan/links", { payload: existingUrl, details: { stock: name } }, getSharekhanToken()) as { link: LinkRecord };
      setCreated(result.link); setExistingUrl(""); setName(""); await refresh();
      setMessage("Existing Sharekhan one-tap link shortened. Check its order screen before sharing.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not shorten link"); }
    finally { setBusy(false); }
  }

  async function deactivate(code: string) {
    try { await apiPost(`/api/v1/sharekhan/links/${code}/deactivate`, {}, getSharekhanToken()); await refresh(); setMessage("Link deactivated."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not deactivate link"); }
  }

  return <div className="sharekhan-links-page">
    <h1>Sharekhan order links</h1>
    <p>Create a link with a selected instrument and order details. Recipients can review the information before continuing to Sharekhan.</p>
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <strong>Review before placing an order</strong>
      <p>Shared links show the selected instrument, side, quantity, and order settings for the recipient to review.</p>
    </div>
    <form className="card sharekhan-link-form" onSubmit={createOrderLink} style={{ marginBottom: 22 }}>
      <h2 style={{ marginBottom: 18 }}>Create an order link</h2>
      <div className="sharekhan-form-grid">
        <label>Instrument segment<select className="input" style={inputStyle} value={details.segment} onChange={(e) => { const segment = e.target.value; const exchange = segment === "EQ" ? "NSE" : segment === "OPT" || segment === "FUT" ? "NFO" : "NSE"; setDetails((current) => ({ ...current, segment, exchange, tradingSymbol: "", scripCode: "", stock: "", expiry: "", strike: "", optionType: "", lotSize: "" })); setQuery(""); }}><option value="EQ">Equity</option><option value="FUT">Futures</option><option value="OPT">Options</option></select></label>
        <label style={{ position: "relative" }}>Search {details.segment === "OPT" ? "underlying or option contract" : details.segment === "FUT" ? "underlying or futures contract" : "share or symbol"}<input className="input" style={inputStyle} value={query} onFocus={() => setShowSuggestions(true)} onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); setDetails((current) => ({ ...current, tradingSymbol: e.target.value.toUpperCase(), scripCode: "", stock: "" })); }} placeholder={details.segment === "EQ" ? "RELIANCE or company name" : "NIFTY, BANKNIFTY, RELIANCE"} autoComplete="off" />{showSuggestions && (query.trim().length >= 2 || (details.segment !== "EQ" && details.expiry)) && <div role="listbox" className="sharekhan-search-results">{searching ? <div style={{ padding: 12 }}>Searching instruments…</div> : suggestions.length ? suggestions.map((item) => <button type="button" role="option" key={`${item.exchange}-${item.token}`} onMouseDown={(e) => e.preventDefault()} onClick={() => selectInstrument(item)}><strong>{item.symbol}</strong> · {item.exchange}<div style={{ fontSize: 13, opacity: 0.7 }}>{item.expiry ? `Expiry ${item.expiry} · ` : ""}{item.strike ? `Strike ${item.strike} · ` : ""}{item.lotSize ? `Lot ${item.lotSize} · ` : ""}{item.instrumentType} · Scrip {item.token}</div></button>) : <div style={{ padding: 12 }}>No matching contracts found. Check the exchange and instrument master.</div>}</div>}</label>
        <label>Trading symbol *<input className="input" style={inputStyle} required value={details.tradingSymbol} onChange={(e) => { update("tradingSymbol", e.target.value.toUpperCase()); if (query) setQuery(""); }} placeholder="RELIANCE" /></label>
        <label>Sharekhan scrip code *<input className="input" style={inputStyle} required value={details.scripCode} onChange={(e) => update("scripCode", e.target.value)} placeholder="Select a search result" /></label>
        <label>Stock name<input className="input" style={inputStyle} value={details.stock} onChange={(e) => update("stock", e.target.value)} placeholder="Reliance Industries" /></label>
        <label>Buy / Sell *<select className="input" style={inputStyle} value={details.side} onChange={(e) => update("side", e.target.value)}><option>BUY</option><option>SELL</option></select></label>
        <label>Exchange *<select className="input" style={inputStyle} value={details.exchange} onChange={(e) => { setDetails((current) => ({ ...current, exchange: e.target.value, tradingSymbol: "", scripCode: "", stock: "", expiry: "", strike: "", optionType: "", lotSize: "" })); setQuery(""); }}><option value="NSE">NSE</option><option value="BSE">BSE</option><option value="NFO">NFO</option><option value="BFO">BFO</option><option value="MCX">MCX</option><option value="CDS">CDS</option></select></label>
        {details.segment === "OPT" && <><label>Strike price<input className="input" style={inputStyle} value={details.strike} onChange={(e) => update("strike", e.target.value)} /></label><label>Option type<select className="input" style={inputStyle} value={details.optionType} onChange={(e) => update("optionType", e.target.value)}><option value="">Select CE / PE</option><option value="CE">Call (CE)</option><option value="PE">Put (PE)</option></select></label></>}
        {details.segment !== "EQ" && <><label>Contract expiry<select className="input" style={inputStyle} value={details.expiry} onChange={(e) => { setDetails((current) => ({ ...current, expiry: e.target.value, tradingSymbol: "", scripCode: "", strike: "", optionType: "", lotSize: "" })); setQuery(""); }}><option value="">{loadingExpiries ? "Loading expiries…" : "Select expiry"}</option>{expiries.map((item) => <option key={item.expiry} value={item.expiry}>{item.expiry} · {item.contracts} contracts</option>)}</select></label><label>Lot size<input className="input" style={inputStyle} value={details.lotSize} readOnly /></label></>}
        <label>Quantity *{details.lotSize && <span style={{ fontWeight: 400 }}> (lot size {details.lotSize})</span>}<input className="input" style={inputStyle} required type="number" min={details.lotSize || "1"} step={details.segment === "EQ" ? "1" : details.lotSize || "1"} value={details.quantity} onChange={(e) => update("quantity", e.target.value)} /></label>
        <label>Price<input className="input" style={inputStyle} required type="number" min="0" step="any" value={details.price} onChange={(e) => update("price", e.target.value)} /></label>
        <label>Order type<select className="input" style={inputStyle} value={details.orderType} onChange={(e) => update("orderType", e.target.value)}>{orderTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Product type<select className="input" style={inputStyle} value={details.productType} onChange={(e) => update("productType", e.target.value)}>{productTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        {details.orderType !== "NORMAL" && <label>Limit price *<input className="input" style={inputStyle} required type="number" min="0.01" step="any" value={details.price} onChange={(e) => update("price", e.target.value)} /></label>}
        {details.orderType.startsWith("STOPLOSS") && <label>Trigger price *<input className="input" style={inputStyle} required type="number" min="0.01" step="any" value={details.triggerPrice} onChange={(e) => update("triggerPrice", e.target.value)} /></label>}
        <label>Validity<select className="input" style={inputStyle} value={details.validity} onChange={(e) => update("validity", e.target.value)}><option value="GFD">Day (GFD)</option><option value="IOC">Immediate or cancel (IOC)</option></select></label>
        {details.segment === "EQ" && <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={bracketEnabled} onChange={(e) => setBracketEnabled(e.target.checked)} /> Add bracket legs (target + stop loss)</label>}
        {bracketEnabled && <><label>Bracket target price *<input className="input" style={inputStyle} required type="number" min="0.01" step="any" value={bracketTarget} onChange={(e) => setBracketTarget(e.target.value)} /></label><label>Bracket stop-loss price *<input className="input" style={inputStyle} required type="number" min="0.01" step="any" value={bracketStop} onChange={(e) => setBracketStop(e.target.value)} /></label><label>Trailing stop (optional)<input className="input" style={inputStyle} type="number" min="0" step="any" value={bracketTrail} onChange={(e) => setBracketTrail(e.target.value)} /></label></>}
      </div>
      <label style={{ display: "block", marginTop: 16 }}>Notes (optional)<input className="input" style={inputStyle} value={details.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Add a short note for the recipient" /></label>
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 20 }}>{busy ? "Creating..." : "Generate order details link"}</button>
    </form>
    <details className="card" style={{ padding: 20, marginBottom: 24 }}>
      <summary>Shorten an existing Sharekhan one-tap link</summary>
      <form onSubmit={shortenKnownLink} style={{ marginTop: 16 }}>
        <label>Verified one-tap URL or payload<input className="input" style={inputStyle} required value={existingUrl} onChange={(e) => setExistingUrl(e.target.value)} /></label>
        <label style={{ display: "block", marginTop: 12 }}>Name (optional)<input className="input" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button className="btn btn-secondary" disabled={busy} type="submit" style={{ marginTop: 16 }}>Shorten existing link</button>
      </form>
    </details>
    {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {created && <div className="card sharekhan-order-card" style={{ padding: 20, marginBottom: 24 }}><strong>New order link</strong><p style={{ overflowWrap: "anywhere" }}><a href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl}</a></p><button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(created.shortUrl)}>Copy link</button></div>}
    <h2>Recent links</h2>
      {links.map((link) => <div className="card sharekhan-order-card" key={link.code} style={{ padding: 18, marginBottom: 12 }}>
      <strong>{link.details.tradingSymbol || link.details.stock || link.code}</strong> · {link.kind === "order-intent" ? "Order details" : "Sharekhan one-tap"} · {link.active ? "Active" : "Inactive"} · {link.clicks} opens
      <p style={{ overflowWrap: "anywhere" }}><a href={link.shortUrl} target="_blank" rel="noreferrer">{link.shortUrl}</a></p>
      <button className="btn btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(link.shortUrl)}>Copy</button>{" "}
      {link.active && <button className="btn btn-ghost" type="button" onClick={() => deactivate(link.code)}>Deactivate</button>}
    </div>)}
  </div>;
}
