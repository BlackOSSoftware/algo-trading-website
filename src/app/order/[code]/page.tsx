"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

type Details = { stock: string; tradingSymbol: string; side: string; quantity: number; price: number; exchange: string; orderType: string; productType: string; notes: string };

export default function OrderDetailsPage() {
  const params = useParams<{ code: string }>();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!params.code) return;
    apiGet(`/api/v1/order-intents/${encodeURIComponent(params.code)}`)
      .then((response) => setDetails((response as { details: Details }).details))
      .catch((e) => setError(e instanceof Error ? e.message : "Order link unavailable"));
  }, [params.code]);
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
        </div>
        {details.notes && <p><strong>Notes:</strong> {details.notes}</p>}
        <p><strong>This link does not prefill Sharekhan or place an order.</strong> Check these details, then enter them yourself in your Sharekhan account. The order is placed only when you confirm it there.</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(summary)}>Copy order details</button>{" "}
        <a className="btn btn-primary" href="https://www.sharekhan.com/" target="_blank" rel="noopener noreferrer">Open Sharekhan website</a>
      </>}
    </div>
  </main>;
}
