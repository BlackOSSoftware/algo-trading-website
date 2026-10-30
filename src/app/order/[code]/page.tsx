"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

type Leg = {
  tradingSymbol?: string;
  scripCode?: string;
  side?: string;
  quantity?: number;
  price?: number;
  buyRange?: string;
  expiry?: string;
  strike?: string;
  optionType?: string;
  exchange?: string;
};

type Details = {
  stock: string;
  tradingSymbol: string;
  scripCode?: string;
  side: string;
  quantity: number;
  price: number;
  exchange: string;
  segment?: string;
  expiry?: string;
  strike?: string;
  optionType?: string;
  lotSize?: string;
  orderType: string;
  productType: string;
  validity?: string;
  triggerPrice?: number;
  notes: string;
  strategyName?: string;
  approxMargin?: string;
  legs?: Leg[];
  bracket?: { enabled?: boolean; targetPrice?: number; stopLossPrice?: number };
  card?: { target?: string; target1?: string; stopLoss?: string; timeFrame?: string; buyRange?: string; headline?: string };
};

function isMobileUa(ua: string) {
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

function isIosUa(ua: string) {
  return /iPhone|iPad|iPod/i.test(ua);
}

function sideOf(value?: string) {
  return String(value || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
}

function productLabel(value?: string) {
  if (value === "BIGTRADEPLUS") return "BigTrade+";
  if (value === "BIGTRADE") return "Intraday";
  if (value === "INVESTMENT") return "Delivery";
  return value || "—";
}

function segmentLabel(value?: string) {
  if (value === "OPT") return "Options";
  if (value === "FUT") return "Futures";
  return "Equity";
}

function orderTypeLabel(details: Details) {
  if (details.orderType === "LIMIT") return "Limit";
  if (details.orderType === "STOPLOSS") return "Stop loss";
  if (details.orderType === "STOPLOSS_MARKET") return "Stop loss market";
  if (details.orderType === "BRACKET") return "Bracket";
  return Number(details.price) > 0 ? "Limit" : "Market";
}

function rangeOf(leg: { side?: string; price?: number; buyRange?: string }) {
  const text = String(leg.buyRange || "").trim();
  if (text) return text;
  return Number(leg.price) > 0 ? String(leg.price) : "Market";
}

function rangeLabel(side?: string) {
  return sideOf(side) === "SELL" ? "Sell range" : "Buy range";
}

function rupee(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.startsWith("₹") ? text : `₹${text}`;
}

export default function OrderDetailsPage() {
  const params = useParams<{ code: string }>();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const [androidAppUrl, setAndroidAppUrl] = useState("");
  const [iosAppUrl, setIosAppUrl] = useState("");
  const [schemeUrl, setSchemeUrl] = useState("");
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  const mobileUrl = useMemo(() => {
    if (typeof navigator === "undefined") return androidAppUrl || iosAppUrl;
    if (isIosUa(navigator.userAgent)) return iosAppUrl || androidAppUrl;
    return androidAppUrl || iosAppUrl;
  }, [androidAppUrl, iosAppUrl]);

  useEffect(() => {
    if (!params.code) return;
    apiGet(`/api/v1/order-intents/${encodeURIComponent(params.code)}`)
      .then((response) => {
        const data = response as {
          details: Details;
          appUrl?: string;
          androidAppUrl?: string;
          iosAppUrl?: string;
          schemeUrl?: string;
        };
        setDetails(data.details);
        setAndroidAppUrl(String(data.androidAppUrl || data.appUrl || "").trim());
        setIosAppUrl(String(data.iosAppUrl || "").trim());
        setSchemeUrl(String(data.schemeUrl || "").trim());
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Order link unavailable"));
  }, [params.code]);

  useEffect(() => {
    if (!mobileUrl || opened) return;
    if (typeof navigator === "undefined" || !isMobileUa(navigator.userAgent)) return;
    setOpened(true);
    if (schemeUrl) {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = schemeUrl;
      document.body.appendChild(iframe);
      window.setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
          // ignore
        }
        window.location.href = mobileUrl;
      }, 400);
      return;
    }
    window.location.href = mobileUrl;
  }, [mobileUrl, schemeUrl, opened]);

  const openApp = () => {
    if (schemeUrl) {
      window.location.href = schemeUrl;
      window.setTimeout(() => {
        if (mobileUrl) window.location.href = mobileUrl;
      }, 700);
      return;
    }
    if (mobileUrl) window.location.href = mobileUrl;
  };

  const multiLeg = Boolean(details && Array.isArray(details.legs) && details.legs.length >= 2);
  const title = details?.strategyName || details?.card?.headline || details?.tradingSymbol || "Order";
  const bracketOn = details?.orderType === "BRACKET" || Boolean(details?.bracket?.enabled);

  const summary = details
    ? multiLeg
      ? [
          title,
          ...(details.legs || []).map((leg, index) => {
            const side = sideOf(leg.side);
            const contract = [leg.strike, leg.optionType].filter(Boolean).join(" ");
            return `Leg ${index + 1} ${side} ${leg.tradingSymbol}${contract ? ` ${contract}` : ""} · ${rangeLabel(side)} ${rangeOf(leg)} · Qty ${leg.quantity ?? "—"}`;
          }),
          details.approxMargin ? `Approx margin ${rupee(details.approxMargin)}` : "",
          `${details.exchange} · ${productLabel(details.productType)} · ${details.validity || "GFD"}`,
        ]
          .filter(Boolean)
          .join("\n")
      : `${details.side} ${details.quantity} ${details.tradingSymbol} on ${details.exchange}; ${
          details.price === 0 ? "Market" : `Limit price ${details.price}`
        }; ${details.orderType}; Product ${details.productType}; Validity ${details.validity || "GFD"}`
    : "";

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="order-page">
      <article className="order-sheet">
        <p className="order-kicker">Order details to review</p>
        {error ? <p className="order-alert" role="alert">{error}</p> : null}
        {!error && !details ? <p className="order-loading">Loading order details...</p> : null}
        {details ? (
          <>
            <header className="order-head">
              <h1>{title}</h1>
              <p className="order-sub">
                {[details.stock, details.exchange, segmentLabel(details.segment), details.card?.timeFrame]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {details.approxMargin ? (
                <p className="order-margin">
                  Approx margin <strong>{rupee(details.approxMargin)}</strong>
                </p>
              ) : null}
            </header>

            {multiLeg ? (
              <div className="order-legs">
                {(details.legs || []).map((leg, index) => {
                  const side = sideOf(leg.side);
                  const contract = [leg.strike, leg.optionType].filter(Boolean).join(" ");
                  return (
                    <section key={`${leg.scripCode || leg.tradingSymbol || index}`} className={`order-leg is-${side.toLowerCase()}`}>
                      <div className="order-leg-top">
                        <span>Leg {index + 1}</span>
                        <strong>{side}</strong>
                      </div>
                      <h2>{leg.tradingSymbol}</h2>
                      <p className="order-leg-contract">
                        {[contract, leg.expiry ? `Exp ${leg.expiry}` : ""].filter(Boolean).join(" · ") || details.exchange}
                      </p>
                      <dl>
                        <div>
                          <dt>{rangeLabel(side)}</dt>
                          <dd>{rangeOf(leg)}</dd>
                        </div>
                        <div>
                          <dt>Quantity</dt>
                          <dd>{leg.quantity ?? "—"}</dd>
                        </div>
                      </dl>
                    </section>
                  );
                })}
              </div>
            ) : (
              <dl className="order-facts">
                <div>
                  <dt>Side</dt>
                  <dd><span className={`order-side is-${sideOf(details.side).toLowerCase()}`}>{details.side}</span></dd>
                </div>
                <div>
                  <dt>Product</dt>
                  <dd>{productLabel(details.productType)}</dd>
                </div>
                <div>
                  <dt>Exchange</dt>
                  <dd>{details.exchange}</dd>
                </div>
                <div>
                  <dt>Quantity</dt>
                  <dd>{details.quantity}</dd>
                </div>
                <div>
                  <dt>{rangeLabel(details.side)}</dt>
                  <dd>{details.price === 0 ? "Market" : details.price}</dd>
                </div>
                <div>
                  <dt>Order type</dt>
                  <dd>{orderTypeLabel(details)}</dd>
                </div>
                {details.expiry ? (
                  <div>
                    <dt>Expiry</dt>
                    <dd>{details.expiry}</dd>
                  </div>
                ) : null}
                {details.strike ? (
                  <div>
                    <dt>Strike</dt>
                    <dd>{details.strike} {details.optionType || ""}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Validity</dt>
                  <dd>{details.validity || "GFD"}</dd>
                </div>
                {details.triggerPrice ? (
                  <div>
                    <dt>Trigger price</dt>
                    <dd>{details.triggerPrice}</dd>
                  </div>
                ) : null}
                {bracketOn ? (
                  <>
                    <div>
                      <dt>Book profit</dt>
                      <dd>{details.bracket?.targetPrice || details.card?.target1 || details.card?.target || "—"}</dd>
                    </div>
                    <div>
                      <dt>Stop loss</dt>
                      <dd>{details.bracket?.stopLossPrice || details.card?.stopLoss || "—"}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            )}

            {multiLeg ? (
              <dl className="order-facts order-facts-compact">
                <div>
                  <dt>Exchange</dt>
                  <dd>{details.exchange}</dd>
                </div>
                <div>
                  <dt>Product</dt>
                  <dd>{productLabel(details.productType)}</dd>
                </div>
                <div>
                  <dt>Order type</dt>
                  <dd>{orderTypeLabel(details)}</dd>
                </div>
                <div>
                  <dt>Validity</dt>
                  <dd>{details.validity || "GFD"}</dd>
                </div>
              </dl>
            ) : null}

            {String(details.validity || "GFD").toUpperCase() === "IOC" ? (
              <p className="order-help">One-tap often opens as Day (GFD). Confirm se pehle IOC select karo.</p>
            ) : null}
            {details.notes ? (
              <p className="order-note"><strong>Notes.</strong> {details.notes}</p>
            ) : null}
            <p className="order-help">
              Phone par yeh Sharekhan app ka order screen kholta hai — scrip, buy/sell, qty aur price pehle se bhari hui.
              {bracketOn
                ? " Bracket link book profit aur stop loss bhi saath bhejta hai."
                : ""}{" "}
              Order tabhi lagta hai jab aap app mein confirm karte ho.
            </p>
            {!mobileUrl ? (
              <p className="order-alert" role="status">
                Is contract ke liye Sharekhan mobile deep-link available nahi hai. Details copy karke app mein manually enter karein.
              </p>
            ) : null}
            <div className="order-actions">
              <button type="button" className="btn btn-secondary" onClick={copyDetails}>
                {copied ? "Copied" : "Copy order details"}
              </button>
              {mobileUrl ? (
                <button type="button" className="btn btn-primary" onClick={openApp}>
                  Open Sharekhan app
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </article>
    </main>
  );
}
