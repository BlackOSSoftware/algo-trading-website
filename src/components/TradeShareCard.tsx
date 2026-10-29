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
  { id: "classic", label: "Classic", blurb: "Warm cream" },
  { id: "night", label: "Night", blurb: "Dark slate" },
  { id: "mint", label: "Mint", blurb: "Clean green" },
  { id: "bold", label: "Bold", blurb: "High contrast" },
];

type ThemePalette = {
  bg0: string;
  bg1: string;
  bg2: string;
  glow: string;
  brand: string;
  kicker: string;
  text: string;
  muted: string;
  headlineBg: string;
  headlineFg: string;
  buyBg: string;
  buyFg: string;
  targetBg: string;
  targetFg: string;
  stopBg: string;
  stopFg: string;
  qrBorder: string;
  footerLine: string;
  footerMuted: string;
  accentBar?: string;
};

const THEMES: Record<CardThemeId, ThemePalette> = {
  classic: {
    bg0: "#fffdfb",
    bg1: "#fff6ee",
    bg2: "#ffefe3",
    glow: "rgba(255, 168, 92, 0.28)",
    brand: "#e85d04",
    kicker: "#c2410c",
    text: "#111827",
    muted: "#6b7280",
    headlineBg: "#fff4dc",
    headlineFg: "#92400e",
    buyBg: "#eef5ff",
    buyFg: "#0f172a",
    targetBg: "#e8f8ee",
    targetFg: "#15803d",
    stopBg: "#fff0f0",
    stopFg: "#dc2626",
    qrBorder: "#f3e4d6",
    footerLine: "#f3e6dc",
    footerMuted: "#9ca3af",
  },
  night: {
    bg0: "#0b1220",
    bg1: "#111827",
    bg2: "#1e293b",
    glow: "rgba(56, 189, 248, 0.18)",
    brand: "#38bdf8",
    kicker: "#7dd3fc",
    text: "#f8fafc",
    muted: "#94a3b8",
    headlineBg: "#1e293b",
    headlineFg: "#e2e8f0",
    buyBg: "#172554",
    buyFg: "#bfdbfe",
    targetBg: "#052e16",
    targetFg: "#86efac",
    stopBg: "#450a0a",
    stopFg: "#fca5a5",
    qrBorder: "#334155",
    footerLine: "#334155",
    footerMuted: "#64748b",
  },
  mint: {
    bg0: "#f7fdf9",
    bg1: "#ecfdf5",
    bg2: "#d1fae5",
    glow: "rgba(16, 185, 129, 0.18)",
    brand: "#047857",
    kicker: "#059669",
    text: "#064e3b",
    muted: "#6b7280",
    headlineBg: "#d1fae5",
    headlineFg: "#065f46",
    buyBg: "#eff6ff",
    buyFg: "#1e3a8a",
    targetBg: "#dcfce7",
    targetFg: "#166534",
    stopBg: "#fee2e2",
    stopFg: "#b91c1c",
    qrBorder: "#a7f3d0",
    footerLine: "#a7f3d0",
    footerMuted: "#6b7280",
  },
  bold: {
    bg0: "#ffffff",
    bg1: "#f8fafc",
    bg2: "#f1f5f9",
    glow: "rgba(15, 23, 42, 0.08)",
    brand: "#0f172a",
    kicker: "#334155",
    text: "#0f172a",
    muted: "#64748b",
    headlineBg: "#0f172a",
    headlineFg: "#ffffff",
    buyBg: "#e2e8f0",
    buyFg: "#0f172a",
    targetBg: "#dcfce7",
    targetFg: "#14532d",
    stopBg: "#fee2e2",
    stopFg: "#991b1b",
    qrBorder: "#cbd5e1",
    footerLine: "#e2e8f0",
    footerMuted: "#64748b",
    accentBar: "#16a34a",
  },
};

function productLabel(productType?: string) {
  const value = String(productType || "").toUpperCase();
  if (value.includes("BIGTRADE") || value === "BT" || value === "BT+") return "Equity Intraday";
  return "Equity Delivery";
}

function segmentName(segment?: string) {
  if (segment === "FUT") return "Futures";
  if (segment === "OPT") return "Options";
  return "Equity";
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

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: string, min = 16) {
  let next = size;
  ctx.font = `${weight} ${next}px Arial, Helvetica, sans-serif`;
  while (next > min && ctx.measureText(text).width > maxWidth) {
    next -= 1;
    ctx.font = `${weight} ${next}px Arial, Helvetica, sans-serif`;
  }
  return next;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let lineCount = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lineCount += 1;
      if (lineCount >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lineCount < maxLines) ctx.fillText(line, x, y);
}

async function drawTradeCard(canvas: HTMLCanvasElement, data: TradeCardData, themeId: CardThemeId = "classic") {
  const theme = THEMES[themeId] || THEMES.classic;
  const width = 780;
  const height = 920;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const side = String(data.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
  const symbol = String(data.tradingSymbol || "").toUpperCase() || "SYMBOL";
  const stock = String(data.stock || "").trim() || symbol;
  const exchange = String(data.exchange || "NSE").toUpperCase();
  const market = segmentName(data.segment);
  const buyRange =
    String(data.buyRange || "").trim() ||
    (Number(data.price) > 0 ? String(data.price) : "—");
  const target1 =
    String(data.target1 || "").trim() ||
    String(data.target || "").split("/")[0]?.trim() ||
    "—";
  const target2 =
    String(data.target2 || "").trim() ||
    String(data.target || "").split("/")[1]?.trim() ||
    "—";
  const target3 =
    String(data.target3 || "").trim() ||
    String(data.target || "").split("/")[2]?.trim() ||
    "—";
  const stopLoss = String(data.stopLoss || "").trim() || "—";
  const timeFrame =
    String(data.timeFrame || "").trim() ||
    (productLabel(data.productType).includes("Intraday") ? "INTRADAY" : "DELIVERY");
  const headline =
    String(data.headline || "").trim() ||
    `${productLabel(data.productType)} ${side === "SELL" ? "Sell" : "Buy"}`;
  const notes = String(data.notes || "").trim() || "Follow the plan and manage risk.";

  const qrUrl = `${resolveApiBaseUrl()}/api/v1/order-intents/${encodeURIComponent(data.code)}/qr.png?t=${Date.now()}`;
  const qr = await loadImage(qrUrl);

  const page = ctx.createLinearGradient(0, 0, width, height);
  page.addColorStop(0, theme.bg0);
  page.addColorStop(0.55, theme.bg1);
  page.addColorStop(1, theme.bg2);
  ctx.fillStyle = page;
  ctx.fillRect(0, 0, width, height);

  if (theme.accentBar) {
    ctx.fillStyle = theme.accentBar;
    ctx.fillRect(0, 0, 10, height);
  }

  const glow = ctx.createRadialGradient(width - 40, 0, 10, width - 40, 20, 280);
  glow.addColorStop(0, theme.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, 280);

  const pad = theme.accentBar ? 42 : 36;
  const brand = "Emotionless Traders";
  ctx.textAlign = "left";
  ctx.fillStyle = theme.brand;
  fitFont(ctx, brand, width - pad * 2 - 110, 22, "800", 14);
  ctx.fillText(brand, pad, 52);
  ctx.textAlign = "right";
  ctx.fillStyle = theme.kicker;
  ctx.font = "700 11px Arial, Helvetica, sans-serif";
  ctx.fillText("TRADE IDEA", width - pad, 50);

  ctx.textAlign = "left";
  ctx.fillStyle = theme.text;
  fitFont(ctx, symbol, width - pad * 2, 36, "800", 20);
  ctx.fillText(symbol, pad, 104);
  ctx.fillStyle = theme.muted;
  fitFont(ctx, stock, width - pad * 2, 15, "500", 12);
  ctx.fillText(stock, pad, 128);

  ctx.font = "700 12px Arial, Helvetica, sans-serif";
  const sideW = Math.max(52, ctx.measureText(side).width + 20);
  roundRect(ctx, pad, 144, sideW, 24, 12);
  ctx.fillStyle = side === "SELL" ? "#dc2626" : "#16a34a";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(side, pad + sideW / 2, 160);
  ctx.textAlign = "left";
  ctx.fillStyle = theme.muted;
  ctx.font = "600 12px Arial, Helvetica, sans-serif";
  ctx.fillText(`${exchange}   ·   ${market}`, pad + sideW + 10, 161);

  roundRect(ctx, pad, 182, width - pad * 2, 42, 10);
  ctx.fillStyle = theme.headlineBg;
  ctx.fill();
  ctx.fillStyle = theme.headlineFg;
  fitFont(ctx, headline, width - pad * 2 - 28, 16, "700", 12);
  ctx.fillText(headline, pad + 14, 208);

  const gap = 8;
  const boxW = (width - pad * 2 - gap * 4) / 5;
  const boxY = 242;
  const boxes = [
    { label: "Buy Range", value: buyRange, bg: theme.buyBg, fg: theme.buyFg },
    { label: "Target 1", value: target1, bg: theme.targetBg, fg: theme.targetFg },
    { label: "Target 2", value: target2, bg: theme.targetBg, fg: theme.targetFg },
    { label: "Target 3", value: target3, bg: theme.targetBg, fg: theme.targetFg },
    { label: "Stop Loss", value: stopLoss, bg: theme.stopBg, fg: theme.stopFg },
  ];
  boxes.forEach((box, index) => {
    const x = pad + index * (boxW + gap);
    roundRect(ctx, x, boxY, boxW, 84, 12);
    ctx.fillStyle = box.bg;
    ctx.fill();
    ctx.fillStyle = theme.muted;
    ctx.font = "600 10px Arial, Helvetica, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(box.label, x + 8, boxY + 24);
    ctx.fillStyle = box.fg;
    fitFont(ctx, box.value, boxW - 16, 16, "800", 10);
    ctx.fillText(box.value, x + 8, boxY + 56);
  });

  ctx.fillStyle = theme.muted;
  ctx.font = "600 11px Arial, Helvetica, sans-serif";
  ctx.fillText("Time Frame", pad, 368);
  ctx.fillStyle = theme.text;
  fitFont(ctx, timeFrame, 280, 18, "800", 12);
  ctx.fillText(timeFrame, pad, 394);

  const qrSize = 112;
  const qrX = width - pad - qrSize;
  const qrY = 348;
  ctx.fillStyle = themeId === "night" ? "#0f172a" : "#ffffff";
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
  ctx.fill();
  ctx.strokeStyle = theme.qrBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  ctx.fillStyle = theme.footerMuted;
  ctx.font = "500 10px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Scan to open in Sharekhan", qrX + qrSize / 2, qrY + qrSize + 22);

  ctx.textAlign = "left";
  ctx.fillStyle = theme.muted;
  ctx.font = "600 11px Arial, Helvetica, sans-serif";
  ctx.fillText("Notes", pad, 520);
  ctx.fillStyle = theme.text;
  ctx.font = "500 14px Arial, Helvetica, sans-serif";
  wrapText(ctx, notes, pad, 546, width - pad * 2, 20, 4);

  ctx.strokeStyle = theme.footerLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, height - 56);
  ctx.lineTo(width - pad, height - 56);
  ctx.stroke();
  ctx.fillStyle = theme.footerMuted;
  ctx.font = "500 11px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Trade Responsibly   ·   Not a recommendation", pad, height - 30);
  ctx.textAlign = "right";
  ctx.fillStyle = theme.brand;
  fitFont(ctx, brand, 260, 13, "800", 10);
  ctx.fillText(brand, width - pad, height - 30);
}

type Props = {
  data: TradeCardData;
  theme?: CardThemeId;
  onClose?: () => void;
  variant?: "panel" | "toolbar";
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
    anchor.download = `${data.tradingSymbol || "trade"}-${data.code}.png`;
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
          text: `Scan QR to open this Sharekhan order.\n${data.shortUrl}`,
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

  if (variant === "toolbar") {
    return (
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
          <button className="sk-btn sk-btn-ghost" type="button" disabled={busy || !previewUrl} onClick={downloadImage}>
            <ActionIcon name="download" /> Download PNG
          </button>
          <button className="sk-btn sk-btn-ghost" type="button" disabled={busy || !previewUrl} onClick={copyImage}>
            <ActionIcon name="copy" /> Copy image
          </button>
          <button className="sk-btn sk-btn-ghost" type="button" disabled={busy || !previewUrl} onClick={shareImage}>
            <ActionIcon name="share" /> Share
          </button>
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    );
  }

  return (
    <div className="trade-share-card">
      <div className="trade-share-card-head">
        <div>
          <strong>Share image with QR</strong>
          <p className="helper" style={{ marginTop: 4 }}>
            Send this on WhatsApp. The QR opens the order link, then the Sharekhan app.
          </p>
        </div>
        {onClose ? (
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="trade-share-preview">
        {busy && !previewUrl ? <p>Building card…</p> : null}
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Trade share card" />
        ) : null}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <div className="cta-row" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
        <button className="btn btn-primary" type="button" disabled={busy || !previewUrl} onClick={shareImage}>
          Share image
        </button>
        <button className="btn btn-secondary" type="button" disabled={busy || !previewUrl} onClick={downloadImage}>
          Download PNG
        </button>
        <button className="btn btn-secondary" type="button" disabled={busy || !previewUrl} onClick={copyImage}>
          Copy image
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => navigator.clipboard.writeText(data.shortUrl)}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}
