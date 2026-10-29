"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveApiBaseUrl } from "@/lib/api";

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

async function drawTradeCard(canvas: HTMLCanvasElement, data: TradeCardData) {
  const width = 900;
  const height = 1120;
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
  page.addColorStop(0, "#fffdfb");
  page.addColorStop(0.55, "#fff6ee");
  page.addColorStop(1, "#ffefe3");
  ctx.fillStyle = page;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width - 40, 0, 10, width - 40, 20, 380);
  glow.addColorStop(0, "rgba(255, 168, 92, 0.38)");
  glow.addColorStop(1, "rgba(255, 168, 92, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, 360);

  const pad = 52;
  ctx.textAlign = "left";
  ctx.fillStyle = "#e85d04";
  ctx.font = "800 34px Arial, Helvetica, sans-serif";
  ctx.fillText("Sharekhan", pad, 78);
  ctx.textAlign = "right";
  ctx.fillStyle = "#c2410c";
  ctx.font = "700 15px Arial, Helvetica, sans-serif";
  ctx.fillText("TRADE IDEA", width - pad, 74);

  ctx.textAlign = "left";
  ctx.fillStyle = "#111827";
  fitFont(ctx, symbol, width - pad * 2, 68, "800", 32);
  ctx.fillText(symbol, pad, 168);
  ctx.fillStyle = "#6b7280";
  ctx.font = "500 24px Arial, Helvetica, sans-serif";
  fitFont(ctx, stock, width - pad * 2, 24, "500", 16);
  ctx.fillText(stock, pad, 210);

  ctx.font = "700 16px Arial, Helvetica, sans-serif";
  const sideW = Math.max(64, ctx.measureText(side).width + 28);
  roundRect(ctx, pad, 232, sideW, 32, 16);
  ctx.fillStyle = side === "SELL" ? "#dc2626" : "#16a34a";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(side, pad + sideW / 2, 254);
  ctx.textAlign = "left";
  ctx.fillStyle = "#6b7280";
  ctx.font = "600 18px Arial, Helvetica, sans-serif";
  ctx.fillText(`${exchange}   ·   ${market}`, pad + sideW + 14, 255);

  roundRect(ctx, pad, 286, width - pad * 2, 62, 14);
  ctx.fillStyle = "#fff4dc";
  ctx.fill();
  ctx.fillStyle = "#92400e";
  ctx.font = "700 26px Arial, Helvetica, sans-serif";
  fitFont(ctx, headline, width - pad * 2 - 40, 26, "700", 16);
  ctx.fillText(headline, pad + 20, 326);

  const gap = 12;
  const boxW = (width - pad * 2 - gap * 4) / 5;
  const boxY = 372;
  const boxes = [
    { label: "Buy Range", value: buyRange, bg: "#eef5ff", fg: "#0f172a" },
    { label: "Target 1", value: target1, bg: "#e8f8ee", fg: "#15803d" },
    { label: "Target 2", value: target2, bg: "#e8f8ee", fg: "#15803d" },
    { label: "Target 3", value: target3, bg: "#e8f8ee", fg: "#15803d" },
    { label: "Stop Loss", value: stopLoss, bg: "#fff0f0", fg: "#dc2626" },
  ];
  boxes.forEach((box, index) => {
    const x = pad + index * (boxW + gap);
    roundRect(ctx, x, boxY, boxW, 124, 16);
    ctx.fillStyle = box.bg;
    ctx.fill();
    ctx.fillStyle = "#64748b";
    ctx.font = "600 14px Arial, Helvetica, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(box.label, x + 12, boxY + 36);
    ctx.fillStyle = box.fg;
    fitFont(ctx, box.value, boxW - 24, 24, "800", 12);
    ctx.fillText(box.value, x + 12, boxY + 84);
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "600 16px Arial, Helvetica, sans-serif";
  ctx.fillText("Time Frame", pad, 556);
  ctx.fillStyle = "#111827";
  fitFont(ctx, timeFrame, 360, 30, "800", 16);
  ctx.fillText(timeFrame, pad, 598);

  const qrSize = 168;
  const qrX = width - pad - qrSize;
  const qrY = 528;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 16);
  ctx.fill();
  ctx.strokeStyle = "#f3e4d6";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "500 13px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Scan to open in Sharekhan", qrX + qrSize / 2, qrY + qrSize + 32);

  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "600 16px Arial, Helvetica, sans-serif";
  ctx.fillText("Notes", pad, 760);
  ctx.fillStyle = "#1f2937";
  ctx.font = "500 22px Arial, Helvetica, sans-serif";
  wrapText(ctx, notes, pad, 798, width - pad * 2, 30, 3);

  ctx.strokeStyle = "#f3e6dc";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, height - 78);
  ctx.lineTo(width - pad, height - 78);
  ctx.stroke();
  ctx.fillStyle = "#9ca3af";
  ctx.font = "500 16px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Trade Responsibly   ·   Not a recommendation", pad, height - 42);
  ctx.textAlign = "right";
  ctx.fillStyle = "#e85d04";
  ctx.font = "800 18px Arial, Helvetica, sans-serif";
  ctx.fillText("Sharekhan", width - pad, height - 42);
}

type Props = {
  data: TradeCardData;
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

export default function TradeShareCard({ data, onClose, variant = "panel" }: Props) {
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
      await drawTradeCard(canvasRef.current, data);
      setPreviewUrl(canvasRef.current.toDataURL("image/png"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build share image");
    } finally {
      setBusy(false);
    }
  }, [data]);

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
