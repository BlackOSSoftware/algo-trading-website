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
  expiry?: string;
  strike?: string;
  optionType?: string;
  leg2?: {
    tradingSymbol: string;
    side: string;
    quantity?: string | number;
    price?: string | number;
    buyRange?: string;
    stock?: string;
    exchange?: string;
    segment?: string;
    expiry?: string;
    strike?: string;
    optionType?: string;
  };
  approxMargin?: string;
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
  text: string;
  muted: string;
  call: string;
  underline: string;
  rowLine: string;
};

const THEME_COLORS: Record<CardThemeId, ThemeColors> = {
  classic: {
    page0: "#fffaf5",
    page1: "#ffe8d6",
    title: "#1a365d",
    subtitle: "#718096",
    card: "#fff3e8",
    cardBorder: "#f0dcc8",
    text: "#111827",
    muted: "#a0aec0",
    call: "#1f2937",
    underline: "#ed8936",
    rowLine: "#e0d0c0",
  },
  night: {
    page0: "#0b1220",
    page1: "#1e293b",
    title: "#e2e8f0",
    subtitle: "#94a3b8",
    card: "#0f172a",
    cardBorder: "#334155",
    text: "#f8fafc",
    muted: "#64748b",
    call: "#e2e8f0",
    underline: "#38bdf8",
    rowLine: "#334155",
  },
  mint: {
    page0: "#f0fdf4",
    page1: "#dcfce7",
    title: "#064e3b",
    subtitle: "#047857",
    card: "#ecfdf5",
    cardBorder: "#bbf7d0",
    text: "#064e3b",
    muted: "#6b7280",
    call: "#065f46",
    underline: "#10b981",
    rowLine: "#d1d5db",
  },
  bold: {
    page0: "#f8fafc",
    page1: "#e2e8f0",
    title: "#0f172a",
    subtitle: "#475569",
    card: "#f1f5f9",
    cardBorder: "#cbd5e1",
    text: "#0f172a",
    muted: "#64748b",
    call: "#0f172a",
    underline: "#16a34a",
    rowLine: "#e2e8f0",
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

type FnoInfo = {
  segment: "EQ" | "FUT" | "OPT";
  underlying: string;
  expiryLabel: string;
  strike: string;
  optionType: string; // CE | PE | ""
  typeLabel: string; // FUTURES | OPTIONS CE | EQUITY
};

function parseFnoFromSymbol(symbol: string): Partial<FnoInfo> {
  const s = String(symbol || "").toUpperCase().replace(/[\s_-]+/g, "");
  const months = "JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC";
  const fut = s.match(new RegExp(`^([A-Z]+)(\\d{2})(${months})FUT$`));
  if (fut) {
    return {
      segment: "FUT",
      underlying: fut[1],
      expiryLabel: `${fut[2]} ${fut[3]}`,
      typeLabel: "FUTURES",
    };
  }
  const opt = s.match(new RegExp(`^([A-Z]+)(\\d{2})(${months})(\\d+(?:\\.\\d+)?)(CE|PE)$`));
  if (opt) {
    return {
      segment: "OPT",
      underlying: opt[1],
      expiryLabel: `${opt[2]} ${opt[3]}`,
      strike: opt[4],
      optionType: opt[5],
      typeLabel: `OPTIONS ${opt[5]}`,
    };
  }
  return {};
}

function formatExpiryLabel(raw?: string) {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return "";
  // Already like 26NOV / 26 NOV
  const m1 = value.match(/^(\d{2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/);
  if (m1) return `${m1[1]} ${m1[2]}`;
  // ISO 2026-11-25
  const m2 = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const mon = months[Number(m2[2]) - 1] || "";
    return `${m2[1].slice(-2)} ${mon}`.trim();
  }
  return value;
}

function resolveFno(data: TradeCardData): FnoInfo {
  const parsed = parseFnoFromSymbol(data.tradingSymbol || "");
  const segRaw = String(data.segment || parsed.segment || "EQ").toUpperCase();
  const segment = segRaw === "FUT" || segRaw === "OPT" ? segRaw : "EQ";
  const optionType = (
    String(data.optionType || parsed.optionType || "").toUpperCase() ||
    (String(data.tradingSymbol || "").toUpperCase().endsWith("CE")
      ? "CE"
      : String(data.tradingSymbol || "").toUpperCase().endsWith("PE")
        ? "PE"
        : "")
  ).replace(/[^A-Z]/g, "");
  const strike =
    String(data.strike || parsed.strike || "")
      .trim()
      .replace(/\.0+$/, "") || "";
  const expiryLabel =
    formatExpiryLabel(data.expiry) || String(parsed.expiryLabel || "").trim();
  const underlying =
    String(parsed.underlying || "").trim() ||
    String(data.stock || "")
      .trim()
      .toUpperCase()
      .replace(/-EQ$/i, "") ||
    String(data.tradingSymbol || "")
      .toUpperCase()
      .replace(/\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC).*$/i, "")
      .replace(/-EQ$/i, "") ||
    "SYMBOL";

  let typeLabel = "EQUITY";
  if (segment === "FUT") typeLabel = "FUTURES";
  if (segment === "OPT") typeLabel = optionType ? `OPTIONS ${optionType}` : "OPTIONS";

  return { segment, underlying, expiryLabel, strike, optionType, typeLabel };
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

const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

function setFont(ctx: CanvasRenderingContext2D, weight: string, size: number) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: string,
  min = 18
) {
  let next = size;
  setFont(ctx, weight, next);
  while (next > min && ctx.measureText(text).width > maxWidth) {
    next -= 1;
    setFont(ctx, weight, next);
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
  const fno = resolveFno(data);
  if (fno.segment === "FUT" || fno.segment === "OPT") return fno.underlying;
  const stock = String(data.stock || "").trim();
  const symbol = String(data.tradingSymbol || "").trim().toUpperCase();
  if (stock && stock.length <= 18 && !/\d{2}(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i.test(stock)) {
    return stock.toUpperCase().replace(/-EQ$/i, "");
  }
  return symbol.replace(/-EQ$/i, "") || "SYMBOL";
}

function dashedLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

async function drawSpreadCard(
  canvas: HTMLCanvasElement,
  data: TradeCardData,
  themeId: CardThemeId
) {
  const theme = THEME_COLORS[themeId] || THEME_COLORS.classic;
  const width = 720;
  const headerH = 96;
  const footerH = 56;
  const cardH = 640;
  const height = headerH + cardH + footerH + 24;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const page = ctx.createLinearGradient(0, 0, 0, height);
  page.addColorStop(0, theme.page0);
  page.addColorStop(1, theme.page1);
  ctx.fillStyle = page;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.fillStyle = theme.title;
  setFont(ctx, "700", 32);
  ctx.fillText("Emotionless Traders", width / 2, 44);
  ctx.fillStyle = theme.subtitle;
  setFont(ctx, "400", 17);
  ctx.fillText("2-leg Sharekhan order card", width / 2, 72);

  const cardX = 40;
  const cardY = headerH;
  const cardW = width - 80;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.10)";
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

  const left = cardX + 28;
  const right = cardX + cardW - 28;
  const qrSize = 112;
  const qrX = right - qrSize;
  const qrY = cardY + 24;
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  if (data.code) {
    try {
      const qrUrl = `${resolveApiBaseUrl()}/api/v1/order-intents/${encodeURIComponent(data.code)}/qr.png?t=${Date.now()}`;
      const qr = await loadImage(qrUrl);
      ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
    } catch {
      ctx.fillStyle = theme.muted;
      setFont(ctx, "600", 14);
      ctx.textAlign = "center";
      ctx.fillText("QR", qrX + qrSize / 2, qrY + qrSize / 2);
    }
  }

  const title = String(data.headline || data.stock || "2-leg spread").trim();
  const titleMax = qrX - left - 24;
  ctx.textAlign = "left";
  ctx.fillStyle = theme.text;
  fitFont(ctx, title, titleMax, 34, "800", 20);
  ctx.fillText(title, left, cardY + 58);
  const titleW = Math.min(ctx.measureText(title).width, titleMax);
  ctx.strokeStyle = theme.underline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left, cardY + 70);
  ctx.lineTo(left + Math.max(titleW * 0.7, 90), cardY + 70);
  ctx.stroke();

  const timeFrame = String(data.timeFrame || "INTRADAY").toUpperCase();
  const margin = String(data.approxMargin || "").trim();
  const meta = [String(data.exchange || "NFO").toUpperCase(), "OPTIONS", timeFrame, margin ? `Margin ₹${margin}` : ""]
    .filter(Boolean)
    .join("   ·   ");
  ctx.fillStyle = themeId === "classic" ? "#c2410c" : theme.subtitle;
  setFont(ctx, "700", 15);
  fitFont(ctx, meta, titleMax, 15, "700", 12);
  ctx.fillText(meta, left, cardY + 104);

  const legs = [
    {
      side: String(data.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
      symbol: data.tradingSymbol,
      strike: data.strike,
      optionType: data.optionType,
      expiry: data.expiry,
      quantity: data.quantity,
      range: data.buyRange,
    },
    {
      side: String(data.leg2?.side || "SELL").toUpperCase() === "SELL" ? "SELL" : "BUY",
      symbol: data.leg2?.tradingSymbol,
      strike: data.leg2?.strike,
      optionType: data.leg2?.optionType,
      expiry: data.leg2?.expiry || data.expiry,
      quantity: data.leg2?.quantity,
      range: data.leg2?.buyRange,
    },
  ];

  legs.forEach((leg, index) => {
    const y = cardY + 150 + index * 220;
    const sell = leg.side === "SELL";
    roundRect(ctx, left, y, right - left, 200, 16);
    ctx.fillStyle = sell ? "#fff5f5" : "#f0fdf4";
    ctx.fill();
    ctx.strokeStyle = sell ? "#fecaca" : "#bbf7d0";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = sell ? "#b91c1c" : "#166534";
    setFont(ctx, "800", 16);
    ctx.textAlign = "left";
    ctx.fillText(`LEG ${index + 1}  ·  ${leg.side}`, left + 18, y + 32);

    ctx.fillStyle = theme.text;
    const symbol = String(leg.symbol || "Select contract");
    fitFont(ctx, symbol, right - left - 36, 28, "800", 16);
    ctx.fillText(symbol, left + 18, y + 72);

    const fno = resolveFno({
      ...data,
      tradingSymbol: symbol,
      strike: leg.strike,
      optionType: leg.optionType,
      expiry: leg.expiry,
      segment: "OPT",
    });
    const contract = [fno.strike, fno.optionType].filter(Boolean).join(" ");
    const detail = [contract, fno.expiryLabel ? `Exp ${fno.expiryLabel}` : ""].filter(Boolean).join("   ·   ") || "Option";
    ctx.fillStyle = "#475569";
    setFont(ctx, "600", 16);
    ctx.fillText(detail, left + 18, y + 104);

    ctx.fillStyle = "#64748b";
    setFont(ctx, "600", 13);
    ctx.fillText(sell ? "SELL RANGE" : "BUY RANGE", left + 18, y + 142);
    ctx.fillText("QUANTITY", left + 250, y + 142);
    ctx.fillStyle = theme.text;
    setFont(ctx, "800", 26);
    ctx.fillText(String(leg.range || "—"), left + 18, y + 174);
    ctx.fillText(String(leg.quantity || "—"), left + 250, y + 174);
  });

  ctx.textAlign = "right";
  ctx.fillStyle = theme.muted;
  setFont(ctx, "400", 14);
  ctx.fillText(formatStamp(), right, cardY + cardH - 18);

  ctx.textAlign = "left";
  ctx.fillStyle = theme.muted;
  setFont(ctx, "400", 12);
  ctx.fillText(
    "* Investments in securities market are subject to market risk. Scan the QR to open this order in Sharekhan.",
    48,
    height - 22
  );
}

/**
 * Exact Emotionless Traders / Sharekhan order-card layout (WhatsApp reference).
 * Keeps Target 1 / 2 / 3 as separate rows when filled.
 */
export async function drawTradeCard(
  canvas: HTMLCanvasElement,
  data: TradeCardData,
  themeId: CardThemeId = "classic"
) {
  if (data.leg2) {
    await drawSpreadCard(canvas, data, themeId);
    return;
  }
  const theme = THEME_COLORS[themeId] || THEME_COLORS.classic;

  const t1 =
    String(data.target1 || "").trim() || String(data.target || "").split("/")[0]?.trim() || "";
  const t2 =
    String(data.target2 || "").trim() || String(data.target || "").split("/")[1]?.trim() || "";
  const t3 =
    String(data.target3 || "").trim() || String(data.target || "").split("/")[2]?.trim() || "";

  const fno = resolveFno(data);
  const side = String(data.side || "BUY").toUpperCase() === "SELL" ? "Sell" : "Buy";
  const sideColor = side === "Sell" ? "#c53030" : "#2f855a";
  const name = displayName(data);
  const call =
    String(data.headline || "").trim() ||
    `${productLabel(data.productType, data.segment)} idea`;
  const rangeFromPrice =
    Number(data.price) > 0
      ? String(data.price)
      : String(data.price || "").trim() === "0"
        ? "Market"
        : String(data.price || "").trim();
  const buyRange = String(data.buyRange || "").trim() || rangeFromPrice || "—";
  const quantity = String(data.quantity ?? "1").trim() || "1";
  const stopLoss = String(data.stopLoss || "").trim() || "—";
  const timeFrame = (
    String(data.timeFrame || "").trim() ||
    (String(data.productType || "").toUpperCase().includes("INVEST") ? "DELIVERY" : "INTRADAY")
  ).toUpperCase();
  const exchange = String(data.exchange || "NSE").toUpperCase();
  const instrument = fno.typeLabel;
  const rangeLabel = side === "Sell" ? "SELL RANGE" : "BUY RANGE";

  const rows: Array<{ label: string; value: string }> = [];
  if (!data.leg2) {
    rows.push({ label: "TYPE", value: instrument });
    if (fno.segment === "FUT" || fno.segment === "OPT") rows.push({ label: "EXPIRY", value: fno.expiryLabel || "—" });
    if (fno.segment === "OPT") rows.push({ label: "STRIKE", value: fno.strike || "—" });
  }
  rows.push({ label: rangeLabel, value: buyRange });
  rows.push({ label: "QUANTITY", value: quantity });
  rows.push({ label: "TARGET 1", value: t1 || "—" });
  if (t2) rows.push({ label: "TARGET 2", value: t2 });
  if (t3) rows.push({ label: "TARGET 3", value: t3 });
  rows.push({ label: "SL", value: stopLoss });
  rows.push({ label: "TIME FRAME", value: timeFrame });

  // Taller card when extra targets are present
  const width = 720;
  const headerH = 96;
  const footerH = 56;
  const topBlock = 200;
  const rowH = 78;
  const stampH = 48;
  const cardH = topBlock + rows.length * rowH + stampH;
  const height = headerH + cardH + footerH + 24;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const page = ctx.createLinearGradient(0, 0, 0, height);
  page.addColorStop(0, theme.page0);
  page.addColorStop(1, theme.page1);
  ctx.fillStyle = page;
  ctx.fillRect(0, 0, width, height);

  // Brand header (outside card) — centered
  ctx.textAlign = "center";
  ctx.fillStyle = theme.title;
  setFont(ctx, "700", 32);
  ctx.fillText("Emotionless Traders", width / 2, 44);
  ctx.fillStyle = theme.subtitle;
  setFont(ctx, "400", 17);
  ctx.fillText("Sharekhan order card", width / 2, 72);

  const cardX = 40;
  const cardY = headerH;
  const cardW = width - 80;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.10)";
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

  const padX = 36;
  const left = cardX + padX;
  const right = cardX + cardW - padX;
  const innerW = cardW - padX * 2;

  // QR top-right
  const qrSize = 132;
  const qrX = right - qrSize;
  const qrY = cardY + 28;
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 14);
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (data.code) {
    try {
      const qrUrl = `${resolveApiBaseUrl()}/api/v1/order-intents/${encodeURIComponent(data.code)}/qr.png?t=${Date.now()}`;
      const qr = await loadImage(qrUrl);
      ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
    } catch {
      ctx.fillStyle = theme.muted;
      setFont(ctx, "600", 14);
      ctx.textAlign = "center";
      ctx.fillText("QR", qrX + qrSize / 2, qrY + qrSize / 2);
    }
  } else {
    ctx.fillStyle = theme.muted;
    setFont(ctx, "600", 13);
    ctx.textAlign = "center";
    ctx.fillText("QR after", qrX + qrSize / 2, qrY + qrSize / 2 - 8);
    ctx.fillText("generate", qrX + qrSize / 2, qrY + qrSize / 2 + 12);
  }

  // Call + Buy/Sell
  const textMax = innerW - qrSize - 28;
  ctx.textAlign = "left";
  ctx.fillStyle = theme.call;
  fitFont(ctx, call, Math.max(100, textMax - 70), 20, "400", 14);
  const callW = ctx.measureText(`${call} `).width;
  ctx.fillText(call, left, cardY + 48);
  ctx.fillStyle = sideColor;
  setFont(ctx, "700", 20);
  ctx.fillText(side, left + callW, cardY + 48);

  // Instrument type — Futures / Options / Equity (clearly visible)
  const typeLine =
    fno.segment === "OPT" && fno.expiryLabel
      ? `${exchange}  ·  ${instrument}  ·  ${fno.expiryLabel}${fno.strike ? `  ·  ${fno.strike}` : ""}`
      : fno.segment === "FUT" && fno.expiryLabel
        ? `${exchange}  ·  ${instrument}  ·  ${fno.expiryLabel}`
        : `${exchange}  ·  ${instrument}`;
  ctx.fillStyle = themeId === "classic" ? "#c2410c" : theme.subtitle;
  setFont(ctx, "800", 16);
  fitFont(ctx, typeLine, textMax, 16, "800", 12);
  ctx.fillText(typeLine, left, cardY + 76);

  // Dominant symbol + orange underline
  ctx.fillStyle = theme.text;
  fitFont(ctx, name, textMax, 56, "800", 28);
  ctx.fillText(name, left, cardY + 140);
  const nameW = Math.min(ctx.measureText(name).width, textMax);
  ctx.strokeStyle = theme.underline;
  ctx.lineWidth = 5;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(left, cardY + 152);
  ctx.lineTo(left + Math.max(nameW * 0.75, 100), cardY + 152);
  ctx.stroke();

  // Data rows — large right-side values
  const rowsTop = cardY + topBlock;
  rows.forEach((row, index) => {
    const y0 = rowsTop + index * rowH;
    const mid = y0 + rowH / 2;
    if (index > 0) dashedLine(ctx, left, right, y0, theme.rowLine);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    // These labels sit on a light card, so use a high contrast color in every theme.
    ctx.fillStyle = "#475569";
    setFont(ctx, "600", 18);
    ctx.fillText(row.label, left, mid);

    ctx.textAlign = "right";
    ctx.fillStyle = theme.text;
    fitFont(ctx, row.value, innerW * 0.55, 30, "700", 22);
    ctx.fillText(row.value, right, mid);
  });
  ctx.textBaseline = "alphabetic";

  // Timestamp bottom-right
  ctx.textAlign = "right";
  ctx.fillStyle = theme.muted;
  setFont(ctx, "400", 14);
  ctx.fillText(formatStamp(), right, cardY + cardH - 22);

  // Disclaimer under card
  ctx.textAlign = "left";
  ctx.fillStyle = theme.muted;
  setFont(ctx, "400", 12);
  ctx.fillText(
    "* Investments in securities market are subject to market risk. Scan the QR to open this order in Sharekhan.",
    48,
    height - 22
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

  if (variant === "preview") {
    return (
      <div className="sk-canvas-preview">
        <div className="sk-canvas-preview-frame">
          {busy && !previewUrl ? <p className="sk-hint">Building card…</p> : null}
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Trade share card preview" />
          ) : null}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
        {toolbar}
      </div>
    );
  }

  return (
    <div className="trade-share-card">
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
      <div className="trade-share-preview">
        {busy && !previewUrl ? <p className="sk-hint">Building card…</p> : null}
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Trade share card" />
        ) : null}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
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
    </div>
  );
}
