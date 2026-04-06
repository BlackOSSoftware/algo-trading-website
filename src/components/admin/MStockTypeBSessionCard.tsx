"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

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

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function copyText(value: string) {
  if (!value) return false;
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function MStockTypeBSessionCard() {
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
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MStockSessionResponse | null>(null);
  const [copiedField, setCopiedField] = useState("");
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
  const raw = prettyJson(result?.payload || result || {});
  const statusTone = result?.ok ? "ok" : "error";
  const statusLabel = result?.step === "saved" && savedDefaults?.authTokenExpired
    ? "JWT expired"
    : result?.session?.jwtToken
      ? "JWT ready"
      : result?.ok && result?.step === "login"
      ? "OTP/TOTP pending"
      : result?.ok
        ? "Session ready"
        : "Request failed";

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
        // keep form usable even if summary fetch fails
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
    setCopiedField("");
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

  const handleCopy = async (field: string, value: string) => {
    const ok = await copyText(value);
    if (!ok) {
      setError("Copy failed. Please copy manually.");
      return;
    }
    setCopiedField(field);
    setError(null);
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

  return (
    <div className="card">
      <div className="page-title">mStock JWT Session</div>
      <div className="helper" style={{ marginTop: "6px" }}>
        Admin-only helper for mStock Type B login used in candle data access. `Start login`
        request/refresh token laata hai, lekin candle fetch ke liye final JWT OTP/TOTP
        verification ke baad hi ready hota hai.
        SMS/email OTP flow me separate send button nahi hai; `Start login` hi OTP trigger
        karta hai.
        Agar aap authenticator app use karte ho to fresh code `TOTP` field me dalo aur
        `Verify TOTP` click karo.
      </div>

      {savedDefaults?.hasAnySavedDefaults ? (
        <div className="card" style={{ marginTop: "14px", padding: "14px" }}>
          <div className="page-title" style={{ fontSize: "16px" }}>
            Saved mStock Defaults
          </div>
          <div className="helper" style={{ marginTop: "6px" }}>
            JWT/session save alag cheez hai. Candle setup tab complete hota hai jab exchange aur
            timeframe ready ho. Type B cash-equity ke liye symboltoken runtime par auto-resolve
            hota hai.
          </div>
          <div style={{ marginTop: "12px" }}>
            <span className={`status-chip ${savedDefaults.candleReady ? "ok" : "error"}`}>
              {savedDefaults.candleReady ? "Candle setup ready" : "Candle setup incomplete"}
            </span>
          </div>
          <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>API type</strong>
              <span>{savedDefaults.apiType || "typeB"}</span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>Client code</strong>
              <span>{savedDefaults.clientCode || "-"}</span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>State</strong>
              <span>{savedDefaults.state || "-"}</span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>API key</strong>
              <span>{savedDefaults.apiKeyConfigured ? "Saved" : "Not saved"}</span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>JWT token</strong>
              <span>
                {savedDefaults.authTokenConfigured
                  ? savedDefaults.authTokenExpired
                    ? "Expired"
                    : "Saved"
                  : "Not saved"}
              </span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>JWT expires</strong>
              <span>
                {savedDefaults.authTokenExpiresAt
                  ? new Date(savedDefaults.authTokenExpiresAt).toLocaleString()
                  : "-"}
              </span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>Exchange</strong>
              <span>{savedDefaults.exchange || "-"}</span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>Interval</strong>
              <span>{savedDefaults.interval || "-"}</span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>Candle offset</strong>
              <span>{savedDefaults.candleOffset ?? "-"}</span>
            </div>
            <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
              <strong>Updated</strong>
              <span>
                {savedDefaults.updatedAt
                  ? new Date(savedDefaults.updatedAt).toLocaleString()
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-error" style={{ marginTop: "14px" }}>
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="alert alert-success" style={{ marginTop: "14px" }}>
          {message}
        </div>
      ) : null}

      <div className="form" style={{ marginTop: "16px" }}>
        <div className="grid-2">
          <div className="input-group">
            <label className="label" htmlFor="mstock-api-key">
              mStock API key
            </label>
            <div className="cta-row">
              <input
                className="input"
                id="mstock-api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Type B API key"
              />
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setShowApiKey((current) => !current)}
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            <div className="helper">
              Leave blank if the API key has already been saved in strategy defaults.
            </div>
          </div>

          <div className="input-group">
            <label className="label" htmlFor="mstock-client-code">
              Client code
            </label>
            <input
              className="input"
              id="mstock-client-code"
              value={clientCode}
              onChange={(event) => setClientCode(event.target.value)}
              placeholder="Your mStock client code"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="input-group">
            <label className="label" htmlFor="mstock-password">
              Password
            </label>
            <div className="cta-row">
              <input
                className="input"
                id="mstock-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="mStock password"
              />
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="label" htmlFor="mstock-state">
              State (optional)
            </label>
            <input
              className="input"
              id="mstock-state"
              value={stateValue}
              onChange={(event) => setStateValue(event.target.value)}
              placeholder="Optional state value"
            />
          </div>
        </div>

        <div className="cta-row" style={{ marginTop: "8px" }}>
          <button className="btn btn-primary" type="button" disabled={loading} onClick={startLogin}>
            {loading ? "Working..." : "Start login / Send OTP"}
          </button>
        </div>
        <div className="helper" style={{ marginTop: "8px" }}>
          Agar aapka account SMS/email OTP use karta hai to isi button se OTP aata hai. Agar
          aap authenticator app use karte ho to fresh code niche `TOTP` field me dalo aur
          `Verify TOTP` click karo.
        </div>

        <div className="grid-2" style={{ marginTop: "18px" }}>
          <div className="input-group">
            <label className="label" htmlFor="mstock-refresh-token">
              Refresh token
            </label>
            <input
              className="input mono"
              id="mstock-refresh-token"
              value={refreshToken}
              onChange={(event) => setRefreshToken(event.target.value)}
              placeholder="Auto-filled after login if mStock returns it"
            />
            <div className="helper">
              Login response se auto-fill ho jayega agar mStock return kare. Kuch accounts me ye
              request token hota hai. Final live JWT OTP/TOTP verification ke baad aata hai.
            </div>
          </div>

          <div className="input-group">
            <label className="label" htmlFor="mstock-otp">
              OTP
            </label>
            <input
              className="input"
              id="mstock-otp"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="SMS / email OTP"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="input-group">
            <label className="label" htmlFor="mstock-totp">
              TOTP
            </label>
            <input
              className="input"
              id="mstock-totp"
              value={totp}
              onChange={(event) => setTotp(event.target.value)}
              placeholder="Authenticator code"
            />
          </div>

          <div className="input-group">
            <label className="label">Verify session</label>
            <div className="cta-row">
              <button className="btn btn-ghost" type="button" disabled={loading} onClick={verifyOtp}>
                Verify OTP (SMS/email)
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={loading}
                onClick={verifyTotp}
              >
                Verify TOTP (app)
              </button>
            </div>
            <div className="helper">
              OTP aur TOTP me se jo aapke account flow me lage, wahi use karo.
            </div>
          </div>
        </div>

        <div className="page-title" style={{ marginTop: "18px" }}>
          Candle Defaults
        </div>
        <div className="helper" style={{ marginTop: "6px" }}>
          Type B cash-equity ke liye symboltoken runtime par auto-resolve hoga. Yahan sirf
          exchange, timeframe, aur candle offset save karna hai.
        </div>

        <div className="grid-2" style={{ marginTop: "12px" }}>
          <div className="input-group">
            <label className="label" htmlFor="mstock-default-exchange">
              Exchange
            </label>
            <select
              className="select"
              id="mstock-default-exchange"
              value={exchange}
              onChange={(event) => setExchange(event.target.value)}
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
              <option value="NFO">NFO</option>
              <option value="BFO">BFO</option>
              <option value="CDS">CDS</option>
              <option value="MCX">MCX</option>
            </select>
          </div>
          <div className="input-group">
            <label className="label" htmlFor="mstock-default-interval">
              Candle timeframe
            </label>
            <select
              className="select"
              id="mstock-default-interval"
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
            >
              <option value="minute">1 minute</option>
              <option value="3minute">3 minute</option>
              <option value="5minute">5 minute</option>
              <option value="10minute">10 minute</option>
              <option value="15minute">15 minute</option>
              <option value="30minute">30 minute</option>
              <option value="60minute">60 minute</option>
              <option value="day">1 day</option>
            </select>
          </div>
        </div>

        <div className="input-group">
          <label className="label" htmlFor="mstock-default-offset">
            Candle offset
          </label>
          <input
            className="input"
            id="mstock-default-offset"
            value={candleOffset}
            onChange={(event) => setCandleOffset(event.target.value)}
            placeholder="1"
          />
          <div className="helper">`1` = latest candle, `2` = previous candle.</div>
        </div>

        <div className="cta-row" style={{ marginTop: "8px" }}>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={loading}
            onClick={saveCandleDefaults}
          >
            {loading ? "Saving..." : "Save candle defaults"}
          </button>
        </div>

        <div className="page-title" style={{ marginTop: "18px" }}>
          Market Data Test
        </div>
        <div className="helper" style={{ marginTop: "6px" }}>
          Yeh test check karta hai ki saved mStock session actual market data endpoints hit kar pa
          raha hai ya nahi.
        </div>
        <div className="grid-2" style={{ marginTop: "12px" }}>
          <div className="input-group">
            <label className="label" htmlFor="mstock-test-symbol">
              Test symbol
            </label>
            <input
              className="input"
              id="mstock-test-symbol"
              value={testSymbol}
              onChange={(event) => setTestSymbol(event.target.value.toUpperCase())}
              placeholder="ONGC"
            />
          </div>
          <div className="input-group">
            <label className="label">Run test</label>
            <div className="cta-row">
              <button
                className="btn btn-secondary"
                type="button"
                disabled={testingMarketData}
                onClick={testMarketData}
              >
                {testingMarketData ? "Testing..." : "Test mStock market data"}
              </button>
            </div>
          </div>
        </div>
        {marketTestError ? (
          <div className="alert alert-error" style={{ marginTop: "14px" }}>
            {marketTestError}
          </div>
        ) : null}
        {marketTestMessage ? (
          <div className="alert alert-success" style={{ marginTop: "14px" }}>
            {marketTestMessage}
          </div>
        ) : null}
        {marketTestResult ? (
          <>
            <div style={{ marginTop: "14px" }}>
              <span className={`status-chip ${marketTestResult.ok ? "ok" : "error"}`}>
                {marketTestResult.ok ? "Market data test passed" : "Market data test failed"}
              </span>
            </div>
            <div style={{ display: "grid", gap: "8px", marginTop: "14px" }}>
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>Symbol</strong>
                <span>{marketTestResult.symbol || "-"}</span>
              </div>
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>Instrument token</strong>
                <span>{marketTestResult.instrumentToken || "-"}</span>
              </div>
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>Exchange</strong>
                <span>{marketTestResult.exchange || "-"}</span>
              </div>
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>Interval</strong>
                <span>{marketTestResult.interval || "-"}</span>
              </div>
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>JWT expires</strong>
                <span>
                  {marketTestResult.authTokenExpiresAt
                    ? new Date(marketTestResult.authTokenExpiresAt).toLocaleString()
                    : "-"}
                </span>
              </div>
              {!marketTestResult.ok ? (
                <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                  <strong>Failure reason</strong>
                  <span>{marketTestResult.error || marketTestResult.message || "-"}</span>
                </div>
              ) : null}
              {marketTestResult.candle ? (
                <>
                  <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                    <strong>Candle time</strong>
                    <span>{marketTestResult.candle.timestamp || "-"}</span>
                  </div>
                  <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                    <strong>High</strong>
                    <span>{marketTestResult.candle.high ?? "-"}</span>
                  </div>
                  <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                    <strong>Low</strong>
                    <span>{marketTestResult.candle.low ?? "-"}</span>
                  </div>
                </>
              ) : null}
            </div>
            <details style={{ marginTop: "14px" }}>
              <summary className="helper" style={{ cursor: "pointer" }}>
                Market data test details
              </summary>
              <pre className="mono" style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
                {prettyJson(marketTestResult)}
              </pre>
            </details>
          </>
        ) : null}
      </div>

      {result ? (
        <>
          <div style={{ marginTop: "18px" }}>
            <span className={`status-chip ${statusTone}`}>{statusLabel}</span>
          </div>
          <div className="helper" style={{ marginTop: "10px" }}>
            {result.message || "mStock response received."}
          </div>

          {session.jwtToken ? (
            <div className="input-group" style={{ marginTop: "14px" }}>
              <label className="label" htmlFor="mstock-jwt-result">
                JWT token
              </label>
              <textarea
                className="input mono"
                id="mstock-jwt-result"
                readOnly
                rows={4}
                value={session.jwtToken}
                style={{ minHeight: "96px" }}
              />
              <div className="cta-row">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => handleCopy("jwt", session.jwtToken || "")}
                >
                  {copiedField === "jwt" ? "Copied" : "Copy JWT"}
                </button>
              </div>
            </div>
          ) : null}

          {session.refreshToken ? (
            <div className="input-group" style={{ marginTop: "14px" }}>
              <label className="label" htmlFor="mstock-refresh-result">
                Refresh token
              </label>
              <textarea
                className="input mono"
                id="mstock-refresh-result"
                readOnly
                rows={3}
                value={session.refreshToken}
                style={{ minHeight: "82px" }}
              />
              <div className="cta-row">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => handleCopy("refresh", session.refreshToken || "")}
                >
                  {copiedField === "refresh" ? "Copied" : "Copy refresh token"}
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: "8px", marginTop: "14px" }}>
            {session.clientCode ? (
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>Client code</strong>
                <span>{session.clientCode}</span>
              </div>
            ) : null}
            {session.state ? (
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>State</strong>
                <span>{session.state}</span>
              </div>
            ) : null}
            {session.requestTime ? (
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>Request time</strong>
                <span>{session.requestTime}</span>
              </div>
            ) : null}
            {session.feedToken ? (
              <div className="list-item" style={{ justifyContent: "space-between", gap: "12px" }}>
                <strong>Feed token</strong>
                <span className="mono" style={{ overflowWrap: "anywhere" }}>
                  {session.feedToken}
                </span>
              </div>
            ) : null}
          </div>

          <details style={{ marginTop: "14px" }}>
            <summary className="helper" style={{ cursor: "pointer" }}>
              Technical details
            </summary>
            <pre className="mono" style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
              {raw}
            </pre>
          </details>
        </>
      ) : null}
    </div>
  );
}
