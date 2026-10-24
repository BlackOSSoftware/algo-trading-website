"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

type Details = { stock: string; tradingSymbol: string; scripCode?: string; side: string; quantity: number; price: number; exchange: string; segment?: string; expiry?: string; strike?: string; optionType?: string; lotSize?: string; orderType: string; productType: string; validity?: string; triggerPrice?: number; bracket?: { enabled?: boolean; targetPrice?: number; stopLossPrice?: number; trailingStop?: number }; notes: string };

export default function OrderDetailsPage() {
  const params = useParams<{ code: string }>();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const [appUrl, setAppUrl] = useState("https://downloads.sharekhan.com/download/sharemobile/onetap.html");
  useEffect(() => {
    if (!params.code) return;
    apiGet(`/api/v1/order-intents/${encodeURIComponent(params.code)}`)
      .then((response) => {
        const data = response as { details: Details; appUrl?: string };
        setDetails(data.details);
        if (data.appUrl) setAppUrl(data.appUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Order link unavailable"));
  }, [params.code]);
  useEffect(() => {
    if (!appUrl.includes("deepLinking=")) return;
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    window.location.replace(appUrl);
  }, [appUrl]);
  const summary = details ? `${details.side} ${details.quantity} ${details.tradingSymbol} on ${details.exchange}; ${details.price === 0 ? "Market" : `Limit price ${details.price}`}; ${details.orderType}; ${details.productType}` : "";
  return <main style={{ maxWidth: 650, margin: "48px auto", padding: "0 18px" }}>
    <div className="card" style={{ padding: 28 }}>
      <h1>Order details to review</h1>
      {error && <p role="alert">{error}</p>}
      {!error && !details && <p>Loading order details...</p>}
      {details && <>
        <p><strong>{details.tradingSymbol}</strong>{details.stock ? ` · ${details.stock}` : ""}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, margin: "20px 0" }}>
          <div>Action<br /><strong>{details.side}</strong></div>
          <div>Exchange<br /><strong>{details.exchange}</strong></div>
          <div>Quantity<br /><strong>{details.quantity}</strong></div>
          <div>Price<br /><strong>{details.price === 0 ? "Market" : details.price}</strong></div>
          <div>Order type<br /><strong>{details.orderType}</strong></div>
          <div>Product type<br /><strong>{details.productType}</strong></div>
          {details.expiry ? <div>Expiry<br /><strong>{details.expiry}</strong></div> : null}
          {details.strike ? <div>Strike / option<br /><strong>{details.strike} {details.optionType || ""}</strong></div> : null}
          <div>Validity<br /><strong>{details.validity || "GFD"}</strong></div>
          {details.triggerPrice ? <div>Trigger price<br /><strong>{details.triggerPrice}</strong></div> : null}
          {details.bracket?.enabled ? <div>Bracket<br /><strong>Target {details.bracket.targetPrice}; stop {details.bracket.stopLossPrice}{details.bracket.trailingStop ? `; trail ${details.bracket.trailingStop}` : ""}</strong></div> : null}
        </div>
        {details.notes && <p><strong>Notes:</strong> {details.notes}</p>}
        <p><strong>This link opens the order details for review.</strong> Confirm the order in Sharekhan before placing it.</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(summary)}>Copy order details</button>{" "}
        <a className="btn btn-primary" href={appUrl}>Open Sharekhan order</a>
      </>}
    </div>
  </main>;
}
