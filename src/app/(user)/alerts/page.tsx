"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
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
        brokerStatus?: string | null;
        brokerRemark?: string | null;
        brokerTime?: string | null;
        brokerMatched?: boolean;
        params?: Record<string, unknown> | null;
        request?: { params?: Record<string, unknown> | null } | null;
      }>;
    };
    sharekhan?: {
      enabled?: boolean;
      ok?: boolean | null;
      skipped?: boolean;
      total?: number;
      successCount?: number;
      failureCount?: number;
      error?: string;
      reason?: string;
      trades?: Array<{
        symbol?: string;
        orderId?: string;
        status?: number | string | null;
        ok?: boolean;
        dryRun?: boolean;
        error?: string | null;
        errorDetails?: {
          status?: number | string;
          message?: string;
          payload?: unknown;
        } | null;
        response?: unknown;
        request?: Record<string, unknown> | null;
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
  brokerStatus?: string | null;
  brokerRemark?: string | null;
  brokerTime?: string | null;
  brokerMatched?: boolean;
  params?: Record<string, unknown> | null;
  request?: { params?: Record<string, unknown> | null } | null;
};
type SharekhanTradeInfo = {
  symbol?: string;
  orderId?: string;
  status?: number | string | null;
  ok?: boolean;
  dryRun?: boolean;
  error?: string | null;
  errorDetails?: {
    status?: number | string;
    message?: string;
    payload?: unknown;
  } | null;
  response?: unknown;
  request?: Record<string, unknown> | null;
};

function formatTradeStatus(trade?: TradeInfo) {
  if (!trade) return { text: "Unknown", tone: "warn" as StatusTone };
  if (trade.dryRun) return { text: "Dry-run", tone: "warn" as StatusTone };

  const brokerStatus = String(trade.brokerStatus || "").trim();
  const brokerLower = brokerStatus.toLowerCase();
  if (brokerLower.includes("reject") || brokerLower.includes("fail") || brokerLower.includes("error")) {
    return { text: brokerStatus || "Rejected", tone: "error" as StatusTone };
  }
  if (
    brokerLower.includes("accept") ||
    brokerLower.includes("execut") ||
    brokerLower.includes("success") ||
    brokerLower.includes("confirm")
  ) {
    return { text: brokerStatus || "Accepted", tone: "ok" as StatusTone };
  }
  if (
    brokerLower.includes("wait") ||
    brokerLower.includes("pending") ||
    brokerLower.includes("process") ||
    brokerLower.includes("queue")
  ) {
    return { text: brokerStatus || "Waiting", tone: "warn" as StatusTone };
  }
  if (trade.ok) return { text: "Submitted", tone: "warn" as StatusTone };
  return { text: "Failed", tone: "error" as StatusTone };
}

function sanitizeTradeError(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw.replace(/\s+/g, " ").trim();
  const redacted = normalized
    .replace(/([?&]token=)([^&\s"'<]+)/gi, "$1[REDACTED]")
    .replace(/(["'\s])token([=:]\s*)([^\s"'&<>]{8,})/gi, "$1token$2[REDACTED]");
  const lowered = redacted.toLowerCase();

  if (
    lowered.includes("<!doctype html") ||
    lowered.includes("<html") ||
    lowered.includes("just a moment") ||
    lowered.includes("cloudflare")
  ) {
    return "Market Maya blocked the request with a Cloudflare challenge. Retry shortly.";
  }

  return redacted.length > 220 ? `${redacted.slice(0, 217)}...` : redacted;
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
    const reason = sanitizeTradeError(market.error || market.reason);
    return {
      text,
      tone: "warn",
      title: reason || undefined,
    };
  }

  const trades = Array.isArray(market.trades) ? market.trades : [];
  const brokerRejected = trades.filter((trade) => {
    const status = String(trade.brokerStatus || "").toLowerCase();
    return status.includes("reject") || status.includes("fail") || status.includes("error") || trade.ok === false;
  }).length;
  const brokerAccepted = trades.filter((trade) => {
    const status = String(trade.brokerStatus || "").toLowerCase();
    return (
      status.includes("accept") ||
      status.includes("execut") ||
      status.includes("success") ||
      status.includes("confirm")
    );
  }).length;
  const brokerWaiting = trades.filter((trade) => {
    const status = String(trade.brokerStatus || "").toLowerCase();
    return (
      status.includes("wait") ||
      status.includes("pending") ||
      status.includes("process") ||
      status.includes("queue")
    );
  }).length;
  const firstRemark = sanitizeTradeError(
    trades.find((trade) => trade.brokerRemark || trade.error)?.brokerRemark ||
      trades.find((trade) => trade.error)?.error ||
      market.error
  );

  const total = Number(market.total || trades.length || 0);
  const success = brokerAccepted;
  const mode = market.execute === false ? "Dry-run" : "Live";
  const countText = total > 0 ? ` ${Math.max(success, 0)}/${total}` : "";

  if (brokerRejected > 0) {
    return {
      text: `Rejected${countText} ${mode}`,
      tone: "error",
      title: firstRemark || undefined,
    };
  }
  if (brokerWaiting > 0) {
    return {
      text: `Waiting${countText} ${mode}`,
      tone: "warn",
      title: firstRemark || "Waiting for Market Maya broker confirmation",
    };
  }
  if (brokerAccepted > 0) {
    return { text: `OK${countText} ${mode}`, tone: "ok", title: firstRemark || undefined };
  }
  if (market.ok) {
    return {
      text: `Submitted${countText} ${mode}`,
      tone: "warn",
      title: firstRemark || "Sent to Market Maya. Check call history for broker accept/reject.",
    };
  }
  return {
    text: `Failed${countText} ${mode}`,
    tone: "error",
    title: firstRemark || undefined,
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

function formatSharekhanStatus(debug?: AlertEvent["debug"]): StatusInfo {
  const sharekhan = debug?.sharekhan;
  if (!sharekhan) {
    return { text: "Pending", tone: "warn" };
  }
  if (sharekhan.enabled === false) {
    return { text: "Off", tone: "off" };
  }
  if (sharekhan.skipped) {
    const reason = sanitizeTradeError(sharekhan.error || sharekhan.reason);
    return { text: "Skipped", tone: "warn", title: reason || undefined };
  }

  const trades = Array.isArray(sharekhan.trades) ? sharekhan.trades : [];
  const total = Number(sharekhan.total || trades.length || 0);
  const success = Number(sharekhan.successCount || trades.filter((trade) => trade.ok).length || 0);
  const failure = Number(sharekhan.failureCount || trades.filter((trade) => trade.ok === false).length || 0);
  const firstError = sanitizeTradeError(
    trades.find((trade) => trade.error)?.error || sharekhan.error || sharekhan.reason
  );
  const countText = total > 0 ? ` ${success}/${total}` : "";

  if (failure > 0 || sharekhan.ok === false) {
    return { text: `Failed${countText}`, tone: "error", title: firstError || undefined };
  }
  if (success > 0 || sharekhan.ok === true) {
    return { text: `OK${countText}`, tone: "ok", title: firstError || undefined };
  }
  return {
    text: total > 0 ? `Submitted${countText}` : "No orders",
    tone: total > 0 ? "warn" : "off",
    title: firstError || undefined,
  };
}

function formatSharekhanResponse(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    const compact = text.replace(/\s+/g, " ").trim();
    return compact.length > 260 ? `${compact.slice(0, 257)}...` : compact;
  } catch {
    return String(value).slice(0, 260);
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadAlerts = async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/alerts?limit=50", token);
      setAlerts((data as { alerts?: AlertEvent[] }).alerts || []);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load alerts";
      setError(msg);
    }
  };

  useEffect(() => {
    loadAlerts();

    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      loadAlerts();
      if (ticks >= 20) {
        window.clearInterval(timer);
      }
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleClear = async () => {
    setError(null);
    setMessage(null);

    const confirmed = window.confirm(
      "Clear all alerts? This cannot be undone."
    );
    if (!confirmed) return;

    setClearLoading(true);
    try {
      const token = getToken();
      const data = await apiPost("/api/v1/alerts/clear", {}, token);
      const deletedCount =
        (data as { deletedCount?: number }).deletedCount || 0;
      setAlerts([]);
      setExpanded({});
      setMessage(
        deletedCount > 0
          ? `Cleared ${deletedCount} alert${deletedCount === 1 ? "" : "s"}.`
          : "No alerts to clear."
      );
      await loadAlerts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to clear alerts";
      setError(msg);
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Alerts</div>
          <div className="helper">Every webhook signal, organized</div>
        </div>
        <button
          className="btn btn-danger"
          type="button"
          disabled={clearLoading || alerts.length === 0}
          onClick={handleClear}
        >
          {clearLoading ? "Clearing..." : "Clear"}
        </button>
      </div>

      {message ? <div className="alert alert-success">{message}</div> : null}
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
              const sharekhanStatus = formatSharekhanStatus(item.debug);
              const telegramStatus = formatTelegramStatus(item.debug);
              const trades = item.debug?.marketMaya?.trades || [];
              const sharekhanTrades = item.debug?.sharekhan?.trades || [];
              const tradeCount = trades.length;
              const sharekhanTradeCount = sharekhanTrades.length;
              const tradeHeader =
                tradeCount > 0 ? `${tradeCount} trade${tradeCount > 1 ? "s" : ""}` : "No trade details";
              const sharekhanTradeHeader =
                sharekhanTradeCount > 0
                  ? `${sharekhanTradeCount} order${sharekhanTradeCount > 1 ? "s" : ""}`
                  : "No Sharekhan orders";

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
                        <span className="status-label">Sharekhan</span>
                        <span
                          className={`status-chip ${sharekhanStatus.tone}`}
                          title={sharekhanStatus.title}
                        >
                          {sharekhanStatus.text}
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
                            const tradeError = sanitizeTradeError(
                              trade.brokerRemark || trade.error
                            );
                            const brokerStatus = String(trade.brokerStatus || "").trim();
                            const symbol =
                              trade.symbol ||
                              trade.symbolCode ||
                              (params.symbol as string) ||
                              (params.symbol_code as string) ||
                              "N/A";
                            const callType = params.call_type as string | undefined;
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
                                <div className="detail-row">
                                  <span>Broker status</span>
                                  <span>{brokerStatus || tradeStatus.text}</span>
                                </div>
                                {tradeError ? (
                                  <div className="detail-row">
                                    <span>Remark</span>
                                    <span>{tradeError}</span>
                                  </div>
                                ) : null}
                                <div className="detail-row">
                                  <span>Side</span>
                                  <span>{callType || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Qty</span>
                                  <span>
                                    {qtyDistribution || qtyValue
                                      ? `${qtyDistribution || "-"} / ${qtyValue || "-"}`
                                      : qty || "-"}
                                  </span>
                                </div>
                                <div className="detail-row detail-row-target">
                                  <span>Target</span>
                                  <span>
                                    {targetBy || target ? `${targetBy || "-"} / ${target || "-"}` : "-"}
                                  </span>
                                </div>
                                <div className="detail-row detail-row-stop">
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
                      <div className="details-header" style={{ marginTop: "16px" }}>
                        <strong>Sharekhan orders</strong>
                        <span className="helper">{sharekhanTradeHeader}</span>
                      </div>
                      {sharekhanTradeCount === 0 ? (
                        <div className="helper" style={{ marginTop: "8px" }}>
                          {item.debug?.sharekhan?.skipped
                            ? item.debug?.sharekhan?.error ||
                              item.debug?.sharekhan?.reason ||
                              "Sharekhan order skipped"
                            : item.debug?.sharekhan?.enabled === false
                              ? "Sharekhan is off for this strategy."
                              : "No Sharekhan order details captured yet."}
                        </div>
                      ) : (
                        <div className="detail-grid" style={{ marginTop: "12px" }}>
                          {sharekhanTrades.map((trade: SharekhanTradeInfo, tradeIndex: number) => {
                            const request =
                              trade.request && typeof trade.request === "object" ? trade.request : {};
                            const status = trade.dryRun
                              ? ({ text: "Dry-run", tone: "warn" } as StatusInfo)
                              : trade.ok
                                ? ({ text: "Submitted", tone: "ok" } as StatusInfo)
                                : ({ text: "Failed", tone: "error" } as StatusInfo);
                            const apiStatus = String(
                              trade.status || trade.errorDetails?.status || ""
                            ).trim();
                            const errorText = sanitizeTradeError(
                              trade.errorDetails?.message || trade.error
                            );
                            const responseText = formatSharekhanResponse(
                              trade.errorDetails?.payload || trade.response
                            );
                            const requestBody =
                              request.body && typeof request.body === "object"
                                ? (request.body as Record<string, unknown>)
                                : request;
                            const symbol =
                              trade.symbol ||
                              String(requestBody.symbol || requestBody.tradingSymbol || requestBody.symbolToken || "") ||
                              "N/A";
                            const scripCode = String(requestBody.scripCode || requestBody.symbolToken || "");
                            const tradingSymbol = String(requestBody.tradingSymbol || requestBody.symbol || "");
                            const side = String(
                              requestBody.transactionType ||
                                requestBody.transactiontype ||
                                requestBody.callType ||
                                requestBody.call_type ||
                                "-"
                            );
                            const quantity = String(
                              requestBody.quantity || requestBody.qty || requestBody.qtyValue || "-"
                            );
                            const product = String(
                              requestBody.productType || requestBody.producttype || requestBody.product || "-"
                            );
                            const exchange = String(requestBody.exchange || "-");
                            const orderId = String(trade.orderId || requestBody.orderId || requestBody.order_id || "");

                            return (
                              <div className="detail-card" key={`${rowId}-sharekhan-${tradeIndex}`}>
                                <div className="detail-title-row">
                                  <div className="detail-title">{symbol}</div>
                                  <span className={`status-chip ${status.tone}`}>{status.text}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Order ID</span>
                                  <span>{orderId || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>API status</span>
                                  <span>{apiStatus || "-"}</span>
                                </div>
                                {errorText ? (
                                  <div className="detail-row">
                                    <span>Error</span>
                                    <span>{errorText}</span>
                                  </div>
                                ) : null}
                                {responseText && responseText !== errorText ? (
                                  <div className="detail-row">
                                    <span>Response</span>
                                    <span>{responseText}</span>
                                  </div>
                                ) : null}
                                <div className="detail-row">
                                  <span>Scrip code</span>
                                  <span>{scripCode || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Trading symbol</span>
                                  <span>{tradingSymbol || "-"}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Side</span>
                                  <span>{side}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Qty</span>
                                  <span>{quantity}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Product</span>
                                  <span>{product}</span>
                                </div>
                                <div className="detail-row">
                                  <span>Exchange</span>
                                  <span>{exchange}</span>
                                </div>
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
