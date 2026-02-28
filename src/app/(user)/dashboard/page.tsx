"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Strategy = {
  _id?: string;
  enabled?: boolean;
};

type TradeInfo = {
  symbol?: string;
  symbolCode?: string;
  ok?: boolean;
  dryRun?: boolean;
  params?: Record<string, unknown> | null;
  request?: { params?: Record<string, unknown> | null } | null;
};

type AlertEvent = {
  _id?: string;
  receivedAt?: string;
  debug?: {
    marketMaya?: {
      trades?: TradeInfo[];
    };
  };
};

type UserProfile = {
  planExpiresAt?: string | null;
};

type RecentTrade = {
  id: string;
  receivedAt?: string;
  trade: TradeInfo;
};

function pickTradeParams(trade?: TradeInfo) {
  if (!trade) return {};
  const params =
    (trade.params as Record<string, unknown> | null) ||
    (trade.request?.params as Record<string, unknown> | null) ||
    {};
  return params;
}

function formatTradeStatus(trade?: TradeInfo) {
  if (!trade) return { text: "Unknown", tone: "warn" as const };
  if (trade.dryRun) return { text: "Dry-run", tone: "warn" as const };
  if (trade.ok) return { text: "Executed", tone: "ok" as const };
  return { text: "Failed", tone: "error" as const };
}

export default function UserDashboardPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const [strategiesResult, alertsResult, profileResult] = await Promise.allSettled([
        apiGet("/api/v1/strategies", token),
        apiGet("/api/v1/alerts?limit=200", token),
        apiGet("/api/v1/auth/me", token),
      ]);

      if (strategiesResult.status === "fulfilled") {
        setStrategies(
          (strategiesResult.value as { strategies?: Strategy[] }).strategies || []
        );
      }

      if (alertsResult.status === "fulfilled") {
        setAlerts((alertsResult.value as { alerts?: AlertEvent[] }).alerts || []);
      }

      if (profileResult.status === "fulfilled") {
        setProfile((profileResult.value as { user?: UserProfile }).user || null);
      }

      if (
        strategiesResult.status === "rejected" ||
        alertsResult.status === "rejected" ||
        profileResult.status === "rejected"
      ) {
        setError("Failed to load some dashboard data.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeStrategies = useMemo(
    () => strategies.filter((item) => item.enabled).length,
    [strategies]
  );

  const signalsToday = useMemo(() => {
    const today = new Date().toDateString();
    return alerts.filter((alert) => {
      if (!alert.receivedAt) return false;
      return new Date(alert.receivedAt).toDateString() === today;
    }).length;
  }, [alerts]);

  const planDaysLeft = useMemo(() => {
    if (!profile?.planExpiresAt) return null;
    const msLeft = new Date(profile.planExpiresAt).getTime() - Date.now();
    if (Number.isNaN(msLeft)) return null;
    return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }, [profile]);

  const recentTrades = useMemo(() => {
    const flattened: RecentTrade[] = [];
    alerts.forEach((alert, alertIndex) => {
      const trades = alert.debug?.marketMaya?.trades || [];
      trades.forEach((trade, tradeIndex) => {
        flattened.push({
          id: `${alertIndex}-${tradeIndex}`,
          receivedAt: alert.receivedAt,
          trade,
        });
      });
    });

    return flattened
      .sort((a, b) => {
        const aTime = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
        const bTime = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [alerts]);

  const planValue = planDaysLeft === null ? "-" : planDaysLeft === 0 ? "Expired" : `${planDaysLeft} days`;
  const planSub =
    planDaysLeft === null ? "Plan not set" : planDaysLeft === 0 ? "Renew required" : "Plan renewal";

  return (
    <div className="content">
      <div className="dashboard-header card">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="helper">
            Your trading control room with live signals and strategy health.
          </div>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-secondary" href="/alerts">
            View alerts
          </Link>
          <Link className="btn btn-primary" href="/strategy">
            Create strategy
          </Link>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="dash-stats">
        <div className="dash-stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v10h14V10" />
            </svg>
          </div>
          <div>
            <div className="stat-title">Active strategies</div>
            <div className="stat-value">{loading ? "-" : activeStrategies}</div>
            <div className="stat-sub">Running now</div>
          </div>
        </div>

        <div className="dash-stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M4 19h16" />
              <path d="M6 15l4-4 3 3 5-6" />
            </svg>
          </div>
          <div>
            <div className="stat-title">Signals today</div>
            <div className="stat-value">{loading ? "-" : signalsToday}</div>
            <div className="stat-sub">Chartink + Webhooks</div>
          </div>
        </div>

        <div className="dash-stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M7 9h10" />
            </svg>
          </div>
          <div>
            <div className="stat-title">Expiry pending</div>
            <div className="stat-value">{loading ? "-" : planValue}</div>
            <div className="stat-sub">{planSub}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="section-title">Recent trades</div>
          <div className="helper">Last 5 executions across strategies.</div>
          <div className="trade-list">
            {recentTrades.length === 0 ? (
              <div className="helper" style={{ marginTop: "16px" }}>
                {loading ? "Loading trades..." : "No trades captured yet."}
              </div>
            ) : (
              recentTrades.map((item) => {
                const params = pickTradeParams(item.trade);
                const status = formatTradeStatus(item.trade);
                const symbol =
                  item.trade.symbol ||
                  item.trade.symbolCode ||
                  (params.symbol as string) ||
                  (params.symbol_code as string) ||
                  "N/A";
                const callType = (params.call_type as string | undefined) || "TRADE";
                const qtyDistribution = params.qty_distribution as string | undefined;
                const qtyValue = params.qty_value as string | undefined;
                const qty =
                  (params.qty as string | undefined) ||
                  (params.quantity as string | undefined) ||
                  (params.qty_total as string | undefined);
                const qtyText =
                  qtyDistribution || qtyValue
                    ? `${qtyDistribution || "-"} / ${qtyValue || "-"}`
                    : qty || "-";
                const timeText = item.receivedAt
                  ? new Date(item.receivedAt).toLocaleTimeString()
                  : "--:--";

                return (
                  <div className="trade-row" key={item.id}>
                    <div>
                      <div className="trade-title">{symbol} - {callType}</div>
                      <div className="helper">{qtyText} - {timeText}</div>
                    </div>
                    <div className="trade-meta">
                      <span className={`status-chip ${status.tone}`}>{status.text}</span>
                      <strong className="trade-pnl muted">{status.tone === "error" ? "Check logs" : "Live"}</strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Quick actions</div>
          <div className="helper">Fast access to your most-used workflows.</div>
          <div className="action-grid">
            <Link className="action-card" href="/strategy">
              <span className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </span>
              <span>
                <span className="action-title">Add strategy</span>
                <span className="action-sub">Create new webhook</span>
              </span>
            </Link>
            <Link className="action-card" href="/trade">
              <span className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M4 19h16" />
                  <path d="M6 15l4-4 3 3 5-6" />
                </svg>
              </span>
              <span>
                <span className="action-title">Manual trade</span>
                <span className="action-sub">Place custom order</span>
              </span>
            </Link>
            <Link className="action-card" href="/strategy">
              <span className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M3 11l18-7-7 18-3-7-8-4z" />
                </svg>
              </span>
              <span>
                <span className="action-title">Telegram bot</span>
                <span className="action-sub">Connect alerts</span>
              </span>
            </Link>
            <Link className="action-card" href="/alerts">
              <span className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M4 4h16v16H4z" />
                  <path d="M4 9h16" />
                  <path d="M9 4v16" />
                </svg>
              </span>
              <span>
                <span className="action-title">View alerts</span>
                <span className="action-sub">Open alert feed</span>
              </span>
            </Link>
            <Link className="action-card" href="/subscription">
              <span className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M7 9h10" />
                  <path d="M7 15h6" />
                </svg>
              </span>
              <span>
                <span className="action-title">Subscriptions</span>
                <span className="action-sub">Manage your plan</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
