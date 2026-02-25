"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Strategy = {
  _id: string;
  name: string;
  webhookUrl: string;
  webhookKey?: string;
  webhookPath?: string;
  marketMayaUrl?: string;
  marketMaya?: {
    symbolMode?: string;
    symbolKey?: string;
    maxSymbols?: number | string;
    callTypeFallback?: string;
    orderType?: string;
    limitPrice?: string;
    qtyDistribution?: string;
    qtyValue?: string;
    targetBy?: string;
    target?: string;
    slBy?: string;
    sl?: string;
    trailSl?: boolean;
    slMove?: string;
    profitMove?: string;
  };
  enabled: boolean;
  telegramEnabled?: boolean;
  telegramChatId?: string;
  createdAt: string;
};

type TelegramToken = {
  token: string;
  expiresAt?: string;
  usedAt?: string | null;
  usedChatId?: string | null;
  createdAt?: string;
};

const TELEGRAM_BOT_URL = "https://t.me/Alert_vibhav_bot";

export default function StrategyPage() {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [marketMayaToken, setMarketMayaToken] = useState("");
  const [symbolMode, setSymbolMode] = useState("stocksFirst");
  const [symbolKey, setSymbolKey] = useState("symbol");
  const [maxSymbols, setMaxSymbols] = useState("");
  const [callTypeFallback, setCallTypeFallback] = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [targetBy, setTargetBy] = useState("");
  const [target, setTarget] = useState("");
  const [slBy, setSlBy] = useState("");
  const [sl, setSl] = useState("");
  const [trailSl, setTrailSl] = useState(false);
  const [slMove, setSlMove] = useState("");
  const [profitMove, setProfitMove] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<TelegramToken | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [editName, setEditName] = useState("");
  const [editEnabled, setEditEnabled] = useState(false);
  const [editMarketMayaToken, setEditMarketMayaToken] = useState("");
  const [editSymbolMode, setEditSymbolMode] = useState("stocksFirst");
  const [editSymbolKey, setEditSymbolKey] = useState("symbol");
  const [editMaxSymbols, setEditMaxSymbols] = useState("");
  const [editCallTypeFallback, setEditCallTypeFallback] = useState("BUY");
  const [editOrderType, setEditOrderType] = useState("MARKET");
  const [editLimitPrice, setEditLimitPrice] = useState("");
  const [editTargetBy, setEditTargetBy] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editSlBy, setEditSlBy] = useState("");
  const [editSl, setEditSl] = useState("");
  const [editTrailSl, setEditTrailSl] = useState(false);
  const [editSlMove, setEditSlMove] = useState("");
  const [editProfitMove, setEditProfitMove] = useState("");
  const [editTelegramEnabled, setEditTelegramEnabled] = useState(false);

  const webhookBase = useMemo(() => {
    const base =
      process.env.NEXT_PUBLIC_WEBHOOK_URL || API_BASE_URL;
    return `${base}/api/v1/webhooks/chartink`;
  }, []);

  const normalizeId = (value: unknown) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
      const anyValue = value as { $oid?: string; toString?: () => string };
      if (typeof anyValue.$oid === "string") return anyValue.$oid;
      if (typeof anyValue.toString === "function") return anyValue.toString();
    }
    return String(value);
  };

  const flashMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashMessage("Copied.");
    } catch {
      flashMessage("Copy failed. Please copy manually.");
    }
  };

  const resolveWebhookUrl = (item: Strategy) => {
    if (item.webhookPath) {
      return `${webhookBase}${item.webhookPath.replace("/api/v1/webhooks/chartink", "")}`;
    }
    if (item.webhookKey) {
      return `${webhookBase}?key=${item.webhookKey}`;
    }
    return webhookBase;
  };

  const loadStrategies = async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/strategies", token);
      const list = (data as { strategies?: Strategy[] }).strategies || [];
      const normalized = list.map((item) => ({
        ...item,
        _id: normalizeId(item._id),
      }));
      setStrategies(normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
    }
  };

  const loadTokens = async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/telegram/token", token);
      const list = (data as { tokens?: TelegramToken[] }).tokens || [];
      if (list[0]) {
        setTelegramToken(list[0]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load tokens";
      setError(msg);
    }
  };

  useEffect(() => {
    loadStrategies();
    loadTokens();
  }, []);

  const handleCopy = async () => {
    await copyToClipboard(webhookBase);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const token = getToken();
      const marketMaya: Record<string, unknown> = {
        symbolMode,
        ...(symbolMode === "payloadSymbol" && symbolKey.trim()
          ? { symbolKey: symbolKey.trim() }
          : {}),
        ...(symbolMode !== "stocksFirst" && maxSymbols.trim()
          ? { maxSymbols: maxSymbols.trim() }
          : {}),
        callTypeFallback,
        orderType,
        ...(limitPrice.trim() ? { limitPrice: limitPrice.trim() } : {}),
        ...(targetBy.trim() ? { targetBy: targetBy.trim() } : {}),
        ...(target.trim() ? { target: target.trim() } : {}),
        ...(slBy.trim() ? { slBy: slBy.trim() } : {}),
        ...(sl.trim() ? { sl: sl.trim() } : {}),
        ...(trailSl ? { trailSl: true } : {}),
        ...(slMove.trim() ? { slMove: slMove.trim() } : {}),
        ...(profitMove.trim() ? { profitMove: profitMove.trim() } : {}),
      };
      const payload: Record<string, unknown> = {
        name,
        webhookUrl: webhookBase,
        enabled,
        telegramEnabled,
        marketMaya,
      };
      if (marketMayaToken.trim()) {
        payload.marketMayaToken = marketMayaToken;
      }
      await apiPost(
        "/api/v1/strategies",
        payload,
        token
      );
      setName("");
      setMarketMayaToken("");
      setSymbolMode("stocksFirst");
      setSymbolKey("symbol");
      setMaxSymbols("");
      setCallTypeFallback("BUY");
      setOrderType("MARKET");
      setLimitPrice("");
      setTargetBy("");
      setTarget("");
      setSlBy("");
      setSl("");
      setTrailSl(false);
      setSlMove("");
      setProfitMove("");
      setEnabled(false);
      setTelegramEnabled(false);
      setMessage("Strategy saved.");
      setShowModal(false);
      await loadStrategies();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item: Strategy) => {
    setError(null);
    setMessage(null);
    setEditing(item);
    setEditName(item.name || "");
    setEditEnabled(Boolean(item.enabled));
    setEditMarketMayaToken("");
    const mm = item.marketMaya || {};
    setEditSymbolMode(mm.symbolMode || "stocksFirst");
    setEditSymbolKey(mm.symbolKey || "symbol");
    setEditMaxSymbols(mm.maxSymbols ? String(mm.maxSymbols) : "");
    setEditCallTypeFallback(mm.callTypeFallback || "BUY");
    setEditOrderType(mm.orderType || "MARKET");
    setEditLimitPrice(mm.limitPrice || "");
    setEditTargetBy(mm.targetBy || "");
    setEditTarget(mm.target || "");
    setEditSlBy(mm.slBy || "");
    setEditSl(mm.sl || "");
    setEditTrailSl(Boolean(mm.trailSl));
    setEditSlMove(mm.slMove || "");
    setEditProfitMove(mm.profitMove || "");
    setEditTelegramEnabled(Boolean(item.telegramEnabled));
  };

  const closeEdit = () => {
    setEditing(null);
    setEditName("");
    setEditEnabled(false);
    setEditMarketMayaToken("");
    setEditSymbolMode("stocksFirst");
    setEditSymbolKey("symbol");
    setEditMaxSymbols("");
    setEditCallTypeFallback("BUY");
    setEditOrderType("MARKET");
    setEditLimitPrice("");
    setEditTargetBy("");
    setEditTarget("");
    setEditSlBy("");
    setEditSl("");
    setEditTrailSl(false);
    setEditSlMove("");
    setEditProfitMove("");
    setEditTelegramEnabled(false);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    setError(null);
    setMessage(null);
    setEditLoading(true);

    try {
      const token = getToken();
      const marketMaya: Record<string, unknown> = {
        symbolMode: editSymbolMode,
        ...(editSymbolMode === "payloadSymbol" && editSymbolKey.trim()
          ? { symbolKey: editSymbolKey.trim() }
          : {}),
        ...(editSymbolMode !== "stocksFirst" && editMaxSymbols.trim()
          ? { maxSymbols: editMaxSymbols.trim() }
          : {}),
        callTypeFallback: editCallTypeFallback,
        orderType: editOrderType,
        ...(editLimitPrice.trim() ? { limitPrice: editLimitPrice.trim() } : {}),
        ...(editTargetBy.trim() ? { targetBy: editTargetBy.trim() } : {}),
        ...(editTarget.trim() ? { target: editTarget.trim() } : {}),
        ...(editSlBy.trim() ? { slBy: editSlBy.trim() } : {}),
        ...(editSl.trim() ? { sl: editSl.trim() } : {}),
        ...(editTrailSl ? { trailSl: true } : {}),
        ...(editSlMove.trim() ? { slMove: editSlMove.trim() } : {}),
        ...(editProfitMove.trim() ? { profitMove: editProfitMove.trim() } : {}),
      };
      const payload: Record<string, unknown> = {
        strategyId: editing._id,
        name: editName,
        enabled: editEnabled,
        telegramEnabled: editTelegramEnabled,
        marketMaya,
      };
      if (editMarketMayaToken.trim()) {
        payload.marketMayaToken = editMarketMayaToken;
      }
      const data = await apiPost(
        "/api/v1/strategies/update",
        payload,
        token
      );

      const updated = (data as { strategy?: Strategy }).strategy;
      if (updated?._id) {
        setStrategies((prev) =>
          prev.map((item) => (item._id === updated._id ? { ...item, ...updated } : item))
        );
      }

      setMessage("Strategy updated.");
      closeEdit();
      if (!updated?._id) {
        await loadStrategies();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (item: Strategy) => {
    setError(null);
    setMessage(null);

    const confirmed = window.confirm(
      `Delete "${item.name}"? This will also remove its saved alerts.`
    );
    if (!confirmed) return;

    const strategyId = normalizeId(item._id);
    if (!strategyId) {
      setError("Strategy id missing");
      return;
    }

    setDeleteLoadingId(strategyId);
    try {
      const token = getToken();
      await apiPost(
        "/api/v1/strategies/delete",
        { strategyId },
        token
      );
      setStrategies((prev) => prev.filter((s) => s._id !== strategyId));
      setMessage("Strategy deleted.");

      try {
        await loadStrategies();
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleGenerateToken = async () => {
    setError(null);
    setMessage(null);
    try {
      const token = getToken();
      const data = await apiPost("/api/v1/telegram/token", {}, token);
      const created = data as { token?: string; expiresAt?: string };
      if (created.token) {
        setTelegramToken({
          token: created.token,
          expiresAt: created.expiresAt,
        });
        await loadTokens();
        setMessage("Telegram token generated.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Token generation failed";
      setError(msg);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Strategy</div>
          <div className="helper">
            Add your strategy name, copy the webhook, and enable Market Maya
            when required.
          </div>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setShowModal(true)}
        >
          Add strategy
        </button>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="card">
        <div className="page-title">Telegram access</div>
        <div className="helper">
          Generate a one-time token and send it to the bot to start alerts.
        </div>
        <div className="list" style={{ marginTop: "14px" }}>
          <div className="list-item">
            <span>Latest token</span>
            <code className="mono">{telegramToken?.token || "Not generated"}</code>
          </div>
          <div className="list-item">
            <span>Expires</span>
            <span>
              {telegramToken?.expiresAt
                ? new Date(telegramToken.expiresAt).toLocaleString()
                : "-"}
            </span>
          </div>
          <div className="list-item">
            <span>Command</span>
            <code className="mono">
              {telegramToken?.token ? `/startAlert ${telegramToken.token}` : "-"}
            </code>
          </div>
        </div>
        <div className="cta-row" style={{ marginTop: "16px" }}>
          <button className="btn btn-secondary" type="button" onClick={handleGenerateToken}>
            Generate new token
          </button>
          <a
            className="btn btn-ghost"
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open Telegram Bot
          </a>
        </div>
        <div className="helper" style={{ marginTop: "10px" }}>
          Send `/startAlert &lt;token&gt;` to the bot. Use `/stopAlert` to stop.
        </div>
      </div>

      <div className="card">
        <div className="page-title">Saved strategies</div>
        {strategies.length === 0 ? (
          <div className="helper">No strategies saved yet.</div>
        ) : (
          <div className="list">
            {strategies.map((item) => (
              <div className="list-item strategy-item" key={item._id}>
                <div className="strategy-meta">
                  <div className="strategy-title-row">
                    <strong>{item.name}</strong>
                    <span className="badge">
                      {item.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="helper">
                    {item.enabled ? "Market Maya enabled" : "Market Maya off"}
                  </div>
                  <div className="helper">
                    {item.telegramEnabled ? "Telegram alerts on" : "Telegram alerts off"}
                  </div>
                </div>
                <div className="strategy-actions">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      copyToClipboard(resolveWebhookUrl(item));
                    }}
                  >
                    Copy Webhook
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => openEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={deleteLoadingId === item._id}
                    onClick={() => handleDelete(item)}
                  >
                    {deleteLoadingId === item._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal ? (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="page-title">Add strategy</div>
            <form className="form" onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
              <div className="input-group">
                <label className="label" htmlFor="strategy-name">
                  Strategy name
                </label>
                <input
                  className="input"
                  id="strategy-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Banknifty Breakout"
                  required
                />
              </div>

              <div className="input-group">
                <label className="label">Webhook URL</label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <code className="mono">{webhookBase}</code>
                  <button className="btn btn-ghost" type="button" onClick={handleCopy}>
                    Copy
                  </button>
                </div>
                <div className="helper">
                  Webhook key will be generated after saving the strategy.
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="market-enable">
                  Enable Market Maya
                </label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to Market Maya</span>
                  <input
                    id="market-enable"
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="market-token">
                  Market Maya Token
                </label>
                <input
                  className="input"
                  id="market-token"
                  type="password"
                  value={marketMayaToken}
                  onChange={(event) => setMarketMayaToken(event.target.value)}
                  placeholder="Paste token here"
                  disabled={!enabled}
                />
                <div className="helper">Required for live trades. Leave blank to use server default.</div>
              </div>

              <div className="page-title" style={{ marginTop: "10px" }}>
                Symbol handling
              </div>
              <div className="helper">
                Control how symbols are picked from webhook payloads.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="symbol-mode">
                    Symbol source
                  </label>
                  <select
                    className="select"
                    id="symbol-mode"
                    value={symbolMode}
                    onChange={(event) => setSymbolMode(event.target.value)}
                  >
                    <option value="stocksFirst">Stocks: first only</option>
                    <option value="stocksAll">Stocks: all (comma-separated)</option>
                    <option value="payloadSymbol">Symbol field (comma-separated)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="max-symbols">
                    Max symbols
                  </label>
                  <input
                    className="input"
                    id="max-symbols"
                    type="number"
                    min="1"
                    max="25"
                    value={maxSymbols}
                    onChange={(event) => setMaxSymbols(event.target.value)}
                    placeholder="5"
                    disabled={symbolMode === "stocksFirst"}
                  />
                  <div className="helper">Up to 25. Leave blank for default 5.</div>
                </div>
              </div>

              {symbolMode === "payloadSymbol" ? (
                <div className="input-group">
                  <label className="label" htmlFor="symbol-key">
                    Symbol key
                  </label>
                  <input
                    className="input"
                    id="symbol-key"
                    value={symbolKey}
                    onChange={(event) => setSymbolKey(event.target.value)}
                    placeholder="symbol"
                  />
                  <div className="helper">Webhook field name to read symbols from.</div>
                </div>
              ) : null}

              <div className="page-title" style={{ marginTop: "10px" }}>
                Trade defaults
              </div>
              <div className="helper">
                Used when webhook payload does not provide values.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="market-calltype">
                    Trade side
                  </label>
                  <select
                    className="select"
                    id="market-calltype"
                    value={callTypeFallback}
                    onChange={(event) => setCallTypeFallback(event.target.value)}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="market-ordertype">
                    Order type
                  </label>
                  <select
                    className="select"
                    id="market-ordertype"
                    value={orderType}
                    onChange={(event) => setOrderType(event.target.value)}
                  >
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="market-limit-price">
                  Limit price
                </label>
                <input
                  className="input"
                  id="market-limit-price"
                  value={limitPrice}
                  onChange={(event) => setLimitPrice(event.target.value)}
                  placeholder="e.g. 123.45"
                  disabled={orderType !== "LIMIT"}
                />
                <div className="helper">Only used for LIMIT orders.</div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="market-target-by">
                    Target by
                  </label>
                  <input
                    className="input"
                    id="market-target-by"
                    value={targetBy}
                    onChange={(event) => setTargetBy(event.target.value)}
                    placeholder="Money / Point / Percentage / Price"
                  />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="market-target">
                    Target
                  </label>
                  <input
                    className="input"
                    id="market-target"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="market-sl-by">
                    Stop loss by
                  </label>
                  <input
                    className="input"
                    id="market-sl-by"
                    value={slBy}
                    onChange={(event) => setSlBy(event.target.value)}
                    placeholder="Money / Point / Percentage / Price"
                  />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="market-sl">
                    Stop loss
                  </label>
                  <input
                    className="input"
                    id="market-sl"
                    value={sl}
                    onChange={(event) => setSl(event.target.value)}
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="market-trail-sl">
                  Trail SL
                </label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Enable trailing stop loss</span>
                  <input
                    id="market-trail-sl"
                    type="checkbox"
                    checked={trailSl}
                    onChange={(event) => setTrailSl(event.target.checked)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="market-sl-move">
                    SL move
                  </label>
                  <input
                    className="input"
                    id="market-sl-move"
                    value={slMove}
                    onChange={(event) => setSlMove(event.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="market-profit-move">
                    Profit move
                  </label>
                  <input
                    className="input"
                    id="market-profit-move"
                    value={profitMove}
                    onChange={(event) => setProfitMove(event.target.value)}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="telegram-enable">
                  Telegram alerts
                </label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to Telegram</span>
                  <input
                    id="telegram-enable"
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(event) => setTelegramEnabled(event.target.checked)}
                  />
                </div>
                <div className="helper">
                  Telegram is linked via bot token subscription (no chat ID needed).
                </div>
              </div>

              <div className="cta-row" style={{ marginTop: "8px" }}>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save strategy"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="page-title">Edit strategy</div>
            <form className="form" onSubmit={handleUpdate} style={{ marginTop: "16px" }}>
              <div className="input-group">
                <label className="label" htmlFor="edit-strategy-name">
                  Strategy name
                </label>
                <input
                  className="input"
                  id="edit-strategy-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="e.g. Banknifty Breakout"
                  required
                />
              </div>

              <div className="input-group">
                <label className="label">Webhook URL</label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <code className="mono">{resolveWebhookUrl(editing)}</code>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => copyToClipboard(resolveWebhookUrl(editing))}
                  >
                    Copy
                  </button>
                </div>
                <div className="helper">Webhook key stays the same.</div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="edit-market-enable">
                  Enable Market Maya
                </label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to Market Maya</span>
                  <input
                    id="edit-market-enable"
                    type="checkbox"
                    checked={editEnabled}
                    onChange={(event) => setEditEnabled(event.target.checked)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="edit-market-token">
                  Market Maya Token
                </label>
                <input
                  className="input"
                  id="edit-market-token"
                  type="password"
                  value={editMarketMayaToken}
                  onChange={(event) => setEditMarketMayaToken(event.target.value)}
                  placeholder="Paste new token to update"
                  disabled={!editEnabled}
                />
                <div className="helper">Optional. Leave blank to keep the existing token.</div>
              </div>

              <div className="page-title" style={{ marginTop: "10px" }}>
                Symbol handling
              </div>
              <div className="helper">
                Control how symbols are picked from webhook payloads.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-symbol-mode">
                    Symbol source
                  </label>
                  <select
                    className="select"
                    id="edit-symbol-mode"
                    value={editSymbolMode}
                    onChange={(event) => setEditSymbolMode(event.target.value)}
                  >
                    <option value="stocksFirst">Stocks: first only</option>
                    <option value="stocksAll">Stocks: all (comma-separated)</option>
                    <option value="payloadSymbol">Symbol field (comma-separated)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="edit-max-symbols">
                    Max symbols
                  </label>
                  <input
                    className="input"
                    id="edit-max-symbols"
                    type="number"
                    min="1"
                    max="25"
                    value={editMaxSymbols}
                    onChange={(event) => setEditMaxSymbols(event.target.value)}
                    placeholder="5"
                    disabled={editSymbolMode === "stocksFirst"}
                  />
                  <div className="helper">Up to 25. Leave blank for default 5.</div>
                </div>
              </div>

              {editSymbolMode === "payloadSymbol" ? (
                <div className="input-group">
                  <label className="label" htmlFor="edit-symbol-key">
                    Symbol key
                  </label>
                  <input
                    className="input"
                    id="edit-symbol-key"
                    value={editSymbolKey}
                    onChange={(event) => setEditSymbolKey(event.target.value)}
                    placeholder="symbol"
                  />
                  <div className="helper">Webhook field name to read symbols from.</div>
                </div>
              ) : null}

              <div className="page-title" style={{ marginTop: "10px" }}>
                Trade defaults
              </div>
              <div className="helper">
                Used when webhook payload does not provide values.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-calltype">
                    Trade side
                  </label>
                  <select
                    className="select"
                    id="edit-market-calltype"
                    value={editCallTypeFallback}
                    onChange={(event) => setEditCallTypeFallback(event.target.value)}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="label" htmlFor="edit-market-ordertype">
                    Order type
                  </label>
                  <select
                    className="select"
                    id="edit-market-ordertype"
                    value={editOrderType}
                    onChange={(event) => setEditOrderType(event.target.value)}
                  >
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="edit-market-limit-price">
                  Limit price
                </label>
                <input
                  className="input"
                  id="edit-market-limit-price"
                  value={editLimitPrice}
                  onChange={(event) => setEditLimitPrice(event.target.value)}
                  placeholder="e.g. 123.45"
                  disabled={editOrderType !== "LIMIT"}
                />
                <div className="helper">Only used for LIMIT orders.</div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-target-by">
                    Target by
                  </label>
                  <input
                    className="input"
                    id="edit-market-target-by"
                    value={editTargetBy}
                    onChange={(event) => setEditTargetBy(event.target.value)}
                    placeholder="Money / Point / Percentage / Price"
                  />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-target">
                    Target
                  </label>
                  <input
                    className="input"
                    id="edit-market-target"
                    value={editTarget}
                    onChange={(event) => setEditTarget(event.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-sl-by">
                    Stop loss by
                  </label>
                  <input
                    className="input"
                    id="edit-market-sl-by"
                    value={editSlBy}
                    onChange={(event) => setEditSlBy(event.target.value)}
                    placeholder="Money / Point / Percentage / Price"
                  />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-sl">
                    Stop loss
                  </label>
                  <input
                    className="input"
                    id="edit-market-sl"
                    value={editSl}
                    onChange={(event) => setEditSl(event.target.value)}
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="edit-market-trail-sl">
                  Trail SL
                </label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Enable trailing stop loss</span>
                  <input
                    id="edit-market-trail-sl"
                    type="checkbox"
                    checked={editTrailSl}
                    onChange={(event) => setEditTrailSl(event.target.checked)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-sl-move">
                    SL move
                  </label>
                  <input
                    className="input"
                    id="edit-market-sl-move"
                    value={editSlMove}
                    onChange={(event) => setEditSlMove(event.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-profit-move">
                    Profit move
                  </label>
                  <input
                    className="input"
                    id="edit-market-profit-move"
                    value={editProfitMove}
                    onChange={(event) => setEditProfitMove(event.target.value)}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="edit-telegram-enable">
                  Telegram alerts
                </label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Send alerts to Telegram</span>
                  <input
                    id="edit-telegram-enable"
                    type="checkbox"
                    checked={editTelegramEnabled}
                    onChange={(event) => setEditTelegramEnabled(event.target.checked)}
                  />
                </div>
              </div>

              <div className="cta-row" style={{ marginTop: "8px" }}>
                <button className="btn btn-primary" type="submit" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save changes"}
                </button>
                <button className="btn btn-ghost" type="button" onClick={closeEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
