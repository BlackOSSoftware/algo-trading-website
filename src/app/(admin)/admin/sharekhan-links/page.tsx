"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type Details = Record<"stock" | "tradingSymbol" | "side" | "quantity" | "price" | "exchange" | "orderType" | "productType" | "notes", string>;
type LinkRecord = { code: string; shortUrl: string; destination: string; details: Details; active: boolean; createdAt: string; clicks: number };

export default function SharekhanLinksPage() {
  const [payload, setPayload] = useState("");
  const [name, setName] = useState("");
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<LinkRecord | null>(null);

  const refresh = useCallback(async () => {
    const result = await apiGet("/api/v1/admin/sharekhan-links", getAdminToken()) as { links: LinkRecord[] };
    setLinks(result.links);
  }, []);
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);

  async function createLink(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiPost("/api/v1/admin/sharekhan-links", { payload, details: { stock: name } }, getAdminToken()) as { link: LinkRecord };
      setCreated(result.link); setPayload(""); setName(""); await refresh();
      setMessage("Short link created. Open it on a device with the Sharekhan app to verify the order screen before sharing.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create link"); }
    finally { setBusy(false); }
  }

  async function deactivate(code: string) {
    setError("");
    try { await apiPost(`/api/v1/admin/sharekhan-links/${code}/deactivate`, {}, getAdminToken()); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not deactivate link"); }
  }

  return <div style={{ maxWidth: 1050, margin: "0 auto" }}>
    <h1>Sharekhan Links</h1>
    <p>Paste one verified Sharekhan one-tap link and get a shorter link to share. Opening it redirects to Sharekhan; this website does not place an order.</p>
    <div className="card" style={{ marginBottom: 20, padding: 24 }}>
      <strong>Sharekhan payload mapping is not verified</strong>
      <p>This tool shortens an existing one-tap link. It cannot safely create a new Sharekhan order payload from a stock, quantity, or price yet.</p>
    </div>
    <form className="card" onSubmit={createLink} style={{ padding: 24, marginBottom: 24 }}>
      <h2>Create link</h2>
      <label style={{ display: "block", marginBottom: 16 }}>Sharekhan one-tap URL or verified payload
        <input className="input" style={{ width: "100%", marginTop: 6 }} required value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="Paste the full Sharekhan one-tap URL" />
      </label>
      <label style={{ display: "block" }}>Name for your list (optional)
        <input className="input" style={{ width: "100%", marginTop: 6 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: Today's Sharekhan link" />
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 20 }}>{busy ? "Creating..." : "Generate short link"}</button>
    </form>
    {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {created && <div className="card" style={{ padding: 24, marginBottom: 24 }}><strong>New link</strong><p><a href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl}</a></p><button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(created.shortUrl)}>Copy link</button></div>}
    <h2>Recent links</h2>
    {links.map((link) => <div className="card" key={link.code} style={{ padding: 18, marginBottom: 12 }}>
      <strong>{link.details.tradingSymbol || link.details.stock || link.code}</strong> · {link.active ? "Active" : "Inactive"} · {link.clicks} opens
      <p style={{ overflowWrap: "anywhere" }}><a href={link.shortUrl} target="_blank" rel="noreferrer">{link.shortUrl}</a></p>
      <button className="btn btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(link.shortUrl)}>Copy</button>{" "}
      {link.active && <button className="btn btn-ghost" type="button" onClick={() => deactivate(link.code)}>Deactivate</button>}
    </div>)}
  </div>;
}
