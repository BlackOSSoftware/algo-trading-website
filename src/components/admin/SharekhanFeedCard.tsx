"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { BrokerIcon, BrokerModal } from "./BrokerUi";

type FeedStatus = {
  state: string;
  connected: boolean;
  expired?: boolean;
  error?: string;
  subscriptions: number;
  lastTickAt?: string;
  hasCredentials?: boolean;
  hasSavedKeys?: boolean;
  apiKeyHint?: string;
  tokenStatus?: string;
};
const endpoint = "/api/v1/admin/sharekhan-feed";

function requestTokenFromUrl(url: string) {
  const query = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  for (const part of query.split("&")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = decodeURIComponent(part.slice(0, index)).toLowerCase();
    if (["request_token", "requesttoken", "reqtoken", "token", "code"].includes(key)) {
      return decodeURIComponent(part.slice(index + 1));
    }
  }
  return "";
}

export default function SharekhanFeedCard() {
  const [open, setOpen] = useState(false);
  const [editKeys, setEditKeys] = useState(false);
  const [feed, setFeed] = useState<FeedStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [secureKey, setSecureKey] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const callbackStarted = useRef(false);

  const refresh = useCallback(async () => {
    const status = await apiGet(`${endpoint}/status`, getAdminToken()) as FeedStatus;
    setFeed(status);
  }, []);

  const complete = useCallback(async (url: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const parsed = new URL(url);
      const state = parsed.searchParams.get("state");
      const requestToken = requestTokenFromUrl(url);
      if (!state?.startsWith("admin-feed-") || !requestToken) {
        throw new Error("Paste the full Sharekhan callback URL containing the admin login state and request token.");
      }
      await apiPost(`${endpoint}/complete`, { state, requestToken }, getAdminToken());
      setCallbackUrl("");
      setOpen(false);
      setEditKeys(false);
      setApiKey("");
      setMessage("Admin session saved. Connecting the shared price feed...");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete login");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  useEffect(() => {
    setRedirectUrl(`${window.location.origin}/sharekhan/callback`);
    if (!callbackStarted.current && new URLSearchParams(window.location.search).get("state")?.startsWith("admin-feed-")) {
      callbackStarted.current = true;
      const url = window.location.href;
      window.history.replaceState({}, "", window.location.pathname);
      void complete(url);
    }
    const poll = () => refresh().catch(() => setError("Unable to refresh feed status. Check your admin session or connection."));
    void poll();
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [complete, refresh]);

  async function login() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiPost(`${endpoint}/login`, { apiKey, secureKey }, getAdminToken()) as { loginUrl: string };
      setSecureKey("");
      window.location.assign(result.loginUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start login");
      setBusy(false);
    }
  }

  async function control(action: "reconnect" | "disconnect") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiPost(`${endpoint}/${action}`, {}, getAdminToken());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update feed");
    } finally { setBusy(false); }
  }

  const label = !feed ? "Checking status" : feed.expired ? "Session expired" : feed.connected ? "Connected" : feed.state === "connecting" ? "Connecting" : feed.state === "error" ? "Connection failed" : "Disconnected";
  const tone = feed?.connected ? "good" : feed?.expired || feed?.state === "error" ? "bad" : "pending";
  return <section className="broker-card broker-sharekhan">
    <div className="broker-card-top"><span className="broker-logo"><BrokerIcon /></span><span className="broker-role">LIVE PRICES</span></div>
    <h2>Sharekhan</h2><p className="broker-description">Shared live market feed for all users.</p>
    <span className={`broker-status ${tone}`} role="status"><i />{label}</span>
    <dl className="broker-facts"><div><dt>API settings</dt><dd>{feed?.hasSavedKeys ? `Saved ${feed.apiKeyHint || ""}` : "Not saved"}</dd></div><div><dt>Access token</dt><dd>{feed?.tokenStatus === "valid" ? "Valid ? feed verified" : feed?.tokenStatus === "expired" ? "Expired ? login again" : feed?.hasCredentials ? "Saved ? not verified" : "Not generated"}</dd></div><div><dt>Instruments</dt><dd>{feed?.subscriptions ?? 0} subscribed</dd></div><div><dt>Last live tick</dt><dd>{feed?.lastTickAt ? new Date(feed.lastTickAt).toLocaleTimeString() : "Waiting for market data"}</dd></div></dl>
    {error && <p className="broker-notice error" role="alert">{error}</p>}
    {feed?.error && <p className="broker-notice error">{feed.error}</p>}
    {message && <p className="broker-notice" role="status">{message}</p>}
    <div className="broker-actions"><button className="btn btn-primary" onClick={() => setOpen(true)}>{feed?.hasSavedKeys ? "Manage connection" : "Connect Sharekhan"}</button>{feed?.hasCredentials && <button className="btn btn-ghost" disabled={busy} onClick={() => control(feed.connected ? "disconnect" : "reconnect")}>{feed.connected ? "Disconnect" : "Reconnect"}</button>}</div>
    <BrokerModal open={open} onClose={() => setOpen(false)} title="Sharekhan live prices">
      <p className="broker-notice">Your keys are saved on the server. Login again only when the broker session expires.</p>
      {error && <p className="broker-notice error" role="alert">{error}</p>}
      <form className="broker-form" onSubmit={(event) => { event.preventDefault(); void login(); }}>
        {feed?.hasSavedKeys && !editKeys ? <div className="broker-saved"><BrokerIcon kind="key" /><div><strong>API credentials saved</strong><p>{feed.apiKeyHint}</p></div><button type="button" className="btn btn-ghost" onClick={() => setEditKeys(true)}>Change</button></div> : <><label>API Key<input className="input" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required /></label><label>Secure Key<input className="input" type="password" autoComplete="off" value={secureKey} onChange={(event) => setSecureKey(event.target.value)} required /></label></>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Please wait..." : feed?.hasSavedKeys && !editKeys ? "Login with saved credentials" : "Save keys & login"}</button>
      </form>
      <details className="broker-details"><summary>Callback setup & login help</summary><p>Set this redirect URL in your Sharekhan API account:</p><code className="broker-code">{redirectUrl}</code><p>If you land on another configured address, paste the full returned URL below.</p><form className="broker-form" onSubmit={(event) => { event.preventDefault(); void complete(callbackUrl); }}><label>Returned callback URL<input className="input" type="password" autoComplete="off" value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} required /></label><button className="btn btn-secondary" disabled={busy || !callbackUrl.trim()}>Finish connection</button></form></details>
    </BrokerModal>
  </section>;
}
