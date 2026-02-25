"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";

type AlertEvent = {
  _id?: string;
  id?: string;
  receivedAt?: string;
  processedAt?: string;
  strategyName?: string;
  payload?: Record<string, unknown>;
  debug?: {
    provider?: string;
    receivedAt?: string;
    telegram?: {
      enabled?: boolean;
      recipients?: number;
      alert?: {
        successCount?: number;
        failureCount?: number;
        skipped?: boolean;
      };
      summary?: {
        successCount?: number;
        failureCount?: number;
        skipped?: boolean;
      };
    };
    marketMaya?: {
      enabled?: boolean;
      execute?: boolean;
      ok?: boolean;
      skipped?: boolean;
      total?: number;
      successCount?: number;
      failureCount?: number;
      error?: string;
      reason?: string;
      trades?: Array<{
        symbol?: string;
        symbolCode?: string;
        ok?: boolean;
        dryRun?: boolean;
        error?: string | null;
        params?: Record<string, unknown> | null;
        request?: { params?: Record<string, unknown> | null } | null;
      }>;
    };
  };
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

type StatusTone = "ok" | "warn" | "error" | "off";
type StatusInfo = { text: string; tone: StatusTone; title?: string };
type TradeInfo = {
  symbol?: string;
  symbolCode?: string;
  ok?: boolean;
  dryRun?: boolean;
  error?: string | null;
  params?: Record<string, unknown> | null;
  request?: { params?: Record<string, unknown> | null } | null;
};

function formatTradeStatus(trade?: TradeInfo) {
  if (!trade) return { text: "Unknown", tone: "warn" as StatusTone };
  if (trade.dryRun) return { text: "Dry-run", tone: "warn" as StatusTone };
  if (trade.ok) return { text: "Executed", tone: "ok" as StatusTone };
  return { text: "Failed", tone: "error" as StatusTone };
}

function pickTradeParams(trade?: TradeInfo) {
  if (!trade) return {};
  const params =
    (trade.params as Record<string, unknown> | null) ||
    (trade.request?.params as Record<string, unknown> | null) ||
    {};
  return params;
}

function formatMarketMayaStatus(debug?: AlertEvent["debug"]): StatusInfo {
  const market = debug?.marketMaya;
  if (!market) {
    return { text: "Pending", tone: "warn" };
  }
  if (market.enabled === false) {
    return { text: "Off", tone: "off" };
  }
  if (market.skipped) {
    const text = market.execute === false ? "Dry-run" : "Skipped";
    return {
      text,
      tone: "warn",
      title: market.error || market.reason,
    };
  }
  const total = Number(market.total || 0);
  const success = Number(market.successCount || 0);
  const mode = market.execute === false ? "Dry-run" : "Live";
  const countText = total > 0 ? ` ${success}/${total}` : "";
  if (market.ok) {
    return { text: `OK${countText} ${mode}`, tone: "ok" };
  }
  return {
    text: `Failed${countText} ${mode}`,
    tone: "error",
    title: market.error,
  };
}

function formatTelegramStatus(debug?: AlertEvent["debug"]): StatusInfo {
  const telegram = debug?.telegram;
  if (!telegram) {
    return { text: "Pending", tone: "warn" };
  }
  if (telegram.enabled === false) {
    return { text: "Off", tone: "off" };
  }
  const recipients = Number(telegram.recipients || 0);
  if (!recipients) {
    return { text: "No recipients", tone: "warn" };
  }
  const alertStats = telegram.alert;
  const summaryStats = telegram.summary;
  const alertSuccess = Number(alertStats?.successCount || 0);
  const alertFailures = Number(alertStats?.failureCount || 0);
  const summarySuccess = Number(summaryStats?.successCount || 0);
  const summaryFailures = Number(summaryStats?.failureCount || 0);
  let text = `Alert ${alertSuccess}/${recipients}`;
  if (summaryStats && !summaryStats.skipped) {
    text += ` • Summary ${summarySuccess}/${recipients}`;
  }
  const hasFailure = alertFailures > 0 || summaryFailures > 0;
  return { text, tone: hasFailure ? "warn" : "ok" };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
          <div className="table-row table-head alerts-row">
            <span>Alert</span>
            <span>Scan</span>
            <span>Match</span>
            <span>Status</span>
            <span>Time</span>
          </div>
          {alerts.length === 0 ? (
            <div className="helper">No alerts received yet.</div>
          ) : (
            alerts.map((item, index) => {
              const rowId = String(item._id || item.id || index);
              const isOpen = Boolean(expanded[rowId]);
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
              const chartinkStatus: StatusInfo = { text: "Received", tone: "ok" };
              const marketMayaStatus = formatMarketMayaStatus(item.debug);
              const telegramStatus = formatTelegramStatus(item.debug);
              const trades = item.debug?.marketMaya?.trades || [];
              const tradeCount = trades.length;
              const tradeHeader =
                tradeCount > 0 ? `${tradeCount} trade${tradeCount > 1 ? "s" : ""}` : "No trade details";

              return (
                <div className="alert-group" key={rowId}>
                  <div className="table-row alerts-row">
                    <span data-label="Alert">{alertName}</span>
                    <span data-label="Scan">{scanName}</span>
                    <span data-label="Match">{matchText}</span>
                    <div className="table-cell status-stack" data-label="Status">
                      <div className="status-line">
                        <span className="status-label">Chartink</span>
                        <span className={`status-chip ${chartinkStatus.tone}`}>
                          {chartinkStatus.text}
                        </span>
                      </div>
                      <div className="status-line">
                        <span className="status-label">Market Maya</span>
                        <span
                          className={`status-chip ${marketMayaStatus.tone}`}
                          title={marketMayaStatus.title}
                        >
                          {marketMayaStatus.text}
                        </span>
                      </div>
                      <div className="status-line">
                        <span className="status-label">Telegram</span>
                        <span className={`status-chip ${telegramStatus.tone}`}>
                          {telegramStatus.text}
                        </span>
                      </div>
                      <button
                        className="btn btn-ghost btn-xs"
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [rowId]: !prev[rowId] }))
                        }
                      >
                        {isOpen ? "Hide details" : "View details"}
                      </button>
                    </div>
                    <span data-label="Time">{time}</span>
                  </div>
                  {isOpen ? (
                    <div className="table-row alert-details">
                      <div className="details-header">
                        <strong>Market Maya trades</strong>
                        <span className="helper">{tradeHeader}</span>
                      </div>
                      {tradeCount === 0 ? (
                        <div className="helper" style={{ marginTop: "8px" }}>
                          {item.debug?.marketMaya?.skipped
                            ? item.debug?.marketMaya?.error ||
                              item.debug?.marketMaya?.reason ||
                              "Trade skipped"
                            : "No trade details captured yet."}
                        </div>
                      ) : (
                        <div className="detail-grid" style={{ marginTop: "12px" }}>
                          {trades.map((trade, tradeIndex) => {
                            const params = pickTradeParams(trade);
                            const tradeStatus = formatTradeStatus(trade);
                            const symbol =
                              trade.symbol ||
                              trade.symbolCode ||
                              (params.symbol as string) ||
                              (params.symbol_code as string) ||
                              "N/A";
                            const callType = params.call_type as string | undefined;
                            const orderType = params.order_type as string | undefined;
                            const price = params.price as string | undefined;
                            const qtyDistribution = params.qty_distribution as string | undefined;
                            const qtyValue = params.qty_value as string | undefined;
                            const qty =
                              (params.qty as string | undefined) ||
                              (params.quantity as string | undefined) ||
                              (params.qty_total as string | undefined);
                            const targetBy = params.target_by as string | undefined;
                            const target = params.target as string | undefined;
                            const slBy = params.sl_by as string | undefined;
                            const sl = params.sl as string | undefined;
                            const trailSl = params.is_trail_sl ? "Yes" : "No";
                            const slMove = params.sl_move as string | undefined;
                            const profitMove = params.profit_move as string | undefined;
                            const exchange = params.exchange as string | undefined;
                            const segment = params.segment as string | undefined;
                            const expiryDate = params.expiry_date as string | undefined;
                            const contract = params.contract as string | undefined;
                            const expiry = params.expiry as string | undefined;
                            const optionType = params.option_type as string | undefined;
                            const strikePrice = params.strike_price as string | undefined;
                            const atm = params.atm as string | undefined;

                            return (
                              <div className="detail-card" key={`${rowId}-trade-${tradeIndex}`}>
                                <div className="detail-title-row">
                                  <div className="detail-title">{symbol}</div>
                                  <span className={`status-chip ${tradeStatus.tone}`}>
                                    {tradeStatus.text}
                                  </span>
                                </div>
                                {trade.error ? (
                                  <div className="detail-row">
                                    <span>Error</span>
                                    <span>{trade.error}</span>
                                  </div>
                                ) : null}
                                <div className="detail-row">
                                  <span>Side</span>
                                  <span>{callType || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Order type</span>
                                  <span>{orderType || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Price</span>
                                  <span>{price || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Qty</span>
                                  <span>
                                    {qtyDistribution || qtyValue
                                      ? `${qtyDistribution || "-"} / ${qtyValue || "-"}`
                                      : qty || "-"}
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <span>Target</span>
                                  <span>
                                    {targetBy || target ? `${targetBy || "-"} / ${target || "-"}` : "-"}
                                  </span>
                                </div>
                                <div className="detail-row">
                                  <span>Stop loss</span>
                                  <span>{slBy || sl ? `${slBy || "-"} / ${sl || "-"}` : "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Trail SL</span>
                                  <span>{trailSl}</span>
                                </div>
                                <div className="detail-row">
                                  <span>SL move</span>
                                  <span>{slMove || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Profit move</span>
                                  <span>{profitMove || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Exchange</span>
                                  <span>{exchange || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Segment</span>
                                  <span>{segment || "-"}</span>
                                </div>
                                {expiryDate || contract || expiry ? (
                                  <div className="detail-row">
                                    <span>Expiry</span>
                                    <span>{expiryDate || `${contract || "-"} / ${expiry || "-"}`}</span>
                                  </div>
                                ) : null}
                                {optionType || strikePrice || atm ? (
                                  <div className="detail-row">
                                    <span>Option</span>
                                    <span>
                                      {optionType || "-"} / {strikePrice || atm || "-"}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
