"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type Details = { stock: string; tradingSymbol: string; scripCode: string; side: string; quantity: string; price: string; exchange: string; orderType: string; productType: string; notes: string };
type LinkRecord = { code: string; shortUrl: string; kind: string; details: Partial<Details>; active: boolean; clicks: number };
const blank: Details = { stock: "", tradingSymbol: "", scripCode: "", side: "BUY", quantity: "1", price: "0", exchange: "NSE", orderType: "NORMAL", productType: "INVESTMENT", notes: "" };
const inputStyle = { width: "100%", marginTop: 6 };

export default function SharekhanLinksPage() {
  const [details, setDetails] = useState<Details>(blank);
  const [existingUrl, setExistingUrl] = useState("");
  const [name, setName] = useState("");
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [created, setCreated] = useState<LinkRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    const response = await apiGet("/api/v1/admin/sharekhan-links", getAdminToken()) as { links: LinkRecord[] };
    setLinks(response.links);
  }, []);
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);
  function update(key: keyof Details, value: string) { setDetails((current) => ({ ...current, [key]: value })); }

  async function createOrderLink(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiPost("/api/v1/admin/order-intents", { details }, getAdminToken()) as { link: LinkRecord };
      setCreated(result.link); await refresh();
      setMessage("Order link created. Phone par yeh Sharekhan app ka order screen kholta hai.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create link"); }
    finally { setBusy(false); }
  }

  async function shortenKnownLink(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiPost("/api/v1/admin/sharekhan-links", { payload: existingUrl, details: { stock: name } }, getAdminToken()) as { link: LinkRecord };
      setCreated(result.link); setExistingUrl(""); setName(""); await refresh();
      setMessage("Existing Sharekhan one-tap link shortened. Check its order screen before sharing.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not shorten link"); }
    finally { setBusy(false); }
  }

  async function deactivate(code: string) {
    try { await apiPost(`/api/v1/admin/sharekhan-links/${code}/deactivate`, {}, getAdminToken()); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not deactivate link"); }
  }

  return <div style={{ maxWidth: 1000, margin: "0 auto" }}>
    <h1>Shareable Order Links</h1>
    <p>Order details bharo aur link bhejo. Phone par yeh Sharekhan app ke order screen par khulta hai, website par nahi. Trade tabhi place hota hai jab user app mein confirm karta hai.</p>
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <strong>Link Sharekhan order screen kholta hai</strong>
      <p>Yeh wahi one-tap link hai jo Sharekhan app mein scrip, buy/sell, quantity aur price ke saath order page kholti hai.</p>
    </div>
    <form className="card" onSubmit={createOrderLink} style={{ padding: 24, marginBottom: 22 }}>
      <h2>Create order details link</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        <label>Trading symbol *<input className="input" style={inputStyle} required value={details.tradingSymbol} onChange={(e) => update("tradingSymbol", e.target.value)} placeholder="ZYDUSLIFE" /></label>
        <label>Sharekhan scrip code<input className="input" style={inputStyle} value={details.scripCode} onChange={(e) => update("scripCode", e.target.value)} placeholder="73927" /></label>
        <label>Stock name<input className="input" style={inputStyle} value={details.stock} onChange={(e) => update("stock", e.target.value)} placeholder="Zydus Lifesciences" /></label>
        <label>Buy / Sell *<select className="input" style={inputStyle} value={details.side} onChange={(e) => update("side", e.target.value)}><option>BUY</option><option>SELL</option></select></label>
        <label>Exchange *<select className="input" style={inputStyle} value={details.exchange} onChange={(e) => update("exchange", e.target.value)}><option>NSE</option><option>BSE</option></select></label>
        <label>Quantity *<input className="input" style={inputStyle} required type="number" min="1" step="1" value={details.quantity} onChange={(e) => update("quantity", e.target.value)} /></label>
        <label>Price (0 = market) *<input className="input" style={inputStyle} required type="number" min="0" step="any" value={details.price} onChange={(e) => update("price", e.target.value)} /></label>
        <label>Order type<input className="input" style={inputStyle} value={details.orderType} onChange={(e) => update("orderType", e.target.value)} /></label>
        <label>Product type<input className="input" style={inputStyle} value={details.productType} onChange={(e) => update("productType", e.target.value)} /></label>
      </div>
      <label style={{ display: "block", marginTop: 16 }}>Notes (optional)<input className="input" style={inputStyle} value={details.notes} onChange={(e) => update("notes", e.target.value)} /></label>
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 20 }}>{busy ? "Creating..." : "Generate order details link"}</button>
    </form>
    <details className="card" style={{ padding: 20, marginBottom: 24 }}>
      <summary>Already have a Sharekhan one-tap link? Shorten it</summary>
      <form onSubmit={shortenKnownLink} style={{ marginTop: 16 }}>
        <label>Verified one-tap URL or payload<input className="input" style={inputStyle} required value={existingUrl} onChange={(e) => setExistingUrl(e.target.value)} /></label>
        <label style={{ display: "block", marginTop: 12 }}>Name (optional)<input className="input" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button className="btn btn-secondary" disabled={busy} type="submit" style={{ marginTop: 16 }}>Shorten existing link</button>
      </form>
    </details>
    {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {created && <div className="card" style={{ padding: 20, marginBottom: 24 }}><strong>New link</strong><p style={{ overflowWrap: "anywhere" }}><a href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl}</a></p><button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(created.shortUrl)}>Copy link</button></div>}
    <h2>Recent links</h2>
    {links.map((link) => <div className="card" key={link.code} style={{ padding: 18, marginBottom: 12 }}>
      <strong>{link.details.tradingSymbol || link.details.stock || link.code}</strong> · {link.kind === "order-intent" ? "Order details" : "Sharekhan one-tap"} · {link.active ? "Active" : "Inactive"} · {link.clicks} opens
      <p style={{ overflowWrap: "anywhere" }}><a href={link.shortUrl} target="_blank" rel="noreferrer">{link.shortUrl}</a></p>
      <button className="btn btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(link.shortUrl)}>Copy</button>{" "}
      {link.active && <button className="btn btn-ghost" type="button" onClick={() => deactivate(link.code)}>Deactivate</button>}
    </div>)}
  </div>;
}
