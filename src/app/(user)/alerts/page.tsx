"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";

type AlertEvent = {
  _id?: string;
  receivedAt?: string;
  strategyName?: string;
  payload?: Record<string, unknown>;
};

function parseStocks(payload?: Record<string, unknown>) {
  const stocks = payload?.stocks;
  if (!stocks) return null;
  const count = String(stocks)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean).length;
  return count;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/alerts?limit=50", token);
      setAlerts((data as { alerts?: AlertEvent[] }).alerts || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load alerts";
      setError(msg);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Alerts</div>
          <div className="helper">Every webhook signal, organized</div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="table">
          <div className="table-row table-head">
            <span>Alert</span>
            <span>Scan</span>
            <span>Match</span>
            <span>Time</span>
          </div>
          {alerts.length === 0 ? (
            <div className="helper">No alerts received yet.</div>
          ) : (
            alerts.map((item, index) => {
              const payload = item.payload || {};
              const alertName =
                (payload.alert_name as string) ||
                (payload.alertName as string) ||
                item.strategyName ||
                "Chartink Alert";
              const scanName =
                (payload.scan_name as string) ||
                (payload.scanName as string) ||
                "-";
              const matchCount = parseStocks(payload);
              const matchText =
                matchCount !== null ? `${matchCount} stocks` : "Triggered";
              const time = item.receivedAt
                ? new Date(item.receivedAt).toLocaleTimeString()
                : "-";

              return (
                <div className="table-row" key={`${item._id || index}`}>
                  <span data-label="Alert">{alertName}</span>
                  <span data-label="Scan">{scanName}</span>
                  <span data-label="Match">{matchText}</span>
                  <span data-label="Time">{time}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
