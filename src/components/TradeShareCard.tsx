"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveApiBaseUrl } from "@/lib/api";

export type CardThemeId = "classic" | "night" | "mint" | "bold";

export type TradeCardData = {
  code: string;
  shortUrl: string;
  tradingSymbol: string;
  stock?: string;
  side: string;
  exchange?: string;
  quantity?: string | number;
  price?: string | number;
  productType?: string;
  buyRange?: string;
  target?: string;
  target1?: string;
  target2?: string;
  target3?: string;
  stopLoss?: string;
  timeFrame?: string;
  headline?: string;
  notes?: string;
  segment?: string;
};

export const CARD_THEMES: Array<{ id: CardThemeId; label: string; blurb: string }> = [
  { id: "classic", label: "Classic", blurb: "Warm peach" },
  { id: "night", label: "Night", blurb: "Dark slate" },
  { id: "mint", label: "Mint", blurb: "Soft green" },
  { id: "bold", label: "Bold", blurb: "Clean white" },
];

type ThemeColors = {
  page0: string;
  page1: string;
  title: string;
  subtitle: string;
  card: string;
  cardBorder: string;
  shadow: string;
  text: string;
  muted: string;
  call: string;
  underline: string;
  rowLine: string;
  disclaimer: string;
  qrBox: string;
};

const THEME_COLORS: Record<CardThemeId, ThemeColors> = {
  classic: {
    page0: "#fff8f1",
    page1: "#ffe8d6",
    title: "#1e3a5f",
    subtitle: "#5b7c99",
    card: "#ffffff",
    cardBorder: "#f0e6dc",
    shadow: "rgba(120, 80, 40, 0.12)",
    text: "#111827",
    muted: "#9ca3af",
    call: "#1f2937",
    underline: "#f97316",
    rowLine: "#e5e7eb",
    disclaimer: "#9ca3af",
    qrBox: "#ffffff",
  },
  night: {
    page0: "#0b1220",
    page1: "#1e293b",
    title: "#e2e8f0",
    subtitle: "#94a3b8",
    card: "#111827",
    cardBorder: "#334155",
    shadow: "rgba(0, 0, 0, 0.35)",
    text: "#f8fafc",
    muted: "#64748b",
    call: "#e2e8f0",
    underline: "#38bdf8",
    rowLine: "#334155",
    disclaimer: "#64748b",
    qrBox: "#ffffff",
  },
  mint: {
    page0: "#f0fdf4",
    page1: "#dcfce7",
    title: "#064e3b",
    subtitle: "#047857",
    card: "#ffffff",
    cardBorder: "#bbf7d0",
    shadow: "rgba(16, 185, 129, 0.12)",
    text: "#064e3b",
    muted: "#6b7280",
    call: "#065f46",
    underline: "#10b981",
    rowLine: "#d1d5db",
    disclaimer: "#6b7280",
    qrBox: "#ffffff",
  },
  bold: {
    page0: "#f8fafc",
    page1: "#e2e8f0",
    title: "#0f172a",
    subtitle: "#475569",
    card: "#ffffff",
    cardBorder: "#cbd5e1",
    shadow: "rgba(15, 23, 42, 0.1)",
    text: "#0f172a",
    muted: "#64748b",
    call: "#0f172a",
    underline: "#16a34a",
    rowLine: "#e2e8f0",
    disclaimer: "#64748b",
    qrBox: "#ffffff",
  },
};

function productLabel(productType?: string) {
  const value = String(productType || "").toUpperCase();
  if (value.includes("BIGTRADE") || value === "BT" || value === "BT+") return "Equity Intraday";
  return "Equity Delivery";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load QR image"));
    image.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: string, min = 12) {
  let next = size;
  ctx.font = `${weight} ${next}px Arial, Helvetica, sans-serif`;
  while (next > min && ctx.measureText(text).width > maxWidth) {
    next -= 1;
    ctx.font = `${weight} ${next}px Arial, Helvetica, sans-serif`;
  }
  return next;
}

function formatStamp(date = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(date.getDate()).padStart(2, "0");
  const mon = months[date.getMonth()];
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd} ${mon}'${yy}, ${hh}:${mm}:${ss}`;
}

function displayName(data: TradeCardData) {
  const stock = String(data.stock || "").trim();
  const symbol = String(data.tradingSymbol || "").trim().toUpperCase();
  if (stock && stock.length <= 18 && !/\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i.test(stock)) {
    return stock.toUpperCase();
  }
  return symbol || "SYMBOL";
}

function dashedLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

export async function drawTradeCard(
  canvas: HTMLCanvasElement,
  data: TradeCardData,
  themeId: CardThemeId = "classic"
) {
  const theme = THEME_COLORS[themeId] || THEME_COLORS.classic;
  const width = 720;
  const height = 980;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const side = String(data.side || "BUY").toUpperCase() === "SELL" ? "Sell" : "Buy";
  const sideColor = side === "Sell" ? "#dc2626" : "#15803d";
  const name = displayName(data);
  const call = String(data.headline || "").trim() || `${productLabel(data.productType)} idea`;
  const buyRange =
    String(data.buyRange || "").trim() ||
    (Number(data.price) > 0 ? String(data.price) : "Market");
  const quantity = String(data.quantity ?? "1").trim() || "1";
  const target1 = String(data.target1 || "").trim() || String(data.target || "").split("/")[0]?.trim() || "—";
  const target2 = String(data.target2 || "").trim() || String(data.target || "").split("/")[1]?.trim() || "—";
  const target3 = String(data.target3 || "").trim() || String(data.target || "").split("/")[2]?.trim() || "—";
  const stopLoss = String(data.stopLoss || "").trim() || "—";
  const timeFrame =
    String(data.timeFrame || "").trim() ||
    (productLabel(data.productType).includes("Intraday") ? "INTRADAY" : "DELIVERY");

  const page = ctx.createLinearGradient(0, 0, 0, height);
  page.addColorStop(0, theme.page0);
  page.addColorStop(1, theme.page1);
  ctx.fillStyle = page;
  ctx.fillRect(0, 0, width, height);

  // Header outside card
  ctx.textAlign = "left";
  ctx.fillStyle = theme.title;
  ctx.font = "800 34px Arial, Helvetica, sans-serif";
  ctx.fillText("Emotionless Traders", 48, 58);
  ctx.fillStyle = theme.subtitle;
  ctx.font = "500 18px Arial, Helvetica, sans-serif";
  ctx.fillText("Sharekhan order card", 48, 86);

  // Card
  const cardX = 36;
  const cardY = 112;
  const cardW = width - 72;
  const cardH = 760;
  ctx.save();
  ctx.shadowColor = theme.shadow;
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fillStyle = theme.card;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  const pad = 36;
  const left = cardX + pad;
  const right = cardX + cardW - pad;
  const contentW = cardW - pad * 2;

  // QR top-right
  const qrSize = 148;
  const qrX = right - qrSize;
  const qrY = cardY + 34;
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 14);
  ctx.fillStyle = theme.qrBox;
  ctx.fill();
  ctx.strokeStyle = theme.rowLine;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (data.code) {
    try {
      const qrUrl = `${resolveApiBaseUrl()}/api/v1/order-intents/${encodeURIComponent(data.code)}/qr.png?t=${Date.now()}`;
      const qr = await loadImage(qrUrl);
      ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
    } catch {
      ctx.fillStyle = theme.muted;
      ctx.font = "600 13px Arial, Helvetica, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("QR unavailable", qrX + qrSize / 2, qrY + qrSize / 2);
    }
  } else {
    ctx.fillStyle = theme.muted;
    ctx.font = "600 12px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Generate link", qrX + qrSize / 2, qrY + qrSize / 2 - 6);
    ctx.fillText("for QR", qrX + qrSize / 2, qrY + qrSize / 2 + 12);
  }

  // Call + side
  const textMax = contentW - qrSize - 28;
  ctx.textAlign = "left";
  ctx.fillStyle = theme.call;
  fitFont(ctx, call, textMax - 70, 22, "500", 14);
  const callW = ctx.measureText(call).width;
  ctx.fillText(call, left, cardY + 58);
  ctx.fillStyle = sideColor;
  ctx.font = "800 22px Arial, Helvetica, sans-serif";
  ctx.fillText(side, left + callW + 10, cardY + 58);

  // Big stock name
  ctx.fillStyle = theme.text;
  const nameSize = fitFont(ctx, name, textMax, 56, "800", 28);
  ctx.fillText(name, left, cardY + 128);
  const nameW = Math.min(ctx.measureText(name).width, textMax);
  ctx.strokeStyle = theme.underline;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left, cardY + 138);
  ctx.lineTo(left + Math.max(nameW * 0.55, 72), cardY + 138);
  ctx.stroke();

  // Rows
  const rows: Array<{ label: string; value: string }> = [
    { label: "BUY RANGE", value: buyRange },
    { label: "QUANTITY", value: quantity },
    { label: "TARGET 1", value: target1 },
    { label: "TARGET 2", value: target2 },
    { label: "TARGET 3", value: target3 },
    { label: "SL", value: stopLoss },
    { label: "TIME FRAME", value: timeFrame.toUpperCase() },
  ];

  let rowY = cardY + 220;
  const rowH = 68;
  rows.forEach((row, index) => {
    if (index > 0) dashedLine(ctx, left, right, rowY - 18, theme.rowLine);
    ctx.textAlign = "left";
    ctx.fillStyle = theme.muted;
    ctx.font = "600 15px Arial, Helvetica, sans-serif";
    ctx.fillText(row.label, left, rowY + 8);
    ctx.textAlign = "right";
    ctx.fillStyle = theme.text;
    fitFont(ctx, row.value, contentW * 0.55, 34, "800", 18);
    ctx.fillText(row.value, right, rowY + 12);
    rowY += rowH;
  });

  // Timestamp
  ctx.textAlign = "right";
  ctx.fillStyle = theme.muted;
  ctx.font = "500 14px Arial, Helvetica, sans-serif";
  ctx.fillText(formatStamp(), right, cardY + cardH - 28);

  // Disclaimer
  ctx.textAlign = "left";
  ctx.fillStyle = theme.disclaimer;
  ctx.font = "500 13px Arial, Helvetica, sans-serif";
  ctx.fillText(
    "* Investments in securities market are subject to market risk. Scan the QR to open this order in Sharekhan.",
    48,
    height - 28
  );
}

type Props = {
  data: TradeCardData;
  theme?: CardThemeId;
  onClose?: () => void;
  variant?: "panel" | "toolbar" | "preview";
};

function ActionIcon({ name }: { name: "download" | "copy" | "share" }) {
  if (name === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v10" />
        <path d="M8 10l4 4 4-4" />
        <path d="M5 19h14" />
      </svg>
    );
  }
  if (name === "copy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M5 15V5h10" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="2" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="16" cy="17" r="2" />
      <path d="M8 11l6-3M8 13l6 3" />
    </svg>
  );
}

export default function TradeShareCard({ data, theme = "classic", onClose, variant = "panel" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const renderCard = useCallback(async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    setError("");
    try {
      await drawTradeCard(canvasRef.current, data, theme);
      setPreviewUrl(canvasRef.current.toDataURL("image/png"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build share image");
    } finally {
      setBusy(false);
    }
  }, [data, theme]);

  useEffect(() => {
    renderCard();
  }, [renderCard]);

  async function downloadImage() {
    if (!previewUrl) return;
    const anchor = document.createElement("a");
    anchor.href = previewUrl;
    anchor.download = `${data.tradingSymbol || "trade"}-${data.code || "draft"}.png`;
    anchor.click();
    setMessage("Image downloaded.");
  }

  async function copyImage() {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current?.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Could not create image");
      if (navigator.clipboard && "ClipboardItem" in window) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setMessage("Image copied. Paste it in WhatsApp.");
        return;
      }
      throw new Error("Clipboard image copy is not supported on this browser");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not copy image");
    }
  }

  async function shareImage() {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current?.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Could not create image");
      const file = new File([blob], `${data.tradingSymbol || "trade"}-card.png`, {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${data.tradingSymbol} ${data.side}`,
          text: `Scan QR to open this Sharekhan order.\n${data.shortUrl || ""}`,
        });
        setMessage("Shared.");
        return;
      }
      await downloadImage();
      setMessage("Share not available here — image downloaded instead.");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Could not share image");
    }
  }

  const actionsDisabled = busy || !previewUrl || !data.code;

  const toolbar = (
    <div className="sk-toolbar">
      {error ? (
        <p className="sk-banner sk-banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="sk-banner" role="status">
          {message}
        </p>
      ) : null}
      <div className="sk-share-actions">
        <button className="sk-btn sk-btn-ghost" type="button" disabled={actionsDisabled} onClick={downloadImage}>
          <ActionIcon name="download" /> Download PNG
        </button>
        <button className="sk-btn sk-btn-ghost" type="button" disabled={actionsDisabled} onClick={copyImage}>
          <ActionIcon name="copy" /> Copy image
        </button>
        <button className="sk-btn sk-btn-ghost" type="button" disabled={actionsDisabled} onClick={shareImage}>
          <ActionIcon name="share" /> Share
        </button>
      </div>
      {!data.code ? <p className="sk-hint">Generate a link to unlock download / copy / share with QR.</p> : null}
    </div>
  );

  if (variant === "toolbar") {
    return (
      <>
        {toolbar}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </>
    );
  }

  return (
    <div className={variant === "preview" ? "sk-canvas-preview" : "trade-share-card"}>
      {variant !== "preview" ? (
        <div className="trade-share-card-head">
          <div>
            <strong>Share image with QR</strong>
            <p className="helper" style={{ marginTop: 4 }}>
              Preview and download use the same image.
            </p>
          </div>
          {onClose ? (
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="sk-banner sk-banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {message && variant !== "preview" ? (
        <p className="sk-banner" role="status">
          {message}
        </p>
      ) : null}
      <div className={variant === "preview" ? "sk-canvas-preview-frame" : "trade-share-preview"}>
        {busy && !previewUrl ? <p className="sk-hint">Building card…</p> : null}
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Trade share card preview" />
        ) : null}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      {variant === "preview" ? toolbar : (
        <div className="cta-row" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
          <button className="btn btn-primary" type="button" disabled={actionsDisabled} onClick={shareImage}>
            Share image
          </button>
          <button className="btn btn-secondary" type="button" disabled={actionsDisabled} onClick={downloadImage}>
            Download PNG
          </button>
          <button className="btn btn-secondary" type="button" disabled={actionsDisabled} onClick={copyImage}>
            Copy image
          </button>
        </div>
      )}
    </div>
  );
}
