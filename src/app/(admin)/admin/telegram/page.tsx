"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type Subscriber = {
  chatId: string;
  username?: string;
  firstName?: string;
  userId?: string;
  active?: boolean;
  updatedAt?: string;
};

type TokenRecord = {
  token: string;
  userId: string;
  createdAt?: string;
  expiresAt?: string;
  usedAt?: string | null;
  usedChatId?: string | null;
};

type TelegramStatus = {
  tokenConfigured: boolean;
  polling?: {
    enabled: boolean;
    active: boolean;
    lastPollAt: string | null;
    lastError: string | null;
  };
  webhook?: {
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
    error?: string;
  } | null;
  bot?: {
    username?: string;
    id?: number;
    first_name?: string;
    error?: string;
  } | null;
};

export default function AdminTelegramPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [chatId, setChatId] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const token = getAdminToken();
      const subs = await apiGet("/api/v1/admin/telegram/subscribers", token);
      const tkns = await apiGet("/api/v1/admin/telegram/tokens", token);
      const stat = await apiGet("/api/v1/admin/telegram/status", token);
      setSubscribers((subs as { subscribers?: Subscriber[] }).subscribers || []);
      setTokens((tkns as { tokens?: TokenRecord[] }).tokens || []);
      setStatus(stat as TelegramStatus);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeactivate = async (chatId: string) => {
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      await apiPost(
        "/api/v1/admin/telegram/subscribers/deactivate",
        { chatId },
        token
      );
      setMessage("Subscriber deactivated.");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to deactivate";
      setError(msg);
    }
  };

  const handleSend = async () => {
    setError(null);
    setMessage(null);
    try {
      const token = getAdminToken();
      const payload = {
        message: text,
        chatId: broadcast ? undefined : chatId,
        broadcast,
      };
      await apiPost("/api/v1/admin/telegram/send", payload, token);
      setMessage(broadcast ? "Broadcast sent." : "Message sent.");
      setText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send";
      setError(msg);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Telegram</div>
          <div className="helper">Manage subscribers and tokens</div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="card">
        <div className="page-title">Connection status</div>
        <div className="list" style={{ marginTop: "12px" }}>
          <div className="list-item">
            <span>Token configured</span>
            <span className="badge">
              {status?.tokenConfigured ? "Yes" : "No"}
            </span>
          </div>
          <div className="list-item">
            <span>Bot</span>
            <span>
              {status?.bot?.error
                ? status.bot.error
                : status?.bot?.username
                ? `@${status.bot.username}`
                : "-"}
            </span>
          </div>
          <div className="list-item">
            <span>Polling</span>
            <span className="badge">
              {status?.polling?.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="list-item">
            <span>Last poll</span>
            <span>
              {status?.polling?.lastPollAt
                ? new Date(status.polling.lastPollAt).toLocaleString()
                : "-"}
            </span>
          </div>
          <div className="list-item">
            <span>Polling error</span>
            <span>{status?.polling?.lastError || "-"}</span>
          </div>
          <div className="list-item">
            <span>Webhook URL</span>
            <span>{status?.webhook?.url || "-"}</span>
          </div>
          <div className="list-item">
            <span>Webhook pending</span>
            <span>{status?.webhook?.pending_update_count ?? "-"}</span>
          </div>
          <div className="list-item">
            <span>Webhook error</span>
            <span>{status?.webhook?.last_error_message || status?.webhook?.error || "-"}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Send message</div>
        <div className="form" style={{ marginTop: "16px" }}>
          <div className="input-group">
            <label className="label">Message</label>
            <textarea
              className="textarea"
              rows={4}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type a broadcast or direct message..."
            />
          </div>
          <div className="input-group">
            <label className="label">Chat ID (optional)</label>
            <input
              className="input"
              value={chatId}
              onChange={(event) => setChatId(event.target.value)}
              placeholder="Leave blank for broadcast"
              disabled={broadcast}
            />
          </div>
          <div className="list-item" style={{ justifyContent: "space-between" }}>
            <span>Broadcast to all active subscribers</span>
            <input
              type="checkbox"
              checked={broadcast}
              onChange={(event) => setBroadcast(event.target.checked)}
            />
          </div>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSend}
            disabled={!text || (!broadcast && !chatId)}
          >
            Send message
          </button>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Active subscribers</div>
        <div className="table">
          <div className="table-row table-head">
            <span>Chat ID</span>
            <span>User</span>
            <span>Username</span>
            <span>Action</span>
          </div>
          {subscribers.length === 0 ? (
            <div className="helper">No active subscribers.</div>
          ) : (
            subscribers.map((sub) => (
              <div className="table-row" key={sub.chatId}>
                <span data-label="Chat ID">{sub.chatId}</span>
                <span data-label="User">{sub.userId || "-"}</span>
                <span data-label="Username">{sub.username || sub.firstName || "-"}</span>
                <div className="table-cell" data-label="Action">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => handleDeactivate(sub.chatId)}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="page-title">Recent tokens</div>
        <div className="table">
          <div className="table-row table-head">
            <span>Token</span>
            <span>User</span>
            <span>Expires</span>
            <span>Status</span>
          </div>
          {tokens.length === 0 ? (
            <div className="helper">No tokens issued.</div>
          ) : (
            tokens.map((tok) => (
              <div className="table-row" key={tok.token}>
                <span data-label="Token">{tok.token}</span>
                <span data-label="User">{tok.userId}</span>
                <span data-label="Expires">
                  {tok.expiresAt ? new Date(tok.expiresAt).toLocaleDateString() : "-"}
                </span>
                <span data-label="Status">{tok.usedAt ? "Used" : "Unused"}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
