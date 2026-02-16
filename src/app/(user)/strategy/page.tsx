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

export default function StrategyPage() {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [marketMayaUrl, setMarketMayaUrl] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<TelegramToken | null>(null);
  const [showModal, setShowModal] = useState(false);

  const webhookBase = useMemo(() => {
    const base =
      process.env.NEXT_PUBLIC_WEBHOOK_URL || API_BASE_URL;
    return `${base}/api/v1/webhooks/chartink`;
  }, []);

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
      setStrategies((data as { strategies?: Strategy[] }).strategies || []);
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
    try {
      await navigator.clipboard.writeText(webhookBase);
      setMessage("Webhook URL copied.");
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage("Copy failed. Please copy manually.");
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const token = getToken();
      await apiPost(
        "/api/v1/strategies",
        {
          name,
          webhookUrl: webhookBase,
          marketMayaUrl,
          enabled,
          telegramEnabled,
        },
        token
      );
      setName("");
      setMarketMayaUrl("");
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
                      navigator.clipboard
                        .writeText(resolveWebhookUrl(item))
                        .then(() => {
                          setMessage("Webhook URL copied.");
                          setTimeout(() => setMessage(null), 2000);
                        })
                        .catch(() => {
                          setMessage("Copy failed.");
                          setTimeout(() => setMessage(null), 2000);
                        });
                    }}
                  >
                    Copy Webhook
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
                <label className="label" htmlFor="market-url">
                  Market Maya URL
                </label>
                <input
                  className="input"
                  id="market-url"
                  value={marketMayaUrl}
                  onChange={(event) => setMarketMayaUrl(event.target.value)}
                  placeholder="https://marketmaya.in/your-webhook"
                  disabled={!enabled}
                />
                <div className="helper">Required only when enabled.</div>
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
    </div>
  );
}
