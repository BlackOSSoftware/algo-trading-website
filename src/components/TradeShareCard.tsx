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

function productLabel(productType?: string, segment?: string) {
  const seg = String(segment || "").toUpperCase();
  if (seg === "FUT") return "Futures";
  if (seg === "OPT") return "Options";
  const value = String(productType || "").toUpperCase();
  if (value.includes("BIGTRADE") || value === "BT" || value === "BT+") return "Equity Intraday";
  return "Equity Delivery";
}

function segmentName(segment?: string) {
  if (segment === "FUT") return "Futures";
  if (segment === "OPT") return "Options";
  return "Equity";
}

function optionKind(symbol?: string, segment?: string) {
  if (String(segment || "").toUpperCase() !== "OPT") return "";
  const s = String(symbol || "").toUpperCase();
  if (/\bCE\b/.test(s) || s.endsWith("CE")) return "Call (CE)";
  if (/\bPE\b/.test(s) || s.endsWith("PE")) return "Put (PE)";
  return "Options";
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

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: string,
  min = 16
) {
  let next = size;
  ctx.font = `${weight} ${next}px Arial, Helvetica, sans-serif`;
  while (next > min && ctx.measureText(text).width > maxWidth) {
    next -= 1;
    ctx.font = `${weight} ${next}px Arial, Helvetica, sans-serif`;
  }
  return next;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
) {
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

export async function drawTradeCard(
  canvas: HTMLCanvasElement,
  data: TradeCardData,
  themeId: CardThemeId = "classic"
) {
  const theme = THEMES[themeId] || THEMES.classic;
  const width = 780;
  const height = 980;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const side = String(data.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
  const symbol = String(data.tradingSymbol || "").toUpperCase() || "SYMBOL";
  const stock = String(data.stock || "").trim() || symbol;
  const exchange = String(data.exchange || "NSE").toUpperCase();
  const market = segmentName(data.segment);
  const kind = optionKind(symbol, data.segment);
  const marketLine = kind ? `${exchange}  ·  ${market}  ·  ${kind}` : `${exchange}  ·  ${market}`;
  const buyRange =
    String(data.buyRange || "").trim() ||
    (Number(data.price) > 0 ? String(data.price) : "—");
  const quantity = String(data.quantity ?? "1").trim() || "1";
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
    (productLabel(data.productType, data.segment).includes("Intraday") ? "INTRADAY" : "DELIVERY");
  const headline =
    String(data.headline || "").trim() ||
    `${productLabel(data.productType, data.segment)} ${side === "SELL" ? "Sell" : "Buy"}`;
  const notes = String(data.notes || "").trim() || "Follow the plan and manage risk.";

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
  fitFont(ctx, brand, width - pad * 2 - 110, 26, "800", 16);
  ctx.fillText(brand, pad, 54);
  ctx.textAlign = "right";
  ctx.fillStyle = theme.kicker;
  ctx.font = "700 13px Arial, Helvetica, sans-serif";
  ctx.fillText("TRADE IDEA", width - pad, 52);

  ctx.textAlign = "left";
  ctx.fillStyle = theme.text;
  fitFont(ctx, symbol, width - pad * 2, 42, "800", 22);
  ctx.fillText(symbol, pad, 110);
  ctx.fillStyle = theme.muted;
  fitFont(ctx, stock, width - pad * 2, 17, "500", 13);
  ctx.fillText(stock, pad, 136);

  ctx.font = "700 13px Arial, Helvetica, sans-serif";
  const sideW = Math.max(58, ctx.measureText(side).width + 24);
  roundRect(ctx, pad, 152, sideW, 28, 14);
  ctx.fillStyle = side === "SELL" ? "#dc2626" : "#16a34a";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(side, pad + sideW / 2, 171);
  ctx.textAlign = "left";
  ctx.fillStyle = theme.muted;
  ctx.font = "700 14px Arial, Helvetica, sans-serif";
  ctx.fillText(marketLine, pad + sideW + 12, 172);

  roundRect(ctx, pad, 196, width - pad * 2, 48, 12);
  ctx.fillStyle = theme.headlineBg;
  ctx.fill();
  ctx.fillStyle = theme.headlineFg;
  fitFont(ctx, headline, width - pad * 2 - 28, 18, "700", 13);
  ctx.fillText(headline, pad + 14, 226);

  // Stats: 3 on top row, 3 on bottom — large readable values
  const gap = 12;
  const boxW = (width - pad * 2 - gap * 2) / 3;
  const boxH = 108;
  const row1Y = 264;
  const row2Y = row1Y + boxH + gap;
  const boxes = [
    { label: "Buy Range", value: buyRange, bg: theme.buyBg, fg: theme.buyFg, row: 0, col: 0 },
    { label: "Target 1", value: target1, bg: theme.targetBg, fg: theme.targetFg, row: 0, col: 1 },
    { label: "Target 2", value: target2, bg: theme.targetBg, fg: theme.targetFg, row: 0, col: 2 },
    { label: "Target 3", value: target3, bg: theme.targetBg, fg: theme.targetFg, row: 1, col: 0 },
    { label: "Stop Loss", value: stopLoss, bg: theme.stopBg, fg: theme.stopFg, row: 1, col: 1 },
    { label: "Quantity", value: quantity, bg: theme.buyBg, fg: theme.buyFg, row: 1, col: 2 },
  ];
  boxes.forEach((box) => {
    const x = pad + box.col * (boxW + gap);
    const y = box.row === 0 ? row1Y : row2Y;
    roundRect(ctx, x, y, boxW, boxH, 14);
    ctx.fillStyle = box.bg;
    ctx.fill();
    ctx.fillStyle = theme.muted;
    ctx.font = "700 14px Arial, Helvetica, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(box.label, x + 14, y + 32);
    ctx.fillStyle = box.fg;
    fitFont(ctx, box.value, boxW - 28, 30, "800", 18);
    ctx.fillText(box.value, x + 14, y + 74);
  });

  const metaY = row2Y + boxH + 36;
  ctx.fillStyle = theme.muted;
  ctx.font = "700 13px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Time Frame", pad, metaY);
  ctx.fillStyle = theme.text;
  fitFont(ctx, timeFrame, 280, 24, "800", 16);
  ctx.fillText(timeFrame, pad, metaY + 32);

  const qrSize = 128;
  const qrX = width - pad - qrSize;
  const qrY = metaY - 8;
  ctx.fillStyle = themeId === "night" ? "#0f172a" : "#ffffff";
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14);
  ctx.fill();
  ctx.strokeStyle = theme.qrBorder;
  ctx.lineWidth = 1.5;
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14);
  ctx.stroke();

  if (data.code) {
    try {
      const qrUrl = `${resolveApiBaseUrl()}/api/v1/order-intents/${encodeURIComponent(data.code)}/qr.png?t=${Date.now()}`;
      const qr = await loadImage(qrUrl);
      ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
    } catch {
      ctx.fillStyle = theme.muted;
      ctx.font = "600 14px Arial, Helvetica, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("QR", qrX + qrSize / 2, qrY + qrSize / 2);
    }
  } else {
    ctx.fillStyle = theme.muted;
    ctx.font = "600 13px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QR after", qrX + qrSize / 2, qrY + qrSize / 2 - 8);
    ctx.fillText("generate", qrX + qrSize / 2, qrY + qrSize / 2 + 12);
  }
  ctx.fillStyle = theme.footerMuted;
  ctx.font = "500 12px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Scan to open in Sharekhan", qrX + qrSize / 2, qrY + qrSize + 28);

  const notesY = qrY + qrSize + 56;
  ctx.textAlign = "left";
  ctx.fillStyle = theme.muted;
  ctx.font = "700 13px Arial, Helvetica, sans-serif";
  ctx.fillText("Notes", pad, notesY);
  ctx.fillStyle = theme.text;
  ctx.font = "500 16px Arial, Helvetica, sans-serif";
  wrapText(ctx, notes, pad, notesY + 28, width - pad * 2, 24, 3);

  ctx.strokeStyle = theme.footerLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, height - 56);
  ctx.lineTo(width - pad, height - 56);
  ctx.stroke();
  ctx.fillStyle = theme.footerMuted;
  ctx.font = "500 12px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Trade Responsibly   ·   Not a recommendation", pad, height - 28);
  ctx.textAlign = "right";
  ctx.fillStyle = theme.brand;
  fitFont(ctx, brand, 280, 14, "800", 11);
  ctx.fillText(brand, width - pad, height - 28);
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
      {variant === "preview" ? (
        toolbar
      ) : (
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
