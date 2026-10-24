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
  stopLoss?: string;
  timeFrame?: string;
  headline?: string;
};

function productLabel(productType?: string) {
  const value = String(productType || "").toUpperCase();
  if (value.includes("BIGTRADE") || value === "BT" || value === "BT+") return "Equity Intraday";
  return "Equity Delivery";
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

async function drawTradeCard(canvas: HTMLCanvasElement, data: TradeCardData) {
  const width = 900;
  const height = 1180;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const side = String(data.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
  const sideColor = side === "SELL" ? "#c62828" : "#2e7d32";
  const symbol = String(data.tradingSymbol || "").toUpperCase() || "SYMBOL";
  const buyRange =
    String(data.buyRange || "").trim() ||
    (Number(data.price) > 0 ? String(data.price) : "MARKET");
  const target = String(data.target || "").trim() || "—";
  const stopLoss = String(data.stopLoss || "").trim() || "—";
  const timeFrame =
    String(data.timeFrame || "").trim() ||
    (productLabel(data.productType).includes("Intraday") ? "INTRADAY" : "DELIVERY");
  const headline =
    String(data.headline || "").trim() ||
    `${productLabel(data.productType)} ${side === "SELL" ? "Sell" : "Buy"}`;

  const qrUrl = `${resolveApiBaseUrl()}/api/v1/order-intents/${encodeURIComponent(data.code)}/qr.png?t=${Date.now()}`;
  const qr = await loadImage(qrUrl);

  // Soft peach page background
  const page = ctx.createLinearGradient(0, 0, 0, height);
  page.addColorStop(0, "#fff7f0");
  page.addColorStop(1, "#ffe8d6");
  ctx.fillStyle = page;
  ctx.fillRect(0, 0, width, height);

  // Brand
  ctx.fillStyle = "#0b2c5f";
  ctx.font = "700 34px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Emotionless Traders", width / 2, 78);
  ctx.fillStyle = "#3d6ea8";
  ctx.font = "500 20px Arial, Helvetica, sans-serif";
  ctx.fillText("Sharekhan order card", width / 2, 110);

  // Card
  const cardX = 70;
  const cardY = 150;
  const cardW = width - 140;
  const cardH = 860;
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, "#fff8f2");
  cardGrad.addColorStop(1, "#ffe3cc");
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(180, 110, 60, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Headline with colored side
  ctx.textAlign = "left";
  ctx.font = "600 28px Arial, Helvetica, sans-serif";
  const prefix = headline.replace(/\s+(Buy|Sell)$/i, "").trim() || productLabel(data.productType);
  ctx.fillStyle = "#222";
  ctx.fillText(prefix, cardX + 48, cardY + 70);
  const prefixWidth = ctx.measureText(prefix + " ").width;
  ctx.fillStyle = sideColor;
  ctx.font = "700 28px Arial, Helvetica, sans-serif";
  ctx.fillText(side === "SELL" ? "Sell" : "Buy", cardX + 48 + prefixWidth, cardY + 70);

  // Symbol
  ctx.fillStyle = "#111";
  ctx.font = "800 64px Arial, Helvetica, sans-serif";
  ctx.fillText(symbol, cardX + 48, cardY + 150);
  ctx.strokeStyle = "#e87722";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cardX + 48, cardY + 168);
  ctx.lineTo(cardX + 48 + Math.min(280, ctx.measureText(symbol).width), cardY + 168);
  ctx.stroke();

  // QR on the right
  const qrSize = 220;
  const qrX = cardX + cardW - qrSize - 56;
  const qrY = cardY + 48;
  ctx.fillStyle = "#fff";
  roundRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 18);
  ctx.fill();
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

  // Rows
  const rows: Array<[string, string]> = [
    ["BUY RANGE", buyRange],
    ["TARGET", target],
    ["SL", stopLoss],
    ["TIME FRAME", timeFrame],
  ];
  if (data.quantity) rows.splice(1, 0, ["QUANTITY", String(data.quantity)]);

  let rowY = cardY + 320;
  for (const [label, value] of rows) {
    ctx.fillStyle = "#8a8a8a";
    ctx.font = "600 22px Arial, Helvetica, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, cardX + 48, rowY);
    ctx.fillStyle = "#111";
    ctx.font = "700 34px Arial, Helvetica, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value, cardX + cardW - 48, rowY);
    rowY += 28;
    ctx.strokeStyle = "rgba(120, 80, 40, 0.28)";
    ctx.setLineDash([7, 8]);
    ctx.beginPath();
    ctx.moveTo(cardX + 48, rowY);
    ctx.lineTo(cardX + cardW - 48, rowY);
    ctx.stroke();
    ctx.setLineDash([]);
    rowY += 70;
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "#9a9a9a";
  ctx.font = "500 18px Arial, Helvetica, sans-serif";
  ctx.fillText(formatStamp(), cardX + cardW - 48, cardY + cardH - 36);

  // Disclaimer
  ctx.textAlign = "center";
  ctx.fillStyle = "#7a7a7a";
  ctx.font = "400 16px Arial, Helvetica, sans-serif";
  const disclaimer =
    "* Investments in securities market are subject to market risk. Scan the QR to open this order in Sharekhan.";
  const maxW = width - 120;
  const words = disclaimer.split(" ");
  let line = "";
  let dy = cardY + cardH + 48;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, width / 2, dy);
      line = word;
      dy += 24;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, width / 2, dy);
}

type Props = {
  data: TradeCardData;
  onClose?: () => void;
};

export default function TradeShareCard({ data, onClose }: Props) {
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

  return (
    <div className="trade-share-card">
      <div className="trade-share-card-head">
        <div>
          <strong>Share image with QR</strong>
          <p className="helper" style={{ marginTop: 4 }}>
            WhatsApp pe bhejo. QR scan se order link khulega, phir Sharekhan app.
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
