"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Charges = {
  alert: number;
  marketMaya: number;
  sharekhan: number;
};

type WalletTx = {
  id: string;
  kind: string;
  status: string;
  credits: number;
  rupees?: number | null;
  title: string;
  note?: string;
  utr?: string;
  createdAt: string;
};

type Payment = {
  transaction: WalletTx;
  upiId: string;
  payeeName: string;
  rupees: number;
  credits: number;
  upiLink: string;
  qrDataUrl: string;
};

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [charges, setCharges] = useState<Charges>({ alert: 1, marketMaya: 2, sharekhan: 2 });
  const [creditsPerRupee, setCreditsPerRupee] = useState(1);
  const [upiReady, setUpiReady] = useState(false);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [rupees, setRupees] = useState("100");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiGet("/api/v1/wallet", getToken());
    const wallet = data as {
      balance?: number;
      charges?: Charges;
      creditsPerRupee?: number;
      upiReady?: boolean;
      transactions?: WalletTx[];
    };
    setBalance(Number(wallet.balance || 0));
    if (wallet.charges) setCharges(wallet.charges);
    setCreditsPerRupee(Number(wallet.creditsPerRupee || 1));
    setUpiReady(Boolean(wallet.upiReady));
    setTransactions(wallet.transactions || []);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load wallet"));
  }, [load]);

  const amount = Math.round(Number(rupees) || 0);
  const credits = amount > 0 ? amount * creditsPerRupee : 0;

  const createPayment = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiPost("/api/v1/wallet/recharge", { rupees: amount }, getToken());
      setPayment(data as Payment);
      setUtr("");
      setMessage("Scan the QR and pay the exact amount. Then mark it as paid.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create recharge");
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async () => {
    if (!payment?.transaction?.id) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost(
        "/api/v1/wallet/recharge/paid",
        { id: payment.transaction.id, utr },
        getToken()
      );
      setMessage("Payment marked. Credits are added after admin approves it.");
      setPayment(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Wallet</div>
          <div className="helper">Recharge credits, then alerts and trades use them automatically.</div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="wallet-balance-card">
        <div>
          <div className="helper">Available credits</div>
          <div className="wallet-balance">{balance}</div>
        </div>
        <div className="wallet-rate-row">
          <span>Alert {charges.alert}</span>
          <span>Market Maya {charges.marketMaya}</span>
          <span>Sharekhan {charges.sharekhan}</span>
        </div>
      </div>

      <div className="card wallet-recharge">
        <div className="section-title">Recharge</div>
        <p className="helper">
          {creditsPerRupee === 1
            ? "1 rupee adds 1 credit."
            : `1 rupee adds ${creditsPerRupee} credits.`}
          {upiReady ? "" : " UPI is not set yet, so recharge opens after admin adds a UPI ID."}
        </p>
        <div className="wallet-amount-row">
          {["100", "500", "1000"].map((preset) => (
            <button
              key={preset}
              className={`btn btn-ghost${rupees === preset ? " is-on" : ""}`}
              type="button"
              onClick={() => setRupees(preset)}
            >
              Rs. {preset}
            </button>
          ))}
        </div>
        <div className="wallet-amount-field">
          <label className="label" htmlFor="recharge-rupees">
            Amount in rupees
          </label>
          <input
            className="input"
            id="recharge-rupees"
            inputMode="numeric"
            value={rupees}
            onChange={(event) => setRupees(event.target.value.replace(/[^\d]/g, ""))}
            placeholder="100"
          />
          <div className="helper">{credits > 0 ? `You will get ${credits} credits.` : "Enter an amount."}</div>
        </div>
        <button className="btn btn-primary" type="button" disabled={loading || amount < 1 || !upiReady} onClick={createPayment}>
          {loading ? "Please wait..." : "Generate UPI QR"}
        </button>

        {payment ? (
          <div className="wallet-qr">
            <img src={payment.qrDataUrl} alt={`UPI QR for Rs. ${payment.rupees}`} />
            <div>
              <strong>Pay Rs. {payment.rupees}</strong>
              <div className="helper">UPI ID: {payment.upiId}</div>
              <div className="helper">Name: {payment.payeeName}</div>
              <div className="helper">{payment.credits} credits after approval</div>
              <label className="label" htmlFor="recharge-utr">
                UTR / reference (optional)
              </label>
              <input
                className="input"
                id="recharge-utr"
                value={utr}
                onChange={(event) => setUtr(event.target.value)}
                placeholder="Payment reference"
              />
              <button className="btn btn-secondary" type="button" disabled={loading} onClick={markPaid}>
                I have paid
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="section-title">Transaction history</div>
        {transactions.length === 0 ? (
          <div className="helper">No wallet activity yet.</div>
        ) : (
          <div className="wallet-history">
            {transactions.map((item) => (
              <article className="wallet-history-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <div className="helper">
                    {item.note || item.kind}
                    {item.utr ? ` · UTR ${item.utr}` : ""}
                  </div>
                </div>
                <div className="wallet-history-meta">
                  <span className={`status-chip ${item.status === "completed" || item.status === "approved" ? "ok" : item.status === "rejected" ? "error" : "warn"}`}>
                    {item.status}
                  </span>
                  <strong className={item.credits < 0 ? "is-debit" : "is-credit"}>
                    {item.credits > 0 ? `+${item.credits}` : item.credits}
                  </strong>
                  <span className="helper">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
