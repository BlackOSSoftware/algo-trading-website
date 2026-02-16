"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";

type UserPlan = {
  planName?: string;
  planExpiresAt?: string | null;
};

type Plan = {
  _id: string;
  name: string;
  price: number;
  durationDays: number;
};

type PlanRequest = {
  _id: string;
  planId: string;
  status: string;
  createdAt: string;
};

export default function SubscriptionPage() {
  const [plan, setPlan] = useState<UserPlan>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [requestingPlanId, setRequestingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const now = Date.now();
  const planExpiryTs = plan.planExpiresAt ? new Date(plan.planExpiresAt).getTime() : null;
  const remainingDays =
    planExpiryTs !== null ? Math.max(0, Math.ceil((planExpiryTs - now) / 86400000)) : null;
  const isExpired = planExpiryTs !== null ? planExpiryTs <= now : false;

  const loadPlan = async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/auth/me", token);
      const user = (data as { user?: UserPlan }).user || {};
      setPlan({
        planName: user.planName,
        planExpiresAt: user.planExpiresAt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load plan";
      setError(msg);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await apiGet("/api/v1/plans");
      setPlans((data as { plans?: Plan[] }).plans || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load plans";
      setError(msg);
    }
  };

  const loadRequests = async () => {
    try {
      const token = getToken();
      const data = await apiGet("/api/v1/plans/requests", token);
      setRequests((data as { requests?: PlanRequest[] }).requests || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load requests";
      setError(msg);
    }
  };

  const handleRequest = async (planId: string) => {
    setError(null);
    setMessage(null);
    setRequestingPlanId(planId);
    try {
      const token = getToken();
      await apiPost("/api/v1/plans/request", { planId }, token);
      setMessage("Plan request submitted. Awaiting admin approval.");
      await loadRequests();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      if (msg.toLowerCase().includes("already")) {
        setMessage("Plan request already pending.");
      } else {
        setError(msg);
      }
    }
    setRequestingPlanId(null);
  };

  useEffect(() => {
    loadPlan();
    loadPlans();
    loadRequests();
  }, []);

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Subscription</div>
          <div className="helper">Manage plans and billing</div>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="plan-grid">
        {plans.length === 0 ? (
          <div className="card">No plans available.</div>
        ) : (
          plans.map((item) => {
            const request = requests.find((req) => req.planId === item._id);
            const isPending = request?.status === "pending";
            const isApproved = request?.status === "approved";
            return (
              <div className="plan-card" key={item._id}>
                <h4>{item.name}</h4>
                <div className="plan-price">Rs. {item.price}</div>
                <div className="helper">{item.durationDays} days access</div>
                <div className="list" style={{ marginTop: "16px" }}>
                  <div className="list-item">Alerts + strategies</div>
                  <div className="list-item">Telegram access</div>
                </div>
                {request ? (
                  <div className="helper" style={{ marginTop: "10px" }}>
                    Status: <span className="badge">{request.status}</span>
                  </div>
                ) : null}
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => handleRequest(item._id)}
                  style={{ marginTop: "16px" }}
                  disabled={isPending || isApproved || requestingPlanId === item._id}
                >
                  {requestingPlanId === item._id
                    ? "Requesting..."
                    : isPending
                    ? "Requested"
                    : isApproved
                    ? "Approved"
                    : "Request plan"}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <div className="page-title">Current plan</div>
        <div className="list">
          <div className="list-item">
            <span>Plan</span>
            <span className="badge">
              {plan.planName ? (isExpired ? "Expired" : plan.planName) : "-"}
            </span>
          </div>
          <div className="list-item">
            <span>Expires on</span>
            <span>
              {plan.planExpiresAt
                ? new Date(plan.planExpiresAt).toLocaleDateString()
                : "-"}
            </span>
          </div>
          <div className="list-item">
            <span>Remaining days</span>
            <span>{remainingDays !== null ? remainingDays : "-"}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Your requests</div>
        {requests.length === 0 ? (
          <div className="helper">No plan requests yet.</div>
        ) : (
          <div className="list">
            {requests.map((req) => (
              <div className="list-item" key={req._id}>
                <span>{plans.find((p) => p._id === req.planId)?.name || req.planId}</span>
                <span className="badge">{req.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
