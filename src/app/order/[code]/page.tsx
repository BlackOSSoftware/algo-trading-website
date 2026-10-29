"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

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
  bracket?: {
    enabled?: boolean;
    mode?: string;
    targetPrice?: number;
    stopLossPrice?: number;
    trailingStop?: number;
  };
  bracketWebUrl?: string;
  notes: string;
};

function isMobileUa(ua: string) {
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

function isIosUa(ua: string) {
  return /iPhone|iPad|iPod/i.test(ua);
}

export default function OrderDetailsPage() {
  const params = useParams<{ code: string }>();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const [androidAppUrl, setAndroidAppUrl] = useState("");
  const [iosAppUrl, setIosAppUrl] = useState("");
  const [schemeUrl, setSchemeUrl] = useState("");
  const [opened, setOpened] = useState(false);

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
    // Prefer Adjust HTTPS (valid cert) over downloads.sharekhan.com.
    // Also try the native scheme as a fast path when the app is installed.
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

  const summary = details
    ? `${details.side} ${details.quantity} ${details.tradingSymbol} on ${details.exchange}; ${
        details.price === 0 ? "Market" : `Limit price ${details.price}`
      }; ${details.orderType}; ${details.productType}; Validity ${details.validity || "GFD"}`
    : "";

  return (
    <main style={{ maxWidth: 650, margin: "48px auto", padding: "0 18px" }}>
      <div className="card" style={{ padding: 28 }}>
        <h1>Order details to review</h1>
        {error && <p role="alert">{error}</p>}
        {!error && !details && <p>Loading order details...</p>}
        {details && (
          <>
            <p>
              <strong>{details.tradingSymbol}</strong>
              {details.stock ? ` · ${details.stock}` : ""}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 14,
                margin: "20px 0",
              }}
            >
              <div>
                Action
                <br />
                <strong>{details.side}</strong>
              </div>
              <div>
                Exchange
                <br />
                <strong>{details.exchange}</strong>
              </div>
              <div>
                Quantity
                <br />
                <strong>{details.quantity}</strong>
              </div>
              <div>
                Price
                <br />
                <strong>{details.price === 0 ? "Market" : details.price}</strong>
              </div>
              <div>
                Order type
                <br />
                <strong>{details.orderType}</strong>
              </div>
              <div>
                Product type
                <br />
                <strong>{details.productType}</strong>
              </div>
              {details.expiry ? (
                <div>
                  Expiry
                  <br />
                  <strong>{details.expiry}</strong>
                </div>
              ) : null}
              {details.strike ? (
                <div>
                  Strike / option
                  <br />
                  <strong>
                    {details.strike} {details.optionType || ""}
                  </strong>
                </div>
              ) : null}
              <div>
                Validity
                <br />
                <strong>{details.validity || "GFD"}</strong>
                {String(details.validity || "GFD").toUpperCase() === "IOC" ? (
                  <p style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    App one-tap opens as GFD by default. Confirm se pehle Sharekhan me IOC select karo.
                  </p>
                ) : null}
              </div>
              {details.triggerPrice ? (
                <div>
                  Trigger price
                  <br />
                  <strong>{details.triggerPrice}</strong>
                </div>
              ) : null}
              {details.bracket?.enabled ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  BigTrade+ / Bracket legs
                  <br />
                  <strong>
                    SL {details.bracket.stopLossPrice}
                    {details.bracket.targetPrice
                      ? `; book-profit ${details.bracket.targetPrice}`
                      : ""}
                    {details.bracket.trailingStop ? `; trail ${details.bracket.trailingStop}` : ""}
                  </strong>
                  <p style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
                    App one-tap fills entry only (qty/price/side). SL + target are not in Sharekhan’s public
                    deep-link — use “Open BigTrade+ (web)” or enter legs in the app after entry opens.
                  </p>
                </div>
              ) : null}
            </div>
            {details.notes && (
              <p>
                <strong>Notes:</strong> {details.notes}
              </p>
            )}
            <p>
              <strong>Phone par yeh Sharekhan app ka order screen kholta hai</strong> — scrip, buy/sell,
              qty aur price pehle se bhari hui. Order tabhi lagta hai jab aap app mein confirm karte ho.
            </p>
            {!mobileUrl ? (
              <p role="status">
                Is contract ke liye Sharekhan mobile deep-link available nahi hai. Details copy karke app
                mein manually enter karein.
              </p>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigator.clipboard.writeText(summary)}
            >
              Copy order details
            </button>{" "}
            {mobileUrl ? (
              <button type="button" className="btn btn-primary" onClick={openApp}>
                Open Sharekhan app
              </button>
            ) : null}
            {details.bracket?.enabled && details.bracketWebUrl ? (
              <>
                {" "}
                <a
                  className="btn btn-secondary"
                  href={details.bracketWebUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open BigTrade+ (web)
                </a>
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
