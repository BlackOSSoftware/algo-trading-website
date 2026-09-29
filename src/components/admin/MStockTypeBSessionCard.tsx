"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";
import { BrokerIcon, BrokerModal } from "./BrokerUi";

type MStockSessionData = {
  jwtToken?: string;
  refreshToken?: string;
  feedToken?: string;
  clientCode?: string;
  state?: string;
  requestTime?: string;
};

type MStockSessionResponse = {
  ok?: boolean;
  step?: string;
  status?: number;
  message?: string;
  payload?: unknown;
  nextAction?: string | null;
  session?: MStockSessionData;
  savedDefaults?: SavedDefaultsSummary;
  savedConfig?: SavedConfig | null;
};

type SavedDefaultsSummary = {
  hasAnySavedDefaults?: boolean;
  configured?: boolean;
  candleReady?: boolean;
  apiKeyConfigured?: boolean;
  authTokenConfigured?: boolean;
  authTokenExpired?: boolean;
  authTokenExpiresAt?: string;
  apiType?: string;
  clientCode?: string;
  state?: string;
  exchange?: string;
  interval?: string;
  instrumentToken?: string;
  instrumentTokenConfigured?: boolean;
  typeBEqAutoResolveReady?: boolean;
  candleOffset?: number | null;
  updatedAt?: string;
};

type SavedConfig = {
  apiType?: string;
  apiKey?: string;
  authToken?: string;
  refreshToken?: string;
  feedToken?: string;
  clientCode?: string;
  state?: string;
  exchange?: string;
  interval?: string;
  instrumentToken?: string;
  candleOffset?: number | null;
};

type MarketDataTestResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  apiType?: string;
  exchange?: string;
  interval?: string;
  symbol?: string;
  segment?: string;
  instrumentToken?: string;
  authTokenExpiresAt?: string;
  candle?: {
    timestamp?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number | null;
  } | null;
  checks?: unknown;
};

const DRAFT_STORAGE_KEY = "wt_admin_mstock_draft";

export default function MStockTypeBSessionCard() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"login" | "candles" | "test">("login");
  const [verifyMode, setVerifyMode] = useState<"otp" | "totp">("otp");
  const [editKeys, setEditKeys] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const [apiKey, setApiKey] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [password, setPassword] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [exchange, setExchange] = useState("NSE");
  const [interval, setInterval] = useState("day");
  const [candleOffset, setCandleOffset] = useState("1");
  const [refreshToken, setRefreshToken] = useState("");
  const [otp, setOtp] = useState("");
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MStockSessionResponse | null>(null);
  const [savedDefaults, setSavedDefaults] = useState<SavedDefaultsSummary | null>(null);
  const [testSymbol, setTestSymbol] = useState("ONGC");
  const [testingMarketData, setTestingMarketData] = useState(false);
  const [marketTestResult, setMarketTestResult] = useState<MarketDataTestResponse | null>(null);
  const [marketTestError, setMarketTestError] = useState<string | null>(null);
  const [marketTestMessage, setMarketTestMessage] = useState<string | null>(null);

  const applySavedConfig = (config?: SavedConfig | null) => {
    if (!config) return;
    if (config.apiKey) setApiKey(config.apiKey);
    if (config.clientCode) setClientCode(config.clientCode);
    if (config.state) setStateValue(config.state);
    if (config.refreshToken) setRefreshToken(config.refreshToken);
    if (config.exchange) setExchange(config.exchange);
    if (config.interval) setInterval(config.interval);
    if (config.candleOffset) setCandleOffset(String(config.candleOffset));
    if (config.authToken || config.refreshToken || config.feedToken) {
      setResult((current) => ({
        ...(current || {}),
        ok: true,
        step: current?.step || "saved",
        message: current?.message || "Saved mStock defaults loaded",
        session: {
          ...(current?.session || {}),
          ...(config.authToken ? { jwtToken: config.authToken } : {}),
          ...(config.refreshToken ? { refreshToken: config.refreshToken } : {}),
          ...(config.feedToken ? { feedToken: config.feedToken } : {}),
          ...(config.clientCode ? { clientCode: config.clientCode } : {}),
          ...(config.state ? { state: config.state } : {}),
        },
      }));
    }
  };

  const session = result?.session || {};
  const handleResult = (data: MStockSessionResponse) => {
    setResult(data);
    setError(data.ok === false ? data.message || "mStock request failed" : null);
    setMessage(data.ok === false ? null : data.message || null);
    if (data.savedDefaults) {
      setSavedDefaults(data.savedDefaults);
      if (data.savedDefaults.exchange) setExchange(data.savedDefaults.exchange);
      if (data.savedDefaults.interval) setInterval(data.savedDefaults.interval);
      if (data.savedDefaults.candleOffset) setCandleOffset(String(data.savedDefaults.candleOffset));
    }
    applySavedConfig(data.savedConfig);
    if (data.session?.refreshToken) {
      setRefreshToken(data.session.refreshToken);
    }
    if (data.session?.state) {
      setStateValue(data.session.state);
    }
    if (data.session?.clientCode) {
      setClientCode(data.session.clientCode);
    }
  };

  useEffect(() => {
    let active = true;

    const loadSavedDefaults = async () => {
      try {
        const token = getAdminToken();
        const data = (await apiGet("/api/v1/admin/mstock/defaults", token)) as {
          savedDefaults?: SavedDefaultsSummary;
          savedConfig?: SavedConfig | null;
        };
        if (!active || !data.savedDefaults) return;
        setSavedDefaults(data.savedDefaults);
        applySavedConfig(data.savedConfig);
      } catch {
        if (active) setError("Could not load saved mStock settings. Please refresh and try again.");
      }
    };

    loadSavedDefaults();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { password?: string };
      if (parsed.password) {
        setPassword(parsed.password);
      }
    } catch {
      // ignore corrupted local draft
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          password,
        })
      );
    } catch {
      // ignore storage failures
    }
  }, [password]);

  const postSession = async (path: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      const data = (await apiPost(path, body, token)) as MStockSessionResponse;
      handleResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "mStock request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const saveCandleDefaults = async () => {
    if (!candleOffset.trim()) {
      setError("Candle offset is required.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      const data = (await apiPost(
        "/api/v1/admin/mstock/defaults",
        {
          exchange: exchange.trim().toUpperCase(),
          interval: interval.trim(),
          candleOffset: candleOffset.trim(),
        },
        token
      )) as MStockSessionResponse;
      handleResult({
        ...data,
        ok: data.ok ?? true,
        message: data.message || "mStock candle defaults saved.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mStock defaults");
    } finally {
      setLoading(false);
    }
  };

  const startLogin = async () => {
    if (!clientCode.trim()) {
      setError("Client code is required.");
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    await postSession("/api/v1/admin/mstock/typeb/login", {
      apiKey: apiKey.trim() || undefined,
      clientCode: clientCode.trim(),
      password: password,
      state: stateValue.trim() || undefined,
      totp: totp.trim(),
      exchange: exchange.trim().toUpperCase(),
      interval: interval.trim(),
      candleOffset: candleOffset.trim() || undefined,
    });
  };

  const verifyOtp = async () => {
    if (!apiKey.trim()) {
      setError("API key is required for OTP verification.");
      return;
    }
    if (!refreshToken.trim()) {
      setError("Refresh token is required for OTP verification.");
      return;
    }
    if (!otp.trim()) {
      setError("OTP is required.");
      return;
    }
    await postSession("/api/v1/admin/mstock/typeb/session/token", {
      apiKey: apiKey.trim(),
      refreshToken: refreshToken.trim(),
      otp: otp.trim(),
      exchange: exchange.trim().toUpperCase(),
      interval: interval.trim(),
      candleOffset: candleOffset.trim() || undefined,
    });
  };

  const verifyTotp = async () => {
    if (!apiKey.trim()) {
      setError("API key is required for TOTP verification.");
      return;
    }
    if (!refreshToken.trim()) {
      setError("Refresh token is required for TOTP verification.");
      return;
    }
    if (!totp.trim()) {
      setError("TOTP is required.");
      return;
    }
    await postSession("/api/v1/admin/mstock/typeb/session/verifytotp", {
      apiKey: apiKey.trim(),
      refreshToken: refreshToken.trim(),
      totp: totp.trim(),
      exchange: exchange.trim().toUpperCase(),
      interval: interval.trim(),
      candleOffset: candleOffset.trim() || undefined,
    });
  };

  const testMarketData = async () => {
    setTestingMarketData(true);
    setMarketTestError(null);
    setMarketTestMessage(null);
    try {
      const token = getAdminToken();
      const data = (await apiPost(
        "/api/v1/admin/mstock/test-market-data",
        {
          symbol: testSymbol.trim() || "ONGC",
        },
        token
      )) as MarketDataTestResponse;
      setMarketTestResult(data);
      setMarketTestError(data.ok === false ? data.error || data.message || "mStock market data test failed" : null);
      setMarketTestMessage(data.ok === false ? null : data.message || "mStock market data test completed.");
    } catch (err) {
      setMarketTestError(err instanceof Error ? err.message : "Failed to test mStock market data");
    } finally {
      setTestingMarketData(false);
    }
  };

  const expired = Boolean(savedDefaults?.authTokenExpired || (savedDefaults?.authTokenExpiresAt && Date.parse(savedDefaults.authTokenExpiresAt) <= now));
  const hasJwt = Boolean(savedDefaults?.authTokenConfigured || session.jwtToken);
  const label = !savedDefaults ? "Checking status" : expired ? "Session expired" : hasJwt ? "Token saved" : refreshToken ? "Verification needed" : "Not connected";
  const tone = expired ? "bad" : hasJwt ? "good" : "pending";
  return <section className="broker-card broker-mstock">
    <div className="broker-card-top"><span className="broker-logo"><BrokerIcon kind="candle" /></span><span className="broker-role">CANDLE DATA</span></div>
    <h2>mStock</h2><p className="broker-description">Historical candles for candle-based strategies.</p>
    <span className={`broker-status ${tone}`} role="status"><i />{label}</span>
    <dl className="broker-facts"><div><dt>Account</dt><dd>{savedDefaults?.clientCode || clientCode || "Not added"}</dd></div><div><dt>API key</dt><dd>{savedDefaults?.apiKeyConfigured ? "Saved" : "Not saved"}</dd></div><div><dt>Token expiry</dt><dd>{savedDefaults?.authTokenExpiresAt ? new Date(savedDefaults.authTokenExpiresAt).toLocaleString() : "Not available"}</dd></div><div><dt>Candle settings</dt><dd>{savedDefaults?.candleReady ? `${exchange} ? ${interval}` : "Setup needed"}</dd></div></dl>
    {error && !open && <p className="broker-notice error" role="alert">{error}</p>}
    <p className="broker-notice">Live order prices come from Sharekhan. mStock is kept separate for candles.</p>
    <div className="broker-actions"><button className="btn btn-secondary" onClick={() => { setTab("login"); setOpen(true); }}>{hasJwt && !expired ? "Manage account" : "Connect mStock"}</button><button className="btn btn-ghost" onClick={() => { setTab("candles"); setOpen(true); }}>Candle settings</button></div>
    <BrokerModal open={open} onClose={() => setOpen(false)} title="mStock candle account">
      <div className="broker-tabs" role="group" aria-label="mStock setup section">{(["login", "candles", "test"] as const).map((value) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === "login" ? "Account & login" : value === "candles" ? "Candle settings" : "Test connection"}</button>)}</div>
      {error && <p className="broker-notice error" role="alert">{error}</p>}{message && <p className="broker-notice" role="status">{message}</p>}
      {tab === "login" && <div className="broker-form">
        <div className="broker-step"><span>1</span><div><strong>Sign in to mStock</strong><p>Your API key and client code are remembered.</p></div></div>
        {savedDefaults?.apiKeyConfigured && !editKeys ? <div className="broker-saved"><BrokerIcon kind="key" /><div><strong>API key saved</strong><p>{clientCode}</p></div><button className="btn btn-ghost" onClick={() => setEditKeys(true)}>Change</button></div> : <label>API key<input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" /></label>}
        <div className="broker-fields"><label>Client code<input className="input" value={clientCode} onChange={(e) => setClientCode(e.target.value)} /></label><label>Password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label></div>
        <button className="btn btn-primary" disabled={loading} onClick={startLogin}>{loading ? "Please wait..." : "Start login / Send OTP"}</button>
        <div className="broker-step"><span>2</span><div><strong>Verify your account</strong><p>Use the SMS/email OTP or your authenticator code.</p></div></div>
        <div className="broker-tabs"><button aria-pressed={verifyMode === "otp"} onClick={() => setVerifyMode("otp")}>SMS / email OTP</button><button aria-pressed={verifyMode === "totp"} onClick={() => setVerifyMode("totp")}>Authenticator TOTP</button></div>
        <label>{verifyMode === "otp" ? "OTP" : "Authenticator code"}<input className="input" inputMode="numeric" autoComplete="one-time-code" value={verifyMode === "otp" ? otp : totp} onChange={(e) => verifyMode === "otp" ? setOtp(e.target.value) : setTotp(e.target.value)} /></label>
        <button className="btn btn-secondary" disabled={loading || !refreshToken} onClick={verifyMode === "otp" ? verifyOtp : verifyTotp}>Verify & save session</button>
        {!refreshToken && <p className="helper">Start login first to enable verification.</p>}
        <details className="broker-details"><summary>Advanced login settings</summary><label>State<input className="input" value={stateValue} onChange={(e) => setStateValue(e.target.value)} /></label><label>Refresh / request token<input className="input" type="password" value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} /></label></details>
      </div>}
      {tab === "candles" && <div className="broker-form"><p className="broker-notice">These settings apply only to historical candle requests.</p><div className="broker-fields"><label>Exchange<select className="select" value={exchange} onChange={(e) => setExchange(e.target.value)}>{["NSE", "BSE", "NFO", "BFO", "CDS", "MCX"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Timeframe<select className="select" value={interval} onChange={(e) => setInterval(e.target.value)}>{["1minute", "3minute", "5minute", "10minute", "15minute", "30minute", "60minute", "day"].map((value) => <option key={value} value={value}>{value === "day" ? "1 day" : value.replace("minute", " minutes")}</option>)}</select></label></div><label>Candle offset<input className="input" type="number" min="1" step="1" value={candleOffset} onChange={(e) => setCandleOffset(e.target.value)} /></label><p className="helper">1 = latest candle, 2 = previous candle.</p><button className="btn btn-primary" disabled={loading} onClick={saveCandleDefaults}>Save candle settings</button></div>}
      {tab === "test" && <div className="broker-form"><p className="helper">Check that mStock can return historical candle data.</p><label>Test symbol<input className="input" value={testSymbol} onChange={(e) => setTestSymbol(e.target.value)} /></label><button className="btn btn-secondary" disabled={testingMarketData} onClick={testMarketData}>{testingMarketData ? "Testing..." : "Test candle connection"}</button>{marketTestError && <p className="broker-notice error" role="alert">{marketTestError}</p>}{marketTestMessage && <p className="broker-notice" role="status">{marketTestMessage}</p>}{marketTestResult?.candle && <div className="broker-saved"><BrokerIcon kind="candle" /><div><strong>{marketTestResult.symbol || testSymbol}</strong><p>Close: {marketTestResult.candle.close} ? {marketTestResult.candle.timestamp}</p></div></div>}</div>}
    </BrokerModal>
  </section>;
}
