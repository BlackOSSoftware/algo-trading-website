"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type Charges = {
  alert: number;
  marketMaya: number;
  sharekhan: number;
};

type WalletUser = {
  id: string;
  name: string;
  email: string;
  balance: number;
  chargeOverrides: {
    alert: number | null;
    marketMaya: number | null;
    sharekhan: number | null;
  };
};

type PendingTx = {
  id: string;
  userName?: string;
  userEmail?: string;
  credits: number;
  rupees?: number | null;
  status: string;
  utr?: string;
  createdAt: string;
};

export default function AdminWalletPage() {
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("Emotionless Traders");
  const [creditsPerRupee, setCreditsPerRupee] = useState("1");
  const [charges, setCharges] = useState<Charges>({ alert: 1, marketMaya: 2, sharekhan: 2 });
  const [users, setUsers] = useState<WalletUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Charges>>({});
  const [pending, setPending] = useState<PendingTx[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await apiGet("/api/v1/admin/wallet", getAdminToken());
    const payload = data as {
      settings?: { upiId?: string; payeeName?: string; creditsPerRupee?: number; charges?: Charges };
      users?: WalletUser[];
      pending?: PendingTx[];
    };
    setUpiId(payload.settings?.upiId || "");
    setPayeeName(payload.settings?.payeeName || "Emotionless Traders");
    setCreditsPerRupee(String(payload.settings?.creditsPerRupee || 1));
    if (payload.settings?.charges) setCharges(payload.settings.charges);
    const nextUsers = payload.users || [];
    setUsers(nextUsers);
    setDrafts(
      Object.fromEntries(
        nextUsers.map((user) => [
          user.id,
          {
            alert: user.chargeOverrides.alert ?? payload.settings?.charges?.alert ?? 1,
            marketMaya: user.chargeOverrides.marketMaya ?? payload.settings?.charges?.marketMaya ?? 2,
            sharekhan: user.chargeOverrides.sharekhan ?? payload.settings?.charges?.sharekhan ?? 2,
          },
        ])
      )
    );
    setPending(payload.pending || []);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load wallet"));
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiPost(
        "/api/v1/admin/wallet/settings",
        { upiId, payeeName, creditsPerRupee: Number(creditsPerRupee), charges },
        getAdminToken()
      );
      setMessage("Wallet settings saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveUser = async (userId: string) => {
    setError(null);
    setMessage(null);
    try {
      await apiPost(
        "/api/v1/admin/wallet/charges",
        { userId, charges: drafts[userId] },
        getAdminToken()
      );
      setMessage("User charges saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save user charges");
    }
  };

  const review = async (id: string, approve: boolean) => {
    setError(null);
    try {
      await apiPost("/api/v1/admin/wallet/review", { id, approve }, getAdminToken());
      setMessage(approve ? "Recharge approved and credits added." : "Recharge rejected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update recharge");
    }
  };

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Wallet</div>
          <div className="helper">UPI ID, default credit charges, and recharge approvals.</div>
        </div>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="card wallet-admin-settings">
        <div className="section-title">Payment and default charges</div>
        <div className="grid-2">
          <div className="input-group">
            <label className="label" htmlFor="upi-id">UPI ID</label>
            <input className="input" id="upi-id" value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="name@okhdfcbank" />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="payee-name">Payee name</label>
            <input className="input" id="payee-name" value={payeeName} onChange={(event) => setPayeeName(event.target.value)} />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="credits-rate">Credits per rupee</label>
            <input className="input" id="credits-rate" inputMode="numeric" value={creditsPerRupee} onChange={(event) => setCreditsPerRupee(event.target.value.replace(/[^\d]/g, ""))} />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="charge-alert">Alert credits</label>
            <input className="input" id="charge-alert" inputMode="numeric" value={charges.alert} onChange={(event) => setCharges({ ...charges, alert: Number(event.target.value || 0) })} />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="charge-maya">Market Maya trade credits</label>
            <input className="input" id="charge-maya" inputMode="numeric" value={charges.marketMaya} onChange={(event) => setCharges({ ...charges, marketMaya: Number(event.target.value || 0) })} />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="charge-sk">Sharekhan trade credits</label>
            <input className="input" id="charge-sk" inputMode="numeric" value={charges.sharekhan} onChange={(event) => setCharges({ ...charges, sharekhan: Number(event.target.value || 0) })} />
          </div>
        </div>
        <button className="btn btn-primary" type="button" disabled={saving} onClick={saveSettings}>
          {saving ? "Saving..." : "Save defaults"}
        </button>
      </div>

      <div className="card">
        <div className="section-title">Pending recharges</div>
        {pending.length === 0 ? (
          <div className="helper">No recharge is waiting.</div>
        ) : (
          <div className="wallet-history">
            {pending.map((item) => (
              <article className="wallet-history-row" key={item.id}>
                <div>
                  <strong>{item.userName || item.userEmail || "User"}</strong>
                  <div className="helper">
                    Rs. {item.rupees} · {item.credits} credits · {item.status}
                    {item.utr ? ` · UTR ${item.utr}` : ""}
                  </div>
                </div>
                <div className="wallet-review-actions">
                  <button className="btn btn-primary" type="button" onClick={() => review(item.id, true)}>Approve</button>
                  <button className="btn btn-ghost" type="button" onClick={() => review(item.id, false)}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">Charges by user</div>
        <p className="helper">These override the default charges for that user only.</p>
        <div className="wallet-user-list">
          {users.map((user) => (
            <article className="wallet-user-row" key={user.id}>
              <div>
                <strong>{user.name || user.email}</strong>
                <div className="helper">{user.email} · {user.balance} credits</div>
              </div>
              <label className="label">
                Alert
                <input className="input" inputMode="numeric" value={drafts[user.id]?.alert ?? ""} onChange={(event) => setDrafts({ ...drafts, [user.id]: { ...drafts[user.id], alert: Number(event.target.value || 0) } })} />
              </label>
              <label className="label">
                Market Maya
                <input className="input" inputMode="numeric" value={drafts[user.id]?.marketMaya ?? ""} onChange={(event) => setDrafts({ ...drafts, [user.id]: { ...drafts[user.id], marketMaya: Number(event.target.value || 0) } })} />
              </label>
              <label className="label">
                Sharekhan
                <input className="input" inputMode="numeric" value={drafts[user.id]?.sharekhan ?? ""} onChange={(event) => setDrafts({ ...drafts, [user.id]: { ...drafts[user.id], sharekhan: Number(event.target.value || 0) } })} />
              </label>
              <button className="btn btn-secondary" type="button" onClick={() => saveUser(user.id)}>Save</button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
