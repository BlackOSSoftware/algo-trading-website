"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type DashboardTotals = {
  users: number;
  strategies: number;
  activeStrategies: number;
  alertsToday: number;
  pendingPlanRequests: number;
  telegramSubscribers: number;
};

type DashboardUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  planName?: string | null;
  createdAt?: string | null;
};

type DashboardPayload = {
  totals?: DashboardTotals;
  recentUsers?: DashboardUser[];
};

export default function AdminDashboardPage() {
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [recentUsers, setRecentUsers] = useState<DashboardUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAdminToken();
      const data = (await apiGet("/api/v1/admin/dashboard", token)) as DashboardPayload;
      setTotals(data.totals || null);
      setRecentUsers(data.recentUsers || []);
      setLastUpdated(new Date().toLocaleString());
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

  const statValue = (value?: number) => {
    if (loading) return "-";
    if (value === undefined || value === null) return "-";
    return value;
  };

  const recentUserRows = useMemo(() => recentUsers.slice(0, 5), [recentUsers]);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Admin Dashboard</div>
          <div className="helper">Operational metrics and live activity</div>
        </div>
        <Link className="btn btn-primary" href="/admin/telegram">
          Create Broadcast
        </Link>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="stat-grid">
        <div className="stat-card">
          <h4>Total Users</h4>
          <p>{statValue(totals?.users)}</p>
        </div>
        <div className="stat-card">
          <h4>Active Strategies</h4>
          <p>{statValue(totals?.activeStrategies)}</p>
        </div>
        <div className="stat-card">
          <h4>Alerts Today</h4>
          <p>{statValue(totals?.alertsToday)}</p>
        </div>
        <div className="stat-card">
          <h4>Pending Requests</h4>
          <p>{statValue(totals?.pendingPlanRequests)}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="page-title">Recent Users</div>
          {recentUserRows.length === 0 ? (
            <div className="helper" style={{ marginTop: "12px" }}>
              {loading ? "Loading users..." : "No users yet."}
            </div>
          ) : (
            <div className="list" style={{ marginTop: "12px" }}>
              {recentUserRows.map((user, index) => {
                const createdLabel = user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "-";
                const roleLabel = user.role ? user.role.toUpperCase() : "USER";
                const planLabel = user.planName ? `Plan: ${user.planName}` : "Plan: -";

                return (
                  <div
                    className="list-item"
                    key={user.id || `${user.email || "user"}-${index}`}
                  >
                    <div>
                      <strong>{user.name || user.email || "User"}</strong>
                      <div className="helper">
                        {user.email || "-"} - {planLabel}
                      </div>
                    </div>
                    <div className="badge">{roleLabel} - {createdLabel}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="page-title">System Health</div>
          <div className="list" style={{ marginTop: "12px" }}>
            <div className="list-item">
              <span>Total Strategies</span>
              <span className="badge">{statValue(totals?.strategies)}</span>
            </div>
            <div className="list-item">
              <span>Telegram Subscribers</span>
              <span className="badge">{statValue(totals?.telegramSubscribers)}</span>
            </div>
            <div className="list-item">
              <span>Pending Plan Requests</span>
              <span className="badge">{statValue(totals?.pendingPlanRequests)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Admin Notes</div>
        <div className="helper">
          {lastUpdated ? `Snapshot refreshed on ${lastUpdated}.` : "Loading snapshot..."}
        </div>
      </div>
    </div>
  );
}
