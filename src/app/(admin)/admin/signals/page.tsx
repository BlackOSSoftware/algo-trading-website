"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
};

type Strategy = {
  _id: string;
  name: string;
  enabled?: boolean;
  telegramEnabled?: boolean;
  createdAt?: string;
};

type AlertEvent = {
  _id?: string;
  id?: string;
  receivedAt?: string;
  strategyName?: string;
  payload?: Record<string, unknown>;
};

export default function AdminSignalsPage() {
  const searchParams = useSearchParams();
  const initialUserId = useMemo(
    () => searchParams.get("userId"),
    [searchParams]
  );

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const token = getAdminToken();
      const data = await apiGet("/api/v1/admin/users", token);
      setUsers((data as { users?: AdminUser[] }).users || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      setError(msg);
    }
  };

  const loadStrategies = async (userId: string) => {
    try {
      const token = getAdminToken();
      const data = await apiGet(
        `/api/v1/admin/strategies?userId=${userId}`,
        token
      );
      setStrategies((data as { strategies?: Strategy[] }).strategies || []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load strategies";
      setError(msg);
    }
  };

  const loadAlerts = async (userId: string, strategyId: string) => {
    try {
      const token = getAdminToken();
      const data = await apiGet(
        `/api/v1/admin/alerts?userId=${userId}&strategyId=${strategyId}&limit=100`,
        token
      );
      setAlerts((data as { alerts?: AlertEvent[] }).alerts || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load alerts";
      setError(msg);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      const next = initialUserId || users[0]._id;
      setSelectedUserId(next);
    }
  }, [users, selectedUserId, initialUserId]);

  useEffect(() => {
    if (!selectedUserId) return;
    setSelectedStrategyId("");
    setAlerts([]);
    loadStrategies(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUserId || !selectedStrategyId) return;
    loadAlerts(selectedUserId, selectedStrategyId);
  }, [selectedUserId, selectedStrategyId]);

  const formatAlertName = (payload?: Record<string, unknown>) => {
    return (
      (payload?.alert_name as string) ||
      (payload?.alertName as string) ||
      "Alert"
    );
  };

  const formatScanName = (payload?: Record<string, unknown>) => {
    return (
      (payload?.scan_name as string) ||
      (payload?.scanName as string) ||
      "Chartink"
    );
  };

  const formatStocks = (payload?: Record<string, unknown>) => {
    const stocks = payload?.stocks as string | undefined;
    if (!stocks) return "-";
    const count = stocks.split(",").filter(Boolean).length;
    return count ? `${count} stocks` : stocks;
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Signals</div>
          <div className="helper">
            Select a user, then choose a strategy to view all signals.
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="input-group">
          <label className="label">User</label>
          <select
            className="select"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="page-title">Strategies</div>
          {selectedUserId ? (
            strategies.length === 0 ? (
              <div className="helper">No strategies found.</div>
            ) : (
              <div className="list" style={{ marginTop: "12px" }}>
                {strategies.map((strategy) => (
                  <button
                    key={strategy._id}
                    type="button"
                    className={`list-item${
                      selectedStrategyId === strategy._id ? " active" : ""
                    }`}
                    onClick={() => setSelectedStrategyId(strategy._id)}
                    style={{ textAlign: "left" }}
                  >
                    <div>
                      <strong>{strategy.name}</strong>
                      <div className="helper">
                        {strategy.enabled ? "Market Maya on" : "Market Maya off"}
                      </div>
                    </div>
                    <span className="badge">
                      {strategy.telegramEnabled ? "Telegram" : "No Telegram"}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="helper">Select a user to load strategies.</div>
          )}
        </div>

        <div className="card">
          <div className="page-title">Signals</div>
          {!selectedStrategyId ? (
            <div className="helper">Select a strategy to view signals.</div>
          ) : alerts.length === 0 ? (
            <div className="helper">No signals received yet.</div>
          ) : (
            <div className="list" style={{ marginTop: "12px" }}>
              {alerts.map((alert) => (
                <div className="list-item" key={alert.id || alert._id}>
                  <div>
                    <strong>{formatAlertName(alert.payload)}</strong>
                    <div className="helper">
                      {formatScanName(alert.payload)} ·{" "}
                      {alert.receivedAt
                        ? new Date(alert.receivedAt).toLocaleString()
                        : "-"}
                    </div>
                    <div className="helper">Stocks: {formatStocks(alert.payload)}</div>
                  </div>
                  <span className="badge">{alert.strategyName || "-"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
