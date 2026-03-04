"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
    bufferBy?: string;
    bufferValue?: number | string;
    bufferPoints?: number | string;
    capitalAmount?: number | string;
    qtyDistribution?: string;
    qtyValue?: string;
    targetBy?: string;
    target?: string;
    slBy?: string;
    sl?: string;
    trailSl?: boolean;
    slMove?: string;
    profitMove?: string;
    dailyTradeLimit?: number | string;
    tradeWindowStart?: string;
    tradeWindowEnd?: string;
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
const DEFAULT_WEBHOOK_TEST_PAYLOAD = JSON.stringify(
  {
    alert_name: "Breakout Alert",
    scan_name: "Chartink Scanner",
    stocks: "RELIANCE",
    trigger_price: 300,
  },
  null,
  2
);

function parseRatioMultiplier(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.includes(":") || raw.includes("/")) {
    const divider = raw.includes(":") ? ":" : "/";
    const [left, right] = raw.split(divider).map((item) => item.trim());
    const a = Number(left);
    const b = Number(right);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
    return b / a;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function computeRatioTarget(slValue: string, ratioValue: string) {
  const sl = Number(slValue.trim());
  if (!Number.isFinite(sl) || sl <= 0) return null;
  const multiplier = parseRatioMultiplier(ratioValue);
  if (!multiplier) return null;
  const target = sl * multiplier;
  if (!Number.isFinite(target)) return null;
  return String(Number(target.toFixed(6)));
}

export default function StrategyPage() {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [marketMayaToken, setMarketMayaToken] = useState("");
  const [symbolMode, setSymbolMode] = useState("stocksFirst");
  const [symbolKey, setSymbolKey] = useState("symbol");
  const [maxSymbols, setMaxSymbols] = useState("");
  const [callTypeFallback, setCallTypeFallback] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [bufferBy, setBufferBy] = useState("");
  const [bufferPoints, setBufferPoints] = useState("");
  const [capitalAmount, setCapitalAmount] = useState("");
  const [qtyDistribution, setQtyDistribution] = useState("");
  const [qtyValue, setQtyValue] = useState("");
  const [useTarget, setUseTarget] = useState(false);
  const [targetBy, setTargetBy] = useState("");
  const [target, setTarget] = useState("");
  const [slBy, setSlBy] = useState("");
  const [sl, setSl] = useState("");
  const [trailSl, setTrailSl] = useState(false);
  const [slMove, setSlMove] = useState("");
  const [profitMove, setProfitMove] = useState("");
  const [dailyTradeLimit, setDailyTradeLimit] = useState("");
  const [tradeWindowStart, setTradeWindowStart] = useState("");
  const [tradeWindowEnd, setTradeWindowEnd] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentWebhookUrl, setRecentWebhookUrl] = useState<string | null>(null);
  const [recentStrategyName, setRecentStrategyName] = useState<string | null>(null);
  const [showWebhookTestModal, setShowWebhookTestModal] = useState(false);
  const [testWebhookUrl, setTestWebhookUrl] = useState("");
  const [testPayload, setTestPayload] = useState(DEFAULT_WEBHOOK_TEST_PAYLOAD);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<TelegramToken | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [editName, setEditName] = useState("");
  const [editEnabled, setEditEnabled] = useState(false);
  const [editMarketMayaToken, setEditMarketMayaToken] = useState("");
  const [editSymbolMode, setEditSymbolMode] = useState("stocksFirst");
  const [editSymbolKey, setEditSymbolKey] = useState("symbol");
  const [editMaxSymbols, setEditMaxSymbols] = useState("");
  const [editCallTypeFallback, setEditCallTypeFallback] = useState("");
  const [editOrderType, setEditOrderType] = useState("MARKET");
  const [editLimitPrice, setEditLimitPrice] = useState("");
  const [editBufferBy, setEditBufferBy] = useState("");
  const [editBufferPoints, setEditBufferPoints] = useState("");
  const [editCapitalAmount, setEditCapitalAmount] = useState("");
  const [editQtyDistribution, setEditQtyDistribution] = useState("");
  const [editQtyValue, setEditQtyValue] = useState("");
  const [editUseTarget, setEditUseTarget] = useState(false);
  const [editTargetBy, setEditTargetBy] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editSlBy, setEditSlBy] = useState("");
  const [editSl, setEditSl] = useState("");
  const [editTrailSl, setEditTrailSl] = useState(false);
  const [editSlMove, setEditSlMove] = useState("");
  const [editProfitMove, setEditProfitMove] = useState("");
  const [editDailyTradeLimit, setEditDailyTradeLimit] = useState("");
  const [editTradeWindowStart, setEditTradeWindowStart] = useState("");
  const [editTradeWindowEnd, setEditTradeWindowEnd] = useState("");
  const [editTelegramEnabled, setEditTelegramEnabled] = useState(false);

  const webhookBase = useMemo(() => {
    const base =
      process.env.NEXT_PUBLIC_WEBHOOK_URL || API_BASE_URL;
    return `${base}/api/v1/webhooks/chartink`;
  }, []);

  const normalizeId = useCallback((value: unknown) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
      const anyValue = value as { $oid?: string; toString?: () => string };
      if (typeof anyValue.$oid === "string") return anyValue.$oid;
      if (typeof anyValue.toString === "function") return anyValue.toString();
    }
    return String(value);
  }, []);

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

  const loadStrategies = useCallback(async () => {
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
  }, [normalizeId]);

  const loadTokens = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadStrategies();
    loadTokens();
  }, [loadStrategies, loadTokens]);

  const openWebhookTester = (url: string) => {
    setTestWebhookUrl(url);
    setTestError(null);
    setTestResult(null);
    setShowWebhookTestModal(true);
  };

  const closeWebhookTester = () => {
    setShowWebhookTestModal(false);
    setTestLoading(false);
  };

  const handleWebhookTest = async () => {
    setTestError(null);
    setTestResult(null);

    if (!testWebhookUrl.trim()) {
      setTestError("Webhook URL is required.");
      return;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(testPayload);
      if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
        setTestError("Payload must be a JSON object.");
        return;
      }
    } catch {
      setTestError("Invalid JSON payload.");
      return;
    }

    setTestLoading(true);
    try {
      const response = await fetch(testWebhookUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedPayload),
      });

      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await response.json().catch(() => ({}))
        : await response.text().catch(() => "");

      const payloadText =
        typeof body === "string" ? body : JSON.stringify(body, null, 2);
      setTestResult(
        `Status: ${response.status}\n\n${payloadText || "(empty response)"}`
      );

      if (!response.ok) {
        const fallback =
          typeof body === "object" && body && "error" in body
            ? String((body as { error?: unknown }).error || "")
            : "";
        setTestError(fallback || `Webhook test failed with status ${response.status}.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Webhook test failed";
      setTestError(msg);
    } finally {
      setTestLoading(false);
    }
  };

  const showModalError = Boolean(error) && (showModal || editing);
  const showPageError = Boolean(error) && !showModalError;

  const isRatioTarget = useTarget && targetBy === "Ratio";
  const ratioComputed = isRatioTarget ? computeRatioTarget(sl, target) : null;
  const targetPlaceholder = isRatioTarget ? "e.g. 1:2" : "e.g. 50";

  const isEditRatioTarget = editUseTarget && editTargetBy === "Ratio";
  const editRatioComputed = isEditRatioTarget
    ? computeRatioTarget(editSl, editTarget)
    : null;
  const editTargetPlaceholder = isEditRatioTarget ? "e.g. 1:2" : "e.g. 50";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (useTarget && targetBy === "Ratio" && !sl.trim()) {
        setError("Stop loss is required when Target by is Ratio.");
        return;
      }

      const trimmedQtyDistribution = qtyDistribution.trim();
      const trimmedQtyValue = qtyValue.trim();
      const trimmedCapitalAmount = capitalAmount.trim();
      const trimmedBufferBy = bufferBy.trim();
      const trimmedBufferPoints = bufferPoints.trim();

      if (trimmedQtyDistribution && !trimmedQtyValue) {
        setError("Qty value is required when Qty distribution is selected.");
        return;
      }
      if (trimmedQtyValue && !trimmedQtyDistribution) {
        setError("Select Qty distribution when Qty value is provided.");
        return;
      }
      if (trimmedQtyDistribution === "Capital(%)" && !trimmedCapitalAmount) {
        setError("Capital amount is required for Capital(%) qty.");
        return;
      }
      if (trimmedBufferBy && !trimmedBufferPoints) {
        setError("Trade buffer value is required when buffer type is selected.");
        return;
      }
      if (trimmedBufferPoints && !trimmedBufferBy) {
        setError("Select trade buffer type (Point/Percentage).");
        return;
      }

      const qtyNumber = trimmedQtyValue ? Number(trimmedQtyValue) : NaN;
      if (trimmedQtyValue && (!Number.isFinite(qtyNumber) || qtyNumber <= 0)) {
        setError("Qty value must be a positive number.");
        return;
      }

      const capitalAmountNumber = trimmedCapitalAmount ? Number(trimmedCapitalAmount) : NaN;
      if (
        trimmedCapitalAmount &&
        (!Number.isFinite(capitalAmountNumber) || capitalAmountNumber <= 0)
      ) {
        setError("Capital amount must be a positive number.");
        return;
      }

      const bufferPointsNumber = trimmedBufferPoints ? Number(trimmedBufferPoints) : NaN;
      if (trimmedBufferPoints && (!Number.isFinite(bufferPointsNumber) || bufferPointsNumber < 0)) {
        setError("Buffer points must be zero or a positive number.");
        return;
      }

      const token = getToken();
      const marketMaya: Record<string, unknown> = {
        symbolMode,
        ...(symbolMode === "payloadSymbol" && symbolKey.trim()
          ? { symbolKey: symbolKey.trim() }
          : {}),
        ...(symbolMode !== "stocksFirst" && maxSymbols.trim()
          ? { maxSymbols: maxSymbols.trim() }
          : {}),
        ...(callTypeFallback ? { callTypeFallback } : {}),
        orderType,
        ...(limitPrice.trim() ? { limitPrice: limitPrice.trim() } : {}),
        ...(trimmedBufferBy ? { bufferBy: trimmedBufferBy } : {}),
        ...(trimmedBufferPoints ? { bufferValue: bufferPointsNumber } : {}),
        ...(trimmedCapitalAmount ? { capitalAmount: capitalAmountNumber } : {}),
        ...(trimmedQtyDistribution ? { qtyDistribution: trimmedQtyDistribution } : {}),
        ...(trimmedQtyValue ? { qtyValue: trimmedQtyValue } : {}),
        ...(useTarget && targetBy.trim() ? { targetBy: targetBy.trim() } : {}),
        ...(useTarget && target.trim() ? { target: target.trim() } : {}),
        ...(slBy.trim() ? { slBy: slBy.trim() } : {}),
        ...(sl.trim() ? { sl: sl.trim() } : {}),
        ...(trailSl ? { trailSl: true } : {}),
        ...(slMove.trim() ? { slMove: slMove.trim() } : {}),
        ...(profitMove.trim() ? { profitMove: profitMove.trim() } : {}),
        ...(dailyTradeLimit.trim()
          ? { dailyTradeLimit: Number(dailyTradeLimit.trim()) }
          : {}),
        ...(tradeWindowStart.trim()
          ? { tradeWindowStart: tradeWindowStart.trim() }
          : {}),
        ...(tradeWindowEnd.trim() ? { tradeWindowEnd: tradeWindowEnd.trim() } : {}),
      };
      const payload: Record<string, unknown> = {
        name,
        webhookUrl: webhookBase,
        enabled,
        telegramEnabled,
        marketMaya,
      };
      if (enabled && marketMayaToken.trim()) {
        payload.marketMayaToken = marketMayaToken;
      }
      const data = await apiPost(
        "/api/v1/strategies",
        payload,
        token
      );
      const created = (data as { strategy?: Strategy }).strategy;
      if (created) {
        setRecentWebhookUrl(resolveWebhookUrl(created));
        setRecentStrategyName(created.name || name);
      } else {
        setRecentWebhookUrl(null);
        setRecentStrategyName(null);
      }
      setName("");
      setMarketMayaToken("");
      setSymbolMode("stocksFirst");
      setSymbolKey("symbol");
      setMaxSymbols("");
      setCallTypeFallback("");
      setOrderType("MARKET");
      setLimitPrice("");
      setBufferBy("");
      setBufferPoints("");
      setCapitalAmount("");
      setQtyDistribution("");
      setQtyValue("");
      setUseTarget(false);
      setTargetBy("");
      setTarget("");
      setSlBy("");
      setSl("");
      setTrailSl(false);
      setSlMove("");
      setProfitMove("");
      setDailyTradeLimit("");
      setTradeWindowStart("");
      setTradeWindowEnd("");
      setEnabled(false);
      setTelegramEnabled(false);
      setMessage("Strategy saved. Webhook URL is ready to copy.");
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
    setEditing({ ...item, _id: normalizeId(item._id) });
    setEditName(item.name || "");
    setEditEnabled(Boolean(item.enabled));
    setEditMarketMayaToken("");
    const mm = item.marketMaya || {};
    setEditSymbolMode(mm.symbolMode || "stocksFirst");
    setEditSymbolKey(mm.symbolKey || "symbol");
    setEditMaxSymbols(mm.maxSymbols ? String(mm.maxSymbols) : "");
    setEditCallTypeFallback(mm.callTypeFallback || "");
    setEditOrderType(mm.orderType || "MARKET");
    setEditLimitPrice(mm.limitPrice || "");
    setEditBufferBy(
      mm.bufferBy ||
        (mm.bufferValue !== undefined && mm.bufferValue !== null
          ? "Point"
          : mm.bufferPoints !== undefined && mm.bufferPoints !== null
            ? "Point"
            : "")
    );
    setEditBufferPoints(
      mm.bufferValue !== undefined && mm.bufferValue !== null
        ? String(mm.bufferValue)
        : mm.bufferPoints !== undefined && mm.bufferPoints !== null
          ? String(mm.bufferPoints)
          : ""
    );
    setEditCapitalAmount(
      mm.capitalAmount !== undefined && mm.capitalAmount !== null ? String(mm.capitalAmount) : ""
    );
    setEditQtyDistribution(mm.qtyDistribution || "");
    setEditQtyValue(mm.qtyValue || "");
    const editTargetByValue = mm.targetBy || "";
    const editTargetValue = mm.target || "";
    setEditUseTarget(Boolean(editTargetByValue || editTargetValue));
    setEditTargetBy(editTargetByValue);
    setEditTarget(editTargetValue);
    setEditSlBy(mm.slBy || "");
    setEditSl(mm.sl || "");
    setEditTrailSl(Boolean(mm.trailSl));
    setEditSlMove(mm.slMove || "");
    setEditProfitMove(mm.profitMove || "");
    setEditDailyTradeLimit(
      mm.dailyTradeLimit !== undefined && mm.dailyTradeLimit !== null
        ? String(mm.dailyTradeLimit)
        : ""
    );
    setEditTradeWindowStart(mm.tradeWindowStart || "");
    setEditTradeWindowEnd(mm.tradeWindowEnd || "");
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
    setEditCallTypeFallback("");
    setEditOrderType("MARKET");
    setEditLimitPrice("");
    setEditBufferBy("");
    setEditBufferPoints("");
    setEditCapitalAmount("");
    setEditQtyDistribution("");
    setEditQtyValue("");
    setEditUseTarget(false);
    setEditTargetBy("");
    setEditTarget("");
    setEditSlBy("");
    setEditSl("");
    setEditTrailSl(false);
    setEditSlMove("");
    setEditProfitMove("");
    setEditDailyTradeLimit("");
    setEditTradeWindowStart("");
    setEditTradeWindowEnd("");
    setEditTelegramEnabled(false);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    setError(null);
    setMessage(null);
    setEditLoading(true);

    try {
      const strategyId = normalizeId(editing._id);
      if (!strategyId) {
        setError("Strategy id missing");
        return;
      }
      if (editUseTarget && editTargetBy === "Ratio" && !editSl.trim()) {
        setError("Stop loss is required when Target by is Ratio.");
        return;
      }

      const trimmedQtyDistribution = editQtyDistribution.trim();
      const trimmedQtyValue = editQtyValue.trim();
      const trimmedCapitalAmount = editCapitalAmount.trim();
      const trimmedBufferBy = editBufferBy.trim();
      const trimmedBufferPoints = editBufferPoints.trim();

      if (trimmedQtyDistribution && !trimmedQtyValue) {
        setError("Qty value is required when Qty distribution is selected.");
        return;
      }
      if (trimmedQtyValue && !trimmedQtyDistribution) {
        setError("Select Qty distribution when Qty value is provided.");
        return;
      }
      if (trimmedQtyDistribution === "Capital(%)" && !trimmedCapitalAmount) {
        setError("Capital amount is required for Capital(%) qty.");
        return;
      }
      if (trimmedBufferBy && !trimmedBufferPoints) {
        setError("Trade buffer value is required when buffer type is selected.");
        return;
      }
      if (trimmedBufferPoints && !trimmedBufferBy) {
        setError("Select trade buffer type (Point/Percentage).");
        return;
      }

      const qtyNumber = trimmedQtyValue ? Number(trimmedQtyValue) : NaN;
      if (trimmedQtyValue && (!Number.isFinite(qtyNumber) || qtyNumber <= 0)) {
        setError("Qty value must be a positive number.");
        return;
      }

      const capitalAmountNumber = trimmedCapitalAmount ? Number(trimmedCapitalAmount) : NaN;
      if (
        trimmedCapitalAmount &&
        (!Number.isFinite(capitalAmountNumber) || capitalAmountNumber <= 0)
      ) {
        setError("Capital amount must be a positive number.");
        return;
      }

      const bufferPointsNumber = trimmedBufferPoints ? Number(trimmedBufferPoints) : NaN;
      if (trimmedBufferPoints && (!Number.isFinite(bufferPointsNumber) || bufferPointsNumber < 0)) {
        setError("Buffer points must be zero or a positive number.");
        return;
      }

      const token = getToken();
      const marketMaya: Record<string, unknown> = {
        symbolMode: editSymbolMode,
        ...(editSymbolMode === "payloadSymbol" && editSymbolKey.trim()
          ? { symbolKey: editSymbolKey.trim() }
          : {}),
        ...(editSymbolMode !== "stocksFirst" && editMaxSymbols.trim()
          ? { maxSymbols: editMaxSymbols.trim() }
          : {}),
        ...(editCallTypeFallback ? { callTypeFallback: editCallTypeFallback } : {}),
        orderType: editOrderType,
        ...(editLimitPrice.trim() ? { limitPrice: editLimitPrice.trim() } : {}),
        ...(trimmedBufferBy ? { bufferBy: trimmedBufferBy } : {}),
        ...(trimmedBufferPoints ? { bufferValue: bufferPointsNumber } : {}),
        ...(trimmedCapitalAmount ? { capitalAmount: capitalAmountNumber } : {}),
        ...(trimmedQtyDistribution ? { qtyDistribution: trimmedQtyDistribution } : {}),
        ...(trimmedQtyValue ? { qtyValue: trimmedQtyValue } : {}),
        ...(editUseTarget && editTargetBy.trim() ? { targetBy: editTargetBy.trim() } : {}),
        ...(editUseTarget && editTarget.trim() ? { target: editTarget.trim() } : {}),
        ...(editSlBy.trim() ? { slBy: editSlBy.trim() } : {}),
        ...(editSl.trim() ? { sl: editSl.trim() } : {}),
        ...(editTrailSl ? { trailSl: true } : {}),
        ...(editSlMove.trim() ? { slMove: editSlMove.trim() } : {}),
        ...(editProfitMove.trim() ? { profitMove: editProfitMove.trim() } : {}),
        ...(editDailyTradeLimit.trim()
          ? { dailyTradeLimit: Number(editDailyTradeLimit.trim()) }
          : {}),
        ...(editTradeWindowStart.trim()
          ? { tradeWindowStart: editTradeWindowStart.trim() }
          : {}),
        ...(editTradeWindowEnd.trim()
          ? { tradeWindowEnd: editTradeWindowEnd.trim() }
          : {}),
      };
      const payload: Record<string, unknown> = {
        strategyId,
        webhookKey: editing.webhookKey,
        name: editName,
        enabled: editEnabled,
        telegramEnabled: editTelegramEnabled,
        marketMaya,
      };
      if (editEnabled && editMarketMayaToken.trim()) {
        payload.marketMayaToken = editMarketMayaToken;
      }
      const data = await apiPost(
        "/api/v1/strategies/update",
        payload,
        token
      );

      const updated = (data as { strategy?: Strategy }).strategy;
      const normalizedUpdated = updated
        ? { ...updated, _id: normalizeId(updated._id) }
        : null;
      if (normalizedUpdated?._id) {
        setStrategies((prev) =>
          prev.map((item) =>
            item._id === normalizedUpdated._id ? { ...item, ...normalizedUpdated } : item
          )
        );
      }

      setMessage("Strategy updated.");
      closeEdit();
      if (!normalizedUpdated?._id) {
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

      {showPageError ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}
      {recentWebhookUrl ? (
        <div className="card">
          <div className="page-title">Webhook URL ready</div>
          <div className="helper">
            Use this URL in Chartink for{" "}
            {recentStrategyName ? `"${recentStrategyName}"` : "your strategy"}.
          </div>
          <div className="list-item" style={{ justifyContent: "space-between", marginTop: "12px" }}>
            <code className="mono">{recentWebhookUrl}</code>
            <div className="cta-row" style={{ gap: "8px" }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => copyToClipboard(recentWebhookUrl)}
              >
                Copy
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => openWebhookTester(recentWebhookUrl)}
              >
                Test
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setRecentWebhookUrl(null);
                  setRecentStrategyName(null);
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                    onClick={() => openWebhookTester(resolveWebhookUrl(item))}
                  >
                    Test
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

              {enabled ? (
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
                  />
                  <div className="helper">
                    Required for live trades. Leave blank to use server default.
                  </div>
                </div>
              ) : null}

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
                Payload `call_type` is used first. Fallback is used only when payload side is missing.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="market-calltype">
                    Trade side fallback
                  </label>
                  <select
                    className="select"
                    id="market-calltype"
                    value={callTypeFallback}
                    onChange={(event) => setCallTypeFallback(event.target.value)}
                  >
                    <option value="">Use payload `call_type`</option>
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
                  <label className="label" htmlFor="market-buffer-by">
                    Trade buffer by
                  </label>
                  <select
                    className="select"
                    id="market-buffer-by"
                    value={bufferBy}
                    onChange={(event) => {
                      const next = event.target.value;
                      setBufferBy(next);
                      if (!next) setBufferPoints("");
                    }}
                  >
                    <option value="">No buffer</option>
                    <option value="Point">Point</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="market-buffer-points">
                    Trade buffer value
                  </label>
                  <input
                    className="input"
                    id="market-buffer-points"
                    type="number"
                    min="0"
                    step="0.01"
                    value={bufferPoints}
                    onChange={(event) => setBufferPoints(event.target.value)}
                    placeholder={bufferBy === "Percentage" ? "e.g. 1" : "e.g. 1"}
                    disabled={!bufferBy}
                  />
                </div>
              </div>
              <div className="helper">
                Buffer logic: BUY = trigger + buffer, SELL = trigger - buffer (Point/Percentage).
              </div>

              <div className="input-group">
                <label className="label" htmlFor="market-capital-amount">
                  Capital amount
                </label>
                <input
                  className="input"
                  id="market-capital-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={capitalAmount}
                  onChange={(event) => setCapitalAmount(event.target.value)}
                  placeholder="e.g. 500000"
                  disabled={qtyDistribution !== "Capital(%)"}
                />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="market-qty-distribution">
                    Qty distribution
                  </label>
                  <select
                    className="select"
                    id="market-qty-distribution"
                    value={qtyDistribution}
                    onChange={(event) => setQtyDistribution(event.target.value)}
                  >
                    <option value="">Select qty mode</option>
                    <option value="Fix">Fix</option>
                    <option value="Capital(%)">Capital(%)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="market-qty-value">
                    Qty value
                  </label>
                  <input
                    className="input"
                    id="market-qty-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={qtyValue}
                    onChange={(event) => setQtyValue(event.target.value)}
                    placeholder={qtyDistribution === "Capital(%)" ? "e.g. 2" : "e.g. 5"}
                  />
                </div>
              </div>
              <div className="helper">
                Capital(%) qty: (Capital Amount * Qty% / 100) / stock price.
              </div>

              <div className="input-group">
                <label className="label" htmlFor="market-daily-trade-limit">
                  Daily trade limit
                </label>
                <input
                  className="input"
                  id="market-daily-trade-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={dailyTradeLimit}
                  onChange={(event) => setDailyTradeLimit(event.target.value)}
                  placeholder="e.g. 5"
                />
                <div className="helper">
                  Max trades per day for this strategy. Leave blank for no limit.
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="market-trade-start">
                    Trade start time
                  </label>
                  <input
                    className="input"
                    id="market-trade-start"
                    type="time"
                    value={tradeWindowStart}
                    onChange={(event) => setTradeWindowStart(event.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="market-trade-end">
                    Trade end time
                  </label>
                  <input
                    className="input"
                    id="market-trade-end"
                    type="time"
                    value={tradeWindowEnd}
                    onChange={(event) => setTradeWindowEnd(event.target.value)}
                  />
                </div>
              </div>
              <div className="helper">
                Trades execute only within this time window (server time).
              </div>

              <div className="input-group">
                <label className="label" htmlFor="market-use-target">
                  Target
                </label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Enable target</span>
                  <input
                    id="market-use-target"
                    type="checkbox"
                    checked={useTarget}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setUseTarget(checked);
                      if (!checked) {
                        setTargetBy("");
                        setTarget("");
                      }
                    }}
                  />
                </div>
              </div>

              {useTarget ? (
                <div className="grid-2">
                  <div className="input-group">
                    <label className="label" htmlFor="market-target-by">
                      Target by
                    </label>
                    <select
                      className="select"
                      id="market-target-by"
                      value={targetBy}
                      onChange={(event) => setTargetBy(event.target.value)}
                    >
                      <option value="">Select target type</option>
                      <option value="Money">Money</option>
                      <option value="Point">Point</option>
                      <option value="Percentage">Percentage</option>
                      <option value="Price">Price</option>
                      <option value="Ratio">Ratio</option>
                    </select>
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
                      placeholder={targetPlaceholder}
                    />
                    {isRatioTarget ? (
                      <div className="helper">
                        {!sl.trim()
                          ? "Set SL (or provide SL via webhook) to use ratio."
                          : ratioComputed
                            ? `Computed target: ${ratioComputed}`
                            : "Enter ratio like 1:2 or 2"}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="market-sl-by">
                    Stop loss by
                  </label>
                  <select
                    className="select"
                    id="market-sl-by"
                    value={slBy}
                    onChange={(event) => setSlBy(event.target.value)}
                  >
                    <option value="">Select SL type</option>
                    <option value="Money">Money</option>
                    <option value="Point">Point</option>
                    <option value="Percentage">Percentage</option>
                    <option value="Price">Price</option>
                  </select>
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
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setTrailSl(checked);
                      if (!checked) {
                        setSlMove("");
                        setProfitMove("");
                      }
                    }}
                  />
                </div>
              </div>

              {trailSl ? (
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
              ) : null}

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

              {editEnabled ? (
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
                  />
                  <div className="helper">Optional. Leave blank to keep the existing token.</div>
                </div>
              ) : null}

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
                Payload `call_type` is used first. Fallback is used only when payload side is missing.
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-calltype">
                    Trade side fallback
                  </label>
                  <select
                    className="select"
                    id="edit-market-calltype"
                    value={editCallTypeFallback}
                    onChange={(event) => setEditCallTypeFallback(event.target.value)}
                  >
                    <option value="">Use payload `call_type`</option>
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
                  <label className="label" htmlFor="edit-market-buffer-by">
                    Trade buffer by
                  </label>
                  <select
                    className="select"
                    id="edit-market-buffer-by"
                    value={editBufferBy}
                    onChange={(event) => {
                      const next = event.target.value;
                      setEditBufferBy(next);
                      if (!next) setEditBufferPoints("");
                    }}
                  >
                    <option value="">No buffer</option>
                    <option value="Point">Point</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-buffer-points">
                    Trade buffer value
                  </label>
                  <input
                    className="input"
                    id="edit-market-buffer-points"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editBufferPoints}
                    onChange={(event) => setEditBufferPoints(event.target.value)}
                    placeholder={editBufferBy === "Percentage" ? "e.g. 1" : "e.g. 1"}
                    disabled={!editBufferBy}
                  />
                </div>
              </div>
              <div className="helper">
                Buffer logic: BUY = trigger + buffer, SELL = trigger - buffer (Point/Percentage).
              </div>

              <div className="input-group">
                <label className="label" htmlFor="edit-market-capital-amount">
                  Capital amount
                </label>
                <input
                  className="input"
                  id="edit-market-capital-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editCapitalAmount}
                  onChange={(event) => setEditCapitalAmount(event.target.value)}
                  placeholder="e.g. 500000"
                  disabled={editQtyDistribution !== "Capital(%)"}
                />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-qty-distribution">
                    Qty distribution
                  </label>
                  <select
                    className="select"
                    id="edit-market-qty-distribution"
                    value={editQtyDistribution}
                    onChange={(event) => setEditQtyDistribution(event.target.value)}
                  >
                    <option value="">Select qty mode</option>
                    <option value="Fix">Fix</option>
                    <option value="Capital(%)">Capital(%)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-qty-value">
                    Qty value
                  </label>
                  <input
                    className="input"
                    id="edit-market-qty-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editQtyValue}
                    onChange={(event) => setEditQtyValue(event.target.value)}
                    placeholder={editQtyDistribution === "Capital(%)" ? "e.g. 2" : "e.g. 5"}
                  />
                </div>
              </div>
              <div className="helper">
                Capital(%) qty: (Capital Amount * Qty% / 100) / stock price.
              </div>

              <div className="input-group">
                <label className="label" htmlFor="edit-market-daily-trade-limit">
                  Daily trade limit
                </label>
                <input
                  className="input"
                  id="edit-market-daily-trade-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={editDailyTradeLimit}
                  onChange={(event) => setEditDailyTradeLimit(event.target.value)}
                  placeholder="e.g. 5"
                />
                <div className="helper">
                  Max trades per day for this strategy. Leave blank for no limit.
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-trade-start">
                    Trade start time
                  </label>
                  <input
                    className="input"
                    id="edit-market-trade-start"
                    type="time"
                    value={editTradeWindowStart}
                    onChange={(event) => setEditTradeWindowStart(event.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-trade-end">
                    Trade end time
                  </label>
                  <input
                    className="input"
                    id="edit-market-trade-end"
                    type="time"
                    value={editTradeWindowEnd}
                    onChange={(event) => setEditTradeWindowEnd(event.target.value)}
                  />
                </div>
              </div>
              <div className="helper">
                Trades execute only within this time window (server time).
              </div>

              <div className="input-group">
                <label className="label" htmlFor="edit-market-use-target">
                  Target
                </label>
                <div className="list-item" style={{ justifyContent: "space-between" }}>
                  <span>Enable target</span>
                  <input
                    id="edit-market-use-target"
                    type="checkbox"
                    checked={editUseTarget}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setEditUseTarget(checked);
                      if (!checked) {
                        setEditTargetBy("");
                        setEditTarget("");
                      }
                    }}
                  />
                </div>
              </div>

              {editUseTarget ? (
                <div className="grid-2">
                  <div className="input-group">
                    <label className="label" htmlFor="edit-market-target-by">
                      Target by
                    </label>
                    <select
                      className="select"
                      id="edit-market-target-by"
                      value={editTargetBy}
                      onChange={(event) => setEditTargetBy(event.target.value)}
                    >
                      <option value="">Select target type</option>
                      <option value="Money">Money</option>
                      <option value="Point">Point</option>
                      <option value="Percentage">Percentage</option>
                      <option value="Price">Price</option>
                      <option value="Ratio">Ratio</option>
                    </select>
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
                      placeholder={editTargetPlaceholder}
                    />
                    {isEditRatioTarget ? (
                      <div className="helper">
                        {!editSl.trim()
                          ? "Set SL (or provide SL via webhook) to use ratio."
                          : editRatioComputed
                            ? `Computed target: ${editRatioComputed}`
                            : "Enter ratio like 1:2 or 2"}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="edit-market-sl-by">
                    Stop loss by
                  </label>
                  <select
                    className="select"
                    id="edit-market-sl-by"
                    value={editSlBy}
                    onChange={(event) => setEditSlBy(event.target.value)}
                  >
                    <option value="">Select SL type</option>
                    <option value="Money">Money</option>
                    <option value="Point">Point</option>
                    <option value="Percentage">Percentage</option>
                    <option value="Price">Price</option>
                  </select>
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
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setEditTrailSl(checked);
                      if (!checked) {
                        setEditSlMove("");
                        setEditProfitMove("");
                      }
                    }}
                  />
                </div>
              </div>

              {editTrailSl ? (
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
              ) : null}

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

      {showWebhookTestModal ? (
        <div className="modal-overlay" onClick={closeWebhookTester}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="page-title">Test webhook</div>
            <div className="helper" style={{ marginTop: "8px" }}>
              Paste Chartink-like payload and click test to verify strategy webhook.
            </div>

            {testError ? (
              <div className="alert alert-error" style={{ marginTop: "12px" }}>
                {testError}
              </div>
            ) : null}

            <div className="input-group" style={{ marginTop: "12px" }}>
              <label className="label" htmlFor="test-webhook-url">
                Webhook URL
              </label>
              <input
                className="input"
                id="test-webhook-url"
                value={testWebhookUrl}
                onChange={(event) => setTestWebhookUrl(event.target.value)}
                placeholder="https://.../api/v1/webhooks/chartink?key=..."
              />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="test-webhook-payload">
                Test payload (JSON)
              </label>
              <textarea
                className="textarea"
                id="test-webhook-payload"
                rows={10}
                value={testPayload}
                onChange={(event) => setTestPayload(event.target.value)}
              />
              <div className="helper">
                Example keys: `alert_name`, `scan_name`, `stocks`, `trigger_price`. Optional: `call_type` (strategy fallback is used when missing).
              </div>
            </div>

            {testResult ? (
              <div className="input-group">
                <label className="label">Response</label>
                <pre className="mono" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {testResult}
                </pre>
              </div>
            ) : null}

            <div className="cta-row" style={{ marginTop: "14px" }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleWebhookTest}
                disabled={testLoading}
              >
                {testLoading ? "Testing..." : "Run test"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={closeWebhookTester}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showModalError ? (
        <div className="modal-overlay" onClick={() => setError(null)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="page-title">Error</div>
            <div className="alert alert-error" style={{ marginTop: "12px" }}>
              {error}
            </div>
            <div className="cta-row" style={{ marginTop: "16px" }}>
              <button className="btn btn-primary" type="button" onClick={() => setError(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
